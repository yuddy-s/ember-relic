import ControllerAI from "../../Wolfie2D/AI/ControllerAI";
import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import Color from "../../Wolfie2D/Utils/Color";
import PlayerController from "../Player/PlayerController";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import Level4Boss, { FirstEmberAnimations, FirstEmberPhase } from "./Level4Boss";
import {
    DEFAULT_FIRST_EMBER_TUNING,
    FirstEmberAction,
    FirstEmberActions,
    FirstEmberAttackPhase,
    FirstEmberAttackPhases,
    FirstEmberBlackboard,
    FirstEmberBossTuning,
    FirstEmberPhaseTuning,
    FirstEmberWallAttackTuning
} from "./firstEmberConfig";

type FirstEmberControllerOptions = {
    bossState: Level4Boss;
    player: AnimatedSprite;
    tilemap: string;
    tuning?: FirstEmberBossTuning;
    soundKeys?: {
        phase1Dash: string;
        phase2Dash: string;
        slam: string;
        transition: string;
    };
    phaseTwoScriptedPoints?: {
        wallClingLeft: Vec2;
        wallClingRight: Vec2;
        wallDiveLandings: Vec2[];
        wallSpinSlamLandings: Vec2[];
    };
    explosionHazardImageKey?: string;
    explosionHazardPoints?: Vec2[];
};

type FirstEmberSceneHooks = {
    onFirstEmberPhaseTransitionStart?: (duration: number) => void;
    onFirstEmberPhaseTwoEntranceComplete?: () => void;
};

type FirstEmberGroundShockwave = {
    center: Vec2;
    halfSize: Vec2;
    direction: number;
    elapsed: number;
    duration: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    outerVisual: Rect | null;
    coreVisual: Rect | null;
};

type FirstEmberExplosionHazard = {
    sprite: Sprite;
    basePoint: Vec2;
    center: Vec2;
    halfSize: Vec2;
    elapsed: number;
    warningDuration: number;
    duration: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    outerVisual: Rect | null;
    coreVisual: Rect | null;
};

type FirstEmberAttackWarning = {
    center: Vec2;
    halfSize: Vec2;
    elapsed: number;
    duration: number;
    outerVisual: Rect | null;
    coreVisual: Rect | null;
};

export default class FirstEmberController extends ControllerAI {
    protected owner!: MBAnimatedSprite;
    protected bossState!: Level4Boss;
    protected player!: AnimatedSprite;
    protected walls!: OrthogonalTilemap;
    protected tuning!: FirstEmberBossTuning;
    protected phaseTuning!: FirstEmberPhaseTuning;

    protected velocity!: Vec2;
    protected gravity!: number;
    protected maxFallSpeed!: number;
    protected hitboxHalfSize!: Vec2;
    protected grounded!: boolean;

    protected currentAction!: FirstEmberAction;
    protected attackPhase!: FirstEmberAttackPhase;
    protected blackboard!: FirstEmberBlackboard;
    protected actionTimer!: number;
    protected actionDecisionTimer!: number;
    protected playerAboveTimer!: number;
    protected queuedComboActions!: FirstEmberAction[];
    protected comboChainCount!: number;
    protected pursueDelayTimer!: number;

    protected mountedSlashCooldownTimer!: number;
    protected mountedDashCooldownTimer!: number;
    protected mountedSlamCooldownTimer!: number;
    protected uppercutCooldownTimer!: number;
    protected phase2SpinSlamCooldownTimer!: number;
    protected crossDashCooldownTimer!: number;
    protected wallDiveCooldownTimer!: number;
    protected wallSpinSlamCooldownTimer!: number;

    protected attackHitboxActive!: boolean;
    protected attackHitboxCenter!: Vec2;
    protected attackHitboxHalfSize!: Vec2;
    protected attackHitboxOffset!: Vec2;
    protected attackHasConnected!: boolean;

    protected phaseTransitionTimer!: number;
    protected phaseTwoEntranceStarted!: boolean;
    protected deathSequenceStarted!: boolean;
    protected dashStartX!: number;

    protected wallClingLeft!: Vec2;
    protected wallClingRight!: Vec2;
    protected wallDiveLandings!: Vec2[];
    protected wallSpinSlamLandings!: Vec2[];
    protected explosionHazardPoints!: Vec2[];
    protected scriptedPerchPoint!: Vec2;
    protected scriptedLandingPoint!: Vec2;
    protected scriptedDashStartPoint!: Vec2;
    protected slamImpactTriggered!: boolean;
    protected slamShockwaves!: FirstEmberGroundShockwave[];
    protected explosionHazards!: FirstEmberExplosionHazard[];
    protected explosionHazardCooldownTimer!: number;
    protected explosionHazardImageKey!: string;
    protected pathAttackHitboxActive!: boolean;
    protected attackWarning!: FirstEmberAttackWarning | null;
    protected secondaryAttackWarning!: FirstEmberAttackWarning | null;
    protected dashAuraOuter!: Rect | null;
    protected dashAuraCore!: Rect | null;
    protected phase1DashSoundKey!: string;
    protected phase2DashSoundKey!: string;
    protected slamSoundKey!: string;
    protected transitionSoundKey!: string;
    protected slamSoundPlayedThisAction!: boolean;
    protected teleportSpinSlamQueued!: boolean;
    protected teleportSpinSlamTarget!: Vec2;
    protected phaseOneForcedDashTimer!: number;
    protected phaseOneForcedDashReady!: boolean;
    protected phaseTwoTeleportSlamTimer!: number;
    protected phaseTwoHazardTimer!: number;
    protected timedTeleportSpinSlamReady!: boolean;
    protected phaseTwoForcedIdleTimer!: number;
    protected phaseTwoForcedIdleActive!: boolean;
    protected phaseTwoForcedIdleCooldownTimer!: number;

    public initializeAI(owner: MBAnimatedSprite, options: FirstEmberControllerOptions): void {
        this.owner = owner;
        this.bossState = options.bossState;
        this.player = options.player;
        this.walls = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
        this.tuning = options.tuning ?? DEFAULT_FIRST_EMBER_TUNING;
        this.phaseTuning = this.tuning.phase1;

        this.velocity = Vec2.ZERO;
        this.gravity = this.tuning.gravity;
        this.maxFallSpeed = this.tuning.maxFallSpeed;
        this.hitboxHalfSize = this.tuning.hitboxHalfSize.clone();
        this.grounded = false;

        this.currentAction = FirstEmberActions.IDLE;
        this.attackPhase = FirstEmberAttackPhases.NONE;
        this.blackboard = {
            deltaX: 0,
            absDeltaX: 0,
            deltaY: 0,
            absDeltaY: 0,
            playerOnLeft: false,
            playerInCloseRange: false,
            playerInMidRange: false,
            playerInChargeLane: false,
            playerInSlamRange: false,
            playerFarAway: false,
            playerAboveBoss: false
        };
        this.actionTimer = 0;
        this.actionDecisionTimer = 0;
        this.playerAboveTimer = 0;
        this.queuedComboActions = [];
        this.comboChainCount = 0;
        this.pursueDelayTimer = 0;

        this.mountedSlashCooldownTimer = 0;
        this.mountedDashCooldownTimer = 0;
        this.mountedSlamCooldownTimer = 0;
        this.uppercutCooldownTimer = 0;
        this.phase2SpinSlamCooldownTimer = 0;
        this.crossDashCooldownTimer = 0;
        this.wallDiveCooldownTimer = 0;
        this.wallSpinSlamCooldownTimer = 0;
        this.explosionHazardCooldownTimer = 0;

        this.attackHitboxActive = false;
        this.attackHitboxCenter = Vec2.ZERO;
        this.attackHitboxHalfSize = Vec2.ZERO;
        this.attackHitboxOffset = Vec2.ZERO;
        this.attackHasConnected = false;
        this.pathAttackHitboxActive = false;

        this.phaseTransitionTimer = 0;
        this.phaseTwoEntranceStarted = false;
        this.deathSequenceStarted = false;
        this.dashStartX = this.owner.position.x;

        this.wallClingLeft = options.phaseTwoScriptedPoints?.wallClingLeft.clone() ?? this.owner.position.clone().add(new Vec2(-180, -120));
        this.wallClingRight = options.phaseTwoScriptedPoints?.wallClingRight.clone() ?? this.owner.position.clone().add(new Vec2(180, -120));
        this.wallDiveLandings = (options.phaseTwoScriptedPoints?.wallDiveLandings ?? [this.owner.position.clone()]).map(point => point.clone());
        this.wallSpinSlamLandings = (options.phaseTwoScriptedPoints?.wallSpinSlamLandings ?? [this.owner.position.clone()]).map(point => point.clone());
        this.explosionHazardPoints = (
            options.explosionHazardPoints
            ?? options.phaseTwoScriptedPoints?.wallDiveLandings
            ?? [this.owner.position.clone()]
        ).map(point => point.clone());
        this.scriptedPerchPoint = this.wallClingRight.clone();
        this.scriptedLandingPoint = this.owner.position.clone();
        this.scriptedDashStartPoint = this.owner.position.clone();
        this.slamImpactTriggered = false;
        this.slamShockwaves = [];
        this.explosionHazards = [];
        this.attackWarning = null;
        this.secondaryAttackWarning = null;
        this.dashAuraOuter = null;
        this.dashAuraCore = null;
        this.explosionHazardImageKey = options.explosionHazardImageKey ?? "FIRST_EMBER_EXPLOSION";
        this.phase1DashSoundKey = options.soundKeys?.phase1Dash ?? "FIRST_EMBER_PHASE1_DASH";
        this.phase2DashSoundKey = options.soundKeys?.phase2Dash ?? "FIRST_EMBER_PHASE2_DASH";
        this.slamSoundKey = options.soundKeys?.slam ?? "FIRST_EMBER_SLAM";
        this.transitionSoundKey = options.soundKeys?.transition ?? "FIRST_EMBER_TRANSITION";
        this.slamSoundPlayedThisAction = false;
        this.teleportSpinSlamQueued = false;
        this.teleportSpinSlamTarget = this.owner.position.clone();
        this.phaseOneForcedDashTimer = 0;
        this.phaseOneForcedDashReady = false;
        this.phaseTwoTeleportSlamTimer = 0;
        this.phaseTwoHazardTimer = 0;
        this.timedTeleportSpinSlamReady = false;
        this.phaseTwoForcedIdleTimer = 0;
        this.phaseTwoForcedIdleActive = false;
        this.phaseTwoForcedIdleCooldownTimer = 0;

        this.owner.animation.play(FirstEmberAnimations.PHASE1_IDLE, true);
    }

    public activate(_options: Record<string, any>): void {}

    public handleEvent(_event: GameEvent): void {}

    public update(deltaT: number): void {
        if(
            this.owner === undefined
            || this.player === undefined
            || this.bossState === undefined
            || this.walls === undefined
        ){
            return;
        }

        const deltaX = this.player.position.x - this.owner.position.x;
        const deltaY = this.player.position.y - this.owner.position.y;

        this.owner.invertX = deltaX < 0;
        this.updateBlackboard(deltaX, deltaY);
        this.updateCooldowns(deltaT);
        this.updatePlayerAboveTimer(deltaT);
        this.updateAttackWarning(deltaT);
        this.updateSlamShockwaves(deltaT);
        this.updateExplosionHazards(deltaT);
        this.updateDashAura(deltaT);
        this.updatePhaseOneSpecialTimers(deltaT);
        this.updatePhaseTwoSpecialTimers(deltaT);

        if(this.shouldTriggerPhaseTransition()){
            this.startPhaseTransition();
        }

        if(this.bossState.getPhase() === FirstEmberPhase.TRANSITION){
            this.updatePhaseTransition(deltaT);
            return;
        }

        if(this.bossState.isDefeated()){
            this.updateDeath();
            return;
        }

        if(!this.bossState.hasFightStarted() && this.blackboard.absDeltaX <= this.phaseTuning.aggroRange){
            this.bossState.startFight();
        }

        if(!this.bossState.hasFightStarted()){
            this.playIdleAnimation();
            return;
        }

        if(this.bossState.getPhase() === FirstEmberPhase.PHASE_2 && !this.phaseTwoEntranceStarted){
            this.startPhaseTwoEntrance();
        }

        if(this.currentAction === FirstEmberActions.PHASE2_ENTRANCE){
            this.updatePhaseTwoEntrance();
            return;
        }

        if(this.currentAction === FirstEmberActions.PHASE1_SLASH){
            this.updateMountedSlash(deltaT);
            return;
        }

        if(this.currentAction === FirstEmberActions.PHASE1_DASH){
            this.updateMountedDash(deltaT);
            return;
        }

        if(this.currentAction === FirstEmberActions.PHASE1_SLAM){
            this.updateMountedSlam(deltaT);
            return;
        }

        if(this.currentAction === FirstEmberActions.PHASE2_UPPERCUT){
            this.updateUppercut(deltaT);
            return;
        }

        if(this.currentAction === FirstEmberActions.PHASE2_SPIN_SLAM){
            this.updatePhase2SpinSlam(deltaT);
            return;
        }

        if(this.currentAction === FirstEmberActions.PHASE2_CROSS_DASH){
            this.updateCrossDash(deltaT);
            return;
        }

        if(this.currentAction === FirstEmberActions.PHASE2_WALL_DIVE){
            this.updateScriptedWallAttack(this.tuning.wallDive, false);
            return;
        }

        if(this.currentAction === FirstEmberActions.PHASE2_WALL_SPIN_SLAM){
            this.updateScriptedWallAttack(this.tuning.wallSpinSlam, true);
            return;
        }

        if(this.phaseTwoForcedIdleActive){
            this.updateForcedIdle(deltaT);
            return;
        }

        this.maybeSpawnPhaseTwoExplosionHazard();
        this.maybeSpawnFarExplosionHazard();

        const nextAction = this.selectNextAction();
        if(nextAction !== null){
            this.startAction(nextAction);
            return;
        }

        this.updatePursuit(deltaT);
    }

    protected updateBlackboard(deltaX: number, deltaY: number): void {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        this.blackboard.deltaX = deltaX;
        this.blackboard.absDeltaX = absDeltaX;
        this.blackboard.deltaY = deltaY;
        this.blackboard.absDeltaY = absDeltaY;
        this.blackboard.playerOnLeft = deltaX < 0;
        this.blackboard.playerInCloseRange = absDeltaX <= this.phaseTuning.closeRange;
        this.blackboard.playerInMidRange = absDeltaX <= this.phaseTuning.midRange;
        this.blackboard.playerInChargeLane = absDeltaY <= this.phaseTuning.chargeLaneThreshold;
        this.blackboard.playerInSlamRange = absDeltaX <= this.phaseTuning.closeRange + 18;
        this.blackboard.playerFarAway = absDeltaX >= this.phaseTuning.farRange;
        this.blackboard.playerAboveBoss = deltaY < -8;
    }

    protected updateCooldowns(deltaT: number): void {
        this.actionTimer += deltaT;
        this.actionDecisionTimer = Math.max(0, this.actionDecisionTimer - deltaT);
        this.mountedSlashCooldownTimer = Math.max(0, this.mountedSlashCooldownTimer - deltaT);
        this.mountedDashCooldownTimer = Math.max(0, this.mountedDashCooldownTimer - deltaT);
        this.mountedSlamCooldownTimer = Math.max(0, this.mountedSlamCooldownTimer - deltaT);
        this.uppercutCooldownTimer = Math.max(0, this.uppercutCooldownTimer - deltaT);
        this.phase2SpinSlamCooldownTimer = Math.max(0, this.phase2SpinSlamCooldownTimer - deltaT);
        this.crossDashCooldownTimer = Math.max(0, this.crossDashCooldownTimer - deltaT);
        this.wallDiveCooldownTimer = Math.max(0, this.wallDiveCooldownTimer - deltaT);
        this.wallSpinSlamCooldownTimer = Math.max(0, this.wallSpinSlamCooldownTimer - deltaT);
        this.explosionHazardCooldownTimer = Math.max(0, this.explosionHazardCooldownTimer - deltaT);
    }

    protected updatePlayerAboveTimer(deltaT: number): void {
        if(this.bossState.getPhase() !== FirstEmberPhase.PHASE_2){
            this.playerAboveTimer = 0;
            return;
        }

        if(this.blackboard.playerAboveBoss){
            this.playerAboveTimer += deltaT;
            return;
        }

        this.playerAboveTimer = 0;
    }

    protected updatePhaseOneSpecialTimers(deltaT: number): void {
        if(
            this.bossState.getPhase() !== FirstEmberPhase.PHASE_1
            || !this.bossState.hasFightStarted()
            || this.currentAction === FirstEmberActions.PHASE1_TRANSITION
            || this.currentAction === FirstEmberActions.DYING
        ){
            this.phaseOneForcedDashTimer = 0;
            this.phaseOneForcedDashReady = false;
            return;
        }

        this.phaseOneForcedDashTimer += deltaT;
        if(this.phaseOneForcedDashTimer >= 15){
            this.phaseOneForcedDashReady = true;
        }
    }

    protected updatePhaseTwoSpecialTimers(deltaT: number): void {
        if(
            this.bossState.getPhase() !== FirstEmberPhase.PHASE_2
            || !this.bossState.hasFightStarted()
            || this.currentAction === FirstEmberActions.PHASE2_ENTRANCE
            || this.currentAction === FirstEmberActions.DYING
        ){
            this.phaseTwoTeleportSlamTimer = 0;
            this.phaseTwoHazardTimer = 0;
            this.timedTeleportSpinSlamReady = false;
            this.phaseTwoForcedIdleTimer = 0;
            this.phaseTwoForcedIdleActive = false;
            this.phaseTwoForcedIdleCooldownTimer = 0;
            return;
        }

        if(this.phaseTwoForcedIdleActive){
            this.phaseTwoForcedIdleTimer += deltaT;
            return;
        }

        this.phaseTwoTeleportSlamTimer += deltaT;
        this.phaseTwoHazardTimer += deltaT;
        this.phaseTwoForcedIdleCooldownTimer += deltaT;

        if(this.phaseTwoTeleportSlamTimer >= 12){
            this.timedTeleportSpinSlamReady = true;
        }

        if(this.phaseTwoForcedIdleCooldownTimer >= 20){
            this.startForcedIdle();
        }
    }

    protected startForcedIdle(): void {
        this.phaseTwoForcedIdleActive = true;
        this.phaseTwoForcedIdleTimer = 0;
        this.phaseTwoForcedIdleCooldownTimer = 0;
        this.currentAction = FirstEmberActions.IDLE;
        this.attackPhase = FirstEmberAttackPhases.NONE;
        this.actionTimer = 0;
        this.velocity = Vec2.ZERO;
        this.disableAttackHitbox();
        this.clearAttackWarning();
        this.clearDashAura();
        this.queuedComboActions = [];
        this.comboChainCount = 0;
        this.playIdleAnimation();
    }

    protected updateForcedIdle(deltaT: number): void {
        this.currentAction = FirstEmberActions.IDLE;
        this.velocity = Vec2.ZERO;
        this.applyGravity(deltaT);
        this.owner.move(this.resolveMovement(deltaT));
        this.playIdleAnimation();

        if(this.phaseTwoForcedIdleTimer >= 2){
            this.phaseTwoForcedIdleActive = false;
            this.phaseTwoForcedIdleTimer = 0;
            this.actionDecisionTimer = Math.max(this.actionDecisionTimer, 0.15);
        }
    }

    protected shouldTriggerPhaseTransition(): boolean {
        return this.bossState.getPhase() === FirstEmberPhase.PHASE_1
            && !this.bossState.hasTriggeredPhaseTransition()
            && this.bossState.getCurrentHealth() <= 0;
    }

    protected startPhaseTransition(): void {
        this.bossState.triggerPhaseTransition();
        this.currentAction = FirstEmberActions.PHASE1_TRANSITION;
        this.attackPhase = FirstEmberAttackPhases.NONE;
        this.actionTimer = 0;
        this.phaseTransitionTimer = 0;
        this.velocity = Vec2.ZERO;
        this.disableAttackHitbox();
        this.clearAttackWarning();
        this.clearSlamShockwaves();
        this.clearExplosionHazards();
        this.clearDashAura();
        this.owner.animation.play(FirstEmberAnimations.PHASE1_TRANSITION, false);
        this.playBossSfx(this.transitionSoundKey);
        this.getSceneHooks().onFirstEmberPhaseTransitionStart?.(
            this.tuning.transition.smokeDuration + this.tuning.transition.entranceDelay
        );

        const playerController = this.player.ai as PlayerController | undefined;
        if(playerController !== undefined){
            playerController.health = Math.ceil(
                playerController.maxHealth * this.tuning.transition.playerHealPercentOnTransition
            );
        }
    }

    protected updatePhaseTransition(deltaT: number): void {
        this.phaseTransitionTimer += deltaT;
        if(this.phaseTransitionTimer < this.tuning.transition.smokeDuration + this.tuning.transition.entranceDelay){
            return;
        }

        this.bossState.enterPhaseTwo(this.tuning.transition.phaseTwoMaxHealth);
        this.phaseTuning = this.tuning.phase2;
        this.phaseTwoEntranceStarted = false;
    }

    protected startPhaseTwoEntrance(): void {
        this.phaseTwoEntranceStarted = true;
        this.currentAction = FirstEmberActions.PHASE2_ENTRANCE;
        this.attackPhase = FirstEmberAttackPhases.NONE;
        this.actionTimer = 0;
        this.velocity = Vec2.ZERO;
        this.owner.animation.play(FirstEmberAnimations.PHASE2_ENTRANCE, false);
    }

    protected updatePhaseTwoEntrance(): void {
        if(this.owner.animation.isPlaying(FirstEmberAnimations.PHASE2_ENTRANCE)){
            return;
        }

        this.currentAction = FirstEmberActions.IDLE;
        this.playIdleAnimation();
        this.getSceneHooks().onFirstEmberPhaseTwoEntranceComplete?.();
    }

    protected updateDeath(): void {
        if(this.deathSequenceStarted){
            if(!this.owner.animation.isPlaying(FirstEmberAnimations.DYING)){
                this.owner.visible = false;
                if(this.owner.hasPhysics){
                    this.owner.disablePhysics();
                }
            }
            return;
        }

        this.deathSequenceStarted = true;
        this.currentAction = FirstEmberActions.DYING;
        this.velocity = Vec2.ZERO;
        this.disableAttackHitbox();
        this.clearAttackWarning();
        this.clearSlamShockwaves();
        this.clearExplosionHazards();
        this.clearDashAura();
        this.owner.animation.play(FirstEmberAnimations.DYING, false);
        this.playBossSfx(this.transitionSoundKey);
    }

    protected selectNextAction(): FirstEmberAction | null {
        if(this.actionDecisionTimer > 0){
            return null;
        }

        if(this.queuedComboActions.length > 0){
            return this.queuedComboActions.shift() ?? null;
        }

        this.actionDecisionTimer = this.phaseTuning.decisionInterval;
        if(this.bossState.getPhase() === FirstEmberPhase.PHASE_1){
            return this.selectPhaseOneAction();
        }

        return this.selectPhaseTwoAction();
    }

    protected selectPhaseOneAction(): FirstEmberAction | null {
        if(this.phaseOneForcedDashReady && this.mountedDashCooldownTimer === 0){
            this.phaseOneForcedDashReady = false;
            this.phaseOneForcedDashTimer = 0;
            return FirstEmberActions.PHASE1_DASH;
        }

        if(this.blackboard.playerInCloseRange && this.mountedSlashCooldownTimer === 0){
            return FirstEmberActions.PHASE1_SLASH;
        }

        if(
            this.blackboard.absDeltaX >= this.phaseTuning.closeRange + 16
            && this.blackboard.playerInChargeLane
            && this.mountedDashCooldownTimer === 0
        ){
            return FirstEmberActions.PHASE1_DASH;
        }

        if(
            this.blackboard.playerInSlamRange
            && this.blackboard.playerInChargeLane
            && this.mountedSlamCooldownTimer === 0
        ){
            return FirstEmberActions.PHASE1_SLAM;
        }

        return null;
    }

    protected selectPhaseTwoAction(): FirstEmberAction | null {
        if(this.timedTeleportSpinSlamReady){
            this.timedTeleportSpinSlamReady = false;
            this.phaseTwoTeleportSlamTimer = 0;
            this.teleportSpinSlamQueued = true;
            this.teleportSpinSlamTarget = this.getTimedTeleportSpinSlamTarget();
            this.phase2SpinSlamCooldownTimer = 0;
            return FirstEmberActions.PHASE2_SPIN_SLAM;
        }

        if(this.blackboard.playerInCloseRange && this.uppercutCooldownTimer === 0){
            return FirstEmberActions.PHASE2_UPPERCUT;
        }

        if(
            this.blackboard.absDeltaX >= this.phaseTuning.closeRange + 24
            && this.blackboard.playerInChargeLane
            && this.crossDashCooldownTimer === 0
        ){
            return FirstEmberActions.PHASE2_CROSS_DASH;
        }

        if(
            this.blackboard.playerFarAway
            && this.wallDiveCooldownTimer === 0
        ){
            return FirstEmberActions.PHASE2_WALL_DIVE;
        }

        if(
            this.blackboard.absDeltaX <= this.phaseTuning.closeRange + 8
            && this.phase2SpinSlamCooldownTimer === 0
        ){
            return FirstEmberActions.PHASE2_SPIN_SLAM;
        }

        if(
            this.blackboard.absDeltaX <= this.phaseTuning.midRange + 40
            && !this.blackboard.playerInChargeLane
            && this.wallSpinSlamCooldownTimer === 0
        ){
            return FirstEmberActions.PHASE2_WALL_SPIN_SLAM;
        }

        return null;
    }

    protected startAction(action: FirstEmberAction): void {
        this.currentAction = action;
        this.actionTimer = 0;
        this.attackPhase = FirstEmberAttackPhases.WINDUP;
        this.attackHasConnected = false;
        this.disableAttackHitbox();
        this.clearAttackWarning();
        this.dashStartX = this.owner.position.x;
        this.slamImpactTriggered = false;
        this.slamSoundPlayedThisAction = false;
        if(action !== FirstEmberActions.PHASE2_SPIN_SLAM){
            this.teleportSpinSlamQueued = false;
        }

        if(action === FirstEmberActions.PHASE1_SLASH){
            this.mountedSlashCooldownTimer = this.tuning.mountedSlash.cooldown;
            this.owner.animation.play(FirstEmberAnimations.PHASE1_SLASH, false);
            return;
        }

        if(action === FirstEmberActions.PHASE1_DASH){
            this.mountedDashCooldownTimer = this.tuning.mountedDash.cooldown;
            this.dashStartX = this.owner.position.x;
            this.owner.animation.play(FirstEmberAnimations.PHASE1_DASH, false);
            this.playBossSfx(this.phase1DashSoundKey);
            return;
        }

        if(action === FirstEmberActions.PHASE1_SLAM){
            this.mountedSlamCooldownTimer = this.tuning.mountedSlam.cooldown;
            this.owner.animation.play(FirstEmberAnimations.PHASE1_SLAM, false);
            this.startMountedSlamWarning();
            return;
        }

        if(action === FirstEmberActions.PHASE2_UPPERCUT){
            this.uppercutCooldownTimer = this.tuning.uppercut.cooldown;
            this.owner.animation.play(FirstEmberAnimations.PHASE2_UPPERCUT, false);
            return;
        }

        if(action === FirstEmberActions.PHASE2_SPIN_SLAM){
            this.phase2SpinSlamCooldownTimer = this.tuning.phase2SpinSlam.cooldown;
            this.owner.animation.play(FirstEmberAnimations.PHASE2_SPIN_SLAM, false);
            if(this.teleportSpinSlamQueued){
                this.startDarkAttackWarning(
                    this.player.position.clone(),
                    this.tuning.phase2SpinSlam.warningHalfSize,
                    this.tuning.phase2SpinSlam.warningDuration
                );
                this.startSecondaryDarkAttackWarning(
                    this.owner.position.clone(),
                    this.tuning.phase2SpinSlam.warningHalfSize,
                    this.tuning.phase2SpinSlam.warningDuration
                );
            } else {
                this.startLandingWarning(
                    this.owner.position.clone(),
                    this.tuning.phase2SpinSlam.warningHalfSize,
                    this.tuning.phase2SpinSlam.warningDuration
                );
            }
            return;
        }

        if(action === FirstEmberActions.PHASE2_CROSS_DASH){
            this.crossDashCooldownTimer = this.tuning.crossDash.cooldown;
            this.dashStartX = this.owner.position.x;
            this.owner.animation.play(FirstEmberAnimations.PHASE2_CROSS_DASH, false);
            this.startCrossDashWarning();
            this.playBossSfx(this.phase2DashSoundKey);
            return;
        }

        this.scriptedPerchPoint = this.getSelectedWallPerch().clone();
        this.scriptedLandingPoint = this.getSelectedLandingPoint(action).clone();
        this.scriptedDashStartPoint = this.scriptedPerchPoint.clone();
        this.owner.position.copy(this.scriptedPerchPoint);
        this.velocity = Vec2.ZERO;
        this.owner.invertX = this.scriptedLandingPoint.x < this.owner.position.x;

        if(action === FirstEmberActions.PHASE2_WALL_DIVE){
            this.wallDiveCooldownTimer = this.tuning.wallDive.cooldown;
            this.playerAboveTimer = 0;
            this.owner.animation.play(FirstEmberAnimations.PHASE2_WALL_DIVE, false);
            this.startWallDashWarning(
                this.scriptedPerchPoint,
                this.scriptedLandingPoint,
                this.tuning.wallDive.warningDuration
            );
            return;
        }

        if(action === FirstEmberActions.PHASE2_WALL_SPIN_SLAM){
            this.wallSpinSlamCooldownTimer = this.tuning.wallSpinSlam.cooldown;
            this.playerAboveTimer = 0;
            this.owner.animation.play(FirstEmberAnimations.PHASE2_WALL_SPIN_SLAM, false);
            this.startWallDashWarning(
                this.scriptedPerchPoint,
                this.scriptedLandingPoint,
                this.tuning.wallSpinSlam.warningDuration
            );
        }
    }

    protected updatePursuit(deltaT: number): void {
        if(this.currentAction !== FirstEmberActions.PURSUE){
            this.currentAction = FirstEmberActions.PURSUE;
            this.pursueDelayTimer = 0.2;
        }

        if(this.pursueDelayTimer > 0){
            this.pursueDelayTimer = Math.max(0, this.pursueDelayTimer - deltaT);
            this.velocity.x = 0;
            this.applyGravity(deltaT);
            this.owner.move(this.resolveMovement(deltaT));
            this.playIdleAnimation();
            return;
        }

        const direction = this.blackboard.deltaX === 0 ? 0 : Math.sign(this.blackboard.deltaX);
        this.velocity.x = direction * this.phaseTuning.moveSpeed;
        this.applyGravity(deltaT);
        this.owner.move(this.resolveMovement(deltaT));

        if(direction === 0){
            this.playIdleAnimation();
        } else {
            this.playWalkAnimation();
        }
    }

    protected updateMountedSlash(deltaT: number): void {
        this.advanceAttackPhases(
            deltaT,
            this.tuning.mountedSlash.windup,
            this.tuning.mountedSlash.active,
            this.tuning.mountedSlash.recovery,
            this.tuning.mountedSlash.hitboxOffset,
            this.tuning.mountedSlash.hitboxHalfSize,
            this.tuning.mountedSlash.damage,
            this.tuning.mountedSlash.knockbackX,
            this.tuning.mountedSlash.knockbackY
        );
    }

    protected updateMountedDash(deltaT: number): void {
        if(this.attackPhase === FirstEmberAttackPhases.ACTIVE){
            const direction = this.owner.invertX ? -1 : 1;
            this.velocity.x = direction * this.tuning.mountedDash.dashSpeed;
            if(Math.abs(this.owner.position.x - this.dashStartX) >= this.tuning.mountedDash.maxTravelDistance){
                this.attackPhase = FirstEmberAttackPhases.RECOVERY;
                this.actionTimer = 0;
                this.disableAttackHitbox();
                this.velocity.x = 0;
            }
        }

        this.advanceAttackPhases(
            deltaT,
            this.tuning.mountedDash.windup,
            this.tuning.mountedDash.active,
            this.tuning.mountedDash.recovery,
            this.tuning.mountedDash.hitboxOffset,
            this.tuning.mountedDash.hitboxHalfSize,
            this.tuning.mountedDash.damage,
            this.tuning.mountedDash.knockbackX,
            this.tuning.mountedDash.knockbackY
        );
    }

    protected updateMountedSlam(deltaT: number): void {
        if(this.attackPhase === FirstEmberAttackPhases.WINDUP){
            const direction = this.blackboard.deltaX === 0 ? 0 : Math.sign(this.blackboard.deltaX);
            this.velocity.x = direction * Math.max(this.phaseTuning.moveSpeed * 1.8, 72);
        }

        this.applyGravity(deltaT);
        this.owner.move(this.resolveMovement(deltaT));
        this.refreshAttackHitboxPosition();

        if(this.attackPhase === FirstEmberAttackPhases.WINDUP && this.actionTimer >= this.tuning.mountedSlam.windup){
            this.attackPhase = FirstEmberAttackPhases.ACTIVE;
            this.actionTimer = 0;
            this.clearAttackWarning();
            this.enableAttackHitbox(this.tuning.mountedSlam.hitboxOffset, this.tuning.mountedSlam.hitboxHalfSize);
            return;
        }

        if(this.attackPhase === FirstEmberAttackPhases.ACTIVE){
            const direction = this.owner.invertX ? -1 : 1;
            this.velocity.x = direction * Math.max(this.phaseTuning.moveSpeed * 1.1, 46);
            this.tryApplyAttackDamage(
                this.tuning.mountedSlam.damage,
                this.tuning.mountedSlam.knockbackX,
                this.tuning.mountedSlam.knockbackY
            );
            if(this.actionTimer >= this.tuning.mountedSlam.active){
                this.triggerGroundSlamAura(
                    this.tuning.wallDive.shockwaveHalfSize,
                    this.tuning.wallDive.shockwaveGap,
                    this.tuning.wallDive.shockwaveDuration,
                    this.tuning.wallDive.shockwaveDamage,
                    this.tuning.wallDive.shockwaveKnockbackX,
                    this.tuning.wallDive.shockwaveKnockbackY,
                    this.owner.position.clone()
                );
                this.attackPhase = FirstEmberAttackPhases.RECOVERY;
                this.actionTimer = 0;
                this.disableAttackHitbox();
                this.velocity.x = 0;
            }
            return;
        }

        this.finishRecovery(this.tuning.mountedSlam.recovery);
    }

    protected updateUppercut(deltaT: number): void {
        this.advanceAttackPhases(
            deltaT,
            this.tuning.uppercut.windup,
            this.tuning.uppercut.active,
            this.tuning.uppercut.recovery,
            this.tuning.uppercut.hitboxOffset,
            this.tuning.uppercut.hitboxHalfSize,
            this.tuning.uppercut.damage,
            this.tuning.uppercut.knockbackX,
            this.tuning.uppercut.knockbackY
        );
    }

    protected updatePhase2SpinSlam(deltaT: number): void {
        this.applyGravity(deltaT);
        this.owner.move(this.resolveMovement(deltaT));
        this.refreshAttackHitboxPosition();

        if(this.attackPhase === FirstEmberAttackPhases.WINDUP){
            this.tryPlayDelayedSlamSfx(this.tuning.phase2SpinSlam.slamSoundDelay);
        }

        if(this.attackPhase === FirstEmberAttackPhases.WINDUP && this.actionTimer >= this.tuning.phase2SpinSlam.windup){
            if(this.teleportSpinSlamQueued){
                this.owner.position.copy(this.teleportSpinSlamTarget);
                this.velocity = Vec2.ZERO;
                this.teleportSpinSlamQueued = false;
            }
            this.attackPhase = FirstEmberAttackPhases.ACTIVE;
            this.actionTimer = 0;
            this.clearAttackWarning();
            this.enableAttackHitbox(
                this.tuning.phase2SpinSlam.hitboxOffset,
                this.tuning.phase2SpinSlam.hitboxHalfSize
            );
            return;
        }

        if(this.attackPhase === FirstEmberAttackPhases.ACTIVE){
            this.tryApplyAttackDamage(
                this.tuning.phase2SpinSlam.damage,
                this.tuning.phase2SpinSlam.knockbackX,
                this.tuning.phase2SpinSlam.knockbackY
            );
            if(this.actionTimer >= this.tuning.phase2SpinSlam.active){
                if(!this.slamSoundPlayedThisAction){
                    this.playBossSfx(this.slamSoundKey);
                    this.slamSoundPlayedThisAction = true;
                }
                this.triggerGroundSlamAura(
                    this.tuning.wallSpinSlam.shockwaveHalfSize,
                    this.tuning.wallSpinSlam.shockwaveGap,
                    this.tuning.wallSpinSlam.shockwaveDuration,
                    this.tuning.wallSpinSlam.shockwaveDamage,
                    this.tuning.wallSpinSlam.shockwaveKnockbackX,
                    this.tuning.wallSpinSlam.shockwaveKnockbackY,
                    this.owner.position.clone()
                );
                this.attackPhase = FirstEmberAttackPhases.RECOVERY;
                this.actionTimer = 0;
                this.disableAttackHitbox();
                this.velocity.x = 0;
            }
            return;
        }

        this.finishRecovery(this.tuning.phase2SpinSlam.recovery);
    }

    protected updateCrossDash(deltaT: number): void {
        if(this.attackPhase === FirstEmberAttackPhases.ACTIVE){
            const direction = this.owner.invertX ? -1 : 1;
            this.velocity.x = direction * this.tuning.crossDash.dashSpeed;
            if(Math.abs(this.owner.position.x - this.dashStartX) >= this.phaseTuning.farRange * 1.5){
                this.attackPhase = FirstEmberAttackPhases.RECOVERY;
                this.actionTimer = 0;
                this.disableAttackHitbox();
                this.velocity.x = 0;
            }
        } else {
            this.velocity.x = 0;
        }

        this.advanceAttackPhases(
            deltaT,
            this.tuning.crossDash.windup,
            this.tuning.crossDash.active,
            this.tuning.crossDash.recovery,
            this.tuning.crossDash.hitboxOffset,
            this.tuning.crossDash.hitboxHalfSize,
            this.tuning.crossDash.damage,
            this.tuning.crossDash.knockbackX,
            this.tuning.crossDash.knockbackY
        );
    }

    protected updateScriptedWallAttack(tuning: FirstEmberWallAttackTuning, spawnShockwave: boolean): void {
        if(this.attackPhase === FirstEmberAttackPhases.WINDUP){
            this.tryPlayDelayedSlamSfx(tuning.slamSoundDelay);
            if(this.wallHangReached(tuning.wallHangDuration)){
                this.attackPhase = FirstEmberAttackPhases.ACTIVE;
                this.actionTimer = 0;
                this.scriptedDashStartPoint = this.owner.position.clone();
                this.clearAttackWarning();
            }
            return;
        }

        if(this.attackPhase === FirstEmberAttackPhases.ACTIVE){
            this.updateScriptedDashToLanding(tuning.dashDuration);
            if(!this.attackHitboxActive && this.actionTimer >= tuning.hitboxDelay){
                this.enablePathAttackHitbox(this.scriptedDashStartPoint, this.scriptedLandingPoint, tuning.hitboxHalfSize);
            }
            if(this.attackHitboxActive){
                this.tryApplyAttackDamage(tuning.damage, tuning.knockbackX, tuning.knockbackY);
            }

            if(this.actionTimer >= tuning.dashDuration){
                this.owner.position.copy(this.scriptedLandingPoint);
                this.spawnExplosionHazard(this.getClosestExplosionHazardPoint());
                if(spawnShockwave){
                    this.triggerSlamImpact(tuning);
                }
                this.attackPhase = FirstEmberAttackPhases.RECOVERY;
                this.actionTimer = 0;
                this.disableAttackHitbox();
            }
            return;
        }

        this.finishRecovery(tuning.recoveryDuration);
    }

    protected wallHangReached(duration: number): boolean {
        return this.actionTimer >= duration;
    }

    protected advanceAttackPhases(
        deltaT: number,
        windup: number,
        active: number,
        recovery: number,
        hitboxOffset: Vec2,
        hitboxHalfSize: Vec2,
        damage: number,
        knockbackX: number,
        knockbackY: number
    ): void {
        this.applyGravity(deltaT);
        this.owner.move(this.resolveMovement(deltaT));
        this.refreshAttackHitboxPosition();

        if(this.attackPhase === FirstEmberAttackPhases.WINDUP && this.actionTimer >= windup){
            this.attackPhase = FirstEmberAttackPhases.ACTIVE;
            this.actionTimer = 0;
            this.enableAttackHitbox(hitboxOffset, hitboxHalfSize);
        } else if(this.attackPhase === FirstEmberAttackPhases.ACTIVE){
            this.tryApplyAttackDamage(damage, knockbackX, knockbackY);
            if(this.actionTimer >= active){
                this.attackPhase = FirstEmberAttackPhases.RECOVERY;
                this.actionTimer = 0;
                this.disableAttackHitbox();
                this.velocity.x = 0;
            }
        } else if(this.attackPhase === FirstEmberAttackPhases.RECOVERY && this.actionTimer >= recovery){
            this.finishAction(this.bossState.getPhase() === FirstEmberPhase.PHASE_2 ? 1.35 : 0.6, this.currentAction);
        }
    }

    protected enableAttackHitbox(offset: Vec2, halfSize: Vec2): void {
        this.attackHitboxActive = true;
        this.pathAttackHitboxActive = false;
        this.attackHitboxOffset = offset.clone();
        this.attackHitboxHalfSize = halfSize.clone();
        this.refreshAttackHitboxPosition();
    }

    protected enablePathAttackHitbox(start: Vec2, end: Vec2, padding: Vec2): void {
        this.attackHitboxActive = true;
        this.pathAttackHitboxActive = true;
        this.attackHitboxOffset = Vec2.ZERO;
        this.attackHitboxCenter = new Vec2(
            (start.x + end.x) * 0.5,
            (start.y + end.y) * 0.5
        );
        this.attackHitboxHalfSize = new Vec2(
            Math.abs(end.x - start.x) * 0.5 + padding.x,
            Math.abs(end.y - start.y) * 0.5 + padding.y
        );
    }

    protected disableAttackHitbox(): void {
        this.attackHitboxActive = false;
        this.pathAttackHitboxActive = false;
        this.attackHitboxOffset = Vec2.ZERO;
        this.attackHitboxHalfSize = Vec2.ZERO;
    }

    protected refreshAttackHitboxPosition(): void {
        if(!this.attackHitboxActive || this.pathAttackHitboxActive){
            return;
        }

        const facing = this.owner.invertX ? -1 : 1;
        this.attackHitboxCenter = new Vec2(
            this.owner.position.x + this.attackHitboxOffset.x * facing,
            this.owner.position.y + this.attackHitboxOffset.y
        );
    }

    protected tryApplyAttackDamage(damage: number, knockbackX: number, knockbackY: number): void {
        if(!this.attackHitboxActive || this.attackHasConnected || !this.player.hasPhysics){
            return;
        }

        const attackShape = new AABB(this.attackHitboxCenter.clone(), this.attackHitboxHalfSize.clone());
        if(!attackShape.overlaps(this.player.collisionShape.getBoundingRect())){
            return;
        }

        const playerController = this.player.ai as PlayerController | undefined;
        if(playerController !== undefined){
            const direction = this.owner.invertX ? -1 : 1;
            playerController.applyDamage(damage, new Vec2(knockbackX * direction, knockbackY));
        }

        this.attackHasConnected = true;
    }

    protected playIdleAnimation(): void {
        const animation = this.bossState.getPhase() === FirstEmberPhase.PHASE_2
            ? FirstEmberAnimations.PHASE2_IDLE
            : FirstEmberAnimations.PHASE1_IDLE;
        this.owner.animation.playIfNotAlready(animation, true);
    }

    protected playWalkAnimation(): void {
        const animation = this.bossState.getPhase() === FirstEmberPhase.PHASE_2
            ? FirstEmberAnimations.PHASE2_WALK
            : FirstEmberAnimations.PHASE1_WALK;
        this.owner.animation.playIfNotAlready(animation, true);
    }

    protected finishRecovery(recoveryDuration: number): void {
        if(this.attackPhase === FirstEmberAttackPhases.RECOVERY && this.actionTimer >= recoveryDuration){
            this.finishAction(this.bossState.getPhase() === FirstEmberPhase.PHASE_2 ? 0.12 : 0.06, this.currentAction);
        }
    }

    protected getSceneHooks(): FirstEmberSceneHooks {
        return this.owner.getScene() as FirstEmberSceneHooks;
    }

    protected getSelectedWallPerch(): Vec2 {
        return this.blackboard.playerOnLeft ? this.wallClingRight : this.wallClingLeft;
    }

    protected getSelectedLandingPoint(action: FirstEmberAction): Vec2 {
        const candidates = action === FirstEmberActions.PHASE2_WALL_SPIN_SLAM
            ? this.wallSpinSlamLandings
            : this.wallDiveLandings;
        return this.getClosestPointToPlayer(candidates);
    }

    protected getClosestPointToPlayer(points: Vec2[]): Vec2 {
        let selected = points[0] ?? this.owner.position;
        let bestDistance = Math.abs(selected.x - this.player.position.x);

        for(const point of points){
            const distance = Math.abs(point.x - this.player.position.x);
            if(distance < bestDistance){
                selected = point;
                bestDistance = distance;
            }
        }

        return selected;
    }

    protected updateScriptedDashToLanding(duration: number): void {
        const progress = Math.min(1, this.actionTimer / Math.max(duration, 0.01));
        this.owner.position.copy(Vec2.lerp(this.scriptedDashStartPoint, this.scriptedLandingPoint, progress));
        const direction = this.scriptedLandingPoint.x - this.scriptedDashStartPoint.x;
        if(direction !== 0){
            this.owner.invertX = direction < 0;
        }
    }

    protected triggerSlamImpact(tuning: FirstEmberWallAttackTuning): void {
        if(this.slamImpactTriggered){
            return;
        }

        this.slamImpactTriggered = true;
        if(!this.slamSoundPlayedThisAction){
            this.playBossSfx(this.slamSoundKey);
            this.slamSoundPlayedThisAction = true;
        }
        this.spawnSlamShockwaves(
            tuning.shockwaveHalfSize,
            tuning.shockwaveGap,
            tuning.shockwaveDuration,
            tuning.shockwaveDamage,
            tuning.shockwaveKnockbackX,
            tuning.shockwaveKnockbackY,
            this.scriptedLandingPoint
        );
    }

    protected spawnSlamShockwaves(
        halfSize: Vec2,
        gap: number,
        duration: number,
        damage: number,
        knockbackX: number,
        knockbackY: number,
        origin: Vec2
    ): void {
        this.clearSlamShockwaves();
        const scene = this.owner.getScene();
        const groundY = origin.y + this.hitboxHalfSize.y - 8;

        for(const direction of [-1, 1]){
            const center = new Vec2(
                origin.x + direction * (halfSize.x + gap),
                groundY - halfSize.y
            );

            const outerVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: center.clone(),
                size: new Vec2(halfSize.x * 2 + 16, halfSize.y * 2 + 6)
            });
            outerVisual.color = new Color(150, 92, 36, 0.28);
            outerVisual.borderColor = new Color(236, 178, 88, 0.72);
            outerVisual.borderWidth = 3;

            const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: center.clone(),
                size: new Vec2(halfSize.x * 2, halfSize.y * 2)
            });
            coreVisual.color = new Color(214, 132, 48, 0.24);
            coreVisual.borderColor = new Color(255, 214, 126, 0.48);
            coreVisual.borderWidth = 1;

            this.slamShockwaves.push({
                center,
                halfSize: halfSize.clone(),
                direction,
                elapsed: 0,
                duration,
                damage,
                knockbackX,
                knockbackY,
                outerVisual,
                coreVisual
            });
        }
    }

    protected triggerGroundSlamAura(
        halfSize: Vec2,
        gap: number,
        duration: number,
        damage: number,
        knockbackX: number,
        knockbackY: number,
        origin: Vec2
    ): void {
        this.spawnSlamShockwaves(halfSize, gap, duration, damage, knockbackX, knockbackY, origin);
    }

    protected updateSlamShockwaves(deltaT: number): void {
        if(this.slamShockwaves.length === 0){
            return;
        }

        const toRemove: number[] = [];
        for(let i = 0; i < this.slamShockwaves.length; i++){
            const shockwave = this.slamShockwaves[i];
            shockwave.elapsed += deltaT;
            const progress = Math.min(1, shockwave.elapsed / Math.max(shockwave.duration, 0.01));
            const widthPulse = 1 + 0.08 * Math.sin(progress * Math.PI * 6);

            if(shockwave.outerVisual !== null){
                shockwave.outerVisual.position.copy(shockwave.center);
                shockwave.outerVisual.size.set(
                    (shockwave.halfSize.x * 2 + 16) * widthPulse,
                    shockwave.halfSize.y * 2 + 6
                );
                shockwave.outerVisual.color = new Color(150, 92, 36, 0.28 * (1 - progress * 0.9));
                shockwave.outerVisual.borderColor = new Color(236, 178, 88, Math.max(0.2, 0.72 - progress * 0.5));
            }

            if(shockwave.coreVisual !== null){
                shockwave.coreVisual.position.copy(shockwave.center);
                shockwave.coreVisual.size.set(
                    shockwave.halfSize.x * 2 * widthPulse,
                    shockwave.halfSize.y * 2
                );
                shockwave.coreVisual.color = new Color(214, 132, 48, 0.24 * (1 - progress * 0.95));
                shockwave.coreVisual.borderColor = new Color(255, 214, 126, Math.max(0.14, 0.48 - progress * 0.3));
            }

            this.tryApplySlamShockwaveDamage(shockwave);
            if(shockwave.elapsed >= shockwave.duration){
                toRemove.push(i);
            }
        }

        for(let i = toRemove.length - 1; i >= 0; i--){
            const index = toRemove[i];
            const shockwave = this.slamShockwaves[index];
            shockwave.outerVisual?.destroy();
            shockwave.coreVisual?.destroy();
            this.slamShockwaves.splice(index, 1);
        }
    }

    protected tryApplySlamShockwaveDamage(shockwave: FirstEmberGroundShockwave): void {
        if(!this.player.hasPhysics){
            return;
        }

        const shape = new AABB(shockwave.center.clone(), shockwave.halfSize.clone());
        if(!shape.overlaps(this.player.collisionShape.getBoundingRect())){
            return;
        }

        const playerController = this.player.ai as PlayerController | undefined;
        if(playerController !== undefined){
            playerController.applyDamage(shockwave.damage, new Vec2(
                shockwave.knockbackX * shockwave.direction,
                shockwave.knockbackY
            ));
        }
    }

    protected clearSlamShockwaves(): void {
        for(const shockwave of this.slamShockwaves){
            shockwave.outerVisual?.destroy();
            shockwave.coreVisual?.destroy();
        }
        this.slamShockwaves = [];
    }

    protected maybeSpawnFarExplosionHazard(): void {
        if(
            this.bossState.getPhase() !== FirstEmberPhase.PHASE_2
            || (this.currentAction !== FirstEmberActions.PURSUE && this.currentAction !== FirstEmberActions.IDLE)
            || !this.blackboard.playerFarAway
            || this.explosionHazardCooldownTimer > 0
        ){
            return;
        }

        this.spawnExplosionHazard(this.getClosestExplosionHazardPoint());
    }

    protected maybeSpawnPhaseTwoExplosionHazard(): void {
        if(
            this.bossState.getPhase() !== FirstEmberPhase.PHASE_2
            || !this.bossState.hasFightStarted()
            || (this.currentAction !== FirstEmberActions.PURSUE && this.currentAction !== FirstEmberActions.IDLE)
            || this.phaseTwoHazardTimer < 5.5
            || this.explosionHazardCooldownTimer > 0
        ){
            return;
        }

        this.phaseTwoHazardTimer = 0;
        this.spawnExplosionHazard(this.getClosestExplosionHazardPoint());
    }

    protected spawnExplosionHazard(basePoint: Vec2): void {
        if(this.explosionHazardCooldownTimer > 0){
            return;
        }

        this.explosionHazardCooldownTimer = this.tuning.explosionHazard.cooldown;
        const scene = this.owner.getScene();
        const center = new Vec2(
            basePoint.x,
            basePoint.y - this.tuning.explosionHazard.halfSize.y
        );
        const outerVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: center.clone(),
            size: new Vec2(
                this.tuning.explosionHazard.halfSize.x * 2 + 16,
                this.tuning.explosionHazard.halfSize.y * 2 + 8
            )
        });
        outerVisual.color = new Color(74, 28, 12, 0.16);
        outerVisual.borderColor = new Color(232, 188, 96, 0.44);
        outerVisual.borderWidth = 3;

        const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: center.clone(),
            size: new Vec2(
                this.tuning.explosionHazard.halfSize.x * 2,
                this.tuning.explosionHazard.halfSize.y * 2
            )
        });
        coreVisual.color = new Color(180, 122, 46, 0.12);
        coreVisual.borderColor = new Color(255, 224, 138, 0.28);
        coreVisual.borderWidth = 1;

        const sprite = scene.add.sprite(this.explosionHazardImageKey, "PRIMARY");
        sprite.position.copy(center);
        sprite.size.copy(this.tuning.explosionHazard.visualSize);
        sprite.alpha = 0.2;

        this.explosionHazards.push({
            sprite,
            basePoint: basePoint.clone(),
            center,
            halfSize: this.tuning.explosionHazard.halfSize.clone(),
            elapsed: 0,
            warningDuration: this.tuning.explosionHazard.warningDuration,
            duration: this.tuning.explosionHazard.duration,
            damage: this.tuning.explosionHazard.damage,
            knockbackX: this.tuning.explosionHazard.knockbackX,
            knockbackY: this.tuning.explosionHazard.knockbackY,
            outerVisual,
            coreVisual
        });
    }

    protected updateExplosionHazards(deltaT: number): void {
        if(this.explosionHazards.length === 0){
            return;
        }

        const toRemove: number[] = [];
        for(let i = 0; i < this.explosionHazards.length; i++){
            const hazard = this.explosionHazards[i];
            hazard.elapsed += deltaT;
            hazard.center.set(hazard.basePoint.x, hazard.basePoint.y - hazard.halfSize.y);
            hazard.sprite.position.copy(hazard.center);
            if(hazard.elapsed < hazard.warningDuration){
                const progress = Math.min(1, hazard.elapsed / Math.max(hazard.warningDuration, 0.01));
                const pulse = 1 + 0.06 * Math.sin(progress * Math.PI * 8);

                hazard.sprite.alpha = 0.18 + 0.26 * progress;
                hazard.sprite.size.copy(this.tuning.explosionHazard.visualSize);
                hazard.outerVisual?.position.copy(hazard.center);
                hazard.coreVisual?.position.copy(hazard.center);

                if(hazard.outerVisual !== null){
                    hazard.outerVisual.size.set(
                        (hazard.halfSize.x * 2 + 16) * pulse,
                        hazard.halfSize.y * 2 + 8
                    );
                    hazard.outerVisual.color = new Color(74, 28, 12, 0.18 + 0.10 * progress);
                    hazard.outerVisual.borderColor = new Color(232, 188, 96, 0.34 + 0.42 * progress);
                }

                if(hazard.coreVisual !== null){
                    hazard.coreVisual.size.set(
                        hazard.halfSize.x * 2 * pulse,
                        hazard.halfSize.y * 2
                    );
                    hazard.coreVisual.color = new Color(180, 122, 46, 0.12 + 0.16 * progress);
                    hazard.coreVisual.borderColor = new Color(255, 224, 138, 0.20 + 0.34 * progress);
                }
            } else {
                hazard.outerVisual?.destroy();
                hazard.coreVisual?.destroy();
                hazard.outerVisual = null;
                hazard.coreVisual = null;
                hazard.sprite.alpha = 0.82 + 0.12 * Math.sin((hazard.elapsed - hazard.warningDuration) * 8);
                hazard.sprite.size.copy(this.tuning.explosionHazard.visualSize);
                this.tryApplyExplosionHazardDamage(hazard);
            }

            if(hazard.elapsed >= hazard.duration){
                toRemove.push(i);
            }
        }

        for(let i = toRemove.length - 1; i >= 0; i--){
            const hazard = this.explosionHazards[toRemove[i]];
            hazard.outerVisual?.destroy();
            hazard.coreVisual?.destroy();
            hazard.sprite.destroy();
            this.explosionHazards.splice(toRemove[i], 1);
        }
    }

    protected tryApplyExplosionHazardDamage(hazard: FirstEmberExplosionHazard): void {
        if(!this.player.hasPhysics){
            return;
        }

        const shape = new AABB(hazard.center.clone(), hazard.halfSize.clone());
        if(!shape.overlaps(this.player.collisionShape.getBoundingRect())){
            return;
        }

        const playerController = this.player.ai as PlayerController | undefined;
        if(playerController !== undefined){
            const direction = hazard.center.x <= this.player.position.x ? 1 : -1;
            playerController.applyDamage(hazard.damage, new Vec2(
                hazard.knockbackX * direction,
                hazard.knockbackY
            ));
        }
    }

    protected clearExplosionHazards(): void {
        for(const hazard of this.explosionHazards){
            hazard.outerVisual?.destroy();
            hazard.coreVisual?.destroy();
            hazard.sprite.destroy();
        }
        this.explosionHazards = [];
    }

    protected getClosestExplosionHazardPoint(): Vec2 {
        return this.getClosestPointToPlayer(this.explosionHazardPoints);
    }

    protected getTimedTeleportSpinSlamTarget(): Vec2 {
        return new Vec2(
            this.player.position.x,
            this.player.position.y - this.hitboxHalfSize.y - 8
        );
    }

    protected startMountedSlamWarning(): void {
        const facing = this.owner.invertX ? -1 : 1;
        const center = new Vec2(
            this.owner.position.x + this.tuning.mountedSlam.warningOffset.x * facing,
            this.owner.position.y + this.tuning.mountedSlam.warningOffset.y
        );
        this.startAttackWarning(center, this.tuning.mountedSlam.warningHalfSize, this.tuning.mountedSlam.warningDuration);
    }

    protected startCrossDashWarning(): void {
        const arenaMinX = Math.min(this.wallClingLeft.x, this.wallClingRight.x) - 48;
        const arenaMaxX = Math.max(this.wallClingLeft.x, this.wallClingRight.x) + 48;
        const center = new Vec2(
            (arenaMinX + arenaMaxX) * 0.5,
            this.owner.position.y + 2
        );
        const halfSize = new Vec2((arenaMaxX - arenaMinX) * 0.5, 28);
        this.startAttackWarning(center, halfSize, this.tuning.crossDash.windup);
    }

    protected startWallDashWarning(start: Vec2, end: Vec2, duration: number): void {
        const center = new Vec2(
            (start.x + end.x) * 0.5,
            (start.y + end.y) * 0.5
        );
        const halfSize = new Vec2(
            Math.abs(end.x - start.x) * 0.5 + 54,
            Math.abs(end.y - start.y) * 0.5 + 34
        );
        this.startAttackWarning(center, halfSize, duration);
    }

    protected startLandingWarning(landingPoint: Vec2, halfSize: Vec2, duration: number): void {
        const groundY = landingPoint.y + this.hitboxHalfSize.y - 8;
        const center = new Vec2(landingPoint.x, groundY - halfSize.y);
        this.startAttackWarning(center, halfSize, duration);
    }

    protected startDarkAttackWarning(center: Vec2, halfSize: Vec2, duration: number): void {
        this.clearAttackWarning();
        this.attackWarning = this.createAttackWarning(center, halfSize, duration, true);
    }

    protected startSecondaryDarkAttackWarning(center: Vec2, halfSize: Vec2, duration: number): void {
        this.secondaryAttackWarning?.outerVisual?.destroy();
        this.secondaryAttackWarning?.coreVisual?.destroy();
        this.secondaryAttackWarning = this.createAttackWarning(center, halfSize, duration, true);
    }

    protected startAttackWarning(center: Vec2, halfSize: Vec2, duration: number): void {
        this.clearAttackWarning();
        this.attackWarning = this.createAttackWarning(center, halfSize, duration, false);
    }

    protected createAttackWarning(center: Vec2, halfSize: Vec2, duration: number, dark: boolean): FirstEmberAttackWarning {
        const scene = this.owner.getScene();
        const outerVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: center.clone(),
            size: new Vec2(halfSize.x * 2 + 16, halfSize.y * 2 + 8)
        });
        outerVisual.color = dark
            ? new Color(8, 8, 12, 0.26)
            : new Color(74, 28, 12, 0.20);
        outerVisual.borderColor = dark
            ? new Color(44, 44, 56, 0.72)
            : new Color(232, 188, 96, 0.42);
        outerVisual.borderWidth = 3;

        const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: center.clone(),
            size: new Vec2(halfSize.x * 2, halfSize.y * 2)
        });
        coreVisual.color = dark
            ? new Color(18, 16, 22, 0.20)
            : new Color(180, 122, 46, 0.14);
        coreVisual.borderColor = dark
            ? new Color(92, 92, 108, 0.34)
            : new Color(255, 224, 138, 0.28);
        coreVisual.borderWidth = 1;

        return {
            center: center.clone(),
            halfSize: halfSize.clone(),
            elapsed: 0,
            duration,
            outerVisual,
            coreVisual
        };
    }

    protected updateAttackWarning(deltaT: number): void {
        this.attackWarning = this.updateSingleAttackWarning(this.attackWarning, deltaT);
        this.secondaryAttackWarning = this.updateSingleAttackWarning(this.secondaryAttackWarning, deltaT);
    }

    protected updateSingleAttackWarning(
        warning: FirstEmberAttackWarning | null,
        deltaT: number
    ): FirstEmberAttackWarning | null {
        if(warning === null){
            return null;
        }

        warning.elapsed += deltaT;
        const progress = Math.min(1, warning.elapsed / Math.max(warning.duration, 0.01));
        const pulse = 1 + 0.06 * Math.sin(progress * Math.PI * 8);

        warning.outerVisual?.position.copy(warning.center);
        warning.coreVisual?.position.copy(warning.center);

        if(warning.outerVisual !== null){
            warning.outerVisual.size.set(
                (warning.halfSize.x * 2 + 16) * pulse,
                warning.halfSize.y * 2 + 8
            );
        }

        if(warning.coreVisual !== null){
            warning.coreVisual.size.set(
                warning.halfSize.x * 2 * pulse,
                warning.halfSize.y * 2
            );
        }

        if(warning.elapsed >= warning.duration){
            warning.outerVisual?.destroy();
            warning.coreVisual?.destroy();
            return null;
        }

        return warning;
    }

    protected clearAttackWarning(): void {
        this.attackWarning?.outerVisual?.destroy();
        this.attackWarning?.coreVisual?.destroy();
        this.attackWarning = null;
        this.secondaryAttackWarning?.outerVisual?.destroy();
        this.secondaryAttackWarning?.coreVisual?.destroy();
        this.secondaryAttackWarning = null;
    }

    protected updateDashAura(_deltaT: number): void {
        if(
            !this.isPhaseTwoDashAction(this.currentAction)
            || this.attackPhase !== FirstEmberAttackPhases.ACTIVE
        ){
            this.clearDashAura();
            return;
        }

        if(this.dashAuraOuter === null || this.dashAuraCore === null){
            const scene = this.owner.getScene();
            this.dashAuraOuter = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: this.owner.position.clone(),
                size: new Vec2(94, 118)
            });
            this.dashAuraOuter.color = new Color(10, 6, 14, 0.28);
            this.dashAuraOuter.borderColor = new Color(44, 30, 54, 0.0);
            this.dashAuraOuter.borderWidth = 0;

            this.dashAuraCore = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: this.owner.position.clone(),
                size: new Vec2(72, 94)
            });
            this.dashAuraCore.color = new Color(22, 14, 28, 0.22);
            this.dashAuraCore.borderColor = new Color(52, 40, 62, 0.0);
            this.dashAuraCore.borderWidth = 0;
        }

        const fadeDuration = this.getDashFadeDuration(this.currentAction);
        const progress = Math.min(1, this.actionTimer / Math.max(fadeDuration, 0.01));
        const pulse = 1 + 0.05 * Math.sin((this.actionTimer + progress) * 18);

        this.owner.alpha = Math.max(0.74, 1 - 0.24 * progress);

        if(this.dashAuraOuter !== null){
            this.dashAuraOuter.position.copy(this.owner.position);
            this.dashAuraOuter.size.set(94 * pulse, 118 * pulse);
            this.dashAuraOuter.color = new Color(8, 4, 10, 0.14 + 0.12 * (1 - progress * 0.35));
        }

        if(this.dashAuraCore !== null){
            this.dashAuraCore.position.copy(this.owner.position);
            this.dashAuraCore.size.set(72 * pulse, 94 * pulse);
            this.dashAuraCore.color = new Color(20, 12, 26, 0.10 + 0.10 * (1 - progress * 0.45));
        }
    }

    protected clearDashAura(): void {
        this.owner.alpha = 1;
        this.dashAuraOuter?.destroy();
        this.dashAuraCore?.destroy();
        this.dashAuraOuter = null;
        this.dashAuraCore = null;
    }

    protected finishAction(decisionDelay: number, finishedAction: FirstEmberAction = this.currentAction): void {
        this.attackPhase = FirstEmberAttackPhases.NONE;
        this.currentAction = FirstEmberActions.IDLE;
        this.actionTimer = 0;
        this.velocity = Vec2.ZERO;
        this.pursueDelayTimer = 0;
        this.slamImpactTriggered = false;
        this.clearAttackWarning();
        this.clearDashAura();
        this.queueComboFollowup(finishedAction);
        const comboDelay = this.queuedComboActions.length > 0 ? Math.min(decisionDelay, 0.22) : decisionDelay;
        this.actionDecisionTimer = Math.max(this.actionDecisionTimer, comboDelay);
        this.playIdleAnimation();
    }

    protected queueComboFollowup(finishedAction: FirstEmberAction): void {
        if(this.comboChainCount >= 3){
            this.queuedComboActions = [];
            this.comboChainCount = 0;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE1_SLASH
            && this.blackboard.playerInChargeLane
            && this.blackboard.absDeltaX <= this.phaseTuning.midRange + 24
            && this.mountedSlamCooldownTimer <= 0.45
        ){
            this.mountedSlamCooldownTimer = 0;
            this.queuedComboActions = [FirstEmberActions.PHASE1_SLAM];
            this.comboChainCount += 1;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE1_SLAM
            && this.mountedSlashCooldownTimer <= 0.3
        ){
            this.mountedSlashCooldownTimer = 0;
            this.queuedComboActions = [FirstEmberActions.PHASE1_SLASH];
            this.comboChainCount += 1;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE1_DASH
            && this.blackboard.absDeltaX <= this.phaseTuning.midRange + 42
            && this.mountedSlamCooldownTimer <= 0.55
        ){
            this.mountedSlamCooldownTimer = 0;
            this.queuedComboActions = [FirstEmberActions.PHASE1_SLAM];
            this.comboChainCount += 1;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE2_UPPERCUT
            && this.phase2SpinSlamCooldownTimer <= 1.2
        ){
            this.phase2SpinSlamCooldownTimer = 0;
            this.queuedComboActions = [FirstEmberActions.PHASE2_SPIN_SLAM];
            this.comboChainCount += 1;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE2_SPIN_SLAM
            && this.phase2SpinSlamCooldownTimer <= 1.0
            && this.blackboard.absDeltaX <= this.phaseTuning.midRange + 96
        ){
            this.phase2SpinSlamCooldownTimer = 0;
            this.queuedComboActions = [FirstEmberActions.PHASE2_SPIN_SLAM];
            this.comboChainCount += 1;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE2_SPIN_SLAM
            && this.blackboard.absDeltaX >= this.phaseTuning.closeRange
            && this.blackboard.playerInChargeLane
            && this.crossDashCooldownTimer <= 0.8
        ){
            this.crossDashCooldownTimer = 0;
            this.queuedComboActions = [FirstEmberActions.PHASE2_CROSS_DASH];
            this.comboChainCount += 1;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE2_CROSS_DASH
            && this.blackboard.playerInCloseRange
            && this.uppercutCooldownTimer <= 0.5
        ){
            this.uppercutCooldownTimer = 0;
            this.queuedComboActions = [FirstEmberActions.PHASE2_UPPERCUT];
            this.comboChainCount += 1;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE2_UPPERCUT
            && this.crossDashCooldownTimer <= 0.8
            && this.blackboard.playerInChargeLane
        ){
            this.crossDashCooldownTimer = 0;
            this.queuedComboActions = [FirstEmberActions.PHASE2_CROSS_DASH];
            this.comboChainCount += 1;
            return;
        }

        if(
            finishedAction === FirstEmberActions.PHASE2_SPIN_SLAM
            && this.blackboard.playerInCloseRange
            && this.uppercutCooldownTimer === 0
        ){
            this.queuedComboActions = [FirstEmberActions.PHASE2_UPPERCUT];
            this.comboChainCount += 1;
            return;
        }

        this.queuedComboActions = [];
        this.comboChainCount = 0;
    }

    protected tryPlayDelayedSlamSfx(delay: number): void {
        if(this.slamSoundPlayedThisAction || this.actionTimer < delay){
            return;
        }

        this.playBossSfx(this.slamSoundKey);
        this.slamSoundPlayedThisAction = true;
    }

    protected isPhaseTwoDashAction(action: FirstEmberAction): boolean {
        return action === FirstEmberActions.PHASE2_CROSS_DASH
            || action === FirstEmberActions.PHASE2_WALL_DIVE
            || action === FirstEmberActions.PHASE2_WALL_SPIN_SLAM;
    }

    protected getDashFadeDuration(action: FirstEmberAction): number {
        if(action === FirstEmberActions.PHASE2_CROSS_DASH){
            return this.tuning.crossDash.fadeDuration;
        }

        if(action === FirstEmberActions.PHASE2_WALL_DIVE){
            return this.tuning.wallDive.fadeDuration;
        }

        return this.tuning.wallSpinSlam.fadeDuration;
    }

    protected playBossSfx(key: string): void {
        const scene = this.owner.getScene() as unknown as {
            emitter?: { fireEvent: (type: string, data?: Record<string, unknown>) => void };
        };
        scene.emitter?.fireEvent(GameEventType.PLAY_SOUND, {
            key,
            loop: false,
            holdReference: false
        });
    }

    protected applyGravity(deltaT: number): void {
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

                    const tileTopY = row * tileSize.y * this.walls.scale.y;
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
