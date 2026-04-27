import ControllerAI from "../../Wolfie2D/AI/ControllerAI";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import Level2Boss, { VorrathAnimations } from "./Level2Boss";

type VorrathControllerOptions = {
    bossState: Level2Boss;
    player: AnimatedSprite;
    tilemap: string;
    hitboxHalfSize: Vec2;
    moveSpeed?: number;
    aggroRange?: number;
    attackRange?: number;
};

/**
 * A basic first-pass controller for Vorrath.
 * It handles fight start, facing, and simple idle/walk pursuit so the boss
 * can exist in the arena before the full attack/GOAP pass is built.
 */
export default class VorrathController extends ControllerAI {
    protected owner: MBAnimatedSprite;
    protected bossState: Level2Boss;
    protected player: AnimatedSprite;
    protected moveSpeed: number;
    protected aggroRange: number;
    protected attackRange: number;
    protected velocity: Vec2;
    protected gravity: number;
    protected maxFallSpeed: number;
    protected walls: OrthogonalTilemap;
    protected hitboxHalfSize: Vec2;
    protected grounded: boolean;

    public initializeAI(owner: MBAnimatedSprite, options: VorrathControllerOptions): void {
        this.owner = owner;
        this.bossState = options.bossState;
        this.player = options.player;
        this.walls = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
        this.hitboxHalfSize = options.hitboxHalfSize.clone();
        this.moveSpeed = options.moveSpeed ?? 75;
        this.aggroRange = options.aggroRange ?? 360;
        this.attackRange = options.attackRange ?? 140;
        this.velocity = Vec2.ZERO;
        this.gravity = 740;
        this.maxFallSpeed = 900;
        this.grounded = false;
    }

    public activate(_options: Record<string, any>): void {}

    public handleEvent(_event: GameEvent): void {}

    public update(deltaT: number): void {
        if(this.owner === undefined || this.player === undefined || this.bossState === undefined || this.walls === undefined){
            return;
        }

        const deltaX = this.player.position.x - this.owner.position.x;
        const absDeltaX = Math.abs(deltaX);
        let targetVelocityX = 0;
        this.owner.invertX = deltaX < 0;

        if(this.bossState.isDefeated()){
            this.velocity.x = 0;
            this.applyGravity(deltaT);
            this.owner.move(this.resolveMovement(deltaT));
            this.owner.animation.playIfNotAlready(VorrathAnimations.DEAD, true);
            return;
        }

        if(!this.bossState.hasFightStarted() && absDeltaX <= this.aggroRange){
            this.bossState.startFight();
        }

        if(!this.bossState.hasFightStarted()){
            this.owner.animation.playIfNotAlready(VorrathAnimations.IDLE, true);
        } else if(absDeltaX > this.attackRange){
            const direction = deltaX < 0 ? -1 : 1;
            targetVelocityX = direction * this.moveSpeed;
            this.owner.animation.playIfNotAlready(VorrathAnimations.WALK, true);
        } else {
            this.owner.animation.playIfNotAlready(VorrathAnimations.IDLE, true);
        }

        this.velocity.x = targetVelocityX;
        this.applyGravity(deltaT);
        this.owner.move(this.resolveMovement(deltaT));
    }

    protected applyGravity(deltaT: number): void {
        // Mirror the player's general movement pattern: clear downward buildup once
        // the body is grounded, then keep a slight gravity probe each frame.
        if(this.owner.onGround && this.velocity.y > 0){
            this.velocity.y = 0;
        }

        this.velocity.y = Math.min(this.velocity.y + this.gravity * deltaT, this.maxFallSpeed);
    }

    protected resolveMovement(deltaT: number): Vec2 {
        const desiredMove = this.velocity.scaled(deltaT);
        const nextPosition = this.owner.position.clone().add(desiredMove);
        const tileSize = this.walls.getTileSize();
        const probeOffsets = [-this.hitboxHalfSize.x * 0.6, 0, this.hitboxHalfSize.x * 0.6];

        this.grounded = false;

        if(this.velocity.y >= 0){
            let bestSnapMoveY = Number.POSITIVE_INFINITY;
            let bestSnapAbs = Number.POSITIVE_INFINITY;

            for(const offsetX of probeOffsets){
                const currentFeet = new Vec2(this.owner.position.x + offsetX, this.owner.position.y + this.hitboxHalfSize.y + 1);
                const nextFeet = new Vec2(nextPosition.x + offsetX, nextPosition.y + this.hitboxHalfSize.y + 1);
                const startRowCol = this.walls.getColRowAt(currentFeet);
                const endRowCol = this.walls.getColRowAt(nextFeet);
                const startRow = Math.min(startRowCol.y, endRowCol.y);
                const endRow = Math.max(startRowCol.y, endRowCol.y);
                const col = endRowCol.x;

                for(let row = startRow; row <= endRow; row++){
                    if(!this.walls.isTileCollidable(col, row)){
                        continue;
                    }

                    const tileTopY = row * tileSize.y;
                    const snapMoveY = tileTopY - this.hitboxHalfSize.y - 1 - this.owner.position.y;
                    const snapAbs = Math.abs(snapMoveY);
                    if(snapAbs < bestSnapAbs){
                        bestSnapMoveY = snapMoveY;
                        bestSnapAbs = snapAbs;
                    }

                    break;
                }
            }

            if(bestSnapMoveY !== Number.POSITIVE_INFINITY){
                this.velocity.y = 0;
                this.grounded = true;
                return new Vec2(desiredMove.x, bestSnapMoveY);
            }
        }

        return desiredMove;
    }
}
