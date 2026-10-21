import { useState } from 'react'
import { getStop, getStopIds } from './game/levels'
import { fillTemplate, strings } from './strings'
import Game from './screens/Game'
import './styles/base.css'

// Временная навигация: меню-заглушка и экран остановки.
// Итоговый Home-экран с картой появится в W3-1.
type Screen = { name: 'menu' } | { name: 'game'; stopId: number }

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })

  if (screen.name === 'game') {
    const stop = getStop(screen.stopId)
    return (
      <Game
        key={stop.id}
        stop={stop}
        onExit={() => setScreen({ name: 'menu' })}
      />
    )
  }

  // Заглушка навигации до W3-1: список остановок вместо карты
  return (
    <div className="menu">
      <h1 className="menu__title">{strings.menu.title}</h1>
      <p className="menu__hint">{strings.menu.pickStop}</p>
      <ul className="menu__list">
        {getStopIds().map((id) => {
          const stop = getStop(id)
          const label = fillTemplate(strings.menu.stop, {
            n: stop.id,
            city: stop.city,
          })
          return (
            <li key={stop.id}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setScreen({ name: 'game', stopId: stop.id })}
              >
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default App
