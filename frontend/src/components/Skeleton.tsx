type TableSkeletonProps = {
  label: string
  columns: string[]
  rows?: number
}

const CELL_WIDTHS = ['78%', '58%', '84%', '92%', '66%', '72%', '50%']

export function TableSkeleton({ label, columns, rows = 6 }: TableSkeletonProps) {
  const gridTemplateColumns = columns.map((column) => `${parseFloat(column)}fr`).join(' ')

  return (
    <div className="skeleton-table" role="status">
      <span className="sr-only">{label}</span>
      <div className="skeleton-table-row is-header" aria-hidden="true" style={{ gridTemplateColumns }}>
        {columns.map((_, index) => (
          <span className="skeleton-bar is-header" key={index} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="skeleton-table-row" aria-hidden="true" key={rowIndex} style={{ gridTemplateColumns }}>
          {columns.map((_, columnIndex) => (
            <span
              className="skeleton-bar"
              key={columnIndex}
              style={{ width: CELL_WIDTHS[columnIndex % CELL_WIDTHS.length] }}
            />
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
