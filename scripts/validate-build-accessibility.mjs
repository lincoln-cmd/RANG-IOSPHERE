import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const outputDirectory = resolve(process.argv[2] ?? 'dist');
if (!existsSync(outputDirectory)) throw new Error(`빌드 폴더를 찾을 수 없습니다: ${outputDirectory}`);

const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const htmlFiles = walk(outputDirectory).filter((path) => extname(path) === '.html');
const cssFiles = walk(outputDirectory).filter((path) => extname(path) === '.css');
const failures = [];
let checkedControls = 0;

const hasReducedMotionBundle = cssFiles.some((path) => {
  const css = readFileSync(path, 'utf8');
  const start = css.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  if (start < 0) return false;
  const rule = css.slice(start, start + 500);
  return rule.includes('animation:none!important')
    && rule.includes('transition:none!important')
    && rule.includes('scroll-behavior:auto');
});
if (!hasReducedMotionBundle) failures.push('CSS: 동작 줄이기 환경의 애니메이션·전환·스크롤 중지 규칙이 없습니다.');

const hasAttribute = (attributes, name) => new RegExp(`\\s${name}(?:\\s*=|\\s|$)`, 'i').test(` ${attributes}`);
const attributeValue = (attributes, name) => attributes.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
const visibleText = (markup) => markup.replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160);/gi, ' ').trim();
const report = (source, message) => failures.push(`${source}: ${message}`);

for (const htmlFile of htmlFiles) {
  const html = readFileSync(htmlFile, 'utf8');
  const source = `/${relative(outputDirectory, htmlFile).split(sep).join('/')}`;
  const isAdmin = source === '/admin/index.html';
  const isOffline = source === '/offline.html';

  if (!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html)) report(source, 'html 언어 정보가 없습니다.');
  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => visibleText(match[1]));
  if (titles.length !== 1 || !titles[0]) report(source, '비어 있지 않은 title이 정확히 하나 필요합니다.');

  if (!isAdmin) {
    if (!/<main\b/i.test(html)) report(source, 'main 본문 영역이 없습니다.');
    const h1Count = [...html.matchAll(/<h1\b/gi)].length;
    if (h1Count !== 1) report(source, `h1이 정확히 하나여야 합니다. 현재 ${h1Count}개입니다.`);
  }

  if (!isAdmin && !isOffline && source !== '/404.html') {
    if (!/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["'][^"']+["']/i.test(html)) report(source, '검색 설명이 없습니다.');
    if (!/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["'][^"']+["']/i.test(html)) report(source, '대표 URL이 없습니다.');
  }

  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!hasAttribute(match[1], 'alt')) report(source, 'alt가 없는 이미지가 있습니다.');
  }

  for (const match of html.matchAll(/<(button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    checkedControls += 1;
    const attributes = match[2];
    if (!visibleText(match[3]) && !attributeValue(attributes, 'aria-label') && !attributeValue(attributes, 'aria-labelledby')) {
      report(source, '접근 가능한 이름이 없는 버튼이 있습니다.');
    }
  }

  const labels = new Set([...html.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["']/gi)].map((match) => match[1]));
  for (const match of html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const attributes = match[2];
    if (attributeValue(attributes, 'type')?.toLowerCase() === 'hidden') continue;
    checkedControls += 1;
    const id = attributeValue(attributes, 'id');
    const isNamed = Boolean(attributeValue(attributes, 'aria-label') || attributeValue(attributes, 'aria-labelledby') || (id && labels.has(id)));
    if (!isNamed) report(source, `접근 가능한 이름이 없는 ${match[1].toLowerCase()} 요소가 있습니다.`);
  }

  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) report(source, `중복 id: ${duplicates.join(', ')}`);
}

console.log(`빌드 접근성 검사: HTML ${htmlFiles.length}개, CSS ${cssFiles.length}개, 조작 요소 ${checkedControls}개`);
if (failures.length) {
  failures.forEach((failure) => console.error(`오류  ${failure}`));
  throw new Error(`접근성 기본 규칙 위반 ${failures.length}개`);
}
console.log('결과: 접근성 기본 규칙 위반 없음');
