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
 * - 01:23.456 (分:秒.ミリ秒) … listen.style の VTT はこの形式（時なし）
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
    // listen.style: "00:00.000 --> 00:06.520" (MM:SS.mmm)、他 "00:01:23.456 --> ..." (HH:MM:SS.mmm) など
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

export interface FindTimestampOptions {
  /** 検索ハイライトのフラグメント順序（0始まり）。指定時はフラグメント順とセグメント順の対応で最適なセグメントを選ぶ */
  fragmentIndex?: number;
  /** フラグメント総数。fragmentIndex とともに指定する */
  totalFragments?: number;
}

/** 連続する空白を1つにし、前後トリム（検索用正規化） */
function normalizeForSearch(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * VTTセグメントを連結した文字列上でフラグメントの出現位置を探し、
 * その位置が含まれるセグメントの startTime/endTime を返す（正確な秒数）。
 * 見つからなければ null。
 */
function findSegmentByPosition(
  searchText: string,
  segments: TimestampSegment[],
  options?: FindTimestampOptions,
): { startTime: number; endTime: number } | null {
  const clean = searchText.replace(/<em[^>]*>(.*?)<\/em>/gi, "$1").trim();
  if (!clean || segments.length === 0) return null;

  // セグメント順に連結し、各セグメントの開始オフセットを記録（区切りは改行）
  let offset = 0;
  const ranges: {
    start: number;
    end: number;
    startTime: number;
    endTime: number;
  }[] = [];
  for (const seg of segments) {
    const text = seg.text.replace(/<em[^>]*>(.*?)<\/em>/gi, "$1");
    ranges.push({
      start: offset,
      end: offset + text.length,
      startTime: seg.startTime,
      endTime: seg.endTime,
    });
    offset += text.length + 1; // +1 for newline
  }
  const concatenated = segments
    .map((seg) => seg.text.replace(/<em[^>]*>(.*?)<\/em>/gi, "$1"))
    .join("\n");

  const toTry = [
    clean,
    normalizeForSearch(clean),
    clean.length > 50 ? clean.substring(0, 50) : clean,
    clean.length > 20 ? clean.substring(0, 20) : clean,
  ].filter((s) => s.length >= 5);

  const foundPositions: number[] = [];
  for (const needle of toTry) {
    let pos = 0;
    while (pos < concatenated.length) {
      const i = concatenated.indexOf(needle, pos);
      if (i === -1) break;
      foundPositions.push(i);
      pos = i + 1;
    }
    if (foundPositions.length > 0) break;
  }

  if (foundPositions.length === 0) return null;

  const segmentForPosition = (p: number) => {
    for (const r of ranges) {
      if (p >= r.start && p < r.end) return r;
      if (p >= r.start && p === r.end && r === ranges[ranges.length - 1])
        return r;
    }
    return null;
  };

  const candidates = foundPositions
    .map(segmentForPosition)
    .filter((r): r is NonNullable<typeof r> => r != null);
  if (candidates.length === 0) return null;

  const uniqueByTime = Array.from(
    new Map(candidates.map((r) => [`${r.startTime}-${r.endTime}`, r])).values(),
  );
  const byStartTime = uniqueByTime.sort((a, b) => a.startTime - b.startTime);

  const { fragmentIndex, totalFragments } = options ?? {};
  if (
    totalFragments != null &&
    totalFragments > 0 &&
    fragmentIndex != null &&
    fragmentIndex >= 0
  ) {
    const index = Math.min(fragmentIndex, byStartTime.length - 1);
    return {
      startTime: byStartTime[index].startTime,
      endTime: byStartTime[index].endTime,
    };
  }
  return {
    startTime: byStartTime[0].startTime,
    endTime: byStartTime[0].endTime,
  };
}

/**
 * テキストが文字起こしのどのセグメントに該当するかを特定し、タイムスタンプを返す。
 * まず「VTT連結文字列上の出現位置」で正確なセグメントを特定し、
 * 失敗時のみ従来のテキスト一致＋fragmentIndex で候補を選ぶ。
 */
export function findTimestampForText(
  searchText: string,
  segments: TimestampSegment[],
  options?: FindTimestampOptions,
): { startTime: number; endTime: number } | null {
  const cleanSearchText = searchText
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "$1")
    .trim();

  if (!cleanSearchText || segments.length === 0) {
    return null;
  }

  // 1) 正確な秒数: VTT連結上の出現位置でセグメントを特定
  const byPosition = findSegmentByPosition(searchText, segments, options);
  if (byPosition) return byPosition;

  const searchTextShort =
    cleanSearchText.length > 50
      ? cleanSearchText.substring(0, 50)
      : cleanSearchText;

  const cleanSegmentTexts = segments.map((seg) => ({
    ...seg,
    cleanText: seg.text.replace(/<em[^>]*>(.*?)<\/em>/gi, "$1"),
  }));

  const matches: { startTime: number; endTime: number }[] = [];

  for (const segment of cleanSegmentTexts) {
    const isFullMatch =
      segment.cleanText.includes(cleanSearchText) ||
      cleanSearchText.includes(segment.cleanText);
    const isShortMatch =
      segment.cleanText.includes(searchTextShort) ||
      searchTextShort.includes(segment.cleanText);
    if (isFullMatch || isShortMatch) {
      matches.push({ startTime: segment.startTime, endTime: segment.endTime });
    }
  }

  if (matches.length === 0) {
    const searchWords = cleanSearchText
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (searchWords.length > 0) {
      const keyWords = searchWords.slice(0, Math.min(3, searchWords.length));
      for (const segment of cleanSegmentTexts) {
        const matchedWords = keyWords.filter((word) =>
          segment.cleanText.includes(word),
        );
        if (matchedWords.length / keyWords.length >= 0.5) {
          matches.push({
            startTime: segment.startTime,
            endTime: segment.endTime,
          });
        }
      }
    }
  }

  if (matches.length === 0 && cleanSearchText.length >= 10) {
    const firstChars = cleanSearchText.substring(0, 10);
    for (const segment of cleanSegmentTexts) {
      if (segment.cleanText.includes(firstChars)) {
        matches.push({
          startTime: segment.startTime,
          endTime: segment.endTime,
        });
      }
    }
  }

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const byStartTime = [...matches].sort((a, b) => a.startTime - b.startTime);
  const { fragmentIndex, totalFragments } = options ?? {};
  if (
    totalFragments != null &&
    totalFragments > 0 &&
    fragmentIndex != null &&
    fragmentIndex >= 0
  ) {
    const index = Math.min(fragmentIndex, byStartTime.length - 1);
    return byStartTime[index];
  }

  return byStartTime[0];
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
