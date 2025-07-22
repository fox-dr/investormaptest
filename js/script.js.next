mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';

const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
let map;

// --- Start: NEW CODE FOR SLIDE MENUS ---

// Function to toggle the visibility of a panel
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    let buttonId;
    // Determine the corresponding button ID based on the panel ID
    if (panelId === 'region-selector') {
        buttonId = 'toggle-region-button';
    } else if (panelId === 'layer-toggle') {
        buttonId = 'toggle-layer-button';
    } else if (panelId === 'legend') {
        buttonId = 'toggle-legend-button';
    } else {
        return; // Exit if panelId is not recognized
    }
    const button = document.getElementById(buttonId);

    if (panel && button) {
        panel.classList.toggle('hidden');
        const isHidden = panel.classList.contains('hidden');
        button.setAttribute('aria-expanded', !isHidden);
        button.classList.toggle('open', !isHidden); // Add/remove 'open' class for button icon styling
    }
}

// --- End: NEW CODE FOR SLIDE MENUS ---

async function loadRegion(region) {
  document.getElementById('toggle-communities').checked = false;
  document.getElementById('toggle-lit').checked = false;
  document.getElementById('toggle-income').checked = false;//--added for consistency

  if (map && map.getStyle && map.getStyle().layers) {
  map.getStyle().layers.forEach(layer => {
    if (layer.id.startsWith('lit_')) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });
}

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

        // ✅ Load mascot icons
        const mascots = ['rabbit', 'tortoise', 'snail'];
        mascots.forEach((name) => {
          map.loadImage(`icons/${name}.png`, (error, image) => {
            if (error) {
              console.error(`Failed to load ${name}.png`, error);
              return;
            }
            if (!map.hasImage(`${name}-icon`)) {
              map.addImage(`${name}-icon`, image);
              console.log(`✅ ${name}-icon loaded`);
            }
          });
        });

        loadRegionData(region, config);
        addStaticRegionStats(map); // ✅ Add stat boxes
          // ✅ Add pinwheels
        fetch('data/pinwheels.geojson')
          .then(res => res.json())
          .then(data => {
            data.features.forEach(feature => {
              const values = feature.properties.values;
              const svg = createPinwheelSVG(values);

              //const tooltipText = values.map((v, i) => `${2019 + i}: ${v.toFixed(1)}`).join('<br>');
              const total = values.reduce((sum, val) => sum + val, 0).toFixed(0);
              const tooltipText = `
                census.gov/construction/bps/msamonthly.html<br>
                Permits per 100k households:<br>
                2019: <b>${values[0]}</b><br>
                2020: <b>${values[1]}</b><br>
                2021: <b>${values[2]}</b><br>
                2022: <b>${values[3]}</b><br>
                2023: <b>${values[4]}</b><br>
                2024: <b>${values[5]}</b><br>
                <em>Total (6 yrs): ${total}</em>
              `;

              const el = document.createElement('div');
              el.className = 'pinwheel-marker';
              el.innerHTML = `
                <div class="tooltip" style="position: relative; width: 60px; height: 60px;">
                  ${svg}
                  <div class="tooltiptext">${tooltipText}</div>
                </div>
              `;

              el.style.width = '60px';
              el.style.height = '60px';

              new mapboxgl.Marker(el)
                .setLngLat(feature.geometry.coordinates)
                .addTo(map);

      
              //const el = document.createElement('div');
              //el.innerHTML = svg;
              //el.style.width = '60px';
              //el.style.height = '60px';
              //el.style.pointerEvents = 'none';
      //
        //      new mapboxgl.Marker(el)
          //      .setLngLat(feature.geometry.coordinates)
            //    .addTo(map);
            });
          });
      });
function createPinwheelSVG(values) {
  const numSlices = values.length;
  const center = 30;
  const radius = 30;
  const maxValue = 2405; //Austin 2021 max
  const anglePerSlice = (2 * Math.PI) / numSlices;

  let paths = '';
  for (let i = 0; i < numSlices; i++) {
    const value = values[i];
    //const ratio = value / maxValue;
    //const r = radius * ratio;
    const scaledRatio = Math.pow(value / maxValue, 0.6); // Lift lower values
    const r = radius * scaledRatio;

    const angle1 = anglePerSlice * i;
    const angle2 = angle1 + anglePerSlice;

    const x1 = center + r * Math.cos(angle1);
    const y1 = center + r * Math.sin(angle1);
    const x2 = center + r * Math.cos(angle2);
    const y2 = center + r * Math.sin(angle2);
    const opacities = [0.2, 0.35, 0.5, 0.65, 0.8, 1]; // 2019 → 2024
    paths += `<path d="M${center},${center} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="rgba(254, 196, 79, ${opacities[i]})" stroke="black" stroke-width="0.5"/>`;

  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">${paths}</svg>`;
}
      
      
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
function addStaticRegionStats(map) {
  const stats = [
    {
      name: "United States",
      gdpTotal: "$26T",
      outputPerWorker: "$191K",
      lng: -103.4591,
      lat: 43.8791
    },
    {
      name: "Bay Area",
      gdpTotal: "$1.04T",
      outputPerWorker: "$399K",
      lng: -123.5,
      lat: 40.5
    },
    {
      name: "Sacramento",
      gdpTotal: "$150B",
      outputPerWorker: "$175K",
      lng: -117.7,
      lat: 38.2
    },
    {
      name: "SoCal",
      gdpTotal: "$1.5T",
      outputPerWorker: "$238K",
      lng: -113.5,
      lat: 34.0
    },
    {
      name: "Denver",
      gdpTotal: "$250B",
      outputPerWorker: "$172K",
      lng: -99.5,
      lat: 40.5
    },
    {
      name: "Austin",
      gdpTotal: "$198B",
      outputPerWorker: "$173K",
      lng: -97.0,
      lat: 33.5
    },
    {
      name: "Raleigh-Durham",
      gdpTotal: "$163B",
      outputPerWorker: "$183K",
      lng: -84.5,
      lat: 36.2
    }
  ];


  stats.forEach(stat => {
    const el = document.createElement('div');
    el.className = 'region-stat-box';
    el.innerHTML = `
  <strong>${stat.name}</strong><br>
  Total GDP: ${stat.gdpTotal}<br>
  Output per worker: ${stat.outputPerWorker}
  <div class="tooltip">ⓘ
    <span class="tooltiptext">
      GDP: BEA 2022 • Labor Force: BLS (LAUS) 2022<br>
      GDP per worker (25–54) = GDP ÷ est. workers<br>
      Workers = labor force × % 25–54<br>
      Estimates are approximate.
    </span>
  </div>
`;

    
    new mapboxgl.Marker(el)
      .setLngLat([stat.lng, stat.lat])
      .addTo(map);
  });
}
async function loadRegionData(region, config) {
  console.log('Loading data files:', config.dataFiles);

  // Clear region-related layers
  map.getStyle().layers.forEach((layer) => {
    if (layer.id.startsWith('communities_') || layer.id.startsWith('portfolio_') || layer.id.startsWith('amenities_')) {
      if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      if (map.getSource(layer.id)) map.removeSource(layer.id);
    }
  });
 
  // Hide income layers and reset toggle
  map.getStyle().layers.forEach(layer => {
    if (layer.id.startsWith('income_')) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });

  //--document.getElementById('toggle-income').checked = false; //--possible redundancy
  //--document.getElementById('toggle-lit').checked = false;//--possible redundancy


  for (const [layerName, fileName] of Object.entries(config.dataFiles)) {
    if (!layerName.startsWith('dns_')) { // Add this condition
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
        if (layerName.startsWith('entitlement_')) {
          map.addLayer({
            id: `${layerName}_mascots`,
            type: 'symbol',
            source: layerName,
            layout: {
              'icon-image': ['concat', ['get', 'mascot'], '-icon'],
              'icon-size': 0.5,
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'text-field': ['get', 'City'],
              'text-font': ['Open Sans Bold'],
              'text-size': 12,
              'text-offset': [0, 1.2]
            },
            paint: {
              'text-color': '#000000',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1
            }
          });
        }
  
        document.getElementById('toggle-income').onchange = function () {
          const visible = this.checked ? 'visible' : 'none';
          Object.keys(config.dataFiles).forEach(layerName => {
            if (layerName.startsWith('income_mln') && !layerName.startsWith('dns_')) {
              if (map.getLayer(layerName)) {
                map.setLayoutProperty(layerName, 'visibility', visible);
              }
            }
          });
        };
        document.getElementById('toggle-lit').onchange = function () {
          const visible = this.checked ? 'visible' : 'none';
          Object.keys(config.dataFiles).forEach(layerName => {
            if (layerName.startsWith('lit_') && !layerName.startsWith('dns_')) {
              if (map.getLayer(layerName)) {
                map.setLayoutProperty(layerName, 'visibility', visible);
              }
            }
          });
        };
        //--adding communities below
        document.getElementById('toggle-communities').onchange = function () {
          const visible = this.checked ? 'visible' : 'none';
          Object.keys(config.dataFiles).forEach(layerName => {
            if (layerName.startsWith('communities_') && !layerName.startsWith('dns_')) {
              if (map.getLayer(layerName)) {
                map.setLayoutProperty(layerName, 'visibility', visible);
              }
            }
          });
        };
       
        const firstFeature = geojson.features?.[0];
        if (!firstFeature) continue;
  
        const geometryType = firstFeature.geometry.type;
        let layerType;
        let paint = {};
  
        if (geometryType === 'Point') {
          layerType = 'circle';
          if (layerName.startsWith('income_mln')) {
            paint = {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4, 6,
                10, 8,
                14, 10
              ],
              'circle-color': [
                'case',
                ['any',
                ['==', ['get', 'miln_inc'], null],
                ['==', ['get', 'miln_inc'], 0],
                ['==', ['get', 'miln_inc'], '-']
                ],
                'rgba(0,0,0,0)',
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'miln_inc'],
                  74999, '#fde0dd',
                  99999, '#fa9fb5',
                  124999, '#c51b8a',
                  149999, '#7a0177'
                ]
              ],
              'circle-stroke-width': 0.7,
              'circle-stroke-color': '#fff',
              'circle-opacity': 0.7
            };
          } else if (layerName.startsWith('portfolio_')) {
            paint = {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4, 12,
                10, 10,
                14, 6
              ],
              'circle-color': [
                'match',
                ['get', 'status'],
                'Onboarded', 'rgba(153, 0, 13, 0.9)',
                'LOI', 'rgba(116, 196, 118, 0.9)',
                'In Feasibility', 'rgba(254, 227, 145, 0.9)',
                'Sold', 'rgba(0, 109, 44, 0.9)',
                'rgba(255, 0, 255, 1)' // hot pink fallback for debugging
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff',
            };
          }else if (layerName.startsWith('entitlement_')) {
            paint = {
              'circle-radius': 4,
              'circle-color': 'rgba(41, 121, 255, 0.3)',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#ffffff',
            };
          }else if (layerName.startsWith('communities_')) {
            paint = {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4, 12,
                10, 10,
                14, 6
              ],
              'circle-color': [
                'match',
                ['get', 'status'],
                'Active', 'rgba(8, 81, 156, 0.7)',
                'Close Out', 'rgba(49, 130, 189, 0.7)',
                'Grand Opening', 'rgba(107, 174, 214, 0.7)',
                'Coming Soon', 'rgba(189, 215, 231, 0.7)',
                'rgba(8, 81, 156, 0.7)' // fallback = Active
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
              };
            } else if (layerName.startsWith('resales_')) {
              paint = {
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  4, 6,
                  10, 8,
                  14, 10
                ],
                'circle-color': [
                  'match',
                  ['get', 'cohort_id'],
                  1, '#FFF9C4',
                  2, '#FFE082',
                  3, '#FFCA28',
                  4, '#FFB300',
                  5, '#FFA000',
                  '#000000' // fallback
                ],
                'circle-stroke-width': 0.7,
                'circle-stroke-color': '#fff',
                'circle-opacity': 0.7
              };
            } else if (layerName.startsWith('lit_')) {
                paint = {
                  'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'LIT_norm'],
                    0, 4,
                    100, 12
                  ],
                  'circle-color': [
                    'match',
                    ['get', 'LIT_tier'],
                    1, '#fae0dd',
                    2, '#fa9fb5',
                    3, '#c51b8a',
                    4, '#7a0177',
                    '#cccccc' // fallback
                  ],
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#cccccc',
                  'circle-opacity': 0.5
                };
          } else {
            paint = {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4, 12,
                10, 10,
                14, 6
              ],
              'circle-color': '#2979FF',
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff',
            };
          }
  
        } else if (geometryType.includes('Polygon')) {
          layerType = 'fill';
          paint = {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'median_income'],
              55000, '#f0f0f0',
              78000, '#a6bddb',
              104000, '#3690c0',
              111000, '#034e7b'
            ],
            'fill-opacity': 0.7,
            'fill-outline-color': '#ffffff'
          };
  
        } else if (geometryType.includes('LineString')) {
          layerType = 'line';
  
          if (layerName.startsWith('commute_corridors_')) {
            paint = {
              'line-width': 6,
              'line-color': [
                'match',
                ['get', 'congestion_level'],
                'High', '#FF3B30',
                'Medium', '#FF9500',
                'Low', '#34C759',
                '#A9A9A9'
              ],
              'line-opacity': 0.8
            };
          } else {
            paint = {
              'line-color': '#888',
              'line-width': 2,
            };
          }
  
        } else {
          console.warn('Unknown geometry type:', geometryType);
          continue;
        }
  
        map.addLayer({
          id: layerName,
          type: layerType,
          source: layerName,
          paint: paint,
          layout: {
            visibility: layerName.startsWith('dns_')
              ? 'none'
              : (config.layerVisibility && config.layerVisibility[layerName] === false)
                ? 'none'
                : (layerName.startsWith('income_mln') || layerName.startsWith('lit_') ? 'none' : 'visible')
          },
        });
  
        if (layerType === 'circle') {
            map.on('click', layerName, (e) => {
            const { geometry, properties } = e.features[0];
            const coords = geometry.coordinates;
            let html = '';
          
            if (layerName.startsWith('communities_')) {
              html += `<b>${properties.community || 'Unnamed'}</b><br>`;
              if (properties.builder) html += `${properties.builder}<br>`;
              if (properties.city && properties.state && properties.zip)
                html += `${properties.city}, ${properties.state} ${properties.zip}<br>`;
              if (properties.price_range) html += `${properties.price_range}<br>`;
              if (properties.sf_range) html += `${properties.sf_range}<br>`;
          
            } else if (layerName.startsWith('portfolio_')) {
              html += `<b>${properties.name || 'Unnamed'}</b><br>`;
              if (properties.description) html += `${properties.description}<br>`;
          
            } else if (layerName.startsWith('amenities_')) {
              html += `<b>${properties.name || 'Unnamed Amenity'}</b><br>`;
              if (properties.description) html += `${properties.description}<br>`;
          
            } else if (layerName.startsWith('income_')) {
              const county = properties.county_name || 'Unknown';
              const zip = properties.zip ? properties.zip.toString().split('.')[0] : null;
              const rawIncome = properties.miln_inc;
          
              let formattedIncome;
              if (rawIncome === null || rawIncome === '-' || isNaN(parseFloat(rawIncome))) {
                formattedIncome = 'No data';
              } else {
                formattedIncome = `$${parseFloat(rawIncome).toLocaleString(undefined, {
                  maximumFractionDigits: 0
                })}`;
              }
          
              html += `<div style="text-align:center;">`;
              html += `<b>${county} County</b><br>`;
              if (zip) html += `<small>ZIP ${zip}</small><br>`;
              html += `<strong>${formattedIncome}</strong>`;
              html += `</div>`;
          
            } else if (layerName.startsWith('resales_')) {
              html += `<strong>Resale Info</strong><br>`;
              html += `Price: ${properties.purchase_price || 'n/a'}<br>`;
              html += `Size: ${properties.building_size || 'n/a'} SF<br>`;
              html += `Lot: ${properties.lot_size_sqft || 'n/a'} SF<br>`;
            }
          
            // ✅ Show status on any layer that has it
            if (properties.status) {
              html += `<em>Status:</em> ${properties.status}`;
            }
          
            // ✅ Always show popup
            new mapboxgl.Popup()
              .setLngLat(coords)
              .setHTML(html)
              .addTo(map);
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

  // toggle communities
  document.getElementById('toggle-communities').onchange = function () {
    const visible = this.checked ? 'visible' : 'none';
    Object.keys(config.dataFiles).forEach(layerName => {
      if (layerName.startsWith('communities_') && !layerName.startsWith('dns_')) {
        if (map.getLayer(layerName)) {
          map.setLayoutProperty(layerName, 'visibility', visible);
        }
      }
    });
  };
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
    // Check for region in URL first (using getRegionCode from region-loader.js)
    // Assuming getRegionCode is in region-loader.js and loaded before script.js
    const initialRegion = getRegionCode();
    const defaultRegion = initialRegion || 'TTLC'; // Default to TTLC if no region in URL

    loadRegion(defaultRegion); // Load the initial or default region

    createRegionSelector();

    // --- Start: NEW CODE FOR SLIDE MENU EVENT LISTENERS AND INITIAL STATE ---
    // Get references to panels and buttons
    const regionSelectorPanel = document.getElementById('region-selector');
    const toggleRegionButton = document.getElementById('toggle-region-button');

    const layerTogglePanel = document.getElementById('layer-toggle');
    const toggleLayerButton = document.getElementById('toggle-layer-button');

    const legendPanel = document.getElementById('legend');
    const toggleLegendButton = document.getElementById('toggle-legend-button');

    // Set initial state and add event listeners
    if (toggleRegionButton && regionSelectorPanel) {
        toggleRegionButton.addEventListener('click', () => togglePanel('region-selector'));
        regionSelectorPanel.classList.add('hidden'); // Initially hide the panel
        toggleRegionButton.setAttribute('aria-expanded', 'false');
        toggleRegionButton.classList.remove('open'); // Ensure it starts closed
    }

    if (toggleLayerButton && layerTogglePanel) {
        toggleLayerButton.addEventListener('click', () => togglePanel('layer-toggle'));
        layerTogglePanel.classList.add('hidden'); // Initially hide the panel
        toggleLayerButton.setAttribute('aria-expanded', 'false');
        toggleLayerButton.classList.remove('open');
    }

    if (toggleLegendButton && legendPanel) {
        toggleLegendButton.addEventListener('click', () => togglePanel('legend'));
        legendPanel.classList.add('hidden'); // Initially hide the panel
        toggleLegendButton.setAttribute('aria-expanded', 'false');
        toggleLegendButton.classList.remove('open');
    }
    // --- End: NEW CODE FOR SLIDE MENU EVENT LISTENERS AND INITIAL STATE ---
});
