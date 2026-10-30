// Storage and persistence tests.
// Run with: node tests/storage.test.js

class StorageMock {
  constructor() {
    this.data = new Map();
  }

  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }

  setItem(key, value) {
    this.data.set(key, String(value));
  }

  removeItem(key) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }
}

global.SudokuConstants = require('../js/constants.js');
global.localStorage = new StorageMock();
global.sessionStorage = new StorageMock();

const SudokuStorage = require('../js/storage.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function describe(name, fn) {
  console.log(`\n📋 ${name}`);
  fn();
}

function reset() {
  localStorage.clear();
  sessionStorage.clear();
}

function makeBoard(fill = 0) {
  return Array.from({ length: 9 }, () => Array(9).fill(fill));
}

function makeNotes() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
}

function makeGameState(overrides = {}) {
  return {
    board: makeBoard(),
    solution: makeBoard(1),
    initial: makeBoard(),
    notes: makeNotes(),
    mistakes: Array.from({ length: 9 }, () => Array(9).fill(false)),
    hinted: Array.from({ length: 9 }, () => Array(9).fill(false)),
    selectedCell: { row: 2, col: 3 },
    errors: 1,
    hintsUsed: 2,
    seconds: 65,
    isNoteMode: false,
    difficulty: 'medium',
    gameOver: false,
    timerStarted: true,
    ...overrides
  };
}

console.log('🧪 Sudoku Storage Tests');
console.log('='.repeat(50));

describe('Availability and flags', () => {
  reset();
  assert(SudokuStorage.isAvailable() === true, 'Storage is available with a working localStorage');
  assert(SudokuStorage.getFlag('missing') === null, 'Missing flag returns null');
  SudokuStorage.setFlag('test-flag', { ok: true });
  assert(SudokuStorage.getFlag('test-flag').ok === true, 'Flag can be saved and loaded');
});

describe('Settings', () => {
  reset();
  const defaults = SudokuStorage.getSettings();
  assert(defaults.theme === 'dark', 'Default theme is dark');
  assert(defaults.errorLimit === 3, 'Default error limit is 3');
  assert(defaults.timerStart === 'first-move', 'Default timer starts on first move');

  SudokuStorage.saveSettings({
    ...defaults,
    theme: 'dark',
    errorLimit: 0,
    keepMistakes: true,
    timerStart: 'on-load'
  });

  const loaded = SudokuStorage.getSettings();
  assert(loaded.theme === 'dark', 'Theme persists');
  assert(loaded.errorLimit === 0, 'Unlimited errors persist');
  assert(loaded.keepMistakes === true, 'Mistake policy persists');
  assert(loaded.timerStart === 'on-load', 'Timer setting persists');

  localStorage.setItem('sudoku-settings', JSON.stringify({
    theme: 'neon',
    errorLimit: 99,
    timerStart: 'never',
    haptics: 'yes'
  }));
  const sanitized = SudokuStorage.getSettings();
  assert(sanitized.theme === 'dark', 'Invalid theme falls back to dark');
  assert(sanitized.errorLimit === 3, 'Invalid error limit falls back to 3');
  assert(sanitized.timerStart === 'first-move', 'Invalid timer setting falls back');
  assert(sanitized.haptics === true, 'Invalid boolean falls back to default');

  localStorage.setItem('sudoku-settings', JSON.stringify({ theme: 'system' }));
  assert(SudokuStorage.getSettings().theme === 'dark',
    'Legacy system theme migrates to dark');

  SudokuStorage.saveSettings({ ...defaults, theme: 'system' });
  assert(SudokuStorage.getSettings().theme === 'system',
    'Explicit system theme persists after migration');
});

describe('Best times', () => {
  reset();
  const first = SudokuStorage.saveBestTime('medium', 120, { errors: 1, hints: 0 });
  assert(first.isNewRecord === true, 'First result is a new record');
  assert(first.rank === 1, 'First result is ranked first');

  const tie = SudokuStorage.saveBestTime('medium', 120, { errors: 0, hints: 0 });
  assert(tie.isNewRecord === false, 'A tie is not a new record');

  const slower = SudokuStorage.saveBestTime('medium', 150, { errors: 2, hints: 1 });
  assert(slower.isNewRecord === false, 'A slower result is not a new record');

  const faster = SudokuStorage.saveBestTime('medium', 90, { errors: 0, hints: 0 });
  assert(faster.isNewRecord === true, 'A faster result is a new record');
  assert(faster.rank === 1, 'The faster result is ranked first');

  for (let i = 0; i < 8; i++) {
    SudokuStorage.saveBestTime('medium', 200 + i, {});
  }

  const times = SudokuStorage.getBestTimes();
  assert(times.medium.length === 5, 'Best times are capped at five entries');
  assert(times.medium[0].time === 90, 'Best times stay sorted');
  assert(times.easy.length === 0, 'Other difficulties stay empty');
});

describe('Game state', () => {
  reset();
  const state = makeGameState();
  state.notes[0][0] = [1, 9, 3, 3];
  state.mistakes[1][2] = true;
  state.hinted[4][4] = true;

  assert(SudokuStorage.saveGameState(state) === true, 'Game state saves');
  const loaded = SudokuStorage.loadGameState();

  assert(loaded !== null, 'Game state loads');
  assert(loaded.version === SudokuConstants.SAVE_VERSION, 'Game state gets the current version');
  assert(loaded.difficulty === 'medium', 'Difficulty is preserved');
  assert(loaded.seconds === 65, 'Elapsed seconds are preserved');
  assert(loaded.errors === 1, 'Errors are preserved');
  assert(loaded.hintsUsed === 2, 'Hint count is preserved');
  assert(loaded.notes[0][0].join(',') === '1,3,9', 'Notes are sanitized, sorted and deduplicated');
  assert(loaded.mistakes[1][2] === true, 'Mistake marks are preserved');
  assert(loaded.hinted[4][4] === true, 'Hint marks are preserved');
  assert(loaded.selectedCell.row === 2 && loaded.selectedCell.col === 3, 'Selection is preserved');
  assert(typeof loaded.tabId === 'string' && loaded.tabId.length > 0, 'Saved state gets a tab id');

  localStorage.setItem('sudoku-current-game', '{not valid json');
  const originalConsoleError = console.error;
  console.error = () => {};
  assert(SudokuStorage.loadGameState() === null, 'Malformed JSON returns null');
  console.error = originalConsoleError;
  assert(localStorage.getItem('sudoku-current-game') === null, 'Malformed save is removed');

  const invalidShape = makeGameState({ board: [[1, 2], [3]] });
  localStorage.setItem('sudoku-current-game', JSON.stringify(invalidShape));
  assert(SudokuStorage.loadGameState() === null, 'Invalid board shape is rejected');
});

describe('Statistics', () => {
  reset();
  const empty = SudokuStorage.getStats();
  assert(empty.difficulties.easy.played === 0, 'Stats start at zero');

  SudokuStorage.recordGameStarted('medium');
  SudokuStorage.recordGameStarted('medium');
  SudokuStorage.recordGameWon('medium', 100, 2);
  SudokuStorage.recordGameWon('medium', 200, 0);

  let stats = SudokuStorage.getStats().difficulties.medium;
  assert(stats.played === 2, 'Started games are counted');
  assert(stats.won === 2, 'Wins are counted');
  assert(stats.totalTime === 300, 'Total time is accumulated');
  assert(stats.best === 100, 'Best time is tracked');
  assert(stats.streak === 2, 'Current streak increments');
  assert(stats.bestStreak === 2, 'Best streak is tracked');
  assert(stats.hints === 2, 'Hints are accumulated');

  SudokuStorage.recordGameLost('medium');
  stats = SudokuStorage.getStats().difficulties.medium;
  assert(stats.lost === 1, 'Losses are counted');
  assert(stats.streak === 0, 'A loss resets the streak');

  SudokuStorage.recordGameAbandoned('medium');
  stats = SudokuStorage.getStats().difficulties.medium;
  assert(stats.abandoned === 1, 'Abandoned games are counted');

  SudokuStorage.resetStats();
  stats = SudokuStorage.getStats().difficulties.medium;
  assert(stats.played === 0 && stats.won === 0, 'Stats can be reset');
});

describe('Tab id', () => {
  reset();
  const first = SudokuStorage.getTabId();
  const second = SudokuStorage.getTabId();
  assert(typeof first === 'string' && first.length > 0, 'Tab id is generated');
  assert(first === second, 'Tab id is stable within the session');
});

console.log('\n' + '='.repeat(50));
console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All storage tests passed!');
}
