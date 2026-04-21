import { useEffect, useState } from 'react'

/**
 * AnimatedNumber - 数字变化时显示浮动动画
 * 当 prev != current 时，显示 +X/-X 的浮动提示
 */
interface AnimatedNumberProps {
  value: number
  prevValue: number
  label?: string
  icon?: string
  colorClass?: string
  className?: string
}

export default function AnimatedNumber({ value, prevValue, label, icon, colorClass = 'text-[var(--accent-gold)]', className = '' }: AnimatedNumberProps) {
  const [showChange, setShowChange] = useState(false)
  const [changeValue, setChangeValue] = useState(0)

  useEffect(() => {
    const diff = value - prevValue
    if (diff !== 0) {
      setChangeValue(diff)
      setShowChange(true)
      const timer = setTimeout(() => setShowChange(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [value, prevValue])

  const isPositive = changeValue > 0
  const changeColor = isPositive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'

  return (
    <div className={`relative text-center p-4 card-modern-alt ${className}`}>
      {icon && <span className="text-2xl block">{icon}</span>}
      <span className={`font-bold ml-2 font-display ${colorClass}`}>{value}</span>
      {label && <p className="text-xs text-[var(--text-muted)] mt-2">{label}</p>}

      {/* 浮动动画 */}
      {showChange && (
        <div
          className={`absolute top-0 right-2 font-bold text-sm animate-float-up ${changeColor}`}
          key={Date.now()}
        >
          {isPositive ? '+' : ''}{changeValue}
        </div>
      )}
    </div>
  )
}
