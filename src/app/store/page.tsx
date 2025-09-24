
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getAllStoreBlocks } from '@/lib/blocks';
import BlockCard from '@/components/store/block-card';
import { Button } from '@/components/ui/button';

export default function StorePage() {
  const storeBlocks = getAllStoreBlocks();
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return null; // or a loading spinner
  }

  if (!user) {
    return (
      <main className="container py-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Access Denied</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          You must be logged in to access the block store.
        </p>
        <Button className="mt-6" onClick={() => router.push('/login')}>
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
          <BlockCard key={block.id} block={block} />
        ))}
      </div>
    </main>
  );
}
