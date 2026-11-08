import { Button } from "@/components/ui/button";
import { isVoidActionError, useRouter } from "@void/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryState = { error: Error | null };

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (this.state.error != null) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

const ErrorFallback = ({ error }: { error: Error }) => {
  const router = useRouter();
  const sessionExpired = isVoidActionError(error) && (error.status === 401 || error.status === 403);
  const next = `${router.path}${
    router.query.toString() === "" ? "" : `?${router.query.toString()}`
  }`;

  return (
    <main className="min-h-lvh bg-brand-secondary px-4 py-24 text-brand-light">
      <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-xl border border-white/10 bg-brand-dark p-6">
        <h1 className="text-xl font-semibold">
          {sessionExpired ? "セッションが切れました" : "画面の表示中にエラーが発生しました"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {sessionExpired
            ? "再ログインしてから、もう一度操作してください。"
            : "再読み込みしても直らない場合は、トップページからやり直してください。"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={`/login?next=${encodeURIComponent(next)}`}>再ログイン</a>
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            再読み込み
          </Button>
          <Button asChild variant="secondary">
            <a href="/">トップへ戻る</a>
          </Button>
        </div>
      </div>
    </main>
  );
};

export { ErrorBoundary };
