// region-loader.js
// Import the marker arrays from their respective modules
import { pinwheelMarkers } from './pinwheelLayer.js';
import { gdpMarkers } from './regionStats.js';
// Import the FRED charts marker
import { fredChartsMarker } from './fredCharts.js';
import { fetchMetroOverviewAndDisplay } from './metroOverview.js';

// The function to get the region from the URL, exported once.
export function getRegionCode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('region');
}

// The function to load the region config, exported once, with the correct URL.
export async function loadRegionConfig(region) {
    if (!region) {
        alert("No region specified. Please return to the homepage.");
        window.location.href = 'home.html';
        return;
    }
    const configUrl = `/investormaptest/data/${region}/config.json`;
    try {
        const response = await fetch(configUrl);
        if (!response.ok) throw new Error("Config not found");

        const config = await response.json();
        return config;
    } catch (error) {
        alert(`Unable to load region "${region}". Returning to homepage.`);
        window.location.href = 'home.html';
    }
}

// This is the function that handles all the logic that runs *after* a map move
async function handlePostMove(map, region) {
    console.log("Map moveend event triggered.");
    const centerCoords = map.getCenter().toArray();
    
    // Toggling checkboxes off
    document.getElementById('toggle-communities').checked = false;
    document.getElementById('toggle-lit').checked = false;
    document.getElementById('toggle-income').checked = false;

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
    
    if (document.getElementById('toggle-pinwheels').checked) {
        addPinwheels(map);
    }

    if (document.getElementById('toggle-gdp').checked) {
        addStaticRegionStats(map);
    }
    
    // Call the metro overview function, which still needs to be modularized
    if (region !== 'TTLC') {
        await fetchMetroOverviewAndDisplay(map, region, centerCoords);
    }
}

// The one, true function to load a region.
export async function loadRegion(map, region) {
    console.log(`Loading region: ${region}`);
    
    // Clear existing pinwheel markers and GDP markers
    pinwheelMarkers.forEach(marker => marker.remove());
    pinwheelMarkers.length = 0;
    gdpMarkers.forEach(marker => marker.remove());
    gdpMarkers.length = 0;
    
    const config = await loadRegionConfig(region);
    
    if (config) {
        // Determine the final destination coordinates for the map animation.
        let finalMapCenter = config.initialCenter;
        if (region === 'bay') {
            finalMapCenter = [-122.419167, 37.779167];
        }
        
        // Use a map.once event listener to fire our logic after the map animation is finished
        map.once('moveend', () => {
            handlePostMove(map, region);
        });

        // Fly the map to the new region's center and zoom level
        map.flyTo({ center: finalMapCenter, zoom: config.initialZoom });
    }
}
