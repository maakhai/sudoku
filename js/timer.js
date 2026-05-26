const SudokuTimer = (() => {
  let interval = null;
  let seconds = 0;
  let onUpdate = null;

  function start(callback) {
    stop();
    onUpdate = callback;
    interval = setInterval(() => {
      seconds++;
      if (onUpdate) onUpdate(seconds);
    }, 1000);
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function reset() {
    stop();
    seconds = 0;
  }

  function getSeconds() {
    return seconds;
  }

  function setSeconds(s) {
    seconds = s;
  }

  function isRunning() {
    return interval !== null;
  }

  return {
    start,
    stop,
    reset,
    getSeconds,
    setSeconds,
    isRunning
  };
})();
