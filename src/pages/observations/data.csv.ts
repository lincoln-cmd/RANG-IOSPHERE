import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { hasObservationData } from '../../lib/content';

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const GET: APIRoute = async ({ site }) => {
  const records = (await getCollection('posts', ({ data }) =>
    !data.draft && Boolean(data.publishedAt) && hasObservationData(data.observation)))
    .sort((a, b) =>
      (b.data.observation?.observedAt?.getTime() ?? b.data.publishedAt?.getTime() ?? 0) -
      (a.data.observation?.observedAt?.getTime() ?? a.data.publishedAt?.getTime() ?? 0));

  const headers = [
    'id', 'title', 'observedDate', 'target', 'equipment', 'conditions',
    'seeing', 'transparency', 'temperatureC', 'humidityPercent', 'source',
  ];

  const rows = records.map((post) => {
    const observation = post.data.observation!;
    const observedDate = observation.observedAt ?? post.data.publishedAt;
    return [
      post.id,
      post.data.title,
      observedDate?.toISOString().slice(0, 10) ?? '',
      observation.target ?? '',
      observation.equipment.join(' | '),
      observation.conditions ?? '',
      observation.seeing ?? '',
      observation.transparency ?? '',
      observation.temperatureC ?? '',
      observation.humidityPercent ?? '',
      new URL(`/archive/${post.id}/`, site ?? 'https://rang-iosphere.pages.dev').href,
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');

  return new Response(`\uFEFF${csv}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rang-iosphere-observations.csv"',
    },
  });
};
