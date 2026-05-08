# Weather Radar for Older iPads

This app is a lightweight, browser-based weather radar viewer built for older iPads, wall displays, and simple always-on dashboards. It uses a full-screen Leaflet map, OpenStreetMap for the basemap, and RainViewer radar tiles for recent radar imagery.

The app is intentionally simple:

- No build step
- No backend
- No framework
- No npm dependencies

You can host it on any static web host, or loaded from [https://rogersac.github.io/wutherze/](https://rogersac.github.io/wutherze/).

## What the App Does

- Shows a full-screen map centered on Nashville, Tennessee by default
- Loads the latest available historical radar frames from RainViewer
- Displays the most recent radar frame when the page opens
- Lets you animate recent radar frames in a loop
- Auto-refreshes radar metadata every 2 minutes
- Tries to use the device's location when available
- Falls back to Nashville if location access is denied or unavailable

## How To Use the App

The app is designed for touch use on tablets and kiosk screens.

### Controls

- `Play / Pause`: Starts or stops the radar animation loop
- `Prev`: Shows the previous radar frame and stops playback
- `Next`: Shows the next radar frame and stops playback
- `Refresh`: Immediately reloads the latest radar metadata from RainViewer and jumps to the newest frame
- `Locate Me`: Centers the map on the device's current location if geolocation is available

### Touch and Screen Behavior

- The controls appear over the map at the bottom of the screen
- The controls automatically hide after 3 seconds of inactivity
- Tap, click, or move the pointer to show the controls again
- A timestamp in the upper-left corner shows the time of the current radar frame
- Status messages appear near the top when loading, refreshing, or reporting errors

### Playback Behavior

- When you press `Play`, the app loops through the available historical radar frames
- The animation works by swapping radar tile layers, not by playing a video
- If automatic refresh happens while playback is running, the app updates to the newest available frame and continues playing

## Location Behavior

- On startup, the map opens centered on Nashville, Tennessee
- If the browser allows geolocation, the app will try to center the map on your current location
- If geolocation fails or is denied, the app stays on Nashville and shows a message

## Zoom Behavior

- The map itself can zoom in closer than the radar's native tile resolution
- RainViewer's tiled radar data is natively limited to zoom level 7
- The app allows map zoom up to level 12, but radar imagery beyond level 7 is enlarged, not more detailed

## Data Sources

This app uses the following external services:

- OpenStreetMap tile servers for the base map
- RainViewer Weather Maps API for radar frame metadata
- RainViewer radar tile images for the radar overlay
- Leaflet from a public CDN for the map library

### RainViewer Metadata Endpoint

The app loads radar frame metadata from:

`https://api.rainviewer.com/public/weather-maps.json`

It uses the historical radar frames returned in `radar.past` and builds the radar tile URL from the RainViewer response fields.

## Important Notes

### Internet Access Required

This app does not contain radar data locally. It needs internet access to load:

- Leaflet from CDN
- OpenStreetMap tiles
- RainViewer metadata
- RainViewer radar tiles

### Browser Compatibility

The JavaScript is written conservatively for older Safari versions:

- Uses plain HTML, CSS, and vanilla JavaScript
- Avoids modules, bundlers, and TypeScript
- Avoids `async` / `await`
- Includes an `XMLHttpRequest` fallback if `fetch` is unavailable

### Attribution

The app includes OpenStreetMap attribution on the map and a RainViewer source label on screen.

RainViewer's public API documentation says the service is intended for personal and educational use, may change over time, and should be credited as the radar data source.

## Running Locally

For best results, run the app through a local web server instead of opening `index.html` directly from `file://`.

Example with Python 3:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploying

Because the app is fully static, deployment is simple.

### GitHub Pages

1. Commit the files to a GitHub repository.
2. Push the repository to GitHub.
3. Open `Settings` > `Pages`.
4. Choose `Deploy from a branch`.
5. Select your branch and the root folder.
6. Save and wait for the site to publish.

### Cloudflare Pages

1. Create a new Pages project.
2. Connect the GitHub repository.
3. Leave the build command empty.
4. Set the output directory to `.`.
5. Deploy the site.

## Project Files

- `index.html`: Page structure and CDN includes
- `styles.css`: Full-screen layout, touch-friendly controls, and kiosk styling
- `app.js`: Map setup, radar loading, animation, geolocation, auto-refresh, and UI behavior

## Customization

Common settings can be changed in `app.js`:

- `DEFAULT_CENTER`: Default map location
- `DEFAULT_ZOOM`: Initial zoom level
- `RADAR_OPACITY`: Radar overlay opacity
- `ANIMATION_DELAY`: Playback speed
- `CONTROLS_HIDE_DELAY`: How long controls stay visible after activity
- `AUTO_REFRESH_INTERVAL`: How often radar metadata refreshes automatically
