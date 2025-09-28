
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter, { type Body, Composite } from 'matter-js';
import { getBlockById, type Team, type BlockId } from '@/lib/blocks';
import { db } from '@/lib/firebase';
import { passTurn } from '@/services/game-state-service';
import { saveCanvasState } from '@/services/canvas-service';
import { type User } from '@/context/auth-context';

export interface SerializedBody {
  id: number;
  label: string;
  position: { x: number; y: number };
  angle: number;
  velocity: { x: number; y: number };
  angularVelocity: number;
}

export interface SerializedCanvasState {
  bodies: SerializedBody[];
}

export interface TetrisCanvasApi {
  addBlock: (blockId: string, x: number, y: number, team: Team) => void;
  spawnBlockForTeam: (blockId: string, team: Team) => void;
  getViewportCoordinates: (x: number, y: number) => { x: number, y: number };
  resetView: () => void;
  loadCanvasState: (state: SerializedCanvasState) => void;
  serializeCanvas: () => SerializedCanvasState | null;
  saveAndEndTurn: () => void;
  canvasElement: HTMLCanvasElement | null;
}

const CANVAS_SIZE = { width: 100000, height: 30000 };
const SPAWN_Y_OFFSET = 29500;
type DragMode = 'none' | 'panning' | 'zooming';

interface TetrisCanvasProps {
  user: User | null;
  team: Team;
  onInteractionEnd: () => void;
}

const TetrisCanvas = forwardRef<TetrisCanvasApi, TetrisCanvasProps>(({ user, team, onInteractionEnd }, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const mouseConstraintRef = useRef<Matter.MouseConstraint>();

  const [zoom, setZoom] = useState(0.5);
  const dragModeRef = useRef<DragMode>('none');
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const viewCenter = useRef({ x: CANVAS_SIZE.width / 2, y: CANVAS_SIZE.height - 1000 });
  const zoomStartRef = useRef({ y: 0, zoom: 1 });
  const lastTouchPosition = useRef({ x: 0, y: 0 });
  const pinchZoomStartRef = useRef<{ distance: number; zoom: number } | null>(null);

  const createBlockBody = (blockId: string, x: number, y: number, team: Team, id?: number): Body | null => {
      const blockData = getBlockById(blockId, team);
      if (!blockData) return null;

      const scale = 2;
      const parts = blockData.parts.map(part => {
          const vertices = part.map(p => ({ x: p.x * scale, y: p.y * scale }));
          return Matter.Bodies.fromVertices(0, 0, [vertices], {
               render: { fillStyle: blockData.color }
          });
      });
      
      const compoundBody = Matter.Body.create({
          parts: parts,
      });

      Matter.Body.setParts(compoundBody, parts);
      compoundBody.parts.forEach(part => {
          part.render.fillStyle = blockData.color;
      });

      Matter.Body.setPosition(compoundBody, { x, y });
      compoundBody.label = `block-${team}-${blockId}`;
      if (id) {
        compoundBody.id = id;
      }
      
      return compoundBody;
  }

  const serializeCanvas = (): SerializedCanvasState | null => {
    if (!engineRef.current) return null;
    const bodies = Composite.allBodies(engineRef.current.world)
        .filter(body => !body.isStatic)
        .map(body => ({
            id: body.id,
            label: body.label,
            position: body.position,
            angle: body.angle,
            velocity: body.velocity,
            angularVelocity: body.angularVelocity,
        }));
    return { bodies };
  };

  const loadCanvasState = (state: SerializedCanvasState) => {
    const world = engineRef.current?.world;
    if (!world) return;
    
    // Clear existing dynamic bodies
    Composite.allBodies(world).forEach(body => {
      if (!body.isStatic) {
        Composite.remove(world, body);
      }
    });

    // Add new bodies from state
    state.bodies.forEach(sBody => {
      const [_, bodyTeam, blockId] = sBody.label.split('-');
      const newBody = createBlockBody(blockId, sBody.position.x, sBody.position.y, (bodyTeam as Team) || team, sBody.id);
      if (newBody) {
          Matter.Body.setAngle(newBody, sBody.angle);
          Matter.Body.setVelocity(newBody, sBody.velocity);
          Matter.Body.setAngularVelocity(newBody, sBody.angularVelocity);
          Composite.add(world, newBody);
      }
    });
  }

  useImperativeHandle(ref, () => ({
    addBlock: (blockId, x, y, team) => {
      const engine = engineRef.current;
      if (!engine) return;
      const blockBody = createBlockBody(blockId as BlockId, x, y, team);
      if(blockBody) {
        Matter.World.add(engine.world, [blockBody]);
      }
    },
    spawnBlockForTeam: (blockId, team) => {
        const xSpawn = team === 'blue'
            ? CANVAS_SIZE.width * 0.1
            : CANVAS_SIZE.width * 0.9;
        const blockBody = createBlockBody(blockId as BlockId, xSpawn, SPAWN_Y_OFFSET, team);
        if (blockBody && engineRef.current) {
            Matter.World.add(engineRef.current.world, [blockBody]);
        }
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
      const viewportWidth = render.options.width / zoom;
      const viewportHeight = render.options.height / zoom;
      viewCenter.current = { x: viewportWidth / 2, y: viewportHeight / 2 };
      updateCamera();
    },
    loadCanvasState,
    serializeCanvas,
    saveAndEndTurn: async () => {
      const state = serializeCanvas();
      if (state && user) {
        await saveCanvasState(state);
        await passTurn(user.uid);
      }
    },
    canvasElement: renderRef.current?.canvas ?? null,
  }));

  const updateCamera = () => {
    const render = renderRef.current;
    if (!render) return;

    const lookAt = viewCenter.current;
    const bounds = {
      min: { x: lookAt.x - (render.options.width! / 2) / zoom, y: lookAt.y - (render.options.height! / 2) / zoom },
      max: { x: lookAt.x + (render.options.width! / 2) / zoom, y: lookAt.y + (render.options.height! / 2) / zoom }
    };
    Matter.Render.lookAt(render, bounds);

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

  useEffect(() => {
    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint } = Matter;
    const engine = Engine.create({ gravity: { y: 0.4 } });
    engineRef.current = engine;
    const world = engine.world;
    const parentElement = sceneRef.current!.parentElement!;
    
    const render = Render.create({
      element: sceneRef.current!,
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

    World.add(world, Bodies.rectangle(CANVAS_SIZE.width / 2, CANVAS_SIZE.height - 30, CANVAS_SIZE.width, 60, { isStatic: true, render: { fillStyle: '#2a2a2a' }}));

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    mouseConstraintRef.current = mouseConstraint;
    World.add(world, mouseConstraint);
    
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
    updateCamera();

    const handleResize = () => {
      if (renderRef.current && sceneRef.current?.parentElement) {
        renderRef.current.canvas.width = sceneRef.current.parentElement.clientWidth;
        renderRef.current.canvas.height = sceneRef.current.parentElement.clientHeight;
        updateCamera();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Events.off(mouseConstraint, 'mouseup', onInteractionEnd);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
    };
  }, []);

  useEffect(() => {
    const starsCanvas = starsCanvasRef.current;
    if (!starsCanvas) return;
    starsCanvas.width = CANVAS_SIZE.width;
    starsCanvas.height = CANVAS_SIZE.height;
    const ctx = starsCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * CANVAS_SIZE.width;
      const y = Math.random() * CANVAS_SIZE.height;
      const radius = Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    updateCamera();
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return;
    const mc = mouseConstraintRef.current;
    // Allow panning only if not dragging a block
    if (e.ctrlKey) {
        dragModeRef.current = 'zooming';
        zoomStartRef.current = { y: e.clientY, zoom };
    } else if (!mc || !mc.body) {
        dragModeRef.current = 'panning';
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }
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
      setZoom(prevZoom => Math.max(0.02, Math.min(2, prevZoom * zoomFactor)));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (dragModeRef.current === 'none' && mouseConstraintRef.current?.body) {
        onInteractionEnd();
    }
    dragModeRef.current = 'none';
  };

  const getCursor = () => {
    if (dragModeRef.current === 'panning') return 'grabbing';
    if (dragModeRef.current === 'zooming') return 'ns-resize';
    const mc = mouseConstraintRef.current;
    if (mc && mc.body) return 'grabbing';
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
      onMouseLeave={() => dragModeRef.current = 'none'}
      onContextMenu={(e) => e.preventDefault()}
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

    