import { spawnSync } from 'node:child_process';

const post = process.argv.slice(2).find((argument) => argument !== '--')?.trim();

if (!post) {
  console.error('사용법: pnpm prepublish:check -- <게시물 파일명>');
  console.error('예시: pnpm prepublish:check -- 망원경이-빛을-모으는-기본-원리');
  process.exit(1);
}

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) {
  console.error('pnpm 실행 경로를 확인할 수 없습니다. 이 스크립트는 pnpm 명령으로 실행하세요.');
  process.exit(1);
}

const runPnpm = (args) => run(process.execPath, [pnpmCli, ...args]);

console.log(`공개 전 검사 대상: ${post}`);
run('node', ['scripts/validate-cms-config.mjs']);
run('node', ['scripts/validate-content.mjs', '--strict', `--post=${post}`]);
runPnpm(['check']);
runPnpm(['build:site']);
console.log(`공개 전 검사 완료: ${post}`);
