import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import { EnemyPhysicsConfig } from "../../EnemyPhysicsTypes";

export const SNOWMAN_SPRITE_KEY = "SNOWMAN_SPRITE";
export const SNOWMAN_SPRITE_PATH = "game_assets/spritesheets/enemies/minion/snowman.json";

export const DEFAULT_SNOWMAN_MAX_HEALTH = 5;
export const DEFAULT_SNOWMAN_SPRITE_SCALE = new Vec2(0.39, 0.39);
export const DEFAULT_SNOWMAN_PHYSICS_SCALE = new Vec2(1, 1);
export const DEFAULT_SNOWMAN_HITBOX_HALF_SIZE = new Vec2(10.5, 14.5);

export const DEFAULT_SNOWMAN_AGGRO_RANGE_X = 320;
export const DEFAULT_SNOWMAN_AGGRO_RANGE_Y = 100;
export const DEFAULT_SNOWMAN_ATTACK_DAMAGE = 4;
export const DEFAULT_SNOWMAN_ATTACK_WINDUP = 0.55;
export const DEFAULT_SNOWMAN_ATTACK_ACTIVE = 0.12;
export const DEFAULT_SNOWMAN_ATTACK_RECOVERY = 0.35;
export const DEFAULT_SNOWMAN_ATTACK_COOLDOWN = 1.35;

export const DEFAULT_SNOWMAN_PROJECTILE_SPEED = 240;
export const DEFAULT_SNOWMAN_PROJECTILE_LIFETIME = 2.4;
export const DEFAULT_SNOWMAN_PROJECTILE_HALF_SIZE = new Vec2(7, 7);
export const DEFAULT_SNOWMAN_PROJECTILE_SPAWN_OFFSET = new Vec2(12, -4);

export const DEFAULT_SNOWMAN_HIT_FLASH_DURATION = 0.24;
export const DEFAULT_SNOWMAN_FADE_DEATH_DURATION = 0.5;

export const DEFAULT_SNOWMAN_PHYSICS: EnemyPhysicsConfig = {
    spriteScale: DEFAULT_SNOWMAN_SPRITE_SCALE.clone(),
    physicsScale: DEFAULT_SNOWMAN_PHYSICS_SCALE.clone(),
    bodyHitboxHalfSize: DEFAULT_SNOWMAN_HITBOX_HALF_SIZE.clone(),
    movementMode: "ground",
    snapToFloor: true
};
