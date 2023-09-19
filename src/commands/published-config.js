import * as AppConfig from '../models/app_configuration.js';
import Logger from '../logger.js';
import * as variables from '../models/variables.js';
import { sendToApi } from '../models/send-to-api.js';
import { toNameEqualsValueString, validateName } from '@clevercloud/client/cjs/utils/env-vars.js';
import * as Application from '@clevercloud/client/cjs/api/v2/application.js';

export async function list (params) {
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const publishedConfigs = await application.getAllExposedEnvVars({ id: ownerId, appId }).then(sendToApi);
  const pairs = Object.entries(publishedConfigs)
    .map(([name, value]) => ({ name, value }));

  Logger.println('# Published configs');
  Logger.println(toNameEqualsValueString(pairs));
};

export async function set (params) {
  const [varName, varValue] = params.args;
  const { alias } = params.options;

  const nameIsValid = validateName(varName);
  if (!nameIsValid) {
    throw new Error(`Published config name ${varName} is invalid`);
  }

  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const publishedConfigs = await application.getAllExposedEnvVars({ id: ownerId, appId }).then(sendToApi);
  publishedConfigs[varName] = varValue;
  await application.updateAllExposedEnvVars({ id: ownerId, appId }, publishedConfigs).then(sendToApi);

  Logger.println('Your published config item has been successfully saved');
};

export async function rm (params) {
  const [varName] = params.args;
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const publishedConfigs = await application.getAllExposedEnvVars({ id: ownerId, appId }).then(sendToApi);
  delete publishedConfigs[varName];
  await application.updateAllExposedEnvVars({ id: ownerId, appId }, publishedConfigs).then(sendToApi);

  Logger.println('Your published config item has been successfully removed');
};

export async function importEnv (params) {
  const { alias, json } = params.options;
  const format = json ? 'json' : 'name-equals-value';
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const publishedConfigs = await variables.readVariablesFromStdin(format);
  await application.updateAllExposedEnvVars({ id: ownerId, appId }, publishedConfigs).then(sendToApi);

  Logger.println('Your published configs have been set');
};
