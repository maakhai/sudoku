// Test file for Sudoku game logic
// Run with: node tests/test.js

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

// Extract core logic functions for testing (no DOM needed)
function findEmpty(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) return [row, col];
    }
  }
  return null;
}

function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      if (board[i][j] === num) return false;
    }
  }
  return true;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillBoard(board) {
  const empty = findEmpty(board);
  if (!empty) return true;

  const [row, col] = empty;
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      if (fillBoard(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function generateSolution() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillBoard(board);
  return board;
}

function countSolutions(board, limit = 2) {
  let count = 0;

  const solve = (b) => {
    if (count >= limit) return;

    const empty = findEmpty(b);
    if (!empty) {
      count++;
      return;
    }

    const [row, col] = empty;
    for (let num = 1; num <= 9; num++) {
      if (count >= limit) return;
      if (isValid(b, row, col, num)) {
        b[row][col] = num;
        solve(b);
        b[row][col] = 0;
      }
    }
  };

  solve(board);
  return count;
}

function createPuzzle(solution, cellsToRemove) {
  const puzzle = solution.map(row => [...row]);
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  );

  let removed = 0;
  for (const [row, col] of positions) {
    if (removed >= cellsToRemove) break;

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const copy = puzzle.map(r => [...r]);
    if (countSolutions(copy) === 1) {
      removed++;
    } else {
      puzzle[row][col] = backup;
    }
  }

  return puzzle;
}

function checkWin(board, solution) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== solution[row][col]) {
        return false;
      }
    }
  }
  return true;
}

function updateTimerDisplay(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

console.log('🧪 Sudoku Game Logic Tests');
console.log('='.repeat(50));

describe('Board Generation', () => {
  const solution = generateSolution();

  assert(Array.isArray(solution), 'Solution is an array');
  assert(solution.length === 9, 'Solution has 9 rows');
  assert(solution.every(row => Array.isArray(row) && row.length === 9), 'Each row has 9 columns');
  assert(solution.every(row => row.every(n => n >= 1 && n <= 9)), 'All values are 1-9');

  for (let r = 0; r < 9; r++) {
    const rowSet = new Set(solution[r]);
    assert(rowSet.size === 9, `Row ${r} has all unique numbers`);
  }

  for (let c = 0; c < 9; c++) {
    const col = solution.map(row => row[c]);
    const colSet = new Set(col);
    assert(colSet.size === 9, `Column ${c} has all unique numbers`);
  }

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const box = [];
      for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
        for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
          box.push(solution[r][c]);
        }
      }
      assert(new Set(box).size === 9, `Box (${boxRow},${boxCol}) has all unique numbers`);
    }
  }
});

describe('Puzzle Creation', () => {
  const solution = generateSolution();
  const puzzle = createPuzzle(solution, 40);

  assert(Array.isArray(puzzle), 'Puzzle is an array');
  assert(puzzle.length === 9, 'Puzzle has 9 rows');

  let emptyCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] === 0) emptyCount++;
      else assert(puzzle[r][c] === solution[r][c], `Puzzle[${r}][${c}] matches solution or is empty`);
    }
  }

  assert(emptyCount >= 30, `Puzzle has enough empty cells (got ${emptyCount})`);
  assert(emptyCount <= 50, `Puzzle doesn't have too many empty cells (got ${emptyCount})`);
});

describe('Validation Logic', () => {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));

  assert(isValid(board, 0, 0, 5), 'Empty board accepts any number');

  board[0][0] = 5;
  assert(!isValid(board, 0, 4, 5), 'Same row rejects duplicate');
  assert(!isValid(board, 4, 0, 5), 'Same column rejects duplicate');
  assert(isValid(board, 4, 4, 5), 'Different row/col accepts number');

  board[1][1] = 5;
  assert(!isValid(board, 2, 2, 5), 'Same 3x3 box rejects duplicate');
  assert(isValid(board, 3, 3, 5), 'Different 3x3 box accepts number');
});

describe('Difficulty Levels', () => {
  const difficulties = {
    easy: 30,
    medium: 40,
    hard: 50,
    professional: 55,
    master: 60
  };

  assert(Object.keys(difficulties).length === 5, 'Has 5 difficulty levels');

  for (const [diff, expected] of Object.entries(difficulties)) {
    const solution = generateSolution();
    const puzzle = createPuzzle(solution, expected);
    let emptyCount = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] === 0) emptyCount++;
      }
    }
    assert(emptyCount >= expected - 5 && emptyCount <= expected + 5,
      `${diff} creates ~${expected} empty cells (got ${emptyCount})`);
  }

  assert(difficulties.easy < difficulties.medium, 'Easy removes fewer cells than Medium');
  assert(difficulties.medium < difficulties.hard, 'Medium removes fewer cells than Hard');
  assert(difficulties.hard < difficulties.professional, 'Hard removes fewer cells than Professional');
  assert(difficulties.professional < difficulties.master, 'Professional removes fewer cells than Master');
});

describe('Shuffle Function', () => {
  const arr = [1, 2, 3, 4, 5];
  const shuffled = shuffle(arr);

  assert(shuffled.length === arr.length, 'Shuffle preserves length');
  assert(new Set(shuffled).size === arr.length, 'Shuffle preserves all elements');
  assert(!shuffled.includes(undefined), 'Shuffle has no undefined values');
});

describe('Count Solutions', () => {
  const complete = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
  ];

  assert(countSolutions(complete) === 1, 'Complete board has 1 solution');

  const incomplete = complete.map(row => [...row]);
  incomplete[0][0] = 0;
  assert(countSolutions(incomplete) >= 1, 'Incomplete board has at least 1 solution');
});

describe('Notes System', () => {
  const notes = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );

  assert(notes[0][0].size === 0, 'Initial notes are empty');

  notes[0][0].add(1);
  notes[0][0].add(2);
  assert(notes[0][0].size === 2, 'Can add multiple notes');
  assert(notes[0][0].has(1), 'Note 1 exists');
  assert(notes[0][0].has(2), 'Note 2 exists');

  notes[0][0].delete(1);
  assert(notes[0][0].size === 1, 'Can delete notes');
  assert(!notes[0][0].has(1), 'Note 1 was deleted');
});

describe('Win Detection', () => {
  const solution = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
  ];

  const board = solution.map(row => [...row]);
  assert(checkWin(board, solution) === true, 'Complete board is detected as win');

  board[0][0] = 0;
  assert(checkWin(board, solution) === false, 'Incomplete board is not a win');

  board[0][0] = 9;
  assert(checkWin(board, solution) === false, 'Board with wrong number is not a win');
});

describe('Timer Display', () => {
  assert(updateTimerDisplay(0) === '00:00', '0 seconds displays correctly');
  assert(updateTimerDisplay(65) === '01:05', '65 seconds displays correctly');
  assert(updateTimerDisplay(3661) === '61:01', '3661 seconds displays correctly');
  assert(updateTimerDisplay(59) === '00:59', '59 seconds displays correctly');
});

describe('Multiple Solution Generation', () => {
  for (let i = 0; i < 3; i++) {
    const solution = generateSolution();
    const isValidBoard = solution.every(row => new Set(row).size === 9) &&
      solution.every((_, c) => new Set(solution.map(row => row[c])).size === 9);
    assert(isValidBoard, `Generated solution #${i + 1} is valid`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
}
