import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Input from "../../Wolfie2D/Input/Input";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import Color from "../../Wolfie2D/Utils/Color";
import MainMenu from "./MainMenu";
import MBLevel, { MBLayers } from "./MBLevel";
import Level1 from "./MBLevel1";
import Level2 from "./MBLevel2";
import Level4 from "./MBLevel4";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import { MBEvents } from "../MBEvents";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import Level3Boss, { SerisAnimations } from "../Bosses/Level3Boss";
import SerisController from "../Bosses/SerisController";
import { MBProgress, UpgradeId } from "../Progress/MBProgress";
import PlayerController from "../Player/PlayerController";
import HubLevel from "./HubLevel";
import { addEnemyPhysics, createScaledEnemyPhysicsConfig, placeGroundEnemyOnFloor } from "../Enemies/EnemyPhysicsUtils";
import SnowmanController from "../Enemies/Minions/snowman/SnowmanController";
import {
    DEFAULT_SNOWMAN_PHYSICS,
    SNOWMAN_SPRITE_KEY,
    SNOWMAN_SPRITE_PATH
} from "../Enemies/Minions/snowman/SnowmanConfig";
import WolfController from "../Enemies/Minions/wolf/WolfController";
import {
    DEFAULT_WOLF_PHYSICS,
    WOLF_SPRITE_KEY,
    WOLF_SPRITE_PATH
} from "../Enemies/Minions/wolf/WolfConfig";
import GuardController from "../Enemies/Minions/guard/GuardController";
import {
    DEFAULT_GUARD_PHYSICS,
    GUARD_SPRITE_KEY,
    GUARD_SPRITE_PATH
} from "../Enemies/Minions/guard/GuardConfig";

export default class Level3 extends MBLevel {
    private snowBackground!: Sprite;

    // ── Boss state ────────────────────────────────────────────────────────────
    private level3Boss!: Level3Boss;
    private level3BossSprite!: MBAnimatedSprite;
    private level3BossProgressRecorded: boolean = false;
    private doubleJumpRewardShown: boolean = false;
    private doubleJumpGrantedFromBoss: boolean = false;
    private coldDamageTimer: number = 0;
    private icePickPickupSprite: Sprite | null = null;
    private icePickPickupPromptPanel!: Rect;
    private icePickPickupPromptLabel!: Label;
    private playerCanPickUpIcePick: boolean = false;
    private damageUpPickupSprite: Sprite | null = null;
    private damageUpPickupPromptPanel!: Rect;
    private damageUpPickupPromptLabel!: Label;
    private playerCanPickUpDamageUp: boolean = false;
    private speedUpPickupSprite: Sprite | null = null;
    private speedUpPickupPromptPanel!: Rect;
    private speedUpPickupPromptLabel!: Label;
    private playerCanPickUpSpeedUp: boolean = false;
    private doubleJumpPickupSprite: Sprite | null = null;
    private doubleJumpPickupPromptPanel!: Rect;
    private doubleJumpPickupPromptLabel!: Label;
    private playerCanPickUpDoubleJump: boolean = false;
    private arenaDropShakeTimer: number = 0;
    private levelEndPortal: Sprite | null = null;

    // ── Player spawn / assets ─────────────────────────────────────────────────
    //112, 2700
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
    public static readonly PORTAL_IMAGE_KEY = "LEVEL3_PORTAL";
    public static readonly PORTAL_IMAGE_PATH = "game_assets/spritesheets/portals.png";
    public static readonly PORTAL_FRAME_COLUMNS = 2;
    public static readonly PORTAL_FRAME_SIZE = new Vec2(32, 61);
    public static readonly GREEN_RIGHT_PORTAL_FRAME = 6;

    // ── Background ────────────────────────────────────────────────────────────
    public static readonly BACKGROUND_IMAGE_KEY = "LEVEL3_SNOW_BACKGROUND";
    public static readonly BACKGROUND_IMAGE_PATH = "game_assets/tilemaps/snowBg.png";
    public static readonly BACKGROUND_PARALLAX = new Vec2(0.25, 0.15);
    public static readonly BACKGROUND_LAYER_DEPTH = -100;
    public static readonly BACKGROUND_VIEW_PADDING = 1.05;

    public static readonly COLD_DAMAGE_INTERVAL = 1;
    public static readonly COLD_DAMAGE_AMOUNT = 10;
    public static readonly ICE_PICK_PICKUP_POSITION = new Vec2(224, 3104);
    public static readonly ICE_PICK_PICKUP_SCALE = new Vec2(0.24, 0.24);
    public static readonly ICE_PICK_PICKUP_HALF_SIZE = new Vec2(24, 24);
    public static readonly DAMAGE_UP_PICKUP_POSITION = new Vec2(3232, 1632);
    public static readonly DAMAGE_UP_PICKUP_SCALE = new Vec2(0.24, 0.24);
    public static readonly DAMAGE_UP_PICKUP_HALF_SIZE = new Vec2(24, 24);
    public static readonly SPEED_UP_PICKUP_POSITION = new Vec2(1568, 1488);
    public static readonly SPEED_UP_PICKUP_SCALE = new Vec2(0.24, 0.24);
    public static readonly SPEED_UP_PICKUP_HALF_SIZE = new Vec2(24, 24);
    public static readonly DOUBLE_JUMP_PICKUP_POSITION = new Vec2(3984, 288);
    public static readonly DOUBLE_JUMP_PICKUP_SCALE = new Vec2(0.24, 0.24);
    public static readonly DOUBLE_JUMP_PICKUP_HALF_SIZE = new Vec2(24, 24);

    // ── Audio ─────────────────────────────────────────────────────────────────
    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/level3_music.wav";
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

    // ── Seris boss constants ──────────────────────────────────────────────────
    public static readonly SERIS_SPRITE_KEY = "SERIS_SPRITE_KEY";
    public static readonly SERIS_SPRITE_PATH = "game_assets/spritesheets/enemies/bosses/seris.json";
    public static readonly ICICLE_KEY = "ICICLE_KEY";
    public static readonly ICICLE_PATH = "game_assets/art/icicle.png";
    public static readonly SNOWBALL_KEY = "SNOWBALL_KEY";
    public static readonly SNOWBALL_PATH = "game_assets/art/snowball.png";

    public static readonly SNOWMAN_SPAWNS = [
        new Vec2(1168, 2670),
        new Vec2(1344, 2480),
        new Vec2(1456, 1976),
        new Vec2(2528, 1520)
    ];

    // Predefined spawn points used when Seris uses Glacial Roar to summon snowmen.
    // Fill this array with arena-local world coordinates to control where
    // snowmen appear during the roar. Defaults to the same set as the
    // static `SNOWMAN_SPAWNS` above but can be customized for the boss fight.
    public static readonly SERIS_GLACIAL_ROAR_SNOWMAN_SPAWNS = [
        new Vec2(4160, 740),
        new Vec2(3800, 740)
    ];

    public static readonly WOLF_SPAWNS = [
        new Vec2(2208, 1940),
        new Vec2(3520, 1840),
        new Vec2(2368, 1520)
    ];

    public static readonly GUARD_SPAWNS = [
        new Vec2(256, 3080),
        new Vec2(2832, 1530),
        new Vec2(3120, 592)
    ];

    // Adjust this spawn point to match your arena in Tiled
    public static readonly SERIS_SPAWN = new Vec2(4000, 770);
    public static readonly SERIS_SCALE = new Vec2(0.52, 0.52);
    // Half-size of Seris's collision box BEFORE scale is applied
    public static readonly SERIS_HITBOX_HALF_SIZE = new Vec2(104, 104);
    public static readonly SERIS_VISUAL_OFFSET_Y = 0;

    public static readonly SERIS_AGGRO_RANGE = 260;
    public static readonly SERIS_AGGRO_HEIGHT_THRESHOLD = 180;
    public static readonly SERIS_MOVE_SPEED = 80;

    public static readonly BOSS_NAME = "Seris, the Scaleless";
    public static readonly BOSS_MAX_HEALTH = 50;

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
        this.dashAudioKey = Level3.DASH_AUDIO_KEY;
        this.attackAudioKey = Level3.ATTACK_AUDIO_KEY;
        this.damageAudioKey = Level3.DAMAGE_AUDIO_KEY;
        this.tileDestroyedAudioKey = Level3.TILE_DESTROYED_KEY;
        this.dyingAudioKey = Level3.DYING_AUDIO_KEY;

        this.levelEndPosition = new Vec2(4240, 848);
        this.levelEndHalfSize = new Vec2(32, 32).mult(this.tilemapScale);
    }

    // ── Resource loading ──────────────────────────────────────────────────────

    public loadScene(): void {
        this.load.tilemap(this.tilemapKey, Level3.TILEMAP_PATH);
        this.load.spritesheet(this.playerSpriteKey, Level3.PLAYER_SPRITE_PATH);

        // Boss sprites
        this.load.spritesheet(Level3.SERIS_SPRITE_KEY, Level3.SERIS_SPRITE_PATH);
        this.load.image(Level3.ICICLE_KEY, Level3.ICICLE_PATH);
        this.load.image(Level3.SNOWBALL_KEY, Level3.SNOWBALL_PATH);
        this.load.spritesheet(SNOWMAN_SPRITE_KEY, SNOWMAN_SPRITE_PATH);
        this.load.spritesheet(WOLF_SPRITE_KEY, WOLF_SPRITE_PATH);
        this.load.spritesheet(GUARD_SPRITE_KEY, GUARD_SPRITE_PATH);

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
        this.load.image(MBLevel.SHIELD_ICON_KEY, MBLevel.SHIELD_ICON_PATH);
        this.load.image(MBLevel.SHIELD_BROKEN_ICON_KEY, MBLevel.SHIELD_BROKEN_ICON_PATH);
        this.load.image(Level3.PORTAL_IMAGE_KEY, Level3.PORTAL_IMAGE_PATH);
        
        // Background image
        this.load.image(Level3.BACKGROUND_IMAGE_KEY, Level3.BACKGROUND_IMAGE_PATH);

        // Audio
        this.load.audio(this.levelMusicKey, Level3.LEVEL_MUSIC_PATH);
        this.load.audio(this.jumpAudioKey, Level3.JUMP_AUDIO_PATH);
        this.load.audio(this.dashAudioKey, Level3.DASH_AUDIO_PATH);
        this.load.audio(this.attackAudioKey, Level3.ATTACK_AUDIO_PATH);
        this.load.audio(this.damageAudioKey, Level3.DAMAGE_AUDIO_PATH);
        this.load.audio(this.tileDestroyedAudioKey, Level3.TILE_DESTROYED_PATH);
        this.load.audio(this.dyingAudioKey, Level3.DYING_AUDIO_PATH);
    }

    public unloadScene(): void {
        this.resourceManager.keepSpritesheet(this.playerSpriteKey);
        this.resourceManager.keepAudio(this.jumpAudioKey);
        this.resourceManager.keepAudio(this.dashAudioKey);
        this.resourceManager.keepAudio(this.attackAudioKey);
        this.resourceManager.keepAudio(this.damageAudioKey);
        this.resourceManager.keepAudio(this.dyingAudioKey);
        this.resourceManager.keepAudio(this.tileDestroyedAudioKey);
    }

    // ── Scene lifecycle ───────────────────────────────────────────────────────

    public startScene(): void {
        super.startScene();
        this.initializeSnowmen();
        this.initializeWolves();
        this.initializeGuards();
        this.travelPortalDestination = HubLevel;
        this.doubleJumpRewardShown = false;
        this.doubleJumpGrantedFromBoss = MBProgress.hasUpgrade(UpgradeId.DOUBLE_JUMP);
        this.level3BossProgressRecorded = MBProgress.hasDefeatedBoss(this.level3Boss.id);
        this.coldDamageTimer = 0;
        this.arenaDropShakeTimer = 0;
        this.initializeIcePickPickup();
        this.initializeDamageUpPickup();
        this.initializeSpeedUpPickup();
        this.initializeDoubleJumpPickup();
        this.updateSnowBackground();
    }

    public updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        this.updateSnowBackground();
        this.updateColdDamage(deltaT);
        this.updateIcePickPickupPrompt();
        this.updateDamageUpPickupPrompt();
        this.updateSpeedUpPickupPrompt();
        this.updateDoubleJumpPickupPrompt();
        this.updateBossRewardState();

        if (this.arenaDropShakeTimer > 0) {
            this.arenaDropShakeTimer -= deltaT;
            if (this.arenaDropShakeTimer <= 0) {
                this.viewport.setZoomLevel(Level3.LEVEL_ZOOM);
                this.breakArenaFloor();
            } else {
                this.viewport.setZoomLevel(Level3.LEVEL_ZOOM + (Math.random() * 0.06 - 0.03));
            }
        }

        if (this.level3Boss !== undefined && this.level3Boss.isDefeated()) {
            const dyingStillPlaying =
                this.level3BossSprite !== undefined &&
                this.level3BossSprite.animation.isPlaying(SerisAnimations.DYING);

            if (!dyingStillPlaying && this.levelEndPortal !== null && !this.levelEndPortal.visible) {
                this.levelEndPortal.visible = true;
                if (this.levelEndArea !== undefined) {
                    this.levelEndArea.enablePhysics();
                }
            }
        }

        if(
            this.playerCanPickUpIcePick &&
            !this.pauseMenuOpen &&
            !this.hasBlockingModal() &&
            !this.levelEndTransitionStarted &&
            Input.isKeyJustPressed("e")
        ){
            this.collectIcePickPickup();
        }

        if(
            this.playerCanPickUpDamageUp &&
            !this.pauseMenuOpen &&
            !this.hasBlockingModal() &&
            !this.levelEndTransitionStarted &&
            Input.isKeyJustPressed("e")
        ){
            this.collectDamageUpPickup();
        }

        if(
            this.playerCanPickUpSpeedUp &&
            !this.pauseMenuOpen &&
            !this.hasBlockingModal() &&
            !this.levelEndTransitionStarted &&
            Input.isKeyJustPressed("e")
        ){
            this.collectSpeedUpPickup();
        }

        if(
            this.playerCanPickUpDoubleJump &&
            !this.pauseMenuOpen &&
            !this.hasBlockingModal() &&
            !this.levelEndTransitionStarted &&
            Input.isKeyJustPressed("e")
        ){
            this.collectDoubleJumpPickup();
        }
    }

    public getDyingAudioKey(): string {
        return this.dyingAudioKey;
    }

    protected updateColdDamage(deltaT: number): void {
        if(
            this.player === undefined ||
            MBProgress.hasUpgrade(UpgradeId.FUR_COAT) ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.coldDamageTimer = 0;
            return;
        }

        this.coldDamageTimer += deltaT;

        if(this.coldDamageTimer >= Level3.COLD_DAMAGE_INTERVAL){
            this.coldDamageTimer -= Level3.COLD_DAMAGE_INTERVAL;
            const controller = this.player.ai as PlayerController;
            controller.applyEnvironmentalTickDamage(Level3.COLD_DAMAGE_AMOUNT);
        }
    }

    protected initializeIcePickPickup(): void {
        this.playerCanPickUpIcePick = false;

        if(this.icePickPickupSprite !== null){
            this.icePickPickupSprite.destroy();
            this.icePickPickupSprite = null;
        }

        if(MBProgress.hasUpgrade(UpgradeId.ICE_PICK)){
            return;
        }

        this.icePickPickupSprite = this.add.sprite(MBLevel.ICE_PICK_ICON_KEY, MBLayers.PRIMARY);
        this.icePickPickupSprite.position.copy(Level3.ICE_PICK_PICKUP_POSITION);
        this.icePickPickupSprite.scale.copy(Level3.ICE_PICK_PICKUP_SCALE);
    }

    protected initializeDamageUpPickup(): void {
        this.playerCanPickUpDamageUp = false;

        if(this.damageUpPickupSprite !== null){
            this.damageUpPickupSprite.destroy();
            this.damageUpPickupSprite = null;
        }

        if(MBProgress.hasUpgrade(UpgradeId.UPGRADED_SWORD)){
            return;
        }

        this.damageUpPickupSprite = this.add.sprite(MBLevel.UPGRADED_SWORD_ICON_KEY, MBLayers.PRIMARY);
        this.damageUpPickupSprite.position.copy(Level3.DAMAGE_UP_PICKUP_POSITION);
        this.damageUpPickupSprite.scale.copy(Level3.DAMAGE_UP_PICKUP_SCALE);
    }

    protected initializeSpeedUpPickup(): void {
        this.playerCanPickUpSpeedUp = false;

        if(this.speedUpPickupSprite !== null){
            this.speedUpPickupSprite.destroy();
            this.speedUpPickupSprite = null;
        }

        if(MBProgress.hasUpgrade(UpgradeId.UPGRADED_BOOTS)){
            return;
        }

        this.speedUpPickupSprite = this.add.sprite(MBLevel.UPGRADED_BOOTS_ICON_KEY, MBLayers.PRIMARY);
        this.speedUpPickupSprite.position.copy(Level3.SPEED_UP_PICKUP_POSITION);
        this.speedUpPickupSprite.scale.copy(Level3.SPEED_UP_PICKUP_SCALE);
    }

    protected initializeDoubleJumpPickup(): void {
        this.playerCanPickUpDoubleJump = false;

        if(this.doubleJumpPickupSprite !== null){
            this.doubleJumpPickupSprite.destroy();
            this.doubleJumpPickupSprite = null;
        }

        if(MBProgress.hasUpgrade(UpgradeId.DOUBLE_JUMP)){
            return;
        }

        this.doubleJumpPickupSprite = this.add.sprite(MBLevel.DOUBLE_JUMP_ICON_KEY, MBLayers.PRIMARY);
        this.doubleJumpPickupSprite.position.copy(Level3.DOUBLE_JUMP_PICKUP_POSITION);
        this.doubleJumpPickupSprite.scale.copy(Level3.DOUBLE_JUMP_PICKUP_SCALE);
    }

    protected initializeUI(): void {
        super.initializeUI();

        const promptPosition = new Vec2(600 / this.getViewScale(), 720 / this.getViewScale());
        this.icePickPickupPromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: new Vec2(224, 40)
        });
        this.icePickPickupPromptPanel.color = new Color(20, 18, 24, 0.94);
        this.icePickPickupPromptPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.icePickPickupPromptPanel.visible = false;

        this.icePickPickupPromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] Pick up Ice Pick"
        });
        this.icePickPickupPromptLabel.size.set(250, 24);
        this.icePickPickupPromptLabel.font = "PixelSimple";
        this.icePickPickupPromptLabel.fontSize = 18;
        this.icePickPickupPromptLabel.textColor = new Color(246, 238, 214, 1);
        this.icePickPickupPromptLabel.visible = false;

        this.damageUpPickupPromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: new Vec2(212, 40)
        });
        this.damageUpPickupPromptPanel.color = new Color(20, 18, 24, 0.94);
        this.damageUpPickupPromptPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.damageUpPickupPromptPanel.visible = false;

        this.damageUpPickupPromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] Pick up Dmg Up"
        });
        this.damageUpPickupPromptLabel.size.set(240, 24);
        this.damageUpPickupPromptLabel.font = "PixelSimple";
        this.damageUpPickupPromptLabel.fontSize = 18;
        this.damageUpPickupPromptLabel.textColor = new Color(246, 238, 214, 1);
        this.damageUpPickupPromptLabel.visible = false;

        this.speedUpPickupPromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: new Vec2(230, 40)
        });
        this.speedUpPickupPromptPanel.color = new Color(20, 18, 24, 0.94);
        this.speedUpPickupPromptPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.speedUpPickupPromptPanel.visible = false;

        this.speedUpPickupPromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] Pick up Speed Up"
        });
        this.speedUpPickupPromptLabel.size.set(250, 24);
        this.speedUpPickupPromptLabel.font = "PixelSimple";
        this.speedUpPickupPromptLabel.fontSize = 18;
        this.speedUpPickupPromptLabel.textColor = new Color(246, 238, 214, 1);
        this.speedUpPickupPromptLabel.visible = false;

        this.doubleJumpPickupPromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: new Vec2(270, 40)
        });
        this.doubleJumpPickupPromptPanel.color = new Color(20, 18, 24, 0.94);
        this.doubleJumpPickupPromptPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.doubleJumpPickupPromptPanel.visible = false;

        this.doubleJumpPickupPromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] Pick up Double Jump"
        });
        this.doubleJumpPickupPromptLabel.size.set(270, 24);
        this.doubleJumpPickupPromptLabel.font = "PixelSimple";
        this.doubleJumpPickupPromptLabel.fontSize = 18;
        this.doubleJumpPickupPromptLabel.textColor = new Color(246, 238, 214, 1);
        this.doubleJumpPickupPromptLabel.visible = false;
    }

    protected updateIcePickPickupPrompt(): void {
        if(
            this.icePickPickupSprite === null ||
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.playerCanPickUpIcePick = false;
            this.icePickPickupPromptPanel.visible = false;
            this.icePickPickupPromptLabel.visible = false;
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        const pickupAABB = new AABB(
            this.icePickPickupSprite.position.clone(),
            Level3.ICE_PICK_PICKUP_HALF_SIZE.clone()
        );

        this.playerCanPickUpIcePick = playerAABB.overlapArea(pickupAABB) > 0;
        this.icePickPickupPromptPanel.visible = this.playerCanPickUpIcePick;
        this.icePickPickupPromptLabel.visible = this.playerCanPickUpIcePick;
    }

    protected collectIcePickPickup(): void {
        if(this.icePickPickupSprite === null){
            return;
        }

        this.playerCanPickUpIcePick = false;
        this.icePickPickupPromptPanel.visible = false;
        this.icePickPickupPromptLabel.visible = false;
        this.icePickPickupSprite.destroy();
        this.icePickPickupSprite = null;

        this.grantUpgrade(UpgradeId.ICE_PICK);
        this.showUpgradeRewardPopup(UpgradeId.ICE_PICK);
    }

    protected updateDamageUpPickupPrompt(): void {
        if(
            this.damageUpPickupSprite === null ||
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.playerCanPickUpDamageUp = false;
            this.damageUpPickupPromptPanel.visible = false;
            this.damageUpPickupPromptLabel.visible = false;
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        const pickupAABB = new AABB(
            this.damageUpPickupSprite.position.clone(),
            Level3.DAMAGE_UP_PICKUP_HALF_SIZE.clone()
        );

        this.playerCanPickUpDamageUp = playerAABB.overlapArea(pickupAABB) > 0;
        this.damageUpPickupPromptPanel.visible = this.playerCanPickUpDamageUp;
        this.damageUpPickupPromptLabel.visible = this.playerCanPickUpDamageUp;
    }

    protected collectDamageUpPickup(): void {
        if(this.damageUpPickupSprite === null){
            return;
        }

        this.playerCanPickUpDamageUp = false;
        this.damageUpPickupPromptPanel.visible = false;
        this.damageUpPickupPromptLabel.visible = false;
        this.damageUpPickupSprite.destroy();
        this.damageUpPickupSprite = null;

        this.grantUpgrade(UpgradeId.UPGRADED_SWORD);
        this.showUpgradeRewardPopup(UpgradeId.UPGRADED_SWORD);
    }

    protected updateSpeedUpPickupPrompt(): void {
        if(
            this.speedUpPickupSprite === null ||
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.playerCanPickUpSpeedUp = false;
            this.speedUpPickupPromptPanel.visible = false;
            this.speedUpPickupPromptLabel.visible = false;
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        const pickupAABB = new AABB(
            this.speedUpPickupSprite.position.clone(),
            Level3.SPEED_UP_PICKUP_HALF_SIZE.clone()
        );

        this.playerCanPickUpSpeedUp = playerAABB.overlapArea(pickupAABB) > 0;
        this.speedUpPickupPromptPanel.visible = this.playerCanPickUpSpeedUp;
        this.speedUpPickupPromptLabel.visible = this.playerCanPickUpSpeedUp;
    }

    protected collectSpeedUpPickup(): void {
        if(this.speedUpPickupSprite === null){
            return;
        }

        this.playerCanPickUpSpeedUp = false;
        this.speedUpPickupPromptPanel.visible = false;
        this.speedUpPickupPromptLabel.visible = false;
        this.speedUpPickupSprite.destroy();
        this.speedUpPickupSprite = null;

        this.grantUpgrade(UpgradeId.UPGRADED_BOOTS);
        this.showUpgradeRewardPopup(UpgradeId.UPGRADED_BOOTS);
    }

    protected updateDoubleJumpPickupPrompt(): void {
        if(
            this.doubleJumpPickupSprite === null ||
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.playerCanPickUpDoubleJump = false;
            this.doubleJumpPickupPromptPanel.visible = false;
            this.doubleJumpPickupPromptLabel.visible = false;
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        const pickupAABB = new AABB(
            this.doubleJumpPickupSprite.position.clone(),
            Level3.DOUBLE_JUMP_PICKUP_HALF_SIZE.clone()
        );

        this.playerCanPickUpDoubleJump = playerAABB.overlapArea(pickupAABB) > 0;
        this.doubleJumpPickupPromptPanel.visible = this.playerCanPickUpDoubleJump;
        this.doubleJumpPickupPromptLabel.visible = this.playerCanPickUpDoubleJump;
    }

    protected collectDoubleJumpPickup(): void {
        if(this.doubleJumpPickupSprite === null){
            return;
        }

        this.playerCanPickUpDoubleJump = false;
        this.doubleJumpPickupPromptPanel.visible = false;
        this.doubleJumpPickupPromptLabel.visible = false;
        this.doubleJumpPickupSprite.destroy();
        this.doubleJumpPickupSprite = null;

        this.showUpgradeRewardPopup(UpgradeId.DOUBLE_JUMP, () => {
            this.grantUpgrade(UpgradeId.DOUBLE_JUMP);
            this.triggerDoubleJumpArenaDrop();
        });
    }

    protected triggerDoubleJumpArenaDrop(): void {
        this.arenaDropShakeTimer = 1.5; // 1.5 seconds of screen shake before dropping
        this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: this.tileDestroyedAudioKey, loop: false, holdReference: false});
    }

    protected breakArenaFloor(): void {
        const breakable = this.getTilemap("Breakable") as OrthogonalTilemap;
        if(breakable !== undefined){
            const dims = breakable.getDimensions();
            for(let y = 0; y < dims.y; y++){
                for(let x = 0; x < dims.x; x++){
                    breakable.setTileAtRowCol(new Vec2(x, y), 0);
                }
            }
            this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: this.tileDestroyedAudioKey, loop: false, holdReference: false});
        }
    }

    protected initializeSnowmen(): void {
        for(const spawn of Level3.SNOWMAN_SPAWNS){
            this.spawnSnowman(spawn);
        }
    }

    protected initializeWolves(): void {
        for(const spawn of Level3.WOLF_SPAWNS){
            this.spawnWolf(spawn);
        }
    }

    protected initializeGuards(): void {
        for(const spawn of Level3.GUARD_SPAWNS){
            this.spawnGuard(spawn);
        }
    }

    public spawnSnowman(spawn: Vec2): MBAnimatedSprite {
        const snowman = this.add.animatedSprite(SNOWMAN_SPRITE_KEY, MBLayers.PRIMARY);
        snowman.position.copy(spawn);

        const physics = createScaledEnemyPhysicsConfig({
            ...DEFAULT_SNOWMAN_PHYSICS
        });

        snowman.scale.copy(physics.spriteScale);

        if(physics.snapToFloor && physics.movementMode === "ground"){
            placeGroundEnemyOnFloor(snowman, this.walls, this.tilemapScale, physics.bodyHitboxHalfSize);
        }

        addEnemyPhysics(snowman, physics, true, false);
        snowman.setGroup(MBPhysicsGroups.BOSS);
        snowman.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.ENEMY_PARTICLE_HIT, "");
        snowman.addAI(SnowmanController, {
            player: this.player,
            projectileImageKey: Level3.SNOWBALL_KEY,
            hitboxHalfSize: physics.bodyHitboxHalfSize.clone()
        });
        this.registerDamageableEnemy(snowman, snowman.ai as SnowmanController);
        return snowman;
    }

    protected spawnWolf(spawn: Vec2): MBAnimatedSprite {
        const wolf = this.add.animatedSprite(WOLF_SPRITE_KEY, MBLayers.PRIMARY);
        wolf.position.copy(spawn);

        const physics = createScaledEnemyPhysicsConfig({
            ...DEFAULT_WOLF_PHYSICS
        });

        wolf.scale.copy(physics.spriteScale);

        if(physics.snapToFloor && physics.movementMode === "ground"){
            placeGroundEnemyOnFloor(wolf, this.walls, this.tilemapScale, physics.bodyHitboxHalfSize);
        }

        addEnemyPhysics(wolf, physics, true, false);
        wolf.setGroup(MBPhysicsGroups.BOSS);
        wolf.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.ENEMY_PARTICLE_HIT, "");
        wolf.addAI(WolfController, {
            player: this.player,
            homePosition: wolf.position.clone(),
            hitboxHalfSize: physics.bodyHitboxHalfSize.clone(),
            attackHitboxOffset: physics.attackHitboxOffset.clone(),
            attackHitboxHalfSize: physics.attackHitboxHalfSize.clone()
        });
        this.registerDamageableEnemy(wolf, wolf.ai as WolfController);
        return wolf;
    }

    protected spawnGuard(spawn: Vec2): MBAnimatedSprite {
        const guard = this.add.animatedSprite(GUARD_SPRITE_KEY, MBLayers.PRIMARY);
        guard.position.copy(spawn);

        const physics = createScaledEnemyPhysicsConfig({
            ...DEFAULT_GUARD_PHYSICS
        });

        guard.scale.copy(physics.spriteScale);

        if(physics.snapToFloor && physics.movementMode === "ground"){
            placeGroundEnemyOnFloor(guard, this.walls, this.tilemapScale, physics.bodyHitboxHalfSize);
        }

        addEnemyPhysics(guard, physics, true, false);
        guard.setGroup(MBPhysicsGroups.BOSS);
        guard.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.ENEMY_PARTICLE_HIT, "");
        guard.addAI(GuardController, {
            player: this.player,
            homePosition: guard.position.clone(),
            hitboxHalfSize: physics.bodyHitboxHalfSize.clone(),
            shieldSlamHitboxOffset: physics.attackHitboxOffset.clone(),
            shieldSlamHitboxHalfSize: physics.attackHitboxHalfSize.clone()
        });
        this.registerDamageableEnemy(guard, guard.ai as GuardController);
        return guard;
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

        // 4. Seris starts airborne, so do not floor-snap at spawn.
        // Floor contact is handled during dive-bomb/landing in the controller.

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
            aggroHeightThreshold: Level3.SERIS_AGGRO_HEIGHT_THRESHOLD,
            // snowman spawn points for Glacial Roar
            snowmanSpawns: Level3.SERIS_GLACIAL_ROAR_SNOWMAN_SPAWNS
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

    protected initializeLevelEnds(): void {
        const portal = this.add.sprite(Level3.PORTAL_IMAGE_KEY, MBLayers.PRIMARY);
        const frameCol = Level3.GREEN_RIGHT_PORTAL_FRAME % Level3.PORTAL_FRAME_COLUMNS;
        const frameRow = Math.floor(Level3.GREEN_RIGHT_PORTAL_FRAME / Level3.PORTAL_FRAME_COLUMNS);

        portal.size.copy(Level3.PORTAL_FRAME_SIZE);
        portal.scale.copy(this.tilemapScale);
        portal.setImageOffset(new Vec2(
            frameCol * Level3.PORTAL_FRAME_SIZE.x,
            frameRow * Level3.PORTAL_FRAME_SIZE.y
        ));
        portal.position.copy(this.levelEndPosition);
        portal.visible = false;
        this.levelEndPortal = portal;

        this.levelEndArea = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PRIMARY, {
            position: this.levelEndPosition.clone(),
            size: this.levelEndHalfSize.clone()
        });
        this.levelEndArea.addPhysics(undefined, undefined, false, true);
        this.levelEndArea.visible = false;
        this.levelEndArea.disablePhysics();
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
            case ProgressTargetSceneId.LEVEL_4: return Level4;
            default: return null;
        }
    }

    protected getPlayerDeathDestination(): new (...args: any) => Scene {
        return HubLevel;
    }
}
