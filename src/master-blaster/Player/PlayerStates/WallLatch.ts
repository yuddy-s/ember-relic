import Input from "../../../Wolfie2D/Input/Input";
import { MBControls } from "../../MBControls";
import { PlayerAnimations, PlayerStates } from "../PlayerController";
import PlayerState from "./PlayerState";

export default class WallLatch extends PlayerState {
    protected readonly RELEASE_GRACE_TIME: number = 0.1;
    protected releaseGraceTimer: number = 0;

    public onEnter(options: Record<string, any>): void {
        this.faceAwayFromWall();

        this.releaseGraceTimer = this.RELEASE_GRACE_TIME;
        this.parent.velocity.x = 0;
        this.parent.velocity.y = 0;
        this.owner.animation.playIfNotAlready(PlayerAnimations.WALL_LATCH, true);
    }

    public update(deltaT: number): void {
        this.faceAwayFromWall();

        if(Input.isJustPressed(MBControls.JUMP)){
            this.parent.wallJump();
            this.finished(PlayerStates.JUMP);
            return;
        }

        if(Input.isJustPressed(MBControls.DASH) && this.parent.canDash()){
            this.finished(PlayerStates.DASH);
            return;
        }

        if(!this.parent.shouldKeepWallLatch()){
            this.finished(PlayerStates.FALL);
            return;
        }

        if(this.parent.isHoldingWallLatchDirection()){
            this.releaseGraceTimer = this.RELEASE_GRACE_TIME;
        } else if(this.parent.inputDir.x !== 0) {
            this.finished(PlayerStates.FALL);
            return;
        } else {
            this.releaseGraceTimer -= deltaT;
            if(this.releaseGraceTimer <= 0){
                this.finished(PlayerStates.FALL);
                return;
            }
        }

        this.parent.velocity.x = 0;
        this.parent.velocity.y = 0;
        this.owner.move(this.parent.velocity.scaled(deltaT));
    }

    protected faceAwayFromWall(): void {
        const latchDirection = this.parent.getWallLatchDirection();
        if(latchDirection !== 0){
            this.owner.invertX = latchDirection > 0;
            }
    }

    public onExit(): Record<string, any> {
        this.owner.animation.stop();
        return { preserveMomentum: true };
    }
}
