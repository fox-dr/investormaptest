mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';

const FRED_API_KEY = "7263c4512c658e1b732c98da7d5f5914"; // Your FRED API Key
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";

const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
let map;
let fredChartsMarker = null; // To hold the FRED charts Mapbox Marker

// --- Function to toggle the visibility of a panel ---
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    // Dynamically determine the button ID based on the panel ID
    let buttonId;
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

// --- Main function to load a region ---
async function loadRegion(region) {
    // Reset toggle checkboxes for layer visibility
    document.getElementById('toggle-communities').checked = true;
    document.getElementById('toggle-lit').checked = false;
    document.getElementById('toggle-income').checked = false;

    // Hide specific layers (LIT and Income) that are controlled by toggles
    if (map && map.getStyle && map.getStyle().layers) {
        map.getStyle().layers.forEach(layer => {
            if (layer.id.startsWith('lit_') || layer.id.startsWith('income_')) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        });
    }

    // --- Handle FRED charts visibility based on region ---
    if (fredChartsMarker) {
        const fredChartsElement = fredChartsMarker.getElement();
        if (region === 'TTLC') {
            fredChartsElement.style.display = 'flex'; // Show for TTLC (because its CSS uses flex)
        } else {
            fredChartsElement.style.display = 'none'; // Hide for other regions
        }
    }
    // --- End FRED charts visibility handling ---

    try {
        // Assuming loadRegionConfig is defined in region-loader.js and loaded before script.js
        const config = await loadRegionConfig(region);
        console.log('Config loaded:', config);

        if (!map) {
            // Map does not exist yet, initialize it
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/light-v11',
                center: config.initialCenter,
                zoom: config.initialZoom,
            });

            // Map load event listener
            map.on('load', async () => { // Keep this callback async
                console.log('Map loaded');

                // Load mascot icons for entitlement layers
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

                loadRegionData(region, config); // Load region-specific GeoJSON data and layers
                addStaticRegionStats(map); // Add existing static regional stat boxes

                // --- Fetch and render FRED charts on initial map load ---
                // This call ensures the fredChartsMarker is created when the map is ready.
                await fetchFredDataAndRenderCharts(map);
                // Its visibility is then managed by the 'if (fredChartsMarker)' block above.
                // --- End NEW FRED Charts init ---

                // Add pinwheel markers
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
            // Map already exists, just fly to the new region
            map.flyTo({
                center: config.initialCenter,
                zoom: config.initialZoom,
                essential: true,
            });
            console.log('Switched to region:', region);
            loadRegionData(region, config);
            // FRED charts visibility already handled at the top of loadRegion.
        }
    } catch (error) {
        console.error('Failed to load region:', error);
        // region-loader.js typically handles redirects for failed config loads.
    }
}

// --- Helper function to create Pinwheel SVG ---
function createPinwheelSVG(values) {
    const numSlices = values.length;
    const center = 30;
    const radius = 30;
    const maxValue = 2405; // Austin 2021 max permit value
    const anglePerSlice = (2 * Math.PI) / numSlices;

    let paths = '';
    for (let i = 0; i < numSlices; i++) {
        const value = values[i];
        const scaledRatio = Math.pow(value / maxValue, 0.6); // Lift lower values for better visibility
        const r = radius * scaledRatio;

        const angle1 = anglePerSlice * i;
        const angle2 = angle1 + anglePerSlice;

        const x1 = center + r * Math.cos(angle1);
        const y1 = center + r * Math.sin(angle1);
        const x2 = center + r * Math.cos(angle2);
        const y2 = center + r * Math.sin(angle2);
        const opacities = [0.2, 0.35, 0.5, 0.65, 0.8, 1]; // Opacity for years 2019 → 2024
        paths += `<path d="M${center},${center} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="rgba(254, 196, 79, ${opacities[i]})" stroke="black" stroke-width="0.5"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">${paths}</svg>`;
}

// --- Helper function to create a sparkline SVG ---
function createSparklineSVG(values) {
    if (!values || values.length < 2) return '';

    const width = 180;
    const height = 30;
    const padding = 5;

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const xScale = (index) => (index / (values.length - 1)) * (width - 2 * padding) + padding;
    const yScale = (value) => {
        if (maxVal === minVal) return height / 2;
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
        // Only draw dots for the first and last point
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

// --- Function to add existing static regional stats ---
function addStaticRegionStats(map) {
    const stats = [
        { name: "United States", gdpTotal: "$26T", outputPerWorker: "$191K", lng: -103.4591, lat: 43.8791 },
        { name: "Bay Area", gdpTotal: "$1.04T", outputPerWorker: "$399K", lng: -123.5, lat: 40.5 },
        { name: "Sacramento", gdpTotal: "$150B", outputPerWorker: "$175K", lng: -117.7, lat: 38.2 },
        { name: "SoCal", gdpTotal: "$1.5T", outputPerWorker: "$238K", lng: -113.5, lat: 34.0 },
        { name: "Denver", gdpTotal: "$250B", outputPerWorker: "$172K", lng: -99.5, lat: 40.5 },
        { name: "Austin", gdpTotal: "$198B", outputPerWorker: "$173K", lng: -97.0, lat: 33.5 },
        { name: "Raleigh-Durham", gdpTotal: "$163B", outputPerWorker: "$183K", lng: -84.5, lat: 36.2 }
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

// --- Function to fetch FRED data and render charts ---
async function fetchFredDataAndRenderCharts(mapInstance) {
    const seriesMap = {
        "UMICHENT": { label: "Consumer Sentiment", unit: "", frequency: "m", decimals: 1 },
        "PERMIT": { label: "Building Permits", unit: "K", frequency: "m", decimals: 0 },
        "HOUST": { label: "Housing Starts", unit: "K", frequency: "m", decimals: 0 }
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

            if (observations.length < 2) {
                console.warn(`Not enough data for ${seriesId} sparkline or change calculation.`);
                return { id: seriesId, error: "Not enough data" };
            }

            const latestValue = observations[observations.length - 1];
            const previousValue = observations[observations.length - 2];

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
    containerDiv.style.display = 'none'; // Initially hidden, visibility controlled by loadRegion

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
        if (res.unit === 'K' && res.latestValue >= 1000) formattedLatestValue = (res.latestValue / 1000).toFixed(1) + 'M';
        else if (res.unit === 'K') formattedLatestValue += 'K';


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

    // Remove existing FRED charts marker if it exists before adding a new one
    if (fredChartsMarker) {
        fredChartsMarker.remove(); // Removes the DOM element from the map
        fredChartsMarker = null; // Clear the reference
    }

    // Position the marker roughly over the center of the US (near Denver/Kansas)
    const centerUS = [-98.5795, 39.8283]; // Longitude, Latitude for geographic center of Contiguous US

    fredChartsMarker = new mapboxgl.Marker(containerDiv)
        .setLngLat(centerUS)
        .addTo(mapInstance);

    // Visibility will be handled by the loadRegion function
    // Initially hide it as it's only for TTLC
    fredChartsMarker.getElement().style.display = 'none';
}

// --- Function to create region selector buttons ---
function createRegionSelector() {
    const selector = document.getElementById('region-selector');
    if (!selector) return;

    (async () => { // Use a self-executing async function to properly await inside forEach
        for (const region of regions) {
            try {
                const config = await loadRegionConfig(region); // Assuming loadRegionConfig is in region-loader.js
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

// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // Check for region in URL first (using getRegionCode from region-loader.js)
    // Assuming getRegionCode is in region-loader.js and loaded before script.js
    const initialRegion = getRegionCode();
    const defaultRegion = initialRegion || 'TTLC'; // Default to TTLC if no region in URL

    loadRegion(defaultRegion); // Load the initial or default region

    createRegionSelector();

    // --- Add event listeners for the new toggle buttons ---
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
        regionSelectorPanel.classList.add('hidden'); // Initially hide
        toggleRegionButton.setAttribute('aria-expanded', 'false');
        toggleRegionButton.classList.remove('open');
    }

    if (toggleLayerButton && layerTogglePanel) {
        toggleLayerButton.addEventListener('click', () => togglePanel('layer-toggle'));
        layerTogglePanel.classList.add('hidden'); // Initially hide
        toggleLayerButton.setAttribute('aria-expanded', 'false');
        toggleLayerButton.classList.remove('open');
    }

    if (toggleLegendButton && legendPanel) {
        toggleLegendButton.addEventListener('click', () => togglePanel('legend'));
        legendPanel.classList.add('hidden'); // Initially hide
        toggleLegendButton.setAttribute('aria-expanded', 'false');
        toggleLegendButton.classList.remove('open');
    }
});
