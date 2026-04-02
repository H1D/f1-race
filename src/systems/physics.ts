import type { Entity, InputState } from "../types";

// Ported from boat branch — world-space velocity with local-frame decomposition
export function updatePhysics(entity: Entity, input: InputState, dt: number): void {
  const motor = entity.motor;
  const phys = entity.boatPhysics;
  if (!motor || !phys) return;

  const vel = entity.velocity;
  const tf = entity.transform;

  // Store previous state for render interpolation
  tf.prevPos.x = tf.pos.x;
  tf.prevPos.y = tf.pos.y;
  tf.prevAngle = tf.angle;

  // Motor voltage ramp (from idea.md motor & voltage mechanic)
  motor.targetVoltage = input.throttle ? 1 : 0;
  const rampRate = motor.targetVoltage > motor.voltage ? motor.rampUp : motor.rampDown;
  const vDiff = motor.targetVoltage - motor.voltage;
  motor.voltage += Math.sign(vDiff) * Math.min(rampRate * dt, Math.abs(vDiff));

  // Heading vectors
  const fwdX = Math.cos(tf.angle);
  const fwdY = Math.sin(tf.angle);
  const rightX = -Math.sin(tf.angle);
  const rightY = Math.cos(tf.angle);

  // Decompose world velocity into local frame (dot product)
  let forwardSpeed = vel.x * fwdX + vel.y * fwdY;
  let lateralSpeed = vel.x * rightX + vel.y * rightY;

  // Anisotropic drag — high lateral kills drift, low forward lets boat glide
  forwardSpeed -= forwardSpeed * phys.forwardDrag;
  lateralSpeed -= lateralSpeed * phys.lateralDrag;

  // Thrust (modulated by motor voltage)
  forwardSpeed += motor.voltage * phys.thrustForce * dt;

  // Steering torque — scales with speed (can't turn a stationary boat)
  const speedFactor = Math.min(1, Math.abs(forwardSpeed) / phys.turnSpeedReference);
  vel.angular += input.steeringAccum * phys.turnTorque * speedFactor * dt;

  // Angular damping
  vel.angular -= vel.angular * phys.angularDamping;

  // Recompose to world space
  vel.x = fwdX * forwardSpeed + rightX * lateralSpeed;
  vel.y = fwdY * forwardSpeed + rightY * lateralSpeed;

  // Max speed cap
  const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2);
  if (speed > phys.maxSpeed) {
    vel.x *= phys.maxSpeed / speed;
    vel.y *= phys.maxSpeed / speed;
  }

  // Integrate position and rotation
  tf.pos.x += vel.x;
  tf.pos.y += vel.y;
  tf.angle += vel.angular;
}
