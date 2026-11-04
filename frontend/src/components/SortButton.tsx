export type SortKey = 'alfabetico' | 'alfabetico-desc' | 'adicion' | 'curso'

export type SortOption = { value: SortKey; label: string }

function SortIcon({ sort }: { sort: SortKey }) {
  const iconProps = {
    className: 'subjects-sort-icon',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (sort === 'alfabetico-desc') {
    return (
      <svg {...iconProps}>
        <path d="m3 16 4 4 4-4" />
        <path d="M7 20V4" />
        <path d="M15 4h5l-5 6h5" />
        <path d="M15 20v-3.5a2.5 2.5 0 0 1 5 0V20" />
        <path d="M20 18h-5" />
      </svg>
    )
  }

  if (sort === 'adicion') {
    return (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4M12 13v4M10 15h4" />
      </svg>
    )
  }

  if (sort === 'curso') {
    return (
      <svg {...iconProps}>
        <path d="m22 10-10-5L2 10l10 5 10-5Z" />
        <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      </svg>
    )
  }

  return (
    <svg {...iconProps}>
      <path d="m3 16 4 4 4-4" />
      <path d="M7 20V4" />
      <path d="M20 8h-5" />
      <path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10" />
      <path d="M15 14h5l-5 6h5" />
    </svg>
  )
}

type SortButtonProps = {
  options: SortOption[]
  value: SortKey
  onChange: (value: SortKey) => void
}

export function SortButton({ options, value, onChange }: SortButtonProps) {
  const index = options.findIndex((option) => option.value === value)
  const current = options[index] ?? options[0]

  function cycle() {
    const next = options[(index + 1) % options.length]
    onChange(next.value)
  }

  return (
    <div className="subjects-sort">
      <button
        className="secondary-button subjects-sort-button"
        type="button"
        onClick={cycle}
        aria-label={`Cambiar orden. Actual: ${current.label}`}
      >
        <SortIcon sort={current.value} />
        Orden {current.label}
      </button>
    </div>
  )
}
