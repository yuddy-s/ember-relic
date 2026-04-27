import { PlayerAnimations, PlayerStates } from "../PlayerController";
import PlayerState from "./PlayerState";

/**
 * The TakingDamage state for the player's FSM AI.
 * Plays the hit animation and prevents movement from interrupting it.
 */
export default class TakingDamage extends PlayerState {

    public onEnter(options: Record<string, any>): void {
        this.owner.animation.play(PlayerAnimations.TAKE_DAMAGE_RIGHT);
    }

    public update(deltaT: number): void {
        // Update physics for gravity
        this.parent.velocity.y += this.gravity * deltaT;
        this.parent.velocity.x += (0 - this.parent.velocity.x) * Math.min(1, 4 * deltaT);
        this.owner.move(this.parent.velocity.scaled(deltaT));

        // Check if the animation finished playing
        const rightPlaying = this.owner.animation.isPlaying(PlayerAnimations.TAKE_DAMAGE_RIGHT);
        if (!rightPlaying) {
            // Animation done, transition back while preserving the knockback momentum.
            if(!this.owner.onGround){
                this.finished(PlayerStates.FALL);
                return;
            }

            const dir = this.parent.inputDir;
            if (dir.isZero()) {
                this.finished(PlayerStates.IDLE);
            } else {
                this.finished(PlayerStates.WALK);
            }
        }
    }

    public onExit(): Record<string, any> {
        // Stop the animation when leaving the state
        this.owner.animation.stop();
        return { preserveMomentum: true };
    }
}
