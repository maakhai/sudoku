class SudokuGame {
  constructor() {
    this.board = [];
    this.solution = [];
    this.initial = [];
    this.notes = [];
    this.selectedCell = null;
    this.isNoteMode = false;
    this.errors = 0;
    this.history = [];
    this.gameOver = false;
    this.isPaused = false;
    this.timerStarted = false;
    this.saveTimeout = null;
    this.errorInProgress = false;

    this.init();
  }

  init() {
    SudokuRenderer.init();

    this.boardOverlayEl = document.getElementById('board-overlay');
    this.pauseBtnEl = document.getElementById('pause-btn');
    this.difficultySelect = document.getElementById('difficulty');
    this.newGameBtn = document.getElementById('new-game-btn');
    this.modeToggleEl = document.getElementById('mode-toggle');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.winModal = document.getElementById('win-modal');
    this.winTimeEl = document.getElementById('win-time');
    this.newRecordMsgEl = document.getElementById('new-record-msg');
    this.resumeModal = document.getElementById('resume-modal');
    this.resumeInfoEl = document.getElementById('resume-info');

    this.loadDifficulty();
    this.bindEvents();
    this.updateModeIndicator();

    const savedGame = SudokuStorage.loadGameState();
    if (savedGame && !savedGame.gameOver && savedGame.seconds > 0) {
      this.showResumeModal(savedGame);
    } else {
      SudokuStorage.clearGameState();
      this.newGame();
    }

    this.startAutoSave();
  }

  bindEvents() {
    this.newGameBtn.addEventListener('click', () => {
      SudokuStorage.clearGameState();
      this.newGame();
    });

    document.getElementById('restart-same-btn').addEventListener('click', () => this.restartSame());
    document.getElementById('new-game-modal-btn').addEventListener('click', () => {
      this.gameOverModal.style.display = 'none';
      SudokuStorage.clearGameState();
      this.newGame();
    });
    document.getElementById('new-game-win-btn').addEventListener('click', () => {
      this.winModal.style.display = 'none';
      SudokuStorage.clearGameState();
      this.newGame();
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      this.resumeModal.style.display = 'none';
      const savedGame = SudokuStorage.loadGameState();
      if (savedGame) {
        this.restoreGameState(savedGame);
      }
    });

    document.getElementById('new-game-resume-btn').addEventListener('click', () => {
      this.resumeModal.style.display = 'none';
      SudokuStorage.clearGameState();
      this.newGame();
    });

    document.getElementById('clear-cell-btn').addEventListener('click', () => this.clearCell());
    document.getElementById('undo-btn').addEventListener('click', () => this.undo());

    this.modeToggleEl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode);
        this.debouncedSave();
      });
    });

    document.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.num);
        this.inputNumber(num);
      });
    });

    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    document.getElementById('board').addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.selectCell(row, col);
      }
    });

    document.querySelector('.board-container').addEventListener('click', () => {
      if (this.isPaused) {
        this.togglePause();
      }
    });

    this.difficultySelect.addEventListener('change', () => {
      this.saveDifficulty();
      SudokuStorage.clearGameState();
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
      this.debouncedSave();
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

    document.getElementById('numpad').classList.toggle('candidate-mode', this.isNoteMode);
  }

  resetPauseState() {
    this.isPaused = false;
    this.boardOverlayEl.classList.remove('visible');
    this.pauseBtnEl.innerHTML = '&#9642;&#9642;';
    this.pauseBtnEl.title = 'Pausar';
  }

  togglePause() {
    if (this.gameOver) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      SudokuTimer.stop();
      document.getElementById('board').classList.add('paused');
      this.boardOverlayEl.classList.add('visible');
      this.pauseBtnEl.innerHTML = '&#9654;';
      this.pauseBtnEl.title = 'Retomar';
    } else {
      SudokuTimer.start((s) => SudokuRenderer.updateTimerDisplay(s));
      document.getElementById('board').classList.remove('paused');
      this.boardOverlayEl.classList.remove('visible');
      this.pauseBtnEl.innerHTML = '&#9642;&#9642;';
      this.pauseBtnEl.title = 'Pausar';
    }
  }

  resetGameState(opts = {}) {
    this.board = this.initial.map(row => [...row]);
    this.notes = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set())
    );
    this.selectedCell = null;
    this.errors = 0;
    this.history = [];
    this.gameOver = false;
    this.errorInProgress = false;

    this.resetPauseState();

    SudokuTimer.reset();
    this.timerStarted = false;
    SudokuRenderer.updateTimerDisplay(0);

    if (opts.startTimer) {
      this.timerStarted = true;
      SudokuTimer.start((s) => SudokuRenderer.updateTimerDisplay(s));
    }

    SudokuRenderer.updateErrorDisplay(0);
    SudokuRenderer.renderBoard(this.board, this.initial, this.notes, this.selectedCell);
    SudokuRenderer.updateHighlights(this.board, this.selectedCell);
    SudokuRenderer.updateNumpadState(this.board);
    this.gameOverModal.style.display = 'none';
    this.winModal.style.display = 'none';

    this.saveGameState();
  }

  newGame() {
    const difficulty = this.difficultySelect.value;
    const cellsToRemove = SudokuConstants.difficultyConfig[difficulty];

    this.solution = SudokuBoard.generateSolution();
    this.initial = SudokuBoard.createPuzzle(this.solution, cellsToRemove);

    this.resetGameState();
  }

  restartSame() {
    this.resetGameState({ startTimer: true });
  }

  selectCell(row, col) {
    this.selectedCell = { row, col };
    SudokuRenderer.updateHighlights(this.board, this.selectedCell);
  }

  inputNumber(num) {
    if (!this.selectedCell || this.gameOver || this.errorInProgress) return;

    const { row, col } = this.selectedCell;
    if (this.initial[row][col] !== 0) return;

    if (!this.timerStarted) {
      this.timerStarted = true;
      SudokuTimer.start((s) => SudokuRenderer.updateTimerDisplay(s));
    }

    if (SudokuBoard.countNumber(this.board, num) >= 9) return;

    if (this.isNoteMode) {
      this.saveHistory(row, col, 'note');

      if (this.notes[row][col].has(num)) {
        this.notes[row][col].delete(num);
      } else {
        this.notes[row][col].add(num);
      }

      SudokuRenderer.renderBoard(this.board, this.initial, this.notes, this.selectedCell);
      this.selectCell(row, col);
      this.debouncedSave();
    } else {
      this.saveHistory(row, col, 'value');

      if (num === this.solution[row][col]) {
        this.board[row][col] = num;
        this.notes[row][col].clear();

        SudokuBoard.clearNotesForNumber(this.notes, row, col, num);

        SudokuRenderer.renderBoard(this.board, this.initial, this.notes, this.selectedCell);
        SudokuRenderer.updateNumpadState(this.board);
        this.selectCell(row, col);

        if (SudokuBoard.checkWin(this.board, this.solution)) {
          this.handleWin();
        } else {
          this.debouncedSave();
        }
      } else {
        this.errors++;
        SudokuRenderer.updateErrorDisplay(this.errors);

        this.board[row][col] = num;
        SudokuRenderer.renderBoard(this.board, this.initial, this.notes, this.selectedCell);
        this.selectCell(row, col);

        const cellEl = SudokuRenderer.addErrorFlash(row, col);
        this.errorInProgress = true;

        setTimeout(() => {
          if (this.gameOver) return;

          SudokuRenderer.removeErrorFlash(cellEl);
          this.board[row][col] = 0;
          SudokuRenderer.renderBoard(this.board, this.initial, this.notes, this.selectedCell);
          SudokuRenderer.updateNumpadState(this.board);
          this.selectCell(row, col);
          this.errorInProgress = false;
          this.debouncedSave();
        }, SudokuConstants.ERROR_FLASH_DURATION);

        if (this.errors >= SudokuConstants.MAX_ERRORS) {
          this.handleGameOver();
        }
      }
    }
  }

  clearCell() {
    if (!this.selectedCell || this.gameOver || this.errorInProgress) return;

    const { row, col } = this.selectedCell;
    if (this.initial[row][col] !== 0) return;

    if (this.board[row][col] !== 0 || this.notes[row][col].size > 0) {
      this.saveHistory(row, col, 'clear');
      this.board[row][col] = 0;
      this.notes[row][col].clear();
      SudokuRenderer.renderBoard(this.board, this.initial, this.notes, this.selectedCell);
      SudokuRenderer.updateNumpadState(this.board);
      this.selectCell(row, col);
      this.debouncedSave();
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

    if (this.history.length > SudokuConstants.MAX_HISTORY) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length === 0 || this.gameOver) return;

    const action = this.history.pop();
    this.board[action.row][action.col] = action.value;
    this.notes[action.row][action.col] = action.notes;

    SudokuRenderer.renderBoard(this.board, this.initial, this.notes, this.selectedCell);
    SudokuRenderer.updateNumpadState(this.board);
    this.selectCell(action.row, action.col);
    this.debouncedSave();
  }

  handleWin() {
    this.gameOver = true;
    SudokuTimer.stop();
    this.timerStarted = false;

    const seconds = SudokuTimer.getSeconds();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.winTimeEl.textContent = `Tempo: ${mins}m ${secs}s`;

    const difficulty = this.difficultySelect.value;
    const isNewRecord = SudokuStorage.saveBestTime(difficulty, seconds);

    this.newRecordMsgEl.style.display = isNewRecord ? 'block' : 'none';

    SudokuRenderer.renderBestTimes(difficulty, seconds);

    SudokuStorage.clearGameState();

    setTimeout(() => {
      this.winModal.style.display = 'flex';
    }, 300);
  }

  handleGameOver() {
    this.gameOver = true;
    SudokuTimer.stop();
    SudokuStorage.clearGameState();

    setTimeout(() => {
      this.gameOverModal.style.display = 'flex';
    }, 500);
  }

  saveGameState() {
    if (this.gameOver || this.isPaused) return;

    const state = {
      board: this.board,
      solution: this.solution,
      initial: this.initial,
      notes: this.notes.map(row => row.map(set => [...set])),
      errors: this.errors,
      seconds: SudokuTimer.getSeconds(),
      isNoteMode: this.isNoteMode,
      difficulty: this.difficultySelect.value,
      gameOver: this.gameOver,
      timerStarted: this.timerStarted
    };
    SudokuStorage.saveGameState(state);
  }

  debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveGameState(), 300);
  }

  restoreGameState(state) {
    this.board = state.board;
    this.solution = state.solution;
    this.initial = state.initial;
    this.notes = state.notes.map(row => row.map(arr => new Set(arr)));
    this.errors = state.errors;
    this.isNoteMode = state.isNoteMode;
    this.gameOver = state.gameOver;
    this.timerStarted = state.timerStarted || false;
    this.history = [];
    this.selectedCell = null;
    this.errorInProgress = false;

    this.difficultySelect.value = state.difficulty;
    this.resetPauseState();

    SudokuTimer.reset();
    SudokuTimer.setSeconds(state.seconds);
    SudokuRenderer.updateTimerDisplay(state.seconds);
    if (this.timerStarted) {
      SudokuTimer.start((s) => SudokuRenderer.updateTimerDisplay(s));
    }

    SudokuRenderer.updateErrorDisplay(this.errors);
    this.updateModeIndicator();
    SudokuRenderer.renderBoard(this.board, this.initial, this.notes, this.selectedCell);
    SudokuRenderer.updateHighlights(this.board, this.selectedCell);
    SudokuRenderer.updateNumpadState(this.board);
  }

  showResumeModal(state) {
    const diffName = SudokuConstants.difficultyNames[state.difficulty] || state.difficulty;
    const timeStr = SudokuRenderer.formatTime(state.seconds);
    this.resumeInfoEl.textContent = `Dificuldade: ${diffName} | Tempo: ${timeStr} | Erros: ${state.errors}/${SudokuConstants.MAX_ERRORS}`;
    this.resumeModal.style.display = 'flex';
  }

  saveDifficulty() {
    SudokuStorage.saveDifficulty(this.difficultySelect.value);
  }

  loadDifficulty() {
    const saved = SudokuStorage.loadDifficulty();
    if (saved && SudokuConstants.difficultyConfig[saved]) {
      this.difficultySelect.value = saved;
    }
  }

  startAutoSave() {
    setInterval(() => {
      if (!this.gameOver && !this.isPaused) {
        this.saveGameState();
      }
    }, SudokuConstants.AUTO_SAVE_INTERVAL);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.game = new SudokuGame();
});
