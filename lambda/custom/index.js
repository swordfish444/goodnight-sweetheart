const Alexa = require('ask-sdk-core');

const {
  clearAllSchedules,
  clearDaySchedule,
  isPermissionError,
  isTimeZoneError,
  listSkillSchedules,
  normalizeDaySlot,
  normalizeTimeSlot,
  requestReminderPermissions,
  setDailySchedule,
  setDaySchedule,
  speechForSchedules,
  timeForSpeech,
} = require('./lib/reminders');

function getPendingAction(handlerInput) {
  return handlerInput.attributesManager.getSessionAttributes().pendingAction;
}

function setPendingAction(handlerInput, pendingAction) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.pendingAction = pendingAction;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

function clearPendingAction(handlerInput) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  delete sessionAttributes.pendingAction;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

function buildConfirmationResponse(handlerInput, pendingAction, speech) {
  setPendingAction(handlerInput, pendingAction);
  return handlerInput.responseBuilder
    .speak(speech)
    .reprompt('Say yes to save it, or no to cancel.')
    .getResponse();
}

async function executePendingAction(handlerInput, pendingAction) {
  try {
    if (pendingAction.type === 'SET_DAILY') {
      const result = await setDailySchedule(handlerInput, pendingAction.time);
      clearPendingAction(handlerInput);
      return handlerInput.responseBuilder
        .speak(
          `Done. I'll send a Goodnight Sweetheart reminder every day at ${timeForSpeech(
            pendingAction.time,
          )}. ${result.deletedCount > 0 ? 'I also replaced the old bedtime schedule.' : ''}`.trim(),
        )
        .getResponse();
    }

    if (pendingAction.type === 'SET_DAY') {
      const result = await setDaySchedule(handlerInput, pendingAction.dayCode, pendingAction.time);
      clearPendingAction(handlerInput);
      return handlerInput.responseBuilder
        .speak(
          `Done. ${result.dayName} is now set for ${timeForSpeech(pendingAction.time)}.${
            result.removedDaily ? ' I removed the old every-day reminder so it does not double up.' : ''
          }`,
        )
        .getResponse();
    }

    if (pendingAction.type === 'CLEAR_DAY') {
      const result = await clearDaySchedule(handlerInput, pendingAction.dayCode);
      clearPendingAction(handlerInput);
      const speech = result.cleared
        ? `Okay. I cleared your ${result.dayName} bedtime reminder.`
        : result.blockedByDaily
          ? 'You currently have one every-day bedtime reminder. Ask me to clear everything, or set custom days instead.'
          : `I could not find a ${result.dayName} bedtime reminder to clear.`;
      return handlerInput.responseBuilder.speak(speech).getResponse();
    }

    if (pendingAction.type === 'CLEAR_ALL') {
      const result = await clearAllSchedules(handlerInput);
      clearPendingAction(handlerInput);
      return handlerInput.responseBuilder
        .speak(
          result.deletedCount > 0
            ? 'Okay. I cleared your full Goodnight Sweetheart bedtime schedule.'
            : 'You do not have any Goodnight Sweetheart bedtime reminders to clear.',
        )
        .getResponse();
    }

    clearPendingAction(handlerInput);
    return handlerInput.responseBuilder
      .speak('I did not have a pending bedtime change to complete.')
      .getResponse();
  } catch (error) {
    if (isPermissionError(error)) {
      return requestReminderPermissions(handlerInput, pendingAction);
    }

    if (isTimeZoneError(error)) {
      clearPendingAction(handlerInput);
      return handlerInput.responseBuilder
        .speak(
          'I could not read your Alexa device time zone. Check the device time zone in the Alexa app, then try again.',
        )
        .getResponse();
    }

    throw error;
  }
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(
        'Welcome to Goodnight Sweetheart. I can schedule loving bedtime reminders for every day or for specific days of the week. Try saying, set my bedtime for 10 PM every day.',
      )
      .reprompt('You can say, set my bedtime for 10 PM every day.')
      .getResponse();
  },
};

const SetDailyBedtimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetDailyBedtimeIntent'
    );
  },
  handle(handlerInput) {
    const slotValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'bedtimeTime');
    const time = normalizeTimeSlot(slotValue);

    if (!time) {
      return handlerInput.responseBuilder
        .speak('I did not catch the bedtime. Try saying, set my bedtime for 10 PM every day.')
        .reprompt('Try saying, set my bedtime for 10 PM every day.')
        .getResponse();
    }

    return buildConfirmationResponse(
      handlerInput,
      {
        type: 'SET_DAILY',
        time,
      },
      `I can set a bedtime reminder every day at ${timeForSpeech(time)}. Would you like me to save that?`,
    );
  },
};

const SetDayBedtimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetDayBedtimeIntent'
    );
  },
  handle(handlerInput) {
    const dayValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'bedtimeDay');
    const timeValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'bedtimeTime');
    const day = normalizeDaySlot(dayValue);
    const time = normalizeTimeSlot(timeValue);

    if (!day || !time) {
      return handlerInput.responseBuilder
        .speak('I need both a day and a time. For example, say set Monday bedtime for 9:30 PM.')
        .reprompt('Try saying, set Monday bedtime for 9:30 PM.')
        .getResponse();
    }

    return buildConfirmationResponse(
      handlerInput,
      {
        type: 'SET_DAY',
        dayCode: day.code,
        time,
      },
      `I can set ${day.name} for ${timeForSpeech(time)}. Would you like me to save that?`,
    );
  },
};

const ViewBedtimeScheduleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ViewBedtimeScheduleIntent'
    );
  },
  async handle(handlerInput) {
    try {
      const schedules = await listSkillSchedules(handlerInput);
      return handlerInput.responseBuilder.speak(speechForSchedules(schedules)).getResponse();
    } catch (error) {
      if (isPermissionError(error)) {
        return requestReminderPermissions(handlerInput, {
          type: 'VIEW_SCHEDULE',
        });
      }

      if (isTimeZoneError(error)) {
        return handlerInput.responseBuilder
          .speak(
            'I could not read your Alexa device time zone. Check the device time zone in the Alexa app, then try again.',
          )
          .getResponse();
      }

      throw error;
    }
  },
};

const ClearDayBedtimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ClearDayBedtimeIntent'
    );
  },
  handle(handlerInput) {
    const dayValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'bedtimeDay');
    const day = normalizeDaySlot(dayValue);

    if (!day) {
      return handlerInput.responseBuilder
        .speak('Tell me which day to clear. For example, say clear my bedtime on Friday.')
        .reprompt('Try saying, clear my bedtime on Friday.')
        .getResponse();
    }

    return buildConfirmationResponse(
      handlerInput,
      {
        type: 'CLEAR_DAY',
        dayCode: day.code,
      },
      `I can clear your ${day.name} bedtime reminder. Would you like me to continue?`,
    );
  },
};

const ClearAllBedtimesIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ClearAllBedtimesIntent'
    );
  },
  handle(handlerInput) {
    return buildConfirmationResponse(
      handlerInput,
      {
        type: 'CLEAR_ALL',
      },
      'I can clear your full bedtime schedule. Would you like me to continue?',
    );
  },
};

const YesIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
    );
  },
  async handle(handlerInput) {
    const pendingAction = getPendingAction(handlerInput);

    if (!pendingAction) {
      return handlerInput.responseBuilder
        .speak('There is nothing waiting for confirmation right now.')
        .reprompt('Try asking me to set a bedtime first.')
        .getResponse();
    }

    return executePendingAction(handlerInput, pendingAction);
  },
};

const NoIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
    );
  },
  handle(handlerInput) {
    clearPendingAction(handlerInput);
    return handlerInput.responseBuilder
      .speak('Okay. I did not change your bedtime schedule.')
      .getResponse();
  },
};

const SessionResumedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionResumedRequest';
  },
  async handle(handlerInput) {
    const pendingAction = getPendingAction(handlerInput);
    const cause = handlerInput.requestEnvelope.request.cause || {};
    const statusCode = cause.status?.code;

    if (!pendingAction) {
      return handlerInput.responseBuilder
        .speak('The reminder permission flow finished, but there was no pending bedtime change to complete.')
        .getResponse();
    }

    if (statusCode && statusCode !== '200') {
      clearPendingAction(handlerInput);
      return handlerInput.responseBuilder
        .speak('I could not get reminder permission, so I did not change your bedtime schedule.')
        .getResponse();
    }

    if (pendingAction.type === 'VIEW_SCHEDULE') {
      clearPendingAction(handlerInput);
      const schedules = await listSkillSchedules(handlerInput);
      return handlerInput.responseBuilder.speak(speechForSchedules(schedules)).getResponse();
    }

    return executePendingAction(handlerInput, pendingAction);
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(
        'You can ask me to set your bedtime every day, set a bedtime for one day, tell you your schedule, or clear reminders. For example, say set my bedtime for 10 PM every day.',
      )
      .reprompt('Try saying, set my bedtime for 10 PM every day.')
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(Alexa.getIntentName(handlerInput.requestEnvelope))
    );
  },
  handle(handlerInput) {
    clearPendingAction(handlerInput);
    return handlerInput.responseBuilder.speak('Goodnight.').getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(
        'I can help you set loving bedtime reminders. Try saying, set my bedtime for 10 PM every day.',
      )
      .reprompt('Try saying, set Monday bedtime for 9:30 PM.')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    clearPendingAction(handlerInput);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Goodnight Sweetheart error', error);
    clearPendingAction(handlerInput);
    return handlerInput.responseBuilder
      .speak('Something went wrong while I was working on your bedtime schedule. Please try again.')
      .reprompt('Please try again.')
      .getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .withApiClient(new Alexa.DefaultApiClient())
  .addRequestHandlers(
    LaunchRequestHandler,
    SetDailyBedtimeIntentHandler,
    SetDayBedtimeIntentHandler,
    ViewBedtimeScheduleIntentHandler,
    ClearDayBedtimeIntentHandler,
    ClearAllBedtimesIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    SessionResumedRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

