// js/dataLayers.js
// This module's job is to load the data and add the layers to the map.

// This function needs to be exported
export async function loadRegionData(map, region, config) {
    console.log('Loading data files:', config.dataFiles);

    // Clear region-related layers
    map.getStyle().layers.forEach((layer) => {
        if (layer.id.startsWith('communities_') || layer.id.startsWith('portfolio_') || layer.id.startsWith('amenities_') || layer.id.startsWith('entitlement_')) {
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

    // The huge `for` loop that adds sources and layers
    for (const [layerName, fileName] of Object.entries(config.dataFiles)) {
        if (!layerName.startsWith('dns_')) {
            try {
                // Corrected fetch URL for GitHub Pages subdirectory
                const geojsonResponse = await fetch(`/investormaptest/data/${region}/${fileName}`);
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
                
                // The `onchange` event listeners that need to be moved
                // We'll move these into a new module in the next step
                
                // The `onclick` event listeners that need to be moved
                if (layerName.startsWith('communities_') || layerName.startsWith('portfolio_') || layerName.startsWith('amenities_') || layerName.startsWith('income_') || layerName.startsWith('resales_') || layerName.startsWith('lit_')) {
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
                            html += `</div>`;
                        }
                        
                        if (properties.status) {
                            html += `<em>Status:</em> ${properties.status}`;
                        }

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
}
