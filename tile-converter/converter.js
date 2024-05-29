const express = require('express');
const axios = require('axios');
const app = express();
const port = 3001;

// Function to determine longitude, latitude, zoom, width, and height
function determineParameters(z, x, y) {
	// Placeholder function: implement logic to convert (z, x, y) to (lon, lat, zoom, width, height)
	return { lon: -74.0060, lat: 40.7128, zoom: z, width: 512, height: 512 };
}

app.get('/styles/:id/:z/:x/:y.png', async (req, res) => {
	const { id, z, x, y } = req.params;
	const { lon, lat, zoom, width, height } = determineParameters(z, x, y);

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
