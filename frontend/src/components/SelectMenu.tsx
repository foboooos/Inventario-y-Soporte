import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

export type SelectOption = { value: string; label: string }

type SelectMenuProps = {
  id: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  disabled?: boolean
}

const LIST_HEIGHT = 260

export function SelectMenu({ id, value, options, onChange, ariaLabel, placeholder, disabled }: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [above, setAbove] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

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
    if (!open) return
    const option = listRef.current?.children[activeIndex] as HTMLElement | undefined
    option?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function openList() {
    const rect = buttonRef.current?.getBoundingClientRect()
    setAbove(Boolean(rect && rect.bottom + LIST_HEIGHT > window.innerHeight && rect.top > LIST_HEIGHT))
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
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
      setActiveIndex((index) => Math.min(options.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(options.length - 1)
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
