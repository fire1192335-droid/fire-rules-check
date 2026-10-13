// Service Worker：停用版。
// 本工具已暫停使用。此版本清除所有離線快取、解除註冊，並重新載入已開啟的頁面，
// 讓已「加到主畫面」的裝置下次連網時改顯示停用說明，不再離線執行舊版判定。
const CACHE = 'fire-rules-retired-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});

// 一律走網路，不再使用快取。
self.addEventListener('fetch', () => {});
