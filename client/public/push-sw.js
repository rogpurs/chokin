self.addEventListener('push', function(event) {
  let data = { title: 'CHOKIN', body: '通知があります' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (_e) {}

  event.waitUntil(
    self.registration.showNotification(data.title || 'CHOKIN', {
      body: data.body || '通知があります',
      icon: '/pwa-icon.svg',
      badge: '/pwa-icon.svg'
    })
  );
});
