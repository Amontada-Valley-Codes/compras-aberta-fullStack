import Image from "next/image";
const FullLogo = () => {
  return (
    <Image
      src="/logos/logo-horizontal.webp"
      alt="Compras Abertas"
      width={180}
      height={74}
      priority
      className="h-auto w-full max-w-[180px] object-contain"
    />
  );
};

export default FullLogo;