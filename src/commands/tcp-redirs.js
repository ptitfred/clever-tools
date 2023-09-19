import colors from 'colors/safe';

import AppConfig from '../models/app_configuration.js';
import Organisation from '../models/organisation.js';
import { sendToApi } from '../models/send-to-api.js';
import Interact from '../models/interact.js';
import Logger from '../logger.js';
import application from '@clevercloud/client/cjs/api/v2/application.js';

export async function listNamespaces (params) {
  const namespaces = await Organisation.getNamespaces(params);

  Logger.println('Available namespaces: ' + namespaces.map(({ namespace }) => namespace).join(', '));
};

export async function list (params) {
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const redirs = await application.getTcpRedirs({ id: ownerId, appId }).then(sendToApi);

  if (redirs.length === 0) {
    Logger.println('No active TCP redirection for this application');
  }
  else {
    Logger.println('Enabled TCP redirections:');
    for (const { namespace, port } of redirs) {
      Logger.println(port + ' on ' + namespace);
    }
  }
}

async function acceptPayment (result, skipConfirmation) {
  if (!skipConfirmation) {
    result.lines.forEach(({ description, VAT, price }) => Logger.println(`${description}\tVAT: ${VAT}%\tPrice: ${price}€`));
    Logger.println(`Total (without taxes): ${result.totalHT}€`);
    Logger.println(colors.bold(`Total (with taxes): ${result.totalTTC}€`));

    await Interact.confirm(
      `You're about to pay ${result.totalTTC}€, confirm? (yes or no) `,
      'No confirmation, aborting TCP redirection creation',
    );
  }
}

export async function add (params) {
  const { alias, namespace, yes: skipConfirmation } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const { port } = await application.addTcpRedir({ id: ownerId, appId }, { namespace }).then(sendToApi).catch((error) => {
    if (error.status === 402) {
      return acceptPayment(error.response.body, skipConfirmation).then(() => {
        return application.addTcpRedir({ id: ownerId, appId, payment: 'accepted' }, { namespace }).then(sendToApi);
      });
    }
    else {
      throw error;
    }
  });

  Logger.println('Successfully added tcp redirection on port: ' + port);
};

export async function remove (params) {
  const [port] = params.args;
  const { alias, namespace } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await application.removeTcpRedir({ id: ownerId, appId, sourcePort: port, namespace }).then(sendToApi);

  Logger.println('Successfully removed tcp redirection.');
};
