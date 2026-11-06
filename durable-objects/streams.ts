import { StreamObject } from "@durable-streams/server-cloudflare";
import { defineDurableObject } from "void/durable";

export const Streams = defineDurableObject({
  name: "streams",
  class: StreamObject,
});

export default Streams;
