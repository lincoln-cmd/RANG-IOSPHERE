import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.argv[2] ?? 'dist');
const rssPath = resolve(outputDirectory, 'rss.xml');
const sitemapPath = resolve(outputDirectory, 'sitemap-0.xml');
if (!existsSync(rssPath) || !existsSync(sitemapPath)) throw new Error('RSS 또는 사이트맵 빌드 결과가 없습니다.');

const rss = readFileSync(rssPath, 'utf8');
const sitemap = readFileSync(sitemapPath, 'utf8');
const failures = [];
const decodeXML = (value) => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const rssItems = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
const articleURLs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => decodeXML(match[1]))
  .filter((url) => /\/archive\/[^/]+\/$/.test(url));
const itemURLs = rssItems.map((item) => decodeXML(item.match(/<link>([^<]+)<\/link>/)?.[1] ?? ''));

if (!rss.includes('xmlns:atom="http://www.w3.org/2005/Atom"')) failures.push('RSS 채널에 Atom 네임스페이스가 없습니다.');
if (!rss.includes('<atom:link href="https://rang-iosphere.pages.dev/rss.xml" rel="self" type="application/rss+xml"')) failures.push('RSS 자기 주소 링크가 없습니다.');
if (!rss.includes('<language>ko-kr</language>')) failures.push('RSS 언어 정보가 없습니다.');
if (rssItems.length !== articleURLs.length || articleURLs.some((url) => !itemURLs.includes(url))) failures.push(`RSS 항목 ${rssItems.length}개와 공개 게시물 ${articleURLs.length}개가 일치하지 않습니다.`);

for (const [index, item] of rssItems.entries()) {
  const required = ['<title>', '<link>', '<guid ', '<description>', '<pubDate>', '<author>', '<category>', '<atom:updated>'];
  for (const marker of required) if (!item.includes(marker)) failures.push(`RSS 항목 ${index + 1}: ${marker} 메타데이터가 없습니다.`);
  const link = decodeXML(item.match(/<link>([^<]+)<\/link>/)?.[1] ?? '');
  const guid = decodeXML(item.match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1] ?? '');
  if (!link || guid !== link) failures.push(`RSS 항목 ${index + 1}: 링크와 guid가 일치하지 않습니다.`);
}

const enclosureCount = rssItems.filter((item) => /<enclosure\s+url="https:\/\/rang-iosphere\.pages\.dev\/[^"\s]+"\s+length="\d+"\s+type="image\//.test(item)).length;
if (!enclosureCount) failures.push('대표 이미지가 있는 RSS 항목의 enclosure를 찾을 수 없습니다.');

console.log(`RSS 검사: 공개 항목 ${rssItems.length}개, 대표 이미지 ${enclosureCount}개`);
if (failures.length) {
  failures.forEach((failure) => console.error(`오류  ${failure}`));
  throw new Error(`RSS 구성 오류 ${failures.length}개`);
}
console.log('결과: RSS 항목과 공개 게시물 목록 일치');
