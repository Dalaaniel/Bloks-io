
"use client";

import React from "react";
import { getBlockById, type Team } from "@/lib/blocks";
import TetrisBlockComponent from "@/components/tetris-block";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { type UserInventory } from "@/services/auth-service";

interface InventoryProps {
  ownedBlocks: UserInventory;
  team: Team;
  onBlockClick: (blockId: string) => void;
  isMyTurn: boolean;
}

export default function Inventory({ ownedBlocks, team, onBlockClick, isMyTurn }: InventoryProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, blockId: string) => {
    if (!isMyTurn) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("application/tetris-block", blockId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleItemClick = (blockId: string) => {
    if(isMyTurn) {
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
          draggable={isMyTurn}
          onDragStart={(e) => handleDragStart(e, block.id)}
          onClick={() => handleItemClick(block.id)}
          className={`p-2 rounded-lg ${isMyTurn ? 'cursor-grab hover:bg-accent' : 'cursor-not-allowed opacity-50'} transition-colors flex flex-col items-center`}
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
        { !user ? 'Log in to play.' : isMyTurn ? 'Your turn! Click or drag blocks.' : "Wait for your turn." }
      </div>
    </aside>
  );
}

    