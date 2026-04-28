import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import { EnemyPhysicsConfig } from "../../EnemyPhysicsTypes";

export const WRETCH_SPRITE_KEY = "WRETCH_SPRITE";
export const WRETCH_SPRITE_PATH = "game_assets/spritesheets/enemies/minion/wretch.json";

export const DEFAULT_WRETCH_MAX_HEALTH = 5;
export const DEFAULT_WRETCH_SPRITE_SCALE = new Vec2(0.1, 0.1);
export const DEFAULT_WRETCH_PHYSICS_SCALE = new Vec2(1, 1);
export const DEFAULT_WRETCH_HITBOX_HALF_SIZE = new Vec2(10, 22);
export const DEFAULT_WRETCH_ATTACK_HITBOX_OFFSET = new Vec2(8, -2);
export const DEFAULT_WRETCH_ATTACK_HITBOX_HALF_SIZE = new Vec2(16, 11);

export const DEFAULT_WRETCH_AGGRO_RANGE_X = 150;
export const DEFAULT_WRETCH_AGGRO_RANGE_Y = 90;
export const DEFAULT_WRETCH_ATTACK_RANGE_X = 60;
export const DEFAULT_WRETCH_ATTACK_RANGE_Y = 28;
export const DEFAULT_WRETCH_JUMP_ATTACK_MIN_RANGE_X = 80;
export const DEFAULT_WRETCH_JUMP_ATTACK_MAX_RANGE_X = 150;

export const DEFAULT_WRETCH_ATTACK_DAMAGE = 7;
export const DEFAULT_WRETCH_JUMP_ATTACK_DAMAGE = 1;
export const DEFAULT_WRETCH_ATTACK_WINDUP = 0.7;
export const DEFAULT_WRETCH_ATTACK_ACTIVE = 0.1;
export const DEFAULT_WRETCH_ATTACK_RECOVERY = 0.28;
export const DEFAULT_WRETCH_ATTACK_COOLDOWN = 0.6;

export const DEFAULT_WRETCH_JUMP_ATTACK_COOLDOWN = 2.00;
export const DEFAULT_WRETCH_JUMP_ATTACK_RECOVERY = 0.2;
export const DEFAULT_WRETCH_JUMP_SPEED_X = 160;
export const DEFAULT_WRETCH_JUMP_SPEED_Y = 230;

export const DEFAULT_WRETCH_GRAVITY = 600;
export const DEFAULT_WRETCH_MAX_FALL_SPEED = 900;
export const DEFAULT_WRETCH_STUN_DURATION = 0.28;
export const DEFAULT_WRETCH_STUN_WINDOW_COOLDOWN = 1.1;
export const DEFAULT_WRETCH_HIT_FLASH_DURATION = 0.3;
export const DEFAULT_WRETCH_FADE_DEATH_DURATION = 0.45;

export const DEFAULT_WRETCH_PHYSICS: EnemyPhysicsConfig = {
    spriteScale: DEFAULT_WRETCH_SPRITE_SCALE.clone(),
    physicsScale: DEFAULT_WRETCH_PHYSICS_SCALE.clone(),
    bodyHitboxHalfSize: DEFAULT_WRETCH_HITBOX_HALF_SIZE.clone(),
    attackHitboxOffset: DEFAULT_WRETCH_ATTACK_HITBOX_OFFSET.clone(),
    attackHitboxHalfSize: DEFAULT_WRETCH_ATTACK_HITBOX_HALF_SIZE.clone(),
    movementMode: "ground",
    snapToFloor: true
};
