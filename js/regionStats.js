// The array that holds the markers, now local to this module
export let gdpMarkers = [];

// The main function to add the markers, now exported
export async function addStaticRegionStats(map) {
    try {
        const response = await fetch('data/static_region_stats.json');
        if (!response.ok) {
            throw new Error(`Failed to load static_region_stats.json: ${response.statusText}`);
        }
        const stats = await response.json();

        gdpMarkers.forEach(marker => marker.remove());
        gdpMarkers = [];

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

            const newMarker = new mapboxgl.Marker(el)
                .setLngLat([stat.lng, stat.lat])
                .addTo(map);

            gdpMarkers.push(newMarker);
        });
    } catch (error) {
        console.error(`Error loading static region stats:`, error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'region-stat-box';
        errorDiv.style.cssText = 'background: rgba(255, 255, 255, 0.95); padding: 10px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 180px; text-align: center; color: red; font-family: Lato, sans-serif;';
        errorDiv.innerHTML = `<div>Error loading Regional Stats.</div><div>${error.message}</div>`;

        new mapboxgl.Marker(errorDiv)
            .setLngLat([-90, 45])
            .addTo(map);
    }
}
