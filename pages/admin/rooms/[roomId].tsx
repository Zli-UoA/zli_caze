import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { action, Form, Link, useForm, useRouter } from "@void/react";
import { useState } from "react";
import { routeUrl } from "void/routes";
import type { Props } from "./[roomId].server";

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "コピーしました" : "コピー"}
    </Button>
  );
};

export default function AdminRoomPage({ room, invites, inviteToken, origin }: Props) {
  const router = useRouter();
  const inviteForm = useForm(
    "/admin/rooms/:roomId?invite",
    { label: "", expiresInHours: 24, maxUses: 0 },
    { params: { roomId: room.id } },
  );
  const visibilityForm = useForm(
    "/admin/rooms/:roomId?visibility",
    { visibility: room.visibility === "members" ? "members" : "link" },
    { params: { roomId: room.id } },
  );

  const revoke = async (inviteId: string) => {
    const result = await action("/admin/rooms/:roomId?revoke", {
      params: { roomId: room.id },
      data: { inviteId },
    });
    if (!result.ok) {
      window.alert(result.error.message);
      return;
    }
    void router.visit(routeUrl("/admin/rooms/:roomId", { params: { roomId: room.id } }));
  };

  const inviteUrl =
    inviteToken == null ? null : `${origin}/join/${encodeURIComponent(inviteToken)}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-36 flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{room.title}</h1>
          <p className="text-sm text-muted-foreground">
            ID: {room.id} / {room.visibility === "link" ? "リンク閲覧可" : "メンバー限定"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href={routeUrl("/room/:roomId", { params: { roomId: room.id } })}>
              ルームを開く
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/rooms">一覧へ戻る</Link>
          </Button>
        </div>
      </div>

      {inviteUrl != null && (
        <Card>
          <CardHeader>
            <CardTitle>ゲスト招待リンク</CardTitle>
            <CardDescription>
              このURLを企業エンジニア・イベントゲストに共有してください。URLを知っている人はゲストとして参加できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input readOnly value={inviteUrl} />
            <CopyButton value={inviteUrl} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>閲覧ポリシー</CardTitle>
          <CardDescription>
            `link` はURLを知っている人はログイン不要で閲覧できます。`members`
            はメンバー・ゲスト・管理者だけが閲覧できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={visibilityForm} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visibility">ポリシー</Label>
              <select
                id="visibility"
                name="visibility"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={visibilityForm.data.visibility}
                onChange={(e) =>
                  visibilityForm.setData(
                    "visibility",
                    e.target.value === "members" ? "members" : "link",
                  )
                }
              >
                <option value="link">リンク閲覧可</option>
                <option value="members">メンバー限定</option>
              </select>
            </div>
            <Button type="submit" disabled={visibilityForm.pending}>
              保存
            </Button>
            {visibilityForm.error != null && (
              <p className="text-sm text-destructive">{visibilityForm.error.message}</p>
            )}
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ゲスト招待を発行</CardTitle>
          <CardDescription>ルーム単位の招待リンクを発行します。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={inviteForm} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="label">ラベル（企業名・イベント名）</Label>
              <Input
                id="label"
                name="label"
                value={inviteForm.data.label}
                maxLength={100}
                onChange={(e) => inviteForm.setData("label", e.target.value)}
                required
              />
              {inviteForm.errors.label != null && (
                <p className="text-sm text-destructive">{inviteForm.errors.label}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expiresInHours">有効期限（時間）</Label>
              <Input
                id="expiresInHours"
                name="expiresInHours"
                type="number"
                min={1}
                max={168}
                value={inviteForm.data.expiresInHours}
                onChange={(e) =>
                  inviteForm.setData(
                    "expiresInHours",
                    Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 1,
                  )
                }
              />
              {inviteForm.errors.expiresInHours != null && (
                <p className="text-sm text-destructive">{inviteForm.errors.expiresInHours}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxUses">利用回数（0 = 無制限）</Label>
              <Input
                id="maxUses"
                name="maxUses"
                type="number"
                min={0}
                max={1000}
                value={inviteForm.data.maxUses}
                onChange={(e) =>
                  inviteForm.setData(
                    "maxUses",
                    Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0,
                  )
                }
              />
              {inviteForm.errors.maxUses != null && (
                <p className="text-sm text-destructive">{inviteForm.errors.maxUses}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              {inviteForm.error != null && (
                <p className="mb-3 text-sm text-destructive">{inviteForm.error.message}</p>
              )}
              <Button type="submit" disabled={inviteForm.pending}>
                招待を発行
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>発行済みの招待</CardTitle>
          <CardDescription>{invites.length} 件</CardDescription>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ招待はありません。</p>
          ) : (
            <div className="flex flex-col divide-y">
              {invites.map((invite) => {
                const revoked = invite.revokedAt != null;
                const expired = invite.expiresAt <= new Date().toISOString();
                return (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <div className="font-medium">{invite.label}</div>
                      <div className="text-xs text-muted-foreground">
                        期限: {new Date(invite.expiresAt).toLocaleString()} / 利用:{" "}
                        {invite.usedCount}
                        {invite.maxUses === 0 ? "（無制限）" : ` / ${invite.maxUses}`}
                        {revoked ? " / 失効済み" : expired ? " / 期限切れ" : ""}
                      </div>
                    </div>
                    {!revoked && !expired && (
                      <Button variant="secondary" size="sm" onClick={() => void revoke(invite.id)}>
                        失効
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
