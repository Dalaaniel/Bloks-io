
'use client';

import { type GameState } from '@/services/game-state-service';
import { type User } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TurnIndicatorProps {
  gameState: GameState | null;
  timeRemaining: number;
  currentUser: User | null;
}

export default function TurnIndicator({ gameState, timeRemaining, currentUser }: TurnIndicatorProps) {
  if (!gameState || !currentUser || gameState.playerCount <= 1) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="outline" className="text-lg bg-background/80 backdrop-blur-sm">
          Free Play
        </Badge>
      </div>
    );
  }

  const { turnOrder, currentUserTurnIndex } = gameState;
  const currentTurnPlayerId = turnOrder[currentUserTurnIndex];

  if (!currentTurnPlayerId) {
    return null;
  }

  const isMyTurn = currentUser.uid === currentTurnPlayerId;
  const turnPlayerEmail = gameState.playerDetails[currentTurnPlayerId]?.email || 'A player';

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
      <Badge 
        className={cn(
            "text-lg px-4 py-2 text-white",
            isMyTurn ? 'bg-green-500' : 'bg-gray-500'
        )}
      >
        {isMyTurn ? "Your Turn" : `${turnPlayerEmail}'s Turn`}
      </Badge>
      <Badge variant="secondary" className="text-2xl font-mono px-3 py-1">
        {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:
        {String(timeRemaining % 60).padStart(2, '0')}
      </Badge>
    </div>
  );
}
