// A simple helper function to create a sparkline SVG
export function createSparklineSVG(values) {
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
