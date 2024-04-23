'use strict';

const { Resolver } = require('dns/promises');
// const dns = require('dns/promises');
const colors = require('colors/safe');
const AppConfig = require('../models/app_configuration.js');
const Logger = require('../logger.js');
const {
  get: getApp,
  addDomain,
  getFavouriteDomain: getFavouriteDomainWithError,
  markFavouriteDomain,
  unmarkFavouriteDomain,
  removeDomain,
} = require('@clevercloud/client/cjs/api/v2/application.js');
const { sendToApi } = require('../models/send-to-api.js');
const { getSummary } = require('@clevercloud/client/cjs/api/v2/user.js');

const resolver = new Resolver();
resolver.setServers(['8.8.8.8']);

// const resolver = dns;

function getFavouriteDomain ({ ownerId, appId }) {
  return getFavouriteDomainWithError({ id: ownerId, appId })
    .then(sendToApi)
    .then(({ fqdn }) => fqdn)
    .catch((error) => {
      if (error.id === 4021) {
        // No favourite vhost
        return null;
      }
      throw error;
    });
}

async function list (params) {
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const app = await getApp({ id: ownerId, appId }).then(sendToApi);
  const favouriteDomain = await getFavouriteDomain({ ownerId, appId });
  return app.vhosts.forEach(({ fqdn }) => {
    const prefix = (fqdn === favouriteDomain)
      ? '* '
      : '  ';
    Logger.println(prefix + fqdn);
  });
}

async function add (params) {
  const [fqdn] = params.args;
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });
  const encodedFqdn = encodeURIComponent(fqdn);

  await addDomain({ id: ownerId, appId, domain: encodedFqdn }).then(sendToApi);
  Logger.println('Your domain has been successfully saved');
}

async function getFavourite (params) {
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const favouriteDomain = await getFavouriteDomain({ ownerId, appId });

  if (favouriteDomain == null) {
    return Logger.println('No favourite domain set');
  }

  return Logger.println(favouriteDomain);
}

async function setFavourite (params) {
  const [fqdn] = params.args;
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await markFavouriteDomain({ id: ownerId, appId }, { fqdn }).then(sendToApi);
  Logger.println('Your favourite domain has been successfully set');
}

async function unsetFavourite (params) {
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  await unmarkFavouriteDomain({ id: ownerId, appId }).then(sendToApi);
  Logger.println('Favourite domain has been successfully unset');
}

async function rm (params) {
  const [fqdn] = params.args;
  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });
  const encodedFqdn = encodeURIComponent(fqdn);

  await removeDomain({ id: ownerId, appId, domain: encodedFqdn }).then(sendToApi);
  Logger.println('Your domain has been successfully removed');
}

async function diagApplication (params) {

  // const records = await resolver.resolve('hsablonniere.com', 'A').catch((err) => {
  //   console.error(err);
  //   return [];
  // });
  //
  // console.log(records)
  //

  const { alias } = params.options;
  const { ownerId, appId } = await AppConfig.getAppDetails({ alias });

  const app = await getApp({ id: ownerId, appId }).then(sendToApi);
  const expectedDnsForPublicLoadBalancer = await getDefaultLoadBalancersDnsInfo({ id: ownerId, appId }).then(sendToApi);

  const domainMapping = app.vhosts.map((vh) => {
    const url = new URL('https://' + vh.fqdn);
    return { hostname: url.hostname, pathPrefix: url.pathname };
  });

  const { cname: expectedCname, a: expectedA } = expectedDnsForPublicLoadBalancer[0].dns;

  for (const { hostname, pathPrefix } of domainMapping) {

    console.log(colors.blue(hostname) + ' ' + colors.yellow(pathPrefix));

    const realARecords = await resolver.resolve(hostname, 'A').catch((err) => {
      // console.error(err);
      return [];
    });
    realARecords.length = 0;
    const realCnameRecords = await resolver.resolve(hostname, 'CNAME')
      .then((records) => records.map((cname) => cname + '.'))
      .catch((err) => {
        // console.error(err);
        return [];
      });

    // if cleverapps
    if (hostname.endsWith('cleverapps.io')) {
      console.log('  cleverapps.io domains are for test purposes and are automatically configured');
    }

    // if apex
    else if (hostname.split('.').length === 2) {
      for (const aRecord of realARecords) {
        if (expectedA.includes(aRecord)) {
          console.log('  A     ' + aRecord.padEnd(15, ' ') + colors.green(' OK'));
        }
        else {
          console.log('  A     ' + aRecord.padEnd(15, ' ') + colors.red(' please remove this record'));
        }
      }
      for (const aRecord of expectedA) {
        if (!realARecords.includes(aRecord)) {
          console.log('  A     ' + aRecord.padEnd(15, ' ') + colors.yellow(' please add this record'));
        }
      }
    }

    // if not apex
    else {

      for (const cnameRecord of realCnameRecords) {
        if (cnameRecord === expectedCname) {
          console.log('  CNAME ' + cnameRecord + colors.green(' OK'));
        }
        else {
          console.log('  CNAME ' + cnameRecord + colors.red(' please remove this record'));
        }
      }
      if (!realCnameRecords.includes(expectedCname)) {
        console.log('  CNAME ' + expectedCname + colors.yellow(' please add this record'));
      }

      // TODO test A records

      console.log(realARecords.length + ' A records');
    }
  }

}

async function diagAll (params) {

  const summary = await getSummary().then(sendToApi);
  const applications = [
    ...summary.user.applications.map((app) => [summary.user.id, app.id]),
    ...summary.organisations.flatMap((o) => o.applications.map((app) => [o.id, app.id])),
  ];

  for (const [ownerId, appId] of applications) {
    const app = await getApp({ id: ownerId, appId }).then(sendToApi);
    console.log(ownerId, appId);
    const domainMapping = app.vhosts.map((vh) => {
      const url = new URL('https://' + vh.fqdn);
      console.log('  ',url.hostname, url.pathname)
      // return { hostname: url.hostname, pathPrefix: url.pathname };
    });
  }

}

// TODO put in clever client
function getDefaultLoadBalancersDnsInfo (params) {
  return Promise.resolve({
    method: 'get',
    url: `/v4/load-balancers/organisations/${params.id}/applications/${params.appId}/load-balancers/default`,
    headers: {
      Accept: 'application/json',
    },
    // no query params
    // no body
  });
}

module.exports = { list, add, getFavourite, setFavourite, unsetFavourite, rm, diagApplication, diagAll };
