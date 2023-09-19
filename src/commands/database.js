import { sendToApi } from '../models/send-to-api.js';
import { getBackups } from '@clevercloud/client/cjs/api/v2/backups.js';
import Logger from '../logger.js';
import superagent from 'superagent';
import fs from 'fs';
import { findOwnerId } from '../models/addon.js';
import { resolveRealId } from '../models/ids-resolver.js';
import format_table from '../format-table.js';

const formatTable = format_table();

export async function listBackups (params) {

  const { org } = params.options;
  const [addonIdOrRealId] = params.args;

  const addonId = await resolveRealId(addonIdOrRealId);
  const ownerId = await findOwnerId(org, addonId);

  const backups = await getBackups({ ownerId, ref: addonId }).then(sendToApi);

  if (backups.length === 0) {
    Logger.println('There are no backups yet');
    return;
  }

  const formattedLines = backups
    .sort((a, b) => a.creation_date.localeCompare(b.creation_date))
    .map((backup) => [
      backup.backup_id,
      backup.creation_date,
      backup.status,
    ]);

  const head = [
    'BACKUP ID',
    'CREATION DATE',
    'STATUS',
  ];

  Logger.println(formatTable([
    head,
    ...formattedLines,
  ]));
}

export async function downloadBackups (params) {

  const { org, output } = params.options;
  const [addonIdOrRealId, backupId] = params.args;

  const addonId = await resolveRealId(addonIdOrRealId);
  const ownerId = await findOwnerId(org, addonId);

  const backups = await getBackups({ ownerId, ref: addonId }).then(sendToApi);
  const backup = backups.find((backup) => backup.backup_id === backupId);

  if (backup == null) {
    throw new Error('no backup with this ID');
  }

  const res = await superagent
    .get(backup.download_url)
    .responseType('blob');

  if (output) {
    fs.writeFileSync(output, res.body);
    return;
  }

  process.stdout.write(res.body);
}
