"use client";

import { useInventory } from "@/context/inventory-context";
import { getBlockById } from "@/lib/blocks";
import TetrisBlockComponent from "@/components/tetris-block";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function Inventory() {
  const { ownedBlocks } = useInventory();

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, blockId: string) => {
    event.dataTransfer.setData("application/tetris-block", blockId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const availableBlocks = Object.entries(ownedBlocks)
    .map(([id, quantity]) => ({ block: getBlockById(id), quantity }))
    .filter(item => item.block && item.quantity > 0);

  return (
    <aside className="w-48 border-r bg-secondary/50 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
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
                  className="p-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent transition-colors flex flex-col items-center"
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
        Drag blocks from your inventory onto the canvas.
      </div>
    </aside>
  );
}
