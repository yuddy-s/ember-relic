import ControllerAI from "../../Wolfie2D/AI/ControllerAI";
import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import Scene from "../../Wolfie2D/Scene/Scene";
import Color from "../../Wolfie2D/Utils/Color";
import PlayerController from "../Player/PlayerController";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import Level2Boss, { VorrathAnimations } from "./Level2Boss";

type VorrathControllerOptions = {
    bossState: Level2Boss;
    player: AnimatedSprite;
    tilemap: string;
    hitboxHalfSize: Vec2;
    projectileImageKey: string;
    lavaPillarImageKey: string;
    lavaPillarBasePoints: Vec2[];
    arenaWallLavaPillarBasePoints: Vec2[];
    moveSpeed?: number;
    aggroRange?: number;
    attackRange?: number;
    twoHandSlamRange?: number;
    twoHandSlamLaneThreshold?: number;
    lavaPillarSpawnCount?: number;
    lavaPillarBossClearDistance?: number;
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
    playerInPunchRange: boolean;
    playerInSlamRange: boolean;
    playerInRockThrowRange: boolean;
    playerTooFarForMelee: boolean;
    playerInPunchLane: boolean;
};

type RockThrowTrigger = "above" | "farX" | null;

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

type VorrathRockProjectile = {
    sprite: Sprite;
    center: Vec2;
    halfSize: Vec2;
    velocity: Vec2;
    active: boolean;
    elapsed: number;
    hasConnected: boolean;
};

type VorrathTelegraphBeam = {
    basePoint: Vec2;
    outerVisual: Rect;
    coreVisual: Rect;
    elapsed: number;
};

type VorrathLavaPillarHazard = {
    sprite: Sprite;
    basePoint: Vec2;
    center: Vec2;
    halfSize: Vec2;
    elapsed: number;
    active: boolean;
};

type VorrathGroundImpactHitbox = {
    center: Vec2;
    halfSize: Vec2;
    elapsed: number;
    active: boolean;
    hasConnected: boolean;
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
    protected punchDecisionRange!: number;
    protected slamDecisionRange!: number;
    protected twoHandSlamMinRange!: number;
    protected twoHandSlamRange!: number;
    protected twoHandSlamLaneThreshold!: number;
    protected rockThrowRange!: number;
    protected rockThrowFarXThreshold!: number;
    protected velocity!: Vec2;
    protected gravity!: number;
    protected maxFallSpeed!: number;
    protected walls!: OrthogonalTilemap;
    protected hitboxHalfSize!: Vec2;
    protected projectileImageKey!: string;
    protected lavaPillarImageKey!: string;
    protected lavaPillarBasePoints!: Vec2[];
    protected arenaWallLavaPillarBasePoints!: Vec2[];
    protected selectedLavaPillarBasePoints!: Vec2[];
    protected arenaWallLavaPillars!: VorrathLavaPillarHazard[];
    protected arenaWallLavaBlockers!: Rect[];
    protected arenaWallPillarsSpawned!: boolean;
    protected arenaWallPillarDeathTimer!: number;
    protected arenaWallPillarPersistAfterDeathDuration!: number;
    protected lavaPillarSpawnCount!: number;
    protected lavaPillarBossClearDistance!: number;
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
    protected playerAboveThresholdForThrow!: number;
    protected playerFarXTimer!: number;
    protected playerFarXThresholdForThrow!: number;
    protected punchQueued!: boolean;
    protected punchCommitted!: boolean;
    protected punchHasConnected!: boolean;
    protected consecutivePunchCount!: number;
    protected maxPunchComboCount!: number;
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
    protected slamShockwaveOuterVisual!: Rect | null;
    protected slamShockwaveCoreVisual!: Rect | null;

    protected rockThrowQueued!: boolean;
    protected rockThrowTimer!: number;
    protected rockThrowWindupDuration!: number;
    protected rockThrowActiveDuration!: number;
    protected rockThrowRecoveryDuration!: number;
    protected rockThrowCooldownDuration!: number;
    protected rockThrowDamage!: number;
    protected rockThrowKnockbackX!: number;
    protected rockThrowKnockbackY!: number;
    protected rockThrowCooldownTimer!: number;
    protected rockProjectileScale!: number;
    protected rockProjectileOffset!: Vec2;
    protected rockProjectileHalfSize!: Vec2;
    protected rockProjectileSpeedX!: number;
    protected rockProjectileSpeedY!: number;
    protected rockProjectileGravity!: number;
    protected rockProjectileSpinSpeed!: number;
    protected rockProjectileLifetime!: number;
    protected rockThrowLeadTime!: number;
    protected rockThrowVerticalLeadStrength!: number;
    protected rockProjectile!: VorrathRockProjectile | null;
    protected rockThrowTrigger!: RockThrowTrigger;
    protected rockThrowBackstepDistance!: number;
    protected rockThrowBackstepDuration!: number;
    protected rockThrowBackstepDirection!: number;
    protected forcedComboAction!: VorrathBossAction | null;
    protected slamToTwoHandSlamChance!: number;
    protected slamToRockThrowChance!: number;
    protected slamToOneHandSlamChance!: number;

    protected twoHandSlamQueued!: boolean;
    protected twoHandSlamTimer!: number;
    protected twoHandSlamWindupDuration!: number;
    protected twoHandSlamActiveDuration!: number;
    protected twoHandSlamRecoveryDuration!: number;
    protected twoHandSlamCooldownDuration!: number;
    protected twoHandSlamDamage!: number;
    protected twoHandSlamKnockbackX!: number;
    protected twoHandSlamKnockbackY!: number;
    protected twoHandSlamCooldownTimer!: number;
    protected lavaPillarHitboxHalfSize!: Vec2;
    protected lavaPillarCoreWidth!: number;
    protected lavaPillarTelegraphOuterPaddingX!: number;
    protected lavaPillarTelegraphOuterPaddingY!: number;
    protected lavaPillarTelegraphCorePaddingX!: number;
    protected lavaPillarTelegraphDuration!: number;
    protected lavaPillarTelegraphs!: VorrathTelegraphBeam[];
    protected lavaPillars!: VorrathLavaPillarHazard[];
    protected twoHandSlamImpactDuration!: number;
    protected twoHandSlamImpactHalfSize!: Vec2;
    protected twoHandSlamImpactGroundInset!: number;
    protected twoHandSlamImpact!: VorrathGroundImpactHitbox | null;
    protected twoHandSlamImpactVisual!: Rect | null;

    protected deathSequenceStarted!: boolean;
    protected deathPoseSettled!: boolean;

    public initializeAI(owner: MBAnimatedSprite, options: VorrathControllerOptions): void {
        this.owner = owner;
        this.bossState = options.bossState;
        this.player = options.player;
        this.walls = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
        this.hitboxHalfSize = options.hitboxHalfSize.clone();
        this.projectileImageKey = options.projectileImageKey;
        this.lavaPillarImageKey = options.lavaPillarImageKey;
        this.lavaPillarBasePoints = options.lavaPillarBasePoints.map(point => point.clone());
        this.arenaWallLavaPillarBasePoints = options.arenaWallLavaPillarBasePoints.map(point => point.clone());
        this.selectedLavaPillarBasePoints = new Array();
        this.arenaWallLavaPillars = new Array();
        this.arenaWallLavaBlockers = new Array();
        this.arenaWallPillarsSpawned = false;
        this.arenaWallPillarDeathTimer = 0;
        this.arenaWallPillarPersistAfterDeathDuration = 5;
        this.lavaPillarSpawnCount = Math.max(0, options.lavaPillarSpawnCount ?? 5);
        this.lavaPillarBossClearDistance = Math.max(0, options.lavaPillarBossClearDistance ?? 112);
        this.moveSpeed = options.moveSpeed ?? 75;

        this.aggroRange = options.aggroRange ?? 360;
        this.punchDecisionRange = 70;
        this.slamDecisionRange = Math.max(this.punchDecisionRange + 10, 150);
        this.twoHandSlamMinRange = Math.max(this.slamDecisionRange + 10, 170);
        this.twoHandSlamRange = options.twoHandSlamRange ?? 420;
        this.twoHandSlamLaneThreshold = options.twoHandSlamLaneThreshold ?? (this.hitboxHalfSize.y + 28);

        this.rockThrowRange = 360; // distance rock throw can be used
        this.rockThrowFarXThreshold = 140; // trigger for rock throw if player is far on x axis, even if they are within slam/punch range


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
            playerInPunchRange: false,
            playerInSlamRange: false,
            playerInRockThrowRange: false,
            playerTooFarForMelee: false,
            playerInPunchLane: false
        };
        this.actionTimer = 0;
        this.actionCooldownTimer = 0;
        this.actionDecisionTimer = 0;
        this.actionDecisionInterval = 0.1;
        this.closeRangeTimer = 0;
        this.closeRangeThresholdForSlam = 2.3;

        this.playerAboveTimer = 0;
        this.playerAboveThresholdY = 10;
        this.playerAboveThresholdForThrow = 5;
        this.playerFarXTimer = 0;
        this.playerFarXThresholdForThrow = 7;

        this.punchQueued = false;
        this.punchCommitted = false;
        this.punchHasConnected = false;
        this.consecutivePunchCount = 0;
        this.maxPunchComboCount = 2;
        this.punchTimer = 0;
        this.punchWindupDuration = 1;
        this.punchActiveDuration = 0.2;
        this.punchRecoveryDuration = 0.7;
        this.punchCooldownDuration = 1.5;
        this.punchDamage = 1;
        this.punchKnockbackX = 100;
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
        this.slamCooldownDuration = 1.0;
        this.slamDamage = 1;
        this.slamKnockbackX = 100;
        this.slamKnockbackY = -420;
        this.slamCooldownTimer = 0;
        this.slamShockwaveSpeed = 300;
        this.slamShockwaveSpawnOffsetX = this.hitboxHalfSize.x + 16;
        this.slamShockwaveVerticalOffset = this.hitboxHalfSize.y - 10;
        this.slamShockwaveHalfSize = new Vec2(26, 14);
        this.slamShockwave = null;
        this.slamShockwaveOuterVisual = null;
        this.slamShockwaveCoreVisual = null;

        this.rockThrowQueued = false;
        this.rockThrowTimer = 0;
        this.rockThrowWindupDuration = 1.15;
        this.rockThrowActiveDuration = 0.2;
        this.rockThrowRecoveryDuration = 0.9;
        this.rockThrowCooldownDuration = 4.2;
        this.rockThrowDamage = 1;
        this.rockThrowKnockbackX = 280;
        this.rockThrowKnockbackY = -220;
        this.rockThrowCooldownTimer = 0;
        this.rockProjectileScale = 0.7;
        this.rockProjectileOffset = new Vec2(this.hitboxHalfSize.x + 18, -54);
        this.rockProjectileHalfSize = new Vec2(16, 16);
        this.rockProjectileSpeedX = 300;
        this.rockProjectileSpeedY = -120;
        this.rockProjectileGravity = 360;
        this.rockProjectileSpinSpeed = 7;
        this.rockProjectileLifetime = 6;
        this.rockThrowLeadTime = 0.28;
        this.rockThrowVerticalLeadStrength = 0.55;
        this.rockProjectile = null;
        this.rockThrowTrigger = null;
        this.rockThrowBackstepDistance = 30;
        this.rockThrowBackstepDuration = 0.2;
        this.rockThrowBackstepDirection = 1;
        this.forcedComboAction = null;
        this.slamToTwoHandSlamChance = 0.4;
        this.slamToRockThrowChance = 0.4;
        this.slamToOneHandSlamChance = 0.1;
        
        this.twoHandSlamQueued = false;
        this.twoHandSlamTimer = 0;
        this.twoHandSlamWindupDuration = 1.9;
        this.twoHandSlamActiveDuration = 1.25;
        this.twoHandSlamRecoveryDuration = 1.05;
        this.twoHandSlamCooldownDuration = 5.6;
        this.twoHandSlamDamage = 1;
        this.twoHandSlamKnockbackX = 210;
        this.twoHandSlamKnockbackY = -360;
        this.twoHandSlamCooldownTimer = 0;
        this.lavaPillarHitboxHalfSize = new Vec2(8, 56);
        this.lavaPillarCoreWidth = 10;
        this.lavaPillarTelegraphOuterPaddingX = 12;
        this.lavaPillarTelegraphOuterPaddingY = 8;
        this.lavaPillarTelegraphCorePaddingX = 4;
        this.lavaPillarTelegraphDuration = this.twoHandSlamWindupDuration;
        this.lavaPillarTelegraphs = new Array();
        this.lavaPillars = new Array();
        this.twoHandSlamImpactDuration = 0.28;
        this.twoHandSlamImpactHalfSize = new Vec2(70, 12);
        this.twoHandSlamImpactGroundInset = 2;
        this.twoHandSlamImpact = null;
        this.twoHandSlamImpactVisual = null;
        
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
        this.updateRockProjectile(deltaT);

        if(this.bossState.isDefeated()){
            this.resetPunchAction();
            this.resetOneHandSlamAction();
            this.resetRockThrowAction();
            this.resetTwoHandSlamAction();
            this.clearRockProjectile();
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.arenaWallPillarDeathTimer += deltaT;
            this.updateArenaWallLavaPillars(deltaT);

            if(this.arenaWallPillarsSpawned && this.arenaWallPillarDeathTimer >= this.arenaWallPillarPersistAfterDeathDuration){
                this.clearArenaWallLavaPillars();
            }

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

        if(this.bossState.hasFightStarted() && !this.arenaWallPillarsSpawned){
            this.spawnArenaWallLavaPillars();
        }

        this.updateArenaWallLavaPillars(deltaT);

        if(!this.bossState.hasFightStarted()){
            this.currentAction = "idle";
            this.plannedAction = null;
            this.owner.animation.playIfNotAlready(VorrathAnimations.IDLE, true);
        } else if(this.currentAction === "punch"){
            this.updatePunchAction(deltaT);
        } else if(this.currentAction === "oneHandSlam"){
            this.updateOneHandSlamAction(deltaT);
        } else if(this.currentAction === "rockThrow"){
            this.updateRockThrowAction(deltaT);
        } else if(this.currentAction === "twoHandSlam"){
            this.updateTwoHandSlamAction(deltaT);
        } else {
            const nextAction = this.selectNextAction();

            if(nextAction === "rockThrow"){
                this.startRockThrowAction();
            } else if(nextAction === "twoHandSlam"){
                this.startTwoHandSlamAction();
            } else if(nextAction === "oneHandSlam"){
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

        if(this.currentAction === "rockThrow"){
            this.velocity.x = this.getRockThrowMovementVelocity();
        } else {
            this.velocity.x = (this.currentAction === "punch" || this.currentAction === "oneHandSlam") ? 0 : targetVelocityX;
        }
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
        this.combatBlackboard.playerInPunchRange = absDeltaX <= this.punchDecisionRange;
        this.combatBlackboard.playerInSlamRange = absDeltaX <= this.slamDecisionRange;
        this.combatBlackboard.playerInRockThrowRange = absDeltaX <= this.rockThrowRange;
        this.combatBlackboard.playerTooFarForMelee = absDeltaX >= this.rockThrowFarXThreshold;
        this.combatBlackboard.playerInPunchLane = absDeltaY <= this.hitboxHalfSize.y + 20;
    }

    protected updateActionTimers(deltaT: number): void {
        this.actionTimer += deltaT;
        this.actionDecisionTimer = Math.max(this.actionDecisionTimer - deltaT, 0);
        this.actionCooldownTimer = Math.max(this.actionCooldownTimer - deltaT, 0);
        this.punchCooldownTimer = Math.max(this.punchCooldownTimer - deltaT, 0);
        this.slamCooldownTimer = Math.max(this.slamCooldownTimer - deltaT, 0);
        this.rockThrowCooldownTimer = Math.max(this.rockThrowCooldownTimer - deltaT, 0);
        this.twoHandSlamCooldownTimer = Math.max(this.twoHandSlamCooldownTimer - deltaT, 0);

        if(this.combatBlackboard.playerInSlamRange && this.combatBlackboard.playerInPunchLane && this.currentAction !== "oneHandSlam"){
            this.closeRangeTimer += deltaT;
        } else {
            this.closeRangeTimer = 0;
        }

        if(this.combatBlackboard.deltaY < -this.playerAboveThresholdY){
            this.playerAboveTimer += deltaT;
        } else {
            this.playerAboveTimer = 0;
        }

        if(this.combatBlackboard.playerTooFarForMelee){
            this.playerFarXTimer += deltaT;
        } else {
            this.playerFarXTimer = 0;
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

        if(this.currentAction === "rockThrow"){
            this.rockThrowTimer += deltaT;
        } else {
            this.rockThrowTimer = 0;
        }

        if(this.currentAction === "twoHandSlam"){
            this.twoHandSlamTimer += deltaT;
            this.updateTwoHandSlamImpact(deltaT);
        } else {
            this.twoHandSlamTimer = 0;
        }
    }

    protected selectNextAction(): VorrathBossAction {
        if(this.currentAction === "punch" || this.currentAction === "oneHandSlam" || this.currentAction === "rockThrow"){
            return this.currentAction;
        }

        if(!this.bossState.hasFightStarted()){
            this.plannedAction = null;
            return "idle";
        }

        if(this.forcedComboAction !== null){
            return this.selectForcedComboAction();
        }

        if(this.actionDecisionTimer > 0){
            return this.plannedAction ?? (this.combatBlackboard.playerInPunchRange ? "idle" : "pursue");
        }

        this.actionDecisionTimer = this.actionDecisionInterval;
        this.plannedAction = null;

        if(this.playerAboveTimer >= this.playerAboveThresholdForThrow && this.combatBlackboard.playerInRockThrowRange && this.rockThrowCooldownTimer === 0){
            this.plannedAction = "rockThrow";
            this.rockThrowQueued = true;
            this.rockThrowTrigger = "above";
            this.rockThrowBackstepDirection = this.owner.invertX ? 1 : -1;
            return "rockThrow";
        }

        if(
            this.combatBlackboard.absDeltaX >= this.twoHandSlamMinRange &&
            this.combatBlackboard.absDeltaX <= this.twoHandSlamRange &&
            this.combatBlackboard.absDeltaY <= this.twoHandSlamLaneThreshold &&
            this.twoHandSlamCooldownTimer === 0
        ){
            this.plannedAction = "twoHandSlam";
            this.twoHandSlamQueued = true;
            this.rockThrowQueued = false;
            this.rockThrowTrigger = null;
            return "twoHandSlam";
        }

        if(this.playerFarXTimer >= this.playerFarXThresholdForThrow && this.combatBlackboard.playerInRockThrowRange && this.rockThrowCooldownTimer === 0){
            this.plannedAction = "rockThrow";
            this.rockThrowQueued = true;
            this.rockThrowTrigger = "farX";
            return "rockThrow";
        }

        if(
            this.combatBlackboard.playerInSlamRange &&
            this.combatBlackboard.playerInPunchLane &&
            this.closeRangeTimer >= this.closeRangeThresholdForSlam &&
            this.slamCooldownTimer === 0
        ){
            this.plannedAction = "oneHandSlam";
            this.slamQueued = true;
            this.rockThrowQueued = false;
            this.rockThrowTrigger = null;
            this.twoHandSlamQueued = false;
            return "oneHandSlam";
        }

        if(this.combatBlackboard.playerInPunchRange && this.combatBlackboard.playerInPunchLane && this.punchCooldownTimer === 0){
            this.plannedAction = "punch";
            this.punchQueued = true;
            this.rockThrowQueued = false;
            this.rockThrowTrigger = null;
            this.twoHandSlamQueued = false;
            return "punch";
        }

        if(this.combatBlackboard.playerInPunchRange){
            this.punchQueued = false;
            this.slamQueued = false;
            this.rockThrowQueued = false;
            this.rockThrowTrigger = null;
            this.twoHandSlamQueued = false;
            return "idle";
        }

        this.punchQueued = false;
        this.slamQueued = false;
        this.rockThrowQueued = false;
        this.rockThrowTrigger = null;
        this.twoHandSlamQueued = false;
        return "pursue";
    }

    protected selectForcedComboAction(): VorrathBossAction {
        switch(this.forcedComboAction){
            case "rockThrow":
                if(this.rockThrowCooldownTimer === 0){
                    this.plannedAction = "rockThrow";
                    this.rockThrowQueued = true;
                    this.rockThrowTrigger = null;
                    return "rockThrow";
                }
                return "idle";
            case "twoHandSlam":
                if(this.twoHandSlamCooldownTimer === 0){
                    this.plannedAction = "twoHandSlam";
                    this.twoHandSlamQueued = true;
                    return "twoHandSlam";
                }
                return "idle";
            case "oneHandSlam":
                if(this.slamCooldownTimer === 0){
                    this.plannedAction = "oneHandSlam";
                    this.slamQueued = true;
                    return "oneHandSlam";
                }
                return "idle";
            default:
                this.forcedComboAction = null;
                return "idle";
        }
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
        this.consecutivePunchCount += 1;
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
        const completedPunch = this.currentAction === "punch";
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.plannedAction = null;
        this.punchQueued = false;
        this.punchCommitted = false;
        this.punchHasConnected = false;
        this.punchTimer = 0;
        this.clearPunchHitbox();

        if(completedPunch && this.consecutivePunchCount >= this.maxPunchComboCount){
            this.forcedComboAction = "oneHandSlam";
        }
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
        this.consecutivePunchCount = 0;
        if(this.forcedComboAction === "oneHandSlam"){
            this.forcedComboAction = null;
        }
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
        const completedSlam = this.currentAction === "oneHandSlam";
        if(this.currentAction === "oneHandSlam"){
            this.currentAction = "idle";
            this.attackPhase = "none";
        }
        this.plannedAction = null;
        this.slamQueued = false;
        this.slamHasConnected = false;
        this.slamTimer = 0;
        this.clearShockwaveHitbox();

        if(completedSlam && !this.bossState.isDefeated()){
            this.rollOneHandSlamFollowup();
        }
    }

    protected startRockThrowAction(): void {
        this.currentAction = "rockThrow";
        this.attackPhase = "windup";
        this.plannedAction = "rockThrow";
        this.actionTimer = 0;
        this.rockThrowTimer = 0;
        this.actionDecisionTimer = 0;
        this.rockThrowQueued = false;
        this.rockThrowCooldownTimer = this.rockThrowCooldownDuration;
        this.consecutivePunchCount = 0;
        if(this.forcedComboAction === "rockThrow"){
            this.forcedComboAction = null;
        }
        this.owner.animation.play(VorrathAnimations.ROCK_THROW, false);
    }

    protected updateRockThrowAction(deltaT: number): void {
        if(this.attackPhase === "windup" && this.rockThrowTimer >= this.rockThrowWindupDuration){
            this.attackPhase = "active";
            this.spawnRockProjectile();
        }

        if(this.attackPhase === "active" && this.rockThrowTimer >= this.rockThrowWindupDuration + this.rockThrowActiveDuration){
            this.attackPhase = "recovery";
        }

        if(this.attackPhase === "recovery" && this.rockThrowTimer >= this.rockThrowWindupDuration + this.rockThrowActiveDuration + this.rockThrowRecoveryDuration){
            this.resetRockThrowAction();
        }
    }

    protected startTwoHandSlamAction(): void {
        this.currentAction = "twoHandSlam";
        this.attackPhase = "windup";
        this.plannedAction = "twoHandSlam";
        this.actionTimer = 0;
        this.twoHandSlamTimer = 0;
        this.actionDecisionTimer = 0;
        this.twoHandSlamQueued = false;
        this.twoHandSlamCooldownTimer = this.twoHandSlamCooldownDuration;
        this.clearLavaPillars();
        this.clearTwoHandSlamImpact();
        this.selectTwoHandSlamPillarBasePoints();
        this.consecutivePunchCount = 0;
        if(this.forcedComboAction === "twoHandSlam"){
            this.forcedComboAction = null;
        }
        this.spawnLavaPillarTelegraphs();
        this.owner.animation.play(VorrathAnimations.TWO_HAND_GROUND_SLAM, false);
    }

    protected updateTwoHandSlamAction(_deltaT: number): void {
        if(this.attackPhase === "windup"){
            this.updateLavaPillarTelegraphs();

            if(this.twoHandSlamTimer >= this.twoHandSlamWindupDuration){
                this.attackPhase = "active";
                this.clearLavaPillarTelegraphs();
                this.spawnTwoHandSlamImpact();
                this.spawnLavaPillars();
            }
        }

        if(this.attackPhase === "active"){
            this.updateLavaPillars();

            if(this.twoHandSlamTimer >= this.twoHandSlamWindupDuration + this.twoHandSlamActiveDuration){
                this.attackPhase = "recovery";
                this.clearTwoHandSlamImpact();
                this.clearLavaPillars();
            }
        }

        if(this.attackPhase === "recovery" && this.twoHandSlamTimer >= this.twoHandSlamWindupDuration + this.twoHandSlamActiveDuration + this.twoHandSlamRecoveryDuration){
            this.resetTwoHandSlamAction();
        }
    }

    protected resetRockThrowAction(): void {
        if(this.currentAction === "rockThrow"){
            this.currentAction = "idle";
            this.attackPhase = "none";
        }

        this.plannedAction = null;
        this.rockThrowQueued = false;
        this.rockThrowTimer = 0;
        this.rockThrowTrigger = null;
    }

    protected resetTwoHandSlamAction(): void {
        if(this.currentAction === "twoHandSlam"){
            this.currentAction = "idle";
            this.attackPhase = "none";
        }

        this.plannedAction = null;
        this.twoHandSlamQueued = false;
        this.twoHandSlamTimer = 0;
        this.clearLavaPillarTelegraphs();
        this.clearTwoHandSlamImpact();
        this.clearLavaPillars();
    }

    protected rollOneHandSlamFollowup(): void {
        const roll = Math.random();

        if(roll < this.slamToTwoHandSlamChance){
            this.forcedComboAction = "twoHandSlam";
            return;
        }

        if(roll < this.slamToTwoHandSlamChance + this.slamToRockThrowChance){
            this.forcedComboAction = "rockThrow";
            return;
        }

        if(roll < this.slamToTwoHandSlamChance + this.slamToRockThrowChance + this.slamToOneHandSlamChance){
            this.forcedComboAction = "oneHandSlam";
            return;
        }

        this.forcedComboAction = null;
    }

    protected getRockThrowMovementVelocity(): number {
        if(this.attackPhase === "windup" && this.rockThrowTrigger === "above" && this.rockThrowTimer <= this.rockThrowBackstepDuration){
            return (this.rockThrowBackstepDistance / Math.max(this.rockThrowBackstepDuration, 0.01)) * this.rockThrowBackstepDirection;
        }

        return 0;
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
        this.spawnShockwaveVisuals();
    }

    protected spawnRockProjectile(): void {
        if(this.rockProjectile !== null){
            return;
        }

        const facingDirection = this.owner.invertX ? -1 : 1;
        const spawnPosition = new Vec2(
            this.owner.position.x + this.rockProjectileOffset.x * facingDirection,
            this.owner.position.y + this.rockProjectileOffset.y
        );
        const projectileSprite = this.owner.getScene().add.sprite(this.projectileImageKey, "PRIMARY");
        projectileSprite.position.copy(spawnPosition);
        projectileSprite.scale.set(this.rockProjectileScale, this.rockProjectileScale);

        const playerController = this.player.ai as PlayerController;
        const predictedTarget = this.player.position.clone().add(playerController.velocity.clone().scale(this.rockThrowLeadTime));
        const toTarget = predictedTarget.sub(spawnPosition);
        const throwDirection = toTarget.x < 0 ? -1 : 1;
        const horizontalDistance = Math.max(Math.abs(toTarget.x), 1);
        const normalizedVerticalOffset = Math.max(-1, Math.min(1, toTarget.y / Math.max(this.hitboxHalfSize.y * 3, 1)));
        const aimedSpeedX = Math.max(
            this.rockProjectileSpeedX * 0.65,
            Math.min(this.rockProjectileSpeedX * 1.35, horizontalDistance / Math.max(this.rockThrowLeadTime + 0.18, 0.18))
        );
        const aimedSpeedY = this.rockProjectileSpeedY + normalizedVerticalOffset * (Math.abs(this.rockProjectileSpeedY) * this.rockThrowVerticalLeadStrength);

        this.rockProjectile = {
            sprite: projectileSprite,
            center: spawnPosition.clone(),
            halfSize: this.rockProjectileHalfSize.clone(),
            velocity: new Vec2(aimedSpeedX * throwDirection, aimedSpeedY),
            active: true,
            elapsed: 0,
            hasConnected: false
        };
    }

    protected spawnLavaPillarTelegraphs(): void {
        this.clearLavaPillarTelegraphs();
        const scene = this.owner.getScene();

        for(const basePoint of this.selectedLavaPillarBasePoints){
            const beamCenter = new Vec2(basePoint.x, basePoint.y - this.lavaPillarHitboxHalfSize.y);
            const outerVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: beamCenter.clone(),
                size: new Vec2(
                    this.lavaPillarHitboxHalfSize.x * 2 + this.lavaPillarTelegraphOuterPaddingX,
                    this.lavaPillarHitboxHalfSize.y * 2 + this.lavaPillarTelegraphOuterPaddingY
                )
            });
            outerVisual.color = new Color(190, 40, 30, 0.18);
            outerVisual.borderColor = new Color(255, 160, 90, 0.35);
            outerVisual.borderWidth = 2;

            const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: beamCenter.clone(),
                size: new Vec2(
                    this.lavaPillarCoreWidth + this.lavaPillarTelegraphCorePaddingX,
                    this.lavaPillarHitboxHalfSize.y * 2
                )
            });
            coreVisual.color = new Color(255, 110, 60, 0.14);
            coreVisual.borderColor = new Color(255, 220, 170, 0.28);
            coreVisual.borderWidth = 1;

            this.lavaPillarTelegraphs.push({
                basePoint: basePoint.clone(),
                outerVisual,
                coreVisual,
                elapsed: 0
            });
        }
    }

    protected spawnTwoHandSlamImpact(): void {
        const groundY = this.owner.position.y + this.hitboxHalfSize.y - this.twoHandSlamImpactGroundInset;
        const center = new Vec2(
            this.owner.position.x,
            groundY - this.twoHandSlamImpactHalfSize.y
        );

        this.twoHandSlamImpact = {
            center,
            halfSize: this.twoHandSlamImpactHalfSize.clone(),
            elapsed: 0,
            active: true,
            hasConnected: false
        };

        const scene = this.owner.getScene();
        this.twoHandSlamImpactVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: center.clone(),
            size: this.twoHandSlamImpactHalfSize.scaled(2)
        });
        this.twoHandSlamImpactVisual.color = new Color(175, 32, 26, 0.32);
        this.twoHandSlamImpactVisual.borderColor = new Color(255, 132, 84, 0.78);
        this.twoHandSlamImpactVisual.borderWidth = 3;
    }

    protected updateLavaPillarTelegraphs(): void {
        for(const telegraph of this.lavaPillarTelegraphs){
            telegraph.elapsed = this.twoHandSlamTimer;
            const progress = Math.min(1, telegraph.elapsed / Math.max(this.lavaPillarTelegraphDuration, 0.01));
            const pulse = 0.92 + 0.14 * Math.sin(progress * Math.PI * 6);
            const beamCenter = new Vec2(telegraph.basePoint.x, telegraph.basePoint.y - this.lavaPillarHitboxHalfSize.y);
            telegraph.outerVisual.position.copy(beamCenter);
            telegraph.coreVisual.position.copy(beamCenter);
            telegraph.outerVisual.size.set(
                (this.lavaPillarHitboxHalfSize.x * 2 + this.lavaPillarTelegraphOuterPaddingX) * pulse,
                this.lavaPillarHitboxHalfSize.y * 2 + this.lavaPillarTelegraphOuterPaddingY
            );
            telegraph.coreVisual.size.set(
                (this.lavaPillarCoreWidth + this.lavaPillarTelegraphCorePaddingX) * (0.9 + 0.18 * Math.sin(progress * Math.PI * 8)),
                this.lavaPillarHitboxHalfSize.y * 2
            );
            telegraph.outerVisual.color = new Color(190, 40, 30, 0.12 + 0.16 * progress);
            telegraph.outerVisual.borderColor = new Color(255, 160, 90, 0.22 + 0.26 * progress);
            telegraph.coreVisual.color = new Color(255, 110, 60, 0.10 + 0.22 * progress);
            telegraph.coreVisual.borderColor = new Color(255, 220, 170, 0.18 + 0.2 * progress);
        }
    }

    protected clearLavaPillarTelegraphs(): void {
        for(const telegraph of this.lavaPillarTelegraphs){
            telegraph.outerVisual.destroy();
            telegraph.coreVisual.destroy();
        }

        this.lavaPillarTelegraphs = new Array();
    }

    protected spawnLavaPillars(): void {
        this.clearLavaPillars();
        const scene = this.owner.getScene();

        for(const basePoint of this.selectedLavaPillarBasePoints){
            this.lavaPillars.push(this.createLavaPillarHazard(scene, basePoint));
        }
    }

    protected updateLavaPillars(): void {
        for(const pillar of this.lavaPillars){
            pillar.elapsed = Math.min(this.twoHandSlamTimer - this.twoHandSlamWindupDuration, this.twoHandSlamActiveDuration);
            pillar.center.set(pillar.basePoint.x, pillar.basePoint.y - pillar.halfSize.y);
            pillar.sprite.position.copy(pillar.center);
            pillar.sprite.alpha = 0.82 + 0.16 * Math.sin(pillar.elapsed * 12);
            this.tryApplyLavaPillarDamage(pillar);
        }
    }

    protected updateTwoHandSlamImpact(deltaT: number): void {
        if(this.twoHandSlamImpact === null || !this.twoHandSlamImpact.active){
            return;
        }

        const groundY = this.owner.position.y + this.hitboxHalfSize.y - this.twoHandSlamImpactGroundInset;
        this.twoHandSlamImpact.elapsed += deltaT;
        this.twoHandSlamImpact.center.set(
            this.owner.position.x,
            groundY - this.twoHandSlamImpact.halfSize.y
        );
        this.tryApplyTwoHandSlamImpactDamage();

        if(this.twoHandSlamImpactVisual !== null){
            const progress = Math.min(1, this.twoHandSlamImpact.elapsed / Math.max(this.twoHandSlamImpactDuration, 0.01));
            const widthPulse = 1 + 0.08 * Math.sin(progress * Math.PI * 6);
            this.twoHandSlamImpactVisual.position.copy(this.twoHandSlamImpact.center);
            this.twoHandSlamImpactVisual.size.set(
                this.twoHandSlamImpact.halfSize.x * 2 * widthPulse,
                this.twoHandSlamImpact.halfSize.y * 2
            );
            this.twoHandSlamImpactVisual.color = new Color(175, 32, 26, 0.32 * (1 - progress * 0.5));
            this.twoHandSlamImpactVisual.borderColor = new Color(255, 132, 84, Math.max(0.25, 0.78 - progress * 0.35));
        }

        if(this.twoHandSlamImpact.elapsed >= this.twoHandSlamImpactDuration){
            this.clearTwoHandSlamImpact();
        }
    }

    protected clearLavaPillars(): void {
        for(const pillar of this.lavaPillars){
            pillar.sprite.destroy();
        }

        this.lavaPillars = new Array();
    }

    protected spawnArenaWallLavaPillars(): void {
        this.clearArenaWallLavaPillars();
        const scene = this.owner.getScene();
        this.arenaWallPillarDeathTimer = 0;

        for(const basePoint of this.arenaWallLavaPillarBasePoints){
            this.arenaWallLavaPillars.push(this.createLavaPillarHazard(scene, basePoint));
            this.arenaWallLavaBlockers.push(this.createArenaWallBlocker(scene, basePoint));
        }

        this.arenaWallPillarsSpawned = true;
    }

    protected updateArenaWallLavaPillars(deltaT: number): void {
        for(const pillar of this.arenaWallLavaPillars){
            pillar.elapsed += deltaT;
            pillar.sprite.alpha = 0.84 + 0.12 * Math.sin(pillar.elapsed * 8);
            this.tryApplyLavaPillarDamage(pillar);
        }
    }

    protected clearArenaWallLavaPillars(): void {
        for(const pillar of this.arenaWallLavaPillars){
            pillar.sprite.destroy();
        }

        for(const blocker of this.arenaWallLavaBlockers){
            blocker.destroy();
        }

        this.arenaWallLavaPillars = new Array();
        this.arenaWallLavaBlockers = new Array();
        this.arenaWallPillarsSpawned = false;
        this.arenaWallPillarDeathTimer = 0;
    }

    protected createLavaPillarHazard(scene: Scene, basePoint: Vec2): VorrathLavaPillarHazard {
        const sprite = scene.add.sprite(this.lavaPillarImageKey, "PRIMARY");
        const center = new Vec2(basePoint.x, basePoint.y - this.lavaPillarHitboxHalfSize.y);
        sprite.position.copy(center);
        sprite.alpha = 0.95;

        return {
            sprite,
            basePoint: basePoint.clone(),
            center,
            halfSize: this.lavaPillarHitboxHalfSize.clone(),
            elapsed: 0,
            active: true
        };
    }

    protected createArenaWallBlocker(scene: Scene, basePoint: Vec2): Rect {
        const center = new Vec2(basePoint.x, basePoint.y - this.lavaPillarHitboxHalfSize.y);
        const blocker = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: center,
            size: this.lavaPillarHitboxHalfSize.scaled(2)
        });
        blocker.color = new Color(0, 0, 0, 0);
        blocker.borderColor = new Color(0, 0, 0, 0);
        blocker.addPhysics(new AABB(center.clone(), this.lavaPillarHitboxHalfSize.clone()), undefined, true, true);
        blocker.setGroup(MBPhysicsGroups.GROUND);
        return blocker;
    }

    protected selectTwoHandSlamPillarBasePoints(): void {
        const validCandidates = this.lavaPillarBasePoints.filter(point => Math.abs(point.x - this.owner.position.x) > this.lavaPillarBossClearDistance);
        const shuffledCandidates = validCandidates.map(point => point.clone());

        for(let i = shuffledCandidates.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffledCandidates[i];
            shuffledCandidates[i] = shuffledCandidates[j];
            shuffledCandidates[j] = temp;
        }

        this.selectedLavaPillarBasePoints = shuffledCandidates.slice(0, Math.min(this.lavaPillarSpawnCount, shuffledCandidates.length));
    }

    protected clearTwoHandSlamImpact(): void {
        this.twoHandSlamImpact = null;

        if(this.twoHandSlamImpactVisual !== null){
            this.twoHandSlamImpactVisual.destroy();
            this.twoHandSlamImpactVisual = null;
        }
    }

    protected updateShockwaveHitbox(deltaT: number): void {
        if(this.slamShockwave === null || !this.slamShockwave.active){
            return;
        }

        this.slamShockwave.elapsed += deltaT;
        this.slamShockwave.center.x += this.slamShockwaveSpeed * deltaT * this.slamShockwave.direction;
        this.slamShockwave.center.y = this.owner.position.y + this.slamShockwaveVerticalOffset;
        this.updateShockwaveVisuals();

        if(this.slamShockwave.elapsed >= this.slamActiveDuration){
            this.clearShockwaveHitbox();
        }
    }

    protected updateRockProjectile(deltaT: number): void {
        if(this.rockProjectile === null || !this.rockProjectile.active){
            return;
        }

        this.rockProjectile.elapsed += deltaT;
        this.rockProjectile.velocity.y += this.rockProjectileGravity * deltaT;
        this.rockProjectile.center.add(this.rockProjectile.velocity.scaled(deltaT));
        this.rockProjectile.sprite.position.copy(this.rockProjectile.center);
        this.rockProjectile.sprite.rotation += this.rockProjectileSpinSpeed * deltaT;

        this.tryApplyRockProjectileDamage();

        const tileRowCol = this.walls.getColRowAt(this.rockProjectile.center);
        const collidedWithGround = this.walls.isTileCollidable(tileRowCol.x, tileRowCol.y);
        const projectileExpired = this.rockProjectile.elapsed >= this.rockProjectileLifetime;
        const projectileFarAway = Math.abs(this.rockProjectile.center.x - this.owner.position.x) > 900 || this.rockProjectile.center.y > this.owner.position.y + 500;

        if(collidedWithGround || projectileExpired || projectileFarAway || this.rockProjectile.hasConnected){
            this.clearRockProjectile();
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

    protected tryApplyRockProjectileDamage(): void {
        if(this.rockProjectile === null || !this.rockProjectile.active || this.rockProjectile.hasConnected || !this.player.hasPhysics){
            return;
        }

        const projectileShape = new AABB(this.rockProjectile.center.clone(), this.rockProjectile.halfSize.clone());
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!projectileShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            const throwDirection = this.rockProjectile.velocity.x < 0 ? -1 : 1;
            playerController.applyDamage(this.rockThrowDamage, new Vec2(
                this.rockThrowKnockbackX * throwDirection,
                this.rockThrowKnockbackY
            ));
        }

        this.rockProjectile.hasConnected = true;
    }

    protected tryApplyLavaPillarDamage(pillar: VorrathLavaPillarHazard): void {
        if(!pillar.active || !this.player.hasPhysics){
            return;
        }

        const pillarShape = new AABB(pillar.center.clone(), pillar.halfSize.clone());
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!pillarShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            const knockbackDirection = pillar.center.x <= this.player.position.x ? 1 : -1;
            playerController.applyDamage(this.twoHandSlamDamage, new Vec2(
                this.twoHandSlamKnockbackX * knockbackDirection,
                this.twoHandSlamKnockbackY
            ));
        }
    }

    protected tryApplyTwoHandSlamImpactDamage(): void {
        if(this.twoHandSlamImpact === null || !this.twoHandSlamImpact.active || this.twoHandSlamImpact.hasConnected || !this.player.hasPhysics){
            return;
        }

        const impactShape = new AABB(this.twoHandSlamImpact.center.clone(), this.twoHandSlamImpact.halfSize.clone());
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!impactShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            const knockbackDirection = this.owner.position.x <= this.player.position.x ? 1 : -1;
            playerController.applyDamage(this.twoHandSlamDamage, new Vec2(
                this.twoHandSlamKnockbackX * knockbackDirection,
                this.twoHandSlamKnockbackY
            ));
        }

        this.twoHandSlamImpact.hasConnected = true;
    }

    protected clearPunchHitbox(): void {
        this.punchHitbox = null;
    }

    protected clearShockwaveHitbox(): void {
        this.slamShockwave = null;
        this.clearShockwaveVisuals();
    }

    protected clearRockProjectile(): void {
        if(this.rockProjectile?.sprite !== undefined){
            this.rockProjectile.sprite.destroy();
        }

        this.rockProjectile = null;
    }

    protected spawnShockwaveVisuals(): void {
        if(this.slamShockwave === null){
            return;
        }

        const scene = this.owner.getScene();
        this.slamShockwaveOuterVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: this.slamShockwave.center.clone(),
            size: new Vec2(this.slamShockwave.halfSize.x * 2 + 18, this.slamShockwave.halfSize.y * 2 + 8)
        });
        this.slamShockwaveOuterVisual.color = new Color(170, 32, 26, 0.24);
        this.slamShockwaveOuterVisual.borderColor = new Color(255, 118, 70, 0.72);
        this.slamShockwaveOuterVisual.borderWidth = 3;

        this.slamShockwaveCoreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: this.slamShockwave.center.clone(),
            size: new Vec2(this.slamShockwave.halfSize.x * 2, this.slamShockwave.halfSize.y * 2)
        });
        this.slamShockwaveCoreVisual.color = new Color(230, 82, 44, 0.34);
        this.slamShockwaveCoreVisual.borderColor = new Color(255, 212, 140, 0.55);
        this.slamShockwaveCoreVisual.borderWidth = 1;

        this.updateShockwaveVisuals();
    }

    protected updateShockwaveVisuals(): void {
        if(this.slamShockwave === null){
            return;
        }

        const lifeProgress = Math.min(1, this.slamShockwave.elapsed / Math.max(this.slamActiveDuration, 0.01));
        const widthPulse = 1 + 0.2 * lifeProgress;
        const coreAlpha = 0.34 * (1 - lifeProgress * 0.75);
        const outerAlpha = 0.24 * (1 - lifeProgress * 0.8);

        if(this.slamShockwaveOuterVisual !== null){
            this.slamShockwaveOuterVisual.position.copy(this.slamShockwave.center);
            this.slamShockwaveOuterVisual.size.set(
                (this.slamShockwave.halfSize.x * 2 + 18) * widthPulse,
                this.slamShockwave.halfSize.y * 2 + 8
            );
            this.slamShockwaveOuterVisual.color = new Color(170, 32, 26, outerAlpha);
            this.slamShockwaveOuterVisual.borderColor = new Color(255, 118, 70, Math.max(0.22, 0.72 - lifeProgress * 0.42));
        }

        if(this.slamShockwaveCoreVisual !== null){
            this.slamShockwaveCoreVisual.position.copy(this.slamShockwave.center);
            this.slamShockwaveCoreVisual.size.set(
                (this.slamShockwave.halfSize.x * 2) * widthPulse,
                this.slamShockwave.halfSize.y * 2
            );
            this.slamShockwaveCoreVisual.color = new Color(230, 82, 44, coreAlpha);
            this.slamShockwaveCoreVisual.borderColor = new Color(255, 212, 140, Math.max(0.12, 0.55 - lifeProgress * 0.3));
        }
    }

    protected clearShockwaveVisuals(): void {
        if(this.slamShockwaveOuterVisual !== null){
            this.slamShockwaveOuterVisual.destroy();
            this.slamShockwaveOuterVisual = null;
        }

        if(this.slamShockwaveCoreVisual !== null){
            this.slamShockwaveCoreVisual.destroy();
            this.slamShockwaveCoreVisual = null;
        }
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
