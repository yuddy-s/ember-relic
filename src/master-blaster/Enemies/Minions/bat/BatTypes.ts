import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";

export type BatAction = "idle" | "attack" | "recover" | "stunned" | "dead";

export type BatControllerOptions = {
    player: AnimatedSprite;
    maxHealth?: number;
    homePosition?: Vec2;
    hitboxHalfSize?: Vec2;
    aggroRangeX?: number;
    aggroRangeY?: number;
    attackDamage?: number;
    attackSpeed?: number;
    attackDuration?: number;
    attackCooldown?: number;
    attackHitboxHalfSize?: Vec2;
    attackHitboxForwardOffset?: number;
    hoverAmplitude?: number;
    hoverFrequency?: number;
    patrolRadiusX?: number;
    patrolRadiusY?: number;
    driftLerp?: number;
    recoveryLerp?: number;
    retreatDistance?: number;
    retreatLift?: number;
    retreatDuration?: number;
    stunDuration?: number;
    hitFlashDuration?: number;
    fadeDeathDuration?: number;
};
