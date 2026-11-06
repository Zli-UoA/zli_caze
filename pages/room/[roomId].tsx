import { createCommentsDB, preloadCommentsDB } from "@/components/collections/comments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfigCollection } from "@/lib/configContext";
import { useUsername } from "@/lib/username";
import { useLiveQuery } from "@tanstack/react-db";
import { useEffect, useMemo, useState } from "react";
import type * as schema from "../../src/schema/message";
import type { Props } from "./[roomId].server";

export default function RoomPage({ roomId }: Props) {
  const configCollection = useConfigCollection();
  const { username, setIsOpenDialog } = useUsername(configCollection);
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

  const sendComment = async () => {
    if (username == null) {
      setIsOpenDialog(true);
      return;
    }

    if (!isReady || isSending) return;
    const content = commentInput.trim();
    if (content === "") return;
    const comment = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      content,
      user: username,
      isOptimistic: true,
    } satisfies schema.Comment;

    setCommentInput("");
    setIsSending(true);
    try {
      const tx = commentsDB.actions.addComment(comment);
      await tx.when("settled");
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
          <CardTitle>部屋ID: {effectiveRoomId}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex gap-6">
            <Input
              type="text"
              id="roomId"
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
              送信
            </Button>
          </div>
          {error != null && (
            <div role="alert" className="text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex justify-end text-sm text-muted-foreground">Ctrl + Enter で送信</div>
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
              <div>{comment.user}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
