"use client";

import { useInventory } from "@/context/inventory-context";
import { getBlockById, type Team } from "@/lib/blocks";
import TetrisBlockComponent from "@/components/tetris-block";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface InventoryProps {
  onBlockClick: (blockId: string) => void;
}

export default function Inventory({ onBlockClick }: InventoryProps) {
  const { ownedBlocks, team } = useInventory();

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, blockId: string) => {
    event.dataTransfer.setData("application/tetris-block", blockId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const availableBlocks = Object.entries(ownedBlocks)
    .map(([id, quantity]) => {
      const block = getBlockById(id, team || 'blue');
      return { block, quantity };
    })
    .filter(item => item.block && item.quantity > 0);

  if (!team) {
    return (
       <aside className="w-48 border-r bg-secondary/50 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
        </div>
        <div className="p-4 text-center text-sm text-muted-foreground">
          Assigning team...
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-48 border-r bg-secondary/50 flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
            team === 'red' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
        }`}>
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
    </aside>
  );
}
