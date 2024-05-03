'use strict';

const AppConfig = require('../models/app_configuration.js');
const Application = require('../models/application.js');
const Logger = require('../logger.js');

async function deleteApp (params) {
  const { alias, app: appIdOrName, org: orgIdOrName, yes: skipConfirmation } = params.options;
  const { ownerId, appId } = await Application.resolveId(appIdOrName, orgIdOrName);

  const app = await Application.get(ownerId, appId);
  if (app == null) {
    Logger.println('The application doesn\'t exist');
  }
  else {
    // delete app
    await Application.deleteApp(app, skipConfirmation);
    Logger.println('The application has been deleted');
    // unlink app
    if (await AppConfig.removeLinkedApplication({ appId, alias })) {
      Logger.println('The application has been unlinked');
    }
  }
};

module.exports = { deleteApp };
