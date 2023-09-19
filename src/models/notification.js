const autocomplete = require('cliparse').autocomplete;

import AppConfig from '../models/app_configuration.js';
import Organisation from '../models/organisation.js';
import User from '../models/user.js';

export function listMetaEvents () {
  return autocomplete.words([
    'META_SERVICE_LIFECYCLE',
    'META_DEPLOYMENT_RESULT',
    'META_SERVICE_MANAGEMENT',
    'META_CREDITS',
  ]);
}

export function getOrgaIdOrUserId (orgIdOrName) {
  return (orgIdOrName == null)
    ? User.getCurrentId()
    : Organisation.getId(orgIdOrName);
}

export async function getOwnerAndApp (alias, org, useLinkedApp) {

  if (!useLinkedApp) {
    const ownerId = await getOrgaIdOrUserId(org);
    return { ownerId };
  }

  return AppConfig.getAppDetails({ alias });
}
