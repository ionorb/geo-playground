const express = require('express');
const axios = require('axios');
const app = express();
const port = 3001;
const cors = require("cors");

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

function determineParameters(z, x, y) {
	return { lon: tile2long(parseFloat(x)+0.5,z), lat: tile2lat(parseFloat(y)+0.5,z), zoom: z, width: 512, height: 512 };
}

app.get('/styles/:id/:z/:x/:y.png', async (req, res) => {
	const { id, z, x, y } = req.params;
	const { lon, lat, zoom, width, height } = determineParameters(z, x, y);

	console.log(lat, lon);

	try {
		const format = 'png';
		const url = `http://tileserver-gl:8080/styles/${id}/static/${lon},${lat},${zoom}/${width}x${height}@2x.${format}`;
		const response = await axios.get(url, { responseType: 'arraybuffer' });
		res.set('Content-Type', `image/${format}`);
		res.send(response.data);
	} catch (error) {
		res.status(500).send('Error fetching image: ' + error.message);
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
