const ICON_URL =
  'https://raw.githubusercontent.com/swordfish444/goodnight-sweetheart/main/assets/icon-512.png';
const BACKGROUND_URL =
  'https://raw.githubusercontent.com/swordfish444/goodnight-sweetheart/main/assets/show-background.png';

function supportsApl(handlerInput) {
  return Boolean(
    handlerInput.requestEnvelope.context?.System?.device?.supportedInterfaces?.['Alexa.Presentation.APL'],
  );
}

function standardCardText({ subtitle, footer }) {
  return [subtitle, footer].filter(Boolean).join('\n\n');
}

function buildDocument({ footer, subtitle, title }) {
  return {
    type: 'APL',
    version: '1.9',
    import: [
      {
        name: 'alexa-layouts',
        version: '1.7.0',
      },
    ],
    mainTemplate: {
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          items: [
            {
              type: 'Image',
              source: BACKGROUND_URL,
              width: '100vw',
              height: '100vh',
              scale: 'best-fill',
            },
            {
              type: 'Frame',
              width: '100vw',
              height: '100vh',
              backgroundColor: '#091220CC',
            },
            {
              type: 'Container',
              direction: 'column',
              justifyContent: 'spaceBetween',
              paddingTop: '36dp',
              paddingBottom: '28dp',
              paddingLeft: '36dp',
              paddingRight: '36dp',
              width: '100vw',
              height: '100vh',
              items: [
                {
                  type: 'Container',
                  direction: 'row',
                  alignItems: 'center',
                  spacing: '16dp',
                  items: [
                    {
                      type: 'Image',
                      source: ICON_URL,
                      width: '72dp',
                      height: '72dp',
                      borderRadius: '18dp',
                    },
                    {
                      type: 'Text',
                      text: title,
                      fontSize: '42dp',
                      fontWeight: '700',
                      color: '#F8F3E9',
                      maxLines: 2,
                    },
                  ],
                },
                {
                  type: 'Container',
                  direction: 'column',
                  spacing: '18dp',
                  items: [
                    {
                      type: 'Text',
                      text: subtitle,
                      fontSize: '28dp',
                      lineHeight: '36dp',
                      color: '#F5E8C9',
                      maxLines: 6,
                    },
                    ...(footer
                      ? [
                          {
                            type: 'Text',
                            text: footer,
                            fontSize: '20dp',
                            color: '#D8DDE8',
                            maxLines: 2,
                          },
                        ]
                      : []),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function decorateResponseBuilder(
  handlerInput,
  responseBuilder,
  {
    footer = 'You can say: set weekdays for 10 PM.',
    subtitle,
    title = 'Goodnight Sweetheart',
  } = {},
) {
  const cardText = standardCardText({
    subtitle,
    footer,
  });

  responseBuilder.withStandardCard(title, cardText || subtitle || title, ICON_URL, BACKGROUND_URL);

  if (!supportsApl(handlerInput)) {
    return responseBuilder;
  }

  responseBuilder.addDirective({
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: `goodnight-sweetheart-${Date.now()}`,
    document: buildDocument({
      footer,
      subtitle: subtitle || title,
      title,
    }),
  });

  return responseBuilder;
}

module.exports = {
  BACKGROUND_URL,
  ICON_URL,
  decorateResponseBuilder,
  supportsApl,
};
