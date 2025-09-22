
"use client";

import React, { useRef, useEffect } from 'react';
import { useInventory } from '@/context/inventory-context';
import Inventory from '@/components/canvas/inventory';
import TetrisCanvas, { type TetrisCanvasApi } from '@/components/canvas/tetris-canvas';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { useBlock, team, zoom } = useInventory();
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tetrisCanvasApiRef = useRef<TetrisCanvasApi>(null);

  useEffect(() => {
    // Scroll to the center of the canvas on initial load
    if (scrollContainerRef.current) {
      const { scrollWidth, scrollHeight, clientWidth, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
      scrollContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!team) return;
    const blockId = event.dataTransfer.getData("application/tetris-block");
    if (!blockId) return;

    if (useBlock(blockId)) {
      if (tetrisCanvasApiRef.current && scrollContainerRef.current) {
        // The canvas is scaled, so we need to adjust the drop coordinates.
        // We get the mouse position relative to the scroll container.
        const scrollRect = scrollContainerRef.current.getBoundingClientRect();
        const xOnContainer = event.clientX - scrollRect.left;
        const yOnContainer = event.clientY - scrollRect.top;

        // We then translate that into coordinates on the scaled canvas.
        const x = (xOnContainer + scrollContainerRef.current.scrollLeft) / zoom;
        const y = (yOnContainer + scrollContainerRef.current.scrollTop) / zoom;
        
        tetrisCanvasApiRef.current.addBlock(blockId, x, y, team);
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
        className="flex-1 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-auto bg-background"
        >
            <div style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
            }}>
              <TetrisCanvas ref={tetrisCanvasApiRef} />
            </div>
        </div>
      </div>
    </div>
  );
}
