import { PlayerStates, PlayerAnimations } from "../PlayerController";
import PlayerState from "./PlayerState";
import Input from "../../../Wolfie2D/Input/Input";
import { MBControls } from "../../MBControls";

export default class Idle extends PlayerState {

	public onEnter(options: Record<string, any>): void {
        this.owner.animation.play(PlayerAnimations.IDLE, true);
		this.parent.speed = this.parent.getBaseMoveSpeed();
        if(!options?.preserveMomentum){
            if(!this.parent.isOnIce()){
                this.parent.velocity.x = 0;
            }
            this.parent.velocity.y = 0;
        }
	}

	public update(deltaT: number): void {
        // Adjust the direction the player is facing
		super.update(deltaT);

        // Get the direction of the player's movement
		let dir = this.parent.inputDir;

        // If the player starts a dash, transition to dash state
		if (Input.isJustPressed(MBControls.DASH) && this.parent.canDash()) {
            this.finished(PlayerStates.DASH);
        }
        // If the player is moving along the x-axis, transition to the walking state
		else if (!dir.isZero() && dir.y === 0){
			this.finished(PlayerStates.WALK);
		} 
        // If the player is jumping, transition to the jumping state
        else if (this.parent.shouldStartJump()) {
            this.finished(PlayerStates.JUMP);
        }
        // If the player is not on the ground, transition to the falling state
        else if (!this.owner.onGround && this.parent.velocity.y > 0) {
            this.finished(PlayerStates.FALL);
        } 
        // Otherwise, do nothing (keep idling)
        else {
            if(!this.parent.isOnIce()){
                this.parent.velocity.x += (0 - this.parent.velocity.x) * Math.min(1, 12 * deltaT);
            }
            // Update the vertical velocity of the player
            this.parent.velocity.y += this.gravity*deltaT;
            // Move the player
            this.owner.move(this.parent.velocity.scaled(deltaT));
        }
		
	}

	public onExit(): Record<string, any> {
		this.owner.animation.stop();
		return {};
	}
}
