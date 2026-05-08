# Wutherze

Wutherze is a lightweight static weather radar app built for older iPads, kiosk displays, and simple always-on browser dashboards. It uses Leaflet, OpenStreetMap, RainViewer radar tiles, and NOAA storm reports in a single-page app with no build step and no backend.

Live site:

- `https://rogersac.github.io/wutherze/`

## What It Does

- Shows a full-screen map with recent RainViewer radar imagery
- Defaults to Nashville, Tennessee when location is unavailable
- Tries to locate the user and places a visible location marker on the map
- Animates recent radar frames without video or canvas rendering
- Auto-refreshes radar metadata every 2 minutes
- Optionally shows NOAA/NWS local storm reports in the current map view
- Supports light and dark themes
- Includes kiosk-oriented UI behavior such as hidden controls and a startup hint

## Controls

- `Play / Pause`: Starts or stops the radar animation loop
- `Prev`: Shows the previous radar frame and stops playback
- `Next`: Shows the next radar frame and stops playback
- `Refresh`: Reloads the latest radar metadata and, if enabled, refreshes storm reports
- `Locate Me`: Centers the map on the device location and shows a map marker plus an accuracy circle
- `Storm Reports`: Toggles NOAA/NWS local storm report markers on the map
- `Light Mode` / `Dark Mode`: Switches the base UI theme and dark tint behavior

## Map Behavior

- The latest available radar frame is shown on startup
- Radar animation loops through the available historical frames
- While the map is moving or zooming, a center crosshair appears to show the exact map center
- The center crosshair hides 3 seconds after movement stops
- In dark mode, the app adds a subtle tint layer above the base map
- The map can zoom to level 12, but RainViewer radar detail is native only through zoom 7

## Storm Reports

- Storm reports come from NOAA/NWS local storm reports
- Reports are only loaded for the current map bounds
- Markers are color-coded by report type
- Tapping a marker opens a popup with report details
- Reports refresh every 15 minutes while enabled
- If the map is zoomed out too far, the app asks the user to zoom in before loading reports

## Kiosk Features

- The bottom controls auto-hide after 3 seconds of inactivity
- Tapping, clicking, or moving the pointer shows the controls again
- A startup kiosk hint suggests adding the app to the Home Screen and using Guided Access on iPad
- The kiosk hint auto-hides after 15 seconds and can be dismissed permanently in that browser

## Data Sources

- Leaflet from CDN for the interactive map
- OpenStreetMap tiles for the base map
- RainViewer Weather Maps API for radar frame metadata and radar tiles
- NOAA/NWS local storm reports service for storm report points

### Radar Metadata

The app loads radar frame metadata from:

- `https://api.rainviewer.com/public/weather-maps.json`

It uses the historical frames returned in `radar.past` and builds the tile overlay URL from the metadata response.

### Storm Reports

The app loads storm reports from NOAA's ArcGIS service:

- `https://mapservices.weather.noaa.gov/vector/rest/services/obs/nws_local_storm_reports/MapServer`

## Browser Notes

The app is written conservatively for older Safari and older iPads:

- Plain HTML, CSS, and vanilla JavaScript only
- No React, Vue, Angular, TypeScript, npm, or bundlers
- No JavaScript modules
- No `async` / `await`
- Includes an `XMLHttpRequest` fallback when `fetch` is unavailable

## Running Locally

Use a local web server rather than opening `index.html` with `file://`.

Example:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploying

This app is fully static and can be hosted on GitHub Pages, Cloudflare Pages, or any simple static host.

### GitHub Pages

1. Commit the files to a GitHub repository.
2. Push the repository to GitHub.
3. Open `Settings` > `Pages`.
4. Choose `Deploy from a branch`.
5. Select the branch and the root folder.
6. Save and wait for the site to publish.

### Cloudflare Pages

1. Create a new Pages project.
2. Connect the GitHub repository.
3. Leave the build command empty.
4. Set the output directory to `.`.
5. Deploy the site.

## Project Files

- `index.html`: page structure and UI elements
- `styles.css`: layout, theme styles, control styling, and overlays
- `app.js`: map setup, radar loading, storm reports, geolocation, animation, kiosk behavior, and UI logic

## Configuration

Common settings in `app.js`:

- `DEFAULT_CENTER`: fallback map center
- `DEFAULT_ZOOM`: startup zoom level
- `RADAR_OPACITY`: radar overlay opacity
- `ANIMATION_DELAY`: radar playback speed
- `CONTROLS_HIDE_DELAY`: how long controls remain visible after activity
- `AUTO_REFRESH_INTERVAL`: radar refresh interval
- `STORM_REPORTS_REFRESH_INTERVAL`: storm report refresh interval
- `DARK_TINT_OPACITY`: dark mode map tint strength
- `CENTER_CROSSHAIR_HIDE_DELAY`: crosshair hide delay after map movement

## Attribution And Credit

- RainViewer is credited in the app UI as the radar data source
- OpenStreetMap attribution is shown on the map
- NOAA/NWS is the source for local storm reports
- App credit in the UI links to Chet Rogers: `https://github.com/rogersac/wutherze`

## Notes

- The app includes passive signature markers in the codebase as a soft fingerprint
- This does not prevent reuse; it only makes identification easier if the code is copied without cleanup
