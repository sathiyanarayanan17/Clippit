# Devpost submission text (draft)

Fill every [BRACKET] before submitting. Do not add claims that are not true.

**Category:** Resurrection
**Project name:** Clippit: Scam Guard
**Tagline:** The assistant we hated is the one we needed.

## Short description
Clippit resurrects the interrupting desktop assistant as an on-device scam guardian. It stays silent until a page or message clearly looks like a scam. Then it explains why in plain words and pauses the Pay button: "It looks like you're about to be robbed. Want help?"

## Inspiration
[Write 3-4 true sentences about your grandfather's business and what happened. Ask his permission before including names, amounts or the business.]

Scams like "digital arrest" threats, fake KYC links, "safe account" requests, fake supplier bank changes and "payment done, send the goods" tricks all work the same way: they create fear and urgency, so people send money within minutes. Most tools label a caller or filter spam. Few step in at the moment the money moves.

Clippy, the assistant everyone mocked, had one real strength: it interrupted. It failed because it interrupted people who did not need help. We kept the interrupting, and aimed it at the one moment interruption helps.

## What it does
One shared detector, three places scams happen:

- **Browser extension (the click).** Silent by default. It reads page text on the device and warns only when the page clearly shows scam signals. It names the scam type, highlights the exact scary phrases (Scam X-ray), shows "what usually happens next" and "do this now", and pauses Pay/Send/Transfer buttons. The pause asks "Is someone telling you to do this?", has a short cooling-off wait, and always lets the user continue, cancel, or message a saved family member with the reasons filled in.
- **Web app (the message).** Paste any suspicious message and get the same verdict, marked-up message, playbook and a report box (call 1930, copy evidence, cybercrime portal, Chakshu). It also has a practice mode with 10 messages.
- **Phone (installable web app).** On Android, share a suspicious SMS or WhatsApp message to Clippit and it checks it at once. It only checks messages the user shares. It cannot read messages or stop a payment.

**Business Mode** covers scams aimed at shops and small firms: fake supplier bank-detail changes, fake "payment done" screenshots, QR "scan to receive" tricks, fake GST notices, loan-fee offers, and "sent by mistake" refund requests.

**Fixing Clippy's problems on purpose:**
| Clippy's problem | What Clippit does |
|---|---|
| Interrupted constantly | Silent by default. Payment pause only after scam signals. At most 3 banners per 10 minutes, and it stops on a site after 2 dismissals. |
| Hard to turn off | On/off switch, per-site mute, "Not a scam" button, "Continue anyway" always works. |
| Wrong guesses | Every warning shows the exact phrases and why. |
| Talked down to people | Plain, respectful wording, light mode. |
| Distracting | Small card, no sound, respects reduced-motion. |
| Slow | Rules only, about 0.01 ms per check. |

Everything runs on the device: no server, no accounts, no network calls, no message text stored.

## How we built it (summary; details in the Kiro write-up below)
Plain JavaScript. Chrome extension (Manifest V3, Shadow DOM for the card, CSS Custom Highlight API for X-ray). A static web app and installable web app (service worker, share target). Node.js scripts for evaluation. About 35 weighted rules with negation handling, so "never share your OTP" from a real bank is not flagged, and discounts for genuine-looking receipts.

## Results (honest)
Hand-written test sets, not real traffic.
- Tune set: 14 of 14 scams caught, 0 of 14 normal messages flagged.
- Holdout set: 13 of 15 scams caught, 0 of 15 normal messages flagged.
- Eight property-based tests pass (for example, harmless text is always safe, and warnings that say "never share your OTP" are never flagged).
- [Add: results of the new real-advisory holdout set once you build it.]
- [Add: what your grandfather / another elder said when they tried it.]

## Limitations
- It cannot hear phone calls.
- New wording can evade the rules.
- The test sets are small and written by the same author as the rules, so the numbers are indicative only.
- The phone version cannot read messages or stop payments. Only the extension pauses payments.

## What's next
Lookalike-link check, Grandpa Mode (large text, read aloud in [LANGUAGE]), a call screener ("Answering Machine"), screenshot check, payee warning, opt-in family alerts.

## Built with
JavaScript, Chrome Extension (Manifest V3), Shadow DOM, CSS Custom Highlight API, Service Worker / PWA share target, Node.js, fast-check, GitHub Actions and Pages, Kiro.

---

# How we used Kiro (write-up draft)

Only describe what actually happened. Replace the [BRACKETS] with your real experience.

**Kiro app used:** Kiro CLI. [Say whether you also tried IDE, Web or Crew and how they differed. If not, say you used the CLI only.]

**Spec-driven development.** `.kiro/specs/clippit/requirements.md` states the behavior as testable requirements ("WHEN a page scores below the scam threshold THEN Clippit SHALL show nothing"). `tasks.md` gives each feature a "done when" test. [Describe one concrete case where the spec changed what was built or caught a mistake. Compare with vibe coding in your own words.]

**Steering.** `.kiro/steering/clippit-rules.md` encodes the product's rules: a false alarm is worse than a miss, never tune on the holdout, plain respectful wording, "Continue anyway" must always work, no network calls. [Say which rule changed Kiro's behavior most.]

**Hooks.** One hook re-runs sync and all tests when the detector, dataset or properties change, and fails if the holdout has a false alarm. A second hook asks the agent to check that every rule change has a scam example and a harmless look-alike in the tune set. [Describe a time a hook caught something, if it did.]

**Custom agent.** `.kiro/agents/rule-reviewer.json` is a read-only reviewer that runs the tests and checks rule changes against the steering policy. [Say how you used it and whether it changed a decision.]

**Property-based testing.** `eval/properties.js` uses fast-check to test rules that must hold for any input: harmless text is always safe, padding never hides a scam, negated warnings are never flagged, case does not change the verdict, and hostile input stays fast (a guard against slow regexes). All eight passed on first run and found no bug, so they act as guard rails for future changes rather than proof of past defects.

**MCP, Kiro powers, Kiro Crew.** [Only fill in if you use them. Otherwise write: "Not used in this project."]

---

# Bonus prize checklist
- [ ] Best Student Project: only if every team member is a student. Needs LinkedIn, student email, year, degree and school for each member.
- [ ] Bonus Blog Prize: public blog post written between Oct 30 and Dec 4, 2026, mentioning Kiroween 2026. Add the URL.
- [ ] Social Blitz: post starting with #KiroweenHackathon26 about your favorite thing in Kiro. Add the URL.
- [ ] Best Demo: automatic.

# Final submission checklist
- [ ] Repo is public and shows the MIT license in the About section.
- [ ] `.kiro/` is at the root and is not in `.gitignore` (confirmed at the time of writing).
- [ ] Working app URL: GitHub Pages site.
- [ ] Demo video under 3 minutes, public on YouTube, shown on the device it was built for, no copyrighted music, no Microsoft Clippy art or logos.
- [ ] This text is pasted into Devpost, with every [BRACKET] filled.
- [ ] Submitted well before Dec 4, 2:00 PM PT (about 3:30 AM IST on Dec 5).
