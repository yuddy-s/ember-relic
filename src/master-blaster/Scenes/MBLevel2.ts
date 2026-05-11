import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Input from "../../Wolfie2D/Input/Input";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Color from "../../Wolfie2D/Utils/Color";
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import { MBEvents } from "../MBEvents";
import { addEnemyPhysics, createScaledEnemyPhysicsConfig, placeGroundEnemyOnFloor } from "../Enemies/EnemyPhysicsUtils";
import WretchController from "../Enemies/Minions/wretch/WretchController";
import { DEFAULT_WRETCH_PHYSICS, WRETCH_SPRITE_KEY, WRETCH_SPRITE_PATH } from "../Enemies/Minions/wretch/WretchConfig";
import BatController from "../Enemies/Minions/bat/BatController";
import { BAT_SPRITE_KEY, BAT_SPRITE_PATH, DEFAULT_BAT_PHYSICS } from "../Enemies/Minions/bat/BatConfig";
import SlimeController from "../Enemies/Minions/slime/SlimeController";
import { DEFAULT_SLIME_PHYSICS, SLIME_SPRITE_KEY, SLIME_SPRITE_PATH } from "../Enemies/Minions/slime/SlimeConfig";
import PlayerController from "../Player/PlayerController";
import { MBProgress, UpgradeId } from "../Progress/MBProgress";
import Level2Boss, { VorrathAnimations } from "../Bosses/Level2Boss";
import VorrathController from "../Bosses/VorrathController";
import MBLevel, { MBLayers } from "./MBLevel";
import HubLevel from "./HubLevel";
import Level1 from "./MBLevel1";
import Level3 from "./MBLevel3";
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
    private levelEndPortal: Sprite | null = null;
    private healthBuffCarrierSlime: MBAnimatedSprite | null = null;
    private healthBuffCarrierIcon: Sprite | null = null;
    private healthBuffPickupPromptPanel!: Rect;
    private healthBuffPickupPromptLabel!: Label;
    private shieldPickupSprite: Sprite | null = null;
    private shieldPickupPromptPanel!: Rect;
    private shieldPickupPromptLabel!: Label;
    private level2Boss!: Level2Boss;
    private level2BossSprite!: MBAnimatedSprite;
    private bossDefeatVignetteTimer: number = 0;
    private bossDefeatVignetteDelayStarted: boolean = false;
    private furCoatRewardShown: boolean = false;
    private furCoatGrantedFromBoss: boolean = false;
    private revivalTotemRewardShown: boolean = false;
    private revivalTotemGrantedFromBoss: boolean = false;
    private healthBuffRingDropped: boolean = false;
    private playerCanPickUpHealthBuff: boolean = false;
    private playerCanPickUpShield: boolean = false;
    private level2BossProgressRecorded: boolean = false;

    // new Vec2(1536, 752) 2600, 1050 is testing boss coord spawn
    public static readonly PLAYER_SPAWN = new Vec2(1344, 704);
    public static readonly PLAYER_SPRITE_KEY = "PLAYER_SPRITE_KEY";
    public static readonly PLAYER_SPRITE_PATH = "game_assets/spritesheets/knight.json";

    public static readonly WRETCH_SPAWNS = [
        // Add or remove Vec2 positions here to place Wretches in Level 2
            new Vec2(432, 864),
            new Vec2(672, 720),
            new Vec2(1760, 768),
            new Vec2(1152, 992),
    ];
    // Temporary bat placements for quick flying-enemy testing in Level 2.
    public static readonly BAT_SPAWNS = [
        new Vec2(592, 800),
        new Vec2(2336, 128),
        new Vec2(2960, 992)
    ];
    public static readonly HEALTH_BUFF_SLIME_SPAWN = new Vec2(224, 864);
    public static readonly HEALTH_BUFF_SLIME_ICON_OFFSET = new Vec2(0, -4);
    public static readonly HEALTH_BUFF_SLIME_ICON_SCALE = new Vec2(0.22, 0.22);
    public static readonly HEALTH_BUFF_SLIME_ICON_ALPHA = 0.65;
    public static readonly HEALTH_BUFF_PICKUP_HALF_SIZE = new Vec2(24, 24);
    public static readonly SHIELD_PICKUP_POSITION = new Vec2(1408, 1104);
    public static readonly SHIELD_PICKUP_SCALE = new Vec2(0.24, 0.24);
    public static readonly SHIELD_PICKUP_HALF_SIZE = new Vec2(24, 24);

    public static readonly VORRATH_SPRITE_KEY = "VORRATH_SPRITE_KEY";
    public static readonly VORRATH_SPRITE_PATH = "game_assets/spritesheets/enemies/bosses/vorrath.json";
    public static readonly VORRATH_ROCK_KEY = "VORRATH_ROCK_KEY";
    public static readonly VORRATH_ROCK_PATH = "game_assets/spritesheets/enemies/bosses/vorrath-rock.png";
    public static readonly LAVA_PILLAR_KEY = "LAVA_PILLAR_KEY";
    public static readonly LAVA_PILLAR_PATH = "game_assets/art/lava-pillar.png";
    public static readonly VORRATH_SPAWN = new Vec2(2272, 1104);
    public static readonly VORRATH_SCALE = new Vec2(0.45, 0.45);
    public static readonly VORRATH_HITBOX_HALF_SIZE = new Vec2(72, 104);
    public static readonly VORRATH_VISUAL_OFFSET_Y = 8;
    public static readonly VORRATH_AGGRO_RANGE = 100;
    public static readonly VORRATH_AGGRO_HEIGHT_THRESHOLD = 70;
    public static readonly VORRATH_ATTACK_RANGE = 140;
    public static readonly VORRATH_TWO_HAND_SLAM_RANGE = 430;
    public static readonly VORRATH_TWO_HAND_SLAM_LANE_THRESHOLD = 95;
    public static readonly VORRATH_LAVA_PILLAR_SPAWN_COUNT = 6;
    public static readonly VORRATH_LAVA_PILLAR_BOSS_CLEAR_DISTANCE = 5 * 16;
    public static readonly VORRATH_MOVE_SPEED = 60;
    public static readonly VORRATH_ARENA_WALL_LAVA_PILLAR_BASE_POINTS = [
        new Vec2(2544, 1120),
        new Vec2(2032, 1120)
    ];
    // Edit these x/y points to move the red warning beams and lava pillars.
    // Y = -1 means "snap this pillar to the floor automatically at that x position".
    // These are the random arena slots the two-hand slam will pick from.
    // on tiled, from 138 to 185 is playable on x 
    public static readonly VORRATH_LAVA_PILLAR_BASE_POINTS = [
        new Vec2(2700, 1136),
        new Vec2(2690, 1136),
        new Vec2(2670, 1136),
        new Vec2(2600, 1136),
        new Vec2(2548, 1136),
        new Vec2(2512, 1136),
        new Vec2(2464, 1136),
        new Vec2(2416, 1136),
        new Vec2(2384, 1136),
        new Vec2(2336, 1136),
        new Vec2(2320, 1136),
        new Vec2(2272, 1136),
        new Vec2(2256, 1136)
    ];
    public static readonly CAVE_VIGNETTE_KEY = "CAVE_VIGNETTE";
    public static readonly CAVE_VIGNETTE_PATH = "game_assets/art/cave-vignette.png";
    public static readonly BLIND_VIGNETTE_KEY = "BLIND_VIGNETTE";
    public static readonly BLIND_VIGNETTE_PATH = "game_assets/art/blind.png";
    public static readonly LEVEL2_ZOOM = 3.3;
    public static readonly VIGNETTE_FADE_SPEED = 0.5;
    public static readonly POST_BOSS_VIGNETTE_DELAY = 6;
    public static readonly BOSS_NAME = "Vorrath, The Ashen";
    public static readonly BOSS_MAX_HEALTH = 30;

    public static readonly TILEMAP_KEY = "LEVEL2";
    public static readonly TILEMAP_PATH = "game_assets/tilemaps/cave.json";
    public static readonly TILEMAP_SCALE = new Vec2(1, 1);
    public static readonly DESTRUCTIBLE_LAYER_KEY = undefined;
    public static readonly WALLS_LAYER_KEY = "Main";
    public static readonly PORTAL_IMAGE_KEY = "LEVEL2_PORTAL";
    public static readonly PORTAL_IMAGE_PATH = "game_assets/spritesheets/portals.png";
    public static readonly PORTAL_FRAME_COLUMNS = 2;
    public static readonly PORTAL_FRAME_SIZE = new Vec2(32, 61);
    public static readonly GREEN_RIGHT_PORTAL_FRAME = 7;

    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/MB_level2_music.wav";

    public static readonly JUMP_AUDIO_KEY = "PLAYER_JUMP";
    public static readonly JUMP_AUDIO_PATH = "game_assets/sounds/jump.wav";

    public static readonly TILE_DESTROYED_KEY = "TILE_DESTROYED";
    public static readonly TILE_DESTROYED_PATH = "game_assets/sounds/switch.wav";

    public static readonly DYING_AUDIO_KEY = "DYING_AUDIO";
    public static readonly DYING_AUDIO_PATH = "game_assets/sounds/dying.wav"

    public static readonly LEVEL_END = new AABB(new Vec2(133, 69), new Vec2(24, 16));

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
        this.levelEndPosition = new Vec2(1936, 1088).mult(this.tilemapScale);
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
        this.load.spritesheet(Level2.VORRATH_SPRITE_KEY, Level2.VORRATH_SPRITE_PATH);
        this.load.spritesheet(WRETCH_SPRITE_KEY, WRETCH_SPRITE_PATH);
        this.load.spritesheet(BAT_SPRITE_KEY, BAT_SPRITE_PATH);
        this.load.spritesheet(SLIME_SPRITE_KEY, SLIME_SPRITE_PATH);
        this.load.image(Level2.PORTAL_IMAGE_KEY, Level2.PORTAL_IMAGE_PATH);
        this.load.image(Level2.VORRATH_ROCK_KEY, Level2.VORRATH_ROCK_PATH);
        this.load.image(Level2.LAVA_PILLAR_KEY, Level2.LAVA_PILLAR_PATH);
        // Load the cave visibility vignette overlay
        this.load.image(Level2.CAVE_VIGNETTE_KEY, Level2.CAVE_VIGNETTE_PATH);
        this.load.image(Level2.BLIND_VIGNETTE_KEY, Level2.BLIND_VIGNETTE_PATH);
        // Temporary upgrade icon for inventory UI testing
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
        this.initializeWretches();
        this.initializeBats();
        this.initializeHealthBuffSlime();
        this.initializeShieldPickup();
        this.travelPortalDestination = HubLevel;
        this.bossDefeatVignetteTimer = 0;
        this.bossDefeatVignetteDelayStarted = false;
        this.furCoatRewardShown = false;
        this.furCoatGrantedFromBoss = MBProgress.hasUpgrade(UpgradeId.FUR_COAT);
        this.revivalTotemRewardShown = false;
        this.revivalTotemGrantedFromBoss = MBProgress.hasUpgrade(UpgradeId.REVIVAL_TOTEM_L1);
        this.level2BossProgressRecorded = MBProgress.hasDefeatedBoss(this.level2Boss.id);
    }

    public updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        this.updateHealthBuffSlimeVisual();
        this.updateHealthBuffPickupPrompt();
        this.updateShieldPickupPrompt();

        if(
            this.playerCanPickUpHealthBuff &&
            !this.pauseMenuOpen &&
            !this.hasBlockingModal() &&
            !this.levelEndTransitionStarted &&
            Input.isKeyJustPressed("e")
        ){
            this.collectDroppedHealthBuffRing();
        }

        if(
            this.playerCanPickUpShield &&
            !this.pauseMenuOpen &&
            !this.hasBlockingModal() &&
            !this.levelEndTransitionStarted &&
            Input.isKeyJustPressed("e")
        ){
            this.collectShieldPickup();
        }

        this.updateBossRewardState();
        this.updateBossDefeatVignetteTimer(deltaT);
        this.updateVisibilityVignettes(deltaT);
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
        this.level2BossSprite.addPhysics(
            new AABB(this.level2BossSprite.position.clone(), scaledBossHitbox),
            new Vec2(0, -Level2.VORRATH_VISUAL_OFFSET_Y),
            true,
            false
        );
        this.level2BossSprite.position.y += Level2.VORRATH_VISUAL_OFFSET_Y;
        this.level2BossSprite.setGroup(MBPhysicsGroups.BOSS);
        this.level2BossSprite.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.BOSS_PARTICLE_HIT, "");
        this.level2BossSprite.animation.play(VorrathAnimations.IDLE, true);
        const lavaPillarBasePoints = this.buildVorrathLavaPillarBasePoints();
        const arenaWallLavaPillarBasePoints = this.buildArenaWallLavaPillarBasePoints();
        this.level2BossSprite.addAI(VorrathController, {
            bossState: this.level2Boss,
            player: this.player,
            tilemap: this.wallsLayerKey,
            hitboxHalfSize: scaledBossHitbox,
            projectileImageKey: Level2.VORRATH_ROCK_KEY,
            lavaPillarImageKey: Level2.LAVA_PILLAR_KEY,
            lavaPillarBasePoints,
            arenaWallLavaPillarBasePoints,
            moveSpeed: Level2.VORRATH_MOVE_SPEED,
            aggroRange: Level2.VORRATH_AGGRO_RANGE,
            aggroHeightThreshold: Level2.VORRATH_AGGRO_HEIGHT_THRESHOLD,
            attackRange: Level2.VORRATH_ATTACK_RANGE,
            twoHandSlamRange: Level2.VORRATH_TWO_HAND_SLAM_RANGE,
            twoHandSlamLaneThreshold: Level2.VORRATH_TWO_HAND_SLAM_LANE_THRESHOLD,
            lavaPillarSpawnCount: Level2.VORRATH_LAVA_PILLAR_SPAWN_COUNT,
            lavaPillarBossClearDistance: Level2.VORRATH_LAVA_PILLAR_BOSS_CLEAR_DISTANCE
        });
    }

    protected initializeWretches(): void {
        for(const spawn of Level2.WRETCH_SPAWNS){
            this.spawnWretch(spawn);
        }
    }

    protected initializeBats(): void {
        for(const spawn of Level2.BAT_SPAWNS){
            this.spawnBat(spawn);
        }
    }

    protected initializeHealthBuffSlime(): void {
        this.healthBuffRingDropped = false;
        this.playerCanPickUpHealthBuff = false;

        if(MBProgress.hasUpgrade(UpgradeId.HEALTH_BUFF)){
            this.healthBuffCarrierSlime = null;
            this.healthBuffCarrierIcon = null;
            return;
        }

        this.healthBuffCarrierSlime = this.spawnSlime(Level2.HEALTH_BUFF_SLIME_SPAWN);
        this.healthBuffCarrierIcon = this.add.sprite(MBLevel.HEALTH_BUFF_ICON_KEY, MBLayers.PRIMARY);
        this.healthBuffCarrierIcon.scale.copy(Level2.HEALTH_BUFF_SLIME_ICON_SCALE);
        this.healthBuffCarrierIcon.alpha = Level2.HEALTH_BUFF_SLIME_ICON_ALPHA;
        this.updateHealthBuffSlimeVisual();
    }

    protected initializeShieldPickup(): void {
        this.playerCanPickUpShield = false;

        if(this.shieldPickupSprite !== null){
            this.shieldPickupSprite.destroy();
            this.shieldPickupSprite = null;
        }

        if(MBProgress.hasUpgrade(UpgradeId.SHIELD)){
            return;
        }

        this.shieldPickupSprite = this.add.sprite(MBLevel.SHIELD_ICON_KEY, MBLayers.PRIMARY);
        this.shieldPickupSprite.position.copy(Level2.SHIELD_PICKUP_POSITION);
        this.shieldPickupSprite.scale.copy(Level2.SHIELD_PICKUP_SCALE);
    }

    protected spawnWretch(spawn: Vec2): MBAnimatedSprite {
        const wretch = this.add.animatedSprite(WRETCH_SPRITE_KEY, MBLayers.PRIMARY);
        wretch.position.copy(spawn);

        const physics = createScaledEnemyPhysicsConfig({
            ...DEFAULT_WRETCH_PHYSICS
        });

        wretch.scale.copy(physics.spriteScale);

        if(physics.snapToFloor && physics.movementMode === "ground"){
            placeGroundEnemyOnFloor(wretch, this.walls, this.tilemapScale, physics.bodyHitboxHalfSize);
        }

        addEnemyPhysics(wretch, physics, true, false);
        wretch.setGroup(MBPhysicsGroups.BOSS);
        wretch.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.ENEMY_PARTICLE_HIT, "");
        wretch.addAI(WretchController, {
            player: this.player,
            tilemap: this.wallsLayerKey
        });
        this.registerDamageableEnemy(wretch, wretch.ai as WretchController);
        return wretch;
    }

    protected spawnBat(spawn: Vec2): MBAnimatedSprite {
        const bat = this.add.animatedSprite(BAT_SPRITE_KEY, MBLayers.PRIMARY);
        bat.position.copy(spawn);

        const physics = createScaledEnemyPhysicsConfig({
            ...DEFAULT_BAT_PHYSICS
        });

        bat.scale.copy(physics.spriteScale);
        addEnemyPhysics(bat, physics, true, false);
        bat.setGroup(MBPhysicsGroups.BOSS);
        bat.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.ENEMY_PARTICLE_HIT, "");
        bat.addAI(BatController, {
            player: this.player,
            homePosition: spawn.clone(),
            hitboxHalfSize: physics.bodyHitboxHalfSize.clone(),
            attackHitboxHalfSize: physics.attackHitboxHalfSize.clone()
        });
        this.registerDamageableEnemy(bat, bat.ai as BatController);
        return bat;
    }

    protected spawnSlime(spawn: Vec2): MBAnimatedSprite {
        const slime = this.add.animatedSprite(SLIME_SPRITE_KEY, MBLayers.PRIMARY);
        slime.position.copy(spawn);

        const physics = createScaledEnemyPhysicsConfig({
            ...DEFAULT_SLIME_PHYSICS
        });

        slime.scale.copy(physics.spriteScale);

        if(physics.snapToFloor && physics.movementMode === "ground"){
            placeGroundEnemyOnFloor(slime, this.walls, this.tilemapScale, physics.bodyHitboxHalfSize);
        }

        addEnemyPhysics(slime, physics, true, false);
        slime.setGroup(MBPhysicsGroups.BOSS);
        slime.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.ENEMY_PARTICLE_HIT, "");
        slime.addAI(SlimeController, {
            player: this.player,
            homePosition: slime.position.clone(),
            hitboxHalfSize: physics.bodyHitboxHalfSize.clone(),
            attackHitboxOffset: physics.attackHitboxOffset.clone(),
            attackHitboxHalfSize: physics.attackHitboxHalfSize.clone()
        });
        this.registerDamageableEnemy(slime, slime.ai as SlimeController);
        return slime;
    }

    protected initializeViewport(): void {
        super.initializeViewport();
        this.viewport.setZoomLevel(Level2.LEVEL2_ZOOM);

        const worldWidth = 201 * 16 * this.tilemapScale.x;
        const worldHeight = 75 * 16 * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
    }

    protected initializeLevelEnds(): void {
        const portal = this.add.sprite(Level2.PORTAL_IMAGE_KEY, MBLayers.PRIMARY);
        const frameCol = Level2.GREEN_RIGHT_PORTAL_FRAME % Level2.PORTAL_FRAME_COLUMNS;
        const frameRow = Math.floor(Level2.GREEN_RIGHT_PORTAL_FRAME / Level2.PORTAL_FRAME_COLUMNS);

        portal.size.copy(Level2.PORTAL_FRAME_SIZE);
        portal.scale.copy(this.tilemapScale);
        portal.setImageOffset(new Vec2(
            frameCol * Level2.PORTAL_FRAME_SIZE.x,
            frameRow * Level2.PORTAL_FRAME_SIZE.y
        ));
        portal.position.copy(this.levelEndPosition);
        this.levelEndPortal = portal;

        this.levelEndArea = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PRIMARY, {
            position: this.levelEndPosition.clone(),
            size: this.levelEndHalfSize.clone()
        });
        this.levelEndArea.addPhysics(undefined, undefined, false, true);
        this.levelEndArea.visible = false;
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

        const promptPosition = new Vec2(600 / this.getViewScale(), 720 / this.getViewScale());
        this.healthBuffPickupPromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: new Vec2(214, 40)
        });
        this.healthBuffPickupPromptPanel.color = new Color(20, 18, 24, 0.94);
        this.healthBuffPickupPromptPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.healthBuffPickupPromptPanel.visible = false;

        this.healthBuffPickupPromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] Pick Up HP Ring"
        });
        this.healthBuffPickupPromptLabel.size.set(240, 24);
        this.healthBuffPickupPromptLabel.font = "PixelSimple";
        this.healthBuffPickupPromptLabel.fontSize = 18;
        this.healthBuffPickupPromptLabel.textColor = new Color(246, 238, 214, 1);
        this.healthBuffPickupPromptLabel.visible = false;

        this.shieldPickupPromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: new Vec2(214, 40)
        });
        this.shieldPickupPromptPanel.color = new Color(20, 18, 24, 0.94);
        this.shieldPickupPromptPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.shieldPickupPromptPanel.visible = false;

        this.shieldPickupPromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] Pick up Shield"
        });
        this.shieldPickupPromptLabel.size.set(240, 24);
        this.shieldPickupPromptLabel.font = "PixelSimple";
        this.shieldPickupPromptLabel.fontSize = 18;
        this.shieldPickupPromptLabel.textColor = new Color(246, 238, 214, 1);
        this.shieldPickupPromptLabel.visible = false;

        this.updateVisibilityVignettes(1);
    }

    protected updateVisibilityVignettes(deltaT: number): void {
        if(this.caveVignette === undefined || this.blindVignette === undefined){
            return;
        }

        const hasLantern = MBProgress.hasUpgrade(UpgradeId.LANTERN);
        const bossFightStarted = this.boss !== undefined && this.boss.hasFightStarted() && !this.boss.isDefeated();
        const bossDefeatDelayFinished = this.boss !== undefined && this.boss.isDefeated() && this.bossDefeatVignetteTimer >= Level2.POST_BOSS_VIGNETTE_DELAY;
        const targetBlindAlpha = hasLantern ? 0 : 1;
        const targetCaveAlpha = !hasLantern
            ? 0
            : this.boss === undefined
                ? 1
                : this.boss.isDefeated()
                    ? (bossDefeatDelayFinished ? 1 : 0)
                    : (bossFightStarted ? 0 : 1);
        const fadeStep = Math.min(1, deltaT * Level2.VIGNETTE_FADE_SPEED);

        this.caveVignette.alpha += (targetCaveAlpha - this.caveVignette.alpha) * fadeStep;
        this.blindVignette.alpha += (targetBlindAlpha - this.blindVignette.alpha) * fadeStep;

        this.caveVignette.visible = this.caveVignette.alpha > 0.01;
        this.blindVignette.visible = this.blindVignette.alpha > 0.01;
    }

    protected updateHealthBuffSlimeVisual(): void {
        if(this.healthBuffCarrierIcon === null){
            return;
        }

        if(this.healthBuffRingDropped || this.healthBuffCarrierSlime === null){
            this.healthBuffCarrierIcon.alpha = Level2.HEALTH_BUFF_SLIME_ICON_ALPHA;
            return;
        }

        const slimeAI = this.healthBuffCarrierSlime.ai as SlimeController | undefined;
        if((slimeAI === undefined || slimeAI.isDefeated()) && this.healthBuffCarrierSlime.alpha <= 0.05){
            this.healthBuffCarrierIcon.position.copy(
                this.healthBuffCarrierSlime.position.clone().add(Level2.HEALTH_BUFF_SLIME_ICON_OFFSET)
            );
            this.healthBuffCarrierIcon.alpha = Level2.HEALTH_BUFF_SLIME_ICON_ALPHA;
            this.healthBuffRingDropped = true;
            this.healthBuffCarrierSlime = null;
            return;
        }

        this.healthBuffCarrierIcon.position.copy(
            this.healthBuffCarrierSlime.position.clone().add(Level2.HEALTH_BUFF_SLIME_ICON_OFFSET)
        );
        this.healthBuffCarrierIcon.alpha = Level2.HEALTH_BUFF_SLIME_ICON_ALPHA;
    }

    protected updateHealthBuffPickupPrompt(): void {
        if(
            !this.healthBuffRingDropped ||
            this.healthBuffCarrierIcon === null ||
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.playerCanPickUpHealthBuff = false;
            this.healthBuffPickupPromptPanel.visible = false;
            this.healthBuffPickupPromptLabel.visible = false;
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        const pickupAABB = new AABB(
            this.healthBuffCarrierIcon.position.clone(),
            Level2.HEALTH_BUFF_PICKUP_HALF_SIZE.clone()
        );

        this.playerCanPickUpHealthBuff = playerAABB.overlapArea(pickupAABB) > 0;
        this.healthBuffPickupPromptPanel.visible = this.playerCanPickUpHealthBuff;
        this.healthBuffPickupPromptLabel.visible = this.playerCanPickUpHealthBuff;
    }

    protected collectDroppedHealthBuffRing(): void {
        if(!this.healthBuffRingDropped || this.healthBuffCarrierIcon === null){
            return;
        }

        this.playerCanPickUpHealthBuff = false;
        this.healthBuffRingDropped = false;
        this.healthBuffPickupPromptPanel.visible = false;
        this.healthBuffPickupPromptLabel.visible = false;
        this.healthBuffCarrierIcon.destroy();
        this.healthBuffCarrierIcon = null;
        this.healthBuffCarrierSlime = null;

        this.grantUpgrade(UpgradeId.HEALTH_BUFF);
        this.showUpgradeRewardPopup(UpgradeId.HEALTH_BUFF);
    }

    protected updateShieldPickupPrompt(): void {
        if(
            this.shieldPickupSprite === null ||
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.playerCanPickUpShield = false;
            this.shieldPickupPromptPanel.visible = false;
            this.shieldPickupPromptLabel.visible = false;
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        const pickupAABB = new AABB(
            this.shieldPickupSprite.position.clone(),
            Level2.SHIELD_PICKUP_HALF_SIZE.clone()
        );

        this.playerCanPickUpShield = playerAABB.overlapArea(pickupAABB) > 0;
        this.shieldPickupPromptPanel.visible = this.playerCanPickUpShield;
        this.shieldPickupPromptLabel.visible = this.playerCanPickUpShield;
    }

    protected collectShieldPickup(): void {
        if(this.shieldPickupSprite === null){
            return;
        }

        this.playerCanPickUpShield = false;
        this.shieldPickupPromptPanel.visible = false;
        this.shieldPickupPromptLabel.visible = false;
        this.shieldPickupSprite.destroy();
        this.shieldPickupSprite = null;

        this.grantUpgrade(UpgradeId.SHIELD);
        this.showUpgradeRewardPopup(UpgradeId.SHIELD);
    }

    public getLevel2Boss(): Level2Boss {
        return this.level2Boss;
    }

    public getLevel2BossSprite(): MBAnimatedSprite {
        return this.level2BossSprite;
    }

    protected getBossDamageTarget(): MBAnimatedSprite | null {
        return this.level2BossSprite ?? null;
    }

    protected updateBossDefeatVignetteTimer(deltaT: number): void {
        if(this.boss === undefined){
            this.bossDefeatVignetteTimer = 0;
            this.bossDefeatVignetteDelayStarted = false;
            return;
        }

        if(this.boss.isDefeated()){
            this.bossDefeatVignetteDelayStarted = true;
            this.bossDefeatVignetteTimer += deltaT;
            return;
        }

        if(!this.bossDefeatVignetteDelayStarted){
            this.bossDefeatVignetteTimer = 0;
        }
    }

    protected teleportPlayerToBoss(): boolean {
        if(this.player === undefined || this.level2BossSprite === undefined){
            return false;
        }

        this.player.position.copy(this.level2BossSprite.position.clone().add(new Vec2(0, -50)));

        const controller = this.player.ai as PlayerController;
        controller.velocity = Vec2.ZERO;

        return true;
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

    protected buildVorrathLavaPillarBasePoints(): Vec2[] {
        return Level2.VORRATH_LAVA_PILLAR_BASE_POINTS.map(point => {
            if(point.y >= 0){
                return point.clone();
            }

            return this.resolveGroundBasePoint(point.x);
        });
    }

    protected buildArenaWallLavaPillarBasePoints(): Vec2[] {
        return Level2.VORRATH_ARENA_WALL_LAVA_PILLAR_BASE_POINTS.map(point => {
            if(point.y >= 0){
                return point.clone();
            }

            return this.resolveGroundBasePoint(point.x);
        });
    }

    protected resolveGroundBasePoint(x: number): Vec2 {
        if(this.walls === undefined){
            return new Vec2(x, 0);
        }

        const tileSize = this.walls.getTileSize();
        const worldHeight = this.walls.getDimensions().y;
        const samplePoint = new Vec2(x, this.playerSpawn.y);
        const col = this.walls.getColRowAt(samplePoint).x;
        const startRow = Math.max(0, this.walls.getColRowAt(samplePoint).y - 10);

        for(let row = startRow; row < worldHeight; row++){
            if(!this.walls.isTileCollidable(col, row)){
                continue;
            }

            const tileTopY = row * tileSize.y * this.tilemapScale.y;
            return new Vec2(x, tileTopY);
        }

        return new Vec2(x, samplePoint.y);
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

    protected getPlayerDeathDestination(): new (...args: any) => Scene {
        return HubLevel;
    }

    protected showRevivalTotemBossReward(): void {
        if(
            this.revivalTotemGrantedFromBoss ||
            this.revivalTotemRewardShown ||
            MBProgress.hasUpgrade(UpgradeId.REVIVAL_TOTEM_L1)
        ){
            this.revivalTotemGrantedFromBoss = true;
            return;
        }

        this.revivalTotemRewardShown = true;
        this.showUpgradeRewardPopup(UpgradeId.REVIVAL_TOTEM_L1, () => {
            this.grantUpgrade(UpgradeId.REVIVAL_TOTEM_L1);
            this.revivalTotemGrantedFromBoss = true;
        });
    }

    protected updateBossRewardState(): void {
        if(this.level2Boss === undefined || !this.level2Boss.isDefeated()){
            return;
        }

        if(!this.level2BossProgressRecorded){
            MBProgress.defeatBoss(this.level2Boss.id);
            this.level2BossProgressRecorded = true;
        }

        const dyingStillPlaying = this.level2BossSprite !== undefined && this.level2BossSprite.animation.isPlaying(VorrathAnimations.DYING);
        if(dyingStillPlaying){
            return;
        }

        this.showRevivalTotemBossReward();
    }
}
