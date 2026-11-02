/*
 * The playground shell: pick environment, organizer, event, page and width; the page is shown in an
 * iframe with the chosen theme (runtime/page.js links it). The choice lives in the URL hash, so a view
 * can be bookmarked or sent on. The iframe reloads (keeping its scroll position) whenever a theme or
 * a playground file is saved (serve.ts streams the changes).
 */
;(function () {
  'use strict'

  // Every page under pages/, grouped as in the menu. Add new pages here.
  const PAGES = [
    { group: 'Organisatör', id: 'organizer', title: 'Organisatörssida (eventkort)' },
    { group: 'Organisatör', id: 'organizer-calendar', title: 'Organisatörssida med kalender' },
    { group: 'Organisatör', id: 'organizer-confirmation', title: 'Orderbekräftelsen efter köp' },
    { group: 'Event', id: 'event-calendar', title: 'Event med kalender, alla radlägen och biljettkort' },
    { group: 'Event', id: 'event-list', title: 'Event utan kalender (beskrivning i heron)' },
    { group: 'Event', id: 'event-dateless', title: 'Festivalpass utan datum (Löpande föreställningar)' },
    { group: 'Event', id: 'event-addon-content', title: 'Endast tillval (i den öppna raden)' },
    { group: 'Event', id: 'event-basket-cart', title: 'Arrangörens varukorg (Din order)' },
    { group: 'Event', id: 'event-arena', title: 'Numrerade platser (arenasidan)' },
    { group: 'Kassa', id: 'checkout', title: 'Kassan (tillval, order, försäkring, Kivra)' },
    { group: 'Kassa', id: 'checkout-addon-step', title: 'Tillvalssteget före betalningen' },
  ]
  const WIDTHS = [1440, 1280, 1024, 768, 600, 390, 360, 320]

  const $ = id => document.getElementById(id)
  const els = {
    env: $('env'),
    org: $('org'),
    event: $('event'),
    eventId: $('event-id'),
    page: $('page'),
    width: $('width'),
    widths: $('widths'),
    theme: $('theme'),
    js: $('js'),
    compare: $('compare'),
    open: $('open'),
    actions: $('actions'),
    stage: $('stage'),
    status: $('status'),
  }
  let themes = { prod: [], staging: [] }

  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1))
    return {
      env: h.get('env') || 'prod',
      org: h.get('org') || '',
      event: h.get('event') || '',
      page: h.get('page') || 'event-calendar',
      width: Number(h.get('w')) || 1280,
      theme: h.get('theme') !== '0',
      js: h.get('js') !== '0',
      compare: h.get('compare') === '1',
    }
  }

  function state() {
    return {
      env: els.env.value,
      org: els.org.value,
      event: els.eventId.value.trim() || els.event.value,
      page: els.page.value,
      width: Number(els.width.value) || 1280,
      theme: els.theme.checked,
      js: els.js.checked,
      compare: els.compare.checked,
    }
  }

  function writeHash(s) {
    const h = new URLSearchParams({ env: s.env, org: s.org, event: s.event, page: s.page, w: String(s.width) })
    if (!s.theme)
      h.set('theme', '0')
    if (!s.js)
      h.set('js', '0')
    if (s.compare)
      h.set('compare', '1')
    history.replaceState(null, '', `#${h}`)
  }

  function pageUrl(s, withTheme) {
    const q = new URLSearchParams({ env: s.env, org: s.org, event: s.event })
    if (!withTheme || !s.theme)
      q.set('theme', '0')
    if (!withTheme || !s.js)
      q.set('js', '0')
    return `pages/${s.page}.html?${q}`
  }

  function fillOrgs(selected) {
    const list = themes[els.env.value] || []
    els.org.replaceChildren(new Option('– ingen (dagny) –', ''))
    for (const o of list) {
      const flags = [o.css && 'css', o.js && 'js'].filter(Boolean).join('+')
      els.org.add(new Option(`${o.id} ${o.title || ''}${flags ? ` (${flags})` : ''}`.trim(), o.id))
    }
    els.org.value = list.some(o => o.id === selected) ? selected : ''
  }

  function fillEvents(selected) {
    const org = (themes[els.env.value] || []).find(o => o.id === els.org.value)
    els.event.replaceChildren(new Option('– inget eventtema –', ''))
    for (const e of org?.events || []) {
      const flags = [e.css && 'css', e.js && 'js'].filter(Boolean).join('+')
      els.event.add(new Option(`${e.id} ${e.title || ''} (${flags})`.trim(), e.id))
    }
    const known = (org?.events || []).some(e => e.id === selected)
    els.event.value = known ? selected : ''
    els.eventId.value = selected && !known ? selected : ''
  }

  function fillPages(selected) {
    els.page.replaceChildren()
    for (const group of [...new Set(PAGES.map(p => p.group))]) {
      const og = document.createElement('optgroup')
      og.label = group
      for (const p of PAGES.filter(p => p.group === group))
        og.append(new Option(p.title, p.id))
      els.page.append(og)
    }
    els.page.value = PAGES.some(p => p.id === selected) ? selected : PAGES[0].id
  }

  function fillWidths() {
    for (const w of WIDTHS) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = String(w)
      b.addEventListener('click', () => {
        els.width.value = String(w)
        render()
      })
      els.widths.append(b)
    }
  }

  function frame(src, label, width) {
    const wrap = document.createElement('div')
    wrap.className = 'frame'
    const caption = document.createElement('span')
    caption.textContent = label
    const iframe = document.createElement('iframe')
    iframe.src = src
    iframe.style.width = `${width}px`
    iframe.addEventListener('load', () => {
      if (iframe.dataset.scroll) {
        iframe.contentWindow.scrollTo(0, Number(iframe.dataset.scroll))
        delete iframe.dataset.scroll
      }
      if (iframe === els.stage.querySelector('iframe'))
        fillActions(iframe)
    })
    wrap.append(caption, iframe)
    return wrap
  }

  function fillActions(iframe) {
    els.actions.replaceChildren()
    let list = []
    try {
      list = JSON.parse(iframe.contentDocument.getElementById('pg-actions')?.textContent || '[]')
    }
    catch {}
    for (const a of list) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = a.label
      b.title = a.name
      b.addEventListener('click', () => {
        els.stage.querySelectorAll('iframe').forEach(f => f.contentWindow.postMessage({ pg: 'action', name: a.name }, location.origin))
      })
      els.actions.append(b)
    }
  }

  function render() {
    const s = state()
    writeHash(s)
    els.widths.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.textContent) === s.width)))
    els.open.href = pageUrl(s, true)
    const org = s.org ? `${s.env} ${s.org}${s.event ? ` / ${s.event}` : ''}` : 'dagny utan tema'
    const frames = [frame(pageUrl(s, true), `${org} · ${s.width}px`, s.width)]
    if (s.compare)
      frames.push(frame(pageUrl(s, false), `dagny utan tema · ${s.width}px`, s.width))
    els.stage.replaceChildren(...frames)
  }

  function flash(text) {
    els.status.textContent = text
    els.status.classList.add('visible')
    clearTimeout(flash.timer)
    flash.timer = setTimeout(() => els.status.classList.remove('visible'), 1600)
  }

  function listen() {
    const source = new EventSource('api/changes')
    source.addEventListener('message', (e) => {
      const { file } = JSON.parse(e.data)
      // Changes to the shell itself need a reload of this page; everything else reloads the frames
      if (/^playground\/(?:shell\.|index\.html)/.test(file))
        return location.reload()
      els.stage.querySelectorAll('iframe').forEach((f) => {
        f.dataset.scroll = String(f.contentWindow?.scrollY || 0)
        f.contentWindow?.location.reload()
      })
      flash(`Laddade om: ${file}`)
    })
  }

  async function init() {
    themes = await fetch('api/themes').then(r => r.json()).catch(() => themes)
    const h = readHash()
    els.env.value = h.env
    fillOrgs(h.org)
    fillEvents(h.event)
    fillPages(h.page)
    fillWidths()
    els.width.value = String(h.width)
    els.theme.checked = h.theme
    els.js.checked = h.js
    els.compare.checked = h.compare

    els.env.addEventListener('change', () => {
      fillOrgs(els.org.value)
      fillEvents('')
      render()
    })
    els.org.addEventListener('change', () => {
      fillEvents('')
      render()
    })
    els.event.addEventListener('change', () => {
      els.eventId.value = ''
      render()
    })
    els.eventId.addEventListener('change', render)
    for (const el of [els.page, els.width, els.theme, els.js, els.compare])
      el.addEventListener('change', render)

    render()
    listen()
  }

  init()
})()
