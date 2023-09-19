import application from '@clevercloud/client/cjs/api/v2/application.js';

import AppConfig from '../models/app_configuration.js';
import Application from '../models/application.js';
import ApplicationConfiguration from '../models/application_configuration.js';

import { sendToApi } from '../models/send-to-api.js';

export async function get (params) {
  const [configurationName] = params.args;
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });
  const app = await Application.get(ownerId, appId);

  if (configurationName == null) {
    ApplicationConfiguration.print(app);
  }
  else {
    ApplicationConfiguration.printById(app, configurationName);
  }
}

export async function set (params) {
  const [configurationName, configurationValue] = params.args;
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });
  const config = ApplicationConfiguration.getById(configurationName);

  if (config != null) {
    const app = await application.update({ id: ownerId, appId }, { [config.name]: ApplicationConfiguration.parse(config, configurationValue) }).then(sendToApi);

    ApplicationConfiguration.printById(app, configurationName);
  }
}

export async function update (params) {
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });
  const options = ApplicationConfiguration.parseOptions(params.options);

  if (Object.keys(options).length === 0) {
    throw new Error('No configuration to update');
  }

  const app = await application.update({ id: ownerId, appId }, options).then(sendToApi);

  for (const configName of Object.keys(options)) {
    ApplicationConfiguration.printByName(app, configName);
  }
}
