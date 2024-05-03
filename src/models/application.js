'use strict';

const _ = require('lodash');
const application = require('@clevercloud/client/cjs/api/v2/application.js');
const autocomplete = require('cliparse').autocomplete;
const product = require('@clevercloud/client/cjs/api/v2/product.js');

const AppConfiguration = require('./app_configuration.js');
const Interact = require('./interact.js');
const Logger = require('../logger.js');
const Organisation = require('./organisation.js');
const User = require('./user.js');

const { sendToApi } = require('../models/send-to-api.js');
const AppConfig = require('./app_configuration.js');
const { resolveOwnerId } = require('./ids-resolver.js');
const { loadApplicationConf } = require('./app_configuration.js');

function listAvailableTypes () {
  return autocomplete.words(['docker', 'elixir', 'go', 'gradle', 'haskell', 'jar', 'maven', 'meteor', 'node', 'php', 'play1', 'play2', 'python', 'ruby', 'rust', 'sbt', 'static-apache', 'war']);
};

const AVAILABLE_ZONES = ['par', 'grahds', 'rbx', 'rbxhds', 'scw', 'mtl', 'sgp', 'syd', 'wsw'];

function listAvailableZones () {
  return autocomplete.words(AVAILABLE_ZONES);
};

function listAvailableAliases () {
  return AppConfiguration.loadApplicationConf().then(({ apps }) => autocomplete.words(_.map(apps, 'alias')));
};

function listAvailableFlavors () {
  return ['pico', 'nano', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
};

async function getId (ownerId, dependency) {
  if (dependency.app_id) {
    return dependency.app_id;
  }
  const app = await getByName(ownerId, dependency.app_name);
  return app.id;
};

async function getInstanceType (type) {

  // TODO: We should be able to use it without {}
  const types = await product.getAvailableInstances({}).then(sendToApi);

  const enabledTypes = types.filter((t) => t.enabled);
  const matchingVariants = enabledTypes.filter((t) => t.variant != null && t.variant.slug === type);
  const instanceVariant = _.sortBy(matchingVariants, 'version').reverse()[0];
  if (instanceVariant == null) {
    throw new Error(type + ' type does not exist.');
  }
  return instanceVariant;
};

async function create (name, typeName, region, orgaIdOrName, github, isTask, envVars) {
  Logger.debug('Create the application…');

  const ownerId = (orgaIdOrName != null)
    ? await Organisation.getId(orgaIdOrName)
    : await User.getCurrentId();

  const instanceType = await getInstanceType(typeName);

  const newApp = {
    deploy: 'git',
    description: name,
    instanceType: instanceType.type,
    instanceVersion: instanceType.version,
    instanceVariant: instanceType.variant.id,
    maxFlavor: instanceType.defaultFlavor.name,
    maxInstances: 1,
    minFlavor: instanceType.defaultFlavor.name,
    minInstances: 1,
    name: name,
    zone: region,
    instanceLifetime: isTask ? 'TASK' : 'REGULAR',
    env: envVars,
  };

  if (github != null) {
    newApp.oauthService = 'github';
    newApp.oauthApp = github;
  }

  return application.create({ id: ownerId }, newApp).then(sendToApi);
};

async function deleteApp (app, skipConfirmation) {
  Logger.debug('Deleting app: ' + app.name + ' (' + app.id + ')');

  if (!skipConfirmation) {
    await Interact.confirm(
      `Deleting the application ${app.name} can't be undone, please type '${app.name}' to confirm: `,
      'No confirmation, aborting application deletion',
      [app.name],
    );
  }

  return application.remove({ id: app.ownerId, appId: app.id }).then(sendToApi);
};

function getApplicationByName (apps, name) {
  const filteredApps = apps.filter((app) => app.name === name);
  if (filteredApps.length === 1) {
    return filteredApps[0];
  }
  else if (filteredApps.length === 0) {
    throw new Error('Application not found');
  }
  throw new Error('Ambiguous application name');
};

async function getByName (ownerId, name) {
  const apps = await application.getAll({ id: ownerId }).then(sendToApi);
  return getApplicationByName(apps, name);
};

function get (ownerId, appId) {
  Logger.debug(`Get information for the app: ${appId}`);
  return application.get({ id: ownerId, appId }).then(sendToApi);
};

function getFromSelf (appId) {
  Logger.debug(`Get information for the app: ${appId}`);
  // /self differs from /organisations only for this one:
  // it fallbacks to the organisations of which the user
  // is a member, if it doesn't belong to Personal Space.
  return application.get({ appId }).then(sendToApi);
};

/**
 * @param {{app_id: string}|{app_name: string}} appIdOrName
 * @param {{orga_id: string}|{orga_name: string}} orgaIdOrName
 * @return {Promise<{appId: string, ownerId: string}>}
 */
async function resolveId (appIdOrName, orgaIdOrName) {
  // -- resolve by linked app

  // if no app is provided, the only choice we have is trying to use the default linked app.
  if (appIdOrName == null) {
    const appDetails = await AppConfig.getAppDetails({});
    return { appId: appDetails.appId, ownerId: appDetails.ownerId };
  }

  // -- resolve by app id

  if (appIdOrName.app_id != null) {
    if (orgaIdOrName == null) {
      const ownerId = await resolveOwnerId(appIdOrName.app_id);
      if (ownerId != null) {
        return {
          appId: appIdOrName.app_id,
          ownerId,
        };
      }

      throw new Error('Application not found');
    }

    const orgId = await Organisation.getId(orgaIdOrName);
    if (orgId != null) {
      return {
        appId: appIdOrName.app_id,
        ownerId: orgId,
      };
    }

    throw new Error('Application not found');
  }

  // -- resolve by app alias

  // todo: this is a first implementation attempt
  // question: is it a good idea to make resolution by alias a priority before resolution by name?
  // maybe, there can be ambiguity between alias and app name:
  // for instance: a linked app with alias "my_beloved_app", and another (non-linked) existing app with name "my_beloved_app"
  // what should we do in that case?

  const config = await loadApplicationConf();
  const appByAlias = config.apps.find((a) => a.alias === appIdOrName.app_name);
  if (appByAlias != null) {

    // this implementation respects the assessment: if user provides an org, he knows what he is doing and we should respect its choice.
    // todo: should we ignore the org option instead?

    if (orgaIdOrName == null) {
      return {
        appId: appByAlias.app_id,
        ownerId: appByAlias.org_id,
      };
    }

    const orgId = await Organisation.getId(orgaIdOrName);
    return {
      appId: appByAlias.app_id,
      ownerId: orgId,
    };
  }

  // -- resolve by app name

  if (orgaIdOrName == null) {
    const currentUserId = await User.getCurrentId();

    let app = null;

    async function check (ownerId) {
      const apps = (await application.getAll({ id: ownerId }).then(sendToApi))
        .filter((app) => app.name === appIdOrName.app_name);
      if (apps.length > 1) {
        throw new Error('Ambiguous application name');
      }
      if (apps.length === 1) {
        if (app != null) {
          throw new Error('Ambiguous application name');
        }
        app = { appId: apps[0].id, ownerId };
      }
    }

    await check(currentUserId);
    const organisations = await Organisation.getAll();
    for (const organisation of organisations) {
      await check(organisation.id);
    }

    if (app != null) {
      return app;
    }

    throw new Error('Application not found');
  }

  const orgId = await Organisation.getId(orgaIdOrName);
  const app = await getByName(orgId, appIdOrName.app_name);
  return {
    appId: app.id,
    ownerId: app.ownerId,
  };
}

async function linkRepo (app, orgaIdOrName, alias, ignoreParentConfig) {
  Logger.debug(`Linking current repository to the app: ${app.app_id || app.app_name}`);

  const ownerId = (orgaIdOrName != null)
    ? await Organisation.getId(orgaIdOrName)
    : await User.getCurrentId();

  const appData = (app.app_id != null)
    ? await getFromSelf(app.app_id)
    : await getByName(ownerId, app.app_name);

  return AppConfiguration.addLinkedApplication(appData, alias, ignoreParentConfig);
};

function unlinkRepo (alias) {
  Logger.debug(`Unlinking current repository from the app: ${alias}`);
  return AppConfiguration.removeLinkedApplication({ alias });
};

function redeploy (ownerId, appId, commit, withoutCache) {
  Logger.debug(`Redeploying the app: ${appId}`);
  const useCache = (withoutCache) ? 'no' : null;
  return application.redeploy({ id: ownerId, appId, commit, useCache }).then(sendToApi);
};

function mergeScalabilityParameters (scalabilityParameters, instance) {
  const flavors = listAvailableFlavors();

  if (scalabilityParameters.minFlavor) {
    instance.minFlavor = scalabilityParameters.minFlavor;
    if (flavors.indexOf(instance.minFlavor) > flavors.indexOf(instance.maxFlavor)) {
      instance.maxFlavor = instance.minFlavor;
    }
  }
  if (scalabilityParameters.maxFlavor) {
    instance.maxFlavor = scalabilityParameters.maxFlavor;
    if (flavors.indexOf(instance.minFlavor) > flavors.indexOf(instance.maxFlavor)
      && scalabilityParameters.minFlavor == null) {
      instance.minFlavor = instance.maxFlavor;
    }
  }

  if (scalabilityParameters.minInstances) {
    instance.minInstances = scalabilityParameters.minInstances;
    if (instance.minInstances > instance.maxInstances) {
      instance.maxInstances = instance.minInstances;
    }
  }
  if (scalabilityParameters.maxInstances) {
    instance.maxInstances = scalabilityParameters.maxInstances;
    if (instance.minInstances > instance.maxInstances && scalabilityParameters.minInstances == null) {
      instance.minInstances = instance.maxInstances;
    }
  }
  return instance;
};

async function setScalability (appId, ownerId, scalabilityParameters, buildFlavor) {
  Logger.info('Scaling the app: ' + appId);

  const app = await application.get({ id: ownerId, appId }).then(sendToApi);
  const instance = _.cloneDeep(app.instance);

  instance.minFlavor = instance.minFlavor.name;
  instance.maxFlavor = instance.maxFlavor.name;

  const newConfig = mergeScalabilityParameters(scalabilityParameters, instance);

  if (buildFlavor != null) {
    newConfig.separateBuild = (buildFlavor !== 'disabled');
    if (buildFlavor !== 'disabled') {
      newConfig.buildFlavor = buildFlavor;
    }
    else {
      Logger.info('No build size given, disabling dedicated build instance');
    }
  }

  return application.update({ id: ownerId, appId }, newConfig).then(sendToApi);
};

async function listDependencies (ownerId, appId, showAll) {
  const applicationDeps = await application.getAllDependencies({ id: ownerId, appId }).then(sendToApi);

  if (!showAll) {
    return applicationDeps;
  }

  const allApps = await application.getAll({ id: ownerId }).then(sendToApi);

  const applicationDepsIds = applicationDeps.map((app) => app.id);
  return allApps.map((app) => {
    const isLinked = applicationDepsIds.includes(app.id);
    return { ...app, isLinked };
  });
}

async function link (ownerId, appId, dependency) {
  const dependencyId = await getId(ownerId, dependency);
  return application.addDependency({ id: ownerId, appId, dependencyId }).then(sendToApi);
};

async function unlink (ownerId, appId, dependency) {
  const dependencyId = await getId(ownerId, dependency);
  return application.removeDependency({ id: ownerId, appId, dependencyId }).then(sendToApi);
};

module.exports.resolveId = resolveId;
module.exports.create = create;
module.exports.deleteApp = deleteApp;
module.exports.get = get;
module.exports.link = link;
module.exports.linkRepo = linkRepo;
module.exports.listAvailableAliases = listAvailableAliases;
module.exports.listAvailableFlavors = listAvailableFlavors;
module.exports.listAvailableTypes = listAvailableTypes;
module.exports.AVAILABLE_ZONES = AVAILABLE_ZONES;
module.exports.listAvailableZones = listAvailableZones;
module.exports.listDependencies = listDependencies;
module.exports.__mergeScalabilityParameters = mergeScalabilityParameters;
module.exports.redeploy = redeploy;
module.exports.setScalability = setScalability;
module.exports.unlink = unlink;
module.exports.unlinkRepo = unlinkRepo;
