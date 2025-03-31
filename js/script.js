mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA'; // Replace with your token

const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
let map;

async function loadRegion(region) {
  try {
    const configResponse = await fetch(`data/${region}/config.json`);
    const config = await configResponse.json();

    if (!map) {
      map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11', // Use your desired style
        center: config.initialCenter,
        zoom: config.initialZoom
      });
    } else {
      map.flyTo({
        center: config.initialCenter,
        zoom: config.initialZoom,
        essential: true // This animation is considered essential with respect to prefers-reduced-motion
      });
    }

    // Load and add GeoJSON data
    for (const [layerName, fileName] of Object.entries(config.dataFiles)) {
      const geojsonResponse = await fetch(`data/<span class="math-inline">\{region\}/</span>{fileName}`);
      const geojson = await geojsonResponse.json();

      if (map.getLayer(layerName)) {
        map.removeLayer(layerName);
        map.removeSource(layerName);
      }

      map.addSource(layerName, {
        type: 'geojson',
        data: geojson
      });

      map.addLayer({
        id: layerName,
        type: 'fill', // or 'line', 'circle', etc. based on your GeoJSON
        source: layerName,
        paint: {
          'fill-color': '#088',
          'fill-opacity': 0.8
        }
      });
      map.setLayoutProperty(layerName, 'visibility', config.layerVisibility[layerName] ? 'visible' : 'none');
    }
  } catch (error) {
    console.error('Error loading region:', error);
  }
}

function createRegionSelector() {
  const selector = document.getElementById('region-selector');
  regions.forEach(region => {
    fetch(`data/${region}/config.json`)
    .then(response => response.json())
    .then(config => {
      const button = document.createElement('button');
      button.textContent = config.regionName;
      button.addEventListener('click', () => loadRegion(region));
      selector.appendChild(button);
    });
  });
}

// Initial load
createRegionSelector();
loadRegion('bay'); // Default region
