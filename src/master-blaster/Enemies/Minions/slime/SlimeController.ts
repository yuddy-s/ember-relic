import ControllerAI from "../../../../Wolfie2D/AI/ControllerAI";
import AABB from "../../../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../../../Wolfie2D/Events/GameEvent";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import PlayerController from "../../../Player/PlayerController";
import MBAnimatedSprite from "../../../Nodes/MBAnimatedSprite";
import { EnemyDamageable } from "../../EnemyDamageable";
import {
    DEFAULT_SLIME_AGGRO_RANGE_X,
    DEFAULT_SLIME_AGGRO_RANGE_Y,
    DEFAULT_SLIME_ATTACK_ACTIVE,
    DEFAULT_SLIME_ATTACK_COOLDOWN,
    DEFAULT_SLIME_ATTACK_DAMAGE,
    DEFAULT_SLIME_ATTACK_HITBOX_HALF_SIZE,
    DEFAULT_SLIME_ATTACK_HITBOX_OFFSET,
    DEFAULT_SLIME_ATTACK_RANGE_X,
    DEFAULT_SLIME_ATTACK_RANGE_Y,
    DEFAULT_SLIME_ATTACK_RECOVERY,
    DEFAULT_SLIME_ATTACK_WINDUP,
    DEFAULT_SLIME_CHASE_LEASH_DISTANCE,
    DEFAULT_SLIME_ENRAGED_AGGRO_RANGE_X,
    DEFAULT_SLIME_ENRAGED_AGGRO_RANGE_Y,
    DEFAULT_SLIME_FADE_DEATH_DURATION,
    DEFAULT_SLIME_GRAVITY,
    DEFAULT_SLIME_HITBOX_HALF_SIZE,
    DEFAULT_SLIME_HIT_FLASH_DURATION,
    DEFAULT_SLIME_MAX_FALL_SPEED,
    DEFAULT_SLIME_MAX_HEALTH,
    DEFAULT_SLIME_MOVE_SPEED,
    DEFAULT_SLIME_PATROL_RANGE_X
} from "./SlimeConfig";
import { SlimeAnimations } from "./SlimeAnimations";
import SlimeState from "./SlimeState";
import { SlimeAction, SlimeAttackPhase, SlimeControllerOptions } from "./SlimeTypes";

export default class SlimeController extends ControllerAI implements EnemyDamageable {
    protected owner!: MBAnimatedSprite;
    protected player!: AnimatedSprite;
    protected state!: SlimeState;

    protected homePosition!: Vec2;
    protected velocity!: Vec2;
    protected hitboxHalfSize!: Vec2;
    protected patrolRangeX!: number;

    protected aggroRangeX!: number;
    protected aggroRangeY!: number;
    protected enragedAggroRangeX!: number;
    protected enragedAggroRangeY!: number;
    protected chaseLeashDistance!: number;
    protected moveSpeed!: number;
    protected attackRangeX!: number;
    protected attackRangeY!: number;
    protected attackDamage!: number;
    protected attackWindup!: number;
    protected attackActive!: number;
    protected attackRecovery!: number;
    protected attackCooldown!: number;
    protected attackHitboxOffset!: Vec2;
    protected attackHitboxHalfSize!: Vec2;

    protected gravity!: number;
    protected maxFallSpeed!: number;
    protected hitFlashDuration!: number;
    protected fadeDeathDuration!: number;

    protected currentAction!: SlimeAction;
    protected attackPhase!: SlimeAttackPhase;
    protected actionTimer!: number;
    protected attackCooldownTimer!: number;
    protected hitFlashTimer!: number;
    protected deathFadeTimer!: number;
    protected hurtCooldownTimer!: number;
    protected hurtCooldownDuration!: number;
    protected attackHasConnected!: boolean;
    protected provoked!: boolean;
    protected patrolDirection!: number;

    public initializeAI(owner: MBAnimatedSprite, options: SlimeControllerOptions): void {
        this.owner = owner;
        this.player = options.player;
        this.state = new SlimeState(options.maxHealth ?? DEFAULT_SLIME_MAX_HEALTH);

        this.homePosition = (options.homePosition ?? owner.position).clone();
        this.velocity = Vec2.ZERO;
        this.hitboxHalfSize = (options.hitboxHalfSize ?? DEFAULT_SLIME_HITBOX_HALF_SIZE).clone();
        this.patrolRangeX = options.patrolRangeX ?? DEFAULT_SLIME_PATROL_RANGE_X;

        this.aggroRangeX = options.aggroRangeX ?? DEFAULT_SLIME_AGGRO_RANGE_X;
        this.aggroRangeY = options.aggroRangeY ?? DEFAULT_SLIME_AGGRO_RANGE_Y;
        this.enragedAggroRangeX = options.enragedAggroRangeX ?? DEFAULT_SLIME_ENRAGED_AGGRO_RANGE_X;
        this.enragedAggroRangeY = options.enragedAggroRangeY ?? DEFAULT_SLIME_ENRAGED_AGGRO_RANGE_Y;
        this.chaseLeashDistance = options.chaseLeashDistance ?? DEFAULT_SLIME_CHASE_LEASH_DISTANCE;
        this.moveSpeed = options.moveSpeed ?? DEFAULT_SLIME_MOVE_SPEED;
        this.attackRangeX = options.attackRangeX ?? DEFAULT_SLIME_ATTACK_RANGE_X;
        this.attackRangeY = options.attackRangeY ?? DEFAULT_SLIME_ATTACK_RANGE_Y;
        this.attackDamage = options.attackDamage ?? DEFAULT_SLIME_ATTACK_DAMAGE;
        this.attackWindup = options.attackWindup ?? DEFAULT_SLIME_ATTACK_WINDUP;
        this.attackActive = options.attackActive ?? DEFAULT_SLIME_ATTACK_ACTIVE;
        this.attackRecovery = options.attackRecovery ?? DEFAULT_SLIME_ATTACK_RECOVERY;
        this.attackCooldown = options.attackCooldown ?? DEFAULT_SLIME_ATTACK_COOLDOWN;
        this.attackHitboxOffset = (options.attackHitboxOffset ?? DEFAULT_SLIME_ATTACK_HITBOX_OFFSET).clone();
        this.attackHitboxHalfSize = (options.attackHitboxHalfSize ?? DEFAULT_SLIME_ATTACK_HITBOX_HALF_SIZE).clone();

        this.gravity = options.gravity ?? DEFAULT_SLIME_GRAVITY;
        this.maxFallSpeed = options.maxFallSpeed ?? DEFAULT_SLIME_MAX_FALL_SPEED;
        this.hitFlashDuration = options.hitFlashDuration ?? DEFAULT_SLIME_HIT_FLASH_DURATION;
        this.fadeDeathDuration = options.fadeDeathDuration ?? DEFAULT_SLIME_FADE_DEATH_DURATION;
        this.hurtCooldownDuration = Math.max(this.hitFlashDuration, 0.14);

        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.attackCooldownTimer = 0;
        this.hitFlashTimer = 0;
        this.deathFadeTimer = 0;
        this.hurtCooldownTimer = 0;
        this.attackHasConnected = false;
        this.provoked = false;
        this.patrolDirection = Math.random() < 0.5 ? -1 : 1;

        this.owner.animation.play(SlimeAnimations.IDLE, true);
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
            this.updateNeutral(deltaT, absDeltaX, absDeltaY, deltaX);
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
        this.provoked = true;
        if(this.state.isDefeated()){
            this.startDeathFade();
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

    protected updateNeutral(deltaT: number, absDeltaX: number, absDeltaY: number, deltaX: number): void {
        const playerShape = this.player.hasPhysics ? this.player.collisionShape.getBoundingRect() : null;
        const ownerShape = this.owner.hasPhysics ? this.owner.collisionShape.getBoundingRect() : null;
        const touchingPlayer = ownerShape !== null && playerShape !== null && ownerShape.overlaps(playerShape);
        const horizontalGap = ownerShape !== null && playerShape !== null
            ? Math.max(0, absDeltaX - (ownerShape.halfSize.x + playerShape.halfSize.x))
            : absDeltaX;
        const verticalGap = ownerShape !== null && playerShape !== null
            ? Math.max(0, absDeltaY - (ownerShape.halfSize.y + playerShape.halfSize.y))
            : absDeltaY;
        const inAttackRange = touchingPlayer || (horizontalGap <= this.attackRangeX && verticalGap <= this.attackRangeY);
        const activeAggroRangeX = this.provoked ? this.enragedAggroRangeX : this.aggroRangeX;
        const activeAggroRangeY = this.provoked ? this.enragedAggroRangeY : this.aggroRangeY;
        const inAggroRange = absDeltaX <= activeAggroRangeX && absDeltaY <= activeAggroRangeY;
        const homeDeltaX = this.owner.position.x - this.homePosition.x;

        if(inAttackRange && this.attackCooldownTimer === 0 && this.owner.onGround){
            this.startAttack();
            return;
        }

        if(inAggroRange && Math.abs(homeDeltaX) <= this.chaseLeashDistance){
            const direction = deltaX < 0 ? -1 : 1;
            this.velocity.x = direction * this.moveSpeed;
            this.owner.animation.playIfNotAlready(SlimeAnimations.WALK_RIGHT, true);
            return;
        }

        if(Math.abs(homeDeltaX) > this.chaseLeashDistance){
            const returnDirection = homeDeltaX > 0 ? -1 : 1;
            this.velocity.x = returnDirection * this.moveSpeed * 0.65;
            this.owner.invertX = returnDirection < 0;
            this.owner.animation.playIfNotAlready(SlimeAnimations.WALK_RIGHT, true);
            return;
        }

        this.updatePatrol(homeDeltaX);
    }

    protected updatePatrol(homeDeltaX: number): void {
        if(this.owner.onWall){
            this.patrolDirection *= -1;
        } else if(homeDeltaX >= this.patrolRangeX){
            this.patrolDirection = -1;
        } else if(homeDeltaX <= -this.patrolRangeX){
            this.patrolDirection = 1;
        }

        this.velocity.x = this.patrolDirection * this.moveSpeed * 0.55;
        this.owner.invertX = this.patrolDirection < 0;
        this.owner.animation.playIfNotAlready(SlimeAnimations.WALK_RIGHT, true);
    }

    protected startAttack(): void {
        this.currentAction = "attack";
        this.attackPhase = "windup";
        this.actionTimer = 0;
        this.attackHasConnected = false;
        this.velocity.x = 0;
        this.owner.animation.play(SlimeAnimations.ATTACK_RIGHT, false);
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
        this.owner.animation.play(SlimeAnimations.IDLE, true);
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
            playerController.applyDamage(this.attackDamage, new Vec2(75 * direction, -30));
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
        if(this.hitFlashTimer > 0){
            const pulse = Math.floor(this.hitFlashTimer * 32) % 2 === 0 ? 0.45 : 1;
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
