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
const CELL_SIZE = 60; // UI大きめ

let board = [];
let currentPlayer = 'B'; // B=黒, W=白
let canvas, ctx;
let strengthSelect;
let aiStrength = 'normal'; // 強さ設定

// 初期化
function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
}

// 盤面と石の描画
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 盤面の描画（緑のマス）
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      ctx.fillStyle = '#008000';
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = 'black';
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  // 石の描画
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 'B' || board[y][x] === 'W') {
        ctx.beginPath();
        const centerX = x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = y * CELL_SIZE + CELL_SIZE / 2;
        const radius = CELL_SIZE / 2 - 6;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = board[y][x] === 'B' ? 'black' : 'white';
        ctx.fill();
        ctx.strokeStyle = 'gray';
        ctx.stroke();
      }
    }
  }
}

// 石を置けるか判定
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

// 石を置く＆反転処理
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

// プレイヤー交代
function switchPlayer() {
  currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
}

// 有効な手があるか判定
function hasValidMoves(player) {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidMove(x, y, player)) return true;
    }
  }
  return false;
}

// ゲーム終了判定
function isGameOver() {
  return !hasValidMoves('B') && !hasValidMoves('W');
}

// 石数カウント
function countStones() {
  let black = 0, white = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 'B') black++;
      if (board[y][x] === 'W') white++;
    }
  }
  return { black, white };
}

// AIの着手（強さに応じてランダム選択or最適手）
function aiMove() {
  const moves = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isValidMove(x, y, currentPlayer)) moves.push([x, y]);
    }
  }

  if (moves.length === 0) return false;

  let chosenMove;

  if (aiStrength === 'weak') {
    // 弱い：完全ランダム
    chosenMove = moves[Math.floor(Math.random() * moves.length)];
  } else if (aiStrength === 'normal') {
    // 普通：最大でひっくり返せる石が多い手を選ぶ
    let maxFlip = -1;
    for (const [x, y] of moves) {
      let flipCount = countFlips(x, y, currentPlayer);
      if (flipCount > maxFlip) {
        maxFlip = flipCount;
        chosenMove = [x, y];
      }
    }
  } else if (aiStrength === 'strong') {
    // 強い：今は普通と同じ（あとで拡張可）
    let maxFlip = -1;
    for (const [x, y] of moves) {
      let flipCount = countFlips(x, y, currentPlayer);
      if (flipCount > maxFlip) {
        maxFlip = flipCount;
        chosenMove = [x, y];
      }
    }
  }

  placeStone(chosenMove[0], chosenMove[1], currentPlayer);
  switchPlayer();

  return true;
}

// その手でひっくり返せる石の数を数える
function countFlips(x, y, player) {
  let totalFlips = 0;
  const opponent = player === 'B' ? 'W' : 'B';
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let flipsInDir = 0;
    let foundOpponent = false;

    while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === opponent) {
        foundOpponent = true;
        flipsInDir++;
      } else if (board[ny][nx] === player) {
        if (foundOpponent) {
          totalFlips += flipsInDir;
        }
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
  return totalFlips;
}

// プレイヤーの手を処理
function playerMove(x, y) {
  if (!isValidMove(x, y, currentPlayer)) {
    alert('そこには置けません！');
    return;
  }

  placeStone(x, y, currentPlayer);
  switchPlayer();
  drawBoard();

  if (isGameOver()) {
    const scores = countStones();
    alert(`ゲーム終了！\n黒: ${scores.black} 白: ${scores.white}\n${scores.black > scores.white ? '黒の勝ち！' : scores.white > scores.black ? '白の勝ち！' : '引き分け！'}`);
    return;
  }

  if (!hasValidMoves(currentPlayer)) {
    switchPlayer(); // 相手に手がないならターン戻す
    if (!hasValidMoves(currentPlayer)) {
      const scores = countStones();
      alert(`ゲーム終了！\n黒: ${scores.black} 白: ${scores.white}\n${scores.black > scores.white ? '黒の勝ち！' : scores.white > scores.black ? '白の勝ち！' : '引き分け！'}`);
      return;
    } else {
      alert(`${currentPlayer === 'B' ? '黒' : '白'}は置ける場所がありません。パスします。`);
    }
  }

  // AIのターン（白がAIの場合）
  if (currentPlayer === 'W') {
    setTimeout(() => {
      if (!aiMove()) {
        switchPlayer();
      }
      drawBoard();

      if (isGameOver()) {
        const scores = countStones();
        alert(`ゲーム終了！\n黒: ${scores.black} 白