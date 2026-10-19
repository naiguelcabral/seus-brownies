import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, extname } from 'node:path'

export async function startPreview(
  root: string,
  aliases: Record<string, string> = {},
) {
  const server = createServer()
  const temporaryDirectory = await mkdtemp(
    resolve(tmpdir(), 'cacau-product-editor-'),
  )
  // Explicit config and empty env directory: no application config, auth or .env.
  await build({
    configFile: false,
    root: resolve(root),
    envDir: temporaryDirectory,
    plugins: [react(), tailwindcss()],
    resolve: { alias: aliases },
    logLevel: 'error',
    build: { outDir: resolve(temporaryDirectory, 'dist'), emptyOutDir: true },
  })
  server.on('request', (request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    const file = resolve(
      temporaryDirectory,
      'dist',
      path === '/' ? 'index.html' : path.slice(1),
    )
    if (!file.startsWith(resolve(temporaryDirectory, 'dist') + '/')) {
      response.writeHead(403).end()
      return
    }
    void readFile(file)
      .then((body) => {
        response.setHeader(
          'Content-Type',
          extname(file) === '.js'
            ? 'text/javascript'
            : extname(file) === '.css'
              ? 'text/css'
              : 'text/html',
        )
        response.end(body)
      })
      .catch(() => response.writeHead(404).end())
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Servidor local indisponível.')
  const url = `http://127.0.0.1:${address.port}`

  return {
    url,
    close: async () => {
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      )
      await rm(temporaryDirectory, { recursive: true, force: true })
    },
  }
}
