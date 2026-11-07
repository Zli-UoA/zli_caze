import { defineHandler, type InferProps } from "void";
import { requireAdminPage } from "@/server/principal";
import { listRooms } from "@/server/rooms";

export const loader = defineHandler(async (c) => {
  await requireAdminPage(c);

  const q = c.req.query("q") ?? "";
  return { rooms: await listRooms(q), q };
});

export type Props = InferProps<typeof loader>;
