import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

type ChipDisclosureProps = {
  items: string[]
  maxVisible?: number
}

export function ChipDisclosure({ items, maxVisible = 3 }: ChipDisclosureProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const popupId = useId()

  const visibleItems = items.slice(0, maxVisible)
  const hiddenCount = items.length - visibleItems.length

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (popupRef.current?.contains(target) || toggleRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const popup = popupRef.current
    const toggle = toggleRef.current
    if (!popup || !toggle) return

    const popupElement = popup
    const toggleElement = toggle

    function updatePosition() {
      const toggleRect = toggleElement.getBoundingClientRect()
      const popupRect = popupElement.getBoundingClientRect()
      const viewportPadding = 16
      const gap = 8
      const canPlaceBelow = toggleRect.bottom + gap + popupRect.height <= window.innerHeight - viewportPadding
      const canPlaceAbove = toggleRect.top - gap - popupRect.height >= viewportPadding
      const top = canPlaceBelow
        ? toggleRect.bottom + gap
        : canPlaceAbove
          ? toggleRect.top - popupRect.height - gap
          : Math.max(viewportPadding, window.innerHeight - popupRect.height - viewportPadding)
      const left = Math.min(
        Math.max(viewportPadding, toggleRect.left),
        Math.max(viewportPadding, window.innerWidth - popupRect.width - viewportPadding),
      )

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <span className="subjects-chips">
      {visibleItems.map((item, index) => (
        <span className="subject-chip" key={`${item}-${index}`}>{item}</span>
      ))}
      {hiddenCount > 0 && (
        <>
          <button
            ref={toggleRef}
            className="subject-chip subject-chip-more"
            type="button"
            aria-expanded={open}
            aria-controls={popupId}
            aria-label={`Ver ${hiddenCount} más`}
            onClick={() => setOpen((current) => !current)}
          >
            +{hiddenCount}
          </button>
          {open && (
            <div
              ref={popupRef}
              id={popupId}
              className="chip-disclosure-popover"
              role="region"
              aria-label="Lista completa"
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? 'visible' : 'hidden',
              }}
            >
              <span className="chip-disclosure-popover-chips">
                {items.map((item, index) => (
                  <span className="subject-chip" key={`${item}-${index}`}>{item}</span>
                ))}
              </span>
            </div>
          )}
        </>
      )}
    </span>
  )
}
