import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const outputDirectory = resolve(process.argv[2] ?? 'dist');
const failures = [];
const requiredFiles = ['manifest.webmanifest', 'offline.html', 'sw.js', 'icon-192.png', 'icon-512.png'];

for (const file of requiredFiles) {
  if (!existsSync(resolve(outputDirectory, file))) failures.push(`${file}: 빌드 결과에서 찾을 수 없습니다.`);
}

const manifestPath = resolve(outputDirectory, 'manifest.webmanifest');
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  failures.push(`manifest.webmanifest: JSON을 해석할 수 없습니다. ${error.message}`);
}

if (manifest) {
  if (manifest.id !== '/' || manifest.start_url !== '/' || manifest.scope !== '/') failures.push('manifest: id, start_url, scope는 모두 /여야 합니다.');
  if (manifest.display !== 'standalone') failures.push('manifest: standalone 표시 모드가 필요합니다.');
  if (!manifest.name || !manifest.short_name || !manifest.description || !manifest.lang) failures.push('manifest: 앱 이름·짧은 이름·설명·언어가 필요합니다.');

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  for (const size of ['192x192', '512x512']) {
    const icon = icons.find((candidate) => candidate.sizes?.split(/\s+/).includes(size));
    if (!icon) {
      failures.push(`manifest: ${size} 아이콘이 없습니다.`);
      continue;
    }
    const iconPath = resolve(outputDirectory, icon.src.replace(/^\/+/, ''));
    if (!iconPath.startsWith(`${outputDirectory}${sep}`) || !existsSync(iconPath)) failures.push(`manifest: 아이콘 파일이 없습니다. ${icon.src}`);
  }

  const shortcuts = Array.isArray(manifest.shortcuts) ? manifest.shortcuts : [];
  for (const url of ['/archive/', '/observations/']) {
    const shortcut = shortcuts.find((candidate) => candidate.url === url);
    if (!shortcut?.name) failures.push(`manifest: ${url} 바로가기가 없습니다.`);
    const target = resolve(outputDirectory, url.replace(/^\/+/, ''), 'index.html');
    if (!target.startsWith(`${outputDirectory}${sep}`) || !existsSync(target)) failures.push(`manifest: ${url} 바로가기 대상이 빌드되지 않았습니다.`);
  }
}

if (existsSync(resolve(outputDirectory, 'sw.js'))) {
  const serviceWorker = readFileSync(resolve(outputDirectory, 'sw.js'), 'utf8');
  if (!serviceWorker.includes("const OFFLINE_URL = '/offline.html'")) failures.push('sw.js: 오프라인 대체 문서 설정이 없습니다.');
  let precacheAssets = [];
  try {
    precacheAssets = JSON.parse(serviceWorker.match(/const PRECACHE_ASSETS = (\[[^;]+\]);/)?.[1] ?? '[]');
  } catch {
    failures.push('sw.js: 선저장 자산 목록을 해석할 수 없습니다.');
  }
  for (const asset of ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png']) {
    if (!precacheAssets.includes(asset)) failures.push(`sw.js: 필수 선저장 항목이 없습니다. ${asset}`);
  }
}

console.log(`웹앱 구성 검사: 필수 파일 ${requiredFiles.length}개, 바로가기 2개`);
if (failures.length) {
  failures.forEach((failure) => console.error(`오류  ${failure}`));
  throw new Error(`웹앱 구성 오류 ${failures.length}개`);
}
console.log('결과: 웹앱 설치·오프라인 구성 이상 없음');
