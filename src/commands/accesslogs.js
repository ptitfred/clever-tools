'use strict';

const { getAccessLogsFromWarp10InBatches, getContinuousAccessLogsFromWarp10 } = require('@clevercloud/client/cjs/access-logs.js');
const { getWarp10AccessLogsToken } = require('@clevercloud/client/cjs/api/v2/warp-10.js');
const { ONE_HOUR_MICROS, ONE_SECOND_MICROS, toMicroTimestamp } = require('@clevercloud/client/cjs/utils/date.js');

const Addon = require('../models/addon.js');
const Application = require('../models/application.js');
const Logger = require('../logger.js');
const { getFormatter } = require('../models/accesslogs.js');
const { sendToApi, sendToWarp10 } = require('../models/send-to-api.js');

const CONTINUOUS_DELAY = ONE_SECOND_MICROS * 5;

async function accessLogs (params) {
  const { alias, app: appIdOrName, org: orgIdOrName, format, before, after, addon: addonId, follow } = params.options;

  const { ownerId, appId, realAddonId } = await getIds(addonId, appIdOrName, orgIdOrName, alias);
  const to = (before != null) ? toMicroTimestamp(before.toISOString()) : toMicroTimestamp();
  const from = (after != null) ? toMicroTimestamp(after.toISOString()) : to - ONE_HOUR_MICROS;
  const warpToken = await getWarp10AccessLogsToken({ orgaId: ownerId }).then(sendToApi);

  if (follow && (before != null || after != null)) {
    Logger.warn('Access logs are displayed continuously with -f/--follow therefore --before and --after are ignored.');
  }

  const emitter = follow
    ? getContinuousAccessLogsFromWarp10({ appId, realAddonId, warpToken, delay: CONTINUOUS_DELAY }, sendToWarp10)
    : getAccessLogsFromWarp10InBatches({ appId, realAddonId, from, to, warpToken }, sendToWarp10);

  const formatLogLine = getFormatter(format, addonId != null);

  emitter.on('data', (data) => {
    data.forEach((l) => Logger.println(formatLogLine(l)));
  });

  return new Promise((resolve, reject) => {
    emitter.on('error', reject);
  });
}

async function getIds (addonId, appIdOrName, orgIdOrName, alias) {
  if (addonId != null) {
    const addon = await Addon.findById(addonId);
    return {
      ownerId: addon.orgaId,
      realAddonId: addon.realId,
    };
  }
  return await Application.resolveId(appIdOrName, orgIdOrName, alias);
}

module.exports = { accessLogs };
