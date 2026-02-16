/**
 * 左向きシェブロンアイコン（円形背景付き）。トップページに戻る等のリンクで使用。
 * カラーパレットの freeagenda-dark を円の背景に使用。
 * SVG を使用して解像度に依存しない表示にしている。
 */
export default function BackLinkIcon() {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-freeagenda-dark"
      aria-hidden
    >
      <img
        src="/chevron_left_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={20}
        height={20}
        className="opacity-90"
      />
    </span>
  );
}
