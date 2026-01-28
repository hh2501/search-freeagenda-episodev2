import { NextRequest, NextResponse } from 'next/server';

// APIルートを動的として明示的に設定（静的生成を無効化）
export const dynamic = 'force-dynamic';

/**
 * POST: パスワード認証
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'パスワードが必要です', authenticated: false },
        { status: 400 }
      );
    }

    // 環境変数からパスワードを取得
    const correctPassword = process.env.TRANSCRIPT_EDIT_PASSWORD;

    if (!correctPassword) {
      console.error('TRANSCRIPT_EDIT_PASSWORD環境変数が設定されていません');
      return NextResponse.json(
        { error: '認証設定が完了していません', authenticated: false },
        { status: 500 }
      );
    }

    // パスワードを比較
    if (password === correctPassword) {
      return NextResponse.json({
        authenticated: true,
        message: '認証成功',
      });
    } else {
      return NextResponse.json(
        { error: 'パスワードが正しくありません', authenticated: false },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('認証エラー:', error);
    return NextResponse.json(
      { error: '認証に失敗しました', authenticated: false },
      { status: 500 }
    );
  }
}
