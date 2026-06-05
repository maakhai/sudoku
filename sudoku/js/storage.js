const SudokuStorage = (() => {
  const KEYS = SudokuConstants.STORAGE_KEYS;

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Failed to save to localStorage (${key}):`, e);
      return false;
    }
  }

  function load(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Failed to load from localStorage (${key}):`, e);
      return null;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  function saveGameState(state) {
    return save(KEYS.CURRENT_GAME, state);
  }

  function loadGameState() {
    return load(KEYS.CURRENT_GAME);
  }

  function clearGameState() {
    remove(KEYS.CURRENT_GAME);
  }

  function getBestTimes() {
    return load(KEYS.BEST_TIMES) || {
      easy: [], medium: [], hard: [], professional: [], master: []
    };
  }

  function saveBestTime(difficulty, seconds) {
    const times = getBestTimes();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const entry = { time: seconds, date: dateStr };
    times[difficulty].push(entry);
    times[difficulty].sort((a, b) => a.time - b.time);
    times[difficulty] = times[difficulty].slice(0, SudokuConstants.BEST_TIMES_LIMIT);

    save(KEYS.BEST_TIMES, times);

    return times[difficulty][0].time === seconds;
  }

  function saveDifficulty(difficulty) {
    try {
      localStorage.setItem(KEYS.DIFFICULTY, difficulty);
    } catch (e) {}
  }

  function loadDifficulty() {
    try {
      return localStorage.getItem(KEYS.DIFFICULTY);
    } catch (e) {
      return null;
    }
  }

  return {
    saveGameState,
    loadGameState,
    clearGameState,
    getBestTimes,
    saveBestTime,
    saveDifficulty,
    loadDifficulty
  };
})();
