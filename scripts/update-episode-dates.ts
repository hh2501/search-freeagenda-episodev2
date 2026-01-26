/**
 * エピソードのpublished_atを更新するスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/update-episode-dates.ts
 */

const API_URL = process.env.NEXT_PUBLIC_VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000';

const episodesToUpdate = [
  {
    titlePattern: '#274 【前編】デジタルで産業に変化を起こせるか',
    publishedAt: '2023-04-10T00:00:00Z',
  },
  {
    titlePattern: '#277 社会学から学ぶ構造の理解と選定',
    publishedAt: '2023-04-17T00:00:00Z',
  },
  {
    titlePattern: '#255 Hikaruさんが質問箱を開設するまで',
    publishedAt: '2022-11-16T00:00:00Z',
  },
  {
    titlePattern: '#1 ドキュメントの価値',
    publishedAt: '2020-01-22T00:00:00Z',
  },
  {
    titlePattern: '#331_yamottyさんfakeが嫌いすぎる問題',
    publishedAt: '2024-06-18T00:00:00Z',
  },
];

async function updateEpisodes() {
  try {
    console.log('エピソードの更新を開始します...');
    console.log(`API URL: ${API_URL}/api/episode/update-published-at`);

    const response = await fetch(`${API_URL}/api/episode/update-published-at`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        episodes: episodesToUpdate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('エラー:', error);
      process.exit(1);
    }

    const result = await response.json();
    
    console.log('\n更新結果:');
    console.log(`総数: ${result.summary.total}`);
    console.log(`成功: ${result.summary.success}`);
    console.log(`失敗: ${result.summary.failure}`);
    
    console.log('\n詳細:');
    result.results.forEach((r: any) => {
      if (r.success) {
        console.log(`✅ ${r.titlePattern} -> ${r.episodeId}`);
      } else {
        console.log(`❌ ${r.titlePattern}: ${r.error}`);
      }
    });

    if (result.summary.failure > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

updateEpisodes();
