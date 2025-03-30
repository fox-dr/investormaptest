
// region-loader.js
function getRegionCode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('region');
}

async function loadRegionConfig(region) {
    if (!region) {
        alert("No region specified. Please return to the homepage.");
        window.location.href = 'home.html';
        return;
    }

    const configUrl = `data/${region}/config.json`;
    try {
        const response = await fetch(configUrl);
        if (!response.ok) throw new Error("Config not found");

        const config = await response.json();
        return config;
    } catch (error) {
        alert(`Unable to load region "${region}". Returning to homepage.`);
        window.location.href = 'home.html';
    }
}
