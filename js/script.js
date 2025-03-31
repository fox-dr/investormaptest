mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';

const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
let map;

async function loadRegion(region) {
  try {
    const configResponse = await fetch(`data/${region}/config.json`);
    const config = await configResponse.json();
    console.log('Config loaded:', config);

    if (!map) {
      map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: config.initialCenter,
        zoom: config.initialZoom,
      });
      console.log('Map initialized:', map);
    } else {
      map.flyTo({
        center: config.initialCenter,
        zoom: config.initialZoom,
        essential: true,
      });
      console.log('Map moved to:', config.initialCenter, config.initialZoom);
    }

    // Load and add GeoJSON data
    for (const [layerName, fileName] of Object.entries(config.dataFiles)) {
      const geojsonResponse = await fetch(`data/${region}/${fileName}`); // Corrected path
      const geojson = await geojsonResponse.json();
      console.log('GeoJSON loaded:', layerName, geojson);

      if (map.getLayer(layerName)) {
        map.removeLayer(layerName);
        map.removeSource(layerName);
      }

      map.addSource(layerName, {
        type: 'geojson',
        data: geojson,
      });

      // Determine layer type based on GeoJSON
      const firstFeatureType = geojson.features[0].geometry.type;
      let layerType;
      if (firstFeatureType === 'Point') {
        layerType = 'symbol';
      } else if (firstFeatureType.includes('Polygon')) {
        layerType = 'fill';
      } else if (firstFeatureType === 'LineString' || firstFeatureType === 'MultiLineString') {
        layerType = 'line';
      } else {
        console.warn('Unknown geometry type:', firstFeatureType);
        continue; // Skip adding this layer
      }

      map.addLayer({
        id: layerName,
        type: layerType,
        source: layerName,
        layout: layerType === 'symbol' ? {
          'icon-image': 'marker-15',
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom',
        } : {}, // Empty layout for other types
        paint: layerType === 'fill' ? {
          'fill-color': '#088',
          'fill-opacity': 0.8,
          'fill-outline-color': 'black',
        } : layerType === 'line' ? {
          'line-color': '#888',
          'line-width': 2,
        } : {
          'icon-color': '#888',
        },
      });
      console.log('Layer added:', layerName, 'type:', layerType);

      // Add popup logic for point data
      if (layerType === 'symbol') {
        map.on('click', layerName, (e) => {
          const coordinates = e.features[0].geometry.coordinates.slice();
          const properties = e.features[0].properties;
          let html = `<b>${properties.name}</b><br>`;
          if (properties.description) {
            html += `${properties.description}<br>`;
          }
          if (properties.status) {
            html += `Status: ${properties.status}`;
          }
          new mapboxgl.Popup().setLngLat(coordinates).setHTML(html).addTo(map);
          console.log('Popup opened for:', properties.name);
        });
        console.log('Click event added to layer:', layerName);
      }
    }
  } catch (error) {
    console.error('Error loading region:', error);
  }
}

function createRegionSelector() {
  const selector = document.getElementById('region-selector');
  if (selector) {
    regions.forEach(region => {
      fetch(`data/${region}/config.json`)
        .then(response => response.json())
        .then(config => {
          const button = document.createElement('button');
          button.textContent = config.regionName;
          button.addEventListener('click', () => loadRegion(region));
          selector.appendChild(button);
        })
        .catch(error => {
          console.error('error fetching config.json for ' + region, error);
        });
    });
  } else {
    console.error('region-selector div not found!');
  }
}

async function init() { // Define an async init function
  createRegionSelector();
  await loadRegion('bay'); // Load bay region only (await it)
}

// Add DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', init); // Call init
