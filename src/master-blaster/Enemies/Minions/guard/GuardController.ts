import ControllerAI from "../../../../Wolfie2D/AI/ControllerAI";
import AABB from "../../../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../../../Wolfie2D/Events/GameEvent";
import { GraphicType } from "../../../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../../../Wolfie2D/Nodes/Graphics/Rect";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Color from "../../../../Wolfie2D/Utils/Color";
import PlayerController from "../../../Player/PlayerController";
import MBAnimatedSprite from "../../../Nodes/MBAnimatedSprite";
import { EnemyDamageable } from "../../EnemyDamageable";
import {
    DEFAULT_GUARD_AGGRO_RANGE_X,
    DEFAULT_GUARD_AGGRO_RANGE_Y,
    DEFAULT_GUARD_CHARGE_COOLDOWN,
    DEFAULT_GUARD_CHARGE_DAMAGE,
    DEFAULT_GUARD_CHARGE_DURATION,
    DEFAULT_GUARD_CHARGE_SPEED,
    DEFAULT_GUARD_FADE_DEATH_DURATION,
    DEFAULT_GUARD_GRAVITY,
    DEFAULT_GUARD_HITBOX_HALF_SIZE,
    DEFAULT_GUARD_HIT_FLASH_DURATION,
    DEFAULT_GUARD_JUMP_OVER_TRIGGER_HEIGHT,
    DEFAULT_GUARD_LEASH_DISTANCE,
    DEFAULT_GUARD_MAX_FALL_SPEED,
    DEFAULT_GUARD_MAX_HEALTH,
    DEFAULT_GUARD_MOVE_SPEED,
    DEFAULT_GUARD_REVERSAL_DURATION,
    DEFAULT_GUARD_SHIELD_SLAM_ACTIVE,
    DEFAULT_GUARD_SHIELD_SLAM_COOLDOWN,
    DEFAULT_GUARD_SHIELD_SLAM_DAMAGE,
    DEFAULT_GUARD_SHIELD_SLAM_HITBOX_HALF_SIZE,
    DEFAULT_GUARD_SHIELD_SLAM_HITBOX_OFFSET,
    DEFAULT_GUARD_SHIELD_SLAM_RECOVERY,
    DEFAULT_GUARD_SHIELD_SLAM_WINDUP,
    DEFAULT_GUARD_SLAM_RANGE_X,
    DEFAULT_GUARD_SLAM_RANGE_Y
} from "./GuardConfig";
import { GuardAnimations } from "./GuardAnimations";
import GuardState from "./GuardState";
import { GuardAction, GuardAttackPhase, GuardControllerOptions } from "./GuardTypes";

export default class GuardController extends ControllerAI implements EnemyDamageable {
    protected owner!: MBAnimatedSprite;
    protected player!: AnimatedSprite;
    protected state!: GuardState;

    protected homePosition!: Vec2;
    protected velocity!: Vec2;
    protected hitboxHalfSize!: Vec2;
    protected aggroRangeX!: number;
    protected aggroRangeY!: number;
    protected leashDistance!: number;
    protected moveSpeed!: number;
    protected slamRangeX!: number;
    protected slamRangeY!: number;
    protected shieldSlamDamage!: number;
    protected shieldSlamWindup!: number;
    protected shieldSlamActive!: number;
    protected shieldSlamRecovery!: number;
    protected shieldSlamCooldown!: number;
    protected shieldSlamHitboxOffset!: Vec2;
    protected shieldSlamHitboxHalfSize!: Vec2;
    protected chargeSpeed!: number;
    protected chargeDamage!: number;
    protected chargeDuration!: number;
    protected chargeCooldown!: number;
    protected reversalDuration!: number;
    protected jumpOverTriggerHeight!: number;
    protected gravity!: number;
    protected maxFallSpeed!: number;
    protected hitFlashDuration!: number;
    protected fadeDeathDuration!: number;

    protected currentAction!: GuardAction;
    protected attackPhase!: GuardAttackPhase;
    protected actionTimer!: number;
    protected shieldSlamCooldownTimer!: number;
    protected chargeCooldownTimer!: number;
    protected hitFlashTimer!: number;
    protected deathFadeTimer!: number;
    protected hurtCooldownTimer!: number;
    protected hurtCooldownDuration!: number;
    protected attackHasConnected!: boolean;
    protected wasPlayerOnFrontSide!: boolean;
    // Reversal hit glow visual
    protected reversalGlowVisual: Rect | null = null;
    protected reversalGlowTimer!: number;
    protected reversalGlowDuration!: number;
    // During reversal, store which side (left) was closer to the player so
    // the vulnerable hitbox can be aligned to the side the player is on.
    protected reversalVulnerableSideIsLeft?: boolean;

    public initializeAI(owner: MBAnimatedSprite, options: GuardControllerOptions): void {
        this.owner = owner;
        this.player = options.player;
        this.state = new GuardState(options.maxHealth ?? DEFAULT_GUARD_MAX_HEALTH);

        this.homePosition = (options.homePosition ?? owner.position).clone();
        this.velocity = Vec2.ZERO;
        this.hitboxHalfSize = (options.hitboxHalfSize ?? DEFAULT_GUARD_HITBOX_HALF_SIZE).clone();
        this.aggroRangeX = options.aggroRangeX ?? DEFAULT_GUARD_AGGRO_RANGE_X;
        this.aggroRangeY = options.aggroRangeY ?? DEFAULT_GUARD_AGGRO_RANGE_Y;
        this.leashDistance = options.leashDistance ?? DEFAULT_GUARD_LEASH_DISTANCE;
        this.moveSpeed = options.moveSpeed ?? DEFAULT_GUARD_MOVE_SPEED;
        this.slamRangeX = options.slamRangeX ?? DEFAULT_GUARD_SLAM_RANGE_X;
        this.slamRangeY = options.slamRangeY ?? DEFAULT_GUARD_SLAM_RANGE_Y;
        this.shieldSlamDamage = options.shieldSlamDamage ?? DEFAULT_GUARD_SHIELD_SLAM_DAMAGE;
        this.shieldSlamWindup = options.shieldSlamWindup ?? DEFAULT_GUARD_SHIELD_SLAM_WINDUP;
        this.shieldSlamActive = options.shieldSlamActive ?? DEFAULT_GUARD_SHIELD_SLAM_ACTIVE;
        this.shieldSlamRecovery = options.shieldSlamRecovery ?? DEFAULT_GUARD_SHIELD_SLAM_RECOVERY;
        this.shieldSlamCooldown = options.shieldSlamCooldown ?? DEFAULT_GUARD_SHIELD_SLAM_COOLDOWN;
        this.shieldSlamHitboxOffset = (options.shieldSlamHitboxOffset ?? DEFAULT_GUARD_SHIELD_SLAM_HITBOX_OFFSET).clone();
        this.shieldSlamHitboxHalfSize = (options.shieldSlamHitboxHalfSize ?? DEFAULT_GUARD_SHIELD_SLAM_HITBOX_HALF_SIZE).clone();
        this.chargeSpeed = options.chargeSpeed ?? DEFAULT_GUARD_CHARGE_SPEED;
        this.chargeDamage = options.chargeDamage ?? DEFAULT_GUARD_CHARGE_DAMAGE;
        this.chargeDuration = options.chargeDuration ?? DEFAULT_GUARD_CHARGE_DURATION;
        this.chargeCooldown = options.chargeCooldown ?? DEFAULT_GUARD_CHARGE_COOLDOWN;
        this.reversalDuration = options.reversalDuration ?? DEFAULT_GUARD_REVERSAL_DURATION;
        this.jumpOverTriggerHeight = options.jumpOverTriggerHeight ?? DEFAULT_GUARD_JUMP_OVER_TRIGGER_HEIGHT;
        this.gravity = options.gravity ?? DEFAULT_GUARD_GRAVITY;
        this.maxFallSpeed = options.maxFallSpeed ?? DEFAULT_GUARD_MAX_FALL_SPEED;
        this.hitFlashDuration = options.hitFlashDuration ?? DEFAULT_GUARD_HIT_FLASH_DURATION;
        this.fadeDeathDuration = options.fadeDeathDuration ?? DEFAULT_GUARD_FADE_DEATH_DURATION;

        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.shieldSlamCooldownTimer = 0;
        this.chargeCooldownTimer = 0.4;
        this.hitFlashTimer = 0;
        this.deathFadeTimer = 0;
        this.hurtCooldownTimer = 0;
        this.hurtCooldownDuration = Math.max(this.hitFlashDuration, 0.14);
        this.attackHasConnected = false;
        this.wasPlayerOnFrontSide = this.isPlayerOnFrontSide();

        this.owner.animation.play(GuardAnimations.IDLE, true);

        this.reversalGlowVisual = null;
        this.reversalGlowTimer = 0;
        this.reversalGlowDuration = 0.36;
    }

    public activate(_options: Record<string, any>): void {}
    public handleEvent(_event: GameEvent): void {}

    public update(deltaT: number): void {
        if(this.owner === undefined || this.player === undefined){
            return;
        }

        const deltaX = this.player.position.x - this.owner.position.x;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(this.player.position.y - this.owner.position.y);

        // (Facing update moved below so reversal detection uses previous facing.)

        this.shieldSlamCooldownTimer = Math.max(0, this.shieldSlamCooldownTimer - deltaT);
        this.chargeCooldownTimer = Math.max(0, this.chargeCooldownTimer - deltaT);
        this.hurtCooldownTimer = Math.max(0, this.hurtCooldownTimer - deltaT);
        this.updateHitFlash(deltaT);
        this.updateReversalGlow(deltaT);

        if(this.state.isDefeated()){
            this.updateDeathFade(deltaT);
            return;
        }

        this.checkForJumpOverReversal(absDeltaX);

        // Only update facing when not performing a reversal — reversal locks
        // the guard's facing so front/back vulnerability is reliable.
        if(this.currentAction !== "reversal"){
            this.owner.invertX = deltaX < 0;
        }

        switch(this.currentAction){
            case "shieldSlam":
                this.updateShieldSlam(deltaT);
                break;
            case "charge":
                this.updateCharge(deltaT);
                break;
            case "reversal":
                this.updateReversal(deltaT);
                break;
            default:
                this.updateNeutral(absDeltaX, absDeltaY, deltaX);
                break;
        }

        this.applyGravity(deltaT);
        this.owner.move(this.velocity.scaled(deltaT));
    }

    public damage(amount: number): boolean {
        if(this.hurtCooldownTimer > 0 || this.state.isDefeated()){
            return false;
        }

        // Determine whether the hit came from the front of the guard
        const attackerX = this.player.position.x;

        // By default, determine front using the guard's facing. However,
        // if the guard is in `reversal` we want the vulnerable side to be
        // the side that was closer to the player when reversal started.
        let isFront: boolean;
        if(this.currentAction === "reversal" && this.reversalVulnerableSideIsLeft !== undefined){
            // The "front" is the opposite side of the vulnerable side.
            if(this.reversalVulnerableSideIsLeft){
                isFront = attackerX > this.owner.position.x;
            } else {
                isFront = attackerX < this.owner.position.x;
            }
        } else {
            const facingLeft = this.owner.invertX;
            isFront = facingLeft
                ? attackerX < this.owner.position.x
                : attackerX > this.owner.position.x;
        }

        const playerController = this.player.ai as PlayerController | undefined;

        if(isFront){
            // Front hits are blocked: apply a small knockback to the player but deal no damage
            const knockDir = attackerX < this.owner.position.x ? -1 : 1;
            if(playerController !== undefined){
                playerController.applyDamage(0, new Vec2(80 * knockDir, -40));
            }
            // Short hurt cooldown to prevent spam
            this.hurtCooldownTimer = this.hurtCooldownDuration;
            return false;
        }

        // Back hits — allowed. If the guard is in reversal state, treat as bonus damage
        let finalDamage = amount;
        if(this.currentAction === "reversal"){
            finalDamage = Math.ceil(amount * 2);
        }

        const damaged = this.state.damage(finalDamage);
        if(!damaged){
            return false;
        }

        this.hitFlashTimer = this.hitFlashDuration;
        this.hurtCooldownTimer = this.hurtCooldownDuration;

        // If hit during reversal, spawn a glow visual to show bonus hit
        if(this.currentAction === "reversal"){
            this.spawnReversalGlow();
        }

        if(this.state.isDefeated()){
            this.startDeathFade();
        }

        return true;
    }

    public isDefeated(): boolean {
        return this.state.isDefeated();
    }

    protected updateNeutral(absDeltaX: number, absDeltaY: number, deltaX: number): void {
        const inAggroRange = absDeltaX <= this.aggroRangeX && absDeltaY <= this.aggroRangeY;
        const inSlamRange = absDeltaX <= this.slamRangeX && absDeltaY <= this.slamRangeY;
        const homeDeltaX = this.owner.position.x - this.homePosition.x;

        if(inSlamRange && this.shieldSlamCooldownTimer === 0 && this.owner.onGround){
            this.startShieldSlam();
            return;
        }

        if(inAggroRange && absDeltaX > this.slamRangeX + 18 && this.chargeCooldownTimer === 0 && this.owner.onGround){
            this.startCharge(deltaX < 0 ? -1 : 1);
            return;
        }

        if(inAggroRange && Math.abs(homeDeltaX) <= this.leashDistance){
            const direction = deltaX < 0 ? -1 : 1;
            this.velocity.x = direction * this.moveSpeed;
            this.owner.animation.playIfNotAlready(GuardAnimations.WALK, true);
            return;
        }

        if(Math.abs(homeDeltaX) > 8){
            const returnDirection = homeDeltaX > 0 ? -1 : 1;
            this.velocity.x = returnDirection * this.moveSpeed * 0.65;
            this.owner.invertX = returnDirection < 0;
            this.owner.animation.playIfNotAlready(GuardAnimations.WALK, true);
            return;
        }

        this.velocity.x += (0 - this.velocity.x) * 0.2;
        this.owner.animation.playIfNotAlready(GuardAnimations.IDLE, true);
    }

    protected startShieldSlam(): void {
        this.currentAction = "shieldSlam";
        this.attackPhase = "windup";
        this.actionTimer = 0;
        this.attackHasConnected = false;
        this.velocity.x = 0;
        this.owner.animation.play(GuardAnimations.SHIELD_SLAM, false);
    }

    protected updateShieldSlam(deltaT: number): void {
        this.actionTimer += deltaT;
        this.velocity.x = 0;

        if(this.attackPhase === "windup" && this.actionTimer >= this.shieldSlamWindup){
            this.attackPhase = "active";
        }

        if(this.attackPhase === "active"){
            this.tryApplyShieldSlamDamage();
            if(this.actionTimer >= this.shieldSlamWindup + this.shieldSlamActive){
                this.attackPhase = "recovery";
            }
        }

        if(this.attackPhase === "recovery" && this.actionTimer >= this.shieldSlamWindup + this.shieldSlamActive + this.shieldSlamRecovery){
            this.finishShieldSlam();
        }
    }

    protected finishShieldSlam(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.shieldSlamCooldownTimer = this.shieldSlamCooldown;
        this.owner.animation.play(GuardAnimations.IDLE, true);
    }

    protected startCharge(direction: number): void {
        this.currentAction = "charge";
        this.attackPhase = "active";
        this.actionTimer = 0;
        this.attackHasConnected = false;
        this.velocity.x = this.chargeSpeed * direction;
        this.owner.invertX = direction < 0;
        this.owner.animation.play(GuardAnimations.CHARGE, false);
    }

    protected updateCharge(deltaT: number): void {
        this.actionTimer += deltaT;
        const direction = this.owner.invertX ? -1 : 1;
        this.velocity.x = this.chargeSpeed * direction;
        this.tryApplyChargeDamage();

        if(this.owner.onWall || this.actionTimer >= this.chargeDuration){
            this.finishCharge();
        }
    }

    protected finishCharge(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.chargeCooldownTimer = this.chargeCooldown;
        this.velocity.x = 0;
        this.owner.animation.play(GuardAnimations.IDLE, true);
    }

    protected startReversal(): void {
        this.currentAction = "reversal";
        this.attackPhase = "none";
        this.actionTimer = 0;
        // Record which side the player is on so we can make the vulnerable
        // hitbox face the player during reversal.
        this.reversalVulnerableSideIsLeft = this.player.position.x < this.owner.position.x;
        this.owner.invertX = !this.owner.invertX;
        this.velocity.x = 0;
        this.owner.animation.play(GuardAnimations.REVERSAL, false);
    }

    protected updateReversal(deltaT: number): void {
        this.actionTimer += deltaT;
        this.velocity.x = 0;
        this.owner.animation.playIfNotAlready(GuardAnimations.REVERSAL, false);

        if(this.actionTimer >= this.reversalDuration){
            this.currentAction = "idle";
            this.actionTimer = 0;
            // Clear the temporary reversal-facing flag
            this.reversalVulnerableSideIsLeft = undefined;
            this.owner.animation.play(GuardAnimations.IDLE, true);
        }
    }

    protected spawnReversalGlow(): void {
        const scene: any = this.owner.getScene();
        if(this.reversalGlowVisual !== null){
            this.reversalGlowVisual.destroy();
            this.reversalGlowVisual = null;
        }

        const size = new Vec2(this.owner.size.x * this.owner.scale.x * 1.08, this.owner.size.y * this.owner.scale.y * 1.08);
        const center = this.owner.position.clone();
        const glow = <Rect>scene.add.graphic(GraphicType.RECT, "PRIMARY", {
            position: center.clone(),
            size
        });
        glow.color = new Color(120, 220, 255, 0.52);
        glow.borderColor = new Color(200, 255, 255, 0.9);
        glow.borderWidth = 2;
        this.reversalGlowVisual = glow;
        this.reversalGlowTimer = this.reversalGlowDuration;
    }

    protected updateReversalGlow(deltaT: number): void {
        if(this.reversalGlowVisual === null){
            return;
        }

        this.reversalGlowTimer = Math.max(0, this.reversalGlowTimer - deltaT);
        // Follow the guard
        this.reversalGlowVisual.position.copy(this.owner.position);

        if(this.reversalGlowTimer <= 0){
            this.reversalGlowVisual.destroy();
            this.reversalGlowVisual = null;
        }
    }

    protected checkForJumpOverReversal(absDeltaX: number): void {
        const isFront = this.isPlayerOnFrontSide();

        const playerHighEnough = true;
        // const playerHighEnough =
        //     this.player.position.y <
        //     this.owner.position.y - this.jumpOverTriggerHeight;

        const crossedSides =
            this.wasPlayerOnFrontSide !== isFront;

        if(
            this.currentAction !== "reversal" &&
            crossedSides &&
            playerHighEnough &&
            absDeltaX <= this.hitboxHalfSize.x * 3
        ){
            this.startReversal();
        }

        this.wasPlayerOnFrontSide = isFront;
    }

    protected isPlayerOnFrontSide(): boolean {
        // If the guard is inverted (facing left) then the player's x being
        // less than the guard's x means the player is on the front side.
        // Otherwise (facing right) the player is on the front when to the
        // right of the guard.
        if(this.owner.invertX){
            return this.player.position.x <= this.owner.position.x;
        }
        return this.player.position.x >= this.owner.position.x;
    }

    protected tryApplyShieldSlamDamage(): void {
        if(this.attackHasConnected || !this.player.hasPhysics || !this.owner.hasPhysics){
            return;
        }

        const direction = this.owner.invertX ? -1 : 1;
        const hitboxCenter = new Vec2(
            this.owner.position.x + this.shieldSlamHitboxOffset.x * direction,
            this.owner.position.y + this.shieldSlamHitboxOffset.y
        );
        const attackShape = new AABB(hitboxCenter, this.shieldSlamHitboxHalfSize.clone());
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!attackShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            playerController.applyDamage(this.shieldSlamDamage, new Vec2(150 * direction, -90));
        }

        this.attackHasConnected = true;
    }

    protected tryApplyChargeDamage(): void {
        if(this.attackHasConnected || !this.player.hasPhysics || !this.owner.hasPhysics){
            return;
        }

        const ownerShape = this.owner.collisionShape.getBoundingRect();
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!ownerShape.overlaps(playerShape)){
            return;
        }

        const direction = this.owner.invertX ? -1 : 1;
        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            playerController.applyDamage(this.chargeDamage, new Vec2(185 * direction, -100));
        }

        this.attackHasConnected = true;
    }

    protected applyGravity(deltaT: number): void {
        if(this.currentAction === "dead"){
            return;
        }

        if(!this.owner.onGround){
            this.velocity.y = Math.min(this.maxFallSpeed, this.velocity.y + this.gravity * deltaT);
            return;
        }

        if(this.velocity.y > 0){
            this.velocity.y = 0;
        }
    }

    protected updateHitFlash(deltaT: number): void {
        if(this.currentAction === "dead"){
            return;
        }

        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - deltaT);
        this.owner.alpha = this.hitFlashTimer > 0
            ? (Math.floor(this.hitFlashTimer * 34) % 2 === 0 ? 0.4 : 1)
            : 1;
    }

    protected startDeathFade(): void {
        this.currentAction = "dead";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.velocity = Vec2.ZERO;
        this.owner.animation.stop();
        this.owner.freeze();
        if(this.owner.hasPhysics){
            this.owner.disablePhysics();
        }
    }

    protected updateDeathFade(deltaT: number): void {
        this.deathFadeTimer += deltaT;
        const progress = Math.min(1, this.deathFadeTimer / Math.max(this.fadeDeathDuration, 0.01));
        this.owner.alpha = 1 - progress;

        if(progress >= 1){
            this.owner.destroy();
        }
    }
}
