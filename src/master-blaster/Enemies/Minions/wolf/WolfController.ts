import ControllerAI from "../../../../Wolfie2D/AI/ControllerAI";
import AABB from "../../../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../../../Wolfie2D/Events/GameEvent";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import PlayerController from "../../../Player/PlayerController";
import MBAnimatedSprite from "../../../Nodes/MBAnimatedSprite";
import { EnemyDamageable } from "../../EnemyDamageable";
import {
    DEFAULT_WOLF_AGGRO_RANGE_X,
    DEFAULT_WOLF_AGGRO_RANGE_Y,
    DEFAULT_WOLF_ATTACK_ACTIVE,
    DEFAULT_WOLF_ATTACK_COOLDOWN,
    DEFAULT_WOLF_ATTACK_DAMAGE,
    DEFAULT_WOLF_ATTACK_HITBOX_HALF_SIZE,
    DEFAULT_WOLF_ATTACK_HITBOX_OFFSET,
    DEFAULT_WOLF_ATTACK_MOVE_SPEED,
    DEFAULT_WOLF_ATTACK_RANGE_X,
    DEFAULT_WOLF_ATTACK_RANGE_Y,
    DEFAULT_WOLF_ATTACK_RECOVERY,
    DEFAULT_WOLF_ATTACK_WINDUP,
    DEFAULT_WOLF_FADE_DEATH_DURATION,
    DEFAULT_WOLF_GRAVITY,
    DEFAULT_WOLF_HITBOX_HALF_SIZE,
    DEFAULT_WOLF_HIT_FLASH_DURATION,
    DEFAULT_WOLF_LEASH_DISTANCE,
    DEFAULT_WOLF_MAX_FALL_SPEED,
    DEFAULT_WOLF_MAX_HEALTH,
    DEFAULT_WOLF_MOVE_SPEED
} from "./WolfConfig";
import { WolfAnimations } from "./WolfAnimations";
import WolfState from "./WolfState";
import { WolfAction, WolfAttackPhase, WolfControllerOptions } from "./WolfTypes";

export default class WolfController extends ControllerAI implements EnemyDamageable {
    protected owner!: MBAnimatedSprite;
    protected player!: AnimatedSprite;
    protected state!: WolfState;

    protected homePosition!: Vec2;
    protected velocity!: Vec2;
    protected hitboxHalfSize!: Vec2;
    protected aggroRangeX!: number;
    protected aggroRangeY!: number;
    protected leashDistance!: number;
    protected moveSpeed!: number;
    protected attackRangeX!: number;
    protected attackRangeY!: number;
    protected attackDamage!: number;
    protected attackWindup!: number;
    protected attackActive!: number;
    protected attackRecovery!: number;
    protected attackCooldown!: number;
    protected attackMoveSpeed!: number;
    protected attackHitboxOffset!: Vec2;
    protected attackHitboxHalfSize!: Vec2;
    protected gravity!: number;
    protected maxFallSpeed!: number;
    protected hitFlashDuration!: number;
    protected fadeDeathDuration!: number;

    protected currentAction!: WolfAction;
    protected attackPhase!: WolfAttackPhase;
    protected actionTimer!: number;
    protected attackCooldownTimer!: number;
    protected hitFlashTimer!: number;
    protected deathFadeTimer!: number;
    protected hurtCooldownTimer!: number;
    protected hurtCooldownDuration!: number;
    protected attackHasConnected!: boolean;

    public initializeAI(owner: MBAnimatedSprite, options: WolfControllerOptions): void {
        this.owner = owner;
        this.player = options.player;
        this.state = new WolfState(options.maxHealth ?? DEFAULT_WOLF_MAX_HEALTH);

        this.homePosition = (options.homePosition ?? owner.position).clone();
        this.velocity = Vec2.ZERO;
        this.hitboxHalfSize = (options.hitboxHalfSize ?? DEFAULT_WOLF_HITBOX_HALF_SIZE).clone();
        this.aggroRangeX = options.aggroRangeX ?? DEFAULT_WOLF_AGGRO_RANGE_X;
        this.aggroRangeY = options.aggroRangeY ?? DEFAULT_WOLF_AGGRO_RANGE_Y;
        this.leashDistance = options.leashDistance ?? DEFAULT_WOLF_LEASH_DISTANCE;
        this.moveSpeed = options.moveSpeed ?? DEFAULT_WOLF_MOVE_SPEED;
        this.attackRangeX = options.attackRangeX ?? DEFAULT_WOLF_ATTACK_RANGE_X;
        this.attackRangeY = options.attackRangeY ?? DEFAULT_WOLF_ATTACK_RANGE_Y;
        this.attackDamage = options.attackDamage ?? DEFAULT_WOLF_ATTACK_DAMAGE;
        this.attackWindup = options.attackWindup ?? DEFAULT_WOLF_ATTACK_WINDUP;
        this.attackActive = options.attackActive ?? DEFAULT_WOLF_ATTACK_ACTIVE;
        this.attackRecovery = options.attackRecovery ?? DEFAULT_WOLF_ATTACK_RECOVERY;
        this.attackCooldown = options.attackCooldown ?? DEFAULT_WOLF_ATTACK_COOLDOWN;
        this.attackMoveSpeed = options.attackMoveSpeed ?? DEFAULT_WOLF_ATTACK_MOVE_SPEED;
        this.attackHitboxOffset = (options.attackHitboxOffset ?? DEFAULT_WOLF_ATTACK_HITBOX_OFFSET).clone();
        this.attackHitboxHalfSize = (options.attackHitboxHalfSize ?? DEFAULT_WOLF_ATTACK_HITBOX_HALF_SIZE).clone();
        this.gravity = options.gravity ?? DEFAULT_WOLF_GRAVITY;
        this.maxFallSpeed = options.maxFallSpeed ?? DEFAULT_WOLF_MAX_FALL_SPEED;
        this.hitFlashDuration = options.hitFlashDuration ?? DEFAULT_WOLF_HIT_FLASH_DURATION;
        this.fadeDeathDuration = options.fadeDeathDuration ?? DEFAULT_WOLF_FADE_DEATH_DURATION;

        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.attackCooldownTimer = 0;
        this.hitFlashTimer = 0;
        this.deathFadeTimer = 0;
        this.hurtCooldownTimer = 0;
        this.hurtCooldownDuration = Math.max(this.hitFlashDuration, 0.14);
        this.attackHasConnected = false;

        this.owner.animation.play(WolfAnimations.IDLE, true);
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
        this.hurtCooldownTimer = Math.max(0, this.hurtCooldownTimer - deltaT);
        this.updateHitFlash(deltaT);

        if(this.state.isDefeated()){
            this.updateDeathFade(deltaT);
            return;
        }

        if(this.currentAction === "attack"){
            this.updateAttack(deltaT);
        } else {
            this.updateNeutral(absDeltaX, absDeltaY, deltaX);
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
        }

        return true;
    }

    public isDefeated(): boolean {
        return this.state.isDefeated();
    }

    protected updateNeutral(absDeltaX: number, absDeltaY: number, deltaX: number): void {
        const inAttackRange = absDeltaX <= this.attackRangeX && absDeltaY <= this.attackRangeY;
        const inAggroRange = absDeltaX <= this.aggroRangeX && absDeltaY <= this.aggroRangeY;
        const homeDeltaX = this.owner.position.x - this.homePosition.x;

        if(inAttackRange && this.attackCooldownTimer === 0 && this.owner.onGround){
            this.startAttack();
            return;
        }

        if(inAggroRange && Math.abs(homeDeltaX) <= this.leashDistance){
            const direction = deltaX < 0 ? -1 : 1;
            this.velocity.x = direction * this.moveSpeed;
            this.owner.animation.playIfNotAlready(WolfAnimations.WALK, true);
            return;
        }

        if(Math.abs(homeDeltaX) > 8){
            const returnDirection = homeDeltaX > 0 ? -1 : 1;
            this.velocity.x = returnDirection * this.moveSpeed * 0.55;
            this.owner.invertX = returnDirection < 0;
            this.owner.animation.playIfNotAlready(WolfAnimations.WALK, true);
            return;
        }

        this.velocity.x += (0 - this.velocity.x) * 0.2;
        this.owner.animation.playIfNotAlready(WolfAnimations.IDLE, true);
    }

    protected startAttack(): void {
        this.currentAction = "attack";
        this.attackPhase = "windup";
        this.actionTimer = 0;
        this.attackHasConnected = false;
        this.velocity.x = 0;
        this.owner.animation.play(WolfAnimations.ATTACK, false);
    }

    protected updateAttack(deltaT: number): void {
        this.actionTimer += deltaT;
        const direction = this.owner.invertX ? -1 : 1;

        if(this.attackPhase === "windup"){
            this.velocity.x = direction * this.attackMoveSpeed * 0.25;
            if(this.actionTimer >= this.attackWindup){
                this.attackPhase = "active";
            }
        }

        if(this.attackPhase === "active"){
            this.velocity.x = direction * this.attackMoveSpeed;
            this.tryApplyAttackDamage();
            if(this.actionTimer >= this.attackWindup + this.attackActive){
                this.attackPhase = "recovery";
            }
        }

        if(this.attackPhase === "recovery"){
            this.velocity.x = direction * this.attackMoveSpeed * 0.2;
            if(this.actionTimer >= this.attackWindup + this.attackActive + this.attackRecovery){
                this.finishAttack();
            }
        }
    }

    protected finishAttack(): void {
        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.attackCooldownTimer = this.attackCooldown;
        this.velocity.x *= 0.2;
        this.owner.animation.play(WolfAnimations.IDLE, true);
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
            playerController.applyDamage(this.attackDamage, new Vec2(125 * direction, -65));
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
