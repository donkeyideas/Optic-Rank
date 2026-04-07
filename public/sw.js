// Service Worker for Web Push Notifications — Optic Rank

self.addEventListener("push", function (event) {
  if (!event.data) return;

  var payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "Optic Rank", body: event.data.text() };
  }

  var title = payload.title || "Optic Rank";
  var options = {
    body: payload.body || "",
    icon: payload.icon || "/branding/opticrank-logo-512.png",
    badge: "/branding/opticrank-favicon-512.png",
    data: payload.data || {},
    tag: (payload.data && payload.data.type) || "default",
    renotify: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var data = event.notification.data || {};
  var urlPath = data.url || "/dashboard";
  var fullUrl = new URL(urlPath, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Focus existing tab if open at same URL
        for (var i = 0; i < clientList.length; i++) {
          if (clientList[i].url === fullUrl && "focus" in clientList[i]) {
            return clientList[i].focus();
          }
        }
        // Navigate an existing tab to the URL
        for (var j = 0; j < clientList.length; j++) {
          if (
            new URL(clientList[j].url).origin === self.location.origin &&
            "focus" in clientList[j]
          ) {
            clientList[j].focus();
            return clientList[j].navigate(fullUrl);
          }
        }
        // Open new window
        return clients.openWindow(fullUrl);
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});
