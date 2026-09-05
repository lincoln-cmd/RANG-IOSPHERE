import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { parse } from 'yaml';

const root = process.cwd();
const postsDir = resolve(root, 'src/data/posts');
const requestedPost = process.argv.slice(2).find((argument) => argument !== '--')
  ?.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\.(md|mdx)$/i, '');
const failures = [];
const warnings = [];

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? walk(resolve(directory, entry.name))
    : [resolve(directory, entry.name)]));
  return files.flat();
};
const splitFrontmatter = (source) => source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];

const allFiles = (await walk(postsDir)).filter((file) => ['.md', '.mdx'].includes(extname(file)));
const files = requestedPost
  ? allFiles.filter((file) => relative(postsDir, file).replace(/\\/g, '/').replace(/\.(md|mdx)$/i, '') === requestedPost)
  : allFiles;

if (requestedPost && files.length === 0) {
  console.error(`오류  게시물을 찾을 수 없습니다: ${requestedPost}`);
  process.exit(1);
}

const references = [];
let publishedPostCount = 0;
for (const file of files) {
  const frontmatter = splitFrontmatter(await readFile(file, 'utf8'));
  if (!frontmatter) continue;
  const data = parse(frontmatter) ?? {};
  if (data.draft !== false) continue;
  publishedPostCount += 1;
  for (const reference of Array.isArray(data.references) ? data.references : []) {
    references.push({ file, title: reference?.title ?? '제목 없음', url: reference?.url });
  }
}

const checkReference = async (reference) => {
  let url;
  try { url = new URL(reference.url); } catch { failures.push({ ...reference, result: 'URL 형식 오류' }); return; }
  if (!['http:', 'https:'].includes(url.protocol)) {
    failures.push({ ...reference, result: `${url.protocol} 주소는 지원하지 않음` });
    return;
  }

  const request = async (method) => fetch(url, {
    method,
    redirect: 'follow',
    headers: { 'user-agent': 'RANG-IOSPHERE reference checker/1.0', ...(method === 'GET' ? { range: 'bytes=0-0' } : {}) },
    signal: AbortSignal.timeout(15_000),
  });

  try {
    let response = await request('HEAD');
    if ([405, 501].includes(response.status)) response = await request('GET');
    const result = `HTTP ${response.status}`;
    if (response.ok || (response.status >= 300 && response.status < 400)) return;
    if ([401, 403, 429].includes(response.status) || response.status >= 500) warnings.push({ ...reference, result });
    else failures.push({ ...reference, result });
  } catch (error) {
    warnings.push({ ...reference, result: error instanceof Error ? error.message : '접속 실패' });
  }
};

const queue = [...references];
await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
  while (queue.length) await checkReference(queue.shift());
}));

console.log(`참고 자료 링크 검사: 공개 글 ${publishedPostCount}개, 링크 ${references.length}개`);
for (const item of warnings) console.warn(`주의  ${relative(root, item.file)} · ${item.title}: ${item.result}`);
for (const item of failures) console.error(`오류  ${relative(root, item.file)} · ${item.title}: ${item.result}`);
console.log(`결과: 오류 ${failures.length}개, 주의 ${warnings.length}개`);
if (failures.length) process.exitCode = 1;
