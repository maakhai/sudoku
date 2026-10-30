const SudokuConstants = {
  BOARD_SIZE: 9,
  BOX_SIZE: 3,
  MAX_HISTORY: 100,
  MAX_HINTS: 3,
  AUTO_SAVE_INTERVAL: 5000,
  ERROR_FLASH_DURATION: 700,
  MAX_ERRORS: 3,
  SAVE_VERSION: 2,
  TOAST_DURATION: 3200,

  difficultyConfig: {
    easy: 30,
    medium: 40,
    hard: 50,
    professional: 55,
    master: 60
  },

  difficultyNames: {
    easy: 'Fácil',
    medium: 'Médio',
    hard: 'Difícil',
    professional: 'Profissional',
    master: 'Mestre'
  },

  difficultyDescriptions: {
    easy: 'Ideal para aquecer e aprender as regras.',
    medium: 'Um desafio equilibrado para o dia a dia.',
    hard: 'Exige paciência e boas anotações.',
    professional: 'Poucas pistas e muitas deduções.',
    master: 'Para quem gosta de um bom quebra-cabeça.'
  },

  STORAGE_KEYS: {
    CURRENT_GAME: 'sudoku-current-game',
    BEST_TIMES: 'sudoku-best-times',
    DIFFICULTY: 'sudoku-difficulty',
    SETTINGS: 'sudoku-settings',
    STATS: 'sudoku-stats',
    SEEN_TIP: 'sudoku-seen-tip',
    TAB_ID: 'sudoku-tab-id'
  },

  BEST_TIMES_LIMIT: 5,

  SETTINGS_DEFAULTS: {
    theme: 'system',
    errorLimit: 3,
    keepMistakes: false,
    autoRemoveNotes: true,
    highlightSame: true,
    timerStart: 'first-move',
    haptics: true
  },

  THEMES: ['system', 'light', 'dark'],
  ERROR_LIMITS: [3, 5, 0],
  TIMER_STARTS: ['first-move', 'on-load']
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SudokuConstants;
}
