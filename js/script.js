mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuZm94IiwiYSI6ImNqbXYxaWh4YzAwN3Iza2xhMzJhOWpzemwifQ.cRt9ebRFaM0_DlIS9MlACA';
 
 const regions = ['aus', 'bay', 'car', 'den', 'sac', 'sca', 'TTLC'];
 let map;
 
 async function loadRegion(region) {
   document.getElementById('toggle-communities').checked = true;
 
   try {
     const configResponse = await fetch(`data/${region}/config.json`);
     const config = await configResponse.json();
     console.log('Config loaded:', config);
 
     if (!map) {
       map = new mapboxgl.Map({
         container: 'map',
         style: 'mapbox://styles/mapbox/light-v11',
         center: config.initialCenter,
         zoom: config.initialZoom,
       });
 
       map.on('load', () => {
         console.log('Map loaded');
         loadRegionData(region, config);
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
 
 async function loadRegionData(region, config) {
   console.log('Loading data files:', config.dataFiles);
 
   // Clear all existing region-related layers and sources
   map.getStyle().layers.forEach((layer) => {
     if (layer.id.startsWith('communities_') || layer.id.startsWith('portfolio_') || layer.id.startsWith('amenities_')) {
       if (map.getLayer(layer.id)) map.removeLayer(layer.id);
       if (map.getSource(layer.id)) map.removeSource(layer.id);
     }
   });
   // end Clear all existing region-related layers and sources
 
   for (const [layerName, fileName] of Object.entries(config.dataFiles)) {
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

       document.getElementById('toggle-income').onchange = function () {
         const visible = this.checked ? 'visible' : 'none';
         Object.keys(config.dataFiles).forEach(layerName => {
           if (layerName.startsWith('income_mln')) {
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
               ['==', ['get', 'miln_inc'], null],
               'rgba(0,0,0,0)',
               [
                 'interpolate',
                 ['linear'],
                 ['get', 'miln_inc'],
                 74999, '#f0f0f0',
                 99999, '#a6bddb',
                 124999, '#3690c0',
                 149999, '#034e7b'
               ]
             ],
             'circle-stroke-width': 0.5,
             'circle-stroke-color': '#fff',
             'circle-opacity': 0.6
           };

          } else if (layerName.startsWith('portfolio_')) {
            paint = {
              'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4, 12,   // Zoomed out → big thumb-friendly targets
              10, 10,
              14, 6    // Zoomed in → smaller, more precise
            ],
 
             'circle-color': [
               'match',
               ['get', 'status'],
               'Onboarded', '#b30000',
               'LOI', '#00cc44',
               'In Feasibility', '#ffd700',
               'Sold', '#888888',
               /* default */ '#999999'
             ],
             'circle-stroke-width': 1,
             'circle-stroke-color': '#fff',
           };
         } else {
           paint = {
             'circle-radius': [
               'interpolate',
               ['linear'],
               ['zoom'],
               4, 12,   // Zoomed out → big thumb-friendly targets
               10, 10,
               14, 6    // Zoomed in → smaller, more precise
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
             55000, '#f0f0f0',        // Very low income — light gray
            78000, '#a6bddb',    // Moderate — light blue
             104000, '#3690c0',    // High — medium blue
             111000, '#034e7b'    // Very high — dark blue
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
               'High', '#FF3B30',      // red
               'Medium', '#FF9500',    // orange
               'Low', '#34C759',       // green
               '#A9A9A9'               // fallback: gray
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
           visibility: layerName.startsWith('income_mln') ? 'none' : 'visible'
         },
        
       });

 
 if (layerType === 'circle') {
   map.on('click', layerName, (e) => {
     console.log('Clicked layer:', layerName);
     console.log('Feature properties:', e.features[0].properties);
 
     const { geometry, properties } = e.features[0];
     const coords = geometry.coordinates;
 
     let html = '';
 
     if (layerName.startsWith('communities_')) {
       console.log('Using communities popup logic');
       html += `<b>${properties.community || 'Unnamed'}</b><br>`;
       if (properties.builder) html += `${properties.builder}<br>`;
       if (properties.city && properties.state && properties.zip)
         html += `${properties.city}, ${properties.state} ${properties.zip}<br>`;
       if (properties.price_range) html += `${properties.price_range}<br>`;
       if (properties.sf_range) html += `${properties.sf_range}<br>`;
     } else if (layerName.startsWith('portfolio_')) {
       console.log('Using portfolio popup logic');
       html += `<b>${properties.name || 'Unnamed'}</b><br>`;
       if (properties.description) html += `${properties.description}<br>`;
     } else if (layerName.startsWith('amenities_')) {
       console.log('Using amenities popup logic');
       html += `<b>${properties.name || 'Unnamed Amenity'}</b><br>`;
       if (properties.description) html += `${properties.description}<br>`;
     
      
          // Future: show image if present
       /*
       if (properties.image) {
         html += `<img src="data/assets/${properties.image}" alt="${properties.name}" style="margin-top:6px; width:100%; max-width:250px; border-radius:4px;">`;
       }
       */
 
     } else {
       console.log('No matching popup logic for layer:', layerName);
     }
 
     if (properties.status) {
       html += `<em>Status:</em> ${properties.status}`;
     }
 
     console.log('HTML for popup:', html);
     new mapboxgl.Popup().setLngLat(coords).setHTML(html).addTo(map);
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
 //  toggle communities
 document.getElementById('toggle-communities').onchange = function () {
   const visible = this.checked ? 'visible' : 'none';
   Object.keys(config.dataFiles).forEach(layerName => {
     if (layerName.startsWith('communities_')) {
       if (map.getLayer(layerName)) {
         map.setLayoutProperty(layerName, 'visibility', visible);
       }
     }
   });
 };
 //  end toggle
 }
 
 function createRegionSelector() {
   const selector = document.getElementById('region-selector');
   if (!selector) return;
 
   regions.forEach(region => {
     fetch(`data/${region}/config.json`)
       .then(res => res.json())
       .then(config => {
         const button = document.createElement('button');
         button.textContent = config.regionName || region.toUpperCase();
         button.onclick = () => loadRegion(region);
         selector.appendChild(button);
       })
       .catch(err => console.warn(`Failed to load config for ${region}:`, err));
   });
 }
 
 document.addEventListener('DOMContentLoaded', () => {
   createRegionSelector();
   loadRegion('bay'); // Default load
 });
