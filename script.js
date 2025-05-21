const BOARD_SIZE = 8;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

let board = [];
let currentPlayer = 1; // 1: 黒, 2: 白
let cellSize;

function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  // 初期配置
  board[3][3] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  board[4][4] = 2;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ボード背景
  ctx.fillStyle = '#0a7d00';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // グリッド線
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  for (let i = 0; i <= BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, cellSize * BOARD_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(cellSize * BOARD_SIZE, i * cellSize);
    ctx.stroke();
  }

  // 石の描画
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== 0) {
        drawStone(x, y, board[y][x]);
      }
    }
  }
}

function drawStone(x, y, player) {
  const centerX = x * cellSize + cellSize / 2;
  const centerY = y * cellSize + cellSize / 2;
  const radius = cellSize * 0.4;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = player === 1 ? 'black' : 'white';
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function canPutStone(x, y, player) {
  if (board[y][x] !== 0) return false;

  // 8方向のチェック
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1],
  ];

  for (const [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let hasOpponentBetween = false;

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === 0) break;
      if (board[ny][nx] === player) {
        if (hasOpponentBetween) return true;
        else break;
      }
      hasOpponentBetween = true;
      nx += dx;
      ny += dy;
    }
  }
  return false;
}

function putStone(x, y, player) {
  if (!canPutStone(x, y, player)) return false;

  board[y][x] = player;

  // 石をひっくり返す
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1],
  ];

  for (const [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let stonesToFlip = [];

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === 0) break;
      if (board[ny][nx] === player) {
        for (const [fx, fy] of stonesToFlip) {
          board[fy][fx] = player;
        }
        break;
      }
      stonesToFlip.push([nx, ny]);
      nx += dx;
      ny += dy;
    }
  }
  return true;
}

function nextPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);

  if (putStone(x, y, currentPlayer)) {
    nextPlayer();
    drawBoard();
  }
});

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.min(window.innerWidth * 0.9, 600);
  canvas.style.width = width + 'px';
  canvas.width = width * dpr;
  canvas.height = width * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  cellSize = width / BOARD_SIZE;
  drawBoard();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

initBoard();
resizeCanvas();