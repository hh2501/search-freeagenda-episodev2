import { NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    if (!client) {
      return NextResponse.json({
        status: 'error',
        message: 'OpenSearchクライアントが設定されていません',
        details: '.env.localファイルにOPENSEARCH_ENDPOINTを設定してください',
      }, { status: 503 });
    }

    // インデックスの存在確認
    let indexExists = false;
    let documentCount = 0;
    let hasTranscripts = 0;

    try {
      const existsResponse = await client.indices.exists({ index: INDEX_NAME });
      // OpenSearch 3.xでは、exists()はbooleanまたはレスポンスオブジェクトを返す可能性がある
      if (typeof existsResponse === 'boolean') {
        indexExists = existsResponse;
      } else {
        // レスポンスオブジェクトの場合、bodyプロパティまたはstatusCodeをチェック
        const response = existsResponse as any;
        indexExists = response.body === true || response.statusCode === 200;
      }
      
      if (indexExists) {
        // ドキュメント数を取得
        const countResponse = await client.count({ index: INDEX_NAME });
        documentCount = (countResponse as any).count || (countResponse as any).body?.count || 0;

        // 文字起こしテキストが含まれているドキュメント数を取得
        const searchResponse = await client.search({
          index: INDEX_NAME,
          body: {
            query: {
              exists: {
                field: 'transcript_text',
              },
            },
            size: 0,
          },
        });
        
        const totalHits = (searchResponse as any).hits?.total || (searchResponse as any).body?.hits?.total;
        hasTranscripts = typeof totalHits === 'number' ? totalHits : totalHits?.value || 0;
      }
    } catch (error: any) {
      // 404エラー（インデックスが存在しない）は正常な状態として扱う
      const statusCode = error.meta?.statusCode || error.statusCode || 500;
      const errorMessage = error.message || 'Unknown error';
      
      if (statusCode === 404 || errorMessage.includes('index_not_found') || errorMessage.includes('no such index')) {
        // インデックスが存在しない場合は正常な状態として扱う
        indexExists = false;
        documentCount = 0;
        hasTranscripts = 0;
      } else {
        // その他のエラー（403, 401など）は外側のcatchブロックで処理
        throw error;
      }
    }

    return NextResponse.json({
      status: 'ok',
      opensearch: {
        endpoint: process.env.OPENSEARCH_ENDPOINT ? '設定済み' : '未設定',
        authentication: process.env.OPENSEARCH_USERNAME ? '基本認証' : process.env.AWS_REGION ? 'AWS認証' : '認証なし',
        indexExists,
        documentCount,
        hasTranscripts,
        indexName: INDEX_NAME,
      },
      recommendations: !indexExists ? [
        'インデックスが存在しません。データ同期を実行してください: http://localhost:3000/api/sync',
      ] : documentCount === 0 ? [
        'インデックスは存在しますが、ドキュメントがありません。データ同期を実行してください: http://localhost:3000/api/sync',
      ] : hasTranscripts === 0 ? [
        'エピソード情報はありますが、文字起こしテキストがありません。データ同期を再実行してください: http://localhost:3000/api/sync',
      ] : [],
    });
  } catch (error: any) {
    console.error('ステータス確認エラー:', error);
    
    // エラーの詳細を取得
    const statusCode = error.meta?.statusCode || error.statusCode || 500;
    const errorMessage = error.message || 'Unknown error';
    
    // 403エラーの場合
    if (statusCode === 403 || errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return NextResponse.json({
        status: 'error',
        message: 'OpenSearchへのアクセスが拒否されました（403 Forbidden）',
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
        errorDetails: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          message: error.message,
          statusCode,
          meta: error.meta,
          endpoint: process.env.OPENSEARCH_ENDPOINT ? '設定済み' : '未設定',
          hasUsername: !!process.env.OPENSEARCH_USERNAME,
          hasPassword: !!process.env.OPENSEARCH_PASSWORD,
        } : undefined,
      }, { status: 403 });
    }
    
    // 401エラーの場合
    if (statusCode === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json({
        status: 'error',
        message: 'OpenSearchへの認証に失敗しました（401 Unauthorized）',
        details: 'ユーザー名とパスワードが正しいか確認してください。',
        errorDetails: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          message: error.message,
          statusCode,
          meta: error.meta,
          hasUsername: !!process.env.OPENSEARCH_USERNAME,
          hasPassword: !!process.env.OPENSEARCH_PASSWORD,
        } : undefined,
      }, { status: 401 });
    }
    
    // その他のエラー
    return NextResponse.json({
      status: 'error',
      message: 'ステータス確認中にエラーが発生しました',
      details: errorMessage,
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        statusCode,
        meta: error.meta,
      } : undefined,
    }, { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 });
  }
}
