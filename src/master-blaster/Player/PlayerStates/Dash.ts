import { PlayerStates } from "../PlayerController";
import PlayerState from "./PlayerState";
import Input from "../../../Wolfie2D/Input/Input";
import { MBControls } from "../../MBControls";

/**
 * Dash state: short horizontal burst with gravity disabled.
 */
export default class Dash extends PlayerState {

    public onEnter(options: Record<string, any>): void {
        if(!this.parent.beginDash()){
            if(this.owner.onGround){
                this.finished(PlayerStates.IDLE);
            } else {
                this.finished(PlayerStates.FALL);
            }
        }
    }

    public update(deltaT: number): void {
        this.parent.updateDash(deltaT);

        if(!this.parent.isDashing()){
            const dir = this.parent.inputDir;
            if(!this.owner.onGround){
                this.finished(PlayerStates.FALL);
            } else if (this.parent.shouldStartJump()) {
                this.finished(PlayerStates.JUMP);
            } else if(!dir.isZero()){
                this.finished(PlayerStates.WALK);
            } else {
                this.finished(PlayerStates.IDLE);
            }
        }
    }

    public onExit(): Record<string, any> {
        this.parent.endDash();
        return {};
    }
}
