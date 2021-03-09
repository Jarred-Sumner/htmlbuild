#!/usr/bin/env node

import childProcess from "child_process";
import esbuild from "esbuild";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { camelCase } from "lodash-es";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { HTML2ESBuild } from "../index";

const argv = yargs(hideBin(process.argv)).help(false).argv;
if (argv["help"] || !argv["$0"] || argv["-h"]) {
  childProcess.execSync("esbuild --help", { stdio: "inherit" });
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

if (!argv["_"][0]) {
  console.error("<html file path> is required.");
  process.exit(1);
}

const config = {
  publicPath: argv["public-path"] || process.cwd(),
  format: argv["format"] || "esm",
  outdir: path.normalize(argv["outdir"]),
};

// const outbase = argv["outbase"] || process.cwd();

let input = path.normalize(argv["_"][0]);

if (!existsSync(input)) {
  console.error("Expected", input, "to be an html file.");
  process.exit();
}

const source = readFileSync(input, "utf8");

const html = new HTML2ESBuild();
function resolve(...ars) {
  try {
    let normalize = path.normalize(...ars);
    return path.resolve(path.join(input, "../"), normalize);
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

const fwd = { write: Boolean(argv["write"] || true) };
for (let key in argv) {
  if (
    key === "$0" ||
    key === "_" ||
    key === "write-html" ||
    key === "write" ||
    key === "writeHtml" ||
    key === "$1"
  )
    continue;
  fwd[camelCase(key)] = argv[key];
}

if (!argv["public-path"]) {
  delete config.publicPath;
}

esbuild
  .build({
    ...fwd,
    ...html.generate(source, resolve),
    ...config,
  })
  .then((res) => {
    function resolveFrom(...args) {
      return path.resolve(...args);
    }

    const dest =
      argv["writeHtml"] === "false"
        ? path.join(process.cwd(), config.outdir, path.basename(input))
        : path.join(path.resolve(config.outdir));

    function resolveTo(...args) {
      return argv["publicPath"]
        ? argv["publicPath"] + "/" + path.join(...args)
        : path.relative(path.resolve(config.outdir), path.join(...args));
    }

    if (
      argv["writeHtml"] === "false" ||
      argv["write"]?.toString() === "false"
    ) {
      process.stdout.write(
        html.renderToString(res, config, resolveFrom, resolveTo)
      );
    } else {
      const out = path.join(dest, path.basename(input));
      writeFileSync(
        out,
        html.renderToString(res, config, resolveFrom, resolveTo)
      );
      console.log(res);
      console.log("Wrote to", out);
    }
  });
