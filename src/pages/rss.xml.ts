import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { byPublishedDate } from '../lib/content';

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft && Boolean(data.publishedAt))).sort(byPublishedDate);

  return rss({
    title: '랑이오스페어 | RANG-IOSPHERE',
    description: '직접 수행한 천체 관측과 장비, 이론, 시뮬레이션, 공개 데이터 탐구 기록',
    site: context.site ?? 'https://rang-iosphere.pages.dev',
    customData: '<language>ko-kr</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt!,
      link: `/archive/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
