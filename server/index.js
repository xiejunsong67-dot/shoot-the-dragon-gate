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