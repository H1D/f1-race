import { cpSync } from "fs";

await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: "dist",
  minify: true,
});

cpSync("public/index.html", "dist/index.html");
cpSync("src/boat/boat.png", "dist/boat.png");
cpSync("src/assets", "dist/assets", { recursive: true });
