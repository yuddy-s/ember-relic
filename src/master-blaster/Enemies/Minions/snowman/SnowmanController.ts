import ControllerAI from "../../../../Wolfie2D/AI/ControllerAI";
import AABB from "../../../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../../../Wolfie2D/Events/GameEvent";
import { GraphicType } from "../../../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../../../Wolfie2D/Nodes/Graphics/Rect";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Sprite from "../../../../Wolfie2D/Nodes/Sprites/Sprite";
import Color from "../../../../Wolfie2D/Utils/Color";
import PlayerController from "../../../Player/PlayerController";
import MBAnimatedSprite from "../../../Nodes/MBAnimatedSprite";
import { EnemyDamageable } from "../../EnemyDamageable";
import {
    DEFAULT_SNOWMAN_AGGRO_RANGE_X,
    DEFAULT_SNOWMAN_AGGRO_RANGE_Y,
    DEFAULT_SNOWMAN_ATTACK_ACTIVE,
    DEFAULT_SNOWMAN_ATTACK_COOLDOWN,
    DEFAULT_SNOWMAN_ATTACK_DAMAGE,
    DEFAULT_SNOWMAN_ATTACK_RECOVERY,
    DEFAULT_SNOWMAN_ATTACK_WINDUP,
    DEFAULT_SNOWMAN_FADE_DEATH_DURATION,
    DEFAULT_SNOWMAN_HITBOX_HALF_SIZE,
    DEFAULT_SNOWMAN_HIT_FLASH_DURATION,
    DEFAULT_SNOWMAN_MAX_HEALTH,
    DEFAULT_SNOWMAN_PROJECTILE_HALF_SIZE,
    DEFAULT_SNOWMAN_PROJECTILE_LIFETIME,
    DEFAULT_SNOWMAN_PROJECTILE_SPEED,
    DEFAULT_SNOWMAN_PROJECTILE_SPAWN_OFFSET
} from "./SnowmanConfig";
import { SnowmanAnimations } from "./SnowmanAnimations";
import SnowmanState from "./SnowmanState";
import { SnowmanAction, SnowmanAttackPhase, SnowmanControllerOptions } from "./SnowmanTypes";

type SnowmanProjectile = {
    visual: Sprite;
    center: Vec2;
    velocity: Vec2;
    halfSize: Vec2;
    elapsed: number;
    hasConnected: boolean;
};

export default class SnowmanController extends ControllerAI implements EnemyDamageable {
    protected owner!: MBAnimatedSprite;
    protected player!: AnimatedSprite;
    protected state!: SnowmanState;

    protected hitboxHalfSize!: Vec2;
    protected aggroRangeX!: number;
    protected aggroRangeY!: number;
    protected attackDamage!: number;
    protected attackWindup!: number;
    protected attackActive!: number;
    protected attackRecovery!: number;
    protected attackCooldown!: number;
    protected projectileImageKey!: string;
    protected projectileSpeed!: number;
    protected projectileLifetime!: number;
    protected projectileHalfSize!: Vec2;
    protected projectileSpawnOffset!: Vec2;
    protected hitFlashDuration!: number;
    protected fadeDeathDuration!: number;

    protected currentAction!: SnowmanAction;
    protected attackPhase!: SnowmanAttackPhase;
    protected actionTimer!: number;
    protected attackCooldownTimer!: number;
    protected hitFlashTimer!: number;
    protected deathFadeTimer!: number;
    protected hurtCooldownTimer!: number;
    protected hurtCooldownDuration!: number;
    protected projectileSpawnedThisAttack!: boolean;
    protected projectiles!: SnowmanProjectile[];

    public initializeAI(owner: MBAnimatedSprite, options: SnowmanControllerOptions): void {
        this.owner = owner;
        this.player = options.player;
        this.state = new SnowmanState(options.maxHealth ?? DEFAULT_SNOWMAN_MAX_HEALTH);

        this.hitboxHalfSize = (options.hitboxHalfSize ?? DEFAULT_SNOWMAN_HITBOX_HALF_SIZE).clone();
        this.aggroRangeX = options.aggroRangeX ?? DEFAULT_SNOWMAN_AGGRO_RANGE_X;
        this.aggroRangeY = options.aggroRangeY ?? DEFAULT_SNOWMAN_AGGRO_RANGE_Y;
        this.attackDamage = options.attackDamage ?? DEFAULT_SNOWMAN_ATTACK_DAMAGE;
        this.attackWindup = options.attackWindup ?? DEFAULT_SNOWMAN_ATTACK_WINDUP;
        this.attackActive = options.attackActive ?? DEFAULT_SNOWMAN_ATTACK_ACTIVE;
        this.attackRecovery = options.attackRecovery ?? DEFAULT_SNOWMAN_ATTACK_RECOVERY;
        this.attackCooldown = options.attackCooldown ?? DEFAULT_SNOWMAN_ATTACK_COOLDOWN;
        this.projectileImageKey = options.projectileImageKey;
        this.projectileSpeed = options.projectileSpeed ?? DEFAULT_SNOWMAN_PROJECTILE_SPEED;
        this.projectileLifetime = options.projectileLifetime ?? DEFAULT_SNOWMAN_PROJECTILE_LIFETIME;
        this.projectileHalfSize = (options.projectileHalfSize ?? DEFAULT_SNOWMAN_PROJECTILE_HALF_SIZE).clone();
        this.projectileSpawnOffset = (options.projectileSpawnOffset ?? DEFAULT_SNOWMAN_PROJECTILE_SPAWN_OFFSET).clone();
        this.hitFlashDuration = options.hitFlashDuration ?? DEFAULT_SNOWMAN_HIT_FLASH_DURATION;
        this.fadeDeathDuration = options.fadeDeathDuration ?? DEFAULT_SNOWMAN_FADE_DEATH_DURATION;

        this.currentAction = "idle";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.attackCooldownTimer = 0.4;
        this.hitFlashTimer = 0;
        this.deathFadeTimer = 0;
        this.hurtCooldownTimer = 0;
        this.hurtCooldownDuration = Math.max(this.hitFlashDuration, 0.14);
        this.projectileSpawnedThisAttack = false;
        this.projectiles = [];

        this.owner.animation.play(SnowmanAnimations.IDLE, true);
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
        this.updateProjectiles(deltaT);

        if(this.state.isDefeated()){
            this.updateDeathFade(deltaT);
            return;
        }

        if(this.currentAction === "attack"){
            this.updateAttack(deltaT);
            return;
        }

        if(absDeltaX <= this.aggroRangeX && absDeltaY <= this.aggroRangeY && this.attackCooldownTimer === 0){
            this.startAttack();
            return;
        }

        this.owner.animation.playIfNotAlready(SnowmanAnimations.IDLE, true);
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
        } else {
            this.owner.animation.play(SnowmanAnimations.TAKE_DAMAGE, false);
        }

        return true;
    }

    public isDefeated(): boolean {
        return this.state.isDefeated();
    }

    protected startAttack(): void {
        this.currentAction = "attack";
        this.attackPhase = "windup";
        this.actionTimer = 0;
        this.projectileSpawnedThisAttack = false;
        this.owner.animation.play(SnowmanAnimations.ATTACK, false);
    }

    protected updateAttack(deltaT: number): void {
        this.actionTimer += deltaT;

        if(this.attackPhase === "windup" && this.actionTimer >= this.attackWindup){
            this.attackPhase = "active";
        }

        if(this.attackPhase === "active"){
            if(!this.projectileSpawnedThisAttack){
                this.spawnProjectile();
                this.projectileSpawnedThisAttack = true;
            }

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
        this.owner.animation.play(SnowmanAnimations.IDLE, true);
    }

    protected spawnProjectile(): void {
        const direction = this.owner.invertX ? -1 : 1;
        const center = new Vec2(
            this.owner.position.x + this.projectileSpawnOffset.x * direction,
            this.owner.position.y + this.projectileSpawnOffset.y
        );
        const visual = this.owner.getScene().add.sprite(this.projectileImageKey, "PRIMARY");
        visual.position.copy(center);
        visual.scale.set(
            (this.projectileHalfSize.x * 2) / Math.max(visual.size.x, 1),
            (this.projectileHalfSize.y * 2) / Math.max(visual.size.y, 1)
        );

        this.projectiles.push({
            visual,
            center,
            velocity: new Vec2(this.projectileSpeed * direction, 0),
            halfSize: this.projectileHalfSize.clone(),
            elapsed: 0,
            hasConnected: false
        });
    }

    protected updateProjectiles(deltaT: number): void {
        const toRemove: SnowmanProjectile[] = [];

        for(const projectile of this.projectiles){
            projectile.elapsed += deltaT;
            projectile.center.add(projectile.velocity.scaled(deltaT));
            projectile.visual.position.copy(projectile.center);

            if(!projectile.hasConnected && this.player.hasPhysics){
                const projectileShape = new AABB(projectile.center.clone(), projectile.halfSize.clone());
                const playerShape = this.player.collisionShape.getBoundingRect();
                if(projectileShape.overlaps(playerShape)){
                    const playerController = this.player.ai as PlayerController;
                    if(playerController !== undefined){
                        const knockDirection = projectile.velocity.x < 0 ? -1 : 1;
                        playerController.applyDamage(this.attackDamage, new Vec2(80 * knockDirection, -50));
                    }
                    projectile.hasConnected = true;
                }
            }

            if(projectile.elapsed >= this.projectileLifetime || projectile.hasConnected){
                projectile.visual.destroy();
                toRemove.push(projectile);
            }
        }

        this.projectiles = this.projectiles.filter(projectile => !toRemove.includes(projectile));
    }

    protected updateHitFlash(deltaT: number): void {
        if(this.currentAction === "dead"){
            return;
        }

        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - deltaT);
        this.owner.alpha = this.hitFlashTimer > 0
            ? (Math.floor(this.hitFlashTimer * 36) % 2 === 0 ? 0.4 : 1)
            : 1;
    }

    protected startDeathFade(): void {
        this.currentAction = "dead";
        this.attackPhase = "none";
        this.actionTimer = 0;
        this.owner.animation.play(SnowmanAnimations.DYING, false);
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
            for(const projectile of this.projectiles){
                projectile.visual.destroy();
            }
            this.projectiles = [];
            this.owner.destroy();
        }
    }
}
