import { NextRequest, NextResponse } from 'next/server';
import client, { INDEX_NAME, initializeIndex } from '@/lib/db/index';
import { getCachedResult, setCachedResult } from '@/lib/cache/search-cache';

// APIルートを動的として明示的に設定（静的生成を無効化）
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const exactMatchParam = searchParams.get('exact') === '1';

  if (!query || query.trim() === '') {
    return NextResponse.json({ error: '検索クエリが必要です' }, { status: 400 });
  }

  // OpenSearchクライアントの確認
  if (!client) {
    return NextResponse.json(
      { error: 'OpenSearchが設定されていません。.env.localファイルにOPENSEARCH_ENDPOINTを設定してください。' },
      { status: 503 }
    );
  }

  const searchQuery = query.trim();
  const cacheKey = exactMatchParam ? `${searchQuery}:exact` : searchQuery;

  // キャッシュから結果を取得
  const cacheCheckStart = performance.now();
  const cachedResult = getCachedResult(cacheKey);
  const cacheCheckTime = performance.now() - cacheCheckStart;
  
  if (cachedResult) {
    // キャッシュヒット時は、キャッシュされた結果を返す
    const totalTime = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE HIT] Query: ${cacheKey}, Cache check: ${cacheCheckTime.toFixed(2)}ms, Total: ${totalTime.toFixed(2)}ms`);
    }
    return NextResponse.json(cachedResult);
  }

  try {
    // 検索APIでは、インデックス存在チェックをスキップしてパフォーマンスを向上
    // インデックスが存在しない場合は、検索時にエラーが返されるので、その時点でエラーハンドリングする
    const initIndexTime = 0; // スキップしたため0ms

    // 完全一致検索の解析
    const queryParseStart = performance.now();
    let exactMatches: string[] = [];
    let processedQuery = searchQuery;
    
    if (exactMatchParam) {
      // チェックボックスがONの場合は、クエリ全体を完全一致検索として扱う
      const keywords = searchQuery.split(/\s+/).filter(k => k.length > 0);
      exactMatches = keywords;
      processedQuery = '';
    } else {
      // ダブルクォーテーション（""）で囲まれた部分を抽出（従来の動作）
      const exactMatchPattern = /"([^"]+)"/g;
      let match;
      while ((match = exactMatchPattern.exec(searchQuery)) !== null) {
        exactMatches.push(match[1]);
        // 抽出した部分をクエリから削除（後で通常検索用に使用）
        processedQuery = processedQuery.replace(match[0], '').trim();
      }
      
      // 残りのクエリから余分なスペースを削除
      processedQuery = processedQuery.replace(/\s+/g, ' ').trim();
    }
    
    const queryParseTime = performance.now() - queryParseStart;

    // クエリの構築（最適化: 重複処理を削減）
    const queryBuildStart = performance.now();
    
    // キーワード分割を1回だけ実行
    const keywords = processedQuery ? processedQuery.split(/\s+/).filter(k => k.length > 0) : [];
    const hasMultipleKeywords = keywords.length > 1;
    const allKeywords = [...exactMatches, ...keywords];
    const hasAllKeywords = allKeywords.length > 1;
    
    // 完全一致検索用のクエリ構築ヘルパー関数
    const createExactMatchQuery = (phrase: string) => ({
      multi_match: {
        query: phrase,
        fields: ['title^10', 'description^6', 'transcript_text^4'],
        type: 'phrase',
        slop: 0,
      },
    });
    
    // 通常検索用のクエリ構築
    const buildNormalQueries = (): any[] => {
      if (!processedQuery || processedQuery.length === 0) {
        return [];
      }
      
      if (hasMultipleKeywords) {
        // 複数キーワード: 各キーワードをAND条件で検索
        return keywords.map((keyword) => ({
          multi_match: {
            query: keyword,
            fields: ['title^3', 'description^2', 'transcript_text'],
            type: 'best_fields',
            operator: 'or',
          },
        }));
      } else {
        // 単一キーワード: フレーズマッチと単語マッチの両方
        return [
          {
            multi_match: {
              query: processedQuery,
              fields: ['title^5', 'description^2', 'transcript_text^3'],
              type: 'phrase',
              slop: 0,
            },
          },
          {
            multi_match: {
              query: processedQuery,
              fields: ['title^3', 'description^2', 'transcript_text'],
              type: 'best_fields',
              operator: 'and',
              minimum_should_match: '75%',
            },
          },
        ];
      }
    };
    
    // クエリボディの構築
    const queryBody: any = { bool: {} };
    const exactMatchClauses = exactMatches.map(createExactMatchQuery);
    const normalQueries = buildNormalQueries();
    
    if (exactMatches.length > 0 && !processedQuery) {
      // 完全一致検索のみ
      queryBody.bool.must = exactMatchClauses;
    } else if (hasMultipleKeywords || (exactMatches.length > 0 && processedQuery)) {
      // 複数キーワードまたは混合検索: must句でAND条件
      queryBody.bool.must = [...exactMatchClauses, ...normalQueries];
    } else {
      // 単一キーワードのみ: should句を使用
      queryBody.bool.should = normalQueries;
      queryBody.bool.minimum_should_match = 1;
    }

    // 複数キーワードの場合は、各キーワードがハイライトされるようにフラグメント数を増やす
    const numberOfFragments = hasAllKeywords ? Math.max(allKeywords.length, 3) : 1;
    const queryBuildTime = performance.now() - queryBuildStart;

    // OpenSearchで全文検索を実行
    const searchStart = performance.now();
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: queryBody,
        // パフォーマンス最適化: 必要なフィールドのみ取得
        _source: {
          includes: ['episode_id', 'title', 'description', 'published_at', 'listen_url', 'transcript_text'],
        },
        highlight: {
          fields: {
            title: {
              number_of_fragments: 0, // タイトルは全文をハイライト
            },
            description: {
              fragment_size: 200,
              number_of_fragments: hasMultipleKeywords ? Math.max(allKeywords.length, 2) : 1,
            },
            transcript_text: {
              fragment_size: 200,
              number_of_fragments: numberOfFragments,
            },
          },
          // パフォーマンス最適化: ハイライトタグをシンプルに
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
        },
        sort: [
          { _score: { order: 'desc' } },
          { published_at: { order: 'desc' } },
        ],
        size: 50,
        // パフォーマンス最適化: タイムアウト設定（デフォルトより短く）
        timeout: '5s',
      },
    });

    const searchTime = performance.now() - searchStart;
    
    // 検索結果を整形
    // OpenSearch 3.xでは、レスポンスが直接返される
    const resultProcessStart = performance.now();
    const hits = (response as any).hits?.hits || (response as any).body?.hits?.hits || [];
    
    const results = hits.map((hit: any) => {
      const source = hit._source;
      const highlights = hit.highlight || {};

      // 正規表現の特殊文字をエスケープするヘルパー関数
      const escapeRegex = (str: string): string => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      
      // 複数キーワードの場合、各キーワードが含まれるハイライトを分類
      let preview = '';
      const keywordPreviews: { keyword: string; fragment: string }[] = [];
      
      if (hasMultipleKeywords && allKeywords.length > 0) {
        // 各キーワードが含まれるハイライトフラグメントを収集
        const allFragments: string[] = [
          ...(highlights.transcript_text || []),
          ...(highlights.description || []),
        ];
        
        // 各キーワードについて、そのキーワードのみがハイライトされたフラグメントを作成
        for (const keyword of allKeywords) {
          const keywordLower = keyword.toLowerCase();
          const isExactMatch = exactMatches.includes(keyword);
          let foundFragment: string | null = null;
          
          // デバッグ用ログ（開発環境のみ）
          if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] Processing keyword: ${keyword}, isExactMatch: ${isExactMatch}, allFragments count: ${allFragments.length}`);
          }
          
          // まず、このキーワードのみが含まれるフラグメントを探す
          for (const fragment of allFragments) {
            // ハイライトタグを除いたテキストを取得（大文字小文字を保持）
            const fragmentTextOnly = fragment.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
            const fragmentText = fragment.toLowerCase();
            const fragmentTextOnlyLower = fragmentTextOnly.toLowerCase();
            const highlightedText = fragment.match(/<em[^>]*>(.*?)<\/em>/gi) || [];
            
            // このキーワードが含まれているか確認（ハイライトタグ内も含む）
            let keywordMatches = false;
            if (isExactMatch) {
              keywordMatches = fragmentTextOnlyLower.includes(keywordLower) || 
                               fragmentText.includes(keywordLower) ||
                               highlightedText.some(ht => ht.toLowerCase().includes(keywordLower));
            } else {
              // 単語境界を考慮
              const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'i');
              keywordMatches = wordBoundaryRegex.test(fragmentTextOnlyLower) ||
                               wordBoundaryRegex.test(fragmentText) ||
                               highlightedText.some(ht => wordBoundaryRegex.test(ht));
            }
            
            // デバッグ用ログ（開発環境のみ）
            if (process.env.NODE_ENV === 'development') {
              if (keywordMatches) {
                console.log(`[DEBUG] Keyword "${keyword}" matches in fragment: ${fragmentTextOnly.substring(0, 50)}...`);
              } else {
                // 最初の数個のフラグメントのみログ出力（ログが多すぎるのを防ぐ）
                const fragmentIndex = allFragments.indexOf(fragment);
                if (fragmentIndex < 2) {
                  console.log(`[DEBUG] Keyword "${keyword}" does NOT match in fragment ${fragmentIndex}: ${fragmentTextOnly.substring(0, 50)}..., fragmentTextOnlyLower includes keyword: ${fragmentTextOnlyLower.includes(keywordLower)}, fragmentText includes keyword: ${fragmentText.includes(keywordLower)}`);
                }
              }
            }
            
            if (!keywordMatches) continue;
            
            // このフラグメントに他のキーワードが含まれているか確認
            let hasOtherKeywords = false;
            for (const otherKeyword of allKeywords) {
              if (otherKeyword.toLowerCase() === keywordLower) continue;
              
              const otherKeywordLower = otherKeyword.toLowerCase();
              const otherIsExactMatch = exactMatches.includes(otherKeyword);
              let otherMatches = false;
              
              if (otherIsExactMatch) {
                otherMatches = fragmentTextOnlyLower.includes(otherKeywordLower) ||
                               fragmentText.includes(otherKeywordLower) ||
                               highlightedText.some(ht => ht.toLowerCase().includes(otherKeywordLower));
              } else {
                const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(otherKeywordLower)}\\b`, 'i');
                otherMatches = wordBoundaryRegex.test(fragmentTextOnlyLower) ||
                               wordBoundaryRegex.test(fragmentText) ||
                               highlightedText.some(ht => wordBoundaryRegex.test(ht));
              }
              
              if (otherMatches) {
                hasOtherKeywords = true;
                break;
              }
            }
            
            // このキーワードのみが含まれるフラグメントが見つかった
            if (!hasOtherKeywords) {
              // すべてのハイライトタグを削除してから、このキーワードのみをハイライト
              let filteredFragment = fragment.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
              
              // 日本語の場合、単語境界を使わずに直接キーワードを検索
              // 大文字小文字を区別せずに検索し、マッチした部分をハイライト
              const keywordEscaped = escapeRegex(keyword);
              const keywordRegex = new RegExp(keywordEscaped, 'gi');
              
              // マッチした部分をハイライト
              filteredFragment = filteredFragment.replace(keywordRegex, (matched: string) => {
                return `<em>${matched}</em>`;
              });
              
              // デバッグ用ログ（開発環境のみ）
              if (process.env.NODE_ENV === 'development') {
                console.log(`[DEBUG] Found fragment for "${keyword}" (no other keywords), Has highlight: ${filteredFragment.includes('<em>')}, Fragment preview: ${filteredFragment.substring(0, 100)}`);
                console.log(`[DEBUG] Original fragment: ${filteredFragment.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1').substring(0, 100)}, Keyword: ${keyword}, Regex: ${keywordRegex}`);
              }
              
              foundFragment = filteredFragment;
              break;
            } else {
              // デバッグ用ログ（開発環境のみ）
              if (process.env.NODE_ENV === 'development') {
                console.log(`[DEBUG] Fragment contains other keywords for "${keyword}", will try next fragment or create filtered version`);
              }
            }
          }
          
          // このキーワードのみが含まれるフラグメントが見つからなかった場合、
          // このキーワードを含むフラグメントから、このキーワードのみをハイライトしたバージョンを作成
          if (!foundFragment) {
            for (const fragment of allFragments) {
              // ハイライトタグを除いたテキストを取得（大文字小文字を保持）
              const fragmentTextOnly = fragment.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
              const fragmentText = fragment.toLowerCase();
              const fragmentTextOnlyLower = fragmentTextOnly.toLowerCase();
              const highlightedText = fragment.match(/<em[^>]*>(.*?)<\/em>/gi) || [];
              
              // このキーワードが含まれているか確認
              let keywordMatches = false;
              if (isExactMatch) {
                keywordMatches = fragmentTextOnlyLower.includes(keywordLower) || 
                                 fragmentText.includes(keywordLower) ||
                                 highlightedText.some(ht => ht.toLowerCase().includes(keywordLower));
              } else {
                // 単語境界を考慮
                const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'i');
                keywordMatches = wordBoundaryRegex.test(fragmentTextOnlyLower) ||
                                 wordBoundaryRegex.test(fragmentText) ||
                                 highlightedText.some(ht => wordBoundaryRegex.test(ht));
              }
              
              if (keywordMatches) {
                // このキーワードのみをハイライトしたフラグメントを作成
                // すべてのハイライトタグを削除してテキストのみにする
                let filteredFragment = fragmentTextOnly;
                
                // このキーワードをハイライト（確実にハイライトされるように）
                // 日本語の場合、単語境界を使わずに直接キーワードを検索
                const keywordEscaped = escapeRegex(keyword);
                const keywordRegex = new RegExp(keywordEscaped, 'gi');
                
                // マッチした部分をハイライト
                filteredFragment = filteredFragment.replace(keywordRegex, (matched: string) => {
                  return `<em>${matched}</em>`;
                });
                
                // デバッグ用ログ（開発環境のみ）
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[DEBUG] Keyword: ${keyword}, Fragment length: ${filteredFragment.length}, Has highlight: ${filteredFragment.includes('<em>')}, Fragment preview: ${filteredFragment.substring(0, 100)}`);
                  console.log(`[DEBUG] Original fragment: ${fragmentTextOnly.substring(0, 100)}, Keyword: ${keyword}, Regex: ${keywordRegex}`);
                }
                
                foundFragment = filteredFragment;
                break;
              }
            }
          }
          
          // まだ見つからない場合、そのキーワードを含む最初のフラグメントを使用
          // この場合、フラグメント全体からこのキーワードのみをハイライトしたバージョンを作成
          if (!foundFragment) {
            for (const fragment of allFragments) {
              // ハイライトタグを除いたテキストを取得（大文字小文字を保持）
              const fragmentTextOnly = fragment.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
              const fragmentText = fragment.toLowerCase();
              const fragmentTextOnlyLower = fragmentTextOnly.toLowerCase();
              const highlightedText = fragment.match(/<em[^>]*>(.*?)<\/em>/gi) || [];
              
              // このキーワードが含まれているか確認
              let keywordMatches = false;
              if (isExactMatch) {
                keywordMatches = fragmentTextOnlyLower.includes(keywordLower) || 
                                 fragmentText.includes(keywordLower) ||
                                 highlightedText.some(ht => ht.toLowerCase().includes(keywordLower));
              } else {
                const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'i');
                keywordMatches = wordBoundaryRegex.test(fragmentTextOnlyLower) ||
                                 wordBoundaryRegex.test(fragmentText) ||
                                 highlightedText.some(ht => wordBoundaryRegex.test(ht));
              }
              
              if (keywordMatches) {
                // このキーワードのみをハイライトしたフラグメントを作成
                // フラグメント全体から、すべてのハイライトタグを削除してテキストのみにする
                let filteredFragment = fragmentTextOnly;
                
                // このキーワードをハイライト（確実にハイライトされるように）
                // 日本語の場合、単語境界を使わずに直接キーワードを検索
                const keywordEscaped = escapeRegex(keyword);
                const keywordRegex = new RegExp(keywordEscaped, 'gi');
                
                // マッチした部分をハイライト
                filteredFragment = filteredFragment.replace(keywordRegex, (matched: string) => {
                  return `<em>${matched}</em>`;
                });
                
                // デバッグ用ログ（開発環境のみ）
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[DEBUG] Keyword: ${keyword} (3rd loop), Fragment length: ${filteredFragment.length}, Has highlight: ${filteredFragment.includes('<em>')}, Fragment preview: ${filteredFragment.substring(0, 100)}`);
                }
                
                foundFragment = filteredFragment;
                break;
              }
            }
          }
          
          // フラグメントが見つからない場合、ソーステキストから該当部分を抽出
          if (!foundFragment) {
            const fallbackText = source.transcript_text || source.description || '';
            if (fallbackText.toLowerCase().includes(keywordLower)) {
              // ソーステキストから該当部分を抽出してハイライト
              const index = fallbackText.toLowerCase().indexOf(keywordLower);
              const start = Math.max(0, index - 100);
              const end = Math.min(fallbackText.length, index + keyword.length + 100);
              let excerpt = fallbackText.substring(start, end);
              
              // このキーワードをハイライト
              // 日本語の場合、単語境界を使わずに直接キーワードを検索
              const keywordEscaped = escapeRegex(keyword);
              const keywordRegex = new RegExp(keywordEscaped, 'gi');
              excerpt = excerpt.replace(keywordRegex, (matched: string) => `<em>${matched}</em>`);
              
              // デバッグ用ログ（開発環境のみ）
              if (process.env.NODE_ENV === 'development') {
                console.log(`[DEBUG] Fallback: Found fragment for "${keyword}" from source text, Has highlight: ${excerpt.includes('<em>')}, Fragment preview: ${excerpt.substring(0, 100)}`);
              }
              
              foundFragment = excerpt;
            } else {
              // デバッグ用ログ（開発環境のみ）
              if (process.env.NODE_ENV === 'development') {
                console.log(`[DEBUG] Fallback: Keyword "${keyword}" not found in source text (transcript_text: ${source.transcript_text ? 'exists' : 'null'}, description: ${source.description ? 'exists' : 'null'})`);
              }
            }
          }
          
          // 見つかったフラグメントを追加（必ず追加する）
          if (foundFragment) {
            // デバッグ用ログ（開発環境のみ）
            if (process.env.NODE_ENV === 'development') {
              console.log(`[DEBUG] Adding fragment for "${keyword}", Has highlight: ${foundFragment.includes('<em>')}, Length: ${foundFragment.length}`);
            }
            keywordPreviews.push({
              keyword: keyword,
              fragment: foundFragment,
            });
          } else {
            // デバッグ用ログ（開発環境のみ）
            if (process.env.NODE_ENV === 'development') {
              console.log(`[DEBUG] WARNING: No fragment found for keyword "${keyword}"`);
            }
          }
        }
        
        // すべてのキーワードがマッチした場合、選択したフラグメントを結合（フォールバック用）
        if (keywordPreviews.length === allKeywords.length) {
          preview = keywordPreviews.map(kp => kp.fragment).slice(0, 3).join(' ... ');
        } else {
          // 一部のキーワードしかマッチしなかった場合、すべてのフラグメントを使用
          preview = allFragments.slice(0, Math.min(allFragments.length, 3)).join(' ... ');
        }
        
        // フラグメントが取得できなかった場合のフォールバック
        if (!preview) {
          preview = 
            highlights.transcript_text?.[0] ||
            highlights.description?.[0] ||
            source.transcript_text?.substring(0, 200) ||
            source.description?.substring(0, 200) ||
            '';
        }
      } else {
        // 単一キーワードの場合は従来通り
        preview = 
          highlights.transcript_text?.[0] ||
          highlights.description?.[0] ||
          source.transcript_text?.substring(0, 200) ||
          source.description?.substring(0, 200) ||
          '';
      }

      return {
        episodeId: source.episode_id,
        title: (highlights.title?.[0] || source.title).replace(/<em>/g, '<mark>').replace(/<\/em>/g, '</mark>'), // ハイライトタグを変換
        description: source.description,
        publishedAt: source.published_at,
        listenUrl: source.listen_url,
        preview: preview.replace(/<em>/g, '<mark>').replace(/<\/em>/g, '</mark>'), // ハイライトタグを変換
        keywordPreviews: keywordPreviews.length > 0 ? keywordPreviews.map(kp => ({
          keyword: kp.keyword,
          fragment: kp.fragment.replace(/<em>/g, '<mark>').replace(/<\/em>/g, '</mark>'),
        })) : undefined,
        rank: hit._score,
      };
    });

    const resultProcessTime = performance.now() - resultProcessStart;
    
    const responseData = { results, count: results.length };
    
    // 検索結果をキャッシュに保存
    const cacheSaveStart = performance.now();
    setCachedResult(cacheKey, responseData);
    const cacheSaveTime = performance.now() - cacheSaveStart;
    
    const totalTime = performance.now() - startTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERFORMANCE] Query: ${searchQuery}`);
      console.log(`  - Initialize index: ${initIndexTime.toFixed(2)}ms`);
      console.log(`  - Query parsing: ${queryParseTime.toFixed(2)}ms`);
      console.log(`  - Query building: ${queryBuildTime.toFixed(2)}ms`);
      console.log(`  - OpenSearch search: ${searchTime.toFixed(2)}ms`);
      console.log(`  - Result processing: ${resultProcessTime.toFixed(2)}ms`);
      console.log(`  - Cache save: ${cacheSaveTime.toFixed(2)}ms`);
      console.log(`  - Total: ${totalTime.toFixed(2)}ms`);
      console.log(`  - Results: ${results.length}`);
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('検索エラー:', error);
    
    // エラーの詳細を取得
    let errorMessage = 'Unknown error';
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
      
      // OpenSearchのエラーオブジェクトの場合
      if ((error as any).meta) {
        errorDetails.meta = {
          statusCode: (error as any).meta.statusCode,
          body: (error as any).meta.body,
        };
      }
    }
    
    // OpenSearch接続エラーの場合
    if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return NextResponse.json(
        { 
          error: 'OpenSearchに接続できません。',
          details: 'OpenSearchエンドポイントが正しいか、ネットワーク設定を確認してください。',
          errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        },
        { status: 503 }
      );
    }
    
    // 403エラーの場合
    const statusCode = (error as any).meta?.statusCode || (error as any).statusCode;
    if (statusCode === 403 || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { 
          error: 'OpenSearchへのアクセスが拒否されました（403 Forbidden）',
          details: '認証情報またはアクセスポリシーを確認してください。',
          troubleshooting: {
            guide: 'TROUBLESHOOTING_403.md を参照してください',
            commonIssues: [
              '認証情報（OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD）が正しく設定されているか',
              'エンドポイントURLの末尾にスラッシュがないか',
              'AWSコンソールでアクセスポリシーが正しく設定されているか',
              'IP制限が設定されている場合、現在のIPアドレスが許可されているか',
            ],
          },
          errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        },
        { status: 403 }
      );
    }
    
    // 401エラーの場合
    if (statusCode === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('authentication')) {
      return NextResponse.json(
        { 
          error: '認証に失敗しました。',
          details: 'Elastic Cloud Serverlessの認証情報が正しく設定されていません。',
          troubleshooting: {
            message: '以下の点を確認してください：',
            steps: [
              '1. Vercelダッシュボードで環境変数を確認',
              '2. OPENSEARCH_ENDPOINTが正しく設定されているか',
              '3. OPENSEARCH_API_KEYが正しく設定されているか（API Keyのみを設定、ApiKeyプレフィックスは不要）',
              '4. 環境変数の値に余分なスペースや改行がないか',
              '5. 環境変数を設定後、デプロイを再実行',
            ],
            guide: '詳細は markdownfiles/VERCEL_ENV_VAR_SETUP.md を参照してください',
          },
          errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        },
        { status: 401 }
      );
    }
    
    // インデックスが存在しない場合
    if (errorMessage.includes('index_not_found') || errorMessage.includes('404')) {
      return NextResponse.json(
        { 
          error: 'OpenSearchインデックスが存在しません。',
          details: 'データ同期を実行してください: http://localhost:3000/api/sync',
          errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        },
        { status: 500 }
      );
    }
    
    // その他のエラー
    return NextResponse.json(
      { 
        error: `検索中にエラーが発生しました: ${errorMessage}`,
        details: '詳細はコンソールを確認してください。',
        errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}
