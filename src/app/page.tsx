
"use client";

import React, { useRef, useState, useEffect } from 'react';
import Inventory from '@/components/canvas/inventory';
import TetrisCanvas, { type TetrisCanvasApi, getTeamZone } from '@/components/canvas/tetris-canvas';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CornerUpLeft } from 'lucide-react';
import { type Body } from 'matter-js';
import { type Team, type BlockId } from '@/lib/blocks';
import { useAuth } from '@/context/auth-context';
import { updateUserInventory, type UserInventory } from '@/services/auth-service';

export default function Home() {
  const { user, loading } = useAuth();
  const [ownedBlocks, setOwnedBlocks] = useState<UserInventory>({
    i: 0, o: 0, t: 0, l: 0, j: 0, s: 0, z: 0,
  });
  const [team, setTeam] = useState<Team>('blue');
  const { toast } = useToast();
  const tetrisCanvasApiRef = useRef<TetrisCanvasApi>(null);

  useEffect(() => {
    if (!loading && user) {
      setTeam(user.team);
      if (user.inventory) {
        setOwnedBlocks(user.inventory);
      }
    }
  }, [user, loading]);

  const showSaveWarning = () => {
    toast({
      title: "Block placed!",
      description: "Please wait 5 seconds for it to be saved. Do not disconnect.",
    });
  };
  
  const updateInventory = async (newInventory: UserInventory) => {
    if (!user) return;
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

  const useBlockFromInventory = (blockId: string) => {
    if (ownedBlocks[blockId as BlockId] && ownedBlocks[blockId as BlockId] > 0) {
      const newInventory = {
        ...ownedBlocks,
        [blockId]: ownedBlocks[blockId as BlockId] - 1,
      };
      updateInventory(newInventory);
      return true;
    }
    return false;
  };

  const addBlockToInventory = (blockId: string) => {
    const newInventory = {
      ...ownedBlocks,
      [blockId]: (ownedBlocks[blockId as BlockId] || 0) + 1,
    };
    updateInventory(newInventory);
  };

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

  const isPlacementInValidZone = (x: number, team: Team) => {
    if (!tetrisCanvasApiRef.current) return false;
    const { blueZone, redZone } = tetrisCanvasApiRef.current.getZones();
    if (team === 'blue' && x > redZone.min.x) {
        return false;
    }
    if (team === 'red' && x < blueZone.max.x) {
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

    const targetZone = getTeamZone(worldCoords.x);
    if (targetZone === 'red' && team !== 'red') {
      toast({ title: "Placement Invalid", description: "You cannot place blocks in the red team's zone.", variant: "destructive" });
      return;
    }
    if (targetZone === 'blue' && team !== 'blue') {
      toast({ title: "Placement Invalid", description: "You cannot place blocks in the blue team's zone.", variant: "destructive" });
      return;
    }
    
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
        showSaveWarning();
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
      showSaveWarning();
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

     const targetZone = getTeamZone(worldCoords.x);
    if (targetZone === 'red' && team !== 'red') {
      toast({ title: "Placement Invalid", description: "You cannot place blocks in the red team's zone.", variant: "destructive" });
      return;
    }
    if (targetZone === 'blue' && team !== 'blue') {
      toast({ title: "Placement Invalid", description: "You cannot place blocks in the blue team's zone.", variant: "destructive" });
      return;
    }


    if (useBlockFromInventory(blockId)) {
      tetrisCanvasApiRef.current.addBlock(blockId, worldCoords.x, worldCoords.y, team);
      showSaveWarning();
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
        <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-md text-xs pointer-events-none">
          Drag background to pan. Hold Ctrl and drag vertically to zoom.
        </div>
      </div>
    </div>
  );
}
