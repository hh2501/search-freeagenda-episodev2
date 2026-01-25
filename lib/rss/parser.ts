import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

export interface Episode {
  episodeId: string;
  title: string;
  description: string;
  publishedAt: Date;
  listenUrl: string;
  transcriptUrl?: string;
}

const parser = new Parser({
  customFields: {
    item: [
      ['podcast:transcript', 'transcript'],
    ],
  },
});

export async function fetchEpisodesFromRSS(rssUrl: string): Promise<Episode[]> {
  try {
    const feed = await parser.parseURL(rssUrl);
    const episodes: Episode[] = [];

    if (!feed.items) {
      return episodes;
    }

    for (const item of feed.items) {
      if (!item.link || !item.title) {
        continue;
      }

      // listen.styleのURLからエピソードIDを抽出
      // 例: https://listen.style/p/freeagenda/jtrwnfvl -> jtrwnfvl
      const episodeId = extractEpisodeId(item.link);
      if (!episodeId) {
        continue;
      }

      // 文字起こしURLを構築
      const transcriptUrl = item.link.endsWith('/transcript.vtt')
        ? item.link
        : `${item.link}/transcript.vtt`;

      episodes.push({
        episodeId,
        title: item.title,
        description: item.contentSnippet || item.content || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        listenUrl: item.link,
        transcriptUrl,
      });
    }

    return episodes;
  } catch (error) {
    console.error('RSS取得エラー:', error);
    throw error;
  }
}

function extractEpisodeId(url: string): string | null {
  // https://listen.style/p/freeagenda/jtrwnfvl の形式から jtrwnfvl を抽出
  const match = url.match(/\/p\/freeagenda\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * listen.styleのURLから直接エピソード情報を取得
 * @param episodeUrl listen.styleのエピソードURL（例: https://listen.style/p/freeagenda/ks04j2tl）
 * @returns エピソード情報
 */
export async function fetchEpisodeFromUrl(episodeUrl: string): Promise<Episode> {
  try {
    // エピソードIDを抽出
    const episodeId = extractEpisodeId(episodeUrl);
    if (!episodeId) {
      throw new Error(`無効なURL形式です: ${episodeUrl}`);
    }

    // HTMLを取得
    const response = await fetch(episodeUrl, {
      signal: AbortSignal.timeout(30000), // 30秒タイムアウト
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // タイトルを取得
    const title = $('h1, h2').first().text().trim() || 
                  $('title').text().trim() ||
                  `エピソード ${episodeId}`;

    // 説明を取得（メタディスクリプションまたは最初の段落）
    let description = $('meta[name="description"]').attr('content') || '';
    if (!description) {
      // 最初の段落を取得
      const firstParagraph = $('p').first().text().trim();
      if (firstParagraph.length > 0) {
        description = firstParagraph;
      }
    }

    // 公開日を取得（可能な場合）
    let publishedAt = new Date();
    const dateText = $('time[datetime]').attr('datetime') || 
                     $('[class*="date"], [class*="published"]').first().text().trim();
    if (dateText) {
      const parsedDate = new Date(dateText);
      if (!isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate;
      }
    }

    // 文字起こしURLを構築
    const transcriptUrl = `${episodeUrl}/transcript.vtt`;

    return {
      episodeId,
      title,
      description,
      publishedAt,
      listenUrl: episodeUrl,
      transcriptUrl,
    };
  } catch (error) {
    console.error(`エピソード取得エラー (${episodeUrl}):`, error);
    throw error;
  }
}
