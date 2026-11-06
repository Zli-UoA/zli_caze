import { createCommentsDB, preloadCommentsDB } from "@/components/collections/comments";
import { Viewer } from "@/lib/viewer";
import { useLiveQuery } from "@tanstack/react-db";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "@void/react";
import type { Props } from "./view.server";
import "../../../src/app/app.css";

export const layout = false;

export default function RoomViewPage({ roomId }: Props) {
  const effectiveRoomId = roomId;
  const router = useRouter();

  const fontSize = router.query.get("fontSize");
  const lineWidth = router.query.get("lineWidth");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<Viewer | null>(null);
  const commentsRef = useRef<Set<string>>(new Set());

  const commentsDB = useMemo(() => createCommentsDB(effectiveRoomId), [effectiveRoomId]);
  const commentsCollection = commentsDB.collections.comments;

  useEffect(() => {
    void preloadCommentsDB(commentsDB);
    return () => commentsDB.close();
  }, [commentsDB]);

  const { data: rawComments } = useLiveQuery((q) =>
    q.from({ comment: commentsCollection }).orderBy(({ comment }) => comment.createdAt, "desc"),
  );
  const comments = rawComments.map((comment) => ({
    ...comment,
    createdAt: new Date(comment.createdAt),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null) return;

    const viewer = new Viewer(canvas, {
      ...(fontSize != null ? { fontSize: Number(fontSize) } : {}),
      ...(lineWidth != null ? { lineWidth: Number(lineWidth) } : {}),
    });
    viewRef.current = viewer;
    viewer.start();
  }, [fontSize, lineWidth]);

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

  return <canvas ref={canvasRef} width={1920} height={1080} className="w-full" />;
}
