mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';

// At the top of your script.js file, import the new module
import { addCaseShillerLayer } from './caseShillerLayer.js';
import { addPinwheels, pinwheelMarkers } from './pinwheelLayer.js';
import { createSparklineSVG } from './sparkline.js';
import { addStaticRegionStats, gdpMarkers } from './regionStats.js';
import { fetchFredDataAndRenderCharts, fredChartsMarker } from './fredCharts.js';
import { fetchMetroOverviewAndDisplay } from './metroOverview.js';
import { setupLayerToggles } from './layerToggles.js';

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
       // pinwheelMarkers.forEach(marker => marker.remove());
        //pinwheelMarkers = [];
                pinwheelMarkers.length = 0;
    }

    if (gdpMarkers.length > 0) {
        // Change this:
        gdpMarkers.forEach(marker => marker.remove());
        // gdpMarkers = []; // <-- REMOVE THIS LINE

        // To this:
        gdpMarkers.length = 0;
    }
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
                        addPinwheels(map);
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
                // This is the call to set up your toggle switches
                setupLayerToggles(map, config);
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
