import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, Link, useForm } from "@void/react";
import { routeUrl } from "void/routes";
import type { Props } from "./[token].server";

export default function JoinPage({ token, invite, principal }: Props) {
  const form = useForm("/join/:token", { displayName: "" }, { params: { token } });

  if (invite == null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-36">
        <Card>
          <CardHeader>
            <CardTitle>招待リンクが無効です</CardTitle>
            <CardDescription>
              リンクが期限切れか、失効している可能性があります。管理者に新しい招待リンクを依頼してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/">トップへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (principal?.type === "member") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-36">
        <Card>
          <CardHeader>
            <CardTitle>{invite.room.title}</CardTitle>
            <CardDescription>
              すでに {principal.name} さんとして AuthZ
              にログインしています。メンバーとして参加できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={routeUrl("/room/:roomId", { params: { roomId: invite.room.id } })}>
                ルームに参加する
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-36">
      <Card>
        <CardHeader>
          <CardTitle>{invite.room.title}</CardTitle>
          <CardDescription>
            {invite.label} のゲストとして参加します。表示名を入力してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={form} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">表示名</Label>
              <Input
                id="displayName"
                name="displayName"
                value={form.data.displayName}
                maxLength={30}
                aria-invalid={form.errors.displayName != null}
                aria-describedby="displayName-hint displayName-error"
                onChange={(e) => form.setData("displayName", e.target.value)}
                required
              />
              <p id="displayName-hint" className="text-xs text-muted-foreground">
                1〜30文字。コメントに表示されます。
              </p>
              {form.errors.displayName != null && (
                <p id="displayName-error" role="alert" className="text-sm text-destructive">
                  {form.errors.displayName}
                </p>
              )}
            </div>
            {form.error != null && (
              <p role="alert" className="text-sm text-destructive">
                {form.error.message}
              </p>
            )}
            <div className="flex justify-between">
              <Button asChild variant="secondary">
                <Link href="/">戻る</Link>
              </Button>
              <Button type="submit" disabled={form.pending}>
                {form.pending ? "参加中..." : "ゲストとして参加"}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
