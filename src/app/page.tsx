
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Inventory from '@/components/canvas/inventory';
import TetrisCanvas, { type TetrisCanvasApi } from '@/components/canvas/tetris-canvas';
import TurnIndicator from '@/components/canvas/turn-indicator';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CornerUpLeft } from 'lucide-react';
import { type BlockId } from '@/lib/blocks';
import { useAuth } from '@/context/auth-context';
import { updateUserInventory, type UserInventory } from '@/services/auth-service';
import { saveCanvasState, loadCanvasState } from '@/services/canvas-service';
import { passTurn, type GameState } from '@/services/game-state-service';

export default function Home() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const tetrisCanvasApiRef = useRef<TetrisCanvasApi>(null);
  
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [ownedBlocks, setOwnedBlocks] = useState<UserInventory>({
    i: 0, o: 0, t: 0, l: 0, j: 0, s: 0, z: 0,
  });

  const isMyTurn = !loading && user && gameState?.turnOrder[gameState.currentUserTurnIndex] === user.uid;
  const isFreePlay = gameState?.playerCount === 1;

  // Sync user data
  useEffect(() => {
    if (!loading && user) {
      if (user.inventory) {
        setOwnedBlocks(user.inventory);
      }
    }
  }, [user, loading]);
  
  // Listen to Game State and pull Canvas State at turn start
  useEffect(() => {
    const gameStateDocRef = doc(db, 'gameState', 'singleton');
    const unsubscribeGameState = onSnapshot(gameStateDocRef, async (doc) => {
      if (doc.exists()) {
        const newGameState = doc.data() as GameState;
        const oldTurnNumber = gameState?.turnNumber;
        
        setGameState(newGameState);

        // If it's the start of a new turn, pull the latest canvas state
        if (newGameState.turnNumber !== oldTurnNumber && tetrisCanvasApiRef.current) {
          const state = await loadCanvasState();
          if (state) {
            tetrisCanvasApiRef.current.loadCanvasState(state);
          }
        }
      } else {
        setGameState(null);
      }
    });

    return () => unsubscribeGameState();
  }, [gameState?.turnNumber]);
  
  // --- Core Actions ---
  const saveAndEndTurn = async () => {
    if (!tetrisCanvasApiRef.current || !user) return;
    // Check if it's my turn before saving and passing
    if (gameState?.turnOrder[gameState.currentUserTurnIndex] !== user.uid) return;

    const state = tetrisCanvasApiRef.current.serializeCanvas();
    if (state) {
      await saveCanvasState(state);
      await passTurn(user.uid);
    }
  };

  // Timer logic & auto end turn
  useEffect(() => {
    if (gameState && gameState.turnEndsAt && !isFreePlay) {
      const interval = setInterval(() => {
        const now = Date.now();
        const endsAt = (gameState.turnEndsAt as any).toMillis();
        const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
        setTimeRemaining(remaining);
        
        const isMyTurnForEffect = user && gameState?.turnOrder[gameState.currentUserTurnIndex] === user.uid;
        if (remaining <= 0 && isMyTurnForEffect) {
          saveAndEndTurn();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, isFreePlay, user]);


  const saveCurrentState = () => {
    if (!tetrisCanvasApiRef.current) return;
    const state = tetrisCanvasApiRef.current.serializeCanvas();
    if (state) {
      saveCanvasState(state);
    }
  };

  const updateInventory = async (newInventory: UserInventory) => {
    if (!user) return;
    // The listener will update the state, but we can optimistically update here
    setOwnedBlocks(newInventory); 
    try {
      await updateUserInventory(user.uid, newInventory);
    } catch (error) {
      console.error(error);
      toast({
        title: "Inventory Sync Failed",
        description: "Could not save inventory changes to your account.",
        variant: "destructive"
      })
    }
  }

  const useBlockFromInventory = (blockId: string): boolean => {
    if (ownedBlocks[blockId as BlockId] && ownedBlocks[blockId as BlockId] > 0) {
      const newInventory = {
        ...ownedBlocks,
        [blockId]: ownedBlocks[blockId as BlockId] - 1,
      };
      updateInventory(newInventory); // This will now only cause a local state update initially
      return true;
    }
    return false;
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!tetrisCanvasApiRef.current || !user) return;
    
    const blockId = event.dataTransfer.getData("application/tetris-block");
    if (!blockId) return;

    if (!useBlockFromInventory(blockId)) {
        toast({ title: "Out of Blocks", variant: "destructive" });
        return;
    }

    const canvasRect = event.currentTarget.getBoundingClientRect();
    const xOnElement = event.clientX - canvasRect.left;
    const yOnElement = event.clientY - canvasRect.top;
    const worldCoords = tetrisCanvasApiRef.current.getViewportCoordinates(xOnElement, yOnElement);

    tetrisCanvasApiRef.current.addBlock(blockId, worldCoords.x, worldCoords.y, user!.team);
    
    if (isFreePlay) {
      saveCurrentState();
    }
  };

  const handleSpawnBlock = (blockId: string) => {
    if (!tetrisCanvasApiRef.current || !user) return;

    if (!useBlockFromInventory(blockId)) {
        toast({ title: "Out of Blocks", variant: "destructive" });
        return;
    }
    tetrisCanvasApiRef.current.spawnBlockForTeam(blockId, user!.team);

    if (isFreePlay) {
      saveCurrentState();
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  
  const handleResetView = () => {
    tetrisCanvasApiRef.current?.resetView();
  };

  return (
    <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
      <Inventory 
        ownedBlocks={ownedBlocks}
        team={user?.team || 'blue'}
        onBlockClick={handleSpawnBlock}
      />

      <div 
        className="flex-1 relative bg-background"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <TetrisCanvas ref={tetrisCanvasApiRef} user={user} team={user?.team || 'blue'} />
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleResetView}
            title="Reset to Top-Left"
          >
            <CornerUpLeft className="h-4 w-4" />
          </Button>
        </div>
         <TurnIndicator gameState={gameState} timeRemaining={timeRemaining} currentUser={user} />
        <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-md text-xs pointer-events-none">
          Drag background to pan. Hold Ctrl and drag vertically to zoom.
        </div>
      </div>
    </div>
  );
}
