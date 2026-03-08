# Goodnight Sweetheart

Goodnight Sweetheart is an Alexa custom skill that lets a customer set one bedtime for every day or different bedtimes for specific days of the week. At each scheduled time, Alexa delivers an affectionate bedtime reminder with one of the skill's "goodnight sweetheart" style messages.

## Product shape

- Customers can set the same bedtime every day.
- Customers can set a different bedtime for any day of the week.
- Customers can ask for their current bedtime schedule.
- Customers can clear one day or clear the full schedule.
- The skill uses the Alexa Reminders API because custom skills cannot independently start arbitrary speech at scheduled times outside reminder and routine surfaces.

## Repo layout

- `lambda/custom`: Node.js Lambda code for the Alexa skill.
- `skill-package`: Alexa manifest and interaction model assets.
- `docs`: submission notes, privacy policy, and terms placeholders.

## Local development

```bash
cd lambda/custom
npm install
npm test
```

## Example utterances

- `Alexa, open sweetheart bedtime`
- `Alexa, ask sweetheart bedtime to set my bedtime for 10 PM every day`
- `Alexa, ask sweetheart bedtime to set Monday bedtime for 9:30 PM`
- `Alexa, ask sweetheart bedtime what my bedtime schedule is`
- `Alexa, ask sweetheart bedtime to clear my bedtime on Friday`

## Current constraints

- The reminder will be delivered as an Alexa reminder, so Alexa may prepend reminder framing rather than speaking only the custom line by itself.
- Before store submission, replace the placeholder policy URLs and finalize production icons.
- The current manifest is structured for an ASK project flow. When we connect the AWS and Alexa console pieces, we can update any deployment-specific settings in place.
