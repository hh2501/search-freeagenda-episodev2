import { NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';

/**
 * GET: 全エピソード数を取得
 */
export async function GET() {
  if (!client) {
    return NextResponse.json(
      { error: 'OpenSearchが設定されていません。' },
      { status: 503 }
    );
  }

  try {
    const response = await client.count({
      index: INDEX_NAME,
      body: {
        query: { match_all: {} },
      },
    });

    const count = (response as any).count || (response as any).body?.count || 0;

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('エピソード数取得エラー:', error);
    return NextResponse.json(
      { error: 'エピソード数の取得に失敗しました。' },
      { status: 500 }
    );
  }
}
