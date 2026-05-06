import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";

export type WolfAction = "idle" | "run" | "attack" | "dead";
export type WolfAttackPhase = "none" | "windup" | "active" | "recovery";

export type WolfControllerOptions = {
    player: AnimatedSprite;
    maxHealth?: number;
    homePosition?: Vec2;
    hitboxHalfSize?: Vec2;
    aggroRangeX?: number;
    aggroRangeY?: number;
    leashDistance?: number;
    moveSpeed?: number;
    attackRangeX?: number;
    attackRangeY?: number;
    attackDamage?: number;
    attackWindup?: number;
    attackActive?: number;
    attackRecovery?: number;
    attackCooldown?: number;
    attackMoveSpeed?: number;
    attackHitboxOffset?: Vec2;
    attackHitboxHalfSize?: Vec2;
    gravity?: number;
    maxFallSpeed?: number;
    hitFlashDuration?: number;
    fadeDeathDuration?: number;
};
