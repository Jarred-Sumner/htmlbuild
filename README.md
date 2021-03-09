# htmlbuild

Configure & run esbuild on `<script>` and `<link>` used in an HTML file, then output an updated HTML file with the results.

## Installation

```bash
npm install -g @jarred/htmlbuild
```

```yarn
yarn global add @jarred/htmlbuild
```

## Usage

```
# All additional flags are forwarded to esbuild.
htb index.html --outdir=dist
htmlbuild index.html --outdir=dist
```

This lets you use an HTML file to configure esbuild.

Given an HTML file like this:

```html
<html>
  <head>
    <link href="foo.css" rel="stylesheet" />
    <!- Notice the TypeScript: -->
    <script src="./index.ts"></script>
    <script src="./deep/so/very/deep.ts"></script>
  </head>

  <body>
    HI!
  </body>
</html>
```

`htmlbuild` parses the HTML and turns each `<script>` or `<link rel="stylsheet">` into an `entryPoint`. That example generates a config that looks like this:

```ts
{
  bundle: true,
  metafile: true,
  entryPoints: [
    '/Users/jarredsumner/Code/htmlbuild/test-dir/index.js',
    '/Users/jarredsumner/Code/htmlbuild/test-dir/deep/so/very/deep.ts',
    '/Users/jarredsumner/Code/htmlbuild/test-dir/foo.css'
  ]
}
```

Then, it runs `esbuild` with any flags you passed in. Using esbuild's metadata, it produces a new HTML file that looks like this:

```html
<html>
  <head>
    <link href="foo.css" rel="stylesheet" />
    <link rel="stylesheet" href="index.css" />
    <script src="index.js"></script>
    <script src="deep/so/very/deep.js"></script>
  </head>

  <body>
    HI!
  </body>
</html>
```

Notice the extra `index.css`?

That's because `index.ts` imported `index.css`:

```ts
import "./index.css";

console.log(
  "It imported the index.css file I imported into the .html file automatically"
);
```
