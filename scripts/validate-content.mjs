import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { parse } from 'yaml';

const root = process.cwd();
const postsDir = resolve(root, 'src/data/posts');
const publicDir = resolve(root, 'public');
const strict = process.argv.includes('--strict');
const validCategories = new Set(['observation', 'equipment', 'theory', 'simulation', 'open-data']);
const errors = [];
const warnings = [];

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(resolve(directory, entry.name)) : [resolve(directory, entry.name)]));
  return files.flat();
};

const exists = async (path) => {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
};

const report = (kind, file, message) => {
  const line = `${relative(root, file)}: ${message}`;
  (kind === 'error' ? errors : warnings).push(line);
};

const splitDocument = (source) => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
};

const files = (await walk(postsDir)).filter((file) => ['.md', '.mdx'].includes(extname(file)));
const knownIds = new Set(files.map((file) => relative(postsDir, file).replace(/\\/g, '/').replace(/\.(md|mdx)$/, '')));

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const document = splitDocument(source);
  if (!document) { report('error', file, 'YAML frontmatter 구분자(---)가 없습니다.'); continue; }

  let data;
  try { data = parse(document.frontmatter) ?? {}; } catch (error) { report('error', file, `frontmatter YAML 오류: ${error.message}`); continue; }
  const published = data.draft === false;
  const slug = relative(postsDir, file).replace(/\\/g, '/').replace(/\.(md|mdx)$/, '');

  if (!/^[\p{L}\p{N}]+(?:[/-][\p{L}\p{N}]+)*$/u.test(slug)) report('error', file, '파일명은 문자·숫자·하이픈만 사용하세요.');
  for (const field of ['title', 'description', 'category']) if (typeof data[field] !== 'string' || !data[field].trim()) report('error', file, `${field} 값이 비어 있습니다.`);
  if (!validCategories.has(data.category)) report('error', file, `지원하지 않는 category입니다: ${data.category}`);
  if (!Array.isArray(data.tags)) report('error', file, 'tags는 YAML 배열이어야 합니다.');
  if (typeof data.draft !== 'boolean') report('error', file, 'draft는 true 또는 false여야 합니다.');
  if (published && !data.publishedAt) report('error', file, '공개 글에는 publishedAt이 필요합니다.');
  if (published && document.body.replace(/<!--([\s\S]*?)-->/g, '').trim().length < 200) report('warning', file, '공개 글의 본문이 매우 짧습니다.');
  const references = Array.isArray(data.references) ? data.references : [];
  if (published && references.length === 0 && !/^##\s+.*(참고|출처|자료)/m.test(document.body)) report('warning', file, '참고 자료 또는 출처를 확인하세요.');
  for (const reference of references) {
    if (typeof reference?.title !== 'string' || !reference.title.trim()) report('error', file, '참고 자료의 자료명이 비어 있습니다.');
    try { new URL(reference?.url); } catch { report('error', file, `참고 자료 URL이 올바르지 않습니다: ${reference?.url ?? ''}`); }
  }
  if (data.category === 'observation' && !data.observation) report('warning', file, '관측일지에는 observation 정보 추가를 권장합니다.');

  if (data.cover && typeof data.cover !== 'string') {
    report('error', file, 'cover는 이미지 경로 문자열이어야 합니다.');
  } else if (data.cover) {
    if (published && (typeof data.coverAlt !== 'string' || !data.coverAlt.trim())) report('error', file, '대표 이미지에는 이미지 설명(coverAlt)이 필요합니다.');
    if (!/^(https?:|data:)/.test(data.cover)) {
      const cleanCover = decodeURIComponent(data.cover.split(/[?#]/)[0]);
      const coverPath = cleanCover.startsWith('/') ? resolve(publicDir, cleanCover.slice(1)) : resolve(dirname(file), cleanCover);
      if (!(await exists(coverPath))) report('error', file, `대표 이미지 파일을 찾을 수 없습니다: ${data.cover}`);
    }
  }

  const location = data.observation?.location;
  if (typeof location === 'string' && (/\d/.test(location) || /(로|길|동|리)\s*\d+/u.test(location))) report('warning', file, '관측 위치에 상세 주소로 보이는 정보가 있습니다. 공개 범위를 확인하세요.');
  if (/(로|길|동|리)\s*\d{1,4}(?:-\d{1,4})?/u.test(document.body)) report('warning', file, '본문에 상세 주소로 보이는 표현이 있습니다.');

  for (const match of document.body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    const [, alt, target] = match;
    if (!alt.trim()) report(published ? 'error' : 'warning', file, `이미지 대체 텍스트가 비어 있습니다: ${target}`);
    if (/^(https?:|data:)/.test(target)) continue;
    const cleanTarget = decodeURIComponent(target.split(/[?#]/)[0]);
    const imagePath = cleanTarget.startsWith('/') ? resolve(publicDir, cleanTarget.slice(1)) : resolve(dirname(file), cleanTarget);
    if (!(await exists(imagePath))) report('error', file, `이미지 파일을 찾을 수 없습니다: ${target}`);
  }

  for (const match of document.body.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|tel:|#)/.test(target)) continue;
    const cleanTarget = decodeURIComponent(target.split(/[?#]/)[0]);
    if (cleanTarget.startsWith('/archive/')) {
      const id = cleanTarget.replace(/^\/archive\//, '').replace(/\/$/, '');
      if (id && !knownIds.has(id)) report('error', file, `연결 대상 게시물을 찾을 수 없습니다: ${target}`);
    } else if (!cleanTarget.startsWith('/')) {
      const linkPath = resolve(dirname(file), cleanTarget);
      if (!(await exists(linkPath))) report('error', file, `연결 대상 파일을 찾을 수 없습니다: ${target}`);
    }
  }
}

console.log(`게시물 ${files.length}개 검사 완료`);
for (const message of warnings) console.warn(`주의  ${message}`);
for (const message of errors) console.error(`오류  ${message}`);
console.log(`결과: 오류 ${errors.length}개, 주의 ${warnings.length}개`);

if (errors.length > 0 || (strict && warnings.length > 0)) process.exitCode = 1;
