import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Input from "../../Wolfie2D/Input/Input";
import MBLevel, { MBLayers } from "./MBLevel";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import Color from "../../Wolfie2D/Utils/Color";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import { MBProgress, UpgradeId } from "../Progress/MBProgress";
import HubLevel from "./HubLevel";
import Level1 from "./MBLevel1";
import Level2 from "./MBLevel2";
import Level3 from "./MBLevel3";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";

type BossGateTile = {
    col: number;
    row: number;
    tile: number;
};

export default class Level4 extends MBLevel {
    private bossGateLayer: OrthogonalTilemap | null = null;
    private bossGateActive: boolean = false;
    private bossGateCleared: boolean = false;
    private bossGateUnlocked: boolean = false;
    private bossGateResealed: boolean = false;
    private bossGateOriginalTiles: Array<BossGateTile> = [];
    private bossGateShakeTimer: number = 0;
    private bossGatePendingAction: "open" | "reseal" | null = null;
    private playerCanInsertBossGateFragments: boolean = false;
    private bossGatePromptPanel!: Rect;
    private bossGatePromptLabel!: Label;

    // ── Player spawn / assets ─────────────────────────────────────────────────
    public static readonly PLAYER_SPAWN = new Vec2(208, 384);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/knight.json";

    // ── Tilemap ───────────────────────────────────────────────────────────────
    public static readonly TILEMAP_KEY = "LEVEL4";
    public static readonly TILEMAP_PATH = "game_assets/tilemaps/Final.json";
    public static readonly TILEMAP_SCALE = new Vec2(1, 1);
    public static readonly DESTRUCTIBLE_LAYER_KEY = undefined;
    public static readonly WALLS_LAYER_KEY = "Main";
    public static readonly BOSS_GATE_LAYER_KEY = "Breakable";
    public static readonly BOSS_GATE_TRIGGER_X = 688;
    public static readonly BOSS_GATE_SHAKE_DURATION = 0.85;
    public static readonly BOSS_GATE_SHAKE_ZOOM = 0.06;
    public static readonly BOSS_GATE_PROMPT_PADDING = new Vec2(48, 36);
    public static readonly TILEMAP_WIDTH_TILES = 108;
    public static readonly TILEMAP_HEIGHT_TILES = 33;
    public static readonly TILE_SIZE = 16;
    public static readonly LEVEL_ZOOM = 2.6;
    public static readonly PORTAL_IMAGE_KEY = "LEVEL4_PORTAL";
    public static readonly PORTAL_IMAGE_PATH = "game_assets/spritesheets/portals.png";
    public static readonly PORTAL_FRAME_COLUMNS = 2;
    public static readonly PORTAL_FRAME_SIZE = new Vec2(32, 61);
    public static readonly GREEN_RIGHT_PORTAL_FRAME = 6;

    // ── Audio ─────────────────────────────────────────────────────────────────
    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/level2_music.wav";
    public static readonly JUMP_AUDIO_KEY = "PLAYER_JUMP";
    public static readonly JUMP_AUDIO_PATH = "game_assets/sounds/jump.wav";
    public static readonly TILE_DESTROYED_KEY = "TILE_DESTROYED";
    public static readonly TILE_DESTROYED_PATH = "game_assets/sounds/switch.wav";
    public static readonly DYING_AUDIO_KEY = "DYING_AUDIO";
    public static readonly DYING_AUDIO_PATH = "game_assets/sounds/dying.wav";

    public constructor(
        viewport: Viewport,
        sceneManager: SceneManager,
        renderingManager: RenderingManager,
        options: Record<string, any>
    ) {
        super(viewport, sceneManager, renderingManager, options);

        this.tilemapKey = Level4.TILEMAP_KEY;
        this.tilemapScale = Level4.TILEMAP_SCALE;
        this.destructibleLayerKey = Level4.DESTRUCTIBLE_LAYER_KEY;
        this.wallsLayerKey = Level4.WALLS_LAYER_KEY;
        this.damagingLayerKey = "Damaging";

        this.playerSpriteKey = Level4.PLAYER_SPRITE_KEY;
        this.playerSpawn = Level4.PLAYER_SPAWN;

        this.levelMusicKey = Level4.LEVEL_MUSIC_KEY;
        this.jumpAudioKey = Level4.JUMP_AUDIO_KEY;
        this.tileDestroyedAudioKey = Level4.TILE_DESTROYED_KEY;
        this.dyingAudioKey = Level4.DYING_AUDIO_KEY;

        this.levelEndPosition = new Vec2(1568, 400);
        this.levelEndHalfSize = new Vec2(32, 32).mult(this.tilemapScale);
    }

    public loadScene(): void {
        this.load.tilemap(this.tilemapKey, Level4.TILEMAP_PATH);
        this.load.spritesheet(this.playerSpriteKey, Level4.PLAYER_SPRITE_PATH);
        this.load.image(Level4.PORTAL_IMAGE_KEY, Level4.PORTAL_IMAGE_PATH);

        // Upgrade icons
        this.load.image(MBLevel.LANTERN_ICON_KEY, MBLevel.LANTERN_ICON_PATH);
        this.load.image(MBLevel.FUR_COAT_ICON_KEY, MBLevel.FUR_COAT_ICON_PATH);
        this.load.image(MBLevel.DOUBLE_JUMP_ICON_KEY, MBLevel.DOUBLE_JUMP_ICON_PATH);
        this.load.image(MBLevel.REVIVAL_ICON_KEY, MBLevel.REVIVAL_ICON_PATH);
        this.load.image(MBLevel.UPGRADED_BOOTS_ICON_KEY, MBLevel.UPGRADED_BOOTS_ICON_PATH);
        this.load.image(MBLevel.ICE_PICK_ICON_KEY, MBLevel.ICE_PICK_ICON_PATH);
        this.load.image(MBLevel.SHATTERDIVE_ICON_KEY, MBLevel.SHATTERDIVE_ICON_PATH);
        this.load.image(MBLevel.HEALTH_BUFF_ICON_KEY, MBLevel.HEALTH_BUFF_ICON_PATH);
        this.load.image(MBLevel.UPGRADED_SWORD_ICON_KEY, MBLevel.UPGRADED_SWORD_ICON_PATH);
        this.load.image(MBLevel.SHIELD_ICON_KEY, MBLevel.SHIELD_ICON_PATH);
        this.load.image(MBLevel.SHIELD_BROKEN_ICON_KEY, MBLevel.SHIELD_BROKEN_ICON_PATH);
        this.load.image(MBLevel.ASHEN_SEAL_FRAGMENT_ICON_KEY, MBLevel.ASHEN_SEAL_FRAGMENT_ICON_PATH);

        // Audio
        this.load.audio(this.levelMusicKey, Level4.LEVEL_MUSIC_PATH);
        this.load.audio(this.jumpAudioKey, Level4.JUMP_AUDIO_PATH);
        this.load.audio(this.tileDestroyedAudioKey, Level4.TILE_DESTROYED_PATH);
        this.load.audio(this.dyingAudioKey, Level4.DYING_AUDIO_PATH);
    }

    public unloadScene(): void {
        this.resourceManager.keepSpritesheet(this.playerSpriteKey);
        this.resourceManager.keepAudio(this.jumpAudioKey);
        this.resourceManager.keepAudio(this.dyingAudioKey);
        this.resourceManager.keepAudio(this.tileDestroyedAudioKey);
    }

    public startScene(): void {
        super.startScene();
        this.travelPortalDestination = HubLevel;
    }

    public updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        this.updateBossGate(deltaT);
    }

    protected initializeTilemap(): void {
        super.initializeTilemap();

        this.bossGateLayer = this.getTilemap(Level4.BOSS_GATE_LAYER_KEY) as OrthogonalTilemap | null;
        this.bossGateActive = true;
        this.bossGateCleared = false;
        this.bossGateUnlocked = false;
        this.bossGateResealed = false;
        this.bossGateShakeTimer = 0;
        this.bossGatePendingAction = null;
        this.playerCanInsertBossGateFragments = false;

        if(this.bossGateLayer !== null){
            this.cacheBossGateTiles();
            this.bossGateLayer.setGroup(MBPhysicsGroups.GROUND);
            this.bossGateLayer.visible = true;
            this.bossGateLayer.enablePhysics();
        }
    }

    protected initializeViewport(): void {
        super.initializeViewport();
        this.viewport.setZoomLevel(Level4.LEVEL_ZOOM);

        const worldWidth  = Level4.TILEMAP_WIDTH_TILES  * Level4.TILE_SIZE * this.tilemapScale.x;
        const worldHeight = Level4.TILEMAP_HEIGHT_TILES * Level4.TILE_SIZE * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
    }

    protected initializeUI(): void {
        super.initializeUI();

        const promptPosition = new Vec2(600 / this.getViewScale(), 720 / this.getViewScale());
        this.bossGatePromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: new Vec2(360, 40)
        });
        this.bossGatePromptPanel.color = new Color(20, 18, 24, 0.94);
        this.bossGatePromptPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.bossGatePromptPanel.visible = false;

        this.bossGatePromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] to insert Ashen Seal fragments"
        });
        this.bossGatePromptLabel.size.set(390, 24);
        this.bossGatePromptLabel.font = "PixelSimple";
        this.bossGatePromptLabel.fontSize = 18;
        this.bossGatePromptLabel.textColor = new Color(246, 238, 214, 1);
        this.bossGatePromptLabel.visible = false;
    }

    protected initializeLevelEnds(): void {
        const portal = this.add.sprite(Level4.PORTAL_IMAGE_KEY, MBLayers.PRIMARY);
        const frameCol = Level4.GREEN_RIGHT_PORTAL_FRAME % Level4.PORTAL_FRAME_COLUMNS;
        const frameRow = Math.floor(Level4.GREEN_RIGHT_PORTAL_FRAME / Level4.PORTAL_FRAME_COLUMNS);

        portal.size.copy(Level4.PORTAL_FRAME_SIZE);
        portal.scale.copy(this.tilemapScale);
        portal.setImageOffset(new Vec2(
            frameCol * Level4.PORTAL_FRAME_SIZE.x,
            frameRow * Level4.PORTAL_FRAME_SIZE.y
        ));
        portal.position.copy(this.levelEndPosition);

        this.levelEndArea = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PRIMARY, {
            position: this.levelEndPosition.clone(),
            size: this.levelEndHalfSize.clone()
        });
        this.levelEndArea.addPhysics(undefined, undefined, false, true);
        this.levelEndArea.visible = false;
    }

    protected updateBossGate(deltaT: number): void {
        this.updateBossGateShake(deltaT);

        if(this.bossGateLayer === null || this.bossGateCleared || this.player === undefined){
            this.hideBossGatePrompt();
            return;
        }

        this.updateBossGatePrompt();

        if(
            !this.bossGateUnlocked &&
            this.bossGatePendingAction === null &&
            this.playerCanInsertBossGateFragments &&
            Input.isKeyJustPressed("e") &&
            this.hasRequiredBossGateFragments()
        ){
            this.startBossGateShake("open");
            return;
        }

        if(
            this.bossGateUnlocked &&
            !this.bossGateResealed &&
            this.bossGatePendingAction === null &&
            this.player.position.x >= Level4.BOSS_GATE_TRIGGER_X
        ){
            this.bossGateResealed = true;
            this.startBossGateShake("reseal");
            return;
        }

        if(this.bossGateActive && this.bossGateResealed && this.boss !== undefined && this.boss.isDefeated()){
            this.clearBossGate();
        }
    }

    protected cacheBossGateTiles(): void {
        if(this.bossGateLayer === null){
            return;
        }

        this.bossGateOriginalTiles = [];
        const dims = this.bossGateLayer.getDimensions();
        for(let row = 0; row < dims.y; row++){
            for(let col = 0; col < dims.x; col++){
                const tile = this.bossGateLayer.getTileAtRowCol(new Vec2(col, row));
                if(tile !== 0){
                    this.bossGateOriginalTiles.push({col, row, tile});
                }
            }
        }
    }

    protected hasRequiredBossGateFragments(): boolean {
        return MBProgress.hasUpgrade(UpgradeId.ASHEN_SEAL_FRAGMENT) &&
            MBProgress.hasUpgrade(UpgradeId.ASHEN_SEAL_FRAGMENT_BLUE);
    }

    protected updateBossGatePrompt(): void {
        if(
            this.bossGatePromptPanel === undefined ||
            this.bossGatePromptLabel === undefined ||
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted ||
            this.deathTransitionStarted ||
            this.bossGateUnlocked ||
            this.bossGatePendingAction !== null
        ){
            this.playerCanInsertBossGateFragments = false;
            this.hideBossGatePrompt();
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        this.playerCanInsertBossGateFragments = this.isPlayerNearBossGate(playerAABB);
        this.bossGatePromptPanel.visible = this.playerCanInsertBossGateFragments;
        this.bossGatePromptLabel.visible = this.playerCanInsertBossGateFragments;
    }

    protected isPlayerNearBossGate(playerAABB: AABB): boolean {
        if(this.bossGateLayer === null){
            return false;
        }

        const tileSize = this.bossGateLayer.getTileSize();
        const tileWorldSize = new Vec2(
            tileSize.x * this.tilemapScale.x,
            tileSize.y * this.tilemapScale.y
        );

        for(const gateTile of this.bossGateOriginalTiles){
            if(this.bossGateLayer.getTileAtRowCol(new Vec2(gateTile.col, gateTile.row)) === 0){
                continue;
            }

            const gateAABB = new AABB(
                new Vec2(
                    gateTile.col * tileWorldSize.x + tileWorldSize.x / 2,
                    gateTile.row * tileWorldSize.y + tileWorldSize.y / 2
                ),
                new Vec2(
                    tileWorldSize.x / 2 + Level4.BOSS_GATE_PROMPT_PADDING.x,
                    tileWorldSize.y / 2 + Level4.BOSS_GATE_PROMPT_PADDING.y
                )
            );

            if(playerAABB.overlapArea(gateAABB) > 0){
                return true;
            }
        }

        return false;
    }

    protected hideBossGatePrompt(): void {
        if(this.bossGatePromptPanel !== undefined){
            this.bossGatePromptPanel.visible = false;
        }
        if(this.bossGatePromptLabel !== undefined){
            this.bossGatePromptLabel.visible = false;
        }
    }

    protected startBossGateShake(action: "open" | "reseal"): void {
        this.bossGatePendingAction = action;
        this.bossGateShakeTimer = Level4.BOSS_GATE_SHAKE_DURATION;
        this.hideBossGatePrompt();
        this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: this.tileDestroyedAudioKey, loop: false, holdReference: false});
    }

    protected updateBossGateShake(deltaT: number): void {
        if(this.bossGateShakeTimer <= 0){
            return;
        }

        this.bossGateShakeTimer -= deltaT;
        if(this.bossGateShakeTimer > 0){
            this.viewport.setZoomLevel(Level4.LEVEL_ZOOM + (Math.random() * Level4.BOSS_GATE_SHAKE_ZOOM - Level4.BOSS_GATE_SHAKE_ZOOM / 2));
            return;
        }

        this.viewport.setZoomLevel(Level4.LEVEL_ZOOM);
        const action = this.bossGatePendingAction;
        this.bossGatePendingAction = null;

        if(action === "open"){
            this.openBossGate();
        } else if(action === "reseal"){
            this.resealBossGate();
        }
    }

    protected openBossGate(): void {
        this.clearBossGateTiles();
        this.bossGateUnlocked = true;
        this.bossGateActive = false;
    }

    protected resealBossGate(): void {
        this.restoreBossGateTiles();
        this.bossGateActive = true;
    }

    protected clearBossGateTiles(): void {
        if(this.bossGateLayer === null){
            return;
        }

        for(const gateTile of this.bossGateOriginalTiles){
            this.bossGateLayer.setTileAtRowCol(new Vec2(gateTile.col, gateTile.row), 0);
        }

        this.bossGateLayer.visible = false;
        this.bossGateLayer.disablePhysics();
    }

    protected restoreBossGateTiles(): void {
        if(this.bossGateLayer === null){
            return;
        }

        for(const gateTile of this.bossGateOriginalTiles){
            this.bossGateLayer.setTileAtRowCol(new Vec2(gateTile.col, gateTile.row), gateTile.tile);
        }

        this.bossGateLayer.visible = true;
        this.bossGateLayer.enablePhysics();
    }

    protected clearBossGate(): void {
        if(this.bossGateLayer === null){
            return;
        }

        this.clearBossGateTiles();
        this.bossGateCleared = true;
        this.bossGateActive = false;
        this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: this.tileDestroyedAudioKey, loop: false, holdReference: false});
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
            case ProgressTargetSceneId.LEVEL_4: return Level4;
            default: return null;
        }
    }

    protected getPlayerDeathDestination(): new (...args: any) => Scene {
        return HubLevel;
    }
}
