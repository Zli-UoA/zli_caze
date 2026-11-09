import { cn } from "@/lib/utils";
import { useState } from "react";

type AvatarProps = {
  name: string;
  src?: string | null;
  /** Empty when an adjacent name already labels the image. */
  alt?: string;
  loading?: "lazy" | "eager";
  className?: string;
};

const initialOf = (name: string): string => Array.from(name.trim())[0]?.toUpperCase() ?? "?";

/**
 * AuthZ profile icon with an initial fallback. AuthZ deletes the previous
 * object when an icon is replaced, so a stale snapshot can fail to load; the
 * fallback keeps the comment layout intact in that case.
 */
export const Avatar = ({ name, src, alt = "", loading = "lazy", className }: AvatarProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src != null && failedSrc === src;

  const base = "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full";

  if (src == null || src === "" || failed) {
    return (
      <span
        data-slot="avatar"
        aria-hidden={alt === "" ? true : undefined}
        aria-label={alt === "" ? undefined : alt}
        role={alt === "" ? undefined : "img"}
        className={cn(
          base,
          "size-8 bg-brand-primary text-sm font-semibold text-brand-dark select-none",
          className,
        )}
      >
        {initialOf(name)}
      </span>
    );
  }

  return (
    <img
      key={src}
      data-slot="avatar"
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(event) => {
        if (event.currentTarget.getAttribute("src") === src) setFailedSrc(src);
      }}
      className={cn(base, "size-8 bg-muted object-cover", className)}
    />
  );
};
