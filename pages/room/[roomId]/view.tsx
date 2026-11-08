import {
  createCommentsDB,
  preloadCommentsDB,
  type CommentsDB,
} from "@/components/collections/comments";
import { Viewer } from "@/lib/viewer";
import { useLiveQuery } from "@tanstack/react-db";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@void/react";
import type { Props } from "./view.server";
import "../../../src/app/app.css";

const numericParam = (value: string | null, fallback: number, min: number, max: number): number => {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const CommentFeed = ({
  commentsDB,
  roomId,
  onComments,
}: {
  commentsDB: CommentsDB;
  roomId: string;
  onComments: (comments: Array<{ id: string; content: string }>) => void;
}) => {
  const { data: rawComments } = useLiveQuery({
    query: (q) =>
      q
        .from({ comment: commentsDB.collections.comments })
        .orderBy(({ comment }) => comment.createdAt, "desc"),
    queryKey: ["comments", roomId],
  });

  useEffect(() => {
    onComments(rawComments.map((comment) => ({ id: comment.id, content: comment.content })));
  }, [rawComments, onComments]);

  return null;
};

export default function RoomViewPage({ roomId }: Props) {
  const effectiveRoomId = roomId;
  const router = useRouter();

  const fontSize = numericParam(router.query.get("fontSize"), 120, 12, 400);
  const lineWidth = numericParam(router.query.get("lineWidth"), 15, 1, 100);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<Viewer | null>(null);
  const commentsRef = useRef<Set<string>>(new Set());
  const [commentsDB, setCommentsDB] = useState<CommentsDB | null>(null);
  const [generation, setGeneration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const db = createCommentsDB(effectiveRoomId);
    commentsRef.current.clear();
    setCommentsDB(db);
    setGeneration((value) => value + 1);
    setError(null);

    preloadCommentsDB(db).catch((reason: unknown) => {
      console.error(reason);
      if (!cancelled) setError("コメントの読み込みに失敗しました");
    });

    return () => {
      cancelled = true;
      db.close();
    };
  }, [effectiveRoomId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null) return;

    const viewer = new Viewer(canvas, { fontSize, lineWidth });
    viewRef.current = viewer;
    viewer.start();

    return () => {
      viewer.stop();
      if (viewRef.current === viewer) viewRef.current = null;
    };
  }, [fontSize, lineWidth]);

  const feedComments = useCallback((comments: Array<{ id: string; content: string }>) => {
    if (viewRef.current == null) return;

    const nextIds = new Set(comments.map((comment) => comment.id));
    const diff = commentsRef.current.symmetricDifference(nextIds);

    for (const commentId of diff) {
      const comment = comments.find((c) => c.id === commentId);
      if (comment != null) viewRef.current.addMessage(comment.content);
    }

    commentsRef.current = nextIds;
  }, []);

  return (
    <div className="relative min-h-lvh bg-black">
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="block h-lvh w-full object-contain"
      />
      {commentsDB != null && (
        <CommentFeed
          key={`${effectiveRoomId}:${generation}`}
          commentsDB={commentsDB}
          roomId={effectiveRoomId}
          onComments={feedComments}
        />
      )}
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
