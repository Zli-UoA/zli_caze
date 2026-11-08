import { defineHandler, type InferProps } from "void";
import { redirectTo } from "@/server/http";
import { requireAdminPage } from "@/server/principal";

export const loader = defineHandler(async (c) => {
  await requireAdminPage(c);
  redirectTo(c, "/admin/rooms");
  return {};
});

export type Props = InferProps<typeof loader>;
