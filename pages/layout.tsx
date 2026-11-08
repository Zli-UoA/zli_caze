import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Link, useRouter, useShared } from "@void/react";
import { useState, type ReactNode } from "react";
import { auth } from "void/client/react";
import type { Principal } from "../src/server/types";
import "../src/app/app.css";

const Header = ({ principal }: { principal: Principal | null }) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const logout = async () => {
    if (pending) return;
    setPending(true);

    // Clear guest/dev cookies and the server session first. The subsequent
    // Better Auth sign-out may redirect to AuthZ's end-session page.
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error(error);
    }
    try {
      if (principal?.type === "member") await auth.signOut();
    } catch (error) {
      console.error(error);
    }
    setPending(false);
    void router.visit("/");
  };

  const search = router.query.toString();
  const next = search === "" ? router.path : `${router.path}?${search}`;

  return (
    <header className="bg-brand-dark text-brand-light fixed top-0 left-0 right-0 w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center">
            <Logo className="h-8 w-auto" />
          </Link>
          <nav className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
            {principal?.type === "member" && principal.isAdmin && (
              <Link className="hidden hover:underline sm:inline" href="/admin/rooms">
                ルーム管理
              </Link>
            )}
            {principal == null ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/login?next=${encodeURIComponent(next)}`}>ログイン</Link>
              </Button>
            ) : (
              <>
                <span className="hidden max-w-[10rem] truncate text-brand-light/80 sm:inline">
                  {principal.type === "guest" ? "ゲスト: " : ""}
                  {principal.name}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void logout()}
                  disabled={pending}
                >
                  {pending ? "ログアウト中..." : "ログアウト"}
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default function Layout({ children }: { children: ReactNode }) {
  const { principal } = useShared<{ principal: Principal | null }>();
  const router = useRouter();
  const isProjection = /^\/room\/[^/]+\/view\/?$/.test(router.path);

  if (isProjection) {
    return (
      <div className="min-h-lvh bg-black">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="bg-brand-secondary h-lvh overflow-y-scroll">
      <Header principal={principal} />
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
