
# План за оправяне на Undo/Redo бъга

## Открит проблем

При натискане на **Undo** бутона, дъската става празна вместо да покаже предишното състояние на играта. Проблемът е в несинхронизирането между `gameState` и `pawnSnapshots` state-овете.

## Анализ на бъга

Проблемът е в начина, по който snapshot-ите се индексират и възстановяват:

1. **Начално състояние**: 
   - `historyIndex = -1`
   - `pawnSnapshots = [initialPawns]` (1 елемент на индекс 0)

2. **След първия ход**:
   - `historyIndex = 0`  
   - `pawnSnapshots = [initialPawns, afterMove1Pawns]` (2 елемента)

3. **При Undo от historyIndex=0**:
   - Кодът се опитва да вземе `pawnSnapshots[0]` = началното състояние
   - НО `setPawnSnapshots` се изпълнява асинхронно и може да не е завършила когато се извиква `undo`

Основният проблем е, че `pawnSnapshots` е отделен React state от `gameState`, и може да има race condition между двата.

---

## Решение

Ще преработя системата за Undo/Redo, като вградя snapshot-ите директно в `gameState` обекта, за да се гарантира атомарност на обновленията.

### Промени в `src/hooks/useGameState.ts`:

1. **Премахване на отделния `pawnSnapshots` state** - вместо това ще пазим snapshot-ите като част от `GameState`

2. **Добавяне на `pawnHistory` в GameState interface** в `hexUtils.ts`:
   ```typescript
   export interface GameState {
     // ... existing fields
     pawnHistory: Map<string, Pawn>[]; // Добавяме масив със snapshot-и
   }
   ```

3. **Преработка на executeMove**:
   - Запазва snapshot-а като част от същия `setGameState` call
   - Гарантира атомарност

4. **Преработка на undo/redo**:
   - Използва `pawnHistory` от вътре в state-a
   - Няма race conditions

### Алтернативно по-просто решение:

Може да използваме един snapshot на ход, но да го запазваме **преди** хода се изпълни:

```typescript
const executeMove = useCallback((from: HexCoord, to: HexCoord) => {
  // Save current state BEFORE making changes
  setPawnSnapshots(prev => [...prev, new Map(gameState.pawns)]);
  
  setGameState(prev => {
    // ... move logic
  });
}, [gameState.pawns, playSound]);
```

И при undo:
```typescript
const undo = useCallback(() => {
  if (gameState.historyIndex < 0) return;
  
  const previousPawns = pawnSnapshots[gameState.historyIndex];
  // ...
}, [gameState.historyIndex, pawnSnapshots]);
```

---

## Стъпки за имплементация

1. **Добави `pawnHistory` към `GameState`** в `src/lib/hexUtils.ts`

2. **Преработи `useGameState.ts`**:
   - Инициализирай `pawnHistory: [createInitialPawns()]` в началния state
   - В `executeMove`: добавяй current pawns към `pawnHistory` преди да правиш промени
   - В `undo`: вземай предишните pawns от `prev.pawnHistory[prev.historyIndex]`
   - В `redo`: вземай следващите pawns от `prev.pawnHistory[prev.historyIndex + 2]`
   - Премахни отделния `pawnSnapshots` useState

3. **Тестване**:
   - Направи ход
   - Натисни Undo - трябва да се върне предишното състояние
   - Натисни Redo - трябва да се върне след-хода състояние
   - Направи няколко хода и тествай Undo/Redo многократно

---

## Технически детайли

### Обновен GameState interface:
```typescript
export interface GameState {
  pawns: Map<string, Pawn>;
  currentPlayer: PlayerColor;
  selectedHex: HexCoord | null;
  possibleMoves: HexCoord[];
  ricochetPath: HexCoord[];
  moveHistory: Move[];
  historyIndex: number;
  gameOver: boolean;
  winner: PlayerColor | null;
  pawnHistory: Map<string, Pawn>[]; // NEW
}
```

### Обновена undo функция:
```typescript
const undo = useCallback(() => {
  if (gameState.historyIndex < 0 || gameState.gameOver) return;

  setGameState(prev => {
    const move = prev.moveHistory[prev.historyIndex];
    if (!move) return prev;

    // Index 0 = initial state, Index 1 = after move 1, etc.
    // To undo move at historyIndex N, we need pawnHistory[N]
    const previousPawns = prev.pawnHistory[prev.historyIndex];
    
    if (!previousPawns) return prev;

    return {
      ...prev,
      pawns: new Map(previousPawns),
      currentPlayer: move.player,
      historyIndex: prev.historyIndex - 1,
      selectedHex: null,
      possibleMoves: [],
      ricochetPath: []
    };
  });
}, [gameState.historyIndex, gameState.gameOver]);
```
