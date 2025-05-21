// --- サービスワーカー登録 ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('Service Worker registered:', reg.scope);
    }).catch(err => {
      console.error('Service Worker registration failed:', err);
    });
  });
}

// --- オセロゲームロジックと描画 ---

const BOARD_SIZE = 8;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const CELL_SIZE = canvas.width / BOARD_SIZE;

let board = [];
let currentPlayer = 'B'; // 黒スタート

const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');

function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
}

function drawBoard() {
  // 背景（緑）
  ctx.fillStyle = '#008000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // マス目
  ctx.strokeStyle = '#000000';
  for(let i = 0; i <= BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(canvas.width, i * CELL_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, canvas.height);
    ctx.stroke();
  }

  // 石描画
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if (board[y][x] === 'B' || board[y][x] === 'W') {
        ctx.beginPath();
        const cx = x * CELL_SIZE + CELL_SIZE / 2;
        const cy = y * CELL_SIZE + CELL_SIZE / 2;
        const radius = CELL_SIZE / 2 - 5;
        ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.fillStyle = board[y][x] === 'B' ? 'black' : 'white';
        ctx.fill();
        ctx.stroke();
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

  for (const [dx, dy] of directions) {
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

  for (const [dx, dy] of directions) {
    let stonesToFlip = [];
    let nx = x + dx;
    let ny = y + dy;

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === opponent) {
        stonesToFlip.push([nx, ny]);
      } else if (board[ny][nx] === player) {
        for (const [fx, fy] of stonesToFlip) {
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

function updateStatus() {
  const scores = countStones();
  scoreDiv.textContent = `黒: ${scores.black} 白: ${scores.white}`;

  if (isGameOver()) {
    let winner = '引き分け';
    if (scores.black > scores.white) winner = '黒の勝ち！';
    else if (scores.white > scores.black) winner = '白の勝ち！';
    statusDiv.textContent = `ゲーム終了！ ${winner}`;
  } else {
    statusDiv.textContent = `${currentPlayer === 'B' ? '黒' : '白'}の番`;
  }
}

// クリック座標から盤面座標へ変換
function getBoardCoords(mouseX, mouseY) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((mouseX - rect.left) / CELL_SIZE);
  const y = Math.floor((mouseY - rect.top) / CELL_SIZE);
  return {x, y};
}

function playerMove(x, y) {
  if (!placeStone(x, y, currentPlayer)) {
    alert('そこには置けません！');
    return;
  }
  switchPlayer();

  if (!hasValidMoves(currentPlayer)) {
    switchPlayer();
    if (!hasValidMoves(currentPlayer)) {
      updateStatus();
      alert('ゲーム終了！');
      return;
    } else {
      alert(`${currentPlayer === 'B' ? '黒' : '白'}は置ける場所がありません。パスします。`);
    }
  }
  drawBoard();
  updateStatus();
}

// 初期化＆開始
function startGame() {
  initBoard();
  drawBoard();
  updateStatus();
}

// canvasクリックイベント
canvas.addEventListener('click', e => {
  if (isGameOver()) {
    alert('ゲームは終了しています。リロードしてください。');
    return;
  }
  const {x, y} = getBoardCoords(e.clientX, e.clientY);
  playerMove(x, y);
});

startGame();