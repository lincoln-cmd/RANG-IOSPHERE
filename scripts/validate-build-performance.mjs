import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const outputDirectory = resolve(process.argv[2] ?? 'dist');
if (!existsSync(outputDirectory)) throw new Error(`빌드 폴더를 찾을 수 없습니다: ${outputDirectory}`);

const budgets = {
  html: 150 * 1024,
  css: 80 * 1024,
  totalJavaScript: 150 * 1024,
  image: 2 * 1024 * 1024,
};
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const failures = [];
const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const files = walk(outputDirectory);
const size = (file) => statSync(file).size;
const label = (file) => `/${relative(outputDirectory, file).split(sep).join('/')}`;
const format = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

const checkIndividual = (extension, budget, name) => {
  for (const file of files.filter((candidate) => extname(candidate).toLowerCase() === extension)) {
    if (size(file) > budget) failures.push(`${label(file)}: ${name} ${format(size(file))}가 예산 ${format(budget)}를 초과했습니다.`);
  }
};

checkIndividual('.html', budgets.html, 'HTML');
checkIndividual('.css', budgets.css, 'CSS');

for (const file of files.filter((candidate) => imageExtensions.has(extname(candidate).toLowerCase()))) {
  if (size(file) > budgets.image) failures.push(`${label(file)}: 이미지 ${format(size(file))}가 예산 ${format(budgets.image)}를 초과했습니다.`);
}

const scripts = files.filter((file) => extname(file).toLowerCase() === '.js' && !label(file).endsWith('/sw.js'));
const totalJavaScript = scripts.reduce((total, file) => total + size(file), 0);
if (totalJavaScript > budgets.totalJavaScript) failures.push(`JavaScript 합계 ${format(totalJavaScript)}가 예산 ${format(budgets.totalJavaScript)}를 초과했습니다.`);

const largest = (extension) => files
  .filter((file) => extname(file).toLowerCase() === extension)
  .reduce((maximum, file) => Math.max(maximum, size(file)), 0);

console.log(`성능 예산 검사: HTML 최대 ${format(largest('.html'))}, CSS 최대 ${format(largest('.css'))}, JavaScript 합계 ${format(totalJavaScript)}`);
if (failures.length) {
  failures.forEach((failure) => console.error(`오류  ${failure}`));
  throw new Error(`성능 예산 초과 ${failures.length}개`);
}
console.log('결과: 빌드 자산 크기 예산 이내');
