import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import MainMenu from "./MainMenu";
import MBLevel, { MBLayers } from "./MBLevel";
import Level1 from "./MBLevel1";
import Level2 from "./MBLevel2";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import { MBEvents } from "../MBEvents";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import Level3Boss, { SerisAnimations } from "../Bosses/Level3Boss";
import SerisController from "../Bosses/SerisController";
import { MBProgress, UpgradeId } from "../Progress/MBProgress";
import PlayerController from "../Player/PlayerController";
import HubLevel from "./HubLevel";

export default class Level3 extends MBLevel {
    private snowBackground!: Sprite;

    // ── Boss state ────────────────────────────────────────────────────────────
    private level3Boss!: Level3Boss;
    private level3BossSprite!: MBAnimatedSprite;
    private level3BossProgressRecorded: boolean = false;
    private doubleJumpRewardShown: boolean = false;
    private doubleJumpGrantedFromBoss: boolean = false;

    // ── Player spawn / assets ─────────────────────────────────────────────────
    public static readonly PLAYER_SPAWN = new Vec2(112, 2700);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/knight.json";

    // ── Tilemap ───────────────────────────────────────────────────────────────
    public static readonly TILEMAP_KEY = "LEVEL3";
    public static readonly TILEMAP_PATH = "game_assets/tilemaps/snow.json";
    public static readonly TILEMAP_SCALE = new Vec2(1, 1);
    public static readonly DESTRUCTIBLE_LAYER_KEY = undefined;
    public static readonly WALLS_LAYER_KEY = "Main";
    public static readonly TILEMAP_WIDTH_TILES = 304;
    public static readonly TILEMAP_HEIGHT_TILES = 240;
    public static readonly TILE_SIZE = 16;
    public static readonly LEVEL_ZOOM = 2.6;

    // ── Background ────────────────────────────────────────────────────────────
    public static readonly BACKGROUND_IMAGE_KEY = "LEVEL3_SNOW_BACKGROUND";
    public static readonly BACKGROUND_IMAGE_PATH = "game_assets/tilemaps/snowBg.png";
    public static readonly BACKGROUND_PARALLAX = new Vec2(0.25, 0.15);
    public static readonly BACKGROUND_LAYER_DEPTH = -100;
    public static readonly BACKGROUND_VIEW_PADDING = 1.05;

    // ── Audio ─────────────────────────────────────────────────────────────────
    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/MB_level_music.wav";
    public static readonly JUMP_AUDIO_KEY = "PLAYER_JUMP";
    public static readonly JUMP_AUDIO_PATH = "game_assets/sounds/jump.wav";
    public static readonly TILE_DESTROYED_KEY = "TILE_DESTROYED";
    public static readonly TILE_DESTROYED_PATH = "game_assets/sounds/switch.wav";
    public static readonly DYING_AUDIO_KEY = "DYING_AUDIO";
    public static readonly DYING_AUDIO_PATH = "game_assets/sounds/dying.wav";

    // ── Seris boss constants ──────────────────────────────────────────────────
    public static readonly SERIS_SPRITE_KEY = "SERIS_SPRITE_KEY";
    public static readonly SERIS_SPRITE_PATH = "game_assets/spritesheets/enemies/bosses/seris.json";
    public static readonly ICICLE_KEY = "ICICLE_KEY";
    public static readonly ICICLE_PATH = "game_assets/art/icicle.png";

    // Adjust this spawn point to match your arena in Tiled
    public static readonly SERIS_SPAWN = new Vec2(2400, 800);
    public static readonly SERIS_SCALE = new Vec2(0.4, 0.4);
    // Half-size of Seris's collision box BEFORE scale is applied
    public static readonly SERIS_HITBOX_HALF_SIZE = new Vec2(80, 80);
    public static readonly SERIS_VISUAL_OFFSET_Y = 0;

    public static readonly SERIS_AGGRO_RANGE = 260;
    public static readonly SERIS_AGGRO_HEIGHT_THRESHOLD = 180;
    public static readonly SERIS_MOVE_SPEED = 80;

    public static readonly BOSS_NAME = "Seris, the Scaleless";
    public static readonly BOSS_MAX_HEALTH = 300;

    // ─────────────────────────────────────────────────────────────────────────

    public constructor(
        viewport: Viewport,
        sceneManager: SceneManager,
        renderingManager: RenderingManager,
        options: Record<string, any>
    ) {
        super(viewport, sceneManager, renderingManager, options);

        this.tilemapKey = Level3.TILEMAP_KEY;
        this.tilemapScale = Level3.TILEMAP_SCALE;
        this.destructibleLayerKey = Level3.DESTRUCTIBLE_LAYER_KEY;
        this.wallsLayerKey = Level3.WALLS_LAYER_KEY;
        this.backgroundImageKey = undefined;

        this.playerSpriteKey = Level3.PLAYER_SPRITE_KEY;
        this.playerSpawn = Level3.PLAYER_SPAWN;

        this.levelMusicKey = Level3.LEVEL_MUSIC_KEY;
        this.jumpAudioKey = Level3.JUMP_AUDIO_KEY;
        this.tileDestroyedAudioKey = Level3.TILE_DESTROYED_KEY;
        this.dyingAudioKey = Level3.DYING_AUDIO_KEY;

        this.levelEndPosition = new Vec2(1880, 170);
        this.levelEndHalfSize = new Vec2(32, 32).mult(this.tilemapScale);
    }

    // ── Resource loading ──────────────────────────────────────────────────────

    public loadScene(): void {
        this.load.tilemap(this.tilemapKey, Level3.TILEMAP_PATH);
        this.load.spritesheet(this.playerSpriteKey, Level3.PLAYER_SPRITE_PATH);

        // Boss sprites
        this.load.spritesheet(Level3.SERIS_SPRITE_KEY, Level3.SERIS_SPRITE_PATH);
        this.load.image(Level3.ICICLE_KEY, Level3.ICICLE_PATH);

        // Upgrade icons (same set as Level2)
        this.load.image(MBLevel.LANTERN_ICON_KEY, MBLevel.LANTERN_ICON_PATH);
        this.load.image(MBLevel.FUR_COAT_ICON_KEY, MBLevel.FUR_COAT_ICON_PATH);
        this.load.image(MBLevel.DOUBLE_JUMP_ICON_KEY, MBLevel.DOUBLE_JUMP_ICON_PATH);
        this.load.image(MBLevel.REVIVAL_ICON_KEY, MBLevel.REVIVAL_ICON_PATH);
        this.load.image(MBLevel.UPGRADED_BOOTS_ICON_KEY, MBLevel.UPGRADED_BOOTS_ICON_PATH);
        this.load.image(MBLevel.ICE_PICK_ICON_KEY, MBLevel.ICE_PICK_ICON_PATH);
        this.load.image(MBLevel.SHATTERDIVE_ICON_KEY, MBLevel.SHATTERDIVE_ICON_PATH);
        this.load.image(MBLevel.HEALTH_BUFF_ICON_KEY, MBLevel.HEALTH_BUFF_ICON_PATH);
        this.load.image(MBLevel.UPGRADED_SWORD_ICON_KEY, MBLevel.UPGRADED_SWORD_ICON_PATH);

        // Background image
        this.load.image(Level3.BACKGROUND_IMAGE_KEY, Level3.BACKGROUND_IMAGE_PATH);

        // Audio
        this.load.audio(this.levelMusicKey, Level3.LEVEL_MUSIC_PATH);
        this.load.audio(this.jumpAudioKey, Level3.JUMP_AUDIO_PATH);
        this.load.audio(this.tileDestroyedAudioKey, Level3.TILE_DESTROYED_PATH);
        this.load.audio(this.dyingAudioKey, Level3.DYING_AUDIO_PATH);
    }

    public unloadScene(): void {
        this.resourceManager.keepSpritesheet(this.playerSpriteKey);
        this.resourceManager.keepAudio(this.jumpAudioKey);
        this.resourceManager.keepAudio(this.dyingAudioKey);
        this.resourceManager.keepAudio(this.tileDestroyedAudioKey);
    }

    // ── Scene lifecycle ───────────────────────────────────────────────────────

    public startScene(): void {
        super.startScene();
        this.travelPortalDestination = MainMenu;
        this.doubleJumpRewardShown = false;
        this.doubleJumpGrantedFromBoss = MBProgress.hasUpgrade(UpgradeId.DOUBLE_JUMP);
        this.level3BossProgressRecorded = MBProgress.hasDefeatedBoss(this.level3Boss.id);
        this.updateSnowBackground();
    }

    public updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        this.updateSnowBackground();
        this.updateBossRewardState();
    }

    public getDyingAudioKey(): string {
        return this.dyingAudioKey;
    }

    // ── Boss initialization (called by MBLevel.startScene via initializeBoss) ─

    protected initializeBoss(): void {
        // 1. Create the lightweight boss state object (health, fight started, defeated)
        this.level3Boss = new Level3Boss(Level3.BOSS_NAME, Level3.BOSS_MAX_HEALTH);
        this.boss = this.level3Boss;

        // 2. Add the animated sprite to the scene
        this.level3BossSprite = this.add.animatedSprite(Level3.SERIS_SPRITE_KEY, MBLayers.PRIMARY);
        this.level3BossSprite.position.copy(Level3.SERIS_SPAWN);
        this.level3BossSprite.scale.copy(Level3.SERIS_SCALE);

        // 3. Scale the hitbox to match sprite scale (same pattern as Vorrath)
        const scaledBossHitbox = new Vec2(
            Level3.SERIS_HITBOX_HALF_SIZE.x * Level3.SERIS_SCALE.x,
            Level3.SERIS_HITBOX_HALF_SIZE.y * Level3.SERIS_SCALE.y
        );

        // 4. Snap her feet to the floor at spawn (she'll immediately go airborne)
        this.placeBossOnFloor(scaledBossHitbox);

        // 5. Add physics — same call signature as Vorrath
        this.level3BossSprite.addPhysics(
            new AABB(this.level3BossSprite.position.clone(), scaledBossHitbox),
            new Vec2(0, -Level3.SERIS_VISUAL_OFFSET_Y),
            true,
            false
        );
        this.level3BossSprite.position.y += Level3.SERIS_VISUAL_OFFSET_Y;
        this.level3BossSprite.setGroup(MBPhysicsGroups.BOSS);
        this.level3BossSprite.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.BOSS_PARTICLE_HIT, "");

        // 6. Start on IDLE before aggro triggers
        this.level3BossSprite.animation.play(SerisAnimations.IDLE, true);

        // 7. Attach the AI controller
        this.level3BossSprite.addAI(SerisController, {
            bossState: this.level3Boss,
            player: this.player,
            tilemap: this.wallsLayerKey,
            hitboxHalfSize: scaledBossHitbox,
            icicleImageKey: Level3.ICICLE_KEY,
            moveSpeed: Level3.SERIS_MOVE_SPEED,
            aggroRange: Level3.SERIS_AGGRO_RANGE,
            aggroHeightThreshold: Level3.SERIS_AGGRO_HEIGHT_THRESHOLD
        });
    }

    // ── Boss reward — grants Double Jump on defeat (mirrors Vorrath → Fur Coat) 

    protected updateBossRewardState(): void {
        if (this.level3Boss === undefined || !this.level3Boss.isDefeated()) {
            return;
        }

        if (!this.level3BossProgressRecorded) {
            MBProgress.defeatBoss(this.level3Boss.id);
            this.level3BossProgressRecorded = true;
        }

        if (this.doubleJumpGrantedFromBoss || this.doubleJumpRewardShown || MBProgress.hasUpgrade(UpgradeId.DOUBLE_JUMP)) {
            this.doubleJumpGrantedFromBoss = true;
            return;
        }

        // Wait for DYING animation to finish before showing reward popup
        const dyingStillPlaying =
            this.level3BossSprite !== undefined &&
            this.level3BossSprite.animation.isPlaying(SerisAnimations.DYING);

        if (dyingStillPlaying) {
            return;
        }

        this.doubleJumpRewardShown = true;
        this.showUpgradeRewardPopup(UpgradeId.DOUBLE_JUMP, () => {
            this.grantUpgrade(UpgradeId.DOUBLE_JUMP);
            this.doubleJumpGrantedFromBoss = true;
        });
    }

    // ── Required by MBLevel: return Seris as the damageable boss target ───────

    protected getBossDamageTarget(): MBAnimatedSprite | null {
        return this.level3BossSprite ?? null;
    }

    // ── Floor snap helper (same logic as Level2.placeBossOnFloor) ────────────

    protected placeBossOnFloor(hitboxHalfSize: Vec2): void {
        if (this.walls === undefined || this.level3BossSprite === undefined) {
            return;
        }

        const tileSize = this.walls.getTileSize();
        const worldHeight = this.walls.getDimensions().y;
        const col = this.walls.getColRowAt(this.level3BossSprite.position).x;
        const startRow = Math.max(0, this.walls.getColRowAt(this.level3BossSprite.position).y - 6);

        for (let row = startRow; row < worldHeight; row++) {
            if (!this.walls.isTileCollidable(col, row)) {
                continue;
            }

            const tileTopY = row * tileSize.y * this.tilemapScale.y;
            this.level3BossSprite.position.y = tileTopY - hitboxHalfSize.y - 1;
            return;
        }
    }

    // ── Cheat helper (mirrors Level2.teleportPlayerToBoss) ───────────────────

    protected teleportPlayerToBoss(): boolean {
        if (this.player === undefined || this.level3BossSprite === undefined) {
            return false;
        }

        this.player.position.copy(
            this.level3BossSprite.position.clone().add(new Vec2(0, -50))
        );

        const controller = this.player.ai as PlayerController;
        controller.velocity = Vec2.ZERO;
        return true;
    }

    // ── Background / viewport ─────────────────────────────────────────────────

    protected initializeBackground(): void {
        this.addParallaxLayer(MBLayers.BACKGROUND, Level3.BACKGROUND_PARALLAX, Level3.BACKGROUND_LAYER_DEPTH);
        this.snowBackground = this.add.sprite(Level3.BACKGROUND_IMAGE_KEY, MBLayers.BACKGROUND);
        this.updateSnowBackground();
    }

    protected initializeTilemap(): void {
        super.initializeTilemap();
    }

    protected initializeViewport(): void {
        super.initializeViewport();
        this.viewport.setZoomLevel(Level3.LEVEL_ZOOM);

        const worldWidth  = Level3.TILEMAP_WIDTH_TILES  * Level3.TILE_SIZE * this.tilemapScale.x;
        const worldHeight = Level3.TILEMAP_HEIGHT_TILES * Level3.TILE_SIZE * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
    }

    protected updateSnowBackground(): void {
        if (this.snowBackground === undefined) {
            return;
        }

        const view       = this.viewport.getView();
        const viewWidth  = view.hw * 2;
        const viewHeight = view.hh * 2;
        const coverScale = Math.max(
            viewWidth  / this.snowBackground.size.x,
            viewHeight / this.snowBackground.size.y
        ) * Level3.BACKGROUND_VIEW_PADDING;
        const origin = this.viewport.getOrigin();

        this.snowBackground.scale.set(coverScale, coverScale);
        this.snowBackground.position.set(
            origin.x * Level3.BACKGROUND_PARALLAX.x + view.hw,
            origin.y * Level3.BACKGROUND_PARALLAX.y + view.hh
        );
    }

    protected resolveProgressTargetScene(
        targetSceneId: ProgressTargetSceneId
    ): (new (...args: any) => Scene) | null {
        switch (targetSceneId) {
            case ProgressTargetSceneId.HUB:
                return HubLevel;
            case ProgressTargetSceneId.LEVEL_1: return Level1;
            case ProgressTargetSceneId.LEVEL_2: return Level2;
            case ProgressTargetSceneId.LEVEL_3: return Level3;
            default: return null;
        }
    }
}