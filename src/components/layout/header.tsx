"use client";

import Link from 'next/link';
import { Shapes, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInventory } from '@/context/inventory-context';
import { Slider } from '@/components/ui/slider';

export default function Header() {
  const { team, zoom, setZoom } = useInventory();
  
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

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

        <div className="flex items-center gap-4 mx-4">
          <ZoomOut className="h-5 w-5 text-muted-foreground" />
          <Slider
              defaultValue={[zoom]}
              value={[zoom]}
              min={0.1}
              max={2}
              step={0.05}
              onValueChange={handleZoomChange}
              className="w-48"
          />
          <ZoomIn className="h-5 w-5 text-muted-foreground" />
        </div>

        {team && (
          <div className={`px-3 py-1.5 text-sm font-bold rounded-full ${
            team === 'red' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
          }`}>
            Team {team.charAt(0).toUpperCase() + team.slice(1)}
          </div>
        )}
      </div>
    </header>
  );
}
