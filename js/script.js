mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';

// At the top of your script.js file, import the new module
import { addCaseShillerLayer } from './caseShillerLayer.js';
import { addPinwheels, pinwheelMarkers } from './pinwheelLayer.js';
import { createSparklineSVG } from './sparkline.js';
import { addStaticRegionStats, gdpMarkers } from './regionStats.js';
import { fetchFredDataAndRenderCharts, fredChartsMarker } from './fredCharts.js';

// ... all your other massive code ...
// --- NEW/CORRECTED: FRED API constants (needed by fetchFredDataAndRenderCharts) ---
// Note: These are for client-side use with a local JSON file, so the API key
// is conceptually still "present" but used by your Python script.
// It's removed from direct use in the browser's fetch.
const FRED_API_KEY = "7263c4512c658e1b732c98da7d5f5914"; // Your FRED API Key--needed for python script
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";


const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
let map;
//let fredChartsMarker = null; // To hold the FRED charts Mapbox Marker instance
let metroOverviewMarker = null; // NEW: To hold the metro overview Mapbox Marker instance
//let pinwheelMarkers = []; // NEW: To hold pinwheel markers for easy removal
//let gdpMarkers = []; // NEW: To hold GDP markers for easy removal

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

    // If the FRED charts marker already exists, control its display based on the selected region
    if (fredChartsMarker) {
        const fredChartsElement = fredChartsMarker.getElement();
        if (region === 'TTLC') {
            fredChartsElement.style.display = 'flex'; // Show for TTLC
        } else {
            fredChartsElement.style.display = 'none'; // Hide for other regions
        }
    }

    // FIX: Remove existing metro overview marker when loading a new region
    if (metroOverviewMarker) {
        metroOverviewMarker.remove();
        metroOverviewMarker = null;
    }

    // FIX: Remove existing pinwheel and GDP markers when loading a new region
    if (pinwheelMarkers.length > 0) {
        pinwheelMarkers.forEach(marker => marker.remove());
        pinwheelMarkers = [];
    }
    if (gdpMarkers.length > 0) {
        gdpMarkers.forEach(marker => marker.remove());
        gdpMarkers = [];
    }

    try {
        const configResponse = await fetch(`data/${region}/config.json`);
        const config = await configResponse.json();
        console.log('Config loaded:', config);
        
        // FIX: Determine the final destination coordinates for the map animation.
        // For 'bay', this is SF City Hall. For others, it's the config's initialCenter.
        let finalMapCenter = config.initialCenter;
        if (region === 'bay') {
            finalMapCenter = [-122.419167, 37.779167]; // San Francisco City Hall
        }

        // This conditional logic handles both initial map creation and subsequent region changes.
        const handlePostMove = async () => {
            // This code runs *after* the map has moved to the new center
            if (region !== 'TTLC') {
                // FIX: Pass the new, corrected center coordinate to the flash-up function
                await fetchMetroOverviewAndDisplay(map, region, finalMapCenter);
            }
            
            // FIX: Re-run pinwheel and GDP logic after map moves
            // This ensures markers appear in the right place after the flyTo
            // And also allows them to be turned on/off by the new switches
            if (document.getElementById('toggle-pinwheels').checked) {
                addPinwheels();
            }
            if (document.getElementById('toggle-gdp').checked) {
                addStaticRegionStats(map);
            }
        };

        if (!map) {
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/light-v11',
                center: finalMapCenter, // FIX: Use the new, corrected center for initial map creation
                zoom: config.initialZoom,
            });

            map.on('load', async () => {
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
                await fetchFredDataAndRenderCharts(map);
                // --- case-shiller cities ---
                await addCaseShillerLayer(map);
                // For initial load, fire the post-move logic directly
                handlePostMove();

                // NEW: Add event listeners to the new toggle switches
                document.getElementById('toggle-pinwheels').addEventListener('change', () => {
                    if (document.getElementById('toggle-pinwheels').checked) {
                        addPinwheels();
                    } else {
                        pinwheelMarkers.forEach(marker => marker.remove());
                        pinwheelMarkers = [];
                    }
                });

                document.getElementById('toggle-gdp').addEventListener('change', () => {
                    if (document.getElementById('toggle-gdp').checked) {
                        addStaticRegionStats(map);
                    } else {
                        gdpMarkers.forEach(marker => marker.remove());
                        gdpMarkers = [];
                    }
                });
            });

        } else {
            // For subsequent region changes, wait for the flyTo animation to finish
            map.once('moveend', handlePostMove);
            map.flyTo({
                center: finalMapCenter, // FIX: Use the new, corrected center for flyTo
                zoom: config.initialZoom,
                essential: true,
            });
            console.log('Switched to region:', region);
            loadRegionData(region, config);
            
            // FIX: Clear markers immediately on region switch
            if (pinwheelMarkers.length > 0) {
                pinwheelMarkers.forEach(marker => marker.remove());
                pinwheelMarkers = [];
            }
            if (gdpMarkers.length > 0) {
                gdpMarkers.forEach(marker => marker.remove());
                gdpMarkers = [];
            }
        }

    } catch (error) {
        console.error('Failed to load region:', error);
    }
}

// FIX: New function to handle adding pinwheels
//async function addPinwheels() {
   // fetch('data/pinwheels.geojson')
  //      .then(res => res.json())
  //      .then(data => {
            // Clear existing markers before adding new ones
    //        pinwheelMarkers.forEach(marker => marker.remove());
     //       pinwheelMarkers = [];

     //       data.features.forEach(feature => {
     //           const values = feature.properties.values;
     //           const svg = createPinwheelSVG(values);
      //          const average = (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(0);
        //        const tooltipText = `
      //              <b>${feature.properties.msa}</b><br>
          //          Permits per 100k households:<br>
            //        2019: <b>${values[0]}</b><br>
              //      2020: <b>${values[1]}</b><br>
                //    2021: <b>${values[2]}</b><br>
                  //  2022: <b>${values[3]}</b><br>
//                    2023: <b>${values[4]}</b><br>
  //                  2024: <b>${values[5]}</b><br>
    //                <em>Average (6 yrs): ${average}<br></em>
      //              <span class="tooltip-source-url">census.gov/construction/bps/msamonthly.html</span>
        //        `;

          //      const el = document.createElement('div');
            //    el.className = 'pinwheel-marker';
              //  el.innerHTML = `
                //    <div class="tooltip" style="position: relative; width: 60px; height: 60px;">
                  //      ${svg}
                    //    <div class="tooltiptext">${tooltipText}</div>
                    //</div>
               // `;

                //el.style.width = '60px';
              //  el.style.height = '60px';

            //    const newMarker = new mapboxgl.Marker(el)
          //          .setLngLat(feature.geometry.coordinates)
        //            .addTo(map);

      //          pinwheelMarkers.push(newMarker);
    //        });
  //      });
//}

// Your existing createPinwheelSVG function
//function createPinwheelSVG(values) {
    //const numSlices = values.length;
   // const center = 30;
    //const radius = 30;
    //const maxValue = 2405; //Austin 2021 max
   // const anglePerSlice = (2 * Math.PI) / numSlices;

    //let paths = '';
    //for (let i = 0; i < numSlices; i++) {
    //    const value = values[i];
  //      const scaledRatio = Math.pow(value / maxValue, 0.6); // Lift lower values
//        const r = radius * scaledRatio;

        //const angle1 = anglePerSlice * i;
        //const angle2 = angle1 + anglePerSlice;

   //     const x1 = center + r * Math.cos(angle1);
   //     const y1 = center + r * Math.sin(angle1);
       // const x2 = center + r * Math.cos(angle2);
     //   const y2 = center + r * Math.sin(angle2);
   //     const opacities = [0.2, 0.35, 0.5, 0.65, 0.8, 1]; // 2019 → 2024
 //       paths += `<path d="M${center},${center} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="rgba(254, 196, 79, ${opacities[i]})" stroke="black" stroke-width="0.5"/>`;
//    }
  //  return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">${paths}</svg>`;
//}

// --- Start: NEW CODE FOR SPARKLINE SVG HELPER ---
//function createSparklineSVG(values) {
  //  if (!values || values.length < 2) return '';

    //const width = 180; // Width of the SVG
//    const height = 30; // Height of the SVG
  //  const padding = 5;

    //const minVal = Math.min(...values);
    //const maxVal = Math.max(...values);

    //const xScale = (index) => (index / (values.length - 1)) * (width - 2 * padding) + padding;
    //const yScale = (value) => {
      //  if (maxVal === minVal) return height / 2;
       // return height - ((value - minVal) / (maxVal - minVal)) * (height - 2 * padding) - padding;
    //};

   // let pathD = values.map((val, i) => {
     //   const x = xScale(i);
       // const y = yScale(val);
       // return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    //}).join(' ');

    //let circles = values.map((val, i) => {
      //  const x = xScale(i);
        //const y = yScale(val);
        // Only draw dots for the first and last point
        //if (i === 0 || i === values.length - 1) {
          //  return `<circle class="fred-sparkline-dot" cx="${x}" cy="${y}" r="3"></circle>`;
        //}
        //return '';
    //}).join('');

    //return `
      //  <svg class="fred-sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        //    <path class="fred-sparkline-line" d="${pathD}"/>
          //  ${circles}
        //</svg>
    //`;
//}
// --- End: NEW CODE FOR SPARKLINE SVG HELPER ---

// --- NEW/CORRECTED: Function to add existing static regional stats ---
//async function addStaticRegionStats(map) { // Made the function async
  //  try {
        // Fetch data from the local JSON file
    //    const response = await fetch('data/static_region_stats.json');
      //  if (!response.ok) {
        //    throw new Error(`Failed to load static_region_stats.json: ${response.statusText}`);
        //}
        //const stats = await response.json(); // Parse the JSON data

        // Clear existing GDP markers
        //gdpMarkers.forEach(marker => marker.remove());
        //gdpMarkers = [];

        //stats.forEach(stat => {
          //  const el = document.createElement('div');
            //el.className = 'region-stat-box';
            //el.innerHTML = `
              //  <strong>${stat.name}</strong><br>
               // Total GDP: ${stat.gdpTotal}<br>
               // Output per worker: ${stat.outputPerWorker}
                //<div class="tooltip">ⓘ
                  //  <span class="tooltiptext">
                    //    GDP: BEA 2022 • Labor Force: BLS (LAUS) 2022<br>
                      //  GDP per worker (25–54) = GDP ÷ est. workers<br>
                        //Workers = labor force × % 25–54<br>
                        //Estimates are approximate.
                    //</span>
               // </div>
           // `;

            //const newMarker = new mapboxgl.Marker(el)
              //  .setLngLat([stat.lng, stat.lat])
                //.addTo(map);

            //gdpMarkers.push(newMarker);
        //});
    //} catch (error) {
      //  console.error(`Error loading static region stats:`, error);
        // Optionally display a small error message on the map if it fails
        //const errorDiv = document.createElement('div');
        //errorDiv.className = 'region-stat-box'; // Reuse existing styling
        //errorDiv.style.cssText = 'background: rgba(255, 255, 255, 0.95); padding: 10px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 180px; text-align: center; color: red; font-family: Lato, sans-serif;';
        //errorDiv.innerHTML = `<div>Error loading Regional Stats.</div><div>${error.message}</div>`;

        //new mapboxgl.Marker(errorDiv)
          //  .setLngLat([-90, 45]) // Place error message in a visible, but arbitrary, spot
            //.addTo(map);
  //  }
//}

// --- End NEW/CORRECTED ---


// --- Start: MODIFIED CODE FOR FRED CHARTS (from local JSON) ---
//async function fetchFredDataAndRenderCharts(mapInstance) {
  //  try {
    //    const response = await fetch('data/TTLC/fred_charts_data.json?t=${Date.now()}');
      //  if (!response.ok) {
        //    throw new Error(`Failed to load local FRED data: ${response.statusText}`);
       // }
       // const results = await response.json();

        // Create the main container div once
        //const containerDiv = document.createElement('div');
        //containerDiv.id = 'fred-charts-container';
        //containerDiv.style.display = 'none'; // Initially hidden
        // The click event listener for the whole container should remain,
        // but individual 'i' clicks will stop propagation.
        //containerDiv.addEventListener('click', function(event) {
            // Only hide the container if the click didn't originate from an 'info-icon' or its tooltip
            // This ensures clicking the 'i' or the tooltip doesn't hide the whole chart
            //if (!event.target.closest('.info-icon') && !event.target.closest('.fred-tooltip')) {
            //    containerDiv.style.display = 'none';
          //  }
        //});

        // Use a DocumentFragment to build up chart items efficiently
        //const fragment = document.createDocumentFragment();

        //results.forEach(res => {
            //const fredChartItem = document.createElement('div');
            //fredChartItem.className = 'fred-chart-item';

            //if (res.error) {
                //fredChartItem.innerHTML = `
                    //<div class="fred-chart-label">${res.label}</div>
                  //  <div style="color: red; font-size: 11px;">Error: ${res.error}</div>
                //`;
               // fragment.appendChild(fredChartItem);
              //  return;
            //}

            //const change = res.latestValue - res.previousValue;
            //let arrowHtml = '';
            //let arrowClass = 'no-change';

            //if (change > 0) {
                //arrowHtml = '▲';
              //  arrowClass = 'positive';
            //} else if (change < 0) {
          //      arrowHtml = '▼';
        //        arrowClass = 'negative';
      //      } else {
    //            arrowHtml = '•'; // Dot for no change
  //          }
//
    //        let displayValue = res.latestValue;
  //          let unitSuffix = res.unit;
//
            //if (unitSuffix === 'K' && displayValue >= 1000) {
                //displayValue = displayValue / 1000;
                //unitSuffix = 'M';
                //formattedLatestValue = displayValue.toLocaleString(undefined, {
                  //  minimumFractionDigits: 1,
                //    maximumFractionDigits: 1
              //  });
            //} else {
                //formattedLatestValue = displayValue.toLocaleString(undefined, {
                  //  minimumFractionDigits: res.decimals,
                //    maximumFractionDigits: res.decimals
              //  });
            //}

            //formattedLatestValue += unitSuffix;

            //const sparklineSvg = createSparklineSVG(res.sparklineValues);

            // Create the individual chart item HTML structure
            //fredChartItem.innerHTML = `
                //<div class="fred-chart-label">${res.label}</div>
                //<div class="fred-value-row">
                    //<span class="fred-current-value">${formattedLatestValue}</span>
                  //  <span class="fred-change-arrow ${arrowClass}">${arrowHtml}</span> MoM
                //</div>
                //<div class="fred-chart-info">Last 6 Months (MoM Change)</div>
                //<div class="fred-sparkline-wrapper">
                  //  ${sparklineSvg}
                  //  <div class="info-icon">ⓘ</div>
                //    <div class="fred-tooltip" style="display: none;">${res.context_info || 'No context available.'}</div>
              //  </div>
            //`;

            // Add event listener to the info icon *after* it's been created in the DOM
            // This requires appending to fragment first, then querying within the fragment's context
            // or better, find the element after appending to the main container.
            // For now, let's create the element directly and append.

            //const infoIcon = fredChartItem.querySelector('.info-icon');
            //const fredTooltip = fredChartItem.querySelector('.fred-tooltip');

            //if (infoIcon && fredTooltip) {
                //infoIcon.addEventListener('click', function(event) {
                    //event.stopPropagation(); // Crucial: Prevent the container from hiding
                    // Hide any other open tooltips
                    //document.querySelectorAll('.fred-tooltip').forEach(tip => {
                    //    if (tip !== fredTooltip) {
                  //          tip.style.display = 'none';
                //        }
              //      });
                    // Toggle visibility of the current tooltip
            //        fredTooltip.style.display = fredTooltip.style.display === 'none' ? 'block' : 'none';
              //  });
            //}

          //  fragment.appendChild(fredChartItem);
        //});

        // Clear existing content and append the fragment to the containerDiv
        //containerDiv.innerHTML = ''; // Clear any previous content from error state, etc.
        //containerDiv.appendChild(fragment);

        // Remove existing FRED charts marker if it exists before adding a new one
        //if (fredChartsMarker) {
      //      fredChartsMarker.remove();
    //        fredChartsMarker = null;
  //      }
//
  //      const centerUS = [-98.5795, 39.8283];

//        fredChartsMarker = new mapboxgl.Marker(containerDiv)
          //  .setLngLat(centerUS)
        //    .addTo(mapInstance);

      //  fredChartsMarker.getElement().style.display = 'none'; // Initially hidden
    //} catch (error) {
  //      console.error(`Error fetching FRED data from local JSON:`, error);
//        if (fredChartsMarker) {
            //fredChartsMarker.remove();
          //  fredChartsMarker = null;
        //}
      //  const errorDiv = document.createElement('div');
    //    errorDiv.id = 'fred-charts-container';
  //      errorDiv.style.cssText = 'background: rgba(255, 255, 255, 0.95); padding: 10px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 200px; text-align: center; color: red; font-family: Lato, sans-serif;';
//        //errorDiv.innerHTML = `<div>Error loading FRED charts.</div><div>${error.message}</div>`;

      //  fredChartsMarker = new mapboxgl.Marker(errorDiv)
    //        .setLngLat([-98.5795, 39.8283])
  //          .addTo(mapInstance);
//
    //    fredChartsMarker.getElement().style.display = 'flex';
  //  }
//}
// --- End NEW/CORRECTED ---

// NEW: Function to fetch and display metro overview
//async function fetchMetroOverviewAndDisplay(mapInstance, regionCode, centerCoords) {
  //  try {
        // Remove existing metro overview marker if it exists
    //    if (metroOverviewMarker) {
      //      metroOverviewMarker.remove();
        //    metroOverviewMarker = null;
        //}

 //       const response = await fetch(`data/${regionCode}/metro_overview_${regionCode}.json?t=${Date.now()}`);
   //     if (!response.ok) {
     //       throw new Error(`Failed to load metro overview data for ${regionCode}: ${response.statusText}`);
        }
       // const overviewData = await response.json();

        //const overviewDiv = document.createElement('div');
        //overviewDiv.id = 'metro-overview-flash';
        //overviewDiv.className = 'metro-overview-flash'; // Apply common styling class
        
        // Populate with data
        //overviewDiv.innerHTML = `
          //  <h2>${overviewData.marketName} Metro Area</h2>
            //<p><strong>Total Builders:</strong> ${overviewData.totalBuilders}</p>
           // <p><strong>Total Communities:</strong> ${overviewData.totalCommunities}</p>
            //<p><strong>Average Home Price:</strong> ${overviewData.avgPrice}</p>
            //<p><strong>Average Square Footage:</strong> ${overviewData.avgSF}</p>
            //<small>Click anywhere to dismiss</small>
       // `;

        // Add click listener to dismiss the flash-up
//        overviewDiv.addEventListener('click', function() {
  //          overviewDiv.style.display = 'none'; // Hide on click
    //    });

        // Determine coordinates for the marker
      //  let markerCoords = centerCoords; // Default to region's initial center
        //if (regionCode === 'bay') {
            // Specific coordinates for San Francisco City Hall
            // NOTE: Longitude comes first in Mapbox GL JS
          //  markerCoords = [-122.419167, 37.779167];
       // }

        // Create a Mapbox Marker for the overview
//        metroOverviewMarker = new mapboxgl.Marker(overviewDiv)
  //          .setLngLat(markerCoords) // Use determined coordinates
    //        .addTo(mapInstance);

        // Initially show it
      //  overviewDiv.style.display = 'block';

//    } catch (error) {
  //      console.error(`Error fetching metro overview for ${regionCode}:`, error);
        // Optionally display a small error message on the map if it fails
    //    const errorDiv = document.createElement('div');
      //  errorDiv.className = 'metro-overview-flash-error'; // A specific error style
        //errorDiv.innerHTML = `<div>Error loading Metro Overview for ${regionCode}.</div><div>${error.message}</div>`;
        
        //if (metroOverviewMarker) {
          //  metroOverviewMarker.remove(); // Remove any previous partial marker
        //}
        //metroOverviewMarker = new mapboxgl.Marker(errorDiv)
          //  .setLngLat(centerCoords) // Fallback to centerCoords for error display
            //.addTo(mapInstance);
        //metroOverviewMarker.getElement().style.display = 'block';
    //}
//}


// FIX: New function to handle adding pinwheels
//async function addPinwheels() {
    //fetch('data/pinwheels.geojson')
        //.then(res => res.json())
        //.then(data => {
            // Clear existing markers before adding new ones
            //pinwheelMarkers.forEach(marker => marker.remove());
            //pinwheelMarkers = [];

            //data.features.forEach(feature => {
                //const values = feature.properties.values;
                //const svg = createPinwheelSVG(values);
                //const average = (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(0);
                //const tooltipText = `
              //      <b>${feature.properties.msa}</b><br>
            //        Permits per 100k households:<br>
          //          2019: <b>${values[0]}</b><br>
        //            2020: <b>${values[1]}</b><br>
      //              2021: <b>${values[2]}</b><br>
    //                2022: <b>${values[3]}</b><br>
  //                  2023: <b>${values[4]}</b><br>
//                    2024: <b>${values[5]}</b><br>
                    //<em>Average (6 yrs): ${average}<br></em>
                  //  <span class="tooltip-source-url">census.gov/construction/bps/msamonthly.html</span>
                //`;

                //const el = document.createElement('div');
                //el.className = 'pinwheel-marker';
              //  el.innerHTML = `
            //        <div class="tooltip" style="position: relative; width: 60px; height: 60px;">
          //              ${svg}
        //                <div class="tooltiptext">${tooltipText}</div>
      //              </div>
    //            `;

  //              el.style.width = '60px';
//                el.style.height = '60px';

            //    const newMarker = new mapboxgl.Marker(el)
          //          .setLngLat(feature.geometry.coordinates)
        //            .addTo(map);

      //          pinwheelMarkers.push(newMarker);
    //        });
  //      });
//}

// Your existing createPinwheelSVG function
//function createPinwheelSVG(values) {
    //const numSlices = values.length;
    //const center = 30;
    //const radius = 30;
    //const maxValue = 2405; //Austin 2021 max
    //const anglePerSlice = (2 * Math.PI) / numSlices;

    //let paths = '';
    //for (let i = 0; i < numSlices; i++) {
        //const value = values[i];
        //const scaledRatio = Math.pow(value / maxValue, 0.6); // Lift lower values
        //const r = radius * scaledRatio;

        //const angle1 = anglePerSlice * i;
        //const angle2 = angle1 + anglePerSlice;

        //const x1 = center + r * Math.cos(angle1);
        //const y1 = center + r * Math.sin(angle1);
        //const x2 = center + r * Math.cos(angle2);
        //const y2 = center + r * Math.sin(angle2);
        //const opacities = [0.2, 0.35, 0.5, 0.65, 0.8, 1]; // 2019 → 2024
      //  paths += `<path d="M${center},${center} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="rgba(254, 196, 79, ${opacities[i]})" stroke="black" stroke-width="0.5"/>`;
    //}
  //  return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">${paths}</svg>`;
//}

// --- Start: NEW CODE FOR SPARKLINE SVG HELPER ---
//function createSparklineSVG(values) {
  //  if (!values || values.length < 2) return '';

//    const width = 180; // Width of the SVG
  //  const height = 30; // Height of the SVG
    //const padding = 5;

    //const minVal = Math.min(...values);
    //const maxVal = Math.max(...values);

    //const xScale = (index) => (index / (values.length - 1)) * (width - 2 * padding) + padding;
    //const yScale = (value) => {
      //  if (maxVal === minVal) return height / 2;
        //return height - ((value - minVal) / (maxVal - minVal)) * (height - 2 * padding) - padding;
    //};

    //let pathD = values.map((val, i) => {
    //    const x = xScale(i);
     //   const y = yScale(val);
       // return `${i === 0 ? 'M' : 'L'}${x},${y}`;
   // }).join(' ');

   // let circles = values.map((val, i) => {
    //    const x = xScale(i);
      //  const y = yScale(val);
        // Only draw dots for the first and last point
        //if (i === 0 || i === values.length - 1) {
          //  return `<circle class="fred-sparkline-dot" cx="${x}" cy="${y}" r="3"></circle>`;
       // }
       // return '';
    //}).join('');

    //return `
      //  <svg class="fred-sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        //    <path class="fred-sparkline-line" d="${pathD}"/>
          //  ${circles}
        //</svg>
    //`;
//}
// --- End: NEW CODE FOR SPARKLINE SVG HELPER ---

// --- NEW/CORRECTED: Function to add existing static regional stats ---
//async function addStaticRegionStats(map) { // Made the function async
  //  try {
        // Fetch data from the local JSON file
    //    const response = await fetch('data/static_region_stats.json');
      //  if (!response.ok) {
        //    throw new Error(`Failed to load static_region_stats.json: ${response.statusText}`);
//        }
  //      const stats = await response.json(); // Parse the JSON data

        // Clear existing GDP markers
    //    gdpMarkers.forEach(marker => marker.remove());
      //  gdpMarkers = [];

        //stats.forEach(stat => {
          //  const el = document.createElement('div');
            //el.className = 'region-stat-box';
            //el.innerHTML = `
              //  <strong>${stat.name}</strong><br>
                //Total GDP: ${stat.gdpTotal}<br>
                //Output per worker: ${stat.outputPerWorker}
                //<div class="tooltip">ⓘ
                  //  <span class="tooltiptext">
                    //    GDP: BEA 2022 • Labor Force: BLS (LAUS) 2022<br>
                      //  GDP per worker (25–54) = GDP ÷ est. workers<br>
                        //Workers = labor force × % 25–54<br>
                        //Estimates are approximate.
                    //</span>
                //</div>
            //`;

            //const newMarker = new mapboxgl.Marker(el)
              //  .setLngLat([stat.lng, stat.lat])
                //.addTo(map);

            //gdpMarkers.push(newMarker);
       // });
    //} catch (error) {
      //  console.error(`Error loading static region stats:`, error);
        // Optionally display a small error message on the map if it fails
        //const errorDiv = document.createElement('div');
        //errorDiv.className = 'region-stat-box'; // Reuse existing styling
        //errorDiv.style.cssText = 'background: rgba(255, 255, 255, 0.95); padding: 10px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 180px; text-align: center; color: red; font-family: Lato, sans-serif;';
        //errorDiv.innerHTML = `<div>Error loading Regional Stats.</div><div>${error.message}</div>`;

        //new mapboxgl.Marker(errorDiv)
          //  .setLngLat([-90, 45]) // Place error message in a visible, but arbitrary, spot
            //.addTo(map);
    //}
//}

// --- End NEW/CORRECTED ---


// --- Start: MODIFIED CODE FOR FRED CHARTS (from local JSON) ---
//async function fetchFredDataAndRenderCharts(mapInstance) {
  //  try {
    //    const response = await fetch('data/TTLC/fred_charts_data.json?t=${Date.now()}');
      //  if (!response.ok) {
        //    throw new Error(`Failed to load local FRED data: ${response.statusText}`);
        //}
        //const results = await response.json();

        // Create the main container div once
       // const containerDiv = document.createElement('div');
//        containerDiv.id = 'fred-charts-container';
  //      containerDiv.style.display = 'none'; // Initially hidden
        // The click event listener for the whole container should remain,
        // but individual 'i' clicks will stop propagation.
    //    containerDiv.addEventListener('click', function(event) {
            // Only hide the container if the click didn't originate from an 'info-icon' or its tooltip
            // This ensures clicking the 'i' or the tooltip doesn't hide the whole chart
      //      if (!event.target.closest('.info-icon') && !event.target.closest('.fred-tooltip')) {
        //        containerDiv.style.display = 'none';
          //  }
//        });

        // Use a DocumentFragment to build up chart items efficiently
  //      const fragment = document.createDocumentFragment();

    //    results.forEach(res => {
      //      const fredChartItem = document.createElement('div');
        //    fredChartItem.className = 'fred-chart-item';

          //  if (res.error) {
            //    fredChartItem.innerHTML = `
              //      <div class="fred-chart-label">${res.label}</div>
                //    <div style="color: red; font-size: 11px;">Error: ${res.error}</div>
                //`;
 //               fragment.appendChild(fredChartItem);
   //             return;
     //       }

       //     const change = res.latestValue - res.previousValue;
         //   let arrowHtml = '';
           // let arrowClass = 'no-change';

            //if (change > 0) {
//                arrowHtml = '▲';
  //              arrowClass = 'positive';
    //        } else if (change < 0) {
      //          arrowHtml = '▼';
        //        arrowClass = 'negative';
          //  } else {
            //    arrowHtml = '•'; // Dot for no change
            //}

            //let displayValue = res.latestValue;
//            let unitSuffix = res.unit;
//
  //          if (unitSuffix === 'K' && displayValue >= 1000) {
    //            displayValue = displayValue / 1000;
      //          unitSuffix = 'M';
        //        formattedLatestValue = displayValue.toLocaleString(undefined, {
          //          minimumFractionDigits: 1,
            //        maximumFractionDigits: 1
              //  });
//            } else {
  //              formattedLatestValue = displayValue.toLocaleString(undefined, {
    //                minimumFractionDigits: res.decimals,
      //              maximumFractionDigits: res.decimals
        //        });
          //  }
//
  //          formattedLatestValue += unitSuffix;
//
  //          const sparklineSvg = createSparklineSVG(res.sparklineValues);

            // Create the individual chart item HTML structure
    //        fredChartItem.innerHTML = `
      //          <div class="fred-chart-label">${res.label}</div>
        //        <div class="fred-value-row">
          //          <span class="fred-current-value">${formattedLatestValue}</span>
            //        <span class="fred-change-arrow ${arrowClass}">${arrowHtml}</span> MoM
              //  </div>
                //<div class="fred-chart-info">Last 6 Months (MoM Change)</div>
                //<div class="fred-sparkline-wrapper">
  //                  ${sparklineSvg}
    //                <div class="info-icon">ⓘ</div>
      //              <div class="fred-tooltip" style="display: none;">${res.context_info || 'No context available.'}</div>
        //        </div>
          //  `;

            // Add event listener to the info icon *after* it's been created in the DOM
            // This requires appending to fragment first, then querying within the fragment's context
            // or better, find the element after appending to the main container.
            // For now, let's create the element directly and append.

            //const infoIcon = fredChartItem.querySelector('.info-icon');
 //           const fredTooltip = fredChartItem.querySelector('.fred-tooltip');
//
  //          if (infoIcon && fredTooltip) {
    //            infoIcon.addEventListener('click', function(event) {
      //              event.stopPropagation(); // Crucial: Prevent the container from hiding
        //            // Hide any other open tooltips
          //          document.querySelectorAll('.fred-tooltip').forEach(tip => {
            //            if (tip !== fredTooltip) {
              //              tip.style.display = 'none';
                //        }
                  //  });
                    // Toggle visibility of the current tooltip
                    //fredTooltip.style.display = fredTooltip.style.display === 'none' ? 'block' : 'none';
                //});
            //}

            //fragment.appendChild(fredChartItem);
//        });

  //      // Clear existing content and append the fragment to the containerDiv
    //    containerDiv.innerHTML = ''; // Clear any previous content from error state, etc.
      //  containerDiv.appendChild(fragment);

        // Remove existing FRED charts marker if it exists before adding a new one
        //if (fredChartsMarker) {
          //  fredChartsMarker.remove();
            //fredChartsMarker = null;
        //}

//        const centerUS = [-98.5795, 39.8283];
//
  //      fredChartsMarker = new mapboxgl.Marker(containerDiv)
    //        .setLngLat(centerUS)
      //      .addTo(mapInstance);
//
  //      fredChartsMarker.getElement().style.display = 'none'; // Initially hidden
    //} catch (error) {
      //  console.error(`Error fetching FRED data from local JSON:`, error);
        //if (fredChartsMarker) {
          //  fredChartsMarker.remove();
            //fredChartsMarker = null;
        //}
        //const errorDiv = document.createElement('div');
        //errorDiv.id = 'fred-charts-container';
        //errorDiv.style.cssText = 'background: rgba(255, 255, 255, 0.95); padding: 10px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 200px; text-align: center; color: red; font-family: Lato, sans-serif;';
        //errorDiv.innerHTML = `<div>Error loading FRED charts.</div><div>${error.message}</div>`;

        //fredChartsMarker = new mapboxgl.Marker(errorDiv)
          //  .setLngLat([-98.5795, 39.8283])
            //.addTo(mapInstance);

        //fredChartsMarker.getElement().style.display = 'flex';
    //}
//}
// --- End MODIFIED CODE FOR FRED CHARTS ---

// NEW: Function to fetch and display metro overview
//async function fetchMetroOverviewAndDisplay(mapInstance, regionCode, centerCoords) {
//    try {
        // Remove existing metro overview marker if it exists
//        if (metroOverviewMarker) {
  //          metroOverviewMarker.remove();
   //         metroOverviewMarker = null;
   //     }

  //      const response = await fetch(`data/${regionCode}/metro_overview_${regionCode}.json?t=${Date.now()}`);
//        if (!response.ok) {
          //  throw new Error(`Failed to load metro overview data for ${regionCode}: ${response.statusText}`);
        //}
        //const overviewData = await response.json();

        //const overviewDiv = document.createElement('div');
       // overviewDiv.id = 'metro-overview-flash';
        //overviewDiv.className = 'metro-overview-flash'; // Apply common styling class
        
        // Populate with data
        //overviewDiv.innerHTML = `
            //<h2>${overviewData.marketName} Metro Area</h2>
            //<p><strong>Total Builders:</strong> ${overviewData.totalBuilders}</p>
            //<p><strong>Total Communities:</strong> ${overviewData.totalCommunities}</p>
            //<p><strong>Average Home Price:</strong> ${overviewData.avgPrice}</p>
           // <p><strong>Average Square Footage:</strong> ${overviewData.avgSF}</p>
         //   <small>Click anywhere to dismiss</small>
       // `;

        // Add click listener to dismiss the flash-up
        //overviewDiv.addEventListener('click', function() {
          //  overviewDiv.style.display = 'none'; // Hide on click
        //});

        // Determine coordinates for the marker
        //let markerCoords = centerCoords; // Default to region's initial center
        //if (regionCode === 'bay') {
            // Specific coordinates for San Francisco City Hall
            // NOTE: Longitude comes first in Mapbox GL JS
          //  markerCoords = [-122.419167, 37.779167];
        //}

        // Create a Mapbox Marker for the overview
        //metroOverviewMarker = new mapboxgl.Marker(overviewDiv)
      //      .setLngLat(markerCoords) // Use determined coordinates
    //        .addTo(mapInstance);

        // Initially show it
  //      overviewDiv.style.display = 'block';

//    } catch (error) {
        //console.error(`Error fetching metro overview for ${regionCode}:`, error);
        // Optionally display a small error message on the map if it fails
        //const errorDiv = document.createElement('div');
        //errorDiv.className = 'metro-overview-flash-error'; // A specific error style
      //  errorDiv.innerHTML = `<div>Error loading Metro Overview for ${regionCode}.</div><div>${error.message}</div>`;
        
    //    if (metroOverviewMarker) {
  //          metroOverviewMarker.remove(); // Remove any previous partial marker
//        }
        //metroOverviewMarker = new mapboxgl.Marker(errorDiv)
        //    .setLngLat(centerCoords) // Fallback to centerCoords for error display
      //      .addTo(mapInstance);
    //    metroOverviewMarker.getElement().style.display = 'block';
  //  }
//}


async function loadRegionData(region, config) {
    console.log('Loading data files:', config.dataFiles);

    // Clear region-related layers
    map.getStyle().layers.forEach((layer) => {
        if (layer.id.startsWith('communities_') || layer.id.startsWith('portfolio_') || layer.id.startsWith('amenities_') || layer.id.startsWith('entitlement_')) {
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
    //--document.getElementById('toggle-communities').checked = false;


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

                document.getElementById('toggle-income').onchange = function() {
                    const visible = this.checked ? 'visible' : 'none';
                    Object.keys(config.dataFiles).forEach(layerName => {
                        if (layerName.startsWith('income_mln') && !layerName.startsWith('dns_')) {
                            if (map.getLayer(layerName)) {
                                map.setLayoutProperty(layerName, 'visibility', visible);
                            }
                        }
                    });
                };
                document.getElementById('toggle-lit').onchange = function() {
                    const visible = this.checked ? 'visible' : 'none';
                    Object.keys(config.dataFiles).forEach(layerName => {
                        if (layerName.startsWith('lit_') && !layerName.startsWith('dns_')) {
                            if (map.getLayer(layerName)) {
                                map.setLayoutProperty(layerName, 'visibility', visible);
                            }
                        }
                    });
                };
                //--added communities below
                document.getElementById('toggle-communities').onchange = function() {
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
                    } else if (layerName.startsWith('entitlement_')) {
                        paint = {
                            'circle-radius': 4,
                            'circle-color': 'rgba(41, 121, 255, 0.3)',
                            'circle-stroke-width': 1,
                            'circle-stroke-color': '#ffffff',
                        };
                    } else if (layerName.startsWith('communities_')) {
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
                        visibility: layerName.startsWith('dns_') ?
                            'none' :
                            (config.layerVisibility && config.layerVisibility[layerName] === false) ?
                            'none' :
                            (layerName.startsWith('income_mln') || layerName.startsWith('lit_') || layerName.startsWith('communities_') ? 'none' : 'visible')
                    },
                });

                if (layerType === 'circle') {
                    map.on('click', layerName, (e) => {
                        const {
                            geometry,
                            properties
                        } = e.features[0];
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
                            html += `</div>`;
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
    document.getElementById('toggle-communities').onchange = function() {
        const visible = this.checked ? 'visible' : 'none';
        Object.keys(config.dataFiles).forEach(layerName => {
            if (layerName.startsWith('communities_') && !layerName.startsWith('dns_')) {
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
