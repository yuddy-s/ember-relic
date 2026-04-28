import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";

export type SlimeAction = "idle" | "walk" | "attack" | "dead";
export type SlimeAttackPhase = "none" | "windup" | "active" | "recovery";

export type SlimeControllerOptions = {
    player: AnimatedSprite;
    maxHealth?: number;
    homePosition?: Vec2;
    hitboxHalfSize?: Vec2;
    patrolRangeX?: number;
    aggroRangeX?: number;
    aggroRangeY?: number;
    enragedAggroRangeX?: number;
    enragedAggroRangeY?: number;
    chaseLeashDistance?: number;
    moveSpeed?: number;
    attackRangeX?: number;
    attackRangeY?: number;
    attackDamage?: number;
    attackWindup?: number;
    attackActive?: number;
    attackRecovery?: number;
    attackCooldown?: number;
    attackHitboxOffset?: Vec2;
    attackHitboxHalfSize?: Vec2;
    gravity?: number;
    maxFallSpeed?: number;
    hitFlashDuration?: number;
    fadeDeathDuration?: number;
};
