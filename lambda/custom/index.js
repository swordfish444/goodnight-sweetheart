const Alexa = require('ask-sdk-core');

const { decorateResponseBuilder } = require('./lib/apl');
const { isProfilePermissionError } = require('./lib/profile');
const {
  bedtimeForTonight,
  clearAllSchedules,
  clearDaySchedule,
  isPermissionError,
  isTimeZoneError,
  listSkillSchedules,
  normalizeDaySlot,
  normalizeTimeSlot,
  requestBedtimeSetupPermissions,
  requestReminderPermissions,
  setDailySchedule,
  setDaySchedule,
  setScheduleGroupSchedule,
  speechForSchedules,
  timeForSpeech,
} = require('./lib/reminders');
const { normalizeScheduleGroup } = require('./lib/schedule');

function pendingActionNeedsProfile(pendingAction) {
  return ['SET_DAILY', 'SET_DAY', 'SET_GROUP'].includes(pendingAction?.type);
}

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

function buildVisualResponse(
  handlerInput,
  {
    footer,
    reprompt,
    speech,
    subtitle = speech,
    title = 'Goodnight Sweetheart',
  },
) {
  const responseBuilder = handlerInput.responseBuilder.speak(speech);

  if (reprompt) {
    responseBuilder.reprompt(reprompt);
  }

  decorateResponseBuilder(handlerInput, responseBuilder, {
    footer,
    subtitle,
    title,
  });

  return responseBuilder.getResponse();
}

function buildConfirmationResponse(handlerInput, pendingAction, speech) {
  setPendingAction(handlerInput, pendingAction);
  return buildVisualResponse(handlerInput, {
    footer: 'Say yes to save it, or no to cancel.',
    reprompt: 'Say yes to save it, or no to cancel.',
    speech,
    subtitle: speech,
  });
}

function bedtimeScheduleErrorResponse(handlerInput) {
  return buildVisualResponse(handlerInput, {
    footer: 'Please try again.',
    reprompt: 'Please try again.',
    speech: 'Something went wrong while I was working on your bedtime schedule. Please try again.',
  });
}

async function executePendingAction(handlerInput, pendingAction) {
  try {
    if (pendingAction.type === 'SET_DAILY') {
      const result = await setDailySchedule(handlerInput, pendingAction.time);
      clearPendingAction(handlerInput);
      return buildVisualResponse(handlerInput, {
        footer: 'You can ask what your bedtime schedule is at any time.',
        speech: `Done. I'll send a Goodnight Sweetheart reminder every day at ${timeForSpeech(
          pendingAction.time,
        )}.${result.deletedCount > 0 ? ' I replaced your previous bedtime schedule.' : ''}`,
      });
    }

    if (pendingAction.type === 'SET_DAY') {
      const result = await setDaySchedule(handlerInput, pendingAction.dayCode, pendingAction.time);
      clearPendingAction(handlerInput);
      return buildVisualResponse(handlerInput, {
        footer: 'You can also set weekdays and weekends separately.',
        speech: `Done. ${result.dayName} is now set for ${timeForSpeech(pendingAction.time)}.${
          result.removedDaily ? ' I also removed the old every-day reminder so it does not double up.' : ''
        }`,
      });
    }

    if (pendingAction.type === 'SET_GROUP') {
      const result = await setScheduleGroupSchedule(handlerInput, pendingAction.group, pendingAction.time);
      clearPendingAction(handlerInput);
      const subject =
        result.groupCode === 'DAILY'
          ? 'your every-day bedtime reminder'
          : `your ${result.groupName} bedtime reminders`;

      return buildVisualResponse(handlerInput, {
        footer: 'You can say: what time is bedtime tonight.',
        speech: `Done. I set ${subject} for ${timeForSpeech(pendingAction.time)}.${
          result.removedDaily ? ' I also removed the old every-day reminder so it does not double up.' : ''
        }`,
      });
    }

    if (pendingAction.type === 'CLEAR_DAY') {
      const result = await clearDaySchedule(handlerInput, pendingAction.dayCode);
      clearPendingAction(handlerInput);
      const speech = result.cleared
        ? `Okay. I cleared your ${result.dayName} bedtime reminder.`
        : result.blockedByDaily
          ? 'You currently have one every-day bedtime reminder. Ask me to clear everything, or set custom days instead.'
          : `I could not find a ${result.dayName} bedtime reminder to clear.`;

      return buildVisualResponse(handlerInput, {
        footer: 'You can say: clear all my bedtime reminders.',
        speech,
      });
    }

    if (pendingAction.type === 'CLEAR_ALL') {
      const result = await clearAllSchedules(handlerInput);
      clearPendingAction(handlerInput);
      return buildVisualResponse(handlerInput, {
        footer: 'You can set a new bedtime anytime.',
        speech:
          result.deletedCount > 0
            ? 'Okay. I cleared your full Goodnight Sweetheart bedtime schedule.'
            : 'You do not have any Goodnight Sweetheart bedtime reminders to clear.',
      });
    }

    clearPendingAction(handlerInput);
    return buildVisualResponse(handlerInput, {
      footer: 'Try asking me to set a bedtime first.',
      speech: 'I did not have a pending bedtime change to complete.',
    });
  } catch (error) {
    if (pendingActionNeedsProfile(pendingAction) && (isPermissionError(error) || isProfilePermissionError(error))) {
      return requestBedtimeSetupPermissions(handlerInput);
    }

    if (isPermissionError(error)) {
      return requestReminderPermissions(handlerInput, pendingAction);
    }

    if (isTimeZoneError(error)) {
      clearPendingAction(handlerInput);
      return buildVisualResponse(handlerInput, {
        footer: 'Check the device time zone in the Alexa app, then try again.',
        speech:
          'I could not read your Alexa device time zone. Check the device time zone in the Alexa app, then try again.',
      });
    }

    throw error;
  }
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return buildVisualResponse(handlerInput, {
      footer: 'Try saying: set weekdays for 10 PM.',
      reprompt: 'You can say, set my bedtime for 10 PM every day.',
      speech:
        'Welcome to Goodnight Sweetheart. I can set one bedtime every night, separate bedtimes for weekdays and weekends, or a different time for any day of the week. If you grant profile access, I can personalize your goodnight reminder with your first name.',
      subtitle:
        'Set daily, weekday, weekend, or custom-day bedtimes with a personalized goodnight reminder.',
    });
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
      return buildVisualResponse(handlerInput, {
        footer: 'Try saying: set my bedtime for 10 PM every day.',
        reprompt: 'Try saying, set my bedtime for 10 PM every day.',
        speech: 'I did not catch the bedtime. Try saying, set my bedtime for 10 PM every day.',
      });
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
      return buildVisualResponse(handlerInput, {
        footer: 'Try saying: set Monday bedtime for 9:30 PM.',
        reprompt: 'Try saying, set Monday bedtime for 9:30 PM.',
        speech: 'I need both a day and a time. For example, say set Monday bedtime for 9:30 PM.',
      });
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

const SetScheduleGroupBedtimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetScheduleGroupBedtimeIntent'
    );
  },
  handle(handlerInput) {
    const groupValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'bedtimeGroup');
    const timeValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'bedtimeTime');
    const group = normalizeScheduleGroup(groupValue);
    const time = normalizeTimeSlot(timeValue);

    if (!group || !time) {
      return buildVisualResponse(handlerInput, {
        footer: 'Try saying: set weekdays for 10 PM.',
        reprompt: 'Try saying, set weekdays for 10 PM.',
        speech:
          'I need both the day group and the time. For example, say set weekdays for 10 PM.',
      });
    }

    return buildConfirmationResponse(
      handlerInput,
      {
        type: 'SET_GROUP',
        group,
        time,
      },
      `I can set ${group.name} for ${timeForSpeech(time)}. Would you like me to save that?`,
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
      return buildVisualResponse(handlerInput, {
        footer: 'You can also ask: what time is bedtime tonight.',
        speech: speechForSchedules(schedules),
      });
    } catch (error) {
      if (isPermissionError(error)) {
        return requestReminderPermissions(handlerInput, {
          type: 'VIEW_SCHEDULE',
        });
      }

      if (isTimeZoneError(error)) {
        return buildVisualResponse(handlerInput, {
          footer: 'Check the device time zone in the Alexa app, then try again.',
          speech:
            'I could not read your Alexa device time zone. Check the device time zone in the Alexa app, then try again.',
        });
      }

      throw error;
    }
  },
};

const TonightBedtimeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'TonightBedtimeIntent'
    );
  },
  async handle(handlerInput) {
    try {
      const tonight = await bedtimeForTonight(handlerInput);

      if (!tonight.hasSchedule) {
        return buildVisualResponse(handlerInput, {
          footer: 'Try saying: set my bedtime for 10 PM every day.',
          speech: `You do not have a bedtime reminder scheduled for ${tonight.dayName}.`,
        });
      }

      return buildVisualResponse(handlerInput, {
        footer: 'You can ask me to change it anytime.',
        speech: `Your bedtime reminder for ${tonight.dayName} is set for ${timeForSpeech(tonight.time)}.`,
      });
    } catch (error) {
      if (isPermissionError(error)) {
        return requestReminderPermissions(handlerInput, {
          type: 'VIEW_SCHEDULE',
        });
      }

      if (isTimeZoneError(error)) {
        return buildVisualResponse(handlerInput, {
          footer: 'Check the device time zone in the Alexa app, then try again.',
          speech:
            'I could not read your Alexa device time zone. Check the device time zone in the Alexa app, then try again.',
        });
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
      return buildVisualResponse(handlerInput, {
        footer: 'Try saying: clear my bedtime on Friday.',
        reprompt: 'Try saying, clear my bedtime on Friday.',
        speech: 'Tell me which day to clear. For example, say clear my bedtime on Friday.',
      });
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
      return buildVisualResponse(handlerInput, {
        footer: 'Try asking me to set a bedtime first.',
        reprompt: 'Try asking me to set a bedtime first.',
        speech: 'There is nothing waiting for confirmation right now.',
      });
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
    return buildVisualResponse(handlerInput, {
      footer: 'No changes were made.',
      speech: 'Okay. I did not change your bedtime schedule.',
    });
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
      return buildVisualResponse(handlerInput, {
        footer: 'Try asking me to set a bedtime.',
        speech:
          'The reminder permission flow finished, but there was no pending bedtime change to complete.',
      });
    }

    if (statusCode && statusCode !== '200') {
      clearPendingAction(handlerInput);
      return buildVisualResponse(handlerInput, {
        footer: 'You can reopen the Alexa app and grant reminder access, then try again.',
        speech: 'I could not get reminder permission, so I did not change your bedtime schedule.',
      });
    }

    if (pendingAction.type === 'VIEW_SCHEDULE') {
      clearPendingAction(handlerInput);
      const schedules = await listSkillSchedules(handlerInput);
      return buildVisualResponse(handlerInput, {
        footer: 'You can also ask: what time is bedtime tonight.',
        speech: speechForSchedules(schedules),
      });
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
    return buildVisualResponse(handlerInput, {
      footer: 'Try saying: set weekends for 11 PM.',
      reprompt: 'Try saying, set my bedtime for 10 PM every day.',
      speech:
        'You can ask me to set your bedtime every day, set weekdays or weekends, set a bedtime for one day, tell you your schedule, or clear reminders. If you grant profile access, I can personalize the reminder with your first name.',
    });
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
    return buildVisualResponse(handlerInput, {
      footer: 'Sleep well.',
      speech: 'Goodnight.',
      subtitle: 'Sleep well.',
    });
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
    return buildVisualResponse(handlerInput, {
      footer: 'Try saying: set weekdays for 10 PM.',
      reprompt: 'Try saying, set weekdays for 10 PM.',
      speech:
        'I can help you set loving bedtime reminders. Try saying, set my bedtime for 10 PM every day.',
    });
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
    return bedtimeScheduleErrorResponse(handlerInput);
  },
};

const skill = Alexa.SkillBuilders.custom()
  .withApiClient(new Alexa.DefaultApiClient())
  .addRequestHandlers(
    LaunchRequestHandler,
    SetDailyBedtimeIntentHandler,
    SetDayBedtimeIntentHandler,
    SetScheduleGroupBedtimeIntentHandler,
    ViewBedtimeScheduleIntentHandler,
    TonightBedtimeIntentHandler,
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
  .create();

exports.handler = async (event, context) => skill.invoke(event, context);
