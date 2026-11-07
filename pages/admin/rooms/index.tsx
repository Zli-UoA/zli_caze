import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@void/react";
import { routeUrl } from "void/routes";
import type { Props } from "./index.server";

export default function AdminRoomsPage({ rooms, q }: Props) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-36 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ルーム管理</h1>
          <p className="text-sm text-muted-foreground">
            ルームの一覧・作成・ゲスト招待を管理します。
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/rooms/new">新しいルームを作成</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ルーム一覧</CardTitle>
          <CardDescription>全 {rooms.length} 件</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" action="/admin/rooms" className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="ルームID・タイトルで検索" />
            <Button type="submit" variant="secondary">
              検索
            </Button>
          </form>

          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">ルームがありません。</p>
          ) : (
            <div className="flex flex-col divide-y">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{room.title}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {room.id} / {room.visibility === "link" ? "リンク閲覧可" : "メンバー限定"}{" "}
                      / {room.status === "active" ? "公開中" : "アーカイブ"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={routeUrl("/room/:roomId", { params: { roomId: room.id } })}>
                        ルームを開く
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link
                        href={routeUrl("/admin/rooms/:roomId", { params: { roomId: room.id } })}
                      >
                        管理
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
