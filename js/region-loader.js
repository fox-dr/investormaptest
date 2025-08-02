// region-loader.js
// Import the marker arrays from their respective modules
import { pinwheelMarkers } from './pinwheelLayer.js';
import { gdpMarkers } from './regionStats.js';
// Import the FRED charts marker
import { fredChartsMarker } from './fredCharts.js';

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

// The one, true function to load a region.
// This function now takes 'map' as a parameter to use the map instance.
export async function loadRegion(map, region) {
    console.log(`Loading region: ${region}`);
    
    // Clear existing pinwheel markers
    pinwheelMarkers.forEach(marker => marker.remove());
    pinwheelMarkers.length = 0;

    // Clear existing GDP markers
    gdpMarkers.forEach(marker => marker.remove());
    gdpMarkers.length = 0;
   
    // Get the region configuration from our new, exported function
    const config = await loadRegionConfig(region);

    if (config) {
        // Fly the map to the new region's center and zoom level
        map.flyTo({ center: config.center, zoom: config.zoom });
        // --- YOUR ORIGINAL loadRegion LOGIC ---
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

        // FIX: Remove existing metro overview marker when loading a new region
        if (metroOverviewMarker) { // Note: metroOverviewMarker is still undefined at this point
            metroOverviewMarker.remove();
            metroOverviewMarker = null;
        }
    }

}
