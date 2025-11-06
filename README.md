# Karmic Canteen (Static Web App)

A simple, deploy-anywhere single-page app (vanilla JS) for a rotating daily menu, employee login, order and cancel with a timer.

## Features
- Landing page with today’s special
- Employees login page (ID + demo PIN 1234)
- Menu page with one dish per day (rotates daily)
- Place order, cancel within a countdown window (default 10 minutes)
- LocalStorage for session and orders (no backend)

## Run locally
- Open `karmic-canteen/index.html` in a modern browser, or
- Use a static server (optional):
  - Python: `python -m http.server` (then open http://localhost:8000/karmic-canteen/)
  - VS Code Live Server or any static host

## Deploy
- Upload the `karmic-canteen` folder to any static hosting (Netlify, GitHub Pages, Vercel static, S3, etc.)
- Entry file: `index.html`

## Configuration
- Change cancellation window in `app.js`:
  ```js
  const CANCEL_WINDOW_MINUTES = 10;
  ```
- Change the rotating menu in `app.js`:
  ```js
  const DISHES = [ { name: 'Masala Dosa', desc: '...', calories: 420 }, ... ];
  ```

## Notes
- Authentication here is demo-only (PIN 1234). For production, connect to your auth system and server APIs.
- Orders are stored per employee per day in `localStorage` and are finalized after the cancel window expires.
