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
import Color from "../../Wolfie2D/Utils/Color";
import PlayerController from "../Player/PlayerController";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import Level3Boss, { SerisAnimations } from "./Level3Boss";

// ─── Option bag passed in from the scene ─────────────────────────────────────

type SerisControllerOptions = {
    bossState: Level3Boss;
    player: AnimatedSprite;
    tilemap: string;
    hitboxHalfSize: Vec2;
    icicleImageKey: string;
    moveSpeed?: number;
    aggroRange?: number;
    aggroHeightThreshold?: number;
};

// ─── Action / phase enumerations ─────────────────────────────────────────────

type SerisAction =
    | "idle"
    | "pursue"
    | "glacialRoar"
    | "tailLash"
    | "doubleTailLash"
    | "iceBreath"
    | "diveBomb";

type SerisAttackPhase = "none" | "windup" | "active" | "recovery";

// ─── Small hitbox / projectile record types ───────────────────────────────────

type SerisMeleeHitbox = {
    center: Vec2;
    halfSize: Vec2;
    active: boolean;
};

type SerisIcicleProjectile = {
    sprite: Sprite;
    center: Vec2;
    halfSize: Vec2;
    velocity: Vec2;
    active: boolean;
    elapsed: number;
    hasConnected: boolean;
};

/** A rectangle that telegraphs where an icicle will land. */
type SerisIcicleTelegraph = {
    targetX: number;
    outerVisual: Rect;
    coreVisual: Rect;
    elapsed: number;
};

/** The shockwave that fans out when Seris lands from a dive. */
type SerisDiveLandingShockwave = {
    center: Vec2;
    halfSize: Vec2;
    active: boolean;
    direction: number;   // +1 right, -1 left — two shockwaves spawn simultaneously
    elapsed: number;
};

// ─── Combat blackboard ────────────────────────────────────────────────────────

type SerisCombatBlackboard = {
    deltaX: number;
    absDeltaX: number;
    deltaY: number;
    absDeltaY: number;
    playerOnLeft: boolean;
    playerInAggroRange: boolean;
    playerInMeleeRange: boolean;
    playerInBreathRange: boolean;
    playerBelowSeris: boolean;
};

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * AI controller for Seris the Scaleless — Level 3 boss.
 *
 * Fight design (from GDD):
 *  - Seris spends most of her time airborne (FLYING loop).
 *  - She periodically dives to the arena floor.  While airborne she rains
 *    icicle projectiles on the player.
 *  - She can ONLY be damaged when standing on the ground.
 *  - Her dive-landing slam radiates two ground shockwaves the player must jump.
 *  - On the ground she may also tail-lash (single or double) or use glacial roar.
 *  - After the ground phase she leaps back into the air.
 *
 * Controller mirrors VorrathController exactly in structure:
 *  initializeAI → update → selectNextAction → start* → update* → reset*
 */
export default class SerisController extends ControllerAI {
    protected owner!: MBAnimatedSprite;
    protected bossState!: Level3Boss;
    protected player!: AnimatedSprite;
    protected moveSpeed!: number;
    protected aggroRange!: number;
    protected aggroHeightThreshold!: number;
    protected velocity!: Vec2;
    protected gravity!: number;
    protected maxFallSpeed!: number;
    protected walls!: OrthogonalTilemap;
    protected hitboxHalfSize!: Vec2;
    protected icicleImageKey!: string;
    protected grounded!: boolean;

    // ── shared action state ────────────────────────────────────────────────
    protected currentAction!: SerisAction;
    protected attackPhase!: SerisAttackPhase;
    protected plannedAction!: SerisAction | null;
    protected combatBlackboard!: SerisCombatBlackboard;
    protected actionTimer!: number;
    protected actionDecisionTimer!: number;
    protected actionDecisionInterval!: number;

    // ── airborne / dive phase ──────────────────────────────────────────────
    protected isAirborne!: boolean;
    protected airborneTimer!: number;
    /** How long Seris stays airborne raining icicles before diving. */
    protected airbornePhaseDuration!: number;
    /** How long Seris stays on the ground before returning to air. */
    protected groundPhaseDuration!: number;
    protected groundPhaseTimer!: number;
    /** Vertical speed used for the dive descent. */
    protected diveDescentSpeed!: number;
    /** Vertical speed used for rising back into the air. */
    protected riseSpeed!: number;
    /** Y position Seris hovers at while airborne. */
    protected hoverY!: number;
    /** Y position of the arena floor (set when she first lands). */
    protected arenaFloorY!: number | null;
    protected diveBombQueued!: boolean;
    protected diveLandingShockwaves!: SerisDiveLandingShockwave[];
    protected diveLandingShockwaveSpeed!: number;
    protected diveLandingShockwaveHalfSize!: Vec2;
    protected diveLandingShockwaveOuterVisuals!: (Rect | null)[];
    protected diveLandingShockwaveCoreVisuals!: (Rect | null)[];
    protected diveLandingDamage!: number;
    protected diveLandingKnockbackX!: number;
    protected diveLandingKnockbackY!: number;
    protected diveLandingShockwaveDuration!: number;

    // ── icicle rain (while airborne) ───────────────────────────────────────
    protected icicleRainCooldownTimer!: number;
    protected icicleRainCooldownDuration!: number;
    protected icicleProjectiles!: SerisIcicleProjectile[];
    protected icicleTelegraphs!: SerisIcicleTelegraph[];
    protected icicleTelegraphDuration!: number;
    protected icicleDropSpeed!: number;
    protected icicleHalfSize!: Vec2;
    protected icicleDamage!: number;
    protected icicleKnockbackX!: number;
    protected icicleKnockbackY!: number;
    protected icicleGravity!: number;
    protected icicleLifetime!: number;
    protected icicleSpreadRadius!: number;

    // ── glacial roar ───────────────────────────────────────────────────────
    protected glacialRoarQueued!: boolean;
    protected glacialRoarTimer!: number;
    protected glacialRoarWindupDuration!: number;
    protected glacialRoarActiveDuration!: number;
    protected glacialRoarRecoveryDuration!: number;
    protected glacialRoarCooldownTimer!: number;
    protected glacialRoarCooldownDuration!: number;

    // ── tail lash ─────────────────────────────────────────────────────────
    protected tailLashQueued!: boolean;
    protected tailLashTimer!: number;
    protected tailLashWindupDuration!: number;
    protected tailLashActiveDuration!: number;
    protected tailLashRecoveryDuration!: number;
    protected tailLashCooldownTimer!: number;
    protected tailLashCooldownDuration!: number;
    protected tailLashDamage!: number;
    protected tailLashKnockbackX!: number;
    protected tailLashKnockbackY!: number;
    protected tailLashHasConnected!: boolean;
    protected tailLashHitbox!: SerisMeleeHitbox | null;
    protected tailLashHitboxOffset!: Vec2;
    protected tailLashHitboxHalfSize!: Vec2;
    protected doubleTailLashQueued!: boolean;
    protected doubleTailLashSecondHitFired!: boolean;
    protected doubleTailLashSecondHitConnected!: boolean;
    /** After the first swipe in a double lash, a brief gap before the second. */
    protected doubleTailLashGap!: number;

    // ── ice breath ────────────────────────────────────────────────────────
    protected iceBreathQueued!: boolean;
    protected iceBreathTimer!: number;
    protected iceBreathWindupDuration!: number;
    protected iceBreathActiveDuration!: number;
    protected iceBreathRecoveryDuration!: number;
    protected iceBreathCooldownTimer!: number;
    protected iceBreathCooldownDuration!: number;
    protected iceBreathDamage!: number;
    protected iceBreathKnockbackX!: number;
    protected iceBreathKnockbackY!: number;
    protected iceBreathHasConnected!: boolean;
    protected iceBreathHitbox!: SerisMeleeHitbox | null;
    protected iceBreathHitboxOffset!: Vec2;
    protected iceBreathHitboxHalfSize!: Vec2;
    protected iceBreathTickTimer!: number;
    protected iceBreathTickInterval!: number;

    // ── death ─────────────────────────────────────────────────────────────
    protected deathSequenceStarted!: boolean;
    protected deathPoseSettled!: boolean;

    // ─────────────────────────────────────────────────────────────────────
    // initializeAI
    // ─────────────────────────────────────────────────────────────────────

    public initializeAI(owner: MBAnimatedSprite, options: SerisControllerOptions): void {
        this.owner = owner;
        this.bossState = options.bossState;
        this.player = options.player;
        this.walls = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
        this.hitboxHalfSize = options.hitboxHalfSize.clone();
        this.icicleImageKey = options.icicleImageKey;

        this.moveSpeed = options.moveSpeed ?? 80;
        this.aggroRange = options.aggroRange ?? 260;
        this.aggroHeightThreshold = options.aggroHeightThreshold ?? 180;

        this.velocity = Vec2.ZERO;
        this.gravity = 820;
        this.maxFallSpeed = 1100;
        this.grounded = false;

        // ── action state ──
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
            playerInMeleeRange: false,
            playerInBreathRange: false,
            playerBelowSeris: false
        };
        this.actionTimer = 0;
        this.actionDecisionTimer = 0;
        this.actionDecisionInterval = 0.12;

        // ── airborne / dive ──
        this.isAirborne = true;
        this.airborneTimer = 0;
        this.airbornePhaseDuration = 6.0;
        this.groundPhaseDuration = 5.0;
        this.groundPhaseTimer = 0;
        this.diveDescentSpeed = 640;
        this.riseSpeed = 480;
        this.hoverY = 0;       // set during first aggro frame based on spawn position
        this.arenaFloorY = null;
        this.diveBombQueued = false;
        this.diveLandingShockwaves = [];
        this.diveLandingShockwaveSpeed = 280;
        this.diveLandingShockwaveHalfSize = new Vec2(28, 14);
        this.diveLandingShockwaveOuterVisuals = [null, null];
        this.diveLandingShockwaveCoreVisuals = [null, null];
        this.diveLandingDamage = 28;
        this.diveLandingKnockbackX = 180;
        this.diveLandingKnockbackY = -380;
        this.diveLandingShockwaveDuration = 0.65;

        // ── icicle rain ──
        this.icicleRainCooldownTimer = 0.8; // slight initial delay
        this.icicleRainCooldownDuration = 2.2;
        this.icicleProjectiles = [];
        this.icicleTelegraphs = [];
        this.icicleTelegraphDuration = 0.9;
        this.icicleDropSpeed = 520;
        this.icicleHalfSize = new Vec2(8, 18);
        this.icicleDamage = 14;
        this.icicleKnockbackX = 60;
        this.icicleKnockbackY = -160;
        this.icicleGravity = 0;    // icicles fall at constant speed — feel more deliberate
        this.icicleLifetime = 4.0;
        this.icicleSpreadRadius = 80;

        // ── glacial roar ──
        this.glacialRoarQueued = false;
        this.glacialRoarTimer = 0;
        this.glacialRoarWindupDuration = 0.5;
        this.glacialRoarActiveDuration = 1.8;  // roar SFX / screen shake window
        this.glacialRoarRecoveryDuration = 0.8;
        this.glacialRoarCooldownTimer = 0;
        this.glacialRoarCooldownDuration = 18.0;

        // ── tail lash ──
        this.tailLashQueued = false;
        this.tailLashTimer = 0;
        this.tailLashWindupDuration = 0.55;
        this.tailLashActiveDuration = 0.22;
        this.tailLashRecoveryDuration = 0.6;
        this.tailLashCooldownTimer = 0;
        this.tailLashCooldownDuration = 2.2;
        this.tailLashDamage = 22;
        this.tailLashKnockbackX = 200;
        this.tailLashKnockbackY = -280;
        this.tailLashHasConnected = false;
        this.tailLashHitbox = null;
        // tail swings out behind Seris — offset in the direction OPPOSITE to facing
        this.tailLashHitboxOffset = new Vec2(-(this.hitboxHalfSize.x + 24), 10);
        this.tailLashHitboxHalfSize = new Vec2(36, 20);
        this.doubleTailLashQueued = false;
        this.doubleTailLashSecondHitFired = false;
        this.doubleTailLashSecondHitConnected = false;
        this.doubleTailLashGap = 0.18;

        // ── ice breath ──
        this.iceBreathQueued = false;
        this.iceBreathTimer = 0;
        this.iceBreathWindupDuration = 0.7;
        this.iceBreathActiveDuration = 2.0;
        this.iceBreathRecoveryDuration = 0.85;
        this.iceBreathCooldownTimer = 0;
        this.iceBreathCooldownDuration = 7.0;
        this.iceBreathDamage = 8;         // tick damage
        this.iceBreathKnockbackX = 40;
        this.iceBreathKnockbackY = -40;
        this.iceBreathHasConnected = false;
        this.iceBreathHitbox = null;
        this.iceBreathHitboxOffset = new Vec2(this.hitboxHalfSize.x + 20, 0);
        this.iceBreathHitboxHalfSize = new Vec2(90, 28);
        this.iceBreathTickTimer = 0;
        this.iceBreathTickInterval = 0.35;

        // ── death ──
        this.deathSequenceStarted = false;
        this.deathPoseSettled = false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // ControllerAI interface stubs
    // ─────────────────────────────────────────────────────────────────────

    public activate(_options: Record<string, any>): void {}

    public handleEvent(_event: GameEvent): void {}

    // ─────────────────────────────────────────────────────────────────────
    // Main update loop
    // ─────────────────────────────────────────────────────────────────────

    public update(deltaT: number): void {
        if (
            this.owner === undefined ||
            this.player === undefined ||
            this.bossState === undefined ||
            this.walls === undefined
        ) {
            return;
        }

        const deltaX = this.player.position.x - this.owner.position.x;
        const deltaY = this.player.position.y - this.owner.position.y;
        this.owner.invertX = deltaX < 0;
        this.updateCombatBlackboard(deltaX, deltaY);
        this.updateActionTimers(deltaT);
        this.updateIcicleProjectiles(deltaT);
        this.updateDiveLandingShockwaves(deltaT);

        // ── Death sequence ──────────────────────────────────────────────
        if (this.bossState.isDefeated()) {
            this.resetAllAttacks();
            this.clearAllIcicleTelegraphs();
            this.clearAllIcicleProjectiles();
            this.clearDiveLandingShockwaves();
            this.velocity.x = 0;
            this.velocity.y = 0;

            if (!this.deathSequenceStarted) {
                this.deathSequenceStarted = true;
                this.owner.animation.play(SerisAnimations.DYING, false);
                return;
            }

            if (!this.deathPoseSettled && !this.owner.animation.isPlaying(SerisAnimations.DYING)) {
                this.deathPoseSettled = true;
                if (this.owner.hasPhysics) {
                    this.owner.disablePhysics();
                }
                // Hold last DYING frame — no DEAD animation defined for Seris
            }

            return;
        }

        // ── Pre-fight ───────────────────────────────────────────────────
        if (!this.bossState.hasFightStarted()) {
            if (this.combatBlackboard.playerInAggroRange) {
                this.bossState.startFight();
                // Record hover height relative to spawn so she always returns here
                this.hoverY = this.owner.position.y;
            } else {
                this.currentAction = "idle";
                this.plannedAction = null;
                this.owner.animation.playIfNotAlready(SerisAnimations.IDLE, true);
                return;
            }
        }

        // ── Airborne phase ──────────────────────────────────────────────
        if (this.isAirborne) {
            this.updateAirbornePhase(deltaT, deltaX);
            return;
        }

        // ── Ground phase ────────────────────────────────────────────────
        this.updateGroundPhase(deltaT, deltaX);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Airborne phase — hover, rain icicles, then dive
    // ─────────────────────────────────────────────────────────────────────

    protected updateAirbornePhase(deltaT: number, deltaX: number): void {
        this.airborneTimer += deltaT;
        this.owner.animation.playIfNotAlready(SerisAnimations.FLYING, true);

        // Drift horizontally toward the player while airborne
        const direction = deltaX < 0 ? -1 : 1;
        this.velocity.x = direction * (this.moveSpeed * 0.6);

        // Hover: nudge back toward hoverY
        const yDiff = this.hoverY - this.owner.position.y;
        this.velocity.y = Math.sign(yDiff) * Math.min(Math.abs(yDiff) * 4, 120);

        this.owner.move(this.velocity.scaled(deltaT));

        // Periodically drop icicle telegraphs
        this.icicleRainCooldownTimer = Math.max(0, this.icicleRainCooldownTimer - deltaT);
        if (this.icicleRainCooldownTimer === 0) {
            this.spawnIcicleTelegraph();
            this.icicleRainCooldownTimer = this.icicleRainCooldownDuration;
        }
        this.updateIcicleTelegraphs(deltaT);

        // After the airborne phase duration, queue the dive
        if (this.airborneTimer >= this.airbornePhaseDuration) {
            this.startDiveBomb();
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Dive bomb — descend to floor, spawn shockwaves, then ground phase
    // ─────────────────────────────────────────────────────────────────────

    protected startDiveBomb(): void {
        this.currentAction = "diveBomb";
        this.attackPhase = "windup"; // windup = descending
        this.airborneTimer = 0;
        this.clearAllIcicleTelegraphs();
        // Seris tucks wings — use IDLE while plummeting (no dedicated dive frame)
        this.owner.animation.play(SerisAnimations.FLYING, true);
    }

    protected updateDiveBomb(deltaT: number): void {
        // Descend rapidly
        this.velocity.x = 0;
        this.velocity.y = this.diveDescentSpeed;
        this.applyGravity(deltaT);
        this.owner.move(this.resolveMovement(deltaT));

        // Landed when grounded flag is set by resolveMovement
        if (this.grounded && this.attackPhase === "windup") {
            this.attackPhase = "active";
            this.arenaFloorY = this.owner.position.y;
            this.spawnDiveLandingShockwaves();
            this.groundPhaseTimer = 0;
            this.isAirborne = false;
            this.currentAction = "idle";
            this.attackPhase = "none";
            this.owner.animation.play(SerisAnimations.IDLE, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Ground phase — attack then rise
    // ─────────────────────────────────────────────────────────────────────

    protected updateGroundPhase(deltaT: number, deltaX: number): void {
        this.groundPhaseTimer += deltaT;

        // Dispatch current ground action
        if (this.currentAction === "glacialRoar") {
            this.updateGlacialRoarAction(deltaT);
        } else if (this.currentAction === "tailLash") {
            this.updateTailLashAction(deltaT);
        } else if (this.currentAction === "doubleTailLash") {
            this.updateDoubleTailLashAction(deltaT);
        } else if (this.currentAction === "iceBreath") {
            this.updateIceBreathAction(deltaT);
        } else if (this.currentAction === "diveBomb") {
            this.updateDiveBomb(deltaT);
        } else {
            // Decide next ground action
            const next = this.selectNextGroundAction();

            if (next === "glacialRoar") {
                this.startGlacialRoarAction();
            } else if (next === "doubleTailLash") {
                this.startDoubleTailLashAction();
            } else if (next === "tailLash") {
                this.startTailLashAction();
            } else if (next === "iceBreath") {
                this.startIceBreathAction();
            } else if (next === "pursue") {
                this.currentAction = "pursue";
                const dir = deltaX < 0 ? -1 : 1;
                this.velocity.x = dir * this.moveSpeed;
                this.owner.animation.playIfNotAlready(SerisAnimations.WALK, true);
            } else {
                this.currentAction = "idle";
                this.velocity.x = 0;
                this.owner.animation.playIfNotAlready(SerisAnimations.IDLE, true);
            }
        }

        // Apply physics and move (unless currently dive-bombing — handled above)
        if (this.currentAction !== "diveBomb") {
            this.applyGravity(deltaT);
            this.owner.move(this.resolveMovement(deltaT));
        }

        // After ground phase duration, rise back into air
        if (this.groundPhaseTimer >= this.groundPhaseDuration && this.currentAction === "idle") {
            this.riseToAir();
        }
    }

    protected riseToAir(): void {
        this.isAirborne = true;
        this.airborneTimer = 0;
        this.groundPhaseTimer = 0;
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.velocity.y = -this.riseSpeed;
        this.owner.animation.play(SerisAnimations.FLYING, true);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Action selector (ground phase only)
    // ─────────────────────────────────────────────────────────────────────

    protected selectNextGroundAction(): SerisAction {
        if (this.actionDecisionTimer > 0) {
            return this.plannedAction ?? "idle";
        }

        this.actionDecisionTimer = this.actionDecisionInterval;
        this.plannedAction = null;

        // Glacial roar: once per landing if not on cooldown (fight opener / phase feel)
        if (this.glacialRoarCooldownTimer === 0 && this.groundPhaseTimer < 0.5) {
            this.plannedAction = "glacialRoar";
            this.glacialRoarQueued = true;
            return "glacialRoar";
        }

        // Ice breath: mid-range, player in front
        if (
            this.combatBlackboard.playerInBreathRange &&
            !this.combatBlackboard.playerInMeleeRange &&
            this.iceBreathCooldownTimer === 0
        ) {
            this.plannedAction = "iceBreath";
            this.iceBreathQueued = true;
            return "iceBreath";
        }

        // Double tail lash: player is very close and tail lash has been used recently
        if (
            this.combatBlackboard.playerInMeleeRange &&
            this.tailLashCooldownTimer === 0 &&
            Math.random() < 0.4
        ) {
            this.plannedAction = "doubleTailLash";
            this.doubleTailLashQueued = true;
            return "doubleTailLash";
        }

        // Single tail lash: player close
        if (this.combatBlackboard.playerInMeleeRange && this.tailLashCooldownTimer === 0) {
            this.plannedAction = "tailLash";
            this.tailLashQueued = true;
            return "tailLash";
        }

        // Pursue if player is in breath range but not yet melee range
        if (this.combatBlackboard.playerInBreathRange) {
            return "pursue";
        }

        return "idle";
    }

    // ─────────────────────────────────────────────────────────────────────
    // Glacial Roar
    // ─────────────────────────────────────────────────────────────────────

    protected startGlacialRoarAction(): void {
        this.currentAction = "glacialRoar";
        this.attackPhase = "windup";
        this.glacialRoarTimer = 0;
        this.glacialRoarQueued = false;
        this.glacialRoarCooldownTimer = this.glacialRoarCooldownDuration;
        this.velocity.x = 0;
        this.owner.animation.play(SerisAnimations.GLACIAL_ROAR, false);
    }

    protected updateGlacialRoarAction(deltaT: number): void {
        this.glacialRoarTimer += deltaT;

        if (
            this.attackPhase === "windup" &&
            this.glacialRoarTimer >= this.glacialRoarWindupDuration
        ) {
            this.attackPhase = "active";
            // Spawn a burst of icicle telegraphs during the roar's active window
            const burstCount = 3;
            for (let i = 0; i < burstCount; i++) {
                this.spawnIcicleTelegraph(this.player.position.x + (Math.random() - 0.5) * 120);
            }
        }

        if (
            this.attackPhase === "active" &&
            this.glacialRoarTimer >= this.glacialRoarWindupDuration + this.glacialRoarActiveDuration
        ) {
            this.attackPhase = "recovery";
        }

        if (
            this.attackPhase === "recovery" &&
            this.glacialRoarTimer >=
                this.glacialRoarWindupDuration +
                this.glacialRoarActiveDuration +
                this.glacialRoarRecoveryDuration
        ) {
            this.resetGlacialRoar();
        }
    }

    protected resetGlacialRoar(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.plannedAction = null;
        this.glacialRoarTimer = 0;
        this.glacialRoarQueued = false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Tail Lash (single)
    // ─────────────────────────────────────────────────────────────────────

    protected startTailLashAction(): void {
        this.currentAction = "tailLash";
        this.attackPhase = "windup";
        this.tailLashTimer = 0;
        this.tailLashQueued = false;
        this.tailLashHasConnected = false;
        this.tailLashCooldownTimer = this.tailLashCooldownDuration;
        this.velocity.x = 0;
        this.tailLashHitbox = {
            center: this.owner.position.clone(),
            halfSize: this.tailLashHitboxHalfSize.clone(),
            active: false
        };
        this.owner.animation.play(SerisAnimations.TAIL_LASH, false);
    }

    protected updateTailLashAction(deltaT: number): void {
        this.tailLashTimer += deltaT;
        this.updateTailLashHitbox(false);

        if (
            this.attackPhase === "windup" &&
            this.tailLashTimer >= this.tailLashWindupDuration
        ) {
            this.attackPhase = "active";
        }

        if (this.attackPhase === "active") {
            this.tryApplyTailLashDamage(false);

            if (
                this.tailLashTimer >=
                this.tailLashWindupDuration + this.tailLashActiveDuration
            ) {
                this.attackPhase = "recovery";
                this.tailLashHitbox = null;
            }
        }

        if (
            this.attackPhase === "recovery" &&
            this.tailLashTimer >=
                this.tailLashWindupDuration +
                this.tailLashActiveDuration +
                this.tailLashRecoveryDuration
        ) {
            this.resetTailLash();
        }
    }

    protected resetTailLash(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.plannedAction = null;
        this.tailLashTimer = 0;
        this.tailLashHasConnected = false;
        this.tailLashHitbox = null;
        this.doubleTailLashQueued = false;
        this.doubleTailLashSecondHitFired = false;
        this.doubleTailLashSecondHitConnected = false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Double Tail Lash
    // ─────────────────────────────────────────────────────────────────────

    protected startDoubleTailLashAction(): void {
        this.currentAction = "doubleTailLash";
        this.attackPhase = "windup";
        this.tailLashTimer = 0;
        this.doubleTailLashQueued = false;
        this.tailLashHasConnected = false;
        this.doubleTailLashSecondHitFired = false;
        this.doubleTailLashSecondHitConnected = false;
        this.tailLashCooldownTimer = this.tailLashCooldownDuration;
        this.velocity.x = 0;
        this.tailLashHitbox = {
            center: this.owner.position.clone(),
            halfSize: this.tailLashHitboxHalfSize.clone(),
            active: false
        };
        this.owner.animation.play(SerisAnimations.DOUBLE_TAIL_LASH, false);
    }

    protected updateDoubleTailLashAction(deltaT: number): void {
        this.tailLashTimer += deltaT;
        this.updateTailLashHitbox(false);

        // — First swipe windup —
        if (
            this.attackPhase === "windup" &&
            this.tailLashTimer >= this.tailLashWindupDuration
        ) {
            this.attackPhase = "active";
        }

        // — First swipe active —
        if (this.attackPhase === "active") {
            this.tryApplyTailLashDamage(false);

            if (
                this.tailLashTimer >=
                this.tailLashWindupDuration + this.tailLashActiveDuration
            ) {
                this.attackPhase = "recovery"; // brief gap between swipes
                this.tailLashHitbox = null;
            }
        }

        // — Gap between swipes —
        if (
            this.attackPhase === "recovery" &&
            !this.doubleTailLashSecondHitFired &&
            this.tailLashTimer >=
                this.tailLashWindupDuration +
                this.tailLashActiveDuration +
                this.doubleTailLashGap
        ) {
            // Fire second swipe
            this.doubleTailLashSecondHitFired = true;
            this.attackPhase = "active";
            this.tailLashHitbox = {
                center: this.owner.position.clone(),
                halfSize: this.tailLashHitboxHalfSize.clone(),
                active: true
            };
        }

        // — Second swipe active —
        if (this.attackPhase === "active" && this.doubleTailLashSecondHitFired) {
            this.tryApplyTailLashDamage(true);

            const secondHitEnd =
                this.tailLashWindupDuration +
                this.tailLashActiveDuration +
                this.doubleTailLashGap +
                this.tailLashActiveDuration;

            if (this.tailLashTimer >= secondHitEnd) {
                this.attackPhase = "recovery";
                this.tailLashHitbox = null;
            }
        }

        // — Final recovery —
        if (
            this.attackPhase === "recovery" &&
            this.doubleTailLashSecondHitFired &&
            this.tailLashTimer >=
                this.tailLashWindupDuration +
                this.tailLashActiveDuration +
                this.doubleTailLashGap +
                this.tailLashActiveDuration +
                this.tailLashRecoveryDuration
        ) {
            this.resetTailLash();
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Ice Breath
    // ─────────────────────────────────────────────────────────────────────

    protected startIceBreathAction(): void {
        this.currentAction = "iceBreath";
        this.attackPhase = "windup";
        this.iceBreathTimer = 0;
        this.iceBreathQueued = false;
        this.iceBreathHasConnected = false;
        this.iceBreathTickTimer = 0;
        this.iceBreathCooldownTimer = this.iceBreathCooldownDuration;
        this.velocity.x = 0;
        this.iceBreathHitbox = {
            center: this.owner.position.clone(),
            halfSize: this.iceBreathHitboxHalfSize.clone(),
            active: false
        };
        this.owner.animation.play(SerisAnimations.ICE_BREATH, false);
    }

    protected updateIceBreathAction(deltaT: number): void {
        this.iceBreathTimer += deltaT;
        this.updateIceBreathHitbox();

        if (
            this.attackPhase === "windup" &&
            this.iceBreathTimer >= this.iceBreathWindupDuration
        ) {
            this.attackPhase = "active";
        }

        if (this.attackPhase === "active") {
            // Tick damage — not a one-shot connect like Vorrath's punch
            this.iceBreathTickTimer += deltaT;
            if (this.iceBreathTickTimer >= this.iceBreathTickInterval) {
                this.iceBreathTickTimer -= this.iceBreathTickInterval;
                this.tryApplyIceBreathTickDamage();
            }

            if (
                this.iceBreathTimer >=
                this.iceBreathWindupDuration + this.iceBreathActiveDuration
            ) {
                this.attackPhase = "recovery";
                this.iceBreathHitbox = null;
            }
        }

        if (
            this.attackPhase === "recovery" &&
            this.iceBreathTimer >=
                this.iceBreathWindupDuration +
                this.iceBreathActiveDuration +
                this.iceBreathRecoveryDuration
        ) {
            this.resetIceBreath();
        }
    }

    protected resetIceBreath(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.plannedAction = null;
        this.iceBreathTimer = 0;
        this.iceBreathHasConnected = false;
        this.iceBreathHitbox = null;
        this.iceBreathTickTimer = 0;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Reset helpers (called on defeat to clean up mid-attack state)
    // ─────────────────────────────────────────────────────────────────────

    protected resetAllAttacks(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.plannedAction = null;
        this.tailLashHitbox = null;
        this.iceBreathHitbox = null;
        this.glacialRoarQueued = false;
        this.tailLashQueued = false;
        this.doubleTailLashQueued = false;
        this.iceBreathQueued = false;
        this.diveBombQueued = false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Hitbox update helpers
    // ─────────────────────────────────────────────────────────────────────

    protected updateTailLashHitbox(isSecondHit: boolean): void {
        if (this.tailLashHitbox === null) {
            return;
        }

        // Tail is always on the opposite side to where Seris faces
        const facingDirection = this.owner.invertX ? -1 : 1;
        const tailSide = -facingDirection; // tail swings behind
        this.tailLashHitbox.center = new Vec2(
            this.owner.position.x + this.tailLashHitboxOffset.x * tailSide,
            this.owner.position.y + this.tailLashHitboxOffset.y
        );
        this.tailLashHitbox.active =
            this.attackPhase === "active" &&
            (isSecondHit ? this.doubleTailLashSecondHitFired : !this.doubleTailLashSecondHitFired);
    }

    protected updateIceBreathHitbox(): void {
        if (this.iceBreathHitbox === null) {
            return;
        }

        const facingDirection = this.owner.invertX ? -1 : 1;
        this.iceBreathHitbox.center = new Vec2(
            this.owner.position.x + this.iceBreathHitboxOffset.x * facingDirection,
            this.owner.position.y + this.iceBreathHitboxOffset.y
        );
        this.iceBreathHitbox.active = this.attackPhase === "active";
    }

    // ─────────────────────────────────────────────────────────────────────
    // Damage application helpers
    // ─────────────────────────────────────────────────────────────────────

    protected tryApplyTailLashDamage(isSecondHit: boolean): void {
        if (
            this.tailLashHitbox === null ||
            !this.tailLashHitbox.active ||
            !this.player.hasPhysics
        ) {
            return;
        }

        // Each swipe can connect at most once
        if (!isSecondHit && this.tailLashHasConnected) {
            return;
        }

        if (isSecondHit && this.doubleTailLashSecondHitConnected) {
            return;
        }

        const hitShape = new AABB(
            this.tailLashHitbox.center.clone(),
            this.tailLashHitbox.halfSize.clone()
        );
        if (!hitShape.overlaps(this.player.collisionShape.getBoundingRect())) {
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if (playerController !== undefined) {
            // Knock the player away from the tail
            const tailSide = this.owner.invertX ? 1 : -1;
            playerController.applyDamage(this.tailLashDamage, new Vec2(
                this.tailLashKnockbackX * tailSide,
                this.tailLashKnockbackY
            ));
        }

        if (!isSecondHit) {
            this.tailLashHasConnected = true;
        } else {
            this.doubleTailLashSecondHitConnected = true;
        }
    }

    protected tryApplyIceBreathTickDamage(): void {
        if (
            this.iceBreathHitbox === null ||
            !this.iceBreathHitbox.active ||
            !this.player.hasPhysics
        ) {
            return;
        }

        const breathShape = new AABB(
            this.iceBreathHitbox.center.clone(),
            this.iceBreathHitbox.halfSize.clone()
        );
        if (!breathShape.overlaps(this.player.collisionShape.getBoundingRect())) {
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if (playerController !== undefined) {
            const facingDirection = this.owner.invertX ? -1 : 1;
            playerController.applyDamage(this.iceBreathDamage, new Vec2(
                this.iceBreathKnockbackX * facingDirection,
                this.iceBreathKnockbackY
            ));
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Icicle rain (airborne)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Spawns a telegraph marker at the given x (defaults to player's current x
     * with random spread).  After icicleTelegraphDuration, the actual icicle
     * drops from above.
     */
    protected spawnIcicleTelegraph(targetX?: number): void {
        const dropX =
            targetX ??
            this.player.position.x + (Math.random() - 0.5) * this.icicleSpreadRadius;

        const markerTopY = this.hoverY;
        const markerBottomY = this.player.position.y + this.hitboxHalfSize.y;
        const markerHeight = Math.max(10, markerBottomY - markerTopY);
        const markerCenterY = markerTopY + markerHeight / 2;
        const scene = this.owner.getScene();

        const outerVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: new Vec2(dropX, markerCenterY),
            size: new Vec2(this.icicleHalfSize.x * 2 + 10, markerHeight)
        });
        outerVisual.color = new Color(100, 180, 220, 0.14);
        outerVisual.borderColor = new Color(180, 230, 255, 0.30);
        outerVisual.borderWidth = 2;

        const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: new Vec2(dropX, markerCenterY),
            size: new Vec2(this.icicleHalfSize.x * 2, markerHeight)
        });
        coreVisual.color = new Color(160, 220, 255, 0.10);
        coreVisual.borderColor = new Color(210, 245, 255, 0.22);
        coreVisual.borderWidth = 1;

        this.icicleTelegraphs.push({
            targetX: dropX,
            outerVisual,
            coreVisual,
            elapsed: 0
        });
    }

    protected updateIcicleTelegraphs(deltaT: number): void {
        const toRemove: SerisIcicleTelegraph[] = [];

        for (const telegraph of this.icicleTelegraphs) {
            telegraph.elapsed += deltaT;
            const progress = Math.min(1, telegraph.elapsed / Math.max(this.icicleTelegraphDuration, 0.01));
            const pulse = 0.9 + 0.14 * Math.sin(progress * Math.PI * 6);

            telegraph.outerVisual.color = new Color(100, 180, 220, 0.08 + 0.18 * progress);
            telegraph.outerVisual.borderColor = new Color(180, 230, 255, 0.20 + 0.28 * progress);
            telegraph.coreVisual.color = new Color(160, 220, 255, 0.06 + 0.18 * progress);
            telegraph.coreVisual.borderColor = new Color(210, 245, 255, 0.12 + 0.22 * progress);
            telegraph.outerVisual.size.x = (this.icicleHalfSize.x * 2 + 10) * pulse;
            telegraph.coreVisual.size.x = this.icicleHalfSize.x * 2 * pulse;

            if (telegraph.elapsed >= this.icicleTelegraphDuration) {
                // Telegraph expired — spawn the actual icicle
                this.spawnIcicleAt(telegraph.targetX);
                telegraph.outerVisual.destroy();
                telegraph.coreVisual.destroy();
                toRemove.push(telegraph);
            }
        }

        this.icicleTelegraphs = this.icicleTelegraphs.filter(t => !toRemove.includes(t));
    }

    protected spawnIcicleAt(dropX: number): void {
        const spawnY = this.owner.position.y + this.hitboxHalfSize.y;
        const spawnPos = new Vec2(dropX, spawnY);
        const scene = this.owner.getScene();
        const sprite = scene.add.sprite(this.icicleImageKey, "PRIMARY");
        sprite.position.copy(spawnPos);

        this.icicleProjectiles.push({
            sprite,
            center: spawnPos.clone(),
            halfSize: this.icicleHalfSize.clone(),
            velocity: new Vec2(0, this.icicleDropSpeed),
            active: true,
            elapsed: 0,
            hasConnected: false
        });
    }

    protected updateIcicleProjectiles(deltaT: number): void {
        const toRemove: SerisIcicleProjectile[] = [];

        for (const icicle of this.icicleProjectiles) {
            if (!icicle.active) {
                continue;
            }

            icicle.elapsed += deltaT;
            icicle.velocity.y += this.icicleGravity * deltaT;
            icicle.center.add(icicle.velocity.scaled(deltaT));
            icicle.sprite.position.copy(icicle.center);

            this.tryApplyIcicleDamage(icicle);

            const tileRC = this.walls.getColRowAt(icicle.center);
            const hitGround = this.walls.isTileCollidable(tileRC.x, tileRC.y);
            const expired = icicle.elapsed >= this.icicleLifetime;

            if (hitGround || expired || icicle.hasConnected) {
                icicle.sprite.destroy();
                toRemove.push(icicle);
            }
        }

        this.icicleProjectiles = this.icicleProjectiles.filter(i => !toRemove.includes(i));
    }

    protected tryApplyIcicleDamage(icicle: SerisIcicleProjectile): void {
        if (!icicle.active || icicle.hasConnected || !this.player.hasPhysics) {
            return;
        }

        const icicleShape = new AABB(icicle.center.clone(), icicle.halfSize.clone());
        if (!icicleShape.overlaps(this.player.collisionShape.getBoundingRect())) {
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if (playerController !== undefined) {
            const knockDirection = icicle.center.x <= this.player.position.x ? 1 : -1;
            playerController.applyDamage(this.icicleDamage, new Vec2(
                this.icicleKnockbackX * knockDirection,
                this.icicleKnockbackY
            ));
        }

        icicle.hasConnected = true;
    }

    protected clearAllIcicleTelegraphs(): void {
        for (const t of this.icicleTelegraphs) {
            t.outerVisual.destroy();
            t.coreVisual.destroy();
        }

        this.icicleTelegraphs = [];
    }

    protected clearAllIcicleProjectiles(): void {
        for (const i of this.icicleProjectiles) {
            i.sprite.destroy();
        }

        this.icicleProjectiles = [];
    }

    // ─────────────────────────────────────────────────────────────────────
    // Dive landing shockwaves
    // ─────────────────────────────────────────────────────────────────────

    protected spawnDiveLandingShockwaves(): void {
        this.clearDiveLandingShockwaves();
        const scene = this.owner.getScene();
        const groundY = this.owner.position.y + this.hitboxHalfSize.y - 8;

        for (let i = 0; i < 2; i++) {
            const dir = i === 0 ? 1 : -1;
            const center = new Vec2(
                this.owner.position.x + (this.hitboxHalfSize.x + 16) * dir,
                groundY - this.diveLandingShockwaveHalfSize.y
            );

            this.diveLandingShockwaves.push({
                center,
                halfSize: this.diveLandingShockwaveHalfSize.clone(),
                active: true,
                direction: dir,
                elapsed: 0
            });

            const outerVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: center.clone(),
                size: new Vec2(
                    this.diveLandingShockwaveHalfSize.x * 2 + 16,
                    this.diveLandingShockwaveHalfSize.y * 2 + 6
                )
            });
            outerVisual.color = new Color(120, 200, 240, 0.22);
            outerVisual.borderColor = new Color(200, 240, 255, 0.65);
            outerVisual.borderWidth = 3;

            const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: center.clone(),
                size: new Vec2(
                    this.diveLandingShockwaveHalfSize.x * 2,
                    this.diveLandingShockwaveHalfSize.y * 2
                )
            });
            coreVisual.color = new Color(180, 230, 255, 0.30);
            coreVisual.borderColor = new Color(230, 250, 255, 0.50);
            coreVisual.borderWidth = 1;

            this.diveLandingShockwaveOuterVisuals[i] = outerVisual;
            this.diveLandingShockwaveCoreVisuals[i] = coreVisual;
        }
    }

    protected updateDiveLandingShockwaves(deltaT: number): void {
        if (this.diveLandingShockwaves.length === 0) {
            return;
        }

        const toRemove: number[] = [];

        for (let i = 0; i < this.diveLandingShockwaves.length; i++) {
            const shockwave = this.diveLandingShockwaves[i];
            if (!shockwave.active) {
                continue;
            }

            shockwave.elapsed += deltaT;
            shockwave.center.x += this.diveLandingShockwaveSpeed * deltaT * shockwave.direction;
            const progress = Math.min(1, shockwave.elapsed / Math.max(this.diveLandingShockwaveDuration, 0.01));
            const widthPulse = 1 + 0.18 * progress;

            const outerV = this.diveLandingShockwaveOuterVisuals[i];
            const coreV = this.diveLandingShockwaveCoreVisuals[i];

            if (outerV !== null) {
                outerV.position.copy(shockwave.center);
                outerV.size.set(
                    (this.diveLandingShockwaveHalfSize.x * 2 + 16) * widthPulse,
                    this.diveLandingShockwaveHalfSize.y * 2 + 6
                );
                outerV.color = new Color(120, 200, 240, 0.22 * (1 - progress * 0.8));
                outerV.borderColor = new Color(200, 240, 255, Math.max(0.2, 0.65 - progress * 0.38));
            }

            if (coreV !== null) {
                coreV.position.copy(shockwave.center);
                coreV.size.set(
                    this.diveLandingShockwaveHalfSize.x * 2 * widthPulse,
                    this.diveLandingShockwaveHalfSize.y * 2
                );
                coreV.color = new Color(180, 230, 255, 0.30 * (1 - progress * 0.9));
                coreV.borderColor = new Color(230, 250, 255, Math.max(0.12, 0.50 - progress * 0.3));
            }

            this.tryApplyDiveLandingShockwaveDamage(shockwave);

            if (shockwave.elapsed >= this.diveLandingShockwaveDuration) {
                toRemove.push(i);
            }
        }

        // Remove expired shockwaves back-to-front to preserve indices
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const idx = toRemove[i];
            const outerV = this.diveLandingShockwaveOuterVisuals[idx];
            const coreV = this.diveLandingShockwaveCoreVisuals[idx];
            if (outerV !== null) { outerV.destroy(); }
            if (coreV !== null)  { coreV.destroy();  }
            this.diveLandingShockwaveOuterVisuals[idx] = null;
            this.diveLandingShockwaveCoreVisuals[idx] = null;
            this.diveLandingShockwaves.splice(idx, 1);
        }
    }

    protected tryApplyDiveLandingShockwaveDamage(shockwave: SerisDiveLandingShockwave): void {
        if (!shockwave.active || !this.player.hasPhysics) {
            return;
        }

        const shape = new AABB(shockwave.center.clone(), shockwave.halfSize.clone());
        if (!shape.overlaps(this.player.collisionShape.getBoundingRect())) {
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if (playerController !== undefined) {
            playerController.applyDamage(this.diveLandingDamage, new Vec2(
                this.diveLandingKnockbackX * shockwave.direction,
                this.diveLandingKnockbackY
            ));
        }

        // Allow repeated hits while the player stands in the shockwave path
        // (mirrors how Vorrath's lava pillars work — no hasConnected guard)
    }

    protected clearDiveLandingShockwaves(): void {
        for (const v of this.diveLandingShockwaveOuterVisuals) {
            if (v !== null) { v.destroy(); }
        }

        for (const v of this.diveLandingShockwaveCoreVisuals) {
            if (v !== null) { v.destroy(); }
        }

        this.diveLandingShockwaves = [];
        this.diveLandingShockwaveOuterVisuals = [null, null];
        this.diveLandingShockwaveCoreVisuals = [null, null];
    }

    // ─────────────────────────────────────────────────────────────────────
    // Combat blackboard
    // ─────────────────────────────────────────────────────────────────────

    protected updateCombatBlackboard(deltaX: number, deltaY: number): void {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        this.combatBlackboard.deltaX = deltaX;
        this.combatBlackboard.absDeltaX = absDeltaX;
        this.combatBlackboard.deltaY = deltaY;
        this.combatBlackboard.absDeltaY = absDeltaY;
        this.combatBlackboard.playerOnLeft = deltaX < 0;
        this.combatBlackboard.playerInAggroRange =
            absDeltaX <= this.aggroRange && absDeltaY <= this.aggroHeightThreshold;
        this.combatBlackboard.playerInMeleeRange = absDeltaX <= 80;
        this.combatBlackboard.playerInBreathRange = absDeltaX <= 200;
        this.combatBlackboard.playerBelowSeris = deltaY > 20;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Shared timer tick
    // ─────────────────────────────────────────────────────────────────────

    protected updateActionTimers(deltaT: number): void {
        this.actionTimer += deltaT;
        this.actionDecisionTimer = Math.max(this.actionDecisionTimer - deltaT, 0);
        this.glacialRoarCooldownTimer  = Math.max(this.glacialRoarCooldownTimer  - deltaT, 0);
        this.tailLashCooldownTimer     = Math.max(this.tailLashCooldownTimer     - deltaT, 0);
        this.iceBreathCooldownTimer    = Math.max(this.iceBreathCooldownTimer    - deltaT, 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Physics helpers (identical pattern to VorrathController)
    // ─────────────────────────────────────────────────────────────────────

    protected applyGravity(deltaT: number): void {
        if (this.owner.onGround && this.velocity.y > 0) {
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

        if (this.velocity.y >= 0) {
            let bestSnapMoveY = Number.POSITIVE_INFINITY;
            let bestSnapAbs   = Number.POSITIVE_INFINITY;

            for (const offsetX of probeOffsets) {
                const currentFeet = new Vec2(currentBodyCenter.x + offsetX, currentBodyCenter.y + this.hitboxHalfSize.y + 1);
                const nextFeet    = new Vec2(nextBodyCenter.x    + offsetX, nextBodyCenter.y    + this.hitboxHalfSize.y + 1);
                const startRowCol = this.walls.getColRowAt(currentFeet);
                const endRowCol   = this.walls.getColRowAt(nextFeet);
                const startRow = Math.min(startRowCol.y, endRowCol.y);
                const endRow   = Math.max(startRowCol.y, endRowCol.y);
                const col = endRowCol.x;

                for (let row = startRow; row <= endRow; row++) {
                    if (!this.walls.isTileCollidable(col, row)) {
                        continue;
                    }

                    const tileTopY   = row * tileSize.y;
                    const snapMoveY  = tileTopY - this.hitboxHalfSize.y - 1 - currentBodyCenter.y;
                    const snapAbs    = Math.abs(snapMoveY);
                    if (snapAbs < bestSnapAbs) {
                        bestSnapMoveY = snapMoveY;
                        bestSnapAbs   = snapAbs;
                    }

                    break;
                }
            }

            if (bestSnapMoveY !== Number.POSITIVE_INFINITY) {
                this.velocity.y = 0;
                this.grounded = true;
                return new Vec2(desiredMove.x, bestSnapMoveY);
            }
        }

        return desiredMove;
    }
}