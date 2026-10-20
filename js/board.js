const SudokuBoard = (() => {
  const SIZE = SudokuConstants.BOARD_SIZE;
  const BOX = SudokuConstants.BOX_SIZE;
  const ALL_NUMS = Array.from({ length: SIZE }, (_, i) => i + 1);
  const FULL_MASK = (1 << SIZE) - 1;

  const POPCOUNT = new Uint8Array(FULL_MASK + 1);
  const NUM_FOR_BIT = new Uint8Array(FULL_MASK + 1);
  for (let mask = 1; mask <= FULL_MASK; mask++) {
    POPCOUNT[mask] = POPCOUNT[mask >> 1] + (mask & 1);
  }
  for (let num = 1; num <= SIZE; num++) {
    NUM_FOR_BIT[1 << (num - 1)] = num;
  }

  function findEmpty(board) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col] === 0) return [row, col];
      }
    }
    return null;
  }

  function isValid(board, row, col, num) {
    for (let i = 0; i < SIZE; i++) {
      if (board[row][i] === num) return false;
      if (board[i][col] === num) return false;
    }

    const boxRow = Math.floor(row / BOX) * BOX;
    const boxCol = Math.floor(col / BOX) * BOX;
    for (let i = boxRow; i < boxRow + BOX; i++) {
      for (let j = boxCol; j < boxCol + BOX; j++) {
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
    const nums = shuffle(ALL_NUMS);

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
    const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    fillBoard(board);
    return board;
  }

  function countSolutions(board, limit = 2) {
    if (limit <= 0) return 0;

    const rowMask = new Int16Array(SIZE);
    const colMask = new Int16Array(SIZE);
    const boxMask = new Int16Array(SIZE);
    const emptyPositions = [];

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const value = board[row][col];
        if (value === 0) {
          emptyPositions.push(row * SIZE + col);
          continue;
        }

        const bit = 1 << (value - 1);
        const box = Math.floor(row / BOX) * BOX + Math.floor(col / BOX);
        if ((rowMask[row] & bit) || (colMask[col] & bit) || (boxMask[box] & bit)) {
          return 0;
        }

        rowMask[row] |= bit;
        colMask[col] |= bit;
        boxMask[box] |= bit;
      }
    }

    let count = 0;

    const solve = () => {
      if (count >= limit) return;

      // MRV: pick the empty cell with the fewest candidates.
      let bestPos = -1;
      let bestMask = 0;
      let bestCandidateCount = SIZE + 1;

      for (let i = 0; i < emptyPositions.length; i++) {
        const pos = emptyPositions[i];
        const row = Math.floor(pos / SIZE);
        const col = pos % SIZE;
        if (board[row][col] !== 0) continue;

        const box = Math.floor(row / BOX) * BOX + Math.floor(col / BOX);
        const available = FULL_MASK & ~(rowMask[row] | colMask[col] | boxMask[box]);
        if (available === 0) return;

        const candidateCount = POPCOUNT[available];
        if (candidateCount < bestCandidateCount) {
          bestCandidateCount = candidateCount;
          bestMask = available;
          bestPos = pos;
          if (candidateCount === 1) break;
        }
      }

      if (bestPos === -1) {
        count++;
        return;
      }

      const row = Math.floor(bestPos / SIZE);
      const col = bestPos % SIZE;
      const box = Math.floor(row / BOX) * BOX + Math.floor(col / BOX);

      let mask = bestMask;
      while (mask !== 0) {
        const bit = mask & -mask;
        mask ^= bit;

        board[row][col] = NUM_FOR_BIT[bit];
        rowMask[row] |= bit;
        colMask[col] |= bit;
        boxMask[box] |= bit;

        solve();

        rowMask[row] &= ~bit;
        colMask[col] &= ~bit;
        boxMask[box] &= ~bit;
        board[row][col] = 0;

        if (count >= limit) break;
      }
    };

    solve();
    return count;
  }

  function createPuzzle(solution, cellsToRemove) {
    const puzzle = solution.map(row => [...row]);
    const positions = shuffle(
      Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE])
    );

    let removed = 0;
    for (const [row, col] of positions) {
      if (removed >= cellsToRemove) break;
      if (puzzle[row][col] === 0) continue;

      const backup = puzzle[row][col];
      puzzle[row][col] = 0;

      // countSolutions restores the board itself, so no copy is needed here.
      if (countSolutions(puzzle) === 1) {
        removed++;
      } else {
        puzzle[row][col] = backup;
      }
    }

    return puzzle;
  }

  function checkWin(board, solution) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col] !== solution[row][col]) {
          return false;
        }
      }
    }
    return true;
  }

  function countNumber(board, num) {
    let count = 0;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col] === num) count++;
      }
    }
    return count;
  }

  function clearNotesForNumber(notes, row, col, num) {
    for (let r = 0; r < SIZE; r++) {
      notes[r][col].delete(num);
    }
    for (let c = 0; c < SIZE; c++) {
      notes[row][c].delete(num);
    }

    const boxRow = Math.floor(row / BOX) * BOX;
    const boxCol = Math.floor(col / BOX) * BOX;
    for (let r = boxRow; r < boxRow + BOX; r++) {
      for (let c = boxCol; c < boxCol + BOX; c++) {
        notes[r][c].delete(num);
      }
    }
  }

  return {
    findEmpty,
    isValid,
    shuffle,
    fillBoard,
    generateSolution,
    countSolutions,
    createPuzzle,
    checkWin,
    countNumber,
    clearNotesForNumber
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findEmpty: SudokuBoard.findEmpty,
    isValid: SudokuBoard.isValid,
    shuffle: SudokuBoard.shuffle,
    fillBoard: SudokuBoard.fillBoard,
    generateSolution: SudokuBoard.generateSolution,
    countSolutions: SudokuBoard.countSolutions,
    createPuzzle: SudokuBoard.createPuzzle,
    checkWin: SudokuBoard.checkWin,
    countNumber: SudokuBoard.countNumber,
    clearNotesForNumber: SudokuBoard.clearNotesForNumber
  };
}
