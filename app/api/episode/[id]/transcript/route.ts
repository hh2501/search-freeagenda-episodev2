import { NextRequest, NextResponse } from 'next/server';
import client from '@/lib/db/index';
import { saveTranscript } from '@/lib/db/episodes';
import { updateChecklistChecked } from '@/lib/transcript-checklist/github-sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PUT: エピソードの文字起こしを更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: episodeId } = await params;

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
    const { transcriptText, title } = body;

    if (!transcriptText || typeof transcriptText !== 'string') {
      return NextResponse.json(
        { error: '文字起こしテキストが必要です' },
        { status: 400 }
      );
    }

    // 文字起こしを保存
    await saveTranscript(episodeId, transcriptText);

    // チェックリストを GitHub で checked に更新（失敗しても保存は成功のまま）
    const titleStr = typeof title === 'string' ? title : '';
    const checklistUpdated = await updateChecklistChecked(episodeId, titleStr);

    return NextResponse.json({
      success: true,
      message: '文字起こしを更新しました',
      checklistUpdated,
    });
  } catch (error: unknown) {
    console.error('文字起こし更新エラー:', error);
    const details =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : undefined;
    return NextResponse.json(
      { error: '文字起こしの更新に失敗しました', details },
      { status: 500 }
    );
  }
}
