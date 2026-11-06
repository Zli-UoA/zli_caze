import { defineHandler, type InferProps } from "void";

export const ssr = false;

export const loader = defineHandler(async (c) => {
  const roomId = c.req.param("roomId");
  return { roomId };
});

export type Props = InferProps<typeof loader> & { roomId: string };
