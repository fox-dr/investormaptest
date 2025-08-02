// This function fetches data and displays it on the map
export async function fetchMetroOverviewAndDisplay(mapInstance, regionCode, centerCoords) {
    try {
        const response = await fetch('data/metro_overview.json');
        if (!response.ok) {
            throw new Error(`Failed to load metro_overview.json: ${response.statusText}`);
        }
        const metroData = await response.json();

        // Find the specific metro data for the given regionCode
        const data = metroData.find(m => m.regionCode === regionCode);

        // Your existing logic for creating and displaying the popup/marker goes here.
        // This is a placeholder, as your full function body wasn't provided.
        // You should paste the rest of the original function body here.
        if (data) {
            console.log("Displaying overview for:", data.name);
            // Example of how you might display the data
            const popup = new mapboxgl.Popup({ closeOnClick: false })
                .setLngLat(centerCoords)
                .setHTML(`
                    <h3>${data.name}</h3>
                    <p>Households: ${data.households}</p>
                    <p>Median Home Price: ${data.medianHomePrice}</p>
                `)
                .addTo(mapInstance);
        } else {
            console.warn("No data found for regionCode:", regionCode);
        }
    } catch (error) {
        console.error('Error fetching or displaying metro overview data:', error);
    }
}
