import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { hasObservationData } from '../lib/content';

export const GET: APIRoute = async () => {
  const appCacheVersion = '2026-09-03-search-readiness-11';
  const posts = await getCollection('posts', ({ data }) => !data.draft && Boolean(data.publishedAt));
  const pages = ['/', '/archive/', '/observations/', '/about/', ...posts.map((post) => `/archive/${post.id}/`)];
  const dataFiles = ['/observations/data.csv', ...posts.flatMap((post) => hasObservationData(post.data.observation) ? [`/archive/${post.id}/data.json`] : [])];
  const media = posts.flatMap((post) => post.data.cover ? [post.data.cover] : []);
  const signature = `${appCacheVersion}|${posts
    .map((post) => `${post.id}:${(post.data.updatedAt ?? post.data.publishedAt)?.toISOString()}`)
    .sort()
    .join('|')}`;
  let hash = 5381;
  for (const character of signature) hash = ((hash << 5) + hash) ^ character.charCodeAt(0);
  const cacheName = `rang-iosphere-${(hash >>> 0).toString(36)}`;

  const source = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const OFFLINE_URL = '/offline.html';
const PRECACHE_PAGES = ${JSON.stringify(pages)};
const PRECACHE_ASSETS = ${JSON.stringify(['/offline.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png', ...media, ...dataFiles])};

const cachePageAndAssets = async (cache, path) => {
  const response = await fetch(path, { cache: 'reload' });
  if (!response.ok) return;
  await cache.put(path, response.clone());
  const html = await response.text();
  const assetPaths = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((asset) => asset.startsWith('/_astro/') || asset.startsWith('/uploads/'));
  await Promise.allSettled([...new Set(assetPaths)].map((asset) => cache.add(asset)));
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE_ASSETS.map((asset) => cache.add(asset)));
    await Promise.allSettled(PRECACHE_PAGES.map((page) => cachePageAndAssets(cache, page)));
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/admin')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request, { ignoreSearch: true })) || (await caches.match(OFFLINE_URL));
      }
    })());
    return;
  }

  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
  }
});
`;

  return new Response(source, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
};
