const BOARD_SIZE = 8;
const CELL_SIZE = 50;
let board = [];
let currentPlayer = 'B'; // B=黒(先手), W=白(AI)

function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
}

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000';
  for(let i=0; i<=BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i*CELL_SIZE, 0);
    ctx.lineTo(i*CELL_SIZE, BOARD_SIZE*CELL_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i*CELL_SIZE);
    ctx.lineTo(BOARD_SIZE*CELL_SIZE, i*CELL_SIZE);
    ctx.stroke();
  }
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if (board[y][x]) {
        ctx.beginPath();
        const cx = x*CELL_SIZE + CELL_SIZE/2;
        const cy = y*CELL_SIZE + CELL_SIZE/2;
        const radius = CELL_SIZE/2 - 5;
        ctx.fillStyle = board[y][x] === 'B' ? 'black' : 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
}

function isValidMove(x, y, player) {
  if (board[y][x] !== null) return false;

  const opponent = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let foundOpponent = false;

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === opponent) {
        foundOpponent = true;
      } else if (board[ny][nx] === player) {
        if (foundOpponent) return true;
        else break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
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
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let [dx, dy] of directions) {
    let stonesToFlip = [];
    let nx = x + dx;
    let ny = y + dy;

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === opponent) {
        stonesToFlip.push([nx, ny]);
      } else if (board[ny][nx] === player) {
        for (let [fx, fy] of stonesToFlip) {
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

function switchPlayer() {
  currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
}

function hasValidMoves(player) {
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if (isValidMove(x, y, player)) return true;
    }
  }
  return false;
}

function isGameOver() {
  return !hasValidMoves('B') && !hasValidMoves('W');
}

function countStones() {
  let black = 0;
  let white = 0;
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if (board[y][x] === 'B') black++;
      if (board[y][x] === 'W') white++;
    }
  }
  return {black, white};
}

const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');

function updateStatus() {
  if (isGameOver()) {
    const scores = countStones();
    let result = '';
    if (scores.black > scores.white) result = '黒の勝ち！';
    else if (scores.white > scores.black) result = '白の勝ち！';
    else result = '引き分け！';

    statusDiv.textContent = 'ゲーム終了！結果: ' + result;
  } else {
    statusDiv.textContent = `現在の手番: ${currentPlayer === 'B' ? '黒（あなた）' : '白（AI）'}`;
  }
  const scores = countStones();
  scoreDiv.textContent = `黒: ${scores.black}  白: ${scores.white}`;
}

function aiMove() {
  if (isGameOver()) return;

  const moves = [];
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if (isValidMove(x, y, currentPlayer)) {
        moves.push({x, y});
      }
    }
  }

  if (moves.length === 0) {
    switchPlayer();
    updateStatus();
    alert('AIは置ける場所がありません。あなたの手番に戻ります。');
    return;
  }

  const move = moves[Math.floor(Math.random() * moves.length)];
  placeStone(move.x, move.y, currentPlayer);
  switchPlayer();
  drawBoard();
  updateStatus();
}

canvas.addEventListener('click', (e) => {
  if (currentPlayer !== 'B') {
    alert('今はあなたの手番ではありません。');
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

  if (!placeStone(x, y, currentPlayer)) {
    alert('そこには置けません！');
    return;
  }
  switchPlayer();
  drawBoard();
  updateStatus();

  if (isGameOver()) {
    alert('ゲーム終了！');
    return;
  }

  setTimeout(() => {
    aiMove();
    if (isGameOver()) {
      alert('ゲーム終了！');
    }
  }, 500);
});

function startGame() {
  initBoard();
  drawBoard();
  updateStatus();
}

startGame();