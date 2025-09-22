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
    if (tetrisCanvasApiRef.current) {
      tetrisCanvasApiRef.current.setZoom(zoom);
    }
  }, [zoom]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!team) return;
    const blockId = event.dataTransfer.getData("application/tetris-block");
    if (!blockId) return;

    if (useBlock(blockId)) {
      if (tetrisCanvasApiRef.current && scrollContainerRef.current) {
        const scrollRect = scrollContainerRef.current.getBoundingClientRect();
        const currentZoom = tetrisCanvasApiRef.current.getZoom();
        const x = (event.clientX - scrollRect.left + scrollContainerRef.current.scrollLeft) / currentZoom;
        const y = (event.clientY - scrollRect.top + scrollContainerRef.current.scrollTop) / currentZoom;
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
      <div className="flex-1 relative bg-background">
          <div
              ref={scrollContainerRef}
              className="absolute inset-0 overflow-auto"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
          >
              <TetrisCanvas ref={tetrisCanvasApiRef} />
          </div>
      </div>
    </div>
  );
}
