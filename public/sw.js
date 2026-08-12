self.addEventListener("push", (event) => {
  let data = { title: "Shared Flat OS", body: "", href: "/home" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Shared Flat OS", {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { href: data.href || "/home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/home";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(href);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(href);
    }),
  );
});
