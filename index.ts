import * as serializer from "dom-serializer";
import {
  DomHandler,
  DomUtils,
  parseDocument,
  ElementType,
  Parser,
} from "htmlparser2";
import { BuildOptions, BuildResult, Metafile } from "esbuild";
import path from "path";

export class HTML2ESBuild {
  dom: ReturnType<typeof parseDocument>;

  generate(
    source: string,
    resolve: (...relativePath: string[]) => string
  ): BuildOptions {
    const dom = parseDocument(source);
    this.dom = dom;

    const config: BuildOptions = {
      bundle: true,
      metafile: true,
      entryPoints: [],
    };

    let src = "";
    for (let script of DomUtils.getElementsByTagName("script", dom)) {
      src = script.attribs["src"];
      if (src && !src.includes("://")) {
        src = resolve(src);
        this.scripts.set(src, script);
        config.entryPoints.push(src);
      }
    }

    for (let link of DomUtils.getElementsByTagName("link", dom)) {
      if (
        (!link.attribs["rel"] || link.attribs["rel"] === "stylesheet") &&
        link.attribs["href"] &&
        !link.attribs["href"].includes("://")
      ) {
        src = resolve(link.attribs["href"]);
        this.links.set(src, link);
        config.entryPoints.push(src);
      }
    }

    this.config = config;

    return config;
  }
  scripts: Map<string, ReturnType<typeof DomUtils.getElementById>> = new Map();
  links: Map<string, ReturnType<typeof DomUtils.getElementById>> = new Map();
  config: BuildOptions;

  renderToString(build: BuildResult, config: BuildOptions = this.config) {
    if (!build.metafile) throw "Build is missing metafile.";

    const { links, scripts } = this;
    let meta: Metafile = build.metafile;
    const cssOutputs = new Map();
    let file;
    for (let output in meta.outputs) {
      file = meta.outputs[output];

      if (path.extname(output) === ".css") {
        cssOutputs.set(output, file);
      }
    }

    const stylesheetsToInsert = new Map<
      string,
      ReturnType<typeof DomUtils.getElementById>
    >();
    const prefix = config.publicPath ? config.publicPath : "";

    for (let output in meta.outputs) {
      file = meta.outputs[output];
      if (!file.entryPoint) continue;

      if (scripts.has(file.entryPoint)) {
        // CSS imports from JS
        const ext = path.extname(output);
        const basename = output.substring(0, output.length - ext.length);
        const cssName = basename + ".css";
        const script = scripts.get(file.entryPoint);

        if (
          cssOutputs.has(cssName) &&
          (!cssOutputs.get(cssName).entryPoint ||
            !links.has(cssOutputs.get(cssName).entryPoint))
        ) {
          stylesheetsToInsert.set(cssName, script);
        }

        script.attribs["src"] = prefix + output;
      } else if (links.has(file.entryPoint)) {
        links.get(file.entryPoint).attribs["href"] = prefix + output;
      }
    }

    for (let [stylesheetName, above] of stylesheetsToInsert.entries()) {
      var parser = new Parser(
        new DomHandler((err, elems) => {
          DomUtils.prepend(above, elems[0]);
        })
      );
      parser.write(
        `<link rel="stylesheet" href="${prefix + stylesheetName}" />`
      );
      parser.end();
    }

    return serializer.default(this.dom, {});
  }
}
