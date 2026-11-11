# Requirements: Clippit

## Introduction
Clippit is a Chrome extension that revives the interrupting desktop assistant as an on-device scam guardian. It is silent until a page or message clearly looks like a scam, then pauses the payment button.

## Requirements

### 1. Stay silent by default
**User story:** As an everyday user, I want no interruptions on normal pages, so that I can trust the warnings when they appear.
- WHEN a page scores below the scam threshold THEN Clippit SHALL show nothing.
- WHEN a message is a genuine receipt or a bank advisory ("never share your OTP") THEN Clippit SHALL NOT flag it.
- The holdout evaluation SHALL have 0 false alarms.

### 2. Warn in plain language
- WHEN the page reaches the scam threshold THEN Clippit SHALL show a small warning listing up to 3 reasons in simple words.
- Every warning SHALL include a "Not a scam" button.

### 3. Pause the payment
- WHEN the page level is "scam" AND the user clicks Pay/Send/Transfer THEN Clippit SHALL pause the action and ask "It looks like you're about to be robbed. Want help?".
- The user SHALL be able to cancel, message family on WhatsApp, or continue anyway.
- "Continue anyway" SHALL always work after the cooling-off wait (skipped in light mode).
- Clippit SHALL ask whether someone is guiding the user, and advise hanging up if yes.

### 4. User control
- On/off switch, per-site mute, light mode, no sound, reduced-motion respected.

### 5. Privacy and speed
- No network calls, no accounts, no message text stored.
- Only new page text is scanned. A check SHALL take well under 1 ms.

## Known limitations
- Cannot hear phone calls.
- Rules can be evaded by new wording.
- Test data is small and hand-written.
