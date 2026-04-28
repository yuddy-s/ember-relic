import Vec2 from "../../Wolfie2D/DataTypes/Vec2";

export type EnemyMovementMode = "ground" | "flying";

export interface EnemyPhysicsConfig {
    spriteScale: Vec2;
    physicsScale?: Vec2;
    bodyHitboxHalfSize: Vec2;
    bodyColliderOffset?: Vec2;
    attackHitboxOffset?: Vec2;
    attackHitboxHalfSize?: Vec2;
    movementMode?: EnemyMovementMode;
    snapToFloor?: boolean;
}

export interface ResolvedEnemyPhysicsConfig {
    spriteScale: Vec2;
    bodyHitboxHalfSize: Vec2;
    bodyColliderOffset: Vec2;
    attackHitboxOffset: Vec2;
    attackHitboxHalfSize: Vec2;
    movementMode: EnemyMovementMode;
    snapToFloor: boolean;
}
