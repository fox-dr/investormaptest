mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';

const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
let map;

async function loadRegion(region) {
  // ... (your loadRegion function remains the same)
}

function createRegionSelector() {
  const selector = document.getElementById('region-selector');
  if (selector) { // Check if selector exists
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
