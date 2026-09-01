import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.cwd(), 'dist');
const commit = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'local';
const branch = process.env.CF_PAGES_BRANCH ?? process.env.GITHUB_REF_NAME ?? 'local';

await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, 'build-info.json'), `${JSON.stringify({ commit, branch, builtAt: new Date().toISOString() }, null, 2)}\n`);
console.log(`배포 식별 정보 생성: ${commit.slice(0, 12)}`);
