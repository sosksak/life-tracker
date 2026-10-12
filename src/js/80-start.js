// ====== START ======
// v7.1: запуск перенесён В КОНЕЦ основного скрипта. Раньше bootAuth() стоял на
// 5000 строк выше хуков v6/v7 над init()/bootV6(); при валидной сессии init()
// отрабатывал синхронно ДО установки хуков, и дашборд строился только по
// аварийному таймеру через 5 секунд — пустой экран на старте.
// Приложение не стартует напрямую: сначала проверка доступа.
// bootAuth() сам вызовет init(), когда вход состоялся.
// Safety timeout: если bootAuth зависнет (Supabase не ответит), 
// через 5 секунд принудительно прячем лоадер и показываем экран входа.
{
  let bootDone = false;
  bootAuth().then(() => { bootDone = true; }).catch(e => {
    console.error('bootAuth failed:', e);
    bootDone = true;
    hideLoading();
    if (getAccounts().length) { authSetView('choose'); showAuthGate(); }
    else { authSetView('setup'); showAuthGate(); }
  });
  setTimeout(() => {
    if (!bootDone) {
      console.warn('bootAuth timeout — forcing UI');
      hideLoading();
      if (getAccounts().length) { authSetView('choose'); showAuthGate(); }
      else { authSetView('setup'); showAuthGate(); }
    }
  }, 3000);
}



