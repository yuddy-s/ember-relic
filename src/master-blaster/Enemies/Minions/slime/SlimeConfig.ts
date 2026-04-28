import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import { EnemyPhysicsConfig } from "../../EnemyPhysicsTypes";

export const SLIME_SPRITE_KEY = "SLIME_SPRITE";
export const SLIME_SPRITE_PATH = "game_assets/spritesheets/enemies/minion/slime.json";

export const DEFAULT_SLIME_MAX_HEALTH = 6;
export const DEFAULT_SLIME_SPRITE_SCALE = new Vec2(0.6, 0.6);
export const DEFAULT_SLIME_PHYSICS_SCALE = new Vec2(1.0, 1.0);
export const DEFAULT_SLIME_HITBOX_HALF_SIZE = new Vec2(15, 12);
export const DEFAULT_SLIME_ATTACK_HITBOX_OFFSET = new Vec2(12, 0);
export const DEFAULT_SLIME_ATTACK_HITBOX_HALF_SIZE = new Vec2(16, 10);

export const DEFAULT_SLIME_PATROL_RANGE_X = 48;
export const DEFAULT_SLIME_AGGRO_RANGE_X = 72;
export const DEFAULT_SLIME_AGGRO_RANGE_Y = 26;
export const DEFAULT_SLIME_ENRAGED_AGGRO_RANGE_X = 220;
export const DEFAULT_SLIME_ENRAGED_AGGRO_RANGE_Y = 90;
export const DEFAULT_SLIME_CHASE_LEASH_DISTANCE = 52;
export const DEFAULT_SLIME_MOVE_SPEED = 12;
export const DEFAULT_SLIME_ATTACK_RANGE_X = 4;
export const DEFAULT_SLIME_ATTACK_RANGE_Y = 6;

export const DEFAULT_SLIME_ATTACK_DAMAGE = 2;
export const DEFAULT_SLIME_ATTACK_WINDUP = 0.5;
export const DEFAULT_SLIME_ATTACK_ACTIVE = 0.12;
export const DEFAULT_SLIME_ATTACK_RECOVERY = 0.32;
export const DEFAULT_SLIME_ATTACK_COOLDOWN = 0.85;

export const DEFAULT_SLIME_GRAVITY = 600;
export const DEFAULT_SLIME_MAX_FALL_SPEED = 900;
export const DEFAULT_SLIME_HIT_FLASH_DURATION = 0.5;
export const DEFAULT_SLIME_FADE_DEATH_DURATION = 0.8;

export const DEFAULT_SLIME_PHYSICS: EnemyPhysicsConfig = {
    spriteScale: DEFAULT_SLIME_SPRITE_SCALE.clone(),
    physicsScale: DEFAULT_SLIME_PHYSICS_SCALE.clone(),
    bodyHitboxHalfSize: DEFAULT_SLIME_HITBOX_HALF_SIZE.clone(),
    attackHitboxOffset: DEFAULT_SLIME_ATTACK_HITBOX_OFFSET.clone(),
    attackHitboxHalfSize: DEFAULT_SLIME_ATTACK_HITBOX_HALF_SIZE.clone(),
    movementMode: "ground",
    snapToFloor: true
};
