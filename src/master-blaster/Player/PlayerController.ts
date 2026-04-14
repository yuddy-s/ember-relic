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
import { TweenableProperties } from "../../Wolfie2D/Nodes/GameNode";
import { EaseFunctionType } from "../../Wolfie2D/Utils/EaseFunctions";

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

    protected readonly DASH_DURATION: number = 0.14;
    protected readonly DASH_COOLDOWN: number = 0.5;
    protected readonly COYOTE_TIME: number = 0.1;
    protected readonly JUMP_BUFFER_TIME: number = 0.1;

    /** Health and max health for the player */
    protected _health: number;
    protected _maxHealth: number;

    /** The players game node */
    protected owner: MBAnimatedSprite;

    protected _velocity: Vec2;
	protected _speed: number;

    protected tilemap: OrthogonalTilemap;
    // protected cannon: Sprite;
    protected weapon: PlayerWeapon;

    protected dashTimer: number;
    protected dashCooldownTimer: number;
    protected dashDirection: Vec2;
    protected hasAirDashed: boolean;
    protected coyoteTimer: number;
    protected jumpBufferTimer: number;

    
    public initializeAI(owner: MBAnimatedSprite, options: Record<string, any>){
        this.owner = owner;

        this.weapon = options.weaponSystem;

        this.tilemap = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
        this.speed = this.MIN_SPEED;
        this.velocity = Vec2.ZERO;

        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.dashDirection = Vec2.RIGHT;
        this.hasAirDashed = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;

        this.health = 5
        this.maxHealth = 5;

        // Add the different states the player can be in to the PlayerController 
		this.addState(PlayerStates.IDLE, new Idle(this, this.owner));
        this.addState(PlayerStates.WALK, new Walk(this, this.owner));
        this.addState(PlayerStates.JUMP, new Jump(this, this.owner));
        this.addState(PlayerStates.FALL, new Fall(this, this.owner));
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

    public update(deltaT: number): void {
		super.update(deltaT);

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
        if (!this.isDashing() && Input.isMouseJustPressed(0) && !this.weapon.isSystemRunning()) {
            this.weapon.setSlashDirection(this.faceDir);

            // Start the particle system at the player's current position
            const slashOrigin = this.owner.position.clone().add(this.faceDir.clone().normalize().scale(8));
            this.weapon.startSystem(180, 0, slashOrigin);
            this.owner.animation.playIfNotAlready(PlayerAnimations.ATTACK_RIGHT, false);
            this.owner.animation.queue(PlayerAnimations.IDLE);
        }

    this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - deltaT);

	}

    public isDashing(): boolean {
        return this.dashTimer > 0;
    }

    public canDash(): boolean {
        return !this.isDashing() && !this.hasAirDashed && this.dashCooldownTimer === 0;
    }

    public shouldStartJump(): boolean {
        return !this.isDashing() && this.jumpBufferTimer > 0 && (this.owner.onGround || this.coyoteTimer > 0);
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
