
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Matter, { IEventCollision, type Body, Bounds, Vector } from 'matter-js';
import { getBlockById, type Team, type BlockId } from '@/lib/blocks';
import { useAuth, type SerializedCanvasState, type SerializedBody } from '@/context/auth-context';

export interface TetrisCanvasApi {
  addBlock: (blockId: BlockId, x: number, y: number, team: Team) => void;
  spawnBlockForTeam: (blockId: string, team: Team) => void;
  getViewportCoordinates: (x: number, y: number) => { x: number, y: number };
  resetView: () => void;
  getBodiesInRegion: (bounds: Matter.Bounds) => Matter.Body[];
  canvasElement: HTMLCanvasElement | null;
}

const BLOCK_WEIGHT = 40;
const SPAWN_Y_OFFSET = 29500;
type DragMode = 'none' | 'panning' | 'zooming';

interface CustomBody extends Body {
  initialOverlapWhitelist?: Set<number>;
}

const TetrisCanvas = forwardRef<TetrisCanvasApi>((_props, ref) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const mouseRef = useRef<Matter.Mouse>();
  const mouseConstraintRef = useRef<Matter.MouseConstraint>();

  const [canvasSize] = useState({ width: 100000, height: 30000 });

  const { team, zoom, setZoom, canvasState, saveState } = useAuth();

  const dragModeRef = useRef<DragMode>('none');
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const viewCenter = useRef(canvasState?.viewCenter || { x: canvasSize.width / 2, y: canvasSize.height - 1000 });
  const zoomStartRef = useRef({ y: 0, zoom: 1 });
  const lastTouchPosition = useRef({ x: 0, y: 0 });
  const pinchZoomStartRef = useRef<{ distance: number; zoom: number } | null>(null);

  const serializeBody = (body: Matter.Body): SerializedBody => {
    return {
      id: body.id,
      label: body.label,
      position: { x: body.position.x, y: body.position.y },
      angle: body.angle,
      vertices: body.vertices.map(v => ({ x: v.x, y: v.y })),
      velocity: { x: body.velocity.x, y: body.velocity.y },
      angularVelocity: body.angularVelocity,
      isStatic: body.isStatic,
      parts: body.parts.filter(p => p.id !== body.id).map(serializeBody),
      restitution: body.restitution,
      friction: body.friction,
      render: {
          fillStyle: body.render.fillStyle,
          strokeStyle: body.render.strokeStyle,
          lineWidth: body.render.lineWidth,
      },
      initialOverlapWhitelist: body.initialOverlapWhitelist ? Array.from(body.initialOverlapWhitelist) : undefined,
    };
  };

  const serializeState = () => {
    if (!engineRef.current) return null;
    const bodies = Matter.Composite.allBodies(engineRef.current.world)
      .filter(body => !body.isStatic) // Don't save the ground
      .map(serializeBody);
    
    return {
      bodies,
      zoom,
      viewCenter: viewCenter.current,
    };
  };

  const createBlockBody = (blockId: string, x: number, y: number, team: Team): Matter.Body | null => {
      const blockData = getBlockById(blockId, team);
      if (!blockData) return null;

      const scale = 2;
      const teamCategory = team === 'red' ? 0b0001 : 0b0010;

      const compoundBody = Matter.Body.create({
          mass: BLOCK_WEIGHT,
          collisionFilter: {
              category: teamCategory,
              mask: 0b1111,
          },
      });

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
      
      Matter.Body.setParts(compoundBody, parts);
      Matter.Body.setPosition(compoundBody, { x, y });
      compoundBody.label = `block-${team}-${blockId}`;
      
      return compoundBody;
  }

  const deserializeBody = (sBody: SerializedBody): Matter.Body => {
      const parts = sBody.parts.map(p => {
          const partBody = Matter.Bodies.fromVertices(p.position.x, p.position.y, [p.vertices], {
              render: p.render,
              isStatic: p.isStatic,
          }, true);
          Matter.Body.setAngle(partBody, p.angle);
          return partBody;
      });

      const body = Matter.Body.create({
          id: sBody.id,
          label: sBody.label,
          parts: [sBody, ...parts].length > 1 ? parts : [],
          position: sBody.position,
          angle: sBody.angle,
          velocity: sBody.velocity,
          angularVelocity: sBody.angularVelocity,
          isStatic: sBody.isStatic,
          restitution: sBody.restitution,
          friction: sBody.friction,
      });

      if(sBody.initialOverlapWhitelist) {
        (body as CustomBody).initialOverlapWhitelist = new Set(sBody.initialOverlapWhitelist);
      }

      // Re-apply render properties to parts
      if (body.parts.length > 1) {
        body.parts.forEach((part, i) => {
            // The first part is the body itself, skip it
            if (i > 0) {
                 part.render.fillStyle = sBody.render.fillStyle;
                 part.render.strokeStyle = sBody.render.strokeStyle;
                 part.render.lineWidth = sBody.render.lineWidth;
            }
        });
      } else {
        body.render.fillStyle = sBody.render.fillStyle;
        body.render.strokeStyle = sBody.render.strokeStyle;
        body.render.lineWidth = sBody.render.lineWidth;
      }
      
      return body;
  };


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

  const addBlock = (blockId: BlockId, x: number, y: number, team: Team) => {
    const engine = engineRef.current;
    if (!engine) return;
    const blockBody = createBlockBody(blockId, x, y, team);
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
      const canvasCenterX = canvasSize.width / 2;
      const spawnAreaWidth = canvasSize.width / 4;
      const xSpawn = team === 'blue' ? canvasCenterX - spawnAreaWidth : canvasCenterX + spawnAreaWidth;
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
    World.add(world, Bodies.rectangle(canvasSize.width / 2, canvasSize.height - 30, canvasSize.width, 60, { isStatic: true, render: { fillStyle: '#2a2a2a' }, collisionFilter: { category: 0b0100 } }));
    
    // Restore state
    if (canvasState) {
        viewCenter.current = canvasState.viewCenter;
        setZoom(canvasState.zoom);
        const bodies = canvasState.bodies.map(deserializeBody);
        World.add(world, bodies);
    }


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

    // Save state on unload
    const beforeUnload = () => {
        const state = serializeState();
        if(state) saveState(state as SerializedCanvasState);
    };
    window.addEventListener('beforeunload', beforeUnload);


    return () => {
      // Save state before cleanup
      beforeUnload();
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('resize', handleResize);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
      if (render.textures) render.textures = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.width, canvasSize.height]);

  useEffect(() => {
    updateCamera();
  }, [zoom]);

  useEffect(() => {
    const mc = mouseConstraintRef.current;
    const teamCategory = team === 'red' ? 0b0001 : 0b0010;
    const groundCategory = 0b0100;
    if (mc) {
      mc.collisionFilter.mask = teamCategory | groundCategory;
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
      const mc = mouseConstraintRef.current;
      if (!mc?.body) {
        dragModeRef.current = 'panning';
        const touch = e.touches[0];
        lastTouchPosition.current = { x: touch.clientX, y: touch.clientY };
      }
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
