// js/layerToggles.js
// This module's job is to handle all the layer toggle logic.

export function setupLayerToggles(map, config) {
    const layerToggles = [
        { id: 'toggle-income', prefix: 'income_mln' },
        { id: 'toggle-lit', prefix: 'lit_' },
        { id: 'toggle-communities', prefix: 'communities_' }
    ];

    layerToggles.forEach(toggle => {
        const toggleElement = document.getElementById(toggle.id);
        if (toggleElement) {
            toggleElement.onchange = function() {
                const visible = this.checked ? 'visible' : 'none';
                Object.keys(config.dataFiles).forEach(layerName => {
                    if (layerName.startsWith(toggle.prefix) && !layerName.startsWith('dns_')) {
                        if (map.getLayer(layerName)) {
                            map.setLayoutProperty(layerName, 'visibility', visible);
                        }
                    }
                });
            };
        }
    });
}
