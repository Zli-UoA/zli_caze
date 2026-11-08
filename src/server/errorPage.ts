const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const htmlErrorResponse = (
  status: 401 | 403 | 404,
  title: string,
  message: string,
  next = "/",
): Response =>
  new Response(
    `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | Caze</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #393e46; color: #eeeeee; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  main { width: min(32rem, calc(100% - 2rem)); background: #222831; border: 1px solid #4b5563; border-radius: 0.75rem; padding: 2rem; }
  h1 { margin: 0 0 0.75rem; font-size: 1.25rem; }
  p { margin: 0 0 1.5rem; color: #cbd5e1; line-height: 1.7; }
  a { color: #ffd600; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
  <a href="${escapeHtml(next)}">トップへ戻る</a>
</main>
</body>
</html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "referrer-policy": "no-referrer",
        "x-robots-tag": "noindex",
      },
    },
  );
