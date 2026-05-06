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
import HubLevel from "./HubLevel";

export default class Level3 extends MBLevel {
    private snowBackground!: Sprite;

    public static readonly PLAYER_SPAWN = new Vec2(112, 2700);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/knight.json";

    public static readonly TILEMAP_KEY = "LEVEL3";
    public static readonly TILEMAP_PATH = "game_assets/tilemaps/snow.json";
    public static readonly TILEMAP_SCALE = new Vec2(1, 1);
    public static readonly DESTRUCTIBLE_LAYER_KEY = undefined;
    public static readonly WALLS_LAYER_KEY = "Main";

    public static readonly TILEMAP_WIDTH_TILES = 304;
    public static readonly TILEMAP_HEIGHT_TILES = 240;
    public static readonly TILE_SIZE = 16;
    public static readonly LEVEL_ZOOM = 2.6;

    public static readonly BACKGROUND_IMAGE_KEY = "LEVEL3_SNOW_BACKGROUND";
    public static readonly BACKGROUND_IMAGE_PATH = "game_assets/tilemaps/snowBg.png";
    public static readonly BACKGROUND_PARALLAX = new Vec2(0.25, 0.15);
    public static readonly BACKGROUND_LAYER_DEPTH = -100;
    public static readonly BACKGROUND_VIEW_PADDING = 1.05;

    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/MB_level_music.wav";

    public static readonly JUMP_AUDIO_KEY = "PLAYER_JUMP";
    public static readonly JUMP_AUDIO_PATH = "game_assets/sounds/jump.wav";

    public static readonly TILE_DESTROYED_KEY = "TILE_DESTROYED";
    public static readonly TILE_DESTROYED_PATH = "game_assets/sounds/switch.wav";

    public static readonly DYING_AUDIO_KEY = "DYING_AUDIO";
    public static readonly DYING_AUDIO_PATH = "game_assets/sounds/dying.wav";

    public constructor(viewport: Viewport, sceneManager: SceneManager, renderingManager: RenderingManager, options: Record<string, any>) {
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

    public loadScene(): void {
        this.load.tilemap(this.tilemapKey, Level3.TILEMAP_PATH);
        this.load.spritesheet(this.playerSpriteKey, Level3.PLAYER_SPRITE_PATH);
        this.load.image(MBLevel.LANTERN_ICON_KEY, MBLevel.LANTERN_ICON_PATH);
        this.load.image(MBLevel.FUR_COAT_ICON_KEY, MBLevel.FUR_COAT_ICON_PATH);
        this.load.image(MBLevel.DOUBLE_JUMP_ICON_KEY, MBLevel.DOUBLE_JUMP_ICON_PATH);
        this.load.image(MBLevel.REVIVAL_ICON_KEY, MBLevel.REVIVAL_ICON_PATH);
        this.load.image(MBLevel.UPGRADED_BOOTS_ICON_KEY, MBLevel.UPGRADED_BOOTS_ICON_PATH);
        this.load.image(MBLevel.ICE_PICK_ICON_KEY, MBLevel.ICE_PICK_ICON_PATH);
        this.load.image(MBLevel.SHATTERDIVE_ICON_KEY, MBLevel.SHATTERDIVE_ICON_PATH);
        this.load.image(MBLevel.HEALTH_BUFF_ICON_KEY, MBLevel.HEALTH_BUFF_ICON_PATH);
        this.load.image(MBLevel.UPGRADED_SWORD_ICON_KEY, MBLevel.UPGRADED_SWORD_ICON_PATH);
        this.load.image(Level3.BACKGROUND_IMAGE_KEY, Level3.BACKGROUND_IMAGE_PATH);
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

    public startScene(): void {
        super.startScene();
        this.travelPortalDestination = MainMenu;
        this.updateSnowBackground();
    }

    public updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        this.updateSnowBackground();
    }

    public getDyingAudioKey(): string {
        return this.dyingAudioKey;
    }

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

        const worldWidth = Level3.TILEMAP_WIDTH_TILES * Level3.TILE_SIZE * this.tilemapScale.x;
        const worldHeight = Level3.TILEMAP_HEIGHT_TILES * Level3.TILE_SIZE * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
    }

    protected updateSnowBackground(): void {
        if(this.snowBackground === undefined){
            return;
        }

        const view = this.viewport.getView();
        const viewWidth = view.hw * 2;
        const viewHeight = view.hh * 2;
        const coverScale = Math.max(
            viewWidth / this.snowBackground.size.x,
            viewHeight / this.snowBackground.size.y
        ) * Level3.BACKGROUND_VIEW_PADDING;
        const origin = this.viewport.getOrigin();

        this.snowBackground.scale.set(coverScale, coverScale);
        this.snowBackground.position.set(
            origin.x * Level3.BACKGROUND_PARALLAX.x + view.hw,
            origin.y * Level3.BACKGROUND_PARALLAX.y + view.hh
        );
    }

    protected resolveProgressTargetScene(targetSceneId: ProgressTargetSceneId): (new (...args: any) => Scene) | null {
        switch(targetSceneId){
            case ProgressTargetSceneId.HUB:
                return HubLevel;
            case ProgressTargetSceneId.LEVEL_1:
                return Level1;
            case ProgressTargetSceneId.LEVEL_2:
                return Level2;
            case ProgressTargetSceneId.LEVEL_3:
                return Level3;
            default:
                return null;
        }
    }
}
