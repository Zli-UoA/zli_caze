import { LoginCard } from "@/components/auth/LoginCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useRouter } from "@void/react";

export default function LoginPage() {
  const router = useRouter();
  const next = router.query.get("next") ?? "/";

  return (
    <div className="max-w-3xl mx-auto px-4 py-36 flex flex-col gap-6">
      <LoginCard next={next} />
      <Card>
        <CardHeader>
          <CardTitle>ゲストで参加する</CardTitle>
          <CardDescription>
            企業エンジニア・イベントゲストは、管理者から共有された招待リンクを開いてください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="underline text-sm" href="/">
            招待コードを入力する
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
