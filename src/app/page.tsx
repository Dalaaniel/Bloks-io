"use client";

import React, { useRef } from 'react';
import { useInventory } from '@/context/inventory-context';
import Inventory from '@/components/canvas/inventory';
import TetrisCanvas, { type TetrisCanvasApi } from '@/components/canvas/tetris-canvas';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';

export default function Home() {
  const { useBlock, team } = useInventory();
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tetrisCanvasApiRef = useRef<TetrisCanvasApi>(null);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!team) return;
    const blockId = event.dataTransfer.getData("application/tetris-block");
    if (!blockId) return;

    if (useBlock(blockId)) {
      if (tetrisCanvasApiRef.current && scrollContainerRef.current) {
        const scrollRect = scrollContainerRef.current.getBoundingClientRect();
        const zoom = tetrisCanvasApiRef.current.getZoom();
        const x = (event.clientX - scrollRect.left + scrollContainerRef.current.scrollLeft) / zoom;
        const y = (event.clientY - scrollRect.top + scrollContainerRef.current.scrollTop) / zoom;
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

  const handleZoomChange = (value: number[]) => {
    if (tetrisCanvasApiRef.current) {
      tetrisCanvasApiRef.current.setZoom(value[0]);
    }
  };

  return (
    <div className="flex h-full">
      <Inventory onBlockClick={handleSpawnBlock} />
      <div className="flex-1 flex bg-black relative">
        <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <TetrisCanvas ref={tetrisCanvasApiRef} />
        </div>
        <div className="w-24 flex items-center justify-center p-4">
            <Slider
                defaultValue={[0.5]}
                min={0.1}
                max={2}
                step={0.05}
                orientation="vertical"
                onValueChange={handleZoomChange}
                className="h-64"
            />
        </div>
      </div>
    </div>
  );
}
