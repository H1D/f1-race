import { cpSync } from "fs";

await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: "dist",
  minify: true,
});

cpSync("public/index.html", "dist/index.html");
