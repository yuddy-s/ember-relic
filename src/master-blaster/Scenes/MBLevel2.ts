import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import MBLevel from "./MBLevel";
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

    public static readonly PLAYER_SPAWN = new Vec2(1536, 752);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/knight.json";

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

    }
    /**
     * Load in resources for level 2.
     */
    public loadScene(): void {
        // Load in the tilemap
        this.load.tilemap(this.tilemapKey, Level2.TILEMAP_PATH);
        // Load in the player's sprite
        this.load.spritesheet(this.playerSpriteKey, Level2.PLAYER_SPRITE_PATH);
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

    public getDyingAudioKey() {
        return this.dyingAudioKey;
    }

    protected initializeViewport(): void {
        super.initializeViewport();
        this.viewport.setZoomLevel(3);

        const worldWidth = 224 * 16 * this.tilemapScale.x;
        const worldHeight = 80 * 16 * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
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
