# Alexa Submission Checklist

## What is already in this repo

- Core custom skill code for scheduling every-day and per-day bedtime reminders.
- A 20-line affectionate message library for reminder content.
- An English interaction model for setup, schedule readback, and clearing reminders.
- A starter `skill-package/skill.json` manifest.

## What still needs to happen before submission

1. Connect the skill package to the target AWS and Alexa developer setup.
2. Replace any placeholder deployment metadata that changes during actual skill creation.
3. Confirm the final icon art and verify the raw asset URLs or move the assets to a better public host.
4. Decide whether the privacy policy and terms URLs will live on GitHub Pages, Patrol 6 infrastructure, or another public site.
5. Run certification-style tests on an actual Alexa account and at least one Alexa device.
6. Verify that the reminder phrasing and reminder delivery behavior are acceptable, since Alexa delivers the content through the Reminders surface.

## Certification notes

- This skill depends on the Reminders permission: `alexa::alerts:reminders:skill:readwrite`.
- The skill already asks for explicit confirmation before it creates or clears reminder schedules.
- Alexa will deliver the reminder as a reminder, not as unrestricted background speech from the skill itself.

