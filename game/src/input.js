// Keyboard and mouse input for the cockpit.
// Keys are read as a held set every frame; Enter, P, C and R fire
// once per press through the callbacks the boot hands in. Dragging
// orbits the chase camera, the wheel zooms it, and both ease back
// to centre when the mouse lets go.

export function createInput(canvas, actions) {
  const keys = new Set();
  let orbitYaw = 0;
  let orbitPitch = 0;
  let zoom = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const GAME_KEYS = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight',
    'ControlLeft', 'ControlRight',
  ];

  function onKeyDown(e) {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Enter') actions.confirm();
    if (e.code === 'KeyP') actions.pause();
    if (e.code === 'KeyC') actions.toggleView();
    if (e.code === 'KeyR') actions.reset();
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onMouseMove(e) {
    if (!dragging) return;
    orbitYaw += (e.clientX - lastX) * 0.003;
    orbitPitch += (e.clientY - lastY) * 0.002;
    orbitYaw = Math.max(-0.7, Math.min(0.7, orbitYaw));
    orbitPitch = Math.max(-0.25, Math.min(0.4, orbitPitch));
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onMouseUp() {
    dragging = false;
  }

  function onWheel(e) {
    e.preventDefault();
    zoom = Math.max(0.7, Math.min(1.6, zoom - Math.sign(e.deltaY) * 0.12));
  }

  function onClick() {
    actions.confirm();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('click', onClick);

  return {
    /** The held controls, as the flight model reads them. */
    read() {
      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const down = keys.has('KeyS') || keys.has('ArrowDown');
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      return {
        pitch: (up ? 1 : 0) - (down ? 1 : 0),
        roll: (right ? 1 : 0) - (left ? 1 : 0),
        throttleUp: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        throttleDown: keys.has('ControlLeft') || keys.has('ControlRight'),
        flaps: keys.has('Space'),
      };
    },
    /** The camera orbit the mouse is holding, easing home. */
    orbit() {
      return { yaw: orbitYaw, pitch: orbitPitch, zoom };
    },
    /** Let the orbit drift back to centre over time. */
    relax(dt) {
      const k = Math.max(0, 1 - 1.6 * dt);
      orbitYaw *= k;
      orbitPitch *= k;
      zoom += (1 - zoom) * Math.min(1, 2 * dt);
    },
  };
}
