import * as cfg from './config.js';
import del from 'del';
import fs from 'fs-extra';
import { startTask, endTask } from './utils.js';
import pkg from 'pkg';

async function run () {

  const { archList, nodeVersion, releasesDir } = cfg;
  const version = cfg.getVersion();
  const isStableVersion = cfg.isStableVersion();

  del.sync(releasesDir);

  for (const arch of archList) {
    startTask(`Building pkg for ${arch}`);
    const filepath = cfg.getBinaryFilepath(arch, version);
    await pkg.exec(['.', '-t', `node${nodeVersion}-${arch}`, '-o', filepath]);
    if (isStableVersion) {
      const latestFilepath = cfg.getBinaryFilepath(arch, 'latest');
      await fs.copy(filepath, latestFilepath);
    }
    endTask(`Building pkg for ${arch}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
