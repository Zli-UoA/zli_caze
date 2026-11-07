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
    try {
      if (principal?.type === "member") {
        await auth.signOut();
      }
    } catch (error) {
      console.error(error);
    }
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error(error);
    }
    setPending(false);
    void router.visit("/");
  };

  return (
    <header className="bg-brand-dark text-brand-light fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          <Link href="/" className="flex items-center">
            <Logo className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {principal?.type === "member" && principal.isAdmin && (
              <Link className="hover:underline" href="/admin/rooms">
                ルーム管理
              </Link>
            )}
            {principal == null ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/login">ログイン</Link>
              </Button>
            ) : (
              <>
                <span className="text-brand-light/80">
                  {principal.type === "guest" ? "ゲスト: " : ""}
                  {principal.name}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void logout()}
                  disabled={pending}
                >
                  ログアウト
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

  return (
    <div className="bg-brand-secondary h-lvh overflow-y-scroll">
      <Header principal={principal} />
      {children}
    </div>
  );
}
