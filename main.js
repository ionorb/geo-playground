// import maplibregl from 'maplibre-gl';

// var citiesConfig = await fetch('http://localhost:3000/world_cities').then(response => response.json());

const basicStyle = {
	"version": 8,
	"name": "Basic Style",
	"sources": {
		"maplibre": {
			"url": "https://demotiles.maplibre.org/tiles/tiles.json",
			"type": "vector"
		},
	},
	"layers": [
		{
			"id": "background",
			"type": "background",
			"paint": {
				"background-color": "#e0e0e0"
			}
		},
		{
			"id": "coastline",
			"type": "line",
			"paint": {
				"line-blur": 0.5,
				"line-color": "#198EC8",
				"line-width": {
					"stops": [
						[
							0,
							2
						],
						[
							6,
							6
						],
						[
							14,
							9
						],
						[
							22,
							18
						]
					]
				}
			},
			"filter": [
				"all"
			],
			"layout": {
				"line-cap": "round",
				"line-join": "round",
				"visibility": "visible"
			},
			"source": "maplibre",
			"maxzoom": 24,
			"minzoom": 0,
			"source-layer": "countries"
		},
	],
	"glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", // You can use any public or self-hosted glyph endpoint
};

var fancyStyle = await fetch('https://demotiles.maplibre.org/style.json').then(response => response.json());

var michelinVectorStyle = await fetch('https://map.viamichelin.com/static/templates/eng-template-vector-michelin-modern-v11.json').then(response => response.json());

var michelinRasterStyle = {
	"version": 8,
	"name": "Michelin Raster Style",
	"sources": {
		"michelinRaster": {
			"type": "raster",
			"tiles": [
				"http://localhost:8080/styles/michelin/{z}/{x}/{y}@2x.png"
			],
			"tileSize": 256
		}
	},
	"layers": [
		{
			"id": "michelin-raster",
			"source": "michelinRaster",
			// "source-layer": "contries",
			"type": "raster",
			// "paint": {"line-color": "#198EC8"}
		}
	],
	"glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", // You can use any public or self-hosted glyph endpoint
};

var michelinConvertedRasterStyle = {
	"version": 8,
	"name": "Michelin Converted Raster Style",
	"sources": {
		"michelinRaster": {
			"type": "raster",
			"tiles": [
				"http://localhost:3001/styles/michelin/{z}/{x}/{y}.png"
			],
			"tileSize": 256
		}
	},
	"layers": [
		{
			"id": "michelin-raster",
			"source": "michelinRaster",
			// "source-layer": "contries",
			"type": "raster",
			// "paint": {"line-color": "#198EC8"}
		}
	],
	"glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", // You can use any public or self-hosted glyph endpoint
};

const paris = [2.3504, 48.8417];

var radioOptions = document.createElement('div');
radioOptions.innerHTML = `
	<input type="radio" id="basic" name="style" value="basic" checked>
	<label for="basic">Basic</label>
	<input type="radio" id="fancy" name="style" value="fancy">
	<label for="fancy">Fancy</label>
	<input type="radio" id="michelin" name="style" value="michelin">
	<label for="michelin">Michelin</label>
	<input type="radio" id="michelin-raster" name="style" value="michelin-raster">
	<label for="michelin-raster">Michelin Raster</label>
	<input type="radio" id="michelin-converted-raster" name="style" value="michelin-converted-raster">
	<label for="michelin-converted-raster">Michelin Converted Raster</label>
`;

radioOptions.onchange = function() {
	var selectedStyle = document.querySelector('input[name="style"]:checked').value;
	if (selectedStyle === 'basic') {
		map.setStyle(basicStyle);
	} else if (selectedStyle === 'fancy') {
		map.setStyle(fancyStyle);
	} else if (selectedStyle === 'michelin') {
		map.setStyle(michelinVectorStyle);
	} else if (selectedStyle === 'michelin-raster') {
		map.setStyle(michelinRasterStyle);
	} else if (selectedStyle === 'michelin-converted-raster') {
		map.setStyle(michelinConvertedRasterStyle);
	}
}

document.getElementById('extra').appendChild(radioOptions);

var goToParis = document.createElement('button');
goToParis.innerHTML = 'Go to Paris';
goToParis.onclick = function() {
	map.flyTo({
		center: paris,
		zoom: 10
	});
};

document.getElementById('extra').appendChild(goToParis);

var mapContainer = document.getElementById('map');
mapContainer.style.height = window.innerHeight - 50 + 'px';

// var leafletContainer = document.getElementById('leaflet-map');
// leafletContainer.style.height = '500px';//window.innerHeight - 50 + 'px';

var map = new maplibregl.Map({
	container: 'map', // container id
	style: basicStyle, // style URL
	center: paris, // starting position [lng, lat]
	zoom: 10 // starting zoom
});

map.showTileBoundaries = true;

// var leafletMap = L.map('leaflet-map').setView([51.505, -0.09], 13);

// // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
// L.tileLayer('http://localhost:3001/styles/michelin/{z}/{x}/{y}.png', {
// 	maxZoom: 19,
// 	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// }).addTo(leafletMap);

// L.GridLayer.GridDebug = L.GridLayer.extend({
// 	createTile: function (coords) {
// 		const tile = document.createElement('div');
// 		tile.style.outline = '1px solid green';
// 		tile.style.fontWeight = 'bold';
// 		tile.style.fontSize = '14pt';
// 		tile.innerHTML = [coords.z, coords.x, coords.y].join('/');
// 		return tile;
// 	},
// });

// L.gridLayer.gridDebug = function (opts) {
// 	return new L.GridLayer.GridDebug(opts);
// };

// leafletMap.addLayer(L.gridLayer.gridDebug());

// var reset = document.createElement('button');
// reset.innerHTML = 'Reset';
// reset.onclick = function() {
// 	leafletMap.setView([48.811111, 2.609167], 10);
// };

// document.getElementById('extra').appendChild(reset);

// map.on('load', function() {
// 	map.addSource('world-cities', {
// 		type: 'vector',
// 		tiles: citiesConfig.tiles,
// 		bounds: citiesConfig.bounds,
// 		minzoom: citiesConfig.minzoom,
// 		maxzoom: citiesConfig.maxzoom
// 	});

// 	citiesConfig.vector_layers.forEach(function(layer) {
// 		map.addLayer({
// 			id: layer.id + '-layer',
// 			type: 'circle',
// 			source: 'world-cities',
// 			'source-layer': layer.id,
// 			paint: {
// 				'circle-radius': 6,
// 				'circle-color': '#007cbf'
// 			},
// 		});
// 	});

// 	// map.addLayer({
// 	// 	id: 'cities-layer',
// 	// 	type: 'circle', // 'circle', 'symbol', 'fill'
// 	// 	source: 'world-cities', 
// 	// 	'source-layer': 'cities',
// 	// 	paint: {
// 	// 		'circle-radius': 6,
// 	// 		'circle-color': '#007cbf'
// 	// 	}
// 	// });
// });