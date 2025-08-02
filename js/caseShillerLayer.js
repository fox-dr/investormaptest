// A lookup map for city coordinates to convert the JSON to GeoJSON
const cityCoordinates = {
    "Atlanta, GA": [-84.3880, 33.7490],
    "Boston, MA": [-71.0589, 42.3601],
    "Charlotte, NC": [-80.8431, 35.2271],
    "Chicago, IL": [-87.6298, 41.8781],
    "Cleveland, OH": [-81.6944, 41.4993],
    "Dallas, TX": [-96.7970, 32.7767],
    "Denver, CO": [-104.9903, 39.7392],
    "Detroit, MI": [-83.0458, 42.3314],
    "Las Vegas, NV": [-115.1398, 36.1699],
    "Los Angeles, CA": [-118.2437, 34.0522],
    "Miami, FL": [-80.1918, 25.7617],
    "Minneapolis, MN": [-93.2650, 44.9778],
    "New York, NY": [-74.0060, 40.7128],
    "Phoenix, AZ": [-112.0740, 33.4484],
    "Portland, OR": [-122.6750, 45.5051],
    "San Diego, CA": [-117.1611, 32.7157],
    "San Francisco, CA": [-122.4194, 37.7749],
    "Seattle, WA": [-122.3321, 47.6062],
    "Tampa, FL": [-82.4572, 27.9506],
    "Washington, D.C.": [-77.0369, 38.9072]
};

const positiveColor = '#008080';
const negativeColor = '#800080';

function toGeoJSON(data) {
    const features = data.map(item => {
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": cityCoordinates[item.city]
            },
            "properties": {
                "city": item.city,
                "yoy_change": item.yoy_change
            }
        };
    });

    return {
        "type": "FeatureCollection",
        "features": features
    };
}

export async function addCaseShillerLayer(map) {
    try {
        // --- THIS LINE HAS BEEN UPDATED ---
        const response = await fetch('/investormaptest/data/TTLC/case_shiller_data.json');
        
        const rawData = await response.json();
        const caseShillerGeoJSON = toGeoJSON(rawData);

        map.addSource('case-shiller-data', {
            'type': 'geojson',
            'data': caseShillerGeoJSON
        });

        map.addLayer({
            'id': 'case-shiller-circles',
            'type': 'circle',
            'source': 'case-shiller-data',
            'paint': {
                'circle-color': [
                    'case',
                    ['>', ['get', 'yoy_change'], 0],
                    positiveColor,
                    negativeColor
                ],
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['abs', ['get', 'yoy_change']],
                    0, 5,
                    10, 25
                ],
                'circle-opacity': 0.7
            }
        });
    } catch (error) {
        console.error('Error fetching or processing Case-Shiller data:', error);
    }
}
