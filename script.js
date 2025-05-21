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

const BOARD_SIZE = 8;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const cellSize = canvas.width / BOARD_SIZE;

let board = [];
let currentPlayer = 'B'; // 黒スタート
let gameOver = false;

const strengthSelect = document.getElementById('strengthSelect');
let botStrength = strengthSelect.value; // weak, normal, strong

const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');

strengthSelect.addEventListener('change', () => {
  botStrength = strengthSelect.value;
  resetGame();
});

canvas.addEventListener('click', (e) => {
  if (gameOver) return;
  if (currentPlayer !== 'B') return; // プレイヤーは黒だけ

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);

  if (!placeStone(x, y, currentPlayer)) {
    setStatus('そこには置けません');
    return;
  }

  nextTurn();
});

// 初期盤面セット
function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 盤面のマス
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      ctx.fillStyle = '#004d00';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#002200';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

      // 石を描く
      if (board[y][x] === 'B' || board[y][x] === 'W') {
        drawStone(x, y, board[y][x]);
      }
    }
  }
}

function drawStone(x, y, player) {
  const cx = x * cellSize + cellSize / 2;
  const cy = y * cellSize + cellSize / 2;
  const radius = cellSize * 0.4;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  if (player === 'B') {
    // 黒石
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, '#555555');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
  } else {
    // 白石
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#aaaaaa');
    ctx.fillStyle = grad;
  }
  ctx.fill();
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 1;
  ctx.stroke();
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

  drawBoard();
  updateScore();

  return true;
}

function hasValidMoves(player) {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidMove(x, y, player)) return true;
    }
  }
  return false;
}

function getValidMoves(player) {
  const moves = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidMove(x, y, player)) moves.push([x, y]);
    }
  }
  return moves;
}

function updateScore() {
  let black = 0, white = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 'B') black++;
      else if (board[y][x] === 'W') white++;
    }
  }
  scoreEl.textContent = `黒: ${black}  白: ${white}`;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function switchPlayer() {
  currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
}

function checkGameOver() {
  if (!hasValidMoves('B') && !hasValidMoves('W')) {
    gameOver = true;
    const black = board.flat().filter(c => c === 'B').length;
    const white = board.flat().filter(c => c === 'W').length;
    if (black > white) setStatus('ゲーム終了！ 黒の勝ち！');
    else if (white > black) setStatus('ゲーム終了！ 白の勝ち！');
    else setStatus('ゲーム終了！ 引き分け！');
    return true;
  }
  return false;
}

function nextTurn() {
  switchPlayer();

  if (!hasValidMoves(currentPlayer)) {
    if (checkGameOver()) return;
    setStatus(`${currentPlayer === 'B' ? '黒' : '白'}は打てる手がありません。スキップします。`);
    switchPlayer();
  } else {
    setStatus(`${currentPlayer === 'B' ? '黒' : '白'}のターンです。`);
  }

  updateScore();

  if (currentPlayer === 'W' && !gameOver) {
    // botのターン
    setTimeout(botMove, 500);
  }
}

// botの手を決める
function botMove() {
  const moves = getValidMoves('W');
  if (moves.length === 0) {
    nextTurn();
    return;
  }

  let move;
  if (botStrength === 'weak') {
    // ランダムに置く
    move = moves[Math.floor(Math.random() * moves.length)];
  } else if (botStrength === 'normal') {
    // 一番多く返せる手を選ぶ
    let maxFlip = -1;
    for (const [x, y] of moves) {
      const flipped = countFlippedStones(x, y, 'W');
      if (flipped > maxFlip) {
        maxFlip = flipped;
        move = [x, y];
      }
    }
  } else if (bot} else if (botStrength === 'strong') {
    // 強い：相手の次の手を考慮して最善手を探す（簡易ミニマックス風）
    let bestScore = -Infinity;
    for (const [x, y] of moves) {
      // まず仮に置く
      const tempBoard = copyBoard(board);
      placeStoneOnBoard(tempBoard, x, y, 'W');

      // 相手（黒）の有効手を全部チェック
      const opponentMoves = getValidMovesOnBoard(tempBoard, 'B');
      let worstOpponentFlip = Infinity;

      for (const [ox, oy] of opponentMoves) {
        const opponentFlipped = countFlippedStonesOnBoard(tempBoard, ox, oy, 'B');
        if (opponentFlipped < worstOpponentFlip) {
          worstOpponentFlip = opponentFlipped;
        }
      }
      // 評価は「自分が返せる石数 - 相手の返せる石数（最悪の状況）」
      const myFlip = countFlippedStones(x, y, 'W');
      const score = myFlip - worstOpponentFlip;

      if (score > bestScore) {
        bestScore = score;
        move = [x, y];
      }
    }
  }

  if (move) {
    placeStone(move[0], move[1], 'W');
  }
  nextTurn();
}

// 盤面コピー用関数
function copyBoard(bd) {
  return bd.map(row => row.slice());
}

// board指定版 placeStone（石を置いてひっくり返すだけ。描画なし）
function placeStoneOnBoard(bd, x, y, player) {
  if (bd[y][x] !== null) return false;

  if (!isValidMoveOnBoard(bd, x, y, player)) return false;

  bd[y][x] = player;
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
      if (bd[ny][nx] === opponent) {
        stonesToFlip.push([nx, ny]);
      } else if (bd[ny][nx] === player) {
        for (let [fx, fy] of stonesToFlip) {
          bd[fy][fx] = player;
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

// board指定版 有効手判定
function isValidMoveOnBoard(bd, x, y, player) {
  if (bd[y][x] !== null) return false;

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
      if (bd[ny][nx] === opponent) {
        foundOpponent = true;
      } else if (bd[ny][nx] === player) {
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

// board指定版 有効手取得
function getValidMovesOnBoard(bd, player) {
  const moves = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidMoveOnBoard(bd, x, y, player)) moves.push([x, y]);
    }
  }
  return moves;
}

// board指定版 返せる石数カウント
function countFlippedStonesOnBoard(bd, x, y, player) {
  if (!isValidMoveOnBoard(bd, x, y, player)) return 0;

  let total = 0;
  const opponent = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let stonesToFlip = 0;

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (bd[ny][nx] === opponent) {
        stonesToFlip++;
      } else if (bd[ny][nx] === player) {
        total += stonesToFlip;
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
  return total;
}