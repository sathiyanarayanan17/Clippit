# Clippit: Scam Guard

> The assistant we hated is the one we needed.

Clippit brings back the interrupting desktop assistant as an on-device scam guardian. It stays silent until a page or message clearly looks like a scam. Then it explains why in plain words and pauses the Pay/Send/Transfer button with "It looks like you're about to be robbed. Want help?"

Built for Kiroween (Resurrection: Clippy).

## Three surfaces, one detector

| Surface | Folder | What it does |
|---|---|---|
| Browser extension (Chrome, Manifest V3) | `extension/` | Scans page text locally and pauses the payment button when the page shows scam signals. |
| Web app | `site/` | Paste-a-message checker, practice mode, install guide. |
| Phone (PWA) | `site/` | Installable on Android. Share a suspicious SMS or WhatsApp message to Clippit to check it. |

All three use the same `detector.js`. Everything runs on the device: no server, no accounts, no network calls, no message text stored.

## Features
- Weighted rule-based detector (about 30 signals) that understands negation ("never share your OTP" is not flagged) and discounts genuine receipts and advisories.
- Scam type label and a "what usually happens next" playbook card.
- Scam X-ray: highlights the exact scary phrases.
- Payment pause with a cooling-off timer and an "is someone guiding you?" check. "Continue anyway" always works.
- Interruption budget: limited banners, and it stops after repeated dismissals on a site.
- Report helper: 1930 helpline, copy-evidence, cybercrime portal and Chakshu links.

## Try it
Extension:
1. Open `chrome://extensions` and turn on Developer mode.
2. Click "Load unpacked" and choose the `extension` folder.
3. Open `demo/scam-payment.html` and click Pay Now. Open `demo/genuine-payment.html` and confirm Clippit stays silent.

Web app: run `npm run serve` and open the printed address.

## Tests
```
npm test
```
Runs the evaluation (fails if the holdout set has any false alarm), the scam-type checks, and a check that `site/` copies match the source. After editing `extension/detector.js`, run `npm run sync`.

## Honest results and limits
- Hand-written test set, not real traffic. Latest run: tune 8/8 caught, 0/8 false alarms; holdout 13/15 caught, 0/15 false alarms.
- The holdout set is small and was written by the same author as the rules. Treat it as indicative only.
- It cannot hear phone calls. Rules can be evaded by new wording.
- The phone version only checks messages the user shares. Only the extension can pause a payment.

## Built with Kiro
Specs, steering and a hook live in `.kiro/`:
- `.kiro/specs/clippit/` requirements and tasks with "done when" tests.
- `.kiro/steering/` the quiet-guard rules (false alarms are worse than misses, never tune on the holdout).
- `.kiro/hooks/` re-runs the evaluation whenever the detector or dataset changes.

## Roadmap
Lookalike link check, simple mode, read aloud, screenshot check, payee warning, family alert, and an "Answering Machine" call screener.

## License
MIT
