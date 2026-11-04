type TableSkeletonProps = {
  label: string
  columns: string[]
  rows?: number
  className?: string
}

const CELL_WIDTHS = ['78%', '58%', '84%', '92%', '66%', '72%', '50%']

export function TableSkeleton({ label, columns, rows = 6, className }: TableSkeletonProps) {
  const gridTemplateColumns = columns.join(' ')

  return (
    <div className={`skeleton-table${className ? ` ${className}` : ''}`} role="status">
      <span className="sr-only">{label}</span>
      <div className="skeleton-table-row is-header" aria-hidden="true" style={{ gridTemplateColumns }}>
        {columns.map((_, index) => (
          <span className="skeleton-cell" key={index}>
            <span className="skeleton-bar is-header" />
          </span>
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="skeleton-table-row" aria-hidden="true" key={rowIndex} style={{ gridTemplateColumns }}>
          {columns.map((_, columnIndex) => (
            <span className="skeleton-cell" key={columnIndex}>
              <span
                className="skeleton-bar"
                style={{ width: CELL_WIDTHS[columnIndex % CELL_WIDTHS.length] }}
              />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

type ListSkeletonProps = {
  label: string
  rows?: number
}

export function ListSkeleton({ label, rows = 4 }: ListSkeletonProps) {
  return (
    <div className="skeleton-list" role="status">
      <span className="sr-only">{label}</span>
      <ul className="subjects-list" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <li className="subjects-item" key={index}>
            <span className="skeleton-bar skeleton-bar-text" />
            <span className="skeleton-bar skeleton-bar-meta" />
          </li>
        ))}
      </ul>
    </div>
  )
}

type ChecklistSkeletonProps = {
  label: string
  title: string
  items?: number
}

export function ChecklistSkeleton({ label, title, items = 9 }: ChecklistSkeletonProps) {
  return (
    <div className="subjects-levels" role="status">
      <span className="sr-only">{label}</span>
      <div className="subjects-levels-head">
        <span className="subjects-levels-title">{title}</span>
        <span className="subjects-levels-meta">
          <span className="skeleton-bar skeleton-levels-count" />
        </span>
      </div>
      <div className="subjects-checklist" aria-hidden="true">
        {Array.from({ length: items }, (_, index) => (
          <span className="subjects-checkbox skeleton-checkbox" key={index}>
            <span className="skeleton-bar skeleton-bar-check" />
            <span className="skeleton-bar skeleton-bar-text" />
          </span>
        ))}
      </div>
    </div>
  )
}
