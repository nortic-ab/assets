/*
 * Karlskrona Skärgårdsfest (organizer 542): the festival film (drone footage over Stortorget with the
 * brand's blue shape) behind the hero on every dagny page of the organizer (organizer page, event and
 * show pages).
 *
 * The script adds div.kf-hero-media as the first child of section#top; the stylesheet
 * (custom-css/prod/eventsystem/organizers/542/styles.css) fills the hero with it and gives it the
 * first frame as background. The video is shown as delivered, without filters. The video
 * (assets/ksf-festival.mp4, 12 s loop, 1920x1080, H.264 4.3 Mbit/s, 6.5 MB, no audio, as delivered by
 * KSF) is only loaded on screens wider than 700px and when the visitor has not asked for reduced
 * motion or reduced data; everyone else sees the still frame. Both preferences are followed at
 * runtime.
 *
 * The film ends just below the title, so the description and "Läs mer" (small text) sit on the cream
 * page instead of on moving footage. Where the title ends depends on its length and the width, so
 * the script measures it and sets --kf-media-h on section#top, again whenever the hero resizes.
 *
 * It also marks the hero's date chip when it reads "Inga föreställningar" / "No shows" (an event
 * without dated shows), which the stylesheet hides; CSS cannot select on text.
 */
(function () {
  'use strict'
  const hero = document.querySelector('section#top')
  if (!hero)
    return

  // Temporarily off (October 2026): the stylesheet shows the KSF 2027 still instead of the film for a
  // few days. Set to true (and remove the stylesheet's "Tillfälligt" block) to bring the film back.
  const SHOW_VIDEO = false
  const VIDEO_ID = 'ksf-festival-video'
  const SRC = new URL('assets/ksf-festival.mp4', document.currentScript.src).href
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const wide = window.matchMedia('(min-width: 701px)')
  const saveData = Boolean(navigator.connection && navigator.connection.saveData)

  let media = hero.querySelector(':scope > .kf-hero-media')
  if (!media) {
    media = document.createElement('div')
    media.className = 'kf-hero-media'
    media.setAttribute('aria-hidden', 'true')
    hero.insertBefore(media, hero.firstChild)
  }

  // The chip's text also holds the icon's ligature name ("date_range"), so read the label only
  document.querySelectorAll('div#main-ribbon .slider-inner > .event-info').forEach((chip) => {
    const label = chip.querySelector('.event-info-label')
    if (label && /^(?:inga föreställningar|no shows)$/i.test(label.textContent.trim()))
      chip.classList.add('kf-no-shows')
  })

  // The film covers the hero down to just below the title (and the organizer's tags after it)
  function fitMedia() {
    const top = hero.getBoundingClientRect().top
    let bottom = 0
    hero.querySelectorAll('div#main-ribbon > h1, div#main-ribbon > a.n-chip').forEach((el) => {
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom)
    })
    if (bottom)
      hero.style.setProperty('--kf-media-h', `${Math.ceil(bottom - top + Math.min(56, window.innerWidth * 0.05))}px`)
  }
  fitMedia()
  if (typeof ResizeObserver === 'function')
    new ResizeObserver(fitMedia).observe(hero)
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(fitMedia)

  function unmount() {
    const existing = document.getElementById(VIDEO_ID)
    if (!existing)
      return
    existing.pause()
    existing.removeAttribute('src')
    existing.load()
    existing.remove()
  }

  function mount() {
    if (!SHOW_VIDEO || reducedMotion.matches || !wide.matches || saveData) {
      unmount()
      return
    }
    if (document.getElementById(VIDEO_ID))
      return

    const video = document.createElement('video')
    video.id = VIDEO_ID
    video.muted = true
    video.loop = true
    video.autoplay = true
    video.playsInline = true
    video.preload = 'auto'
    video.disablePictureInPicture = true
    video.tabIndex = -1
    video.setAttribute('aria-hidden', 'true')
    video.src = SRC
    // Fade in once frames are available, so the still frame never flashes to black
    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true })

    media.appendChild(video)
    video.play().catch(() => {})
  }

  function subscribe(query) {
    if (typeof query.addEventListener === 'function')
      query.addEventListener('change', mount)
    else if (typeof query.addListener === 'function')
      query.addListener(mount)
  }

  mount()
  subscribe(reducedMotion)
  subscribe(wide)
})()
