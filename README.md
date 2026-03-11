# Goodnight Sweetheart

Goodnight Sweetheart is an Alexa custom skill that lets a customer set one bedtime for every day, separate bedtimes for weekdays and weekends, or different bedtimes for specific days of the week. At each scheduled time, Alexa delivers a short affectionate reminder meant to help the customer end the day feeling appreciated, grounded, and grateful.

## Product shape

- Customers can set the same bedtime every day.
- Customers can set one bedtime for weekdays and another for weekends.
- Customers can set a different bedtime for any day of the week.
- Customers can ask for their current bedtime schedule.
- Customers can ask what time bedtime is tonight.
- Customers can clear one day or clear the full schedule.
- Echo Show devices render a multimodal background and schedule card with Alexa Presentation Language.

## Message generation

- The skill uses the Alexa Reminders API because custom skills cannot independently start arbitrary speech at scheduled times outside reminder and routine surfaces.
- The skill uses OpenRouter with the Kimi 2.5 model to generate short bedtime reminder wording when a reminder is created or updated.
- The generated wording is stored inside the Alexa reminder. Alexa later delivers that stored reminder through the reminder surface.
- If OpenRouter is unavailable or `OPENROUTER_TOKEN` is not configured, the skill falls back to an internal message library.

## Repo layout

- `lambda/custom`: Node.js Lambda code for the Alexa skill.
- `skill-package`: Alexa manifest and interaction model assets.
- `docs`: submission notes, privacy policy, and terms.
- `assets`: public icon assets and the Echo Show background image.

## Environment

The Lambda runtime target is AWS Lambda `nodejs22.x`.

The Lambda environment can be configured with:

- `OPENROUTER_TOKEN`: OpenRouter API token
- `OPENROUTER_MODEL`: optional override for the model identifier, defaults to `moonshotai/kimi-k2.5`
- `AI_MESSAGE_MAX_CHARACTERS`: optional character cap for generated reminder text
- `AI_MESSAGE_MAX_SENTENCES`: optional sentence cap for generated reminder text

## Local development

```bash
cd lambda/custom
npm install
npm test
```

## Example utterances

- `Alexa, open good night sweetheart`
- `Alexa, ask good night sweetheart to set my bedtime for 10 PM every day`
- `Alexa, ask good night sweetheart to set weekdays for 10 PM`
- `Alexa, ask good night sweetheart to set Monday bedtime for 9:30 PM`
- `Alexa, ask good night sweetheart what my bedtime schedule is`
- `Alexa, ask good night sweetheart what time bedtime is tonight`
- `Alexa, ask good night sweetheart what time my bedtime is`
- `Alexa, ask good night sweetheart to clear my bedtime on Friday`

## Current constraints

- The reminder is delivered as an Alexa reminder, so Alexa may prepend reminder framing rather than speaking only the custom line by itself.
- The reminder message is generated when the reminder is scheduled, not live at bedtime.
- Before store submission, make sure the Alexa console privacy answers still match `docs/privacy-policy.md` and the current external API usage.
