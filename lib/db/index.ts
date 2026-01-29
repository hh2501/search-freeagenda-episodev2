import { Client, Connection } from "@opensearch-project/opensearch";

if (!process.env.OPENSEARCH_ENDPOINT) {
  console.warn(
    "警告: OPENSEARCH_ENDPOINTが設定されていません。OpenSearch機能は使用できません。",
  );
}

let client: Client | null = null;

if (process.env.OPENSEARCH_ENDPOINT) {
  // エンドポイントURLの末尾のスラッシュを削除
  let endpoint = process.env.OPENSEARCH_ENDPOINT.trim();
  if (endpoint.endsWith("/")) {
    endpoint = endpoint.slice(0, -1);
  }

  // API Key認証を優先（Elastic Cloud Serverless推奨）
  // AWS_REGIONが設定されていても、OPENSEARCH_API_KEYが設定されている場合はAPI Key認証を使用
  if (process.env.OPENSEARCH_API_KEY) {
    const apiKey = process.env.OPENSEARCH_API_KEY.trim();

    // Elastic Cloud ServerlessのAPI Keyは、Authorization: ApiKey ${API_KEY} ヘッダー形式で使用
    // @opensearch-project/opensearchクライアントは、auth.apiKey形式を直接サポートしていないため、
    // Connectionクラスをカスタマイズして、すべてのリクエストに認証ヘッダーを追加
    class ApiKeyConnection extends Connection {
      request(params: any, callback?: any) {
        // リクエストヘッダーに認証情報を追加
        if (!params.headers) {
          params.headers = {};
        }
        params.headers["Authorization"] = `ApiKey ${apiKey}`;
        return super.request(params, callback);
      }
    }

    client = new Client({
      node: endpoint,
      Connection: ApiKeyConnection,
    });
  } else if (
    process.env.OPENSEARCH_USERNAME &&
    process.env.OPENSEARCH_PASSWORD
  ) {
    // 基本認証を使用する場合（開発環境など）
    client = new Client({
      node: endpoint,
      auth: {
        username: process.env.OPENSEARCH_USERNAME!,
        password: process.env.OPENSEARCH_PASSWORD!,
      },
    });
  } else {
    client = new Client({
      node: endpoint,
    });
  }

  // AWS認証を使用する場合（AWS_REGIONが設定されていて、API Keyも基本認証も設定されていない場合）
  if (!client && process.env.AWS_REGION) {
    // AWS認証を使用する場合は、aws-sdkパッケージが必要です
    // 現在は基本認証を使用する想定のため、AWS認証の実装は後で追加可能
    console.warn(
      "警告: AWS認証は現在サポートされていません。基本認証またはAPI Key認証を使用してください。",
    );
    console.warn(
      "AWS認証を使用する場合は、aws-sdkパッケージをインストールしてください: npm install aws-sdk",
    );

    // 基本認証にフォールバック
    client = new Client({
      node: endpoint,
      auth:
        process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD
          ? {
              username: process.env.OPENSEARCH_USERNAME,
              password: process.env.OPENSEARCH_PASSWORD,
            }
          : undefined,
    });
  }
}

export default client;

// インデックス名
export const INDEX_NAME = "episodes";

// インデックス存在チェックのキャッシュ（メモリ内）
// 注意: サーバーレス環境ではインスタンスが再利用される場合のみ有効
let indexExistsCache: boolean | null = null;
let indexCheckPromise: Promise<boolean> | null = null;

/**
 * インデックスの存在をチェック（キャッシュ付き）
 */
async function checkIndexExists(): Promise<boolean> {
  if (!client) {
    throw new Error("OpenSearchクライアントが設定されていません。");
  }

  // キャッシュがある場合は即座に返す
  if (indexExistsCache !== null) {
    return indexExistsCache;
  }

  // 既にチェック中の場合は、そのPromiseを返す（重複チェックを防ぐ）
  if (indexCheckPromise) {
    return indexCheckPromise;
  }

  // インデックス存在チェックを実行
  indexCheckPromise = (async () => {
    try {
      const existsResponse = await client!.indices.exists({
        index: INDEX_NAME,
      });
      const exists =
        typeof existsResponse === "boolean"
          ? existsResponse
          : (existsResponse as any).body || (existsResponse as any);

      indexExistsCache = exists;
      return exists;
    } finally {
      indexCheckPromise = null;
    }
  })();

  return indexCheckPromise;
}

// インデックスの初期化（存在しない場合は作成）
export async function initializeIndex(): Promise<void> {
  if (!client) {
    throw new Error("OpenSearchクライアントが設定されていません。");
  }

  // キャッシュされた存在チェック結果を使用
  const exists = await checkIndexExists();

  if (!exists) {
    // インデックスを作成（日本語全文検索用のマッピング設定 - パフォーマンス最適化版）
    await client.indices.create({
      index: INDEX_NAME,
      body: {
        settings: {
          // パフォーマンス最適化: リフレッシュ間隔を長く設定（書き込み頻度が低い場合）
          refresh_interval: "30s",
          // パフォーマンス最適化: レプリカ数を0に設定（開発環境、または単一ノードの場合）
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              japanese: {
                type: "custom",
                tokenizer: "kuromoji_tokenizer",
                char_filter: ["icu_normalizer"],
                filter: [
                  "kuromoji_baseform",
                  // パフォーマンス最適化: part_of_speechとstemmerを削除（検索速度優先）
                  // 検索精度は若干下がるが、パフォーマンスが向上
                  "ja_stop",
                  "kuromoji_number",
                  "lowercase",
                ],
              },
            },
          },
        },
        mappings: {
          properties: {
            episode_id: { type: "keyword" },
            title: {
              type: "text",
              analyzer: "japanese",
              // パフォーマンス最適化: normsを無効化（メモリ使用量削減）
              norms: false,
              fields: {
                keyword: { type: "keyword" },
              },
            },
            description: {
              type: "text",
              analyzer: "japanese",
              // パフォーマンス最適化: normsを無効化
              norms: false,
            },
            published_at: { type: "date" },
            listen_url: { type: "keyword" },
            transcript_url: { type: "keyword" },
            spotify_url: { type: "keyword" },
            transcript_text: {
              type: "text",
              analyzer: "japanese",
              // パフォーマンス最適化: 大きなテキストフィールドの最適化
              norms: false,
              // パフォーマンス最適化: インデックスオプションを調整（位置情報を削減）
              index_options: "positions", // 'offsets'から'positions'に変更（ハイライトには十分）
            },
            created_at: { type: "date" },
            updated_at: { type: "date" },
            checked: { type: "boolean" },
            checked_at: { type: "date" },
          },
        },
      },
    });

    // インデックス作成後、キャッシュを更新
    indexExistsCache = true;
  }
}
