import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const outputDirectory = resolve(process.argv[2] ?? 'dist');
if (!existsSync(outputDirectory)) throw new Error(`빌드 폴더를 찾을 수 없습니다: ${outputDirectory}`);

const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});

const htmlFiles = walk(outputDirectory).filter((path) => extname(path) === '.html');
const failures = [];
let checkedReferences = 0;

const decodePath = (value) => {
  try { return decodeURIComponent(value); } catch { return value; }
};

const outputPathFor = (pathname) => {
  const decoded = decodePath(pathname).replace(/^\/+/, '');
  const candidate = resolve(outputDirectory, decoded);
  if (!candidate.startsWith(`${outputDirectory}${sep}`) && candidate !== outputDirectory) return null;
  if (extname(candidate)) return candidate;
  return join(candidate, 'index.html');
};

for (const htmlFile of htmlFiles) {
  const html = readFileSync(htmlFile, 'utf8');
  const source = `/${relative(outputDirectory, htmlFile).split(sep).join('/')}`;
  const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);

  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) continue;
    const [rawPath, fragment = ''] = reference.split('#', 2);
    const pathname = rawPath.split('?', 1)[0];
    if (!pathname && !fragment) continue;

    const targetFile = pathname
      ? outputPathFor(pathname.startsWith('/') ? pathname : new URL(pathname, `https://local.test${source}`).pathname)
      : htmlFile;
    checkedReferences += 1;

    if (!targetFile || !existsSync(targetFile)) {
      failures.push(`${source}: ${reference} → 파일 없음`);
      continue;
    }

    if (fragment && extname(targetFile) === '.html') {
      const targetHtml = targetFile === htmlFile ? html : readFileSync(targetFile, 'utf8');
      const escapedFragment = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`\\bid=["']${escapedFragment}["']`).test(targetHtml)) {
        failures.push(`${source}: ${reference} → 앵커 없음`);
      }
    }
  }
}

console.log(`빌드 링크 검사: HTML ${htmlFiles.length}개, 내부 참조 ${checkedReferences}개`);
if (failures.length) {
  failures.forEach((failure) => console.error(`오류  ${failure}`));
  throw new Error(`깨진 내부 참조 ${failures.length}개`);
}
console.log('결과: 깨진 내부 링크 없음');
