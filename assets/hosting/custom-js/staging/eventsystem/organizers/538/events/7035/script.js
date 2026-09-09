/* Nortic test (event 84917): video background in the top section, video shared from the organizer's assets/. */
(function () {
  'use strict'
  const scriptUrl = document.currentScript && document.currentScript.src
  const target = document.querySelector('#background-container')
  if (!scriptUrl || !target)
    return

  const existing = document.querySelector('#custom-background-video')
  if (existing)
    existing.remove()

  // Ändra bara position om containern är static
  if (getComputedStyle(target).position === 'static')
    target.style.setProperty('position', 'relative', 'important')

  target.style.setProperty('isolation', 'isolate', 'important')
  target.style.setProperty('overflow', 'hidden', 'important')

  const video = document.createElement('video')
  video.id = 'custom-background-video'
  video.src = new URL('../../assets/background.mp4', scriptUrl).href
  video.autoplay = true
  video.muted = true
  video.loop = true
  video.playsInline = true

  video.style.setProperty('position', 'absolute', 'important')
  video.style.setProperty('top', '0', 'important')
  video.style.setProperty('left', '0', 'important')
  video.style.setProperty('width', '100%', 'important')
  video.style.setProperty('height', '100%', 'important')
  video.style.setProperty('object-fit', 'cover', 'important')
  video.style.setProperty('z-index', '-1', 'important')
  video.style.setProperty('pointer-events', 'none', 'important')
  video.style.setProperty('display', 'block', 'important')

  target.appendChild(video)
  video.play().catch(() => {})
})()
