import GameEvent from "../../../Wolfie2D/Events/GameEvent";
import { GameEventType } from "../../../Wolfie2D/Events/GameEventType";
import { PlayerAnimations, PlayerStates, PlayerTweens } from "../PlayerController";
import Input from "../../../Wolfie2D/Input/Input";
import { MBControls } from "../../MBControls";

import PlayerState from "./PlayerState";

export default class Jump extends PlayerState {

	public onEnter(options: Record<string, any>): void {
        this.parent.consumeJumpBuffer();
        // Get the jump audio key for the player
        let jumpAudio = this.owner.getScene().getJumpAudioKey();
        // Give the player a burst of upward momentum
        this.parent.velocity.y = -320;
        // Play the jump sound for the player
		this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: jumpAudio, loop: false, holdReference: false});
	}

    public update(deltaT: number): void {
        // Update the direction the player is facing
        super.update(deltaT);

        // If the player hit the ground while descending, start idling
        if (this.owner.onGround && this.parent.velocity.y >= 0) {
			this.finished(PlayerStates.IDLE);
		} 
        // Allow dash while airborne
        else if (Input.isJustPressed(MBControls.DASH) && this.parent.canDash()) {
            this.finished(PlayerStates.DASH);
        }
        // If the player hit the ceiling or their velocity is >= to zero, 
        else if(this.owner.onCeiling || this.parent.velocity.y >= 0){
            this.finished(PlayerStates.FALL);
		}
        // Otherwise move the player
        else {
            // Get the input direction from the player
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

	public onExit(): Record<string, any> {
		this.owner.animation.stop();
		return {};
	}
}
