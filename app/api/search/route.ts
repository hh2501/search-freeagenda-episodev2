import { NextRequest, NextResponse } from 'next/server';
import client, { INDEX_NAME, initializeIndex } from '@/lib/db/index';
import { getCachedResult, setCachedResult } from '@/lib/cache/search-cache';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

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

  // キャッシュから結果を取得
  const cachedResult = getCachedResult(searchQuery);
  if (cachedResult) {
    // キャッシュヒット時は、キャッシュされた結果を返す
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE HIT] Query: ${searchQuery}`);
    }
    return NextResponse.json(cachedResult);
  }

  try {
    // インデックスが存在しない場合は作成
    await initializeIndex();

    // 完全一致検索の解析: ダブルクォーテーション（""）で囲まれた部分を抽出
    const exactMatchPattern = /"([^"]+)"/g;
    const exactMatches: string[] = [];
    let processedQuery = searchQuery;
    
    // ダブルクォーテーションで囲まれた部分を抽出
    let match;
    while ((match = exactMatchPattern.exec(searchQuery)) !== null) {
      exactMatches.push(match[1]);
      // 抽出した部分をクエリから削除（後で通常検索用に使用）
      processedQuery = processedQuery.replace(match[0], '').trim();
    }
    
    // 残りのクエリから余分なスペースを削除
    processedQuery = processedQuery.replace(/\s+/g, ' ').trim();

    // クエリの構築
    const queryClauses: any[] = [];

    // 完全一致検索がある場合
    if (exactMatches.length > 0) {
      exactMatches.forEach((exactPhrase) => {
        // 完全一致検索: match_phraseでslop: 0を使用
        queryClauses.push({
          multi_match: {
            query: exactPhrase,
            fields: [
              'title^10',        // 完全一致は最高の重み
              'description^6',   // 説明文は6倍の重み
              'transcript_text^4', // 文字起こしは4倍の重み
            ],
            type: 'phrase',     // フレーズマッチ
            slop: 0,            // 完全一致（単語間の距離0）
          },
        });
      });
    }

    // 通常検索（完全一致以外の部分がある場合
    if (processedQuery && processedQuery.length > 0) {
      // スペースで区切られたキーワードを分割
      const keywords = processedQuery.split(/\s+/).filter(k => k.length > 0);
      
      if (keywords.length > 1) {
        // 複数のキーワードがある場合、各キーワードをAND条件で検索
        // 各キーワードが含まれる必要がある（must句）
        keywords.forEach((keyword) => {
          queryClauses.push({
            multi_match: {
              query: keyword,
              fields: [
                'title^3',
                'description^2',
                'transcript_text',
              ],
              type: 'best_fields',
              operator: 'or', // 各キーワードは複数フィールドのいずれかに含まれればOK
            },
          });
        });
      } else {
        // 単一キーワードの場合、従来のロジックを使用
        queryClauses.push(
          // フレーズマッチ: 検索語が完全に一致する場合を優先（高スコア）
          {
            multi_match: {
              query: processedQuery,
              fields: [
                'title^5',        // タイトルは5倍の重み（フレーズマッチ）
                'description^2',  // 説明文は2倍の重み
                'transcript_text^3', // 文字起こしは3倍の重み
              ],
              type: 'phrase',     // フレーズマッチ（単語の順序と近接性を考慮）
              slop: 0,            // 単語間の距離（0=完全一致）
            },
          },
          // 単語マッチ: 検索語の各単語が含まれる場合（中スコア）
          {
            multi_match: {
              query: processedQuery,
              fields: [
                'title^3',        // タイトルは3倍の重み
                'description^2',   // 説明文は2倍の重み
                'transcript_text', // 文字起こしは通常の重み
              ],
              type: 'best_fields',
              operator: 'and',    // すべての単語が含まれる必要がある
              minimum_should_match: '75%', // 75%以上の単語がマッチする必要がある
            },
          }
        );
      }
    }

    // 完全一致検索のみの場合、mustクエリとして扱う（必須）
    // 通常検索のみまたは混合の場合は、shouldクエリとして扱う
    const queryBody: any = {
      bool: {},
    };

    if (exactMatches.length > 0 && !processedQuery) {
      // 完全一致検索のみの場合
      queryBody.bool.must = exactMatches.map((exactPhrase) => ({
        multi_match: {
          query: exactPhrase,
          fields: [
            'title^10',
            'description^6',
            'transcript_text^4',
          ],
          type: 'phrase',
          slop: 0,
        },
      }));
    } else {
      // 通常検索または混合の場合
      const keywords = processedQuery ? processedQuery.split(/\s+/).filter(k => k.length > 0) : [];
      const hasMultipleKeywords = keywords.length > 1;
      
      if (hasMultipleKeywords) {
        // 複数キーワードの場合、must句でAND条件にする
        // 完全一致検索がある場合は、それもmust句に追加
        if (exactMatches.length > 0) {
          const exactMatchClauses = exactMatches.map((exactPhrase) => ({
            multi_match: {
              query: exactPhrase,
              fields: [
                'title^10',
                'description^6',
                'transcript_text^4',
              ],
              type: 'phrase',
              slop: 0,
            },
          }));
          queryBody.bool.must = [...exactMatchClauses, ...queryClauses];
        } else {
          queryBody.bool.must = queryClauses;
        }
      } else {
        // 単一キーワードの場合、should句を使用
        queryBody.bool.should = queryClauses;
        queryBody.bool.minimum_should_match = exactMatches.length > 0 ? exactMatches.length : 1;
      }
    }

    // 複数キーワードの場合は、各キーワードがハイライトされるようにフラグメント数を増やす
    // 完全一致検索と通常検索の両方を考慮
    const keywords = processedQuery ? processedQuery.split(/\s+/).filter(k => k.length > 0) : [];
    const allKeywords = [...exactMatches, ...keywords]; // 完全一致検索と通常検索のキーワードを結合
    const hasMultipleKeywords = allKeywords.length > 1;
    const numberOfFragments = hasMultipleKeywords ? Math.max(allKeywords.length, 3) : 1;

    // OpenSearchで全文検索を実行
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: queryBody,
        highlight: {
          fields: {
            title: {},
            description: {
              fragment_size: 200,
              number_of_fragments: hasMultipleKeywords ? Math.max(allKeywords.length, 2) : 1,
            },
            transcript_text: {
              fragment_size: 200,
              number_of_fragments: numberOfFragments,
            },
          },
        },
        sort: [
          { _score: { order: 'desc' } },
          { published_at: { order: 'desc' } },
        ],
        size: 50,
      },
    });

    // 検索結果を整形
    // OpenSearch 3.xでは、レスポンスが直接返される
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

    const responseData = { results, count: results.length };
    
    // 検索結果をキャッシュに保存
    setCachedResult(searchQuery, responseData);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE MISS] Query: ${searchQuery}, Results: ${results.length}`);
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
          details: 'ユーザー名とパスワードが正しいか確認してください。',
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
