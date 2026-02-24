/**
 * sw.js — MEMENTO Service Worker
 * オフラインキャッシュ & バックグラウンド通知
 */

const CACHE_NAME = 'memento-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/index.css',
    '/css/themes.css',
    '/js/app.js',
    '/js/countdown.js',
    '/js/settings.js',
    '/js/milestones.js',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap'
];

// --- Install: キャッシュ構築 ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS.filter(url => !url.startsWith('http')));
        })
    );
    self.skipWaiting();
});

// --- Activate: 古いキャッシュを削除 ---
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// --- Fetch: キャッシュから優先して返す ---
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                // 成功したレスポンスをキャッシュに追加
                if (response.ok && response.type !== 'opaque') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // オフライン時のフォールバック
                return caches.match('/index.html');
            });
        })
    );
});

// --- Push Notification: バックグラウンド通知 ---
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'MEMENTO';
    const options = {
        body: data.body || '残り時間を確認しましょう',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag || 'memento',
        requireInteraction: false,
        silent: false,
        data: { url: data.url || '/' }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// --- Notification Click: タップで開く ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            return clients.openWindow(targetUrl);
        })
    );
});

// --- Periodic Background Sync: 毎朝の通知 ---
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'daily-reminder') {
        event.waitUntil(sendDailyReminder());
    }
});

async function sendDailyReminder() {
    // 設定をIndexedDBから取得（localStorage はSW内から参照不可のためメッセージ経由）
    await self.registration.showNotification('MEMENTO — 今日も時間は限られている', {
        body: 'アプリを開いて今日の残り時間を確認しましょう。',
        icon: '/icons/icon-192.png',
        tag: 'daily-reminder',
        data: { url: '/?mode=day' }
    });
}
