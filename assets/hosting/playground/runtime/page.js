/*
 * Runs in every playground page (partials/head.html), right after dagny.css.
 *
 * 1. Links the chosen organizer and event theme last in <head> and adds their scripts with defer
 *    semantics (after the page is parsed), as head.jsp does. The page's query string chooses them:
 *    ?env=prod|staging&org=4994&event=87118&theme=0 (no CSS) &js=0 (no scripts).
 * 2. PG.body() (first thing in <body>, from the chrome partials) puts the chosen ids on <body>, so
 *    rules scoped to body[data-organizerid] / body[data-eventid] / body:not([data-eventid]) apply.
 * 3. A small part of dagny's behaviour, so states can be tried by hand: opening a show row, the
 *    ticket and addon steppers with the basket pill, and the popups, toasts and overlays dagny's JS
 *    builds. The markup they insert is copied from dagny's scripts (event.js, eventPage.js) so a
 *    theme's selectors meet the same DOM as on tickets.nortic.se.
 * 4. Actions the playground shell can trigger with postMessage({ pg: 'action', name }); a page lists
 *    the ones that make sense for it in <script type="application/json" id="pg-actions">. A page with
 *    alternative states (the order confirmation) starts in <html data-pg-variant="name">.
 */
;(function () {
  'use strict'

  const params = new URLSearchParams(location.search)
  const env = params.get('env') === 'staging' ? 'staging' : 'prod'
  const org = /^\d+$/.test(params.get('org') || '') ? params.get('org') : ''
  const event = /^\d+$/.test(params.get('event') || '') ? params.get('event') : ''
  const withCss = params.get('theme') !== '0'
  const withJs = params.get('js') !== '0'
  // Pages without an event (the organizer page) never get an event theme, as in dagny
  const pageHasEvent = document.documentElement.dataset.pgKind !== 'organizer'
  const MOCK_ORG = '100'
  const MOCK_EVENT = '100001'

  const themeFiles = []
  if (org) {
    themeFiles.push(`/custom-%s/${env}/eventsystem/organizers/${org}/%f`)
    if (event && pageHasEvent)
      themeFiles.push(`/custom-%s/${env}/eventsystem/organizers/${org}/events/${event}/%f`)
  }

  if (withCss) {
    for (const f of themeFiles) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = f.replace('%s', 'css').replace('%f', 'styles.css')
      link.dataset.pgTheme = ''
      document.head.appendChild(link)
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Content dagny loads with AJAX (the basket cart overview) waits in <template data-pg-into="selector">,
    // and elements its JS shows after load are listed in <html data-pg-show="selector">
    document.querySelectorAll('template[data-pg-into]').forEach((t) => {
      document.querySelectorAll(t.dataset.pgInto).forEach(target => target.replaceChildren(t.content.cloneNode(true)))
    })
    if (document.documentElement.dataset.pgShow)
      action(`show:${document.documentElement.dataset.pgShow}`)
    if (document.documentElement.dataset.pgVariant)
      action(`variant:${document.documentElement.dataset.pgVariant}`)
    if (!withJs)
      return
    for (const f of themeFiles) {
      const script = document.createElement('script')
      script.src = f.replace('%s', 'js').replace('%f', 'script.js')
      script.crossOrigin = 'anonymous'
      script.async = false
      document.body.appendChild(script)
    }
  })

  function body() {
    const b = document.body
    b.dataset.organizerid = org || MOCK_ORG
    if (b.hasAttribute('data-eventid'))
      b.dataset.eventid = event || MOCK_EVENT
  }

  /* ---------------------------------------------------------------- popups (event.js) */

  const MODALS = {
    // openShowEventMessage (eventPage.js): the organizer's message on a show, e.g. an age limit
    'event-message': `<div class="nortic-modal theme-background-color-override theme-text-color-override" style="height: fit-content"><div style="display:flex;flex-flow:row;align-items:center"><i class="material-icons prefix" style="font-size:300%;box-shadow:0 2px 74px -3px rgb(0 0 0 / 51%);">info</i><h3 style="margin:0 0 0 32px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Åldersgräns</h3><div class="close-button pointer"><i class="material-icons">close</i></div></div><p>Evenemanget har en åldersgräns på 18 år. Legitimation kontrolleras vid entrén.</p><div class="nortic-modal-actions" style="margin-top:32px;display:flex;flex-flow:row;align-items:center;justify-content:center;"><div class="hide-event-messsage flat-button theme-background-color pointer no-select">OK</div></div></div>`,
    // openShowEventMessage with event message type 4
    'event-warning': `<div class="nortic-modal theme-background-color-override theme-text-color-override" style="height: fit-content"><div style="display:flex;flex-flow:row;align-items:center"><i class="material-icons prefix" style="font-size:300%;box-shadow:0 2px 74px -3px rgb(0 0 0 / 51%);">warning</i><h3 style="margin:0 0 0 32px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Ändrad starttid för kvällens föreställning</h3><div class="close-button pointer"><i class="material-icons">close</i></div></div><p>Föreställningen börjar 19.30 i stället för 19.00. Insläppet öppnar en timme före start.</p><div class="nortic-modal-actions" style="margin-top:32px;display:flex;flex-flow:row;align-items:center;justify-content:center;"><div class="hide-event-messsage flat-button theme-background-color pointer no-select">OK</div></div></div>`,
    // openNorticModal('info', category name, category info): "Läs mer" on a ticket category
    'category-info': `<div class="nortic-modal"><div class="close-button pointer"><i class="material-icons">close</i></div><h3><i class="material-icons prefix">info</i>Helgpass</h3><p>Gäller fredag och lördag – upplev hela helgen med fri entré till alla scener, tillgång till matområdet och en garderobsbiljett per person. Ordinarie pris 1 295 kr.</p></div>`,
    // openCampaignCodePrompt (event.js)
    'campaign': `<div class="nortic-modal campaign-code-modal"><div class="close-button pointer"><i class="material-icons">close</i></div><h3><i class="material-icons prefix">local_offer</i>Kampanj</h3><p>Ange din kampanjkod nedan för att låsa upp dolda kategorier.</p><div class="input-field big-ass-input-field"><input type="text" class="campaign-code-input" placeholder="Ange kod" /><div class="submit-button flat-button nortic-blue-background pointer no-select">OK</div></div></div>`,
    // openPreReleaseAccessCodePrompt (eventPage.js)
    'access-code': `<div class="nortic-modal access-code-modal"><div class="close-button pointer"><i class="material-icons">close</i></div><h3><i class="material-icons prefix">access_time</i>Försläppskod</h3><p>Biljetterna till den här föreställningen går att köpa med en försläppskod innan de släpps.</p><p>Biljetterna släpps 1 mars 10:00</p><div class="input-field big-ass-input-field"><input type="text" class="access-code-input" placeholder="Ange kod" /><div class="submit-button flat-button nortic-blue-background pointer no-select">OK</div></div></div>`,
    // openWaitListPrompt (eventPage.js)
    'waitlist': `<div class="nortic-modal waitlist-modal"><div class="close-button pointer"><i class="material-icons">close</i></div><h3><i class="material-icons prefix">playlist_add</i>Väntelista</h3><p>Ange din emailadress så får du ett meddelande om biljetter blir tillgängliga</p><div class="input-field big-ass-input-field"><input type="text" class="waitlist-email-input" placeholder="Email" /><div class="submit-button flat-button nortic-blue-background pointer no-select">OK</div></div></div>`,
  }

  function closeNorticModal() {
    document.querySelectorAll('.nortic-modal-overlay, .nortic-modal').forEach(e => e.remove())
  }

  // openNorticModal (event.js): the box is appended to .st-content and zooms in, the overlay is
  // prepended and fades in
  function openNorticModal(name) {
    closeNorticModal()
    const content = document.querySelector('.st-content') || document.body
    const holder = document.createElement('div')
    holder.innerHTML = MODALS[name]
    const box = holder.firstElementChild
    box.classList.add('animated', 'zoomIn')
    box.style.animationDuration = '0.3s'
    content.appendChild(box)
    const overlay = document.createElement('div')
    overlay.className = 'nortic-modal-overlay'
    content.prepend(overlay)
    box.querySelectorAll('.close-button, .hide-event-messsage').forEach(b => b.addEventListener('click', closeNorticModal))
    overlay.addEventListener('click', closeNorticModal)
  }

  // Materialize 0.x modal('open'): inline styles and an overlay on <body>
  function openMaterializeModal(selector) {
    const modal = document.querySelector(selector)
    if (!modal)
      return
    closeMaterializeModals()
    modal.classList.add('open')
    Object.assign(modal.style, { display: 'block', opacity: '1', transform: 'scaleX(1)', top: '10%' })
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    Object.assign(overlay.style, { zIndex: '1002', display: 'block', opacity: '0.5' })
    overlay.addEventListener('click', closeMaterializeModals)
    document.body.appendChild(overlay)
    modal.querySelectorAll('.modal-close, .close-modal').forEach(b => b.addEventListener('click', closeMaterializeModals))
  }

  function closeMaterializeModals() {
    document.querySelectorAll('.modal.open').forEach((m) => {
      m.classList.remove('open')
      Object.assign(m.style, { display: '', opacity: '', transform: '', top: '' })
    })
    document.querySelectorAll('.modal-overlay').forEach(o => o.remove())
  }

  // Materialize.toast (0.x): one container at the end of <body>
  function toast(text, className) {
    let container = document.getElementById('toast-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'toast-container'
      document.body.appendChild(container)
    }
    const t = document.createElement('div')
    t.className = `toast${className ? ` ${className}` : ''}`
    Object.assign(t.style, { top: '0px', opacity: '1' })
    t.textContent = text
    container.appendChild(t)
  }

  // showBasketOverlay and showLoadingScreen (eventPage.js): the blue circle that grows out of the
  // basket, then the loading screen copied from #preloader-container
  function basketOverlay() {
    const overlay = document.getElementById('basket-overlay')
    if (!overlay)
      return
    const size = Math.max(window.innerHeight, window.innerWidth)
    overlay.classList.remove('display-none', 'animated', 'fadeOut')
    overlay.style.display = ''
    setTimeout(() => {
      overlay.classList.remove('overlay-hidden')
      overlay.classList.add('overlay-visible')
      overlay.style.height = `${size}px`
      overlay.style.width = `${size}px`
    }, 50)
  }

  function loadingScreen() {
    basketOverlay()
    setTimeout(() => {
      const loading = document.getElementById('event-page-loading-overlay') || document.getElementById('organizer-page-loading-overlay')
      const source = document.getElementById('preloader-container')
      if (!loading || !source)
        return
      loading.classList.remove('display-none')
      loading.innerHTML = source.innerHTML
      loading.querySelectorAll('#centered-content, .spinner-container, #loading-what').forEach((e) => {
        e.style.display = 'block'
      })
      loading.querySelectorAll('.spinner-layer').forEach(l => l.classList.replace('blue-spinner', 'yellow-spinner'))
      loading.querySelector('#loading-what .show-name').textContent = 'Laddar betalsida'
      loading.querySelector('#loading-what .details').textContent = 'Vänligen vänta'
    }, 350)
  }

  function resetOverlays() {
    const overlay = document.getElementById('basket-overlay')
    if (overlay) {
      overlay.classList.remove('overlay-visible')
      overlay.classList.add('overlay-hidden')
      overlay.style.height = ''
      overlay.style.width = ''
    }
    const loading = document.getElementById('event-page-loading-overlay') || document.getElementById('organizer-page-loading-overlay')
    if (loading) {
      loading.classList.add('display-none')
      loading.innerHTML = ''
    }
    document.querySelectorAll('#event-page-loading-overlay-basket, #basket-cart-loading-overlay').forEach((e) => {
      e.classList.add('display-none')
      e.querySelector('.spinner-container')?.classList.add('display-none')
    })
  }

  // The overlay dagny shows while a ticket is put in the organizer basket cart
  function basketCartLoading() {
    const overlay = document.getElementById('event-page-loading-overlay-basket')
    if (!overlay)
      return
    overlay.classList.remove('display-none')
    overlay.querySelector('.spinner-container')?.classList.remove('display-none')
  }

  /* ---------------------------------------------------------------- rows and steppers */

  const currency = () => document.body.dataset.currency || 'SEK'

  function updateBasket() {
    const basket = document.getElementById('basket')
    if (!basket)
      return
    let count = 0
    let price = 0
    document.querySelectorAll('.unnumbered-show-container .amount-indicator').forEach((ind) => {
      const n = Number(ind.dataset.amount || 0)
      count += n
      price += n * Number(ind.closest('.amount-blob-container')?.dataset.price || 0)
    })
    basket.querySelector('.amount-blob .amount').textContent = String(count)
    basket.querySelector('.price').textContent = `${price} ${currency()}`
    basket.classList.toggle('display-none', count < 1)
  }

  function step(blob) {
    const container = blob.closest('.amount-blob-container, .addon-amount-blob-container')
    const indicator = container?.querySelector('.amount-indicator')
    if (!indicator)
      return
    const max = Number(indicator.dataset.maxamount || 10)
    let n = Number(indicator.dataset.amount || indicator.textContent.trim() || 0)
    n = blob.classList.contains('plus') ? Math.min(max, n + 1) : Math.max(0, n - 1)
    indicator.dataset.amount = String(n)
    indicator.textContent = String(n)
    container.querySelector('.minus')?.classList.toggle('disabled', n === 0)
    container.querySelector('.amount')?.classList.toggle('zero', n === 0)
    updateBasket()
  }

  // addFreetextFilterListeners (organizerPage.js): the search field hides cards whose name, place or
  // tags do not contain the text
  document.addEventListener('input', (e) => {
    if (!(e.target instanceof HTMLInputElement) || e.target.id !== 'freetext-filter' || !e.target.closest('#popular-events'))
      return
    const term = e.target.value.toLowerCase()
    document.querySelectorAll('#popular-events .grid-item').forEach((item) => {
      const tags = (item.dataset.filtertags || '').split('||').map(t => t.toLowerCase())
      item.classList.toggle('hidden-by-freetext-filter', !tags.some(t => t.includes(term)))
    })
  })

  document.addEventListener('click', (e) => {
    const target = e.target
    if (!(target instanceof Element))
      return

    const blob = target.closest('.amount-blob.plus, .amount-blob.minus, .addon-amount-blob.plus, .addon-amount-blob.minus')
    if (blob) {
      if (!blob.classList.contains('disabled'))
        step(blob)
      return
    }

    const trigger = target.closest('[data-pg-action]')
    if (trigger) {
      e.preventDefault()
      action(trigger.getAttribute('data-pg-action'))
      return
    }

    // addOrderConfirmationListeners (organizerPage.js): the cross closes the order confirmation
    if (target.closest('#confirm-order-confirmation')) {
      const section = document.querySelector('section#order-confirmation')
      if (section)
        section.style.display = 'none'
      return
    }
    // addTagsListeners (organizerPage.js): a tag chip toggles .disabled; with every chip off all cards
    // show, otherwise only cards with an active tag
    const chip = target.closest('#popular-events .n-chip')
    if (chip) {
      e.preventDefault()
      chip.classList.toggle('disabled')
      const active = [...document.querySelectorAll('#popular-events .n-chip:not(.disabled)')].map(c => c.dataset.value.toLowerCase())
      document.querySelectorAll('#popular-events .grid-item').forEach((item) => {
        const tags = [...item.querySelectorAll('input.tag-value')].map(i => i.value.toLowerCase())
        item.classList.toggle('hidden-by-tag', active.length > 0 && !tags.some(t => active.includes(t)))
      })
      return
    }
    if (target.closest('.campaign-code-button')) {
      openNorticModal('campaign')
      return
    }
    if (target.closest('.read-more-info-link, .show-category .read-more')) {
      e.preventDefault()
      openNorticModal('category-info')
      return
    }

    // Opening a show row: links inside it (the venue) keep working
    const row = target.closest('.show-listing-show.unnumbered-show')
    if (row && !target.closest('a.arenaLocationLink')) {
      const opening = !row.classList.contains('expanded')
      row.classList.toggle('expanded', opening)
      let next = row.nextElementSibling
      while (next && !next.classList.contains('booking-contents'))
        next = next.nextElementSibling
      if (next && next.classList.contains('booking-contents')) {
        next.classList.toggle('display-none', !opening)
        next.style.display = opening ? 'block' : ''
      }
      if (opening && row.dataset.eventMessageMessage)
        openNorticModal('event-message')
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNorticModal()
      closeMaterializeModals()
    }
  })

  /* ---------------------------------------------------------------- actions */

  function action(name) {
    if (!name)
      return
    if (name.startsWith('modal:'))
      return openNorticModal(name.slice(6))
    if (name.startsWith('materialize:'))
      return openMaterializeModal(name.slice(12))
    if (name.startsWith('toast:')) {
      const [, cls, ...text] = name.split(':')
      return toast(text.join(':'), cls)
    }
    // Pages with alternative states mark dagny's own elements with data-pg-variant="name other";
    // variant:name shows the ones that list it and hides the rest (inline, so the markup stays as is)
    if (name.startsWith('variant:')) {
      const chosen = name.slice(8)
      document.querySelectorAll('section#order-confirmation').forEach((e) => {
        e.style.display = ''
      })
      document.querySelectorAll('body [data-pg-variant]').forEach((e) => {
        e.style.display = e.dataset.pgVariant.split(' ').includes(chosen) ? '' : 'none'
      })
      return
    }
    if (name.startsWith('show:')) {
      document.querySelectorAll(name.slice(5)).forEach((e) => {
        e.classList.remove('display-none')
        e.style.display = ''
      })
      return
    }
    switch (name) {
      case 'close':
        closeNorticModal()
        closeMaterializeModals()
        document.getElementById('toast-container')?.remove()
        return resetOverlays()
      case 'basket-overlay':
        return basketOverlay()
      case 'loading-payment':
        return loadingScreen()
      case 'basket-cart-loading':
        return basketCartLoading()
    }
  }

  window.addEventListener('message', (e) => {
    if (e.origin === location.origin && e.data && e.data.pg === 'action')
      action(e.data.name)
  })

  window.PG = { body, action, toast, openNorticModal, closeNorticModal, openMaterializeModal }
})()
