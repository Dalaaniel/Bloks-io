export interface TetrisBlock {
  id: 'i' | 'o' | 't' | 'l' | 'j' | 's' | 'z';
  name: string;
  color: string;
  price: number;
  vertices: { x: number; y: number }[];
  parts: { x: number; y: number }[][];
}

const BLOCK_SIZE = 40;

export const blocks: TetrisBlock[] = [
  {
    id: 'i',
    name: 'I-Block',
    color: '#00F0F0', // Cyan
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
    color: '#F0F000', // Yellow
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
    color: '#A000F0', // Purple
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
    color: '#F0A000', // Orange
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
    color: '#0000F0', // Blue
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
    color: '#00F000', // Green
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
    color: '#F00000', // Red
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

export const getBlockById = (id: string): TetrisBlock | undefined => blocks.find(b => b.id === id);
