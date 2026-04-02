import type { Entity, PowerupDefinition } from "./types";
import { LAYER_PICKUP, LAYER_OBSTACLE, LAYER_ZONE } from "./types";

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
      width: 90,
      height: 45,
      color: "#e04040",
    },
    tags: new Set(["player"]),
  };
}

export function createPickupEntity(
  x: number,
  y: number,
  definition: PowerupDefinition,
): Entity {
  return {
    id: nextId++,
    transform: {
      pos: { x, y },
      prevPos: { x, y },
      angle: 0,
      prevAngle: 0,
    },
    velocity: { x: 0, y: 0, angular: 0 },
    tags: new Set(["pickup"]),
    powerupPickup: {
      powerupId: definition.id,
      radius: definition.spawn.radius,
      bobPhase: Math.random() * Math.PI * 2,
    },
    collider: {
      radius: definition.spawn.radius,
      layer: LAYER_PICKUP,
    },
    render: {
      width: definition.spawn.radius * 2,
      height: definition.spawn.radius * 2,
      color: definition.spawn.color,
    },
  };
}

export function createObstacleEntity(
  x: number,
  y: number,
  angle: number,
  config: {
    width: number;
    height: number;
    lifetime: number;
    color: string;
    radius: number;
  },
): Entity {
  return {
    id: nextId++,
    transform: {
      pos: { x, y },
      prevPos: { x, y },
      angle,
      prevAngle: angle,
    },
    velocity: { x: 0, y: 0, angular: 0 },
    tags: new Set(["obstacle"]),
    collider: {
      radius: config.radius,
      layer: LAYER_OBSTACLE,
    },
    lifetime: {
      remaining: config.lifetime,
      fadeStart: 2.0,
    },
    render: {
      width: config.width,
      height: config.height,
      color: config.color,
    },
  };
}

export function createBridgeBarrierEntity(
  midX: number,
  midY: number,
  angle: number,
  span: number,
): Entity {
  return createObstacleEntity(midX, midY, angle, {
    width: span + 40,
    height: 16,
    lifetime: 5.0,
    color: "#5a4030",
    radius: (span + 40) / 2,
  });
}

export function createZoneEntity(
  x: number,
  y: number,
  radius: number,
  effectId: string,
  ownerId: number,
  lifetime: number,
  affectsOwner: boolean,
  color?: string,
): Entity {
  return {
    id: nextId++,
    transform: {
      pos: { x, y },
      prevPos: { x, y },
      angle: 0,
      prevAngle: 0,
    },
    velocity: { x: 0, y: 0, angular: 0 },
    tags: new Set(["zone"]),
    zone: {
      radius,
      effectId,
      ownerId,
      affectsOwner,
      color,
    },
    collider: {
      radius,
      layer: LAYER_ZONE,
    },
    lifetime: {
      remaining: lifetime,
      fadeStart: 2.0,
    },
  };
}
