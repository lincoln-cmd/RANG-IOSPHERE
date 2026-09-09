const siteURL = new URL(process.env.SITE_URL ?? process.argv[2] ?? 'https://rang-iosphere.pages.dev');
const expectedCommit = process.env.EXPECTED_SHA?.trim();
const attempts = Number(process.env.SMOKE_ATTEMPTS ?? 30);
const delayMs = Number(process.env.SMOKE_DELAY_MS ?? 10_000);

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
const request = async (path) => {
  const url = new URL(path, siteURL);
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${url.pathname}: HTTP ${response.status}`);
  return { url, response, body: await response.text() };
};

const requireHeader = (response, name, expected) => {
  const value = response.headers.get(name) ?? '';
  if (!expected.every((token) => value.toLowerCase().includes(token.toLowerCase()))) {
    throw new Error(`${response.url}: ${name} 응답 헤더가 올바르지 않습니다: ${value || 'missing'}`);
  }
};

let deployedCommit;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const { body } = await request(`/build-info.json?check=${Date.now()}`);
    const info = JSON.parse(body);
    deployedCommit = info.commit;
    if (!expectedCommit || deployedCommit === expectedCommit) break;
    console.log(`배포 대기 ${attempt}/${attempts}: ${deployedCommit.slice(0, 12)} → ${expectedCommit.slice(0, 12)}`);
  } catch (error) {
    console.log(`배포 확인 재시도 ${attempt}/${attempts}: ${error.message}`);
  }
  if (attempt < attempts) await wait(delayMs);
}

if (expectedCommit && deployedCommit !== expectedCommit) {
  throw new Error(`배포 커밋 불일치: expected ${expectedCommit}, received ${deployedCommit ?? 'none'}`);
}

const checks = [
  ['/', '랑이와 함께 보는'],
  ['/about/', '밤하늘을 관측하고'],
  ['/archive/', '<option value="updated">최근 수정순</option>'],
  ['/observations/', '관측 데이터 현황'],
  ['/admin/', 'RANG-IOSPHERE CMS'],
  ['/rss.xml', '<rss'],
  ['/robots.txt', 'Sitemap: https://rang-iosphere.pages.dev/sitemap-index.xml'],
  ['/sitemap-index.xml', '<sitemapindex'],
  ['/offline.html', '저장된 기록 보기'],
];

for (const [path, marker] of checks) {
  const { body } = await request(path);
  if (!body.includes(marker)) throw new Error(`${path}: 필수 문구를 찾을 수 없습니다: ${marker}`);
  console.log(`통과  ${path}`);
}

const notFoundURL = new URL(`/missing-record-${Date.now()}/`, siteURL);
const notFoundResponse = await fetch(notFoundURL, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15_000) });
const notFoundBody = await notFoundResponse.text();
if (notFoundResponse.status !== 404 || !notFoundBody.includes('관측 범위를')) {
  throw new Error(`/404: 잘못된 주소의 복구 화면을 확인할 수 없습니다. HTTP ${notFoundResponse.status}`);
}
console.log('통과  잘못된 주소의 404 복구 화면');

const { response: homeResponse, body: homeBodyForHeaders } = await request('/');
requireHeader(homeResponse, 'content-security-policy', ["default-src 'self'", "object-src 'none'", "frame-ancestors 'self'"]);
requireHeader(homeResponse, 'x-content-type-options', ['nosniff']);
requireHeader(homeResponse, 'referrer-policy', ['strict-origin-when-cross-origin']);
requireHeader(homeResponse, 'permissions-policy', ['camera=()', 'microphone=()', 'geolocation=()']);
console.log('통과  기본 보안 응답 헤더');

const { response: manifestResponse, body: manifestBody } = await request('/manifest.webmanifest');
const manifest = JSON.parse(manifestBody);
if (!manifestResponse.headers.get('content-type')?.includes('json') || !manifest.shortcuts?.some((shortcut) => shortcut.url === '/archive/') || !manifest.shortcuts?.some((shortcut) => shortcut.url === '/observations/')) {
  throw new Error('웹앱 manifest 또는 주요 바로가기를 확인할 수 없습니다.');
}

const { response: rssResponse, body: rssBody } = await request('/rss.xml');
const hasRSSItems = rssBody.includes('<item>');
if (!rssResponse.headers.get('content-type')?.includes('xml') || !rssBody.includes('<atom:link') || (hasRSSItems && (!rssBody.includes('<atom:updated>') || !rssBody.includes('<author>')))) {
  throw new Error('RSS 구독 메타데이터를 확인할 수 없습니다.');
}
console.log('통과  RSS 구독 메타데이터');
console.log('통과  웹앱 manifest 및 주요 바로가기');

const assetPath = homeBodyForHeaders.match(/(?:href|src)=["'](\/_astro\/[^"']+)["']/)?.[1];
if (!assetPath) throw new Error('캐시 정책을 확인할 빌드 자산을 찾을 수 없습니다.');
const { response: assetResponse } = await request(assetPath);
requireHeader(assetResponse, 'cache-control', ['max-age=31536000', 'immutable']);
const { response: serviceWorkerResponse, body: serviceWorkerBody } = await request('/sw.js');
requireHeader(serviceWorkerResponse, 'cache-control', ['no-cache', 'no-store', 'must-revalidate']);
for (const marker of ["const CACHE_PREFIX = 'rang-iosphere-'", 'const MAX_RUNTIME_ENTRIES = 60', 'key.startsWith(CACHE_PREFIX)']) {
  if (!serviceWorkerBody.includes(marker)) throw new Error(`/sw.js: 캐시 용량 관리 설정을 찾을 수 없습니다: ${marker}`);
}
const precachePages = JSON.parse(serviceWorkerBody.match(/const PRECACHE_PAGES = (\[[^;]+\]);/)?.[1] ?? '[]');
if (precachePages.length > 34) throw new Error(`/sw.js: 선저장 페이지가 제한을 초과했습니다: ${precachePages.length}`);
console.log('통과  정적 자산 및 서비스 워커 캐시 정책');

if (process.env.REQUIRE_SEARCH_VERIFICATION === 'true') {
  const { body: homeBody } = await request('/');
  for (const provider of ['google', 'naver']) {
    const pattern = new RegExp(`<meta\\s+name=["']${provider}-site-verification["']\\s+content=["'][^"']+["']`);
    if (!pattern.test(homeBody)) throw new Error(`${provider} 검색엔진 소유권 인증 태그가 없습니다.`);
    console.log(`통과  ${provider} 검색엔진 인증 태그`);
  }
}

const { response: csvResponse, body: csvBody } = await request('/observations/data.csv');
if (!csvResponse.headers.get('content-type')?.includes('text/csv') || !csvBody.includes('observedDate,target,equipment')) {
  throw new Error('전체 관측 데이터 CSV 스모크 테스트 실패');
}
console.log('통과  /observations/data.csv');

const { body: sitemapIndex } = await request('/sitemap-index.xml');
const childSitemapURL = sitemapIndex.match(/<loc>([^<]+)<\/loc>/)?.[1];
if (childSitemapURL) {
  const { body: childSitemap } = await request(new URL(childSitemapURL).pathname);
  const articleURLs = [...childSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).filter((url) => /\/archive\/[^/]+\/$/.test(url));
  if (articleURLs.length > 0 && !/<url>[\s\S]*?<loc>[^<]+\/archive\/[^<]+<\/loc>[\s\S]*?<lastmod>[^<]+<\/lastmod>[\s\S]*?<\/url>/.test(childSitemap)) {
    throw new Error('사이트맵에서 게시물 수정일을 확인할 수 없습니다.');
  }
  console.log(articleURLs.length > 0 ? '통과  사이트맵 게시물 수정일' : '통과  빈 공개 아카이브 사이트맵');
  const articleURL = articleURLs[0];
  if (articleURL) {
    const { body: articleBody } = await request(new URL(articleURL).pathname);
    if (!articleBody.includes('<article')) throw new Error(`게시물 상세 스모크 테스트 실패: ${articleURL}`);
    for (const marker of ['property="article:published_time"', 'property="article:modified_time"', 'property="article:section"', 'property="article:tag"']) {
      if (!articleBody.includes(marker)) throw new Error(`게시물 공유 메타데이터가 없습니다: ${marker}`);
    }
    if (!articleBody.includes('data-copy-bibtex') || !articleBody.includes('data-bibtex="@online')) throw new Error(`게시물 BibTeX 인용 기능이 없습니다: ${articleURL}`);
    if (!articleBody.includes('CSV 저장') || !articleBody.includes('표 복사')) throw new Error(`게시물 표 도구 스크립트가 없습니다: ${articleURL}`);
    console.log(`통과  ${new URL(articleURL).pathname}`);
    const sourcePath = articleBody.match(/href="([^"]+\/source\.md)"/)?.[1];
    if (!sourcePath) throw new Error(`게시물 Markdown 다운로드 링크가 없습니다: ${articleURL}`);
    const { response: sourceResponse, body: sourceBody } = await request(sourcePath);
    if (!sourceResponse.headers.get('content-type')?.includes('text/markdown') || !sourceBody.startsWith('---\n') || !sourceBody.includes('\ntitle: ')) {
      throw new Error(`게시물 Markdown 다운로드 스모크 테스트 실패: ${sourcePath}`);
    }
    console.log(`통과  ${sourcePath}`);
  }
  let checkedSocialImage = false;
  for (const candidateURL of articleURLs) {
    const { body: articleBody } = await request(new URL(candidateURL).pathname);
    if (!articleBody.includes('property="og:image"')) continue;
    for (const marker of ['property="og:image:width"', 'property="og:image:height"', 'property="og:image:type"']) {
      if (!articleBody.includes(marker)) throw new Error(`공유 이미지 메타데이터가 없습니다: ${marker}`);
    }
    checkedSocialImage = true;
    break;
  }
  if (checkedSocialImage) console.log('통과  게시물 및 대표 이미지 공유 메타데이터');
  for (const candidateURL of articleURLs) {
    const { body: articleBody } = await request(new URL(candidateURL).pathname);
    const dataPath = articleBody.match(/href="([^"]+\/data\.json)"/)?.[1];
    if (!dataPath) continue;
    const { response, body } = await request(dataPath);
    const payload = JSON.parse(body);
    if (!response.headers.get('content-type')?.includes('application/json') || !payload.observation) {
      throw new Error(`관측 데이터 다운로드 스모크 테스트 실패: ${dataPath}`);
    }
    console.log(`통과  ${dataPath}`);
    break;
  }
}

console.log(`스모크 테스트 완료: ${siteURL.href} · ${deployedCommit?.slice(0, 12) ?? 'commit unchecked'}`);
