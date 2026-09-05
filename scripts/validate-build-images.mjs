import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const outputDirectory = resolve(process.argv[2] ?? 'dist');
if (!existsSync(outputDirectory)) throw new Error(`빌드 폴더를 찾을 수 없습니다: ${outputDirectory}`);

const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const attributeValue = (attributes, name) => attributes.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
const failures = [];
let checkedImages = 0;

for (const htmlFile of walk(outputDirectory).filter((path) => extname(path) === '.html')) {
  const html = readFileSync(htmlFile, 'utf8');
  const source = `/${relative(outputDirectory, htmlFile).split(sep).join('/')}`;
  const prose = html.match(/<article\b[^>]*\bclass=["'][^"']*\bprose\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (!prose) continue;

  for (const match of prose.matchAll(/<img\b([^>]*)>/gi)) {
    checkedImages += 1;
    const loading = attributeValue(match[1], 'loading');
    const decoding = attributeValue(match[1], 'decoding');
    if (loading !== 'lazy') failures.push(`${source}: 본문 이미지에 loading="lazy"가 없습니다.`);
    if (decoding !== 'async') failures.push(`${source}: 본문 이미지에 decoding="async"가 없습니다.`);
  }
}

console.log(`빌드 이미지 검사: 본문 이미지 ${checkedImages}개`);
if (failures.length) {
  failures.forEach((failure) => console.error(`오류  ${failure}`));
  throw new Error(`본문 이미지 최적화 누락 ${failures.length}개`);
}
console.log('결과: 본문 이미지 로딩 속성 이상 없음');
