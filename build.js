const esbuild = require("esbuild");

esbuild.buildSync({
  entryPoints: ["./index.ts"],
  platform: "neutral",
  bundle: false,
  format: "esm",
  write: true,
  outfile: "./index.mjs",
});

esbuild.buildSync({
  entryPoints: ["./bin/cli.ts"],
  platform: "node",
  bundle: true,
  minify: true,
  format: "esm",
  write: true,
  minifySyntax: true,
  external: ["esbuild", "path"],
  outfile: "./bin/cli.mjs",
});
