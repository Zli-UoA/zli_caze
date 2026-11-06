import z from "zod";

export const comment = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  content: z.string().min(1).max(100),
  user: z.string().min(1).max(100),
  isOptimistic: z.boolean(),
});
export type Comment = z.infer<typeof comment>;
