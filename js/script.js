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

      map.on('load', () => {
        console.log('Map loaded');
        loadRegionData(region, config);
      });
    } else {
      map.flyTo({
        center: config.initialCenter,
        zoom: config.initialZoom,
        essential: true,
      });
      console.log('Switched to region:', region);
      loadRegionData(region, config);
    }
  } catch (error) {
    console.error('Failed to load region:', error);
  }
}

async function loadRegionData(region, config) {
  console.log('Loading data files:', config.dataFiles);

  for (const [layerName, fileName] of Object.entries(config.dataFiles)) {
    try {
      const geojsonResponse = await fetch(`data/${region}/${fileName}`);
      const geojson = await geojsonResponse.json();

      if (map.getLayer(layerName)) {
        map.removeLayer(layerName);
        map.removeSource(layerName);
      }

      map.addSource(layerName, {
        type: 'geojson',
        data: geojson,
      });

      const firstFeature = geojson.features?.[0];
      if (!firstFeature) continue;

      const geometryType = firstFeature.geometry.type;
      let layerType;
      let paint = {};

      if (geometryType === 'Point') {
        layerType = 'circle';
        paint = {
          'circle-radius': 6,
          'circle-color': '#FF4081',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
        };
      } else if (geometryType.includes('Polygon')) {
        layerType = 'fill';
        paint = {
          'fill-color': '#088',
          'fill-opacity': 0.6,
          'fill-outline-color': 'black',
        };
      } else if (geometryType.includes('LineString')) {
        layerType = 'line';
        paint = {
          'line-color': '#888',
          'line-width': 2,
        };
      } else {
        console.warn('Unknown geometry type:', geometryType);
        continue;
      }

      map.addLayer({
        id: layerName,
        type: layerType,
        source: layerName,
        paint: paint,
      });

      if (layerType === 'circle') {
        map.on('click', layerName, (e) => {
          const { geometry, properties } = e.features[0];
          const coords = geometry.coordinates;

          let html = `<b>${properties.name || 'Unnamed'}</b><br>`;
          if (properties.description) html += `${properties.description}<br>`;
          if (properties.status) html += `<em>Status:</em> ${properties.status}`;

          new mapboxgl.Popup().setLngLat(coords).setHTML(html).addTo(map);
        });

        map.on('mouseenter', layerName, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerName, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      console.log('Loaded layer:', layerName);
    } catch (e) {
      console.error(`Failed to load ${layerName}:`, e);
    }
  }
}

function createRegionSelector() {
  const selector = document.getElementById('region-selector');
  if (!selector) return;

  regions.forEach(region => {
    fetch(`data/${region}/config.json`)
      .then(res => res.json())
      .then(config => {
        const button = document.createElement('button');
        button.textContent = config.regionName || region.toUpperCase();
        button.onclick = () => loadRegion(region);
        selector.appendChild(button);
      })
      .catch(err => console.warn(`Failed to load config for ${region}:`, err));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  createRegionSelector();
  loadRegion('bay'); // Default load
});
