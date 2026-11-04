import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'

export type SelectOption = { value: string; label: string }

type SelectMenuProps = {
  id: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  disabled?: boolean
  visibleItems?: number
  fixedList?: boolean
}

const ITEM_HEIGHT = 30
const LIST_PADDING = 10
const VIEWPORT_MARGIN = 32

function visibleViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight
}

type ListBox = { top: number | null; bottom: number | null; left: number; width: number }

function boxFromRect(rect: DOMRect, above: boolean): ListBox {
  return {
    top: above ? null : rect.bottom + 4,
    bottom: above ? visibleViewportHeight() - rect.top + 4 : null,
    left: rect.left,
    width: rect.width,
  }
}

export function SelectMenu({ id, value, options, onChange, ariaLabel, placeholder, disabled, visibleItems = 10, fixedList = false }: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [above, setAbove] = useState(false)
  const [listBox, setListBox] = useState<ListBox | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const scrollActiveRef = useRef(false)
  const scrollTopRef = useRef<number | null>(null)
  const visibleCount = Math.min(options.length, visibleItems)
  const listHeight = visibleCount * ITEM_HEIGHT + LIST_PADDING

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open || !fixedList) return

    function reposition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) setListBox(boxFromRect(rect, above))
    }

    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, fixedList, above])

  useLayoutEffect(() => {
    if (!open || scrollTopRef.current === null) return
    if (listRef.current) listRef.current.scrollTop = scrollTopRef.current
  }, [open])

  useEffect(() => {
    if (!open || !scrollActiveRef.current) return
    scrollActiveRef.current = false
    const option = listRef.current?.children[activeIndex] as HTMLElement | undefined
    option?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function openList() {
    const rect = buttonRef.current?.getBoundingClientRect()
    const containerRect = buttonRef.current?.closest('.modal-card')?.getBoundingClientRect()
    const viewportSpaceBelow = rect ? visibleViewportHeight() - rect.bottom : 0
    const containerSpaceBelow = rect
      ? (containerRect ? containerRect.bottom - rect.bottom : Infinity)
      : 0
    const spaceAbove = rect
      ? (fixedList ? rect.top : rect.top - Math.max(0, containerRect?.top ?? 0))
      : 0
    const clippedByContainer = !fixedList && containerSpaceBelow < listHeight + VIEWPORT_MARGIN
    const nextAbove = Boolean(
      rect
      && (viewportSpaceBelow < listHeight + VIEWPORT_MARGIN || clippedByContainer)
      && spaceAbove > listHeight,
    )
    setAbove(nextAbove)
    if (fixedList && rect) setListBox(boxFromRect(rect, nextAbove))
    scrollActiveRef.current = scrollTopRef.current === null
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function moveActive(index: number) {
    if (index === activeIndex) return
    scrollActiveRef.current = true
    setActiveIndex(index)
  }

  function commit(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openList()
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(Math.min(options.length - 1, activeIndex + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(Math.max(0, activeIndex - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveActive(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      commit(activeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const listStyle: CSSProperties = {}

  if (options.length > visibleItems) listStyle.maxHeight = listHeight

  if (fixedList && listBox) {
    listStyle.position = 'fixed'
    listStyle.right = 'auto'
    listStyle.left = listBox.left
    listStyle.width = listBox.width
    if (listBox.top !== null) listStyle.top = listBox.top
    if (listBox.bottom !== null) listStyle.bottom = listBox.bottom
  }

  return (
    <div className="select-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        id={id}
        className="select-menu-button"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className={value ? 'select-menu-value' : 'select-menu-placeholder'}>
          {value ? selected?.label : placeholder ?? 'Selecciona'}
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          className={`select-menu-list ${above ? 'is-above' : 'is-below'}`}
          role="listbox"
          aria-label={ariaLabel}
          style={listStyle}
          onScroll={(event) => { scrollTopRef.current = event.currentTarget.scrollTop }}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`select-menu-option${index === activeIndex ? ' is-active' : ''}${option.value === value ? ' is-selected' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault()
                commit(index)
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
