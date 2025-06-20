# 🧭 Map Layers & File Structure — Internal Reference

This document explains the structure and data logic behind the ZIP-level Mapbox visualization, designed for replication across U.S. housing markets.

---

## 🗺️ Data Layers

| File | Layer Description |
|------|--------------------|
| `LIT_zscores.geojson` | Composite z-score per ZIP: combines permit velocity + Millennial income. Core choropleth layer. |
| `Permit_Pinwheel.geojson` | Radial graphs showing monthly permitting per ZIP to visualize development momentum and seasonality. |
| `Income_Heat.geojson` | Heatmap layer for Millennial income (by ZIP). May be paired with housing prices for affordability indices. |
| `Entitlement_Status.geojson` | Builder-submitted community entitlement phases: pending, approved, under construction. |
| `Communities.geojson` | Cluster or point layer of known active and planned communities with metadata. |

---

## 🗂️ Directory Structure


All relative paths assume GitHub Pages deployment from `/ (root)`.

---

## 🔁 Replication for Other Markets

To deploy this structure for new regions:

1. Replace or append new ZIP-level `.geojson` files in `data/`
2. Use consistent field names (e.g., `ZIP`, `permits`, `income`, `zscore`)
3. Update `map.js` to load and toggle new layers
4. Use the Excel → GeoJSON Python tool (see below)

---

## 🐍 Python Toolchain: Excel to GeoJSON

All GeoJSON data layers are generated using a Python utility that:
- Reads cleaned Excel files (`.xlsx`)
- Merges ZIP-code geometries via a shapefile or TopoJSON source
- Applies standard formatting and rounding
- Outputs ready-to-load `.geojson`

📝 *[Add this Python script to the repo soon]* — consider placing it under `/tools/geojson_builder.py`

---

Let me know if you’d like help writing the Python script README or building the `/tools/` folder cleanly for onboarding other analysts or developers.
