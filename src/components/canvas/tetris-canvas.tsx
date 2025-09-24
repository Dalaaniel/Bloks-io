
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter, { IEventCollision, type Body, Bounds, Vector, Composite } from 'matter-js';
import { getBlockById, type Team, type BlockId } from '@/lib/blocks';
import { loadCanvasState, saveCanvasState } from '@/services/canvas-service';

export interface TetrisCanvasApi {
  addBlock: (blockId: string, x: number, y: number, team: Team) => void;
  spawnBlockForTeam: (blockId: string, team: Team) => void;
  getViewportCoordinates: (x: number, y: number) => { x: number, y: number };
  resetView: () => void;
  getBodiesInRegion: (bounds: Matter.Bounds) => Matter.Body[];
  canvasElement: HTMLCanvasElement | null;
}

const BLOCK_WEIGHT = 40;
const SPAWN_Y_OFFSET = 29500;
const CANVAS_SIZE = { width: 100000, height: 30000 };

const blueZoneEnd = CANVAS_SIZE.width * 0.2;
const noManLandEnd = CANVAS_SIZE.width * 0.8;

type Zone = 'blue' | 'no-man-land' | 'red';
export const getTeamZone = (x: number): Zone => {
  if (x < blueZoneEnd) return 'blue';
  if (x < noManLandEnd) return 'no-man-land';
  return 'red';
};


type DragMode = 'none' | 'panning' | 'zooming';

interface CustomBody extends Body {
  initialOverlapWhitelist?: Set<number>;
}

export interface SerializedBody {
  id: number;
  label: string;
  position: { x: number; y: number };
  angle: number;
  vertices: { x: number, y: number }[];
  velocity: { x: number; y: number };
  angularVelocity: number;
  isStatic: boolean;
  parts: SerializedBody[];
  restitution: number;
  friction: number;
  render: {
    fillStyle?: string;
    strokeStyle?: string;
    lineWidth?: number;
  };
   initialOverlapWhitelist?: number[];
}

export interface SerializedCanvasState {
  bodies: SerializedBody[];
}


interface TetrisCanvasProps {
  team: Team;
}

const TetrisCanvas = forwardRef<TetrisCanvasApi, TetrisCanvasProps>(({ team }, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const mouseRef = useRef<Matter.Mouse>();
  const mouseConstraintRef = useRef<Matter.MouseConstraint>();

  const [zoom, setZoom] = useState(0.5);

  const dragModeRef = useRef<DragMode>('none');
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const viewCenter = useRef({ x: CANVAS_SIZE.width / 2, y: CANVAS_SIZE.height - 1000 });
  const zoomStartRef = useRef({ y: 0, zoom: 1 });
  const lastTouchPosition = useRef({ x: 0, y: 0 });
  const pinchZoomStartRef = useRef<{ distance: number; zoom: number } | null>(null);

  const createBlockBody = (blockId: string, x: number, y: number, team: Team): CustomBody | null => {
      const blockData = getBlockById(blockId, team);
      if (!blockData) return null;

      const scale = 2;
      const teamCategory = team === 'red' ? 0b0001 : 0b0010;

      const parts = blockData.parts.map(part => {
          const vertices = part.map(p => ({ x: p.x * scale, y: p.y * scale }));
          return Matter.Bodies.fromVertices(0, 0, [vertices], {
               render: {
                  fillStyle: blockData.color,
                  strokeStyle: 'rgba(0,0,0,0.2)',
                  lineWidth: 2,
              }
          });
      });
      
      const compoundBody = Matter.Body.create({
          mass: BLOCK_WEIGHT,
          collisionFilter: {
              category: teamCategory,
              mask: 0b1111,
          },
          parts: parts,
      });

      Matter.Body.setParts(compoundBody, parts);
      compoundBody.parts.forEach(part => {
          part.render.fillStyle = blockData.color;
          part.render.strokeStyle = 'rgba(0,0,0,0.2)';
          part.render.lineWidth = 2;
      });


      Matter.Body.setPosition(compoundBody, { x, y });
      compoundBody.label = `block-${team}-${blockId}`;
      
      return compoundBody as CustomBody;
  }

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

  const addBlock = (blockId: string, x: number, y: number, team: Team) => {
    const engine = engineRef.current;
    if (!engine) return;
    const blockBody = createBlockBody(blockId as BlockId, x, y, team);
    if(blockBody) {
      Matter.World.add(engine.world, [blockBody]);
    }
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
      let xSpawn;
      if (team === 'blue') {
        xSpawn = blueZoneEnd * 0.5; // Spawn in middle of blue zone
      } else { // red team
        xSpawn = noManLandEnd + (CANVAS_SIZE.width - noManLandEnd) * 0.5; // Spawn in middle of red zone
      }
      addBlock(blockId as BlockId, xSpawn, SPAWN_Y_OFFSET, team);
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
    getBodiesInRegion: (bounds) => {
      const engine = engineRef.current;
      if (!engine) return [];
      const allBodies = Matter.Composite.allBodies(engine.world);
      return Matter.Query.region(allBodies, bounds);
    },
    canvasElement: renderRef.current?.canvas ?? null,
  }));

  const deserializeBody = (sBody: SerializedBody, team: Team): Body => {
    const [_, bodyTeam, blockId] = sBody.label.split('-');
    const block = getBlockById(blockId, (bodyTeam as Team) || team);

    const newBody = createBlockBody(blockId as BlockId, sBody.position.x, sBody.position.y, (bodyTeam as Team) || team);
    if (!newBody) {
      // Fallback for safety, though it should not happen if data is clean
      return Matter.Bodies.rectangle(sBody.position.x, sBody.position.y, 80, 80);
    }
    
    Matter.Body.setAngle(newBody, sBody.angle);
    Matter.Body.setVelocity(newBody, sBody.velocity);
    Matter.Body.setAngularVelocity(newBody, sBody.angularVelocity);
    
    return newBody;
};

  useEffect(() => {
    if (!sceneRef.current) return;
    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Events, Composite } = Matter;
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
    World.add(world, Bodies.rectangle(CANVAS_SIZE.width / 2, CANVAS_SIZE.height - 30, CANVAS_SIZE.width, 60, { isStatic: true, render: { fillStyle: '#2a2a2a' }, collisionFilter: { category: 0b0100 } }));

    // Visualize zones
    World.add(world, [
        Bodies.rectangle(blueZoneEnd / 2, CANVAS_SIZE.height / 2, blueZoneEnd, CANVAS_SIZE.height, { isStatic: true, isSensor: true, render: { fillStyle: 'rgba(0, 0, 255, 0.05)' } }),
        Bodies.rectangle(blueZoneEnd + (noManLandEnd - blueZoneEnd) / 2, CANVAS_SIZE.height / 2, noManLandEnd - blueZoneEnd, CANVAS_SIZE.height, { isStatic: true, isSensor: true, render: { fillStyle: 'rgba(128, 128, 128, 0.05)' } }),
        Bodies.rectangle(noManLandEnd + (CANVAS_SIZE.width - noManLandEnd) / 2, CANVAS_SIZE.height / 2, CANVAS_SIZE.width - noManLandEnd, CANVAS_SIZE.height, { isStatic: true, isSensor: true, render: { fillStyle: 'rgba(255, 0, 0, 0.05)' } })
    ]);


    // Load canvas state from server
    loadCanvasState().then(state => {
        if (state && engineRef.current) {
            const bodies = state.bodies.map(sBody => deserializeBody(sBody, team));
            World.add(engineRef.current.world, bodies);
        }
    });
    
    // Save state periodically
    const saveInterval = setInterval(() => {
      if (engineRef.current) {
          const bodies = Composite.allBodies(engineRef.current.world)
              .filter(body => !body.isStatic && body.label.startsWith('block-'))
              .map(body => ({
                  id: body.id,
                  label: body.label,
                  position: body.position,
                  angle: body.angle,
                  vertices: body.vertices.map(v => ({ x: v.x, y: v.y })),
                  velocity: body.velocity,
                  angularVelocity: body.angularVelocity,
                  isStatic: body.isStatic,
                  parts: [], // Simplified for this example
                  restitution: body.restitution,
                  friction: body.friction,
                  render: {
                      fillStyle: body.render.fillStyle,
                      strokeStyle: body.render.strokeStyle,
                      lineWidth: body.render.lineWidth,
                  }
              }));

          saveCanvasState({ bodies });
      }
    }, 5000); // Save every 5 seconds


    const mouse = Mouse.create(render.canvas);
    mouseRef.current = mouse;
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    mouseConstraintRef.current = mouseConstraint;
    World.add(world, mouseConstraint);
    render.mouse = mouse;
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
    updateCamera();

    Events.on(mouseConstraint, 'mousedown', () => {
      const mc = mouseConstraintRef.current;
      if (!mc || !mc.body) return;
      const draggedBody: CustomBody = mc.body;
      const bodyTeam = draggedBody.label.split('-')[1] as Team;
      
      // Prevent picking up other team's blocks
      if (bodyTeam !== team) {
         if (mc.constraint) mc.constraint.bodyB = null;
         return;
      }

      if (draggedBody.initialOverlapWhitelist === undefined) {
        draggedBody.initialOverlapWhitelist = new Set<number>();
        const allOtherBodies = Composite.allBodies(engine.world).filter(
          (body: Body) => body.id !== draggedBody.id && !body.isStatic
        );
        allOtherBodies.forEach(otherBody => {
          const bodyWidth = otherBody.bounds.max.x - otherBody.bounds.min.x;
          const bodyHeight = otherBody.bounds.max.y - otherBody.bounds.min.y;
          const fictiveBounds = {
            min: { x: otherBody.position.x - bodyWidth, y: otherBody.position.y - bodyHeight },
            max: { x: otherBody.position.x + bodyWidth, y: otherBody.position.y + bodyHeight }
          };
          if (Bounds.overlaps(draggedBody.bounds, fictiveBounds)) {
            draggedBody.initialOverlapWhitelist!.add(otherBody.id);
          }
        });
      }
    });

    Events.on(engine, 'beforeUpdate', () => {
      const mc = mouseConstraintRef.current;
      if (!mc || !mc.body) return;
      const draggedBody: CustomBody = mc.body;
      
      const bodyTeam = draggedBody.label.split('-')[1] as Team;
      if (bodyTeam !== team) { // Should be redundant due to mousedown check, but good for safety
          if (mc.constraint) mc.constraint.bodyB = null;
          return;
      }
      
      const targetZone = getTeamZone(draggedBody.position.x);

      if ((targetZone === 'red' && team !== 'red') || (targetZone === 'blue' && team !== 'blue')) {
          if (mc.constraint) mc.constraint.bodyB = null; // Release the block
          return;
      }


      if (draggedBody.initialOverlapWhitelist === undefined) return;

      const allOtherBodies = Composite.allBodies(engine.world).filter(
        (body: Body) => body.id !== draggedBody.id && !body.isStatic
      );

      for (const otherBody of allOtherBodies) {
        if (draggedBody.initialOverlapWhitelist.has(otherBody.id)) continue;
        const bodyWidth = otherBody.bounds.max.x - otherBody.bounds.min.x;
        const bodyHeight = otherBody.bounds.max.y - otherBody.bounds.min.y;
        const fictiveBounds = {
          min: { x: otherBody.position.x - bodyWidth, y: otherBody.position.y - bodyHeight },
          max: { x: otherBody.position.x + bodyWidth, y: otherBody.position.y + bodyHeight }
        };
        if (Bounds.overlaps(draggedBody.bounds, fictiveBounds)) {
          if (mc.constraint) {
            mc.constraint.bodyB = null;
          }
          break;
        }
      }
    });

    const handleResize = () => {
      if (renderRef.current && sceneRef.current?.parentElement) {
        renderRef.current.canvas.width = sceneRef.current.parentElement.clientWidth;
        renderRef.current.canvas.height = sceneRef.current.parentElement.clientHeight;
        renderRef.current.options.width = sceneRef.current.parentElement.clientWidth;
        renderRef.current.options.height = sceneRef.current.parentElement.clientHeight;
        updateCamera();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('resize', handleResize);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
      if (render.textures) render.textures = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateCamera();
  }, [zoom]);

  useEffect(() => {
    const mc = mouseConstraintRef.current;
    if (mc) {
        mc.collisionFilter.mask = 0b1111; // Allow dragging all blocks
    }
  }, [team]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return;
    if (e.ctrlKey) {
      dragModeRef.current = 'zooming';
      zoomStartRef.current = { y: e.clientY, zoom };
      return;
    }
    setTimeout(() => {
      const mc = mouseConstraintRef.current;
      if (mc && mc.body) {
        dragModeRef.current = 'none';
        return;
      }
      dragModeRef.current = 'panning';
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }, 0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTimeout(() => {
        const mc = mouseConstraintRef.current;
        if (mc && mc.body) {
          dragModeRef.current = 'none';
          return;
        }
        dragModeRef.current = 'panning';
        const touch = e.touches[0];
        lastTouchPosition.current = { x: touch.clientX, y: touch.clientY };
      }, 0);
    } else if (e.touches.length === 2) {
      dragModeRef.current = 'zooming';
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      pinchZoomStartRef.current = { distance, zoom };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (dragModeRef.current === 'panning') {
      const mc = mouseConstraintRef.current;
      if (mc && mc.body) {
        dragModeRef.current = 'none';
        return;
      }
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

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const mc = mouseConstraintRef.current;
    if (dragModeRef.current === 'panning' && e.touches.length === 1 && !mc?.body) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchPosition.current.x;
      const dy = touch.clientY - lastTouchPosition.current.y;
      viewCenter.current.x -= dx / zoom;
      viewCenter.current.y -= dy / zoom;
      lastTouchPosition.current = { x: touch.clientX, y: touch.clientY };
      updateCamera();
    } else if (dragModeRef.current === 'zooming' && e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      if (pinchZoomStartRef.current) {
        const { distance: startDistance, zoom: startZoom } = pinchZoomStartRef.current;
        const zoomFactor = newDistance / startDistance;
        const newZoom = Math.max(0.02, Math.min(2, startZoom * zoomFactor));
        setZoom(newZoom);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    dragModeRef.current = 'none';
  };

  const handleMouseLeave = () => {
    dragModeRef.current = 'none';
  };

  const handleTouchEnd = () => {
    if ((dragModeRef.current === 'panning' || dragModeRef.current === 'zooming')) {
      dragModeRef.current = 'none';
      pinchZoomStartRef.current = null;
    }
  };

  const getCursor = () => {
    if (dragModeRef.current === 'panning') return 'grabbing';
    if (dragModeRef.current === 'zooming') return 'ns-resize';
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={(e) => { e.preventDefault(); }}
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

    