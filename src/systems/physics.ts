import type { Entity, InputState } from "../types";

export function updatePhysics(entity: Entity, input: InputState, dt: number): void {
  const motor = entity.motor;
  const phys = entity.boatPhysics;
  if (!motor || !phys) return;

  const vel = entity.velocity;
  const tf = entity.transform;

  // Store previous state for interpolation
  tf.prevPos.x = tf.pos.x;
  tf.prevPos.y = tf.pos.y;
  tf.prevAngle = tf.angle;

  // 1. Motor voltage ramp (first-order response)
  motor.targetVoltage = input.throttle ? 1 : 0;
  const rampRate = motor.targetVoltage > motor.voltage ? motor.rampUp : motor.rampDown;
  const voltageDiff = motor.targetVoltage - motor.voltage;
  motor.voltage += Math.sign(voltageDiff) * Math.min(rampRate * dt, Math.abs(voltageDiff));

  // 2. Steering torque (scales with forward speed — can't spin a stationary boat)
  const speedFactor = Math.min(1, Math.abs(vel.forward) / 80);
  vel.angular += input.steeringAccum * phys.steerForce * speedFactor * dt;

  // 3. Thrust along heading
  const thrust = motor.voltage * motor.maxForce;
  const headX = Math.cos(tf.angle);
  const headY = Math.sin(tf.angle);

  // Convert local velocity to world space
  let vx = vel.forward * headX - vel.lateral * headY;
  let vy = vel.forward * headY + vel.lateral * headX;

  // Apply thrust in heading direction
  vx += headX * thrust * dt;
  vy += headY * thrust * dt;

  // 4. Decompose back to local frame
  vel.forward = vx * headX + vy * headY;
  vel.lateral = -vx * headY + vy * headX;

  // 5. Anisotropic drag — pow(1 - drag, dt * 60) for framerate independence
  vel.forward *= (1 - phys.dragForward) ** (dt * 60);
  vel.lateral *= (1 - phys.dragLateral) ** (dt * 60);
  vel.angular *= (1 - phys.angularDamping) ** (dt * 60);

  // 6. Integrate position (convert local velocity back to world)
  tf.pos.x += (vel.forward * headX - vel.lateral * headY) * dt;
  tf.pos.y += (vel.forward * headY + vel.lateral * headX) * dt;
  tf.angle += vel.angular * dt;
}
