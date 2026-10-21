import { fillTemplate, strings } from '../strings'

// Максимум звёзд за остановку (GДД §4)
const MAX_STARS = 3

interface StarProps {
  filled: boolean
}

// Звезда инлайном (спрайт icons.svg из демо-шаблона Vite уйдёт)
function Star({ filled }: StarProps) {
  return (
    <svg
      className="star"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2.6l2.85 5.9 6.45.9-4.7 4.5 1.15 6.4L12 17.2l-5.75 3.1 1.15-6.4-4.7-4.5 6.45-.9z"
        fill={filled ? 'var(--accent)' : 'none'}
        stroke={filled ? 'var(--accent)' : 'var(--muted)'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface StarsProps {
  // Сколько звёзд заработано (1–3)
  count: number
}

export default function Stars({ count }: StarsProps) {
  const label = fillTemplate(strings.complete.starsLabel, {
    n: count,
    N: MAX_STARS,
  })
  return (
    <div className="stars" role="img" aria-label={label}>
      {Array.from({ length: MAX_STARS }, (_, index) => (
        <Star key={index} filled={index < count} />
      ))}
    </div>
  )
}
