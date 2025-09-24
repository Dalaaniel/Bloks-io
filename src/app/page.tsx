
"use client";

import React, { useRef, useState, useEffect } from 'react';
import Inventory from '@/components/canvas/inventory';
import TetrisCanvas, { type TetrisCanvasApi } from '@/components/canvas/tetris-canvas';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CornerUpLeft } from 'lucide-react';
import { type Body } from 'matter-js';
import { type Team } from '@/lib/blocks';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';


export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [ownedBlocks, setOwnedBlocks] = useState<{ [key: string]: number }>({
    i: 5, o: 5, t: 5, l: 5, j: 5, s: 5, z: 5,
  });
  // Default to blue, but will be updated based on user's team
  const [team, setTeam] = useState<Team>('blue');

  useEffect(() => {
    if (user?.team) {
      setTeam(user.team);
    }
  }, [user]);


  const useBlockFromInventory = (blockId: string) => {
    if (ownedBlocks[blockId] && ownedBlocks[blockId] > 0) {
      setOwnedBlocks(prev => ({
        ...prev,
        [blockId]: prev[blockId] - 1,
      }));
      return true;
    }
    return false;
  };

  const addBlockToInventory = (blockId: string) => {
    setOwnedBlocks(prev => ({
      ...prev,
      [blockId]: (prev[blockId] || 0) + 1,
    }));
  };

  const { toast } = useToast();
  const tetrisCanvasApiRef = useRef<TetrisCanvasApi>(null);

  const checkAuth = () => {
    if (!user) {
      toast({
        title: "Not Logged In",
        description: "You must be logged in to interact with the canvas.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!checkAuth() || !tetrisCanvasApiRef.current) return;
    
    const blockId = event.dataTransfer.getData("application/tetris-block");
    if (!blockId) return;

    const canvasRect = event.currentTarget.getBoundingClientRect();
    const xOnElement = event.clientX - canvasRect.left;
    const yOnElement = event.clientY - canvasRect.top;
    const worldCoords = tetrisCanvasApiRef.current.getViewportCoordinates(xOnElement, yOnElement);
    
    const checkSize = 80;
    const checkBounds = {
      min: { x: worldCoords.x - checkSize / 2, y: worldCoords.y - checkSize / 2 },
      max: { x: worldCoords.x + checkSize / 2, y: worldCoords.y + checkSize / 2 }
    };

    const bodiesInArea = tetrisCanvasApiRef.current.getBodiesInRegion(checkBounds);
    
    const blocksInArea = bodiesInArea.filter((body: Body) => !body.isStatic);

    if (blocksInArea.length > 0) {
      toast({
        title: "Placement Invalid",
        description: "Too close to another block. Find an empty space.",
        variant: "destructive",
      });
      return;
    }

    if (useBlockFromInventory(blockId)) {
        tetrisCanvasApiRef.current.addBlock(blockId, worldCoords.x, worldCoords.y, team);
    } else {
      toast({
        title: "Out of Blocks",
        description: "You've run out of this block. Visit the store to buy more!",
        variant: "destructive",
      });
    }
  };

  const handleSpawnBlock = (blockId: string) => {
    if (!checkAuth() || !tetrisCanvasApiRef.current) return;
    if (useBlockFromInventory(blockId)) {
      tetrisCanvasApiRef.current?.spawnBlockForTeam(blockId, team);
    } else {
       toast({
        title: "Out of Blocks",
        description: "You've run out of this block. Visit the store to buy more!",
        variant: "destructive",
      });
    }
  };

  const handleBlockTouchDrop = (blockId: string, clientX: number, clientY: number) => {
    if (!checkAuth() || !tetrisCanvasApiRef.current) return;

    const canvas = tetrisCanvasApiRef.current?.canvasElement;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const xOnElement = clientX - canvasRect.left;
    const yOnElement = clientY - canvasRect.top;

    const worldCoords = tetrisCanvasApiRef.current.getViewportCoordinates(xOnElement, yOnElement);

    if (useBlockFromInventory(blockId)) {
      tetrisCanvasApiRef.current.addBlock(blockId, worldCoords.x, worldCoords.y, team);
    } else {
      toast({
        title: "Out of Blocks",
        description: "You've run out of this block. Visit the store to buy more!",
        variant: "destructive",
      });
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
        team={team}
        onBlockClick={handleSpawnBlock} 
        onBlockTouchDrop={handleBlockTouchDrop} 
      />

      <div 
        className="flex-1 relative bg-background"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <TetrisCanvas ref={tetrisCanvasApiRef} team={team} />
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute top-4 left-4 z-10"
          onClick={handleResetView}
          title="Reset to Top-Left"
        >
          <CornerUpLeft className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-md text-xs pointer-events-none">
          Drag background to pan. Hold Ctrl and drag vertically to zoom.
        </div>
      </div>
    </div>
  );
}
