class SudokuGame {
  constructor() {
    this.board = [];
    this.solution = [];
    this.initial = [];
    this.notes = [];
    this.selectedCell = null;
    this.isNoteMode = false;
    this.errors = 0;
    this.maxErrors = 3;
    this.history = [];
    this.timerInterval = null;
    this.seconds = 0;
    this.gameOver = false;
    this.isPaused = false;
    this.autoSaveInterval = null;

    this.difficultyConfig = {
      easy: 30,
      medium: 40,
      hard: 50,
      professional: 55,
      master: 60
    };

    this.init();
  }

  init() {
    this.boardEl = document.getElementById('board');
    this.boardContainerEl = document.querySelector('.board-container');
    this.boardOverlayEl = document.getElementById('board-overlay');
    this.pauseBtnEl = document.getElementById('pause-btn');
    this.difficultySelect = document.getElementById('difficulty');
    this.newGameBtn = document.getElementById('new-game-btn');
    this.errorsEl = document.getElementById('errors');
    this.timerEl = document.getElementById('timer');
    this.modeToggleEl = document.getElementById('mode-toggle');
    this.numpadEl = document.getElementById('numpad');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.winModal = document.getElementById('win-modal');
    this.winTimeEl = document.getElementById('win-time');
    this.newRecordMsgEl = document.getElementById('new-record-msg');
    this.bestTimesEl = document.getElementById('best-times');
    this.resumeModal = document.getElementById('resume-modal');
    this.resumeInfoEl = document.getElementById('resume-info');

    this.loadDifficulty();
    this.bindEvents();
    this.updateModeIndicator();

    const savedGame = this.loadGameState();
    if (savedGame && !savedGame.gameOver) {
      this.showResumeModal(savedGame);
    } else {
      this.clearGameState();
      this.newGame();
    }

    this.startAutoSave();
  }

  bindEvents() {
    this.newGameBtn.addEventListener('click', () => {
      this.clearGameState();
      this.newGame();
    });

    document.getElementById('restart-same-btn').addEventListener('click', () => this.restartSame());
    document.getElementById('new-game-modal-btn').addEventListener('click', () => {
      this.gameOverModal.style.display = 'none';
      this.clearGameState();
      this.newGame();
    });
    document.getElementById('new-game-win-btn').addEventListener('click', () => {
      this.winModal.style.display = 'none';
      this.clearGameState();
      this.newGame();
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      this.resumeModal.style.display = 'none';
      const savedGame = this.loadGameState();
      if (savedGame) {
        this.restoreGameState(savedGame);
      }
    });

    document.getElementById('new-game-resume-btn').addEventListener('click', () => {
      this.resumeModal.style.display = 'none';
      this.clearGameState();
      this.newGame();
    });

    document.getElementById('clear-cell-btn').addEventListener('click', () => this.clearCell());
    document.getElementById('undo-btn').addEventListener('click', () => this.undo());

    this.modeToggleEl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode);
        this.saveGameState();
      });
    });

    document.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.num);
        this.inputNumber(num);
      });
    });

    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    this.boardEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.selectCell(row, col);
      }
    });

    this.boardContainerEl.addEventListener('click', () => {
      if (this.isPaused) {
        this.togglePause();
      }
    });

    this.difficultySelect.addEventListener('change', () => {
      this.saveDifficulty();
      this.clearGameState();
      this.newGame();
    });

    this.pauseBtnEl.addEventListener('click', () => this.togglePause());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !this.isPaused && !this.gameOver) {
        this.togglePause();
      }
    });

    window.addEventListener('beforeunload', () => {
      this.saveGameState();
    });
  }

  handleKeydown(e) {
    if (this.gameOver) return;

    if (this.isPaused && e.key !== 'Escape') return;

    if (e.key === 'Escape' && this.isPaused) {
      e.preventDefault();
      this.togglePause();
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      this.toggleMode();
      this.saveGameState();
      return;
    }

    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.undo();
      return;
    }

    if (this.selectedCell === null) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
        this.selectCell(0, 0);
      }
      return;
    }

    const { row, col } = this.selectedCell;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        e.preventDefault();
        if (row > 0) this.selectCell(row - 1, col);
        break;
      case 'ArrowDown':
      case 's':
        e.preventDefault();
        if (row < 8) this.selectCell(row + 1, col);
        break;
      case 'ArrowLeft':
      case 'a':
        e.preventDefault();
        if (col > 0) this.selectCell(row, col - 1);
        break;
      case 'ArrowRight':
      case 'd':
        e.preventDefault();
        if (col < 8) this.selectCell(row, col + 1);
        break;
      case '1': case '2': case '3':
      case '4': case '5': case '6':
      case '7': case '8': case '9':
        e.preventDefault();
        this.inputNumber(parseInt(e.key));
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.clearCell();
        break;
    }
  }

  setMode(mode) {
    this.isNoteMode = mode === 'candidate';
    this.updateModeIndicator();
  }

  toggleMode() {
    this.isNoteMode = !this.isNoteMode;
    this.updateModeIndicator();
  }

  updateModeIndicator() {
    this.modeToggleEl.querySelectorAll('.mode-btn').forEach(btn => {
      const isActive = (btn.dataset.mode === 'candidate') === this.isNoteMode;
      btn.classList.toggle('active', isActive);
    });

    this.numpadEl.classList.toggle('candidate-mode', this.isNoteMode);
  }

  togglePause() {
    if (this.gameOver) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.stopTimer();
      this.boardEl.classList.add('paused');
      this.boardOverlayEl.classList.add('visible');
      this.pauseBtnEl.innerHTML = '&#9654;';
      this.pauseBtnEl.title = 'Retomar';
    } else {
      this.startTimer();
      this.boardEl.classList.remove('paused');
      this.boardOverlayEl.classList.remove('visible');
      this.pauseBtnEl.innerHTML = '&#9642;&#9642;';
      this.pauseBtnEl.title = 'Pausar';
    }
  }

  newGame() {
    const difficulty = this.difficultySelect.value;
    const cellsToRemove = this.difficultyConfig[difficulty];

    this.solution = this.generateSolution();
    this.initial = this.createPuzzle(this.solution, cellsToRemove);
    this.board = this.initial.map(row => [...row]);
    this.notes = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set())
    );
    this.selectedCell = null;
    this.errors = 0;
    this.history = [];
    this.gameOver = false;

    this.isPaused = false;
    this.boardOverlayEl.classList.remove('visible');
    this.pauseBtnEl.innerHTML = '&#9642;&#9642;';
    this.pauseBtnEl.title = 'Pausar';

    this.stopTimer();
    this.seconds = 0;
    this.updateTimerDisplay();
    this.startTimer();

    this.updateErrorDisplay();
    this.renderBoard();
    this.gameOverModal.style.display = 'none';
    this.winModal.style.display = 'none';

    this.saveGameState();
  }

  restartSame() {
    this.board = this.initial.map(row => [...row]);
    this.notes = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set())
    );
    this.selectedCell = null;
    this.errors = 0;
    this.history = [];
    this.gameOver = false;
    this.isPaused = false;
    this.boardOverlayEl.classList.remove('visible');
    this.pauseBtnEl.innerHTML = '&#9642;&#9642;';
    this.pauseBtnEl.title = 'Pausar';

    this.stopTimer();
    this.seconds = 0;
    this.updateTimerDisplay();
    this.startTimer();

    this.updateErrorDisplay();
    this.renderBoard();
    this.gameOverModal.style.display = 'none';

    this.saveGameState();
  }

  generateSolution() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.fillBoard(board);
    return board;
  }

  fillBoard(board) {
    const empty = this.findEmpty(board);
    if (!empty) return true;

    const [row, col] = empty;
    const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const num of nums) {
      if (this.isValid(board, row, col, num)) {
        board[row][col] = num;
        if (this.fillBoard(board)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  findEmpty(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) return [row, col];
      }
    }
    return null;
  }

  isValid(board, row, col, num) {
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

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  createPuzzle(solution, cellsToRemove) {
    const puzzle = solution.map(row => [...row]);
    const positions = this.shuffle(
      Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
    );

    let removed = 0;
    for (const [row, col] of positions) {
      if (removed >= cellsToRemove) break;

      const backup = puzzle[row][col];
      puzzle[row][col] = 0;

      const copy = puzzle.map(r => [...r]);
      if (this.countSolutions(copy) === 1) {
        removed++;
      } else {
        puzzle[row][col] = backup;
      }
    }

    return puzzle;
  }

  countSolutions(board, limit = 2) {
    let count = 0;

    const solve = (b) => {
      if (count >= limit) return;

      const empty = this.findEmpty(b);
      if (!empty) {
        count++;
        return;
      }

      const [row, col] = empty;
      for (let num = 1; num <= 9; num++) {
        if (count >= limit) return;
        if (this.isValid(b, row, col, num)) {
          b[row][col] = num;
          solve(b);
          b[row][col] = 0;
        }
      }
    };

    solve(board);
    return count;
  }

  renderBoard() {
    this.boardEl.innerHTML = '';

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        const isGiven = this.initial[row][col] !== 0;
        if (isGiven) {
          cell.classList.add('given');
          cell.textContent = this.board[row][col];
        } else if (this.board[row][col] !== 0) {
          cell.classList.add('user-input');
          cell.textContent = this.board[row][col];
        } else if (this.notes[row][col].size > 0) {
          const notesGrid = document.createElement('div');
          notesGrid.className = 'notes-grid';
          for (let n = 1; n <= 9; n++) {
            const note = document.createElement('div');
            note.className = 'note';
            note.textContent = this.notes[row][col].has(n) ? n : '';
            notesGrid.appendChild(note);
          }
          cell.appendChild(notesGrid);
        }

        this.boardEl.appendChild(cell);
      }
    }

    this.updateHighlights();
    this.updateNumpadState();
  }

  updateNumpadState() {
    const counts = {};
    for (let n = 1; n <= 9; n++) counts[n] = 0;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const val = this.board[row][col];
        if (val !== 0) counts[val]++;
      }
    }

    this.numpadEl.querySelectorAll('.num-btn').forEach(btn => {
      const num = parseInt(btn.dataset.num);
      const isComplete = counts[num] >= 9;
      btn.classList.toggle('disabled', isComplete);
      btn.disabled = isComplete;
    });
  }

  selectCell(row, col) {
    this.selectedCell = { row, col };
    this.updateHighlights();
  }

  updateHighlights() {
    const cells = this.boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.classList.remove('selected', 'highlight-line', 'highlight-same');
    });

    if (!this.selectedCell) return;

    const { row, col } = this.selectedCell;
    const selectedValue = this.board[row][col];

    cells.forEach(cell => {
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);

      if (r === row && c === col) {
        cell.classList.add('selected');
      } else if (r === row || c === col) {
        cell.classList.add('highlight-line');
      }

      if (selectedValue !== 0 && this.board[r][c] === selectedValue && !(r === row && c === col)) {
        cell.classList.add('highlight-same');
      }
    });
  }

  inputNumber(num) {
    if (!this.selectedCell || this.gameOver) return;

    const { row, col } = this.selectedCell;
    if (this.initial[row][col] !== 0) return;

    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c] === num) count++;
      }
    }
    if (count >= 9) return;

    if (this.isNoteMode) {
      this.saveHistory(row, col, 'note');

      if (this.notes[row][col].has(num)) {
        this.notes[row][col].delete(num);
      } else {
        this.notes[row][col].add(num);
      }

      this.renderBoard();
      this.selectCell(row, col);
      this.saveGameState();
    } else {
      this.saveHistory(row, col, 'value');

      if (num === this.solution[row][col]) {
        this.board[row][col] = num;
        this.notes[row][col].clear();

        this.clearNotesForNumber(row, col, num);

        this.renderBoard();
        this.selectCell(row, col);

        if (this.checkWin()) {
          this.handleWin();
        } else {
          this.saveGameState();
        }
      } else {
        this.errors++;
        this.updateErrorDisplay();

        this.board[row][col] = num;
        this.renderBoard();
        this.selectCell(row, col);

        const cellEl = this.getCellElement(row, col);
        if (cellEl) {
          cellEl.classList.add('error', 'error-flash');
          setTimeout(() => {
            cellEl.classList.remove('error-flash');
            this.board[row][col] = 0;
            this.renderBoard();
            this.selectCell(row, col);
            this.saveGameState();
          }, 600);
        }

        if (this.errors >= this.maxErrors) {
          this.handleGameOver();
        }
      }
    }
  }

  clearNotesForNumber(row, col, num) {
    for (let r = 0; r < 9; r++) {
      this.notes[r][col].delete(num);
    }
    for (let c = 0; c < 9; c++) {
      this.notes[row][c].delete(num);
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        this.notes[r][c].delete(num);
      }
    }
  }

  clearCell() {
    if (!this.selectedCell || this.gameOver) return;

    const { row, col } = this.selectedCell;
    if (this.initial[row][col] !== 0) return;

    if (this.board[row][col] !== 0 || this.notes[row][col].size > 0) {
      this.saveHistory(row, col, 'clear');
      this.board[row][col] = 0;
      this.notes[row][col].clear();
      this.renderBoard();
      this.selectCell(row, col);
      this.saveGameState();
    }
  }

  saveHistory(row, col, type) {
    this.history.push({
      row,
      col,
      type,
      value: this.board[row][col],
      notes: new Set(this.notes[row][col])
    });

    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length === 0 || this.gameOver) return;

    const action = this.history.pop();
    this.board[action.row][action.col] = action.value;
    this.notes[action.row][action.col] = action.notes;

    this.renderBoard();
    this.selectCell(action.row, action.col);
    this.saveGameState();
  }

  getCellElement(row, col) {
    return this.boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  }

  updateErrorDisplay() {
    const dots = this.errorsEl.querySelectorAll('.error-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('lost', i < this.errors);
    });
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.seconds++;
      this.updateTimerDisplay();
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
    const secs = (this.seconds % 60).toString().padStart(2, '0');
    this.timerEl.textContent = `${mins}:${secs}`;
  }

  checkWin() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.board[row][col] !== this.solution[row][col]) {
          return false;
        }
      }
    }
    return true;
  }

  handleWin() {
    this.gameOver = true;
    this.stopTimer();

    const mins = Math.floor(this.seconds / 60);
    const secs = this.seconds % 60;
    this.winTimeEl.textContent = `Tempo: ${mins}m ${secs}s`;

    const difficulty = this.difficultySelect.value;
    const isNewRecord = this.saveBestTime(difficulty, this.seconds);

    if (isNewRecord) {
      this.newRecordMsgEl.style.display = 'block';
    } else {
      this.newRecordMsgEl.style.display = 'none';
    }

    this.renderBestTimes(difficulty, this.seconds);

    this.clearGameState();

    setTimeout(() => {
      this.winModal.style.display = 'flex';
    }, 300);
  }

  getBestTimes() {
    try {
      const data = localStorage.getItem('sudoku-best-times');
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { easy: [], medium: [], hard: [], professional: [], master: [] };
  }

  saveBestTime(difficulty, seconds) {
    const times = this.getBestTimes();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const entry = { time: seconds, date: dateStr };
    times[difficulty].push(entry);
    times[difficulty].sort((a, b) => a.time - b.time);
    times[difficulty] = times[difficulty].slice(0, 5);

    try {
      localStorage.setItem('sudoku-best-times', JSON.stringify(times));
    } catch (e) {
      console.error('Failed to save best times to localStorage:', e);
    }

    return times[difficulty][0].time === seconds;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  renderBestTimes(difficulty, currentSeconds) {
    if (!this.bestTimesEl) return;

    const times = this.getBestTimes();
    const list = times[difficulty] || [];

    const difficultyNames = {
      easy: 'Fácil',
      medium: 'Médio',
      hard: 'Difícil',
      professional: 'Profissional',
      master: 'Mestre'
    };

    if (list.length === 0) {
      this.bestTimesEl.innerHTML = `<h3>Melhores tempos - ${difficultyNames[difficulty]}</h3><p style="color:var(--text-muted);font-size:0.85rem;">Nenhum tempo registrado ainda.</p>`;
      return;
    }

    let html = `<h3>Melhores tempos - ${difficultyNames[difficulty]}</h3><ol>`;
    list.forEach((entry, i) => {
      const isCurrent = entry.time === currentSeconds;
      html += `<li class="${isCurrent ? 'is-current' : ''}">
        <span class="time-value">${this.formatTime(entry.time)}</span>
        <span class="time-date">${entry.date}</span>
      </li>`;
    });
    html += '</ol>';

    this.bestTimesEl.innerHTML = html;
  }

  handleGameOver() {
    this.gameOver = true;
    this.stopTimer();
    this.clearGameState();

    setTimeout(() => {
      this.gameOverModal.style.display = 'flex';
    }, 500);
  }

  saveGameState() {
    try {
      const state = {
        board: this.board,
        solution: this.solution,
        initial: this.initial,
        notes: this.notes.map(row => row.map(set => [...set])),
        errors: this.errors,
        seconds: this.seconds,
        isNoteMode: this.isNoteMode,
        difficulty: this.difficultySelect.value,
        gameOver: this.gameOver
      };
      localStorage.setItem('sudoku-current-game', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save game state:', e);
    }
  }

  loadGameState() {
    try {
      const data = localStorage.getItem('sudoku-current-game');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load game state:', e);
    }
    return null;
  }

  restoreGameState(state) {
    this.board = state.board;
    this.solution = state.solution;
    this.initial = state.initial;
    this.notes = state.notes.map(row => row.map(arr => new Set(arr)));
    this.errors = state.errors;
    this.seconds = state.seconds;
    this.isNoteMode = state.isNoteMode;
    this.gameOver = state.gameOver;
    this.history = [];
    this.selectedCell = null;
    this.isPaused = false;

    this.difficultySelect.value = state.difficulty;
    this.boardOverlayEl.classList.remove('visible');
    this.pauseBtnEl.innerHTML = '&#9642;&#9642;';
    this.pauseBtnEl.title = 'Pausar';

    this.stopTimer();
    this.updateTimerDisplay();
    this.startTimer();

    this.updateErrorDisplay();
    this.updateModeIndicator();
    this.renderBoard();
  }

  clearGameState() {
    try {
      localStorage.removeItem('sudoku-current-game');
    } catch (e) {}
  }

  showResumeModal(state) {
    const difficultyNames = {
      easy: 'Fácil',
      medium: 'Médio',
      hard: 'Difícil',
      professional: 'Profissional',
      master: 'Mestre'
    };
    const diffName = difficultyNames[state.difficulty] || state.difficulty;
    const mins = Math.floor(state.seconds / 60);
    const secs = state.seconds % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    this.resumeInfoEl.textContent = `Dificuldade: ${diffName} | Tempo: ${timeStr} | Erros: ${state.errors}/3`;
    this.resumeModal.style.display = 'flex';
  }

  saveDifficulty() {
    try {
      localStorage.setItem('sudoku-difficulty', this.difficultySelect.value);
    } catch (e) {}
  }

  loadDifficulty() {
    try {
      const saved = localStorage.getItem('sudoku-difficulty');
      if (saved && this.difficultyConfig[saved]) {
        this.difficultySelect.value = saved;
      }
    } catch (e) {}
  }

  startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (!this.gameOver && !this.isPaused) {
        this.saveGameState();
      }
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.game = new SudokuGame();
});
