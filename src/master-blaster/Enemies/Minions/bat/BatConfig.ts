import Vec2 from "../../../../Wolfie2D/DataTypes/Vec2";
import { EnemyPhysicsConfig } from "../../EnemyPhysicsTypes";

export const BAT_SPRITE_KEY = "BAT_SPRITE";
export const BAT_SPRITE_PATH = "game_assets/spritesheets/enemies/minion/bat.json";

export const DEFAULT_BAT_MAX_HEALTH = 3;
export const DEFAULT_BAT_SPRITE_SCALE = new Vec2(0.1, 0.1);
export const DEFAULT_BAT_PHYSICS_SCALE = new Vec2(1, 1);
export const DEFAULT_BAT_HITBOX_HALF_SIZE = new Vec2(30, 18);
export const DEFAULT_BAT_ATTACK_HITBOX_HALF_SIZE = new Vec2(34, 24);
export const DEFAULT_BAT_ATTACK_HITBOX_FORWARD_OFFSET = 20;

export const DEFAULT_BAT_AGGRO_RANGE_X = 120;
export const DEFAULT_BAT_AGGRO_RANGE_Y = 80;
export const DEFAULT_BAT_ATTACK_DAMAGE = 4;
export const DEFAULT_BAT_ATTACK_SPEED = 150;
export const DEFAULT_BAT_ATTACK_DURATION = 0.45;
export const DEFAULT_BAT_ATTACK_COOLDOWN = 1.4;
export const DEFAULT_BAT_PATROL_RADIUS_X = 46;
export const DEFAULT_BAT_PATROL_RADIUS_Y = 16;
export const DEFAULT_BAT_HOVER_AMPLITUDE = 8;
export const DEFAULT_BAT_HOVER_FREQUENCY = 2.6;
export const DEFAULT_BAT_DRIFT_LERP = 3.2;
export const DEFAULT_BAT_RECOVERY_LERP = 4.5;
export const DEFAULT_BAT_RETREAT_DISTANCE = 76;
export const DEFAULT_BAT_RETREAT_LIFT = 28;
export const DEFAULT_BAT_RETREAT_DURATION = 0.8;
export const DEFAULT_BAT_STUN_DURATION = 0.32;
export const DEFAULT_BAT_HIT_FLASH_DURATION = 0.3;
export const DEFAULT_BAT_FADE_DEATH_DURATION = 0.4;

export const DEFAULT_BAT_PHYSICS: EnemyPhysicsConfig = {
    spriteScale: DEFAULT_BAT_SPRITE_SCALE.clone(),
    physicsScale: DEFAULT_BAT_PHYSICS_SCALE.clone(),
    bodyHitboxHalfSize: DEFAULT_BAT_HITBOX_HALF_SIZE.clone(),
    attackHitboxHalfSize: DEFAULT_BAT_ATTACK_HITBOX_HALF_SIZE.clone(),
    movementMode: "flying",
    snapToFloor: false
};
