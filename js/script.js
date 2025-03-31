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
        loadRegionData(region, config); // Call the simplified function
        console.log('Data load initiated.');
      });
    } else {
      map.flyTo({
        center: config.initialCenter,
        zoom: config.initialZoom,
        essential: true,
      });
      console.log('Map moved to:', config.initialCenter, config.initialZoom);

      loadRegionData(region, config); // Call the simplified function
      console.log('Data load initiated.');
    }
  } catch (error) {
    console.error('Error loading region:', error);
  }
}

async function loadRegionData(region, config) { // Simplified function
  console.log('Simplified loadRegionData: Loading portfolio');
  const geojsonResponse = await fetch(`data/${region}/portfolio_bay.geojson`);
  const geojson = await geojsonResponse.json();
  console.log('GeoJSON loaded:', geojson);

  if (map.getLayer('portfolio')) {
    map.removeLayer('portfolio');
    map.removeSource('portfolio');
  }

  map.addSource('portfolio', {
    type: 'geojson',
    data: geojson,
  });

  map.addLayer({
    id: 'portfolio',
    type: 'symbol',
    source: 'portfolio',
    layout: {
      'icon-image': 'marker-15',
      'icon-allow-overlap': true,
      'icon-anchor': 'bottom',
    },
    paint: {
      'icon-color': '#888',
    },
  });

  console.log('Portfolio layer added.');
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
