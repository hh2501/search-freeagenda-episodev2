import fs from 'fs';
import path from 'path';

/**
 * TSVファイルからエピソード情報を読み込み、JSONテンプレートを生成
 */
async function generateChecklistTemplate() {
  try {
    // TSVファイルを読み込む（絶対パスを使用）
    const tsvPath = 'c:\\Users\\hiroto ito\\Downloads\\Untitled Discover session - Untitled Discover session (2).tsv';
    
    const tsvContent = fs.readFileSync(tsvPath, 'utf-8');
    const lines = tsvContent.split('\n').filter(line => line.trim());
    
    // ヘッダー行をスキップ
    const dataLines = lines.slice(1);
    
    // TSVからエピソード情報を抽出
    const checklistItems: any[] = [];
    
    for (const line of dataLines) {
      const parts = line.split('\t');
      if (parts.length < 2) continue;
      
      const title = parts[0].trim();
      const dateStr = parts[1].trim();
      
      if (!title || !dateStr) continue;
      
      // エピソード番号を抽出
      const episodeNumberMatch = title.match(/#(\d+)/);
      if (!episodeNumberMatch) continue;
      
      const episodeNumber = episodeNumberMatch[1];
      
      // 日付をパース（YYYY/MM/DD形式）
      const [year, month, day] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      
      checklistItems.push({
        episodeId: '', // 後でOpenSearchから取得してマッチング
        episodeNumber: episodeNumber,
        title: title,
        publishedAt: date.toISOString(),
        checked: false,
        checkedAt: null,
      });
    }
    
    // エピソード番号でソート
    checklistItems.sort((a, b) => {
      const numA = parseInt(a.episodeNumber) || 0;
      const numB = parseInt(b.episodeNumber) || 0;
      return numA - numB;
    });
    
    // JSONファイルを生成
    const jsonData = {
      episodes: checklistItems,
      lastUpdated: null,
    };
    
    const outputPath = path.join(process.cwd(), 'public', 'transcript-checklist.json');
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    console.log(`✅ チェックリストテンプレートを生成しました: ${outputPath}`);
    console.log(`   エピソード数: ${checklistItems.length}件`);
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

generateChecklistTemplate();
