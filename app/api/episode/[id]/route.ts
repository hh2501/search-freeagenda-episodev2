import { NextRequest, NextResponse } from "next/server";
import client, { INDEX_NAME } from "@/lib/db/index";
import {
  parseVTTWithTimestamps,
  findTimestampForText,
} from "@/lib/transcript/timestamp";
import { CACHE_CONTROL_EPISODE, cacheHeaders } from "@/lib/cache-headers";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const episodeId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const searchQuery = searchParams.get("q"); // 検索クエリ（オプション）
  const exactMatchParam = searchParams.get("exact") === "1"; // 完全一致検索

  if (!episodeId) {
    return NextResponse.json(
      { error: "エピソードIDが必要です" },
      { status: 400 },
    );
  }

  // OpenSearchクライアントの確認
  if (!client) {
    return NextResponse.json(
      { error: "OpenSearchが設定されていません。" },
      { status: 503 },
    );
  }

  try {
    // エピソード詳細APIでは、インデックス存在チェックをスキップしてパフォーマンスを向上
    // インデックスが存在しない場合は、検索時にエラーが返されるので、その時点でエラーハンドリングする

    // エピソードを取得（検索クエリで取得）
    const getResponse = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          term: { episode_id: episodeId },
        },
        size: 1,
      },
    });

    const hits =
      (getResponse as any).hits?.hits ||
      (getResponse as any).body?.hits?.hits ||
      [];

    if (hits.length === 0) {
      return NextResponse.json(
        { error: "エピソードが見つかりませんでした" },
        { status: 404 },
      );
    }

    const source = hits[0]._source;

    if (!source) {
      return NextResponse.json(
        { error: "エピソードが見つかりませんでした" },
        { status: 404 },
      );
    }

    // 検索クエリがある場合、ハイライトを取得
    let highlights: { transcript_text?: string[]; description?: string[] } = {};
    let allMatchPositions: Array<{
      text: string;
      field: string;
      position: number;
      timestamp?: { startTime: number; endTime: number };
    }> = [];

    // VTTファイルからタイムスタンプ情報を取得（検索クエリがある場合のみ）
    // 検索クエリがない場合は、タイムスタンプ情報は不要なのでスキップしてパフォーマンスを向上
    let timestampSegments: Array<{
      startTime: number;
      endTime: number;
      text: string;
    }> = [];
    if (searchQuery && searchQuery.trim() && source.listen_url) {
      try {
        // listen.styleのURLからVTTファイルのURLを構築
        const vttUrl = `${source.listen_url}/transcript.vtt`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // タイムアウトを5秒に短縮

        const vttResponse = await fetch(vttUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        clearTimeout(timeoutId);

        if (vttResponse.ok) {
          const vttText = await vttResponse.text();
          if (process.env.NODE_ENV === "development") {
            // VTTファイルの最初の500文字をログに出力
            console.log(
              `[DEBUG] VTTファイル内容（最初の500文字）:\n${vttText.substring(0, 500)}`,
            );
          }
          timestampSegments = parseVTTWithTimestamps(vttText);
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[DEBUG] VTTファイル取得成功: ${timestampSegments.length}個のセグメントを取得`,
            );
            if (timestampSegments.length > 0) {
              console.log(`[DEBUG] 最初のセグメント例:`, {
                startTime: timestampSegments[0].startTime,
                endTime: timestampSegments[0].endTime,
                text: timestampSegments[0].text.substring(0, 50) + "...",
              });
            }
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[DEBUG] VTTファイル取得失敗: ${vttResponse.status} ${vttResponse.statusText}`,
            );
          }
        }
      } catch (error) {
        // VTTファイルの取得に失敗した場合は無視
        if (process.env.NODE_ENV === "development") {
          console.warn("[DEBUG] VTTファイルの取得に失敗:", error);
        }
      }
    }

    if (searchQuery && searchQuery.trim()) {
      const queryText = searchQuery.trim();
      // 完全一致時: 検索APIと同様に複数キーワードを分割し、各キーワードを phrase で AND する
      const exactKeywords = exactMatchParam
        ? queryText.split(/\s+/).filter((k) => k.length > 0)
        : [];
      const hasMultipleExactKeywords = exactKeywords.length > 1;

      const textQuery = exactMatchParam
        ? hasMultipleExactKeywords
          ? {
              bool: {
                must: [
                  { term: { episode_id: episodeId } },
                  ...exactKeywords.map((kw) => ({
                    bool: {
                      should: [
                        { match_phrase: { transcript_text: { query: kw } } },
                        { match_phrase: { description: { query: kw } } },
                        { match_phrase: { title: { query: kw } } },
                      ],
                      minimum_should_match: 1,
                    },
                  })),
                ],
              },
            }
          : {
              bool: {
                must: [{ term: { episode_id: episodeId } }],
                should: [
                  { match_phrase: { transcript_text: { query: queryText } } },
                  { match_phrase: { description: { query: queryText } } },
                  { match_phrase: { title: { query: queryText } } },
                ],
                minimum_should_match: 1,
              },
            }
        : {
            bool: {
              must: [
                { term: { episode_id: episodeId } },
                {
                  multi_match: {
                    query: queryText,
                    fields: ["title^10", "description^6", "transcript_text^4"],
                    type: "best_fields",
                  },
                },
              ],
            },
          };

      // 検索クエリでハイライトを取得
      // OpenSearch SDK の QueryContainer 型が bool.should 内の match_phrase 推論と合わないため、body を型アサーションで渡す
      const searchResponse = await client.search({
        index: INDEX_NAME,
        body: {
          query: textQuery,
          highlight: {
            fields: {
              transcript_text: {
                fragment_size: 200,
                number_of_fragments: 20,
              },
              description: {
                fragment_size: 200,
                number_of_fragments: 5,
              },
            },
          },
          _source: {
            includes: [
              "episode_id",
              "title",
              "description",
              "published_at",
              "listen_url",
              "transcript_text",
            ],
          },
          timeout: "5s",
          size: 1,
        } as Parameters<typeof client.search>[0]["body"],
      });

      const hits =
        (searchResponse as any).hits?.hits ||
        (searchResponse as any).body?.hits?.hits ||
        [];
      if (hits.length > 0) {
        highlights = hits[0].highlight || {};

        // すべてのマッチ箇所を収集。タイムスタンプは VTT セグメントとフラグメントの対応で付与。
        // 複数候補時は transcript の周囲テキスト（contextBefore/After）でスコアリングし、最も一致するセグメントを選ぶ。
        const transcriptSeen = new Set<string>();
        const transcriptFull = (source.transcript_text as string) || "";
        const CONTEXT_WINDOW = 200;
        if (highlights.transcript_text) {
          const fragmentCount = highlights.transcript_text.length;
          for (let index = 0; index < highlights.transcript_text.length; index++) {
            const fragment = highlights.transcript_text[index];
            const plainText = fragment
              .replace(/<em[^>]*>(.*?)<\/em>/gi, "$1")
              .trim();
            let contextBefore = "";
            let contextAfter = "";
            if (transcriptFull.length >= plainText.length) {
              const offsets: number[] = [];
              let pos = 0;
              while (pos < transcriptFull.length) {
                const i = transcriptFull.indexOf(plainText, pos);
                if (i === -1) break;
                offsets.push(i);
                pos = i + 1;
              }
              if (offsets.length > 0) {
                const offset =
                  offsets[Math.min(index, offsets.length - 1)];
                contextBefore = transcriptFull.slice(
                  Math.max(0, offset - CONTEXT_WINDOW),
                  offset,
                );
                contextAfter = transcriptFull.slice(
                  offset + plainText.length,
                  Math.min(
                    transcriptFull.length,
                    offset + plainText.length + CONTEXT_WINDOW,
                  ),
                );
              }
            }
            const timestamp =
              timestampSegments.length > 0
                ? findTimestampForText(fragment, timestampSegments, {
                    fragmentIndex: index,
                    totalFragments: fragmentCount,
                    contextBefore,
                    contextAfter,
                  })
                : null;
            const startKey = timestamp?.startTime ?? "none";
            const dedupeKey = `transcript_text\n${plainText}\n${startKey}`;
            if (transcriptSeen.has(dedupeKey)) continue;
            transcriptSeen.add(dedupeKey);

            if (process.env.NODE_ENV === "development") {
              if (timestamp) {
                console.log(
                  `[DEBUG] タイムスタンプ取得成功 [${index}]: ${timestamp.startTime}s - ${timestamp.endTime}s`,
                );
              } else {
                console.warn(
                  `[DEBUG] タイムスタンプ取得失敗 [${index}]: フラグメント=${fragment.substring(0, 50)}...`,
                );
              }
            }

            allMatchPositions.push({
              text: fragment,
              field: "transcript_text",
              position: index,
              timestamp: timestamp || undefined,
            });
          }
        }
        if (highlights.description) {
          const descSeen = new Set<string>();
          highlights.description.forEach((fragment: string, index: number) => {
            const plainText = fragment
              .replace(/<em[^>]*>(.*?)<\/em>/gi, "$1")
              .trim();
            if (descSeen.has(plainText)) return;
            descSeen.add(plainText);
            allMatchPositions.push({
              text: fragment,
              field: "description",
              position: index,
            });
          });
        }
      }
    }

    return NextResponse.json(
      {
        episode: {
          episodeId: source.episode_id,
          title: source.title,
          description: source.description,
          publishedAt: source.published_at,
          listenUrl: source.listen_url,
          transcriptText: source.transcript_text,
        },
        highlights,
        allMatchPositions,
        searchQuery: searchQuery || null,
      },
      { headers: cacheHeaders(CACHE_CONTROL_EPISODE) },
    );
  } catch (error: any) {
    console.error("Error fetching episode:", error);

    // 404エラーの場合
    if (error.statusCode === 404 || error.meta?.statusCode === 404) {
      return NextResponse.json(
        { error: "エピソードが見つかりませんでした" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "エピソードの取得に失敗しました",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
