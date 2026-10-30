const SudokuStorage = (() => {
  const KEYS = SudokuConstants.STORAGE_KEYS;
  const DIFFICULTIES = Object.keys(SudokuConstants.difficultyConfig);

  let pageTabId = null;
  let storageAvailable = detectStorage();

  function detectStorage() {
    try {
      if (typeof localStorage === 'undefined') return false;
      const probe = '__sudoku_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isAvailable() {
    return storageAvailable;
  }

  function save(key, data) {
    if (!storageAvailable) return false;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      storageAvailable = false;
      console.error(`Failed to save to localStorage (${key}):`, e);
      return false;
    }
  }

  function load(key) {
    if (!storageAvailable) return null;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Failed to load from localStorage (${key}):`, e);
      return null;
    }
  }

  function remove(key) {
    if (!storageAvailable) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove from localStorage (${key}):`, e);
    }
  }

  function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function getTabId() {
    if (!pageTabId) pageTabId = makeId();
    return pageTabId;
  }

  function isMatrix(value) {
    return Array.isArray(value) &&
      value.length === SudokuConstants.BOARD_SIZE &&
      value.every(row =>
        Array.isArray(row) &&
        row.length === SudokuConstants.BOARD_SIZE &&
        row.every(cell => Number.isInteger(cell) && cell >= 0 && cell <= SudokuConstants.BOARD_SIZE)
      );
  }

  function emptyNotes() {
    return Array.from({ length: SudokuConstants.BOARD_SIZE }, () =>
      Array.from({ length: SudokuConstants.BOARD_SIZE }, () => [])
    );
  }

  function normalizeNotes(value) {
    if (!Array.isArray(value) || value.length !== SudokuConstants.BOARD_SIZE) {
      return emptyNotes();
    }

    return value.map(row => {
      if (!Array.isArray(row) || row.length !== SudokuConstants.BOARD_SIZE) {
        return Array.from({ length: SudokuConstants.BOARD_SIZE }, () => []);
      }
      return row.map(cell => {
        if (!Array.isArray(cell)) return [];
        return [...new Set(cell.filter(n =>
          Number.isInteger(n) && n >= 1 && n <= SudokuConstants.BOARD_SIZE
        ))].sort((a, b) => a - b);
      });
    });
  }

  function normalizeBoolMatrix(value) {
    return Array.from({ length: SudokuConstants.BOARD_SIZE }, (_, row) =>
      Array.from({ length: SudokuConstants.BOARD_SIZE }, (_, col) =>
        Boolean(value && Array.isArray(value[row]) && value[row][col])
      )
    );
  }

  function normalizeCell(value) {
    if (!value || typeof value !== 'object') return null;
    const row = Number(value.row);
    const col = Number(value.col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    if (row < 0 || col < 0 || row >= SudokuConstants.BOARD_SIZE || col >= SudokuConstants.BOARD_SIZE) {
      return null;
    }
    return { row, col };
  }

  function normalizeGameState(state) {
    if (!state || typeof state !== 'object') return null;
    if (!isMatrix(state.board) || !isMatrix(state.solution) || !isMatrix(state.initial)) {
      return null;
    }

    const difficulty = DIFFICULTIES.includes(state.difficulty) ? state.difficulty : 'medium';
    const seconds = Number.isFinite(Number(state.seconds))
      ? Math.max(0, Math.floor(Number(state.seconds)))
      : 0;
    const errors = Number.isFinite(Number(state.errors))
      ? Math.max(0, Math.floor(Number(state.errors)))
      : 0;
    const hintsUsed = Number.isFinite(Number(state.hintsUsed))
      ? Math.min(SudokuConstants.MAX_HINTS, Math.max(0, Math.floor(Number(state.hintsUsed))))
      : 0;

    return {
      version: SudokuConstants.SAVE_VERSION,
      board: state.board.map(row => row.map(Number)),
      solution: state.solution.map(row => row.map(Number)),
      initial: state.initial.map(row => row.map(Number)),
      notes: normalizeNotes(state.notes),
      mistakes: normalizeBoolMatrix(state.mistakes),
      hinted: normalizeBoolMatrix(state.hinted),
      selectedCell: normalizeCell(state.selectedCell),
      errors,
      seconds,
      hintsUsed,
      isNoteMode: Boolean(state.isNoteMode),
      difficulty,
      gameOver: Boolean(state.gameOver),
      timerStarted: Boolean(state.timerStarted),
      savedAt: Number.isFinite(Number(state.savedAt)) ? Number(state.savedAt) : Date.now(),
      tabId: typeof state.tabId === 'string' ? state.tabId : null
    };
  }

  function saveGameState(state) {
    return save(KEYS.CURRENT_GAME, {
      ...state,
      version: SudokuConstants.SAVE_VERSION,
      savedAt: Date.now(),
      tabId: getTabId()
    });
  }

  function loadGameState() {
    if (!storageAvailable) return null;

    let raw;
    try {
      const data = localStorage.getItem(KEYS.CURRENT_GAME);
      if (!data) return null;
      raw = JSON.parse(data);
    } catch (e) {
      console.error(`Failed to load from localStorage (${KEYS.CURRENT_GAME}):`, e);
      remove(KEYS.CURRENT_GAME);
      return null;
    }

    const normalized = normalizeGameState(raw);
    if (!normalized) {
      remove(KEYS.CURRENT_GAME);
      return null;
    }
    return normalized;
  }

  function clearGameState() {
    remove(KEYS.CURRENT_GAME);
  }

  function emptyBestTimes() {
    const result = {};
    for (const difficulty of DIFFICULTIES) result[difficulty] = [];
    return result;
  }

  function getBestTimes() {
    const loaded = load(KEYS.BEST_TIMES);
    const result = emptyBestTimes();

    if (!loaded || typeof loaded !== 'object') return result;

    for (const difficulty of DIFFICULTIES) {
      const list = Array.isArray(loaded[difficulty]) ? loaded[difficulty] : [];
      result[difficulty] = list
        .filter(entry => entry && Number.isFinite(Number(entry.time)) && Number(entry.time) > 0)
        .map(entry => ({
          id: typeof entry.id === 'string' ? entry.id : makeId(),
          time: Math.floor(Number(entry.time)),
          date: typeof entry.date === 'string' ? entry.date : '',
          errors: Number.isFinite(Number(entry.errors)) ? Math.max(0, Number(entry.errors)) : 0,
          hints: Number.isFinite(Number(entry.hints)) ? Math.max(0, Number(entry.hints)) : 0
        }))
        .sort((a, b) => a.time - b.time)
        .slice(0, SudokuConstants.BEST_TIMES_LIMIT);
    }

    return result;
  }

  function formatDate(date) {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function saveBestTime(difficulty, seconds, meta = {}) {
    const times = getBestTimes();
    const list = times[difficulty] || [];
    const previousBest = list.length > 0
      ? Math.min(...list.map(entry => entry.time))
      : null;

    const entry = {
      id: makeId(),
      time: Math.max(0, Math.floor(Number(seconds) || 0)),
      date: formatDate(new Date()),
      errors: Math.max(0, Math.floor(Number(meta.errors) || 0)),
      hints: Math.max(0, Math.floor(Number(meta.hints) || 0))
    };

    list.push(entry);
    list.sort((a, b) => a.time - b.time);
    times[difficulty] = list.slice(0, SudokuConstants.BEST_TIMES_LIMIT);
    save(KEYS.BEST_TIMES, times);

    const rank = times[difficulty].findIndex(item => item.id === entry.id);

    return {
      entryId: entry.id,
      isNewRecord: previousBest === null || entry.time < previousBest,
      previousBest,
      rank: rank >= 0 ? rank + 1 : null
    };
  }

  function emptyDifficultyStats() {
    return {
      played: 0,
      won: 0,
      lost: 0,
      abandoned: 0,
      totalTime: 0,
      best: null,
      streak: 0,
      bestStreak: 0,
      hints: 0
    };
  }

  function emptyStats() {
    const difficulties = {};
    for (const difficulty of DIFFICULTIES) {
      difficulties[difficulty] = emptyDifficultyStats();
    }
    return { version: 1, difficulties };
  }

  function getStats() {
    const loaded = load(KEYS.STATS);
    const result = emptyStats();

    if (!loaded || typeof loaded !== 'object' || !loaded.difficulties) {
      return result;
    }

    for (const difficulty of DIFFICULTIES) {
      const source = loaded.difficulties[difficulty];
      if (!source || typeof source !== 'object') continue;
      const target = result.difficulties[difficulty];

      for (const key of ['played', 'won', 'lost', 'abandoned', 'totalTime', 'streak', 'bestStreak', 'hints']) {
        const value = Number(source[key]);
        if (Number.isFinite(value) && value >= 0) target[key] = Math.floor(value);
      }

      if (source.best !== null && source.best !== undefined && Number.isFinite(Number(source.best))) {
        target.best = Math.floor(Number(source.best));
      }
    }

    return result;
  }

  function updateStats(mutator) {
    const stats = getStats();
    mutator(stats);
    save(KEYS.STATS, stats);
    return stats;
  }

  function recordGameStarted(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    updateStats(stats => {
      stats.difficulties[difficulty].played += 1;
    });
  }

  function recordGameWon(difficulty, seconds, hints = 0) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    updateStats(stats => {
      const item = stats.difficulties[difficulty];
      item.won += 1;
      item.totalTime += Math.max(0, Math.floor(seconds));
      item.hints += Math.max(0, Math.floor(hints));
      item.best = item.best === null ? Math.floor(seconds) : Math.min(item.best, Math.floor(seconds));
      item.streak += 1;
      item.bestStreak = Math.max(item.bestStreak, item.streak);
    });
  }

  function recordGameLost(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    updateStats(stats => {
      const item = stats.difficulties[difficulty];
      item.lost += 1;
      item.streak = 0;
    });
  }

  function recordGameAbandoned(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    updateStats(stats => {
      const item = stats.difficulties[difficulty];
      item.abandoned += 1;
      item.streak = 0;
    });
  }

  function resetStats() {
    save(KEYS.STATS, emptyStats());
  }

  function getSettings() {
    const defaults = SudokuConstants.SETTINGS_DEFAULTS;
    const loaded = load(KEYS.SETTINGS);
    if (!loaded || typeof loaded !== 'object') return { ...defaults };

    const settings = { ...defaults };
    const isLegacy = !Number.isFinite(Number(loaded.version));

    if (SudokuConstants.THEMES.includes(loaded.theme)) settings.theme = loaded.theme;
    if (isLegacy && settings.theme === 'system') settings.theme = defaults.theme;
    if (SudokuConstants.ERROR_LIMITS.includes(Number(loaded.errorLimit))) {
      settings.errorLimit = Number(loaded.errorLimit);
    }
    if (SudokuConstants.TIMER_STARTS.includes(loaded.timerStart)) {
      settings.timerStart = loaded.timerStart;
    }

    for (const key of ['keepMistakes', 'autoRemoveNotes', 'highlightSame', 'haptics']) {
      if (typeof loaded[key] === 'boolean') settings[key] = loaded[key];
    }

    return settings;
  }

  function saveSettings(settings) {
    return save(KEYS.SETTINGS, {
      ...settings,
      version: SudokuConstants.SETTINGS_VERSION
    });
  }

  function saveDifficulty(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    save(KEYS.DIFFICULTY, difficulty);
  }

  function loadDifficulty() {
    const difficulty = load(KEYS.DIFFICULTY);
    return typeof difficulty === 'string' && DIFFICULTIES.includes(difficulty)
      ? difficulty
      : null;
  }

  function getFlag(key) {
    return load(key);
  }

  function setFlag(key, value) {
    return save(key, value);
  }

  return {
    save,
    load,
    remove,
    isAvailable,
    getTabId,
    saveGameState,
    loadGameState,
    clearGameState,
    getBestTimes,
    saveBestTime,
    getSettings,
    saveSettings,
    saveDifficulty,
    loadDifficulty,
    getStats,
    recordGameStarted,
    recordGameWon,
    recordGameLost,
    recordGameAbandoned,
    resetStats,
    getFlag,
    setFlag
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SudokuStorage;
}
