const SudokuRenderer = (() => {
  const SIZE = SudokuConstants.BOARD_SIZE;
  const BOX = SudokuConstants.BOX_SIZE;

  let boardEl, numpadEl, errorsEl, timerEl;
  let cellCache = null;

  function init() {
    boardEl = document.getElementById('board');
    numpadEl = document.getElementById('numpad');
    errorsEl = document.getElementById('errors');
    timerEl = document.getElementById('timer');
    buildCellCache();
  }

  function buildCellCache() {
    cellCache = Array.from({ length: SIZE }, (_, row) =>
      Array.from({ length: SIZE }, (_, col) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        return cell;
      })
    );
  }

  function renderBoard(board, initial, notes, selectedCell) {
    boardEl.innerHTML = '';

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = cellCache[row][col];
        cell.className = 'cell';
        cell.textContent = '';

        const isGiven = initial[row][col] !== 0;
        if (isGiven) {
          cell.classList.add('given');
          cell.textContent = board[row][col];
        } else if (board[row][col] !== 0) {
          cell.classList.add('user-input');
          cell.textContent = board[row][col];
        } else if (notes[row][col].size > 0) {
          const notesGrid = document.createElement('div');
          notesGrid.className = 'notes-grid';
          for (let n = 1; n <= SIZE; n++) {
            const note = document.createElement('div');
            note.className = 'note';
            note.textContent = notes[row][col].has(n) ? n : '';
            notesGrid.appendChild(note);
          }
          cell.appendChild(notesGrid);
        }

        boardEl.appendChild(cell);
      }
    }
  }

  function updateHighlights(board, selectedCell) {
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.classList.remove('selected', 'highlight-line', 'highlight-same');
    });

    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const selectedValue = board[row][col];

    cells.forEach(cell => {
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);

      if (r === row && c === col) {
        cell.classList.add('selected');
      } else if (r === row || c === col) {
        cell.classList.add('highlight-line');
      }

      if (selectedValue !== 0 && board[r][c] === selectedValue && !(r === row && c === col)) {
        cell.classList.add('highlight-same');
      }
    });
  }

  function updateNumpadState(board) {
    const counts = {};
    for (let n = 1; n <= SIZE; n++) counts[n] = 0;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const val = board[row][col];
        if (val !== 0) counts[val]++;
      }
    }

    numpadEl.querySelectorAll('.num-btn').forEach(btn => {
      const num = parseInt(btn.dataset.num);
      const isComplete = counts[num] >= SIZE;
      btn.classList.toggle('disabled', isComplete);
      btn.disabled = isComplete;
    });
  }

  function getCellElement(row, col) {
    return boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
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
    const dots = errorsEl.querySelectorAll('.error-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('lost', i < errors);
    });
  }

  function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
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
