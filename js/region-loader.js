// New
// region-loader.js
// Import the marker arrays from their respective modules
import { pinwheelMarkers } from './pinwheelLayer.js';
import { gdpMarkers } from './regionStats.js';

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
// This is where you need to paste the body of your original loadRegion function.
export async function loadRegion(region) {
    console.log(`Loading region: ${region}`);
    
    // Clear existing pinwheel markers
    pinwheelMarkers.forEach(marker => marker.remove());
    pinwheelMarkers.length = 0;

    // Clear existing GDP markers
    gdpMarkers.forEach(marker => marker.remove());
    gdpMarkers.length = 0;

    // --- YOUR EXISTING LOAD REGION LOGIC GOES HERE ---
    // You should paste the body of your best, async loadRegion function here.
    // This function body likely contains a fetch call for the region config,
    // a map.flyTo, and other setup logic.
}
