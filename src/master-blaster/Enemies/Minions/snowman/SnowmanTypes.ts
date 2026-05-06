import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";

export type SnowmanAction = "idle" | "attack" | "dead";
export type SnowmanAttackPhase = "none" | "windup" | "active" | "recovery";

export type SnowmanControllerOptions = {
    player: AnimatedSprite;
    projectileImageKey: string;
    maxHealth?: number;
    hitboxHalfSize?: Vec2;
    aggroRangeX?: number;
    aggroRangeY?: number;
    attackDamage?: number;
    attackWindup?: number;
    attackActive?: number;
    attackRecovery?: number;
    attackCooldown?: number;
    projectileSpeed?: number;
    projectileLifetime?: number;
    projectileHalfSize?: Vec2;
    projectileSpawnOffset?: Vec2;
    hitFlashDuration?: number;
    fadeDeathDuration?: number;
};
