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
	console.log(width, height, channels);

	// Modify the pixel data
	let lineThickness = 160;

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
	
// 	// Load the image from the ArrayBuffer
// 	const image = await loadImage(arrayBuffer);

// 	// Create a canvas and get the context
// 	const canvas = createCanvas(image.width, image.height);
// 	const ctx = canvas.getContext('2d');

// 	// Draw the image onto the canvas
// 	ctx.drawImage(image, 0, 0);

// 	// Get the ImageData
// 	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
// 	const data = imageData.data;

// 	// Modify the image data (example: invert colors)
// 	for (let i = 0; i < data.length; i += 4) {
// 		data[i] = 255 - data[i];       // Red
// 		data[i + 1] = 255 - data[i + 1]; // Green
// 		data[i + 2] = 255 - data[i + 2]; // Blue
// 		// data[i + 3] is the alpha component (not modified)
// 	}

// 	// Put the modified data back onto the canvas
// 	ctx.putImageData(imageData, 0, 0);

// 	// Return the modified image as ArrayBuffer
// 	return canvas.toBuffer('image/png').buffer;
// }

// // Helper function to convert ArrayBuffer to Buffer for loadImage
// function loadImage(arrayBuffer) {
// 	return new Promise((resolve, reject) => {
// 		const img = new Image();
// 		img.onload = () => resolve(img);
// 		img.onerror = (err) => reject(err);
// 		img.src = Buffer.from(arrayBuffer);
// 	});
// }

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

// fetchAndCropImage('http://example.com/image.jpg', 'cropped.jpg', { left: 50, top: 50, width: 200, height: 200 });

const imgHashMap = {}; // key: x-y, value: imageBuffer - to store the cropped images

app.get('/styles/:id/:tilesize/:extra/:z/:x/:y.:format', async (req, res) => {
	let { id, tilesize, extra, z, x, y, format } = req.params;
	tilesize = parseInt(tilesize);
	extra = parseInt(extra);
	z = parseInt(z);
	x = parseFloat(x);
	y = parseFloat(y);
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

	try {
		res.set('Content-Type', `image/${format}`);
		if (!imgHashMap[`${x}-${y}`]) { // if the image is not already in the hashmap (i.e. not cached)
			const x2 = getMetaTileCoord(x, gridSize);
			const y2 = getMetaTileCoord(y, gridSize);
			const { lon, lat, zoom, width, height } = determineParameters(size, z, x2, y2);
			const url = `http://tileserver-gl:8080/styles/${id}/static/${lon},${lat},${zoom}/${width}x${height}.${format}`;
			
			let fullImage = await fetchImage(url);
			let editFullImage = await editPixelsAndReturnBuffer(fullImage);
			// if (!fs.existsSync(`./tiles/`))
			// 	fs.mkdirSync(`./tiles/`, { recursive: true });
			// fs.writeFileSync(`./tiles/${x}-${y}.png`, editFullImage);
			for (let i = 0; i < gridSize; i++) {
				for (let j = 0; j < gridSize; j++) {
					let croppedBuffer = await cropImage(editFullImage, i * tilesize, j * tilesize, tilesize, tilesize);
					// fs.writeFileSync(`./tiles/${x - extra + i}-${y - extra + j}.png`, croppedBuffer);
					imgHashMap[`${x2 - extra + i}-${y2 - extra + j}`] = croppedBuffer;
				}
			}
		}
		res.set('Content-Type', `image/${format}`);
		res.send(imgHashMap[`${x}-${y}`]);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('Error fetching image: ' + error.message);
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});