const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const app = express();
const port = 3001;
const cors = require("cors");
const fs = require('fs');
const { parse } = require('path');

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

function getBase64(url) {
	return axios
	.get(url, {
		responseType: 'arraybuffer'
	})
	.then(response => Buffer.from(response.data, 'binary').toString('base64'))
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

app.get('/styles/:id/:tilesize/:extra/:z/:x/:y.png', async (req, res) => {
	let { id, tilesize, extra, z, x, y } = req.params;
	tilesize = parseInt(tilesize);
	extra = parseInt(extra);
	z = parseInt(z);
	x = parseFloat(x);
	y = parseFloat(y);
	const gridSize = 2 * extra + 1; // number of tiles in each direction
	const size = gridSize * tilesize; // size of the full image (in pixels)
	const { lon, lat, zoom, width, height } = determineParameters(size, z, x, y);

	// console.log(lat, lon);

	try {
		const format = 'png';
		const url = `http://tileserver-gl:8080/styles/${id}/static/${lon},${lat},${zoom}/${width}x${height}.${format}`;
		res.set('Content-Type', `image/${format}`);
		if (!imgHashMap[`${x}-${y}`]) { // if the image is not already in the hashmap (i.e. not cached)
			const fullImage = await fetchImage(url);
			// if (!fs.existsSync(`./tiles/`))
			// 	fs.mkdirSync(`./tiles/`, { recursive: true });
			// fs.writeFileSync(`./tiles/BIG-${x}-${y}.png`, fullImage);
			for (let i = 0; i < gridSize; i++) {
				for (let j = 0; j < gridSize; j++) {
					const croppedBuffer = await cropImage(fullImage, i * tilesize, j * tilesize, tilesize, tilesize);
					// fs.writeFileSync(`./tiles/${x - extra + i}-${y - extra + j}.png`, croppedBuffer);
					imgHashMap[`${x - extra + i}-${y - extra + j}`] = croppedBuffer;
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
