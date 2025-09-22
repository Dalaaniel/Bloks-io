
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter from 'matter-js';
import { getBlockById, type Team } from '@/lib/blocks';
import { useInventory } from '@/context/inventory-context';

export interface TetrisCanvasApi {
  addBlock: (blockId: string, x: number, y: number, team: Team) => void;
  spawnBlockForTeam: (blockId: string, team: Team) => void;
  getViewportCoordinates: (x: number, y: number) => { x: number, y: number };
}

const BLOCK_WEIGHT = 40;
const SPAWN_Y_OFFSET = 29500; // Spawn blocks lower in the canvas

type DragMode = 'none' | 'panning' | 'zooming';

const TetrisCanvas = forwardRef<TetrisCanvasApi>((_props, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const mouseRef = useRef<Matter.Mouse>();
  const mouseConstraintRef = useRef<Matter.MouseConstraint>();
  
  const [canvasSize] = useState({ width: 100000, height: 30000 });
  const [stars, setStars] = useState<{x: number, y: number, radius: number}[]>([]);
  
  const { zoom, setZoom } = useInventory();
  
  const dragModeRef = useRef<DragMode>('none');
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const viewCenter = useRef({ x: canvasSize.width / 2, y: canvasSize.height - 1000 });
  const zoomStartRef = useRef({ y: 0, zoom: 1 });

  useEffect(() => {
    const newStars = [];
    for (let i = 0; i < 20000; i++) {
      newStars.push({
        x: Math.random() * canvasSize.width,
        y: Math.random() * canvasSize.height,
        radius: Math.random() * 1.5,
      });
    }
    setStars(newStars);
  }, [canvasSize.width, canvasSize.height]);

  const addBlock = (blockId: string, x: number, y: number, team: Team) => {
    const blockData = getBlockById(blockId, team);
    const engine = engineRef.current;
    if (!blockData || !engine) return;

    const scale = 2;

    const blockParts = blockData.parts.map(part => {
        const vertices = part.map(p => ({ x: p.x * scale, y: p.y * scale }));
        return Matter.Bodies.fromVertices(x, y, [vertices], {
            render: {
                fillStyle: blockData.color,
                strokeStyle: 'rgba(0,0,0,0.2)',
                lineWidth: 2,
            }
        });
    });

    const compoundBody = Matter.Body.create({
        parts: blockParts,
        mass: BLOCK_WEIGHT,
    });
    
    compoundBody.label = `block-${team}-${blockId}`;
    
    Matter.World.add(engine.world, [compoundBody]);
  };
  
  const updateCamera = () => {
    const render = renderRef.current;
    if (!render) return;

    const lookAt = viewCenter.current;
    
    const bounds = {
      min: { x: lookAt.x - (render.options.width! / 2) / zoom, y: lookAt.y - (render.options.height! / 2) / zoom },
      max: { x: lookAt.x + (render.options.width! / 2) / zoom, y: lookAt.y + (render.options.height! / 2) / zoom }
    };
    
    Matter.Render.lookAt(render, bounds);
  };

  useImperativeHandle(ref, () => ({
    addBlock,
    spawnBlockForTeam: (blockId, team) => {
      const world = engineRef.current?.world;
      if (!world) return;
  
      const canvasCenterX = canvasSize.width / 2;
      const spawnAreaWidth = canvasSize.width / 4;
      
      const xSpawn = team === 'blue' 
        ? canvasCenterX - spawnAreaWidth
        : canvasCenterX + spawnAreaWidth;
  
      addBlock(blockId, xSpawn, SPAWN_Y_OFFSET, team);
    },
    getViewportCoordinates: (x, y) => {
        const render = renderRef.current;
        if (!render) return { x: 0, y: 0 };
        
        const view = render.bounds;
        const worldX = view.min.x + (x / render.options.width!) * (view.max.x - view.min.x);
        const worldY = view.min.y + (y / render.options.height!) * (view.max.y - view.min.y);

        return { x: worldX, y: worldY };
    }
  }));

  useEffect(() => {
    if (!sceneRef.current) return;

    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint } = Matter;

    const engine = Engine.create({ gravity: { y: 0.4 } });
    engineRef.current = engine;
    const world = engine.world;
    
    const parentElement = sceneRef.current.parentElement!;
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: parentElement.clientWidth,
        height: parentElement.clientHeight,
        wireframes: false,
        background: 'transparent',
        hasBounds: true
      },
    });
    renderRef.current = render;
    
    World.add(world, Bodies.rectangle(canvasSize.width / 2, canvasSize.height - 30, canvasSize.width, 60, { isStatic: true, render: { fillStyle: '#2a2a2a' } }));

    const mouse = Mouse.create(render.canvas);
    mouseRef.current = mouse;
    
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    mouseConstraintRef.current = mouseConstraint;

    World.add(world, mouseConstraint);
    render.mouse = mouse;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
    
    updateCamera();

    const handleResize = () => {
      if (renderRef.current && sceneRef.current?.parentElement) {
        renderRef.current.options.width = sceneRef.current.parentElement.clientWidth;
        renderRef.current.options.height = sceneRef.current.parentElement.clientHeight;
        updateCamera();
      }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if(render.canvas) render.canvas.remove();
      if(render.textures) render.textures = {};
    };
  }, [canvasSize.width, canvasSize.height]);

  useEffect(() => {
    updateCamera();
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return; // Only for left mouse button

    if (e.ctrlKey) {
        dragModeRef.current = 'zooming';
        zoomStartRef.current = { y: e.clientY, zoom };
        return;
    }

    // Delay setting pan mode to allow Matter.js to pick up the body first
    setTimeout(() => {
      const mc = mouseConstraintRef.current;
      // If mouse constraint is dragging a body, don't pan
      if (mc && mc.body) {
        dragModeRef.current = 'none';
        return;
      }
      
      // If no body is being dragged, start panning
      dragModeRef.current = 'panning';
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }, 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (dragModeRef.current === 'panning') {
      const dx = e.clientX - lastMousePosition.current.x;
      const dy = e.clientY - lastMousePosition.current.y;
      
      viewCenter.current.x -= dx / zoom;
      viewCenter.current.y -= dy / zoom;
      
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
      updateCamera();
    } else if (dragModeRef.current === 'zooming') {
        const dy = e.clientY - zoomStartRef.current.y;
        const zoomFactor = Math.pow(1.005, -dy);
        const newZoom = Math.max(0.02, Math.min(2, zoomStartRef.current.zoom * zoomFactor));
        setZoom(newZoom);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    dragModeRef.current = 'none';
  };
  
  const handleMouseLeave = () => {
    dragModeRef.current = 'none';
  };

  const getCursor = () => {
    if (dragModeRef.current === 'panning' || dragModeRef.current === 'zooming') {
      return 'grabbing';
    }
    return 'grab';
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0a',
        cursor: getCursor(),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={(e) => { // Prevent default browser wheel zoom
        e.preventDefault();
      }}
    >
      <div 
        ref={sceneRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="100%" height="100%" fill="transparent" />
          {stars.map((star, i) => (
            <circle key={i} cx={star.x} cy={star.y} r={star.radius} fill="white" 
              style={{
                transform: `translate(${-viewCenter.current.x * zoom + (renderRef.current?.options.width || 0) / 2}px, ${-viewCenter.current.y * zoom + (renderRef.current?.options.height || 0) / 2}px) scale(${zoom})`,
                transformOrigin: `${viewCenter.current.x}px ${viewCenter.current.y}px`
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
});

TetrisCanvas.displayName = 'TetrisCanvas';

export default TetrisCanvas;
