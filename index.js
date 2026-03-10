const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');

// 設定
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '86e07760c7a4ae17bbc0e8eac1e1daea',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
};

// LINE クライアント
const client = new Client(config);

// Express アプリ
const app = express();

// Webhook エンドポイント
app.post('/webhook', middleware(config), async (req, res) => {
  for (const event of req.body.events) {
    if (event.type === 'message' && event.message.type === 'text') {
      await handleMessage(event);
    }
  }
  res.status(200).end();
});

// メッセージ処理
async function handleMessage(event) {
  const userMessage = event.message.text.trim();
  const replyToken = event.replyToken;

  // シンプルな応答ロジック
  const response = getResponse(userMessage);

  await client.replyMessage(replyToken, {
    type: 'text',
    text: response
  });
}

// 応答ロジック（シンプル）
function getResponse(message) {
  const lower = message.toLowerCase();

  // あいさつ
  if (lower.match(/^(おは|こんにちは|こんばんは|hello|hi)/)) {
    return 'こんにちは！つるまい自治協議会です。何かお手伝いしましょうか？';
  }

  // 天気
  if (lower.match(/(天気|あめ|ゆき|はれ|くもり)/)) {
    return '天気情報はこちら：https://your-domain.com/weather-widget.html\n今日は良い天気ですね！';
  }

  // 場所・アクセス
  if (lower.match(/(場所|アクセス|行き方|地図|〒)/)) {
    return '📍 つるまい自治協議会\n奈良県奈良市鶴舞町\n詳細はお問い合わせください。';
  }

  // 連絡先
  if (lower.match(/(連絡|電話|メール|問い合わせ)/)) {
    return '📞 お問い合わせ\n電話：0742-XX-XXXX\n受付：9:00-17:00（平日）';
  }

  // 行事・イベント
  if (lower.match(/(行事|イベント|予定|カレンダー)/)) {
    return '📅 行事予定\n・清掃活動：毎月第 1 日曜日\n・定例会：毎月第 3 土曜日\n詳細はウェブサイトをご覧ください。';
  }

  // ヘルプ
  if (lower.match(/(ヘルプ|help|使い方|メニュー)/)) {
    return '🤖 ボットの使い方\n「天気」「場所」「連絡先」「行事」と聞いてください。';
  }

  // デフォルト
  return 'ありがとうございます。つるまい自治協議会です。\n「天気」「場所」「連絡先」「行事」などとお聞きください。';
}

// ヘルスチェック
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot running on port ${PORT}`);
});
