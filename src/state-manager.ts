import type { DualInput, GameContext, GameState } from "./types";

export function createStateManager(gameCtx: GameContext) {
  let current: GameState | null = null;

  const manager = {
    switch(next: GameState) {
      current?.exit();
      current = next;
      current.enter(gameCtx);
    },

    update(dt: number, input: DualInput) {
      current?.update(dt, input);
    },

    render(ctx: CanvasRenderingContext2D, alpha: number) {
      current?.render(ctx, alpha);
    },
  };

  // Wire switchState into the game context so states can trigger transitions
  gameCtx.switchState = (state: GameState) => manager.switch(state);

  return manager;
}
