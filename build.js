const esbuild = require("esbuild");

esbuild.buildSync({
  entryPoints: ["./index.ts"],
  platform: "node",
  bundle: false,
  write: true,
  outfile: "./index.js",
});

esbuild.buildSync({
  entryPoints: ["./cli.ts"],
  platform: "node",
  bundle: true,
  format: "cjs",
  write: true,
  minifySyntax: true,
  external: ["esbuild"],
  outfile: "./cli.js",
});
