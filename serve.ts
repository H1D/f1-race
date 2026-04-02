import { cpSync } from "fs";

// Build on startup
await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: "dist",
  sourcemap: "inline",
});
cpSync("public/index.html", "dist/index.html");
cpSync("src/boat/boat.png", "dist/boat.png");
cpSync("src/boat/boat-p1.png", "dist/boat-p1.png");
cpSync("src/boat/boat-p2.png", "dist/boat-p2.png");
cpSync("src/assets", "dist/assets", { recursive: true });

const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`dist${path}`);
    return new Response(file);
  },
});

console.log(`Dev server running at http://localhost:${port}`);
