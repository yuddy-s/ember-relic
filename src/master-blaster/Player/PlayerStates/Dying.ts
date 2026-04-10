import GameEvent from "../../../Wolfie2D/Events/GameEvent";
import { GameEventType } from "../../../Wolfie2D/Events/GameEventType";
import { PlayerAnimations, PlayerStates } from "../PlayerController";
import PlayerState from "./PlayerState";

/**
 * The Dying state for the player's FSM AI. 
 */
export default class Dying extends PlayerState {

    // Trigger the player's dying animation when we enter the dead state
    public onEnter(options: Record<string, any>): void {
        this.owner.animation.play(PlayerAnimations.DYING, false);
        this.emitter.fireEvent(GameEventType.PLAY_SOUND, { 
            key: this.owner.getScene().getDyingAudioKey(),
            loop: false,
            holdReference: false
        });
    }

    // Ignore all events from the rest of the game
    public handleInput(event: GameEvent): void { }

    // If the dying animation has ended, transition to the dead state
    public update(deltaT: number): void {
        if (!this.owner.animation.isPlaying(PlayerAnimations.DYING)) {
            this.finished(PlayerStates.DEAD);
        }
    }

    public onExit(): Record<string, any> { 
        return {}; 
    }
    
}
