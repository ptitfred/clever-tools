import cfg from './config';
import fs from 'fs-extra';
import { cloneGitProject, applyTemplates, commitAndPush } from './utils';

async function run () {

  const templatesPath = './templates/brew';
  const gitPath = './git-brew';
  const { git, appInfos } = cfg;
  const isStableVersion = cfg.isStableVersion();
  const gitProject = isStableVersion ? 'homebrew-tap' : 'homebrew-tap-beta';
  const gitUrl = `ssh://git@github.com/CleverCloud/${gitProject}.git`;
  const version = cfg.getVersion();
  const archivePath = cfg.getArchiveFilepath('macos', version);
  const sha256 = await fs.readFile(`${archivePath}.sha256`, 'utf-8');

  await cloneGitProject({ gitUrl, gitPath, git });
  await applyTemplates(gitPath, templatesPath, {
    gitProject,
    version,
    sha256,
    ...appInfos,
  });
  await commitAndPush({ gitPath, version });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
