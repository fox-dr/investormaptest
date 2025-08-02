let pinwheelMarkers = [];

// Your helper function to create the SVG
function createPinwheelSVG(values) {
    const numSlices = values.length;
    const center = 30;
    const radius = 30;
    const maxValue = 2405; //Austin 2021 max
    const anglePerSlice = (2 * Math.PI) / numSlices;

    let paths = '';
    for (let i = 0; i < numSlices; i++) {
        const value = values[i];
        const scaledRatio = Math.pow(value / maxValue, 0.6); // Lift lower values
        const r = radius * scaledRatio;

        const angle1 = anglePerSlice * i;
        const angle2 = angle1 + anglePerSlice;

        const x1 = center + r * Math.cos(angle1);
        const y1 = center + r * Math.sin(angle1);
        const x2 = center + r * Math.cos(angle2);
        const y2 = center + r * Math.sin(angle2);
        const opacities = [0.2, 0.35, 0.5, 0.65, 0.8, 1]; // 2019 → 2024
        paths += `<path d="M${center},${center} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="rgba(254, 196, 79, ${opacities[i]})" stroke="black" stroke-width="0.5"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">${paths}</svg>`;
}

// The main function that adds the markers, now exported
export function addPinwheels(map) {
    // Note: The fetch URL is correct if your `data` folder is in the root directory.
    fetch('data/pinwheels.geojson')
        .then(res => res.json())
        .then(data => {
            // Clear existing markers before adding new ones
            pinwheelMarkers.forEach(marker => marker.remove());
            pinwheelMarkers = [];

            data.features.forEach(feature => {
                const values = feature.properties.values;
                const svg = createPinwheelSVG(values);
                const average = (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(0);
                const tooltipText = `
                    <b>${feature.properties.msa}</b><br>
                    Permits per 100k households:<br>
                    2019: <b>${values[0]}</b><br>
                    2020: <b>${values[1]}</b><br>
                    2021: <b>${values[2]}</b><br>
                    2022: <b>${values[3]}</b><br>
                    2023: <b>${values[4]}</b><br>
                    2024: <b>${values[5]}</b><br>
                    <em>Average (6 yrs): ${average}<br></em>
                    <span class="tooltip-source-url">census.gov/construction/bps/msamonthly.html</span>
                `;

                const el = document.createElement('div');
                el.className = 'pinwheel-marker';
                el.innerHTML = `
                    <div class="tooltip" style="position: relative; width: 60px; height: 60px;">
                        ${svg}
                        <div class="tooltiptext">${tooltipText}</div>
                    </div>
                `;

                el.style.width = '60px';
                el.style.height = '60px';

                const newMarker = new mapboxgl.Marker(el)
                    .setLngLat(feature.geometry.coordinates)
                    .addTo(map);

                pinwheelMarkers.push(newMarker);
            });
        });
}

// We need to export the markers array so that script.js can clear them
export { pinwheelMarkers };
