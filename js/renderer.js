const SudokuRenderer = (() => {
  const SIZE = SudokuConstants.BOARD_SIZE;
  const BOX = SudokuConstants.BOX_SIZE;

  let boardEl, numpadEl, errorsEl, timerEl;
  let cellCache = null;
  let valueCache = null;
  let notesCache = null;
  let numpadButtons = [];
  let errorDots = [];

  function init() {
    boardEl = document.getElementById('board');
    numpadEl = document.getElementById('numpad');
    errorsEl = document.getElementById('errors');
    timerEl = document.getElementById('timer');

    buildBoard();
    cacheControls();
  }

  function buildBoard() {
    cellCache = Array.from({ length: SIZE }, () => Array(SIZE));
    valueCache = Array.from({ length: SIZE }, () => Array(SIZE));
    notesCache = Array.from({ length: SIZE }, () => Array(SIZE));

    const fragment = document.createDocumentFragment();

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        const valueEl = document.createElement('span');
        valueEl.className = 'cell-value';
        cell.appendChild(valueEl);

        const notesGrid = document.createElement('div');
        notesGrid.className = 'notes-grid';
        notesGrid.style.display = 'none';

        const noteEls = [];
        for (let n = 1; n <= SIZE; n++) {
          const note = document.createElement('div');
          note.className = 'note';
          notesGrid.appendChild(note);
          noteEls.push(note);
        }
        cell.appendChild(notesGrid);

        cellCache[row][col] = cell;
        valueCache[row][col] = valueEl;
        notesCache[row][col] = { grid: notesGrid, notes: noteEls };

        fragment.appendChild(cell);
      }
    }

    boardEl.appendChild(fragment);
  }

  function cacheControls() {
    numpadButtons = Array.from(numpadEl.querySelectorAll('.num-btn'))
      .map(btn => ({ btn, num: Number(btn.dataset.num) }))
      .sort((a, b) => a.num - b.num);
    errorDots = Array.from(errorsEl.querySelectorAll('.error-dot'));
  }

  // Cells and note slots are created once in buildBoard; renderBoard only patches them.
  function renderBoard(board, initial, notes) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = cellCache[row][col];
        const value = board[row][col];
        const isGiven = initial[row][col] !== 0;
        const hasValue = value !== 0;

        cell.classList.toggle('given', isGiven);
        cell.classList.toggle('user-input', !isGiven && hasValue);
        cell.classList.remove('error', 'error-flash');

        valueCache[row][col].textContent = hasValue ? value : '';

        const notesEntry = notesCache[row][col];
        const cellNotes = notes[row][col];
        const showNotes = !hasValue && cellNotes.size > 0;

        notesEntry.grid.style.display = showNotes ? 'grid' : 'none';

        if (showNotes) {
          for (let n = 1; n <= SIZE; n++) {
            notesEntry.notes[n - 1].textContent = cellNotes.has(n) ? n : '';
          }
        }
      }
    }
  }

  function updateHighlights(board, selectedCell) {
    const hasSelection = selectedCell !== null && selectedCell !== undefined;
    const selectedRow = hasSelection ? selectedCell.row : -1;
    const selectedCol = hasSelection ? selectedCell.col : -1;
    const selectedValue = hasSelection ? board[selectedRow][selectedCol] : 0;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = cellCache[row][col];
        const isSelected = hasSelection && row === selectedRow && col === selectedCol;
        const isInLine = hasSelection && !isSelected && (row === selectedRow || col === selectedCol);
        const isSameNumber = selectedValue !== 0 &&
          board[row][col] === selectedValue &&
          !isSelected;

        cell.classList.toggle('selected', isSelected);
        cell.classList.toggle('highlight-line', isInLine);
        cell.classList.toggle('highlight-same', isSameNumber);
      }
    }
  }

  function updateNumpadState(board) {
    const counts = new Array(SIZE + 1).fill(0);

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const value = board[row][col];
        if (value !== 0) counts[value]++;
      }
    }

    for (const { btn, num } of numpadButtons) {
      const isComplete = counts[num] >= SIZE;
      btn.classList.toggle('disabled', isComplete);
      btn.disabled = isComplete;
    }
  }

  function getCellElement(row, col) {
    return cellCache[row][col] || null;
  }

  function addErrorFlash(row, col) {
    const cellEl = getCellElement(row, col);
    if (cellEl) {
      cellEl.classList.add('error', 'error-flash');
    }
    return cellEl;
  }

  function removeErrorFlash(cellEl) {
    if (cellEl) {
      cellEl.classList.remove('error-flash');
    }
  }

  function updateErrorDisplay(errors) {
    errorDots.forEach((dot, i) => {
      dot.classList.toggle('lost', i < errors);
    });
  }

  function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    const text = `${mins}:${secs}`;
    if (timerEl.textContent !== text) {
      timerEl.textContent = text;
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderBestTimes(difficulty, currentSeconds) {
    const bestTimesEl = document.getElementById('best-times');
    if (!bestTimesEl) return;

    const times = SudokuStorage.getBestTimes();
    const list = times[difficulty] || [];
    const diffName = SudokuConstants.difficultyNames[difficulty] || difficulty;

    if (list.length === 0) {
      bestTimesEl.innerHTML = `<h3>Melhores tempos - ${escapeHtml(diffName)}</h3><p style="color:var(--text-muted);font-size:0.85rem;">Nenhum tempo registrado ainda.</p>`;
      return;
    }

    const container = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = `Melhores tempos - ${diffName}`;
    container.appendChild(heading);

    const ol = document.createElement('ol');
    list.forEach(entry => {
      const li = document.createElement('li');
      if (entry.time === currentSeconds) {
        li.className = 'is-current';
      }

      const timeSpan = document.createElement('span');
      timeSpan.className = 'time-value';
      timeSpan.textContent = formatTime(entry.time);

      const dateSpan = document.createElement('span');
      dateSpan.className = 'time-date';
      dateSpan.textContent = entry.date;

      li.appendChild(timeSpan);
      li.appendChild(dateSpan);
      ol.appendChild(li);
    });
    container.appendChild(ol);

    bestTimesEl.innerHTML = '';
    bestTimesEl.appendChild(container);
  }

  return {
    init,
    renderBoard,
    updateHighlights,
    updateNumpadState,
    getCellElement,
    addErrorFlash,
    removeErrorFlash,
    updateErrorDisplay,
    updateTimerDisplay,
    formatTime,
    renderBestTimes
  };
})();
