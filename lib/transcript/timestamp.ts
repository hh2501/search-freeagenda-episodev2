// 文字起こしのタイムスタンプ処理ユーティリティ

export interface TimestampSegment {
  startTime: number; // 秒単位
  endTime: number; // 秒単位
  text: string;
}

/**
 * VTT形式のテキストをパースして、タイムスタンプとテキストのセグメントを取得
 */
/**
 * タイムスタンプ文字列を秒数に変換
 * 対応形式:
 * - 00:01:23.456 (時:分:秒.ミリ秒)
 * - 00:01:23 (時:分:秒)
 * - 01:23.456 (分:秒.ミリ秒)
 * - 01:23 (分:秒)
 */
function parseTimestamp(timestampStr: string): number {
  // 時:分:秒.ミリ秒 形式 (00:01:23.456)
  let match = timestampStr.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4], 10);
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  // 時:分:秒 形式 (00:01:23)
  match = timestampStr.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // 分:秒.ミリ秒 形式 (01:23.456)
  match = timestampStr.match(/(\d{2}):(\d{2})\.(\d{3})/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const milliseconds = parseInt(match[3], 10);
    return minutes * 60 + seconds + milliseconds / 1000;
  }

  // 分:秒 形式 (01:23)
  match = timestampStr.match(/(\d{2}):(\d{2})/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }

  return 0;
}

export function parseVTTWithTimestamps(vttText: string): TimestampSegment[] {
  const segments: TimestampSegment[] = [];
  const lines = vttText.split("\n");

  let currentStartTime: number | null = null;
  let currentEndTime: number | null = null;
  let currentText: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行やメタデータをスキップ
    if (
      line.startsWith("WEBVTT") ||
      line.startsWith("NOTE") ||
      line.trim() === "" ||
      /^\d+$/.test(line) // シーケンス番号
    ) {
      continue;
    }

    // タイムスタンプ行を検出（複数の形式に対応）
    // 例: "00:01:23.456 --> 00:01:25.789" または "00:01:23 --> 00:01:25" など
    const timestampMatch = line.match(
      /(\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\s*-->\s*(\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?)/,
    );
    if (timestampMatch) {
      // 前のセグメントを保存
      if (
        currentStartTime !== null &&
        currentEndTime !== null &&
        currentText.length > 0
      ) {
        segments.push({
          startTime: currentStartTime,
          endTime: currentEndTime,
          text: currentText.join(" ").trim(),
        });
      }

      // 新しいタイムスタンプを解析
      currentStartTime = parseTimestamp(timestampMatch[1]);
      currentEndTime = parseTimestamp(timestampMatch[2]);
      currentText = [];
      continue;
    }

    // テキスト行を追加
    if (currentStartTime !== null && line) {
      currentText.push(line);
    }
  }

  // 最後のセグメントを保存
  if (
    currentStartTime !== null &&
    currentEndTime !== null &&
    currentText.length > 0
  ) {
    segments.push({
      startTime: currentStartTime,
      endTime: currentEndTime,
      text: currentText.join(" ").trim(),
    });
  }

  return segments;
}

/**
 * テキストが文字起こしのどのセグメントに該当するかを特定し、タイムスタンプを返す
 * 同じフラグメントが複数セグメントでマッチする場合は、startTime が最も遅いセグメントを返す
 * （検索ハイライトは通常、該当箇所の後半側を指すため、17:43 ではなく 1:43 が選ばれる問題を防ぐ）
 */
export function findTimestampForText(
  searchText: string,
  segments: TimestampSegment[],
): { startTime: number; endTime: number } | null {
  // ハイライトタグを削除
  const cleanSearchText = searchText
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "$1")
    .trim();

  if (!cleanSearchText) {
    return null;
  }

  // フラグメントが長すぎる場合、最初の50文字を抽出して検索
  const searchTextShort =
    cleanSearchText.length > 50
      ? cleanSearchText.substring(0, 50)
      : cleanSearchText;

  // セグメントのテキストを事前にクリーンアップしてキャッシュ
  const cleanSegmentTexts = segments.map((seg) => ({
    ...seg,
    cleanText: seg.text.replace(/<em[^>]*>(.*?)<\/em>/gi, "$1"),
  }));

  // マッチしたセグメントをすべて収集し、startTime が最大のものを返す（本来の該当箇所を優先）
  let bestMatch: { startTime: number; endTime: number } | null = null;

  for (const segment of cleanSegmentTexts) {
    const isFullMatch =
      segment.cleanText.includes(cleanSearchText) ||
      cleanSearchText.includes(segment.cleanText);
    const isShortMatch =
      segment.cleanText.includes(searchTextShort) ||
      searchTextShort.includes(segment.cleanText);

    if (isFullMatch || isShortMatch) {
      if (!bestMatch || segment.startTime > bestMatch.startTime) {
        bestMatch = {
          startTime: segment.startTime,
          endTime: segment.endTime,
        };
      }
    }
  }
  if (bestMatch) return bestMatch;

  // 完全一致が見つからない場合、部分一致で検索（キーワードベース）
  const searchWords = cleanSearchText.split(/\s+/).filter((w) => w.length > 0);
  if (searchWords.length > 0) {
    const keyWords = searchWords.slice(0, Math.min(3, searchWords.length));

    for (const segment of cleanSegmentTexts) {
      const matchedWords = keyWords.filter((word) =>
        segment.cleanText.includes(word),
      );
      if (matchedWords.length / keyWords.length >= 0.5) {
        if (!bestMatch || segment.startTime > bestMatch.startTime) {
          bestMatch = {
            startTime: segment.startTime,
            endTime: segment.endTime,
          };
        }
      }
    }
  }
  if (bestMatch) return bestMatch;

  // それでも見つからない場合、最初の10文字で検索
  if (cleanSearchText.length >= 10) {
    const firstChars = cleanSearchText.substring(0, 10);
    for (const segment of cleanSegmentTexts) {
      if (segment.cleanText.includes(firstChars)) {
        if (!bestMatch || segment.startTime > bestMatch.startTime) {
          bestMatch = {
            startTime: segment.startTime,
            endTime: segment.endTime,
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * 秒数を「分:秒」形式に変換（分は2桁ゼロパディングで 01:43 / 17:43 のように表示）
 */
export function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 秒数を「時:分:秒」形式に変換
 */
export function formatTimestampLong(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
