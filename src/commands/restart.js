import colors from 'colors/safe';

import AppConfig from '../models/app_configuration.js';
import Application from '../models/application.js';
import git from '../models/git.js';
import Log from '../models/log.js';
import Logger from '../logger.js';

// Once the API call to redeploy() has been triggerred successfully,
// the rest (waiting for deployment state to evolve and displaying logs) is done with auto retry (resilient to network pb)
export async function restart (params) {
  const { alias, quiet, commit, 'without-cache': withoutCache, follow } = params.options;

  const { ownerId, appId, name: appName } = await AppConfig.getAppDetails({ alias });
  const fullCommitId = await git.resolveFullCommitId(commit);
  const app = await Application.get(ownerId, appId);
  const remoteCommitId = app.commitId;

  const commitId = fullCommitId || remoteCommitId;
  if (commitId != null) {
    const cacheSuffix = withoutCache ? ' without using cache' : '';
    Logger.println(`Restarting ${appName} on commit ${colors.green(commitId)}${cacheSuffix}`);
  }

  const redeploy = await Application.redeploy(ownerId, appId, fullCommitId, withoutCache);

  return Log.watchDeploymentAndDisplayLogs({ ownerId, appId, deploymentId: redeploy.deploymentId, quiet, follow });
}
