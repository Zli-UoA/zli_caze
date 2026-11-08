import z from "zod";

export const comment = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  content: z.string().min(1).max(100),
  user: z.string().min(1).max(100),
  authorId: z.string().min(1).max(128),
  authorType: z.enum(["member", "guest", "admin"]),
  /** AuthZ profile icon snapshot. Absent on comments created before avatars. */
  authorImage: z.string().max(2048).nullable().optional(),
  isOptimistic: z.boolean(),
});
export type Comment = z.infer<typeof comment>;

/** Client-supplied draft. Author fields are always stamped by the server. */
export const commentDraft = comment.omit({
  authorId: true,
  authorType: true,
  authorImage: true,
});
export type CommentDraft = z.infer<typeof commentDraft>;
