import { Viewer } from "@/lib/viewer";
import { useEffect, useRef } from "react";
import type { Route } from "./+types/_app.room.$roomId";
import { useLiveQuery } from "@tanstack/react-db";
import { createCommentsCollection } from "@/components/collections/comments";

export const clientLoader = async ({ params }: Route.LoaderArgs) => {
  const roomId = params.roomId;

  const commentsCollection = createCommentsCollection(roomId);

  return { roomId, commentsCollection };
};

export default ({ loaderData }: Route.ComponentProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<Viewer | null>(null);
  const commentsRef = useRef<Set<string>>(new Set());

  const { data: comments } = useLiveQuery((q) =>
    q
      .from({ comment: loaderData.commentsCollection })
      .fn.select(({ comment }) => ({
        ...comment,
        createdAt: new Date(comment.createdAt),
      }))
      .orderBy(({ comment }) => comment.createdAt, "desc"),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null) return;

    const viewer = new Viewer(canvas);
    viewRef.current = viewer;
    viewer.start();
  }, []);

  useEffect(() => {
    if (viewRef.current == null) return;

    const newCommentsIdsSet = new Set<string>(comments.map((c) => c.id));
    const diff = commentsRef.current.symmetricDifference(newCommentsIdsSet);

    for (const commentId of diff) {
      const comment = comments.find((c) => c.id === commentId);
      if (comment == null) continue;

      viewRef.current.addMessage(comment.content);
    }

    commentsRef.current = new Set<string>(comments.map((c) => c.id));
  }, [comments]);

  return (
    <canvas ref={canvasRef} width={1920} height={1080} className="w-full" />
  );
};
