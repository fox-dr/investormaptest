mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';

// --- Imports ---
import { addCaseShillerLayer } from './caseShillerLayer.js';
import { addPinwheels, pinwheelMarkers } from './pinwheelLayer.js';
import { createSparklineSVG } from './sparkline.js';
import { addStaticRegionStats, gdpMarkers } from './regionStats.js';
import { fetchFredDataAndRenderCharts, fredChartsMarker } from './fredCharts.js';
import { fetchMetroOverviewAndDisplay, metroOverviewMarker } from './metroOverview.js';
import { setupLayerToggles } from './layerToggles.js';
import { getRegionCode } from './region-loader.js'; // Assuming getRegionCode is here

// --- Global Variables & Constants ---
const FRED_API_KEY = "7263c4512c658e1b732c98da7d5f5914"; // Your FRED API Key--needed for python script
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";
const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
let map;

// --- UI Functions ---

/**
 * Toggles the visibility of a UI panel (e.g., region selector, legend).
 * @param {string} panelId The ID of the panel element to toggle.
 */
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

// --- Data & Map Logic ---

/**
 * NOTE: This function was missing.
 * Placeholder for loading region-specific GeoJSON sources and layers.
 * You'll need to implement this based on your data structure.
 * @param {string} region The region code (e.g., 'bay').
 * @param {object} config The configuration object for the region.
 */
function loadRegionData(region, config) {
    console.log(`Stub: loadRegionData would now load layers for ${region}.`, config);
    // Example:
    // if (map.getSource('your-region-source-id')) {
    //     map.removeLayer('your-region-layer-id');
    //     map.removeSource('your-region-source-id');
    // }
    // map.addSource('your-region-source-id', { type: 'geojson', data: `data/${region}/your_data.geojson` });
    // map.addLayer({ ... });
}


/**
 * The main function to load and display data for a specific region.
 * @param {string} region The region code (e.g., 'bay', 'TTLC').
 */
async function loadRegion(region) {
    console.log(`Loading data for region: ${region}`);

    // --- 1. Clean up existing markers and layers from previous region ---
    if (metroOverviewMarker) metroOverviewMarker.remove();
    if (fredChartsMarker) fredChartsMarker.remove();
    if (pinwheelMarkers.length > 0) {
        pinwheelMarkers.forEach(marker => marker.remove());
        pinwheelMarkers.length = 0; // Clear the array
    }
    if (gdpMarkers.length > 0) {
        gdpMarkers.forEach(marker => marker.remove());
        gdpMarkers.length = 0; // Clear the array
    }

    try {
        // --- 2. Fetch the configuration for the new region ---
        const configResponse = await fetch(`data/${region}/config.json`);
        const config = await configResponse.json();
        console.log('Config loaded:', config);

        // For 'bay', we override the center to focus on SF City Hall.
        let finalMapCenter = config.initialCenter;
        if (region === 'bay') {
            finalMapCenter = [-122.419167, 37.779167]; // San Francisco City Hall
        }

        // --- 3. Define what happens AFTER the map moves ---
        const handlePostMove = async () => {
            // This runs after the map settles (initial load or flyTo)
            if (region !== 'TTLC') {
                await fetchMetroOverviewAndDisplay(map, region, finalMapCenter);
            }

            // Re-add layers that are controlled by toggles if they are checked
            if (document.getElementById('toggle-pinwheels').checked) {
                addPinwheels(map); // Pass map object for consistency
            }
            if (document.getElementById('toggle-gdp').checked) {
                addStaticRegionStats(map);
            }
        };

        // --- 4. Create map if it doesn't exist, or fly to new location if it does ---
        if (!map) {
            // INITIAL MAP LOAD
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/light-v11',
                center: finalMapCenter,
                zoom: config.initialZoom,
            });

            map.on('load', async () => {
                console.log('Map loaded for the first time.');

                // Load mascot icons
                const mascots = ['rabbit', 'tortoise', 'snail'];
                mascots.forEach((name) => {
                    map.loadImage(`icons/${name}.png`, (error, image) => {
                        if (error) return console.error(`Failed to load ${name}.png`, error);
                        if (!map.hasImage(`${name}-icon`)) {
                            map.addImage(`${name}-icon`, image);
                            console.log(`✅ ${name}-icon loaded`);
                        }
                    });
                });
                
                loadRegionData(region, config); // Call placeholder
                await fetchFredDataAndRenderCharts(map);
                await addCaseShillerLayer(map);

                handlePostMove(); // Run post-move logic on initial load

                // Set up layer toggle listeners once
                document.getElementById('toggle-pinwheels').addEventListener('change', (e) => {
                    if (e.target.checked) {
                        addPinwheels(map);
                    } else {
                        pinwheelMarkers.forEach(marker => marker.remove());
                        pinwheelMarkers.length = 0;
                    }
                });
                document.getElementById('toggle-gdp').addEventListener('change', (e) => {
                    if (e.target.checked) {
                        addStaticRegionStats(map);
                    } else {
                        gdpMarkers.forEach(marker => marker.remove());
                        gdpMarkers.length = 0;
                    }
                });
                
                setupLayerToggles(map, config);
            });

        } else {
            // SUBSEQUENT REGION CHANGE
            console.log('Switching to region:', region);
            loadRegionData(region, config); // Load new region's specific data
            
            // Wait for animation to finish, then run post-move logic
            map.once('moveend', handlePostMove);
            map.flyTo({
                center: finalMapCenter,
                zoom: config.initialZoom,
                essential: true,
            });
        }

    } catch (error) {
        console.error('Failed to load region:', error);
    }
}

/**
 * Creates the region selector buttons in the UI.
 */
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

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Determine initial region from URL or use default
    const initialRegion = getRegionCode();
    const defaultRegion = initialRegion || 'TTLC';
    
    loadRegion(defaultRegion); // Load the initial region
    createRegionSelector();

    // --- Set up event listeners for the slide-out menu buttons ---
    const menuConfigs = [
        { buttonId: 'toggle-region-button', panelId: 'region-selector' },
        { buttonId: 'toggle-layer-button', panelId: 'layer-toggle' },
        { buttonId: 'toggle-legend-button', panelId: 'legend' }
    ];

    menuConfigs.forEach(config => {
        const button = document.getElementById(config.buttonId);
        const panel = document.getElementById(config.panelId);
        if (button && panel) {
            button.addEventListener('click', () => togglePanel(config.panelId));
            panel.classList.add('hidden'); // Initially hide
            button.setAttribute('aria-expanded', 'false');
            button.classList.remove('open');
        }
    });
});
