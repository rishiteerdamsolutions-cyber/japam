# Known console messages (japam.digital)

These messages can appear in the browser console. They are expected and do not break the app.

## "Blocked a frame with origin ... from accessing a frame with origin ..."

- **Firebase (japam-c83c2.firebaseapp.com):** The app uses **redirect-based** Google sign-in (not popup), so this should not occur after a fresh deploy. If you still see it, do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R) or clear cache to load the latest bundle.
- **Cashfree (sdk.cashfree.com):** The payment SDK runs in an iframe. The browser blocks the parent page from accessing the iframe’s content (same-origin policy). Payments still work. Cashfree is now loaded only when the user opens a payment flow (Paywall, Donate, Lives), not on every page load, so this message appears only when paying.

## "Failed to load resource: 404 (axios.min.js.map)"

- A dependency (e.g. Cashfree SDK) requests a source map file that isn’t served. This only affects DevTools debugging, not app behavior. Safe to ignore.
