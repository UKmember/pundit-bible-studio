// Keeps the app opening fast and working with a poor signal. Always tries the network first.
const CACHE = "pb-__VERSION__";
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "supabase.js", "backend.js", "standalone.css", "manifest.webmanifest", "icons/icon-192.png"]).catch(() => {}))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // never touch Supabase or Claude calls
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

// phone alerts
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data.json(); } catch (_) { d = { title: "Pundit Bible", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Pundit Bible", { body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag, data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if (c.url.startsWith(self.registration.scope)) { c.postMessage({ type: "open", url }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
