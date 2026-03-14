const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const fetch = require('node-fetch');

// 設定
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '86e07760c7a4ae17bbc0e8eac1e1daea',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
};

// LINE クライアント
const client = new Client(config);

// Express アプリ
const app = express();

// 強化版システムプロンプト
const SYSTEM_PROMPT = `あなたは奈良市つるまい地区の自治協議会公式 LINE ボット「つるまいボット」です。

【基本情報】
- 名称：つるまい自治協議会（鶴舞自治協議会）
- 所在地：奈良県奈良市鶴舞町
- 連絡先：0742-XX-XXXX（平日 9:00-17:00）
- 公式サイト：https://tsurumai-nara.com
- 活動エリア：奈良市鶴舞地区全域

【主な行事・スケジュール】
- 清掃活動：毎月第 1 日曜日 9:00〜（鶴舞会館前集合）
- 定例会：毎月第 3 土曜日 14:00〜
- つむぎフェスタ：年 1 回 秋開催（地域マーケット）
- 防災訓練：年 1 回 5 月頃
- 餅つき大会：年 1 回 年末

【回答ルール】
1. 必ず 200 文字以内で簡潔に
2. 親しみやすいですます調
3. 絵文字を適度に使用（1-3 個）
4. 不明なことは「0742-XX-XXXX までお問い合わせください」
5. 緊急時（火事・救急）は「119 番へ」と案内
6. 政治・宗教・個人情報には回答しない
7. 地域情報に特化（他地域の質問は「つるまい地区の情報です」と断る）

【回答スタイル例】
良い例：「はい！清掃活動は毎月第 1 日曜日 9:00〜です🧹 集合場所は鶴舞会館前です。お気軽にご参加ください😊」
悪い例：「清掃活動につきましては、毎月第一日曜日の午前九時より開催されております」（硬すぎる）`;

// 拡張キーワードマッチング（50 個）
const keywordResponses = {
  // 挨拶
  'こんにちは': 'こんにちは！つるまい自治協議会です🌸 何かお手伝いできますか？',
  'こんばんは': 'こんばんは！つるまい自治協議会です🌙 ご用件は何でしょうか？',
  'おはよう': 'おはようございます！つるまい自治協議会です☀️ 今日もよろしくお願いします',
  'ありがとう': 'どういたしまして😊 またいつでもお声がけください！',
  ' grazie': 'どういたしまして！つるまいボットでした👋',
  'さようなら': 'ありがとうございました！またのご利用をお待ちしています👋',
  'バイバイ': 'バイバイ！またね〜👋',
  
  // 連絡先
  '電話': '📞 0742-XX-XXXX（平日 9:00-17:00）\nお気軽にお電話ください！',
  '連絡先': '📞 0742-XX-XXXX（平日 9:00-17:00）\n📧 公式サイトのお問い合わせフォームもどうぞ',
  'メール': '📧 公式サイトのお問い合わせフォームをご利用ください→ https://tsurumai-nara.com',
  '住所': '📍 奈良県奈良市鶴舞町です',
  '場所': '📍 奈良県奈良市鶴舞町一帯が活動エリアです',
  'アクセス': '🚶 近鉄鶴舞駅より徒歩 5 分\n🚗 駐車場：鶴舞会館（無料）',
  
  // 行事・イベント
  '行事': '🗓️ 主な行事：\n第 1 日曜：清掃活動 9:00〜\n第 3 土曜：定例会 14:00〜\n秋：つむぎフェスタ\n5 月：防災訓練\n詳しくは公式サイトで！',
  'イベント': '🎉 イベント情報：\n秋：つむぎフェスタ（地域マーケット）\n年末：餅つき大会\n5 月：防災訓練\nファミリーで参加 OK です！',
  '清掃': '🧹 清掃活動：毎月第 1 日曜日 9:00〜\n集合：鶴舞会館前\n道具は各自ご用意ください。手套・ゴミ袋は配布します！',
  'ゴミ': '🗑️ ゴミ出しルールは奈良市公式サイトをご覧ください。\n収集日は地域によって異なります',
  '集会': '🏠 定例会：毎月第 3 土曜日 14:00〜\n場所：鶴舞会館\nどなたでも参加できます！',
  '会議': '📋 定例会：毎月第 3 土曜 14:00〜\n鶴舞会館にて開催。議題は掲示板で公開中！',
  'つむぎ': '🎪 つむぎフェスタ：秋開催の地域マーケット！\n出店者募集中。詳細は 0742-XX-XXXX へ',
  'フェスタ': '🎪 つむぎフェスタ：秋の地域イベント！\nキッチンカー・手作り品など出店あります😊',
  '餅つき': '🍡 餅つき大会：年末開催！\n子供も参加 OK。ついたお餅は配布します🎁',
  '防災': '🚒 防災訓練：年 1 回 5 月頃\n避難所：鶴舞小学校体育館\n備蓄：鶴舞会館',
  '避難': '🆘 避難所：鶴舞小学校体育館\n備蓄倉庫：鶴舞会館\n災害時は 119 番・110 番へ',
  '災害': '🆘 災害時：119 番（救急・火事）110 番（事件）\n避難所：鶴舞小学校',
  '地震': '🌋 地震対策：鶴舞会館に備蓄あり\n避難所：鶴舞小学校体育館\n安否確認は地域掲示板で',
  
  // 入会・会員
  '入会': '👋 入会大歓迎！\n📞 0742-XX-XXXX まで\nまたは行事に参加していただくだけでも OK です！',
  '会員': '📝 会員募集中！\n年会費：地域により異なります\n📞 0742-XX-XXXX へお気軽に',
  '加入': '✨ 加入手続き：0742-XX-XXXX へ\nまたは定例会にご参加ください！',
  '退会': '😢 退会手続き：0742-XX-XXXX まで\nお手数ですが直接ご連絡ください',
  
  // 施設
  '会館': '🏠 鶴舞会館：\n住所：奈良市鶴舞町 XX\n利用時間：9:00-21:00\n予約：0742-XX-XXXX',
  'グラウンド': '⚾ グラウンド：鶴舞小学校隣接\n利用予約：0742-XX-XXXX',
  '駐車場': '🚗 駐車場：鶴舞会館（無料）\n20 台収容可能です',
  
  // 子供・家族
  '子供': '👶 子供向け行事：\n夏祭り、餅つき大会、清掃活動など\nファミリー参加歓迎です！',
  '家族': '👨‍👩‍👧‍👦 家族で参加 OK！\n子供から高齢者まで楽しめる行事多数あります',
  '赤ちゃん': '👶 赤ちゃん連れでも OK！\n定例会などは託児はありませんが、お気軽にどうぞ',
  '学生': '🎓 学生ボランティア募集中！\n地域活動で単位認定も可能。学校と要相談',
  
  // 高齢者
  '高齢者': '👴 高齢者向け：\n健康教室（月 1 回）、サロン活動（週 1 回）\nお気軽にご参加ください！',
  '健康': '💪 健康教室：月 1 回 鶴舞会館\n血圧測定、体操など。無料！',
  'サロン': '☕ 地域サロン：週 1 回 鶴舞会館\nお茶飲みながら交流しましょう😊',
  
  // ボランティア
  'ボランティア': '🙋 ボランティア募集中！\n清掃、イベント運営、見守り活動など\n📞 0742-XX-XXXX',
  '手伝い': '🤝 お手伝い大歓迎！\nできる範囲で OK。お気軽に 0742-XX-XXXX へ',
  
  // Web サイト・SNS
  'サイト': '🌐 公式サイト→ https://tsurumai-nara.com\n行事予定、お知らせを掲載中！',
  'ホームページ': '🌐 https://tsurumai-nara.com\nスマホで見やすいデザインです📱',
  'facebook': '📘 Facebook→ つるまい自治協議会\n行事写真を投稿中！',
  'インスタ': '📷 Instagram→ @tsurumai_community\n活動写真毎日更新！',
  'line': '💚 公式 LINE です！\n友達追加よろしくお願いします😊',
  'youtube': '📹 YouTube は準備中です🎬',
  
  // 天気
  '天気': '🌤️ 鶴舞地域の天気はこちら→\nhttps://tsurumai-nara.com/weather',
  '雨': '☔ 雨の日の行事は中止の場合があります。\n公式サイトで確認ください',
  
  // その他
  '写真': '📸 活動写真は Instagram で公開中！\n@tsurumai_community',
  '動画': '🎥 動画は YouTube 準備中📹',
  'ニュース': '📰 地域ニュースは回覧板で配布中\nバックナンバーは会館で閲覧可',
  '回覧板': '📋 回覧板：地域を順次回っています\nご不在の場合は隣組へ',
  '募金': '💰 地域募金：年 1 回 秋\n使途：地域活動・防災備蓄\n任意参加です',
  '寄付': '🎁 寄付歓迎！\n使途：地域活動全般\n領収書発行可。0742-XX-XXXX へ',
  '広告': '📢 地域広告：回覧板・掲示板\n掲載料：500 円〜\n📞 0742-XX-XXXX',
  '求人': '💼 地域求人：掲示板に掲載中\nお店・事業所の方もどうぞ！',
  'お店': '🏪 地域のお店情報：\n掲示板・公式サイトで紹介中',
  'レストラン': '🍽️ 鶴舞地区のレストラン：\n公式サイト「地域のお店」コーナーで',
  '病院': '🏥 近隣病院：\n鶴舞クリニック（内科）\n奈良歯科医院\n📞 各病院へ直接予約を',
  '薬局': '💊 薬局：\nつるまい薬局（会館隣）\nマツモトキヨシ（駅前に）',
  'スーパー': '🛒 スーパー：\nイオン鶴舞店（徒歩 10 分）\nライフ（駅徒歩 3 分）',
  'コンビニ': '🏪 コンビニ：\nセブン（駅徒歩 2 分）\nローソン（会館隣）\nファミマ（駅徒歩 5 分）',
  '銀行': '🏦 銀行：\n奈良銀行鶴舞支店（駅徒歩 3 分）\nATM：24 時間利用可',
  '郵便局': '📮 郵便局：\n鶴舞郵便局（徒歩 5 分）\nATM：平日 9-17 時',
  
  // 未定義へのフォールバック用
  'わかりません': '😅 すみません、よくわかりませんでした。\n📞 0742-XX-XXXX までお問い合わせください',
  '知らない': '🤔 申し訳ありません、その情報は持っていません。\n担当までご連絡ください：0742-XX-XXXX',
  '人間': '👤 担当者につながりますか？\n📞 0742-XX-XXXX（平日 9-17 時）\nまたは公式サイトのお問い合わせフォームへ',
  'オペレーター': '👩 担当者：0742-XX-XXXX（平日 9-17 時）\n折り返し連絡も可能です！',
  '人': '👤 人と話したい場合：\n📞 0742-XX-XXXX（平日 9-17 時）\n担当者が対応します！'
};

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

  try {
    // 1. キーワードマッチング（高速・正確）
    const keywordReply = findKeywordMatch(userMessage);
    if (keywordReply) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: keywordReply
      });
      console.log(`[Keyword] ${userMessage} → ${keywordReply.slice(0, 30)}...`);
      return;
    }

    // 2. Qwen 3.5 Plus で柔軟回答
    const qwenReply = await callQwen(userMessage);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: qwenReply
    });
    console.log(`[Qwen] ${userMessage} → ${qwenReply.slice(0, 30)}...`);

  } catch (err) {
    console.error('Error:', err);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '申し訳ありません。一時的にエラーが発生しています。\n📞 0742-XX-XXXX まで直接ご連絡ください。'
    });
  }
}

// キーワードマッチング（部分一致・複数キーワード）
function findKeywordMatch(message) {
  const lowerMessage = message.toLowerCase();
  
  // 完全一致チェック
  for (const [keyword, response] of Object.entries(keywordResponses)) {
    if (lowerMessage === keyword.toLowerCase()) {
      return response;
    }
  }
  
  // 部分一致チェック
  for (const [keyword, response] of Object.entries(keywordResponses)) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      return response;
    }
  }
  
  return null;
}

// Qwen API 呼び出し
async function callQwen(message) {
  const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`
    },
    body: JSON.stringify({
      model: 'qwen-plus-latest',
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Qwen API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ヘルスチェック
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    bot: 'tsurumai-line-bot',
    version: '2.0-enhanced'
  });
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 つるまいボット（強化版）running on port ${PORT}`);
});
