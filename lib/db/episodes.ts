import client, { INDEX_NAME, initializeIndex } from "./index";
import { Episode } from "../rss/parser";

export async function saveEpisode(episode: Episode): Promise<void> {
  if (!client) {
    throw new Error(
      "OpenSearchクライアントが設定されていません。OPENSEARCH_ENDPOINTを確認してください。",
    );
  }

  // インデックスが存在しない場合は作成
  await initializeIndex();

  // エピソードを保存または更新
  await client.index({
    index: INDEX_NAME,
    id: episode.episodeId,
    body: {
      episode_id: episode.episodeId,
      title: episode.title,
      description: episode.description,
      published_at: episode.publishedAt,
      listen_url: episode.listenUrl,
      transcript_url: episode.transcriptUrl,
      updated_at: new Date().toISOString(),
    },
    refresh: true, // 即座に検索可能にする
  });
}

export async function saveTranscript(
  episodeId: string,
  transcriptText: string,
): Promise<void> {
  if (!client) {
    throw new Error(
      "OpenSearchクライアントが設定されていません。OPENSEARCH_ENDPOINTを確認してください。",
    );
  }

  // インデックスが存在しない場合は作成
  await initializeIndex();

  // 文字起こしを更新（エピソードが存在する場合のみ）
  const now = new Date().toISOString();
  try {
    await client.update({
      index: INDEX_NAME,
      id: episodeId,
      body: {
        doc: {
          transcript_text: transcriptText,
          updated_at: now,
        },
      },
      refresh: true,
    });
  } catch (error: any) {
    // エピソードが存在しない場合は新規作成
    if (error.meta?.statusCode === 404) {
      await client.index({
        index: INDEX_NAME,
        id: episodeId,
        body: {
          episode_id: episodeId,
          transcript_text: transcriptText,
          updated_at: now,
        },
        refresh: true,
      });
    } else {
      throw error;
    }
  }
}

export async function getAllEpisodes(): Promise<Episode[]> {
  if (!client) {
    throw new Error("OpenSearchクライアントが設定されていません。");
  }

  const response = await client.search({
    index: INDEX_NAME,
    body: {
      query: { match_all: {} },
      sort: [{ published_at: { order: "desc" } }],
      size: 1000, // 最大1000件取得
    },
  });

  // OpenSearch 3.xでは、レスポンスが直接返される
  const hits =
    (response as any).hits?.hits || (response as any).body?.hits?.hits || [];

  return hits.map((hit: any) => ({
    episodeId: hit._source.episode_id,
    title: hit._source.title,
    description: hit._source.description,
    publishedAt: hit._source.published_at,
    listenUrl: hit._source.listen_url,
    transcriptUrl: hit._source.transcript_url,
  }));
}

/**
 * エピソードのpublished_atを更新
 */
export async function updateEpisodePublishedAt(
  episodeId: string,
  publishedAt: Date,
): Promise<void> {
  if (!client) {
    throw new Error("OpenSearchクライアントが設定されていません。");
  }

  await client.update({
    index: INDEX_NAME,
    id: episodeId,
    body: {
      doc: {
        published_at: publishedAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    refresh: true,
  });
}

/**
 * タイトルでエピソードを検索してエピソードIDを取得
 */
export async function findEpisodeByTitle(
  titlePattern: string,
): Promise<string | null> {
  if (!client) {
    throw new Error("OpenSearchクライアントが設定されていません。");
  }

  const response = await client.search({
    index: INDEX_NAME,
    body: {
      query: {
        match: {
          title: titlePattern,
        },
      },
      size: 1,
    },
  });

  const hits =
    (response as any).hits?.hits || (response as any).body?.hits?.hits || [];

  if (hits.length === 0) {
    return null;
  }

  return hits[0]._source.episode_id;
}
