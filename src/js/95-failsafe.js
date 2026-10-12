
setTimeout(function() {
  var ov = document.getElementById('loadingOverlay');
  if (ov && getComputedStyle(ov).display !== 'none') {
    console.warn('[FAILSAFE] loading overlay still visible after 6s — forcing hide');
    ov.classList.add('hidden');
    ov.style.display = 'none';
    document.body.classList.remove('splash');
    try {
      if (typeof hideLoading === 'function') hideLoading();
      if (typeof getAccounts === 'function' && getAccounts().length) {
        if (typeof authSetView === 'function') authSetView('choose');
        if (typeof showAuthGate === 'function') showAuthGate();
      } else {
        if (typeof authSetView === 'function') authSetView('setup');
        if (typeof showAuthGate === 'function') showAuthGate();
      }
    } catch(e) { console.error('[FAILSAFE] error:', e); }
  }
}, 4000);
