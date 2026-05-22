const SudokuBoard = (() => {
  const SIZE = SudokuConstants.BOARD_SIZE;
  const BOX = SudokuConstants.BOX_SIZE;
  const ALL_NUMS = Array.from({ length: SIZE }, (_, i) => i + 1);

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
    let count = 0;

    const solve = (b) => {
      if (count >= limit) return;

      const empty = findEmpty(b);
      if (!empty) {
        count++;
        return;
      }

      const [row, col] = empty;
      for (let num = 1; num <= SIZE; num++) {
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
      Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE])
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
