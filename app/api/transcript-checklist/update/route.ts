import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * POST: チェックリストJSONファイルを更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { episodes, lastUpdated } = body;

    if (!Array.isArray(episodes)) {
      return NextResponse.json(
        { error: 'episodesは配列である必要があります。' },
        { status: 400 }
      );
    }

    // publicディレクトリのtranscript-checklist.jsonを更新
    const filePath = path.join(process.cwd(), 'public', 'transcript-checklist.json');
    const data = {
      episodes: episodes,
      lastUpdated: lastUpdated || new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('チェックリスト更新エラー:', error);
    return NextResponse.json(
      { error: 'チェックリストの更新に失敗しました。' },
      { status: 500 }
    );
  }
}
