// server/test.js
const { createDeck, shuffleDeck, checkResult } = require('./gameLogic');

// 1. 準備一副洗好的牌
let deck = createDeck();
deck = shuffleDeck(deck);

// 2. 模擬發前兩張牌（球門）
const card1 = deck.pop();
const card2 = deck.pop();
console.log(`【球門兩側】分別是：${card1.suit}${card1.value} 和 ${card2.suit}${card2.value}`);

// 3. 模擬抽出第三張牌（射門）
const thirdCard = deck.pop();
console.log(`【你抽出的第三張牌】：${thirdCard.suit}${thirdCard.value}`);

// 4. 判定輸贏
const result = checkResult(card1, card2, thirdCard);
console.log(`【判定結果】：${result} (win=過關 / lose=沒中 / clash=撞柱)`);