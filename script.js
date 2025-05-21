const SIZE = 8;
const BLACK = 1;
const WHITE = 2;
const EMPTY = 0;

let board = [];
let turn = BLACK;
let strengthSelect = null;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');

const directions = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1]
];

function initBoard() {
  board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(EMPTY));
  board[3][3] = WHITE;
  board[4][4] = WHITE;
  board[3][4] = BLACK;
  board[4][3] = BLACK;
  turn = BLACK;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cellSize = canvas.width / SIZE;

  // 盤描画
  ctx.fillStyle = '#006600';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // グリッド
  ctx.strokeStyle = '#003300';
  for(let i=0; i<=SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i*cellSize, 0);
    ctx.lineTo(i*cellSize, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i*cellSize);
    ctx.lineTo(canvas.width, i*cellSize);
    ctx.stroke();
  }

  // 石描画
  for(let y=0; y<SIZE; y++) {
    for(let x=0; x<SIZE; x++) {
      if(board[y][x] === EMPTY) continue;
      ctx.beginPath();
      const cx = x * cellSize + cellSize/2;
      const cy = y * cellSize + cellSize/2;
      const radius = cellSize/2 - 4;
      ctx.fillStyle = board[y][x] === BLACK ? '#000' : '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.arc(cx, cy, radius, 0, 2*Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

function onClickBoard(e) {
  if(turn !== BLACK) return; // プレイヤーは黒固定
  const rect = canvas.getBoundingClientRect();
  const cellSize = canvas.width / SIZE;
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);
  if(canPlace(x, y, BLACK)) {
    placeStone(x, y, BLACK);
    turn = WHITE;
    drawBoard();
    checkGameOver();
    setTimeout(botMove, 300);
  }
}

function canPlace(x, y, color) {
  if(board[y][x] !== EMPTY) return false;
  for(let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let hasOpponentBetween = false;
    while(nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      if(board[ny][nx] === 3 - color) {
        hasOpponentBetween = true;
      } else if(board[ny][nx] === color) {
        if(hasOpponentBetween) return true;
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
  return false;
}

function placeStone(x, y, color) {
  board[y][x] = color;
  flipStones(x, y, color);
}

function flipStones(x, y, color) {
  for(let [dx, dy] of directions) {
    let stonesToFlip = [];
    let nx = x + dx, ny = y + dy;
    while(nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      if(board[ny][nx] === 3 - color) {
        stonesToFlip.push([nx, ny]);
      } else if(board[ny][nx] === color) {
        for(let [fx, fy] of stonesToFlip) {
          board[fy][fx] = color;
        }
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
}

function getValidMoves(color) {
  let moves = [];
  for(let y=0; y<SIZE; y++) {
    for(let x=0; x<SIZE; x++) {
      if(canPlace(x, y, color)) moves.push({x, y});
    }
  }
  return moves;
}

function countScore() {
  let blackCount = 0, whiteCount = 0;
  for(let y=0; y<SIZE; y++) {
    for(let x=0; x<SIZE; x++) {
      if(board[y][x] === BLACK) blackCount++;
      if(board[y][x] === WHITE) whiteCount++;
    }
  }
  return {black: blackCount, white: whiteCount};
}

function updateStatus() {
  let score = countScore();
  scoreDiv.textContent = `黒: ${score.black}  白: ${score.white}`;
  if(turn === BLACK) {
    statusDiv.textContent = 'あなたの番（黒）';
  } else {
    statusDiv.textContent = 'Botの番（白）';
  }
}

function checkGameOver() {
  const blackMoves = getValidMoves(BLACK);
  const whiteMoves = getValidMoves(WHITE);
  if(blackMoves.length === 0 && whiteMoves.length === 0) {
    const score = countScore();
    if(score.black > score.white) {
      statusDiv.textContent = 'ゲーム終了。あなたの勝ち！';
    } else if(score.white > score.black) {
      statusDiv.textContent = 'ゲーム終了。Botの勝ち！';
    } else {
      statusDiv.textContent = 'ゲーム終了。引き分けです。';
    }
    return true;
  }

  if(getValidMoves(turn).length === 0) {
    // パス
    turn = 3 - turn;
    updateStatus();
    if(turn === WHITE) setTimeout(botMove, 300);
    return false;
  }
  updateStatus();
  return false;
}

// 評価関数: 石の数差
function evaluateBoard(boardState, color) {
  let myCount = 0;
  let oppCount = 0;
  for(let y=0; y<SIZE; y++) {
    for(let x=0; x<SIZE; x++) {
      if(boardState[y][x] === color) myCount++;
      else if(boardState[y][x] === 3 - color) oppCount++;
    }
  }
  return myCount - oppCount;
}

// ミニマックスアルゴリズム
function minimax(boardState, depth, color, maximizingPlayer) {
  if(depth === 0) {
    return {score: evaluateBoard(boardState, WHITE)};
  }

  let moves = getValidMovesOnBoard(boardState, color);
  if(moves.length === 0) {
    // パス可能性
    let opponentMoves = getValidMovesOnBoard(boardState, 3 - color);
    if(opponentMoves.length === 0) {
      // ゲーム終了
      return {score: evaluateBoard(boardState, WHITE)};
    }
    // パスして相手番へ
    return minimax(boardState, depth, 3 - color, !maximizingPlayer);
  }

  if(maximizingPlayer) {
    let maxEval = -Infinity;
    let bestMove = null;
    for(let move of moves) {
      let newBoard = cloneBoard(boardState);
      placeStoneOnBoard(newBoard, move.x, move.y, color);
      let evalResult = minimax(newBoard, depth - 1, 3 - color, false);
      if(evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
    }
    return {score: maxEval, move: bestMove};
  } else {
    let minEval = Infinity;
    let bestMove = null;
    for(let move of moves) {
      let newBoard = cloneBoard(boardState);
      placeStoneOnBoard(newBoard, move.x, move.y, color);
      let evalResult = minimax(newBoard, depth - 1, 3 - color, true);
      if(evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = move;
      }
    }
    return {score: minEval, move: bestMove};
  }
}

// ミニマックスのルート
function minimaxRoot(depth, color) {
  let result = minimax(board, depth, color, true);
  return result.move;
}

function getValidMovesOnBoard(bd, color) {
  let moves = [];
  for(let y=0; y<SIZE; y++) {
    for(let x=0; x<SIZE; x++) {
      if(canPlaceOnBoard(bd, x, y, color)) moves.push({x, y});
    }
  }
  return moves;
}

function canPlaceOnBoard(bd, x, y, color) {
  if(bd[y][x] !== EMPTY) return false;
  for(let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let hasOpponentBetween = false;
    while(nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      if(bd[ny][nx] === 3 - color) {
        hasOpponentBetween = true;
      } else if(bd[ny][nx] === color) {
        if(hasOpponentBetween) return true;
        break;
      } else {
        break;
      }
      nx += dx; ny += dy;
    }
  }
  return false;
}

function placeStoneOnBoard(bd, x, y, color) {
  bd[y][x] = color;
  for(let [dx, dy] of directions) {
    let stonesToFlip = [];
    let nx = x + dx, ny = y + dy;
    while(nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      if(bd[ny][nx] === 3 - color) {
        stonesToFlip.push([nx, ny]);
      } else if(bd[ny][nx] === color) {
        for(let [fx, fy] of stonesToFlip) {
          bd[fy][fx] = color;
        }
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
}

function cloneBoard(bd) {
  return bd.map(row => row.slice());
}

function botMove() {
  if(turn !== WHITE) return;
  const strength = strengthSelect.value;

  let moves = getValidMoves(WHITE);
  if(moves.length === 0) {
    turn = BLACK;
    updateStatus();
    checkGameOver();
    return;
  }

  let move;
  if(strength === 'weak') {
    // ランダム
    move = moves[Math.floor(Math.random() * moves.length)];
  } else if(strength === 'normal') {
    // minimax 深さ3
    move = minimaxRoot(3, WHITE);
  } else {
    // minimax 全探索
    // 全探索は時間かかるので残り手数を深さに設定
    const remainingMoves = moves.length + getValidMoves(BLACK).length;
    move = minimaxRoot(remainingMoves, WHITE);
  }

  placeStone(move.x, move.y, WHITE);
  turn = BLACK;
  drawBoard();
  if(!checkGameOver()) updateStatus();
}

function setup() {
  initBoard();
  drawBoard();
  updateStatus();
  strengthSelect = document.getElementById('strengthSelect');
  canvas.addEventListener('click', onClickBoard);
}

window.onload = setup;