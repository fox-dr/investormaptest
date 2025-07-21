/* --- FRED Sparkline Charts --- */
#fred-charts-container {
    background: rgba(255, 255, 255, 0.95);
    padding: 12px 15px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    display: flex; /* Use flexbox for vertical stacking of chart items */
    flex-direction: column;
    gap: 12px; /* Space between individual charts */
    width: 200px; /* Fixed width for the entire container */
    pointer-events: auto; /* Allow interaction (though charts are non-interactive here) */
    font-family: 'Lato', sans-serif;
    color: #333;
    text-align: left;
}

.fred-chart-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    border-bottom: 1px solid #eee; /* Separator between charts */
    padding-bottom: 8px;
}
.fred-chart-item:last-child {
    border-bottom: none; /* No border for the last item */
    padding-bottom: 0;
}

.fred-chart-label {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 4px;
}

.fred-value-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px; /* Space below value row, before sparkline */
}

.fred-current-value {
    font-size: 18px;
    font-weight: 700;
    color: #1a73e8; /* A blue color for emphasis */
}

.fred-change-arrow {
    font-size: 16px;
    font-weight: bold;
}
.fred-change-arrow.positive {
    color: #28a745; /* Green for positive change */
}
.fred-change-arrow.negative {
    color: #dc3545; /* Red for negative change */
}
.fred-change-arrow.no-change {
    color: #6c757d; /* Grey for no change */
}


/* Sparkline SVG styling */
.fred-sparkline-svg {
    display: block; /* Ensures it takes its own line */
    width: 100%;
    height: 30px; /* Height of the sparkline */
}
.fred-sparkline-line {
    stroke: #1a73e8; /* Blue line color */
    stroke-width: 2;
    fill: none;
}
.fred-sparkline-dot {
    fill: #1a73e8;
    stroke: #fff;
    stroke-width: 1;
    r: 3; /* Radius of the dots */
}
```

**2. Update your `js/script.js`:**

This will involve adding a new `fetchFredDataAndRenderCharts` function and modifying `loadRegion` to show/hide the charts.

```javascript
mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';

const FRED_API_KEY = "7263c4512c658e1b732c98da7d5f5914"; // Your FRED API Key
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";

const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
let map;
let fredChartsMarker = null; // To hold the FRED charts Mapbox Marker

// --- NEW: Function to toggle the visibility of a panel ---
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const button = document.getElementById(`toggle-${panelId.replace('-selector', '-button').replace('layer-toggle', 'layer-button').replace('legend', 'legend-button')}`);

    if (panel && button) {
        panel.classList.toggle('hidden');
        const isHidden = panel.classList.contains('hidden');
        button.setAttribute('aria-expanded', !isHidden);
        button.classList.toggle('open', !isHidden); // Add/remove 'open' class for button icon styling
    }
}
// --- END NEW FUNCTION ---

// --- NEW: Helper function to create a sparkline SVG ---
function createSparklineSVG(values) {
    if (!values || values.length < 2) return ''; // Need at least 2 points for a line

    const width = 180; // Width of the SVG
    const height = 30; // Height of the SVG
    const padding = 5;

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // Scale function for X axis (time)
    const xScale = (index) => (index / (values.length - 1)) * (width - 2 * padding) + padding;
    // Scale function for Y axis (value)
    const yScale = (value) => {
        if (maxVal === minVal) return height / 2; // Flat line if all values are same
        return height - ((value - minVal) / (maxVal - minVal)) * (height - 2 * padding) - padding;
    };

    let pathD = values.map((val, i) => {
        const x = xScale(i);
        const y = yScale(val);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    let circles = values.map((val, i) => {
        const x = xScale(i);
        const y = yScale(val);
        // Only draw dots for the first and last point (or all if preferred)
        if (i === 0 || i === values.length - 1) {
             return `<circle class="fred-sparkline-dot" cx="${x}" cy="${y}" r="3"></circle>`;
        }
        return '';
    }).join('');

    return `
        <svg class="fred-sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <path class="fred-sparkline-line" d="${pathD}"/>
            ${circles}
        </svg>
    `;
}

// --- NEW: Function to fetch FRED data and render charts ---
async function fetchFredDataAndRenderCharts(mapInstance) {
    const seriesMap = {
        "UMICHENT": { label: "Consumer Sentiment", unit: "", frequency: "m", decimals: 0 },
        "PERMIT": { label: "Building Permits", unit: "K", frequency: "m", decimals: 0 }, // Assuming thousands for formatting
        "HOUST": { label: "Housing Starts", unit: "K", frequency: "m", decimals: 0 } // Assuming thousands for formatting
    };

    const dataPromises = Object.keys(seriesMap).map(async (seriesId) => {
        const params = new URLSearchParams({
            series_id: seriesId,
            api_key: FRED_API_KEY,
            file_type: "json",
            observation_start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0], // Last 6 months + 1 for change
            sort_order: "asc"
        });
        const url = `${FRED_BASE_URL}?${params.toString()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`FRED API error for ${seriesId}: ${response.statusText}`);
            const data = await response.json();

            const observations = data.observations.map(obs => parseFloat(obs.value)).filter(val => !isNaN(val));

            // Ensure we have at least two points for sparkline and change calculation
            if (observations.length < 2) {
                console.warn(`Not enough data for ${seriesId} sparkline.`);
                return { id: seriesId, error: "Not enough data" };
            }

            // Get latest and previous value for arrow
            const latestValue = observations[observations.length - 1];
            const previousValue = observations[observations.length - 2];

            // For sparkline, use the last 6 months (or fewer if not available)
            const sparklineValues = observations.slice(Math.max(0, observations.length - 6));

            return {
                id: seriesId,
                label: seriesMap[seriesId].label,
                unit: seriesMap[seriesId].unit,
                decimals: seriesMap[seriesId].decimals,
                latestValue: latestValue,
                previousValue: previousValue,
                sparklineValues: sparklineValues
            };

        } catch (error) {
            console.error(`Error fetching FRED data for ${seriesId}:`, error);
            return { id: seriesId, error: error.message };
        }
    });

    const results = await Promise.all(dataPromises);

    const containerDiv = document.createElement('div');
    containerDiv.id = 'fred-charts-container';
    containerDiv.style.display = 'none'; // Initially hidden

    let allChartsHtml = '';

    results.forEach(res => {
        if (res.error) {
            allChartsHtml += `
                <div class="fred-chart-item">
                    <div class="fred-chart-label">${res.label}</div>
                    <div>Error: ${res.error}</div>
                </div>
            `;
            return;
        }

        const change = res.latestValue - res.previousValue;
        let arrowHtml = '';
        let arrowClass = 'no-change';

        if (change > 0) {
            arrowHtml = '▲';
            arrowClass = 'positive';
        } else if (change < 0) {
            arrowHtml = '▼';
            arrowClass = 'negative';
        } else {
            arrowHtml = '•'; // Dot for no change
        }

        let formattedLatestValue = res.latestValue.toFixed(res.decimals);
        if (res.unit === 'K') formattedLatestValue += 'K';

        const sparklineSvg = createSparklineSVG(res.sparklineValues);

        allChartsHtml += `
            <div class="fred-chart-item">
                <div class="fred-chart-label">${res.label}</div>
                <div class="fred-value-row">
                    <span class="fred-current-value">${formattedLatestValue}</span>
                    <span class="fred-change-arrow ${arrowClass}">${arrowHtml}</span>
                </div>
                ${sparklineSvg}
            </div>
        `;
    });

    containerDiv.innerHTML = allChartsHtml;

    // Remove existing FRED charts marker if it exists
    if (fredChartsMarker) {
        fredChartsMarker.remove();
        fredChartsMarker = null;
    }

    // Position the marker roughly over the center of the US (near Denver/Kansas)
    const centerUS = [-98.5795, 39.8283]; // Longitude, Latitude for geographic center of Contiguous US

    fredChartsMarker = new mapboxgl.Marker(containerDiv)
        .setLngLat(centerUS)
        .addTo(mapInstance);

    // Initial visibility handled by loadRegion
    fredChartsMarker.getElement().style.display = 'none'; // Hide by default until TTLC is selected
}
// --- END NEW FRED CHARTS FUNCTION ---


async function loadRegion(region) {
    document.getElementById('toggle-communities').checked = true;
    document.getElementById('toggle-lit').checked = false;
    document.getElementById('toggle-income').checked = false; // Ensure income is also reset

    if (map && map.getStyle && map.getStyle().layers) {
        map.getStyle().layers.forEach(layer => {
            if (layer.id.startsWith('lit_') || layer.id.startsWith('income_')) { // Also hide income layers
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        });
    }

    // --- NEW: Handle FRED charts visibility ---
    if (fredChartsMarker) {
        if (region === 'TTLC') {
            fredChartsMarker.getElement().style.display = 'flex'; // Show for TTLC
        } else {
            fredChartsMarker.getElement().style.display = 'none'; // Hide for other regions
        }
    }
    // --- END NEW: Handle FRED charts visibility ---


    try {
        const config = await loadRegionConfig(region); // Use function from region-loader.js
        console.log('Config loaded:', config);

        if (!map) {
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/light-v11',
                center: config.initialCenter,
                zoom: config.initialZoom,
            });

            map.on('load', async () => { // Make map.on('load') async to await fetchFredDataAndRenderCharts
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
                addStaticRegionStats(map); // ✅ Add existing stat boxes

                // --- NEW: Fetch and render FRED charts on initial load if TTLC ---
                await fetchFredDataAndRenderCharts(map);
                if (region === 'TTLC') {
                     fredChartsMarker.getElement().style.display = 'flex';
                } else {
                     fredChartsMarker.getElement().style.display = 'none';
                }
                // --- END NEW ---


                // ✅ Add pinwheels
                fetch('data/pinwheels.geojson')
                    .then(res => res.json())
                    .then(data => {
                        data.features.forEach(feature => {
                            const values = feature.properties.values;
                            const svg = createPinwheelSVG(values);

                            const total = values.reduce((sum, val) => sum + val, 0).toFixed(0);
                            const tooltipText = `
                                census.gov/construction/bps/msamonthly.html<br>
                                Permits per 100k households:<br>
                                2019: <b>${values[0]}</b><br>
                                2020: <b>${values[1]}</b><br>
                                2021: <b>${values[2]}</b><br>
                                2022: <b>${values[3]}</b><br>
                                2023: <b>${values[4]}</b><br>
                                2024: <b>${values[5]}</b><br>
                                <em>Total (6 yrs): ${total}</em>
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

                            new mapboxgl.Marker(el)
                                .setLngLat(feature.geometry.coordinates)
                                .addTo(map);
                        });
                    });
            });

        } else {
            map.flyTo({
                center: config.initialCenter,
                zoom: config.initialZoom,
                essential: true,
            });
            console.log('Switched to region:', region);
            loadRegionData(region, config);
        }
    } catch (error) {
        console.error('Failed to load region:', error);
    }
}

// Your existing createPinwheelSVG function (copy-pasted for completeness)
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

// Your existing addStaticRegionStats function (copy-pasted for completeness)
function addStaticRegionStats(map) {
    const stats = [
        {
            name: "United States",
            gdpTotal: "$26T",
            outputPerWorker: "$191K",
            lng: -103.4591,
            lat: 43.8791
        },
        {
            name: "Bay Area",
            gdpTotal: "$1.04T",
            outputPerWorker: "$399K",
            lng: -123.5,
            lat: 40.5
        },
        {
            name: "Sacramento",
            gdpTotal: "$150B",
            outputPerWorker: "$175K",
            lng: -117.7,
            lat: 38.2
        },
        {
            name: "SoCal",
            gdpTotal: "$1.5T",
            outputPerWorker: "$238K",
            lng: -113.5,
            lat: 34.0
        },
        {
            name: "Denver",
            gdpTotal: "$250B",
            outputPerWorker: "$172K",
            lng: -99.5,
            lat: 40.5
        },
        {
            name: "Austin",
            gdpTotal: "$198B",
            outputPerWorker: "$173K",
            lng: -97.0,
            lat: 33.5
        },
        {
            name: "Raleigh-Durham",
            gdpTotal: "$163B",
            outputPerWorker: "$183K",
            lng: -84.5,
            lat: 36.2
        }
    ];

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
        new mapboxgl.Marker(el)
            .setLngLat([stat.lng, stat.lat])
            .addTo(map);
    });
}

async function loadRegionData(region, config) {
    console.log('Loading data files:', config.dataFiles);

    // Clear region-related layers
    map.getStyle().layers.forEach((layer) => {
        if (layer.id.startsWith('communities_') || layer.id.startsWith('portfolio_') || layer.id.startsWith('amenities_')) {
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

    document.getElementById('toggle-income').checked = false;
    document.getElementById('toggle-lit').checked = false;


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

                document.getElementById('toggle-income').onchange = function () {
                    const visible = this.checked ? 'visible' : 'none';
                    Object.keys(config.dataFiles).forEach(layerName => {
                        if (layerName.startsWith('income_mln') && !layerName.startsWith('dns_')) {
                            if (map.getLayer(layerName)) {
                                map.setLayoutProperty(layerName, 'visibility', visible);
                            }
                        }
                    });
                };
                document.getElementById('toggle-lit').onchange = function () {
                    const visible = this.checked ? 'visible' : 'none';
                    Object.keys(config.dataFiles).forEach(layerName => {
                        if (layerName.startsWith('lit_') && !layerName.startsWith('dns_')) {
                            if (map.getLayer(layerName)) {
                                map.setLayoutProperty(layerName, 'visibility', visible);
                            }
                        }
                    });
                };

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
                        visibility: layerName.startsWith('dns_')
                            ? 'none'
                            : (config.layerVisibility && config.layerVisibility[layerName] === false)
                                ? 'none'
                                : (layerName.startsWith('income_mln') || layerName.startsWith('lit_') ? 'none' : 'visible')
                    },
                });

                if (layerType === 'circle') {
                    map.on('click', layerName, (e) => {
                        const { geometry, properties } = e.features[0];
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

    // Toggle communities (this is inside loadRegionData now)
    document.getElementById('toggle-communities').onchange = function () {
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

    (async () => { // Use a self-executing async function to properly await inside forEach
        for (const region of regions) {
            try {
                const config = await loadRegionConfig(region); // Use function from region-loader.js
                const button = document.createElement('button');
                button.textContent = config.regionName || region.toUpperCase();
                button.onclick = () => loadRegion(region);
                selector.appendChild(button);
            } catch (err) {
                console.warn(`Failed to process button for ${region}:`, err);
            }
        }
    })();
}

document.addEventListener('DOMContentLoaded', async () => { // Make this async to allow awaiting
    // Check for region in URL first (using getRegionCode from region-loader.js)
    const initialRegion = getRegionCode();
    const defaultRegion = initialRegion || 'TTLC'; // Default to TTLC if no region in URL

    // --- NEW: Fetch and render FRED charts once when map loads ---
    // This will create the marker once. Visibility will be controlled by loadRegion.
    await fetchFredDataAndRenderCharts(map); // Call it once outside loadRegion to initialize marker
    // --- END NEW ---

    loadRegion(defaultRegion); // Load the initial or default region

    createRegionSelector();

    // --- NEW: Add event listeners for the new toggle buttons ---
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
        // Initially hide the panel
        regionSelectorPanel.classList.add('hidden');
        toggleRegionButton.setAttribute('aria-expanded', 'false');
        toggleRegionButton.classList.remove('open'); // Ensure it starts closed
    }

    if (toggleLayerButton && layerTogglePanel) {
        toggleLayerButton.addEventListener('click', () => togglePanel('layer-toggle'));
        // Initially hide the panel
        layerTogglePanel.classList.add('hidden');
        toggleLayerButton.setAttribute('aria-expanded', 'false');
        toggleLayerButton.classList.remove('open');
    }

    if (toggleLegendButton && legendPanel) {
        toggleLegendButton.addEventListener('click', () => togglePanel('legend'));
        // Initially hide the panel
        legendPanel.classList.add('hidden');
        toggleLegendButton.setAttribute('aria-expanded', 'false');
        toggleLegendButton.classList.remove('open');
    }
    // --- END NEW EVENT LISTENERS ---
});
