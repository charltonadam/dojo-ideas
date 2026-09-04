(function () {
  const stage = document.getElementById('stage');
  const boardsLayer = document.getElementById('boardsLayer');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMessage = document.getElementById('overlayMessage');
  const startBtn = document.getElementById('startBtn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const body = document.body;

  const HEIGHTS = {
    low:  { bottom: 112, pose: 'pose-kick-low' },
    mid:  { bottom: 170, pose: 'pose-kick-mid' },
    high: { bottom: 194, pose: 'pose-kick-high' },
  };
  const KEY_MAP = {
    ArrowDown: 'low',
    ArrowRight: 'mid',
    ArrowUp: 'high',
  };

  const CHAR_HIT_X = 165;    // px from left of stage where a kick connects
  const HIT_RADIUS = 44;
  const BOARD_WIDTH = 22;
  const KICK_DURATION = 260; // ms the kick pose (and hit window) stays active

  const BREAKS_PER_TIER = 10;   // spawn frequency steps up every N boards broken
  const SPAWN_BASE = 1300;      // ms between spawns at tier 0
  const SPAWN_STEP = 150;       // ms faster per tier
  const SPAWN_FLOOR = 450;      // fastest spawn interval allowed
  const SPAWN_JITTER = 450;     // ms of random variance added on top

  let running = false;
  let boards = [];
  let score = 0;
  let best = Number(localStorage.getItem('boardBreakerBest') || 0);
  bestEl.textContent = best;

  let speed = 150;          // px/sec
  let spawnTimer = 0;
  let nextSpawnIn = 1000;
  let lastTime = 0;
  let kickActive = null;    // 'low' | 'mid' | 'high' | null
  let kickTimeout = null;
  let rafId = null;

  function stageWidth() {
    return stage.clientWidth;
  }

  function nextSpawnDelay() {
    const tier = Math.floor(score / BREAKS_PER_TIER);
    const base = Math.max(SPAWN_FLOOR, SPAWN_BASE - tier * SPAWN_STEP);
    return base + Math.random() * SPAWN_JITTER;
  }

  function setPose(type) {
    body.classList.remove('pose-idle', 'pose-kick-low', 'pose-kick-mid', 'pose-kick-high');
    body.classList.add(type ? HEIGHTS[type].pose : 'pose-idle');
  }

  function doKick(type) {
    if (!running || kickActive) return;
    kickActive = type;
    setPose(type);
    checkHits(type);
    clearTimeout(kickTimeout);
    kickTimeout = setTimeout(() => {
      kickActive = null;
      setPose(null);
    }, KICK_DURATION);
  }

  function spawnBoard() {
    const types = ['low', 'mid', 'high'];
    const type = types[Math.floor(Math.random() * types.length)];
    const el = document.createElement('div');
    el.className = 'board';
    el.style.bottom = HEIGHTS[type].bottom + 'px';
    const x = stageWidth() + 20;
    el.style.left = x + 'px';
    boardsLayer.appendChild(el);
    boards.push({ el, x, type, broken: false });
  }

  function checkHits(type) {
    boards.forEach((b) => {
      if (b.broken || b.type !== type) return;
      if (Math.abs(b.x - CHAR_HIT_X) <= HIT_RADIUS) {
        breakBoard(b);
      }
    });
  }

  function breakBoard(b) {
    b.broken = true;
    b.el.classList.add('breaking');
    setTimeout(() => b.el.remove(), 260);
    score += 1;
    scoreEl.textContent = score;
    speed = Math.min(420, 150 + score * 8);
  }

  function endGame() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    if (score > best) {
      best = score;
      localStorage.setItem('boardBreakerBest', String(best));
      bestEl.textContent = best;
    }
    overlayTitle.textContent = 'Board Broke You!';
    overlayMessage.textContent = `You scored ${score}. Press Start to try again.`;
    startBtn.textContent = 'Try Again';
    overlay.classList.remove('hidden');
  }

  function tick(time) {
    if (!running) return;
    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;

    spawnTimer += dt;
    if (spawnTimer >= nextSpawnIn) {
      spawnTimer = 0;
      nextSpawnIn = nextSpawnDelay();
      spawnBoard();
    }

    if (kickActive) checkHits(kickActive);

    const dx = speed * (dt / 1000);
    boards.forEach((b) => {
      if (b.broken) return;
      b.x -= dx;
      b.el.style.left = b.x + 'px';
      if (b.x < CHAR_HIT_X - HIT_RADIUS - BOARD_WIDTH) {
        endGame();
      }
    });
    boards = boards.filter((b) => !b.broken || b.el.isConnected);

    rafId = requestAnimationFrame(tick);
  }

  function startGame() {
    boards.forEach((b) => b.el.remove());
    boards = [];
    score = 0;
    scoreEl.textContent = '0';
    speed = 150;
    spawnTimer = 0;
    nextSpawnIn = nextSpawnDelay();
    lastTime = 0;
    kickActive = null;
    clearTimeout(kickTimeout);
    setPose(null);
    overlay.classList.add('hidden');
    running = true;
    rafId = requestAnimationFrame(tick);
  }

  startBtn.addEventListener('click', startGame);

  window.addEventListener('keydown', (e) => {
    const type = KEY_MAP[e.key];
    if (!type) return;
    e.preventDefault();
    if (!running) return;
    doKick(type);
  });

  document.querySelectorAll('.touch-controls button').forEach((btn) => {
    btn.addEventListener('click', () => doKick(btn.dataset.kick));
  });
})();
