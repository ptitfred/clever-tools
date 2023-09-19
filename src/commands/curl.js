import { parseCurlCommand } from 'curlconverter/util.js';
import { spawn } from 'child_process';
import { loadOAuthConf, conf } from '../models/configuration.js';
import { addOauthHeader } from '@clevercloud/client/cjs/oauth.node.js';

async function loadTokens () {
  const tokens = await loadOAuthConf();
  return {
    OAUTH_CONSUMER_KEY: conf.OAUTH_CONSUMER_KEY,
    OAUTH_CONSUMER_SECRET: conf.OAUTH_CONSUMER_SECRET,
    API_OAUTH_TOKEN: tokens.token,
    API_OAUTH_TOKEN_SECRET: tokens.secret,
  };
}

export async function curl () {

  // We have to add single quotes on values for the parser
  const curlString = process.argv
    .slice(2)
    .map((str) => !str.startsWith('-') ? `'${str}'` : str)
    .join(' ');

  const curlDetails = parseCurlCommand(curlString);

  const tokens = await loadTokens();

  const requestParams = {
    method: curlDetails.method,
    url: curlDetails.urlWithoutQuery,
    headers: curlDetails.headers,
    queryParams: curlDetails.query,
  };

  const oauthHeader = await Promise.resolve(requestParams)
    .then(addOauthHeader(tokens))
    .then((request) => request.headers.Authorization);

  // Reuse raw curl command
  const curlParams = process.argv.slice(3);

  // Add oauth
  curlParams.push('-H', `Authorization: ${oauthHeader}`);

  spawn('curl', curlParams, { stdio: 'inherit' });

}
