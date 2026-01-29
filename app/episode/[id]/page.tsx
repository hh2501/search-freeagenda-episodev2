'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatTimestamp } from '@/lib/transcript/timestamp';

interface Episode {
  episodeId: string;
  title: string;
  description: string;
  publishedAt: string;
  listenUrl: string;
  transcriptText: string;
}

interface MatchPosition {
  text: string;
  field: string;
  position: number;
  timestamp?: { startTime: number; endTime: number };
}

export default function EpisodeDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeId = params.id as string;
  const searchQuery = searchParams.get('q');
  const exactMatchParam = searchParams.get('exact') === '1';

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [matchPositions, setMatchPositions] = useState<MatchPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchEpisode = async () => {
      if (!episodeId) return;

      setLoading(true);
      setError(null);

      try {
        const queryParam = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
        const response = await fetch(`/api/episode/${episodeId}${queryParam}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'エピソードの取得に失敗しました');
        }

        setEpisode(data.episode);
        setMatchPositions(data.allMatchPositions || []);
        setEditedTranscript(data.episode.transcriptText || '');
        
        // デバッグログ（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] エピソードデータ:', data.episode);
          console.log('[DEBUG] マッチポジション:', data.allMatchPositions);
          data.allMatchPositions?.forEach((match: MatchPosition, index: number) => {
            if (match.timestamp) {
              console.log(`[DEBUG] タイムスタンプ [${index}]:`, match.timestamp);
            } else {
              console.warn(`[DEBUG] タイムスタンプなし [${index}]:`, match.field, match.text.substring(0, 50));
            }
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エピソードの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [episodeId, searchQuery]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    try {
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '認証に失敗しました');
      }

      if (data.authenticated) {
        setIsAuthenticated(true);
        setShowPasswordDialog(false);
        setPassword('');
        setIsEditing(true);
        setEditedTranscript(episode?.transcriptText || '');
      } else {
        setPasswordError('パスワードが正しくありません');
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : '認証に失敗しました');
    }
  };

  const handleEditClick = () => {
    if (isAuthenticated) {
      setIsEditing(true);
      setEditedTranscript(episode?.transcriptText || '');
    } else {
      setShowPasswordDialog(true);
    }
  };

  const handleSaveTranscript = async () => {
    if (!episode || !isAuthenticated) return;

    setSaving(true);
    try {
      // パスワードを取得（セッションストレージから）
      // 編集ボタンをクリックしたときに既に認証済みなので、パスワードは存在するはず
      const storedPassword = sessionStorage.getItem('transcript_edit_password');
      if (!storedPassword) {
        // 万が一パスワードが存在しない場合（通常は発生しない）
        throw new Error('認証情報が見つかりません。再度認証してください。');
      }

      const response = await fetch(`/api/episode/${episodeId}/transcript`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedPassword}`,
        },
        body: JSON.stringify({
          transcriptText: editedTranscript,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '保存に失敗しました');
      }

      // エピソード情報を更新（保存した文字起こしで更新）
      setEpisode({
        ...episode,
        transcriptText: editedTranscript,
      });
      setIsEditing(false);
      alert('文字起こしを保存しました');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存に失敗しました';
      alert(errorMessage);
      // 認証エラーの場合は認証状態をリセット
      if (errorMessage.includes('認証') || errorMessage.includes('認証情報')) {
        setIsAuthenticated(false);
        setIsEditing(false);
        setShowPasswordDialog(true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg
                className="animate-spin h-8 w-8 mx-auto mb-4 text-freeagenda-dark"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-600">読み込み中...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !episode) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/"
              className="md-text-button inline-flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              トップページに戻る
            </Link>
          </div>
          <div className="md-elevated-card">
            <div className="text-center py-10">
              <p className="text-red-600 mb-4">{error || 'エピソードが見つかりませんでした'}</p>
              <Link
                href="/"
                className="md-text-button"
              >
                検索ページに戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href={(() => {
              if (!searchQuery) return '/';
              const params = new URLSearchParams();
              params.set('q', searchQuery);
              if (exactMatchParam) {
                params.set('exact', '1');
              }
              return `/?${params.toString()}`;
            })()}
            className="md-text-button inline-flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            検索結果に戻る
          </Link>
        </div>

        <div className="md-elevated-card">
          <h1
            className="text-headline-large md:text-display-small font-bold mb-4 text-gray-900"
            dangerouslySetInnerHTML={{ __html: episode.title }}
          />

          <div className="text-label-medium text-gray-500 mb-6">
            {formatDate(episode.publishedAt)}
          </div>

          <a
            href={episode.listenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="md-filled-button inline-block mb-8"
          >
            LISTENで聴く
          </a>

          {episode.description && (
            <div className="mb-8">
              <h2 className="text-title-large font-semibold text-gray-800 mb-3">説明</h2>
              <p className="text-body-large text-gray-700 leading-relaxed whitespace-pre-wrap">
                {episode.description}
              </p>
            </div>
          )}

          {searchQuery && matchPositions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-title-large font-semibold text-gray-800 mb-4">
                検索キーワード「{searchQuery}」のマッチ箇所 ({matchPositions.length}箇所)
              </h2>
              <div className="space-y-4">
                {matchPositions.map((match, index) => (
                  <div
                    key={`${match.field}-${match.position}-${index}`}
                    className="border-l-4 border-freeagenda-light pl-4 py-3 bg-gray-50 rounded-r-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-label-small font-semibold text-freeagenda-dark">
                        {match.field === 'transcript_text' ? '文字起こし' : '説明文'} - マッチ {index + 1}
                      </div>
                      {match.timestamp && (
                        <div className="text-label-small font-medium text-freeagenda-dark bg-white px-2.5 py-1 rounded-md border border-freeagenda-light">
                          {formatTimestamp(match.timestamp.startTime)} - {formatTimestamp(match.timestamp.endTime)}
                        </div>
                      )}
                    </div>
                    <p
                      className="text-body-medium text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: match.text.replace(/<em>/g, '<mark>').replace(/<\/em>/g, '</mark>') }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && matchPositions.length === 0 && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-body-medium text-yellow-800">
                検索キーワード「{searchQuery}」のマッチ箇所が見つかりませんでした。
              </p>
            </div>
          )}

          {/* パスワード認証ダイアログ */}
          {showPasswordDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-title-large font-semibold text-gray-900 mb-4">
                  パスワード認証
                </h3>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="mb-4">
                    <label
                      htmlFor="password"
                      className="block text-body-medium text-gray-700 mb-2"
                    >
                      パスワード
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-freeagenda-dark focus:border-transparent"
                      autoFocus
                    />
                    {passwordError && (
                      <p className="mt-2 text-body-small text-red-600">
                        {passwordError}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordDialog(false);
                        setPassword('');
                        setPasswordError(null);
                      }}
                      className="md-outlined-button"
                    >
                      キャンセル
                    </button>
                    <button type="submit" className="md-filled-button">
                      認証
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 文字起こしセクション（認証済みの場合のみ表示） */}
          {isAuthenticated && episode.transcriptText && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-large font-semibold text-gray-800">
                  文字起こし
                </h2>
              </div>
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={editedTranscript}
                    onChange={(e) => setEditedTranscript(e.target.value)}
                    className="w-full min-h-[400px] p-4 border border-gray-300 rounded-md text-body-medium font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-freeagenda-dark focus:border-transparent"
                    placeholder="文字起こしを編集..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveTranscript}
                      disabled={saving}
                      className="md-filled-button"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedTranscript(episode.transcriptText);
                      }}
                      disabled={saving}
                      className="md-outlined-button"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        setIsAuthenticated(false);
                        setIsEditing(false);
                        setShowPasswordDialog(false);
                        if (typeof window !== 'undefined') {
                          sessionStorage.removeItem('transcript_edit_password');
                        }
                      }}
                      disabled={saving}
                      className="md-text-button text-gray-600"
                    >
                      ログアウト
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-lg max-w-none">
                  <p className="text-body-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {episode.transcriptText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 文字起こし編集ボタン（ページ下部に小さく表示） */}
          {episode.transcriptText && (
            <div className="mt-8 pt-8 border-t border-gray-200 text-center">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handleEditClick}
                  className="text-label-small text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  文字起こしを編集
                </button>
                <span className="text-label-small text-gray-400">
                  （管理者のみ）
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
