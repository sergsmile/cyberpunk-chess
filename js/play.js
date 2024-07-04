/****************************\
 ============================

         BROWSER MODE

 ============================              
\****************************/

// init engine
var engine = new Engine();
var book = [];
var botName = ''

// update version in GUI
document.title = 'Cyberpunk Chess';

// run in browser mode  
console.log('\n  Powered by WukongJS - BROWSER MODE - v' + engine.VERSION);
console.log('  type "engine" for public API reference');

// stats
var guiScore = 0;
var guiDepth = 0;
var guiTime = 0;
var guiPv = '';
var guiSide = 0;
var userTime = 0;
var gameResult = '*';
var guiFen = '';
var promotedPiece = 5;
var eddiesCount = 0;

// difficulty
var fixedTime = 0;
var fixedDepth = 0;

// user input controls
var clickLock = 0;
var allowBook = 1;
var userSource, userTarget;

// 3 fold repetitions
var repetitions = 0;
  
// pick piece handler
function dragPiece(event, square) {
  userSource = square;
}

// drag piece handler
function dragOver(event, square) {
  event.preventDefault();
  if (square == userSource) event.target.src = 'img/0.webp';
}

// drop piece handler
function dropPiece(event, square) {
  userTarget = square;
  promotedPiece = (engine.getSide() ? (promotedPiece + 6): promotedPiece)
  let valid = validateMove(userSource, userTarget, promotedPiece);  
  engine.movePiece(userSource, userTarget, promotedPiece);
  if (engine.getPiece(userTarget) == 0) valid = 0;
  clickLock = 0;
  
  if (engine.getPiece(square) && valid) {
    userTime = Date.now() - userTime;
    document.getElementById(square).style.backgroundColor = engine.SELECT_COLOR;
    updatePgn();
  }
  
  event.preventDefault();
  if (valid) setTimeout(function() { think(); }, 100);
}

// click event handler
function tapPiece(square) {
  engine.drawBoard();
  engine.updateBoard();
  
  if (engine.getPiece(square)) 
    document.getElementById(square).style.backgroundColor = engine.SELECT_COLOR;
  
  var clickSquare = parseInt(square, 10)
  
  if(!clickLock && engine.getPiece(clickSquare)) {      
    userSource = clickSquare;
    clickLock ^= 1;
  } else if(clickLock) {      
    userTarget = clickSquare;

    promotedPiece = (engine.getSide() ? (promotedPiece + 6): promotedPiece)
    let valid = validateMove(userSource, userTarget, promotedPiece);
    engine.movePiece(userSource, userTarget, promotedPiece);
    if (engine.getPiece(userTarget) == 0) valid = 0;
    clickLock = 0;
    
    if (engine.getPiece(square) && valid) {
      document.getElementById(square).style.backgroundColor = engine.SELECT_COLOR;
      updatePgn();
    }

    if (valid) setTimeout(function() { think(); }, 1);
  }
}

// validate move
function validateMove(userSource, userTarget, promotedPiece) {
  let moveString = engine.squareToString(userSource) + 
                   engine.squareToString(userTarget) +
                   engine.promotedToString(promotedPiece);

  let move = engine.moveFromString(moveString);
  return move;
}

// set FEN
function setFen() {
  let fen = document.getElementById('fen').value;
  if (fen != engine.START_FEN) allowBook = 0;
  engine.setBoard(fen);
  engine.drawBoard();
  engine.updateBoard();
  guiFen = fen;
}

// start new game
function newGame() {
  guiScore = 0;
  guiDepth = 0;
  guiTime = 0;
  guiPv = '';
  gameResult = '*';
  userTime = 0;
  allowBook = 1;
  engine.setBoard(engine.START_FEN);
  engine.drawBoard();
  engine.updateBoard();
  engine.randomizePieceSquareTables();
  document.getElementById('pgn').value = '';
  repetitions = 0;
}

// take move back
function undo() {
  gameResult = '*';
  engine.takeBack();
  engine.drawBoard();
  engine.updateBoard();
}

// flip board
function flip() {
  guiSide ^= 1;
  engine.flipBoard();
  engine.drawBoard();
  engine.updateBoard();
}

// use opening book
function getBookMove() {
  if (allowBook == 0) return 0;

  let moves = engine.getMoves();
  let lines = [];
  
  if (moves.length == 0) {
    let randomLine = book[Math.floor(Math.random() * book.length)];
    let firstMove = randomLine.split(' ')[0];
    return engine.moveFromString(firstMove);
  } else if (moves.length) {
    for (let line = 0; line < book.length; line++) {
      let currentLine = moves.join(' ');

      if (book[line].includes(currentLine) && book[line].split(currentLine)[0] == '')
        lines.push(book[line]);
    }
  }
  
  if (lines.length) {
    let currentLine = moves.join(' ');
    let randomLine = lines[Math.floor(Math.random() * lines.length)];

    try {
      let bookMove = randomLine.split(currentLine)[1].split(' ')[1];
      return engine.moveFromString(bookMove);
    } catch(e) { return 0; }
  }

  return 0;
}

// engine move
function think() {
  if (engine.inCheck(guiSide)) return;
  
  engine.resetTimeControl();

  let timing = engine.getTimeControl();
  let startTime = new Date().getTime();
  
  if (fixedTime) {
    fixedDepth = 64;
    timing.timeSet = 1;
    timing.time = fixedTime * 1000;
    timing.stopTime = startTime + timing.time
    engine.setTimeControl(timing);
  }
  
  let bookMoveFlag = 0;
  let delayMove = 0;
  let bestMove = getBookMove();
  
  if (bestMove) {
    bookMoveFlag = 1;
    delayMove = 1000;
  } else if (bestMove == 0) {
    bestMove = engine.search(fixedDepth);
  }
  
  let sourceSquare = engine.getMoveSource(bestMove);
  let targetSquare = engine.getMoveTarget(bestMove);
  let promotedPiece = engine.getMovePromoted(bestMove);

  if (engine.isRepetition()) repetitions++;
  if (repetitions == 3) {
    gameResult = '1/2-1/2 Draw by 3 fold repetition';
  } else if (engine.getFifty() >= 100) {
    gameResult = '1/2-1/2 Draw by 50 rule move';
  } else if (engine.isMaterialDraw()) {
    gameResult = '1/2-1/2 Draw by insufficient material';
  } else if (engine.generateLegalMoves().length == 0) {
    if (engine.inCheck(engine.getSide())) {
      gameResult = engine.getSide() == engine.COLOR.WHITE ? '0-1 Mate' : '1-0 Mate';
    } else {
      gameResult = 'Stalemate';
    }
  }

  if (gameResult != '*') {
    updatePgn();
    return;
  }

  setTimeout(function() {
    engine.movePiece(sourceSquare, targetSquare, promotedPiece);
    engine.drawBoard();
    engine.updateBoard();
 
    if (engine.getPiece(targetSquare)) {
      document.getElementById(targetSquare).style.backgroundColor = engine.SELECT_COLOR;             
      updatePgn();
      userTime = Date.now();
    }
  
    // check for checkmate after the move
    if (engine.inCheck(engine.getSide()) && engine.generateLegalMoves().length === 0) {
      gameResult = engine.getSide() == engine.COLOR.WHITE ? '0-1 Mate' : '1-0 Mate';
      updatePgn();
    }
  
  }, delayMove + (guiTime < 100 && delayMove == 0) ? 1000 : ((guiDepth == 0) ? 500 : 100));
}

// get moves in SAN notation
function getGamePgn() {
  let moveStack = engine.moveStack();
  let pgn = '';
  let sanPiece = [0, 'P', 'N', 'B', 'R', 'Q', 'K', 'P', 'N', 'B', 'R', 'Q', 'K',];

  for (let index = 0; index < moveStack.length; index++) {
    let move = moveStack[index].move;
    let movePiece = moveStack[index].piece;
    let moveInCheck = moveStack[index].inCheck;
    let moveScore = moveStack[index].score;
    let moveDepth = moveStack[index].depth;
    let moveTime = moveStack[index].time;
    let movePv = moveStack[index].pv;
    
    let sourceSquare = engine.getMoveSource(move);
    let targetSquare = engine.getMoveTarget(move);
    let piece = sanPiece[movePiece];
    let check = '';
    let capture = '';
    
    if (piece == 'P') piece = '';
    if (moveInCheck) check = '+';

    if (engine.getMoveCapture(move)) {
      if (piece) capture = 'x';
      else capture = engine.squareToString(sourceSquare)[0] + 'x';
    }
    
    let moveNumber = ((index % 2) ? '': ((index / 2 + 1) + '. '));
    let moveString = piece + 
                     capture + 
                     engine.squareToString(targetSquare) +
                     check;
    
    if (engine.getMoveCastling(move)) {
      if (moveString == 'Kg1' || moveString == 'Kg8') moveString = '0-0';
      if (moveString == 'Kc1' || moveString == 'Kc8') moveString = '0-0-0';
    }
    
    let displayScore = (((moveScore / 100) == 0) ? '-0.00' : (moveScore / 100)) + '/' + moveDepth + ' ';
    if (typeof(moveScore) == 'string') displayScore = '+' + moveScore + '/' + moveDepth + ' ';
    
    let stats = (movePv ? '(' + movePv.trim() + ')' + ' ': '') + 
                (moveDepth ? ((moveScore > 0) ? ('+' + displayScore) : displayScore): '') +
                Math.round(moveTime / 1000);

    let nextMove = moveNumber + moveString + (moveTime ? ' {' + stats + '}' : '');

    pgn += nextMove + ' ';
    userTime = 0;      
  }

  return pgn;
}

// update PGN
function updatePgn() {
  let pgn = getGamePgn();
  let gameMoves = document.getElementById('pgn');
  
  gameMoves.value = pgn;
  
  if (gameResult != '*') {
    gameMoves.value += gameResult.includes('Mate') ? '# ' + gameResult : ' ' + gameResult;
    updateEddiesOnGameEnd(gameResult.split(' ')[0]);
  }
  
  gameMoves.scrollTop = gameMoves.scrollHeight;
}

// update Eddies
function updateEddiesOnGameEnd(result) {
  let reward = 0;
  let resultType = '';

  if (result === '1-0') {
    resultType = guiSide === 0 ? 'W' : 'L';
  } else if (result === '0-1') {
    resultType = guiSide === 1 ? 'W' : 'L';
  } else if (result.includes('1/2-1/2') || result === 'Stalemate') {
    resultType = 'D';
  } else {
    console.log("Unexpected result:", result);
    return; // Don't update for unexpected results
  }

  switch (botName) {
    case 'NIBBLESPLZ':
      reward = resultType === 'W' ? 10 : resultType === 'D' ? 5 : 1;
      break;
    case 'BORG':
      reward = resultType === 'W' ? 50 : resultType === 'D' ? 25 : 5;
      break;
    case 'TYG3R':
      reward = resultType === 'W' ? 100 : resultType === 'D' ? 50 : 10;
      break;
    case 'ELJEFE':
      reward = resultType === 'W' ? 200 : resultType === 'D' ? 100 : 20;
      break;
    case 'SAKARUNNER':
      reward = resultType === 'W' ? 400 : resultType === 'D' ? 200 : 40;
      break;
  }

  eddiesCount += reward;
  console.log(`${resultType} against ${botName}. Eddies earned: ${reward}`);
  console.log(`New Eddies count: ${eddiesCount}`);
  document.getElementById('eddiesCount').textContent = eddiesCount;
}

// download PGN
function downloadPgn() {
  let userName = prompt('Enter your name:', 'Player');
  let userColor = (guiSide == 0) ? 'White' : 'Black';
  
  if (userColor != 'White' && userColor != 'Black') {
    alert('Wrong color, please try again');
    return;
  }

  let header = '';
  if (guiFen) header += '[FEN "' + guiFen + '"]\n';
  header += '[Event "Played on Cyberpunk Chess"]\n';
  header += '[Date "' + new Date() + '"]\n';
  header += '[White "' + ((userColor == 'White') ? userName : botName) + '"]\n';
  header += '[Black "' + ((userColor == 'Black') ? userName : botName) + '"]\n';
  header += '[Result "' + gameResult + '"]\n\n';

  let downloadLink = document.createElement('a');
  downloadLink.id = 'download';
  downloadLink.download = ((userColor == 'White') ? (userName + '_vs_' + botName + '.pgn') : (botName + '_vs_' + userName + '.pgn'));
  downloadLink.hidden = true;
  downloadLink.href = window.URL.createObjectURL( new Blob([header + getGamePgn() + ((gameResult == '*') ? ' *' : '')], {type: 'text'}));
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
}

// set bot
function setBot(bot) {
  botName = bot;
  document.getElementById('current-bot-image').src = bots[bot].image;
  document.querySelector('.bot-name').textContent = bot; // Update bot name
  fixedTime = bots[bot].time;
  fixedDepth = bots[bot].depth;
  book = JSON.parse(JSON.stringify(bots[bot].book));
  document.getElementById('pgn').value = bots[bot].description;
  // Update select color
  engine.SELECT_COLOR = bots[bot].selectColor;
}

// set default bot
setBot('NIBBLESPLZ');