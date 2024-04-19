'use strict';

const _ = require('lodash');
const autocomplete = require('cliparse').autocomplete;

const organisation = require('@clevercloud/client/cjs/api/v2/organisation.js');
const { getSummary } = require('@clevercloud/client/cjs/api/v2/user.js');
const { sendToApi } = require('../models/send-to-api.js');
const Application = require('./application.js');

async function getId (orgaIdOrName) {
  if (orgaIdOrName == null) {
    return null;
  }

  if (orgaIdOrName.orga_id != null) {
    return orgaIdOrName.orga_id;
  }

  return getByName(orgaIdOrName.orga_name)
    .then((orga) => orga.id);
}

async function getByName (name) {
  const filteredOrgs = _.filter(await getAll(), { name });

  if (filteredOrgs.length === 0) {
    throw new Error('Organisation not found');
  }
  if (filteredOrgs.length > 1) {
    throw new Error('Ambiguous organisation name');
  }

  return filteredOrgs[0];
}

async function resolveId (appIdOrName, orgIdOrName, alias) {
  if (orgIdOrName != null) {
    return await getId(orgIdOrName);
  }

  const { ownerId } = await Application.resolveId(appIdOrName, orgIdOrName, alias);
  return ownerId;
}

async function getNamespaces (params) {
  const { alias, app: appIdOrName, org: orgIdOrName } = params.options;

  const ownerId = await resolveId(appIdOrName, orgIdOrName, alias);

  return organisation.getNamespaces({ id: ownerId }).then(sendToApi);
}

function completeNamespaces () {
  // Sadly we do not have access to current params in complete as of now
  const params = { options: {} };

  return getNamespaces(params).then(autocomplete.words);
};

async function getAll () {
  const fullSummary = await getSummary({}).then(sendToApi);
  return fullSummary.organisations;
}

module.exports = {
  getAll,
  getId,
  getNamespaces,
  completeNamespaces,
};
