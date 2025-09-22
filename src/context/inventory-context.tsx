"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { type Team } from '@/lib/blocks';

interface InventoryContextType {
  ownedBlocks: { [key: string]: number };
  team: Team | null;
  zoom: number;
  setZoom: (zoom: number) => void;
  addBlock: (blockId: string) => void;
  useBlock: (blockId: string) => boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [ownedBlocks, setOwnedBlocks] = useState<{ [key: string]: number }>({
    i: 5, o: 5, t: 5, l: 5, j: 5, s: 5, z: 5,
  });
  const [team, setTeam] = useState<Team | null>(null);
  const [zoom, setZoom] = useState(0.5);

  useEffect(() => {
    // Randomly assign a team on initial load
    setTeam(Math.random() < 0.5 ? 'red' : 'blue');
  }, []);

  const addBlock = useCallback((blockId: string) => {
    setOwnedBlocks(prev => ({
      ...prev,
      [blockId]: (prev[blockId] || 0) + 1,
    }));
  }, []);

  const useBlock = useCallback((blockId: string) => {
    if (ownedBlocks[blockId] && ownedBlocks[blockId] > 0) {
      setOwnedBlocks(prev => ({
        ...prev,
        [blockId]: prev[blockId] - 1,
      }));
      return true;
    }
    return false;
  }, [ownedBlocks]);

  const value = { ownedBlocks, team, addBlock, useBlock, zoom, setZoom };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
