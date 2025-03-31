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

      map.on('load', () => {
        console.log('Map style loaded.');
        loadRegionData(region, config); // Call the helper function
      });
    } else {
      map.flyTo({
        center: config.initialCenter,
        zoom: config.initialZoom,
        essential: true,
      });
      console.log('Map moved to:', config.initialCenter, config.initialZoom);

      loadRegionData(region, config); // Call the helper function
    }
  } catch (error) {
    console.error('Error loading region:', error);
  }
}

async function loadRegionData(region, config) {
  console.log('loadRegionData started:', region, config);
  // Helper function to load and add data
  for (const [layerName, fileName] of Object.entries(config.dataFiles)) {
    console.log('Loading GeoJSON:', layerName, fileName);
    const geojsonResponse = await fetch(`data/${region}/${fileName}`);
    console.log('GeoJSON response:', geojsonResponse);
    const geojson = await geojsonResponse.json();
    console.log('GeoJSON loaded:', layerName, geojson);

    if (map.getLayer(layerName)) {
      console.log('Removing existing layer:', layerName);
      map.removeLayer(layerName);
      map.removeSource(layerName);
      console.log('Layer and source removed:', layerName);
    }

    map.addSource(layerName, {
      type: 'geojson',
      data: geojson,
    });
    console.log('GeoJSON source added:', layerName);

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
    console.log('Layer type determined:', layerType);

    map.addLayer({
      id: layerName,
      type: layerType,
      source: layerName,
      layout: layerType === 'symbol' ? {
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
      } : layerType === 'symbol' ? { // **Crucial change here!**
        'icon-color': '#888',
        'circle-radius': 5,
        'circle-color': '#888',
      } : {
        'icon-color': '#888',
      },
    });
    console.log('Layer added:', layerName);

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
      console.log('Click event added:', layerName);
    }
  }
  console.log('loadRegionData finished:', region, config);
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

// Add DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
  createRegionSelector();
  loadRegion('bay'); // Load bay region only
});
