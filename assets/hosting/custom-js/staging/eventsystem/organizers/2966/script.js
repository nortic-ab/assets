/*
 * Lokverkstan Eventarena (organizer 2966): background video on the organizer page only.
 * head.jsp loads this script on every dagny page of the organizer; event and show pages carry
 * data-eventid on <body> and keep their own poster, so the script stops there.
 *
 * The video is the 1080p rendition from Lokverkstan's Vimeo account (external link with CORS *,
 * ~26 MB), so it is only loaded on screens wider than 700px and when the visitor has not asked for
 * reduced motion or reduced data. The organizer's own concert photo stays underneath as the poster
 * and is what everyone else sees. Both preferences are followed at runtime.
 */
(function () {
  'use strict'
  const target = document.querySelector('#background-container')
  if (!target || document.body.hasAttribute('data-eventid'))
    return

  const VIDEO_ID = 'lokverkstan-background-video'
  const SRC = 'https://player.vimeo.com/progressive_redirect/playback/748727971/rendition/1080p/file.mp4?loc=external&signature=ed1e77ab989db6b718772b88e4bbf66b498776d246e9797c563707d4166db5da'
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const wide = window.matchMedia('(min-width: 701px)')
  const saveData = Boolean(navigator.connection && navigator.connection.saveData)

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
    if (reducedMotion.matches || !wide.matches || saveData) {
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

    const styles = {
      'position': 'absolute',
      'inset': '0',
      'width': '100%',
      'height': '100%',
      'object-fit': 'cover',
      'object-position': 'center',
      'z-index': '0',
      'pointer-events': 'none',
      'display': 'block',
      'opacity': '0',
      'transition': 'opacity 600ms ease',
    }
    for (const [prop, value] of Object.entries(styles))
      video.style.setProperty(prop, value, 'important')
    // Fade in once frames are available, so the poster never flashes to black
    video.addEventListener('playing', () => video.style.setProperty('opacity', '1', 'important'), { once: true })

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
  subscribe(reducedMotion)
  subscribe(wide)
})()
