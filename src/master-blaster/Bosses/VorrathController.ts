import ControllerAI from "../../Wolfie2D/AI/ControllerAI";
import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import PlayerController from "../Player/PlayerController";
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

type VorrathBossAction = "idle" | "pursue" | "punch" | "oneHandSlam" | "rockThrow" | "twoHandSlam";
type VorrathAttackPhase = "none" | "windup" | "active" | "recovery";

type VorrathCombatBlackboard = {
    deltaX: number;
    absDeltaX: number;
    deltaY: number;
    absDeltaY: number;
    playerOnLeft: boolean;
    playerInAggroRange: boolean;
    playerInAttackRange: boolean;
    playerInPunchLane: boolean;
};

type VorrathPunchHitbox = {
    center: Vec2;
    halfSize: Vec2;
    active: boolean;
};

type VorrathShockwaveHitbox = {
    center: Vec2;
    halfSize: Vec2;
    active: boolean;
    direction: number;
    elapsed: number;
};

/**
 * A basic first-pass controller for Vorrath.
 * It handles fight start, facing, and simple idle/walk pursuit so the boss
 * can exist in the arena before the full attack/GOAP pass is built.
 */
export default class VorrathController extends ControllerAI {
    protected owner!: MBAnimatedSprite;
    protected bossState!: Level2Boss;
    protected player!: AnimatedSprite;
    protected moveSpeed!: number;
    protected aggroRange!: number;
    protected attackRange!: number;
    protected velocity!: Vec2;
    protected gravity!: number;
    protected maxFallSpeed!: number;
    protected walls!: OrthogonalTilemap;
    protected hitboxHalfSize!: Vec2;
    protected grounded!: boolean;
    protected currentAction!: VorrathBossAction;
    protected attackPhase!: VorrathAttackPhase;
    protected plannedAction!: VorrathBossAction | null;
    protected combatBlackboard!: VorrathCombatBlackboard;
    protected actionTimer!: number;
    protected actionCooldownTimer!: number;
    protected actionDecisionTimer!: number;
    protected actionDecisionInterval!: number;
    protected closeRangeTimer!: number;
    protected closeRangeThresholdForSlam!: number;
    protected playerAboveTimer!: number;
    protected playerAboveThresholdY!: number;
    protected punchQueued!: boolean;
    protected punchCommitted!: boolean;
    protected punchHasConnected!: boolean;
    protected punchTimer!: number;
    protected punchWindupDuration!: number;
    protected punchActiveDuration!: number;
    protected punchRecoveryDuration!: number;
    protected punchCooldownDuration!: number;
    protected punchDamage!: number;
    protected punchKnockbackX!: number;
    protected punchKnockbackY!: number;
    protected punchCooldownTimer!: number;
    protected punchHitboxOffset!: Vec2;
    protected punchHitboxHalfSize!: Vec2;
    protected punchHitbox!: VorrathPunchHitbox | null;

    protected slamQueued!: boolean;
    protected slamHasConnected!: boolean;
    protected slamTimer!: number;
    protected slamWindupDuration!: number;
    protected slamActiveDuration!: number;
    protected slamRecoveryDuration!: number;
    protected slamCooldownDuration!: number;
    protected slamDamage!: number;
    protected slamKnockbackX!: number;
    protected slamKnockbackY!: number;
    protected slamCooldownTimer!: number;
    protected slamShockwaveSpeed!: number;
    protected slamShockwaveSpawnOffsetX!: number;
    protected slamShockwaveVerticalOffset!: number;
    protected slamShockwaveHalfSize!: Vec2;
    protected slamShockwave!: VorrathShockwaveHitbox | null;

    protected deathSequenceStarted!: boolean;
    protected deathPoseSettled!: boolean;

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
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.plannedAction = null;
        this.combatBlackboard = {
            deltaX: 0,
            absDeltaX: 0,
            deltaY: 0,
            absDeltaY: 0,
            playerOnLeft: false,
            playerInAggroRange: false,
            playerInAttackRange: false,
            playerInPunchLane: false
        };
        this.actionTimer = 0;
        this.actionCooldownTimer = 0;
        this.actionDecisionTimer = 0;
        this.actionDecisionInterval = 0.1;
        this.closeRangeTimer = 0;
        this.closeRangeThresholdForSlam = 2.3;

        this.playerAboveTimer = 0;
        this.playerAboveThresholdY = 56;
        this.punchQueued = false;
        this.punchCommitted = false;
        this.punchHasConnected = false;
        this.punchTimer = 0;
        this.punchWindupDuration = 1;
        this.punchActiveDuration = 0.2;
        this.punchRecoveryDuration = 0.7;
        this.punchCooldownDuration = 1.5;
        this.punchDamage = 1;
        this.punchKnockbackX = 260;
        this.punchKnockbackY = -180;
        this.punchCooldownTimer = 0;
        this.punchHitboxOffset = new Vec2(this.hitboxHalfSize.x + 18, -8);
        this.punchHitboxHalfSize = new Vec2(28, 22);
        this.punchHitbox = null;
        
        this.slamQueued = false;
        this.slamHasConnected = false;
        this.slamTimer = 0;
        this.slamWindupDuration = 1.85;
        this.slamActiveDuration = 0.55;
        this.slamRecoveryDuration = 0.8;
        this.slamCooldownDuration = 3.2;
        this.slamDamage = 1;
        this.slamKnockbackX = 260;
        this.slamKnockbackY = -420;
        this.slamCooldownTimer = 0;
        this.slamShockwaveSpeed = 300;
        this.slamShockwaveSpawnOffsetX = this.hitboxHalfSize.x + 16;
        this.slamShockwaveVerticalOffset = this.hitboxHalfSize.y - 10;
        this.slamShockwaveHalfSize = new Vec2(26, 14);
        this.slamShockwave = null;
        
        this.deathSequenceStarted = false;
        this.deathPoseSettled = false;
    }

    public activate(_options: Record<string, any>): void {}

    public handleEvent(_event: GameEvent): void {}

    public update(deltaT: number): void {
        if(this.owner === undefined || this.player === undefined || this.bossState === undefined || this.walls === undefined){
            return;
        }

        const deltaX = this.player.position.x - this.owner.position.x;
        const deltaY = this.player.position.y - this.owner.position.y;
        let targetVelocityX = 0;
        this.owner.invertX = deltaX < 0;
        this.updateCombatBlackboard(deltaX, deltaY);
        this.updateActionTimers(deltaT);

        if(this.bossState.isDefeated()){
            this.resetPunchAction();
            this.resetOneHandSlamAction();
            this.velocity.x = 0;
            this.velocity.y = 0;

            if(!this.deathSequenceStarted){
                this.deathSequenceStarted = true;
                this.owner.animation.play(VorrathAnimations.DYING, false);
                return;
            }

            if(!this.deathPoseSettled && !this.owner.animation.isPlaying(VorrathAnimations.DYING)){
                this.deathPoseSettled = true;
                if(this.owner.hasPhysics){
                    this.owner.disablePhysics();
                }
                this.owner.animation.play(VorrathAnimations.DEAD, true);
            }

            return;
        }

        if(!this.bossState.hasFightStarted() && this.combatBlackboard.playerInAggroRange){
            this.bossState.startFight();
        }

        if(!this.bossState.hasFightStarted()){
            this.currentAction = "idle";
            this.plannedAction = null;
            this.owner.animation.playIfNotAlready(VorrathAnimations.IDLE, true);
        } else if(this.currentAction === "punch"){
            this.updatePunchAction(deltaT);
        } else if(this.currentAction === "oneHandSlam"){
            this.updateOneHandSlamAction(deltaT);
        } else {
            const nextAction = this.selectNextAction();

            if(nextAction === "oneHandSlam"){
                this.startOneHandSlamAction();
            } else if(nextAction === "punch"){
                this.startPunchAction();
            } else if(nextAction === "pursue"){
                this.currentAction = "pursue";
                const direction = deltaX < 0 ? -1 : 1;
                targetVelocityX = direction * this.moveSpeed;
                this.owner.animation.playIfNotAlready(VorrathAnimations.WALK, true);
            } else {
                this.currentAction = "idle";
                this.owner.animation.playIfNotAlready(VorrathAnimations.IDLE, true);
            }
        }

        this.velocity.x = (this.currentAction === "punch" || this.currentAction === "oneHandSlam") ? 0 : targetVelocityX;
        this.applyGravity(deltaT);
        this.owner.move(this.resolveMovement(deltaT));
    }

    protected updateCombatBlackboard(deltaX: number, deltaY: number): void {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        this.combatBlackboard.deltaX = deltaX;
        this.combatBlackboard.absDeltaX = absDeltaX;
        this.combatBlackboard.deltaY = deltaY;
        this.combatBlackboard.absDeltaY = absDeltaY;
        this.combatBlackboard.playerOnLeft = deltaX < 0;
        this.combatBlackboard.playerInAggroRange = absDeltaX <= this.aggroRange;
        this.combatBlackboard.playerInAttackRange = absDeltaX <= this.attackRange;
        this.combatBlackboard.playerInPunchLane = absDeltaY <= this.hitboxHalfSize.y + 20;
    }

    protected updateActionTimers(deltaT: number): void {
        this.actionTimer += deltaT;
        this.actionDecisionTimer = Math.max(this.actionDecisionTimer - deltaT, 0);
        this.actionCooldownTimer = Math.max(this.actionCooldownTimer - deltaT, 0);
        this.punchCooldownTimer = Math.max(this.punchCooldownTimer - deltaT, 0);
        this.slamCooldownTimer = Math.max(this.slamCooldownTimer - deltaT, 0);

        if(this.combatBlackboard.playerInAttackRange && this.combatBlackboard.playerInPunchLane && this.currentAction !== "oneHandSlam"){
            this.closeRangeTimer += deltaT;
        } else {
            this.closeRangeTimer = 0;
        }

        if(this.combatBlackboard.deltaY < -this.playerAboveThresholdY){
            this.playerAboveTimer += deltaT;
        } else {
            this.playerAboveTimer = 0;
        }

        if(this.currentAction === "punch"){
            this.punchTimer += deltaT;
        } else {
            this.punchTimer = 0;
        }

        if(this.currentAction === "oneHandSlam"){
            this.slamTimer += deltaT;
            this.updateShockwaveHitbox(deltaT);
        } else {
            this.slamTimer = 0;
        }
    }

    protected selectNextAction(): VorrathBossAction {
        if(this.currentAction === "punch" || this.currentAction === "oneHandSlam"){
            return this.currentAction;
        }

        if(!this.bossState.hasFightStarted()){
            this.plannedAction = null;
            return "idle";
        }

        if(this.actionDecisionTimer > 0){
            return this.plannedAction ?? (this.combatBlackboard.playerInAttackRange ? "idle" : "pursue");
        }

        this.actionDecisionTimer = this.actionDecisionInterval;
        this.plannedAction = null;

        if(
            this.combatBlackboard.playerInAttackRange &&
            this.combatBlackboard.playerInPunchLane &&
            this.closeRangeTimer >= this.closeRangeThresholdForSlam &&
            this.slamCooldownTimer === 0
        ){
            this.plannedAction = "oneHandSlam";
            this.slamQueued = true;
            return "oneHandSlam";
        }

        if(this.combatBlackboard.playerInAttackRange && this.combatBlackboard.playerInPunchLane && this.punchCooldownTimer === 0){
            this.plannedAction = "punch";
            this.punchQueued = true;
            return "punch";
        }

        if(this.combatBlackboard.playerInAttackRange){
            this.punchQueued = false;
            this.slamQueued = false;
            return "idle";
        }

        this.punchQueued = false;
        this.slamQueued = false;
        return "pursue";
    }

    protected startPunchAction(): void {
        this.currentAction = "punch";
        this.attackPhase = "windup";
        this.plannedAction = "punch";
        this.actionTimer = 0;
        this.punchTimer = 0;
        this.actionDecisionTimer = 0;
        this.punchCommitted = true;
        this.punchHasConnected = false;
        this.punchQueued = false;
        this.slamQueued = false;
        this.punchCooldownTimer = this.punchCooldownDuration;
        this.punchHitbox = {
            center: this.owner.position.clone(),
            halfSize: this.punchHitboxHalfSize.clone(),
            active: false
        };
        this.owner.animation.play(VorrathAnimations.NORMAL_PUNCH, false);
    }

    protected updatePunchAction(_deltaT: number): void {
        if(this.attackPhase === "windup" && this.punchTimer >= this.punchWindupDuration){
            this.attackPhase = "active";
        }

        this.updatePunchHitbox();

        if(this.attackPhase === "active"){
            this.tryApplyPunchDamage();
            if(this.punchTimer >= this.punchWindupDuration + this.punchActiveDuration){
                this.attackPhase = "recovery";
                this.clearPunchHitbox();
            }
        }

        if(this.attackPhase === "recovery" && this.punchTimer >= this.punchWindupDuration + this.punchActiveDuration + this.punchRecoveryDuration){
            this.resetPunchAction();
        }
    }

    protected resetPunchAction(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.plannedAction = null;
        this.punchQueued = false;
        this.punchCommitted = false;
        this.punchHasConnected = false;
        this.punchTimer = 0;
        this.clearPunchHitbox();
    }

    protected startOneHandSlamAction(): void {
        this.currentAction = "oneHandSlam";
        this.attackPhase = "windup";
        this.plannedAction = "oneHandSlam";
        this.actionTimer = 0;
        this.slamTimer = 0;
        this.actionDecisionTimer = 0;
        this.slamQueued = false;
        this.slamHasConnected = false;
        this.closeRangeTimer = 0;
        this.slamCooldownTimer = this.slamCooldownDuration;
        this.slamShockwave = null;
        this.owner.animation.play(VorrathAnimations.ONE_HAND_GROUND_SLAM, false);
    }

    protected updateOneHandSlamAction(_deltaT: number): void {
        if(this.attackPhase === "windup" && this.slamTimer >= this.slamWindupDuration){
            this.attackPhase = "active";
            this.spawnShockwaveHitbox();
        }

        if(this.attackPhase === "active"){
            this.tryApplyShockwaveDamage();

            if(this.slamTimer >= this.slamWindupDuration + this.slamActiveDuration){
                this.attackPhase = "recovery";
                this.clearShockwaveHitbox();
            }
        }

        if(this.attackPhase === "recovery" && this.slamTimer >= this.slamWindupDuration + this.slamActiveDuration + this.slamRecoveryDuration){
            this.resetOneHandSlamAction();
        }
    }

    protected resetOneHandSlamAction(): void {
        if(this.currentAction === "oneHandSlam"){
            this.currentAction = "idle";
            this.attackPhase = "none";
        }
        this.plannedAction = null;
        this.slamQueued = false;
        this.slamHasConnected = false;
        this.slamTimer = 0;
        this.clearShockwaveHitbox();
    }

    protected updatePunchHitbox(): void {
        if(this.punchHitbox === null){
            return;
        }

        const facingDirection = this.owner.invertX ? -1 : 1;
        this.punchHitbox.center = new Vec2(
            this.owner.position.x + this.punchHitboxOffset.x * facingDirection,
            this.owner.position.y + this.punchHitboxOffset.y
        );
        this.punchHitbox.active = this.attackPhase === "active";
    }

    protected spawnShockwaveHitbox(): void {
        const facingDirection = this.owner.invertX ? -1 : 1;
        this.slamShockwave = {
            center: new Vec2(
                this.owner.position.x + this.slamShockwaveSpawnOffsetX * facingDirection,
                this.owner.position.y + this.slamShockwaveVerticalOffset
            ),
            halfSize: this.slamShockwaveHalfSize.clone(),
            active: true,
            direction: facingDirection,
            elapsed: 0
        };
    }

    protected updateShockwaveHitbox(deltaT: number): void {
        if(this.slamShockwave === null || !this.slamShockwave.active){
            return;
        }

        this.slamShockwave.elapsed += deltaT;
        this.slamShockwave.center.x += this.slamShockwaveSpeed * deltaT * this.slamShockwave.direction;
        this.slamShockwave.center.y = this.owner.position.y + this.slamShockwaveVerticalOffset;

        if(this.slamShockwave.elapsed >= this.slamActiveDuration){
            this.clearShockwaveHitbox();
        }
    }

    protected tryApplyPunchDamage(): void {
        if(this.punchHitbox === null || !this.punchHitbox.active || this.punchHasConnected || !this.player.hasPhysics){
            return;
        }

        const punchShape = new AABB(this.punchHitbox.center.clone(), this.punchHitbox.halfSize.clone());
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!punchShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            const knockbackDirection = this.owner.invertX ? -1 : 1;
            playerController.applyDamage(this.punchDamage, new Vec2(
                this.punchKnockbackX * knockbackDirection,
                this.punchKnockbackY
            ));
        }

        this.punchHasConnected = true;
    }

    protected tryApplyShockwaveDamage(): void {
        if(this.slamShockwave === null || !this.slamShockwave.active || this.slamHasConnected || !this.player.hasPhysics){
            return;
        }

        const shockwaveShape = new AABB(this.slamShockwave.center.clone(), this.slamShockwave.halfSize.clone());
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!shockwaveShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            const shockwaveDirection = this.slamShockwave.direction;
            playerController.applyDamage(this.slamDamage, new Vec2(
                this.slamKnockbackX * shockwaveDirection,
                this.slamKnockbackY
            ));
        }

        this.slamHasConnected = true;
    }

    protected clearPunchHitbox(): void {
        this.punchHitbox = null;
    }

    protected clearShockwaveHitbox(): void {
        this.slamShockwave = null;
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
        const currentBodyCenter = this.owner.collisionShape.center.clone();
        const nextBodyCenter = currentBodyCenter.clone().add(desiredMove);
        const tileSize = this.walls.getTileSize();
        const probeOffsets = [-this.hitboxHalfSize.x * 0.6, 0, this.hitboxHalfSize.x * 0.6];

        this.grounded = false;

        if(this.velocity.y >= 0){
            let bestSnapMoveY = Number.POSITIVE_INFINITY;
            let bestSnapAbs = Number.POSITIVE_INFINITY;

            for(const offsetX of probeOffsets){
                const currentFeet = new Vec2(currentBodyCenter.x + offsetX, currentBodyCenter.y + this.hitboxHalfSize.y + 1);
                const nextFeet = new Vec2(nextBodyCenter.x + offsetX, nextBodyCenter.y + this.hitboxHalfSize.y + 1);
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
                    const snapMoveY = tileTopY - this.hitboxHalfSize.y - 1 - currentBodyCenter.y;
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
