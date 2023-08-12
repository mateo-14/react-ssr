import http from 'node:http';
import { renderToString } from 'react-dom/server';
import path from 'node:path';
import esbuild from 'esbuild';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import mimes from 'mime-types';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

main();

async function main() {
  await buildPages();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
      const filePath = path.join(__dirname, 'dist', url.pathname);
      const stats = await fs.stat(filePath);

      if (!stats.isDirectory()) {
        res.writeHead(200, { 'Content-Type': mimes.lookup(filePath) });
        createReadStream(filePath).pipe(res);
        return;
      }
    } catch (err) {}

    try {
      const pagePath = path.join(__dirname, 'dist', 'pages', url.pathname, 'index.js');
      const stats = await fs.stat(pagePath);
      const props = {
        test: 'Hello world'
      };

      if (stats.isFile()) {
        const bundlePath = path.join('public', 'pages', url.pathname, 'index.js').replace(/\\/g, '/');
        
        import(pathToFileURL(pagePath)).then(({ default: page }) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html>
          <head lang="en">
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
            <script src="/${bundlePath}" type="module"></script>
            <script id="props-data" type="application/json">${JSON.stringify(props)}</script>
          </head>
          <body>
            <div id="root">${renderToString(page(props))}</div>
          </body>
        </html>`);
        });

        return;
      }
    } catch (err) {}

    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('Not found :(');
  });

  server.listen(3000, () => {
    console.log('Server started on port 3000');
  });
}

async function walk(dir, cb) {
  const entries = await fs.readdir(dir);

  for (const entry of entries) {
    const fpath = path.join(dir, entry);
    const stats = await fs.stat(fpath);
    if (stats.isDirectory()) {
      await walk(fpath, cb);
    } else {
      cb(fpath);
    }
  }
}

async function buildPages() {
  try {
    await Promise.allSettled([
      fs.rm(path.join(__dirname, 'dist'), { recursive: true }),
      fs.rm(path.join(__dirname, '.temp'), { recursive: true })
    ]);
  } catch {}

  const pages = [];

  await walk(path.join(__dirname, 'src', 'pages'), (pagePath) => {
    if (/\.js$|\.jsx$/.test(path.extname(pagePath)) && !path.basename(pagePath).startsWith('.')) {
      pages.push(pagePath);
    }
  });

  // Build client pages
  const clientPages = [];
  for await (const page of pages) {
    // Create temps entry point for each page, this will remove exported server side functions, and generate code to hydrate each page
    try {
      const basename = path.basename(page);

      const clientPath = path.join(__dirname, '.temp', page.replace(__dirname, ''));
      await fs.mkdir(clientPath.replace(basename, ''), { recursive: true });

      const relativePath = path.relative(clientPath.replace(basename, ''), page);
      const relativeClientPath = path.relative(clientPath.replace(basename, ''), path.join(__dirname, 'src', 'client.js'));

      await fs.writeFile(
        clientPath,
        `import { hydrate } from '${relativeClientPath.replace(/\\/g, '/')}';
        import Page from '${relativePath.replace(/\\/g, '/')}';
        hydrate(Page);`
      );

      clientPages.push(clientPath);
    } catch {}
  }

  await esbuild.build({
    entryPoints: [
      ...clientPages.map((page) => {
        return {
          in: page,
          out: path.join(path.dirname(page).replace(path.join(__dirname, '.temp', 'src'), ''), 'index')

        }
      })
    ],
    bundle: true,
    outdir: path.join(__dirname, 'dist', 'public'),
    platform: 'browser',
    format: 'esm',
    jsx: 'automatic',
    splitting: true,
    treeShaking: true,
    minify: true
  });

  await fs.rm(path.join(__dirname, '.temp'), { recursive: true });
 
  // Build server pages
  await esbuild.build({
    entryPoints: pages,
    bundle: true,
    outdir: path.join(__dirname, 'dist', 'pages'),
    platform: 'node',
    jsx: 'automatic',
    format: 'esm',
    external: ['react', 'react-dom', 'react-dom/server']
  });
}
