'use strict';

const Addon = require('../models/addon.js');
const AppConfig = require('../models/app_configuration.js');
const Logger = require('../logger.js');
const { getHostAndTokens } = require('../models/send-to-api.js');

// 2000 logs per 100ms maximum
const THROTTLE_ELEMENTS = 2000;
const THROTTLE_PER_IN_MILLISECONDS = 100;

async function accessLogs (params) {
  const { ApplicationAccessLogStream } = await import('./access-logs.mjs');
  const { apiHost, tokens } = await getHostAndTokens();
  const { alias, format, before, after, addon: addonId } = params.options;
  const { ownerId, appId, realAddonId } = await getIds(addonId, alias);

  const stream = new ApplicationAccessLogStream({
    apiHost,
    tokens,
    ownerId,
    appId,
    before,
    after,
    throttleElements: THROTTLE_ELEMENTS,
    throttlePerInMilliseconds: THROTTLE_PER_IN_MILLISECONDS,
  });

  if (format === 'json' && (!before)) {
    throw new Error('JSON format only works with a limiting parameter such as `before`.');
  }

  // used for 'json' format
  const acc = accumulator();

  stream
    .onLog((log) => {
      switch (format) {
        case 'json':
          acc.push(JSON.stringify(log));
          break;
        case 'json-stream':
          Logger.println(JSON.stringify(log));
          break;
        case 'human':
        default:
          Logger.println(formatHuman(log));
          break;
      }
    })
    .on('open', (event) => {
      Logger.debug(`stream opened! ${JSON.stringify({ appId })}`);
    })
    .on('error', (event) => {
      Logger.error(event, event.error);
    });

  // Properly close the stream
  process.once('SIGINT', (signal) => stream.close(signal));

  const closeReason = await stream.start();

  format === 'json' && acc.print();

  Logger.debug(`stream closed: ${closeReason}`);
}

function formatHuman(log) {
  const { date, http, requestId, source, bytesIn, bytesOut } = log;
  const hasSourceCity = source.city != null && source.city !== '';

  return `${date.toISOString(date)}\t${source.ip}\t${http.request.method}\t${http.request.path}\trequestId=${requestId}\tbytesIn=${bytesIn}\tbytesOut=${bytesOut}\tlocation=${source.countryCode}${hasSourceCity ? '/' + source.city : ''}`
}

function accumulator () {
  return {
    items: [],
    push: (log) => this.items.push(log),
    print: () => {
      console.log('[\n');
      this.items.join(', \n');
      console.log('\n]');
    },
  };
}

async function getIds (addonId, alias) {
  if (addonId != null) {
    const addon = await Addon.findById(addonId);
    return {
      ownerId: addon.orgaId,
      realAddonId: addon.realId,
    };
  }
  return AppConfig.getAppDetails({ alias });
}

module.exports = { accessLogs };
