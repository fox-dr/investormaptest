// js/dataLayers.js
// This module's job is to load the data and add the layers to the map.

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

    for (const [layerName, fileName] of Object.entries(config.dataFiles)) {
        if (!layerName.startsWith('dns_')) {
            try {
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
                                'rgba(255, 0, 255, 1)'
                            ],
                            'circle-stroke-width': 1,
                            'circle-stroke-color': '#fff',
                            'circle-opacity': 0.7,
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
                                'rgba(8, 81, 156, 0.7)'
                            ],
                            'circle-stroke-width': 1,
                            'circle-stroke-color': '#fff',
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
                                '#000000'
                            ],
                            'circle-stroke-width': 0.7,
                            'circle-stroke-color': '#fff',
                            'circle-opacity': 0.7,
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
                                '#cccccc'
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
                
                // Add the layer with the determined type and paint properties
                map.addLayer({
                    id: layerName,
                    type: layerType,
                    source: layerName,
                    paint: paint,
                    layout: {
                        visibility: layerName.startsWith('dns_') ?
                            'none' :
                            (config.layerVisibility && config.layerVisibility[layerName] === false) ?
                            'none' :
                            (layerName.startsWith('income_mln') || layerName.startsWith('lit_') || layerName.startsWith('communities_') ? 'none' : 'visible')
                    },
                });

                console.log('Loaded layer:', layerName);
            } catch (e) {
                console.error(`Failed to load ${layerName}:`, e);
            }
        }
    }
}
