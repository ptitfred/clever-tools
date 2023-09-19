import formatNgTable from '../format-table.js';
import colors from 'colors/safe.js';

import * as AppConfig from './app_configuration.js';
import Logger from '../logger.js';
import Formatter from './format-string.js';

function printSeparator (columnLengths) {
  Logger.println('─'.repeat(columnLengths.reduce((a, b) => a + b + 2)));
}

// We use examples of maximum width text to have a clean display
const networkGroupsTableColumnLengths = [
  39, /* id length */
  48, /* label length */
  7, /* members length */
  5, /* peers length */
  48, /* description */
];
const formatNetworkGroupsTable = formatNgTable(networkGroupsTableColumnLengths);
export function formatNetworkGroupsLine (ng) {
  return formatNetworkGroupsTable([
    [
      Formatter.formatId(ng.id),
      Formatter.formatString(ng.label, false),
      Formatter.formatNumber(ng.members.length),
      Formatter.formatNumber(ng.peers.length),
      Formatter.formatString(ng.description || ' ', false),
    ],
  ]);
};
export function printNetworkGroupsTableHeader () {
  Logger.println(colors.bold(formatNetworkGroupsTable([
    ['Network Group ID', 'Label', 'Members', 'Peers', 'Description'],
  ])));
  printSeparator(networkGroupsTableColumnLengths);
}

const membersTableColumnLengths = [
  48, /* id length */
  12, /* type length */
  48, /* label length */
  110, /* domain-name length */
];
const formatMembersTable = formatNgTable(membersTableColumnLengths);
export async function formatMembersLine (member, showAliases = false) {
  return formatMembersTable([
    [
      showAliases
        ? Formatter.formatString(await AppConfig.getMostNaturalName(member.id), false)
        : Formatter.formatId(member.id),
      Formatter.formatString(member.type, false),
      Formatter.formatString(member.label, false),
      Formatter.formatString(member.domain_name || ' ', false),
    ],
  ]);
};
export async function printMembersTableHeader (naturalName = false) {
  Logger.println(colors.bold(formatMembersTable([
    [
      naturalName ? 'Member' : 'Member ID',
      'Member Type',
      'Label',
      'Domain Name',
    ],
  ])));
  printSeparator(membersTableColumnLengths);
}

const peersTableColumnLengths = [
  45, /* id length */
  15, /* ip */
  36, /* hostname */
  12, /* type length */
  14, /* endpoint type length */
  36, /* label length */
];
const formatPeersTable = formatNgTable(peersTableColumnLengths);
export function formatPeersLine(peer) {
  const ip = (peer.endpoint.type === 'ServerEndpoint') ? peer.endpoint.ng_term.host : peer.endpoint.ng_ip;
  return formatPeersTable([
    [
      Formatter.formatId(peer.id),
      Formatter.formatIp(ip),
      Formatter.formatString(peer.hostname, false),
      Formatter.formatString(peer.type, false),
      Formatter.formatString(peer.endpoint.type, false),
      Formatter.formatString(peer.label, false),
    ],
  ]);
};
export function printPeersTableHeader () {
  Logger.println(colors.bold(formatPeersTable([
    [
      'Peer ID',
      'IP Address',
      'Hostname',
      'Peer Type',
      'Endpoint Type',
      'Label',
    ],
  ])));
  printSeparator(peersTableColumnLengths);
}
