# Reinforcement Learning Modules

This directory contains refactored, tested, and maintainable RL modules extracted from the original monolithic `RLGame.tsx` component.

## 📁 Structure

```
src/lib/rl/
├── index.ts              # Main export file
├── types.ts              # Type definitions
├── constants.ts          # RL constants and configurations
├── gridUtils.ts          # Grid operations and utilities
├── qLearning.ts          # Q-Learning algorithm implementation
├── portalUtils.ts        # Portal teleportation logic
├── gridUtils.test.ts     # Grid utilities tests (27 tests)
├── qLearning.test.ts     # Q-Learning tests (26 tests)
└── portalUtils.test.ts   # Portal utilities tests (24 tests)
```

## ✅ Test Coverage

All modules are fully unit tested with **77 passing tests**:

- **Grid Utils**: 27 tests covering grid creation, manipulation, and statistics
- **Q-Learning**: 26 tests covering action selection, Q-value updates, and rewards
- **Portal Utils**: 24 tests covering portal teleportation and cooldown management

Run tests with:
```bash
npm test
```

## 🎯 Modules Overview

### `types.ts`
Core type definitions for the RL system:
- `Position`, `TileState`, `EpisodeStats`
- State interfaces: `PlaygroundState`, `RandomModeState`, `ComparisonState`
- Configuration types: `LevelConfig`, `PresetLevel`

### `constants.ts`
RL hyperparameters and game configuration:
- **Hyperparameters**: `LEARNING_RATE`, `DISCOUNT_FACTOR`, exploration settings
- **Rewards**: `REWARD_VALUE`, `PUNISHMENT_VALUE`, `GOAL_REWARD`
- **Level Configs**: Preset levels, speedrun stages, episode titles
- **UI Labels**: Multilingual labels for DE/EN

### `gridUtils.ts`
Grid manipulation and utilities:
- `createEmptyGrid()` - Create empty grid
- `cloneGrid()` - Deep clone grid state
- `manhattanDistance()` - Calculate distance between positions
- `selectGoalPositions()` - Smart goal placement
- `generateMaze()` - Maze generation using recursive backtracking
- `computeMoveStats()` / `computeEpisodeSummary()` - Statistics calculation

### `qLearning.ts`
Q-Learning algorithm implementation:
- `getPossibleActions()` - Get valid moves from position
- `chooseAction()` - Epsilon-greedy action selection
- `getBestActionDirection()` - Get best action for visualization
- `getTileReward()` - Calculate reward for tile type
- `updateQValue()` - Q-learning update rule: Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
- `getMaxQValue()` - Get maximum Q-value from possible actions

### `portalUtils.ts`
Portal teleportation system:
- `findPortals()` - Find all portal positions
- `teleportThroughPortal()` - Random portal teleportation
- `decrementPortalCooldowns()` - Cooldown management
- `isPortalOnCooldown()` - Check if portal is usable

## 🚀 Usage

Import from the main index:

```typescript
import {
  // Types
  Position,
  TileState,
  EpisodeStats,

  // Constants
  LEARNING_RATE,
  DISCOUNT_FACTOR,
  REWARD_VALUE,

  // Grid Utils
  createEmptyGrid,
  manhattanDistance,
  selectGoalPositions,

  // Q-Learning
  getPossibleActions,
  chooseAction,
  updateQValue,

  // Portal Utils
  findPortals,
  teleportThroughPortal,
} from '@/lib/rl';
```

## 🎓 Q-Learning Implementation

This implementation uses the classic Q-Learning algorithm:

```
Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
```

Where:
- `α` (alpha) = Learning rate (default: 0.1)
- `γ` (gamma) = Discount factor (default: 0.85)
- `r` = Immediate reward
- `Q(s,a)` = Q-value for state-action pair
- `max Q(s',a')` = Maximum Q-value of next state

### Action Selection

Uses epsilon-greedy policy:
- With probability `ε`: explore (random action)
- With probability `1-ε`: exploit (best Q-value action)

## 📊 Benefits of Refactoring

✅ **Testability**: 77 unit tests ensure correctness
✅ **Maintainability**: Clear separation of concerns
✅ **Reusability**: Functions can be used independently
✅ **Documentation**: Each function is well-documented
✅ **Type Safety**: Full TypeScript typing
✅ **Debuggability**: Easier to debug isolated functions

## 🔄 Migration Guide

The original `RLGame.tsx` still contains all logic for backward compatibility. To migrate:

1. Import needed functions from `@/lib/rl`
2. Replace inline implementations with imported functions
3. Test thoroughly
4. Remove duplicated code from `RLGame.tsx`

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## 📈 Future Improvements

- [ ] Extract game loop logic into `useGameLoop` hook
- [ ] Extract state management into context providers
- [ ] Add more RL algorithms (SARSA, DQN)
- [ ] Add performance benchmarks
- [ ] Add integration tests

## 🤝 Contributing

When adding new RL features:
1. Add implementation to appropriate module
2. Write comprehensive tests
3. Update this README
4. Ensure all tests pass

---

**Created**: 2025-01-18
**Test Status**: ✅ 77/77 passing
**Coverage**: Grid Utils, Q-Learning, Portal Utils
