type RoleIconProps = {
  role: string
}

export function RoleIcon({ role }: RoleIconProps) {
  if (role === 'DOCENTE') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h6a2 2 0 0 1 2 2v13c-.6-.7-1.4-1-2.5-1H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" /><path d="M13 6.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4c-1.1 0-1.9.3-2.5 1M6 8h4M6 11h4" /></svg>
  }

  if (role === 'TECNICO') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" /></svg>
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7 9-7 9-7-9 7-9Z" /></svg>
}
