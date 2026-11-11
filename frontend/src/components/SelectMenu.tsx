import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'

export type SelectOption = { value: string; label: string; icon?: ReactNode }

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
  searchable?: boolean
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

export function SelectMenu({ id, value, options, onChange, ariaLabel, placeholder, disabled, visibleItems = 10, fixedList = false, searchable = false }: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [search, setSearch] = useState<string | null>(null)
  const [above, setAbove] = useState(false)
  const [listBox, setListBox] = useState<ListBox | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const scrollActiveRef = useRef(false)
  const scrollTopRef = useRef<number | null>(null)
  const selectSearchOnOpenRef = useRef(false)
  const normalizedSearch = search?.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
  const filteredOptions = searchable && normalizedSearch
    ? options.filter((option) => option.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().includes(normalizedSearch))
    : options
  const visibleCount = Math.min(filteredOptions.length, visibleItems)
  const listHeight = visibleCount * ITEM_HEIGHT + LIST_PADDING

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  function getAnchor() {
    return searchable ? inputRef.current : buttonRef.current
  }

  useLayoutEffect(() => {
    if (searchable && open && selectSearchOnOpenRef.current) {
      inputRef.current?.select()
      selectSearchOnOpenRef.current = false
    }
  }, [searchable, open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setSearch(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open || !fixedList) return

    function reposition() {
      const anchor = searchable ? inputRef.current : buttonRef.current
      const rect = anchor?.getBoundingClientRect()
      if (rect) setListBox(boxFromRect(rect, above))
    }

    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, fixedList, above, searchable])

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
    if (searchable) {
      setSearch(null)
      selectSearchOnOpenRef.current = Boolean(selected)
    }
    const anchor = getAnchor()
    const rect = anchor?.getBoundingClientRect()
    const containerRect = anchor?.closest('.modal-card')?.getBoundingClientRect()
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
    const visibleSelectedIndex = filteredOptions.findIndex((option) => option.value === value)
    setActiveIndex(visibleSelectedIndex >= 0 ? visibleSelectedIndex : (filteredOptions.length > 0 ? 0 : -1))
    setOpen(true)
  }

  function moveActive(index: number) {
    if (index === activeIndex) return
    scrollActiveRef.current = true
    setActiveIndex(index)
  }

  function commit(index: number) {
    const option = filteredOptions[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    setSearch(null)
    if (!searchable) buttonRef.current?.focus({ preventScroll: true })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement | HTMLInputElement>) {
    if (disabled) return

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || (!searchable && event.key === ' ')) {
        event.preventDefault()
        openList()
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(Math.min(filteredOptions.length - 1, activeIndex + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(Math.max(0, activeIndex - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveActive(filteredOptions.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      commit(activeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      setSearch(null)
      if (!searchable) buttonRef.current?.focus({ preventScroll: true })
    } else if (event.key === 'Tab') {
      setOpen(false)
      setSearch(null)
    }
  }

  const listStyle: CSSProperties = {}

  if (filteredOptions.length > visibleItems) listStyle.maxHeight = listHeight

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
      {searchable ? (
        <div
          className={`select-menu-button select-menu-searchable${open ? ' is-open' : ''}`}
          onClick={() => {
            if (disabled) return
            if (!open) openList()
            if (document.activeElement !== inputRef.current) {
              inputRef.current?.focus({ preventScroll: true })
            }
          }}
        >
          <input
            ref={inputRef}
            id={id}
            className="select-menu-search-input"
            type="text"
            role="combobox"
            aria-label={ariaLabel}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            aria-activedescendant={open && activeIndex >= 0 && filteredOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
            autoComplete="off"
            readOnly={!open}
            value={open ? search ?? selected?.label ?? '' : selected?.label ?? ''}
            placeholder={placeholder ?? 'Selecciona'}
            disabled={disabled}
            onChange={(event) => {
              setSearch(event.target.value)
              setActiveIndex(0)
              if (!open) openList()
            }}
            onKeyDown={handleKeyDown}
          />
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      ) : (
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
            {value && selected?.icon && <span className="select-menu-option-icon">{selected.icon}</span>}
            {value
              ? <span className="select-menu-selected-label">{selected?.label}</span>
              : placeholder ?? 'Selecciona'}
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}

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
          {filteredOptions.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`select-menu-option${index === activeIndex ? ' is-active' : ''}${option.value === value ? ' is-selected' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault()
                commit(index)
              }}
            >
              {option.icon && <span className="select-menu-option-icon">{option.icon}</span>}
              {option.label}
            </li>
          ))}
          {searchable && filteredOptions.length === 0 && (
            <li className="select-menu-option select-menu-empty" role="option" aria-selected="false" aria-disabled="true">
              Sin coincidencias
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
