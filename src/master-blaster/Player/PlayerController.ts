import StateMachineAI from "../../Wolfie2D/AI/StateMachineAI";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";

import Fall from "./PlayerStates/Fall";
import Idle from "./PlayerStates/Idle";
import Jump from "./PlayerStates/Jump";
import Walk from "./PlayerStates/Walk";
import Dash from "./PlayerStates/Dash";

import PlayerWeapon from "./PlayerWeapon";
import Input from "../../Wolfie2D/Input/Input";

import { MBControls } from "../MBControls";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import MathUtils from "../../Wolfie2D/Utils/MathUtils";
import { MBEvents } from "../MBEvents";
import Dead from "./PlayerStates/Dead";
import Dying from "./PlayerStates/Dying";
import TakingDamage from "./PlayerStates/TakingDamage";
import WallLatch from "./PlayerStates/WallLatch";
import { TweenableProperties } from "../../Wolfie2D/Nodes/GameNode";
import { EaseFunctionType } from "../../Wolfie2D/Utils/EaseFunctions";
import { MBProgress, UpgradeId } from "../Progress/MBProgress";

type DamageModifyingScene = {
    modifyIncomingPlayerDamage?: (amount: number, damageType: string) => number;
};

// TODO play your heros animations

/**
 * Animation keys for the player spritesheet
 */
export const PlayerAnimations = {
    IDLE: "IDLE",
    WALK_RIGHT: "WALK_RIGHT",
    JUMP_RIGHT: "JUMP_RIGHT",
    FALL_RIGHT: "FALL_RIGHT",
    TAKE_DAMAGE_RIGHT: "TAKE_DAMAGE_RIGHT",
    ATTACK_RIGHT: "ATTACK_RIGHT",
    WALL_LATCH: "WALL_LATCH",
    DYING: "DYING",
    DEAD: "DEAD",
} as const

/**
 * Tween animations the player can player.
 */
export const PlayerTweens = {
    FLIP: "FLIP",
    DEATH: "DEATH"
} as const

/**
 * Keys for the states the PlayerController can be in.
 */
export const PlayerStates = {
    IDLE: "IDLE",
    WALK: "WALK",
	JUMP: "JUMP",
    FALL: "FALL",
    WALL_LATCH: "WALL_LATCH",
    DASH: "DASH",
    TAKINGDAMAGE: "TAKINGDAMAGE",
    DYING: "DYING",
    DEAD: "DEAD",
} as const

/**
 * The controller that controls the player.
 */
export default class PlayerController extends StateMachineAI {
    public readonly MAX_SPEED: number = 240;
    public readonly MIN_SPEED: number = 130;
    public readonly DASH_SPEED: number = 500;
    public readonly FLY_SPEED: number = 220;
    public readonly WALL_JUMP_X_SPEED: number = 220;
    public readonly WALL_JUMP_Y_SPEED: number = -330;

    protected readonly DASH_DURATION: number = 0.2;
    protected readonly DASH_COOLDOWN: number = 0.5;
    protected readonly ATTACK_COOLDOWN: number = 0.4;
    protected readonly COYOTE_TIME: number = 0.1;
    protected readonly JUMP_BUFFER_TIME: number = 0.1;
    protected readonly WALL_LATCH_COOLDOWN: number = 0.15;
    protected readonly POST_HIT_INVULNERABILITY: number = 0.55;

    /** Health and max health for the player */
    protected _health: number;
    protected _maxHealth: number;

    /** The players game node */
    protected owner: MBAnimatedSprite;

    protected _velocity: Vec2;
    protected _speed: number;

    protected tilemap: OrthogonalTilemap;
    protected slidingTilemap: OrthogonalTilemap | null;
    // protected cannon: Sprite;
    protected weapon: PlayerWeapon;

    protected dashTimer: number;
    protected dashCooldownTimer: number;
    protected dashDirection: Vec2;
    protected hasAirDashed: boolean;
    protected coyoteTimer: number;
    protected jumpBufferTimer: number;
    protected invulnerabilityTimer: number;
    protected attackCooldownTimer: number;
    protected flyMode: boolean;
    protected wallLatchDirection: number;
    protected wallLatchCooldownTimer: number;

    
    public initializeAI(owner: MBAnimatedSprite, options: Record<string, any>){
        this.owner = owner;

        this.weapon = options.weaponSystem;

        this.tilemap = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
        this.slidingTilemap = this.owner.getScene().getTilemap("Sliding") as OrthogonalTilemap | null;
        this.speed = this.MIN_SPEED;
        this.velocity = Vec2.ZERO;

        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.dashDirection = Vec2.RIGHT;
        this.hasAirDashed = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.invulnerabilityTimer = 0;
        this.attackCooldownTimer = 0;
        this.flyMode = false;
        this.wallLatchDirection = 0;
        this.wallLatchCooldownTimer = 0;

        this.health = 100
        this.maxHealth = 100;

        // Add the different states the player can be in to the PlayerController 
		this.addState(PlayerStates.IDLE, new Idle(this, this.owner));
        this.addState(PlayerStates.WALK, new Walk(this, this.owner));
        this.addState(PlayerStates.JUMP, new Jump(this, this.owner));
        this.addState(PlayerStates.FALL, new Fall(this, this.owner));
        this.addState(PlayerStates.WALL_LATCH, new WallLatch(this, this.owner));
        this.addState(PlayerStates.DASH, new Dash(this, this.owner));
        this.addState(PlayerStates.TAKINGDAMAGE, new TakingDamage(this, this.owner));
        this.addState(PlayerStates.DYING, new Dying(this, this.owner));
        this.addState(PlayerStates.DEAD, new Dead(this, this.owner));
        
        // Start the player in the Idle state
        this.initialize(PlayerStates.IDLE);
    }

    /** 
	 * Get the inputs from the keyboard, or Vec2.Zero if nothing is being pressed
	 */
    public get inputDir(): Vec2 {
        let direction = Vec2.ZERO;
		direction.x = (Input.isPressed(MBControls.MOVE_LEFT) ? -1 : 0) + (Input.isPressed(MBControls.MOVE_RIGHT) ? 1 : 0);
		direction.y = (Input.isJustPressed(MBControls.JUMP) ? -1 : 0);
		return direction;
    }
    /** 
     * Gets the direction of the mouse from the player's position as a Vec2
     */
    public get faceDir(): Vec2 { return this.owner.position.dirTo(Input.getGlobalMousePosition()); }

    public faceToward(direction: Vec2): void {
        if(direction.x !== 0){
            this.owner.invertX = MathUtils.sign(direction.x) < 0;
        }
    }

    public update(deltaT: number): void {
        if(this.flyMode){
            this.updateFly(deltaT);
            return;
        }

        super.update(deltaT);

        this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - deltaT);
        this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - deltaT);
        this.wallLatchCooldownTimer = Math.max(0, this.wallLatchCooldownTimer - deltaT);

        if(Input.isJustPressed(MBControls.JUMP)){
            this.jumpBufferTimer = this.JUMP_BUFFER_TIME;
        } else {
            this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - deltaT);
        }

        if(this.owner.onGround && !this.isDashing()){
            this.hasAirDashed = false;
            this.coyoteTimer = this.COYOTE_TIME;
        } else {
            this.coyoteTimer = Math.max(0, this.coyoteTimer - deltaT);
        }

        // If the player hits the attack button and the weapon system isn't running, fire in the mouse direction.
        if (!this.isDashing() && this.canAttack() && Input.isMouseJustPressed(0) && !this.weapon.isSystemRunning()) {
            const attackDirection = this.faceDir;
            this.faceToward(attackDirection);
            this.weapon.setSlashDirection(attackDirection);

            // Start the particle system at the player's current position
            const slashOrigin = this.owner.position.clone().add(attackDirection.clone().normalize().scale(8));
            this.weapon.startSystem(180, 0, slashOrigin);
            this.owner.animation.playIfNotAlready(PlayerAnimations.ATTACK_RIGHT, false);
            this.owner.animation.queue(PlayerAnimations.IDLE);
            this.attackCooldownTimer = this.ATTACK_COOLDOWN;
        }

    this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - deltaT);

	}

    protected updateFly(deltaT: number): void {
        let horizontal = 0;
        let vertical = 0;

        if(Input.isPressed(MBControls.MOVE_LEFT)){
            horizontal -= 1;
        }
        if(Input.isPressed(MBControls.MOVE_RIGHT)){
            horizontal += 1;
        }
        if(Input.isPressed(MBControls.JUMP)){
            vertical -= 1;
        }
        if(Input.isKeyPressed("s") || Input.isKeyPressed("arrowdown")){
            vertical += 1;
        }

        if(horizontal !== 0){
            this.owner.invertX = horizontal < 0;
        }

        const moveDir = new Vec2(horizontal, vertical);
        if(!moveDir.isZero()){
            moveDir.normalize();
        }

        this.velocity.x = moveDir.x * this.FLY_SPEED;
        this.velocity.y = moveDir.y * this.FLY_SPEED;
        this.owner.move(this.velocity.scaled(deltaT));

        if(!this.isDashing() && Input.isMouseJustPressed(0) && !this.weapon.isSystemRunning()) {
            const attackDirection = this.faceDir;
            this.faceToward(attackDirection);
            this.weapon.setSlashDirection(attackDirection);

            const slashOrigin = this.owner.position.clone().add(attackDirection.clone().normalize().scale(8));
            this.weapon.startSystem(180, 0, slashOrigin);
            this.owner.animation.playIfNotAlready(PlayerAnimations.ATTACK_RIGHT, false);
            this.owner.animation.queue(PlayerAnimations.IDLE);
        } else if(moveDir.isZero()){
            this.owner.animation.playIfNotAlready(PlayerAnimations.IDLE, true);
        } else {
            this.owner.animation.playIfNotAlready(PlayerAnimations.WALK_RIGHT, true);
        }

        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.hasAirDashed = false;
        this.coyoteTimer = this.COYOTE_TIME;
        this.jumpBufferTimer = 0;
    }

    public toggleFlyMode(): boolean {
        this.flyMode = !this.flyMode;
        this.velocity = Vec2.ZERO;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.hasAirDashed = false;
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;

        if(this.flyMode){
            this.owner.animation.playIfNotAlready(PlayerAnimations.IDLE, true);
        } else if(this.owner.onGround){
            this.changeState(PlayerStates.IDLE);
        } else {
            this.changeState(PlayerStates.FALL);
        }

        return this.flyMode;
    }

    public isDashing(): boolean {
        return this.dashTimer > 0;
    }

    public canDash(): boolean {
        return !this.isDashing() && !this.hasAirDashed && this.dashCooldownTimer === 0;
    }

    public canAttack(): boolean {
        return this.attackCooldownTimer === 0;
    }

    public shouldStartJump(): boolean {
        return !this.isDashing() && this.jumpBufferTimer > 0 && (this.owner.onGround || this.coyoteTimer > 0);
    }

    public hasIcePick(): boolean {
        return MBProgress.hasUpgrade(UpgradeId.ICE_PICK);
    }

    public tryStartWallLatch(): boolean {
        if(!this.hasIcePick() || this.owner.onGround || this.isDashing() || this.wallLatchCooldownTimer > 0){
            return false;
        }

        const inputDirection = this.inputDir.x;
        if(inputDirection === 0){
            return false;
        }

        const direction = MathUtils.sign(inputDirection);
        if(!this.isWallOnSide(direction)){
            return false;
        }

        this.wallLatchDirection = direction;
        this.jumpBufferTimer = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;
        return true;
    }

    public shouldKeepWallLatch(): boolean {
        return this.hasIcePick()
            && !this.owner.onGround
            && this.wallLatchDirection !== 0
            && this.isWallOnSide(this.wallLatchDirection);
    }

    public isHoldingWallLatchDirection(): boolean {
        return this.inputDir.x === this.wallLatchDirection;
    }

    public wallJump(): void {
        this.consumeJumpBuffer();
        this.velocity.x = -this.wallLatchDirection * this.WALL_JUMP_X_SPEED;
        this.velocity.y = this.WALL_JUMP_Y_SPEED;
        this.wallLatchCooldownTimer = this.WALL_LATCH_COOLDOWN;
        this.wallLatchDirection = 0;
    }

    public getWallLatchDirection(): number {
        return this.wallLatchDirection;
    }

    protected isWallOnSide(direction: number): boolean {
        if(this.tilemap === undefined || direction === 0){
            return false;
        }

        const sideX = direction < 0
            ? this.owner.boundary.left - 2
            : this.owner.boundary.right + 2;
        const topY = this.owner.boundary.top + 4;
        const midY = this.owner.position.y;
        const bottomY = this.owner.boundary.bottom - 4;

        return this.isTilemapSolidAt(sideX, topY)
            || this.isTilemapSolidAt(sideX, midY)
            || this.isTilemapSolidAt(sideX, bottomY);
    }

    protected isTilemapSolidAt(x: number, y: number): boolean {
        const tile = this.tilemap.getColRowAt(new Vec2(x, y));
        if(this.tilemap.isTileCollidable(tile.x, tile.y)){
            return true;
        }

        if(this.slidingTilemap === null || this.slidingTilemap === undefined){
            return false;
        }

        const slidingTile = this.slidingTilemap.getColRowAt(new Vec2(x, y));
        return this.slidingTilemap.isTileCollidable(slidingTile.x, slidingTile.y);
    }

    public isOnIce(): boolean {
        if(this.slidingTilemap === null || this.slidingTilemap === undefined || !this.owner.onGround){
            return false;
        }

        const checkY = this.owner.boundary.bottom + 2;
        const leftCheck = new Vec2(this.owner.boundary.left + 2, checkY);
        const rightCheck = new Vec2(this.owner.boundary.right - 2, checkY);
        const leftTile = this.slidingTilemap.getColRowAt(leftCheck);
        const rightTile = this.slidingTilemap.getColRowAt(rightCheck);

        return this.slidingTilemap.isTileCollidable(leftTile.x, leftTile.y)
            || this.slidingTilemap.isTileCollidable(rightTile.x, rightTile.y);
    }

    public consumeJumpBuffer(): void {
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;
    }

    public beginDash(): boolean {
        if(!this.canDash()){
            return false;
        }

        const inputDirection = this.inputDir;
        let dashX = inputDirection.x;
        if(dashX === 0){
            dashX = this.owner.invertX ? -1 : 1;
        }

        this.dashDirection = new Vec2(MathUtils.sign(dashX), 0);
        this.dashTimer = this.DASH_DURATION;
        this.dashCooldownTimer = this.DASH_COOLDOWN;
        this.hasAirDashed = true;
        this.grantInvulnerability(this.DASH_DURATION);
        this.velocity.x = this.dashDirection.x * this.DASH_SPEED;
        this.velocity.y = 0;
        return true;
    }

    public updateDash(deltaT: number): void {
        if(!this.isDashing()){
            return;
        }

        const remainingDashTime = this.dashTimer;
        const dashStep = Math.min(deltaT, remainingDashTime);
        this.dashTimer = Math.max(0, remainingDashTime - deltaT);
        this.velocity.x = this.dashDirection.x * this.DASH_SPEED;
        this.velocity.y = 0;
        this.owner.move(this.velocity.scaled(dashStep));
    }

    public endDash(): void {
        this.dashTimer = 0;
        this.velocity.x *= 0.35;
    }

    public isInvulnerable(): boolean {
        return this.invulnerabilityTimer > 0;
    }

    public grantInvulnerability(duration: number): void {
        this.invulnerabilityTimer = Math.max(this.invulnerabilityTimer, Math.max(0, duration));
    }

    public canTakeDamage(): boolean {
        return !this.isInvulnerable() && this.health > 0;
    }

    public applyDamage(amount: number, knockback?: Vec2, damageType: string = "generic"): boolean {
        const scene = this.owner.getScene() as DamageModifyingScene;
        const modifiedDamage = scene.modifyIncomingPlayerDamage !== undefined
            ? scene.modifyIncomingPlayerDamage(amount, damageType)
            : amount;
        const resolvedDamage = Math.max(0, Math.ceil(modifiedDamage));

        if(resolvedDamage <= 0 || !this.canTakeDamage()){
            return false;
        }

        if(knockback !== undefined){
            this.velocity = knockback.clone();
        }

        this.health = this.health - resolvedDamage;
        if(this.health > 0){
            this.grantInvulnerability(this.POST_HIT_INVULNERABILITY);
            this.changeState(PlayerStates.TAKINGDAMAGE);
        }

        return true;
    }

    public applyEnvironmentalTickDamage(amount: number): boolean {
        return this.applyDamage(amount, undefined, "environment_tick");
    }

    public get velocity(): Vec2 { return this._velocity; }
    public set velocity(velocity: Vec2) { this._velocity = velocity; }

    public get speed(): number { return this._speed; }
    public set speed(speed: number) { this._speed = speed; }

    public get maxHealth(): number { return this._maxHealth; }
    public set maxHealth(maxHealth: number) { 
        this._maxHealth = maxHealth; 
        // When the health changes, fire an event up to the scene.
        this.emitter.fireEvent(MBEvents.HEALTH_CHANGE, {curhp: this.health, maxhp: this.maxHealth});
    }

    public get health(): number { return this._health; }
    public set health(health: number) { 
        this._health = MathUtils.clamp(health, 0, this.maxHealth);
        // When the health changes, fire an event up to the scene.
        this.emitter.fireEvent(MBEvents.HEALTH_CHANGE, {curhp: this.health, maxhp: this.maxHealth});
        // If the health hit 0, change the state of the player
        if (this.health === 0) { this.changeState(PlayerStates.DYING); }
    }
}
