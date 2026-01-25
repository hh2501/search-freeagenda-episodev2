import { NextResponse } from 'next/server';
import client from '@/lib/db/index';

// APIルートを動的として明示的に設定（静的生成を無効化）
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 環境変数の確認
    const endpoint = process.env.OPENSEARCH_ENDPOINT;
    const apiKey = process.env.OPENSEARCH_API_KEY;
    const username = process.env.OPENSEARCH_USERNAME;
    const password = process.env.OPENSEARCH_PASSWORD;
    
    if (!endpoint) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OPENSEARCH_ENDPOINTが設定されていません。.env.localファイルを確認してください。',
          envCheck: {
            endpoint: !!endpoint,
            apiKey: !!apiKey,
            username: !!username,
            password: !!password,
          }
        },
        { status: 500 }
      );
    }
    
    if (!apiKey && (!username || !password)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '認証情報が設定されていません。OPENSEARCH_API_KEY、またはOPENSEARCH_USERNAMEとOPENSEARCH_PASSWORDを設定してください。',
          envCheck: {
            endpoint: !!endpoint,
            apiKey: !!apiKey,
            username: !!username,
            password: !!password,
          },
          guide: '詳細は markdownfiles/ELASTIC_API_KEY_GUIDE.md を参照してください'
        },
        { status: 500 }
      );
    }
    
    if (!client) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenSearchクライアントが設定されていません。環境変数を確認してください。',
          envCheck: {
            endpoint: !!endpoint,
            apiKey: !!apiKey,
            username: !!username,
            password: !!password,
          }
        },
        { status: 500 }
      );
    }

    // デバッグ: 環境変数の確認（本番環境でも表示）
    const envCheck = {
      endpoint: !!process.env.OPENSEARCH_ENDPOINT,
      apiKey: !!process.env.OPENSEARCH_API_KEY,
      apiKeyLength: process.env.OPENSEARCH_API_KEY?.length || 0,
      username: !!process.env.OPENSEARCH_USERNAME,
      password: !!process.env.OPENSEARCH_PASSWORD,
    };

    // 1. クラスター情報の取得
    const clusterInfo = await client.info();
    
    // 2. インデックス一覧の取得
    const indices = await client.cat.indices({ format: 'json' });
    
    // 3. episodesインデックスの存在確認
    const indexName = 'episodes';
    const indexExists = await client.indices.exists({ index: indexName });

    return NextResponse.json({
      success: true,
      cluster: {
        name: clusterInfo.body.cluster_name,
        version: clusterInfo.body.version.number,
      },
      indices: {
        count: indices.body.length,
        list: indices.body.map((index: any) => ({
          name: index.index,
          docsCount: index['docs.count'],
        })),
      },
      episodesIndex: {
        exists: indexExists.body,
      },
      envCheck,
      message: '接続テストが成功しました！',
    });
  } catch (error: any) {
    console.error('接続テストエラー:', error);
    
    // デバッグ: 環境変数の確認（本番環境でも表示）
    const envCheck = {
      endpoint: !!process.env.OPENSEARCH_ENDPOINT,
      apiKey: !!process.env.OPENSEARCH_API_KEY,
      apiKeyLength: process.env.OPENSEARCH_API_KEY?.length || 0,
      username: !!process.env.OPENSEARCH_USERNAME,
      password: !!process.env.OPENSEARCH_PASSWORD,
    };
    
    // 認証エラーの場合、より詳細な情報を提供
    const isAuthError = error.meta?.statusCode === 401 || error.message?.includes('authentication') || error.message?.includes('missing authentication');
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || '接続に失敗しました',
        details: error.meta
          ? {
              statusCode: error.meta.statusCode,
              reason: error.meta.body?.error?.reason,
            }
          : undefined,
        envCheck,
        troubleshooting: isAuthError
          ? {
              message: '認証エラーが発生しました。以下の点を確認してください：',
              steps: [
                '1. Vercelダッシュボードで環境変数を確認',
                '2. OPENSEARCH_ENDPOINTが正しく設定されているか',
                '3. OPENSEARCH_API_KEYが正しく設定されているか（API Keyのみを設定、ApiKeyプレフィックスは不要）',
                '4. 環境変数の値に余分なスペースや改行がないか',
                '5. 環境変数を設定後、デプロイを再実行',
                '6. Elastic CloudコンソールでAPI Keyが有効か確認',
              ],
              guide: '詳細は markdownfiles/VERCEL_ENV_VAR_SETUP.md を参照してください',
            }
          : undefined,
      },
      { status: 500 }
    );
  }
}
