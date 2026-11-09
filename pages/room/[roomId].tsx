import {
  appendComment,
  createCommentsDB,
  preloadCommentsDB,
  type CommentsDB,
} from "@/components/collections/comments";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveQuery } from "@tanstack/react-db";
import { Link, useRouter } from "@void/react";
import { useEffect, useState } from "react";
import type * as schema from "../../src/schema/message";
import type { Props } from "./[roomId].server";

type CommentListProps = {
  commentsDB: CommentsDB;
  roomId: string;
};

const CommentSkeleton = () => (
  <Card>
    <CardContent className="flex items-start gap-3">
      <Skeleton className="size-9 shrink-0 rounded-full bg-card" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-32 bg-card" />
        <Skeleton className="h-6 w-full bg-card" />
      </div>
    </CardContent>
  </Card>
);

const CommentList = ({ commentsDB, roomId }: CommentListProps) => {
  const commentsCollection = commentsDB.collections.comments;
  const { data: rawComments, isLoading } = useLiveQuery({
    query: (q) =>
      q.from({ comment: commentsCollection }).orderBy(({ comment }) => comment.createdAt, "desc"),
    queryKey: ["comments", roomId],
  });
  const comments = rawComments.map((comment) => ({
    ...comment,
    createdAt: new Date(comment.createdAt),
  }));

  if (isLoading) {
    return (
      <>
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton />
      </>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        まだコメントはありません。最初のコメントを投稿してみましょう。
      </p>
    );
  }

  return comments.map((comment) => (
    <Card key={comment.id}>
      <CardContent className="flex items-start gap-3">
        <Avatar name={comment.user} src={comment.authorImage} className="size-9 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-x-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
              <span className="truncate">{comment.user}</span>
              {comment.authorType === "guest" && (
                <span className="text-xs font-normal text-muted-foreground">ゲスト</span>
              )}
              {comment.authorType === "admin" && (
                <span className="text-xs font-normal text-muted-foreground">管理者</span>
              )}
            </div>
            <time
              dateTime={comment.createdAt.toISOString()}
              className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
            >
              {comment.createdAt.toLocaleTimeString()}
            </time>
          </div>
          <div className="mt-2 break-words whitespace-pre-wrap">{comment.content}</div>
        </div>
      </CardContent>
    </Card>
  ));
};

export default function RoomPage({ roomId, room, principal, canPost }: Props) {
  const router = useRouter();
  const effectiveRoomId = roomId;

  const [commentInput, setCommentInput] = useState("");
  const [commentsDB, setCommentsDB] = useState<CommentsDB | null>(null);
  const [generation, setGeneration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const db = createCommentsDB(effectiveRoomId);
    setCommentsDB(db);
    setGeneration((value) => value + 1);
    setIsReady(false);
    setError(null);

    preloadCommentsDB(db)
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch((reason: unknown) => {
        console.error(reason);
        if (!cancelled) setError("コメントの読み込みに失敗しました");
      });

    return () => {
      cancelled = true;
      db.close();
    };
  }, [effectiveRoomId]);

  const openLogin = () => {
    const next = `/room/${encodeURIComponent(effectiveRoomId)}`;
    void router.visit(`/login?next=${encodeURIComponent(next)}`);
  };

  const sendComment = async () => {
    if (principal == null) {
      openLogin();
      return;
    }
    if (commentsDB == null || !isReady || isSending) return;

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
      authorImage: principal.image,
      isOptimistic: true,
    } satisfies schema.Comment;

    setCommentInput("");
    setIsSending(true);
    try {
      await appendComment(commentsDB, comment);
      setError(null);
    } catch (reason) {
      console.error(reason);
      // The append may have succeeded even when the live confirmation timed
      // out. Do not restore the input and invite a duplicate post.
      setError("送信結果を確認できませんでした。再読み込みして確認してください");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 sm:py-36 flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{room.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>部屋ID: {effectiveRoomId}</span>
            <span>
              閲覧:{" "}
              {room.visibility === "link" ? "リンクを知っている人" : "メンバー・ゲスト・管理者のみ"}
            </span>
            {principal != null && (
              <span className="inline-flex max-w-full min-w-0 items-center gap-2">
                <Avatar
                  name={principal.name}
                  src={principal.image}
                  className="size-6 text-[10px]"
                />
                <span className="min-w-0 truncate" title={principal.name}>
                  {principal.type === "guest"
                    ? "ゲスト"
                    : principal.isAdmin
                      ? "管理者"
                      : "メンバー"}
                  : {principal.name}
                </span>
              </span>
            )}
          </div>
          {canPost ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="comment" className="sr-only">
                  コメント
                </Label>
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
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        void sendComment();
                      }
                    }}
                  />
                  <Button
                    onClick={() => void sendComment()}
                    disabled={!isReady || isSending || commentInput.trim() === ""}
                  >
                    {isSending ? "送信中..." : "送信"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end text-sm text-muted-foreground">
                Ctrl / Cmd + Enter で送信
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {principal == null
                  ? "コメントするには AuthZ ログインまたはゲスト参加が必要です。"
                  : "このルームは閲覧のみです。"}
              </span>
              {principal == null && (
                <>
                  <Button onClick={openLogin}>ログインする</Button>
                  <Button asChild variant="secondary">
                    <Link href="/">招待コードで参加</Link>
                  </Button>
                </>
              )}
            </div>
          )}
          {error != null && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 text-sm text-destructive"
            >
              <span>{error}</span>
              <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                再読み込み
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/login?next=${encodeURIComponent(`/room/${effectiveRoomId}`)}`}>
                  ログインし直す
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        {commentsDB == null || !isReady ? (
          error == null ? (
            <>
              <CommentSkeleton />
              <CommentSkeleton />
              <CommentSkeleton />
            </>
          ) : null
        ) : (
          <CommentList
            key={`${effectiveRoomId}:${generation}`}
            commentsDB={commentsDB}
            roomId={effectiveRoomId}
          />
        )}
      </div>
    </div>
  );
}
