import { NextRequest, NextResponse } from 'next/server';
import client, { INDEX_NAME, initializeIndex } from '@/lib/db/index';
import { parseVTTWithTimestamps, findTimestampForText } from '@/lib/transcript/timestamp';

// APIルートを動的として明示的に設定（静的生成を無効化）
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const episodeId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const searchQuery = searchParams.get('q'); // 検索クエリ（オプション）

  if (!episodeId) {
    return NextResponse.json({ error: 'エピソードIDが必要です' }, { status: 400 });
  }

  // OpenSearchクライアントの確認
  if (!client) {
    return NextResponse.json(
      { error: 'OpenSearchが設定されていません。' },
      { status: 503 }
    );
  }

  try {
    // インデックスが存在しない場合は作成
    await initializeIndex();

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

    const hits = (getResponse as any).hits?.hits || (getResponse as any).body?.hits?.hits || [];
    
    if (hits.length === 0) {
      return NextResponse.json({ error: 'エピソードが見つかりませんでした' }, { status: 404 });
    }

    const source = hits[0]._source;

    if (!source) {
      return NextResponse.json({ error: 'エピソードが見つかりませんでした' }, { status: 404 });
    }

    // 検索クエリがある場合、ハイライトを取得
    let highlights: { transcript_text?: string[]; description?: string[] } = {};
    let allMatchPositions: Array<{ text: string; field: string; position: number; timestamp?: { startTime: number; endTime: number } }> = [];
    
    // VTTファイルからタイムスタンプ情報を取得（文字起こしの場合）
    let timestampSegments: Array<{ startTime: number; endTime: number; text: string }> = [];
    if (source.listen_url) {
      try {
        // listen.styleのURLからVTTファイルのURLを構築
        const vttUrl = `${source.listen_url}/transcript.vtt`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const vttResponse = await fetch(vttUrl, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        clearTimeout(timeoutId);
        
        if (vttResponse.ok) {
          const vttText = await vttResponse.text();
          if (process.env.NODE_ENV === 'development') {
            // VTTファイルの最初の500文字をログに出力
            console.log(`[DEBUG] VTTファイル内容（最初の500文字）:\n${vttText.substring(0, 500)}`);
          }
          timestampSegments = parseVTTWithTimestamps(vttText);
          if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] VTTファイル取得成功: ${timestampSegments.length}個のセグメントを取得`);
            if (timestampSegments.length > 0) {
              console.log(`[DEBUG] 最初のセグメント例:`, {
                startTime: timestampSegments[0].startTime,
                endTime: timestampSegments[0].endTime,
                text: timestampSegments[0].text.substring(0, 50) + '...',
              });
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[DEBUG] VTTファイル取得失敗: ${vttResponse.status} ${vttResponse.statusText}`);
          }
        }
      } catch (error) {
        // VTTファイルの取得に失敗した場合は無視
        if (process.env.NODE_ENV === 'development') {
          console.warn('[DEBUG] VTTファイルの取得に失敗:', error);
        }
      }
    }

    if (searchQuery && searchQuery.trim()) {
      // 検索クエリでハイライトを取得
      const searchResponse = await client.search({
        index: INDEX_NAME,
        body: {
          query: {
            bool: {
              must: [
                { term: { episode_id: episodeId } },
                {
                  multi_match: {
                    query: searchQuery.trim(),
                    fields: ['title^10', 'description^6', 'transcript_text^4'],
                    type: 'best_fields',
                  },
                },
              ],
            },
          },
          highlight: {
            fields: {
              transcript_text: {
                fragment_size: 200,
                number_of_fragments: 50, // 多くのフラグメントを取得
              },
              description: {
                fragment_size: 200,
                number_of_fragments: 10,
              },
            },
          },
          size: 1,
        },
      });

      const hits = (searchResponse as any).hits?.hits || (searchResponse as any).body?.hits?.hits || [];
      if (hits.length > 0) {
        highlights = hits[0].highlight || {};
        
        // すべてのマッチ箇所を収集
        if (highlights.transcript_text) {
          highlights.transcript_text.forEach((fragment: string, index: number) => {
            // タイムスタンプを検索
            const timestamp = timestampSegments.length > 0 
              ? findTimestampForText(fragment, timestampSegments)
              : null;
            
            if (process.env.NODE_ENV === 'development') {
              if (timestamp) {
                console.log(`[DEBUG] タイムスタンプ取得成功 [${index}]: ${timestamp.startTime}s - ${timestamp.endTime}s`);
              } else {
                console.warn(`[DEBUG] タイムスタンプ取得失敗 [${index}]: フラグメント=${fragment.substring(0, 50)}...`);
              }
            }
            
            allMatchPositions.push({
              text: fragment,
              field: 'transcript_text',
              position: index,
              timestamp: timestamp || undefined,
            });
          });
        }
        if (highlights.description) {
          highlights.description.forEach((fragment: string, index: number) => {
            allMatchPositions.push({
              text: fragment,
              field: 'description',
              position: index,
            });
          });
        }
      }
    }

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error('Error fetching episode:', error);
    
    // 404エラーの場合
    if (error.statusCode === 404 || error.meta?.statusCode === 404) {
      return NextResponse.json({ error: 'エピソードが見つかりませんでした' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'エピソードの取得に失敗しました', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
