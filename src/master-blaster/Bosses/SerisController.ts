import ControllerAI from "../../Wolfie2D/AI/ControllerAI";
import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Line from "../../Wolfie2D/Nodes/Graphics/Line";
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
    // Optional predefined snowman spawn points (world positions) to summon
    // when Seris uses Glacial Roar.
    snowmanSpawns?: Vec2[];
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

type SerisDiveWarningTelegraph = {
    outerVisual: Rect;
    coreVisual: Rect;
    elapsed: number;
};

type SerisArenaSlamWave = {
    center: Vec2;
    halfSize: Vec2;
    active: boolean;
    elapsed: number;
    hasConnected: boolean;
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
    protected hoverHeightOffset!: number;
    protected diveWindupDuration!: number;
    protected diveWindupTimer!: number;
    protected diveTargetX!: number;
    protected diveWarningFloorY!: number | null;
    protected diveWarningTelegraphs!: SerisDiveWarningTelegraph[];
    protected diveWarningWidth!: number;
    protected diveWarningPadding!: number;
    protected diveImpactHalfSize!: Vec2;
    protected diveImpactDamage!: number;
    protected arenaSlamWave!: SerisArenaSlamWave | null;
    protected arenaSlamWaveHalfSize!: Vec2;
    protected arenaSlamWaveDuration!: number;
    protected arenaSlamWaveDamage!: number;
    protected arenaSlamWaveKnockbackX!: number;
    protected arenaSlamWaveKnockbackY!: number;
    protected arenaSlamWaveOuterVisual!: Rect | null;
    protected arenaSlamWaveCoreVisual!: Rect | null;
    protected airborneGroundedStallTimer!: number;
    protected airborneGroundedStallDuration!: number;

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
    /** Optional snowman spawn points provided by the scene for Glacial Roar. */
    protected glacialRoarSnowmanSpawns!: Vec2[];

    // Prevent player from standing on Seris' hitbox: accumulate time spent
    // standing on top and push player off after this duration.
    protected playerOnTopTimer!: number;
    protected playerOnTopDuration!: number;
    protected playerSlideOffKnockbackX!: number;
    protected playerSlideOffKnockbackY!: number;

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
    protected iceBreathOuterVisual!: Rect | null;
    protected iceBreathCoreVisual!: Rect | null;
    protected iceBreathVisualHalfHeight!: number;
    protected iceBreathVisualMaxLength!: number;

    // ── glacial roar visuals ─────────────────────────────────────────────
    protected glacialRoarAuraOuterRing!: Line[];
    protected glacialRoarAuraInnerRing!: Line[];
    protected glacialRoarAuraSegments!: number;
    protected glacialRoarAuraOuterRadius!: number;
    protected glacialRoarAuraInnerRadius!: number;
    protected glacialRoarAuraPulseTimer!: number;

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

        // Optional snowman spawns passed from the scene (cloned for safety)
        this.glacialRoarSnowmanSpawns = (options.snowmanSpawns ?? []).map(p => p.clone());

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
        this.airbornePhaseDuration = 3.8;
        this.groundPhaseDuration = 6.6;
        this.groundPhaseTimer = 0;
        this.diveDescentSpeed = 640;
        this.riseSpeed = 480;
        // Keep a persistent hover target above the arena floor after landings.
        this.hoverHeightOffset = Math.max(210, this.hitboxHalfSize.y * 3.0);
        this.hoverY = this.owner.position.y - this.hoverHeightOffset;
        this.arenaFloorY = null;
        this.diveBombQueued = false;
        this.diveLandingShockwaves = [];
        this.diveLandingShockwaveSpeed = 280;
        this.diveLandingShockwaveHalfSize = new Vec2(28, 14);
        this.diveLandingShockwaveOuterVisuals = [null, null];
        this.diveLandingShockwaveCoreVisuals = [null, null];
        this.diveLandingDamage = 14;
        this.diveLandingKnockbackX = 180;
        this.diveLandingKnockbackY = -380;
        this.diveLandingShockwaveDuration = 0.95;
        this.diveWindupDuration = 0.7;
        this.diveWindupTimer = 0;
        this.diveTargetX = this.owner.position.x;
        this.diveWarningFloorY = null;
        this.diveWarningTelegraphs = [];
        this.diveWarningWidth = this.hitboxHalfSize.x * 2 + 26;
        this.diveWarningPadding = 26;
        this.diveImpactHalfSize = new Vec2(this.hitboxHalfSize.x + 20, this.hitboxHalfSize.y * 0.7);
        this.diveImpactDamage = 15;
        this.arenaSlamWave = null;
        this.arenaSlamWaveHalfSize = new Vec2(220, 18);
        this.arenaSlamWaveDuration = 0.56;
        this.arenaSlamWaveDamage = 20;
        this.arenaSlamWaveKnockbackX = 150;
        this.arenaSlamWaveKnockbackY = -340;
        this.arenaSlamWaveOuterVisual = null;
        this.arenaSlamWaveCoreVisual = null;
        this.airborneGroundedStallTimer = 0;
        this.airborneGroundedStallDuration = 0.3;

        // ── icicle rain ──
        this.icicleRainCooldownTimer = 0.8; // slight initial delay
        this.icicleRainCooldownDuration = 2.8;
        this.icicleProjectiles = [];
        this.icicleTelegraphs = [];
        this.icicleTelegraphDuration = 1.2;
        this.icicleDropSpeed = 520;
        this.icicleHalfSize = new Vec2(8, 18);
        this.icicleDamage = 30;
        this.icicleKnockbackX = 60;
        this.icicleKnockbackY = -160;
        this.icicleGravity = 0;    // icicles fall at constant speed — feel more deliberate
        this.icicleLifetime = 4.0;
        this.icicleSpreadRadius = 80;

        // ── glacial roar ──
        this.glacialRoarQueued = false;
        this.glacialRoarTimer = 0;
        this.glacialRoarWindupDuration = 1.0;
        this.glacialRoarActiveDuration = 2.4;  // roar SFX / screen shake window
        this.glacialRoarRecoveryDuration = 1.1;
        this.glacialRoarCooldownTimer = 0;
        this.glacialRoarCooldownDuration = 18.0;

        // ── tail lash ──
        this.tailLashQueued = false;
        this.tailLashTimer = 0;
        this.tailLashWindupDuration = 0.9;
        this.tailLashActiveDuration = 0.34;
        this.tailLashRecoveryDuration = 1.0;
        this.tailLashCooldownTimer = 0;
        this.tailLashCooldownDuration = 2.8;
        this.tailLashDamage = 15;
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
        this.doubleTailLashGap = 0.34;

        // ── ice breath ──
        this.iceBreathQueued = false;
        this.iceBreathTimer = 0;
        this.iceBreathWindupDuration = 1.1;
        this.iceBreathActiveDuration = 4;
        this.iceBreathRecoveryDuration = 1.1;
        this.iceBreathCooldownTimer = 0;
        this.iceBreathCooldownDuration = 7.0;
        this.iceBreathDamage = 5;         // tick damage
        this.iceBreathKnockbackX = 40;
        this.iceBreathKnockbackY = -40;
        this.iceBreathHasConnected = false;
        this.iceBreathHitbox = null;
        this.iceBreathHitboxOffset = new Vec2(this.hitboxHalfSize.x + 20, 0);
        this.iceBreathHitboxHalfSize = new Vec2(90, 28);
        this.iceBreathTickTimer = 0;
        this.iceBreathTickInterval = 0.45;
        this.iceBreathOuterVisual = null;
        this.iceBreathCoreVisual = null;
        this.iceBreathVisualHalfHeight = Math.max(18, this.iceBreathHitboxHalfSize.y + 6);
        this.iceBreathVisualMaxLength = this.iceBreathHitboxHalfSize.x * 2 + 48;

        this.glacialRoarAuraOuterRing = [];
        this.glacialRoarAuraInnerRing = [];
        this.glacialRoarAuraSegments = 20;
        this.glacialRoarAuraOuterRadius = Math.max(this.hitboxHalfSize.x, this.hitboxHalfSize.y) * 1.95;
        this.glacialRoarAuraInnerRadius = this.glacialRoarAuraOuterRadius * 0.72;
        this.glacialRoarAuraPulseTimer = 0;

        // ── death ──
        this.deathSequenceStarted = false;
        this.deathPoseSettled = false;

        // Player-on-top anti-camping
        this.playerOnTopTimer = 0;
        this.playerOnTopDuration = 0.5; // seconds before sliding off
        this.playerSlideOffKnockbackX = 220;
        this.playerSlideOffKnockbackY = -60;
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
        this.updateArenaSlamWave(deltaT);

        // ── Death sequence ──────────────────────────────────────────────
        if (this.bossState.isDefeated()) {
            this.resetAllAttacks();
            this.clearAllIcicleTelegraphs();
            this.clearAllIcicleProjectiles();
            this.clearDiveWarningTelegraphs();
            this.clearDiveLandingShockwaves();
            this.clearArenaSlamWave();
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
                const bodyCenter = this.owner.collisionShape.center;
                const floorY = this.findFloorTopAtX(bodyCenter.x, bodyCenter.y);
                if (floorY !== null) {
                    const groundedCenterY = floorY - this.hitboxHalfSize.y - 1;
                    this.hoverY = groundedCenterY - this.hoverHeightOffset;
                    this.arenaFloorY = groundedCenterY;
                } else {
                    this.hoverY = this.owner.position.y - this.hoverHeightOffset;
                }
            } else {
                this.currentAction = "idle";
                this.plannedAction = null;
                this.owner.animation.playIfNotAlready(SerisAnimations.IDLE, true);
                return;
            }
        }

        // ── Airborne phase ──────────────────────────────────────────────
        if (this.isAirborne) {
            if (this.currentAction === "diveBomb") {
                this.updateDiveBomb(deltaT);
            } else {
                this.updateAirbornePhase(deltaT, deltaX);
            }
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
        // Avoid carrying stale grounded state from the ground phase.
        this.grounded = false;

        // Drift horizontally toward the player while airborne
        const direction = deltaX < 0 ? -1 : 1;
        this.velocity.x = direction * (this.moveSpeed * 0.6);

        // Hover: nudge back toward hoverY
        const yDiff = this.hoverY - this.owner.position.y;
        this.velocity.y = Math.sign(yDiff) * Math.min(Math.abs(yDiff) * 4, 120);

        // Airborne movement should not be tile-snapped; use direct movement.
        this.owner.move(this.velocity.scaled(deltaT));

        // Safety: if we remain "airborne" while physically on floor, recover into
        // ground phase so Seris cannot get stuck in flying state.
        const bodyCenter = this.owner.collisionShape.center;
        const floorY = this.findFloorTopAtX(bodyCenter.x, bodyCenter.y);
        const feetY = bodyCenter.y + this.hitboxHalfSize.y;
        const touchingFloor =
            (this.owner.onGround || (floorY !== null && feetY >= floorY - 2)) &&
            this.velocity.y >= -8;
        if (touchingFloor) {
            this.airborneGroundedStallTimer += deltaT;
            if (this.airborneGroundedStallTimer >= this.airborneGroundedStallDuration) {
                this.recoverFromAirborneGroundStall(floorY);
                return;
            }
        } else {
            this.airborneGroundedStallTimer = 0;
        }

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
        if (this.currentAction === "diveBomb") {
            return;
        }

        this.currentAction = "diveBomb";
        this.attackPhase = "windup";
        this.diveWindupTimer = 0;
        this.airborneGroundedStallTimer = 0;
        this.diveTargetX = this.owner.position.x;
        this.diveWarningFloorY = this.findFloorTopAtX(this.diveTargetX, this.owner.collisionShape.center.y);
        this.airborneTimer = 0;
        this.clearAllIcicleTelegraphs();
        this.createDiveWarningTelegraphs();
        this.owner.animation.play(SerisAnimations.FLYING, true);
    }

    protected updateDiveBomb(deltaT: number): void {
        if (this.attackPhase === "windup") {
            this.diveWindupTimer += deltaT;
            this.updateDiveWarningTelegraphs(deltaT);
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.owner.position.x = this.diveTargetX;
            if (this.diveWindupTimer >= this.diveWindupDuration) {
                this.attackPhase = "active";
                this.clearDiveWarningTelegraphs();
            }
            return;
        }

        // Descend deterministically toward sampled floor to avoid physics-snap misses.
        this.velocity.x = 0;
        this.velocity.y = this.diveDescentSpeed;
        this.owner.position.x = this.diveTargetX;

        const bodyCenter = this.owner.collisionShape.center;
        const floorY = this.findFloorTopAtX(this.diveTargetX, bodyCenter.y) ?? this.diveWarningFloorY;
        if (floorY === null) {
            // Fallback if tile probe fails: keep descending and wait for next frame probe.
            this.owner.position.y += this.diveDescentSpeed * deltaT;
            return;
        }

        const landingCenterY = floorY - this.hitboxHalfSize.y - 1;
        const nextCenterY = this.owner.position.y + this.diveDescentSpeed * deltaT;
        if (nextCenterY >= landingCenterY) {
            this.owner.position.y = landingCenterY;
            this.finalizeDiveLanding(floorY);
            return;
        }

        this.owner.position.y = nextCenterY;
    }

    protected recoverFromAirborneGroundStall(floorY: number | null): void {
        if (floorY !== null) {
            this.owner.position.y = floorY - this.hitboxHalfSize.y - 1;
        }

        this.velocity.x = 0;
        this.velocity.y = 0;
        this.grounded = true;
        this.arenaFloorY = this.owner.position.y;
        this.hoverY = this.arenaFloorY - this.hoverHeightOffset;
        this.groundPhaseTimer = 0;
        this.isAirborne = false;
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.diveWindupTimer = 0;
        this.diveWarningFloorY = null;
        this.airborneGroundedStallTimer = 0;
        this.clearDiveWarningTelegraphs();
        this.owner.animation.play(SerisAnimations.IDLE, true);
    }

    protected finalizeDiveLanding(floorY: number | null): void {
        if (floorY !== null) {
            this.owner.position.y = floorY - this.hitboxHalfSize.y - 1;
        }

        this.velocity.x = 0;
        this.velocity.y = 0;
        this.grounded = true;
        this.applyDiveImpactDamage();
        this.arenaFloorY = this.owner.position.y;
        this.hoverY = this.arenaFloorY - this.hoverHeightOffset;
        this.spawnDiveLandingShockwaves();
        this.spawnArenaSlamWave();
        this.groundPhaseTimer = 0;
        this.isAirborne = false;
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.diveWindupTimer = 0;
        this.diveWarningFloorY = null;
        this.airborneGroundedStallTimer = 0;
        this.clearDiveWarningTelegraphs();
        this.owner.animation.play(SerisAnimations.IDLE, true);
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

        // Prevent player from standing on Seris' hitbox: detect if the
        // player's feet are resting on Seris' top and, after a short
        // duration, nudge the player off to avoid camping on the boss.
        try {
            if (this.player.hasPhysics && this.owner.hasPhysics) {
                const pRect = this.player.collisionShape.getBoundingRect();
                const sRect = this.owner.collisionShape.getBoundingRect();
                const playerBottom = pRect.center.y + pRect.halfSize.y;
                const serisTop = sRect.center.y - sRect.halfSize.y;
                const horizOverlap = Math.abs(pRect.center.x - sRect.center.x) <= (sRect.halfSize.x + pRect.halfSize.x - 8);
                const standingOnTop = horizOverlap && playerBottom >= serisTop - 18 && playerBottom <= serisTop + 6 && this.player.position.y < this.owner.position.y;

                if (standingOnTop) {
                    this.playerOnTopTimer += deltaT;
                    if (this.playerOnTopTimer >= this.playerOnTopDuration) {
                        const pc = this.player.ai as PlayerController | undefined;
                        if (pc !== undefined) {
                            const dir = this.player.position.x < this.owner.position.x ? -1 : 1;
                            pc.applyDamage(10, new Vec2(this.playerSlideOffKnockbackX * dir, this.playerSlideOffKnockbackY));
                        }
                        this.playerOnTopTimer = 0;
                    }
                } else {
                    this.playerOnTopTimer = Math.max(0, this.playerOnTopTimer - deltaT);
                }
            }
        } catch (e) {
            // Be defensive: if shapes are not available for some reason,
            // don't crash the boss update loop.
        }

        // After ground phase duration, rise back into air
        if (this.groundPhaseTimer >= this.groundPhaseDuration && this.currentAction === "idle") {
            this.riseToAir();
        }

        // Fallback: never remain grounded indefinitely if action state gets stuck.
        if (this.groundPhaseTimer >= this.groundPhaseDuration + 2.0) {
            this.riseToAir();
        }
    }

    protected riseToAir(): void {
        this.isAirborne = true;
        this.grounded = false;
        this.airborneTimer = 0;
        this.airborneGroundedStallTimer = 0;
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
        this.glacialRoarAuraPulseTimer = 0;
        this.glacialRoarQueued = false;
        this.glacialRoarCooldownTimer = this.glacialRoarCooldownDuration;
        this.velocity.x = 0;
        this.createGlacialRoarAuraVisuals();
        this.owner.animation.play(SerisAnimations.GLACIAL_ROAR, false);
    }

    protected updateGlacialRoarAction(deltaT: number): void {
        this.glacialRoarTimer += deltaT;
        this.updateGlacialRoarAuraVisuals(deltaT);

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
            // If the scene provided snowman spawn points, summon them now.
            if (this.glacialRoarSnowmanSpawns && this.glacialRoarSnowmanSpawns.length > 0) {
                const scene: any = this.owner.getScene();
                for (const sp of this.glacialRoarSnowmanSpawns) {
                    // Call the scene's spawnSnowman helper if available
                    if (typeof scene.spawnSnowman === "function") {
                        scene.spawnSnowman(sp.clone());
                    }
                }
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
        this.clearGlacialRoarAuraVisuals();
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
        this.createIceBreathVisuals();
        this.owner.animation.play(SerisAnimations.ICE_BREATH, false);
    }

    protected updateIceBreathAction(deltaT: number): void {
        this.iceBreathTimer += deltaT;
        this.updateIceBreathHitbox();
        this.updateIceBreathVisuals();

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
        this.clearIceBreathVisuals();
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
        this.diveWindupTimer = 0;
        this.diveWarningFloorY = null;
        this.airborneGroundedStallTimer = 0;
        this.clearDiveWarningTelegraphs();
        this.clearArenaSlamWave();
        this.clearIceBreathVisuals();
        this.clearGlacialRoarAuraVisuals();
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
        outerVisual.color = new Color(30, 74, 126, 0.22);
        outerVisual.borderColor = new Color(62, 126, 194, 0.48);
        outerVisual.borderWidth = 2;

        const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: new Vec2(dropX, markerCenterY),
            size: new Vec2(this.icicleHalfSize.x * 2, markerHeight)
        });
        coreVisual.color = new Color(44, 94, 154, 0.18);
        coreVisual.borderColor = new Color(88, 148, 212, 0.34);
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

            telegraph.outerVisual.color = new Color(30, 74, 126, 0.14 + 0.26 * progress);
            telegraph.outerVisual.borderColor = new Color(62, 126, 194, 0.28 + 0.34 * progress);
            telegraph.coreVisual.color = new Color(44, 94, 154, 0.12 + 0.24 * progress);
            telegraph.coreVisual.borderColor = new Color(88, 148, 212, 0.20 + 0.28 * progress);
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
            outerVisual.color = new Color(24, 68, 122, 0.32);
            outerVisual.borderColor = new Color(78, 142, 208, 0.72);
            outerVisual.borderWidth = 3;

            const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
                position: center.clone(),
                size: new Vec2(
                    this.diveLandingShockwaveHalfSize.x * 2,
                    this.diveLandingShockwaveHalfSize.y * 2
                )
            });
            coreVisual.color = new Color(40, 96, 156, 0.30);
            coreVisual.borderColor = new Color(102, 168, 224, 0.54);
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
                outerV.color = new Color(24, 68, 122, 0.32 * (1 - progress * 0.8));
                outerV.borderColor = new Color(78, 142, 208, Math.max(0.25, 0.72 - progress * 0.38));
            }

            if (coreV !== null) {
                coreV.position.copy(shockwave.center);
                coreV.size.set(
                    this.diveLandingShockwaveHalfSize.x * 2 * widthPulse,
                    this.diveLandingShockwaveHalfSize.y * 2
                );
                coreV.color = new Color(40, 96, 156, 0.30 * (1 - progress * 0.9));
                coreV.borderColor = new Color(102, 168, 224, Math.max(0.16, 0.54 - progress * 0.3));
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

    protected spawnArenaSlamWave(): void {
        this.clearArenaSlamWave();
        const scene = this.owner.getScene();
        const tileSize = this.walls.getTileSize();
        const mapDims = this.walls.getDimensions();
        const worldWidth = mapDims.x * tileSize.x * this.walls.scale.x;
        const groundY = this.owner.position.y + this.hitboxHalfSize.y - 8;
        const halfWidth = Math.max(this.arenaSlamWaveHalfSize.x, worldWidth * 0.5);

        this.arenaSlamWave = {
            center: new Vec2(worldWidth * 0.5, groundY - this.arenaSlamWaveHalfSize.y),
            halfSize: new Vec2(halfWidth, this.arenaSlamWaveHalfSize.y),
            active: true,
            elapsed: 0,
            hasConnected: false
        };

        this.arenaSlamWaveOuterVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: this.arenaSlamWave.center.clone(),
            size: new Vec2(this.arenaSlamWave.halfSize.x * 2 + 18, this.arenaSlamWave.halfSize.y * 2 + 8)
        });
        this.arenaSlamWaveOuterVisual.color = new Color(22, 62, 118, 0.30);
        this.arenaSlamWaveOuterVisual.borderColor = new Color(76, 142, 212, 0.74);
        this.arenaSlamWaveOuterVisual.borderWidth = 3;

        this.arenaSlamWaveCoreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: this.arenaSlamWave.center.clone(),
            size: new Vec2(this.arenaSlamWave.halfSize.x * 2, this.arenaSlamWave.halfSize.y * 2)
        });
        this.arenaSlamWaveCoreVisual.color = new Color(38, 96, 162, 0.28);
        this.arenaSlamWaveCoreVisual.borderColor = new Color(106, 172, 228, 0.54);
        this.arenaSlamWaveCoreVisual.borderWidth = 1;
    }

    protected updateArenaSlamWave(deltaT: number): void {
        if (this.arenaSlamWave === null || !this.arenaSlamWave.active) {
            return;
        }

        this.arenaSlamWave.elapsed += deltaT;
        const progress = Math.min(1, this.arenaSlamWave.elapsed / Math.max(this.arenaSlamWaveDuration, 0.01));
        const widthPulse = 1 + 0.06 * Math.sin(progress * Math.PI * 8);

        if (this.arenaSlamWaveOuterVisual !== null) {
            this.arenaSlamWaveOuterVisual.position.copy(this.arenaSlamWave.center);
            this.arenaSlamWaveOuterVisual.size.x = (this.arenaSlamWave.halfSize.x * 2 + 18) * widthPulse;
            this.arenaSlamWaveOuterVisual.color = new Color(22, 62, 118, 0.30 * (1 - progress * 0.9));
            this.arenaSlamWaveOuterVisual.borderColor = new Color(76, 142, 212, Math.max(0.22, 0.74 - progress * 0.5));
        }

        if (this.arenaSlamWaveCoreVisual !== null) {
            this.arenaSlamWaveCoreVisual.position.copy(this.arenaSlamWave.center);
            this.arenaSlamWaveCoreVisual.size.x = (this.arenaSlamWave.halfSize.x * 2) * widthPulse;
            this.arenaSlamWaveCoreVisual.color = new Color(38, 96, 162, 0.28 * (1 - progress * 0.95));
            this.arenaSlamWaveCoreVisual.borderColor = new Color(106, 172, 228, Math.max(0.14, 0.54 - progress * 0.35));
        }

        this.tryApplyArenaSlamWaveDamage();

        if (this.arenaSlamWave.elapsed >= this.arenaSlamWaveDuration) {
            this.clearArenaSlamWave();
        }
    }

    protected tryApplyArenaSlamWaveDamage(): void {
        if (
            this.arenaSlamWave === null ||
            !this.arenaSlamWave.active ||
            this.arenaSlamWave.hasConnected ||
            !this.player.hasPhysics
        ) {
            return;
        }

        const shockwaveShape = new AABB(
            this.arenaSlamWave.center.clone(),
            this.arenaSlamWave.halfSize.clone()
        );
        if (!shockwaveShape.overlaps(this.player.collisionShape.getBoundingRect())) {
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if (playerController !== undefined) {
            const knockDirection = this.player.position.x < this.owner.position.x ? -1 : 1;
            playerController.applyDamage(this.arenaSlamWaveDamage, new Vec2(
                this.arenaSlamWaveKnockbackX * knockDirection,
                this.arenaSlamWaveKnockbackY
            ));
        }

        this.arenaSlamWave.hasConnected = true;
    }

    protected clearArenaSlamWave(): void {
        if (this.arenaSlamWaveOuterVisual !== null) {
            this.arenaSlamWaveOuterVisual.destroy();
            this.arenaSlamWaveOuterVisual = null;
        }

        if (this.arenaSlamWaveCoreVisual !== null) {
            this.arenaSlamWaveCoreVisual.destroy();
            this.arenaSlamWaveCoreVisual = null;
        }

        this.arenaSlamWave = null;
    }

    protected createDiveWarningTelegraphs(): void {
        this.clearDiveWarningTelegraphs();
        const scene = this.owner.getScene();
        const floorY = this.diveWarningFloorY ?? this.arenaFloorY ?? (this.owner.position.y + this.hoverHeightOffset);
        const markerHeight = Math.max(56, floorY - this.owner.position.y + this.hitboxHalfSize.y + this.diveWarningPadding);
        const centerY = this.owner.position.y + markerHeight * 0.5;
        const centerX = this.diveTargetX;

        const outerVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: new Vec2(centerX, centerY),
            size: new Vec2(this.diveWarningWidth + 16, markerHeight)
        });
        outerVisual.color = new Color(18, 48, 92, 0.24);
        outerVisual.borderColor = new Color(68, 136, 204, 0.58);
        outerVisual.borderWidth = 3;

        const coreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: new Vec2(centerX, centerY),
            size: new Vec2(this.diveWarningWidth, markerHeight)
        });
        coreVisual.color = new Color(30, 78, 132, 0.18);
        coreVisual.borderColor = new Color(92, 164, 224, 0.42);
        coreVisual.borderWidth = 1;

        this.diveWarningTelegraphs.push({
            outerVisual,
            coreVisual,
            elapsed: 0
        });
    }

    protected updateDiveWarningTelegraphs(deltaT: number): void {
        for (const warning of this.diveWarningTelegraphs) {
            warning.elapsed += deltaT;
            const progress = Math.min(1, warning.elapsed / Math.max(this.diveWindupDuration, 0.01));
            const pulse = 0.9 + 0.15 * Math.sin(progress * Math.PI * 8);
            warning.outerVisual.color = new Color(18, 48, 92, 0.18 + 0.28 * progress);
            warning.outerVisual.borderColor = new Color(68, 136, 204, 0.30 + 0.55 * progress);
            warning.coreVisual.color = new Color(30, 78, 132, 0.12 + 0.22 * progress);
            warning.coreVisual.borderColor = new Color(92, 164, 224, 0.20 + 0.40 * progress);
            warning.outerVisual.size.x = (this.diveWarningWidth + 16) * pulse;
            warning.coreVisual.size.x = this.diveWarningWidth * pulse;
        }
    }

    protected clearDiveWarningTelegraphs(): void {
        for (const warning of this.diveWarningTelegraphs) {
            warning.outerVisual.destroy();
            warning.coreVisual.destroy();
        }
        this.diveWarningTelegraphs = [];
    }

    protected applyDiveImpactDamage(): void {
        if (!this.player.hasPhysics) {
            return;
        }

        const impactCenter = new Vec2(
            this.owner.position.x,
            this.owner.position.y + this.hitboxHalfSize.y - this.diveImpactHalfSize.y
        );
        const impactShape = new AABB(impactCenter, this.diveImpactHalfSize.clone());
        if (!impactShape.overlaps(this.player.collisionShape.getBoundingRect())) {
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if (playerController !== undefined) {
            const knockDir = this.player.position.x < this.owner.position.x ? -1 : 1;
            playerController.applyDamage(this.diveImpactDamage, new Vec2(
                this.diveLandingKnockbackX * knockDir,
                this.diveLandingKnockbackY
            ));
        }
    }

    protected createIceBreathVisuals(): void {
        this.clearIceBreathVisuals();
        const scene = this.owner.getScene();
        this.iceBreathOuterVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: this.owner.position.clone(),
            size: new Vec2(28, this.iceBreathVisualHalfHeight * 2 + 8)
        });
        this.iceBreathOuterVisual.color = new Color(28, 72, 122, 0.22);
        this.iceBreathOuterVisual.borderColor = new Color(74, 144, 214, 0.54);
        this.iceBreathOuterVisual.borderWidth = 2;

        this.iceBreathCoreVisual = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: this.owner.position.clone(),
            size: new Vec2(22, this.iceBreathVisualHalfHeight * 2)
        });
        this.iceBreathCoreVisual.color = new Color(46, 102, 164, 0.20);
        this.iceBreathCoreVisual.borderColor = new Color(108, 176, 230, 0.40);
        this.iceBreathCoreVisual.borderWidth = 1;
    }

    protected updateIceBreathVisuals(): void {
        if (this.iceBreathOuterVisual === null || this.iceBreathCoreVisual === null) {
            return;
        }

        const facingDirection = this.owner.invertX ? -1 : 1;
        const progress =
            this.attackPhase === "windup"
                ? Math.min(1, this.iceBreathTimer / Math.max(this.iceBreathWindupDuration, 0.01))
                : this.attackPhase === "active"
                    ? 1
                    : Math.max(
                        0,
                        1 - (
                            this.iceBreathTimer -
                            this.iceBreathWindupDuration -
                            this.iceBreathActiveDuration
                        ) / Math.max(this.iceBreathRecoveryDuration, 0.01)
                    );

        const beamLength = Math.max(20, this.iceBreathVisualMaxLength * progress);
        const beamCenter = new Vec2(
            this.owner.position.x + facingDirection * (this.hitboxHalfSize.x + beamLength * 0.5 + 10),
            this.owner.position.y + this.iceBreathHitboxOffset.y
        );
        const pulse = this.attackPhase === "active" ? 1 + 0.08 * Math.sin(this.iceBreathTimer * Math.PI * 8) : 1;

        this.iceBreathOuterVisual.position.copy(beamCenter);
        this.iceBreathOuterVisual.size.set(beamLength * pulse, this.iceBreathVisualHalfHeight * 2 + 8);
        this.iceBreathOuterVisual.color = new Color(28, 72, 122, 0.14 + 0.20 * progress);
        this.iceBreathOuterVisual.borderColor = new Color(74, 144, 214, 0.26 + 0.46 * progress);

        this.iceBreathCoreVisual.position.copy(beamCenter);
        this.iceBreathCoreVisual.size.set(Math.max(14, (beamLength - 8) * pulse), this.iceBreathVisualHalfHeight * 2);
        this.iceBreathCoreVisual.color = new Color(46, 102, 164, 0.10 + 0.22 * progress);
        this.iceBreathCoreVisual.borderColor = new Color(108, 176, 230, 0.18 + 0.34 * progress);
    }

    protected clearIceBreathVisuals(): void {
        if (this.iceBreathOuterVisual !== null) {
            this.iceBreathOuterVisual.destroy();
            this.iceBreathOuterVisual = null;
        }

        if (this.iceBreathCoreVisual !== null) {
            this.iceBreathCoreVisual.destroy();
            this.iceBreathCoreVisual = null;
        }
    }

    protected createGlacialRoarAuraVisuals(): void {
        this.clearGlacialRoarAuraVisuals();
        const scene = this.owner.getScene();

        for (let i = 0; i < this.glacialRoarAuraSegments; i++) {
            const outerSeg = <Line>scene.add.graphic(GraphicType.LINE, "PRIMARY", {
                start: this.owner.position.clone(),
                end: this.owner.position.clone()
            });
            outerSeg.thickness = 3;
            outerSeg.color = new Color(86, 176, 244, 0.62);
            this.glacialRoarAuraOuterRing.push(outerSeg);

            const innerSeg = <Line>scene.add.graphic(GraphicType.LINE, "PRIMARY", {
                start: this.owner.position.clone(),
                end: this.owner.position.clone()
            });
            innerSeg.thickness = 2;
            innerSeg.color = new Color(132, 212, 255, 0.44);
            this.glacialRoarAuraInnerRing.push(innerSeg);
        }
    }

    protected updateGlacialRoarAuraVisuals(deltaT: number): void {
        if (this.glacialRoarAuraOuterRing.length === 0 || this.glacialRoarAuraInnerRing.length === 0) {
            return;
        }

        this.glacialRoarAuraPulseTimer += deltaT;
        const pulse = 1 + 0.10 * Math.sin(this.glacialRoarAuraPulseTimer * Math.PI * 5.5);
        const intensity =
            this.attackPhase === "windup"
                ? Math.min(1, this.glacialRoarTimer / Math.max(this.glacialRoarWindupDuration, 0.01))
                : this.attackPhase === "active"
                    ? 1
                    : Math.max(
                        0,
                        1 - (
                            this.glacialRoarTimer -
                            this.glacialRoarWindupDuration -
                            this.glacialRoarActiveDuration
                        ) / Math.max(this.glacialRoarRecoveryDuration, 0.01)
                    );

        const center = this.owner.position.clone();
        const outerRadius = this.glacialRoarAuraOuterRadius * pulse;
        const innerRadius = this.glacialRoarAuraInnerRadius * pulse;
        const segmentCount = this.glacialRoarAuraSegments;
        const outerAlpha = 0.22 + 0.64 * intensity;
        const innerAlpha = 0.18 + 0.54 * intensity;

        for (let i = 0; i < segmentCount; i++) {
            const t0 = (i / segmentCount) * Math.PI * 2;
            const t1 = ((i + 1) / segmentCount) * Math.PI * 2;

            const outerStart = new Vec2(
                center.x + Math.cos(t0) * outerRadius,
                center.y + Math.sin(t0) * outerRadius
            );
            const outerEnd = new Vec2(
                center.x + Math.cos(t1) * outerRadius,
                center.y + Math.sin(t1) * outerRadius
            );
            this.glacialRoarAuraOuterRing[i].start = outerStart;
            this.glacialRoarAuraOuterRing[i].end = outerEnd;
            this.glacialRoarAuraOuterRing[i].color = new Color(86, 176, 244, outerAlpha);

            const innerStart = new Vec2(
                center.x + Math.cos(t0) * innerRadius,
                center.y + Math.sin(t0) * innerRadius
            );
            const innerEnd = new Vec2(
                center.x + Math.cos(t1) * innerRadius,
                center.y + Math.sin(t1) * innerRadius
            );
            this.glacialRoarAuraInnerRing[i].start = innerStart;
            this.glacialRoarAuraInnerRing[i].end = innerEnd;
            this.glacialRoarAuraInnerRing[i].color = new Color(132, 212, 255, innerAlpha);
        }
    }

    protected clearGlacialRoarAuraVisuals(): void {
        for (const seg of this.glacialRoarAuraOuterRing) {
            seg.destroy();
        }

        for (const seg of this.glacialRoarAuraInnerRing) {
            seg.destroy();
        }

        this.glacialRoarAuraOuterRing = [];
        this.glacialRoarAuraInnerRing = [];
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

    protected findFloorTopAtX(worldX: number, startY: number): number | null {
        const tileSize = this.walls.getTileSize();
        const worldHeight = this.walls.getDimensions().y;
        const col = this.walls.getColRowAt(new Vec2(worldX, startY)).x;
        const startRow = Math.max(0, this.walls.getColRowAt(new Vec2(worldX, startY)).y - 3);
        const tileScaleY = this.walls.scale.y;

        for (let row = startRow; row < worldHeight; row++) {
            if (!this.walls.isTileCollidable(col, row)) {
                continue;
            }

            return row * tileSize.y * tileScaleY;
        }

        // Fallback: choose the collidable tile-top nearest to current Y in this column.
        let nearest: number | null = null;
        let nearestDist = Number.POSITIVE_INFINITY;
        for (let row = 0; row < worldHeight; row++) {
            if (!this.walls.isTileCollidable(col, row)) {
                continue;
            }

            const tileTopY = row * tileSize.y * tileScaleY;
            const dist = Math.abs(tileTopY - startY);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = tileTopY;
            }
        }

        if (nearest !== null) {
            return nearest;
        }

        return null;
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

                    const tileTopY   = row * tileSize.y * this.walls.scale.y;
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
