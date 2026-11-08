import { Button } from "@/components/ui/button";
import { Link } from "@void/react";

export const SessionExpiredBanner = ({ next }: { next: string }) => (
  <div
    role="alert"
    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
  >
    <span>セッションが切れました。再ログインしてください。</span>
    <Button asChild variant="secondary" size="sm">
      <Link href={`/login?next=${encodeURIComponent(next)}`}>再ログイン</Link>
    </Button>
  </div>
);
