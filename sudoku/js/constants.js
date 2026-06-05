const SudokuConstants = {
  BOARD_SIZE: 9,
  BOX_SIZE: 3,
  MAX_HISTORY: 50,
  AUTO_SAVE_INTERVAL: 5000,
  ERROR_FLASH_DURATION: 600,
  MAX_ERRORS: 3,

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

  STORAGE_KEYS: {
    CURRENT_GAME: 'sudoku-current-game',
    BEST_TIMES: 'sudoku-best-times',
    DIFFICULTY: 'sudoku-difficulty'
  },

  BEST_TIMES_LIMIT: 5
};
