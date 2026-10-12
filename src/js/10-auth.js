
/* v9.1.1: ozon_* → lt_* — одноразовый перенос ключей localStorage */
(function(){try{if(localStorage.getItem('lt_keys_migrated_v911'))return;
var ks=[];for(var i=0;i<localStorage.length;i++)ks.push(localStorage.key(i));
ks.forEach(function(k){var m=k.replace(/(^|_)ozon_/g,'$1lt_');if(m===k)return;
if(localStorage.getItem(m)===null)localStorage.setItem(m,localStorage.getItem(k));localStorage.removeItem(k);});
localStorage.setItem('lt_keys_migrated_v911','1');}catch(e){}})();

// ====== SUPABASE INIT ======
// v7.1: библиотека грузится с defer и не блокирует парсинг. Deferred-скрипты
// выполняются по порядку, поэтому обычно она уже есть; если CDN не ответил —
// sb остаётся null, все облачные операции тихо пропускаются (как и раньше),
// а при позднем появлении библиотеки клиент создаётся и запускается синк.
let sb = null;
function initSupabase() {
  if (sb || typeof supabase === 'undefined') return !!sb;
  try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch(e) { console.error('Supabase init failed:', e); }
  return !!sb;
}
if (!initSupabase()) {
  const lib = document.querySelector('script[src*="supabase"]');
  if (lib) lib.addEventListener('load', () => { if (initSupabase() && typeof syncCloud === 'function' && typeof appStarted !== 'undefined' && appStarted) syncCloud(); });
}
// Ждём появления клиента (не дольше ms); резолвится и при неудаче — вызывающий сам проверит sb.
function waitSupabase(ms) {
  if (initSupabase()) return Promise.resolve(true);
  return new Promise(res => {
    const t0 = Date.now();
    const tick = () => { if (initSupabase()) res(true); else if (Date.now() - t0 > ms) res(false); else setTimeout(tick, 50); };
    tick();
  });
}

// ====== ДОСТУП: СИСТЕМНЫЙ (DEV) И ОБЫЧНЫЙ ПРОФИЛЬ (v4.6) ======
// Задача: это устройство — «устройство разработчика» (полные права, вход один
// раз и больше не спрашивает), а подключение с ЛЮБОГО другого устройства идёт
// через выбор профиля с логином и паролем. Плюс вход по Face ID / отпечатку.
//
// ЧЕСТНО О МОДЕЛИ БЕЗОПАСНОСТИ: приложение статическое (GitHub Pages) и ходит в
// Supabase анонимным ключом, поэтому это разделение РОЛЕЙ И ИНТЕРФЕЙСА, а не
// криптографическая защита данных. Кто угодно со ссылкой и анонимным ключом
// технически может читать таблицу напрямую, минуя этот экран. Полноценная
// защита требует Supabase Auth + RLS по user_id — это серверная работа.
// Здесь: пароль не хранится в открытом виде (PBKDF2-SHA256, 150k итераций,
// случайная соль), права разграничены, чужой человек с телефона без пароля в
// приложение не войдёт.

const AUTH_KEYS = {
  accounts: 'lt_auth_accounts',   // список профилей (логин + хеш пароля + роль)
  session:  'lt_auth_session',    // кто вошёл на этом устройстве
  device:   'lt_device',          // отпечаток/роль этого устройства
  webauthn: 'lt_webauthn'         // привязка Face ID / отпечатка
};

// Профили — часть общего прогресса, чтобы созданный на ноуте аккаунт работал
// и на телефоне. Добавляется в PROGRESS_KEYS ниже.
const SESSION_TTL_DAYS = 90;

let currentUser = null;

// --- Per-profile localStorage helpers ---
// All user data is namespaced by login so profiles don't share stats/shifts/quests
function uKey(k) {
  const prefix = (currentUser && currentUser.login) ? currentUser.login + '_' : '';
  return prefix + k;
}
function uGet(k, fallback) {
  try { const v = localStorage.getItem(uKey(k)); return v !== null ? JSON.parse(v) : fallback; }
  catch(e) { return fallback; }
}
function uGetRaw(k) { return localStorage.getItem(uKey(k)); }
function uSet(k, v) { try { localStorage.setItem(uKey(k), JSON.stringify(v)); } catch(e) {} }
function uSetRaw(k, v) { try { localStorage.setItem(uKey(k), v); } catch(e) {} }
function uRemove(k) { try { localStorage.removeItem(uKey(k)); } catch(e) {} }

// One-time migration: copy legacy (un-prefixed) localStorage data to namespaced keys
function migrateUserData(login) {
  const flag = login + '_lt_migrated';
  if (localStorage.getItem(flag)) return;
  const keys = [
    'lt_active_shift','lt_shift_meta','lt_life_xp','lt_life_quests',
    'lt_shift_bonuses','lt_chosen_category','lt_weekly_cat',
    'lt_shop_purchases','lt_shop_boosts','lt_active_theme',
    'lt_tracker','lt_pending_shifts','lt_difficulty','lt_xp_restored_v42'
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    const nk = login + '_' + k;
    if (v !== null && localStorage.getItem(nk) === null) {
      localStorage.setItem(nk, v);
    }
  }
  localStorage.setItem(flag, '1');
}
            // { login, name, role }
let deviceInfo = null;             // { id, role, name, createdAt }

function nowMs() { return Date.now(); }

// ---- устройство ----
function getDeviceInfo() {
  try {
    const d = JSON.parse(localStorage.getItem(AUTH_KEYS.device) || 'null');
    if (d && d.id) return d;
  } catch (e) {}
  return null;
}
function saveDeviceInfo(d) {
  try { localStorage.setItem(AUTH_KEYS.device, JSON.stringify(d)); } catch (e) {}
  deviceInfo = d;
}
function makeDeviceId() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}
function guessDeviceName() {
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac OS X/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Устройство';
}
function isDevDevice() { return !!deviceInfo && deviceInfo.role === 'dev'; }

// ---- хеширование пароля (PBKDF2) ----
function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBuf(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
async function hashPassword(password, saltHex) {
  // crypto.subtle доступен только в защищённом контексте (https / localhost).
  // На http:// откатываемся на слабый хеш, но честно это помечаем.
  if (!saltHex) {
    const s = new Uint8Array(16);
    crypto.getRandomValues(s);
    saltHex = bufToHex(s);
  }
  if (!(crypto.subtle && crypto.subtle.importKey)) {
    let h = 0;
    const str = saltHex + '|' + password;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return { salt: saltHex, hash: 'weak:' + (h >>> 0).toString(16), algo: 'weak' };
  }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBuf(saltHex), iterations: 150000, hash: 'SHA-256' },
    key, 256
  );
  return { salt: saltHex, hash: bufToHex(bits), algo: 'pbkdf2-sha256-150k' };
}
async function verifyPassword(password, acc) {
  if (!acc || !acc.salt || !acc.hash) return false;
  const res = await hashPassword(password, acc.salt);
  // сравнение фиксированной длины, без ранних выходов
  if (res.hash.length !== acc.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < res.hash.length; i++) diff |= res.hash.charCodeAt(i) ^ acc.hash.charCodeAt(i);
  return diff === 0;
}

// ---- профили ----
// Живые профили. Удалённые остаются в хранилище как «надгробия»
// (deleted:true) — см. accDelete: без них запись возвращалась бы из облака,
// потому что слияние списков не умеет отличать «удалено» от «ещё не знаю».
function getAccounts() {
  return getAccountsRaw().filter(a => a && !a.deleted);
}
function getAccountsRaw() {
  try {
    const a = JSON.parse(localStorage.getItem(AUTH_KEYS.accounts) || '[]');
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}
function saveAccounts(list) {
  try { localStorage.setItem(AUTH_KEYS.accounts, JSON.stringify(list)); } catch (e) {}
  // профили уезжают в облако — иначе на телефоне не будет куда логиниться
  if (typeof schedulePushProgress === 'function') schedulePushProgress();
}
function findAccount(login) {
  const l = String(login || '').trim().toLowerCase();
  return getAccounts().find(a => a.login.toLowerCase() === l) || null;
}
function hasDevAccount() { return getAccounts().some(a => a.role === 'dev'); }

async function createAccount(login, password, role, name) {
  const l = String(login || '').trim();
  if (l.length < 3) throw new Error('Логин — минимум 3 символа');
  if (String(password || '').length < 4) throw new Error('Пароль — минимум 4 символа');
  if (findAccount(l)) throw new Error('Такой логин уже есть');
  const { salt, hash, algo } = await hashPassword(password);
  const acc = {
    login: l,
    name: (name || l).trim(),
    role: role === 'dev' ? 'dev' : 'user',
    salt, hash, algo,
    createdAt: nowMs()
  };
  // Пишем в полный список и убираем возможное надгробие с тем же логином,
  // иначе merge воскресил бы «удалённый» статус.
  const list = getAccountsRaw().filter(a => a.login.toLowerCase() !== l.toLowerCase());
  list.push(acc);
  saveAccounts(list);
  return acc;
}

// ---- сессия ----
function getSession() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.session) || 'null'); } catch (e) { return null; }
}
function saveSession(login, role) {
  const s = { login, role, at: nowMs() };
  try { localStorage.setItem(AUTH_KEYS.session, JSON.stringify(s)); } catch (e) {}
  return s;
}
function clearSession() {
  try { localStorage.removeItem(AUTH_KEYS.session); } catch (e) {}
  currentUser = null;
}
function sessionValid(s) {
  if (!s || !s.login) return false;
  const acc = findAccount(s.login);
  if (!acc) return false;
  // Системное устройство не разлогинивается по времени — «один раз зайти».
  if (acc.role === 'dev' && isDevDevice()) return true;
  return (nowMs() - (s.at || 0)) < SESSION_TTL_DAYS * 86400000;
}

// ---- права ----
// Чем ограничен обычный профиль: не может удалять/править чужую историю смен,
// импортировать бэкап (это перезатирает все данные) и трогать системные
// настройки. Свою смену вести, квесты и магазин — может.
const PERMS = {
  dev:  { editShifts: true,  deleteShifts: true, importData: true,  manageAccounts: true, system: true },
  user: { editShifts: false, deleteShifts: false, importData: false, manageAccounts: false, system: false }
};
function can(perm) {
  const role = (currentUser && currentUser.role) || 'user';
  const p = PERMS[role] || PERMS.user;
  return !!p[perm];
}
function requirePerm(perm, msg) {
  if (can(perm)) return true;
  showToast(msg || '🔒 Доступно только с устройства разработчика', 'error');
  return false;
}

// ====== WEBAUTHN: FACE ID / ОТПЕЧАТОК ======
// Храним credentialId привязки. Биометрия никуда не передаётся — проверку
// делает сама операционная система, приложение получает только «да/нет».
function getWebauthn() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEYS.webauthn) || 'null'); } catch (e) { return null; }
}
function saveWebauthn(v) {
  try {
    if (v) localStorage.setItem(AUTH_KEYS.webauthn, JSON.stringify(v));
    else localStorage.removeItem(AUTH_KEYS.webauthn);
  } catch (e) {}
}
function webauthnSupported() {
  // WebAuthn требует защищённый контекст: https, либо localhost при отладке.
  const secure = window.isSecureContext || location.protocol === 'https:' ||
                 location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create && secure);
}
function b64urlToBuf(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bufToB64url(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function registerFaceId(login) {
  if (!webauthnSupported()) throw new Error('Face ID недоступен: нужен https и поддержка устройства');
  const acc = findAccount(login);
  if (!acc) throw new Error('Профиль не найден');

  const challenge = new Uint8Array(32); crypto.getRandomValues(challenge);
  const userId = new TextEncoder().encode(acc.login);

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Life Tracker', id: location.hostname },
      user: { id: userId, name: acc.login, displayName: acc.name || acc.login },
      // ES256 и RS256 — покрывают iOS/Android/Windows Hello
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',   // именно встроенная биометрия
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    }
  });
  if (!cred) throw new Error('Привязка отменена');
  saveWebauthn({ id: bufToB64url(cred.rawId), login: acc.login, at: nowMs() });
  return true;
}

async function loginWithFaceId() {
  const wa = getWebauthn();
  if (!wa || !wa.id) throw new Error('Face ID не привязан на этом устройстве');
  if (!webauthnSupported()) throw new Error('Face ID недоступен в этом окружении');

  const challenge = new Uint8Array(32); crypto.getRandomValues(challenge);
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: b64urlToBuf(wa.id), transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000
    }
  });
  if (!assertion) throw new Error('Проверка не пройдена');

  const acc = findAccount(wa.login);
  if (!acc) throw new Error('Привязанный профиль удалён');
  return acc;
}

// ====== ЭКРАН ВХОДА ======
let authView = 'choose';     // 'setup' | 'choose' | 'password' | 'newuser'
let authTargetLogin = null;
let authError = '';

function showAuthGate() {
  const gate = document.getElementById('authGate');
  if (gate) gate.classList.add('show');
  document.body.classList.add('modal-open');
  renderAuthGate();
}
function hideAuthGate() {
  const gate = document.getElementById('authGate');
  if (gate) gate.classList.remove('show');
  document.body.classList.remove('modal-open');
}

// Удаление профиля прямо с экрана выбора (только для dev-устройства, только user-профили)
async function authDeleteProfile(login) {
  const ok = await askConfirm(`Удалить профиль <b>${escapeHtml(login)}</b>?<br>Все данные профиля будут потеряны.`, {
    icon: '🗑️', title: 'Удалить профиль?', okText: 'Удалить', noText: 'Отмена'
  });
  if (!ok) return;
  const accs = getAccounts();
  const next = accs.filter(a => a.login.toLowerCase() !== String(login).toLowerCase());
  if (next.length === accs.length) { showToast('Профиль не найден', 'error'); return; }
  saveAccounts(next);
  const wa = getWebauthn();
  if (wa && wa.login === login) saveWebauthn(null);
  showToast('Профиль удалён', 'warn');
  renderAuthGate();
}

function authSetView(v, login) {
  authView = v;
  authTargetLogin = login || null;
  authError = '';
  renderAuthGate();
}

function renderAuthGate() {
  const card = document.getElementById('authCard');
  if (!card) return;

  const errHtml = authError ? `<div class="auth-err">${escapeHtml(authError)}</div>` : '';
  const accounts = getAccounts();
  const wa = getWebauthn();

  // --- первичная настройка: ни одного профиля ещё нет ---
  if (authView === 'setup') {
    const devHere = isDevDevice();
    card.innerHTML = `
      <div class="auth-logo">🛠️</div>
      <div class="auth-title">НАСТРОЙКА ДОСТУПА</div>
      <div class="auth-sub">${devHere
        ? 'Это устройство помечено как <b style="color:var(--gold)">системное</b>.<br>Создай главный профиль разработчика.'
        : 'Создай главный профиль — он получит полные права.'}</div>
      ${errHtml}
      <div class="auth-field">
        <label class="auth-label">Логин</label>
        <input class="auth-input" id="suLogin" placeholder="neo" autocomplete="username" spellcheck="false">
      </div>
      <div class="auth-field">
        <label class="auth-label">Имя (как показывать)</label>
        <input class="auth-input" id="suName" placeholder="NEO" spellcheck="false">
      </div>
      <div class="auth-field">
        <label class="auth-label">Пароль</label>
        <input class="auth-input" id="suPass" type="password" placeholder="минимум 4 символа" autocomplete="new-password">
      </div>
      <div class="auth-field">
        <label class="auth-label">Повтори пароль</label>
        <input class="auth-input" id="suPass2" type="password" placeholder="ещё раз" autocomplete="new-password">
      </div>
      <button class="auth-btn primary" id="suBtn" onclick="authDoSetup()">🚀 Создать и войти</button>
      <div class="auth-note">Пароль хранится только как хеш (PBKDF2-SHA256).<br>Восстановить его нельзя — запомни.</div>
    `;
    setTimeout(() => { const el = document.getElementById('suLogin'); if (el) el.focus(); }, 120);
    return;
  }

  // --- ввод пароля для выбранного профиля ---
  if (authView === 'password') {
    const acc = findAccount(authTargetLogin);
    const isDevAcc = acc && acc.role === 'dev';
    card.innerHTML = `
      <div class="auth-logo">${isDevAcc ? '🛠️' : '👤'}</div>
      <div class="auth-title">${escapeHtml((acc && (acc.name || acc.login)) || 'Вход')}</div>
      <div class="auth-sub">${isDevAcc ? 'Системный профиль — полные права' : 'Обычный профиль'}</div>
      ${errHtml}
      <div class="auth-field">
        <label class="auth-label">Пароль</label>
        <input class="auth-input" id="pwInput" type="password" placeholder="••••••" autocomplete="current-password">
      </div>
      <button class="auth-btn primary" id="pwBtn" onclick="authDoLogin()">ВОЙТИ</button>
      <button class="auth-btn ghost" onclick="authSetView('choose')">← К списку профилей</button>
    `;
    setTimeout(() => {
      const el = document.getElementById('pwInput');
      if (el) { el.focus(); el.onkeydown = e => { if (e.key === 'Enter') authDoLogin(); }; }
    }, 120);
    return;
  }

  // --- создание обычного профиля с чужого устройства ---
  if (authView === 'newuser') {
    card.innerHTML = `
      <div class="auth-logo">✨</div>
      <div class="auth-title">НОВЫЙ ПРОФИЛЬ</div>
      <div class="auth-sub">Стандартный доступ: смены, задания, магазин.</div>
      ${errHtml}
      <div class="auth-field">
        <label class="auth-label">Логин</label>
        <input class="auth-input" id="nuLogin" placeholder="логин" autocomplete="username" spellcheck="false">
      </div>
      <div class="auth-field">
        <label class="auth-label">Имя</label>
        <input class="auth-input" id="nuName" placeholder="как показывать" spellcheck="false">
      </div>
      <div class="auth-field">
        <label class="auth-label">Пароль</label>
        <input class="auth-input" id="nuPass" type="password" placeholder="минимум 4 символа" autocomplete="new-password">
      </div>
      <button class="auth-btn primary" onclick="authDoCreateUser()">СОЗДАТЬ И ВОЙТИ</button>
      <button class="auth-btn ghost" onclick="authSetView('choose')">← Назад</button>
    `;
    setTimeout(() => { const el = document.getElementById('nuLogin'); if (el) el.focus(); }, 120);
    return;
  }

  // --- выбор профиля (основной экран) ---
  const isDev = isDevDevice();
  const profHtml = accounts.map(a => {
    const canDel = isDev && a.role !== 'dev';
    return `
    <div class="auth-prof-wrap">
      <button class="auth-prof ${a.role === 'dev' ? 'dev' : ''}" data-action="auth-login" data-login="${escapeHtml(a.login)}">
        <div class="ap-ava">${a.role === 'dev' ? '🛠️' : '👤'}</div>
        <div class="ap-meta">
          <div class="ap-name">${escapeHtml(a.name || a.login)}</div>
          <div class="ap-role">${a.role === 'dev' ? 'Разработчик · полный доступ' : 'Обычный профиль'}</div>
        </div>
        <div class="ap-arrow">›</div>
      </button>
      ${canDel ? `<button class="auth-prof-del" data-action="auth-delete" data-login="${escapeHtml(a.login)}" title="Удалить профиль">✕</button>` : ''}
    </div>`;
  }).join('');

  const faceHtml = (wa && wa.id && webauthnSupported()) ? `
    <button class="auth-btn face" onclick="authDoFaceId()">
      ${/iPhone|iPad|Mac/i.test(navigator.userAgent) ? '🫥 Войти по Face ID' : '👆 Войти по отпечатку'}
    </button>
    <div class="auth-divider">или выбери профиль</div>
  ` : '';

  card.innerHTML = `
    <div class="auth-logo">💰</div>
    <div class="auth-title">LIFE TRACKER</div>
    <div class="auth-sub">${isDevDevice()
      ? '🛠️ Системное устройство разработчика'
      : 'Выбери профиль для входа'}</div>
    ${errHtml}
    ${faceHtml}
    <div class="auth-profiles">${profHtml || '<div class="acc-empty">Профилей нет</div>'}</div>
    <button class="auth-btn ghost" onclick="authSetView('newuser')">+ Новый профиль</button>
  `;
}


// Event delegation for auth gate buttons (avoids broken inline onclick with quotes)
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const login = btn.dataset.login;
  if (action === 'auth-login') { authSetView('password', login); }
  else if (action === 'auth-delete') { e.stopPropagation(); authDeleteProfile(login); }
  else if (action === 'acc-delete') { accDelete(login); }
});

async function authDoSetup() {
  const login = (document.getElementById('suLogin') || {}).value || '';
  const name  = (document.getElementById('suName')  || {}).value || '';
  const p1    = (document.getElementById('suPass')  || {}).value || '';
  const p2    = (document.getElementById('suPass2') || {}).value || '';
  const btn = document.getElementById('suBtn');

  if (p1 !== p2) { authError = 'Пароли не совпадают'; renderAuthGate(); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Создаю…'; }
  try {
    const acc = await createAccount(login, p1, 'dev', name);
    // Устройство, на котором создан главный профиль, становится системным.
    const d = getDeviceInfo() || { id: makeDeviceId(), createdAt: nowMs() };
    d.role = 'dev';
    d.name = d.name || guessDeviceName();
    d.owner = acc.login;
    saveDeviceInfo(d);
    await authEnter(acc);
  } catch (e) {
    authError = e.message || 'Не получилось';
    renderAuthGate();
  }
}

async function authDoLogin() {
  const pass = (document.getElementById('pwInput') || {}).value || '';
  const btn = document.getElementById('pwBtn');
  const acc = findAccount(authTargetLogin);
  if (!acc) { authError = 'Профиль не найден'; renderAuthGate(); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Проверяю…'; }
  const ok = await verifyPassword(pass, acc);
  if (!ok) {
    authError = 'Неверный пароль';
    renderAuthGate();
    return;
  }
  await authEnter(acc);
}

async function authDoCreateUser() {
  const login = (document.getElementById('nuLogin') || {}).value || '';
  const name  = (document.getElementById('nuName')  || {}).value || '';
  const pass  = (document.getElementById('nuPass')  || {}).value || '';

  try {
    const acc = await createAccount(login, pass, 'user', name);
    await authEnter(acc);
  } catch (e) {
    authError = e.message || 'Не получилось';
    renderAuthGate();
  }
}

async function authDoFaceId() {
  try {
    const acc = await loginWithFaceId();
    await authEnter(acc);
  } catch (e) {
    authError = e.message || 'Face ID не сработал';
    renderAuthGate();
  }
}

// Вход состоялся: фиксируем сессию, роль и запускаем приложение.
async function authEnter(acc) {
  currentUser = { login: acc.login, name: acc.name || acc.login, role: acc.role };
  saveSession(acc.login, acc.role);

  // Migrate legacy data (no prefix) to namespaced keys for this user
  migrateUserData(acc.login);

  // Reload per-user variables now that currentUser is set
  activeShift = uGet('lt_active_shift', null);
  difficulty = uGetRaw('lt_difficulty') || 'normal';

  // Устройство ещё не представлено — регистрируем как обычное.
  if (!getDeviceInfo()) {
    saveDeviceInfo({ id: makeDeviceId(), role: acc.role === 'dev' ? 'dev' : 'user',
                     name: guessDeviceName(), owner: acc.login, createdAt: nowMs() });
  }

  applyRoleToUI();
  hideAuthGate();

  // Приложение инициализируем только ПОСЛЕ входа — иначе данные
  // отрисовались бы под экраном блокировки.
  if (!appStarted) { appStarted = true; await init(); }
  else { render(); renderLifeQuests(); renderLifeStats(); }

  // Предлагаем привязать биометрию — один раз, после первого успешного входа.
  maybeOfferFaceId();
}

function applyRoleToUI() {
  const dev = !!(currentUser && currentUser.role === 'dev');
  document.body.classList.toggle('role-dev', dev);
  document.body.classList.toggle('role-user', !dev);

  const ident = document.getElementById('headerIdent');
  if (ident && currentUser) {
    ident.innerHTML = `
      <span class="hi-name">${escapeHtml(currentUser.name || currentUser.login)}</span>
      <span class="role-badge ${dev ? 'dev' : 'user'}">${dev ? '🛠️ Разработчик' : '👤 Профиль'}</span>
    `;
  } else if (ident) {
    ident.innerHTML = '';
  }
}

function maybeOfferFaceId() {
  if (!webauthnSupported()) return;
  if (getWebauthn()) return;
  if (localStorage.getItem('lt_faceid_asked') === '1') return;
  setTimeout(async () => {
    // Падеж: «вход по Face ID», но «вход по отпечатку» — иначе кривая фраза.
    const isApple = /iPhone|iPad|Mac/i.test(navigator.userAgent);
    const label = isApple ? 'Face ID' : 'отпечатку';
    try { localStorage.setItem('lt_faceid_asked', '1'); } catch (e) {}
    const ok = await askConfirm(`Входить одним касанием, без ввода пароля.`,
      { icon: isApple ? '🫥' : '👆', title: `Включить вход по ${label}?`, okText: 'Включить', noText: 'Потом' });
    if (!ok) return;
    try {
      await registerFaceId(currentUser.login);
      showToast('🫥 Быстрый вход включён!', 'success');
    } catch (e) { showToast('Не удалось: ' + (e.message || ''), 'error'); }
  }, 2500);
}

// Точка входа в защиту: решаем, пускать сразу или показать экран входа.
let appStarted = false;
async function bootAuth() {
  deviceInfo = getDeviceInfo();

  // Если есть действующая сессия — входим МГНОВЕННО, без сети.
  const s = getSession();
  if (sessionValid(s)) {
    const acc = findAccount(s.login);
    if (acc) {
      currentUser = { login: acc.login, name: acc.name || acc.login, role: acc.role };
      applyRoleToUI();
      hideAuthGate();
      appStarted = true;
      await init();
      // Профили — часть прогресса, их подтянет pullProgress() внутри syncCloud().
      // Отдельный pullAccountsOnly() здесь только дублировал запрос к app_state.
      return;
    }
  }

  // Нет сессии — нужен экран входа, для него тянем список профилей из облака.
  // Библиотека Supabase грузится с defer — даём ей до 1.5с подъехать.
  try {
    await Promise.race([
      waitSupabase(1500).then(() => pullAccountsOnly()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('pull timeout')), 3000))
    ]);
  } catch (e) { console.warn('accounts pull:', e); }

  const accounts = getAccounts();

  // Совсем первый запуск — настройка. Это устройство станет системным.
  if (!accounts.length) {
    if (!deviceInfo) {
      saveDeviceInfo({ id: makeDeviceId(), role: 'dev', name: guessDeviceName(), createdAt: nowMs() });
    }
    hideLoading();
    authSetView('setup');
    showAuthGate();
    return;
  }

  hideLoading();
  authSetView('choose');
  showAuthGate();
}

// Тянем из облака ТОЛЬКО список профилей (до полной инициализации).
async function pullAccountsOnly() {
  if (!sb) return;
  const apply = (payload) => {
    if (!payload) return;
    const raw = payload[AUTH_KEYS.accounts];
    if (!raw) return;
    try {
      const cloud = JSON.parse(raw);
      if (!Array.isArray(cloud) || !cloud.length) return;
      // Переиспользуем общее слияние (учитывает надгробия и время записи),
      // чтобы логика объединения профилей жила в одном месте.
      const merged = mergeAccounts(localStorage.getItem(AUTH_KEYS.accounts), raw);
      localStorage.setItem(AUTH_KEYS.accounts, merged);
    } catch (e) {}
  };

  try {
    const { data, error } = await sb.from('app_state').select('value').eq('key', 'progress').maybeSingle();
    if (!error && data && data.value) { apply(data.value); return; }
  } catch (e) {}

  try {
    const userDiff = currentUser ? currentUser.login : 'dev';
    const { data } = await sb.from('shifts').select('note').eq('date', PROGRESS_ROW_DATE).eq('difficulty', userDiff).limit(1);
    if (data && data.length) {
      const raw = String(data[0].note || '');
      if (raw.startsWith(PROGRESS_ROW_TAG)) apply(JSON.parse(raw.slice(PROGRESS_ROW_TAG.length)));
    }
  } catch (e) {}
}

async function logout() {
  const ok = await askConfirm('Прогресс останется в облаке — зайдёшь обратно по паролю или Face ID.',
    { icon: '🚪', title: 'Выйти из профиля?', okText: 'Выйти', noText: 'Остаться' });
  if (!ok) return;
  clearSession();
  location.reload();
}

// ====== МОДАЛКИ ВМЕСТО prompt()/confirm() ======
// Зачем: системный prompt() показывает пароль ОТКРЫТЫМ текстом (нет type=password)
// и в установленной PWA выглядит чужеродно. Эти промисы дают нормальное
// поле-пароль и единый стиль.
let askResolver = null;

function askClose(val) {
  const ov = document.getElementById('askOverlay');
  if (ov) ov.classList.remove('show');
  document.body.classList.remove('modal-open');
  const r = askResolver;
  askResolver = null;
  if (r) r(val);
}

function askConfirm(text, opts = {}) {
  const { icon = '❓', title = 'Подтверди', okText = 'Да', noText = 'Отмена' } = opts;
  return new Promise(resolve => {
    askResolver = resolve;
    document.getElementById('askBox').innerHTML = `
      <div class="ask-ico">${icon}</div>
      <div class="ask-title">${escapeHtml(title)}</div>
      <div class="ask-text">${text}</div>
      <div class="ask-row">
        ${noText ? `<button class="ask-btn no" onclick="askClose(false)">${escapeHtml(noText)}</button>` : ''}
        <button class="ask-btn ok" onclick="askClose(true)">${escapeHtml(okText)}</button>
      </div>`;
    document.getElementById('askOverlay').classList.add('show');
    document.body.classList.add('modal-open');
  });
}

// Один или несколько полей. Возвращает объект значений или null при отмене.
function askForm(fields, opts = {}) {
  const { icon = '✏️', title = 'Введи данные', text = '', okText = 'OK' } = opts;
  return new Promise(resolve => {
    askResolver = resolve;
    const inputs = fields.map(f => {
      // v6: поддержка select и textarea, а не только input
      if (f.type === 'select') {
        const opts = (f.options || []).map(o => {
          const val = (o && typeof o === 'object') ? o.value : o;
          const lbl = (o && typeof o === 'object') ? (o.label != null ? o.label : o.value) : o;
          const sel = String(val) === String(f.value || '') ? ' selected' : '';
          return `<option value="${escapeHtml(String(val))}"${sel}>${escapeHtml(String(lbl))}</option>`;
        }).join('');
        return `
      <div class="auth-field">
        <label class="auth-label">${escapeHtml(f.label)}</label>
        <select class="auth-input" id="ask_${f.key}">${opts}</select>
      </div>`;
      }
      if (f.type === 'textarea') {
        return `
      <div class="auth-field">
        <label class="auth-label">${escapeHtml(f.label)}</label>
        <textarea class="auth-input" id="ask_${f.key}" rows="${f.rows || 3}"
                  placeholder="${escapeHtml(f.placeholder || '')}"
                  style="resize:vertical">${escapeHtml(f.value || '')}</textarea>
      </div>`;
      }
      return `
      <div class="auth-field">
        <label class="auth-label">${escapeHtml(f.label)}</label>
        <input class="auth-input" id="ask_${f.key}" type="${f.type || 'text'}"
               placeholder="${escapeHtml(f.placeholder || '')}"
               value="${escapeHtml(f.value || '')}"
               ${f.type === 'password' ? 'autocomplete="new-password"' : 'spellcheck="false"'}>
      </div>`;
    }).join('');
    document.getElementById('askBox').innerHTML = `
      <div class="ask-ico">${icon}</div>
      <div class="ask-title">${escapeHtml(title)}</div>
      ${text ? `<div class="ask-text">${text}</div>` : ''}
      ${inputs}
      <div class="ask-err" id="askErr"></div>
      <div class="ask-row">
        <button class="ask-btn no" onclick="askClose(null)">Отмена</button>
        <button class="ask-btn ok" onclick="askSubmitForm()">${escapeHtml(okText)}</button>
      </div>`;
    document.getElementById('askOverlay').classList.add('show');
    window.__askFields = fields;
    setTimeout(() => {
      const first = document.getElementById('ask_' + fields[0].key);
      if (first) {
        first.focus();
        // Enter отправляет форму — на телефоне так привычнее
        document.getElementById('askBox').onkeydown = e => { if (e.key === 'Enter') askSubmitForm(); };
      }
    }, 120);
  });
}

function askSubmitForm() {
  const fields = window.__askFields || [];
  const out = {};
  for (const f of fields) {
    const el = document.getElementById('ask_' + f.key);
    out[f.key] = el ? el.value : '';
  }
  askClose(out);
}

// ====== МОДАЛКА «ПРОФИЛЬ И ДОСТУП» ======
function openAccountModal() {
  renderAccountModal();
  document.getElementById('accountModal').classList.add('show');
  document.body.classList.add('modal-open');
}
function closeAccountModal() {
  document.getElementById('accountModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

function renderAccountModal() {
  const el = document.getElementById('accountBody');
  if (!el) return;
  // ВАЖНО: различаем «устройство системное» и «вошедший имеет права».
  // Раньше тут был только isDevDevice(), и обычный профиль, залогиненный на
  // системном устройстве, видел кнопки удаления профилей и снятия статуса.
  const devDevice = isDevDevice();
  const canManage = can('manageAccounts');
  const wa = getWebauthn();
  const accounts = getAccounts();
  const d = deviceInfo || {};

  const faceRow = webauthnSupported() ? `
    <div class="acc-row">
      <div class="ar-main">
        <div class="ar-t">${/iPhone|iPad|Mac/i.test(navigator.userAgent) ? '🫥 Face ID' : '👆 Отпечаток'}</div>
        <div class="ar-s">${wa ? 'привязан к «' + escapeHtml(wa.login) + '»' : 'быстрый вход без пароля'}</div>
      </div>
      ${wa
        ? `<button class="acc-mini danger" onclick="accUnbindFace()">Отвязать</button>`
        : `<button class="acc-mini go" onclick="accBindFace()">Включить</button>`}
    </div>` : `
    <div class="acc-row">
      <div class="ar-main">
        <div class="ar-t">🫥 Быстрый вход</div>
        <div class="ar-s">Недоступен: нужен https и поддержка устройства</div>
      </div>
    </div>`;

  const accRows = accounts.map(a => {
    const isMe = currentUser && a.login === currentUser.login;
    return `
      <div class="acc-row ${isMe ? 'acc-this' : ''}">
        <div class="ar-main">
          <div class="ar-t">${a.role === 'dev' ? '🛠️' : '👤'} ${escapeHtml(a.name || a.login)}${isMe ? ' · это ты' : ''}</div>
          <div class="ar-s">${escapeHtml(a.login)} · ${a.role === 'dev' ? 'разработчик' : 'обычный'}</div>
        </div>
        ${(canManage && !(isMe && a.role === 'dev')) ? `<button class="acc-mini danger" data-action="acc-delete" data-login="${escapeHtml(a.login)}">Удалить</button>` : ''}
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="acc-sec">
      <h4>Текущий вход</h4>
      <div class="acc-row acc-this">
        <div class="ar-main">
          <div class="ar-t">${currentUser ? escapeHtml(currentUser.name || currentUser.login) : '—'}</div>
          <div class="ar-s">${currentUser && currentUser.role === 'dev'
            ? 'Полные права: правка и удаление смен, импорт, управление профилями'
            : 'Стандартный доступ: смены, задания, магазин'}</div>
        </div>
        <button class="acc-mini danger" onclick="logout()">Выйти</button>
      </div>
    </div>

    <div class="acc-sec">
      <h4>Это устройство</h4>
      <div class="acc-row">
        <div class="ar-main">
          <div class="ar-t">${devDevice ? '🛠️ Системное (разработчик)' : '📱 ' + escapeHtml(d.name || guessDeviceName())}</div>
          <div class="ar-s">${devDevice
            ? 'Вход запоминается навсегда, доступны все функции'
            : 'Обычное устройство · вход по логину и паролю'}</div>
        </div>
        ${devDevice
          ? (canManage ? `<button class="acc-mini danger" onclick="accRevokeDevice()">Снять</button>` : '')
          : `<button class="acc-mini go" onclick="accMakeDevDevice()">Сделать системным</button>`}
      </div>
      ${faceRow}
    </div>

    <div class="acc-sec">
      <h4>Профили (${accounts.length})</h4>
      ${accRows || '<div class="acc-empty">Пусто</div>'}
      ${canManage
        ? `<button class="acc-mini go" style="width:100%;margin-top:6px;padding:10px" onclick="accAddUser()">+ Добавить профиль</button>`
        : ''}
    </div>
  `;
}

async function accBindFace() {
  try {
    await registerFaceId(currentUser.login);
    showToast('🫥 Быстрый вход включён!', 'success');
    renderAccountModal();
  } catch (e) { showToast('Не удалось: ' + (e.message || ''), 'error'); }
}
function accUnbindFace() {
  saveWebauthn(null);
  showToast('Быстрый вход отключён', 'warn');
  renderAccountModal();
}

// Повысить устройство до системного можно только зная пароль dev-профиля —
// иначе чужой телефон сам себе выдал бы полные права.
async function accMakeDevDevice() {
  const devAcc = getAccounts().find(a => a.role === 'dev');
  if (!devAcc) { showToast('Нет профиля разработчика', 'error'); return; }
  const res = await askForm(
    [{ key: 'pass', label: 'Пароль разработчика', type: 'password', placeholder: '••••••' }],
    { icon: '🛠️', title: 'Подтверди права',
      text: `Введи пароль профиля «${escapeHtml(devAcc.name || devAcc.login)}», чтобы сделать это устройство системным.`,
      okText: 'Подтвердить' });
  if (!res) return;
  if (!(await verifyPassword(res.pass, devAcc))) { showToast('Неверный пароль', 'error'); return; }

  const d = getDeviceInfo() || { id: makeDeviceId(), createdAt: nowMs() };
  d.role = 'dev';
  d.name = d.name || guessDeviceName();
  d.owner = devAcc.login;
  saveDeviceInfo(d);

  currentUser = { login: devAcc.login, name: devAcc.name || devAcc.login, role: 'dev' };
  saveSession(devAcc.login, 'dev');
  applyRoleToUI();
  render();
  renderAccountModal();
  showToast('🛠️ Устройство получило системный статус', 'success');
}

async function accRevokeDevice() {
  const ok = await askConfirm('Полные права пропадут, вход снова будет спрашивать пароль.',
    { icon: '⚠️', title: 'Снять статус системного?', okText: 'Снять', noText: 'Отмена' });
  if (!ok) return;
  const d = getDeviceInfo() || { id: makeDeviceId(), createdAt: nowMs() };
  d.role = 'user';
  saveDeviceInfo(d);
  clearSession();
  showToast('Статус снят', 'warn');
  setTimeout(() => location.reload(), 700);
}

async function accAddUser() {
  if (!requirePerm('manageAccounts', '🔒 Создавать профили может только разработчик')) return;
  const res = await askForm([
    { key: 'login', label: 'Логин',  placeholder: 'например, anna' },
    { key: 'name',  label: 'Имя',    placeholder: 'как показывать' },
    { key: 'pass',  label: 'Пароль', type: 'password', placeholder: 'минимум 4 символа' }
  ], { icon: '✨', title: 'Новый профиль', okText: 'Создать' });
  if (!res || !res.login || !res.pass) return;

  // Новые профили ВСЕГДА обычные — права разработчика только у главного.
  try {
    await createAccount(res.login, res.pass, 'user', res.name || res.login);
    showToast('✅ Профиль создан', 'success');
    renderAccountModal();
  } catch (e) { showToast(e.message || 'Ошибка', 'error'); }
}

async function accDelete(login) {
  if (!requirePerm('manageAccounts')) return;
  const acc = findAccount(login);
  if (!acc) return;
  if (acc.role === 'dev' && getAccounts().filter(a => a.role === 'dev').length <= 1) {
    showToast('Нельзя удалить последний профиль разработчика', 'error');
    return;
  }
  const ok = await askConfirm(`Профиль «${escapeHtml(acc.name || acc.login)}» больше не сможет войти.`,
    { icon: '🗑', title: 'Удалить профиль?', okText: 'Удалить', noText: 'Отмена' });
  if (!ok) return;
  // Не вырезаем запись, а помечаем удалённой с текущим временем —
  // иначе облако вернуло бы профиль назад при следующей синхронизации.
  const next = getAccountsRaw().map(a =>
    a.login.toLowerCase() === String(login).toLowerCase()
      ? { login: a.login, role: a.role, deleted: true, updatedAt: nowMs() }
      : a);
  saveAccounts(next);
  const wa = getWebauthn();
  if (wa && wa.login === acc.login) saveWebauthn(null);
  showToast('Профиль удалён', 'warn');
  // Если удалили свой текущий профиль — разлогиниваем
  if (currentUser && currentUser.login.toLowerCase() === String(login).toLowerCase()) {
    clearSession();
    setTimeout(() => location.reload(), 600);
    return;
  }
  renderAccountModal();
}

