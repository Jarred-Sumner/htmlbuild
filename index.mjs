import * as serializer from "dom-serializer";
import {
  DomHandler,
  DomUtils,
  parseDocument,
  Parser
} from "htmlparser2";
import * as path from "path";
class HTML2ESBuild {
  constructor() {
    this.scripts = new Map();
    this.links = new Map();
  }
  generate(source, resolve) {
    const dom = parseDocument(source);
    this.dom = dom;
    const config = {
      bundle: true,
      metafile: true,
      entryPoints: []
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
      if ((!link.attribs["rel"] || link.attribs["rel"] === "stylesheet") && link.attribs["href"] && !link.attribs["href"].includes("://")) {
        src = resolve(link.attribs["href"]);
        this.links.set(src, link);
        config.entryPoints.push(src);
      }
    }
    this.config = config;
    return config;
  }
  renderToString(build, config = this.config, resolveFrom, resolveTo) {
    if (!build.metafile)
      throw "Build is missing metafile.";
    const {links, scripts} = this;
    let meta = build.metafile;
    const cssOutputs = new Map();
    let file;
    for (let output in meta.outputs) {
      file = meta.outputs[output];
      if (path.extname(output) === ".css") {
        cssOutputs.set(output, file);
      }
    }
    const stylesheetsToInsert = new Map();
    const prefix = config.publicPath ? config.publicPath : "";
    for (let output in meta.outputs) {
      file = meta.outputs[output];
      if (!file.entryPoint)
        continue;
      const entryPoint = resolveFrom(file.entryPoint);
      console.log(output);
      if (scripts.has(entryPoint)) {
        const ext = path.extname(output);
        const basename = output.substring(0, output.length - ext.length);
        const cssName = basename + ".css";
        const script = scripts.get(entryPoint);
        if (cssOutputs.has(cssName) && (!cssOutputs.get(cssName).entryPoint || !links.has(cssOutputs.get(cssName).entryPoint))) {
          stylesheetsToInsert.set(cssName, script);
        }
        script.attribs["src"] = resolveTo(output);
      } else if (links.has(entryPoint)) {
        links.get(entryPoint).attribs["href"] = resolveTo(output);
      }
    }
    for (let [stylesheetName, above] of stylesheetsToInsert.entries()) {
      var parser = new Parser(new DomHandler((err, elems) => {
        DomUtils.prepend(above, elems[0]);
      }));
      parser.write(`<link rel="stylesheet" href="${resolveTo(stylesheetName)}" />`);
      parser.end();
    }
    return serializer.default(this.dom, {});
  }
}
export {
  HTML2ESBuild
};
