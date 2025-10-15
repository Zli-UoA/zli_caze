import z from "zod";

export const comment = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  content: z.string().max(100),
  user: z.string().max(100),
});
export type Comment = z.infer<typeof comment>;
