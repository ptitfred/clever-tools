import * as AppConfig from '../models/app_configuration.js';
import Logger from '../logger.js';
import * as variables from '../models/variables.js';
import { sendToApi } from '../models/send-to-api.js';
import { toNameEqualsValueString, validateName } from '@clevercloud/client/cjs/utils/env-vars.js';
import * as Application from '@clevercloud/client/cjs/api/v2/application.js';

export async function list (params) {
  const { alias, 'add-export': addExports } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const [envFromApp, envFromAddons, envFromDeps] = await Promise.all([
    application.getAllEnvVars({ id: ownerId, appId }).then(sendToApi),
    application.getAllEnvVarsForAddons({ id: ownerId, appId }).then(sendToApi),
    application.getAllEnvVarsForDependencies({ id: ownerId, appId }).then(sendToApi),
  ]);

  Logger.println('# Manually set env variables');
  Logger.println(toNameEqualsValueString(envFromApp, { addExports }));

  envFromAddons.forEach((addon) => {
    Logger.println('# Addon ' + addon.addon_name);
    Logger.println(toNameEqualsValueString(addon.env, { addExports }));
  });

  envFromDeps.forEach((dep) => {
    Logger.println('# Dependency ' + dep.app_name);
    Logger.println(toNameEqualsValueString(dep.env, { addExports }));
  });
};

export async function set (params) {
  const [envName, value] = params.args;
  const { alias } = params.options;

  const nameIsValid = validateName(envName);
  if (!nameIsValid) {
    throw new Error(`Environment variable name ${envName} is invalid`);
  }

  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await application.updateEnvVar({ id: ownerId, appId, envName }, { value }).then(sendToApi);

  Logger.println('Your environment variable has been successfully saved');
};

export async function rm (params) {
  const [envName] = params.args;
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await application.removeEnvVar({ id: ownerId, appId, envName }).then(sendToApi);

  Logger.println('Your environment variable has been successfully removed');
};

export async function importEnv (params) {
  const { alias, json } = params.options;
  const format = json ? 'json' : 'name-equals-value';
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const envVars = await variables.readVariablesFromStdin(format);
  await application.updateAllEnvVars({ id: ownerId, appId }, envVars).then(sendToApi);

  Logger.println('Environment variables have been set');
};

export async function importVarsFromLocalEnv (params) {
  const [envNames] = params.args;
  const { alias } = params.options;

  for (const envName of envNames) {
    const nameIsValid = validateName(envName);
    if (!nameIsValid) {
      throw new Error(`Environment variable name ${envName} is invalid`);
    }
  }

  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  for (const envName of envNames) {
    const value = process.env[envName] || '';
    await application.updateEnvVar({ id: ownerId, appId, envName }, { value }).then(sendToApi);
  }

  Logger.println('Your environment variables have been successfully saved');
};
