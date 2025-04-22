import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/iframe",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Session Planner</title>
    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="stylesheet" href="/assets/index.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
    return new Response(html, {
      headers: {
        "content-type": "text/html",
        "x-frame-options": "ALLOWALL",
        "content-security-policy": "frame-ancestors *",
        "access-control-allow-origin": "*"
      },
    });
  }),
});

export default http;
