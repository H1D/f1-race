import type { Entity } from "./types";

let nextId = 0;

export function createBoatEntity(x: number, y: number, angle = 0): Entity {
  return {
    id: nextId++,
    transform: {
      pos: { x, y },
      prevPos: { x, y },
      angle,
      prevAngle: angle,
    },
    velocity: { forward: 0, lateral: 0, angular: 0 },
    motor: {
      voltage: 0,
      targetVoltage: 0,
      rampUp: 1.5, // full throttle in ~0.67s
      rampDown: 2.5, // engine dies faster than it spins up
      maxForce: 300,
    },
    boatPhysics: {
      dragForward: 0.02, // boat glides forward
      dragLateral: 0.8, // heavy sideways resistance
      angularDamping: 0.7, // smooths rotation
      steerForce: 3.5, // turning torque
    },
    render: {
      width: 40,
      height: 18,
      color: "#e04040",
    },
    tags: new Set(["player"]),
  };
}
