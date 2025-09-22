
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter, { IEventCollision } from 'matter-js';
import { getBlockById, type Team } from '@/lib/blocks';
import { useInventory } from '@/context/inventory-context';

export interface TetrisCanvasApi {
  addBlock: (blockId: string, x: number, y: number, team: Team) => void;
  spawnBlockForTeam: (blockId: string, team: Team) => void;
  getViewportCoordinates: (x: number, y: number) => { x: number, y: number };
  resetView: () => void;
  getBodiesInRegion: (bounds: Matter.Bounds) => Matter.Body[];
}

const BLOCK_WEIGHT = 40;
const SPAWN_Y_OFFSET = 29500; // Spawn blocks lower in the canvas

type DragMode = 'none' | 'panning' | 'zooming';

const TetrisCanvas = forwardRef<TetrisCanvasApi>((_props, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const mouseRef = useRef<Matter.Mouse>();
  const mouseConstraintRef = useRef<Matter.MouseConstraint>();
  
  const [canvasSize] = useState({ width: 100000, height: 30000 });
  
  const { zoom, setZoom, team } = useInventory();
  
  const dragModeRef = useRef<DragMode>('none');
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const viewCenter = useRef({ x: canvasSize.width / 2, y: canvasSize.height - 1000 });
  const zoomStartRef = useRef({ y: 0, zoom: 1 });
  
  const initialOverlapWhitelistRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const starsCanvas = starsCanvasRef.current;
    if (!starsCanvas) return;
    
    starsCanvas.width = canvasSize.width;
    starsCanvas.height = canvasSize.height;

    const ctx = starsCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'white';
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * canvasSize.width;
      const y = Math.random() * canvasSize.height;
      const radius = Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
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

    // Sync stars canvas transform
    if (starsCanvasRef.current && render.options.width && render.options.height) {
        const parentWidth = render.options.width;
        const parentHeight = render.options.height;
        const originX = parentWidth / 2;
        const originY = parentHeight / 2;
        const translateX = -viewCenter.current.x * zoom + originX;
        const translateY = -viewCenter.current.y * zoom + originY;

        starsCanvasRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoom})`;
    }
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
        if (!render || !render.options.width || !render.options.height) return { x: 0, y: 0 };
        
        const view = render.bounds;
        const worldX = view.min.x + (x / render.options.width) * (view.max.x - view.min.x);
        const worldY = view.min.y + (y / render.options.height) * (view.max.y - view.min.y);

        return { x: worldX, y: worldY };
    },
    resetView: () => {
        const render = renderRef.current;
        if (!render || !render.options.width || !render.options.height) return;

        // Calculate the center point to show the top-left corner
        const viewportWidth = render.options.width / zoom;
        const viewportHeight = render.options.height / zoom;
        
        viewCenter.current = {
            x: viewportWidth / 2,
            y: viewportHeight / 2,
        };
        updateCamera();
    },
    getBodiesInRegion: (bounds) => {
      const engine = engineRef.current;
      if (!engine) return [];
      const allBodies = Matter.Composite.allBodies(engine.world);
      return Matter.Query.region(allBodies, bounds);
    }
  }));

  useEffect(() => {
    if (!sceneRef.current) return;

    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Events } = Matter;

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
    
    // --- Custom Drag Interruption Logic ---

    Events.on(mouseConstraint, 'mousedown', () => {
        if (mouseConstraint.body) {
            const draggedBody = mouseConstraint.body;
            const allOtherBodies = Composite.allBodies(engine.world).filter(
                body => body.id !== draggedBody.id && !body.isStatic
            );
            
            initialOverlapWhitelistRef.current.clear();
            
            allOtherBodies.forEach(otherBody => {
                const fictiveBounds = {
                    min: {
                        x: otherBody.bounds.min.x - (otherBody.bounds.max.x - otherBody.bounds.min.x) * 0.5,
                        y: otherBody.bounds.min.y - (otherBody.bounds.max.y - otherBody.bounds.min.y) * 0.5,
                    },
                    max: {
                        x: otherBody.bounds.max.x + (otherBody.bounds.max.x - otherBody.bounds.min.x) * 0.5,
                        y: otherBody.bounds.max.y + (otherBody.bounds.max.y - otherBody.bounds.min.y) * 0.5,
                    }
                };
                if (Bounds.overlaps(draggedBody.bounds, fictiveBounds)) {
                    initialOverlapWhitelistRef.current.add(otherBody.id);
                }
            });
        }
    });

    Events.on(mouseConstraint, 'mouseup', () => {
        initialOverlapWhitelistRef.current.clear();
    });

    Events.on(engine, 'beforeUpdate', () => {
        if (mouseConstraint.body) {
            const draggedBody = mouseConstraint.body;
            const allOtherBodies = Composite.allBodies(engine.world).filter(
                body => body.id !== draggedBody.id && !body.isStatic
            );

            for (const otherBody of allOtherBodies) {
                if (initialOverlapWhitelistRef.current.has(otherBody.id)) {
                    continue; // Skip check for whitelisted bodies
                }

                const fictiveBounds = {
                    min: {
                        x: otherBody.bounds.min.x - (otherBody.bounds.max.x - otherBody.bounds.min.x) * 0.5,
                        y: otherBody.bounds.min.y - (otherBody.bounds.max.y - otherBody.bounds.min.y) * 0.5,
                    },
                    max: {
                        x: otherBody.bounds.max.x + (otherBody.bounds.max.x - otherBody.bounds.min.x) * 0.5,
                        y: otherBody.bounds.max.y + (otherBody.bounds.max.y - otherBody.bounds.min.y) * 0.5,
                    }
                };

                if (Bounds.overlaps(draggedBody.bounds, fictiveBounds)) {
                    // Interrupt the drag
                    mouseConstraint.body = null;
                    break; 
                }
            }
        }
    });
    
    // --- End Custom Logic ---

    const handleResize = () => {
      if (renderRef.current && sceneRef.current?.parentElement) {
        renderRef.current.options.width = sceneRef.current.parentElement.clientWidth;
        renderRef.current.options.height = sceneRef.current.parentElement.clientHeight;
        updateCamera();
      }
    };
    
    window.addEventListener('resize', handleResize);

    const { Composite, Bounds } = Matter;
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

    const mc = mouseConstraintRef.current;
    
    // Check if we are holding ctrl for zooming
    if (e.ctrlKey) {
        dragModeRef.current = 'zooming';
        zoomStartRef.current = { y: e.clientY, zoom };
        return;
    }
    
    setTimeout(() => {
      if (mc && mc.body) {
        dragModeRef.current = 'none';
        return;
      }
      dragModeRef.current = 'panning';
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }, 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const mc = mouseConstraintRef.current;
    if (mc && mc.body) { // If a block is being dragged by matter, don't pan.
        dragModeRef.current = 'none';
    }

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
    const mc = mouseConstraintRef.current;
    if (mc && mc.body) {
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
       <canvas 
        ref={starsCanvasRef} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          transformOrigin: '0 0'
        }}
      />
      <div 
        ref={sceneRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
});

TetrisCanvas.displayName = 'TetrisCanvas';

export default TetrisCanvas;

    