import { PlayerAnimations, PlayerStates } from "../PlayerController";
import PlayerState from "./PlayerState";

export default class Fall extends PlayerState {

    onEnter(options: Record<string, any>): void {
        // If we're falling, the vertical velocity should be >= 0
        this.parent.velocity.y = 0;
        this.owner.animation.stop();
        this.owner.animation.playIfNotAlready(PlayerAnimations.FALL_RIGHT);
    }

    update(deltaT: number): void {

        // If the player hits the ground, start idling and check if we should take damage
        if (this.owner.onGround) {
            const fallDamage = Math.floor(this.parent.velocity.y / 200);
            if (fallDamage > 0) {
                this.parent.health -= fallDamage;
                if (this.parent.health <= 0) {
                    this.finished(PlayerStates.DYING);
                } else {
                    this.finished(PlayerStates.TAKINGDAMAGE);
                }
            } else {
                this.finished(PlayerStates.IDLE);
            }
        }
        // Otherwise, keep moving
        else {
            // Get the movement direction from the player 
            let dir = this.parent.inputDir;
            // Update the horizontal velocity of the player
            this.parent.velocity.x += dir.x * this.parent.speed/3.5 - 0.3*this.parent.velocity.x;
            // Update the vertical velocity of the player
            this.parent.velocity.y += this.gravity*deltaT;
            // Move the player
            this.owner.move(this.parent.velocity.scaled(deltaT));
        }

    }

    onExit(): Record<string, any> {
        return {};
    }
}
