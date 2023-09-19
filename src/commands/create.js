import Application from '../models/application.js';
import AppConfig from '../models/app_configuration.js';
import Logger from '../logger.js';

export async function create (params) {
  const { type: typeName } = params.options;
  const [name] = params.args;
  const { org: orgaIdOrName, alias, region, github: githubOwnerRepo } = params.options;
  const github = getGithubDetails(githubOwnerRepo);

  const app = await Application.create(name, typeName, region, orgaIdOrName, github);
  await AppConfig.addLinkedApplication(app, alias);

  Logger.println('Your application has been successfully created!');
};

function getGithubDetails (githubOwnerRepo) {
  if (githubOwnerRepo != null) {
    const [owner, name] = githubOwnerRepo.split('/');
    return { owner, name };
  }
}
