import { blocks } from '@/lib/blocks';
import BlockCard from '@/components/store/block-card';

export default function StorePage() {
  return (
    <main className="container py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Block Store</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Purchase new blocks to expand your creative possibilities on the canvas.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {blocks.map(block => (
          <BlockCard key={block.id} block={block} />
        ))}
      </div>
    </main>
  );
}
