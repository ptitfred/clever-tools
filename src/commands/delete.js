import * as AppConfig from '../models/app_configuration.js';
import * as Application from '../models/application.js';
import Logger from '../logger.js';

export async function deleteApp (params) {
  const { alias, yes: skipConfirmation } = params.options;
  const appDetails = await AppConfig.getAppDetails({ alias });

  await Application.deleteApp(appDetails, skipConfirmation);
  await Application.unlinkRepo(appDetails.alias);

  Logger.println('The application has been deleted');
};
