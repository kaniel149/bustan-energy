/// <reference types="node" />
import { renderToPipeableStream } from 'react-dom/server'
import { PassThrough } from 'node:stream'
import App from './App'

/** Build-time rendering of the same public route tree used in the browser. */
export function render(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough()
    const chunks: Buffer[] = []
    let failed = false
    const timeout = setTimeout(() => {
      failed = true
      stream.abort()
      reject(new Error(`Prerender timed out: ${path}`))
    }, 30_000)
    output.on('data', (chunk: Buffer) => chunks.push(chunk))
    output.on('error', reject)
    output.on('end', () => {
      clearTimeout(timeout)
      if (!failed) resolve(Buffer.concat(chunks).toString('utf8'))
    })
    const stream = renderToPipeableStream(<App serverPath={path} />, {
      onAllReady() { stream.pipe(output) },
      onShellError(error) { clearTimeout(timeout); failed = true; reject(error) },
      onError(error) { failed = true; clearTimeout(timeout); reject(error) },
    })
  })
}
