import { createCommentsDB, preloadCommentsDB } from "@/components/collections/comments";
import { Viewer } from "@/lib/viewer";
import { useLiveQuery } from "@tanstack/react-db";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const commentsDB = useMemo(() => createCommentsDB(effectiveRoomId), [effectiveRoomId]);
  const commentsCollection = commentsDB.collections.comments;

  useEffect(() => {
    let cancelled = false;
    commentsRef.current.clear();
    preloadCommentsDB(commentsDB).catch((reason: unknown) => {
      console.error(reason);
      if (!cancelled) setError("コメントの読み込みに失敗しました");
    });
    return () => {
      cancelled = true;
      commentsDB.close();
    };
  }, [commentsDB]);

  const { data: rawComments } = useLiveQuery({
    query: (q) =>
      q.from({ comment: commentsCollection }).orderBy(({ comment }) => comment.createdAt, "desc"),
    queryKey: ["comments", effectiveRoomId],
  });
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

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={1920} height={1080} className="w-full" />
      {error != null && (
        <div
          role="alert"
          className="fixed left-4 top-4 rounded-md bg-brand-dark px-4 py-2 text-sm text-red-400"
        >
          {error}
        </div>
      )}
    </div>
  );
}
