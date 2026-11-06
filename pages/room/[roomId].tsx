import { createCommentsCollection } from "@/components/collections/comments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfigCollection } from "@/lib/configContext";
import { useUsername } from "@/lib/username";
import { useLiveQuery } from "@tanstack/react-db";
import { useMemo, useState } from "react";
import type * as schema from "../../src/schema/message";
import type { Props } from "./[roomId].server";

export default function RoomPage({ roomId }: Props) {
  const configCollection = useConfigCollection();
  const { username, setIsOpenDialog } = useUsername(configCollection);
  const effectiveRoomId = roomId;

  const [commentInput, setCommentInput] = useState("");

  const commentsCollection = useMemo(
    () => createCommentsCollection(effectiveRoomId),
    [effectiveRoomId],
  );

  const { data: comments, isLoading } = useLiveQuery((q) =>
    q
      .from({ comment: commentsCollection })
      .fn.select(({ comment }) => ({
        ...comment,
        createdAt: new Date(comment.createdAt),
      }))
      .orderBy(({ comment }) => comment.createdAt, "desc"),
  );

  const sendComment = () => {
    if (username == null) {
      setIsOpenDialog(true);
      return;
    }

    if (commentInput === "") return;
    const comment = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      content: commentInput,
      user: username,
      isOptimistic: true,
    } satisfies schema.Comment;

    commentsCollection.insert(comment);

    setCommentInput("");
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
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  sendComment();
                }
              }}
            />
            <Button onClick={sendComment}>送信</Button>
          </div>
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
