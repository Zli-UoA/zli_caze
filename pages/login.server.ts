import { defineHandler, type InferProps } from "void";
import { redirectTo, safeNext } from "@/server/http";
import { getContextPrincipal } from "@/server/principal";

export const loader = defineHandler(async (c) => {
  const principal = await getContextPrincipal(c);
  if (principal != null) {
    redirectTo(c, safeNext(c.req.query("next")));
  }
  return {};
});

export type Props = InferProps<typeof loader>;
