
"use client";

import React, { useRef } from 'react';
import { useInventory } from '@/context/inventory-context';
import Inventory from '@/components/canvas/inventory';
import TetrisCanvas, { type TetrisCanvasApi } from '@/components/canvas/tetris-canvas';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CornerUpLeft } from 'lucide-react';
import { type Body } from 'matter-js';

export default function Home() {
  const { useBlock, returnBlock, team } = useInventory();
  const { toast } = useToast();
  const tetrisCanvasApiRef = useRef<TetrisCanvasApi>(null);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!team || !tetrisCanvasApiRef.current) return;
    const blockId = event.dataTransfer.getData("application/tetris-block");
    if (!blockId) return;

    const canvasRect = event.currentTarget.getBoundingClientRect();
    const xOnElement = event.clientX - canvasRect.left;
    const yOnElement = event.clientY - canvasRect.top;
    const worldCoords = tetrisCanvasApiRef.current.getViewportCoordinates(xOnElement, yOnElement);
    
    // Define the "fictive area" for checking - e.g., an 80x80 box
    const checkSize = 80;
    const checkBounds = {
      min: { x: worldCoords.x - checkSize / 2, y: worldCoords.y - checkSize / 2 },
      max: { x: worldCoords.x + checkSize / 2, y: worldCoords.y + checkSize / 2 }
    };

    const bodiesInArea = tetrisCanvasApiRef.current.getBodiesInRegion(checkBounds);
    
    // Filter out the static ground body
    const blocksInArea = bodiesInArea.filter((body: Body) => !body.isStatic);

    if (blocksInArea.length > 0) {
      toast({
        title: "Placement Invalid",
        description: "Too close to another block. Find an empty space.",
        variant: "destructive",
      });
      return; // Stop the drop
    }

    if (useBlock(blockId)) {
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
    if (!team) return;
    if (useBlock(blockId)) {
      tetrisCanvasApiRef.current?.spawnBlockForTeam(blockId, team);
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
      <Inventory onBlockClick={handleSpawnBlock} />
      <div 
        className="flex-1 relative bg-background"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <TetrisCanvas ref={tetrisCanvasApiRef} />
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
