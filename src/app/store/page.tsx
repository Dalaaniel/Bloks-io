
'use client';

import { getBlockById, type BlockId, baseBlocks, type TetrisBlock } from '@/lib/blocks';
import BlockCard from '@/components/store/block-card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateUserInventory, type UserInventory } from '@/services/auth-service';
import { useMemo } from 'react';

export default function StorePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const storeBlocks = useMemo(() => {
    if (!user) {
      // Default to blue team colors if user is not logged in
      return baseBlocks.map(block => getBlockById(block.id, 'blue')).filter(Boolean) as TetrisBlock[];
    }
    return baseBlocks.map(block => getBlockById(block.id, user.team)).filter(Boolean) as TetrisBlock[];
  }, [user]);

  const handleBuyBlock = async (blockId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "You must be logged in to purchase items.",
        variant: "destructive",
      });
      return;
    }

    const currentInventory = user.inventory || {};
    const newInventory: UserInventory = {
      ...currentInventory,
      [blockId as BlockId]: (currentInventory[blockId as BlockId] || 0) + 1,
    };

    try {
      await updateUserInventory(user.uid, newInventory);
      toast({
        title: "Purchase Successful!",
        description: `A new block has been added to your inventory.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Purchase Failed",
        description: "Could not complete the purchase. Please try again.",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return <main className="container py-8 text-center"><p>Loading...</p></main>;
  }

  if (!user) {
    return (
      <main className="container py-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Access Denied</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          You must be logged in to access the store.
        </p>
        <Button onClick={() => router.push('/login')} className="mt-4">
          Go to Login
        </Button>
      </main>
    );
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
