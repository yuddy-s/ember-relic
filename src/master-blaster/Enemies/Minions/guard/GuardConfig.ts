import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import { EnemyPhysicsConfig } from "../../EnemyPhysicsTypes";

export const GUARD_SPRITE_KEY = "GUARD_SPRITE";
export const GUARD_SPRITE_PATH = "game_assets/spritesheets/enemies/minion/guard.json";

export const DEFAULT_GUARD_MAX_HEALTH = 10;
export const DEFAULT_GUARD_SPRITE_SCALE = new Vec2(0.7, 0.7);
export const DEFAULT_GUARD_PHYSICS_SCALE = new Vec2(1, 1);
export const DEFAULT_GUARD_HITBOX_HALF_SIZE = new Vec2(18, 28);
export const DEFAULT_GUARD_SHIELD_SLAM_HITBOX_OFFSET = new Vec2(18, 2);
export const DEFAULT_GUARD_SHIELD_SLAM_HITBOX_HALF_SIZE = new Vec2(18, 14);

export const DEFAULT_GUARD_AGGRO_RANGE_X = 240;
export const DEFAULT_GUARD_AGGRO_RANGE_Y = 90;
export const DEFAULT_GUARD_LEASH_DISTANCE = 280;
export const DEFAULT_GUARD_MOVE_SPEED = 30;
export const DEFAULT_GUARD_SLAM_RANGE_X = 34;
export const DEFAULT_GUARD_SLAM_RANGE_Y = 24;
export const DEFAULT_GUARD_SHIELD_SLAM_DAMAGE = 8;
export const DEFAULT_GUARD_SHIELD_SLAM_WINDUP = 0.36;
export const DEFAULT_GUARD_SHIELD_SLAM_ACTIVE = 0.18;
export const DEFAULT_GUARD_SHIELD_SLAM_RECOVERY = 0.34;
export const DEFAULT_GUARD_SHIELD_SLAM_COOLDOWN = 0.9;

export const DEFAULT_GUARD_CHARGE_SPEED = 190;
export const DEFAULT_GUARD_CHARGE_DAMAGE = 10;
export const DEFAULT_GUARD_CHARGE_DURATION = 0.8;
export const DEFAULT_GUARD_CHARGE_COOLDOWN = 1.8;
export const DEFAULT_GUARD_REVERSAL_DURATION = 1.0;
export const DEFAULT_GUARD_JUMP_OVER_TRIGGER_HEIGHT = 24;

export const DEFAULT_GUARD_GRAVITY = 600;
export const DEFAULT_GUARD_MAX_FALL_SPEED = 900;
export const DEFAULT_GUARD_HIT_FLASH_DURATION = 0.24;
export const DEFAULT_GUARD_FADE_DEATH_DURATION = 0.55;

export const DEFAULT_GUARD_PHYSICS: EnemyPhysicsConfig = {
    spriteScale: DEFAULT_GUARD_SPRITE_SCALE.clone(),
    physicsScale: DEFAULT_GUARD_PHYSICS_SCALE.clone(),
    bodyHitboxHalfSize: DEFAULT_GUARD_HITBOX_HALF_SIZE.clone(),
    attackHitboxOffset: DEFAULT_GUARD_SHIELD_SLAM_HITBOX_OFFSET.clone(),
    attackHitboxHalfSize: DEFAULT_GUARD_SHIELD_SLAM_HITBOX_HALF_SIZE.clone(),
    movementMode: "ground",
    snapToFloor: true
};
