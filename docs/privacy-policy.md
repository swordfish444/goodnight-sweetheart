# Privacy Policy for Goodnight Sweetheart

Effective date: March 8, 2026

Goodnight Sweetheart is an Alexa custom skill that helps customers schedule affectionate bedtime reminders. This policy explains what information the skill uses, how it is processed, and the third parties involved in delivering the skill.

## What the skill uses

Goodnight Sweetheart uses only the information needed to create, read, update, and delete the Alexa reminders requested by the customer.

This can include:

- the bedtime schedule the customer asks Alexa to create, including the requested time and any day-of-week grouping such as weekdays or weekends
- the customer's first name, but only if the customer grants Alexa profile permission for it
- Alexa-generated reminder identifiers needed to manage reminders created by the skill
- the Alexa device time zone needed to schedule reminders at the requested local time
- the short prompt context sent to the skill's text-generation provider so the skill can create a bedtime reminder line

## External text-generation processing

Goodnight Sweetheart uses the OpenRouter API to generate short bedtime reminder copy. The skill is configured to use the Kimi 2.5 model through OpenRouter.

When this happens, the skill may send:

- the customer's first name, if the customer granted permission for it
- the requested bedtime time
- whether the reminder is for every day, weekdays, weekends, or a specific day
- instructions describing the style and length of the reminder message

The skill is not designed to send the customer's last name, email address, phone number, postal address, or account-linking data to OpenRouter.

If the external text-generation service is unavailable, the skill falls back to an internal message library and still creates the reminder requested by the customer.

## What the skill does not request

Goodnight Sweetheart does not use account linking and does not request:

- email address
- phone number
- physical address
- payment information

## How the information is used

The information described above is used only to:

- create bedtime reminders requested by the customer
- read existing reminders created by the skill
- update or delete reminders when the customer changes or clears a schedule
- generate short reminder wording for the reminder that Alexa will later deliver, including personalized first-name greetings when permission is granted

## Where the information is processed

Goodnight Sweetheart runs as an AWS-hosted Alexa skill and uses:

- Amazon Alexa services, including the Alexa Reminders API
- AWS Lambda for skill execution
- OpenRouter and the selected underlying model provider for reminder-text generation

These providers may process limited skill request data as required to deliver the service.

## Data retention

Goodnight Sweetheart does not maintain a separate customer marketing database.

- Reminder schedule data is stored through the Alexa reminder the customer asks the skill to create.
- If first-name permission is granted, the generated reminder text stored inside the Alexa reminder may include the customer's first name.
- Skill execution logs may temporarily include operational data needed for debugging and reliability.
- If a customer clears reminders, the skill removes the reminder configuration it manages through the Alexa Reminders API.

## Sharing and advertising

Goodnight Sweetheart does not sell customer information. The skill does not use customer information for advertising.

Information is shared only with service providers needed to operate the skill, such as Amazon Alexa services, AWS, and OpenRouter or the selected model provider.

## Children

Goodnight Sweetheart is not directed to children.

## Security

Goodnight Sweetheart is designed to limit the information it processes to the minimum required for reminder scheduling and short reminder generation. No security method can guarantee absolute protection, but the skill is designed to avoid collecting unnecessary personal data.

## Permission choices

Customers can deny first-name profile permission. If that permission is not granted, the skill can still create bedtime reminders, but it will use generic reminder wording instead of a first-name greeting.

## Changes to this policy

This policy may be updated as the skill changes. The most current version will be published at this URL.

## Contact

Questions about this policy can be submitted through the project repository at [https://github.com/swordfish444/goodnight-sweetheart/issues](https://github.com/swordfish444/goodnight-sweetheart/issues).
