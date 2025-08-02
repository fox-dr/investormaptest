// Import the sparkline SVG helper from our new module
import { createSparklineSVG } from './sparkline.js';

// The marker variable, now local to this module
export let fredChartsMarker = null;

// The main function, now exported
export async function fetchFredDataAndRenderCharts(mapInstance) {
    try {
        const response = await fetch('data/TTLC/fred_charts_data.json?t=${Date.now()}');
        if (!response.ok) {
            throw new Error(`Failed to load local FRED data: ${response.statusText}`);
        }
        const results = await response.json();

        const containerDiv = document.createElement('div');
        containerDiv.id = 'fred-charts-container';
        containerDiv.style.display = 'none';
        containerDiv.addEventListener('click', function(event) {
            if (!event.target.closest('.info-icon') && !event.target.closest('.fred-tooltip')) {
                containerDiv.style.display = 'none';
            }
        });

        const fragment = document.createDocumentFragment();

        results.forEach(res => {
            const fredChartItem = document.createElement('div');
            fredChartItem.className = 'fred-chart-item';

            if (res.error) {
                fredChartItem.innerHTML = `
                    <div class="fred-chart-label">${res.label}</div>
                    <div style="color: red; font-size: 11px;">Error: ${res.error}</div>
                `;
                fragment.appendChild(fredChartItem);
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
                arrowHtml = '•';
            }

            let displayValue = res.latestValue;
            let unitSuffix = res.unit;

            let formattedLatestValue;
            
            if (unitSuffix === 'K' && displayValue >= 1000) {
                displayValue = displayValue / 1000;
                unitSuffix = 'M';
                formattedLatestValue = displayValue.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                });
            } else {
                formattedLatestValue = displayValue.toLocaleString(undefined, {
                    minimumFractionDigits: res.decimals,
                    maximumFractionDigits: res.decimals
                });
            }

            formattedLatestValue += unitSuffix;

            const sparklineSvg = createSparklineSVG(res.sparklineValues);

            fredChartItem.innerHTML = `
                <div class="fred-chart-label">${res.label}</div>
                <div class="fred-value-row">
                    <span class="fred-current-value">${formattedLatestValue}</span>
                    <span class="fred-change-arrow ${arrowClass}">${arrowHtml}</span> MoM
                </div>
                <div class="fred-chart-info">Last 6 Months (MoM Change)</div>
                <div class="fred-sparkline-wrapper">
                    ${sparklineSvg}
                    <div class="info-icon">ⓘ</div>
                    <div class="fred-tooltip" style="display: none;">${res.context_info || 'No context available.'}</div>
                </div>
            `;

            const infoIcon = fredChartItem.querySelector('.info-icon');
            const fredTooltip = fredChartItem.querySelector('.fred-tooltip');

            if (infoIcon && fredTooltip) {
                infoIcon.addEventListener('click', function(event) {
                    event.stopPropagation();
                    document.querySelectorAll('.fred-tooltip').forEach(tip => {
                        if (tip !== fredTooltip) {
                            tip.style.display = 'none';
                        }
                    });
                    fredTooltip.style.display = fredTooltip.style.display === 'none' ? 'block' : 'none';
                });
            }

            fragment.appendChild(fredChartItem);
        });

        containerDiv.innerHTML = '';
        containerDiv.appendChild(fragment);

        if (fredChartsMarker) {
            fredChartsMarker.remove();
            fredChartsMarker = null;
        }

        const centerUS = [-98.5795, 39.8283];

        fredChartsMarker = new mapboxgl.Marker(containerDiv)
            .setLngLat(centerUS)
            .addTo(mapInstance);

        fredChartsMarker.getElement().style.display = 'none';
    } catch (error) {
        console.error(`Error fetching FRED data from local JSON:`, error);
        if (fredChartsMarker) {
            fredChartsMarker.remove();
            fredChartsMarker = null;
        }
        const errorDiv = document.createElement('div');
        errorDiv.id = 'fred-charts-container';
        errorDiv.style.cssText = 'background: rgba(255, 255, 255, 0.95); padding: 10px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 200px; text-align: center; color: red; font-family: Lato, sans-serif;';
        errorDiv.innerHTML = `<div>Error loading FRED charts.</div><div>${error.message}</div>`;

        fredChartsMarker = new mapboxgl.Marker(errorDiv)
            .setLngLat([-98.5795, 39.8283])
            .addTo(mapInstance);

        fredChartsMarker.getElement().style.display = 'flex';
    }
}
