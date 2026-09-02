import type { CollectionEntry } from 'astro:content';

export const categories = {
  observation: { label: '관측일지', en: 'Observation Log', index: '01' },
  equipment: { label: '장비와 사용법', en: 'Equipment', index: '02' },
  theory: { label: '관측 이론', en: 'Field Theory', index: '03' },
  simulation: { label: '시뮬레이션', en: 'Simulation', index: '04' },
  'open-data': { label: '오픈데이터', en: 'Open Data', index: '05' },
} as const;

export type CategoryKey = keyof typeof categories;
export type PostEntry = CollectionEntry<'posts'>;

export const byPublishedDate = (a: PostEntry, b: PostEntry) =>
  (b.data.publishedAt?.getTime() ?? 0) - (a.data.publishedAt?.getTime() ?? 0);

export const formatDate = (date?: Date) =>
  date ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date) : '';

export const hasObservationData = (observation?: PostEntry['data']['observation']) => Boolean(
  observation && (
    observation.target || observation.observedAt || observation.location || observation.equipment.length ||
    observation.conditions || observation.seeing || observation.transparency ||
    observation.temperatureC !== undefined || observation.humidityPercent !== undefined
  )
);
