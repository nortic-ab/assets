// Local server for the dagny playground: pnpm playground (http://localhost:5178/playground/).
// Serves assets/hosting as is, with three additions:
// - pages and partials under /playground get their <!-- #include name --> lines replaced by
//   playground/partials/<name>.html, so every page shares one copy of dagny's chrome;
// - a missing organizer or event stylesheet/script answers with an empty file, like the Firebase
//   rewrites in firebase.json, so a page never sees a 404 for a theme that does not exist;
// - /playground/api/themes lists the themes on disk and /playground/api/changes streams file changes
//   (server-sent events) so the playground reloads when a theme or a page is saved.
// Nothing is cached. The playground is never deployed (firebase.json ignores playground/**).
import { existsSync, readdirSync, readFileSync, statSync, watch } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const playground = path.dirname(fileURLToPath(import.meta.url))
const hosting = path.dirname(playground)
const port = Number(process.env.PLAYGROUND_PORT || 5178)

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.md': 'text/plain; charset=utf-8',
}

const themeFile = /^\/custom-(css|js)\/(prod|staging)\/eventsystem\/organizers\/\d+\/(?:events\/\d+\/)?(styles\.css|script\.js)$/

function expandIncludes(html: string, depth = 0): string {
  if (depth > 5)
    throw new Error('include nesting deeper than 5')
  return html.replace(/<!-- #include ([\w-]+) -->/g, (_, name: string) => {
    const file = path.join(playground, 'partials', `${name}.html`)
    if (!existsSync(file))
      return `<!-- playground: partials/${name}.html is missing -->`
    return expandIncludes(readFileSync(file, 'utf8'), depth + 1)
  })
}

// The name a theme's header comment starts with: "VårVinterKalaset (organizer 4994): organizer
// stylesheet…" gives "VårVinterKalaset". The header is a comment before the first rule that names an
// organizer (a file can start with an @import and its own comment); files without one get no name.
function themeTitle(file: string): string {
  if (!existsSync(file))
    return ''
  const source = readFileSync(file, 'utf8')
  const beforeFirstRule = source.slice(0, source.search(/\{/) + 1 || undefined)
  const comments = [...beforeFirstRule.matchAll(/\/\*([\s\S]*?)\*\//g)].map(m => m[1])
  const header = comments.find(c => /organi[sz]er/i.test(c)) || comments[0]
  if (!header)
    return ''
  const line = header.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim()).find(l => /\p{L}/u.test(l)) || ''
  return line.split(/\s+\((?:organi[sz]er|event)|:\s/i)[0].replace(/^"|"$/g, '').trim().slice(0, 60)
}

function listThemes() {
  const result: Record<string, unknown[]> = {}
  for (const env of ['prod', 'staging']) {
    const orgs = new Map<string, { id: string, title: string, css: boolean, js: boolean, events: Map<string, { id: string, title: string, css: boolean, js: boolean }> }>()
    for (const kind of ['css', 'js'] as const) {
      const root = path.join(hosting, `custom-${kind}`, env, 'eventsystem', 'organizers')
      if (!existsSync(root))
        continue
      for (const org of readdirSync(root).filter(d => /^\d+$/.test(d))) {
        const orgDir = path.join(root, org)
        const file = path.join(orgDir, kind === 'css' ? 'styles.css' : 'script.js')
        const entry = orgs.get(org) || { id: org, title: '', css: false, js: false, events: new Map() }
        if (existsSync(file)) {
          entry[kind] = true
          entry.title ||= themeTitle(file)
        }
        const eventsDir = path.join(orgDir, 'events')
        if (existsSync(eventsDir)) {
          for (const ev of readdirSync(eventsDir).filter(d => /^\d+$/.test(d))) {
            const evFile = path.join(eventsDir, ev, kind === 'css' ? 'styles.css' : 'script.js')
            if (!existsSync(evFile))
              continue
            const evEntry = entry.events.get(ev) || { id: ev, title: '', css: false, js: false }
            evEntry[kind] = true
            evEntry.title ||= themeTitle(evFile)
            entry.events.set(ev, evEntry)
          }
        }
        orgs.set(org, entry)
      }
    }
    result[env] = [...orgs.values()]
      .filter(o => o.css || o.js || o.events.size)
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map(o => ({ ...o, events: [...o.events.values()].sort((a, b) => Number(a.id) - Number(b.id)) }))
  }
  return result
}

const listeners = new Set<(file: string) => void>()
for (const dir of ['custom-css', 'custom-js', 'playground']) {
  watch(path.join(hosting, dir), { recursive: true }, (_, file) => {
    // The Local Overrides copies change on every build and are not what the playground shows
    if (file && !file.includes('nortic-assets.web.app'))
      listeners.forEach(fn => fn(`${dir}/${file}`))
  })
}

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const pathname = decodeURIComponent(url.pathname)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (pathname === '/' || pathname === '/playground') {
    res.writeHead(302, { Location: '/playground/' })
    return res.end()
  }
  if (pathname === '/playground/api/themes') {
    res.writeHead(200, { 'Content-Type': types['.json'] })
    return res.end(JSON.stringify(listThemes()))
  }
  if (pathname === '/playground/api/changes') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive' })
    res.write(': connected\n\n')
    let timer: NodeJS.Timeout | undefined
    const send = (file: string) => {
      // Editors write a file in several steps; send one event per burst
      clearTimeout(timer)
      timer = setTimeout(() => res.write(`data: ${JSON.stringify({ file })}\n\n`), 120)
    }
    listeners.add(send)
    req.on('close', () => listeners.delete(send))
    return
  }

  let file = path.join(hosting, pathname)
  if (!file.startsWith(hosting)) {
    res.writeHead(403)
    return res.end()
  }
  if (existsSync(file) && statSync(file).isDirectory())
    file = path.join(file, 'index.html')

  if (!existsSync(file)) {
    const theme = pathname.match(themeFile)
    if (theme) {
      res.writeHead(200, { 'Content-Type': types[path.extname(pathname)] })
      return res.end('')
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end(`Not found: ${pathname}`)
  }

  const ext = path.extname(file).toLowerCase()
  const type = types[ext] || 'application/octet-stream'
  if (ext === '.html' && file.startsWith(playground)) {
    try {
      res.writeHead(200, { 'Content-Type': type })
      return res.end(expandIncludes(readFileSync(file, 'utf8')))
    }
    catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end(String(error))
    }
  }
  res.writeHead(200, { 'Content-Type': type })
  res.end(readFileSync(file))
}).listen(port, () => {
  process.stdout.write(`dagny playground: http://localhost:${port}/playground/\n`)
})
