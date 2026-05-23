// server/gameLogic.js

// 1. 產生一副全新的 52 張撲克牌
function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    // 為了方便比大小，我們把 A 當作 14（或者你要當 1 也可以，通常射龍門 A 是 14 最大）
    // 這裡設定：2~10 就是原本數字，J=11, Q=12, K=13, A=14
    const deck = [];
    
    for (let suit of suits) {
        for (let value = 2; value <= 14; value++) {
            deck.push({ suit, value });
        }
    }
    return deck;
}

// 2. 洗牌演算法 (Fisher-Yates Shuffle)
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// 3. 核心判定功能：傳入左柱、右柱、以及玩家抽出的第三張牌
// 回傳結果：'win' (過關), 'lose' (沒中), 'clash' (撞柱)
function checkResult(card1, card2, thirdCard) {
    // 先找出左柱和右柱哪張牌點數小，哪張牌點數大
    const min = Math.min(card1.value, card2.value);
    const max = Math.max(card1.value, card2.value);
    const third = thirdCard.value;

    // 情況 A：如果前兩張牌點數一模一樣（例如兩張 7）
    if (min === max) {
        if (third === min) {
            return 'clash'; // 第三張又是 7，超級撞柱！
        } else if (third > min) {
            return 'win';   // 比這兩張大，算過關（俗稱猜大）
        } else {
            return 'lose';  // 比這兩張小，算不中（俗稱猜小）
        }
    }

    // 情況 B：正常球門（例如 4 和 10）
    if (third === min || third === max) {
        return 'clash'; // 抽到 4 或 10，直接撞柱！
    } else if (third > min && third < max) {
        return 'win';   // 抽到 5~9 之間，順利進球過關！
    } else {
        return 'lose';  // 抽到 2, 3 或 J, Q, K, A，沒進球，輸！
    }
}

// 將這些功能導出，讓之後的 Socket 連線伺服器可以使用
module.exports = { createDeck, shuffleDeck, checkResult };