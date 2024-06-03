const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const app = express();
const port = 3001;
const cors = require("cors");
const fs = require('fs');
// const { parse } = require('path');
// const e = require('express');
// const { KeyObject } = require('crypto');
// const { createCanvas, Image, loadImage } = require('canvas');

async function editPixelsAndReturnBuffer(inputBuffer) {
	// Convert the input ArrayBuffer to a Buffer for processing with sharp
	const inputNodeBuffer = Buffer.from(inputBuffer);

	// Process the image with sharp
	const { data, info } = await sharp(inputNodeBuffer)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const { width, height, channels } = info;
	// console.log(width, height, channels);

	// Modify the pixel data
	let lineThickness = 16;

	for (let i = 0; i < data.length; i += channels) {
		// Draw a border around the image

		// Draw left and right borders
		if (i % (width * channels) > (width * channels) - lineThickness * channels - channels * 2 || i % (width * channels) < lineThickness * channels) {
			// console.log("i: ", i, "i % (width * channels): ", i % (width * channels));
			data[i] = 0;    // Red channel
			data[i + 1] = 0; // Green channel
			data[i + 2] = 255; // Blue channel
		}

		// Draw top and bottom borders
		if (Math.floor(i / (width * channels)) < lineThickness || Math.floor(i / (width * channels)) > height - lineThickness) {
			data[i] = 0;    // Red channel
			data[i + 1] = 0; // Green channel
			data[i + 2] = 255; // Blue channel
		}
		// if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
		// 	// Set pixels to black (change as needed)
		// 	data[i] = 0;    // Red channel
		// 	data[i + 1] = 0; // Green channel
		// 	data[i + 2] = 0; // Blue channel
		// 	// Alpha channel remains unchanged
		// }
	}

	// Convert the modified raw data back to a PNG ArrayBuffer
	const outputBuffer = await sharp(data, { raw: { width, height, channels } })
		.toFormat('png')
		.toBuffer();

	return outputBuffer; // Convert Node.js Buffer to ArrayBuffer
}

const corsOptions = {
	origin: "*"
};

app.use(cors(corsOptions));

// conversion functions from openstreetmap wiki page:
function tile2long(x,z) {
	// console.log(x, z);
	return (x/Math.pow(2,z)*360-180);
}

function tile2lat(y,z) {
	// console.log(y, z);
	var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
	return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}

function determineParameters(size, z, x, y) {
	return { lon: tile2long(x+0.5,z), lat: tile2lat(y+0.5,z), zoom: z, width: size, height: size };
}

function cropImage(imageBuffer, leftOffset, topOffset, width, height) {
	return sharp(imageBuffer)
		.extract({ left: leftOffset, top: topOffset, width: width, height: height })
		.toBuffer();
}

async function fetchImage(url, outputPath, cropOptions) {
	const response = await axios({
		url,
		responseType: 'arraybuffer'
	});

	return Buffer.from(response.data);
}

const imgHashMap = {}; // key: x-y, value: imageBuffer - to store the cropped images
const ongoingRequests = {}; // key: x-y, value: promise - to store the ongoing requests

app.get('/styles/:id/:tilesize/:extra/:z/:x/:y.:format', async (req, res) => {
	let { id, tilesize, extra, z, x: tileX, y: tileY, format } = req.params;
	tilesize = parseInt(tilesize);
	extra = parseInt(extra);
	z = parseInt(z);
	tileX = parseFloat(tileX);
	tileY = parseFloat(tileY);
	const gridSize = 2 * extra + 1; // number of tiles in each direction
	const size = gridSize * tilesize; // size of the full image (in pixels)
	
	// console.log(lat, lon);
	
	function getMetaTileCoord(coord, gridSize) {
		let newCoord = coord;
		if (coord % gridSize <= parseInt(gridSize / 2))
			newCoord = coord - (coord % gridSize);
		else
			newCoord = coord + (gridSize - coord % gridSize);
		return newCoord;
	}

	async function fetchMetaTile(url, metaX, metaY, gridSize) {
		let fullImage = await fetchImage(url);
		fullImage = await editPixelsAndReturnBuffer(fullImage);
		// if (!fs.existsSync(`./tiles/`))
		// 	fs.mkdirSync(`./tiles/`, { recursive: true });
		// fs.writeFileSync(`./tiles/${x}-${y}.png`, editFullImage);
		for (let i = 0; i < gridSize; i++) {
			for (let j = 0; j < gridSize; j++) {
				let croppedBuffer = await cropImage(fullImage, i * tilesize, j * tilesize, tilesize, tilesize);
				// fs.writeFileSync(`./tiles/${x - extra + i}-${y - extra + j}.png`, croppedBuffer);
				const { tileX, tileY } = { tileX: metaX - extra + i, tileY: metaY - extra + j };
				imgHashMap[`${tileX}-${tileY}`] = croppedBuffer;
			}
		}
		delete ongoingRequests[`${metaX}-${metaY}`];
	}

	try {
		res.set('Content-Type', `image/${format}`);
		if (!imgHashMap[`${tileX}-${tileY}`]) { // if the image is not already in the hashmap (i.e. not cached)
			const metaX = getMetaTileCoord(tileX, gridSize);
			const metaY = getMetaTileCoord(tileY, gridSize);
			const { lon, lat, zoom, width, height } = determineParameters(size, z, metaX, metaY);
			const url = `http://tileserver-gl:8080/styles/${id}/static/${lon},${lat},${zoom}/${width}x${height}.${format}`;
			if (!ongoingRequests[`${metaX}-${metaY}`]) { // if the request is not already ongoing
				ongoingRequests[`${metaX}-${metaY}`] = fetchMetaTile(url, metaX, metaY, gridSize);
			}
			await ongoingRequests[`${metaX}-${metaY}`];
		}
		res.set('Content-Type', `image/${format}`);
		res.send(imgHashMap[`${tileX}-${tileY}`]);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('Error fetching image: ' + error.message);
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});