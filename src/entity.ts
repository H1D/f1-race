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
    velocity: { x: 0, y: 0, angular: 0 },
    motor: {
      voltage: 0,
      targetVoltage: 0,
      rampUp: 1.5,
      rampDown: 2.5,
      maxForce: 1, // unused now — thrust comes from boatPhysics.thrustForce
    },
    boatPhysics: {
      forwardDrag: 0.015,
      lateralDrag: 0.95,
      angularDamping: 0.4,
      thrustForce: 6.0,
      turnTorque: 3.5,
      turnSpeedReference: 3.0,
      maxSpeed: 10.0,
    },
    render: {
      width: 64,
      height: 32,
      color: "#e04040",
    },
    tags: new Set(["player"]),
  };
}
