import React, { useRef, useState, useEffect } from 'react';

const THRESHOLD = 70;
const MAX_SWIPE = 100;

// action shape: { icon: <Comp/>, onTrigger: fn, className: 'style-danger' | 'style-neutral' } | null
export default function SwipeCard({ children, leftAction, rightAction, enabled = true, className = '' }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedAxisRef = useRef(null);
  const contentRef = useRef(null);
  // Guardamos handleMove en un ref para que el listener nativo siempre llame a la versión más reciente
  const handleMoveRef = useRef(() => {});

  const handleStart = (clientX, clientY) => {
    startXRef.current = clientX;
    startYRef.current = clientY;
    lockedAxisRef.current = null;
    setDragging(true);
  };

  const handleMove = (clientX, clientY) => {
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;

    if (lockedAxisRef.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (lockedAxisRef.current !== 'x') return;

    let next = dx;
    if (next > 0 && !rightAction) next = 0;
    if (next < 0 && !leftAction) next = 0;
    next = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, next));
    setDragX(next);
  };

  const handleEnd = () => {
    setDragging(false);
    if (dragX <= -THRESHOLD && leftAction) {
      leftAction.onTrigger();
    } else if (dragX >= THRESHOLD && rightAction) {
      rightAction.onTrigger();
    }
    setDragX(0);
    lockedAxisRef.current = null;
  };

  const onTouchStart = (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();

  // handleMove necesita e.preventDefault() para bloquear el scroll vertical mientras
  // se desliza horizontalmente. React marca los listeners de touch como "passive" por
  // defecto (para no trabar el scroll), así que ahí preventDefault() no funciona y tira
  // el warning "Unable to preventDefault inside passive event listener invocation".
  // Por eso enganchamos touchmove manualmente con { passive: false }.
  handleMoveRef.current = (e) => {
    if (lockedAxisRef.current === 'x') e.preventDefault();
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const listener = (e) => handleMoveRef.current(e);
    el.addEventListener('touchmove', listener, { passive: false });
    return () => el.removeEventListener('touchmove', listener);
    // Se reengancha si enabled o las acciones cambian, porque en ese caso el div con
    // ref puede dejar de existir/volver a existir (ver el early return más abajo).
  }, [enabled, !!leftAction, !!rightAction]);

  if (!enabled || (!leftAction && !rightAction)) {
    return <>{children}</>;
  }

  const leftWidth = Math.min(-dragX, MAX_SWIPE);   // dragX negativo -> revela leftAction (aparece a la derecha)
  const rightWidth = Math.min(dragX, MAX_SWIPE);   // dragX positivo -> revela rightAction (aparece a la izquierda)
  const leftReady = -dragX >= THRESHOLD;
  const rightReady = dragX >= THRESHOLD;

  return (
    <div className={`swipe-card-wrap ${className}`}>
      {leftAction && (
        <div
          className={`swipe-action pos-right ${leftAction.className || 'style-neutral'} ${leftReady ? 'ready' : ''}`}
          style={{
            width: `${Math.max(leftWidth, 0)}px`,
            opacity: leftWidth > 4 ? 1 : 0,
          }}
        >
          <span className="swipe-action-icon">{leftAction.icon}</span>
        </div>
      )}
      {rightAction && (
        <div
          className={`swipe-action pos-left ${rightAction.className || 'style-neutral'} ${rightReady ? 'ready' : ''}`}
          style={{
            width: `${Math.max(rightWidth, 0)}px`,
            opacity: rightWidth > 4 ? 1 : 0,
          }}
        >
          <span className="swipe-action-icon">{rightAction.icon}</span>
        </div>
      )}
      <div
        ref={contentRef}
        className="swipe-card-content"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform .25s cubic-bezier(.2,.9,.3,1)',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}