import { NextRequest, NextResponse } from "next/server";
import client, { INDEX_NAME } from "@/lib/db/index";

export const dynamic = "force-dynamic";

const PREVIEW_CHARS = 4000;
const PREVIEW_LINES = 60;

/**
 * VTTの実際のフォーマットを確認するためのデバッグAPI（開発時のみ）
 * GET /api/debug/vtt-sample?episodeId=xxx
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "このAPIは開発環境でのみ利用できます。" },
      { status: 404 },
    );
  }

  const episodeId = request.nextUrl.searchParams.get("episodeId");
  if (!episodeId) {
    return NextResponse.json(
      { error: "クエリパラメータ episodeId を指定してください。" },
      { status: 400 },
    );
  }

  if (!client) {
    return NextResponse.json(
      { error: "OpenSearchが設定されていません。" },
      { status: 503 },
    );
  }

  try {
    const getResponse = await client.search({
      index: INDEX_NAME,
      body: {
        query: { term: { episode_id: episodeId } },
        size: 1,
        _source: ["episode_id", "title", "listen_url"],
      },
    });

    const hits =
      (getResponse as any).hits?.hits ||
      (getResponse as any).body?.hits?.hits ||
      [];
    if (hits.length === 0) {
      return NextResponse.json(
        { error: "エピソードが見つかりませんでした。" },
        { status: 404 },
      );
    }

    const source = hits[0]._source;
    const listenUrl = source?.listen_url;
    if (!listenUrl) {
      return NextResponse.json(
        { error: "このエピソードに listen_url がありません。" },
        { status: 400 },
      );
    }

    const vttUrl = `${listenUrl}/transcript.vtt`;
    const vttResponse = await fetch(vttUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!vttResponse.ok) {
      return NextResponse.json(
        {
          error: "VTTの取得に失敗しました。",
          vttUrl,
          status: vttResponse.status,
          statusText: vttResponse.statusText,
        },
        { status: 502 },
      );
    }

    const vttText = await vttResponse.text();
    const lines = vttText.split(/\r?\n/);
    const firstLines = lines.slice(0, PREVIEW_LINES);
    const vttPreview = vttText.substring(0, PREVIEW_CHARS);

    return NextResponse.json({
      ok: true,
      episodeId: source.episode_id,
      title: source.title,
      listenUrl,
      vttUrl,
      totalLength: vttText.length,
      totalLines: lines.length,
      firstLines,
      vttPreview,
      note: "firstLines: 先頭のタイムスタンプ行とテキスト行。vttPreview: 先頭の文字列（フォーマット確認用）。",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "VTTの取得中にエラーが発生しました。", details: message },
      { status: 500 },
    );
  }
}
