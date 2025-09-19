
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter from 'matter-js';
import { getBlockById, type TetrisBlock } from '@/lib/blocks';

export interface TetrisCanvasApi {
  addBlock: (blockId: string, x: number, y: number) => void;
  setZoom: (zoom: number) => void;
}

const TetrisCanvas = forwardRef<TetrisCanvasApi>((_props, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const [canvasSize, setCanvasSize] = useState({ width: 3000, height: 0 });
  const [stars, setStars] = useState<{x: number, y: number, radius: number}[]>([]);
  const zoomRef = useRef(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const height = window.innerHeight * 3; // Make canvas taller
      setCanvasSize({ width: 3000, height });

      // Generate stars
      const newStars = [];
      for (let i = 0; i < 400; i++) { // More stars for bigger canvas
        newStars.push({
          x: Math.random() * 3000,
          y: Math.random() * height,
          radius: Math.random() * 1.5,
        });
      }
      setStars(newStars);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    addBlock: (blockId, x, y) => {
        const blockData = getBlockById(blockId);
        const engine = engineRef.current;
        if (!blockData || !engine) return;

        const scale = 2; // Keep internal scaling consistent
        const translatedX = x * zoomRef.current;
        const translatedY = y * zoomRef.current;

        const blockParts = blockData.parts.map(part => {
            const vertices = part.map(p => ({ x: p.x, y: p.y }));
            return Matter.Bodies.fromVertices(translatedX, translatedY, [vertices], {
                render: {
                    fillStyle: blockData.color,
                    strokeStyle: 'rgba(0,0,0,0.2)',
                    lineWidth: 2,
                }
            });
        });

        const compoundBody = Matter.Body.create({
            parts: blockParts,
        });

        compoundBody.label = `block-${blockId}`;

        Matter.World.add(engine.world, compoundBody);
    },
    setZoom: (zoom) => {
        zoomRef.current = zoom;
        const render = renderRef.current;
        if (!render) return;

        Matter.Render.lookAt(render, {
            min: { x: 0, y: 0 },
            max: { x: canvasSize.width / zoomRef.current, y: canvasSize.height / zoomRef.current }
        });
    }
  }));

  useEffect(() => {
    if (!sceneRef.current || canvasSize.height === 0) return;

    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Events } = Matter;

    const engine = Engine.create({ gravity: { y: 0.4 } });
    engineRef.current = engine;
    const world = engine.world;
    
    const renderWidth = canvasSize.width;
    const renderHeight = canvasSize.height;

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
    
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: renderWidth, y: renderHeight }
    });

    // Ground
    World.add(world, Bodies.rectangle(renderWidth / 2, renderHeight - 60, renderWidth, 120, { isStatic: true, render: { fillStyle: '#2a2a2a' } }));
    // Left Wall
    World.add(world, Bodies.rectangle(-60, renderHeight / 2, 120, renderHeight, { isStatic: true, render: { visible: false } }));
    // Right Wall
    World.add(world, Bodies.rectangle(renderWidth + 60, renderHeight / 2, 120, renderHeight, { isStatic: true, render: { visible: false } }));

    const mouse = Mouse.create(render.canvas);
    
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false,
        },
      },
    });

    World.add(world, mouseConstraint);
    render.mouse = mouse;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if(render.canvas) render.canvas.remove();
      if(render.textures) render.textures = {};
    };
  }, [canvasSize.height]);

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
