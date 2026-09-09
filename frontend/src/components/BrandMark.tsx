type BrandMarkProps = {
  small?: boolean
}

export function BrandMark({ small = false }: BrandMarkProps) {
  return <div className={`brand-mark${small ? ' brand-mark-small' : ''}`}>DV</div>
}
