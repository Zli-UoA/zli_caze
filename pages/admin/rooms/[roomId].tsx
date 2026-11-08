import { SessionExpiredBanner } from "@/components/auth/SessionExpiredBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatJst } from "@/lib/formatDate";
import { action, Form, isVoidActionError, Link, useForm, useRouter } from "@void/react";
import { useState } from "react";
import { routeUrl } from "void/routes";
import type { Props } from "./[roomId].server";

const CopyButton = ({ value }: { value: string }) => {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        void navigator.clipboard
          .writeText(value)
          .then(() => {
            setStatus("copied");
            setTimeout(() => setStatus("idle"), 1500);
          })
          .catch(() => setStatus("failed"));
      }}
    >
      {status === "copied" ? "コピーしました" : status === "failed" ? "コピー失敗" : "コピー"}
    </Button>
  );
};

export default function AdminRoomPage({ room, invites, inviteToken, origin }: Props) {
  const router = useRouter();
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const onActionError = (error: unknown) => {
    if (isVoidActionError(error) && (error.status === 401 || error.status === 403)) {
      setSessionExpired(true);
      return;
    }
    if (error instanceof Error) window.alert(error.message);
  };

  const inviteForm = useForm(
    "/admin/rooms/:roomId?invite",
    { label: "", expiresInHours: 24, maxUses: 0 },
    { params: { roomId: room.id }, onError: onActionError },
  );
  const visibilityForm = useForm(
    "/admin/rooms/:roomId?visibility",
    { visibility: room.visibility === "members" ? "members" : "link" },
    { params: { roomId: room.id }, onError: onActionError },
  );

  const revoke = async (inviteId: string) => {
    try {
      const result = await action("/admin/rooms/:roomId?revoke", {
        params: { roomId: room.id },
        data: { inviteId },
      });
      setRevokeTarget(null);
      if (!result.ok) {
        window.alert(result.error.message);
        return;
      }
      void router.visit(routeUrl("/admin/rooms/:roomId", { params: { roomId: room.id } }));
    } catch (error) {
      setRevokeTarget(null);
      onActionError(error);
    }
  };

  const inviteUrl =
    inviteToken == null ? null : `${origin}/join/${encodeURIComponent(inviteToken)}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-36 flex flex-col gap-6">
      {sessionExpired && (
        <SessionExpiredBanner
          next={routeUrl("/admin/rooms/:roomId", { params: { roomId: room.id } })}
        />
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{room.title}</h1>
          <p className="text-sm text-muted-foreground">
            ID: {room.id} /{" "}
            {room.visibility === "link" ? "リンク閲覧可" : "メンバー・ゲスト・管理者のみ"}
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
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} aria-label="ゲスト招待URL" />
              <CopyButton value={inviteUrl} />
            </div>
            <p className="text-xs text-destructive">
              このURLは画面を離れると再表示できません。必ずコピーしてください。
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>閲覧ポリシー</CardTitle>
          <CardDescription>
            「リンク閲覧可」はURLを知っている人はログイン不要で閲覧できます。「メンバー・ゲスト・管理者のみ」は投稿者として参加している人だけが閲覧できます。
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
                <option value="members">メンバー・ゲスト・管理者のみ</option>
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
                {inviteForm.pending ? "発行中..." : "招待を発行"}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                ゲストのログインは最長12時間です。招待が有効なら同じURLから再参加できます。
              </p>
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
                        期限: {formatJst(invite.expiresAt)} / 利用: {invite.usedCount}
                        {invite.maxUses === 0 ? "（無制限）" : ` / ${invite.maxUses}`}
                        {revoked ? " / 失効済み" : expired ? " / 期限切れ" : ""}
                      </div>
                    </div>
                    {!revoked && !expired && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setRevokeTarget(invite.id)}
                      >
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

      <Dialog open={revokeTarget != null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この招待を失効しますか？</DialogTitle>
            <DialogDescription>
              失効すると、この招待で参加済みのゲストもログアウトされます。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRevokeTarget(null)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeTarget != null && void revoke(revokeTarget)}
            >
              失効する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
