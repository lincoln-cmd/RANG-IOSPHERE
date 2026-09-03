import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const fail = (message) => {
  console.error(`백업 중단: ${message}`);
  process.exit(1);
};

if (git('branch', '--show-current') !== 'main') fail('main 브랜치에서만 실행할 수 있습니다.');
if (git('status', '--porcelain')) fail('커밋되지 않은 변경 사항이 있습니다.');

const head = git('rev-parse', 'HEAD');
const originHead = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
if (!originHead || originHead !== head) fail('로컬 main과 GitHub main의 커밋이 다릅니다. 먼저 동기화하세요.');

const response = await fetch(`https://api.github.com/repos/lincoln-cmd/RANG-IOSPHERE/actions/runs?head_sha=${head}&per_page=20`, {
  headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RANG-IOSPHERE-backup-check' },
});
if (!response.ok) fail(`GitHub 검사 상태를 확인할 수 없습니다. HTTP ${response.status}`);

const { workflow_runs: runs } = await response.json();
for (const workflow of ['Quality checks', 'Deployment smoke test']) {
  const run = runs.find((candidate) => candidate.name === workflow);
  if (!run || run.status !== 'completed' || run.conclusion !== 'success') {
    fail(`${workflow}가 성공한 커밋만 백업할 수 있습니다.`);
  }
}

for (const remote of ['gitlab', 'bitbucket']) {
  console.log(`백업  ${remote}/backup-main`);
  execFileSync('git', ['push', remote, 'HEAD:backup-main'], { stdio: 'inherit' });
  const remoteHead = git('ls-remote', remote, 'refs/heads/backup-main').split(/\s+/)[0];
  if (remoteHead !== head) fail(`${remote} 백업 SHA가 일치하지 않습니다.`);
}

console.log(`백업 완료: ${head}`);
