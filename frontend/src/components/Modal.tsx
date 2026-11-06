import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent, ReactNode } from 'react'

export type ModalHandle = {
  close: (after?: () => void) => void
}

type ModalProps = {
  label: string
  onClose: () => void
  role?: 'dialog' | 'alertdialog'
  backdropClassName?: string
  cardClassName?: string
  dismissible?: boolean
  portal?: boolean
  children: ReactNode
}

const EXIT_DURATION = 180
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const modalStack: symbol[] = []
let previousBodyOverflow = ''
let previousHtmlOverflow = ''

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.getClientRects().length > 0)
}

export const Modal = forwardRef<ModalHandle, ModalProps>(function Modal({
  label,
  onClose,
  role = 'dialog',
  backdropClassName,
  cardClassName = 'create-device-card modal-card',
  dismissible = true,
  portal = false,
  children,
}, ref) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const modalIdRef = useRef(Symbol('modal'))

  const close = useCallback((after?: () => void) => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timerRef.current = window.setTimeout(() => {
      after?.()
      onClose()
    }, reduced ? 0 : EXIT_DURATION)
  }, [onClose])

  useImperativeHandle(ref, () => ({ close }), [close])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  useEffect(() => {
    const modalId = modalIdRef.current
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const isFirstModal = modalStack.length === 0

    if (isFirstModal) {
      previousBodyOverflow = document.body.style.overflow
      previousHtmlOverflow = document.documentElement.style.overflow
      document.body.classList.add('modal-open')
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }

    modalStack.push(modalId)

    const section = sectionRef.current
    const focusables = section ? focusableElements(section) : []
    ;(focusables[0] ?? section)?.focus()

    return () => {
      const index = modalStack.indexOf(modalId)
      if (index >= 0) modalStack.splice(index, 1)

      if (modalStack.length === 0) {
        document.body.classList.remove('modal-open')
        document.body.style.overflow = previousBodyOverflow
        document.documentElement.style.overflow = previousHtmlOverflow
      }

      previouslyFocused?.focus()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (modalStack[modalStack.length - 1] !== modalIdRef.current) return
      if (dismissible) close()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [close, dismissible])

  function handleTab(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab' || !sectionRef.current) return

    const focusables = focusableElements(sectionRef.current)

    if (focusables.length === 0) {
      event.preventDefault()
      sectionRef.current.focus()
      return
    }

    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const content = (
    <div
      className={`modal-backdrop${backdropClassName ? ` ${backdropClassName}` : ''}${closing ? ' is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) close()
      }}
    >
      <section
        ref={sectionRef}
        className={`${cardClassName}${closing ? ' is-closing' : ''}`}
        role={role}
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleTab}
      >
        {children}
      </section>
    </div>
  )

  return portal ? createPortal(content, document.body) : content
})
