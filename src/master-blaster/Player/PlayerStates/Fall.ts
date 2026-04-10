import { PlayerAnimations, PlayerStates } from "../PlayerController";
import PlayerState from "./PlayerState";
import Input from "../../../Wolfie2D/Input/Input";
import { MBControls } from "../../MBControls";

export default class Fall extends PlayerState {

    onEnter(options: Record<string, any>): void {
        // If we're falling, the vertical velocity should be >= 0
        this.parent.velocity.y = 0;
        this.owner.animation.stop();
        this.owner.animation.playIfNotAlready(PlayerAnimations.FALL_RIGHT);
    }

    update(deltaT: number): void {

        // If the player hits the ground, start idling (fall damage disabled)
        if (this.owner.onGround) {
            if(this.parent.shouldStartJump()){
                this.finished(PlayerStates.JUMP);
            } else {
                this.finished(PlayerStates.IDLE);
            }
        }
        // Allow dash while airborne
        else if (Input.isJustPressed(MBControls.DASH) && this.parent.canDash()) {
            this.finished(PlayerStates.DASH);
        }
        // Otherwise, keep moving
        else {
            // Get the movement direction from the player 
            let dir = this.parent.inputDir;
            // Update the horizontal velocity of the player with smooth air control
            const targetAirSpeed = dir.x * this.parent.speed * 0.9;
            const airAcceleration = Math.min(1, 8 * deltaT);
            this.parent.velocity.x += (targetAirSpeed - this.parent.velocity.x) * airAcceleration;
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
