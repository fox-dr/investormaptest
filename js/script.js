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
