const siteURL = new URL(process.env.SITE_URL ?? process.argv[2] ?? 'https://rang-iosphere.pages.dev');
const expectedCommit = process.env.EXPECTED_SHA?.trim();
const attempts = Number(process.env.SMOKE_ATTEMPTS ?? 18);
const delayMs = Number(process.env.SMOKE_DELAY_MS ?? 10_000);

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
const request = async (path) => {
  const url = new URL(path, siteURL);
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${url.pathname}: HTTP ${response.status}`);
  return { url, response, body: await response.text() };
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
  ['/archive/', '관측과 탐구의 기록'],
  ['/observations/', '관측 데이터 현황'],
  ['/admin/', 'RANG-IOSPHERE CMS'],
  ['/rss.xml', '<rss'],
  ['/sitemap-index.xml', '<sitemapindex'],
];

for (const [path, marker] of checks) {
  const { body } = await request(path);
  if (!body.includes(marker)) throw new Error(`${path}: 필수 문구를 찾을 수 없습니다: ${marker}`);
  console.log(`통과  ${path}`);
}

const { body: sitemapIndex } = await request('/sitemap-index.xml');
const childSitemapURL = sitemapIndex.match(/<loc>([^<]+)<\/loc>/)?.[1];
if (childSitemapURL) {
  const { body: childSitemap } = await request(new URL(childSitemapURL).pathname);
  const articleURLs = [...childSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).filter((url) => /\/archive\/[^/]+\/$/.test(url));
  const articleURL = articleURLs[0];
  if (articleURL) {
    const { body: articleBody } = await request(new URL(articleURL).pathname);
    if (!articleBody.includes('<article')) throw new Error(`게시물 상세 스모크 테스트 실패: ${articleURL}`);
    console.log(`통과  ${new URL(articleURL).pathname}`);
  }
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
