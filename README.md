# Property Studio

A browser-based Three.js property viewer and backyard garage planner. Works with mouse, keyboard, and touch controls.

**[Open Property Studio](https://rolohaun.github.io/property-studio/)** — no account or password required.

- Orbit, plan, and ground-level views.
- Editable garage footprint, wall and loft heights, roof, doors, and windows.
- Garage area and distance to the house, in feet.
- Driveway routing to a rear alley and removable fence panels.
- Two-point measurements, layer controls, and individual tree visibility.
- Automatically save and restore the current garage design on the same browser.
- Export and load garage designs as JSON files for backups and other devices.

## Run locally

Install Node.js, then run `npm run dev`. Open the local URL printed in the terminal. No package installation or build step is needed; Three.js is vendored in `docs/vendor`.

Use `npm run check` and `npm test` to validate the source.

## GitHub Pages

The static website is in `docs/`. In repository Settings → Pages, choose deployment from the `main` branch and `/docs` folder. All asset links are relative so the site supports a project URL.

A personal GitHub account needs an eligible paid plan to publish Pages from a private repository. The repository can remain private while the Pages website is public. A browser-only password screen cannot protect files served publicly. Keep this distinction in mind when configuring publication.

## Model and privacy

This clean snapshot excludes the original report, photographs, street and owner identifiers, local network configuration, hosting metadata, and the original Git history. The model's relative geometry and dimensions are retained, and are readable wherever the website is published. It is a planning visualization, not a construction document or a verified permit check. The 10 ft spacing indicator is a planning target.

Completed edits save automatically in browser local storage, including dimensions, placement, doors, windows, roof, driveway, removed fence panels, and display settings. Reopening this site in the same browser restores them. Incomplete drawings do not replace the last saved design; removing a garage also updates the save. Browser storage does not sync between devices and can be cleared by browser settings or private browsing. Use **Export design** for a durable backup or to transfer a design with **Load design**. A visible status reports when browser saving is unavailable. This version does not include an account service, analytics, cloud uploads, or server-side storage. Source files do not contain access credentials.

## Controls

- Mouse: drag to orbit, right-drag to pan, scroll to zoom.
- Touch: drag to orbit, two fingers to pan/pinch. In plan view, drag to pan.
- Garage drawing: set a setback, tap a fence, then tap to set width and depth. Two-finger navigation remains available while drawing.
- Ground view: WASD on a keyboard; drag-to-look and movement arrows on touch devices.
- The **Controls** button opens or hides the settings panel on smaller screens.

## Third-party software

Three.js and OrbitControls are distributed under the MIT license; see `docs/vendor/THREE-LICENSE.txt`. Fonts are loaded from Google Fonts with system font fallbacks.
