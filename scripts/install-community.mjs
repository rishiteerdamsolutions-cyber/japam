import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const communityDir = path.join(root, 'community');
const communityLock = path.join(communityDir, 'package-lock.json');

if (!existsSync(path.join(communityDir, 'package.json'))) {
  process.exit(0);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Prefer reproducible installs when a lockfile exists.
const args = existsSync(communityLock)
  ? [
      'ci',
      '--include=dev',
      '--no-audit',
      '--no-fund',
      '--prefix',
      communityDir,
    ]
  : [
      'install',
      '--include=dev',
      '--no-audit',
      '--no-fund',
      '--prefix',
      communityDir,
    ];

const res = spawnSync(npmCmd, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    // Vercel often runs installs with production-oriented config; `community` still needs devDeps (tsc/vite).
    NODE_ENV: 'development',
    NPM_CONFIG_PRODUCTION: 'false',
  },
});

if (res.status !== 0) {
  process.exit(res.status ?? 1);
}
