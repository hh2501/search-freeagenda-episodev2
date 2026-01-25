// Elastic Cloud Serverless接続テストスクリプト
import { Client } from '@opensearch-project/opensearch';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const endpoint = process.env.OPENSEARCH_ENDPOINT;
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

console.log('=== Elastic Cloud Serverless 接続テスト ===\n');

// 環境変数の確認
if (!endpoint) {
  console.error('❌ エラー: OPENSEARCH_ENDPOINTが設定されていません');
  console.log('\n.env.localファイルに以下を設定してください:');
  console.log('OPENSEARCH_ENDPOINT=https://your-deployment.es.region.cloud.es.io:443');
  process.exit(1);
}

if (!username || !password) {
  console.error('❌ エラー: OPENSEARCH_USERNAMEまたはOPENSEARCH_PASSWORDが設定されていません');
  console.log('\n.env.localファイルに以下を設定してください:');
  console.log('OPENSEARCH_USERNAME=elastic');
  console.log('OPENSEARCH_PASSWORD=your-password');
  process.exit(1);
}

console.log('✓ 環境変数の確認完了');
console.log(`  - エンドポイント: ${endpoint}`);
console.log(`  - ユーザー名: ${username}`);
console.log(`  - パスワード: ${password ? '***' : '未設定'}\n`);

// エンドポイントURLの末尾のスラッシュを削除
let cleanEndpoint = endpoint.trim();
if (cleanEndpoint.endsWith('/')) {
  cleanEndpoint = cleanEndpoint.slice(0, -1);
}

// クライアントの作成
const client = new Client({
  node: cleanEndpoint,
  auth: {
    username: username!,
    password: password!,
  },
});

// 接続テスト
async function testConnection() {
  try {
    console.log('接続テストを実行中...\n');
    
    // 1. クラスター情報の取得
    console.log('1. クラスター情報の取得...');
    const clusterInfo = await client.info();
    console.log('✓ 接続成功！');
    console.log(`   - クラスター名: ${clusterInfo.body.cluster_name}`);
    console.log(`   - バージョン: ${clusterInfo.body.version.number}\n`);
    
    // 2. インデックス一覧の取得
    console.log('2. インデックス一覧の取得...');
    const indices = await client.cat.indices({ format: 'json' });
    console.log(`✓ インデックス数: ${indices.body.length}`);
    if (indices.body.length > 0) {
      console.log('   インデックス一覧:');
      indices.body.forEach((index: any) => {
        console.log(`   - ${index.index} (ドキュメント数: ${index['docs.count']})`);
      });
    } else {
      console.log('   （インデックスはまだ作成されていません）');
    }
    console.log('');
    
    // 3. インデックス作成テスト（episodesインデックスが存在しない場合）
    console.log('3. インデックス作成テスト...');
    const indexName = 'episodes';
    const indexExists = await client.indices.exists({ index: indexName });
    
    if (!indexExists.body) {
      console.log(`   ${indexName}インデックスが存在しないため、作成を試みます...`);
      
      // シンプルなインデックス設定で作成テスト
      await client.indices.create({
        index: indexName,
        body: {
          settings: {
            analysis: {
              analyzer: {
                japanese: {
                  type: 'custom',
                  tokenizer: 'standard',
                  char_filter: ['icu_normalizer'],
                  filter: ['lowercase', 'cjk_width'],
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
      console.log(`✓ ${indexName}インデックスを作成しました`);
    } else {
      console.log(`✓ ${indexName}インデックスは既に存在します`);
    }
    
    console.log('\n=== 接続テスト完了 ===');
    console.log('✅ すべてのテストが成功しました！');
    console.log('\n次のステップ:');
    console.log('1. データ同期を実行: http://localhost:3000/api/sync');
    console.log('2. 検索機能をテスト: http://localhost:3000');
    
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:');
    if (error.meta) {
      console.error(`   ステータス: ${error.meta.statusCode}`);
      console.error(`   メッセージ: ${error.meta.body?.error?.reason || error.message}`);
    } else {
      console.error(`   メッセージ: ${error.message}`);
    }
    
    console.log('\nトラブルシューティング:');
    console.log('1. エンドポイントURLが正しいか確認');
    console.log('2. ユーザー名とパスワードが正しいか確認');
    console.log('3. ネットワーク接続を確認');
    console.log('4. Elastic Cloudコンソールでデプロイメントの状態を確認');
    
    process.exit(1);
  }
}

testConnection();
