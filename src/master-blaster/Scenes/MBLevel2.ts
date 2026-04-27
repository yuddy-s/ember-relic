import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import { MBProgress, UpgradeId } from "../Progress/MBProgress";
import Level2Boss, { VorrathAnimations } from "../Bosses/Level2Boss";
import VorrathController from "../Bosses/VorrathController";
import MBLevel, { MBLayers } from "./MBLevel";
import Level1 from "./MBLevel1";
import MainMenu from "./MainMenu";

import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";

/**
 * The second level for the Master Blaster. It should be the goose dungeon / cave.
 */
export default class Level2 extends MBLevel {
    private caveVignette!: Sprite;
    private blindVignette!: Sprite;
    private level2Boss!: Level2Boss;
    private level2BossSprite!: MBAnimatedSprite;
    private bossDebugTimer: number;
    // new Vec2(1536, 752)
    public static readonly PLAYER_SPAWN = new Vec2(2550, 1050);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/knight.json";
    public static readonly VORRATH_SPRITE_KEY = "VORRATH_SPRITE_KEY";
    public static readonly VORRATH_SPRITE_PATH = "game_assets/spritesheets/enemies/bosses/vorrath.json";
    public static readonly VORRATH_SPAWN = new Vec2(2448, 1050);
    public static readonly VORRATH_SCALE = new Vec2(0.4, 0.4);
    public static readonly VORRATH_HITBOX_HALF_SIZE = new Vec2(72, 104);
    public static readonly VORRATH_AGGRO_RANGE = 160;
    public static readonly VORRATH_ATTACK_RANGE = 140;
    public static readonly VORRATH_MOVE_SPEED = 75;
    public static readonly CAVE_VIGNETTE_KEY = "CAVE_VIGNETTE";
    public static readonly CAVE_VIGNETTE_PATH = "game_assets/art/cave-vignette.png";
    public static readonly BLIND_VIGNETTE_KEY = "BLIND_VIGNETTE";
    public static readonly BLIND_VIGNETTE_PATH = "game_assets/art/blind.png";
    public static readonly LEVEL2_ZOOM = 3.3;
    public static readonly VIGNETTE_FADE_SPEED = 6;
    public static readonly BOSS_NAME = "Vorrath, The Ashen";
    public static readonly BOSS_MAX_HEALTH = 250;

    public static readonly TILEMAP_KEY = "LEVEL2";
    public static readonly TILEMAP_PATH = "game_assets/tilemaps/cave.json";
    public static readonly TILEMAP_SCALE = new Vec2(1, 1);
    public static readonly DESTRUCTIBLE_LAYER_KEY = "Destructable";
    public static readonly WALLS_LAYER_KEY = "Main";

    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/MB_level2_music.wav";

    public static readonly JUMP_AUDIO_KEY = "PLAYER_JUMP";
    public static readonly JUMP_AUDIO_PATH = "game_assets/sounds/jump.wav";

    public static readonly TILE_DESTROYED_KEY = "TILE_DESTROYED";
    public static readonly TILE_DESTROYED_PATH = "game_assets/sounds/switch.wav";

    public static readonly DYING_AUDIO_KEY = "DYING_AUDIO";
    public static readonly DYING_AUDIO_PATH = "game_assets/sounds/dying.wav"

    public static readonly LEVEL_END = new AABB(new Vec2(224, 232), new Vec2(24, 16));

    public constructor(viewport: Viewport, sceneManager: SceneManager, renderingManager: RenderingManager, options: Record<string, any>) {
        super(viewport, sceneManager, renderingManager, options);

        // Set the keys for the different layers of the tilemap
        this.tilemapKey = Level2.TILEMAP_KEY;
        this.tilemapScale = Level2.TILEMAP_SCALE;
        this.destructibleLayerKey = Level2.DESTRUCTIBLE_LAYER_KEY;
        this.wallsLayerKey = Level2.WALLS_LAYER_KEY;

        // Set the key for the player's sprite
        this.playerSpriteKey = Level2.PLAYER_SPRITE_KEY;
        // Set the player's spawn
        this.playerSpawn = Level2.PLAYER_SPAWN;

        // Music and sound
        this.levelMusicKey = Level2.LEVEL_MUSIC_KEY
        this.jumpAudioKey = Level2.JUMP_AUDIO_KEY;
        this.tileDestroyedAudioKey = Level2.TILE_DESTROYED_KEY;
        this.dyingAudioKey = Level2.DYING_AUDIO_KEY;

        // Level end size and position
        this.levelEndPosition = new Vec2(32, 216).mult(this.tilemapScale);
        this.levelEndHalfSize = new Vec2(32, 32).mult(this.tilemapScale);
        this.bossDebugTimer = 0;

    }
    /**
     * Load in resources for level 2.
     */
    public loadScene(): void {
        // Load in the tilemap
        this.load.tilemap(this.tilemapKey, Level2.TILEMAP_PATH);
        // Load in the player's sprite
        this.load.spritesheet(this.playerSpriteKey, Level2.PLAYER_SPRITE_PATH);
        this.load.spritesheet(Level2.VORRATH_SPRITE_KEY, Level2.VORRATH_SPRITE_PATH);
        // Load the cave visibility vignette overlay
        this.load.image(Level2.CAVE_VIGNETTE_KEY, Level2.CAVE_VIGNETTE_PATH);
        this.load.image(Level2.BLIND_VIGNETTE_KEY, Level2.BLIND_VIGNETTE_PATH);
        // Temporary upgrade icon for inventory UI testing
        this.load.image(MBLevel.LANTERN_ICON_KEY, MBLevel.LANTERN_ICON_PATH);
        // Audio and music
        this.load.audio(this.levelMusicKey, Level2.LEVEL_MUSIC_PATH);
        this.load.audio(this.jumpAudioKey, Level2.JUMP_AUDIO_PATH);
        this.load.audio(this.tileDestroyedAudioKey, Level2.TILE_DESTROYED_PATH);
        this.load.audio(this.dyingAudioKey, Level2.DYING_AUDIO_PATH);
    }

    public unloadScene(): void {
        // TODO decide which resources to keep/cull 
    }

    public startScene(): void {
        super.startScene();
        this.nextLevel = MainMenu;
    }

    public updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        this.updateVisibilityVignettes(deltaT);
        this.debugBossCollision(deltaT);
    }

    public getDyingAudioKey() {
        return this.dyingAudioKey;
    }

    protected initializeBoss(): void {
        this.level2Boss = new Level2Boss(Level2.BOSS_NAME, Level2.BOSS_MAX_HEALTH);
        this.boss = this.level2Boss;
        this.level2BossSprite = this.add.animatedSprite(Level2.VORRATH_SPRITE_KEY, MBLayers.PRIMARY);
        this.level2BossSprite.position.copy(Level2.VORRATH_SPAWN);
        this.level2BossSprite.scale.copy(Level2.VORRATH_SCALE);
        const scaledBossHitbox = new Vec2(
            Level2.VORRATH_HITBOX_HALF_SIZE.x * Level2.VORRATH_SCALE.x,
            Level2.VORRATH_HITBOX_HALF_SIZE.y * Level2.VORRATH_SCALE.y
        );
        this.placeBossOnFloor(scaledBossHitbox);
        this.level2BossSprite.addPhysics(new AABB(this.level2BossSprite.position.clone(), scaledBossHitbox), undefined, true, false);
        this.level2BossSprite.setGroup(MBPhysicsGroups.BOSS);
        this.level2BossSprite.animation.play(VorrathAnimations.IDLE, true);
        this.level2BossSprite.addAI(VorrathController, {
            bossState: this.level2Boss,
            player: this.player,
            tilemap: this.wallsLayerKey,
            hitboxHalfSize: scaledBossHitbox,
            moveSpeed: Level2.VORRATH_MOVE_SPEED,
            aggroRange: Level2.VORRATH_AGGRO_RANGE,
            attackRange: Level2.VORRATH_ATTACK_RANGE
        });
    }

    protected initializeViewport(): void {
        super.initializeViewport();
        this.viewport.setZoomLevel(Level2.LEVEL2_ZOOM);

        const worldWidth = 224 * 16 * this.tilemapScale.x;
        const worldHeight = 80 * 16 * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
    }

    protected initializeUI(): void {
        const viewSize = this.viewport.getHalfSize().scaled(2);
        this.caveVignette = this.add.sprite(Level2.CAVE_VIGNETTE_KEY, "UI");
        this.caveVignette.position.set(viewSize.x / 2, viewSize.y / 2);
        this.caveVignette.scale.set(viewSize.x / this.caveVignette.size.x, viewSize.y / this.caveVignette.size.y);
        this.caveVignette.alpha = 1;

        this.blindVignette = this.add.sprite(Level2.BLIND_VIGNETTE_KEY, "UI");
        this.blindVignette.position.copy(this.caveVignette.position);
        this.blindVignette.scale.set(viewSize.x / this.blindVignette.size.x, viewSize.y / this.blindVignette.size.y);
        this.blindVignette.alpha = 0;

        super.initializeUI();
        this.updateVisibilityVignettes(1);
    }

    protected updateVisibilityVignettes(deltaT: number): void {
        if(this.caveVignette === undefined || this.blindVignette === undefined){
            return;
        }

        const hasLantern = MBProgress.hasUpgrade(UpgradeId.LANTERN);
        const bossFightStarted = this.boss !== undefined && this.boss.hasFightStarted() && !this.boss.isDefeated();
        const targetBlindAlpha = hasLantern ? 0 : 1;
        const targetCaveAlpha = !hasLantern ? 0 : (bossFightStarted ? 0 : 1);
        const fadeStep = Math.min(1, deltaT * Level2.VIGNETTE_FADE_SPEED);

        this.caveVignette.alpha += (targetCaveAlpha - this.caveVignette.alpha) * fadeStep;
        this.blindVignette.alpha += (targetBlindAlpha - this.blindVignette.alpha) * fadeStep;

        this.caveVignette.visible = this.caveVignette.alpha > 0.01;
        this.blindVignette.visible = this.blindVignette.alpha > 0.01;
    }

    public getLevel2Boss(): Level2Boss {
        return this.level2Boss;
    }

    public getLevel2BossSprite(): MBAnimatedSprite {
        return this.level2BossSprite;
    }

    protected placeBossOnFloor(hitboxHalfSize: Vec2): void {
        if(this.walls === undefined || this.level2BossSprite === undefined){
            return;
        }

        const tileSize = this.walls.getTileSize();
        const worldHeight = this.walls.getDimensions().y;
        const col = this.walls.getColRowAt(this.level2BossSprite.position).x;
        const startRow = Math.max(0, this.walls.getColRowAt(this.level2BossSprite.position).y - 6);

        for(let row = startRow; row < worldHeight; row++){
            if(!this.walls.isTileCollidable(col, row)){
                continue;
            }

            const tileTopY = row * tileSize.y * this.tilemapScale.y;
            this.level2BossSprite.position.y = tileTopY - hitboxHalfSize.y - 1;
            return;
        }
    }

    protected debugBossCollision(deltaT: number): void {
        if(this.level2BossSprite === undefined || this.walls === undefined){
            return;
        }

        this.bossDebugTimer += deltaT;
        if(this.bossDebugTimer < 0.5){
            return;
        }
        this.bossDebugTimer = 0;

        const halfSize = this.level2BossSprite.collisionShape.halfSize;
        const feetPosition = new Vec2(this.level2BossSprite.position.x, this.level2BossSprite.position.y + halfSize.y + 2);
        const feetTile = this.walls.getColRowAt(feetPosition);
        const feetTileValue = this.walls.getTileAtRowCol(feetTile);
        const feetTileCollidable = this.walls.isTileCollidable(feetTile.x, feetTile.y);

        console.log(
            "[Vorrath Debug]",
            "pos=", this.level2BossSprite.position.x.toFixed(1), this.level2BossSprite.position.y.toFixed(1),
            "vel=", this.level2BossSprite._velocity.x.toFixed(2), this.level2BossSprite._velocity.y.toFixed(2),
            "onGround=", this.level2BossSprite.onGround,
            "feetTile=", `(${feetTile.x},${feetTile.y})`,
            "tile=", feetTileValue,
            "collidable=", feetTileCollidable
        );
    }

    protected resolveProgressTargetScene(targetSceneId: ProgressTargetSceneId): (new (...args: any) => Scene) | null {
        switch(targetSceneId){
            case ProgressTargetSceneId.LEVEL_1:
                return Level1;
            case ProgressTargetSceneId.LEVEL_2:
                return Level2;
            default:
                return null;
        }
    }
}
