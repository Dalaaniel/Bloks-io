
"use client";

import React, { useState } from "react";
import { getBlockById, type Team } from "@/lib/blocks";
import TetrisBlockComponent from "@/components/tetris-block";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface InventoryProps {
  ownedBlocks: { [key: string]: number };
  team: Team;
  onBlockClick: (blockId: string) => void;
  onBlockTouchDrop?: (blockId: string, x: number, y: number) => void;
}

export default function Inventory({ ownedBlocks, team, onBlockClick, onBlockTouchDrop }: InventoryProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);

  const draggingBlock = draggingBlockId ? getBlockById(draggingBlockId, team) : undefined;

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, blockId: string) => {
    if (!user) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("application/tetris-block", blockId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>, blockId: string) => {
    if (!user) {
      event.preventDefault();
      return;
    }
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
  
  const handleItemClick = (blockId: string) => {
    if(user) {
      onBlockClick(blockId);
    }
  }

  const availableBlocks = Object.entries(ownedBlocks)
    .map(([id, quantity]) => {
      const block = getBlockById(id, team);
      return { block, quantity };
    })
    .filter((item) => item.block && item.quantity > 0);
  
  const renderInventoryContent = () => {
    if (loading) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      );
    }

    if (!user) {
       return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>Please log in to see your inventory and place blocks.</p>
          <Button onClick={() => router.push('/login')} className="mt-4 w-full">
            Log In
          </Button>
        </div>
      );
    }

    if(availableBlocks.length === 0) {
      return (
         <div className="p-4 text-center text-sm text-muted-foreground">
            Your inventory is empty. Visit the store to buy some blocks!
          </div>
      )
    }

    return availableBlocks.map(({ block, quantity }) => (
      block && (
        <div
          key={block.id}
          draggable={!!user}
          onDragStart={(e) => handleDragStart(e, block.id)}
          onClick={() => handleItemClick(block.id)}
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
    ));
  }


  return (
    <aside className="w-48 border-r bg-secondary/50 flex flex-col relative">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {renderInventoryContent()}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4 text-xs text-muted-foreground">
        { user ? 'Click or drag blocks onto the canvas.' : 'Log in to play.' }
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
