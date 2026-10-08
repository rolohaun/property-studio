export function createTapTracker() {
  const pointers = new Map();
  let blocked = false;
  return {
    down(e) {
      if (!pointers.size) blocked = false;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1 || e.isPrimary === false) blocked = true;
    },
    move(e) {
      const start = pointers.get(e.pointerId);
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 7) blocked = true;
    },
    up(e) {
      this.move(e);
      const tap = pointers.has(e.pointerId) && pointers.size === 1 && !blocked;
      pointers.delete(e.pointerId);
      return tap;
    },
    cancel(e) { pointers.delete(e.pointerId); blocked = true; },
    reset() { pointers.clear(); blocked = false; },
  };
}

export function pointerFrame(pointers) {
  const [a, b] = [...pointers.values()];
  if (!a) return null;
  return b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, span: Math.hypot(a.x - b.x, a.y - b.y) }
    : { ...a, span: 0 };
}

export function planGesture(before, after, zoom, viewHeight, width, height) {
  const nextZoom = Math.max(.5, Math.min(4, zoom * (before.span > 0 && after.span > 0 ? after.span / before.span : 1)));
  const oldUnit = viewHeight / zoom / height, newUnit = viewHeight / nextZoom / height;
  return { zoom: nextZoom,
    x: (before.x - width / 2) * oldUnit - (after.x - width / 2) * newUnit,
    z: (before.y - height / 2) * oldUnit - (after.y - height / 2) * newUnit };
}
