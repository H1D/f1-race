import { cpSync, existsSync } from "fs";

// Build on startup
await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: "dist",
  sourcemap: "inline",
});
cpSync("public/index.html", "dist/index.html");

Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`dist${path}`);
    return new Response(file);
  },
});

console.log("Dev server running at http://localhost:3000");
