"use client";

import { CreditCard, ShoppingCart } from "lucide-react";
import { type TetrisBlock } from "@/lib/blocks";
import { useInventory } from "@/context/inventory-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import TetrisBlockComponent from "@/components/tetris-block";
import { useToast } from "@/hooks/use-toast";

interface BlockCardProps {
  block: TetrisBlock;
}

export default function BlockCard({ block }: BlockCardProps) {
  const { addBlock } = useInventory();
  const { toast } = useToast();

  const handleBuy = () => {
    addBlock(block.id);
    toast({
      title: "Purchase Successful!",
      description: `A new ${block.name} has been added to your inventory.`,
    });
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
