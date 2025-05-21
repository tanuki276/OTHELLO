// script.js

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// CSSで設定されたキャンバスの表示サイズを、描画解像度にも適用
// HTMLの <canvas> タグの style="width: 750px; height: 750px;" と連携
canvas.width = canvas.getBoundingClientRect().width;
canvas.height = canvas.getBoundingClientRect().height;

const BOARD_SIZE = 8;
const CELL_SIZE = canvas.width / BOARD_SIZE;

const EMPTY = 0;
const BLACK = 1; // プレイヤー（黒）
const WHITE = 2; // Bot（白）

let board = [];
let currentPlayer = BLACK; // 黒からスタート
let passCount = 0; // パスの回数を記録

const botStrengthSelect = document.getElementById('botStrength');
const statusDiv = document.getElementById('status');
const scoreDiv = document.getElementById('score');

// --- ゲーム初期化と状態管理 ---

/**
 * 盤面を初期状態にリセットします。
 */
function initBoard() {
    board = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            board[y][x] = EMPTY;
        }
    }
    // 初期4つの石を配置
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    passCount = 0; // ゲームリセット時にパスカウントもリセット
}

// 方向ベクトル（8方向）
const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
];

/**
 * 指定された座標が盤面内にあるかチェックします。
 * @param {number} x - x座標
 * @param {number} y - y座標
 * @returns {boolean} 盤面内であればtrue
 */
function inBoard(x, y) {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/**
 * 指定の位置に石が置けるかチェック（合法手判定）します。
 * @param {number} x - x座標
 * @param {number} y - y座標
 * @param {number} player - 現在のプレイヤー (BLACK または WHITE)
 * @param {Array<Array<number>>} boardState - 判定対象の盤面状態
 * @returns {boolean} 石が置けるならtrue
 */
function canPlace(x, y, player, boardState) {
    if (boardState[y][x] !== EMPTY) return false;

    const opponent = (player === BLACK) ? WHITE : BLACK;

    for (let [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        let hasOpponentBetween = false;

        // 間に相手の石があるかチェック
        while (inBoard(nx, ny) && boardState[ny][nx] === opponent) {
            nx += dx;
            ny += dy;
            hasOpponentBetween = true;
        }

        // 間に相手の石があり、その先に自分の石があるかチェック
        if (hasOpponentBetween && inBoard(nx, ny) && boardState[ny][nx] === player) {
            return true;
        }
    }
    return false;
}

/**
 * 指定プレイヤーの全合法手を取得します。
 * @param {number} player - 現在のプレイヤー (BLACK または WHITE)
 * @param {Array<Array<number>>} boardState - 判定対象の盤面状態
 * @returns {Array<{x: number, y: number}>} 合法手の配列
 */
function getValidMoves(player, boardState) {
    let moves = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (canPlace(x, y, player, boardState)) {
                moves.push({ x, y });
            }
        }
    }
    return moves;
}

/**
 * 指定の位置に石を置き、裏返す処理を行います。
 * @param {number} x - 石を置くx座標
 * @param {number} y - 石を置くy座標
 * @param {number} player - 石を置くプレイヤー (BLACK または WHITE)
 * @param {Array<Array<number>>} boardState - 石を置く盤面状態
 */
function placeStone(x, y, player, boardState) {
    boardState[y][x] = player;
    const opponent = (player === BLACK) ? WHITE : BLACK;

    for (let [dx, dy] of directions) {
        let nx = x + dx;
        let ny = y + dy;
        let stonesToFlip = [];

        // 裏返す石を探索
        while (inBoard(nx, ny) && boardState[ny][nx] === opponent) {
            stonesToFlip.push({ x: nx, y: ny });
            nx += dx;
            ny += dy;
        }

        // 自分の石で挟めている場合、裏返す
        if (stonesToFlip.length > 0 && inBoard(nx, ny) && boardState[ny][nx] === player) {
            for (let pos of stonesToFlip) {
                boardState[pos.y][pos.x] = player;
            }
        }
    }
}

/**
 * 盤面を深コピーします。
 * @param {Array<Array<number>>} boardState - コピー元の盤面
 * @returns {Array<Array<number>>} コピーされた盤面
 */
function copyBoard(boardState) {
    return boardState.map(row => row.slice());
}

/**
 * 現在の盤面を評価し、Bot（白）の視点からスコアを返します。
 * 角や端に重み付けをする簡単な評価関数。
 * @param {Array<Array<number>>} boardState - 評価対象の盤面状態
 * @returns {number} 評価スコア（Botが有利ならプラス、プレイヤーが有利ならマイナス）
 */
function evaluateBoard(boardState) {
    let blackScore = 0;
    let whiteScore = 0;
    // 盤面の隅（角）に重みをつける
    const cornerWeight = 30; // 角の価値を高く設定
    const edgeWeight = 5;    // 端の価値
    const generalWeight = 1; // 一般的なマスの価値

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            let weight = generalWeight;

            // 角のマス
            if ((y === 0 || y === BOARD_SIZE - 1) && (x === 0 || x === BOARD_SIZE - 1)) {
                weight = cornerWeight;
            }
            // 角に隣接するマス（X打ち、C打ちなどと呼ばれる危険なマス）は避けるべきだが、
            // シンプルな評価では一旦プラスとする
            // 複雑な評価関数ではこの部分をマイナスにする
            else if ((y === 0 && (x === 1 || x === BOARD_SIZE - 2)) || // 上端の2マス目、7マス目
                     (y === BOARD_SIZE - 1 && (x === 1 || x === BOARD_SIZE - 2)) || // 下端の2マス目、7マス目
                     (x === 0 && (y === 1 || y === BOARD_SIZE - 2)) || // 左端の2マス目、7マス目
                     (x === BOARD_SIZE - 1 && (y === 1 || y === BOARD_SIZE - 2))) { // 右端の2マス目、7マス目
                 // ここをマイナスにすることも可能だが、今回はシンプルにポジティブな重みとしておく
                 // weight = -cornerWeight / 2; // 例: 角隣接マスはマイナス
                 weight = edgeWeight;
            }
            // その他の端のマス
            else if (y === 0 || y === BOARD_SIZE - 1 || x === 0 || x === BOARD_SIZE - 1) {
                weight = edgeWeight;
            }
            
            if (boardState[y][x] === BLACK) blackScore += weight;
            else if (boardState[y][x] === WHITE) whiteScore += weight;
        }
    }
    return whiteScore - blackScore; // Bot（白）が有利ならプラス
}

/**
 * ミニマックス + αβ法を使用して、最善の手を探索します。
 * @param {Array<Array<number>>} boardState - 現在の盤面状態
 * @param {number} depth - 現在の探索深度
 * @param {number} maxDepth - 最大探索深度
 * @param {number} player - 現在の手番のプレイヤー (BLACK または WHITE)
 * @param {number} alpha - α値
 * @param {number} beta - β値
 * @returns {{score: number, move?: {x: number, y: number}}} 評価スコアと最善の手（Botの時のみ）
 */
function minimax(boardState, depth, maxDepth, player, alpha, beta) {
    const opponent = (player === BLACK) ? WHITE : BLACK;
    const validMoves = getValidMoves(player, boardState);

    // 終了条件: 指定深度に到達 または 両者有効な手がない（ゲーム終了）
    if (depth === maxDepth || (validMoves.length === 0 && getValidMoves(opponent, boardState).length === 0)) {
        return { score: evaluateBoard(boardState) };
    }

    // 現在のプレイヤーがパスする場合
    if (validMoves.length === 0) {
        // 相手のターンに切り替えて再帰呼び出し
        return minimax(boardState, depth + 1, maxDepth, opponent, alpha, beta);
    }

    if (player === WHITE) { // Bot (maximizer)
        let maxEval = -Infinity;
        let bestMove = null;
        for (let move of validMoves) {
            let newBoard = copyBoard(boardState);
            placeStone(move.x, move.y, player, newBoard);
            let evalRes = minimax(newBoard, depth + 1, maxDepth, opponent, alpha, beta);
            if (evalRes.score > maxEval) {
                maxEval = evalRes.score;
                bestMove = move; // Botの最適な手を記録
            }
            alpha = Math.max(alpha, evalRes.score);
            if (beta <= alpha) break; // βカット
        }
        return { score: maxEval, move: bestMove };
    } else { // プレイヤー（minimizer）
        let minEval = Infinity;
        for (let move of validMoves) {
            let newBoard = copyBoard(boardState);
            placeStone(move.x, move.y, player, newBoard);
            let evalRes = minimax(newBoard, depth + 1, maxDepth, opponent, alpha, beta);
            minEval = Math.min(minEval, evalRes.score);
            beta = Math.min(beta, evalRes.score);
            if (beta <= alpha) break; // αカット
        }
        return { score: minEval }; // 人間側の手番では、手自体は返さない
    }
}

// --- 描画処理 ---

/**
 * 盤面全体を描画します。
 */
function drawBoard() {
    // 背景
    ctx.fillStyle = '#006400'; // 深い緑色
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 線を描く
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
    }

    // 石を描画
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === EMPTY) continue;

            ctx.beginPath();
            const cx = x * CELL_SIZE + CELL_SIZE / 2; // 石の中心X座標
            const cy = y * CELL_SIZE + CELL_SIZE / 2; // 石の中心Y座標
            const radius = CELL_SIZE / 2 - 5; // 石の半径（セルより少し小さく）

            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

            if (board[y][x] === BLACK) {
                ctx.fillStyle = '#000'; // 黒石
            } else {
                ctx.fillStyle = '#fff'; // 白石
            }
            ctx.fill();
            ctx.strokeStyle = '#000'; // 石の縁
            ctx.stroke();
        }
    }
    updateScore(); // 描画時にスコアも更新
}

// --- ゲーム進行ロジック ---

/**
 * 現在の盤面の石の数をカウントします。
 * @param {Array<Array<number>>} boardCount - カウント対象の盤面状態
 * @returns {{black: number, white: number}} 黒石と白石の数
 */
function countStones(boardCount = board) {
    let black = 0, white = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (boardCount[y][x] === BLACK) black++;
            else if (boardCount[y][x] === WHITE) white++;
        }
    }
    return { black, white };
}

/**
 * スコア表示を更新します。
 */
function updateScore() {
    const counts = countStones();
    scoreDiv.textContent = `黒: ${counts.black} - 白: ${counts.white}`;
}

/**
 * ゲームの状態を更新し、ターンの切り替えやパス、ゲーム終了を処理します。
 */
function updateGameStatus() {
    const playerMoves = getValidMoves(BLACK, board); // プレイヤー（黒）の合法手
    const botMoves = getValidMoves(WHITE, board);   // Bot（白）の合法手

    if (playerMoves.length === 0 && botMoves.length === 0) {
        // 両者ともに合法手がない場合、ゲーム終了
        gameOver();
        return;
    }

    // 現在のプレイヤーの合法手がない場合（パス）
    if (currentPlayer === BLACK) { // プレイヤーのターン
        if (playerMoves.length === 0) {
            statusDiv.textContent = '黒（あなた）はパス！白（Bot）の番です。';
            currentPlayer = WHITE; // Botにターン交代
            passCount++;
            setTimeout(botTurn, 800); // パス後のBotのターンを少し遅らせる
        } else {
            statusDiv.textContent = 'あなたの番（黒）';
            passCount = 0; // 有効手があったのでパスカウントをリセット
        }
    } else { // Botのターン (currentPlayer === WHITE)
        if (botMoves.length === 0) {
            statusDiv.textContent = '白（Bot）はパス！あなたの番（黒）です。';
            currentPlayer = BLACK; // プレイヤーにターン交代
            passCount++;
        } else {
            statusDiv.textContent = 'Botの番（白）';
            passCount = 0; // 有効手があったのでパスカウントをリセット
        }
    }
    drawBoard(); // 盤面とスコアを最新の状態に更新
}

/**
 * ゲーム終了時の処理を行います。
 */
function gameOver() {
    const counts = countStones();
    let resultText = 'ゲーム終了！ ';
    if (counts.black > counts.white) resultText += 'あなたの勝ち！';
    else if (counts.black < counts.white) resultText += 'Botの勝ち！';
    else resultText += '引き分けです。';
    statusDiv.textContent = resultText;
    // ゲーム終了後はクリックイベントを無効化し、操作できないようにする
    canvas.removeEventListener('click', handleCanvasClick); 
}

/**
 * プレイヤーのクリックイベントハンドラ。
 * @param {MouseEvent} e - クリックイベントオブジェクト
 */
function handleCanvasClick(e) {
    if (currentPlayer !== BLACK) return; // 人間のターンのみ処理

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left; // キャンバス内のクリックX座標
    const my = e.clientY - rect.top;  // キャンバス内のクリックY座標
    const x = Math.floor(mx / CELL_SIZE); // 盤面上のマスX座標
    const y = Math.floor(my / CELL_SIZE); // 盤面上のマスY座標

    if (canPlace(x, y, BLACK, board)) {
        placeStone(x, y, BLACK, board);
        currentPlayer = WHITE; // ターンをBotに切り替え
        updateGameStatus(); // ゲーム状態を更新
        setTimeout(botTurn, 300); // Botのターンを少し遅らせて開始
    } else {
        statusDiv.textContent = 'そこには置けません！あなたの番（黒）';
    }
}
// キャンバスにクリックイベントリスナーを登録
canvas.addEventListener('click', handleCanvasClick);

/**
 * Bot（白）のターン処理を行います。
 */
function botTurn() {
    if (currentPlayer !== WHITE) return; // Botのターンではない場合、何もしない

    // 選択されたBotの強さ（探索深さ）を取得
    const depth = parseInt(botStrengthSelect.value, 10); 

    // ミニマックス法で最善の手を探索
    const result = minimax(board, 0, depth, WHITE, -Infinity, Infinity);
    
    if (result.move) {
        placeStone(result.move.x, result.move.y, WHITE, board); // 最善の手に石を置く
        currentPlayer = BLACK; // ターンを人間に切り替え
        updateGameStatus(); // ゲーム状態を更新
    } else {
        // 置ける手がない（パス）の場合
        updateGameStatus(); // パス処理はupdateGameStatus内で行われる
    }
}

/**
 * ゲームを完全にリセットし、最初からやり直します。
 */
function resetGame() {
    initBoard(); // 盤面を初期化
    currentPlayer = BLACK; // プレイヤー（黒）からスタート
    // ゲーム終了時に無効化したクリックイベントリスナーを再度有効化
    canvas.addEventListener('click', handleCanvasClick); 
    updateGameStatus(); // 初期状態のステータスを設定（「あなたの番」など）
    drawBoard(); // 盤面を描画し、スコアも更新
}

// ゲーム開始時の初期化
resetGame(); 
