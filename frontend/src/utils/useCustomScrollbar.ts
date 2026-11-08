import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export function useCustomScrollbar<T extends HTMLElement>(resetKey: unknown) {
  const scrollRef = useRef<T | null>(null)
  const thumbRef = useRef<HTMLSpanElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = scrollRef.current
    const thumb = thumbRef.current
    if (!element || !thumb) return
    const scrollElement: T = element
    const thumbElement: HTMLSpanElement = thumb
    let hideTimer: number | undefined

    function updateThumb() {
      if (scrollElement.scrollHeight <= scrollElement.clientHeight + 1) {
        thumbElement.style.height = '0px'
        barRef.current?.classList.remove('is-visible')
        return
      }

      const height = Math.max(24, (scrollElement.clientHeight / scrollElement.scrollHeight) * scrollElement.clientHeight)
      const maxTop = scrollElement.clientHeight - height
      const top = (scrollElement.scrollTop / (scrollElement.scrollHeight - scrollElement.clientHeight)) * maxTop

      thumbElement.style.height = `${height}px`
      thumbElement.style.transform = `translateY(${top}px)`
    }

    function showScrollbar() {
      const bar = barRef.current
      if (!bar) return
      bar.classList.add('is-visible')
      if (hideTimer !== undefined) window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => bar.classList.remove('is-visible'), 700)
    }

    function handleScroll() {
      updateThumb()
      showScrollbar()
    }

    updateThumb()
    scrollElement.addEventListener('scroll', handleScroll)

    const observer = new ResizeObserver(updateThumb)
    observer.observe(scrollElement)

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      observer.disconnect()
      if (hideTimer !== undefined) window.clearTimeout(hideTimer)
    }
  }, [resetKey])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const element = scrollRef.current
    if (!element) return
    const scrollElement: T = element

    const trackRect = event.currentTarget.getBoundingClientRect()
    const thumbHeight = thumbRef.current?.getBoundingClientRect().height ?? 24
    const maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight
    if (maxScroll <= 0) return

    const maxTop = Math.max(1, trackRect.height - thumbHeight)

    function scrollToPointer(clientY: number) {
      const top = clientY - trackRect.top - thumbHeight / 2
      const ratio = Math.min(1, Math.max(0, top / maxTop))
      scrollElement.scrollTop = ratio * maxScroll
    }

    function handleMove(moveEvent: globalThis.PointerEvent) {
      scrollToPointer(moveEvent.clientY)
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    scrollToPointer(event.clientY)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    event.preventDefault()
  }

  return { scrollRef, thumbRef, barRef, handlePointerDown }
}
