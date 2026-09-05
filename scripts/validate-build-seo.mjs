import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const outputDirectory = resolve(process.argv[2] ?? 'dist');
if (!existsSync(outputDirectory)) throw new Error(`빌드 폴더를 찾을 수 없습니다: ${outputDirectory}`);

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
const decode = (value = '') => value.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const failures = [];
let checkedPages = 0;
let checkedArticles = 0;

const sitemapPath = resolve(outputDirectory, 'sitemap-0.xml');
if (!existsSync(sitemapPath)) throw new Error('공개 페이지 목록을 담은 sitemap-0.xml이 없습니다.');
const sitemap = readFileSync(sitemapPath, 'utf8');
const htmlFiles = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
  const pathname = decodeURIComponent(new URL(match[1]).pathname);
  return pathname === '/'
    ? resolve(outputDirectory, 'index.html')
    : resolve(outputDirectory, pathname.replace(/^\/+/, ''), 'index.html');
});

const metaValue = (html, key, value) => {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attr(match[0], key)?.toLowerCase() === value.toLowerCase()) return decode(attr(match[0], 'content'));
  }
};
const linkValue = (html, rel) => {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    if ((attr(match[0], 'rel') ?? '').toLowerCase().split(/\s+/).includes(rel)) return decode(attr(match[0], 'href'));
  }
};
const expectedURL = (source) => {
  const pathname = source === '/index.html' ? '/' : source.replace(/index\.html$/, '');
  return new URL(pathname, 'https://rang-iosphere.pages.dev').href;
};

for (const htmlFile of htmlFiles) {
  if (!existsSync(htmlFile)) {
    failures.push(`${relative(outputDirectory, htmlFile)}: 사이트맵의 HTML 파일이 없습니다.`);
    continue;
  }
  const source = `/${relative(outputDirectory, htmlFile).split(sep).join('/')}`;
  if (source === '/404.html' || source === '/offline.html' || source.startsWith('/admin/')) continue;
  const html = readFileSync(htmlFile, 'utf8');
  const report = (message) => failures.push(`${source}: ${message}`);
  const title = decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim());
  const description = metaValue(html, 'name', 'description');
  const canonical = linkValue(html, 'canonical');
  const ogTitle = metaValue(html, 'property', 'og:title');
  const ogDescription = metaValue(html, 'property', 'og:description');
  const ogURL = metaValue(html, 'property', 'og:url');
  const ogImage = metaValue(html, 'property', 'og:image');
  const twitterImage = metaValue(html, 'name', 'twitter:image');
  checkedPages += 1;

  if (canonical !== expectedURL(source)) report(`canonical 불일치: ${canonical ?? '없음'}`);
  if (!title || ogTitle !== title) report('페이지 제목과 og:title이 일치하지 않습니다.');
  if (!description || ogDescription !== description) report('검색 설명과 og:description이 일치하지 않습니다.');
  if (ogURL !== canonical) report('og:url과 canonical이 일치하지 않습니다.');
  if (metaValue(html, 'name', 'twitter:title') !== title) report('twitter:title이 페이지 제목과 일치하지 않습니다.');
  if (metaValue(html, 'name', 'twitter:description') !== description) report('twitter:description이 검색 설명과 일치하지 않습니다.');
  if (ogImage) {
    if (!ogImage.startsWith('https://')) report('og:image는 절대 HTTPS 주소여야 합니다.');
    if (twitterImage !== ogImage) report('twitter:image와 og:image가 일치하지 않습니다.');
    if (!metaValue(html, 'property', 'og:image:alt') || !metaValue(html, 'name', 'twitter:image:alt')) report('공유 이미지 설명이 없습니다.');
  } else if (twitterImage) report('og:image 없이 twitter:image만 존재합니다.');

  const structuredData = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => {
      try { const value = JSON.parse(match[1]); return Array.isArray(value) ? value : [value]; }
      catch { report('구조화 데이터 JSON을 해석할 수 없습니다.'); return []; }
    });

  if (source === '/index.html' && !structuredData.some((item) => item?.['@type'] === 'WebSite' && item.url === canonical)) {
    report('홈 WebSite 구조화 데이터가 없거나 URL이 다릅니다.');
  }

  if (/^\/archive\/[^/]+\/index\.html$/.test(source)) {
    checkedArticles += 1;
    if (metaValue(html, 'property', 'og:type') !== 'article') report('게시물 og:type이 article이 아닙니다.');
    const article = structuredData.find((item) => item?.['@type'] === 'BlogPosting');
    const breadcrumb = structuredData.find((item) => item?.['@type'] === 'BreadcrumbList');
    if (!article || article.url !== canonical || article.mainEntityOfPage !== canonical || !article.headline || !article.datePublished) report('BlogPosting 구조화 데이터가 불완전합니다.');
    if (!breadcrumb || breadcrumb.itemListElement?.at(-1)?.item !== canonical) report('BreadcrumbList 구조화 데이터가 불완전합니다.');
    const actions = html.match(/<div\b[^>]*\bclass=["'][^"']*\barticle-actions\b[^"']*["'][^>]*>/i)?.[0];
    const citation = actions ? decode(attr(actions, 'data-citation')) : undefined;
    if (!/<button\b[^>]*data-copy-citation/i.test(html) || !citation?.includes(article?.headline) || !citation?.includes(canonical)) {
      report('게시물 인용 정보가 없거나 제목·주소가 일치하지 않습니다.');
    }
  }
}

console.log(`빌드 SEO 검사: 페이지 ${checkedPages}개, 게시물 ${checkedArticles}개`);
if (failures.length) {
  failures.forEach((failure) => console.error(`오류  ${failure}`));
  throw new Error(`검색·공유 메타데이터 오류 ${failures.length}개`);
}
console.log('결과: 검색·공유 메타데이터 이상 없음');
