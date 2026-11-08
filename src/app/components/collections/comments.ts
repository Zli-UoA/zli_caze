import { createStateSchema } from "@durable-streams/state";
import { createStreamDB } from "@durable-streams/state/db";
import { comment as commentSchema, type Comment } from "src/schema/message";

export const commentsState = createStateSchema({
  comments: {
    schema: commentSchema,
    type: "comment",
    primaryKey: "id",
  },
});

export const createCommentsDB = (roomId: string) =>
  createStreamDB({
    streamOptions: {
      url: `${window.location.origin}/streams/${encodeURIComponent(roomId)}`,
      contentType: "application/json",
      batching: false,
    },
    // SSE is the production live mode. Temporary Cloudflare quick tunnels may
    // cancel the stream, in which case new comments appear after a reload.
    live: "sse",
    state: commentsState,
  });

export const appendComment = async (db: CommentsDB, comment: Comment) => {
  const txid = crypto.randomUUID();
  await db.stream.append(
    JSON.stringify(
      commentsState.comments.insert({
        value: { ...comment, isOptimistic: false },
        headers: { txid },
      }),
    ),
  );
  await db.utils.awaitTxId(txid, 15_000);
};

export type CommentsDB = ReturnType<typeof createCommentsDB>;

export const preloadCommentsDB = async (db: CommentsDB) => {
  // Rooms are created by the server, which also creates their stream. The
  // client must never create streams for arbitrary room IDs.
  await db.preload();
};
