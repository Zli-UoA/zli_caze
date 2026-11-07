import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { auth } from "void/client/react";

const DEV_LOGIN = import.meta.env.DEV;

export const LoginCard = ({ next = "/" }: { next?: string }) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const login = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await auth.signIn.social({
        provider: "authz",
        callbackURL: next,
      });
      if (result?.error) {
        setError("AuthZ にログインできませんでした");
      }
    } catch (reason) {
      console.error(reason);
      setError("AuthZ にログインできませんでした");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AuthZ でログイン</CardTitle>
        <CardDescription>
          Zli メンバーは AuthZ
          アカウントでログインしてください。企業エンジニア・イベントゲストは招待リンクから参加できます。
        </CardDescription>
        <CardAction>
          <Button onClick={() => void login()} disabled={pending}>
            AuthZ でログイン
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        {error != null && (
          <div role="alert" className="text-destructive">
            {error}
          </div>
        )}
        {DEV_LOGIN && (
          <div>
            開発用:{" "}
            <a
              className="underline"
              href={`/auth/dev?name=Dev%20User&admin=1&next=${encodeURIComponent(next)}`}
            >
              管理者としてログイン
            </a>
            {" / "}
            <a
              className="underline"
              href={`/auth/dev?name=Dev%20Member&next=${encodeURIComponent(next)}`}
            >
              メンバーとしてログイン
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
