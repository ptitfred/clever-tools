'use strict';

const openPage = require('open');

const Application = require('../models/application.js');
const Domain = require('../models/domain.js');
const Logger = require('../logger.js');

async function open (params) {
  const { app: appIdOrName, org: orgIdOrName } = params.options;
  const { ownerId, appId } = await Application.resolveId(appIdOrName, orgIdOrName);

  const vhost = await Domain.getBest(appId, ownerId);
  const url = 'https://' + vhost.fqdn;

  Logger.println('Opening the application in your browser');
  await openPage(url, { wait: false });
}

module.exports = { open };
