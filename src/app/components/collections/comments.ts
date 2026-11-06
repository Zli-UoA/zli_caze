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
    live: "sse",
    state: commentsState,
    actions: ({ db, stream }) => ({
      addComment: {
        onMutate: (comment: Comment) => {
          db.collections.comments.insert(comment);
        },
        mutationFn: async (comment: Comment) => {
          const txid = crypto.randomUUID();
          await stream.append(
            JSON.stringify(
              commentsState.comments.insert({
                value: { ...comment, isOptimistic: false },
                headers: { txid },
              }),
            ),
          );
          await db.utils.awaitTxId(txid, 30_000);
        },
      },
    }),
  });

export type CommentsDB = ReturnType<typeof createCommentsDB>;

export const preloadCommentsDB = async (db: CommentsDB) => {
  const head = await db.stream.head();
  if (!head.exists) {
    await db.stream.create();
  }
  await db.preload();
};
