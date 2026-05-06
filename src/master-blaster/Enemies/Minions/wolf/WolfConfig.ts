import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import { EnemyPhysicsConfig } from "../../EnemyPhysicsTypes";

export const WOLF_SPRITE_KEY = "WOLF_SPRITE";
export const WOLF_SPRITE_PATH = "game_assets/spritesheets/enemies/minion/wolf.json";

export const DEFAULT_WOLF_MAX_HEALTH = 4;
export const DEFAULT_WOLF_SPRITE_SCALE = new Vec2(0.36, 0.36);
export const DEFAULT_WOLF_PHYSICS_SCALE = new Vec2(1, 1);
export const DEFAULT_WOLF_HITBOX_HALF_SIZE = new Vec2(13, 9);
export const DEFAULT_WOLF_ATTACK_HITBOX_OFFSET = new Vec2(10.5, -1.5);
export const DEFAULT_WOLF_ATTACK_HITBOX_HALF_SIZE = new Vec2(10.5, 6.5);

export const DEFAULT_WOLF_AGGRO_RANGE_X = 210;
export const DEFAULT_WOLF_AGGRO_RANGE_Y = 70;
export const DEFAULT_WOLF_LEASH_DISTANCE = 240;
export const DEFAULT_WOLF_MOVE_SPEED = 78;
export const DEFAULT_WOLF_ATTACK_RANGE_X = 28;
export const DEFAULT_WOLF_ATTACK_RANGE_Y = 20;
export const DEFAULT_WOLF_ATTACK_DAMAGE = 6;
export const DEFAULT_WOLF_ATTACK_WINDUP = 0.32;
export const DEFAULT_WOLF_ATTACK_ACTIVE = 0.18;
export const DEFAULT_WOLF_ATTACK_RECOVERY = 0.28;
export const DEFAULT_WOLF_ATTACK_COOLDOWN = 0.8;
export const DEFAULT_WOLF_ATTACK_MOVE_SPEED = 110;

export const DEFAULT_WOLF_GRAVITY = 600;
export const DEFAULT_WOLF_MAX_FALL_SPEED = 900;
export const DEFAULT_WOLF_HIT_FLASH_DURATION = 0.22;
export const DEFAULT_WOLF_FADE_DEATH_DURATION = 0.45;

export const DEFAULT_WOLF_PHYSICS: EnemyPhysicsConfig = {
    spriteScale: DEFAULT_WOLF_SPRITE_SCALE.clone(),
    physicsScale: DEFAULT_WOLF_PHYSICS_SCALE.clone(),
    bodyHitboxHalfSize: DEFAULT_WOLF_HITBOX_HALF_SIZE.clone(),
    attackHitboxOffset: DEFAULT_WOLF_ATTACK_HITBOX_OFFSET.clone(),
    attackHitboxHalfSize: DEFAULT_WOLF_ATTACK_HITBOX_HALF_SIZE.clone(),
    movementMode: "ground",
    snapToFloor: true
};
