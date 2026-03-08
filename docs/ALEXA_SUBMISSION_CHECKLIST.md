# Alexa Submission Checklist

## What is already in this repo

- Core custom skill code for scheduling every-day, weekday, weekend, and per-day bedtime reminders.
- OpenRouter-backed reminder message generation with an internal fallback library.
- Echo Show support through Alexa Presentation Language (APL) with muted background video and still-image fallback.
- English interaction model coverage for setup, schedule readback, bedtime tonight, and clearing reminders.
- Public icon assets, a muted Echo Show video, and an Echo Show background image.
- Public privacy policy and terms documents linked from the skill manifest.

## Certification-sensitive details

- The skill depends on the Reminders permission: `alexa::alerts:reminders:skill:readwrite`.
- The skill also requests first-name profile permission: `alexa::profile:given_name:read`.
- The skill asks for explicit confirmation before it creates or clears reminder schedules.
- Alexa will deliver the reminder through the reminder surface, not as unrestricted background speech from the skill itself.
- Generated bedtime copy is created when the reminder is scheduled or updated, then stored inside the Alexa reminder.
- The skill sends only limited reminder context to OpenRouter so it can generate short reminder wording. If the customer granted first-name permission, the first name can be included in that prompt context. If the service is unavailable, the skill uses an internal fallback message library.
- `privacyAndCompliance.usesPersonalInfo` should remain `true` because the skill uses reminder schedule data, the device time zone, the customer's first name when permission is granted, and an external text-generation provider.

## Reviewer test flow

1. Launch the skill and confirm the welcome flow renders correctly on voice-only devices and Echo Show devices.
2. Grant reminder permissions and first-name profile permissions when prompted.
3. Test an every-day schedule.
4. Test a weekdays schedule.
5. Test a custom single-day schedule.
6. Ask for the current schedule.
7. Ask what time bedtime is tonight.
8. Clear one day.
9. Clear the full schedule.
10. Confirm reminder delivery happens as Alexa reminder audio on device.
11. On Echo Show devices, confirm the muted background video renders and the still image remains the fallback if video is unavailable.

## Before resubmitting a new revision

1. Build the interaction model again after any invocation or utterance edits.
2. Confirm the skill manifest still points to the current public icon URLs and policy URLs.
3. Smoke-test with `OPENROUTER_TOKEN` configured and again with the token missing to verify the fallback path.
4. Re-check the Alexa console privacy answers against `docs/privacy-policy.md`.
5. Re-check the Alexa console permissions list and confirm the profile permission description matches the privacy policy.
6. If certification is already in progress, withdraw the current submission before changing invocation, model, manifest, or APL behavior.
