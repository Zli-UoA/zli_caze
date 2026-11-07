import { LoginCard } from "@/components/auth/LoginCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter, useShared } from "@void/react";
import { routeUrl } from "void/routes";
import { useRef, useState } from "react";
import type { Principal } from "../src/server/types";

const validateRoomId = (input: HTMLInputElement) => {
  if (input.validity.valueMissing) {
    input.setCustomValidity("部屋IDを入力してください");
  } else if (!/^[A-Za-z0-9_-]{1,64}$/.test(input.value)) {
    input.setCustomValidity("部屋IDは英数字・_・-の1〜64文字で入力してください");
  } else {
    input.setCustomValidity("");
  }

  return input.reportValidity();
};

const extractGuestCode = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    return trimmed;
  }
};

export default function IndexPage() {
  const router = useRouter();
  const { principal } = useShared<{ principal: Principal | null }>();
  const next = router.query.get("next") ?? "/";

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [roomId, setRoomId] = useState("");
  const [guestCode, setGuestCode] = useState("");

  const joinRoom = () => {
    const input = inputRef.current;
    if (input == null) return;

    const isValid = validateRoomId(input);
    if (!isValid) return;

    void router.visit(routeUrl("/room/:roomId", { params: { roomId } }));
  };

  const joinAsGuest = () => {
    const token = extractGuestCode(guestCode);
    if (token === "") return;
    void router.visit(routeUrl("/join/:token", { params: { token } }));
  };

  if (principal == null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-36 flex flex-col gap-6">
        <LoginCard next={next} />
        <Card>
          <CardHeader>
            <CardTitle>ゲストで参加する</CardTitle>
            <CardDescription>
              企業エンジニア・イベントゲストは、管理者から共有された招待コードまたは招待 URL
              を入力してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Label htmlFor="guestCode">招待コード</Label>
            <div className="flex gap-3">
              <Input
                id="guestCode"
                autoComplete="off"
                value={guestCode}
                onChange={(e) => setGuestCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") joinAsGuest();
                }}
                placeholder="招待 URL を貼り付けてもかまいません"
              />
              <Button onClick={joinAsGuest} disabled={guestCode.trim() === ""}>
                参加する
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (principal.type === "guest") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-36">
        <Card>
          <CardHeader>
            <CardTitle>ゲストとして参加中</CardTitle>
            <CardDescription>
              {principal.name} さんとして、招待されたルームに参加しています。
            </CardDescription>
            <CardAction>
              <Button asChild>
                <Link href={routeUrl("/room/:roomId", { params: { roomId: principal.roomId } })}>
                  ルームを開く
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-36 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>部屋に参加する</CardTitle>
          <CardDescription>
            {principal.isAdmin
              ? "部屋IDで参加するか、ルーム管理から新しい部屋を作成できます。"
              : "参加する部屋のIDを入力してください。"}
          </CardDescription>
          <CardAction>
            <Button onClick={joinRoom}>参加する</Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <Label htmlFor="roomId">部屋ID</Label>
          <Input
            type="text"
            id="roomId"
            autoComplete="off"
            pattern="[A-Za-z0-9_-]{1,64}"
            minLength={1}
            maxLength={64}
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              if (inputRef.current != null) validateRoomId(inputRef.current);
            }}
            ref={inputRef}
            required
            onKeyDown={(e) => {
              if (e.key === "Enter") joinRoom();
            }}
          />
        </CardContent>
      </Card>
      {principal.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>ルーム管理</CardTitle>
            <CardDescription>ルーム一覧・作成・ゲスト招待を管理します。</CardDescription>
            <CardAction>
              <Button asChild variant="secondary">
                <Link href="/admin/rooms">ルーム管理を開く</Link>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
