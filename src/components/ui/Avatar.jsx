import { getInitials } from '../../lib/utils'

const COLORS = [
  ['#dbeafe','#1e40af'], ['#ede9fe','#5b21b6'], ['#d1fae5','#065f46'],
  ['#fef3c7','#92400e'], ['#fce7f3','#831843'], ['#e0e7ff','#3730a3'],
]

function getColor(name) {
  if (!name) return COLORS[0]
  const i = name.charCodeAt(0) % COLORS.length
  return COLORS[i]
}

export function Avatar({ name, src, size = 32, className = '' }) {
  const [bg, text] = getColor(name)
  const style = { width: size, height: size, minWidth: size, fontSize: size * 0.38 }

  if (src) return (
    <img src={src} alt={name} className={`rounded-full object-cover ${className}`} style={style} />
  )

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold select-none ${className}`}
      style={{ ...style, backgroundColor: bg, color: text }}
    >
      {getInitials(name)}
    </div>
  )
}
