import ControllerAI from "../../../../Wolfie2D/AI/ControllerAI";
import AABB from "../../../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../../../Wolfie2D/Events/GameEvent";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import PlayerController from "../../../Player/PlayerController";
import MBAnimatedSprite from "../../../Nodes/MBAnimatedSprite";
import { EnemyDamageable } from "../../EnemyDamageable";
import {
    DEFAULT_BAT_AGGRO_RANGE_X,
    DEFAULT_BAT_AGGRO_RANGE_Y,
    DEFAULT_BAT_ATTACK_COOLDOWN,
    DEFAULT_BAT_ATTACK_DAMAGE,
    DEFAULT_BAT_ATTACK_DURATION,
    DEFAULT_BAT_ATTACK_HITBOX_FORWARD_OFFSET,
    DEFAULT_BAT_ATTACK_HITBOX_HALF_SIZE,
    DEFAULT_BAT_ATTACK_SPEED,
    DEFAULT_BAT_DRIFT_LERP,
    DEFAULT_BAT_FADE_DEATH_DURATION,
    DEFAULT_BAT_HITBOX_HALF_SIZE,
    DEFAULT_BAT_HIT_FLASH_DURATION,
    DEFAULT_BAT_HOVER_AMPLITUDE,
    DEFAULT_BAT_HOVER_FREQUENCY,
    DEFAULT_BAT_MAX_HEALTH,
    DEFAULT_BAT_PATROL_RADIUS_X,
    DEFAULT_BAT_PATROL_RADIUS_Y,
    DEFAULT_BAT_RECOVERY_LERP,
    DEFAULT_BAT_RETREAT_DISTANCE,
    DEFAULT_BAT_RETREAT_DURATION,
    DEFAULT_BAT_RETREAT_LIFT,
    DEFAULT_BAT_STUN_DURATION
} from "./BatConfig";
import { BatAnimations } from "./BatAnimations";
import BatState from "./BatState";
import { BatAction, BatControllerOptions } from "./BatTypes";

export default class BatController extends ControllerAI implements EnemyDamageable {
    protected owner!: MBAnimatedSprite;
    protected player!: AnimatedSprite;
    protected state!: BatState;

    protected homePosition!: Vec2;
    protected hitboxHalfSize!: Vec2;
    protected attackHitboxHalfSize!: Vec2;
    protected attackHitboxForwardOffset!: number;

    protected aggroRangeX!: number;
    protected aggroRangeY!: number;
    protected attackDamage!: number;
    protected attackSpeed!: number;
    protected attackDuration!: number;
    protected attackCooldown!: number;
    protected hoverAmplitude!: number;
    protected hoverFrequency!: number;
    protected patrolRadiusX!: number;
    protected patrolRadiusY!: number;
    protected driftLerp!: number;
    protected recoveryLerp!: number;
    protected retreatDistance!: number;
    protected retreatLift!: number;
    protected retreatDuration!: number;
    protected stunDuration!: number;
    protected hitFlashDuration!: number;
    protected fadeDeathDuration!: number;

    protected currentAction!: BatAction;
    protected actionTimer!: number;
    protected attackCooldownTimer!: number;
    protected hitFlashTimer!: number;
    protected deathFadeTimer!: number;
    protected hurtCooldownTimer!: number;
    protected hurtCooldownDuration!: number;
    protected hoverTime!: number;
    protected attackDirection!: Vec2;
    protected attackHasConnected!: boolean;
    protected retreatTarget!: Vec2;

    public initializeAI(owner: MBAnimatedSprite, options: BatControllerOptions): void {
        this.owner = owner;
        this.player = options.player;
        this.state = new BatState(options.maxHealth ?? DEFAULT_BAT_MAX_HEALTH);

        this.homePosition = (options.homePosition ?? owner.position).clone();
        this.hitboxHalfSize = (options.hitboxHalfSize ?? DEFAULT_BAT_HITBOX_HALF_SIZE).clone();
        this.attackHitboxHalfSize = (options.attackHitboxHalfSize ?? DEFAULT_BAT_ATTACK_HITBOX_HALF_SIZE).clone();
        this.attackHitboxForwardOffset = options.attackHitboxForwardOffset ?? DEFAULT_BAT_ATTACK_HITBOX_FORWARD_OFFSET;

        this.aggroRangeX = options.aggroRangeX ?? DEFAULT_BAT_AGGRO_RANGE_X;
        this.aggroRangeY = options.aggroRangeY ?? DEFAULT_BAT_AGGRO_RANGE_Y;
        this.attackDamage = options.attackDamage ?? DEFAULT_BAT_ATTACK_DAMAGE;
        this.attackSpeed = options.attackSpeed ?? DEFAULT_BAT_ATTACK_SPEED;
        this.attackDuration = options.attackDuration ?? DEFAULT_BAT_ATTACK_DURATION;
        this.attackCooldown = options.attackCooldown ?? DEFAULT_BAT_ATTACK_COOLDOWN;
        this.hoverAmplitude = options.hoverAmplitude ?? DEFAULT_BAT_HOVER_AMPLITUDE;
        this.hoverFrequency = options.hoverFrequency ?? DEFAULT_BAT_HOVER_FREQUENCY;
        this.patrolRadiusX = options.patrolRadiusX ?? DEFAULT_BAT_PATROL_RADIUS_X;
        this.patrolRadiusY = options.patrolRadiusY ?? DEFAULT_BAT_PATROL_RADIUS_Y;
        this.driftLerp = options.driftLerp ?? DEFAULT_BAT_DRIFT_LERP;
        this.recoveryLerp = options.recoveryLerp ?? DEFAULT_BAT_RECOVERY_LERP;
        this.retreatDistance = options.retreatDistance ?? DEFAULT_BAT_RETREAT_DISTANCE;
        this.retreatLift = options.retreatLift ?? DEFAULT_BAT_RETREAT_LIFT;
        this.retreatDuration = options.retreatDuration ?? DEFAULT_BAT_RETREAT_DURATION;
        this.stunDuration = options.stunDuration ?? DEFAULT_BAT_STUN_DURATION;
        this.hitFlashDuration = options.hitFlashDuration ?? DEFAULT_BAT_HIT_FLASH_DURATION;
        this.fadeDeathDuration = options.fadeDeathDuration ?? DEFAULT_BAT_FADE_DEATH_DURATION;

        this.currentAction = "idle";
        this.actionTimer = 0;
        this.attackCooldownTimer = 0;
        this.hitFlashTimer = 0;
        this.deathFadeTimer = 0;
        this.hurtCooldownTimer = 0;
        this.hurtCooldownDuration = Math.max(this.hitFlashDuration, 0.16);
        this.hoverTime = Math.random() * Math.PI * 2;
        this.attackDirection = Vec2.ZERO;
        this.attackHasConnected = false;
        this.retreatTarget = this.homePosition.clone();

        this.owner.animation.play(BatAnimations.IDLE, true);
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
        this.hoverTime += deltaT;
        this.updateHitFlash(deltaT);

        if(this.state.isDefeated()){
            this.updateDeathFade(deltaT);
            return;
        }

        switch(this.currentAction){
            case "attack":
                this.updateAttack(deltaT);
                break;
            case "recover":
                this.updateRecovery(deltaT);
                break;
            case "stunned":
                this.updateStunned(deltaT);
                break;
            default:
                this.updateIdle(deltaT, absDeltaX, absDeltaY);
                break;
        }
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
        } else if(this.currentAction === "attack"){
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

    protected updateIdle(deltaT: number, absDeltaX: number, absDeltaY: number): void {
        const hoverTarget = this.getPatrolTarget();
        const lerpFactor = Math.min(1, this.driftLerp * deltaT);
        const moveDelta = new Vec2(
            (hoverTarget.x - this.owner.position.x) * lerpFactor,
            (hoverTarget.y - this.owner.position.y) * lerpFactor
        );
        this.owner.move(moveDelta);
        this.owner.animation.playIfNotAlready(BatAnimations.IDLE, true);

        if(absDeltaX <= this.aggroRangeX && absDeltaY <= this.aggroRangeY && this.attackCooldownTimer === 0){
            this.startAttack();
        }
    }

    protected startAttack(): void {
        this.currentAction = "attack";
        this.actionTimer = 0;
        this.attackHasConnected = false;

        const direction = this.owner.position.dirTo(this.player.position);
        this.attackDirection = direction.isZero() ? new Vec2(this.owner.invertX ? -1 : 1, 0) : direction.normalize();
        this.owner.animation.play(BatAnimations.ATTACK_RIGHT, false);
    }

    protected updateAttack(deltaT: number): void {
        this.actionTimer += deltaT;
        this.owner.move(this.attackDirection.scaled(this.attackSpeed * deltaT));
        this.tryApplyAttackDamage();

        if(this.actionTimer >= this.attackDuration){
            this.currentAction = "recover";
            this.actionTimer = 0;
            this.attackCooldownTimer = this.attackCooldown;
            this.retreatTarget = this.buildRetreatTarget();
        }
    }

    protected updateRecovery(deltaT: number): void {
        this.actionTimer += deltaT;
        const hoverTarget = this.retreatTarget;
        const lerpFactor = Math.min(1, this.recoveryLerp * deltaT);
        const moveDelta = new Vec2(
            (hoverTarget.x - this.owner.position.x) * lerpFactor,
            (hoverTarget.y - this.owner.position.y) * lerpFactor
        );
        this.owner.move(moveDelta);
        this.owner.animation.playIfNotAlready(BatAnimations.IDLE, true);

        const dx = hoverTarget.x - this.owner.position.x;
        const dy = hoverTarget.y - this.owner.position.y;
        if((Math.abs(dx) <= 6 && Math.abs(dy) <= 6) || this.actionTimer >= this.retreatDuration){
            this.currentAction = "idle";
            this.actionTimer = 0;
        }
    }

    protected startStun(): void {
        this.currentAction = "stunned";
        this.actionTimer = 0;
        this.attackHasConnected = false;
        this.attackDirection = Vec2.ZERO;
        this.attackCooldownTimer = Math.max(this.attackCooldownTimer, this.attackCooldown);
        this.owner.animation.play(BatAnimations.IDLE, true);
    }

    protected updateStunned(deltaT: number): void {
        this.actionTimer += deltaT;
        this.owner.move(Vec2.ZERO);
        this.owner.animation.playIfNotAlready(BatAnimations.IDLE, true);

        if(this.actionTimer >= this.stunDuration){
            this.currentAction = "recover";
            this.actionTimer = 0;
            this.retreatTarget = this.buildRetreatTarget();
        }
    }

    protected tryApplyAttackDamage(): void {
        if(this.attackHasConnected || !this.player.hasPhysics || !this.owner.hasPhysics){
            return;
        }

        const attackCenter = this.owner.position.clone().add(this.attackDirection.scaled(this.attackHitboxForwardOffset));
        const attackShape = new AABB(attackCenter, this.attackHitboxHalfSize.clone());
        const playerShape = this.player.collisionShape.getBoundingRect();
        if(!attackShape.overlaps(playerShape)){
            return;
        }

        const playerController = this.player.ai as PlayerController;
        if(playerController !== undefined){
            const direction = this.attackDirection.isZero() ? new Vec2(this.owner.invertX ? -1 : 1, 0) : this.attackDirection;
            playerController.applyDamage(this.attackDamage, new Vec2(direction.x * 110, -70));
        }

        this.attackHasConnected = true;
    }

    protected getPatrolTarget(): Vec2 {
        return new Vec2(
            this.homePosition.x + Math.cos(this.hoverTime * this.hoverFrequency * 0.8) * this.patrolRadiusX,
            this.homePosition.y
                + Math.sin(this.hoverTime * this.hoverFrequency) * this.patrolRadiusY
                + Math.sin(this.hoverTime * (this.hoverFrequency * 0.5)) * this.hoverAmplitude
        );
    }

    protected buildRetreatTarget(): Vec2 {
        let awayDirection = this.player.position.vecTo(this.owner.position);
        if(awayDirection.isZero()){
            awayDirection = new Vec2(this.owner.invertX ? 1 : -1, -0.35);
        }

        awayDirection.normalize();
        return this.owner.position.clone().add(new Vec2(
            awayDirection.x * this.retreatDistance,
            -this.retreatLift + awayDirection.y * (this.retreatLift * 0.35)
        ));
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
        this.actionTimer = 0;
        this.attackDirection = Vec2.ZERO;
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
