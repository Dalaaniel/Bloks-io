import { type TetrisBlock } from "@/lib/blocks";

interface TetrisBlockProps {
  block: TetrisBlock;
  className?: string;
}

export default function TetrisBlockComponent({ block, className }: TetrisBlockProps) {
  const points = block.vertices.map(p => `${p.x},${p.y}`).join(' ');

  const xCoords = block.vertices.map(p => p.x);
  const yCoords = block.vertices.map(p => p.y);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  const width = maxX - minX;
  const height = maxY - minY;

  const viewBox = `${minX - width * 0.1} ${minY - height * 0.1} ${width * 1.2} ${height * 1.2}`;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        points={points}
        fill={block.color}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="2"
      />
    </svg>
  );
}
