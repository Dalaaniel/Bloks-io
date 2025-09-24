
"use client";

import { ShoppingCart } from "lucide-react";
import { type TetrisBlock } from "@/lib/blocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import TetrisBlockComponent from "@/components/tetris-block";

interface BlockCardProps {
  block: TetrisBlock;
  onBuy: (blockId: string) => void;
}

export default function BlockCard({ block, onBuy }: BlockCardProps) {

  const handleBuy = () => {
    onBuy(block.id);
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{block.name}</span>
        </CardTitle>
        <CardDescription>Price: ${block.price}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center p-6">
        <div className="w-24 h-24">
         <TetrisBlockComponent block={block} />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleBuy}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Buy Now
        </Button>
      </CardFooter>
    </Card>
  );
}
