import os from 'os';

import { releaseInfo as getLinuxInfos } from 'linux-release-info';
import colors from 'colors/safe';

import Logger from '../logger.js';
import pkg from '../../package.json';
import User from '../models/user.js';
import { conf, loadOAuthConf } from '../models/configuration.js';

export async function diag () {

  const userId = await User.getCurrentId().catch(() => null);
  const authDetails = await loadOAuthConf();

  Logger.println('clever-tools  ' + colors.green(pkg.version));
  Logger.println('Node.js       ' + colors.green(process.version));

  Logger.println('Platform      ' + colors.green(os.platform()));
  Logger.println('Release       ' + colors.green(os.release()));
  Logger.println('Architecture  ' + colors.green(process.arch));

  // Linux specific
  const linuxInfos = await getLinuxInfos().then(({ pretty_name, name, id }) => pretty_name || name || id).catch(() => null);
  if (linuxInfos != null) {
    Logger.println('Linux         ' + colors.green(linuxInfos));
  }

  Logger.println('Shell         ' + colors.green(process.env.SHELL));

  const isPackaged = (process.pkg != null);
  Logger.println('Packaged      ' + colors.green(isPackaged));
  Logger.println('Exec path     ' + colors.green(process.execPath));
  Logger.println('Config file   ' + colors.green(conf.CONFIGURATION_FILE));
  Logger.println('Auth source   ' + colors.green(authDetails.source));

  const oauthToken = (authDetails.token != null)
    ? colors.green(authDetails.token)
    : colors.red('(none)');
  Logger.println('oAuth token   ' + oauthToken);

  if (authDetails.token != null) {
    if (userId != null) {
      Logger.println('User ID       ' + colors.green(userId));
    }
    else {
      Logger.println('User ID       ' + colors.red('Authentication failed'));
    }
  }
  else {
    Logger.println('User ID       ' + colors.red('Not connected'));
  }
}
