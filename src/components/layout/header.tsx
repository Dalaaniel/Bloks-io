import Link from 'next/link';
import { Shapes } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Shapes className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">Tetris Canvas</span>
        </Link>
        <nav className="flex flex-1 items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/">Canvas</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/store">Store</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
