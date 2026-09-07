import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft && Boolean(data.publishedAt));
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

const frontmatterValue = (value: unknown) => JSON.stringify(value);

const markdownSource = (post: CollectionEntry<'posts'>) => {
  const metadata = {
    title: post.data.title,
    description: post.data.description,
    category: post.data.category,
    publishedAt: post.data.publishedAt?.toISOString(),
    updatedAt: post.data.updatedAt?.toISOString(),
    tags: post.data.tags,
    featured: post.data.featured,
    series: post.data.series,
    cover: post.data.cover,
    coverAlt: post.data.coverAlt,
    references: post.data.references,
    observation: post.data.observation,
  };
  const frontmatter = Object.entries(metadata)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${frontmatterValue(value)}`)
    .join('\n');
  return `---\n${frontmatter}\n---\n\n${(post.body ?? '').trim()}\n`;
};

export const GET: APIRoute = ({ props }) => {
  const post = props.post as CollectionEntry<'posts'>;
  return new Response(markdownSource(post), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="article.md"; filename*=UTF-8''${encodeURIComponent(post.id)}.md`,
    },
  });
};
