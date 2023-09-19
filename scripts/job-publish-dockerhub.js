import * as cfg from './config.js';
import { cloneGitProject, applyTemplates, tagAndPush, commitAndPush } from './utils.js';

async function run () {

  const templateFilepath = './templates/dockerhub';
  const gitPath = './git-dockerhub';
  const { git, appInfos } = cfg;
  const gitUrl = 'ssh://git@github.com/CleverCloud/clever-tools-dockerhub.git';
  const version = cfg.getVersion();

  await cloneGitProject({ gitUrl, gitPath, git });
  await applyTemplates(gitPath, templateFilepath, {
    version,
    ...appInfos,
  });
  await commitAndPush({ gitPath, version });
  await tagAndPush({ gitPath, tagName: version });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
