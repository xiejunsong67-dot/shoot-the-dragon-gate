// server/index.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createDeck, shuffleDeck, checkResult } = require('./gameLogic');

const app = express();
const httpServer = createServer(app);

// 允許任何前端網域跨域連線 (CORS)
const io = new Server(httpServer, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// 用來記錄所有房間狀態的記憶體資料庫
// 結構會長這樣： { "房間號碼": { players: [], deck: [], gameState: {} } }
const rooms = {};

io.on('connection', (socket) => {
    console.log(`有新玩家連線，Socket ID: ${socket.id}`);

    // 【事件 1：建立或加入房間】
    socket.on('join-room', (roomId, playerName) => {
        socket.join(roomId);

        // 如果房間不存在，就初始化一個新房間
        if (!rooms[roomId]) {
            rooms[roomId] = {
                id: roomId,
                players: [],
                deck: shuffleDeck(createDeck()), // 初始化一整副洗好的牌
                gameStarted: false,
                currentTurn: 0,
                pool: 0,                         // 底池籌碼
                tableCards: { card1: null, card2: null, thirdCard: null }
            };
        }

        // 把玩家資訊塞進房間裡
        rooms[roomId].players.push({
            id: socket.id,
            name: playerName,
            chips: 1000 // 每個玩家預設 1000 籌碼
        });

        console.log(`玩家 [${playerName}] 加入了房間 [${roomId}]`);

        // 將最新房間狀態廣播給房間裡的所有人
        io.to(roomId).emit('room-updated', rooms[roomId]);
    });

    // 【事件 2：房主點擊開始遊戲】
    socket.on('start-game', (roomId) => {
        const room = rooms[roomId];
        if (room) {
            room.gameStarted = true;
            room.pool = room.players.length * 100; // 每人強制下注 100 當底池
            room.players.forEach(p => p.chips -= 100);
            
            // 發前兩張牌（球門）
            room.tableCards.card1 = room.deck.pop();
            room.tableCards.card2 = room.deck.pop();
            room.tableCards.thirdCard = null;

            console.log(`房間 [${roomId}] 遊戲正式開始，底池：${room.pool}`);
            io.to(roomId).emit('room-updated', room);
        }
    });
// 【事件 4：玩家進行下注射門】
    socket.on('player-bet', (roomId, betAmount) => {
        const room = rooms[roomId];
        if (!room || !room.gameStarted) return;

        const player = room.players[room.currentTurn];
        // 確保是目前輪到的玩家才可以下注，且下注金額不能大於自己財產，也不能大於底池
        if (player.id !== socket.id) return;
        if (betAmount > player.chips || betAmount > room.pool) return;

        // 1. 抽出第三張牌
        room.tableCards.thirdCard = room.deck.pop();

        // 2. 利用我們先前寫好的 gameLogic 來判定輸贏
        const result = checkResult(room.tableCards.card1, room.tableCards.card2, room.tableCards.thirdCard);

        // 3. 根據結果結算籌碼
        if (result === 'win') {
            player.chips += betAmount;  // 贏了，從底池拿走籌碼
            room.pool -= betAmount;
        } else if (result === 'clash') {
            const penalty = betAmount * 2; // 撞柱！賠雙倍進底池
            player.chips -= penalty;
            room.pool += penalty;
        } else {
            player.chips -= betAmount;  // 沒中，籌碼歸底池
            room.pool += betAmount;
        }

        console.log(`房間 [${roomId}] 玩家 [${player.name}] 下注 ${betAmount}，結果：${result}，最新底池：${room.pool}`);

        // 廣播這次下注的結果給所有人
        io.to(roomId).emit('bet-result', {
            playerName: player.name,
            result: result,
            thirdCard: room.tableCards.thirdCard,
            betAmount: betAmount
        });

        // 4. 移動到下一個玩家的輪次
        room.currentTurn = (room.currentTurn + 1) % room.players.length;

        // 5. 檢查底池如果乾了，自動重新補滿
        if (room.pool <= 0) {
            room.pool = room.players.length * 100;
            room.players.forEach(p => p.chips -= 100);
        }

        // 6. 幫下一輪自動發前兩張牌
        if (room.deck.length < 3) room.deck = shuffleDeck(createDeck()); // 牌不夠就洗新的一副
        room.tableCards.card1 = room.deck.pop();
        room.tableCards.card2 = room.deck.pop();
        
        // 延遲一下再廣播更新狀態，讓前端玩家有時間看清楚抽到的第三張牌
        setTimeout(() => {
            room.tableCards.thirdCard = null; // 清空第三張，準備下一輪
            io.to(roomId).emit('room-updated', room);
        }, 3500); // 留 3.5 秒給玩家看牌
    }); 
    // 【事件 3：中斷連線處理】
    socket.on('disconnect', () => {
        console.log(`玩家斷開連線: ${socket.id}`);
        // 這裡後續可以補上把玩家從房間移除的邏輯
    });
});

// 讓伺服器監聽 3001 端口
const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 射龍門多人連線伺服器正在運行，運行在 http://localhost:${PORT}`);
});