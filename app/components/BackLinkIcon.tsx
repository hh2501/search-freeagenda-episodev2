import Image from "next/image";

/**
 * 左向きシェブロンアイコン（円形背景付き）。トップページに戻る等のリンクで使用。
 * カラーパレットの freeagenda-dark を円の背景に使用。
 */
export default function BackLinkIcon() {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-freeagenda-dark"
      aria-hidden
    >
      <Image
        src="/chevron_left_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png"
        alt=""
        width={20}
        height={20}
        className="opacity-90"
      />
    </span>
  );
}
