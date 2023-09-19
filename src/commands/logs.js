import AppConfig from '../models/app_configuration.js';
import Log from '../models/log.js';
import Logger from '../logger.js';

export async function appLogs (params) {
  const { alias, after: since, before: until, search, 'deployment-id': deploymentId } = params.options;
  const { addon: addonId } = params.options;

  // ignore --search ""
  const filter = (search !== '') ? search : null;
  const appAddonId = addonId || await AppConfig.getAppDetails({ alias }).then(({ appId }) => appId);

  Logger.println('Waiting for application logs…');

  return Log.displayLogs({ appAddonId, since, until, filter, deploymentId });
}
