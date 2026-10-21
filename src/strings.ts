// Все строки UI. Плейсхолдеры в фигурных скобках: {n}, {N}, {score}, {city}
export const strings = {
  menu: {
    title: 'Словополь',
    pickStop: 'Выберите остановку',
    stop: 'Остановка {n}: {city}',
  },
  game: {
    back: 'К остановкам',
    title: 'Остановка {n}: {city}',
    progress: 'прогресс {n} из {N}',
    score: 'Очки: {score}',
    slots: 'Слово',
    letters: 'Буквы',
    erase: 'Стереть',
    accept: 'Принять',
    statusShort: 'Слишком коротко — нужно минимум 3 буквы',
    statusCorrect: 'Верно!',
    statusBonus: 'Бонусное слово!',
    statusDuplicate: 'Уже найдено',
    statusUnknown: 'Такого слова нет',
  },
  grid: {
    title: 'Слова остановки',
    group: 'Слова из {n} букв',
    rowHidden: 'Не найдено слово из {n} букв, ряд {i}',
    placeholder: '·',
    bonusTitle: 'Бонусные слова:',
    bonusLabel: 'Бонус',
  },
} as const

// Подстановка значений в шаблон строки: «Очки: {score}» → «Очки: 30».
// Неизвестный плейсхолдер остаётся как есть — чтобы не терять текст.
export function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!Object.hasOwn(values, name)) {
      return match
    }
    const value = values[name]
    return typeof value === 'number' ? String(value) : value
  })
}
