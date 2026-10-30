const SudokuUI = (() => {
  const DARK_THEME_COLOR = '#0f141b';
  const LIGHT_THEME_COLOR = '#f4f7fb';

  let toastTimer = null;
  let announceTimer = null;
  let currentTheme = 'system';
  let mediaQuery = null;

  function getMediaQuery() {
    if (!mediaQuery && typeof window !== 'undefined' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }
    return mediaQuery;
  }

  function resolveTheme(theme) {
    if (theme === 'light' || theme === 'dark') return theme;
    const media = getMediaQuery();
    return media && media.matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    currentTheme = SudokuConstants.THEMES.includes(theme) ? theme : 'system';
    const resolved = resolveTheme(currentTheme);

    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;

    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', resolved === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }

    const themeButton = document.getElementById('theme-btn');
    if (themeButton) {
      themeButton.setAttribute(
        'aria-label',
        resolved === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'
      );
      themeButton.setAttribute('title', resolved === 'dark' ? 'Tema claro' : 'Tema escuro');
    }

    return resolved;
  }

  function initTheme(theme) {
    applyTheme(theme);
    const media = getMediaQuery();
    if (media && typeof media.addEventListener === 'function') {
      media.addEventListener('change', () => {
        if (currentTheme === 'system') applyTheme('system');
      });
    }
  }

  function getTheme() {
    return currentTheme;
  }

  function getResolvedTheme() {
    return resolveTheme(currentTheme);
  }

  function toggleTheme() {
    const next = getResolvedTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
  }

  function announce(message) {
    const live = document.getElementById('live-region');
    if (!live) return;

    if (announceTimer) clearTimeout(announceTimer);
    live.textContent = '';
    announceTimer = setTimeout(() => {
      live.textContent = message;
      announceTimer = null;
    }, 30);
  }

  function showToast(message, type = 'info', duration = SudokuConstants.TOAST_DURATION) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    toast.textContent = message;
    toast.className = `toast toast--${type}`;
    toast.hidden = false;

    requestAnimationFrame(() => toast.classList.add('is-visible'));

    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => {
        if (!toast.classList.contains('is-visible')) toast.hidden = true;
      }, 200);
      toastTimer = null;
    }, duration);
  }

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function isAnyDialogOpen() {
    return Boolean(document.querySelector('dialog[open]'));
  }

  function closeFromBackdrop(dialog) {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  }

  function haptic(pattern, enabled) {
    if (!enabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Vibration is a progressive enhancement.
    }
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // Fall through to the legacy path.
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  async function shareResult({ title, text }) {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text });
        return { ok: true, method: 'share' };
      } catch (e) {
        if (e && e.name === 'AbortError') return { ok: false, method: 'cancelled' };
      }
    }

    const copied = await copyText(text);
    return { ok: copied, method: copied ? 'clipboard' : 'failed' };
  }

  function isMac() {
    try {
      return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    } catch (e) {
      return false;
    }
  }

  function setBusy(element, busy) {
    if (!element) return;
    element.setAttribute('aria-busy', String(Boolean(busy)));
    element.classList.toggle('is-busy', Boolean(busy));
  }

  return {
    initTheme,
    applyTheme,
    toggleTheme,
    getTheme,
    getResolvedTheme,
    announce,
    showToast,
    openDialog,
    closeDialog,
    isAnyDialogOpen,
    closeFromBackdrop,
    haptic,
    copyText,
    shareResult,
    isMac,
    setBusy
  };
})();
