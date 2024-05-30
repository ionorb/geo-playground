const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const app = express();
const port = 3001;
const cors = require("cors");
const fs = require('fs');

const corsOptions = {
	origin: "*"
};

app.use(cors(corsOptions));

// conversion functions from openstreetmap wiki page:
function tile2long(x,z) {
	console.log(x, z);
	return (x/Math.pow(2,z)*360-180);
}

function tile2lat(y,z) {
	console.log(y, z);
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

async function fetchAndCropImage(url, outputPath, cropOptions) {
	const response = await axios({
		url,
		responseType: 'arraybuffer'
	});

	const imageBuffer = Buffer.from(response.data);

	const croppedBuffer = await cropImage(imageBuffer, cropOptions.left, cropOptions.top, cropOptions.width, cropOptions.height);
	fs.writeFileSync(outputPath, croppedBuffer);
	return croppedBuffer;
}

// fetchAndCropImage('http://example.com/image.jpg', 'cropped.jpg', { left: 50, top: 50, width: 200, height: 200 });

app.get('/styles/:id/:tilesize/:extra/:z/:x/:y.png', async (req, res) => {
	const { id, tilesize, extra, z, x, y } = req.params;
	const size = parseInt(tilesize) * 2 * parseInt(extra) + parseInt(tilesize);
	const { lon, lat, zoom, width, height } = determineParameters(size, parseInt(z), parseFloat(x), parseFloat(y));

	console.log(lat, lon);

	try {
		const format = 'png';
		const url = `http://tileserver-gl:8080/styles/${id}/static/${lon},${lat},${zoom}/${width}x${height}@2x.${format}`;
		const cropped = await fetchAndCropImage(url, 'cropped.png', { left: 0, top: 0, width: size, height: size });
		res.set('Content-Type', `image/${format}`);
		res.send(cropped);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('Error fetching image: ' + error.message);
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
