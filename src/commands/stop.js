import AppConfig from '../models/app_configuration.js';
import application from '@clevercloud/client/cjs/api/v2/application.js';
import Logger from '../logger.js';
import { sendToApi } from '../models/send-to-api.js';

export async function stop (params) {
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await application.undeploy({ id: ownerId, appId }).then(sendToApi);
  Logger.println('App successfully stopped!');
}
