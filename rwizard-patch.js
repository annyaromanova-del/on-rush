/* R Wizard patch: фикс модалки имени + фон по времени суток
   Ничего в существующие файлы трогать не нужно — скрипт сам «врежется» нежно. */

(function () {
  // ---------- УТИЛИТЫ ----------
  const NAME_KEY = 'playerName';
  const DAY_BG_URL = 'assets/bg_day.jpg';       // добавь свой файл сюда
  const NIGHT_BG_URL = detectNightBg();         // постараемся взять текущий ночной фон, иначе оставим пустым
  const GAME_ROOT_SEL = '#game-root';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn, { passive: true });

  function normalizeName(s) {
    return (s ?? '').replace(/\s+/g, ' ').trim();
  }
  function isValidName(raw) {
    const s = normalizeName(raw);
    return s.length >= 1 && s.length <= 20 && /^[\p{L}\p{N}_ -]+$/u.test(s);
  }

  // Ищем ночной фон из инлайнов/стилей, если уже есть
  function detectNightBg() {
    const root = $(GAME_ROOT_SEL) || document.body;
    const styleUrl = (getComputedStyle(root).backgroundImage || '').replace(/^url\([\"']?/, '').replace(/[\"']?\)$/, '');
    return (styleUrl && styleUrl !== 'none') ? styleUrl : 'assets/bg_night.jpg';
  }

  // День/ночь
  function isNight(date = new Date()) {
    const h = date.getHours();
    return h >= 20 || h < 6; // конфигурируй при желании
  }
  function applyTheme() {
    const root = $(GAME_ROOT_SEL) || document.body;
    if (!root.id) root.id = 'game-root'; // бережно назначим id, если не было
    const night = isNight();
    root.classList.toggle('theme--night', night);
    root.classList.toggle('theme--day', !night);
    const bg = night ? NIGHT_BG_URL : DAY_BG_URL;
    // Если у проекта своя система фоновых слоёв — этот бэкграунд безопасно перекроет body/root
    root.style.backgroundImage = `url("${bg}")`;
  }

  // Старт игры (пытаемся дернуть твой реальный стартер без лома)
  function startGameSafe() {
    try {
      if (typeof startGame === 'function') return startGame();
      if (window.game?.scene?.start) return window.game.scene.start('Game');
      // Если у тебя кастомный роутер/скрытие экрана — достаточно спрятать модалку; игра уже может быть запущена
    } catch (e) {
      // молча, т.к. цель — не мешать проекту
    }
  }

  // Попытка подцепиться к существующей модалке
  function wireExistingNameModal() {
    // 1) по явным селекторам
    let input = $('#leaderboard-name');
    let saveBtn = $('#btn-save-name');
    let skipBtn = $('#btn-skip-name');
    let errBox = $('#name-error');

    // 2) эвристикой по текстам
    if (!input) {
      input = $$('input, input[type="text"], input[type="search"]').find(el => el.offsetParent !== null && (el.placeholder?.toLowerCase().includes('имя') || el.placeholder?.toLowerCase().includes('name')));
    }
    if (!saveBtn) {
      saveBtn = $$('button, [role="button"]').find(b => b.offsetParent !== null && /сохранить/i.test(b.textContent));
    }
    if (!skipBtn) {
      skipBtn = $$('button, [role="button"]').find(b => b.offsetParent !== null && /пропустить|skip/i.test(b.textContent));
    }

    if (!input || !saveBtn) return false;

    const showError = (msg) => {
      if (!errBox) return;
      errBox.textContent = msg;
      errBox.hidden = !msg;
    };

    const applyName = () => {
      const raw = input.value ?? '';
      const name = normalizeName(raw);
      if (!isValidName(name)) {
        showError('Введите имя 1–20 символов. Допустимы буквы, цифры, пробел, "_" и "-".');
        return;
      }
      localStorage.setItem(NAME_KEY, name);
      showError('');
      const modal = input.closest('.modal, [role="dialog"]');
      modal?.classList?.add('rwz-hidden');
      startGameSafe();
    };

    on(input, 'input', () => {
      if (saveBtn) saveBtn.disabled = !isValidName(input.value);
      if (isValidName(input.value)) showError('');
    });
    on(saveBtn, 'click', (e) => { e.preventDefault?.(); applyName(); });
    if (skipBtn) {
      on(skipBtn, 'click', (e) => {
        e.preventDefault?.();
        if (!localStorage.getItem(NAME_KEY)) localStorage.setItem(NAME_KEY, 'Гость');
        const modal = input.closest('.modal, [role="dialog"]');
        modal?.classList?.add('rwz-hidden');
        startGameSafe();
      });
    }

    const saved = localStorage.getItem(NAME_KEY);
    if (saved) {
      input.value = saved;
      if (saveBtn) saveBtn.disabled = !isValidName(saved);
    }

    return true;
  }

  // Фолбэк модалка
  function mountFallbackModal() {
    if (localStorage.getItem(NAME_KEY)) return;

    const host = document.createElement('div');
    host.id = 'rwz-name-modal';
    host.className = 'rwz-fallback';
    host.innerHTML = `
      <div class="rwz-card">
        <h2>Как вас подписывать?</h2>
        <p class="hint">Имя для таблицы лидеров (можно изменить позже)</p>
        <input id="rwz-name-input" type="text" maxlength="20" placeholder="Ваше имя" />
        <div class="actions">
          <button id="rwz-save" class="primary" disabled>Сохранить</button>
          <button id="rwz-skip">Пропустить</button>
        </div>
        <div id="rwz-err" class="error"></div>
      </div>
    `;
    document.body.appendChild(host);

    const input = host.querySelector('#rwz-name-input');
    const save = host.querySelector('#rwz-save');
    const skip = host.querySelector('#rwz-skip');
    const err = host.querySelector('#rwz-err');

    const showError = (msg) => { err.textContent = msg || ''; };

    input.addEventListener('input', () => {
      save.disabled = !isValidName(input.value);
      if (!save.disabled) showError('');
    });
    save.addEventListener('click', () => {
      const name = normalizeName(input.value);
      if (!isValidName(name)) { showError('Введите имя 1–20 символов.'); return; }
      localStorage.setItem(NAME_KEY, name);
      host.remove();
      startGameSafe();
    });
    skip.addEventListener('click', () => {
      if (!localStorage.getItem(NAME_KEY)) localStorage.setItem(NAME_KEY, 'Гость');
      host.remove();
      startGameSafe();
    });
  }

  // ---------- ЗАПУСК ----------
  document.addEventListener('DOMContentLoaded', () => {
    // 1) Фон день/ночь
    applyTheme();
    setInterval(applyTheme, 60_000);

    // 2) Имя игрока
    const ok = wireExistingNameModal();
    if (!ok) mountFallbackModal();
  });
})();