const SudokuRenderer = (() => {
  const SIZE = SudokuConstants.BOARD_SIZE;
  const BOX = SudokuConstants.BOX_SIZE;

  let boardEl, numpadEl, errorsEl, errorCountEl, timerEl;
  let cellCache = null;
  let numpadButtons = [];
  let errorDots = [];
  let animationToken = 0;

  function init() {
    boardEl = document.getElementById('board');
    numpadEl = document.getElementById('numpad');
    errorsEl = document.getElementById('errors');
    errorCountEl = document.getElementById('error-count');
    timerEl = document.getElementById('timer');

    buildBoard();
    cacheControls();
  }

  function buildBoard() {
    cellCache = Array.from({ length: SIZE }, () => Array(SIZE));
    boardEl.textContent = '';
    boardEl.setAttribute('aria-rowcount', String(SIZE));
    boardEl.setAttribute('aria-colcount', String(SIZE));

    const fragment = document.createDocumentFragment();

    for (let row = 0; row < SIZE; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.setAttribute('role', 'row');

      for (let col = 0; col < SIZE; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-rowindex', String(row + 1));
        cell.setAttribute('aria-colindex', String(col + 1));
        cell.setAttribute('aria-selected', 'false');
        cell.tabIndex = row === 0 && col === 0 ? 0 : -1;
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        const valueEl = document.createElement('span');
        valueEl.className = 'cell-value';
        valueEl.setAttribute('aria-hidden', 'true');
        cell.appendChild(valueEl);

        const notesGrid = document.createElement('div');
        notesGrid.className = 'notes-grid';
        notesGrid.setAttribute('aria-hidden', 'true');
        notesGrid.hidden = true;

        const noteEls = [];
        for (let n = 1; n <= SIZE; n++) {
          const note = document.createElement('div');
          note.className = 'note';
          notesGrid.appendChild(note);
          noteEls.push(note);
        }
        cell.appendChild(notesGrid);

        cellCache[row][col] = { cell, valueEl, notesGrid, noteEls };
        rowEl.appendChild(cell);
      }

      fragment.appendChild(rowEl);
    }

    boardEl.appendChild(fragment);
  }

  function cacheControls() {
    numpadButtons = Array.from(numpadEl.querySelectorAll('.num-btn'))
      .map(button => ({
        button,
        num: Number(button.dataset.num),
        badge: button.querySelector('.num-badge')
      }))
      .sort((a, b) => a.num - b.num);
  }

  function getCellElement(row, col) {
    return cellCache[row] && cellCache[row][col] ? cellCache[row][col].cell : null;
  }

  function focusCell(row, col) {
    const entry = cellCache[row] && cellCache[row][col];
    if (!entry) return;
    try {
      entry.cell.focus({ preventScroll: true });
    } catch (e) {
      entry.cell.focus();
    }
  }

  function render(state) {
    const {
      board,
      initial,
      notes,
      mistakes,
      hinted,
      selectedCell,
      transientMistake,
      settings,
      errors,
      isNoteMode,
      interactive
    } = state;

    if (!Array.isArray(board) || board.length !== SIZE) return;

    const selected = selectedCell &&
      Number.isInteger(selectedCell.row) &&
      Number.isInteger(selectedCell.col)
      ? selectedCell
      : null;
    const selectedValue = selected ? board[selected.row][selected.col] : 0;
    const highlightSame = !settings || settings.highlightSame !== false;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const entry = cellCache[row][col];
        const cell = entry.cell;
        const rawValue = board[row][col];
        const isGiven = initial[row][col] !== 0;
        const isHint = Boolean(hinted && hinted[row][col]);
        const isTransient = Boolean(
          transientMistake &&
          transientMistake.row === row &&
          transientMistake.col === col
        );
        const isMistake = isTransient || Boolean(mistakes && mistakes[row][col]);
        const displayValue = isTransient ? transientMistake.num : rawValue;
        const isSelected = Boolean(selected && selected.row === row && selected.col === col);
        const isInLine = Boolean(selected && !isSelected && (row === selected.row || col === selected.col));
        const isInBox = Boolean(
          selected &&
          !isSelected &&
          Math.floor(row / BOX) === Math.floor(selected.row / BOX) &&
          Math.floor(col / BOX) === Math.floor(selected.col / BOX)
        );
        const isSameNumber = Boolean(
          highlightSame &&
          selectedValue !== 0 &&
          rawValue === selectedValue &&
          !isSelected
        );

        cell.classList.toggle('given', isGiven);
        cell.classList.toggle('user-input', !isGiven && !isHint && rawValue !== 0 && !isMistake);
        cell.classList.toggle('hinted', isHint);
        cell.classList.toggle('error', isMistake);
        cell.classList.toggle('error-flash', isTransient);
        cell.classList.toggle('selected', isSelected);
        cell.classList.toggle('highlight-line', isInLine);
        cell.classList.toggle('highlight-box', isInBox);
        cell.classList.toggle('highlight-same', isSameNumber);

        entry.valueEl.textContent = displayValue !== 0 ? String(displayValue) : '';

        const cellNotes = notes && notes[row] && notes[row][col] ? notes[row][col] : new Set();
        const showNotes = displayValue === 0 && cellNotes.size > 0;
        entry.notesGrid.hidden = !showNotes;

        if (showNotes) {
          for (let n = 1; n <= SIZE; n++) {
            entry.noteEls[n - 1].textContent = cellNotes.has(n) ? String(n) : '';
          }
        }

        const labelParts = [`Linha ${row + 1}`, `coluna ${col + 1}`];
        if (isGiven) labelParts.push('pista');
        if (isHint) labelParts.push('valor revelado por dica');
        if (displayValue !== 0) {
          labelParts.push(`valor ${displayValue}${isMistake ? ' incorreto' : ''}`);
        } else {
          labelParts.push('vazio');
        }
        if (cellNotes.size > 0 && displayValue === 0) {
          labelParts.push(`notas ${[...cellNotes].sort((a, b) => a - b).join(', ')}`);
        }

        cell.setAttribute('aria-label', labelParts.join(', '));
        cell.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        cell.setAttribute('aria-readonly', isGiven || isHint ? 'true' : 'false');
        cell.tabIndex = isSelected || (!selected && row === 0 && col === 0) ? 0 : -1;
      }
    }

    updateNumpadState({
      board,
      selectedValue,
      isNoteMode: Boolean(isNoteMode),
      mistakes,
      interactive: interactive !== false
    });
    updateErrorDisplay(errors || 0, settings ? settings.errorLimit : SudokuConstants.MAX_ERRORS);
  }

  function updateNumpadState({ board, selectedValue, isNoteMode, mistakes, interactive }) {
    const counts = new Array(SIZE + 1).fill(0);

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const value = board[row][col];
        if (value === 0) continue;
        if (mistakes && mistakes[row] && mistakes[row][col]) continue;
        counts[value] += 1;
      }
    }

    numpadEl.classList.toggle('notes-mode', isNoteMode);

    for (const { button, num, badge } of numpadButtons) {
      const remaining = Math.max(0, SIZE - counts[num]);
      const complete = remaining === 0;
      const isSelectedNumber = selectedValue === num;
      const enabled = interactive !== false && !complete;

      button.disabled = !enabled;
      button.classList.toggle('selected-number', isSelectedNumber);
      button.classList.toggle('complete', complete);
      button.setAttribute(
        'aria-label',
        isNoteMode
          ? `Adicionar nota ${num}${complete ? ', número completo' : ''}`
          : complete
            ? `${num}, número completo`
            : `Inserir ${num}, ${remaining} ${remaining === 1 ? 'restante' : 'restantes'}`
      );

      if (badge) {
        badge.textContent = complete ? '✓' : (remaining < SIZE ? String(remaining) : '');
        badge.hidden = !complete && remaining === SIZE;
      }
    }
  }

  function updateErrorDisplay(errors, limit) {
    if (!errorCountEl || !errorsEl) return;

    const safeLimit = Number(limit) > 0 ? Number(limit) : 0;
    errorCountEl.textContent = safeLimit > 0 ? `${errors}/${safeLimit}` : String(errors);

    if (safeLimit === 0) {
      errorsEl.textContent = '';
      errorsEl.hidden = true;
      errorDots = [];
      return;
    }

    errorsEl.hidden = false;
    if (errorDots.length !== safeLimit) {
      errorsEl.textContent = '';
      errorDots = [];
      for (let i = 0; i < safeLimit; i++) {
        const dot = document.createElement('span');
        dot.className = 'error-dot';
        errorsEl.appendChild(dot);
        errorDots.push(dot);
      }
    }

    errorDots.forEach((dot, index) => {
      dot.classList.toggle('lost', index < errors);
    });
  }

  function updateTimerDisplay(seconds) {
    if (!timerEl) return;
    const text = formatTime(seconds);
    if (timerEl.textContent !== text) timerEl.textContent = text;
    timerEl.setAttribute('aria-label', `Tempo de jogo: ${spokenTime(seconds)}`);
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function spokenTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    const parts = [];
    if (hours) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
    if (mins) parts.push(`${mins} ${mins === 1 ? 'minuto' : 'minutos'}`);
    parts.push(`${secs} ${secs === 1 ? 'segundo' : 'segundos'}`);
    return parts.join(' e ');
  }

  function setPaused(paused) {
    if (!boardEl) return;
    boardEl.classList.toggle('is-paused', Boolean(paused));
    boardEl.toggleAttribute('inert', Boolean(paused));
    if (paused) {
      boardEl.setAttribute('aria-hidden', 'true');
    } else {
      boardEl.removeAttribute('aria-hidden');
    }
  }

  function setBusy(busy) {
    SudokuUI.setBusy(boardEl, busy);
  }

  function animateCompletion(row, col, flags = {}) {
    animationToken += 1;
    const token = animationToken;
    const targets = new Set();

    if (flags.row) {
      for (let c = 0; c < SIZE; c++) targets.add(cellCache[row][c]);
    }
    if (flags.col) {
      for (let r = 0; r < SIZE; r++) targets.add(cellCache[r][col]);
    }
    if (flags.box) {
      const boxRow = Math.floor(row / BOX) * BOX;
      const boxCol = Math.floor(col / BOX) * BOX;
      for (let r = boxRow; r < boxRow + BOX; r++) {
        for (let c = boxCol; c < boxCol + BOX; c++) targets.add(cellCache[r][c]);
      }
    }

    targets.forEach(entry => entry && entry.cell.classList.add('complete-flash'));

    setTimeout(() => {
      if (token !== animationToken) return;
      targets.forEach(entry => entry && entry.cell.classList.remove('complete-flash'));
    }, 700);
  }

  function resetAnimations() {
    animationToken += 1;
    if (!cellCache) return;
    for (const row of cellCache) {
      for (const entry of row) entry.cell.classList.remove('complete-flash');
    }
  }

  function flashCell(row, col) {
    animationToken += 1;
    const token = animationToken;
    const entry = cellCache[row] && cellCache[row][col];
    if (!entry) return;
    entry.cell.classList.add('complete-flash');
    setTimeout(() => {
      if (token !== animationToken) return;
      entry.cell.classList.remove('complete-flash');
    }, 700);
  }

  function renderBestTimes(container, difficulty, currentEntryId, limit = SudokuConstants.BEST_TIMES_LIMIT) {
    if (!container) return;
    container.textContent = '';

    const times = SudokuStorage.getBestTimes();
    const list = (times[difficulty] || []).slice(0, limit);

    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhum tempo registrado ainda.';
      container.appendChild(empty);
      return;
    }

    const ordered = document.createElement('ol');
    ordered.className = 'record-list';

    list.forEach((entry, index) => {
      const item = document.createElement('li');
      item.className = 'record-item';
      if (entry.id === currentEntryId) item.classList.add('is-current');

      const rank = document.createElement('span');
      rank.className = 'record-rank';
      rank.textContent = `${index + 1}º`;

      const main = document.createElement('div');
      main.className = 'record-main';

      const time = document.createElement('span');
      time.className = 'record-time';
      time.textContent = formatTime(entry.time);
      main.appendChild(time);

      const meta = document.createElement('span');
      meta.className = 'record-meta';
      const extras = [];
      if (entry.date) extras.push(entry.date);
      if (entry.errors > 0) extras.push(`${entry.errors} ${entry.errors === 1 ? 'erro' : 'erros'}`);
      if (entry.hints > 0) extras.push(`${entry.hints} ${entry.hints === 1 ? 'dica' : 'dicas'}`);
      if (entry.id === currentEntryId) extras.push('este jogo');
      meta.textContent = extras.join(' · ');
      main.appendChild(meta);

      item.appendChild(rank);
      item.appendChild(main);
      ordered.appendChild(item);
    });

    container.appendChild(ordered);
  }

  function renderStats(container, stats, difficulty) {
    if (!container) return;
    container.textContent = '';

    const item = stats && stats.difficulties ? stats.difficulties[difficulty] : null;
    if (!item) return;

    const played = item.played || 0;
    const won = item.won || 0;
    const rate = played > 0 ? Math.round((won / played) * 100) : null;
    const average = won > 0 ? Math.round(item.totalTime / won) : null;

    const cards = [
      ['Partidas', String(played)],
      ['Vitórias', String(won)],
      ['Aproveitamento', rate === null ? '—' : `${rate}%`],
      ['Melhor tempo', item.best === null ? '—' : formatTime(item.best)],
      ['Tempo médio', average === null ? '—' : formatTime(average)],
      ['Sequência atual', String(item.streak || 0)],
      ['Melhor sequência', String(item.bestStreak || 0)],
      ['Dicas usadas', String(item.hints || 0)],
      ['Derrotas', String(item.lost || 0)],
      ['Abandonadas', String(item.abandoned || 0)]
    ];

    for (const [label, value] of cards) {
      const card = document.createElement('div');
      card.className = 'stat-card';

      const labelEl = document.createElement('span');
      labelEl.className = 'stat-label';
      labelEl.textContent = label;

      const valueEl = document.createElement('strong');
      valueEl.className = 'stat-value';
      valueEl.textContent = value;

      card.appendChild(labelEl);
      card.appendChild(valueEl);
      container.appendChild(card);
    }
  }

  return {
    init,
    render,
    updateNumpadState,
    updateErrorDisplay,
    updateTimerDisplay,
    formatTime,
    spokenTime,
    getCellElement,
    focusCell,
    setPaused,
    setBusy,
    animateCompletion,
    resetAnimations,
    flashCell,
    renderBestTimes,
    renderStats
  };
})();
