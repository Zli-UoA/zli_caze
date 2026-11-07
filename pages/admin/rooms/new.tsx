import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, Link, useForm } from "@void/react";
import { useFormStatus } from "react-dom";
import type { Props } from "./new.server";

const SubmitButton = ({ pending }: { pending: boolean }) => {
  const status = useFormStatus();
  return (
    <Button type="submit" disabled={pending || status.pending}>
      作成する
    </Button>
  );
};

export default function NewRoomPage(_props: Props) {
  const form = useForm("/admin/rooms/new", {
    title: "",
    id: "",
    visibility: "link",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-36">
      <Card>
        <CardHeader>
          <CardTitle>新しいルームを作成</CardTitle>
          <CardDescription>
            ルームIDを省略するとランダムなIDになります。作成後にゲスト招待を発行できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={form} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">ルーム名</Label>
              <Input
                id="title"
                name="title"
                value={form.data.title}
                maxLength={100}
                onChange={(e) => form.setData("title", e.target.value)}
                required
              />
              {form.errors.title != null && (
                <p className="text-sm text-destructive">{form.errors.title}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="id">ルームID（任意）</Label>
              <Input
                id="id"
                name="id"
                value={form.data.id}
                maxLength={64}
                pattern="[A-Za-z0-9_-]{1,64}"
                onChange={(e) => form.setData("id", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">英数字・_・-の1〜64文字</p>
              {form.errors.id != null && (
                <p className="text-sm text-destructive">{form.errors.id}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visibility">閲覧ポリシー</Label>
              <select
                id="visibility"
                name="visibility"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.data.visibility}
                onChange={(e) =>
                  form.setData("visibility", e.target.value === "members" ? "members" : "link")
                }
              >
                <option value="link">リンクを知っている人は閲覧可（投稿はログイン必須）</option>
                <option value="members">メンバー・ゲスト・管理者のみ閲覧可</option>
              </select>
            </div>

            {form.error != null && <p className="text-sm text-destructive">{form.error.message}</p>}

            <div className="flex justify-between">
              <Button asChild variant="secondary">
                <Link href="/admin/rooms">戻る</Link>
              </Button>
              <SubmitButton pending={form.pending} />
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
