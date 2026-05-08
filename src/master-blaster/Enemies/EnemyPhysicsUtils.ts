import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import { EnemyPhysicsConfig, ResolvedEnemyPhysicsConfig } from "./EnemyPhysicsTypes";

export function createScaledEnemyPhysicsConfig(config: EnemyPhysicsConfig): ResolvedEnemyPhysicsConfig {
    const scale = config.spriteScale.clone();
    const physicsScale = (config.physicsScale ?? config.spriteScale).clone();
    const scaleVec = (value?: Vec2): Vec2 => {
        if(value === undefined){
            return Vec2.ZERO;
        }

        return new Vec2(value.x * physicsScale.x, value.y * physicsScale.y);
    };

    return {
        spriteScale: scale,
        bodyHitboxHalfSize: scaleVec(config.bodyHitboxHalfSize),
        bodyColliderOffset: scaleVec(config.bodyColliderOffset),
        attackHitboxOffset: scaleVec(config.attackHitboxOffset),
        attackHitboxHalfSize: scaleVec(config.attackHitboxHalfSize),
        movementMode: config.movementMode ?? "ground",
        snapToFloor: config.snapToFloor !== false
    };
}

export function placeGroundEnemyOnFloor(sprite: MBAnimatedSprite, walls: OrthogonalTilemap, tilemapScale: Vec2, hitboxHalfSize: Vec2): void {
    const tileSize = walls.getTileSize();
    const worldHeight = walls.getDimensions().y;
    const col = walls.getColRowAt(sprite.position).x;
    const startRow = Math.max(0, walls.getColRowAt(sprite.position).y - 6);

    // Search a few columns to either side so we can snap to nearby ledges when
    // the spawn x is slightly off the tile column. Offsets are ordered by
    // proximity so we prefer the column nearest the spawn.
    const searchRadius = 3;
    const offsets: number[] = [0];
    for(let i = 1; i <= searchRadius; i++){
        offsets.push(-i, i);
    }

    for(let row = startRow; row < worldHeight; row++){
        for(const off of offsets){
            const c = col + off;
            if(c < 0 || c >= walls.getDimensions().x) continue;
            if(!walls.isTileCollidable(c, row)) continue;

            const tileTopY = row * tileSize.y * tilemapScale.y;
            // Position the sprite so that both its collision box and its visual
            // graphic rest on top of the tile. Some sprites have visuals larger
            // than their hitboxes which can cause them to clip into the ground
            // if we only consider the hitbox. Compute the visual half-height
            // and use the larger of the two halves to place the sprite center.
            const visualHalfHeight = (sprite.size.y * sprite.scale.y) / 2;
            const usedHalf = Math.max(hitboxHalfSize.y, visualHalfHeight);

            // Snap the sprite horizontally to the center of the tile we found
            // so it sits cleanly on the ledge.
            const tileCenterX = c * tileSize.x * tilemapScale.x + (tileSize.x * tilemapScale.x) / 2;
            sprite.position.x = tileCenterX;
            sprite.position.y = tileTopY - usedHalf - 1;
            return;
        }
    }
}

export function addEnemyPhysics(sprite: MBAnimatedSprite, physics: ResolvedEnemyPhysicsConfig, isCollidable: boolean = true, isStatic: boolean = false): void {
    sprite.addPhysics(
        new AABB(sprite.position.clone(), physics.bodyHitboxHalfSize.clone()),
        physics.bodyColliderOffset.clone(),
        isCollidable,
        isStatic
    );
}
