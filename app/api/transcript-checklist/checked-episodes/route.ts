import { NextRequest, NextResponse } from "next/server";
import client, { INDEX_NAME } from "@/lib/db/index";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET: OpenSearchからチェック済みエピソードを取得
 */
export async function GET() {
  // OpenSearchクライアントの確認
  if (!client) {
    return NextResponse.json(
      { error: "OpenSearchが設定されていません。" },
      { status: 503 },
    );
  }

  try {
    // チェック済みエピソードを検索
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            must: [{ term: { checked: true } }],
          },
        },
        sort: [{ published_at: { order: "asc" } }],
        size: 1000, // 最大1000件取得
      },
    });

    // OpenSearch 3.xでは、レスポンスが直接返される
    const hits =
      (response as any).hits?.hits || (response as any).body?.hits?.hits || [];

    const checkedEpisodes = hits.map((hit: any) => ({
      episodeId: hit._source.episode_id,
      title: hit._source.title,
      publishedAt: hit._source.published_at,
      checked: true,
      checkedAt: hit._source.checked_at || null,
    }));

    // デバッグログ（開発環境のみ）
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[DEBUG] チェック済みエピソード数: ${checkedEpisodes.length}`,
      );
      checkedEpisodes.forEach((ep: any) => {
        const episodeNumberMatch = ep.title.match(/#(\d+)/);
        console.log(
          `[DEBUG] チェック済み: #${episodeNumberMatch ? episodeNumberMatch[1] : "?"} - ${ep.title} (ID: ${ep.episodeId})`,
        );
      });
    }

    return NextResponse.json({
      success: true,
      episodes: checkedEpisodes,
      count: checkedEpisodes.length,
    });
  } catch (error: any) {
    console.error("チェック済みエピソード取得エラー:", error);
    return NextResponse.json(
      {
        error: "チェック済みエピソードの取得に失敗しました",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
