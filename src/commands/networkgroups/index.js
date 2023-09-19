import ngApi from '@clevercloud/client/cjs/api/v4/network-group.js';

import { sendToApi } from '../../models/send-to-api.js';

import Logger from '../../logger.js';
import NetworkGroup from '../../models/networkgroup.js';
import Formatter from '../../models/format-string.js';
import TableFormatter from '../../models/format-ng-table.js';

export async function listNetworkGroups (params) {
  const { org: orgaIdOrName, alias, json } = params.options;
  const ownerId = await NetworkGroup.getOwnerId(orgaIdOrName, alias);

  Logger.info(`Listing Network Groups from owner ${Formatter.formatString(ownerId)}`);
  const result = await ngApi.listNetworkGroups({ ownerId }).then(sendToApi);

  if (json) {
    Logger.println(JSON.stringify(result, null, 2));
  }
  else {
    if (result.length === 0) {
      Logger.println(`No Network Group found for ${ownerId}. You can create one with ${Formatter.formatCommand('clever networkgroups create')}.`);
    }
    else {
      TableFormatter.printNetworkGroupsTableHeader();
      result
        .map((ng) => TableFormatter.formatNetworkGroupsLine(ng))
        .forEach((ng) => Logger.println(ng));
    }
  }
}

export async function createNg (params) {
  const { org: orgaIdOrName, alias, label, description, tags, json } = params.options;
  const ownerId = await NetworkGroup.getOwnerId(orgaIdOrName, alias);

  Logger.info(`Creating Network Group from owner ${Formatter.formatString(ownerId)}`);
  const body = { ownerId: ownerId, label, description, tags };
  Logger.debug('Sending body: ' + JSON.stringify(body, null, 2));
  const result = await ngApi.createNetworkGroup({ ownerId }, body).then(sendToApi);

  if (json) {
    Logger.println(JSON.stringify(result, null, 2));
  }
  else {
    Logger.println(`Network Group ${Formatter.formatString(label)} creation will be performed asynchronously.`);
  }
}

export async function deleteNg (params) {
  const { org: orgaIdOrName, alias, ng: networkGroupIdOrLabel } = params.options;
  const ownerId = await NetworkGroup.getOwnerId(orgaIdOrName, alias);
  const networkGroupId = await NetworkGroup.getId(ownerId, networkGroupIdOrLabel);

  Logger.info(`Deleting Network Group ${Formatter.formatString(networkGroupId)} from owner ${Formatter.formatString(ownerId)}`);
  await ngApi.deleteNetworkGroup({ ownerId, networkGroupId }).then(sendToApi);

  Logger.println(`Network Group ${Formatter.formatString(networkGroupId)} deletion will be performed asynchronously.`);
}
