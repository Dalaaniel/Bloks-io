
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { getBlockById, type Team } from "@/lib/blocks";
import TetrisBlockComponent from "@/components/tetris-block";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InventoryProps {
  onBlockClick: (blockId: string) => void;
  onBlockTouchDrop?: (blockId: string, x: number, y: number) => void;
}

export default function Inventory({ onBlockClick, onBlockTouchDrop }: InventoryProps) {
  const { ownedBlocks, team, user } = useAuth();

  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);

  const draggingBlock = draggingBlockId && team ? getBlockById(draggingBlockId, team) : undefined;

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, blockId: string) => {
    event.dataTransfer.setData("application/tetris-block", blockId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>, blockId: string) => {
    event.preventDefault();
    setDraggingBlockId(blockId);
    const touch = event.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingBlockId) return;
    const touch = event.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingBlockId || !touchPosition) return;
    if (onBlockTouchDrop) {
      onBlockTouchDrop(draggingBlockId, touchPosition.x, touchPosition.y);
    }
    setDraggingBlockId(null);
    setTouchPosition(null);
  };

  const availableBlocks = Object.entries(ownedBlocks)
    .map(([id, quantity]) => {
      const block = getBlockById(id, team || "blue");
      return { block, quantity };
    })
    .filter((item) => item.block && item.quantity > 0);

  if (!user || !team) {
    return (
      <aside className="w-48 border-r bg-secondary/50 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
        </div>
        <div className="p-4 flex-1 flex flex-col items-center justify-center text-center text-sm text-muted-foreground">
          <p className="mb-4">Please log in to see your inventory and place blocks.</p>
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-48 border-r bg-secondary/50 flex flex-col relative">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
        <span
          className={`px-2 py-1 text-xs font-bold rounded-full ${
            team === "red" ? "bg-red-500 text-white" : "bg-blue-500 text-white"
          }`}
        >
          {team.toUpperCase()}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {availableBlocks.length > 0 ? (
            availableBlocks.map(({ block, quantity }) => (
              block && (
                <div
                  key={block.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, block.id)}
                  onClick={() => onBlockClick(block.id)}
                  onTouchStart={(e) => handleTouchStart(e, block.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors flex flex-col items-center"
                >
                  <div className="w-16 h-16">
                    <TetrisBlockComponent block={block} />
                  </div>
                  <span className="text-sm font-bold text-foreground">x{quantity}</span>
                </div>
              )
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Your inventory is empty. Visit the store to buy some blocks!
            </div>
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4 text-xs text-muted-foreground">
        Click or drag blocks onto the canvas.
      </div>

      {draggingBlock && touchPosition && (
        <div
          style={{
            position: "fixed",
            pointerEvents: "none",
            top: touchPosition.y - 40,
            left: touchPosition.x - 40,
            width: 80,
            height: 80,
            opacity: 0.7,
            zIndex: 1000,
          }}
        >
            <TetrisBlockComponent
              block={draggingBlock}
              className="w-full h-full"
            />
        </div>
      )}
    </aside>
  );
}
