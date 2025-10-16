const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const boardWrapper = document.querySelector(".board-wrapper");

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
    let r = radius;
    if (width < 2 * r) r = width / 2;
    if (height < 2 * r) r = height / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + width, y, x + width, y + height, r);
    this.arcTo(x + width, y + height, x, y + height, r);
    this.arcTo(x, y + height, x, y, r);
    this.arcTo(x, y, x + width, y, r);
    this.closePath();
    return this;
  };
}
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const levelEl = document.getElementById("level");
const shuffleBtn = document.getElementById("shuffle");
const restartBtn = document.getElementById("restart");
const levelNoticeTemplate = document.getElementById("level-notice-template");

const EMOJI_POOL = [
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🐔",
  "🐧",
  "🐦",
  "🐤",
  "🐣",
  "🦆",
  "🦉",
  "🐺",
  "🦄",
  "🐝",
  "🐛",
  "🦋",
  "🐌",
  "🐞",
  "🐢",
  "🐍",
  "🐙",
  "🐠",
  "🐳",
  "🐬",
  "🦀",
  "🦞",
  "🦐",
  "🐊",
  "🦓",
  "🦒",
  "🐘",
  "🦛",
  "🐪",
  "🦘",
  "🦥",
  "🐿️",
  "🐉",
  "🐲",
  "🦕",
];

const TILE_BACKGROUNDS = [
  "#f94144",
  "#f3722c",
  "#f9c74f",
  "#90be6d",
  "#43aa8b",
  "#577590",
  "#7b2cbf",
  "#f9844a",
  "#4d908e",
];

const LEVEL_SETTINGS = [
  { cols: 8, rows: 6, time: 180 },
  { cols: 8, rows: 8, time: 180 },
  { cols: 10, rows: 6, time: 170 },
  { cols: 10, rows: 8, time: 160 },
  { cols: 12, rows: 8, time: 150 },
  { cols: 12, rows: 10, time: 150 },
];

const state = {
  level: 1,
  cols: 0,
  rows: 0,
  grid: [],
  selection: null,
  highlightPath: null,
  timeRemaining: 0,
  timerId: null,
  gameOver: false,
};

const render = {
  tileSize: 64,
  offsetX: 0,
  offsetY: 0,
};

let resizeTimer = null;

init();

function init() {
  canvas.addEventListener("click", handleCanvasClick);
  shuffleBtn.addEventListener("click", () => {
    if (state.gameOver) return;
    shuffleBoard();
  });
  restartBtn.addEventListener("click", () => startLevel(1));
  window.addEventListener("resize", handleResize);
  startLevel(1);
}

function startLevel(level) {
  cleanupTimer();

  const settings = LEVEL_SETTINGS[(level - 1) % LEVEL_SETTINGS.length];
  state.level = level;
  state.cols = settings.cols;
  state.rows = settings.rows;
  state.grid = buildGrid(settings.cols, settings.rows);
  state.selection = null;
  state.highlightPath = null;
  state.gameOver = false;
  state.timeRemaining = settings.time - Math.floor((level - 1) / LEVEL_SETTINGS.length) * 10;
  state.timeRemaining = Math.max(state.timeRemaining, 90);

  levelEl.textContent = String(level);
  statusEl.textContent = "Find and clear all the matching pairs!";
  resizeCanvas();
  renderBoard();
  setupTimer();
}

function buildGrid(cols, rows) {
  const internalSize = cols * rows;
  if (internalSize % 2 !== 0) {
    throw new Error("Grid must contain an even number of tiles.");
  }

  const pairsNeeded = internalSize / 2;
  const emojiChoices = [];

  while (emojiChoices.length < pairsNeeded) {
    shuffleArray(EMOJI_POOL);
    for (const emoji of EMOJI_POOL) {
      if (emojiChoices.length < pairsNeeded) {
        emojiChoices.push(emoji);
      } else {
        break;
      }
    }
  }

  const tilePool = emojiChoices.flatMap((emoji) => [emoji, emoji]);
  shuffleArray(tilePool);

  const grid = Array.from({ length: rows + 2 }, () =>
    Array.from({ length: cols + 2 }, () => null)
  );

  let index = 0;
  for (let r = 1; r <= rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      const tile = {
        emoji: tilePool[index],
        color: TILE_BACKGROUNDS[index % TILE_BACKGROUNDS.length],
      };
      grid[r][c] = tile;
      index += 1;
    }
  }

  return grid;
}

function resizeCanvas() {
  const { cols, rows } = state;
  if (!cols || !rows) return;

  const wrapperWidth = boardWrapper?.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth || 720;
  const availableWidth = Math.min(Math.max(wrapperWidth, 240), 960);

  const viewportHeight = window.innerHeight || 720;
  const availableHeight = Math.max(Math.min(viewportHeight - 240, 640), 220);

  const tileWidth = availableWidth / cols;
  const tileHeight = availableHeight / rows;
  render.tileSize = Math.floor(Math.min(tileWidth, tileHeight, 96));

  canvas.width = render.tileSize * cols;
  canvas.height = render.tileSize * rows;

  render.offsetX = 0;
  render.offsetY = 0;

  canvas.style.width = "100%";
  canvas.style.maxWidth = `${canvas.width}px`;
  canvas.style.height = "auto";
}

function renderBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTiles();
  drawSelection();
  drawPath();
}

function drawTiles() {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.floor(render.tileSize * 0.7)}px "Segoe UI Emoji", sans-serif`;

  for (let r = 1; r <= state.rows; r += 1) {
    for (let c = 1; c <= state.cols; c += 1) {
      const tile = state.grid[r][c];
      if (!tile) continue;

      const { x, y } = gridToCanvas(c, r);
      const padding = Math.floor(render.tileSize * 0.12);

      ctx.fillStyle = tile.color;
      ctx.beginPath();
      ctx.roundRect(x + padding, y + padding, render.tileSize - padding * 2, render.tileSize - padding * 2, 12);
      ctx.fill();

      ctx.fillStyle = "#101010";
      ctx.fillText(tile.emoji, x + render.tileSize / 2, y + render.tileSize / 2 + 3);
    }
  }
}

function drawSelection() {
  if (!state.selection) return;
  const { col, row } = state.selection;
  const { x, y } = gridToCanvas(col, row);

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x + 4, y + 4, render.tileSize - 8, render.tileSize - 8);
}

function drawPath() {
  if (!state.highlightPath) return;
  const path = state.highlightPath;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  const first = gridToCanvasCenter(path[0].col, path[0].row);
  ctx.moveTo(first.x, first.y);

  for (let i = 1; i < path.length; i += 1) {
    const next = gridToCanvasCenter(path[i].col, path[i].row);
    ctx.lineTo(next.x, next.y);
  }

  ctx.stroke();
}

function handleCanvasClick(event) {
  if (state.gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const col = Math.floor(x / render.tileSize) + 1;
  const row = Math.floor(y / render.tileSize) + 1;

  if (!inPlayableBounds(col, row)) {
    deselect();
    return;
  }

  const tile = state.grid[row][col];
  if (!tile) {
    deselect();
    return;
  }

  if (!state.selection) {
    state.selection = { row, col };
    state.highlightPath = null;
    renderBoard();
    return;
  }

  if (state.selection.row === row && state.selection.col === col) {
    deselect();
    return;
  }

  attemptMatch({ row, col });
}

function attemptMatch(target) {
  const source = state.selection;
  if (!source) return;

  const startTile = state.grid[source.row][source.col];
  const targetTile = state.grid[target.row][target.col];

  if (!startTile || !targetTile) {
    deselect();
    return;
  }

  if (startTile.emoji !== targetTile.emoji) {
    statusEl.textContent = "Tiles must match. Try again!";
    deselect();
    return;
  }

  const path = findPath(source, target);
  if (!path) {
    statusEl.textContent = "No link path with ≤2 turns.";
    deselect();
    return;
  }

  state.highlightPath = path;
  renderBoard();

  setTimeout(() => {
    removeTiles(source, target);
    statusEl.textContent = "Great! Keep matching.";
    deselect();
    renderBoard();
    checkBoardState();
  }, 160);
}

function removeTiles(a, b) {
  state.grid[a.row][a.col] = null;
  state.grid[b.row][b.col] = null;
}

function checkBoardState() {
  if (isBoardCleared()) {
    cleanupTimer();
    statusEl.textContent = "Level cleared!";
    state.gameOver = true;
    showLevelNotice();
    return;
  }

  if (!hasAnyMoves()) {
    statusEl.textContent = "No moves left, shuffling tiles.";
    shuffleBoard();
  }
}

function shuffleBoard() {
  const tiles = [];
  for (let r = 1; r <= state.rows; r += 1) {
    for (let c = 1; c <= state.cols; c += 1) {
      const tile = state.grid[r][c];
      if (tile) {
        tiles.push(tile);
      }
    }
  }

  let attempts = 0;
  let hasMoves = false;

  while (attempts < 12 && !hasMoves) {
    shuffleArray(tiles);
    let index = 0;
    for (let r = 1; r <= state.rows; r += 1) {
      for (let c = 1; c <= state.cols; c += 1) {
        if (state.grid[r][c]) {
          state.grid[r][c] = tiles[index];
          index += 1;
        }
      }
    }
    hasMoves = hasAnyMoves();
    attempts += 1;
  }

  state.highlightPath = null;
  state.selection = null;
  renderBoard();
}

function hasAnyMoves() {
  const positions = [];
  for (let r = 1; r <= state.rows; r += 1) {
    for (let c = 1; c <= state.cols; c += 1) {
      if (state.grid[r][c]) {
        positions.push({ row: r, col: c });
      }
    }
  }

  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i];
      const b = positions[j];
      const tileA = state.grid[a.row][a.col];
      const tileB = state.grid[b.row][b.col];
      if (tileA && tileB && tileA.emoji === tileB.emoji) {
        const path = findPath(a, b);
        if (path) {
          return true;
        }
      }
    }
  }

  return false;
}

function isBoardCleared() {
  for (let r = 1; r <= state.rows; r += 1) {
    for (let c = 1; c <= state.cols; c += 1) {
      if (state.grid[r][c]) {
        return false;
      }
    }
  }
  return true;
}

function findPath(start, end) {
  const rows = state.rows + 2;
  const cols = state.cols + 2;
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
  ];

  const visited = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Array(4).fill(Infinity))
  );

  const queue = [];
  queue.push({
    row: start.row,
    col: start.col,
    dir: -1,
    turns: 0,
    path: [{ row: start.row, col: start.col }],
  });

  while (queue.length > 0) {
    const current = queue.shift();

    for (let dir = 0; dir < directions.length; dir += 1) {
      const { dr, dc } = directions[dir];
      let nextRow = current.row + dr;
      let nextCol = current.col + dc;
      let turns = current.dir === -1 || current.dir === dir ? current.turns : current.turns + 1;

      while (inBounds(nextCol, nextRow, cols, rows) && turns <= 2) {
        const cell = state.grid[nextRow]?.[nextCol] ?? null;
        if (!(nextRow === end.row && nextCol === end.col) && cell) {
          break;
        }

        if (visited[nextRow][nextCol][dir] <= turns) {
          nextRow += dr;
          nextCol += dc;
          continue;
        }

        visited[nextRow][nextCol][dir] = turns;

        const path = current.path.concat({ row: nextRow, col: nextCol });
        if (nextRow === end.row && nextCol === end.col) {
          return path;
        }

        queue.push({
          row: nextRow,
          col: nextCol,
          dir,
          turns,
          path,
        });

        nextRow += dr;
        nextCol += dc;
      }
    }
  }

  return null;
}

function inBounds(col, row, cols, rows) {
  return col >= 0 && col < cols && row >= 0 && row < rows;
}

function inPlayableBounds(col, row) {
  return col >= 1 && col <= state.cols && row >= 1 && row <= state.rows;
}

function deselect() {
  state.selection = null;
  state.highlightPath = null;
  renderBoard();
}

function gridToCanvas(col, row) {
  return {
    x: render.offsetX + (col - 1) * render.tileSize,
    y: render.offsetY + (row - 1) * render.tileSize,
  };
}

function gridToCanvasCenter(col, row) {
  let centerX = render.offsetX + (col - 0.5) * render.tileSize;
  let centerY = render.offsetY + (row - 0.5) * render.tileSize;

  if (col < 1) {
    centerX = render.offsetX;
  } else if (col > state.cols) {
    centerX = render.offsetX + state.cols * render.tileSize;
  }

  if (row < 1) {
    centerY = render.offsetY;
  } else if (row > state.rows) {
    centerY = render.offsetY + state.rows * render.tileSize;
  }

  return { x: centerX, y: centerY };
}

function handleResize() {
  if (!state.cols || !state.rows) return;
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = setTimeout(() => {
    resizeCanvas();
    renderBoard();
  }, 120);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function setupTimer() {
  updateTimerDisplay();
  cleanupTimer();
  state.timerId = setInterval(() => {
    state.timeRemaining -= 1;
    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      updateTimerDisplay();
      handleTimeUp();
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function cleanupTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerDisplay() {
  const minutes = Math.floor(state.timeRemaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(state.timeRemaining % 60)
    .toString()
    .padStart(2, "0");
  timerEl.textContent = `${minutes}:${seconds}`;
}

function handleTimeUp() {
  cleanupTimer();
  state.gameOver = true;
  statusEl.textContent = "Time's up! Tap restart to try again.";
}

function showLevelNotice() {
  const fragment = levelNoticeTemplate.content.cloneNode(true);
  const notice = fragment.querySelector(".level-notice");
  const levelRef = fragment.querySelector("[data-ref=\"level\"]");
  const nextButton = fragment.querySelector("[data-action=\"next-level\"]");

  if (!notice || !levelRef || !nextButton) {
    return;
  }

  levelRef.textContent = String(state.level);
  nextButton.addEventListener("click", () => {
    notice.remove();
    startLevel(state.level + 1);
  });

  document.body.appendChild(fragment);
}
