import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

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
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) close()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [close, dismissible])

  const content = (
    <div
      className={`modal-backdrop${backdropClassName ? ` ${backdropClassName}` : ''}${closing ? ' is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) close()
      }}
    >
      <section
        className={`${cardClassName}${closing ? ' is-closing' : ''}`}
        role={role}
        aria-modal="true"
        aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  )

  return portal ? createPortal(content, document.body) : content
})
