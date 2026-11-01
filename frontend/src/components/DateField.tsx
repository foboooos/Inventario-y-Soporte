import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type DateFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}

function parseValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplay(value: string): string {
  const date = parseValue(value)
  if (!date) return 'dd-mm-aaaa'
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
}

export function DateField({ id, value, onChange, ariaLabel }: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const [align, setAlign] = useState<'left' | 'right'>('left')
  const [view, setView] = useState(() => {
    const date = parseValue(value) ?? new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const selected = parseValue(value)
  const today = new Date()
  const year = view.getFullYear()
  const month = view.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)

  function toggle() {
    if (!open) {
      const date = selected ?? new Date()
      setView(new Date(date.getFullYear(), date.getMonth(), 1))
      const rect = buttonRef.current?.getBoundingClientRect()
      setAlign(rect && rect.left + 264 > window.innerWidth - 16 ? 'right' : 'left')
    }
    setOpen((current) => !current)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div className="date-field" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="date-field-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggle}
      >
        <span className={value ? 'date-field-value' : 'date-field-placeholder'}>{formatDisplay(value)}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <div className={`date-picker is-${align}`} role="dialog" aria-label={ariaLabel}>
          <div className="date-picker-header">
            <button type="button" aria-label="Mes anterior" onClick={() => setView(new Date(year, month - 1, 1))}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <span className="date-picker-title">{MONTHS[month]} {year}</span>
            <button type="button" aria-label="Mes siguiente" onClick={() => setView(new Date(year, month + 1, 1))}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>

          <div className="date-picker-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>

          <div className="date-picker-grid">
            {cells.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} aria-hidden="true" />
              const isSelected = selected?.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
              return (
                <button
                  key={day}
                  type="button"
                  className={`date-picker-day${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                  aria-pressed={Boolean(isSelected)}
                  onClick={() => {
                    onChange(toIso(year, month, day))
                    setOpen(false)
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
