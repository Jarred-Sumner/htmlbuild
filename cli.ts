#!/usr/bin/env node
import yargs from "yargs";
import childProcess from "child_process";
import { HTML2ESBuild } from "./index";
import { hideBin } from "yargs/helpers";
import * as esbuild from "esbuild";
import path from "path";
import { existsSync, fstat, readFileSync, statSync, writeFileSync } from "fs";
import { camelCase } from "lodash-es";
const argv = yargs(hideBin(process.argv)).argv;

if (argv["--help"] || !argv["$0"] || argv["-h"]) {
  process.stdout.write(
    childProcess
      .execSync("esbuild --help", { stdio: "inherit" })
      .toString("utf-8")
  );
  process.exit();
}

if (!argv["outdir"]) {
  console.error("--outdir flag is required.");
  process.exit(1);
}

if (typeof argv["outdir"] !== "string") {
  console.error("--outdir flag must be a string.");
  process.exit(1);
}

const config = {
  publicPath: argv["public-path"] || undefined,
  format: argv["format"] || "esm",
  outdir: path.normalize(argv["outdir"]),
};

let input = path.normalize(argv["$0"]);

if (!path.isAbsolute(input)) {
  input = path.join(process.cwd(), input);
}

if (!existsSync(input)) {
  console.error("Expected", input, "to be an html file.");
  process.exit();
}

const source = readFileSync(input, "utf8");

const html = new HTML2ESBuild();
function resolve(...ars) {
  try {
    return path.resolve(...ars);
  } catch (exception) {
    console.error(
      "Could not find",
      ...ars.join("/"),
      "(resolved as",
      path.join(...ars),
      ")"
    );
    process.exit(1);
  }
}

const fwd = { write: argv["write"] || true };
for (let key in argv) {
  if (key === "$0" || key === "_" || key === "write-html") continue;
  fwd[camelCase(key)] = argv[key];
}

const res = esbuild.buildSync({
  ...fwd,
  ...html.generate(source, resolve),
  ...config,
});

if (argv["write-html"] === "false") {
  process.stdout.write(html.renderToString(res, config));
} else {
  const dest = path.join(process.cwd(), config.outdir, input);
  writeFileSync(dest, html.renderToString(res, config));
  console.log("Wrote to", dest);
}
process.exit();
