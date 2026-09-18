/*
 * Parken Zoo Halloween (event 7035, staging): video background in the top section.
 * Desktop/mobile variant is picked with matchMedia at the 700px breakpoint and swapped
 * when the viewport crosses it, webm first with mp4 fallback. The background image stays underneath as poster/fallback and is
 * what users with prefers-reduced-motion get. The reduced-motion preference is also
 * followed at runtime: the video is removed when it turns on and recreated when it turns off.
 */
(function () {
  'use strict'
  const scriptUrl = document.currentScript && document.currentScript.src
  const target = document.querySelector('#background-container')
  if (!scriptUrl || !target)
    return

  const VIDEO_ID = 'custom-background-video'
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const mobileBreakpoint = window.matchMedia('(max-width: 700px)')

  function unmount() {
    const existing = document.getElementById(VIDEO_ID)
    if (!existing)
      return
    existing.pause()
    existing.remove()
  }

  function mount() {
    unmount()
    if (reducedMotion.matches)
      return

    const variant = mobileBreakpoint.matches ? 'mobile' : 'desktop'
    const sources = [
      { file: `parken-zoo-halloween-${variant}.webm`, type: 'video/webm' },
      { file: `parken-zoo-halloween-${variant}.mp4`, type: 'video/mp4' },
    ]

    // Ändra bara position om containern är static
    if (getComputedStyle(target).position === 'static')
      target.style.setProperty('position', 'relative', 'important')

    target.style.setProperty('isolation', 'isolate', 'important')
    target.style.setProperty('overflow', 'hidden', 'important')

    const video = document.createElement('video')
    video.id = VIDEO_ID
    video.autoplay = true
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.disablePictureInPicture = true
    video.tabIndex = -1
    video.setAttribute('aria-hidden', 'true')

    for (const source of sources) {
      const el = document.createElement('source')
      el.src = new URL(`../../assets/${source.file}`, scriptUrl).href
      el.type = source.type
      video.appendChild(el)
    }

    const styles = {
      'position': 'absolute',
      'top': '0',
      'left': '0',
      'width': '100%',
      'height': '100%',
      'object-fit': 'cover',
      'object-position': 'center top',
      'z-index': '-1',
      'pointer-events': 'none',
      'display': 'block',
    }
    for (const [prop, value] of Object.entries(styles))
      video.style.setProperty(prop, value, 'important')

    target.appendChild(video)
    video.play().catch(() => {})
  }

  function subscribe(query) {
    if (typeof query.addEventListener === 'function')
      query.addEventListener('change', mount)
    else if (typeof query.addListener === 'function')
      query.addListener(mount)
  }

  mount()
  // One listener per query and script execution; the script itself runs once per page load.
  subscribe(reducedMotion)
  subscribe(mobileBreakpoint)
})()
