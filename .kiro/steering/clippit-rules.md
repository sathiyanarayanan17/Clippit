# Clippit tone and behaviour rules

- Silent by default. Never warn unless the score reaches the scam threshold.
- A false alarm is worse than a miss. Never change a rule so that a normal message in `eval/dataset.json` is flagged.
- Never tune rules using the `holdout` set. Only the `tune` set may guide changes. Report holdout numbers honestly.
- Wording: plain, short, respectful. No jargon, no fear-mongering, no shaming. Say what is wrong and what to do next.
- "Continue anyway" must always work. Never trap the user.
- No network calls, no accounts, no storing of message text. Everything runs on the device.
- Respect `prefers-reduced-motion`. No sound.
