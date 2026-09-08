import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { existsSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { byPublishedDate, categories } from '../lib/content';

const publicDirectory = resolve(process.cwd(), 'public');
const imageTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const coverEnclosure = (cover: string | undefined, site: URL) => {
  if (!cover?.startsWith('/') || cover.startsWith('//')) return undefined;
  let pathname: string;
  try { pathname = decodeURIComponent(cover.split(/[?#]/, 1)[0]); } catch { return undefined; }
  const file = resolve(publicDirectory, pathname.replace(/^\/+/, ''));
  const pathFromPublic = relative(publicDirectory, file);
  const type = imageTypes[extname(file).toLowerCase()];
  if (!pathFromPublic || pathFromPublic.startsWith('..') || isAbsolute(pathFromPublic) || !type || !existsSync(file)) return undefined;
  return { url: new URL(cover, site).href, length: statSync(file).size, type };
};

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft && Boolean(data.publishedAt))).sort(byPublishedDate);
  const site = context.site ?? new URL('https://rang-iosphere.pages.dev');
  const feedURL = new URL('/rss.xml', site).href;

  return rss({
    title: '랑이오스페어 | RANG-IOSPHERE',
    description: '직접 수행한 천체 관측과 장비, 이론, 시뮬레이션, 공개 데이터 탐구 기록',
    site,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>ko-kr</language><atom:link href="${feedURL}" rel="self" type="application/rss+xml" />`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt!,
      link: `/archive/${post.id}/`,
      author: 'dhkim1551@naver.com (김동훈)',
      categories: [categories[post.data.category].label, ...post.data.tags],
      enclosure: coverEnclosure(post.data.cover, site),
    })),
  });
}
