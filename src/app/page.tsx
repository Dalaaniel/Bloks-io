
"use client";

import React, { useRef } from 'react';
import { useInventory } from '@/context/inventory-context';
import Inventory from '@/components/canvas/inventory';
import TetrisCanvas, { type TetrisCanvasApi } from '@/components/canvas/tetris-canvas';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { useBlock, team } = useInventory();
  const { toast } = useToast();
  const tetrisCanvasApiRef = useRef<TetrisCanvasApi>(null);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!team) return;
    const blockId = event.dataTransfer.getData("application/tetris-block");
    if (!blockId) return;

    if (useBlock(blockId)) {
      if (tetrisCanvasApiRef.current) {
        const canvasRect = event.currentTarget.getBoundingClientRect();
        // Get mouse position relative to the canvas element
        const xOnElement = event.clientX - canvasRect.left;
        const yOnElement = event.clientY - canvasRect.top;

        // Ask the canvas to convert element coordinates to world coordinates
        const worldCoords = tetrisCanvasApiRef.current.getViewportCoordinates(xOnElement, yOnElement);
        
        tetrisCanvasApiRef.current.addBlock(blockId, worldCoords.x, worldCoords.y, team);
      }
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

  return (
    <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
      <Inventory onBlockClick={handleSpawnBlock} />
      <div 
        className="flex-1 relative bg-background"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <TetrisCanvas ref={tetrisCanvasApiRef} />
        <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-md text-xs pointer-events-none">
          Drag background to pan. Hold Ctrl and drag vertically to zoom.
        </div>
      </div>
    </div>
  );
}
