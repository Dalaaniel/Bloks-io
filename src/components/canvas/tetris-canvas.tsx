
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter from 'matter-js';
import { getBlockById, type TetrisBlock } from '@/lib/blocks';

export interface TetrisCanvasApi {
  addBlock: (blockId: string, x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
}

const BLOCK_SIZE = 40;
const MAX_DRAG_WEIGHT = 60;
const BLOCK_WEIGHT = 40;

const TetrisCanvas = forwardRef<TetrisCanvasApi>((_props, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const mouseRef = useRef<Matter.Mouse>();
  const [canvasSize, setCanvasSize] = useState({ width: 3000, height: 8000 });
  const [stars, setStars] = useState<{x: number, y: number, radius: number}[]>([]);
  const zoomRef = useRef(0.25);

  useEffect(() => {
    const newStars = [];
    for (let i = 0; i < 1000; i++) {
      newStars.push({
        x: Math.random() * canvasSize.width,
        y: Math.random() * canvasSize.height,
        radius: Math.random() * 1.5,
      });
    }
    setStars(newStars);
  }, [canvasSize.width, canvasSize.height]);

  useImperativeHandle(ref, () => ({
    addBlock: (blockId, x, y) => {
        const blockData = getBlockById(blockId);
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
            mass: BLOCK_WEIGHT, // Logic 2: Set weight
        });

        compoundBody.label = `block-${blockId}`;

        Matter.World.add(engine.world, compoundBody);
    },
    setZoom: (zoom) => {
        zoomRef.current = zoom;
        const render = renderRef.current;
        const scene = sceneRef.current;
        const mouse = mouseRef.current;
        if (!render || !scene || !mouse) return;
        
        scene.style.transform = `scale(${zoom})`;
        scene.style.transformOrigin = '0 0';

        Matter.Mouse.setScale(mouse, { x: 1 / zoom, y: 1 / zoom });
    },
    getZoom: () => zoomRef.current,
  }));

  useEffect(() => {
    if (!sceneRef.current) return;

    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Events } = Matter;

    const engine = Engine.create({ gravity: { y: 0.4 } });
    engineRef.current = engine;
    const world = engine.world;
    
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: canvasSize.width,
        height: canvasSize.height,
        wireframes: false,
        background: 'transparent',
      },
    });
    renderRef.current = render;
    
    // Ground
    World.add(world, Bodies.rectangle(canvasSize.width / 2, canvasSize.height - 30, canvasSize.width, 60, { isStatic: true, render: { fillStyle: '#2a2a2a' } }));
    // Left Wall
    World.add(world, Bodies.rectangle(-30, canvasSize.height / 2, 60, canvasSize.height, { isStatic: true, render: { visible: false } }));
    // Right Wall
    World.add(world, Bodies.rectangle(canvasSize.width + 30, canvasSize.height / 2, 60, canvasSize.height, { isStatic: true, render: { visible: false } }));

    const mouse = Mouse.create(render.canvas);
    mouseRef.current = mouse;
    
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false,
        },
      },
    });

    // Logic 3: Drag weight calculation
    Events.on(mouseConstraint, 'startdrag', (event) => {
      const draggedBody = event.body;
      let totalWeightInColumn = draggedBody.mass;
      
      const bodies = Matter.Composite.allBodies(world);
      const draggedBodyColumnMin = Math.floor(draggedBody.bounds.min.x / (BLOCK_SIZE * 2));
      const draggedBodyColumnMax = Math.floor(draggedBody.bounds.max.x / (BLOCK_SIZE * 2));

      for (const body of bodies) {
          if (body === draggedBody || body.isStatic) continue;

          const bodyColumnMin = Math.floor(body.bounds.min.x / (BLOCK_SIZE * 2));
          const bodyColumnMax = Math.floor(body.bounds.max.x / (BLOCK_SIZE * 2));

          const inSameColumn = Math.max(draggedBodyColumnMin, bodyColumnMin) <= Math.min(draggedBodyColumnMax, bodyColumnMax);

          if (inSameColumn && body.bounds.min.y > draggedBody.bounds.max.y) {
            // This assumes each body is a full tetris block with weight 40
             totalWeightInColumn += body.mass;
          }
      }

      // We only check the weight of the objects below it.
      const weightOfBelowObjects = totalWeightInColumn - draggedBody.mass;
      const dragWeight = BLOCK_WEIGHT + weightOfBelowObjects;


      if (dragWeight > MAX_DRAG_WEIGHT) {
        // Cancel the drag by disabling the mouse constraint temporarily
        mouseConstraint.constraint.bodyB = null;
        mouseConstraint.constraint.bodyB = null;
        mouseConstraint.body = null;
      }
    });

    World.add(world, mouseConstraint);
    render.mouse = mouse;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
    
    // Initial zoom and mouse scale
    const initialZoom = zoomRef.current;
    if (sceneRef.current) {
        sceneRef.current.style.transform = `scale(${initialZoom})`;
        sceneRef.current.style.transformOrigin = '0 0';
    }
    Matter.Mouse.setScale(mouse, { x: 1 / initialZoom, y: 1 / initialZoom });


    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if(render.canvas) render.canvas.remove();
      if(render.textures) render.textures = {};
    };
  }, [canvasSize.width, canvasSize.height]);

  return (
    <div
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0a',
      }}
    >
      <div 
        ref={sceneRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {stars.map((star, i) => (
          <div key={i} style={{
              position: 'absolute',
              left: star.x,
              top: star.y,
              width: star.radius * 2,
              height: star.radius * 2,
              backgroundColor: 'white',
              borderRadius: '50%',
          }} />
        ))}
      </div>
    </div>
  );
});

TetrisCanvas.displayName = 'TetrisCanvas';

export default TetrisCanvas;

    