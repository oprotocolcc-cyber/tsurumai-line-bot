const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '86e07760c7a4ae17bbc0e8eac1e1daea',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
};

const client = new Client(config);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();

app.post('/webhook', middleware(config), async (req, res) => {
  for (const event of req.body.events) {
    if (event.type === 'message' && event.message.type === 'text') {
      await handleMessage(event);
    }
  }
  res.status(200).end();
});

async function handleMessage(event) {
  const userMessage = event.message.text.trim();
  const replyToken = event.replyToken;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `あなたは奈良市つるまい地区の自治協議会の公式LINEボットです。
住民からの質問に親切・簡潔に日本語で答えてください。

【基本情報】
- 名称：つるまい自治協議会
- 所在地：奈良県奈良市鶴舞町
- 電話：0742-XX-XXXX（平日9:00-17:00）
- 定期行事：清掃活動（毎月第1日曜日）、定例会（毎月第3土曜日）

【対応方針】
- LINEメッセージなので200文字以内で簡潔に
- 地域の行事・連絡先・場所案内を中心に対応
- わからないことは「担当者にお問い合わせください」と案内`,
      messages: [{ role: 'user', content: userMessage }]
    });

    const replyText = response.content[0].text;
    await client.replyMessage(replyToken, { type: 'text', text: replyText });

  } catch (err) {
    console.error('Claude API error:', err);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'ただいま対応できません。しばらくしてからお試しください。'
    });
  }
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot running on port ${PORT}`);
});