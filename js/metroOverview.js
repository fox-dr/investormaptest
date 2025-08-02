/**
 * metroOverview.js
 * * This module is responsible for fetching and displaying a metro area overview popup on the map.
 * It manages its own state, creating and removing the popup as needed.
 */

// 1. Declare and EXPORT the popup variable. It is scoped to this module.
//    We use 'Popup' because that's what your original code created.
export let metroOverviewPopup = null;

/**
 * Fetches metro overview data, creates a popup, and displays it on the map.
 * It automatically removes any previously created popup from this module.
 * @param {mapboxgl.Map} map The Mapbox GL JS map instance.
 * @param {string} regionCode The code for the region to display (e.g., 'bay', 'aus').
 * @param {Array<number>} centerCoords The [lng, lat] coordinates for the popup.
 */
export async function fetchMetroOverviewAndDisplay(map, regionCode, centerCoords) {
    // 2. Cleanup: If a popup from this module already exists, remove it first.
    if (metroOverviewPopup) {
        metroOverviewPopup.remove();
        metroOverviewPopup = null; // Clear the reference
    }

    try {
        // 3. Fetch the data (from your original logic).
        const response = await fetch('data/metro_overview.json');
        if (!response.ok) {
            throw new Error(`Failed to load metro_overview.json: ${response.statusText}`);
        }
        const metroData = await response.json();

        // Find the specific metro data for the given regionCode.
        const data = metroData.find(m => m.regionCode === regionCode);

        if (data) {
            // 4. Create the new popup and assign it to the exported variable.
            //    DO NOT declare with 'const' or 'let' here.
            metroOverviewPopup = new mapboxgl.Popup({ 
                closeOnClick: false,
                // Optional: Add an offset to prevent the popup from covering the exact center point
                offset: [0, -15] 
            })
                .setLngLat(centerCoords)
                .setHTML(`
                    <div class="metro-overview-popup">
                        <h3>${data.name}</h3>
                        <p><strong>Households:</strong> ${Number(data.households).toLocaleString()}</p>
                        <p><strong>Median Home Price:</strong> $${Number(data.medianHomePrice).toLocaleString()}</p>
                    </div>
                `)
                .addTo(map);
        } else {
            console.warn("No metro overview data found for regionCode:", regionCode);
        }
    } catch (error) {
        console.error('Error fetching or displaying metro overview data:', error);
    }
    // 5. No return statement is needed. The module manages its own state.
}
