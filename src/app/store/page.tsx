
'use client';

import { getAllStoreBlocks } from '@/lib/blocks';
import BlockCard from '@/components/store/block-card';
import { useToast } from '@/hooks/use-toast';

export default function StorePage() {
  const storeBlocks = getAllStoreBlocks();
  const { toast } = useToast();

  const handleBuyBlock = (blockId: string) => {
    console.log(`Bought block: ${blockId}`);
    toast({
      title: "Purchase Successful!",
      description: `A new block has been added to your inventory.`,
    });
    // This is a placeholder. In a real app with state management,
    // you would update a shared inventory state here.
  }

  return (
    <main className="container py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Block Store</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Purchase new blocks to expand your creative possibilities on the canvas.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {storeBlocks.map(block => (
          <BlockCard key={block.id} block={block} onBuy={handleBuyBlock} />
        ))}
      </div>
    </main>
  );
}
