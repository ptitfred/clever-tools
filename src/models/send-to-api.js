import Logger from '../logger.js';
import { addOauthHeader } from '@clevercloud/client/cjs/oauth.node.js';
import { conf, loadOAuthConf } from '../models/configuration.js';
import { execWarpscript } from '@clevercloud/client/cjs/request-warp10.superagent.js';
import { prefixUrl } from '@clevercloud/client/cjs/prefix-url.js';
import { request } from '@clevercloud/client/cjs/request.superagent.js';

async function loadTokens () {
  const tokens = await loadOAuthConf();
  return {
    OAUTH_CONSUMER_KEY: conf.OAUTH_CONSUMER_KEY,
    OAUTH_CONSUMER_SECRET: conf.OAUTH_CONSUMER_SECRET,
    API_OAUTH_TOKEN: tokens.token,
    API_OAUTH_TOKEN_SECRET: tokens.secret,
  };
}

export async function sendToApi (requestParams) {
  const tokens = await loadTokens();
  return Promise.resolve(requestParams)
    .then(prefixUrl(conf.API_HOST))
    .then(addOauthHeader(tokens))
    .then((requestParams) => {
      if (process.env.CLEVER_VERBOSE) {
        Logger.debug(`${requestParams.method.toUpperCase()} ${requestParams.url} ? ${JSON.stringify(requestParams.queryParams)}`);
      }
      return requestParams;
    })
    .then((requestParams) => request(requestParams, { retry: 1 }));
}

export function sendToWarp10 (requestParams) {
  return Promise.resolve(requestParams)
    .then(prefixUrl(conf.WARP_10_EXEC_URL))
    .then((requestParams) => execWarpscript(requestParams, { retry: 1 }));
}

export async function getHostAndTokens () {
  const tokens = await loadTokens();
  return {
    apiHost: conf.API_HOST,
    tokens,
  };
}
