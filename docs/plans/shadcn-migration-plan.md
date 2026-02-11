# Миграция VIBES LMS на shadcn/ui с темой Rose

## Context

VIBES LMS — образовательная платформа на React 19 + Vite 6 + Tailwind CSS v4. Сейчас все UI-компоненты кастомные (Shared.tsx, инлайн-стили в views). Цель: перевести на shadcn/ui для консистентности, поддерживаемости и профессионального вида. Одновременно меняем акцентный цвет с violet на rose.

**Решения по дизайну:**
- Постепенная миграция (фаза за фазой, деплой между фазами)
- Цвет: violet → rose (rose-500 `#f43f5e`)
- Overlays: переходим на стандартные shadcn Sheet/Dialog (CSS-анимации Radix)
- Framer Motion сохраняем для: переходов страниц (AnimatePresence), Sidebar layoutId, SplashScreen, ambient blobs
- Sidebar: минимальные изменения (только кнопки)

---

## Фаза 0: Foundation

**Цель:** Инициализировать shadcn, настроить тему, не сломать существующий код.

### Шаги

1. **Установить зависимости**
   ```bash
   npm install clsx tailwind-merge
   npx shadcn@latest init
   ```
   При init: style=New York, base color=Slate, CSS variables=Yes, alias=`@/components`

2. **Создать `lib/utils.ts`** — утилита `cn()`
   ```ts
   import { type ClassValue, clsx } from "clsx"
   import { twMerge } from "tailwind-merge"
   export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
   ```

3. **Добавить CSS-переменные shadcn в `index.css`** — в блоки `:root` и `.dark`
   - Primary: rose HSL values (`346.8 77.2% 49.8%`)
   - Ring: rose
   - Radius: `0.75rem` (12px = текущий rounded-xl)
   - **НЕ удалять** существующие `--color-vibe-*`, `--color-glass-*`, `--color-dark-*`

4. **Обновить палитру vibe → rose** в `@theme` блоке `index.css`
   ```css
   --color-vibe-50: #fff1f2;   /* rose-50 */
   --color-vibe-500: #f43f5e;  /* rose-500 */
   --color-vibe-600: #e11d48;  /* rose-600 */
   /* ... остальные rose оттенки */
   ```

5. **Обновить `pulse-glow`** в keyframes: `rgba(139,92,246,...)` → `rgba(244,63,94,...)`

### Файлы
- `index.css` (строки 11-22 палитра, 58-61 keyframes, 68-84 CSS vars)
- `lib/utils.ts` (новый)
- `components.json` (создаётся shadcn init)
- `package.json` (новые deps)

### Проверка
```bash
npm run build && npm run dev
```
Приложение должно выглядеть как раньше (фундамент добавлен, ничего не заменено).

---

## Фаза 1: Миграция Shared.tsx (core components)

**Цель:** Заменить 6 shared-компонентов на shadcn, сохраняя API.

### Шаги

1. **Установить shadcn-компоненты**
   ```bash
   npx shadcn@latest add button input label select dialog sheet alert-dialog
   ```

2. **Создать обёртки** в `components/Shared.tsx` (заменяем in-place):

   | Компонент | shadcn замена | Стратегия |
   |-----------|-------------|-----------|
   | PageHeader | Оставить как есть | Только `violet-*` → `rose-*` |
   | Input | `@/components/ui/input` + `label` | Обёртка с иконкой, тот же API |
   | Select | `@/components/ui/native-select` | Native select проще для совместимости |
   | Drawer | `@/components/ui/sheet` (side=right) | Убираем Framer Motion, используем Sheet |
   | Modal | `@/components/ui/dialog` | Убираем Framer Motion, используем Dialog |
   | ConfirmModal | `@/components/ui/alert-dialog` | Прямая замена |

3. **Важно для Select:** Текущий Select — нативный `<select>` с `onChange` (ChangeEvent). shadcn Select (Radix) использует `onValueChange(string)`. Два варианта:
   - **Рекомендую:** Использовать `native-select` из shadcn (совместим с `onChange`)
   - Альтернатива: shadcn Select + обёртка с синтетическим событием

4. **Drawer → Sheet:** Убрать AnimatePresence/motion.div, заменить на:
   ```tsx
   <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
     <SheetContent side="right" className={cn("w-full flex flex-col", width)}>
       <SheetHeader>...</SheetHeader>
       <div className="flex-1 overflow-y-auto p-8">{children}</div>
       {footer && <div className="border-t p-8 flex justify-end gap-4">{footer}</div>}
     </SheetContent>
   </Sheet>
   ```

5. **Modal → Dialog:** Аналогично убрать motion, заменить на Dialog.

6. **ConfirmModal → AlertDialog:** Сохранить визуал (AlertTriangle, красные кнопки).

### Файлы
- `components/Shared.tsx` — полная перезапись (206 строк)
- `components/ui/` — создаются shadcn add

### Проверка
- Открыть AdminContent → Drawer должен открываться справа
- Открыть любой view с Modal → модалка по центру
- AdminStudents → удалить студента → ConfirmModal работает
- Все формы с Input/Select → ввод и выбор работают

---

## Фаза 2: Button / Badge унификация

**Цель:** Заменить инлайн-кнопки (20+ мест) на `<Button>`.

### Шаги

1. **Кастомизировать `components/ui/button.tsx`** — добавить варианты:
   - `primary`: `bg-rose-600 text-white hover:bg-rose-700`
   - `default`: `bg-zinc-900 dark:bg-white text-white dark:text-zinc-900`
   - `outline`, `ghost`, `destructive` — стандартные shadcn
   - Размеры: `default` (h-12), `sm` (h-9), `lg` (h-14), `icon` (h-10 w-10)
   - Все с `rounded-xl` и `font-bold`

2. **Установить badge:** `npx shadcn@latest add badge`

3. **Глобальная замена кнопок** (поиск по `<button className=`):
   - `views/Home.tsx` — "Продолжить обучение" → `<Button>`
   - `views/Admin*.tsx` — "Сохранить", "Добавить", "Удалить" → `<Button>`
   - `components/admin/content/EditorForms.tsx` — кнопки форм
   - `components/Sidebar.tsx` — кнопки темы, звука, выхода
   - `components/AdminPasswordModal.tsx` — кнопки входа

4. **Замена badge** (поиск по `uppercase tracking-widest`):
   - Home.tsx "WEEK 01" → `<Badge>`
   - Lessons.tsx статусы → `<Badge>`

### Файлы
- `components/ui/button.tsx` — кастомизация вариантов
- `views/Home.tsx`, `views/AdminStudents.tsx`, `views/AdminContent.tsx`, `views/AdminCalls.tsx`, `views/AdminCohorts.tsx`, `views/AdminSettings.tsx`
- `components/admin/content/EditorForms.tsx`
- `components/Sidebar.tsx`, `components/AdminPasswordModal.tsx`

### Проверка
- Все кнопки визуально консистентны (rose/zinc тема)
- Hover/active состояния работают
- `npm run build` без ошибок

---

## Фаза 3: Admin компоненты (Table, Tabs, Form elements)

**Цель:** Структурировать admin UI через shadcn Table, Tabs, Checkbox, Textarea.

### Шаги

1. **Установить:**
   ```bash
   npx shadcn@latest add table tabs checkbox textarea separator
   ```

2. **AdminContent → shadcn Tabs:**
   - Заменить кастомную таб-навигацию на `<Tabs>/<TabsList>/<TabsTrigger>/<TabsContent>`
   - 7 табов: Уроки, Стили, Промпты, Категории, Словарь, Дорожные карты, Стадии

3. **AdminStudents → shadcn Table:**
   - Заменить `<table>` на `<Table>/<TableHeader>/<TableBody>/<TableRow>/<TableCell>`
   - Checkbox → shadcn `<Checkbox>` с rose стилем

4. **EditorForms → shadcn Textarea + Checkbox:**
   - Нативные `<textarea>` → shadcn `<Textarea>`
   - Нативные `<input type="checkbox">` → shadcn `<Checkbox>`

### Файлы
- `views/AdminContent.tsx` — табы
- `views/AdminStudents.tsx` — таблица
- `views/AdminCalls.tsx` — таблица
- `views/AdminCohorts.tsx` — таблица
- `components/admin/content/EditorForms.tsx` — формы

### Проверка
- AdminContent: все 7 табов переключаются, контент загружается
- AdminStudents: CRUD (создать, читать, обновить, удалить студента)
- Чекбоксы: select all, individual select
- Формы: создание/редактирование контента работает

---

## Фаза 4: Student views (Card, Avatar, Progress, Skeleton)

**Цель:** Модернизировать студенческие view'ы с shadcn Card, Avatar, Progress, Skeleton.

### Шаги

1. **Установить:**
   ```bash
   npx shadcn@latest add card avatar progress skeleton scroll-area tooltip
   ```

2. **Порядок миграции** (от простого к сложному):
   1. `Glossary.tsx` — карточки терминов → shadcn Card
   2. `ToolsView.tsx` — карточки инструментов → shadcn Card
   3. `Roadmaps.tsx` — карточки дорожных карт → Card
   4. `StyleLibrary.tsx` — карточки стилей → Card
   5. `UserProfile.tsx` — аватар → Avatar, формы уже на shadcn
   6. `Lessons.tsx` — прогресс → Progress, карточки → Card
   7. `Home.tsx` — Dashboard: Card, Badge, Progress, Avatar
   8. `PromptBase.tsx` — самый большой (60KB), Card + Badge + Tooltip

3. **SkeletonLoader.tsx → shadcn Skeleton:**
   - Заменить базовый shimmer-элемент на `<Skeleton>`
   - 8 кастомных скелетонов (StyleCard, LessonCard и т.д.) — обновить, используя shadcn `<Skeleton>`

### Файлы
- `views/Glossary.tsx`, `views/ToolsView.tsx`, `views/Roadmaps.tsx`
- `views/StyleLibrary.tsx`, `views/UserProfile.tsx`, `views/Lessons.tsx`
- `views/Home.tsx`, `views/PromptBase.tsx`
- `components/SkeletonLoader.tsx`

### Проверка
- Каждый view: открыть → визуально проверить → взаимодействие (клик, поиск, фильтр)
- Скелетоны: перейти на lazy-loaded view → скелетон при загрузке
- Dark/light mode: все card/badge/avatar корректны в обеих темах

---

## Фаза 5: Глобальная замена violet → rose

**Цель:** Финальная зачистка всех упоминаний violet-цвета.

### Шаги

1. **Global find & replace** по всем `.tsx`, `.ts`, `.css` файлам:

   | Найти | Заменить |
   |-------|----------|
   | `violet-50` | `rose-50` |
   | `violet-100` | `rose-100` |
   | `violet-200` | `rose-200` |
   | `violet-300` | `rose-300` |
   | `violet-400` | `rose-400` |
   | `violet-500` | `rose-500` |
   | `violet-600` | `rose-600` |
   | `violet-700` | `rose-700` |
   | `violet-800` | `rose-800` |
   | `violet-900` | `rose-900` |
   | `violet-950` | `rose-950` |

2. **Обновить градиенты:**
   - `from-violet-* to-fuchsia-*` → `from-rose-* to-pink-*`
   - `from-violet-* to-indigo-*` → `from-rose-* to-pink-*`

3. **Обновить ambient blobs в App.tsx:**
   - Student mode: violet/fuchsia/indigo blobs → rose/pink blobs
   - Admin mode: аналогично

4. **Проверить HEX-коды:** `#8b5cf6`, `#7c3aed` → `#f43f5e`, `#e11d48`

### Файлы (основные)
- `index.css` — палитра, gradients, selection color
- `views/Home.tsx` — gradient cards, progress ring
- `views/Lessons.tsx` — module accents
- `components/Sidebar.tsx` — active state
- `components/SplashScreen.tsx` — gradient
- `components/admin/CohortSelector.tsx` — violet scheme
- `App.tsx` — ambient blobs
- Все остальные views и компоненты с violet

### Проверка
- `grep -r "violet" --include="*.tsx" --include="*.ts" --include="*.css"` должен вернуть 0 результатов
- Визуальный аудит каждого view в light + dark mode

---

## Итоговая верификация

### Build
```bash
npm run build  # Без ошибок TypeScript
npm run dev    # Без ошибок в консоли
```

### Функциональный тест

**Студент:**
- [ ] Home → карточки, прогресс, навигация
- [ ] Lessons → модули раскрываются, уроки открываются
- [ ] Tools → 3 AI-инструмента работают
- [ ] PromptBase → фильтрация, копирование
- [ ] StyleLibrary → стили отображаются
- [ ] Glossary → поиск работает
- [ ] Roadmaps → список загружается
- [ ] UserProfile → редактирование, сохранение

**Админ:**
- [ ] AdminStudents → CRUD, таблица, фильтры, чекбоксы
- [ ] AdminContent → 7 табов, CRUD для каждого типа
- [ ] AdminCalls → список, добавление, удаление
- [ ] AdminCohorts → управление потоками
- [ ] AdminSettings → сохранение настроек

**Общее:**
- [ ] Dark/light mode toggle
- [ ] Sidebar навигация (student + admin)
- [ ] Mobile responsive (проверить на 375px)
- [ ] Скелетоны при lazy-load
- [ ] Framer Motion: переходы страниц, Sidebar layoutId, SplashScreen

### Production deploy
```bash
# Vercel auto-deploy при push
```
Проверить https://vibes-navy.vercel.app/

---

## Критические файлы

| Файл | Строки | Роль |
|------|--------|------|
| `index.css` | ~180 | Тема, CSS vars, палитра |
| `components/Shared.tsx` | 206 | 6 core компонентов (главная цель Фазы 1) |
| `components/admin/content/EditorForms.tsx` | ~1000 | 9 форм, Input/Select/Checkbox |
| `views/AdminStudents.tsx` | ~1100 | Таблица, самый сложный admin view |
| `views/Home.tsx` | ~800 | Dashboard, первое впечатление |
| `views/PromptBase.tsx` | ~1600 | Самый большой view |
| `components/Sidebar.tsx` | 302 | Навигация |
| `App.tsx` | ~900 | Layout, ambient blobs, роутинг |
| `vite.config.ts` | 40 | `@` alias (уже настроен) |
| `tsconfig.json` | 28 | `@/*` paths (уже настроен) |
