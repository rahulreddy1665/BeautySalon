# Deployment

## App icon

Install icon, favicon, and Apple touch icon come from `frontend/assets/logo.png` (or `logo.svg`). The in-app logo on the login screen, sidebar, and top bar still comes from Settings (the public branding endpoint).

To change the install icon:

1. Replace `frontend/assets/logo.png` (or `logo.svg`).
2. From `frontend/`, run `npm run icons`.
3. Rebuild and deploy (`npm run build`).

Installed apps keep the old home-screen icon until the app is removed and installed again. The manifest and `sw.js` are served with `Cache-Control: no-cache` (`netlify.toml`) so a new install fetches the new files.
