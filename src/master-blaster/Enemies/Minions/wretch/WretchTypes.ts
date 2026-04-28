import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";

export type WretchAction = "idle" | "attack" | "jumpAttack" | "stunned" | "dead";
export type WretchAttackPhase = "none" | "windup" | "active" | "recovery";

export type WretchControllerOptions = {
    player: AnimatedSprite;
    tilemap: string;
    maxHealth?: number;
    hitboxHalfSize?: Vec2;
    aggroRangeX?: number;
    aggroRangeY?: number;
    attackRangeX?: number;
    attackRangeY?: number;
    attackDamage?: number;
    attackWindup?: number;
    attackActive?: number;
    attackRecovery?: number;
    attackCooldown?: number;
    attackHitboxOffset?: Vec2;
    attackHitboxHalfSize?: Vec2;
    jumpAttackMinRangeX?: number;
    jumpAttackMaxRangeX?: number;
    jumpAttackDamage?: number;
    jumpAttackCooldown?: number;
    jumpAttackRecovery?: number;
    jumpSpeedX?: number;
    jumpSpeedY?: number;
    gravity?: number;
    maxFallSpeed?: number;
    stunDuration?: number;
    stunWindowCooldown?: number;
    hitFlashDuration?: number;
    fadeDeathDuration?: number;
};
