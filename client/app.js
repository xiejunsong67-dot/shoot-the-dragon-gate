// client/app.js

// 連線到我們剛剛做好的後端伺服器 (Port 3001)
const socket = io('http://localhost:3001');

// 抓取 HTML 畫面上的元素
const lobbyUi = document.getElementById('lobby-ui');
const gameUi = document.getElementById('game-ui');
const roomTitle = document.getElementById('room-title');
const poolInfo = document.getElementById('pool-info');
const playerList = document.getElementById('player-list');
const btnStart = document.getElementById('btn-start');
const statusMsg = document.getElementById('status-msg');

let myRoomId = "";

// 點擊「加入房間」按鈕
// 點擊「加入房間」按鈕
document.getElementById('btn-join').addEventListener('click', () => {
    const name = document.getElementById('player-name').value; //
    const room = document.getElementById('room-id').value; //
    
    // ✨ 新增：抓取初始金額輸入框的值，如果沒填或不合法就給 1000
    let initMoney = parseInt(document.getElementById('init-money').value);
    if (isNaN(initMoney) || initMoney < 100) {
        initMoney = 1000;
    }

    if (!name || !room) { //
        alert("請輸入暱稱與房間號碼！"); //
        return; //
    }

    myRoomId = room; //
    // 發送事件給後端：我要進房間！
    // ✨ 這裡多傳送第三個參數 initMoney
    socket.emit('join-room', room, name, initMoney); //

    // 切換介面顯示
    lobbyUi.classList.add('hidden'); //
    gameUi.classList.remove('hidden'); //
    roomTitle.innerText = `房間號碼 : ${room}`; //
});

// 點擊「房主開始遊戲」按鈕
btnStart.addEventListener('click', () => {
    socket.emit('start-game', myRoomId);
});

// 監聽後端傳過來的「最新房間狀態」並即時更新網頁畫面
socket.on('room-updated', (room) => {
    poolInfo.innerText = `💰 目前底池籌碼：${room.pool}`;
    
    // 更新玩家清單顯示
    playerList.innerHTML = room.players.map(p => 
        `<p>👤 ${p.name} (籌碼: ${p.chips}) ${p.id === socket.id ? '<b>(你)</b>' : ''}</p>`
    ).join('');

    // 如果你是第一個玩家（房主），且遊戲還沒開始，顯示開始按鈕
    if (room.players[0].id === socket.id && !room.gameStarted) {
        btnStart.classList.remove('hidden');
    } else {
        btnStart.classList.add('hidden');
    }

    // 如果遊戲已經開始，顯示發出來的兩張牌
    if (room.gameStarted && room.tableCards.card1) {
        renderCard('card-left', room.tableCards.card1);
        renderCard('card-right', room.tableCards.card2);
        statusMsg.innerText = "遊戲開始！請等待目前輪到的玩家下注...";
    }
});

// 輔助函式：把撲克牌數據變成漂亮的網頁卡片
function renderCard(elementId, cardData) {
    const cardElement = document.getElementById(elementId);
    if (!cardData) {
        cardElement.innerText = "?";
        cardElement.className = "card empty";
        return;
    }
    
    cardElement.innerText = `${cardData.suit}\n${getCardDisplayValue(cardData.value)}`;
    cardElement.className = `card ${(cardData.suit === '♥' || cardData.suit === '♦') ? 'red' : ''}`;
}

function getCardDisplayValue(value) {
    if (value === 11) return 'J';
    if (value === 12) return 'Q';
    if (value === 13) return 'K';
    if (value === 14) return 'A';
    return value;
}
// client/app.js (續接在原本檔案的最下方)

const betControls = document.getElementById('bet-controls');
const betAmountInput = document.getElementById('bet-amount');
const btnBet = document.getElementById('btn-bet');

// 點擊「下注射門」按鈕
btnBet.addEventListener('click', () => {
    const amount = parseInt(betAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("請輸入有效的下注金額！");
        return;
    }
    // 發送下注事件給後端
    socket.emit('player-bet', myRoomId, amount);
});

// 在 room-updated 事件中，多控制下注面板的顯示隱藏
// 請找到你原本的 socket.on('room-updated', ...) 裡面的代碼，並把這段邏輯補進去：
socket.on('room-updated', (room) => {
    // ... 原本更新底池、玩家清單、發前兩張牌的程式碼保留 ...
    
    // 控制下注面板：只有輪到你的回合，才會顯示下注輸入框
    const currentPlayer = room.players[room.currentTurn];
    if (room.gameStarted && currentPlayer.id === socket.id) {
        betControls.classList.remove('hidden');
        statusMsg.innerText = "🌟 輪到你的回合了！請輸入金額並下注！";
    } else if (room.gameStarted) {
        betControls.classList.add('hidden');
        statusMsg.innerText = `等待玩家 [${currentPlayer.name}] 下注中...`;
    }
});

// 監聽後端傳來的「開牌輸贏結果」
socket.on('bet-result', (data) => {
    // 秀出最刺激的第三張牌！
    renderCard('card-third', data.thirdCard);

    let resultTxt = "";
    if (data.result === 'win') resultTxt = `🎉 順利過關！贏得 ${data.betAmount} 籌碼！`;
    if (data.result === 'lose') resultTxt = `❌ 慘遭沒中！輸掉 ${data.betAmount} 籌碼！`;
    if (data.result === 'clash') resultTxt = `💥💥 撞柱啦！！慘賠雙倍 ${data.betAmount * 2} 籌碼！`;

    statusMsg.innerHTML = `<b style="font-size: 20px;">[${data.playerName}] ${resultTxt}</b>`;
});