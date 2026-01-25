import * as cheerio from 'cheerio';

export async function fetchTranscript(episodeUrl: string): Promise<string | null> {
  try {
    // まずVTTファイルを試す（タイムアウト: 30秒）
    const vttUrl = `${episodeUrl}/transcript.vtt`;
    const vttController = new AbortController();
    const vttTimeout = setTimeout(() => vttController.abort(), 30000);
    
    try {
      const vttResponse = await fetch(vttUrl, {
        signal: vttController.signal,
      });
      clearTimeout(vttTimeout);
      
      if (vttResponse.ok) {
        const vttText = await vttResponse.text();
        // VTT形式からテキストを抽出
        return parseVTT(vttText);
      }
    } catch (error) {
      clearTimeout(vttTimeout);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`VTT取得タイムアウト: ${episodeUrl}`);
      }
    }

    // VTTが取得できない場合は、HTMLページから文字起こしを取得（タイムアウト: 30秒）
    const htmlController = new AbortController();
    const htmlTimeout = setTimeout(() => htmlController.abort(), 30000);
    
    try {
      const htmlResponse = await fetch(episodeUrl, {
        signal: htmlController.signal,
      });
      clearTimeout(htmlTimeout);
      
      if (!htmlResponse.ok) {
        return null;
      }

      const html = await htmlResponse.text();
      const $ = cheerio.load(html);

      // 文字起こしセクションを探す
      // listen.styleの構造に基づいてセレクタを調整
      const transcriptText: string[] = [];

      // 文字起こしが含まれる可能性のある要素を探す
      $('article, .transcript, [id*="transcript"], [class*="transcript"]').each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > 100) { // 十分な長さのテキストのみ
          transcriptText.push(text);
        }
      });

      // 見つからない場合は、body全体からテキストを抽出（最後の手段）
      if (transcriptText.length === 0) {
        const bodyText = $('body').text();
        if (bodyText.length > 500) {
          return bodyText;
        }
      }

      return transcriptText.join('\n\n') || null;
    } catch (error) {
      clearTimeout(htmlTimeout);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`HTML取得タイムアウト: ${episodeUrl}`);
        return null;
      }
      throw error;
    }
  } catch (error) {
    console.error(`文字起こし取得エラー (${episodeUrl}):`, error);
    return null;
  }
}

function parseVTT(vttText: string): string {
  // VTT形式からテキストを抽出
  const lines = vttText.split('\n');
  const textLines: string[] = [];

  for (const line of lines) {
    // VTTのタイムスタンプやメタデータをスキップ
    if (
      line.startsWith('WEBVTT') ||
      line.startsWith('NOTE') ||
      line.includes('-->') ||
      line.trim() === '' ||
      /^\d+$/.test(line.trim()) // シーケンス番号
    ) {
      continue;
    }

    // テキスト行を追加
    const trimmed = line.trim();
    if (trimmed) {
      textLines.push(trimmed);
    }
  }

  return textLines.join(' ');
}
