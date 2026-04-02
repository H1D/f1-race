const boatImage = new Image();
boatImage.src = new URL("./boat.png", import.meta.url).href;

export const boatParams = {
  forwardDrag: 0.015,
  lateralDrag: 0.95,
  angularDamping: 0.4,
  thrustForce: 6.0,
  turnTorque: 3.5,
  turnSpeedReference: 3.0,
  maxSpeed: 10.0,
};

export interface Boat {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  angularVelocity: number;
}

export interface BoatInput {
  throttle: number; // -1 to 1
  steer: number;    // -1 to 1
}

export function createBoat(canvasWidth: number, canvasHeight: number): Boat {
  return {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    width: 64,
    height: 32,
    velocityX: 0,
    velocityY: 0,
    angle: 0,
    angularVelocity: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dot(ax: number, ay: number, bx: number, by: number): number {
  return ax * bx + ay * by;
}

export function updateBoat(boat: Boat, dt: number, input: BoatInput): void {
  // Convert dt from ms to seconds
  const dtSec = dt / 1000;

  // Forward and right vectors based on boat angle
  const forwardX = Math.cos(boat.angle);
  const forwardY = Math.sin(boat.angle);
  const rightX = -Math.sin(boat.angle);
  const rightY = Math.cos(boat.angle);

  // Decompose velocity into local space
  let forwardSpeed = dot(boat.velocityX, boat.velocityY, forwardX, forwardY);
  let lateralSpeed = dot(boat.velocityX, boat.velocityY, rightX, rightY);

  // Apply anisotropic drag
  forwardSpeed -= forwardSpeed * boatParams.forwardDrag * dtSec * 60;
  lateralSpeed -= lateralSpeed * boatParams.lateralDrag * dtSec * 60;

  // Apply thrust (reverse is weaker)
  if (input.throttle >= 0) {
    forwardSpeed += input.throttle * boatParams.thrustForce * dtSec;
  } else {
    forwardSpeed += input.throttle * boatParams.thrustForce * 0.4 * dtSec;
  }

  // Steering depends on motion
  const speedFactor = clamp(Math.abs(forwardSpeed) / boatParams.turnSpeedReference, 0, 1);
  boat.angularVelocity += input.steer * boatParams.turnTorque * speedFactor * dtSec;

  // Angular damping
  boat.angularVelocity -= boat.angularVelocity * boatParams.angularDamping * dtSec * 60;

  // Convert back to world space
  boat.velocityX = forwardX * forwardSpeed + rightX * lateralSpeed;
  boat.velocityY = forwardY * forwardSpeed + rightY * lateralSpeed;

  // Apply max speed cap
  const speed = Math.sqrt(boat.velocityX ** 2 + boat.velocityY ** 2);
  if (speed > boatParams.maxSpeed) {
    boat.velocityX *= boatParams.maxSpeed / speed;
    boat.velocityY *= boatParams.maxSpeed / speed;
  }

  // Integrate position and rotation
  boat.x += boat.velocityX * dtSec * 60;
  boat.y += boat.velocityY * dtSec * 60;
  boat.angle += boat.angularVelocity * dtSec * 60;
}

export function drawBoat(ctx: CanvasRenderingContext2D, boat: Boat): void {
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.angle);
  ctx.drawImage(
    boatImage,
    -boat.width / 2,
    -boat.height / 2,
    boat.width,
    boat.height
  );
  ctx.restore();
}
