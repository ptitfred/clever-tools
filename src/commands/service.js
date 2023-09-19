import * as Addon from '../models/addon.js';
import * as AppConfig from '../models/app_configuration.js';
import * as Application from '../models/application.js';
import Logger from '../logger.js';

export async function list (params) {
  const { alias, 'show-all': showAll, 'only-apps': onlyApps, 'only-addons': onlyAddons } = params.options;
  if (onlyApps && onlyAddons) {
    throw new Error('--only-apps and --only-addons are mutually exclusive');
  }

  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  if (!onlyAddons) {
    const apps = await Application.listDependencies(ownerId, appId, showAll);
    Logger.println('Applications:');
    apps.forEach(({ isLinked, name }) => Logger.println(`${isLinked ? '*' : ' '} ${name}`));
  }

  if (!onlyApps) {
    const addons = await Addon.list(ownerId, appId, showAll);
    Logger.println('Addons:');
    addons.forEach(({ isLinked, name, realId }) => Logger.println(`${isLinked ? '*' : ' '} ${name} (${realId})`));
  }
}

export async function linkApp (params) {
  const { alias } = params.options;
  const [dependency] = params.args;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await Application.link(ownerId, appId, dependency);
  Logger.println(`App ${dependency.app_id || dependency.app_name} successfully linked`);
}

export async function unlinkApp (params) {
  const { alias } = params.options;
  const [dependency] = params.args;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await Application.unlink(ownerId, appId, dependency);
  Logger.println(`App ${dependency.app_id || dependency.app_name} successfully unlinked`);
}

export async function linkAddon (params) {
  const { alias } = params.options;
  const [addon] = params.args;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await Addon.link(ownerId, appId, addon);
  Logger.println(`Addon ${addon.addon_id || addon.addon_name} successfully linked`);
}

export async function unlinkAddon (params) {
  const { alias } = params.options;
  const [addon] = params.args;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await Addon.unlink(ownerId, appId, addon);
  Logger.println(`Addon ${addon.addon_id || addon.addon_name} successfully unlinked`);
}
