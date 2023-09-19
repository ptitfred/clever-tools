import cliparse from 'cliparse';
import * as Organisation from '../models/organisation.js';
import * as User from '../models/user.js';
import * as AppConfig from './app_configuration.js';
import ngApi from '@clevercloud/client/cjs/api/v4/network-group.js';
import { sendToApi } from './send-to-api.js';

export async function getOwnerId (orgaIdOrName, alias) {
  if (orgaIdOrName == null) {
    try {
      return (await AppConfig.getAppDetails({ alias })).ownerId;
    }
    catch (error) {
      return (await User.getCurrentId());
    }
  }
  else {
    return (await Organisation.getId(orgaIdOrName));
  }
}

export async function getId (ownerId, ngIdOrLabel) {
  if (ngIdOrLabel == null) {
    return null;
  }

  if (ngIdOrLabel.ng_id != null) {
    return ngIdOrLabel.ng_id;
  }

  return getByLabel(ownerId, ngIdOrLabel.ng_label)
    .then((ng) => ng.id);
}

async function getByLabel (owner_id, label) {
  const networkGroups = await ngApi.listNetworkGroups({ owner_id }).then(sendToApi);
  const filteredNgs = networkGroups.filter((ng) => ng.label === label);

  if (filteredNgs.length === 0) {
    throw new Error('Network Group not found');
  }
  if (filteredNgs.length > 1) {
    throw new Error('Ambiguous Network Group label');
  }

  return filteredNgs[0];
}

export function listAvailablePeerRoles () {
  return cliparse.autocomplete.words(['client', 'server']);
}

export function listAvailableMemberTypes () {
  return cliparse.autocomplete.words(['application', 'addon', 'external']);
}
