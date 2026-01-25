import { Client, Connection } from '@opensearch-project/opensearch';

if (!process.env.OPENSEARCH_ENDPOINT) {
  console.warn('警告: OPENSEARCH_ENDPOINTが設定されていません。OpenSearch機能は使用できません。');
}

let client: Client | null = null;

// デバッグ: 環境変数の確認
if (process.env.NODE_ENV === 'development') {
  console.log('[lib/db/index.ts] 環境変数の確認:');
  console.log('- OPENSEARCH_ENDPOINT:', process.env.OPENSEARCH_ENDPOINT ? '設定済み' : '未設定');
  console.log('- OPENSEARCH_API_KEY:', process.env.OPENSEARCH_API_KEY ? '設定済み' : '未設定');
  console.log('- OPENSEARCH_USERNAME:', process.env.OPENSEARCH_USERNAME ? '設定済み' : '未設定');
  console.log('- OPENSEARCH_PASSWORD:', process.env.OPENSEARCH_PASSWORD ? '設定済み' : '未設定');
}

if (process.env.OPENSEARCH_ENDPOINT) {
  // エンドポイントURLの末尾のスラッシュを削除
  let endpoint = process.env.OPENSEARCH_ENDPOINT.trim();
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.slice(0, -1);
  }
  
  // API Key認証を優先（Elastic Cloud Serverless推奨）
  // AWS_REGIONが設定されていても、OPENSEARCH_API_KEYが設定されている場合はAPI Key認証を使用
  if (process.env.OPENSEARCH_API_KEY) {
    const apiKey = process.env.OPENSEARCH_API_KEY.trim();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('OpenSearch接続設定:');
      console.log('- エンドポイント:', endpoint);
      console.log('- 認証: API Key');
      console.log('- API Keyの長さ:', apiKey.length);
    }
    
    // Elastic Cloud ServerlessのAPI Keyは、Authorization: ApiKey ${API_KEY} ヘッダー形式で使用
    // @opensearch-project/opensearchクライアントは、auth.apiKey形式を直接サポートしていないため、
    // Connectionクラスをカスタマイズして、すべてのリクエストに認証ヘッダーを追加
    class ApiKeyConnection extends Connection {
      request(params: any, callback?: any) {
        // リクエストヘッダーに認証情報を追加
        if (!params.headers) {
          params.headers = {};
        }
        params.headers['Authorization'] = `ApiKey ${apiKey}`;
        return super.request(params, callback);
      }
    }
    
    client = new Client({
      node: endpoint,
      Connection: ApiKeyConnection,
    });
  } else if (process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD) {
      // 基本認証を使用する場合（開発環境など）
      const hasAuth = true;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenSearch接続設定:');
        console.log('- エンドポイント:', endpoint);
        console.log('- 認証: 基本認証（ユーザー名: ' + process.env.OPENSEARCH_USERNAME + '）');
      }
      
      client = new Client({
        node: endpoint,
        auth: {
          username: process.env.OPENSEARCH_USERNAME!,
          password: process.env.OPENSEARCH_PASSWORD!,
        },
      });
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenSearch接続設定:');
        console.log('- エンドポイント:', endpoint);
        console.log('- 認証: 認証なし');
      }
      
      client = new Client({
        node: endpoint,
      });
    }
    
    // AWS認証を使用する場合（AWS_REGIONが設定されていて、API Keyも基本認証も設定されていない場合）
    if (!client && process.env.AWS_REGION) {
      // AWS認証を使用する場合は、aws-sdkパッケージが必要です
      // 現在は基本認証を使用する想定のため、AWS認証の実装は後で追加可能
      console.warn('警告: AWS認証は現在サポートされていません。基本認証またはAPI Key認証を使用してください。');
      console.warn('AWS認証を使用する場合は、aws-sdkパッケージをインストールしてください: npm install aws-sdk');
      
      // 基本認証にフォールバック
      client = new Client({
        node: endpoint,
        auth: process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD
          ? {
              username: process.env.OPENSEARCH_USERNAME,
              password: process.env.OPENSEARCH_PASSWORD,
            }
          : undefined,
      });
    }
} else {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[lib/db/index.ts] OPENSEARCH_ENDPOINTが設定されていません。クライアントは初期化されません。');
  }
}

// デバッグ: クライアント初期化の確認
if (process.env.NODE_ENV === 'development') {
  console.log('[lib/db/index.ts] クライアント初期化状態:', client ? '初期化済み' : '未初期化');
}

export default client;

// インデックス名
export const INDEX_NAME = 'episodes';

// インデックスの初期化（存在しない場合は作成）
export async function initializeIndex(): Promise<void> {
  if (!client) {
    throw new Error('OpenSearchクライアントが設定されていません。');
  }

  // OpenSearch 3.xでは、exists()はbooleanまたはbodyプロパティを持つオブジェクトを返す
  const existsResponse = await client.indices.exists({ index: INDEX_NAME });
  const exists = typeof existsResponse === 'boolean' 
    ? existsResponse 
    : (existsResponse as any).body || (existsResponse as any);
  
  if (!exists) {
    // インデックスを作成（日本語全文検索用のマッピング設定）
    await client.indices.create({
      index: INDEX_NAME,
      body: {
        settings: {
          analysis: {
            analyzer: {
              japanese: {
                type: 'custom',
                tokenizer: 'kuromoji_tokenizer',
                char_filter: ['icu_normalizer'],
                filter: [
                  'kuromoji_baseform',
                  'kuromoji_part_of_speech',
                  'kuromoji_stemmer',
                  'ja_stop',
                  'kuromoji_number',
                  'lowercase',
                ],
              },
            },
          },
        },
        mappings: {
          properties: {
            episode_id: { type: 'keyword' },
            title: {
              type: 'text',
              analyzer: 'japanese',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            description: {
              type: 'text',
              analyzer: 'japanese',
            },
            published_at: { type: 'date' },
            listen_url: { type: 'keyword' },
            transcript_url: { type: 'keyword' },
            spotify_url: { type: 'keyword' },
            transcript_text: {
              type: 'text',
              analyzer: 'japanese',
            },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
          },
        },
      },
    });
  }
}
