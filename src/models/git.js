import fs from 'fs';
import path from 'path';

import _ from 'lodash';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node/index.cjs';
import cliparse from 'cliparse';

import slugify from 'slugify';
import { findPath } from './fs-utils.js';
import { loadOAuthConf } from './configuration.js';

async function getRepo () {
  try {
    const dir = await findPath('.', '.git');
    return { fs, dir, http };
  }
  catch (e) {
    throw new Error('Could not find the .git folder.');
  }
}

async function onAuth () {
  const tokens = await loadOAuthConf();
  return {
    username: tokens.token,
    password: tokens.secret,
  };
}

export async function addRemote (remoteName, url) {
  const repo = await getRepo();
  const safeRemoteName = slugify(remoteName);
  const allRemotes = await git.listRemotes({ ...repo });
  const existingRemote = _.find(allRemotes, { remote: safeRemoteName });
  if (existingRemote == null) {
    // In some situations, we may end up with race conditions so we force it
    return git.addRemote({ ...repo, remote: safeRemoteName, url, force: true });
  }
}

export async function resolveFullCommitId (commitId) {
  if (commitId == null) {
    return null;
  }
  try {
    const repo = await getRepo();
    return await git.expandOid({ ...repo, oid: commitId });
  }
  catch (e) {
    if (e.code === 'ShortOidNotFound') {
      throw new Error(`Commit id ${commitId} is ambiguous`);
    }
    throw e;
  }
}

export async function getRemoteCommit (remoteUrl) {
  const repo = await getRepo();
  const remoteInfos = await git.getRemoteInfo({
    ...repo,
    onAuth,
    url: remoteUrl,
  });
  return _.get(remoteInfos, 'refs.heads.master');
}

export async function getFullBranch (branchName) {
  const repo = await getRepo();
  if (branchName === '') {
    const currentBranch = await git.currentBranch({ ...repo, fullname: true });
    return currentBranch || 'HEAD';
  }
  return git.expandRef({ ...repo, ref: branchName });
};

export async function getBranchCommit (refspec) {
  const repo = await getRepo();
  return git.resolveRef({ ...repo, ref: refspec });
}

export async function push (remoteUrl, branchRefspec, force) {
  const repo = await getRepo();
  try {
    const push = await git.push({
      ...repo,
      onAuth,
      url: remoteUrl,
      ref: branchRefspec,
      remoteRef: 'master',
      force,
    });
    if (push.errors != null) {
      throw new Error(push.errors.join(', '));
    }
    return push;
  }
  catch (e) {
    if (e.code === 'PushRejectedNonFastForward') {
      throw new Error('Push rejected because it was not a simple fast-forward. Use "--force" to override.');
    }
    throw e;
  }
}

export function completeBranches () {
  return getRepo()
    .then((repo) => git.listBranches(repo))
    .then(cliparse.autocomplete.words);
}

export async function isShallow () {
  const { dir } = await getRepo();
  try {
    await fs.promises.access(path.join(dir, '.git', 'shallow'));
    return true;
  }
  catch (e) {
    return false;
  }
}
