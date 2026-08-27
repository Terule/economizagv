import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductThumbnail({
  image,
  name,
  className,
}: {
  image?: string;
  name: string;
  className?: string;
}) {
  if (image)
    return (
      <Image
        alt=""
        className={cn("product-thumbnail", className)}
        height={52}
        src={image}
        unoptimized
        width={52}
      />
    );
  return (
    <span
      aria-hidden
      className={cn("product-thumbnail product-placeholder", className)}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
