import _ from 'lodash';
import colors from 'colors/safe.js';

import * as Addon from '../models/addon.js';
import * as AppConfig from '../models/app_configuration.js';
import Logger from '../logger.js';
import * as Organisation from '../models/organisation.js';
import * as User from '../models/user.js';
import { parseAddonOptions, findOwnerId } from '../models/addon.js';
import { getAllEnvVars } from '@clevercloud/client/cjs/api/v2/addon.js';
import { sendToApi } from '../models/send-to-api.js';
import { toNameEqualsValueString } from '@clevercloud/client/cjs/utils/env-vars.js';
import { resolveAddonId } from '../models/ids-resolver.js';
import formatTableModule from '../format-table.js';

const formatTable = formatTableModule();

export async function list (params) {
  const { org: orgaIdOrName } = params.options;

  const ownerId = await Organisation.getId(orgaIdOrName);
  const addons = await Addon.list(ownerId);

  const formattedAddons = addons.map((addon) => {
    return [
      addon.plan.name + ' ' + addon.provider.name,
      addon.region,
      colors.bold.green(addon.name),
      addon.id,
    ];
  });
  Logger.println(formatTable(formattedAddons));
}

export async function create (params) {
  const [providerName, name] = params.args;
  const { link: linkedAppAlias, plan: planName, region, yes: skipConfirmation, org: orgaIdOrName } = params.options;
  const version = params.options['addon-version'];
  const addonOptions = parseAddonOptions(params.options.option);

  const ownerId = (orgaIdOrName != null)
    ? await Organisation.getId(orgaIdOrName)
    : await User.getCurrentId();

  if (linkedAppAlias != null) {
    const linkedAppData = await AppConfig.getAppDetails({ alias: linkedAppAlias });
    if (orgaIdOrName != null && linkedAppData.ownerId !== ownerId) {
      Logger.warn('The specified application does not belong to the specified organisation. Ignoring the `--org` option');
    }
    const newAddon = await Addon.create({
      ownerId: linkedAppData.ownerId,
      name,
      providerName,
      planName,
      region,
      skipConfirmation,
      version,
      addonOptions,
    });
    await Addon.link(linkedAppData.ownerId, linkedAppData.appId, { addon_id: newAddon.id });
    Logger.println(`Addon ${name} (id: ${newAddon.id}) successfully created and linked to the application`);
  }
  else {
    const newAddon = await Addon.create({
      ownerId,
      name,
      providerName,
      planName,
      region,
      skipConfirmation,
      version,
      addonOptions,
    });
    Logger.println(`Addon ${name} (id: ${newAddon.id}) successfully created`);
  }
}

export async function deleteAddon (params) {
  const { yes: skipConfirmation, org: orgaIdOrName } = params.options;
  const [addon] = params.args;

  const ownerId = await Organisation.getId(orgaIdOrName);
  await Addon.delete(ownerId, addon, skipConfirmation);

  Logger.println(`Addon ${addon.addon_id || addon.addon_name} successfully deleted`);
}

export async function rename (params) {
  const [addon, newName] = params.args;
  const { org: orgaIdOrName } = params.options;

  const ownerId = await Organisation.getId(orgaIdOrName);
  await Addon.rename(ownerId, addon, newName);

  Logger.println(`Addon ${addon.addon_id || addon.addon_name} successfully renamed to ${newName}`);
}

export async function listProviders () {

  const providers = await Addon.listProviders();

  const formattedProviders = providers.map((provider) => {
    return [
      colors.bold(provider.id),
      provider.name,
      provider.shortDesc || '',
    ];
  });
  Logger.println(formatTable(formattedProviders));
}

export async function showProvider (params) {
  const [providerName] = params.args;

  const provider = await Addon.getProvider(providerName);
  const providerInfos = await Addon.getProviderInfos(providerName);
  const providerPlans = provider.plans.sort((a, b) => a.price - b.price);

  Logger.println(colors.bold(provider.id));
  Logger.println(`${provider.name}: ${provider.shortDesc}`);
  Logger.println();
  Logger.println(`Available regions: ${provider.regions.join(', ')}`);
  Logger.println();
  Logger.println('Available plans');

  providerPlans.forEach((plan) => {
    Logger.println(`Plan ${colors.bold(plan.slug)}`);
    _(plan.features)
      .sortBy('name')
      .forEach(({ name, value }) => Logger.println(`  ${name}: ${value}`));

    if (providerInfos != null) {
      const planType = plan.features.find(({ name }) => name.toLowerCase() === 'type');
      if (planType != null && planType.value.toLowerCase() === 'dedicated') {
        const planVersions = Object.keys(providerInfos.dedicated);
        const versions = planVersions.map((version) => {
          if (version === providerInfos.defaultDedicatedVersion) {
            return `${version} (default)`;
          }
          else {
            return version;
          }
        });
        Logger.println(`  Available versions: ${versions.join(', ')}`);

        planVersions.forEach((version) => {
          const features = providerInfos.dedicated[version].features;
          Logger.println(`  Options for version ${version}:`);
          features.forEach(({ name, enabled }) => {
            Logger.println(`    ${name}: default=${enabled}`);
          });
        });
      }
    }
  });
}

export async function env (params) {

  const { org, format } = params.options;
  const [addonIdOrRealId] = params.args;

  const addonId = await resolveAddonId(addonIdOrRealId);
  const ownerId = await findOwnerId(org, addonId);

  const envFromAddon = await getAllEnvVars({ id: ownerId, addonId }).then(sendToApi);

  switch (format) {

    case 'json': {
      const envFromAddonJson = Object.fromEntries(
        envFromAddon.map(({ name, value }) => [name, value]),
      );
      Logger.println(JSON.stringify(envFromAddonJson, null, 2));
      break;
    }

    case 'shell':
      Logger.println(toNameEqualsValueString(envFromAddon, { addExports: true }));
      break;

    case 'human':
    default:
      Logger.println(toNameEqualsValueString(envFromAddon, { addExports: false }));
  }
}
