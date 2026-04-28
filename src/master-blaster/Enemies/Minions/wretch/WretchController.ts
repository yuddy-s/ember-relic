import ControllerAI from "../../../../Wolfie2D/AI/ControllerAI";
import AABB from "../../../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../../../Wolfie2D/Events/GameEvent";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import OrthogonalTilemap from "../../../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import PlayerController from "../../../Player/PlayerController";
import MBAnimatedSprite from "../../../Nodes/MBAnimatedSprite";
import { EnemyDamageable } from "../../EnemyDamageable";
import {
    DEFAULT_WRETCH_AGGRO_RANGE_X,
    DEFAULT_WRETCH_AGGRO_RANGE_Y,
    DEFAULT_WRETCH_ATTACK_ACTIVE,
    DEFAULT_WRETCH_ATTACK_COOLDOWN,
    DEFAULT_WRETCH_ATTACK_DAMAGE,
    DEFAULT_WRETCH_ATTACK_HITBOX_HALF_SIZE,
    DEFAULT_WRETCH_ATTACK_HITBOX_OFFSET,
    DEFAULT_WRETCH_ATTACK_RANGE_X,
    DEFAULT_WRETCH_ATTACK_RANGE_Y,
    DEFAULT_WRETCH_ATTACK_RECOVERY,
    DEFAULT_WRETCH_ATTACK_WINDUP,
    DEFAULT_WRETCH_FADE_DEATH_DURATION,
    DEFAULT_WRETCH_GRAVITY,
    DEFAULT_WRETCH_HITBOX_HALF_SIZE,
    DEFAULT_WRETCH_HIT_FLASH_DURATION,
    DEFAULT_WRETCH_JUMP_ATTACK_COOLDOWN,
    DEFAULT_WRETCH_JUMP_ATTACK_DAMAGE,
    DEFAULT_WRETCH_JUMP_ATTACK_MAX_RANGE_X,
    DEFAULT_WRETCH_JUMP_ATTACK_MIN_RANGE_X,
    DEFAULT_WRETCH_JUMP_ATTACK_RECOVERY,
    DEFAULT_WRETCH_JUMP_SPEED_X,
    DEFAULT_WRETCH_JUMP_SPEED_Y,
    DEFAULT_WRETCH_MAX_FALL_SPEED,
    DEFAULT_WRETCH_MAX_HEALTH,
    DEFAULT_WRETCH_STUN_DURATION,
    DEFAULT_WRETCH_STUN_WINDOW_COOLDOWN
} from "./WretchConfig";
import { WretchAnimations } from "./WretchAnimations";
import WretchState from "./WretchState";
import { WretchAction, WretchAttackPhase, WretchControllerOptions } from "./WretchTypes";

export default class WretchController extends ControllerAI implements EnemyDamageable {
    protected owner!: MBAnimatedSprite;
    protected player!: AnimatedSprite;
    protected walls!: OrthogonalTilemap;
    protected state!: WretchState;

    protected velocity!: Vec2;
    protected hitboxHalfSize!: Vec2;

    protected aggroRangeX!: number;
    protected aggroRangeY!: number;
    protected attackRangeX!: number;
    protected attackRangeY!: number;
    protected attackDamage!: number;
    protected attackWindup!: number;
    protected attackActive!: number;
    protected attackRecovery!: number;
    protected attackCooldown!: number;
    protected attackHitboxOffset!: Vec2;
    protected attackHitboxHalfSize!: Vec2;

    protected jumpAttackMinRangeX!: number;
    protected jumpAttackMaxRangeX!: number;
    protected jumpAttackDamage!: number;
    protected jumpAttackCooldown!: number;
    protected jumpAttackRecovery!: number;
    protected jumpSpeedX!: number;
    protected jumpSpeedY!: number;

    protected gravity!: number;
    protected maxFallSpeed!: number;
    protected stunDuration!: number;
    protected stunWindowCooldown!: number;
    protected hitFlashDuration!: number;
    protected fadeDeathDuration!: number;

    protected currentAction!: WretchAction;
    protected attackPhase!: WretchAttackPhase;
    protected actionTimer!: number;
    protected attackCooldownTimer!: number;
    protected jumpAttackCooldownTimer!: number;
    protected hitFlashTimer!: number;
    protected deathFadeTimer!: number;
    protected hurtCooldownTimer!: number;
    protected hurtCooldownDuration!: number;
    protected stunWindowCooldownTimer!: number;
    protected attackHasConnected!: boolean;
    protected jumpAttackHasConnected!: boolean;
    protected jumpLeftGround!: boolean;

    public initializeAI(owner: MBAnimatedSprite, options: WretchControllerOptions): void {
        this.owner = owner;
        this.player = options.player;
        this.walls = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
        this.state = new WretchState(options.maxHealth ?? DEFAULT_WRETCH_MAX_HEALTH);

        this.velocity = Vec2.ZERO;
        this.hitboxHalfSize = (options.hitboxHalfSize ?? DEFAULT_WRETCH_HITBOX_HALF_SIZE).clone();

        this.aggroRangeX = options.aggroRangeX ?? DEFAULT_WRETCH_AGGRO_RANGE_X;
        this.aggroRangeY = options.aggroRangeY ?? DEFAULT_WRETCH_AGGRO_RANGE_Y;
        this.attackRangeX = options.attackRangeX ?? DEFAULT_WRETCH_ATTACK_RANGE_X;
        this.attackRangeY = options.attackRangeY ?? DEFAULT_WRETCH_ATTACK_RANGE_Y;
        this.attackDamage = options.attackDamage ?? DEFAULT_WRETCH_ATTACK_DAMAGE;
        this.attackWindup = options.attackWindup ?? DEFAULT_WRETCH_ATTACK_WINDUP;
        this.attackActive = options.attackActive ?? DEFAULT_WRETCH_ATTACK_ACTIVE;
        this.attackRecovery = options.attackRecovery ?? DEFAULT_WRETCH_ATTACK_RECOVERY;
        this.attackCooldown = options.attackCooldown ?? DEFAULT_WRETCH_ATTACK_COOLDOWN;
        this.attackHitboxOffset = (options.attackHitboxOffset ?? DEFAULT_WRETCH_ATTACK_HITBOX_OFFSET).clone();
        this.attackHitboxHalfSize = (options.attackHitboxHalfSize ?? DEFAULT_WRETCH_ATTACK_HITBOX_HALF_SIZE).clone();

        this.jumpAttackMinRangeX = options.jumpAttackMinRangeX ?? DEFAULT_WRETCH_JUMP_ATTACK_MIN_RANGE_X;
        this.jumpAttackMaxRangeX = options.jumpAttackMaxRangeX ?? DEFAULT_WRETCH_JUMP_ATTACK_MAX_RANGE_X;
        this.jumpAttackDamage = options.jumpAttackDamage ?? DEFAULT_WRETCH_JUMP_ATTACK_DAMAGE;
        this.jumpAttackCooldown = options.jumpAttackCooldown ?? DEFAULT_WRETCH_JUMP_ATTACK_COOLDOWN;
        this.jumpAttackRecovery = options.jumpAttackRecovery ?? DEFAULT_WRETCH_JUMP_ATTACK_RECOVERY;
        this.jumpSpeedX = options.jumpSpeedX ?? DEFAULT_WRETCH_JUMP_SPEED_X;
        this.jumpSpeedY = options.jumpSpeedY ?? DEFAULT_WRETCH_JUMP_SPEED_Y;

        this.gravity = options.gravity ?? DEFAULT_WRETCH_GRAVITY;
        this.maxFallSpeed = options.maxFallSpeed ?? DEFAULT_WRETCH_MAX_FALL_SPEED;
        this.stunDuration = options.stunDuration ?? DEFAULT_WRETCH_STUN_DURATION;
        this.stunWindowCooldown = options.stunWindowCooldown ?? DEFAULT_WRETCH_STUN_WINDOW_COOLDOWN;
        this.hitFlashDuration = options.hitFlashDuration ?? DEFAULT_WRETCH_HIT_FLASH_DURATION;
        this.fadeDeathDuration = options.fadeDeathDuration ?? DEFAULT_WRETCH_FADE_DEATH_DURATION;
        this.hurtCooldownDuration = Math.max(this.hitFlashDuration, 0.16);

        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.attackCooldownTimer = 0;
        this.jumpAttackCooldownTimer = 0;
        this.hitFlashTimer = 0;
        this.deathFadeTimer = 0;
        this.hurtCooldownTimer = 0;
        this.stunWindowCooldownTimer = 0;
        this.attackHasConnected = false;
        this.jumpAttackHasConnected = false;
        this.jumpLeftGround = false;

        this.owner.animation.play(WretchAnimations.IDLE, true);
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
        this.owner.invertX = deltaX < 0;

        this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - deltaT);
        this.jumpAttackCooldownTimer = Math.max(0, this.jumpAttackCooldownTimer - deltaT);
        this.hurtCooldownTimer = Math.max(0, this.hurtCooldownTimer - deltaT);
        this.stunWindowCooldownTimer = Math.max(0, this.stunWindowCooldownTimer - deltaT);
        this.updateHitFlash(deltaT);

        if(this.state.isDefeated()){
            this.updateDeathFade(deltaT);
            return;
        }

        if(this.currentAction === "attack"){
            this.updateAttack(deltaT);
        } else if(this.currentAction === "jumpAttack"){
            this.updateJumpAttack(deltaT);
        } else if(this.currentAction === "stunned"){
            this.updateStunned(deltaT);
        } else {
            this.selectNeutralAction(absDeltaX, absDeltaY, deltaX);
        }

        this.applyGravity(deltaT);
        this.owner.move(this.velocity.scaled(deltaT));
    }

    public damage(amount: number): boolean {
        if(this.hurtCooldownTimer > 0 || this.state.isDefeated()){
            return false;
        }

        const damaged = this.state.damage(amount);
        if(!damaged){
            return false;
        }

        this.hitFlashTimer = this.hitFlashDuration;
        this.hurtCooldownTimer = this.hurtCooldownDuration;
        if(this.state.isDefeated()){
            this.startDeathFade();
        } else if(
            this.stunWindowCooldownTimer === 0 &&
            (this.currentAction === "attack" || this.currentAction === "jumpAttack")
        ){
            this.startStun();
        }

        return true;
    }

    public isDefeated(): boolean {
        return this.state.isDefeated();
    }

    public getCurrentHealth(): number {
        return this.state.getCurrentHealth();
    }

    public getMaxHealth(): number {
        return this.state.getMaxHealth();
    }

    protected selectNeutralAction(absDeltaX: number, absDeltaY: number, deltaX: number): void {
        const inAttackRange = absDeltaX <= this.attackRangeX && absDeltaY <= this.attackRangeY;
        const inAggroRange = absDeltaX <= this.aggroRangeX && absDeltaY <= this.aggroRangeY;
        const inJumpAttackRange = absDeltaX <= this.jumpAttackMaxRangeX;

        if(inAttackRange && this.attackCooldownTimer === 0 && this.owner.onGround){
            this.startAttack();
            return;
        }

        if(inAggroRange && !inAttackRange && inJumpAttackRange && this.jumpAttackCooldownTimer === 0 && this.owner.onGround){
            this.startJumpAttack(deltaX < 0 ? -1 : 1);
            return;
        }

        this.velocity.x += (0 - this.velocity.x) * 0.18;
        this.owner.animation.playIfNotAlready(WretchAnimations.IDLE, true);
    }

    protected startAttack(): void {
        this.currentAction = "attack";
        this.attackPhase = "windup";
        this.actionTimer = 0;
        this.attackHasConnected = false;
        this.velocity.x = 0;
        this.owner.animation.play(WretchAnimations.ATTACK_RIGHT, false);
    }

    protected updateAttack(deltaT: number): void {
        this.actionTimer += deltaT;
        this.velocity.x = 0;

        if(this.attackPhase === "windup" && this.actionTimer >= this.attackWindup){
            this.attackPhase = "active";
        }

        if(this.attackPhase === "active"){
            this.tryApplyAttackDamage();
            if(this.actionTimer >= this.attackWindup + this.attackActive){
                this.attackPhase = "recovery";
            }
        }

        if(this.attackPhase === "recovery" && this.actionTimer >= this.attackWindup + this.attackActive + this.attackRecovery){
            this.finishAttack();
        }
    }

    protected finishAttack(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.attackCooldownTimer = this.attackCooldown;
        this.owner.animation.play(WretchAnimations.IDLE, true);
    }

    protected startJumpAttack(direction: number): void {
        this.currentAction = "jumpAttack";
        this.attackPhase = "active";
        this.actionTimer = 0;
        this.jumpAttackHasConnected = false;
        this.jumpLeftGround = false;
        this.velocity.x = this.jumpSpeedX * direction;
        this.velocity.y = -this.jumpSpeedY;
        this.owner.animation.play(WretchAnimations.JUMP_RIGHT, false);
    }

    protected updateJumpAttack(deltaT: number): void {
        this.actionTimer += deltaT;

        if(!this.jumpLeftGround && !this.owner.onGround){
            this.jumpLeftGround = true;
        }

        this.tryApplyJumpAttackDamage();

        if(this.jumpLeftGround && this.owner.onGround){
            this.currentAction = "idle";
            this.attackPhase = "none";
            this.actionTimer = 0;
            this.jumpAttackCooldownTimer = this.jumpAttackCooldown;
            this.velocity.x *= 0.35;
            this.owner.animation.play(WretchAnimations.IDLE, true);
            return;
        }

        if(this.owner.onGround){
            this.velocity.x += (0 - this.velocity.x) * Math.min(1, this.jumpAttackRecovery * deltaT);
        }
    }

    protected startStun(): void {
        const interruptedJumpAttack = this.currentAction === "jumpAttack";
        this.currentAction = "stunned";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.attackHasConnected = false;
        this.jumpAttackHasConnected = false;
        this.velocity.x = 0;
        if(!interruptedJumpAttack){
            this.attackCooldownTimer = Math.max(this.attackCooldownTimer, this.attackCooldown);
        } else {
            this.jumpAttackCooldownTimer = Math.max(this.jumpAttackCooldownTimer, this.jumpAttackCooldown);
        }
        this.stunWindowCooldownTimer = this.stunWindowCooldown;
        this.owner.animation.play(WretchAnimations.IDLE, true);
    }

    protected updateStunned(deltaT: number): void {
        this.actionTimer += deltaT;

        if(this.owner.onGround){
            this.velocity.x += (0 - this.velocity.x) * 0.28;
        }

        this.owner.animation.playIfNotAlready(WretchAnimations.IDLE, true);

        if(this.actionTimer >= this.stunDuration){
            this.currentAction = "idle";
            this.attackPhase = "none";
            this.actionTimer = 0;
        }
    }

    protected tryApplyAttackDamage(): void {
        if(this.attackHasConnected || !this.player.hasPhysics || !this.owner.hasPhysics){
            return;
        }

        const direction = this.owner.invertX ? -1 : 1;
        const hitboxCenter = new Vec2(
            this.owner.position.x + this.attackHitboxOffset.x * direction,
            this.owner.position.y + this.attackHitboxOffset.y
        );
        const attackShape = new AABB(hitboxCenter, this.attackHitboxHalfSize.clone());
        const playerShape = this.player.collisionShape.getBoundingRect();

        if(!attackShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            playerController.applyDamage(this.attackDamage, new Vec2(110 * direction, -60));
        }

        this.attackHasConnected = true;
    }

    protected tryApplyJumpAttackDamage(): void {
        if(this.jumpAttackHasConnected || !this.player.hasPhysics || !this.owner.hasPhysics){
            return;
        }

        const ownerShape = this.owner.collisionShape.getBoundingRect();
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!ownerShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            const direction = this.owner.invertX ? -1 : 1;
            playerController.applyDamage(this.jumpAttackDamage, new Vec2(135 * direction, -120));
        }

        this.jumpAttackHasConnected = true;
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
        if(this.hitFlashTimer > 0){
            const pulse = Math.floor(this.hitFlashTimer * 40) % 2 === 0 ? 0.35 : 1;
            this.owner.alpha = pulse;
            return;
        }

        this.owner.alpha = 1;
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
