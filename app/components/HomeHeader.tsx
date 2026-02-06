import Image from "next/image";

export default function HomeHeader() {
  return (
    <div className="text-center mb-8">
      <div className="mb-6 flex justify-center">
        <Image
          src="/Compressed_Thumbnail_image.png"
          alt="FREE AGENDA by Hikaru & Yamotty"
          width={400}
          height={400}
          className="max-w-[200px] md:max-w-[300px] lg:max-w-[400px] h-auto rounded-xl shadow-md transition-all duration-200 ease-out hover:shadow-xl"
          priority
          loading="eager"
          fetchPriority="high"
          decoding="async"
          sizes="(max-width: 480px) 120px, (max-width: 768px) 200px, (max-width: 1024px) 300px, 400px"
          quality={85}
        />
      </div>
      <h1 className="text-headline-medium md:text-headline-large font-bold mb-4 text-gray-900">
        フリーアジェンダのあの回
      </h1>
      <p className="text-body-medium text-gray-600 mb-4 font-medium">
        探している「あの回」を覚えているキーワードから検索
      </p>
    </div>
  );
}
