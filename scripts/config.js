import os from 'os';
import pkgJson from '../package.json' assert { type: 'json'};
import semver from 'semver';

export const archList = ['linux', 'macos', 'win'];
export const nodeVersion = pkgJson['pkg-node-version'];
export const releasesDir = 'releases';
export const cellar = {
  host: 'cellar-c2.services.clever-cloud.com',
  bucket: 'clever-tools.clever-cloud.com',
};
export const git = {
  email: 'ci@clever-cloud.com',
  name: 'Clever Cloud CI',
};
export const appInfos = {
  name: pkgJson.name,
  vendor: 'Clever Cloud',
  url: pkgJson.homepage,
  description: pkgJson.description,
  license: pkgJson.license,
  maintainer: `${git.name} <${git.email}>`,
  keywords: pkgJson.keywords.join(' '),
};

export function getVersion (striclyFromTag = false) {
  const gitTag = process.env.GIT_TAG_NAME;
  if (!gitTag) {
    if (striclyFromTag) {
      throw new Error('Could not read version from git tag!');
    }
    return process.env.GIT_BRANCH.replace(/\//g, '-');
  }
  const gitTagVersion = gitTag.trim();
  if (gitTagVersion !== pkgJson.version) {
    throw new Error(`Mismatch between git tag ${gitTagVersion} and package.json version ${pkgJson.version}`);
  }
  return gitTagVersion;
}

export function getNupkgVersion (version) {
  return version.replace('beta.', 'beta');
}

export function isStableVersion () {
  try {
    const version = getVersion(true);
    return semver.prerelease(version) == null;
  }
  catch (e) {
    return false;
  }
}

function getBinaryFilename (arch) {
  return (arch === 'win') ? 'clever.exe' : 'clever';
}

export function getBinaryFilepath (arch, version) {
  const filename = getBinaryFilename(arch);
  return `${releasesDir}/${version}/${appInfos.name}-${version}_${arch}/${filename}`;
}

export function getArchiveFilepath (arch, version) {
  const archiveExt = (arch === 'win') ? '.zip' : '.tar.gz';
  return `${releasesDir}/${version}/${appInfos.name}-${version}_${arch}${archiveExt}`;
}

export function getBundleFilepath (type, version) {
  if (type === 'nupkg') {
    const nupkgVersion = getNupkgVersion(version);
    return `${releasesDir}/${version}/${appInfos.name}.${nupkgVersion}.${type}`;
  }
  return `${releasesDir}/${version}/${appInfos.name}-${version}.${type}`;
}

export function getNexusAuth () {
  const user = process.env.NEXUS_USER || 'ci';
  const password = process.env.NEXUS_PASSWORD;
  const nugetApiKey = process.env.NUGET_API_KEY;
  if (user == null || password == null) {
    throw new Error('Could not read Nexus credentials!');
  }
  if (nugetApiKey == null) {
    throw new Error('Could not read Nexus Nuget API key!');
  }
  return { user, password, nugetApiKey };
}

export function getNpmToken () {
  const token = process.env.NPM_TOKEN;
  if (!token) {
    throw new Error('Could not read NPM token!');
  }
  return token;
}

export function getGpgConf () {
  const gpgPrivateKey = process.env.RPM_GPG_PRIVATE_KEY;
  const gpgPath = process.env.RPM_GPG_PATH || os.homedir();
  const gpgName = process.env.RPM_GPG_NAME;
  const gpgPass = process.env.RPM_GPG_PASS;
  return { gpgPrivateKey, gpgPath, gpgName, gpgPass };
}
