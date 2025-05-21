const BOARD_SIZE = 8;
const CELL_SIZE = 50;
let board = [];
let currentPlayer = 'B'; // B = 黒, W = 白

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');
const strengthSelect = document.getElementById('strengthSelect');

// 初期化
function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
  currentPlayer = 'B';
  drawBoard();
  updateStatus();
}

// 描画
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 緑の背景
  ctx.fillStyle = '#007700';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 枠線
  ctx.strokeStyle = '#003300';
  for (let i = 0; i <= BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, BOARD_SIZE * CELL_SIZE);
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(BOARD_SIZE * CELL_SIZE, i * CELL_SIZE);
    ctx.stroke();
  }

  // 石の描画
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = board[y][x];
      if (cell) {
        ctx.beginPath();
        ctx.arc(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = cell === 'B' ? 'black' : 'white';
        ctx.fill();
      }
    }
  }
}

// 判定
function isValidMove(x, y, player) {
  if (board[y][x] !== null) return false;
  const opponent = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1], [0, 1],  [1, 1]
  ];

  for (let [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let found = false;

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === opponent) {
        found = true;
      } else if (board[ny][nx] === player && found) {
        return true;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }

  return false;
}

function hasValidMoves(player) {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidMove(x, y, player)) return true;
    }
  }
  return false;
}

function placeStone(x, y, player) {
  if (!isValidMove(x, y, player)) return false;

  board[y][x] = player;
  const opponent = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1], [0, 1],  [1, 1]
  ];

  for (let [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let stones = [];

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === opponent) {
        stones.push([nx, ny]);
      } else if (board[ny][nx] === player) {
        for (let [fx, fy] of stones) {
          board[fy][fx] = player;
        }
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }

  return true;
}

function countStones() {
  let black = 0, white = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 'B') black++;
      else if (board[y][x] === 'W') white++;
    }
  }
  return { black, white };
}

function switchPlayer() {
  currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
}

function updateStatus() {
  const score = countStones();
  statusDiv.textContent = `現在の手番: ${currentPlayer === 'B' ? '黒' : '白'}`;
  scoreDiv.textContent = `黒: ${score.black} / 白: ${score.white}`;
}

function gameOver() {
  const score = countStones();
  statusDiv.textContent = 'ゲーム終了！';
  scoreDiv.textContent = `黒: ${score.black} / 白: ${score.white}`;
}

function handleTurn() {
  if (!hasValidMoves(currentPlayer)) {
    switchPlayer();
    if (!hasValidMoves(currentPlayer)) {
      gameOver();
      return;
    }
  }

  updateStatus();
  drawBoard();

  // Botのターン
  if (currentPlayer === 'W') {
    setTimeout(() => {
      botMove();
    }, 500);
  }
}

function botMove() {
  const strength = strengthSelect.value;
  let moves = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidMove(x, y, 'W')) moves.push([x, y]);
    }
  }

  if (moves.length === 0) {
    switchPlayer();
    handleTurn();
    return;
  }

  let move;
  if (strength === 'weak') {
    move = moves[0];
  } else if (strength === 'strong') {
    move = moves[moves.length - 1];
  } else {
    move = moves[Math.floor(Math.random() * moves.length)];
  }

  placeStone(move[0], move[1], 'W');
  switchPlayer();
  handleTurn();
}

canvas.addEventListener('click', (e) => {
  if (currentPlayer !== 'B') return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

  if (placeStone(x, y, 'B')) {
    switchPlayer();
    handleTurn();
  }
});

initBoard();