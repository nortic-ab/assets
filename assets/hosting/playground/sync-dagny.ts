// Copies dagny's stylesheets from prod into playground/vendor/dagny: pnpm playground:sync
// Reads the version dagny is served with (the ?v= on its stylesheet links, e.g. 12.5.2) from a live
// organizer page, downloads the same files the page links before the organizer theme, and rewrites
// their url() references to absolute cloud.nortic.se URLs. Fonts (Apercu, Roboto) and images stay on
// Nortic's CDN and are never copied into the repo. Run it when dagny changes and commit the result.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const playground = path.dirname(fileURLToPath(import.meta.url))
const vendor = path.join(playground, 'vendor', 'dagny')
const cdn = 'https://cloud.nortic.se'
// In the order head.jsp links them; dagny.css comes after the legacy custom CSS, right before the
// organizer and event themes
const files = [
  'reset.css',
  '3pp/materialize/materialize.min.css',
  '3pp/ettrics/material-design-modal.css',
  '3pp/animate/animate.css',
  'dagny/dagny.css',
]

async function text(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok)
    throw new Error(`${res.status} ${url}`)
  return res.text()
}

async function sync(): Promise<void> {
  const page = await text('https://tickets.nortic.se/ticket/organizer/538')
  const version = page.match(/\/styles\/dagny\/dagny\.css\?v=([\w.-]+)/)?.[1]
  if (!version)
    throw new Error('Could not find the dagny version on the organizer page')

  // Relative @imports (dagny.css imports enhance.css) are downloaded too and stay relative
  const queue = [...files]
  const done = new Set<string>()
  while (queue.length) {
    const file = queue.shift()!
    if (done.has(file))
      continue
    done.add(file)
    const base = new URL(`${cdn}/styles/${file}`)
    let css = await text(`${base.href}?v=${version}`)
    for (const m of css.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?/g)) {
      if (!/^(?:https?:|\/\/)/.test(m[1]))
        queue.push(path.posix.join(path.posix.dirname(file), m[1]))
    }
    css = css.replace(/url\((['"]?)([^'"()]+)\1\)/g, (match, quote: string, ref: string) => {
      if (/^(?:data:|https?:|#)/.test(ref))
        return match
      return `url(${quote}${new URL(ref, base).href}${quote})`
    })
    const out = path.join(vendor, file)
    mkdirSync(path.dirname(out), { recursive: true })
    writeFileSync(out, css)
    process.stdout.write(`${file} ${css.length}\n`)
  }
  writeFileSync(path.join(vendor, 'VERSION'), `${version}\n`)
  process.stdout.write(`dagny ${version} -> ${path.relative(process.cwd(), vendor)}\n`)
}

sync().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
