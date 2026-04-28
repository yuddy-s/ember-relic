import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";
import MBLevel, { MBLayers } from "./MBLevel";
import Level1 from "./MBLevel1";
import Level2 from "./MBLevel2";
import Level3 from "./MBLevel3";
import MainMenu from "./MainMenu";

type PortalPlacement = {
    col: number;
    row: number;
    frame: number;
};

export default class HubLevel extends MBLevel {
    private portalSprites: Array<Sprite> = [];
    private campfireSprite: Sprite | null = null;

    public static readonly PLAYER_SPAWN = new Vec2(432, 1024);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/knight.json";

    public static readonly TILEMAP_KEY = "HUB_LEVEL";
    public static readonly TILEMAP_PATH = "game_assets/tilemaps/hub.json";
    public static readonly TILEMAP_SCALE = new Vec2(1, 1);
    public static readonly DESTRUCTIBLE_LAYER_KEY = undefined;
    public static readonly WALLS_LAYER_KEY = "Main";
    public static readonly DAMAGING_LAYER_KEY = "Damaging";
    public static readonly PORTAL_MARKER_LAYER_KEY = "NonCollidable";

    public static readonly PORTAL_IMAGE_KEY = "portal.png";
    public static readonly PORTAL_FRAME_COLUMNS = 2;
    public static readonly PORTAL_FRAME_COUNT = 8;
    public static readonly PORTAL_FRAME_SIZE = new Vec2(32, 61);

    public static readonly CAMPFIRE_IMAGE_KEY = "HUB_CAMPFIRE";
    public static readonly CAMPFIRE_IMAGE_PATH = "game_assets/spritesheets/campfire.png";
    public static readonly CAMPFIRE_FRAME_SIZE = new Vec2(36, 48);
    public static readonly CAMPFIRE_POSITION = new Vec2(808, 1060);

    private static readonly DEFAULT_PORTAL_PLACEMENTS: Array<PortalPlacement> = [
        { col: 15, row: 20, frame: 1 },
        { col: 169, row: 56, frame: 4 },
        { col: 98, row: 91, frame: 2 }
    ];

    public static readonly TILEMAP_WIDTH_TILES = 192;
    public static readonly TILEMAP_HEIGHT_TILES = 112;
    public static readonly TILE_SIZE = 16;
    public static readonly LEVEL_ZOOM = 2.6;

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

        this.tilemapKey = HubLevel.TILEMAP_KEY;
        this.tilemapScale = HubLevel.TILEMAP_SCALE;
        this.destructibleLayerKey = HubLevel.DESTRUCTIBLE_LAYER_KEY;
        this.damagingLayerKey = HubLevel.DAMAGING_LAYER_KEY;
        this.wallsLayerKey = HubLevel.WALLS_LAYER_KEY;
        this.backgroundImageKey = undefined;

        this.playerSpriteKey = HubLevel.PLAYER_SPRITE_KEY;
        this.playerSpawn = HubLevel.PLAYER_SPAWN;

        this.levelMusicKey = HubLevel.LEVEL_MUSIC_KEY;
        this.jumpAudioKey = HubLevel.JUMP_AUDIO_KEY;
        this.tileDestroyedAudioKey = HubLevel.TILE_DESTROYED_KEY;
        this.dyingAudioKey = HubLevel.DYING_AUDIO_KEY;

        this.levelEndPosition = new Vec2(1880, 170);
        this.levelEndHalfSize = new Vec2(32, 32).mult(this.tilemapScale);
    }

    public loadScene(): void {
        this.load.tilemap(this.tilemapKey, HubLevel.TILEMAP_PATH);
        this.load.spritesheet(this.playerSpriteKey, HubLevel.PLAYER_SPRITE_PATH);
        this.load.image(MBLevel.LANTERN_ICON_KEY, MBLevel.LANTERN_ICON_PATH);
        this.load.image(MBLevel.FUR_COAT_ICON_KEY, MBLevel.FUR_COAT_ICON_PATH);
        this.load.image(MBLevel.DOUBLE_JUMP_ICON_KEY, MBLevel.DOUBLE_JUMP_ICON_PATH);
        this.load.image(MBLevel.REVIVAL_ICON_KEY, MBLevel.REVIVAL_ICON_PATH);
        this.load.image(MBLevel.UPGRADED_BOOTS_ICON_KEY, MBLevel.UPGRADED_BOOTS_ICON_PATH);
        this.load.image(MBLevel.ICE_PICK_ICON_KEY, MBLevel.ICE_PICK_ICON_PATH);
        this.load.image(MBLevel.SHATTERDIVE_ICON_KEY, MBLevel.SHATTERDIVE_ICON_PATH);
        this.load.image(MBLevel.HEALTH_BUFF_ICON_KEY, MBLevel.HEALTH_BUFF_ICON_PATH);
        this.load.image(MBLevel.UPGRADED_SWORD_ICON_KEY, MBLevel.UPGRADED_SWORD_ICON_PATH);
        this.load.image(HubLevel.CAMPFIRE_IMAGE_KEY, HubLevel.CAMPFIRE_IMAGE_PATH);
        this.load.audio(this.levelMusicKey, HubLevel.LEVEL_MUSIC_PATH);
        this.load.audio(this.jumpAudioKey, HubLevel.JUMP_AUDIO_PATH);
        this.load.audio(this.tileDestroyedAudioKey, HubLevel.TILE_DESTROYED_PATH);
        this.load.audio(this.dyingAudioKey, HubLevel.DYING_AUDIO_PATH);
    }

    public unloadScene(): void {
        this.resourceManager.keepSpritesheet(this.playerSpriteKey);
        this.resourceManager.keepAudio(this.jumpAudioKey);
        this.resourceManager.keepAudio(this.dyingAudioKey);
        this.resourceManager.keepAudio(this.tileDestroyedAudioKey);
    }

    public startScene(): void {
        super.startScene();
        this.nextLevel = MainMenu;
    }

    public getDyingAudioKey(): string {
        return this.dyingAudioKey;
    }

    protected initializeTilemap(): void {
        super.initializeTilemap();
        this.initializePortalSprites();
        this.initializeCampfireSprite();
    }

    protected initializeViewport(): void {
        super.initializeViewport();
        this.viewport.setZoomLevel(HubLevel.LEVEL_ZOOM);

        const worldWidth = HubLevel.TILEMAP_WIDTH_TILES * HubLevel.TILE_SIZE * this.tilemapScale.x;
        const worldHeight = HubLevel.TILEMAP_HEIGHT_TILES * HubLevel.TILE_SIZE * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
    }

    protected initializePortalSprites(): void {
        const portalMarkers = this.getTilemap(HubLevel.PORTAL_MARKER_LAYER_KEY) as OrthogonalTilemap | null;
        const tileSize = portalMarkers?.getTileSize() ?? new Vec2(HubLevel.TILE_SIZE, HubLevel.TILE_SIZE);
        const placements = portalMarkers !== null ? this.getPortalPlacementsFromLayer(portalMarkers) : [];
        const portalsToSpawn = placements.length > 0 ? placements : HubLevel.DEFAULT_PORTAL_PLACEMENTS;

        this.portalSprites = [];

        for(const placement of portalsToSpawn){
            const portal = this.add.sprite(HubLevel.PORTAL_IMAGE_KEY, MBLayers.PRIMARY);
            const frameCol = placement.frame % HubLevel.PORTAL_FRAME_COLUMNS;
            const frameRow = Math.floor(placement.frame / HubLevel.PORTAL_FRAME_COLUMNS);

            portal.size.copy(HubLevel.PORTAL_FRAME_SIZE);
            portal.scale.copy(this.tilemapScale);
            portal.setImageOffset(new Vec2(
                frameCol * HubLevel.PORTAL_FRAME_SIZE.x,
                frameRow * HubLevel.PORTAL_FRAME_SIZE.y
            ));
            portal.position.set(
                placement.col * tileSize.x + (HubLevel.PORTAL_FRAME_SIZE.x * portal.scale.x) / 2,
                placement.row * tileSize.y + (HubLevel.PORTAL_FRAME_SIZE.y * portal.scale.y) / 2
            );

            this.portalSprites.push(portal);
        }
    }

    protected getPortalPlacementsFromLayer(portalMarkers: OrthogonalTilemap): Array<PortalPlacement> {
        const portalTileset = portalMarkers.getTilesets().find(tileset => tileset.getImageKey() === HubLevel.PORTAL_IMAGE_KEY);
        if(portalTileset === undefined){
            return [];
        }

        const placements: Array<PortalPlacement> = [];
        const firstPortalGid = portalTileset.getStartIndex();
        const dimensions = portalMarkers.getDimensions();

        for(let row = 0; row < dimensions.y; row++){
            for(let col = 0; col < dimensions.x; col++){
                const tile = portalMarkers.getTileAtRowCol(new Vec2(col, row));
                const frame = tile - firstPortalGid;

                if(frame < 0 || frame >= HubLevel.PORTAL_FRAME_COUNT){
                    continue;
                }

                placements.push({ col, row, frame });
                portalMarkers.setTileAtRowCol(new Vec2(col, row), 0);
            }
        }

        return placements;
    }

    protected initializeCampfireSprite(): void {
        const campfire = this.add.sprite(HubLevel.CAMPFIRE_IMAGE_KEY, MBLayers.PRIMARY);
        campfire.size.copy(HubLevel.CAMPFIRE_FRAME_SIZE);
        campfire.scale.copy(this.tilemapScale);
        campfire.setImageOffset(Vec2.ZERO);
        campfire.position.copy(HubLevel.CAMPFIRE_POSITION);

        this.campfireSprite = campfire;
    }

    protected resolveProgressTargetScene(targetSceneId: ProgressTargetSceneId): (new (...args: any) => Scene) | null {
        switch(targetSceneId){
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
