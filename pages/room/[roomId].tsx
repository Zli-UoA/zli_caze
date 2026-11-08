import {
  appendComment,
  createCommentsDB,
  preloadCommentsDB,
} from "@/components/collections/comments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveQuery } from "@tanstack/react-db";
import { useRouter } from "@void/react";
import { useEffect, useMemo, useState } from "react";
import type * as schema from "../../src/schema/message";
import type { Props } from "./[roomId].server";

export default function RoomPage({ roomId, room, principal, canPost }: Props) {
  const router = useRouter();
  const effectiveRoomId = roomId;

  const [commentInput, setCommentInput] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentsDB = useMemo(() => createCommentsDB(effectiveRoomId), [effectiveRoomId]);
  const commentsCollection = commentsDB.collections.comments;

  useEffect(() => {
    let cancelled = false;
    setIsReady(false);
    setError(null);
    preloadCommentsDB(commentsDB)
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        if (!cancelled) setError("コメントの読み込みに失敗しました");
      });
    return () => {
      cancelled = true;
      commentsDB.close();
    };
  }, [commentsDB]);

  const { data: rawComments, isLoading } = useLiveQuery({
    query: (q) =>
      q.from({ comment: commentsCollection }).orderBy(({ comment }) => comment.createdAt, "desc"),
    queryKey: ["comments", effectiveRoomId],
  });
  const comments = rawComments.map((comment) => ({
    ...comment,
    createdAt: new Date(comment.createdAt),
  }));

  const openLogin = () => {
    const next = `/room/${encodeURIComponent(effectiveRoomId)}`;
    void router.visit(`/login?next=${encodeURIComponent(next)}`);
  };

  const sendComment = async () => {
    if (principal == null) {
      openLogin();
      return;
    }

    if (!isReady || isSending) return;
    const content = commentInput.trim();
    if (content === "") return;

    const author =
      principal.type === "guest"
        ? { authorId: principal.sessionId, authorType: "guest" as const }
        : {
            authorId: principal.userId,
            authorType: principal.isAdmin ? ("admin" as const) : ("member" as const),
          };

    const comment = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      content,
      user: principal.name,
      ...author,
      isOptimistic: true,
    } satisfies schema.Comment;

    setCommentInput("");
    setIsSending(true);
    try {
      await appendComment(commentsDB, comment);
      setError(null);
    } catch (reason) {
      console.error(reason);
      setCommentInput(content);
      setError("送信に失敗しました。もう一度お試しください");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-36 flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{room.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>部屋ID: {effectiveRoomId}</span>
            <span>
              閲覧: {room.visibility === "link" ? "リンクを知っている人" : "メンバー・ゲストのみ"}
            </span>
            {principal != null && (
              <span>
                {principal.type === "guest" ? "ゲスト" : principal.isAdmin ? "管理者" : "メンバー"}:{" "}
                {principal.name}
              </span>
            )}
          </div>
          {canPost ? (
            <>
              <div className="flex gap-6">
                <Input
                  type="text"
                  id="comment"
                  autoComplete="off"
                  required
                  value={commentInput}
                  maxLength={100}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      void sendComment();
                    }
                  }}
                />
                <Button onClick={() => void sendComment()} disabled={!isReady || isSending}>
                  {isSending ? "送信中..." : "送信"}
                </Button>
              </div>
              <div className="flex justify-end text-sm text-muted-foreground">
                Ctrl + Enter で送信
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">
                コメントするには AuthZ ログインまたはゲスト参加が必要です。
              </span>
              <Button onClick={openLogin}>ログインする</Button>
            </div>
          )}
          {error != null && (
            <div role="alert" className="text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        {isLoading && (
          <>
            <Skeleton className="h-[74px] mb-[24px] rounded-xl bg-card" />
            <Skeleton className="h-[74px] mb-[24px] rounded-xl bg-card" />
            <Skeleton className="h-[74px] mb-[24px] rounded-xl bg-card" />
          </>
        )}
        {comments.map((comment) => (
          <div key={comment.id}>
            <Card className={comment.isOptimistic ? "opacity-50" : ""}>
              <CardContent>
                <div className="flex">
                  <div>{comment.content}</div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <div>{comment.createdAt.toLocaleTimeString()}</div>
              <div>
                {comment.user}
                {comment.authorType === "guest" && (
                  <span className="ml-2 text-xs text-muted-foreground">ゲスト</span>
                )}
                {comment.authorType === "admin" && (
                  <span className="ml-2 text-xs text-muted-foreground">管理者</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
