import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type AvatarProps = {
  name: string;
  src?: string | null;
  /** Empty when an adjacent name already labels the image. */
  alt?: string;
  className?: string;
};

const initialOf = (name: string): string => Array.from(name.trim())[0]?.toUpperCase() ?? "?";

/**
 * AuthZ profile icon with an initial fallback. AuthZ deletes the previous
 * object when an icon is replaced, so a stale snapshot can fail to load; the
 * fallback keeps the comment layout intact in that case.
 */
export const Avatar = ({ name, src, alt = "", className }: AvatarProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const base =
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-primary font-semibold text-brand-dark select-none";

  if (src == null || src === "" || failed) {
    return (
      <span
        aria-hidden={alt === "" ? true : undefined}
        aria-label={alt === "" ? undefined : alt}
        role={alt === "" ? undefined : "img"}
        className={cn(base, "size-8 text-sm", className)}
      >
        {initialOf(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(base, "size-8 object-cover", className)}
    />
  );
};
