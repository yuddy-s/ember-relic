import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import MBLevel from "./MBLevel";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import MBLevel2 from "./MBLevel2";

/**
 * The first level for Master Blaster - should be the one with the grass and the clouds.
 */
export default class Level1 extends MBLevel {

    public static readonly PLAYER_SPAWN = new Vec2(32, 304);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/zekrom.json";

    public static readonly TILEMAP_KEY = "HEARTHHOLD_LEVEL";
    public static readonly TILEMAP_PATH = "game_assets/tilemaps/Hearthhold.json";
    public static readonly TILEMAP_SCALE = new Vec2(1, 1);
    public static readonly DESTRUCTIBLE_LAYER_KEY = undefined;
    public static readonly WALLS_LAYER_KEY = "Platforms";

    public static readonly BACKGROUND_IMAGE_KEY = "HEARTHHOLD_BACKGROUND";
    public static readonly BACKGROUND_IMAGE_PATH = "game_assets/tilemaps/hh-bg.png";
    public static readonly BACKGROUND_PARALLAX = new Vec2(1, 1);

    public static readonly TILEMAP_WIDTH_TILES = 120;
    public static readonly TILEMAP_HEIGHT_TILES = 30;
    public static readonly TILE_SIZE = 16;

    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/MB_level_music.wav";

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
        this.tilemapKey = Level1.TILEMAP_KEY;
        this.tilemapScale = Level1.TILEMAP_SCALE;
        this.destructibleLayerKey = Level1.DESTRUCTIBLE_LAYER_KEY;
        this.wallsLayerKey = Level1.WALLS_LAYER_KEY;
        this.backgroundImageKey = Level1.BACKGROUND_IMAGE_KEY;
        this.backgroundParallax = Level1.BACKGROUND_PARALLAX;
        this.backgroundLayerDepth = -25;

        // Set the key for the player's sprite
        this.playerSpriteKey = Level1.PLAYER_SPRITE_KEY;
        // Set the player's spawn
        this.playerSpawn = Level1.PLAYER_SPAWN;

        // Music and sound
        this.levelMusicKey = Level1.LEVEL_MUSIC_KEY
        this.jumpAudioKey = Level1.JUMP_AUDIO_KEY;
        this.tileDestroyedAudioKey = Level1.TILE_DESTROYED_KEY;
        this.dyingAudioKey = Level1.DYING_AUDIO_KEY;

        // Level end size and position
        this.levelEndPosition = new Vec2(1860, 420);
        this.levelEndHalfSize = new Vec2(32, 32).mult(this.tilemapScale);
    }

    /**
     * Load in our resources for level 1
     */
    public loadScene(): void {
        // Load in the tilemap
        this.load.tilemap(this.tilemapKey, Level1.TILEMAP_PATH);
        // Load in the player's sprite
        this.load.spritesheet(this.playerSpriteKey, Level1.PLAYER_SPRITE_PATH);
        // Load level background image
        this.load.image(Level1.BACKGROUND_IMAGE_KEY, Level1.BACKGROUND_IMAGE_PATH);
        // Audio and music
        this.load.audio(this.levelMusicKey, Level1.LEVEL_MUSIC_PATH);
        this.load.audio(this.jumpAudioKey, Level1.JUMP_AUDIO_PATH);
        this.load.audio(this.tileDestroyedAudioKey, Level1.TILE_DESTROYED_PATH);
        this.load.audio(this.dyingAudioKey, Level1.DYING_AUDIO_PATH);
    }

    /**
     * Unload resources for level 1
     */
    public unloadScene(): void {
        // TODO decide which resources to keep/cull 
        this.resourceManager.keepSpritesheet(this.playerSpriteKey);

        this.resourceManager.keepAudio(this.jumpAudioKey);
        this.resourceManager.keepAudio(this.dyingAudioKey);
        this.resourceManager.keepAudio(this.tileDestroyedAudioKey);

    }

    public startScene(): void {
        super.startScene();
        // Set the next level to be Level2
        this.nextLevel = MBLevel2;
    }


    public getDyingAudioKey() {
        return this.dyingAudioKey;
    }


    /**
     * I had to override this method to adjust the viewport for the first level. I screwed up 
     * when I was making the tilemap for the first level is what it boils down to.
     * 
     */
    protected initializeViewport(): void {
        super.initializeViewport();
        this.viewport.setZoomLevel(2.6);
        const worldWidth = Level1.TILEMAP_WIDTH_TILES * Level1.TILE_SIZE * this.tilemapScale.x;
        const worldHeight = Level1.TILEMAP_HEIGHT_TILES * Level1.TILE_SIZE * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
    }

    protected initializeTilemap(): void {
        super.initializeTilemap();

        const tiledBackground = this.getTilemap("Background") as OrthogonalTilemap;
        if(tiledBackground !== null){
            tiledBackground.visible = false;
        }
    }

}
