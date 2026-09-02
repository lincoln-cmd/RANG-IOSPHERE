import { getCollection, type CollectionEntry } from 'astro:content';
import type { APIRoute } from 'astro';
import { hasObservationData } from '../../../lib/content';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft && Boolean(data.publishedAt) && hasObservationData(data.observation));
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

export const GET: APIRoute = ({ props, site }) => {
  const post = props.post as CollectionEntry<'posts'>;
  const observation = post.data.observation!;
  const payload = {
    schemaVersion: 1,
    id: post.id,
    title: post.data.title,
    category: post.data.category,
    publishedAt: post.data.publishedAt?.toISOString(),
    updatedAt: post.data.updatedAt?.toISOString(),
    source: new URL(`/archive/${post.id}/`, site ?? 'https://rang-iosphere.pages.dev').href,
    observation: {
      target: observation.target ?? null,
      equipment: observation.equipment,
      conditions: observation.conditions ?? null,
      seeing: observation.seeing ?? null,
      transparency: observation.transparency ?? null,
      temperatureC: observation.temperatureC ?? null,
      humidityPercent: observation.humidityPercent ?? null,
    },
  };
  const encodedFilename = encodeURIComponent(`${post.id}-observation.json`);

  return new Response(`${JSON.stringify(payload, null, 2)}\n`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="observation-data.json"; filename*=UTF-8''${encodedFilename}`,
    },
  });
};
