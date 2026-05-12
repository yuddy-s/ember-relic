import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Input from "../../Wolfie2D/Input/Input";
import MBLevel, { MBLayers } from "./MBLevel";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import Color from "../../Wolfie2D/Utils/Color";
import { MBEvents } from "../MBEvents";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import FirstEmberController from "../Bosses/FirstEmberController";
import Level4Boss, { FirstEmberAnimations } from "../Bosses/Level4Boss";
import { DEFAULT_FIRST_EMBER_TUNING } from "../Bosses/firstEmberConfig";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import PlayerController from "../Player/PlayerController";
import { MBProgress, UpgradeId } from "../Progress/MBProgress";
import HubLevel from "./HubLevel";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";

declare const require: (path: string) => { default: new (...args: any) => Scene };

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
    private hubReturnPortal: Sprite | null = null;
    private hubReturnPortalArea: Rect | null = null;
    private levelEndPortal: Sprite | null = null;
    private level4Boss!: Level4Boss;
    private level4BossSprite!: MBAnimatedSprite;
    private firstEmberTransitionShakeTimer: number = 0;
    private firstEmberPlayerLockActive: boolean = false;

    // ── Player spawn / assets ─────────────────────────────────────────────────
    public static readonly PLAYER_SPAWN = new Vec2(208, 384);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/knight.json";
    public static readonly FIRST_EMBER_SPRITE_KEY = "FIRST_EMBER_SPRITE_KEY";
    public static readonly FIRST_EMBER_SPRITE_PATH = "game_assets/spritesheets/enemies/bosses/firstEmber.json";
    public static readonly FIRST_EMBER_SPAWN = new Vec2(1000, 352);
    public static readonly FIRST_EMBER_SCALE = new Vec2(0.575, 0.575);
    public static readonly FIRST_EMBER_HITBOX_HALF_SIZE = new Vec2(56, 72);
    public static readonly FIRST_EMBER_VISUAL_OFFSET_Y = 0;
    public static readonly FIRST_EMBER_NAME = "The First Ember";
    public static readonly FIRST_EMBER_PHASE_ONE_HEALTH = DEFAULT_FIRST_EMBER_TUNING.transition.phaseOneMaxHealth;
    public static readonly FIRST_EMBER_LEFT_WALL_CLING = new Vec2(576, 96);
    public static readonly FIRST_EMBER_RIGHT_WALL_CLING = new Vec2(1248, 96);
    public static readonly FIRST_EMBER_WALL_DIVE_LANDINGS = [
        new Vec2(704, 170),
        new Vec2(704, 399),
        new Vec2(912, 272),
        new Vec2(912, 399),
        new Vec2(1120, 170),
        new Vec2(1120, 399)
    ];
    public static readonly FIRST_EMBER_WALL_SPIN_SLAM_LANDINGS = [
        new Vec2(704, 170),
        new Vec2(912, 272),
        new Vec2(1120, 170)
    ];
    public static readonly FIRST_EMBER_EXPLOSION_HAZARD_POINTS = [
        new Vec2(704, 170),
        new Vec2(704, 399),
        new Vec2(912, 272),
        new Vec2(912, 399),
        new Vec2(1120, 170),
        new Vec2(1120, 399)
    ];
    public static readonly FIRST_EMBER_TRANSITION_SHAKE_AMOUNT = 0.05;

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
    public static readonly GREEN_LEFT_PORTAL_FRAME = 7;
    public static readonly HUB_RETURN_PORTAL_POSITION = new Vec2(160, 400);

    // ── Audio ─────────────────────────────────────────────────────────────────
    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/main_Menu_music.wav";
    public static readonly JUMP_AUDIO_KEY = "PLAYER_JUMP";
    public static readonly JUMP_AUDIO_PATH = "game_assets/sounds/jump.wav";
    public static readonly DASH_AUDIO_KEY = "PLAYER_DASH";
    public static readonly DASH_AUDIO_PATH = "game_assets/sounds/dash.wav";
    public static readonly ATTACK_AUDIO_KEY = "PLAYER_ATTACK";
    public static readonly ATTACK_AUDIO_PATH = "game_assets/sounds/attack.wav";
    public static readonly DAMAGE_AUDIO_KEY = "PLAYER_DAMAGE";
    public static readonly DAMAGE_AUDIO_PATH = "game_assets/sounds/taking_damage.wav";
    public static readonly TILE_DESTROYED_KEY = "TILE_DESTROYED";
    public static readonly TILE_DESTROYED_PATH = "game_assets/sounds/switch.wav";
    public static readonly DYING_AUDIO_KEY = "DYING_AUDIO";
    public static readonly DYING_AUDIO_PATH = "game_assets/sounds/dying.wav";
    public static readonly FIRST_EMBER_PHASE1_DASH_AUDIO_KEY = "FIRST_EMBER_PHASE1_DASH";
    public static readonly FIRST_EMBER_PHASE1_DASH_AUDIO_PATH = "game_assets/sounds/phase1_dash.wav";
    public static readonly FIRST_EMBER_PHASE2_DASH_AUDIO_KEY = "FIRST_EMBER_PHASE2_DASH";
    public static readonly FIRST_EMBER_PHASE2_DASH_AUDIO_PATH = "game_assets/sounds/phase2_dash.wav";
    public static readonly FIRST_EMBER_SLAM_AUDIO_KEY = "FIRST_EMBER_SLAM";
    public static readonly FIRST_EMBER_SLAM_AUDIO_PATH = "game_assets/sounds/slam.wav";
    public static readonly FIRST_EMBER_TRANSITION_AUDIO_KEY = "FIRST_EMBER_TRANSITION";
    public static readonly FIRST_EMBER_TRANSITION_AUDIO_PATH = "game_assets/sounds/transition.wav";
    public static readonly FIRST_EMBER_EXPLOSION_IMAGE_KEY = "FIRST_EMBER_EXPLOSION";
    public static readonly FIRST_EMBER_EXPLOSION_IMAGE_PATH = "game_assets/art/lava-pillar.png";

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
        this.dashAudioKey = Level4.DASH_AUDIO_KEY;
        this.attackAudioKey = Level4.ATTACK_AUDIO_KEY;
        this.damageAudioKey = Level4.DAMAGE_AUDIO_KEY;
        this.tileDestroyedAudioKey = Level4.TILE_DESTROYED_KEY;
        this.dyingAudioKey = Level4.DYING_AUDIO_KEY;

        this.levelEndPosition = new Vec2(1568, 400);
        this.levelEndHalfSize = new Vec2(32, 32).mult(this.tilemapScale);
    }

    public loadScene(): void {
        this.load.tilemap(this.tilemapKey, Level4.TILEMAP_PATH);
        this.load.spritesheet(this.playerSpriteKey, Level4.PLAYER_SPRITE_PATH);
        this.load.spritesheet(Level4.FIRST_EMBER_SPRITE_KEY, Level4.FIRST_EMBER_SPRITE_PATH);
        this.load.image(Level4.PORTAL_IMAGE_KEY, Level4.PORTAL_IMAGE_PATH);
        this.load.image(Level4.FIRST_EMBER_EXPLOSION_IMAGE_KEY, Level4.FIRST_EMBER_EXPLOSION_IMAGE_PATH);

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
        this.load.audio(this.dashAudioKey, Level4.DASH_AUDIO_PATH);
        this.load.audio(this.attackAudioKey, Level4.ATTACK_AUDIO_PATH);
        this.load.audio(this.damageAudioKey, Level4.DAMAGE_AUDIO_PATH);
        this.load.audio(this.tileDestroyedAudioKey, Level4.TILE_DESTROYED_PATH);
        this.load.audio(this.dyingAudioKey, Level4.DYING_AUDIO_PATH);
        this.load.audio(Level4.FIRST_EMBER_PHASE1_DASH_AUDIO_KEY, Level4.FIRST_EMBER_PHASE1_DASH_AUDIO_PATH);
        this.load.audio(Level4.FIRST_EMBER_PHASE2_DASH_AUDIO_KEY, Level4.FIRST_EMBER_PHASE2_DASH_AUDIO_PATH);
        this.load.audio(Level4.FIRST_EMBER_SLAM_AUDIO_KEY, Level4.FIRST_EMBER_SLAM_AUDIO_PATH);
        this.load.audio(Level4.FIRST_EMBER_TRANSITION_AUDIO_KEY, Level4.FIRST_EMBER_TRANSITION_AUDIO_PATH);
    }

    public unloadScene(): void {
        this.resourceManager.keepSpritesheet(this.playerSpriteKey);
        this.resourceManager.keepAudio(this.jumpAudioKey);
        this.resourceManager.keepAudio(this.dashAudioKey);
        this.resourceManager.keepAudio(this.attackAudioKey);
        this.resourceManager.keepAudio(this.damageAudioKey);
        this.resourceManager.keepAudio(this.dyingAudioKey);
        this.resourceManager.keepAudio(this.tileDestroyedAudioKey);
        this.resourceManager.keepAudio(Level4.FIRST_EMBER_PHASE1_DASH_AUDIO_KEY);
        this.resourceManager.keepAudio(Level4.FIRST_EMBER_PHASE2_DASH_AUDIO_KEY);
        this.resourceManager.keepAudio(Level4.FIRST_EMBER_SLAM_AUDIO_KEY);
        this.resourceManager.keepAudio(Level4.FIRST_EMBER_TRANSITION_AUDIO_KEY);
        this.resourceManager.keepImage(Level4.FIRST_EMBER_EXPLOSION_IMAGE_KEY);
    }

    public startScene(): void {
        super.startScene();
        this.travelPortalDestination = HubLevel;
    }

    public updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        this.updateFirstEmberTransitionPresentation(deltaT);
        this.updateBossGate(deltaT);

        if(this.level4Boss !== undefined && this.level4Boss.isDefeated()){
            const dyingStillPlaying =
                this.level4BossSprite !== undefined &&
                this.level4BossSprite.animation.isPlaying(FirstEmberAnimations.DYING);

            if(!dyingStillPlaying && this.levelEndPortal !== null && !this.levelEndPortal.visible){
                this.levelEndPortal.visible = true;
                if(this.levelEndArea !== undefined){
                    this.levelEndArea.enablePhysics();
                }
            }
        }
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

    protected getAdditionalWallLatchTilemapKeys(): Array<string> {
        return [Level4.BOSS_GATE_LAYER_KEY];
    }

    protected initializeUI(): void {
        super.initializeUI();

        const promptPosition = this.getInteractionPromptPosition();
        this.bossGatePromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: MBLevel.INTERACTION_PROMPT_PANEL_SIZE.clone()
        });

        this.bossGatePromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] to insert Ashen Seal fragments"
        });
        this.formatInteractionPrompt(this.bossGatePromptPanel, this.bossGatePromptLabel);
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
        portal.visible = false;
        this.levelEndPortal = portal;

        this.hubReturnPortal = this.createGreenPortal(Level4.HUB_RETURN_PORTAL_POSITION);
        this.hubReturnPortalArea = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PRIMARY, {
            position: Level4.HUB_RETURN_PORTAL_POSITION.clone(),
            size: this.levelEndHalfSize.clone()
        });
        this.hubReturnPortalArea.addPhysics(undefined, undefined, false, true);
        this.hubReturnPortalArea.visible = false;

        this.levelEndArea = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PRIMARY, {
            position: this.levelEndPosition.clone(),
            size: this.levelEndHalfSize.clone()
        });
        this.levelEndArea.addPhysics(undefined, undefined, false, true);
        this.levelEndArea.visible = false;
        this.levelEndArea.disablePhysics();
    }

    protected createGreenPortal(position: Vec2): Sprite {
        const portal = this.add.sprite(Level4.PORTAL_IMAGE_KEY, MBLayers.PRIMARY);
        const frameCol = Level4.GREEN_LEFT_PORTAL_FRAME % Level4.PORTAL_FRAME_COLUMNS;
        const frameRow = Math.floor(Level4.GREEN_RIGHT_PORTAL_FRAME / Level4.PORTAL_FRAME_COLUMNS);

        portal.size.copy(Level4.PORTAL_FRAME_SIZE);
        portal.scale.copy(this.tilemapScale);
        portal.setImageOffset(new Vec2(
            frameCol * Level4.PORTAL_FRAME_SIZE.x,
            frameRow * Level4.PORTAL_FRAME_SIZE.y
        ));
        portal.position.copy(position);
        portal.visible = true;
        return portal;
    }

    protected updateLevelEndPrompt(): void {
        if(
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted ||
            this.deathTransitionStarted
        ){
            this.hideLevel4PortalPrompt();
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        this.playerCanInteractWithLevelEnd =
            this.isPlayerInPortalPromptRange(playerAABB, this.hubReturnPortalArea) ||
            this.isPlayerInPortalPromptRange(playerAABB, this.levelEndArea);

        this.levelEndPromptPanel.visible = this.playerCanInteractWithLevelEnd;
        this.levelEndPromptLabel.visible = this.playerCanInteractWithLevelEnd;
        this.levelEndPromptLabel.text = "[E] Enter Portal";

        if(this.playerCanInteractWithLevelEnd){
            this.travelPortalDestination = HubLevel;
        }
    }

    protected isPlayerInPortalPromptRange(playerAABB: AABB, portalArea: Rect | null): boolean {
        if(portalArea === null || !portalArea.hasPhysics || !portalArea.active){
            return false;
        }

        const portalAABB = portalArea.collisionShape.getBoundingRect();
        const promptTuning = MBLevel.LEVEL_END_PROMPT_TUNING;
        const promptRangeAABB = new AABB(
            portalAABB.center.clone(),
            new Vec2(
                portalAABB.halfSize.x + promptTuning.rangePaddingX,
                portalAABB.halfSize.y + promptTuning.rangePaddingY
            )
        );
        return playerAABB.overlapArea(promptRangeAABB) > 0;
    }

    protected hideLevel4PortalPrompt(): void {
        this.playerCanInteractWithLevelEnd = false;
        if(this.levelEndPromptPanel !== undefined){
            this.levelEndPromptPanel.visible = false;
        }
        if(this.levelEndPromptLabel !== undefined){
            this.levelEndPromptLabel.visible = false;
        }
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

    protected initializeBoss(): void {
        this.level4Boss = new Level4Boss(Level4.FIRST_EMBER_NAME, Level4.FIRST_EMBER_PHASE_ONE_HEALTH);
        this.boss = this.level4Boss;
        this.level4BossSprite = this.add.animatedSprite(Level4.FIRST_EMBER_SPRITE_KEY, MBLayers.PRIMARY);
        this.level4BossSprite.position.copy(Level4.FIRST_EMBER_SPAWN);
        this.level4BossSprite.scale.copy(Level4.FIRST_EMBER_SCALE);

        const scaledBossHitbox = new Vec2(
            Level4.FIRST_EMBER_HITBOX_HALF_SIZE.x * Level4.FIRST_EMBER_SCALE.x,
            Level4.FIRST_EMBER_HITBOX_HALF_SIZE.y * Level4.FIRST_EMBER_SCALE.y
        );

        this.placeBossOnFloor(scaledBossHitbox);
        this.level4BossSprite.addPhysics(
            new AABB(this.level4BossSprite.position.clone(), scaledBossHitbox),
            new Vec2(0, -Level4.FIRST_EMBER_VISUAL_OFFSET_Y),
            false,
            false
        );
        this.level4BossSprite.position.y += Level4.FIRST_EMBER_VISUAL_OFFSET_Y;
        this.level4BossSprite.setGroup(MBPhysicsGroups.BOSS);
        this.level4BossSprite.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.BOSS_PARTICLE_HIT, "");
        this.level4BossSprite.animation.play(FirstEmberAnimations.PHASE1_IDLE, true);
        this.level4BossSprite.addAI(FirstEmberController, {
            bossState: this.level4Boss,
            player: this.player,
            tilemap: this.wallsLayerKey,
            tuning: DEFAULT_FIRST_EMBER_TUNING,
            soundKeys: {
                phase1Dash: Level4.FIRST_EMBER_PHASE1_DASH_AUDIO_KEY,
                phase2Dash: Level4.FIRST_EMBER_PHASE2_DASH_AUDIO_KEY,
                slam: Level4.FIRST_EMBER_SLAM_AUDIO_KEY,
                transition: Level4.FIRST_EMBER_TRANSITION_AUDIO_KEY
            },
            phaseTwoScriptedPoints: {
                wallClingLeft: Level4.FIRST_EMBER_LEFT_WALL_CLING,
                wallClingRight: Level4.FIRST_EMBER_RIGHT_WALL_CLING,
                wallDiveLandings: Level4.FIRST_EMBER_WALL_DIVE_LANDINGS,
                wallSpinSlamLandings: Level4.FIRST_EMBER_WALL_SPIN_SLAM_LANDINGS
            },
            explosionHazardImageKey: Level4.FIRST_EMBER_EXPLOSION_IMAGE_KEY,
            explosionHazardPoints: Level4.FIRST_EMBER_EXPLOSION_HAZARD_POINTS
        });
    }

    public onFirstEmberPhaseTransitionStart(duration: number): void {
        this.firstEmberTransitionShakeTimer = Math.max(this.firstEmberTransitionShakeTimer, duration);
        this.firstEmberPlayerLockActive = true;
        Input.disableInput();

        if(this.player !== undefined){
            this.player.freeze();
            if(this.player.hasPhysics){
                this.player.disablePhysics();
            }
            this.player.setAIActive(false, {});
        }

        const playerController = this.player !== undefined
            ? this.player.ai as PlayerController
            : undefined;
        if(playerController !== undefined){
            playerController.velocity = Vec2.ZERO;
        }
    }

    public onFirstEmberPhaseTwoEntranceComplete(): void {
        this.firstEmberPlayerLockActive = false;
        this.firstEmberTransitionShakeTimer = 0;
        this.viewport.setZoomLevel(Level4.LEVEL_ZOOM);

        if(this.player !== undefined){
            this.player.unfreeze();
            if(this.player.hasPhysics){
                this.player.enablePhysics();
            }
            this.player.setAIActive(true, {});
        }

        const playerController = this.player !== undefined
            ? this.player.ai as PlayerController
            : undefined;
        if(playerController !== undefined){
            playerController.velocity = Vec2.ZERO;
        }

        Input.enableInput();
    }

    protected resolveProgressTargetScene(
        targetSceneId: ProgressTargetSceneId
    ): (new (...args: any) => Scene) | null {
        switch (targetSceneId) {
            case ProgressTargetSceneId.HUB:
                return HubLevel;
            case ProgressTargetSceneId.LEVEL_1: return require("./MBLevel1").default;
            case ProgressTargetSceneId.LEVEL_2: return require("./MBLevel2").default;
            case ProgressTargetSceneId.LEVEL_3: return require("./MBLevel3").default;
            case ProgressTargetSceneId.LEVEL_4: return Level4;
            default: return null;
        }
    }

    protected getPlayerDeathDestination(): new (...args: any) => Scene {
        return HubLevel;
    }

    protected getBossDamageTarget(): MBAnimatedSprite | null {
        return this.level4BossSprite ?? null;
    }

    protected placeBossOnFloor(hitboxHalfSize: Vec2): void {
        if(this.walls === undefined || this.level4BossSprite === undefined){
            return;
        }

        const tileSize = this.walls.getTileSize();
        const worldHeight = this.walls.getDimensions().y;
        const col = this.walls.getColRowAt(this.level4BossSprite.position).x;
        const startRow = Math.max(0, this.walls.getColRowAt(this.level4BossSprite.position).y - 6);

        for(let row = startRow; row < worldHeight; row++){
            if(!this.walls.isTileCollidable(col, row)){
                continue;
            }

            const tileTopY = row * tileSize.y * this.tilemapScale.y;
            this.level4BossSprite.position.y = tileTopY - hitboxHalfSize.y - 1;
            return;
        }
    }

    private updateFirstEmberTransitionPresentation(deltaT: number): void {
        if(this.firstEmberTransitionShakeTimer > 0){
            this.firstEmberTransitionShakeTimer = Math.max(0, this.firstEmberTransitionShakeTimer - deltaT);
            this.viewport.setZoomLevel(
                Level4.LEVEL_ZOOM + (Math.random() * 2 - 1) * Level4.FIRST_EMBER_TRANSITION_SHAKE_AMOUNT
            );
        } else {
            this.viewport.setZoomLevel(Level4.LEVEL_ZOOM);
        }

        if(!this.firstEmberPlayerLockActive){
            return;
        }

        const playerController = this.player !== undefined
            ? this.player.ai as PlayerController
            : undefined;
        if(playerController !== undefined){
            playerController.velocity = Vec2.ZERO;
        }
    }
}
