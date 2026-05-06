import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import AnimatedSprite from "../../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";

export type GuardAction = "idle" | "walk" | "shieldSlam" | "charge" | "reversal" | "dead";
export type GuardAttackPhase = "none" | "windup" | "active" | "recovery";

export type GuardControllerOptions = {
    player: AnimatedSprite;
    maxHealth?: number;
    homePosition?: Vec2;
    hitboxHalfSize?: Vec2;
    aggroRangeX?: number;
    aggroRangeY?: number;
    leashDistance?: number;
    moveSpeed?: number;
    slamRangeX?: number;
    slamRangeY?: number;
    shieldSlamDamage?: number;
    shieldSlamWindup?: number;
    shieldSlamActive?: number;
    shieldSlamRecovery?: number;
    shieldSlamCooldown?: number;
    shieldSlamHitboxOffset?: Vec2;
    shieldSlamHitboxHalfSize?: Vec2;
    chargeSpeed?: number;
    chargeDamage?: number;
    chargeDuration?: number;
    chargeCooldown?: number;
    reversalDuration?: number;
    jumpOverTriggerHeight?: number;
    gravity?: number;
    maxFallSpeed?: number;
    hitFlashDuration?: number;
    fadeDeathDuration?: number;
};
