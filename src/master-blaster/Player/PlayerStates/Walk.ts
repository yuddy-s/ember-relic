import { PlayerStates, PlayerAnimations } from "../PlayerController";
import Input from "../../../Wolfie2D/Input/Input";
import { MBControls } from "../../MBControls";
import PlayerState from "./PlayerState";

export default class Walk extends PlayerState {

	onEnter(options: Record<string, any>): void {
		this.parent.speed = this.parent.getBaseMoveSpeed();
        this.owner.animation.playIfNotAlready(PlayerAnimations.WALK_RIGHT, true);
	}

	update(deltaT: number): void {
        // Call the update method in the parent class - updates the direction the player is facing
        super.update(deltaT);

        // Get the input direction from the player controller
		let dir = this.parent.inputDir;

        // If the player is not moving - transition to the Idle state
		if(dir.isZero()){
			this.finished(PlayerStates.IDLE);
		} 
        // If the player starts a dash, transition to dash state
        else if (Input.isJustPressed(MBControls.DASH) && this.parent.canDash()) {
            this.finished(PlayerStates.DASH);
        }
        // If the player hits the jump key - transition to the Jump state
        else if (this.parent.shouldStartJump()) {
            this.finished(PlayerStates.JUMP);
        } 
        // If the player is not on the ground, transition to the fall state
        else if (!this.owner.onGround && this.parent.velocity.y !== 0) {
            this.finished(PlayerStates.FALL);
        }
        // Otherwise, move the player
        else {
            // Update the vertical velocity of the player
            this.parent.velocity.y += this.gravity*deltaT; 
            const targetSpeed = dir.x * this.parent.speed;
            const isOnIce = this.parent.isOnIce();
            const isReversing = this.parent.velocity.x !== 0 && Math.sign(targetSpeed) !== Math.sign(this.parent.velocity.x);
            const accelerationRate = isOnIce
                ? (isReversing ? 4 : 2)
                : (isReversing ? 22 : 14);
            const acceleration = Math.min(1, accelerationRate * deltaT);
            this.parent.velocity.x += (targetSpeed - this.parent.velocity.x) * acceleration;
            this.owner.move(this.parent.velocity.scaled(deltaT));
        }

	}

	onExit(): Record<string, any> {
		this.owner.animation.stop();
		return {};
	}
}
