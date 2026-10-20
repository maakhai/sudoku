const SudokuTimer = (() => {
  const TICK_INTERVAL = 1000;

  let interval = null;
  let elapsed = 0;
  let startedAt = null;
  let onUpdate = null;
  let lastReported = null;

  function getSeconds() {
    const running = startedAt === null
      ? 0
      : Math.floor((Date.now() - startedAt) / 1000);
    return elapsed + running;
  }

  function tick() {
    const seconds = getSeconds();
    if (seconds !== lastReported) {
      lastReported = seconds;
      if (onUpdate) onUpdate(seconds);
    }
  }

  function start(callback) {
    stop();
    onUpdate = callback;
    startedAt = Date.now();
    lastReported = null;
    interval = setInterval(tick, TICK_INTERVAL);
    tick();
  }

  function stop() {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }

    if (startedAt !== null) {
      elapsed += Math.floor((Date.now() - startedAt) / 1000);
      startedAt = null;
    }
  }

  function reset() {
    stop();
    elapsed = 0;
    lastReported = null;
  }

  function setSeconds(seconds) {
    elapsed = seconds;
    lastReported = null;
    if (startedAt !== null) {
      startedAt = Date.now();
    }
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
