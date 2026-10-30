class SudokuGame {
  constructor() {
    this.board = [];
    this.solution = [];
    this.initial = [];
    this.notes = [];
    this.mistakes = [];
    this.hinted = [];
    this.selectedCell = null;
    this.isNoteMode = false;
    this.errors = 0;
    this.hintsUsed = 0;
    this.history = [];
    this.redoStack = [];
    this.gameOver = false;
    this.isPaused = false;
    this.timerStarted = false;
    this.isGenerating = false;
    this.isResolving = false;
    this.transientMistake = null;
    this.dirty = false;
    this.saveTimeout = null;
    this.mistakeTimer = null;
    this.modalTimer = null;
    this.autoSaveInterval = null;
    this.sessionId = 0;
    this.pendingSavedGame = null;
    this.autoResumeAfterDialog = false;
    this.storageWarningShown = false;
    this.shareText = '';
    this.shareResetTimer = null;
    this.settingsNoteTimer = null;
    this.settings = SudokuStorage.getSettings();
    this.tabId = SudokuStorage.getTabId();
    this.difficulty = 'medium';

    this.init();
  }

  init() {
    SudokuRenderer.init();
    this.cacheDom();
    SudokuUI.initTheme(this.settings.theme);
    this.applySettingsToForm();
    this.loadDifficulty();

    const modifierKey = document.getElementById('modifier-key');
    if (modifierKey) modifierKey.textContent = SudokuUI.isMac() ? '⌘' : 'Ctrl';
    document.querySelectorAll('.mod-key').forEach(element => {
      element.textContent = SudokuUI.isMac() ? '⌘' : 'Ctrl';
    });
    if (SudokuUI.isMac()) {
      this.undoBtn.title = 'Desfazer (⌘Z)';
      this.redoBtn.title = 'Refazer (⌘⇧Z)';
    }

    this.bindEvents();
    this.setupDialogs();
    this.startAutoSave();

    SudokuRenderer.updateTimerDisplay(0);
    SudokuRenderer.updateErrorDisplay(0, this.settings.errorLimit);
    this.updateModeUI();

    if (!SudokuStorage.isAvailable()) this.showStorageWarning();

    const savedGame = SudokuStorage.loadGameState();
    if (savedGame && this.hasSavedProgress(savedGame)) {
      this.pendingSavedGame = savedGame;
      this.showResumeDialog(savedGame);
    } else {
      SudokuStorage.clearGameState();
      this.startNewGame(this.difficultySelect.value, { force: true });
    }

    this.maybeShowFirstRunTip();
    this.registerServiceWorker();
  }

  cacheDom() {
    const byId = id => document.getElementById(id);

    this.boardEl = byId('board');
    this.boardOverlayEl = byId('board-overlay');
    this.pauseBtnEl = byId('pause-btn');
    this.difficultySelect = byId('difficulty');
    this.newGameBtn = byId('new-game-btn');
    this.modeToggleEl = byId('mode-toggle');
    this.modeButtons = Array.from(this.modeToggleEl.querySelectorAll('.mode-btn'));
    this.numpadEl = byId('numpad');
    this.sidebarEl = byId('sidebar');
    this.clearBtn = byId('clear-cell-btn');
    this.undoBtn = byId('undo-btn');
    this.redoBtn = byId('redo-btn');
    this.hintBtn = byId('hint-btn');
    this.hintCountEl = byId('hint-count');
    this.storageWarningEl = byId('storage-warning');
    this.generatingOverlayEl = byId('generating-overlay');
    this.menuBtn = byId('menu-btn');
    this.menuDialog = byId('menu-dialog');
    this.themeBtn = byId('theme-btn');
    this.helpBtn = byId('help-btn');
    this.recordsBtn = byId('records-btn');
    this.settingsBtn = byId('settings-btn');

    this.newGameDialog = byId('new-game-dialog');
    this.newGameCancelBtn = byId('new-game-cancel-btn');
    this.newGameConfirmBtn = byId('new-game-confirm-btn');
    this.resumeDialog = byId('resume-dialog');
    this.resumeInfoEl = byId('resume-info');
    this.resumeBtn = byId('resume-btn');
    this.newGameResumeBtn = byId('new-game-resume-btn');
    this.gameOverDialog = byId('game-over-dialog');
    this.gameOverTextEl = byId('game-over-text');
    this.restartSameBtn = byId('restart-same-btn');
    this.newGameModalBtn = byId('new-game-modal-btn');
    this.winDialog = byId('win-dialog');
    this.winSummaryEl = byId('win-summary');
    this.winBestTimesEl = byId('win-best-times');
    this.newRecordMsgEl = byId('new-record-msg');
    this.newGameWinBtn = byId('new-game-win-btn');
    this.shareWinBtn = byId('share-win-btn');
    this.settingsDialog = byId('settings-dialog');
    this.settingsForm = byId('settings-form');
    this.settingsTheme = byId('settings-theme');
    this.settingsErrorLimit = byId('settings-error-limit');
    this.settingsKeepMistakes = byId('settings-keep-mistakes');
    this.settingsAutoNotes = byId('settings-auto-notes');
    this.settingsHighlight = byId('settings-highlight');
    this.settingsTimerStart = byId('settings-timer-start');
    this.settingsHaptics = byId('settings-haptics');
    this.settingsNoteEl = byId('settings-note');
    this.resetStatsBtn = byId('reset-stats-btn');
    this.resetStatsDialog = byId('reset-stats-dialog');
    this.confirmResetStatsBtn = byId('confirm-reset-stats');
    this.cancelResetStatsBtn = byId('cancel-reset-stats');
    this.helpDialog = byId('help-dialog');
    this.recordsDialog = byId('records-dialog');
    this.recordsDifficulty = byId('records-difficulty');
    this.recordsBestTimesEl = byId('records-best-times');
    this.recordsStatsEl = byId('records-stats');
  }

  bindEvents() {
    this.newGameBtn.addEventListener('click', () => this.requestNewGame());
    this.pauseBtnEl.addEventListener('click', () => this.togglePause());
    this.boardOverlayEl.addEventListener('click', () => {
      if (this.isPaused) this.togglePause();
    });

    this.difficultySelect.addEventListener('change', () => {
      const nextDifficulty = this.difficultySelect.value;
      SudokuStorage.saveDifficulty(nextDifficulty);
      const name = SudokuConstants.difficultyNames[nextDifficulty];
      if (this.hasProgress()) {
        SudokuUI.showToast(`Dificuldade alterada para ${name}. Vale para o próximo jogo.`);
      } else {
        SudokuUI.showToast(`Dificuldade: ${name}. Clique em Novo jogo para começar.`);
      }
    });

    this.modeButtons.forEach(button => {
      button.addEventListener('click', () => this.setMode(button.dataset.mode));
    });

    this.numpadEl.querySelectorAll('.num-btn').forEach(button => {
      button.addEventListener('click', () => this.inputNumber(Number(button.dataset.num)));
    });

    this.clearBtn.addEventListener('click', () => this.clearCell());
    this.undoBtn.addEventListener('click', () => this.undo());
    this.redoBtn.addEventListener('click', () => this.redo());
    this.hintBtn.addEventListener('click', () => this.useHint());

    this.boardEl.addEventListener('click', event => {
      const cell = event.target.closest('[role="gridcell"]');
      if (!cell) return;
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      this.selectCell(row, col, { focus: true });
    });

    this.boardEl.addEventListener('focusin', event => {
      const cell = event.target.closest('[role="gridcell"]');
      if (!cell) return;
      this.selectCell(Number(cell.dataset.row), Number(cell.dataset.col));
    });

    document.addEventListener('keydown', event => this.handleKeydown(event));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.board.length === SudokuConstants.BOARD_SIZE &&
          !this.gameOver && !this.isPaused && !this.isGenerating) {
        this.togglePause({ silent: true });
      }
    });
    window.addEventListener('pagehide', () => this.saveGameState());
    window.addEventListener('storage', event => this.handleStorageEvent(event));

    this.menuBtn.addEventListener('click', () => this.openMenu());

    this.themeBtn.addEventListener('click', () => {
      const next = SudokuUI.toggleTheme();
      this.settings.theme = next;
      this.settingsTheme.value = next;
      SudokuStorage.saveSettings(this.settings);
      if (!SudokuStorage.isAvailable()) this.showStorageWarning();
      SudokuUI.announce(`Tema ${next === 'dark' ? 'escuro' : 'claro'} ativado.`);
    });

    this.helpBtn.addEventListener('click', () => {
      SudokuUI.closeDialog(this.menuDialog);
      this.openHelp();
    });
    this.recordsBtn.addEventListener('click', () => {
      SudokuUI.closeDialog(this.menuDialog);
      this.openRecords();
    });
    this.settingsBtn.addEventListener('click', () => {
      SudokuUI.closeDialog(this.menuDialog);
      this.openSettings();
    });

    this.newGameCancelBtn.addEventListener('click', () => this.cancelNewGame());
    this.newGameConfirmBtn.addEventListener('click', () => this.confirmNewGame());
    this.resumeBtn.addEventListener('click', () => this.continueSavedGame());
    this.newGameResumeBtn.addEventListener('click', () => this.newGameFromResume());
    this.restartSameBtn.addEventListener('click', () => this.restartSame());
    this.newGameModalBtn.addEventListener('click', () => this.newGameFromGameOver());
    this.newGameWinBtn.addEventListener('click', () => this.newGameFromWin());
    this.shareWinBtn.addEventListener('click', () => this.shareResult());
    this.confirmResetStatsBtn.addEventListener('click', () => this.resetStats());
    this.cancelResetStatsBtn.addEventListener('click', () => {
      SudokuUI.closeDialog(this.resetStatsDialog);
    });

    this.settingsForm.addEventListener('change', () => this.applySettingsFromForm());
    this.recordsDifficulty.addEventListener('change', () => this.renderRecords());
    this.resetStatsBtn.addEventListener('click', () => {
      SudokuUI.closeDialog(this.settingsDialog);
      SudokuUI.openDialog(this.resetStatsDialog);
    });
  }

  setupDialogs() {
    document.querySelectorAll('button[data-close]').forEach(button => {
      button.addEventListener('click', () => {
        const dialog = button.closest('dialog');
        if (dialog) dialog.close();
      });
    });

    SudokuUI.closeFromBackdrop(this.helpDialog);
    SudokuUI.closeFromBackdrop(this.settingsDialog);
    SudokuUI.closeFromBackdrop(this.recordsDialog);
    SudokuUI.closeFromBackdrop(this.winDialog);
    SudokuUI.closeFromBackdrop(this.gameOverDialog);
    SudokuUI.closeFromBackdrop(this.resetStatsDialog);
    SudokuUI.closeFromBackdrop(this.menuDialog);

    this.newGameDialog.addEventListener('cancel', event => {
      event.preventDefault();
      this.cancelNewGame();
    });
    this.resumeDialog.addEventListener('cancel', event => {
      event.preventDefault();
      this.continueSavedGame();
    });

    const autoResumeDialogs = [
      this.menuDialog,
      this.newGameDialog,
      this.helpDialog,
      this.settingsDialog,
      this.recordsDialog,
      this.resetStatsDialog
    ];

    autoResumeDialogs.forEach(dialog => {
      dialog.addEventListener('close', () => this.resumeAfterDialogIfNeeded());
    });
  }

  // ---------- Persistence and setup ----------

  loadDifficulty() {
    const saved = SudokuStorage.loadDifficulty();
    if (saved) this.difficultySelect.value = saved;
    this.difficulty = this.difficultySelect.value;
  }

  applySettingsToForm() {
    this.settingsTheme.value = this.settings.theme;
    this.settingsErrorLimit.value = String(this.settings.errorLimit);
    this.settingsKeepMistakes.checked = this.settings.keepMistakes;
    this.settingsAutoNotes.checked = this.settings.autoRemoveNotes;
    this.settingsHighlight.checked = this.settings.highlightSame;
    this.settingsTimerStart.value = this.settings.timerStart;
    this.settingsHaptics.checked = this.settings.haptics;
  }

  applySettingsFromForm() {
    const previous = this.settings;
    this.settings = {
      theme: this.settingsTheme.value,
      errorLimit: Number(this.settingsErrorLimit.value),
      keepMistakes: this.settingsKeepMistakes.checked,
      autoRemoveNotes: this.settingsAutoNotes.checked,
      highlightSame: this.settingsHighlight.checked,
      timerStart: this.settingsTimerStart.value,
      haptics: this.settingsHaptics.checked
    };

    SudokuStorage.saveSettings(this.settings);
    if (!SudokuStorage.isAvailable()) this.showStorageWarning();
    SudokuUI.applyTheme(this.settings.theme);

    if (previous.timerStart !== this.settings.timerStart && this.board.length === SudokuConstants.BOARD_SIZE) {
      this.showSettingsNote('A opção do cronômetro vale para o próximo jogo.');
    }
    if (previous.keepMistakes !== this.settings.keepMistakes) {
      this.showSettingsNote('A opção de erros vale para os próximos erros.');
    }
    if (previous.errorLimit !== this.settings.errorLimit) {
      SudokuUI.announce(this.settings.errorLimit > 0
        ? `Limite de ${this.settings.errorLimit} erros.`
        : 'Erros ilimitados.');
      if (this.settings.errorLimit > 0 &&
          this.errors >= this.settings.errorLimit &&
          !this.gameOver) {
        this.showSettingsNote('Você já passou deste limite. O jogo termina no próximo erro.');
      }
    }

    this.renderAll();
  }

  showSettingsNote(message) {
    if (!this.settingsNoteEl) return;
    if (this.settingsNoteTimer) clearTimeout(this.settingsNoteTimer);
    this.settingsNoteEl.textContent = message;
    this.settingsNoteEl.hidden = false;
    this.settingsNoteTimer = setTimeout(() => {
      this.settingsNoteEl.hidden = true;
      this.settingsNoteTimer = null;
    }, 3200);
  }

  hasSavedProgress(state) {
    if (!state || state.gameOver) return false;
    if (state.seconds > 0 || state.timerStarted) return true;

    for (let row = 0; row < SudokuConstants.BOARD_SIZE; row++) {
      for (let col = 0; col < SudokuConstants.BOARD_SIZE; col++) {
        if (state.board[row][col] !== state.initial[row][col]) return true;
        if (state.notes[row][col].length > 0) return true;
        if (state.mistakes[row][col] || state.hinted[row][col]) return true;
      }
    }
    return false;
  }

  hasProgress() {
    if (this.board.length !== SudokuConstants.BOARD_SIZE) return false;
    if (this.initial.length !== SudokuConstants.BOARD_SIZE) return false;
    if (this.gameOver) return false;
    if (this.timerStarted || SudokuTimer.getSeconds() > 0) return true;

    for (let row = 0; row < SudokuConstants.BOARD_SIZE; row++) {
      for (let col = 0; col < SudokuConstants.BOARD_SIZE; col++) {
        if (this.board[row][col] !== this.initial[row][col]) return true;
        if (this.notes[row][col].size > 0) return true;
        if (this.mistakes[row][col] || this.hinted[row][col]) return true;
      }
    }
    return false;
  }

  loadGameState() {
    return SudokuStorage.loadGameState();
  }

  saveGameState() {
    if (this.gameOver || this.isGenerating || this.board.length !== SudokuConstants.BOARD_SIZE) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    const state = {
      board: this.board,
      solution: this.solution,
      initial: this.initial,
      notes: this.notes.map(row => row.map(set => [...set])),
      mistakes: this.mistakes.map(row => row.map(Boolean)),
      hinted: this.hinted.map(row => row.map(Boolean)),
      selectedCell: this.selectedCell ? { ...this.selectedCell } : null,
      errors: this.errors,
      hintsUsed: this.hintsUsed,
      seconds: SudokuTimer.getSeconds(),
      isNoteMode: this.isNoteMode,
      difficulty: this.difficulty,
      gameOver: this.gameOver,
      timerStarted: this.timerStarted
    };

    if (SudokuStorage.saveGameState(state)) {
      this.dirty = false;
    } else {
      this.showStorageWarning();
    }
  }

  debouncedSave() {
    this.dirty = true;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveGameState();
    }, 300);
  }

  startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.dirty && !this.gameOver && !this.isGenerating && !this.isPaused) {
        this.saveGameState();
      }
    }, SudokuConstants.AUTO_SAVE_INTERVAL);
  }

  showStorageWarning() {
    if (this.storageWarningShown) return;
    this.storageWarningShown = true;
    this.storageWarningEl.hidden = false;
    SudokuUI.showToast('O progresso não será salvo neste navegador.', 'warning', 5000);
  }

  handleStorageEvent(event) {
    if (event.key === SudokuConstants.STORAGE_KEYS.SETTINGS && event.newValue) {
      this.settings = SudokuStorage.getSettings();
      this.applySettingsToForm();
      SudokuUI.applyTheme(this.settings.theme);
      if (this.board.length === SudokuConstants.BOARD_SIZE) this.renderAll();
      return;
    }

    if (event.key !== SudokuConstants.STORAGE_KEYS.CURRENT_GAME || !event.newValue) return;

    try {
      const incoming = JSON.parse(event.newValue);
      if (!incoming.tabId || incoming.tabId === this.tabId || this.gameOver) return;

      if (!this.isPaused && this.board.length === SudokuConstants.BOARD_SIZE) {
        this.togglePause({ save: false, silent: true, external: true });
      }
      const message = this.board.length === SudokuConstants.BOARD_SIZE
        ? 'Este jogo foi alterado em outra aba. A partida aqui foi pausada.'
        : 'Este jogo foi alterado em outra aba.';
      SudokuUI.showToast(message, 'warning', 5000);
      SudokuUI.announce(message);
    } catch (e) {
      // Ignore malformed writes from other tabs.
    }
  }

  // ---------- Game lifecycle ----------

  showResumeDialog(state) {
    const difficultyName = SudokuConstants.difficultyNames[state.difficulty] || state.difficulty;
    const limit = this.settings.errorLimit;
    const errors = limit > 0 ? `${state.errors}/${limit}` : String(state.errors);
    this.resumeInfoEl.textContent =
      `Dificuldade: ${difficultyName} · Tempo: ${SudokuRenderer.formatTime(state.seconds)} · Erros: ${errors}`;
    SudokuUI.openDialog(this.resumeDialog);
  }

  continueSavedGame() {
    const state = this.pendingSavedGame || SudokuStorage.loadGameState();
    SudokuUI.closeDialog(this.resumeDialog);
    if (!state) {
      this.startNewGame(this.difficultySelect.value, { force: true });
      return;
    }
    this.pendingSavedGame = null;
    this.restoreGameState(state);
  }

  newGameFromResume() {
    const state = this.pendingSavedGame;
    if (state) SudokuStorage.recordGameAbandoned(state.difficulty);
    this.pendingSavedGame = null;
    this.autoResumeAfterDialog = false;
    SudokuStorage.clearGameState();
    SudokuUI.closeDialog(this.resumeDialog);
    this.startNewGame(this.difficultySelect.value, { force: true });
  }

  restoreGameState(state) {
    this.sessionId += 1;
    this.clearPendingTimers();
    this.cancelTransientMistake(false);
    SudokuRenderer.resetAnimations();

    this.board = state.board.map(row => [...row]);
    this.solution = state.solution.map(row => [...row]);
    this.initial = state.initial.map(row => [...row]);
    this.notes = state.notes.map(row => row.map(cell => new Set(cell)));
    this.mistakes = state.mistakes.map(row => row.map(Boolean));
    this.hinted = state.hinted.map(row => row.map(Boolean));
    this.errors = state.errors;
    this.hintsUsed = state.hintsUsed;
    this.isNoteMode = state.isNoteMode;
    this.gameOver = false;
    this.isPaused = false;
    this.isGenerating = false;
    this.isResolving = false;
    this.transientMistake = null;
    this.difficulty = state.difficulty;
    this.difficultySelect.value = state.difficulty;
    this.selectedCell = state.selectedCell ? { ...state.selectedCell } : null;
    this.history = [];
    this.redoStack = [];
    this.dirty = false;
    this.autoResumeAfterDialog = false;

    this.resetPauseUI();
    this.showGenerating(false);
    SudokuRenderer.resetAnimations();
    SudokuTimer.reset();
    SudokuTimer.setSeconds(state.seconds);
    SudokuRenderer.updateTimerDisplay(state.seconds);

    const shouldRun = state.timerStarted || state.seconds > 0 ||
      this.settings.timerStart === 'on-load';
    this.timerStarted = shouldRun;
    if (shouldRun) {
      SudokuTimer.start(seconds => SudokuRenderer.updateTimerDisplay(seconds));
      SudokuRenderer.updateTimerDisplay(SudokuTimer.getSeconds());
    }

    this.updateModeUI();
    this.renderAll();
    this.saveGameState();

    SudokuUI.announce(
      `Jogo retomado. ${SudokuConstants.difficultyNames[this.difficulty]}, ` +
      `${SudokuRenderer.formatTime(state.seconds)}.`
    );
  }

  startNewGame(difficulty, options = {}) {
    if (this.isGenerating) return;

    if (!options.force && this.hasProgress()) {
      this.openNewGameConfirm();
      return;
    }

    const safeDifficulty = SudokuConstants.difficultyConfig[difficulty] ? difficulty : 'medium';
    const previousDifficulty = this.difficulty;
    const resumeOnFailure = this.timerStarted && !this.isPaused;

    this.autoResumeAfterDialog = false;
    this.closeGameDialogs();

    if (resumeOnFailure) this.togglePause({ save: true, silent: true });

    this.isGenerating = true;
    this.sessionId += 1;
    const token = this.sessionId;
    this.clearPendingTimers();

    this.difficultySelect.value = safeDifficulty;
    SudokuStorage.saveDifficulty(safeDifficulty);
    this.showGenerating(true);

    setTimeout(() => {
      if (token !== this.sessionId) return;

      try {
        const solution = SudokuBoard.generateSolution();
        const initial = SudokuBoard.createPuzzle(
          solution,
          SudokuConstants.difficultyConfig[safeDifficulty]
        );

        if (token !== this.sessionId) return;

        this.solution = solution;
        this.initial = initial;
        this.difficulty = safeDifficulty;
        this.isGenerating = false;
        this.resetGameState({ startTimer: this.settings.timerStart === 'on-load' });
        SudokuStorage.recordGameStarted(safeDifficulty);
        SudokuUI.announce(
          `Novo jogo. Dificuldade ${SudokuConstants.difficultyNames[safeDifficulty]}.`
        );
      } catch (error) {
        if (token !== this.sessionId) return;
        console.error('Falha ao gerar novo jogo:', error);
        this.isGenerating = false;
        this.showGenerating(false);
        this.difficulty = previousDifficulty;
        this.difficultySelect.value = previousDifficulty;
        this.renderAll();
        SudokuUI.showToast('Não foi possível gerar o tabuleiro. Tente novamente.', 'error', 5000);
        if (resumeOnFailure && this.isPaused) this.togglePause({ silent: true });
      }
    }, 30);
  }

  resetGameState(options = {}) {
    this.sessionId += 1;
    this.clearPendingTimers();
    this.cancelTransientMistake(false);
    SudokuRenderer.resetAnimations();

    this.board = this.initial.map(row => [...row]);
    this.notes = Array.from({ length: SudokuConstants.BOARD_SIZE }, () =>
      Array.from({ length: SudokuConstants.BOARD_SIZE }, () => new Set())
    );
    this.mistakes = Array.from({ length: SudokuConstants.BOARD_SIZE }, () =>
      Array.from({ length: SudokuConstants.BOARD_SIZE }, () => false)
    );
    this.hinted = Array.from({ length: SudokuConstants.BOARD_SIZE }, () =>
      Array.from({ length: SudokuConstants.BOARD_SIZE }, () => false)
    );

    this.selectedCell = null;
    this.errors = 0;
    this.hintsUsed = 0;
    this.history = [];
    this.redoStack = [];
    this.gameOver = false;
    this.isPaused = false;
    this.isGenerating = false;
    this.isResolving = false;
    this.transientMistake = null;
    this.timerStarted = false;
    this.dirty = false;
    this.autoResumeAfterDialog = false;

    this.resetPauseUI();
    this.showGenerating(false);
    SudokuTimer.reset();
    SudokuRenderer.updateTimerDisplay(0);

    this.updateModeUI();
    this.renderAll();

    if (options.startTimer) {
      this.timerStarted = true;
      SudokuTimer.start(seconds => SudokuRenderer.updateTimerDisplay(seconds));
    }

    this.saveGameState();
  }

  restartSame() {
    SudokuUI.closeDialog(this.gameOverDialog);
    this.autoResumeAfterDialog = false;
    this.sessionId += 1;
    this.clearPendingTimers();
    this.resetGameState({ startTimer: this.settings.timerStart === 'on-load' });
    SudokuStorage.recordGameStarted(this.difficulty);
    SudokuUI.announce('Jogo reiniciado. O mesmo tabuleiro continua.');
  }

  requestNewGame() {
    if (this.isGenerating) return;
    if (this.hasProgress()) {
      this.openNewGameConfirm();
    } else {
      this.startNewGame(this.difficultySelect.value, { force: true });
    }
  }

  openNewGameConfirm() {
    this.pauseForDialog();
    if (this.gameOver) return;
    SudokuUI.openDialog(this.newGameDialog);
  }

  cancelNewGame() {
    SudokuUI.closeDialog(this.newGameDialog);
  }

  confirmNewGame() {
    this.autoResumeAfterDialog = false;
    if (this.hasProgress()) {
      SudokuStorage.recordGameAbandoned(this.difficulty);
    }
    SudokuUI.closeDialog(this.newGameDialog);
    this.startNewGame(this.difficultySelect.value, { force: true });
  }

  newGameFromGameOver() {
    SudokuUI.closeDialog(this.gameOverDialog);
    this.startNewGame(this.difficulty, { force: true });
  }

  newGameFromWin() {
    SudokuUI.closeDialog(this.winDialog);
    this.startNewGame(this.difficulty, { force: true });
  }

  closeGameDialogs() {
    [this.menuDialog, this.newGameDialog, this.resumeDialog, this.gameOverDialog, this.winDialog].forEach(dialog => {
      SudokuUI.closeDialog(dialog);
    });
  }

  // ---------- Pause and dialogs ----------

  pauseForDialog() {
    if (this.isPaused || this.gameOver || this.isGenerating) return false;
    if (this.board.length !== SudokuConstants.BOARD_SIZE || !this.timerStarted) return false;
    this.togglePause({ save: true, silent: true });
    if (this.gameOver) return false;
    this.autoResumeAfterDialog = true;
    return true;
  }

  resumeAfterDialogIfNeeded() {
    if (!this.autoResumeAfterDialog) return;
    setTimeout(() => {
      if (!this.autoResumeAfterDialog) return;
      if (SudokuUI.isAnyDialogOpen()) return;
      this.autoResumeAfterDialog = false;
      if (this.isPaused && !this.gameOver) this.togglePause({ silent: true });
    }, 80);
  }

  togglePause(options = {}) {
    if (this.gameOver || this.isGenerating || this.board.length !== SudokuConstants.BOARD_SIZE) return;

    if (!this.isPaused) {
      if (this.isResolving &&
          this.settings.errorLimit > 0 &&
          this.errors >= this.settings.errorLimit) {
        this.handleGameOver();
        return;
      }

      this.cancelTransientMistake(false);
      if (options.save !== false) this.saveGameState();
      this.isPaused = true;
      SudokuTimer.stop();

      SudokuRenderer.setPaused(true);
      this.boardOverlayEl.hidden = false;
      this.sidebarEl.inert = true;
      this.pauseBtnEl.setAttribute('aria-pressed', 'true');
      this.pauseBtnEl.setAttribute('aria-label', 'Retomar jogo');
      this.pauseBtnEl.setAttribute('title', 'Retomar (Esc)');
      document.title = 'Pausado — Sudoku';

      this.renderAll();
      if (!options.silent) {
        this.boardOverlayEl.focus();
        SudokuUI.announce('Jogo pausado. O cronômetro está parado.');
      }
    } else {
      this.isPaused = false;
      SudokuRenderer.setPaused(false);
      this.boardOverlayEl.hidden = true;
      this.sidebarEl.inert = false;
      this.pauseBtnEl.setAttribute('aria-pressed', 'false');
      this.pauseBtnEl.setAttribute('aria-label', 'Pausar jogo');
      this.pauseBtnEl.setAttribute('title', 'Pausar (Esc)');
      document.title = 'Sudoku';

      if (this.timerStarted) {
        SudokuTimer.start(seconds => SudokuRenderer.updateTimerDisplay(seconds));
        SudokuRenderer.updateTimerDisplay(SudokuTimer.getSeconds());
      }

      this.renderAll();
      if (!options.silent) {
        const cell = this.selectedCell || { row: 0, col: 0 };
        SudokuRenderer.focusCell(cell.row, cell.col);
        SudokuUI.announce('Jogo retomado.');
      }
    }
  }

  resetPauseUI() {
    this.isPaused = false;
    SudokuRenderer.setPaused(false);
    this.boardOverlayEl.hidden = true;
    this.sidebarEl.inert = false;
    this.pauseBtnEl.setAttribute('aria-pressed', 'false');
    this.pauseBtnEl.setAttribute('aria-label', 'Pausar jogo');
    this.pauseBtnEl.setAttribute('title', 'Pausar (Esc)');
    document.title = 'Sudoku';
  }

  openMenu() {
    if (this.isGenerating) return;
    const wasGameOver = this.gameOver;
    this.pauseForDialog();
    if (!wasGameOver && this.gameOver) return;
    SudokuUI.openDialog(this.menuDialog);
  }

  openHelp() {
    if (this.isGenerating) return;
    const wasGameOver = this.gameOver;
    this.pauseForDialog();
    if (!wasGameOver && this.gameOver) return;
    SudokuUI.openDialog(this.helpDialog);
  }

  openSettings() {
    this.applySettingsToForm();
    if (this.settingsNoteEl) {
      this.settingsNoteEl.hidden = true;
      if (this.settingsNoteTimer) {
        clearTimeout(this.settingsNoteTimer);
        this.settingsNoteTimer = null;
      }
    }
    const wasGameOver = this.gameOver;
    this.pauseForDialog();
    if (!wasGameOver && this.gameOver) return;
    SudokuUI.openDialog(this.settingsDialog);
  }

  openRecords() {
    const wasGameOver = this.gameOver;
    this.pauseForDialog();
    if (!wasGameOver && this.gameOver) return;
    this.recordsDifficulty.value = this.difficulty;
    this.renderRecords();
    SudokuUI.openDialog(this.recordsDialog);
  }

  renderRecords() {
    const difficulty = this.recordsDifficulty.value;
    SudokuRenderer.renderBestTimes(this.recordsBestTimesEl, difficulty);
    SudokuRenderer.renderStats(this.recordsStatsEl, SudokuStorage.getStats(), difficulty);
  }

  resetStats() {
    SudokuStorage.resetStats();
    SudokuUI.closeDialog(this.resetStatsDialog);
    if (this.recordsDialog.open) this.renderRecords();
    SudokuUI.showToast('Estatísticas zeradas. Os melhores tempos foram mantidos.');
    SudokuUI.announce('Estatísticas zeradas.');
  }

  showGenerating(busy) {
    if (this.generatingOverlayEl) this.generatingOverlayEl.hidden = !busy;
    SudokuRenderer.setBusy(busy);
    this.newGameBtn.disabled = busy;
    this.difficultySelect.disabled = busy;
    this.menuBtn.disabled = busy;
    this.helpBtn.disabled = busy;
    this.recordsBtn.disabled = busy;
    this.settingsBtn.disabled = busy;
    this.updateActionButtons();
  }

  // ---------- Rendering and interaction state ----------

  canInteract() {
    return this.board.length === SudokuConstants.BOARD_SIZE &&
      this.initial.length === SudokuConstants.BOARD_SIZE &&
      !this.gameOver &&
      !this.isPaused &&
      !this.isResolving &&
      !this.isGenerating;
  }

  renderAll() {
    if (this.board.length !== SudokuConstants.BOARD_SIZE) {
      this.updateActionButtons();
      return;
    }

    SudokuRenderer.render({
      board: this.board,
      initial: this.initial,
      notes: this.notes,
      mistakes: this.mistakes,
      hinted: this.hinted,
      selectedCell: this.selectedCell,
      transientMistake: this.transientMistake,
      settings: this.settings,
      errors: this.errors,
      isNoteMode: this.isNoteMode,
      interactive: this.canInteract()
    });

    this.updateModeUI();
    this.updateActionButtons();
  }

  updateModeUI() {
    this.modeButtons.forEach(button => {
      const isActive = (button.dataset.mode === 'notes') === this.isNoteMode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    this.modeToggleEl.classList.toggle('is-notes', this.isNoteMode);
  }

  updateActionButtons() {
    const can = this.canInteract();
    const hasBoard = this.board.length === SudokuConstants.BOARD_SIZE &&
      this.initial.length === SudokuConstants.BOARD_SIZE;
    const selected = hasBoard ? this.selectedCell : null;
    const hasSelection = Boolean(selected);
    const selectedHasContent = hasSelection && (
      this.board[selected.row][selected.col] !== 0 ||
      this.notes[selected.row][selected.col].size > 0 ||
      this.mistakes[selected.row][selected.col]
    );
    const selectedIsLocked = hasSelection && (
      this.initial[selected.row][selected.col] !== 0 ||
      this.hinted[selected.row][selected.col]
    );

    this.undoBtn.disabled = !can || this.history.length === 0;
    this.redoBtn.disabled = !can || this.redoStack.length === 0;
    this.clearBtn.disabled = !can || !hasSelection || selectedIsLocked || !selectedHasContent;
    this.hintBtn.disabled = !can || this.hintsUsed >= SudokuConstants.MAX_HINTS || !this.hasEmptyCell();
    this.hintCountEl.textContent = String(Math.max(0, SudokuConstants.MAX_HINTS - this.hintsUsed));

    this.modeButtons.forEach(button => {
      button.disabled = !can;
    });

    this.pauseBtnEl.disabled = this.gameOver || this.isGenerating || !hasBoard;
    this.newGameBtn.disabled = this.isGenerating;
    this.difficultySelect.disabled = this.isGenerating;

    if (!can || !hasBoard) {
      this.numpadEl.querySelectorAll('.num-btn').forEach(button => {
        button.disabled = true;
      });
    }
  }

  hasEmptyCell() {
    if (this.board.length !== SudokuConstants.BOARD_SIZE ||
        this.initial.length !== SudokuConstants.BOARD_SIZE) return false;
    for (let row = 0; row < SudokuConstants.BOARD_SIZE; row++) {
      for (let col = 0; col < SudokuConstants.BOARD_SIZE; col++) {
        if (this.board[row][col] === 0 && this.initial[row][col] === 0 && !this.hinted[row][col]) {
          return true;
        }
      }
    }
    return false;
  }

  countPlaced(num) {
    let count = 0;
    for (let row = 0; row < SudokuConstants.BOARD_SIZE; row++) {
      for (let col = 0; col < SudokuConstants.BOARD_SIZE; col++) {
        if (this.board[row][col] === num && !this.mistakes[row][col]) count += 1;
      }
    }
    return count;
  }

  selectCell(row, col, options = {}) {
    if (this.board.length !== SudokuConstants.BOARD_SIZE) return;
    if (this.isGenerating || this.isPaused) return;
    if (!Number.isInteger(row) || !Number.isInteger(col)) return;
    if (row < 0 || col < 0 || row >= SudokuConstants.BOARD_SIZE || col >= SudokuConstants.BOARD_SIZE) return;

    const same = this.selectedCell &&
      this.selectedCell.row === row &&
      this.selectedCell.col === col;

    if (!same) {
      this.selectedCell = { row, col };
      this.renderAll();
    }

    if (options.focus) SudokuRenderer.focusCell(row, col);
  }

  setMode(mode) {
    if (!this.canInteract()) return;
    const isNoteMode = mode === 'notes';
    if (this.isNoteMode === isNoteMode) return;
    this.isNoteMode = isNoteMode;
    this.updateModeUI();
    this.renderAll();
    this.debouncedSave();
    SudokuUI.announce(isNoteMode ? 'Modo Notas ativado.' : 'Modo Normal ativado.');
  }

  toggleMode() {
    if (!this.canInteract()) return;
    this.setMode(this.isNoteMode ? 'normal' : 'notes');
  }

  startTimerIfNeeded() {
    if (this.timerStarted || this.isPaused || this.gameOver) return;
    this.timerStarted = true;
    SudokuTimer.start(seconds => SudokuRenderer.updateTimerDisplay(seconds));
    SudokuRenderer.updateTimerDisplay(SudokuTimer.getSeconds());
    this.debouncedSave();
  }

  inputNumber(num) {
    if (!this.canInteract()) return;
    if (!this.selectedCell) {
      SudokuUI.showToast('Selecione uma célula primeiro.');
      return;
    }

    const { row, col } = this.selectedCell;
    if (this.initial[row][col] !== 0 || this.hinted[row][col]) return;
    if (this.countPlaced(num) >= SudokuConstants.BOARD_SIZE) return;

    this.startTimerIfNeeded();

    if (this.isNoteMode) {
      if (this.board[row][col] !== 0) {
        SudokuUI.showToast('Limpe o valor antes de adicionar notas.');
        return;
      }

      this.pushHistory();
      if (this.notes[row][col].has(num)) {
        this.notes[row][col].delete(num);
      } else {
        this.notes[row][col].add(num);
      }
      this.redoStack = [];
      this.renderAll();
      this.debouncedSave();
      SudokuUI.haptic(8, this.settings.haptics);
      return;
    }

    if (this.board[row][col] === num && !this.mistakes[row][col]) return;

    if (num === this.solution[row][col]) {
      this.pushHistory();
      this.board[row][col] = num;
      this.mistakes[row][col] = false;
      this.notes[row][col].clear();

      if (this.settings.autoRemoveNotes) {
        SudokuBoard.clearNotesForNumber(this.notes, row, col, num);
      }

      this.redoStack = [];
      this.renderAll();
      this.debouncedSave();
      SudokuUI.haptic(10, this.settings.haptics);

      const flags = this.getCompletionFlags(row, col);
      if (flags.row || flags.col || flags.box) {
        SudokuRenderer.animateCompletion(row, col, flags);
      }

      if (SudokuBoard.checkWin(this.board, this.solution)) {
        this.handleWin();
        return;
      }

      if (flags.row || flags.col || flags.box) {
        const completed = [];
        if (flags.row) completed.push('linha');
        if (flags.col) completed.push('coluna');
        if (flags.box) completed.push('caixa');
        SudokuUI.announce(`${completed.join(' e ')} concluída${completed.length > 1 ? 's' : ''}.`);
      }
      return;
    }

    this.errors += 1;
    const limit = this.settings.errorLimit;
    SudokuUI.announce(limit > 0
      ? `Erro. ${this.errors} de ${limit}.`
      : `Erro. ${this.errors} ${this.errors === 1 ? 'erro' : 'erros'}.`);
    SudokuUI.haptic([60, 40, 60], this.settings.haptics);

    if (this.settings.keepMistakes) {
      this.pushHistory();
      this.board[row][col] = num;
      this.mistakes[row][col] = true;
      this.notes[row][col].clear();
      this.redoStack = [];
      this.renderAll();
      this.debouncedSave();

      if (limit > 0 && this.errors >= limit) this.handleGameOver();
      return;
    }

    this.transientMistake = { row, col, num };
    this.isResolving = true;
    this.renderAll();
    this.debouncedSave();

    if (this.mistakeTimer) clearTimeout(this.mistakeTimer);
    this.mistakeTimer = setTimeout(() => this.resolveTransientMistake(), SudokuConstants.ERROR_FLASH_DURATION);
  }

  resolveTransientMistake() {
    if (!this.transientMistake) return;
    this.mistakeTimer = null;
    this.transientMistake = null;
    this.isResolving = false;
    this.renderAll();

    if (this.settings.errorLimit > 0 && this.errors >= this.settings.errorLimit) {
      this.handleGameOver();
    } else {
      this.saveGameState();
    }
  }

  cancelTransientMistake(shouldRender = true) {
    if (this.mistakeTimer) {
      clearTimeout(this.mistakeTimer);
      this.mistakeTimer = null;
    }
    this.transientMistake = null;
    this.isResolving = false;
    if (shouldRender && this.board.length === SudokuConstants.BOARD_SIZE) {
      this.renderAll();
    }
  }

  getCompletionFlags(row, col) {
    const rowComplete = this.board[row].every((value, c) =>
      value !== 0 && !this.mistakes[row][c]
    );
    const colComplete = this.board.every((cells, r) =>
      cells[col] !== 0 && !this.mistakes[r][col]
    );
    const boxRow = Math.floor(row / SudokuConstants.BOX_SIZE) * SudokuConstants.BOX_SIZE;
    const boxCol = Math.floor(col / SudokuConstants.BOX_SIZE) * SudokuConstants.BOX_SIZE;
    let boxComplete = true;
    for (let r = boxRow; r < boxRow + SudokuConstants.BOX_SIZE; r++) {
      for (let c = boxCol; c < boxCol + SudokuConstants.BOX_SIZE; c++) {
        if (this.board[r][c] === 0 || this.mistakes[r][c]) boxComplete = false;
      }
    }
    return { row: rowComplete, col: colComplete, box: boxComplete };
  }

  clearCell() {
    if (!this.canInteract() || !this.selectedCell) return;

    const { row, col } = this.selectedCell;
    if (this.initial[row][col] !== 0 || this.hinted[row][col]) return;

    if (this.board[row][col] === 0 && this.notes[row][col].size === 0 && !this.mistakes[row][col]) {
      return;
    }

    this.pushHistory();
    this.board[row][col] = 0;
    this.notes[row][col].clear();
    this.mistakes[row][col] = false;
    this.redoStack = [];
    this.renderAll();
    this.debouncedSave();
    SudokuUI.haptic(8, this.settings.haptics);
  }

  useHint() {
    if (!this.canInteract()) return;
    if (this.hintsUsed >= SudokuConstants.MAX_HINTS) {
      SudokuUI.showToast(`Você já usou as ${SudokuConstants.MAX_HINTS} dicas desta partida.`);
      return;
    }

    let target = null;
    if (this.selectedCell) {
      const { row, col } = this.selectedCell;
      if (this.board[row][col] === 0 && this.initial[row][col] === 0 && !this.hinted[row][col]) {
        target = { row, col };
      }
    }

    if (!target) {
      for (let row = 0; row < SudokuConstants.BOARD_SIZE && !target; row++) {
        for (let col = 0; col < SudokuConstants.BOARD_SIZE; col++) {
          if (this.board[row][col] === 0 && this.initial[row][col] === 0 && !this.hinted[row][col]) {
            target = { row, col };
            break;
          }
        }
      }
    }

    if (!target) {
      SudokuUI.showToast('Não há células vazias para revelar.');
      return;
    }

    this.startTimerIfNeeded();
    this.pushHistory();

    const { row, col } = target;
    this.board[row][col] = this.solution[row][col];
    this.hinted[row][col] = true;
    this.mistakes[row][col] = false;
    this.notes[row][col].clear();
    if (this.settings.autoRemoveNotes) {
      SudokuBoard.clearNotesForNumber(this.notes, row, col, this.solution[row][col]);
    }
    this.hintsUsed += 1;
    this.selectedCell = { row, col };
    this.redoStack = [];

    this.renderAll();
    this.focusSelectedIfInBoard();
    SudokuRenderer.flashCell(row, col);
    this.debouncedSave();
    SudokuUI.haptic(15, this.settings.haptics);
    SudokuUI.announce(
      `Dica usada na linha ${row + 1}, coluna ${col + 1}. ` +
      `${SudokuConstants.MAX_HINTS - this.hintsUsed} restantes.`
    );

    if (SudokuBoard.checkWin(this.board, this.solution)) this.handleWin();
  }

  // ---------- History ----------

  pushHistory() {
    this.history.push(this.snapshot());
    if (this.history.length > SudokuConstants.MAX_HISTORY) this.history.shift();
  }

  snapshot() {
    return {
      board: this.board.map(row => [...row]),
      notes: this.notes.map(row => row.map(cell => [...cell])),
      mistakes: this.mistakes.map(row => row.map(Boolean)),
      hinted: this.hinted.map(row => row.map(Boolean)),
      selectedCell: this.selectedCell ? { ...this.selectedCell } : null,
      hintsUsed: this.hintsUsed
    };
  }

  restoreSnapshot(snapshot) {
    this.board = snapshot.board.map(row => [...row]);
    this.notes = snapshot.notes.map(row => row.map(cell => new Set(cell)));
    this.mistakes = snapshot.mistakes.map(row => row.map(Boolean));
    this.hinted = snapshot.hinted.map(row => row.map(Boolean));
    this.selectedCell = snapshot.selectedCell ? { ...snapshot.selectedCell } : null;
    this.hintsUsed = snapshot.hintsUsed;
  }

  focusSelectedIfInBoard() {
    if (!this.selectedCell) return;
    if (!this.boardEl.contains(document.activeElement)) return;
    SudokuRenderer.focusCell(this.selectedCell.row, this.selectedCell.col);
  }

  undo() {
    if (!this.canInteract() || this.history.length === 0) return;
    this.cancelTransientMistake(false);
    const current = this.snapshot();
    const previous = this.history.pop();
    this.redoStack.push(current);
    if (this.redoStack.length > SudokuConstants.MAX_HISTORY) this.redoStack.shift();
    this.restoreSnapshot(previous);
    this.renderAll();
    this.focusSelectedIfInBoard();
    this.debouncedSave();
    SudokuUI.haptic(8, this.settings.haptics);
    SudokuUI.announce('Jogada desfeita.');
  }

  redo() {
    if (!this.canInteract() || this.redoStack.length === 0) return;
    this.cancelTransientMistake(false);
    const current = this.snapshot();
    const next = this.redoStack.pop();
    this.history.push(current);
    if (this.history.length > SudokuConstants.MAX_HISTORY) this.history.shift();
    this.restoreSnapshot(next);
    this.renderAll();
    this.focusSelectedIfInBoard();
    this.debouncedSave();
    SudokuUI.haptic(8, this.settings.haptics);
    SudokuUI.announce('Jogada refeita.');
  }

  // ---------- Outcomes ----------

  handleWin() {
    if (this.gameOver) return;

    this.gameOver = true;
    this.autoResumeAfterDialog = false;
    this.sessionId += 1;
    this.clearPendingTimers();
    this.cancelTransientMistake(false);
    SudokuTimer.stop();
    const seconds = SudokuTimer.getSeconds();
    this.timerStarted = false;

    const difficulty = this.difficulty;
    const canSave = SudokuStorage.isAvailable();
    const result = canSave
      ? SudokuStorage.saveBestTime(difficulty, seconds, {
        errors: this.errors,
        hints: this.hintsUsed
      })
      : { isNewRecord: false, entryId: null, previousBest: null, rank: null };
    if (canSave) SudokuStorage.recordGameWon(difficulty, seconds, this.hintsUsed);
    SudokuStorage.clearGameState();
    this.dirty = false;

    this.renderAll();
    document.title = 'Resolvido — Sudoku';

    const difficultyName = SudokuConstants.difficultyNames[difficulty];
    const parts = [
      difficultyName,
      `Tempo ${SudokuRenderer.formatTime(seconds)}`,
      `${this.errors} ${this.errors === 1 ? 'erro' : 'erros'}`,
      `${this.hintsUsed} ${this.hintsUsed === 1 ? 'dica' : 'dicas'}`
    ];
    this.winSummaryEl.textContent = parts.join(' · ');
    this.newRecordMsgEl.hidden = !result.isNewRecord;
    SudokuRenderer.renderBestTimes(this.winBestTimesEl, difficulty, result.entryId, SudokuConstants.BEST_TIMES_LIMIT);

    if (this.shareResetTimer) {
      clearTimeout(this.shareResetTimer);
      this.shareResetTimer = null;
    }
    this.shareWinBtn.textContent = 'Compartilhar';

    this.shareText = `Sudoku · ${difficultyName} · ${SudokuRenderer.formatTime(seconds)} · ` +
      `${this.errors} ${this.errors === 1 ? 'erro' : 'erros'} · ` +
      `${this.hintsUsed} ${this.hintsUsed === 1 ? 'dica' : 'dicas'}`;

    this.scheduleDialog(this.winDialog, 250);

    SudokuUI.announce(
      `Parabéns! Sudoku concluído em ${SudokuRenderer.spokenTime(seconds)}.` +
      (result.isNewRecord ? ' Novo recorde.' : '')
    );
  }

  handleGameOver() {
    if (this.gameOver) return;

    this.gameOver = true;
    this.autoResumeAfterDialog = false;
    this.sessionId += 1;
    this.clearPendingTimers();
    this.cancelTransientMistake(false);
    SudokuTimer.stop();
    this.timerStarted = false;

    SudokuStorage.recordGameLost(this.difficulty);
    SudokuStorage.clearGameState();
    this.dirty = false;

    this.renderAll();
    document.title = 'Fim de jogo — Sudoku';

    const limit = this.settings.errorLimit;
    this.gameOverTextEl.textContent = limit > 0
      ? `Você atingiu o limite de ${limit} erros.`
      : 'A partida terminou.';

    this.scheduleDialog(this.gameOverDialog, 250);
    SudokuUI.announce(limit > 0
      ? `Fim de jogo. Você atingiu o limite de ${limit} erros.`
      : 'Fim de jogo.');
  }

  scheduleDialog(dialog, delay) {
    if (this.modalTimer) {
      clearTimeout(this.modalTimer);
      this.modalTimer = null;
    }
    const token = this.sessionId;
    this.modalTimer = setTimeout(() => {
      this.modalTimer = null;
      if (token === this.sessionId && this.gameOver) {
        SudokuUI.openDialog(dialog);
      }
    }, delay);
  }

  clearPendingTimers() {
    if (this.modalTimer) {
      clearTimeout(this.modalTimer);
      this.modalTimer = null;
    }
    if (this.mistakeTimer) {
      clearTimeout(this.mistakeTimer);
      this.mistakeTimer = null;
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  async shareResult() {
    if (!this.shareText) return;
    const result = await SudokuUI.shareResult({
      title: 'Sudoku',
      text: this.shareText
    });

    if (result.method === 'clipboard') {
      this.shareWinBtn.textContent = 'Copiado!';
      SudokuUI.announce('Resultado copiado para a área de transferência.');
    } else if (result.method === 'failed') {
      this.shareWinBtn.textContent = 'Falhou';
      SudokuUI.announce('Não foi possível compartilhar o resultado.');
    } else {
      return;
    }

    if (this.shareResetTimer) clearTimeout(this.shareResetTimer);
    this.shareResetTimer = setTimeout(() => {
      this.shareWinBtn.textContent = 'Compartilhar';
      this.shareResetTimer = null;
    }, 2200);
  }

  // ---------- Keyboard ----------

  handleKeydown(event) {
    if (SudokuUI.isAnyDialogOpen()) return;

    const key = event.key;
    const target = event.target;
    const gridCell = target.closest ? target.closest('[role="gridcell"]') : null;
    const interactive = target.closest
      ? target.closest('button, select, input, textarea, a, [contenteditable="true"], [role="button"]')
      : null;

    if (key === '?' || (key === '/' && event.shiftKey)) {
      event.preventDefault();
      this.openHelp();
      return;
    }

    if (key === 'Escape') {
      const formControl = target.closest ? target.closest('select, input, textarea') : null;
      if (formControl) return;
      if (this.board.length === SudokuConstants.BOARD_SIZE &&
          !this.gameOver && !this.isGenerating) {
        event.preventDefault();
        this.togglePause();
      }
      return;
    }

    if (interactive && !gridCell) return;

    if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const repeatableNavigation = key.startsWith('Arrow') || 'wasdWASD'.includes(key);
    if (event.repeat && !repeatableNavigation) return;

    if (key === ' ' || key === 'Spacebar') {
      if (event.repeat) return;
      event.preventDefault();
      this.toggleMode();
      return;
    }

    if (key === 'p' || key === 'P') {
      event.preventDefault();
      this.togglePause();
      return;
    }

    if (key === 'h' || key === 'H') {
      event.preventDefault();
      this.useHint();
      return;
    }

    if (key === 'n' || key === 'N') {
      event.preventDefault();
      this.toggleMode();
      return;
    }

    if (this.board.length !== SudokuConstants.BOARD_SIZE) return;

    const arrows = {
      ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
      ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
      ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
      ArrowRight: [0, 1], d: [0, 1], D: [0, 1]
    };

    if (arrows[key]) {
      event.preventDefault();
      if (!this.selectedCell) {
        this.selectCell(0, 0, { focus: true });
        return;
      }
      const [deltaRow, deltaCol] = arrows[key];
      const row = Math.min(8, Math.max(0, this.selectedCell.row + deltaRow));
      const col = Math.min(8, Math.max(0, this.selectedCell.col + deltaCol));
      this.selectCell(row, col, { focus: true });
      return;
    }

    if (/^[1-9]$/.test(key)) {
      event.preventDefault();
      this.inputNumber(Number(key));
      return;
    }

    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      this.clearCell();
    }
  }

  maybeShowFirstRunTip() {
    if (SudokuStorage.getFlag(SudokuConstants.STORAGE_KEYS.SEEN_TIP)) return;
    if (SudokuUI.isAnyDialogOpen()) {
      setTimeout(() => this.maybeShowFirstRunTip(), 1200);
      return;
    }
    SudokuStorage.setFlag(SudokuConstants.STORAGE_KEYS.SEEN_TIP, true);
    SudokuUI.showToast('Novo por aqui? Abra o menu e escolha “Como jogar”.', 'info', 5200);
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // Offline support is a progressive enhancement.
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.game = new SudokuGame();
});
