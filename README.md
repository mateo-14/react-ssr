# React ssr practice project

I made this project to practice React ssr without using any framework. 
It's like Next.js, every page is rendered on server and sent to client and it works with a simple file system routing.

## How's this work?
### Builds all pages both for client and server with esbuild. 
Both processes are different and generate different files. The server pages building is simple, just transpile jsx to js to work on node. The client pages building is more complex, for each page it generates a new temporary file that imports the page from the original file and also add a code to hydrate the page on client, finally it bundles all pages in a public folder.
The decision to generate a temporary file for each page was made to avoid esbuild include server side exports from pages on client bundle.

### Starts a server with node:http
The server is a simple http server that serves the server pages and client bundles. The server pages are served with a simple router that matches the request path with the page path and renders the page with react-dom/server. Rendered page string is sent to client with a simple html template, it includes a script tag that loads the client bundle for the requested page. It also includes a script tag with application/json type that contains the initial props for the page, this is used by the client to hydrate the page.


### TODO
I'm planning to add static rendering on build time, create parametrized routes,
and functions like getStaticProps and getServersideProps, css support, etc. Anyway, this is just a practice project, I'm not planning to use it in production.