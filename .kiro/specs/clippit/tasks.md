# Tasks: Clippit

Each task has a "Done when" test. Run `npm test` after any detector change.

## Core (done)
- [x] 1. Detector with weighted signals, negation handling and genuine-message discounts.
  - Done when: `npm test` shows 0 holdout false alarms.
- [x] 2. Payment pause with "is someone guiding you?" question, cooling-off timer, cancel, ask family, continue anyway.
  - Done when: on `demo/scam-payment.html`, clicking Pay Now shows the pause; on `demo/genuine-payment.html` nothing appears.
- [x] 3. Settings popup: on/off, light mode, mute this site.
  - Done when: toggling each setting changes behaviour on the next page load without reinstalling.

## Built next (this round)
- [x] 4. Scam type label.
  - Done when: `node eval/types.js` labels 6 tune scams correctly and gives no label to safe text.
- [x] 5. Scam playbook card ("What usually happens next" plus "Do this now").
  - Done when: the warning on `demo/scam-payment.html` shows 2-3 next steps and one action line for the detected type.
- [x] 6. Scam X-ray.
  - Done when: scary phrases on the demo page are highlighted, the page's own DOM is unchanged (CSS Custom Highlight API), and each phrase is listed with its tactic in the card.
- [x] 7. Interruption budget.
  - Done when: at most 3 passive banners appear per 10 minutes, and after 2 dismissals on one site, passive banners stop on that site. The payment pause still works.
- [x] 8. Report helper.
  - Done when: the card shows the 1930 helpline, "Copy evidence and open cybercrime portal" copies a summary containing phrases, URL and time (not the full page text) and opens cybercrime.gov.in, and a Chakshu link opens.

## Next, small
- [ ] 9. Lookalike link check for fake-bank-style names (e.g. `sbi-kyc-update`). Done when: a bank name inside a hyphenated domain not owned by that bank scores as a link signal, and a tune-set test covers it.
- [ ] 10. Simple mode (bigger text, fewer buttons, high contrast). Done when: toggling it makes body text at least 18px and shows only Cancel and Ask family.
- [ ] 11. Read aloud (test Tamil and Hindi voices first). Done when: a button speaks the warning in the browser's installed voice, and a fallback message shows if no voice exists.
- [ ] 12. Practice mode. Done when: 10 sample messages can be sorted scam/not and a score shows.

## Roadmap only (not built)
Screenshot check, payee warning, family alert, call screener ("Answering Machine"), phone app.

## Known limitations
Cannot hear phone calls. Rules can be evaded by new wording. Test data is small and hand-written. The Chakshu link should be verified before submission.
