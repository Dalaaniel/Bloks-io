export type BlockId = 'i' | 'o' | 't' | 'l' | 'j' | 's' | 'z';
export type Team = 'red' | 'blue';

export interface TetrisBlock {
  id: BlockId;
  name: string;
  color: string;
  price: number;
  vertices: { x: number; y: number }[];
  parts: { x: number; y: number }[][];
}

const BLOCK_SIZE = 40;

const teamColors: Record<Team, Record<BlockId, string>> = {
  blue: {
    i: '#00A8F0', // Light Blue
    o: '#0060F0', // Medium Blue
    t: '#0030F0', // Dark Blue
    l: '#40A0FF', // Sky Blue
    j: '#2080F8', // Royal Blue
    s: '#60C0FF', // Baby Blue
    z: '#1040E0', // Navy Blue
  },
  red: {
    i: '#F00050', // Magenta
    o: '#F04000', // Orange-Red
    t: '#D00000', // Strong Red
    l: '#FF6060', // Light Red
    j: '#E02020', // Crimson
    s: '#FF8080', // Salmon
    z: '#B00000', // Maroon
  }
};

const baseBlocks: Omit<TetrisBlock, 'color'>[] = [
  {
    id: 'i',
    name: 'I-Block',
    price: 100,
    vertices: [
      { x: 0, y: 0 }, { x: BLOCK_SIZE * 4, y: 0 },
      { x: BLOCK_SIZE * 4, y: BLOCK_SIZE }, { x: 0, y: BLOCK_SIZE }
    ],
    parts: [
      [
        { x: 0, y: 0 }, { x: BLOCK_SIZE * 4, y: 0 },
        { x: BLOCK_SIZE * 4, y: BLOCK_SIZE }, { x: 0, y: BLOCK_SIZE }
      ]
    ]
  },
  {
    id: 'o',
    name: 'O-Block',
    price: 100,
    vertices: [
      { x: 0, y: 0 }, { x: BLOCK_SIZE * 2, y: 0 },
      { x: BLOCK_SIZE * 2, y: BLOCK_SIZE * 2 }, { x: 0, y: BLOCK_SIZE * 2 }
    ],
    parts: [
        [
            { x: 0, y: 0 }, { x: BLOCK_SIZE * 2, y: 0 },
            { x: BLOCK_SIZE * 2, y: BLOCK_SIZE * 2 }, { x: 0, y: BLOCK_SIZE * 2 }
        ]
    ]
  },
  {
    id: 't',
    name: 'T-Block',
    price: 50,
    vertices: [
        { x: 0, y: 0 }, { x: BLOCK_SIZE * 3, y: 0 }, { x: BLOCK_SIZE * 3, y: BLOCK_SIZE },
        { x: BLOCK_SIZE * 2, y: BLOCK_SIZE }, { x: BLOCK_SIZE * 2, y: BLOCK_SIZE * 2 },
        { x: BLOCK_SIZE, y: BLOCK_SIZE * 2 }, { x: BLOCK_SIZE, y: BLOCK_SIZE }, { x: 0, y: BLOCK_SIZE }
    ],
    parts: [
        [
            { x: 0, y: 0 }, { x: BLOCK_SIZE * 3, y: 0 },
            { x: BLOCK_SIZE * 3, y: BLOCK_SIZE }, { x: 0, y: BLOCK_SIZE }
        ],
        [
            { x: BLOCK_SIZE, y: BLOCK_SIZE }, { x: BLOCK_SIZE * 2, y: BLOCK_SIZE },
            { x: BLOCK_SIZE * 2, y: BLOCK_SIZE * 2 }, { x: BLOCK_SIZE, y: BLOCK_SIZE * 2}
        ]
    ]
  },
  {
    id: 'l',
    name: 'L-Block',
    price: 50,
    vertices: [
        { x: 0, y: 0 }, { x: BLOCK_SIZE * 2, y: 0 }, { x: BLOCK_SIZE * 2, y: BLOCK_SIZE * 3 },
        { x: BLOCK_SIZE, y: BLOCK_SIZE * 3 }, { x: BLOCK_SIZE, y: BLOCK_SIZE }, { x: 0, y: BLOCK_SIZE }
    ],
    parts: [
        [
            { x: 0, y: 0 }, { x: BLOCK_SIZE, y: 0 },
            { x: BLOCK_SIZE, y: BLOCK_SIZE * 3 }, { x: 0, y: BLOCK_SIZE * 3 }
        ],
        [
            { x: BLOCK_SIZE, y: 0 }, { x: BLOCK_SIZE * 2, y: 0 },
            { x: BLOCK_SIZE * 2, y: BLOCK_SIZE }, { x: BLOCK_SIZE, y: BLOCK_SIZE}
        ]
    ]
  },
  {
    id: 'j',
    name: 'J-Block',
    price: 50,
    vertices: [
        { x: 0, y: 0 }, { x: BLOCK_SIZE, y: 0 }, { x: BLOCK_SIZE, y: BLOCK_SIZE * 3 },
        { x: -BLOCK_SIZE, y: BLOCK_SIZE * 3 }, { x: -BLOCK_SIZE, y: BLOCK_SIZE*2 }, {x: 0, y: BLOCK_SIZE*2}
    ].map(v => ({x: v.x + BLOCK_SIZE, y: v.y})),
    parts: [
        [
            { x: BLOCK_SIZE, y: 0 }, { x: BLOCK_SIZE * 2, y: 0 },
            { x: BLOCK_SIZE * 2, y: BLOCK_SIZE * 3 }, { x: BLOCK_SIZE, y: BLOCK_SIZE * 3 }
        ],
        [
            { x: 0, y: BLOCK_SIZE * 2 }, { x: BLOCK_SIZE, y: BLOCK_SIZE * 2 },
            { x: BLOCK_SIZE, y: BLOCK_SIZE * 3 }, { x: 0, y: BLOCK_SIZE * 3 }
        ]
    ]
  },
  {
    id: 's',
    name: 'S-Block',
    price: 75,
    vertices: [
        { x: 0, y: BLOCK_SIZE }, { x: BLOCK_SIZE, y: BLOCK_SIZE }, { x: BLOCK_SIZE, y: 0 },
        { x: BLOCK_SIZE * 3, y: 0 }, { x: BLOCK_SIZE * 3, y: BLOCK_SIZE },
        { x: BLOCK_SIZE * 2, y: BLOCK_SIZE }, { x: BLOCK_SIZE * 2, y: BLOCK_SIZE * 2 },
        { x: 0, y: BLOCK_SIZE * 2 }
    ],
    parts: [
        [
            { x: BLOCK_SIZE, y: 0 }, { x: BLOCK_SIZE * 3, y: 0 },
            { x: BLOCK_SIZE * 3, y: BLOCK_SIZE }, { x: BLOCK_SIZE, y: BLOCK_SIZE }
        ],
        [
            { x: 0, y: BLOCK_SIZE }, { x: BLOCK_SIZE * 2, y: BLOCK_SIZE },
            { x: BLOCK_SIZE * 2, y: BLOCK_SIZE * 2 }, { x: 0, y: BLOCK_SIZE * 2 }
        ]
    ]
  },
  {
    id: 'z',
    name: 'Z-Block',
    price: 75,
    vertices: [
        { x: 0, y: 0 }, { x: BLOCK_SIZE * 2, y: 0 }, { x: BLOCK_SIZE * 2, y: BLOCK_SIZE },
        { x: BLOCK_SIZE * 3, y: BLOCK_SIZE }, { x: BLOCK_SIZE * 3, y: BLOCK_SIZE * 2 },
        { x: BLOCK_SIZE, y: BLOCK_SIZE * 2 }, { x: BLOCK_SIZE, y: BLOCK_SIZE }, { x: 0, y: BLOCK_SIZE }
    ],
    parts: [
        [
            { x: 0, y: 0 }, { x: BLOCK_SIZE * 2, y: 0 },
            { x: BLOCK_SIZE * 2, y: BLOCK_SIZE }, { x: 0, y: BLOCK_SIZE }
        ],
        [
            { x: BLOCK_SIZE, y: BLOCK_SIZE }, { x: BLOCK_SIZE * 3, y: BLOCK_SIZE },
            { x: BLOCK_SIZE * 3, y: BLOCK_SIZE * 2 }, { x: BLOCK_SIZE, y: BLOCK_SIZE * 2 }
        ]
    ]
  },
];

export const getAllStoreBlocks = (): TetrisBlock[] => {
    // For the store, we can just show one color, e.g., blue
    return baseBlocks.map(block => ({
        ...block,
        color: teamColors.blue[block.id]
    }));
}


export const getBlockById = (id: string, team: Team): TetrisBlock | undefined => {
    const baseBlock = baseBlocks.find(b => b.id === id);
    if (!baseBlock) return undefined;

    return {
        ...baseBlock,
        color: teamColors[team][baseBlock.id]
    };
};
