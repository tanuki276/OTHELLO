const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const BOARD_SIZE = 8;
const style = window.getComputedStyle(canvas);
canvas.width = parseInt(style.getPropertyValue('width'), 10);
canvas.height = parseInt(style.getPropertyValue('height'), 10);
const CELL_SIZE = canvas.width / BOARD_SIZE;

const EMPTY = 0;
const BLACK = 1; // プレイヤー（黒）
const WHITE = 2; // Bot（白）

let board = [];
let currentPlayer = BLACK; // 黒からスタート

// 盤面初期化
function initBoard() {
  board = [];
  for(let y = 0; y < BOARD_SIZE; y++) {
    board[y] = [];
    for(let x = 0; x < BOARD_SIZE; x++) {
      board[y][x] = EMPTY;
    }
  }
  // 初期4つの石
  board[3][3] = WHITE;
  board[3][4] = BLACK;
  board[4][3] = BLACK;
  board[4][4] = WHITE;
}

// 方向ベクトル（8方向）
const directions = [
  [-1,-1], [-1,0], [-1,1],
  [0,-1],         [0,1],
  [1,-1],  [1,0], [1,1]
];

// 盤面内かチェック
function inBoard(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

// 指定の位置に石が置けるかチェック（合法手判定）
function canPlace(x, y, player, boardState) {
  if(boardState[y][x] !== EMPTY) return false;

  const opponent = (player === BLACK) ? WHITE : BLACK;

  for(let [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let hasOpponentBetween = false;

    while(inBoard(nx, ny) && boardState[ny][nx] === opponent) {
      nx += dx;
      ny += dy;
      hasOpponentBetween = true;
    }

    if(hasOpponentBetween && inBoard(nx, ny) && boardState[ny][nx] === player) {
      return true;
    }
  }

  return false;
}

// 全合法手取得
function getValidMoves(player, boardState) {
  let moves = [];
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(canPlace(x, y, player, boardState)) {
        moves.push({x, y});
      }
    }
  }
  return moves;
}

// 石を置いて裏返す処理（戻り値は裏返した石の座標配列）
function placeStone(x, y, player, boardState) {
  let flipped = [];
  boardState[y][x] = player;
  const opponent = (player === BLACK) ? WHITE : BLACK;

  for(let [dx, dy] of directions) {
    let nx = x + dx;
    let ny = y + dy;
    let stonesToFlip = [];

    while(inBoard(nx, ny) && boardState[ny][nx] === opponent) {
      stonesToFlip.push({x: nx, y: ny});
      nx += dx;
      ny += dy;
    }

    if(stonesToFlip.length > 0 && inBoard(nx, ny) && boardState[ny][nx] === player) {
      flipped = flipped.concat(stonesToFlip);
    }
  }

  for(let pos of flipped) {
    boardState[pos.y][pos.x] = player;
  }

  return flipped;
}

// ボードのコピー（深コピー）
function copyBoard(boardState) {
  return boardState.map(row => row.slice());
}

// 評価関数（石の差）
function evaluateBoard(boardState) {
  let blackCount = 0;
  let whiteCount = 0;
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(boardState[y][x] === BLACK) blackCount++;
      else if(boardState[y][x] === WHITE) whiteCount++;
    }
  }
  return whiteCount - blackCount; // Bot（白）が有利ならプラス
}

// ミニマックス + αβ法（深さlimit）
// playerは現在の手番、isMaxはBotの手番ならtrue、人間ならfalse
function minimax(boardState, depth, maxDepth, player, alpha, beta) {
  const opponent = (player === BLACK) ? WHITE : BLACK;
  const validMoves = getValidMoves(player, boardState);

  if(depth === maxDepth || validMoves.length === 0) {
    return {score: evaluateBoard(boardState)};
  }

  if(player === WHITE) { // Bot (maximizer)
    let maxEval = -Infinity;
    let bestMove = null;
    for(let move of validMoves) {
      let newBoard = copyBoard(boardState);
      placeStone(move.x, move.y, player, newBoard);
      let evalRes = minimax(newBoard, depth+1, maxDepth, opponent, alpha, beta);
      if(evalRes.score > maxEval) {
        maxEval = evalRes.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalRes.score);
      if(beta <= alpha) break; // βカット
    }
    return {score: maxEval, move: bestMove};
  } else { // プレイヤー（minimizer）
    let minEval = Infinity;
    let bestMove = null;
    for(let move of validMoves) {
      let newBoard = copyBoard(boardState);
      placeStone(move.x, move.y, player, newBoard);
      let evalRes = minimax(newBoard, depth+1, maxDepth, opponent, alpha, beta);
      if(evalRes.score < minEval) {
        minEval = evalRes.score;
        bestMove = move;
      }
      beta = Math.min(beta, evalRes.score);
      if(beta <= alpha) break; // αカット
    }
    return {score: minEval, move: bestMove};
  }
}

// 盤面描画
function drawBoard() {
  // 背景
  ctx.fillStyle = '#006400';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 線を描く
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for(let i=0; i<=BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i*CELL_SIZE);
    ctx.lineTo(canvas.width, i*CELL_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i*CELL_SIZE, 0);
    ctx.lineTo(i*CELL_SIZE, canvas.height);
    ctx.stroke();
  }

  // 石を描画
  for(let y=0; y<BOARD_SIZE; y++) {
    for(let x=0; x<BOARD_SIZE; x++) {
      if(board[y][x] === EMPTY) continue;

      ctx.beginPath();
      const cx = x * CELL_SIZE + CELL_SIZE/2;
      const cy = y * CELL_SIZE + CELL_SIZE/2;
      const radius = CELL_SIZE/2 - 5;
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

      if(board[y][x] === BLACK) {
        ctx.fillStyle = '#000';
      } else {
        ctx.fillStyle = '#fff';
      }
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
    }
  }
}

// ターン終了チェックと交代処理
function nextTurn() {
  currentPlayer = (currentPlayer === BLACK) ? WHITE : BLACK;
  if(getValidMoves(currentPlayer, board).length === 0) {
    // パス
    currentPlayer = (currentPlayer === BLACK) ? WHITE : BLACK;
    if(getValidMoves(currentPlayer, board).length === 0) {
      // 両者パスでゲーム終了
      alert('ゲーム終了！');
      return false;
    }
  }
  return true;
}

// プレイヤーのクリック処理
canvas.addEventListener('click', (e) => {
  if(currentPlayer !== BLACK) return; // プレイヤー以外は無効

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const x = Math.floor(mx / CELL_SIZE);
  const y = Math.floor(my / CELL_SIZE);

  if(!canPlace(x, y, BLACK, board)) return;

  placeStone(x, y, BLACK, board);
  drawBoard();

  if(!nextTurn()) return; // ゲーム終了

  // Botのターンを少し遅らせる（描画が先になるように）
  setTimeout(botTurn, 300);
});

// Bot（白）のターン
function botTurn() {
  if(currentPlayer !== WHITE) return;

  const depth = 4; // 探索深さ（ここを調整でBotの強さ変更）

  const result = minimax(board, 0, depth, WHITE, -Infinity, Infinity);
  if(result.move) {
    placeStone(result.move.x, result.move.y, WHITE, board);
  }
  drawBoard();

  if(!nextTurn()) return; // ゲーム終了
}

initBoard();
drawBoard();