
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter from 'matter-js';
import { getBlockById, type Team, type TetrisBlock } from '@/lib/blocks';

export interface TetrisCanvasApi {
  addBlock: (blockId: string, x: number, y: number, team: Team) => void;
  spawnBlockForTeam: (blockId: string, team: Team) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
}

const BLOCK_SIZE = 40;
const MAX_DRAG_WEIGHT = 60;
const BLOCK_WEIGHT = 40;
const SPAWN_Y_OFFSET = 2500; // Spawn blocks lower in the canvas

const TetrisCanvas = forwardRef<TetrisCanvasApi>((_props, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const mouseRef = useRef<Matter.Mouse>();
  const mouseConstraintRef = useRef<Matter.MouseConstraint>();
  const [canvasSize, setCanvasSize] = useState({ width: 3000, height: 3000 });
  const [stars, setStars] = useState<{x: number, y: number, radius: number}[]>([]);
  const zoomRef = useRef(0.5);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const draggedBodyInfoRef = useRef<{ body: Matter.Body | null, initialCollisions: Set<Matter.Body> }>({ body: null, initialCollisions: new Set() });

  useEffect(() => {
    const newStars = [];
    for (let i = 0; i < 400; i++) {
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
    
    const bounds = compoundBody.bounds;
    const width = bounds.max.x - bounds.min.x;
    const height = bounds.max.y - bounds.min.y;
    
    const sensor = Matter.Bodies.rectangle(
        compoundBody.position.x,
        compoundBody.position.y,
        width * 2,
        height * 2,
        {
            isSensor: true,
            isStatic: false, 
            render: {
                visible: false,
            },
        }
    );

    (compoundBody as any).sensor = sensor;
    (sensor as any).parentBody = compoundBody;

    compoundBody.label = `block-${team}-${blockId}`;
    sensor.label = `sensor-for-block-${blockId}-${Date.now()}`;

    Matter.World.add(engine.world, [compoundBody, sensor]);
    bodiesRef.current.push(compoundBody);
  };

  useImperativeHandle(ref, () => ({
    addBlock: addBlock,
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
    setZoom: (zoom) => {
        zoomRef.current = zoom;
        const mouse = mouseRef.current;
        if (!mouse) return;
        Matter.Mouse.setScale(mouse, { x: 1 / zoom, y: 1 / zoom });
    },
    getZoom: () => zoomRef.current,
  }));

  useEffect(() => {
    if (!sceneRef.current) return;

    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Events, Query } = Matter;

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
    
    // A single ground for the entire canvas
    World.add(world, Bodies.rectangle(canvasSize.width / 2, canvasSize.height - 30, canvasSize.width, 60, { isStatic: true, render: { fillStyle: '#2a2a2a' } }));

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
    mouseConstraintRef.current = mouseConstraint;

    Events.on(mouseConstraint, 'startdrag', (event: any) => {
        const draggedBody = event.body;
        draggedBodyInfoRef.current.body = draggedBody;

        const allSensors = bodiesRef.current
          .map(b => (b as any).sensor)
          .filter(s => s && s !== (draggedBody as any).sensor);

        const initialCollisions = new Set<Matter.Body>();
        if (allSensors.length > 0) {
            const collisions = Query.collides(draggedBody, allSensors);
            collisions.forEach(collision => {
                const sensor = collision.bodyA === draggedBody ? collision.bodyB : collision.bodyA;
                initialCollisions.add(sensor);
            });
        }
        draggedBodyInfoRef.current.initialCollisions = initialCollisions;
    });

    Events.on(mouseConstraint, 'enddrag', () => {
        draggedBodyInfoRef.current = { body: null, initialCollisions: new Set() };
    });

    Events.on(engine, 'beforeUpdate', () => {
        bodiesRef.current.forEach(body => {
            const sensor = (body as any).sensor;
            if (sensor) {
                Matter.Body.setPosition(sensor, body.position);
                Matter.Body.setAngle(sensor, body.angle);
            }
        });
        
        const { body: draggedBody, initialCollisions } = draggedBodyInfoRef.current;
        if (!draggedBody || !(mouseConstraint as any).body) return;

        const allSensors = bodiesRef.current
            .map(b => (b as any).sensor)
            .filter(s => s && s !== (draggedBody as any).sensor);
        
        if (allSensors.length > 0) {
            const collisions = Query.collides(draggedBody, allSensors);

            for (const collision of collisions) {
                const sensor = collision.bodyA === draggedBody ? collision.bodyB : collision.bodyA;
                if (!initialCollisions.has(sensor)) {
                    mouseConstraint.constraint.bodyB = null;
                    (mouseConstraint as any).body = null;
                    draggedBodyInfoRef.current = { body: null, initialCollisions: new Set() };
                    break; 
                }
            }
        }
    });

    World.add(world, mouseConstraint);
    render.mouse = mouse;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
    
    Matter.Mouse.setScale(mouse, { x: 1 / zoomRef.current, y: 1 / zoomRef.current });

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if(render.canvas) render.canvas.remove();
      if(render.textures) render.textures = {};
      bodiesRef.current = [];
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
