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

// --- オセロゲームのロジック例 ---

const BOARD_SIZE = 8;
let board = [];
let currentPlayer = 'B'; // B = 黒, W = 白

// 初期化
function initBoard() {
  board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  // 中央の4つを初期配置
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
}

// ボードの描画（console用簡易）
function printBoard() {
  console.clear();
  console.log('  0 1 2 3 4 5 6 7');
  for(let y=0; y<BOARD_SIZE; y++) {
    let row = y + ' ';
    for(let x=0; x<BOARD_SIZE; x++) {
      row += (board[y][x] || '.') + ' ';
    }
    console.log(row);
  }
  console.log(`Current Player: ${currentPlayer}`);
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

// 石を置く処理（反転も）
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
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if (isValidMove(x, y, player)) return true;
    }
  }
  return false;
}

// ゲーム終了判定（両者共に手なし）
function isGameOver() {
  return !hasValidMoves('B') && !hasValidMoves('W');
}

// 石数カウント
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

// ゲーム開始
function startGame() {
  initBoard();
  printBoard();
}

// プレイヤーの手を実行（x,y座標）
function playerMove(x, y) {
  if (!placeStone(x, y, currentPlayer)) {
    console.log('Invalid move');
    return;
  }
  switchPlayer();

  if (!hasValidMoves(currentPlayer)) {
    switchPlayer();
    if (!hasValidMoves(currentPlayer)) {
      console.log('Game Over!');
      const scores = countStones();
      console.log(`Black: ${scores.black}, White: ${scores.white}`);
      if (scores.black > scores.white) console.log('Black wins!');
      else if (scores.white > scores.black) console.log('White wins!');
      else console.log('Draw!');
      return;
    } else {
      console.log(`${currentPlayer} has no valid moves, turn skips.`);
    }
  }

  printBoard();
}

// 最初のゲーム開始
startGame();

// 例）playerMove(2,3); で石を置く