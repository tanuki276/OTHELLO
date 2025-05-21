const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');
const strengthSelect = document.getElementById('strength');

const SIZE = 8;
const CELL = canvas.width / SIZE;

let board = [];
let currentPlayer = 'B'; // B = 黒, W = 白
let gameOver = false;

function initBoard() {
  board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
  currentPlayer = 'B';
  gameOver = false;
  update();
}

function drawBoard() {
  ctx.fillStyle = 'green';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      ctx.strokeStyle = 'black';
      ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);

      if (board[y][x]) {
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, CELL / 2.5, 0, Math.PI * 2);
        ctx.fillStyle = board[y][x] === 'B' ? 'black' : 'white';
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

function isValidMove(x, y, player) {
  if (board[y][x] !== null) return false;
  const opp = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1],[0, -1],[1, -1],
    [-1, 0],       [1, 0],
    [-1, 1], [0, 1], [1, 1]
  ];
  for (let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let found = false;
    while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      if (board[ny][nx] === opp) {
        found = true;
      } else if (board[ny][nx] === player) {
        if (found) return true;
        break;
      } else break;
      nx += dx;
      ny += dy;
    }
  }
  return false;
}

function placeStone(x, y, player) {
  if (!isValidMove(x, y, player)) return false;
  board[y][x] = player;
  const opp = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1],[0, -1],[1, -1],
    [-1, 0],       [1, 0],
    [-1, 1], [0, 1], [1, 1]
  ];
  for (let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let path = [];
    while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      if (board[ny][nx] === opp) {
        path.push([nx, ny]);
      } else if (board[ny][nx] === player) {
        for (let [fx, fy] of path) board[fy][fx] = player;
        break;
      } else break;
      nx += dx;
      ny += dy;
    }
  }
  return true;
}

function getValidMoves(player) {
  const moves = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isValidMove(x, y, player)) moves.push([x, y]);
    }
  }
  return moves;
}

function switchPlayer() {
  currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
}

function countStones() {
  let black = 0, white = 0;
  for (let row of board) {
    for (let cell of row) {
      if (cell === 'B') black++;
      if (cell === 'W') white++;
    }
  }
  return { black, white };
}

function update() {
  drawBoard();
  const { black, white } = countStones();
  scoreDiv.textContent = `黒: ${black} / 白: ${white}`;
  if (gameOver) {
    let msg = "引き分け！";
    if (black > white) msg = "黒の勝ち！";
    else if (white > black) msg = "白の勝ち！";
    statusDiv.textContent = `終了: ${msg}`;
  } else {
    statusDiv.textContent = `${currentPlayer === 'B' ? 'あなた(黒)' : 'CPU(白)'}の番`;
  }
}

function checkGameOver() {
  const b = getValidMoves('B').length;
  const w = getValidMoves('W').length;
  return b === 0 && w === 0;
}

function botMove() {
  if (currentPlayer !== 'W') return;
  const moves = getValidMoves('W');
  if (moves.length === 0) {
    switchPlayer();
    update();
    return;
  }

  const strength = strengthSelect.value;
  let move;
  if (strength === 'weak') {
    move = moves[Math.floor(Math.random() * moves.length)];
  } else if (strength === 'strong') {
    // 最も多くひっくり返せる手
    let max = -1;
    for (let [x, y] of moves) {
      let count = simulateFlip(x, y, 'W');
      if (count > max) {
        max = count;
        move = [x, y];
      }
    }
  } else {
    move = moves[0]; // 普通 = 最初の有効手
  }

  placeStone(move[0], move[1], 'W');
  switchPlayer();

  if (checkGameOver()) gameOver = true;

  update();
}

function simulateFlip(x, y, player) {
  let count = 0;
  const opp = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1],[0, -1],[1, -1],
    [-1, 0],       [1, 0],
    [-1, 1], [0, 1], [1, 1]
  ];
  for (let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let path = 0;
    while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      if (board[ny][nx] === opp) {
        path++;
      } else if (board[ny][nx] === player) {
        count += path;
        break;
      } else break;
      nx += dx;
      ny += dy;
    }
  }
  return count;
}

canvas.addEventListener('click', e => {
  if (gameOver || currentPlayer !== 'B') return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL);
  const y = Math.floor((e.clientY - rect.top) / CELL);

  if (placeStone(x, y, 'B')) {
    switchPlayer();

    if (checkGameOver()) {
      gameOver = true;
    }

    update();
    setTimeout(botMove, 500);
  }
});

strengthSelect.addEventListener('change', () => {
  // 特に処理不要、CPUの動きに影響
});

initBoard();
update();