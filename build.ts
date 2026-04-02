import { cpSync } from "fs";

await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: "dist",
  minify: true,
});

cpSync("public/index.html", "dist/index.html");
cpSync("src/boat/boat.png", "dist/boat.png");
cpSync("src/boat/boat-p1.png", "dist/boat-p1.png");
cpSync("src/boat/boat-p2.png", "dist/boat-p2.png");
cpSync("src/assets", "dist/assets", { recursive: true });
