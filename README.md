# Weather Radar for Older iPads

This is a small static web app that shows recent RainViewer radar imagery on top of an OpenStreetMap base layer with Leaflet. It is designed for lightweight browser use on older iPads, kiosk displays, and simple always-on dashboards.

## Files

- `index.html` loads the page, Leaflet, and the app UI.
- `styles.css` provides the full-screen layout and touch-friendly controls.
- `app.js` loads RainViewer metadata, swaps radar tile layers, animates frames, and handles geolocation.

## What the App Does

- Displays a full-screen Leaflet map.
- Uses OpenStreetMap tiles for the base map.
- Loads RainViewer weather radar metadata from `https://api.rainviewer.com/public/weather-maps.json`.
- Shows the most recent historical radar frame by default.
- Lets the user play, pause, step backward, step forward, refresh the radar, and jump to their location.
- Falls back to Nashville, Tennessee when geolocation is unavailable or denied.
- Hides controls after 10 seconds of inactivity and shows them again on tap or click.

## Run Locally

Because browsers often restrict geolocation and some network requests on `file://` pages, use a tiny local web server instead of opening the HTML file directly.

### Python 3

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy to GitHub Pages

1. Commit these files to a GitHub repository.
2. Push to the branch you want to publish, usually `main`.
3. In GitHub, open `Settings` > `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select the branch and the `/ (root)` folder, then save.
6. Wait for GitHub Pages to publish the site and open the generated URL.

## Deploy to Cloudflare Pages

1. Create a new Pages project in Cloudflare.
2. Connect the GitHub repository.
3. Set the build command to blank.
4. Set the output directory to `.`.
5. Deploy the project.

## APIs and Libraries Used

- Leaflet from CDN for the interactive map UI.
- OpenStreetMap tile servers for the base map.
- RainViewer public Weather Maps API for radar frame metadata and radar tiles.

## RainViewer Notes

RainViewer documents the Weather Maps API at:

- `https://www.rainviewer.com/api/weather-maps-api.html`
- `https://api.rainviewer.com/public/weather-maps.json`

RainViewer's API documentation says the public API is for personal and educational use, does not guarantee long-term availability, and asks sites to mention RainViewer as the data source with a link to `https://www.rainviewer.com/`.

## Attribution Notes

- OpenStreetMap attribution is included in the map control, as required by OSM tile usage.
- RainViewer should be credited as the radar data source when you publish the page.

## Customization Tips

- Change the default location in `app.js` by editing `DEFAULT_CENTER`.
- Change animation speed by editing `ANIMATION_DELAY`.
- Change radar opacity by editing `RADAR_OPACITY`.
- Change the RainViewer color scheme by editing `RADAR_COLOR_SCHEME`.
