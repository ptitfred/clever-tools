import colors from 'colors/safe';

import Logger from '../logger.js';
import User from '../models/user.js';

export async function profile () {
  const { id, name, email, preferredMFA } = await User.getCurrent();
  const has2FA = (preferredMFA != null && preferredMFA !== 'NONE') ? 'yes' : 'no';
  const formattedName = name || colors.red.bold('[not specified]');
  Logger.println('You\'re currently logged in as:');
  Logger.println('User id          ' + id);
  Logger.println('Name             ' + formattedName);
  Logger.println('Email            ' + email);
  Logger.println('Two factor auth  ' + has2FA);
};
