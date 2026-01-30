import { NextRequest, NextResponse } from 'next/server';
import client, { INDEX_NAME } from '@/lib/db/index';
import { saveTranscript } from '@/lib/db/episodes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PUT: エピソードの文字起こしを更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const episodeId = params.id;

  if (!episodeId) {
    return NextResponse.json({ error: 'エピソードIDが必要です' }, { status: 400 });
  }

  // パスワード認証
  const authHeader = request.headers.get('authorization');
  const correctPassword = process.env.TRANSCRIPT_EDIT_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json(
      { error: '認証設定が完了していません' },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${correctPassword}`) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }

  // OpenSearchクライアントの確認
  if (!client) {
    return NextResponse.json(
      { error: 'OpenSearchが設定されていません。' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { transcriptText } = body;

    if (!transcriptText || typeof transcriptText !== 'string') {
      return NextResponse.json(
        { error: '文字起こしテキストが必要です' },
        { status: 400 }
      );
    }

    // 文字起こしを保存
    await saveTranscript(episodeId, transcriptText);

    return NextResponse.json({
      success: true,
      message: '文字起こしを更新しました',
    });
  } catch (error: any) {
    console.error('文字起こし更新エラー:', error);
    return NextResponse.json(
      { error: '文字起こしの更新に失敗しました', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
