import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Brain, Target, Shield, Gift, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type CellType = 'empty' | 'obstacle' | 'reward' | 'punishment' | 'goal';
type Position = { x: number; y: number };

interface Cell {
  type: CellType;
  qValue: number;
  visits: number;
}

interface GameState {
  agent: Position;
  goal: Position;
  grid: Cell[][];
  isRunning: boolean;
  episode: number;
  totalReward: number;
  explorationRate: number;
}

const GRID_SIZE = 8;
const INITIAL_Q_VALUE = 0;
const LEARNING_RATE = 0.1;
const DISCOUNT_FACTOR = 0.9;
const REWARD_VALUE = 10;
const PUNISHMENT_VALUE = -15;
const OBSTACLE_PENALTY = -5;
const GOAL_REWARD = 100;
const STEP_PENALTY = -1;

export function RLGame() {
  const [gameState, setGameState] = useState<GameState>(() => ({
    agent: { x: 1, y: 1 },
    goal: { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
    grid: Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => ({
        type: 'empty' as CellType,
        qValue: INITIAL_Q_VALUE,
        visits: 0
      }))
    ),
    isRunning: false,
    episode: 0,
    totalReward: 0,
    explorationRate: 0.1
  }));

  const [placementMode, setPlacementMode] = useState<CellType>('obstacle');
  const [moveCount, setMoveCount] = useState(0);
  const [isAgentMoving, setIsAgentMoving] = useState(false);

  // Reset game
  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      agent: { x: 1, y: 1 },
      isRunning: false,
      episode: 0,
      totalReward: 0,
      grid: prev.grid.map(row => 
        row.map(cell => ({
          ...cell,
          qValue: INITIAL_Q_VALUE,
          visits: 0
        }))
      )
    }));
    setMoveCount(0);
  }, []);

  // Handle cell click for placing obstacles/rewards
  const handleCellClick = useCallback((x: number, y: number) => {
    // Don't place on agent or goal positions
    if ((x === gameState.agent.x && y === gameState.agent.y) || 
        (x === gameState.goal.x && y === gameState.goal.y)) return;

    setGameState(prev => ({
      ...prev,
      grid: prev.grid.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          if (rowIdx === y && colIdx === x) {
            return {
              ...cell,
              type: cell.type === placementMode ? 'empty' : placementMode
            };
          }
          return cell;
        })
      )
    }));
  }, [gameState.agent, gameState.goal, placementMode]);

  // Get possible actions from a position (excluding obstacles)
  const getPossibleActions = (pos: Position): Position[] => {
    const actions: Position[] = [];
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }   // right
    ];

    directions.forEach(dir => {
      const newX = pos.x + dir.x;
      const newY = pos.y + dir.y;
      if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
        // Only include if not an obstacle
        if (gameState.grid[newY][newX].type !== 'obstacle') {
          actions.push({ x: newX, y: newY });
        }
      }
    });

    // If no valid actions (surrounded by obstacles), allow staying in place
    if (actions.length === 0) {
      actions.push(pos);
    }

    return actions;
  };

  // Choose action using epsilon-greedy policy
  const chooseAction = (pos: Position, explorationRate: number): Position => {
    const possibleActions = getPossibleActions(pos);
    
    if (Math.random() < explorationRate) {
      // Explore: random action
      return possibleActions[Math.floor(Math.random() * possibleActions.length)];
    } else {
      // Exploit: choose best action based on Q-values
      let bestAction = possibleActions[0];
      let bestQValue = gameState.grid[bestAction.y][bestAction.x].qValue;
      
      possibleActions.forEach(action => {
        const qValue = gameState.grid[action.y][action.x].qValue;
        if (qValue > bestQValue) {
          bestQValue = qValue;
          bestAction = action;
        }
      });
      
      return bestAction;
    }
  };

  // Get reward for a position
  const getReward = (pos: Position): number => {
    const cell = gameState.grid[pos.y][pos.x];
    
    if (pos.x === gameState.goal.x && pos.y === gameState.goal.y) {
      return GOAL_REWARD;
    }
    
    switch (cell.type) {
      case 'obstacle':
        return OBSTACLE_PENALTY;
      case 'reward':
        return REWARD_VALUE;
      case 'punishment':
        return PUNISHMENT_VALUE;
      default:
        return STEP_PENALTY;
    }
  };

  // Update Q-value using Q-learning formula
  const updateQValue = (pos: Position, reward: number, nextPos: Position) => {
    const currentQ = gameState.grid[pos.y][pos.x].qValue;
    const nextMaxQ = Math.max(...getPossibleActions(nextPos).map(action => 
      gameState.grid[action.y][action.x].qValue
    ));
    
    const newQ = currentQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * nextMaxQ - currentQ);
    
    setGameState(prev => ({
      ...prev,
      grid: prev.grid.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          if (rowIdx === pos.y && colIdx === pos.x) {
            return {
              ...cell,
              qValue: newQ,
              visits: cell.visits + 1
            };
          }
          return cell;
        })
      )
    }));
  };

  // Single step of the agent
  const stepAgent = useCallback(() => {
    if (!gameState.isRunning) return;

    const currentPos = gameState.agent;
    const nextPos = chooseAction(currentPos, gameState.explorationRate);
    
    // If agent stays in place (surrounded by obstacles), give penalty but continue
    if (nextPos.x === currentPos.x && nextPos.y === currentPos.y) {
      updateQValue(currentPos, STEP_PENALTY, currentPos);
      setGameState(prev => ({ ...prev, totalReward: prev.totalReward + STEP_PENALTY }));
      setMoveCount(prev => prev + 1);
      return;
    }

    const reward = getReward(nextPos);
    updateQValue(currentPos, reward, nextPos);
    
    setIsAgentMoving(true);
    setTimeout(() => setIsAgentMoving(false), 300);

    setGameState(prev => ({
      ...prev,
      agent: nextPos,
      totalReward: prev.totalReward + reward
    }));

    setMoveCount(prev => prev + 1);

    // Check if reached goal
    if (nextPos.x === gameState.goal.x && nextPos.y === gameState.goal.y) {
      setGameState(prev => ({
        ...prev,
        isRunning: false,
        episode: prev.episode + 1
      }));
    }
  }, [gameState]);

  // Auto-step when running
  useEffect(() => {
    if (!gameState.isRunning) return;
    
    const interval = setInterval(stepAgent, 200);
    return () => clearInterval(interval);
  }, [gameState.isRunning, stepAgent]);

  // Get cell appearance based on type and Q-value
  const getCellClasses = (x: number, y: number) => {
    const cell = gameState.grid[y][x];
    const isAgent = gameState.agent.x === x && gameState.agent.y === y;
    const isGoal = gameState.goal.x === x && gameState.goal.y === y;
    
    let classes = "w-8 h-8 border border-grid-line transition-all duration-300 cursor-pointer flex items-center justify-center text-xs font-bold relative";
    
    if (isAgent) {
      classes += " bg-agent text-primary-foreground animate-glow";
      if (isAgentMoving) classes += " animate-agent-move";
    } else if (isGoal) {
      classes += " bg-goal text-primary-foreground animate-pulse";
    } else if (cell.type === 'obstacle') {
      classes += " bg-obstacle text-destructive-foreground";
    } else if (cell.type === 'reward') {
      classes += " bg-reward text-primary-foreground animate-pulse-reward";
    } else if (cell.type === 'punishment') {
      classes += " bg-destructive text-destructive-foreground animate-pulse-reward";
    } else {
      // Color based on Q-value for exploration visualization
      const qNormalized = Math.max(0, Math.min(1, (cell.qValue + 50) / 100));
      const opacity = cell.visits > 0 ? 0.1 + qNormalized * 0.3 : 0;
      classes += ` bg-visited hover:bg-visited/50`;
      if (opacity > 0) {
        classes += ` opacity-${Math.round(opacity * 100)}`;
      }
    }
    
    return classes;
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--gradient-main)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Reinforcement Learning Playground
          </h1>
          <p className="text-lg text-muted-foreground">
            Watch an AI agent learn to navigate and find rewards through exploration and exploitation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <Card className="p-6 space-y-6" style={{ background: 'var(--gradient-card)' }}>
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Controls
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setGameState(prev => ({ ...prev, isRunning: !prev.isRunning }))}
                    className="flex-1"
                  >
                    {gameState.isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {gameState.isRunning ? 'Pause' : 'Start'}
                  </Button>
                  <Button onClick={resetGame} variant="outline">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Exploration Rate: {(gameState.explorationRate * 100).toFixed(0)}%
                  </label>
                  <Slider
                    value={[gameState.explorationRate]}
                    onValueChange={([value]) => 
                      setGameState(prev => ({ ...prev, explorationRate: value }))
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Exploitation</span>
                    <span>Exploration</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Place Items</h4>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={placementMode === 'obstacle' ? 'default' : 'outline'}
                  onClick={() => setPlacementMode('obstacle')}
                  className="flex items-center gap-1 text-xs"
                >
                  <Shield className="w-3 h-3" />
                  Obstacles
                </Button>
                <Button
                  variant={placementMode === 'reward' ? 'default' : 'outline'}
                  onClick={() => setPlacementMode('reward')}
                  className="flex items-center gap-1 text-xs"
                >
                  <Gift className="w-3 h-3" />
                  Rewards
                </Button>
                <Button
                  variant={placementMode === 'punishment' ? 'default' : 'outline'}
                  onClick={() => setPlacementMode('punishment')}
                  className="flex items-center gap-1 text-xs"
                >
                  <Zap className="w-3 h-3" />
                  Punish
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Statistics</h4>
              <div className="grid grid-cols-2 gap-2">
                <Badge variant="secondary">Episode: {gameState.episode}</Badge>
                <Badge variant="secondary">Moves: {moveCount}</Badge>
                <Badge variant="secondary" className="col-span-2">
                  Total Reward: {gameState.totalReward.toFixed(1)}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Game Grid */}
          <Card className="p-6 lg:col-span-2" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5" />
                Environment
              </h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 bg-agent rounded"></div>
                  <span>Agent</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 bg-goal rounded"></div>
                  <span>Goal</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 bg-obstacle rounded"></div>
                  <span>Obstacle</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 bg-reward rounded"></div>
                  <span>Reward</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 bg-destructive rounded"></div>
                  <span>Punishment</span>
                </div>
              </div>
            </div>
            
            <div className="inline-block border border-grid-line rounded-lg overflow-hidden bg-background/5">
              {gameState.grid.map((row, y) => (
                <div key={y} className="flex">
                  {row.map((cell, x) => (
                    <div
                      key={`${x}-${y}`}
                      className={getCellClasses(x, y)}
                      onClick={() => handleCellClick(x, y)}
                      title={`Q: ${cell.qValue.toFixed(1)}, Visits: ${cell.visits}`}
                    >
                      {gameState.agent.x === x && gameState.agent.y === y && '🤖'}
                      {gameState.goal.x === x && gameState.goal.y === y && '🎯'}
                      {cell.type === 'obstacle' && '🚫'}
                      {cell.type === 'reward' && '💎'}
                      {cell.type === 'punishment' && '⚡'}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              Click cells to place {placementMode === 'obstacle' ? 'obstacles' : placementMode === 'reward' ? 'rewards' : 'punishments'}. 
              Darker cells show higher Q-values (learned preferences).
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}