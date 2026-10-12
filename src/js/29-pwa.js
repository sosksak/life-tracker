// ====== PWA: SERVICE WORKER ======
// Регистрируем только по http/https — с file:// браузер ругается.
const APP_VERSION = 'v9.10.0';

// v7.2.0 — политика обновлений «страница никогда не стартует старой»:
//   Воркер (sw.js) перед отдачей index.html сверяет ETag с сервером и при
//   отличии отдаёт СРАЗУ новую сборку. Поэтому на старте нет ни проверок,
//   ни авто-перезагрузок — они и давали серый кадр iOS и двойной сплэш.
//   Новая версия, найденная уже в работе (фон, возврат в приложение, медленная
//   сеть на старте) — только баннер «Обновить», без самодеятельности.
window.versionGate = Promise.resolve();

function showUpdateBanner() {
  const banner = document.getElementById('updateBanner');
  if (banner) banner.classList.add('show');
}

function onNewVersionAvailable(ver, source) {
  if (ver && ver === APP_VERSION) return;              // уже запущена именно она
  console.log('[SW] new build', ver, 'from', source);
  showUpdateBanner();
}

// Страховка: кнопка баннера обязана работать даже если обработчик
// от service worker по какой-то причине не навесился.
document.addEventListener('click', (e) => {
  const btn = e.target && e.target.closest && e.target.closest('#updateBtn');
  if (!btn || btn.dataset.swBound === '1') return;
  btn.disabled = true;
  btn.textContent = 'Обновляю…';
  location.reload();
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    // INDEX_UPDATED — свежий index.html лёг в кэш (фоновая докачка).
    // SW_ACTIVATED — новый воркер встал у руля (его кэш уже содержит новую сборку).
    if (d.type === 'INDEX_UPDATED' || d.type === 'SW_ACTIVATED') onNewVersionAvailable(d.version, d.type);
  });

  // Регистрация не должна конкурировать с первым рендером — после load.
  window.addEventListener('load', () => {
    let userAskedUpdate = false;
    let reloaded = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!userAskedUpdate || reloaded) return;
      reloaded = true;
      location.reload();
    });

    navigator.serviceWorker.register('sw.js').then(reg => {
      function bindButton(worker) {
        const btn = document.getElementById('updateBtn');
        if (!btn) return;
        btn.disabled = false;
        btn.textContent = 'Обновить';
        btn.dataset.swBound = '1';
        btn.onclick = () => {
          userAskedUpdate = true;
          btn.disabled = true;
          btn.textContent = 'Обновляю…';
          if (worker) worker.postMessage('SKIP_WAITING');
          // Страховка: если воркер не сменился (бывает на iOS) — перезагружаем сами.
          setTimeout(() => { if (!reloaded) { reloaded = true; location.reload(); } }, 2500);
        };
      }
      bindButton(null);

      // Новый воркер уже ждёт (skipWaiting в install не делаем — активируем сами,
      // чтобы не ломать уже открытую страницу на полпути).
      function handleWaiting(worker) {
        if (!worker) return;
        bindButton(worker);
        // Узнаём версию ждущего воркера: если совпадает с нашей — активируем молча.
        const ch = new MessageChannel();
        ch.port1.onmessage = (ev) => {
          const v = ev.data && ev.data.version;
          if (v === APP_VERSION) { worker.postMessage('SKIP_WAITING'); return; }
          onNewVersionAvailable(v, 'waiting');
        };
        try { worker.postMessage('GET_VERSION', [ch.port2]); } catch (e) { onNewVersionAvailable(null, 'waiting'); }
      }

      if (reg.waiting) handleWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // controller есть => это обновление, а не первая установка
          if (nw.state === 'installed' && navigator.serviceWorker.controller) handleWaiting(nw);
        });
      });

      // Проверяем обновления при старте, при возврате в приложение и раз в 15 мин.
      // В установленной PWA страница живёт долго, без этого новая версия
      // может не искаться сутками.
      const check = () => reg.update().catch(() => {});
      check();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
      setInterval(check, 15 * 60 * 1000);
    }).catch(err => console.warn('SW register failed:', err));
  });
}

// Показываем версию в интерфейсе — чтобы было видно, какая сборка реально запущена.
function renderVersionTag() {
  const el = document.getElementById('versionTag');
  if (el) el.textContent = APP_VERSION;
}

