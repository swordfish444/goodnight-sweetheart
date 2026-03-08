const { PROFILE_GIVEN_NAME_PERMISSION } = require('./constants');

function isServicePermissionError(error) {
  return [401, 403].includes(error?.statusCode) || [401, 403].includes(error?.response?.status);
}

function normalizeFirstName(value) {
  const firstToken = String(value || '')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^\p{L}\p{M}'’-]/gu, '');

  return firstToken || null;
}

function isProfilePermissionError(error) {
  return error?.message === 'PROFILE_GIVEN_NAME_PERMISSION_REQUIRED';
}

async function getCustomerFirstName(handlerInput) {
  try {
    const givenName = await handlerInput.serviceClientFactory.getUpsServiceClient().getProfileGivenName();
    return normalizeFirstName(givenName);
  } catch (error) {
    if (!isServicePermissionError(error)) {
      throw error;
    }

    const wrapped = new Error('PROFILE_GIVEN_NAME_PERMISSION_REQUIRED');
    wrapped.permission = PROFILE_GIVEN_NAME_PERMISSION;
    wrapped.cause = error;
    throw wrapped;
  }
}

module.exports = {
  getCustomerFirstName,
  isProfilePermissionError,
  normalizeFirstName,
};
