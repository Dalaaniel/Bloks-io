
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter from 'matter-js';
import { getBlockById, type TetrisBlock } from '@/lib/blocks';

export interface TetrisCanvasApi {
  addBlock: (blockId: string, x: number, y: number) => void;
}

const TetrisCanvas = forwardRef<TetrisCanvasApi>((_props, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const [canvasSize, setCanvasSize] = useState({ width: 3000, height: 0 });
  const [stars, setStars] = useState<{x: number, y: number, radius: number}[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const height = window.innerHeight - 64; // 64px for header
      setCanvasSize({ width: 3000, height });

      // Generate stars
      const newStars = [];
      for (let i = 0; i < 200; i++) {
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
  
      const scale = 2;
      const translatedX = x;
      const translatedY = y;
  
      const blockParts = blockData.parts.map(part => {
        const vertices = Matter.Vertices.create(part);
        const center = Matter.Vertices.centre(vertices);
        const body = Matter.Bodies.fromVertices(
          translatedX + center.x, 
          translatedY + center.y, 
          [vertices], {
          render: {
            fillStyle: blockData.color,
            strokeStyle: 'rgba(0,0,0,0.2)',
            lineWidth: 2,
          }
        });
        return body;
      });
  
      const compoundBody = Matter.Body.create({
        parts: blockParts,
        render: {
          fillStyle: blockData.color,
          strokeStyle: 'rgba(0,0,0,0.2)',
          lineWidth: 2,
        }
      });
      
      compoundBody.label = `block-${blockId}`;
  
      Matter.World.add(engine.world, compoundBody);
    },
  }));

  useEffect(() => {
    if (!sceneRef.current || canvasSize.height === 0) return;

    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Events } = Matter;

    const engine = Engine.create({ gravity: { y: 0.4 } });
    engineRef.current = engine;
    const world = engine.world;
    
    const scale = 2;
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
    World.add(world, Bodies.rectangle(renderWidth / 2, renderHeight, renderWidth, 120, { isStatic: true, render: { fillStyle: '#2a2a2a' } }));
    // Left Wall
    World.add(world, Bodies.rectangle(0, renderHeight / 2, 120, renderHeight, { isStatic: true, render: { visible: false } }));

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

    const autoExtendCanvas = () => {
        const rightmostPoint = world.bodies.reduce((max, body) => {
            if (body.isStatic) return max;
            return Math.max(max, body.bounds.max.x);
        }, 0);
    
        if (rightmostPoint > render.bounds.max.x - 1000) {
            const newWidth = render.bounds.max.x + 2000;
            const newRenderWidth = newWidth;
    
            // Extend ground
            const ground = world.bodies.find(body => body.isStatic && body.position.y >= render.bounds.max.y - 60);
            if(ground) {
                Matter.Body.setPosition(ground, {x: newRenderWidth / 2, y: ground.position.y});
                Matter.Body.setVertices(ground, [
                    { x: 0, y: render.bounds.max.y - 60 },
                    { x: newRenderWidth, y: render.bounds.max.y - 60 },
                    { x: newRenderWidth, y: render.bounds.max.y + 60 },
                    { x: 0, y: render.bounds.max.y + 60 },
                ]);
            }
            
            render.bounds.max.x = newRenderWidth;
            
            setCanvasSize(prev => ({...prev, width: prev.width + 2000 / scale}));

            // Add more stars in the new area
            setStars(currentStars => {
              const newStars = [...currentStars];
              for (let i = 0; i < 100; i++) {
                  newStars.push({
                      x: (render.bounds.max.x - 2000) / scale + Math.random() * (2000 / scale),
                      y: Math.random() * (render.bounds.max.y / scale),
                      radius: Math.random() * 1.5
                  });
              }
              return newStars;
            });
        }
    };
    
    Events.on(engine, 'afterUpdate', autoExtendCanvas);

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      Events.off(engine, 'afterUpdate', autoExtendCanvas);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
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
