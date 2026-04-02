import { createBoat, updateBoat, drawBoat, Boat, BoatInput } from "./boat/boat";
import { createDebugMenu } from "./debug";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let boat: Boat;
let lastTime = 0;

// Keyboard state
const keys: Record<string, boolean> = {};

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

function getInput(): BoatInput {
  let throttle = 0;
  let steer = 0;

  if (keys["ArrowUp"]) throttle += 1;
  if (keys["ArrowDown"]) throttle -= 1;
  if (keys["ArrowRight"]) steer += 1;
  if (keys["ArrowLeft"]) steer -= 1;

  return { throttle, steer };
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function init() {
  resize();
  boat = createBoat(canvas.width, canvas.height);
  lastTime = performance.now();
}

function draw(currentTime: number) {
  const dt = currentTime - lastTime;
  lastTime = currentTime;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const input = getInput();
  updateBoat(boat, dt, input);
  drawBoat(ctx, boat);

  requestAnimationFrame(draw);
}

window.addEventListener("resize", resize);
init();
createDebugMenu();
requestAnimationFrame(draw);
