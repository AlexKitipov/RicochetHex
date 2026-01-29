
# План за добавяне на AI опонент

## Обзор

Ще добавя AI противник, който може да играе срещу играча. AI ще има два режима на трудност:
- **Лесен** - случайни валидни ходове
- **Среден** - базова стратегия с оценка на позициите

---

## Нови файлове

### 1. `src/lib/gameAI.ts` - AI логика

```text
┌─────────────────────────────────────────────────────┐
│                    AI Engine                        │
├─────────────────────────────────────────────────────┤
│  • getAllValidMoves(pawns, player)                  │
│    - Връща всички възможни ходове за играч         │
│                                                     │
│  • evaluatePosition(pawns, player)                  │
│    - Оценява текущата позиция                       │
│    - Фактори: позиция към целта, активни пешки,    │
│      заплахи за неутрализация/залавяне             │
│                                                     │
│  • evaluateMove(from, to, pawns, player)           │
│    - Симулира ход и оценява резултата              │
│                                                     │
│  • getRandomMove(pawns, player)                     │
│    - Избира случаен валиден ход (Easy mode)        │
│                                                     │
│  • getBestMove(pawns, player)                       │
│    - Оценява всички ходове и избира най-добрия     │
│    - Използва evaluateMove за scoring              │
└─────────────────────────────────────────────────────┘
```

**Критерии за оценка на ходове:**
- +50 точки: Ход към противниковия заден ред
- +30 точки: Ход напред към целта
- +40 точки: Ход който неутрализира противник
- +60 точки: Ход който залавя противникова пешка
- +25 точки: Ход който възстановява своя пешка
- -20 точки: Ход който излага пешка на неутрализация
- +10 точки: Защитен ход (близо до свои пешки)

### 2. `src/hooks/useAIGame.ts` - AI game state hook

Разширява `useGameState` с:
- `gameMode: 'local' | 'vs-ai'`
- `aiDifficulty: 'easy' | 'medium'`
- `isAIThinking: boolean`
- Автоматично изпълнява AI ход когато е ред на AI
- Добавя закъснение (500-1000ms) за по-естествено усещане

---

## Модификации на съществуващи файлове

### 3. `src/pages/Index.tsx`

Добавям:
- Game mode selection UI преди играта
- Показване кога AI "мисли"
- Използване на `useAIGame` вместо `useGameState`

### 4. `src/components/game/GameControls.tsx`

Добавям:
- Индикатор за game mode (Local / vs AI)
- Dropdown за избор на трудност
- Бутон за смяна на режима

### 5. `src/components/game/GameModeSelector.tsx` (нов)

Компонент за избор на режим преди започване:
```text
┌────────────────────────────────────────┐
│         🎮 Избери режим               │
├────────────────────────────────────────┤
│  ┌──────────┐    ┌──────────────────┐  │
│  │ 👥       │    │ 🤖               │  │
│  │ Локален  │    │ Срещу AI         │  │
│  │мултиплейр│    │                  │  │
│  └──────────┘    │ Трудност:        │  │
│                  │ ○ Лесно          │  │
│                  │ ○ Средно         │  │
│                  └──────────────────┘  │
│                                        │
│        [ Започни игра ]               │
└────────────────────────────────────────┘
```

---

## Технически детайли

### AI алгоритъм (Medium difficulty)

```typescript
function getBestMove(pawns: Map<string, Pawn>, player: PlayerColor): {from: HexCoord, to: HexCoord} {
  const allMoves = getAllValidMoves(pawns, player);
  
  let bestMove = allMoves[0];
  let bestScore = -Infinity;
  
  for (const move of allMoves) {
    const score = evaluateMove(move.from, move.to, pawns, player);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}
```

### AI timing

```typescript
// В useAIGame hook
useEffect(() => {
  if (gameMode === 'vs-ai' && currentPlayer === 'red' && !gameOver) {
    setIsAIThinking(true);
    
    const thinkingTime = aiDifficulty === 'easy' ? 500 : 800;
    
    setTimeout(() => {
      const move = aiDifficulty === 'easy' 
        ? getRandomMove(pawns, 'red')
        : getBestMove(pawns, 'red');
      
      if (move) {
        executeMove(move.from, move.to);
      }
      setIsAIThinking(false);
    }, thinkingTime);
  }
}, [currentPlayer, gameMode, gameOver]);
```

---

## Стъпки за имплементация

1. **Създай `src/lib/gameAI.ts`**
   - `getAllValidMoves()` - събира всички възможни ходове
   - `evaluatePosition()` - оценява board state
   - `evaluateMove()` - симулира и оценява ход
   - `getRandomMove()` - за лесен режим
   - `getBestMove()` - за среден режим

2. **Създай `src/components/game/GameModeSelector.tsx`**
   - UI за избор на режим и трудност
   - Radio buttons за local/AI
   - Dropdown за трудност

3. **Създай `src/hooks/useAIGame.ts`**
   - Wrap-ва useGameState логиката
   - Добавя AI turn handling
   - Управлява game mode state

4. **Модифицирай `src/pages/Index.tsx`**
   - Добави state за показване на mode selector
   - Интегрирай новия hook
   - Покажи AI thinking indicator

5. **Модифицирай `src/components/game/GameControls.tsx`**
   - Добави game mode indicator
   - Деактивирай undo/redo по време на AI turn

---

## Бъдещи подобрения (извън този план)

- **Hard difficulty**: Minimax алгоритъм с alpha-beta pruning
- **AI играе с Сините**: Опция играчът да избере цвят
- **AI vs AI**: Режим за наблюдение
