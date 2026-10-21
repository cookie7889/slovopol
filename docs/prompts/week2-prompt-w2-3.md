# Промт W2-3 — Game.tsx: колесо букв, ввод, каркас экрана

**Роль:** кодер-агент OpenCode. **Проект:** «Словополь» (Vite + React 19 + TS, Yandex Games SDK через обёртку `src/sdk`).
**Задача:** W2-3 из docs/plans/p2-week2-decomposition.md §2. Закрыты: AG-1, FIX-1, FIX-2, W2-0, W2-1, W2-2 (включая ревью [К] для score).

## Перед работой (обязательно прочитать)

1. `AGENTS.md` — в т.ч. секцию «SDK и сборка (грабли платформы)».
2. `docs/plans/p2-week2-decomposition.md` — §1 (сквозные ограничения) и §2, задача W2-3 целиком.
3. `docs/gdd/gdd-v1.md` — §3 (core-цикл, таблица реакций), §12 (доступность).
4. Существующий код: `src/game/{types,levels,checkWord,score}.ts`, `src/sdk/index.ts` (интерфейс ISdk: `gameplayStart`/`gameplayStop`), `src/App.tsx` (демо-шаблон, будет заменён), `src/strings.ts`.

## Контекст репо

- `src/App.tsx` — демо-счётчик Vite; заменяется минимальной навигацией в этой задаче.
- `src/styles/base.css` — пустой; `src/screens/`, `src/components/` — пустые.
- `App.css` и демо-ассеты (`hero.png`, `react.svg`, `vite.svg`) — убрать из разметки, файлы в `src/assets/*` пока НЕ удалять.
- SDK обёртка уже реализована (real + mock): локально в консоли видны логи `[SDK:mock]`.

## Сквозные ограничения (кратко, полный список — §1 декомпозиции)

- TS strict: без `enum`/`namespace`/`any`/`as any`/`eslint-disable`; импорт типов — `import type`.
- Состояние — `useReducer` + props; Context на неделе 2 не нужен.
- Строки UI — только `src/strings.ts` (добавить все строки экрана туда, сгруппировать по экранам). Хардкод текста в JSX запрещён.
- Стили — обычный CSS, `src/screens/Game.css` на экран; общие токены — `src/styles/base.css`.
- Аудитория 45+: базовый шрифт ≥18px, кнопки/плитки ≥48×48px, контраст WCAG AA, ошибки — мягкие, без красных «страшных» состояний.
- Ё → Е: с клавиатуры Ё нормализуется в Е.
- SDK — только через `getSdk()`; `src/sdk/` не трогать.
- React 19 + StrictMode: все `useEffect` возвращают cleanup (в dev эффекты монтируются дважды).
- Новые зависимости запрещены. Файлы вне задачи не трогать. `console.log` в игровом коде не оставлять.

## Что сделать

### 1. `src/styles/base.css` — токены (значения можно править позже, имена фиксируем)

```css
:root {
  --bg: #faf6ef; /* тёплый кремовый фон */
  --card: #ffffff;
  --ink: #2e2a24; /* основной текст, контраст на --bg ≈ 13:1 */
  --muted: #6b6357;
  --accent: #b4552d; /* терракота, белый текст на ней ≈ 4.5:1 */
  --ok: #3a7d44;
  --tile: 56px;
  --font: 18px; /* базовый размер */
  --radius: 14px;
}
```

Базовый шрифт документа выставить от `--font`.

### 2. Создать `src/game/reducer.ts` — состояние экрана остановки

```ts
export interface GameState {
  stopId: number
  current: string // набираемое слово (нормализованное)
  used: number[] // индексы занятых плиток для current
  guessed: Set<string> // main + bonus, найденные здесь
  guessedMain: string[]
  guessedBonus: string[]
  score: number // очки остановки (с учётом удвоения)
  doubled: boolean // «Удвоить» уже применено
  statusKey: string | null // ключ строки статуса для aria-live
  flash: { kind: 'ok' | 'bonus' | 'bad' | 'soft'; seq: number } | null
  // seq — монотонный счётчик: различать одинаковые события подряд
}
```

Действия: `TAP_TILE {index}` (плитка не из `used`, иначе игнор), `ERASE` (снять последнюю букву), `ACCEPT`, `CLEAR_STATUS`.

`ACCEPT`: длина < 3 → flash `bad` + `statusKey: 'statusShort'`; иначе `checkWord(current, stop, guessed)` и по веткам:
- `correct`/`bonus`: добавить в `guessed/guessedMain/guessedBonus`, `score += scoreWord(word, isBonus)`, `current=''`, `used=[]`, flash `ok`/`bonus`, статус «Верно!»/«Бонусное слово!»;
- `duplicate`: flash `soft`, статус «Уже найдено» (БЕЗ тряски — мягко, GDD §3);
- `invalid`: flash `bad`, статус «Такого слова нет», `current=''`, `used=[]`.

Редьюсер чистый; `stop` (StopData) приходит в action/init или замыканием через thunk-обёртку — на усмотрение, но без React внутри `src/game/`. Инициализация — фабрика `createGameState(stop: StopData): GameState`.

Все ключи статусов — в `strings.ts`; в редьюсоре — только ключи (`statusShort`, `statusCorrect`…), не тексты.

### 3. Создать `src/screens/Game.tsx` + `src/screens/Game.css`

Разметка сверху вниз:
- шапка: кнопка «К остановкам» (навигация вверх через пропс callback), город, `прогресс {n} из {N}`, `Очки: {score}`;
- слоты текущего слова (7 ячеек);
- строка статуса `aria-live="polite"`;
- колесо из 7 кнопок;
- кнопки «Стереть» и «Принять».

Колесо — контейнер `--wheel-size: min(88vw, 340px)`, 7 кнопок позиционируются чистым CSS:

```css
.wheel { position: relative; width: var(--wheel-size); aspect-ratio: 1; }
.wheel__btn {
  position: absolute; left: 50%; top: 50%;
  width: var(--tile); height: var(--tile);
  font-size: 24px; font-weight: 600;
  transform: translate(-50%, -50%) rotate(var(--a))
    translateY(calc(var(--wheel-size) / -2 + var(--tile) / 2 - 8px))
    rotate(calc(var(--a) * -1));
}
.wheel__btn.is-used { opacity: 0.35; pointer-events: none; }
```

Угол `--a = -90deg + index * (360/7)deg` — инлайн-стилем на каждой кнопке.

Поведение:
- тап по плитке → `TAP_TILE`; плитка выбирается по клику даже если такая буква уже занята — берётся следующая свободная плитка с той же буквой (буквы уникальны, но код не должен на этом ломаться);
- клавиатура: `useEffect` с `keydown` (**cleanup обязателен**): `e.key` матчится на `/^[а-яёА-ЯЁ]$/` → нормализовать → найти первую свободную плитку с этой буквой → `TAP_TILE`; `Backspace` → `ERASE`; `Enter` → `ACCEPT`;
- «Принять» → `ACCEPT`; кнопки ≥48px, шрифт ≥18px;
- `useEffect` на монтировании/размонтировании: `getSdk()` → `gameplayStart()` / `gameplayStop()` (без await-цепочек, ошибки — в консоль).

Пропсы: `{ stop: StopData; onExit: () => void }` — навигацию держит App.

### 4. `src/App.tsx` — минимальная навигация ВМЕСТО демо-шаблона (временная, до карты W3-1)

- `useState`: `{ name: 'menu' } | { name: 'game'; stopId: number }`;
- меню-заглушка: заголовок из `strings.menu.title`, `pickStop`, кнопки «Остановка {n}: {city}» по `getStopIds()` (стиль .btn-secondary);
- это НЕ итоговый Home-экран GDD §9 (тот появится с картой) — пометить комментарием «заглушка навигации до W3-1»;
- `App.css` и демо-ассеты (hero/react/vite) из разметки убрать, файлы `src/assets/*` пока не удалять.
- `<Game key={stopId} stop={stop} onExit={…} />` — ключ по stopId обязателен: компонент монтируется заново на каждую остановку, `createGameState(stop)` вызывается на монтировании. Переиспользовать состояние между остановками запрещено.

### 5. `src/strings.ts`

Добавить все строки экрана остановки и статусов, сгруппировав: `menu`, `game` (шапка, кнопки, статусы), плейсхолдеры `{n}`, `{N}`, `{score}`, `{city}`.

## Критерии приёмки

- [ ] Демо-счётчика больше нет; с меню открывается любая из 3 остановок; назад — кнопка «К остановкам» в шапке игры.
- [ ] Слово набирается тапом и с физической клавиатуры; Ё с клавиатуры превращается в Е; Backspace/Enter работают.
- [ ] Занятая плитка бледнеет и не нажимается; «Стереть» снимает последнюю букву и возвращает плитку.
- [ ] На остановке 1: `ВОКЗАЛ` → очки +30, слово принимается; повторный `ЗАЛ` → «Уже найдено» без тряски; `ЗОНТ` → тряска + «Такого слова нет», поле очищается.
- [ ] Прогресс «{n} из {N}» и «Очки» обновляются после каждого принятого слова.
- [ ] В mock-логе видны `[SDK:mock] gameplayStart/Stop` при входе/выходе с экрана.
- [ ] Кнопки/плитки ≥48px, базовый шрифт ≥18px.
- [ ] `npm run lint && npm run typecheck && npm run build` зелёные.
- [ ] Коммит `W2-3: экран остановки — колесо, ввод тапом и клавиатурой, редьюсер`.

## Ограничения

- Сетку слов и анимации НЕ делать здесь (W2-4).
- Звуки не подключать. Подсказки, сохранения, карту — не делать.
- Строки — только через `strings.ts`. `src/sdk/` не трогать.
- Не удалять `src/assets/*` (только убрать из разметки).

## Порядок сдачи

1. Ручная проверка в `npm run dev` по критериям выше (все 3 остановки открываются, ввод работает, SDK-логи видны).
2. `npm run format` → `npm run lint` → `npm run typecheck` → `npm run build`.
3. Коммит `W2-3: …`, запуш.
4. Заполнить отчёт `docs/reports/week2-result-w2-3.md` и прислать оркестратору.
