import openPage from 'open';

import AppConfig from '../models/app_configuration.js';
import Domain from '../models/domain.js';
import Logger from '../logger.js';

export async function open (params) {
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const vhost = await Domain.getBest(appId, ownerId);
  const url = 'https://' + vhost.fqdn;

  Logger.println('Opening the application in your browser');
  await openPage(url, { wait: false });
}
