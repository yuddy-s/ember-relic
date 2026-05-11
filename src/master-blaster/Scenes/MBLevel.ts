import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Input from "../../Wolfie2D/Input/Input";
import CanvasNode from "../../Wolfie2D/Nodes/CanvasNode";
import { TweenableProperties } from "../../Wolfie2D/Nodes/GameNode";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import Button from "../../Wolfie2D/Nodes/UIElements/Button";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import TextInput from "../../Wolfie2D/Nodes/UIElements/TextInput";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import RenderingManager from "../../Wolfie2D/Rendering/RenderingManager";
import ResourceManager from "../../Wolfie2D/ResourceManager/ResourceManager";
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import Timer from "../../Wolfie2D/Timing/Timer";
import Color from "../../Wolfie2D/Utils/Color";
import { EaseFunctionType } from "../../Wolfie2D/Utils/EaseFunctions";
import PlayerController, { PlayerAnimations, PlayerStates, PlayerTweens } from "../Player/PlayerController";
import PlayerWeapon from "../Player/PlayerWeapon";

import { MBEvents } from "../MBEvents";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import MBFactoryManager from "../Factory/MBFactoryManager";
import { BossHandle } from "../Bosses/BossHandle";
import { executeCheatCode } from "../Cheats/MBCheatCodes";
import { MBProgress, UPGRADE_METADATA, UPGRADE_ORDER, UpgradeId } from "../Progress/MBProgress";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";
import { EnemyDamageable } from "../Enemies/EnemyDamageable";
import MainMenu from "./MainMenu";

import Particle from "../../Wolfie2D/Nodes/Graphics/Particle";
import SplashScreen from "./SplashScreen";

/**
 * A const object for the layer names
 */
export const MBLayers = {
    // Optional level background layer
    BACKGROUND: "LEVEL_BG",
    // Optional cave overlay background layer
    CAVE_BACKGROUND: "CAVE_BG",
    // The primary layer
    PRIMARY: "PRIMARY",
    // The UI layer
    UI: "UI",
    PAUSE: "PAUSE"
} as const;

// The layers as a type
export type MBLayer = typeof MBLayers[keyof typeof MBLayers]

type DamageableEnemyBinding = {
    sprite: AnimatedSprite;
    damageable: EnemyDamageable;
};

export type DialoguePage = {
    speaker: string;
    text: string;
};

/**
 * An abstract Master Blaster scene class combining all the things
 * all levels in the game will need.
 */
export default abstract class MBLevel extends Scene {

    /** Overrride the factory manager */
    public add: MBFactoryManager;

    /** The particle system used for the player's weapon */
    protected playerWeaponSystem!: PlayerWeapon
    /** The key for the player's animated sprite */
    protected playerSpriteKey!: string;
    /** The animated sprite that is the player */
    protected player!: AnimatedSprite;
    /** The player's spawn position */
    protected playerSpawn!: Vec2;

    private healthLabel!: Label;
	private healthBar!: Label;
	private healthBarBg!: Label;
    private shieldBar!: Label;
    private shieldBarBg!: Label;
    private bossNameLabel!: Label;
    private bossHealthBar!: Label;
    private bossHealthBarBg!: Label;
    private hudInventorySlots: Array<Label>;
    private hudInventoryIcons: Array<Sprite>;
    private pauseInventorySlots: Array<Button>;
    private pauseInventoryIcons: Array<Sprite>;
    private pauseInventoryPopupPanel!: Rect;
    private pauseInventoryPopupTitle!: Label;
    private pauseInventoryPopupLines: Array<Label>;
    private upgradeRewardOverlay!: Rect;
    private upgradeRewardPanel!: Rect;
    private upgradeRewardTitle!: Label;
    private upgradeRewardLines: Array<Label>;
    private upgradeRewardConfirmButton!: Button;
    private upgradeRewardElements: Array<CanvasNode>;
    private upgradeRewardOpen: boolean;
    private upgradeRewardOnConfirm: (() => void) | null;
    private revivalFlash!: Rect;
    private revivalIcon!: Sprite;
    private revivalEffectTimer: number;
    private revivalInProgress: boolean;
    private dialogueOverlay!: Rect;
    private dialoguePanel!: Rect;
    private dialogueSpeakerLabel!: Label;
    private dialogueLines: Array<Label>;
    private dialogueAdvanceLabel!: Label;
    private dialogueElements: Array<CanvasNode>;
    private dialogueOpen: boolean;
    private dialoguePages: Array<DialoguePage>;
    private dialoguePageIndex: number;
    private dialogueOnComplete: (() => void) | null;
    private currentSelectedUpgradeId: UpgradeId | null;
    protected boss?: BossHandle;


    /** The end of level stuff */

    protected levelEndPosition!: Vec2;
    protected levelEndHalfSize!: Vec2;

    protected levelEndArea!: Rect;
    protected travelPortalDestination!: new (...args: any) => Scene;
    protected levelEndTimer!: Timer;
    protected levelEndLabel!: Label;
    protected levelEndPromptPanel!: Rect;
    protected levelEndPromptLabel!: Label;
    protected playerCanInteractWithLevelEnd: boolean;
    protected levelEndTransitionStarted: boolean;
    protected deathTransitionStarted: boolean;
    protected deathLabel!: Label;

    // Level end transition timer and graphic
    protected levelTransitionTimer!: Timer;
    protected levelTransitionScreen!: Rect;

    /** The keys to the tilemap and different tilemap layers */
    protected tilemapKey!: string;
    protected destructibleLayerKey?: string;
    protected damagingLayerKey?: string;
    protected wallsLayerKey!: string;
    /** Optional scenic level background image key */
    protected backgroundImageKey?: string;
    /** Parallax amount for the optional scenic background image */
    protected backgroundParallax: Vec2;
    /** Depth for the optional scenic background image layer */
    protected backgroundLayerDepth: number;
    /** The scale for the tilemap */
    protected tilemapScale!: Vec2;
    /** The destrubtable layer of the tilemap */
    protected destructable?: OrthogonalTilemap;
    /** An optional tilemap layer that damages the player on contact */
    protected damaging?: OrthogonalTilemap;
    /** The wall layer of the tilemap */
    protected walls!: OrthogonalTilemap;

    /** Out-of-bounds kill floor for instant death */
    protected deathY!: number;
    protected deathTriggered: boolean;
    protected shieldCharges: number;
    protected bossDamageCooldownTimer: number;
    protected bossDamageCooldownDuration: number;
    protected damagingTileDamage: number;
    protected damagingTileKnockbackSpeed: number;
    private damageableEnemies: Array<DamageableEnemyBinding>;

    /** Sound and music */
    protected levelMusicKey!: string;
    protected jumpAudioKey!: string;
    protected dashAudioKey!: string;
    protected attackAudioKey!: string;
    protected damageAudioKey!: string;
    protected tileDestroyedAudioKey!: string;
    protected dyingAudioKey!: string;

    protected pauseMenuOpen: boolean;
    protected pauseControlsOpen: boolean;

    private pauseControlsButton!: Button;
    private pauseControlsPanel!: Rect;
    private pauseCheatInput!: TextInput;
    private pauseControlsElements: Array<CanvasNode>;
    private pauseMenuElements: Array<CanvasNode>;

    protected static readonly PAUSE_CONTROLS: Array<[string, string]> = [
        ["A / D", "Move Left / Right"],
        ["W / Space", "Jump"],
        ["Shift", "Dash"],
        ["Left Click", "Attack"],
        ["E", "Interact"],
        ["ESC", "Pause / Unpause"]
    ];

    protected static readonly LANTERN_ICON_KEY = "UPGRADE_ICON_LANTERN";
    protected static readonly LANTERN_ICON_PATH = "game_assets/art/upgrades/lantern.png";
    protected static readonly FUR_COAT_ICON_KEY = "UPGRADE_ICON_FUR_COAT";
    protected static readonly FUR_COAT_ICON_PATH = "game_assets/art/upgrades/furcoat.png";
    protected static readonly DOUBLE_JUMP_ICON_KEY = "UPGRADE_ICON_DOUBLE_JUMP";
    protected static readonly DOUBLE_JUMP_ICON_PATH = "game_assets/art/upgrades/doubleJump.png";
    protected static readonly REVIVAL_ICON_KEY = "UPGRADE_ICON_REVIVAL";
    protected static readonly REVIVAL_ICON_PATH = "game_assets/art/upgrades/revival.png";
    protected static readonly UPGRADED_BOOTS_ICON_KEY = "UPGRADE_ICON_UPGRADED_BOOTS";
    protected static readonly UPGRADED_BOOTS_ICON_PATH = "game_assets/art/upgrades/speedUp.png";
    protected static readonly ICE_PICK_ICON_KEY = "UPGRADE_ICON_ICE_PICK";
    protected static readonly ICE_PICK_ICON_PATH = "game_assets/art/upgrades/icePick.png";
    protected static readonly SHATTERDIVE_ICON_KEY = "UPGRADE_ICON_SHATTERDIVE";
    protected static readonly SHATTERDIVE_ICON_PATH = "game_assets/art/upgrades/shatterDive.png";
    protected static readonly HEALTH_BUFF_ICON_KEY = "UPGRADE_ICON_HEALTH_BUFF";
    protected static readonly HEALTH_BUFF_ICON_PATH = "game_assets/art/upgrades/hpUp.png";
    protected static readonly UPGRADED_SWORD_ICON_KEY = "UPGRADE_ICON_UPGRADED_SWORD";
    protected static readonly UPGRADED_SWORD_ICON_PATH = "game_assets/art/upgrades/dmgUp.png";
    protected static readonly SHIELD_ICON_KEY = "UPGRADE_ICON_SHIELD";
    protected static readonly SHIELD_ICON_PATH = "game_assets/art/upgrades/shield.png";
    protected static readonly SHIELD_BROKEN_ICON_KEY = "UPGRADE_ICON_SHIELD_BROKEN";
    protected static readonly SHIELD_BROKEN_ICON_PATH = "game_assets/art/upgrades/shieldBroken.png";
    protected static readonly ASHEN_SEAL_FRAGMENT_ICON_KEY = "UPGRADE_ICON_ASHEN_SEAL_FRAGMENT";
    protected static readonly ASHEN_SEAL_FRAGMENT_ICON_PATH = "game_assets/art/upgrades/fragments.png";

    
    // HUD TUNING"
    // Change these values to adjust the in-game health bar and quick-slot row.
    protected static readonly HUD_TUNING = {
        left: 18,
        healthBarTop: 16,
        healthBarWidth: 300,
        healthBarHeight: 16,
        shieldBarGap: 10,
        shieldBarWidth: 120,
        inventoryOffsetY: 30,
        slotSize: 20,
        slotGap: 35,
        iconSize: 18,
        healthBarRadius: 1,
        slotRadius: 6
    };

    protected static readonly BOSS_HUD_TUNING = {
        nameCenterX: 600,
        nameCenterY: 730,
        nameWidth: 360,
        nameHeight: 24,
        barCenterX: 600,
        barCenterY: 764,
        barWidth: 360,
        barHeight: 16,
        barRadius: 4
    };

    protected static readonly PLAYER_HITBOX_TUNING = {
        halfWidth: 11,
        halfHeight: 14,
        offsetY: 2
    };

    protected static readonly LEVEL_END_PROMPT_TUNING = {
        rangePaddingX: 36,
        rangePaddingY: 28,
        screenCenterX: 600,
        screenCenterY: 724
    };

    protected static readonly HEALTH_BAR_FILL_COLOR = new Color(88, 35, 33, 1);
    protected static readonly HEALTH_BAR_TRACK_COLOR = new Color(38, 20, 18, 0.95);
    protected static readonly HEALTH_BAR_BORDER_COLOR = new Color(183, 146, 82, 1);
    protected static readonly SHIELD_BAR_FILL_COLOR = new Color(126, 132, 142, 1);
    protected static readonly SHIELD_BAR_TRACK_COLOR = new Color(28, 30, 35, 0.95);
    protected static readonly SHIELD_MAX_CHARGES = 5;
    protected static readonly SHIELD_BLOCK_INVULNERABILITY = 0.8;
    protected static readonly PLAYER_BASE_MAX_HEALTH = 100;
    protected static readonly HEALTH_BUFF_MAX_HEALTH_BONUS = 40;
    protected static readonly REVIVAL_EFFECT_DURATION = 1.35;
    protected static readonly REVIVAL_FLASH_DURATION = 0.35;
    protected static readonly REVIVAL_INVULNERABILITY = 1.5;

    // PAUSE TUNING
    // Change these values to adjust the pause menu layout without digging through UI creation code.
    protected static readonly PAUSE_TUNING = {
        titleCenterX: 600,
        titleY: 100,
        buttonCenterX: 600,
        continueY: 270,
        controlsY: 365,
        quitY: 460,
        inventoryCenterX: 170,
        inventoryPanelCenterY: 400,
        inventoryPanelWidth: 240,
        inventoryPanelHeight: 700,
        inventoryTitleY: 92,
        inventorySubtitleY: 126,
        inventorySlotStartY: 172,
        inventorySlotStepY: 50,
        inventorySlotSize: 70,
        inventoryIconSize: 15,
        popupCenterX: 600,
        popupCenterY: 350,
        popupWidth: 400,
        popupHeight: 220,
        popupTitleY: 282,
        popupLineStartY: 330,
        popupLineStepY: 26,
        cheatTitleY: 600,
        cheatInputY: 655
    };

    public constructor(viewport: Viewport, sceneManager: SceneManager, renderingManager: RenderingManager, options: Record<string, any>) {
        super(viewport, sceneManager, renderingManager, {...options, physics: {
            // TODO configure the collision groups and collision map
                groupNames: [MBPhysicsGroups.GROUND, MBPhysicsGroups.PLAYER, MBPhysicsGroups.PLAYER_WEAPON, MBPhysicsGroups.DESTRUCTABLE, MBPhysicsGroups.BOSS, MBPhysicsGroups.NPC],
                collisions: [
                    //        G  P  W  D  B  N
                    /* G */  [0, 1, 1, 0, 1, 1],
                    /* P */  [1, 0, 0, 1, 1, 1],
                    /* W */  [1, 0, 0, 1, 1, 0],
                    /* D */  [0, 1, 1, 0, 0, 0],
                    /* B */  [1, 1, 1, 0, 0, 0],
                    /* N */  [1, 1, 0, 0, 0, 0]
                ]
         }});
        this.add = new MBFactoryManager(this, this.tilemaps);
        this.backgroundParallax = new Vec2(0.35, 1);
        this.backgroundLayerDepth = -10;
        this.damagingLayerKey = "Damaging";
        this.deathTriggered = false;
        this.pauseMenuOpen = false;
        this.pauseControlsOpen = false;
        this.pauseControlsElements = new Array();
        this.pauseMenuElements = new Array();
        this.hudInventorySlots = new Array();
        this.hudInventoryIcons = new Array();
        this.pauseInventorySlots = new Array();
        this.pauseInventoryIcons = new Array();
        this.pauseInventoryPopupLines = new Array();
        this.upgradeRewardLines = new Array();
        this.upgradeRewardElements = new Array();
        this.upgradeRewardOpen = false;
        this.upgradeRewardOnConfirm = null;
        this.revivalEffectTimer = 0;
        this.revivalInProgress = false;
        this.dialogueLines = new Array();
        this.dialogueElements = new Array();
        this.dialogueOpen = false;
        this.dialoguePages = new Array();
        this.dialoguePageIndex = 0;
        this.dialogueOnComplete = null;
        this.currentSelectedUpgradeId = null;
        this.boss = undefined;
        this.bossDamageCooldownTimer = 0;
        this.bossDamageCooldownDuration = 0.2;
        this.shieldCharges = 0;
        this.damagingTileDamage = 5;
        this.damagingTileKnockbackSpeed = 170;
        this.damageableEnemies = new Array();
        this.playerCanInteractWithLevelEnd = false;
        this.levelEndTransitionStarted = false;
        this.deathTransitionStarted = false;
    }

    public initScene(init: Record<string, any>): void {
        MBProgress.loadFromInitData(init);
    }

    public startScene(): void {
        this.deathTriggered = false;
        this.bossDamageCooldownTimer = 0;
        this.playerCanInteractWithLevelEnd = false;
        this.levelEndTransitionStarted = false;
        this.deathTransitionStarted = false;
        this.revivalEffectTimer = 0;
        this.revivalInProgress = false;

        // Initialize the layers
        this.initLayers();

        // Initialize optional scenic background image
        this.initializeBackground();

        // Initialize the tilemaps
        this.initializeTilemap();

        // Initialize the sprite and particle system for the players weapon 
        this.initializeWeaponSystem();

        // Initialize the player 
        this.initializePlayer(this.playerSpriteKey);
        this.initializeShieldState();

        // Initialize the level boss, if this scene has one
        this.initializeBoss();

        // Initialize the viewport - this must come after the player has been initialized
        this.initializeViewport();
        this.initializeUI();
        this.initializePauseMenuUI();
        this.subscribeToEvents();
        

        // Initialize the ends of the levels - must be initialized after the primary layer has been added
        this.initializeLevelEnds();

        this.levelTransitionTimer = new Timer(500);
        this.levelEndTimer = new Timer(3000, () => {
            // After the level end timer ends, fade to black and then go to the next scene
            this.levelTransitionScreen.tweens.play("fadeIn");
        });

        // Initially disable player movement
        Input.disableInput();

        // Start the black screen fade out
        this.levelTransitionScreen.tweens.play("fadeOut");

        // Start playing the level music for the game level
        this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: this.levelMusicKey, loop: true, holdReference: true});      

        // Assign physics groups
        this.player.setGroup(MBPhysicsGroups.PLAYER);
        this.walls.setGroup(MBPhysicsGroups.GROUND);
        if(this.destructable !== undefined){
            this.destructable.setGroup(MBPhysicsGroups.DESTRUCTABLE);
        }
        
        // Set up particle groups and triggers
        let particles = this.playerWeaponSystem.getPool();
        for (let particle of particles) {
            particle.setGroup(MBPhysicsGroups.PLAYER_WEAPON);
        }

        // The destructible layer should trigger when hit by player weapon particles
        if(this.destructable !== undefined){
            this.destructable.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.PARTICLE_HIT, "");
        }

    }

    /* Update method for the scene */

    public updateScene(deltaT: number) {
        this.bossDamageCooldownTimer = Math.max(0, this.bossDamageCooldownTimer - deltaT);
        this.handlePauseInput();

        // Handle all game events
        while (this.receiver.hasNextEvent()) {
            this.handleEvent(this.receiver.getNextEvent());
        }

        this.refreshBossUI();
        this.updateLevelEndPrompt();
        this.updateRevivalEffect(deltaT);

        if(!this.pauseMenuOpen && !this.deathTransitionStarted && !this.revivalInProgress){
            this.handleDamagingTileContact();
            this.handleOutOfBoundsDeath();
        }
    }

    public getDyingAudioKey() {
        return this.dyingAudioKey;
    }

    protected handlePauseInput(): void {
        if(this.revivalInProgress){
            return;
        }

        if(this.dialogueOpen){
            if(Input.isKeyJustPressed("enter") || Input.isMouseJustPressed(0)){
                this.advanceDialogue();
            }
            return;
        }

        if(this.upgradeRewardOpen){
            if(Input.isKeyJustPressed("enter") || Input.isKeyJustPressed("space")){
                this.confirmUpgradeRewardPopup();
            }
            return;
        }

        if(Input.isKeyJustPressed("escape")){
            this.setPauseMenuOpen(!this.pauseMenuOpen);
            return;
        }

        if(this.pauseMenuOpen && this.pauseCheatInput.focused && Input.isKeyJustPressed("enter")){
            void this.executePauseCheatCode(this.pauseCheatInput.text);
        }

        if(!this.pauseMenuOpen && this.playerCanInteractWithLevelEnd && Input.isKeyJustPressed("e")){
            this.handleEnteredLevelEnd();
        }
    }

    protected setPauseMenuOpen(paused: boolean): void {
        if(this.pauseMenuOpen === paused){
            return;
        }

        this.pauseMenuOpen = paused;

        const pauseLayer = this.getLayer(MBLayers.PAUSE);
        if(paused){
            this.setPauseInventorySelection(null);
            this.refreshInventoryUI();
            pauseLayer.enable();
            this.setGameplayPaused(true);
        } 
        else {
            this.pauseCheatInput.focused = false;
            this.showPauseControls(false);
            pauseLayer.disable();
            this.setGameplayPaused(false);
        }
    }

    protected setGameplayPaused(paused: boolean): void {
        this.getLayer(MBLayers.PRIMARY).setPaused(paused);

        if(this.parallaxLayers.has(MBLayers.BACKGROUND)){
            this.getLayer(MBLayers.BACKGROUND).setPaused(paused);
        }

        if(this.player !== undefined){
            this.player.setAIActive(!paused, {});

            if(paused){
                this.player.freeze();
                this.player.disablePhysics();
            }
            else {
                this.player.unfreeze();
                this.player.enablePhysics();
            }
        }

        if(this.levelEndArea !== undefined){
            if(paused){
                this.levelEndArea.disablePhysics();
            }
            else {
                this.levelEndArea.enablePhysics();
            }
        }

         if(this.playerWeaponSystem !== undefined){
            if(paused){
                this.playerWeaponSystem.pause();
            } else {
                this.playerWeaponSystem.resume();
            }
        }

        for(const particle of this.playerWeaponSystem.getPool()){
            if(!particle.inUse){
                continue;
            }

            if(paused){
                particle.freeze();
                particle.disablePhysics();
            } else {
                particle.unfreeze();
                particle.enablePhysics();
            }
        }

        if(this.levelEndTimer !== undefined){
            if(paused && !this.levelEndTimer.isStopped()){
                this.levelEndTimer.pause();
            } else if(!paused && this.levelEndTimer.isPaused()){
                this.levelEndTimer.resume();
            }
        }

        if(this.levelTransitionTimer !== undefined){
            if(paused && !this.levelTransitionTimer.isStopped()){
                this.levelTransitionTimer.pause();
            } else if(!paused && this.levelTransitionTimer.isPaused()){
                this.levelTransitionTimer.resume();
            }
        }

    }

    protected showPauseControls(visible: boolean): void {
        this.pauseControlsOpen = visible;
        this.pauseCheatInput.focused = false;
        this.currentSelectedUpgradeId = null;

        for(const element of this.pauseControlsElements){
            element.visible = visible;
        }

        for(const element of this.pauseMenuElements){
            element.visible = !visible;
        }

        this.refreshPauseInventoryList();
        this.refreshPauseInventoryPopup();
    }

    protected async executePauseCheatCode(rawCode: string): Promise<void> {
        const result = executeCheatCode(rawCode, {
            boss: this.boss,
            refreshCheatDrivenUI: () => this.refreshInventoryUI(),
            resolveProgressTargetScene: (targetSceneId: ProgressTargetSceneId) => this.resolveProgressTargetScene(targetSceneId),
            setPauseMenuOpen: (paused: boolean) => this.setPauseMenuOpen(paused),
            warpToScene: (scene, init) => this.warpToScene(scene, init),
            teleportPlayerToBoss: () => this.teleportPlayerToBoss(),
            toggleFlyMode: () => this.toggleFlyMode()

        });

        if(result.success){
            this.pauseCheatInput.text = "";
        }
    }

    protected resolveProgressTargetScene(_targetSceneId: ProgressTargetSceneId): (new (...args: any) => Scene) | null {
        return null;
    }

    protected getPlayerDeathDestination(): new (...args: any) => Scene {
        return SplashScreen;
    }

    protected getPlayerDeathInitData(): Record<string, any> {
        return MBProgress.toInitData();
    }

    protected warpToScene(scene: new (...args: any) => Scene, init?: Record<string, any>): void {
        this.emitter.fireEvent(GameEventType.STOP_SOUND, { key: this.levelMusicKey });
        this.sceneManager.changeToScene(scene, init);
    }

    protected toggleFlyMode(): boolean {
        if (this.player === undefined) {
            return false;
        }

        const controller = this.player.ai as PlayerController;
        return controller.toggleFlyMode()
    }

    protected teleportPlayerToBoss(): boolean {
        return false;
    }

    /**
     * Handle game events. 
     * @param event the game event
     */
    protected handleEvent(event: GameEvent): void {
        switch (event.type) {
            case MBEvents.PLAYER_ENTERED_LEVEL_END: {
                this.handleEnteredLevelEnd();
                break;
            }
            // When the level starts, reenable user input
            case MBEvents.LEVEL_START: {
                Input.enableInput();
                break;
            }

            case MBEvents.PARTICLE_HIT: {
                this.handleParticleHit(event.data.get("node"));
                break;
            }
            case MBEvents.BOSS_PARTICLE_HIT: {
                this.handleBossParticleHit(event.data.get("node"));
                break;
            }
            case MBEvents.ENEMY_PARTICLE_HIT: {
                this.handleEnemyParticleHit(event.data.get("node"));
                break;
            }

            // When the level ends, change the scene to the next level
            case MBEvents.LEVEL_END: {
                this.emitter.fireEvent(GameEventType.STOP_SOUND, { key: this.levelMusicKey })
                this.sceneManager.changeToScene(this.travelPortalDestination, MBProgress.toInitData());
                break;
            }
            case MBEvents.HEALTH_CHANGE: {
                this.handleHealthChange(event.data.get("curhp"), event.data.get("maxhp"));
                break;
            }
            case MBEvents.PLAYER_DEAD: {
                if(!this.tryStartRevival()){
                    this.startDeathTransition();
                }
                break;
            }
            case MBEvents.PLAYER_RESPAWN: {
                this.emitter.fireEvent(GameEventType.STOP_SOUND, { key: this.levelMusicKey });
                this.sceneManager.changeToScene(this.getPlayerDeathDestination(), this.getPlayerDeathInitData());
                break;
            }
            // Default: Throw an error! No unhandled events allowed.
            default: {
                throw new Error(`Unhandled event caught in scene with type ${event.type}`)
            }
        }
    }

    /* Handlers for the different events the scene is subscribed to */

    /**
     * Handle particle hit events
     * @param particleId the id of the particle
     */
    protected handleParticleHit(particleId: number): void {
        if(this.destructable === undefined){
            return;
        }

        let particles = this.playerWeaponSystem.getPool();

        let particle = particles.find(particle => particle.id === particleId);
        if (particle !== undefined) {
            // ignore trigger events from particles that are no longer active.
            if (!particle.inUse) {
                return;
            }

            // Get the destructable tilemap
            let tilemap = this.destructable;

            let min = new Vec2(particle.sweptRect.left, particle.sweptRect.top);
            let max = new Vec2(particle.sweptRect.right, particle.sweptRect.bottom);

            // Convert the min/max x/y to the min and max row/col in the tilemap array
            let minIndex = tilemap.getColRowAt(min);
            let maxIndex = tilemap.getColRowAt(max);

            // Loop over all possible tiles the particle could be colliding with 
            for(let col = minIndex.x; col <= maxIndex.x; col++){
                for(let row = minIndex.y; row <= maxIndex.y; row++){
                    // If the tile is collideable -> check if this particle is colliding with the tile
                    if(tilemap.isTileCollidable(col, row) && this.particleHitTile(tilemap, particle, col, row)){
                        this.emitter.fireEvent(GameEventType.PLAY_SOUND, { key: this.tileDestroyedAudioKey, loop: false, holdReference: false });

                        // destroy tile and consume  particle so it doesn't trigger repeatedly.
                        tilemap.setTileAtRowCol(new Vec2(col, row), 0);
                        particle.setParticleInactive();
                        particle.vel = Vec2.ZERO;
                        return;
                    }
                }
            }

            // if we got a trigger event but didn't find a tile match, still consume this particle
            // to prevent continuous trigger spam from one projectile.
            particle.setParticleInactive();
            particle.vel = Vec2.ZERO;
        }
    }

    /**
     * Checks if a particle hit the tile at the (col, row) coordinates in the tilemap.
     * 
     * @param tilemap the tilemap
     * @param particle the particle
     * @param col the column the 
     * @param row the row 
     * @returns true of the particle hit the tile; false otherwise
     */
    protected particleHitTile(tilemap: OrthogonalTilemap, particle: Particle, col: number, row: number): boolean {
        // Get the tile size in world space (physics does not use camera zoom)
        let tileSize = tilemap.getTileSize();
        
        // Calculate the tile's world position (center)
        let tilePosX = col * tileSize.x + tileSize.x / 2;
        let tilePosY = row * tileSize.y + tileSize.y / 2;
        let tileCenter = new Vec2(tilePosX, tilePosY);
        
        // Create AABB for the tile
        let tileHalfSize = tileSize.scaled(0.5);
        let tileAABB = new AABB(tileCenter, tileHalfSize);
        
        // Use sweptRect (not boundary) to match the physics system's collision test for fast particles.
        return particle.sweptRect.overlapArea(tileAABB) > 0;
    }

    /**
     * Handle the event when the player enters the level end area.
     */
    protected handleEnteredLevelEnd(): void {
        if(this.levelEndTransitionStarted){
            return;
        }

        this.levelEndTransitionStarted = true;
        this.playerCanInteractWithLevelEnd = false;
        this.levelEndPromptPanel.visible = false;
        this.levelEndPromptLabel.visible = false;
        Input.disableInput();

        if(this.player !== undefined){
            this.player.freeze();
            if(this.player.hasPhysics){
                this.player.disablePhysics();
            }
        }

        this.levelTransitionScreen.tweens.play("fadeIn");
    }

    protected tryStartRevival(): boolean {
        if(this.revivalInProgress || this.deathTransitionStarted || this.player === undefined){
            return false;
        }

        const controller = this.player.ai as PlayerController | undefined;
        if(controller === undefined){
            return false;
        }

        const revivalTotem = this.consumeAvailableRevivalTotem();
        if(revivalTotem === null){
            return false;
        }

        this.revivalInProgress = true;
        this.revivalEffectTimer = 0;
        this.playerCanInteractWithLevelEnd = false;
        Input.disableInput();
        this.setPauseMenuOpen(false);

        if(this.levelEndPromptPanel !== undefined){
            this.levelEndPromptPanel.visible = false;
        }
        if(this.levelEndPromptLabel !== undefined){
            this.levelEndPromptLabel.visible = false;
        }

        const reviveAtSpawn = this.deathTriggered;
        this.deathTriggered = false;
        this.restorePlayerAfterRevival(controller, reviveAtSpawn);
        this.startRevivalEffect();

        return true;
    }

    protected consumeAvailableRevivalTotem(): UpgradeId | null {
        if(MBProgress.consumeUpgrade(UpgradeId.REVIVAL_TOTEM_L1)){
            return UpgradeId.REVIVAL_TOTEM_L1;
        }

        if(MBProgress.consumeUpgrade(UpgradeId.REVIVAL_TOTEM_L3)){
            return UpgradeId.REVIVAL_TOTEM_L3;
        }

        return null;
    }

    protected restorePlayerAfterRevival(controller: PlayerController, reviveAtSpawn: boolean): void {
        this.player.visible = true;
        this.player.alpha = 1;
        this.player.rotation = 0;
        this.player.position.copy(reviveAtSpawn ? this.playerSpawn : this.player.position);
        this.player.unfreeze();
        if(this.player.hasPhysics){
            this.player.enablePhysics();
        }
        this.player.setAIActive(true, {});

        controller.velocity = Vec2.ZERO;
        controller.health = controller.maxHealth;
        controller.resetWallLatchSideLimit();
        controller.grantInvulnerability(MBLevel.REVIVAL_INVULNERABILITY);
        controller.changeState(PlayerStates.IDLE);

        this.restoreShieldCharges();
    }

    protected restoreShieldCharges(): void {
        this.shieldCharges = MBProgress.hasUpgrade(UpgradeId.SHIELD) ? MBLevel.SHIELD_MAX_CHARGES : 0;
        this.refreshShieldUI();
        this.refreshInventoryUI();
    }

    protected startRevivalEffect(): void {
        if(this.revivalFlash !== undefined){
            this.revivalFlash.visible = true;
            this.revivalFlash.alpha = 1;
        }

        if(this.revivalIcon !== undefined){
            this.revivalIcon.visible = true;
            this.revivalIcon.alpha = 0;
        }

        if(this.player !== undefined){
            this.player.freeze();
            if(this.player.hasPhysics){
                this.player.disablePhysics();
            }
            this.player.setAIActive(false, {});
        }
    }

    protected updateRevivalEffect(deltaT: number): void {
        if(!this.revivalInProgress){
            return;
        }

        this.revivalEffectTimer += deltaT;
        const effectProgress = Math.min(1, this.revivalEffectTimer / MBLevel.REVIVAL_EFFECT_DURATION);
        const flashProgress = Math.min(1, this.revivalEffectTimer / MBLevel.REVIVAL_FLASH_DURATION);

        if(this.revivalFlash !== undefined){
            this.revivalFlash.alpha = 1 - flashProgress;
        }

        if(this.revivalIcon !== undefined){
            const fadePortion = 0.35;
            let iconAlpha = 1;
            if(effectProgress < fadePortion){
                iconAlpha = effectProgress / fadePortion;
            } else if(effectProgress > 1 - fadePortion){
                iconAlpha = (1 - effectProgress) / fadePortion;
            }

            this.revivalIcon.alpha = Math.max(0, Math.min(1, iconAlpha));
            const pulse = 0.68 + Math.sin(effectProgress * Math.PI) * 0.08;
            this.revivalIcon.scale.set(pulse, pulse);
        }

        if(this.revivalEffectTimer >= MBLevel.REVIVAL_EFFECT_DURATION){
            this.completeRevivalEffect();
        }
    }

    protected completeRevivalEffect(): void {
        this.revivalInProgress = false;
        this.revivalEffectTimer = 0;

        if(this.revivalFlash !== undefined){
            this.revivalFlash.visible = false;
            this.revivalFlash.alpha = 0;
        }

        if(this.revivalIcon !== undefined){
            this.revivalIcon.visible = false;
            this.revivalIcon.alpha = 0;
        }

        if(this.player !== undefined){
            this.player.unfreeze();
            if(this.player.hasPhysics){
                this.player.enablePhysics();
            }
            this.player.setAIActive(true, {});
        }

        Input.enableInput();
    }

    protected startDeathTransition(): void {
        if(this.deathTransitionStarted){
            return;
        }

        this.deathTransitionStarted = true;
        this.playerCanInteractWithLevelEnd = false;
        Input.disableInput();
        this.setPauseMenuOpen(false);

        if(this.levelEndPromptPanel !== undefined){
            this.levelEndPromptPanel.visible = false;
        }
        if(this.levelEndPromptLabel !== undefined){
            this.levelEndPromptLabel.visible = false;
        }

        if(this.player !== undefined){
            this.player.freeze();
            if(this.player.hasPhysics){
                this.player.disablePhysics();
            }
        }

        this.levelTransitionScreen.color = Color.BLACK;
        this.levelTransitionScreen.alpha = 0;
        this.levelTransitionScreen.visible = true;
        this.deathLabel.alpha = 0;
        this.deathLabel.visible = true;
        this.levelTransitionScreen.tweens.play("deathFadeIn");
        this.deathLabel.tweens.play("deathFadeIn");
    }

    protected updateLevelEndPrompt(): void {
        if(
            this.levelEndArea === undefined ||
            this.player === undefined ||
            !this.levelEndArea.hasPhysics ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.upgradeRewardOpen ||
            this.dialogueOpen ||
            this.levelEndTransitionStarted ||
            this.deathTransitionStarted
        ){
            this.playerCanInteractWithLevelEnd = false;
            if(this.levelEndPromptPanel !== undefined){
                this.levelEndPromptPanel.visible = false;
            }
            if(this.levelEndPromptLabel !== undefined){
                this.levelEndPromptLabel.visible = false;
            }
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        const levelEndAABB = this.levelEndArea.collisionShape.getBoundingRect();
        const promptTuning = MBLevel.LEVEL_END_PROMPT_TUNING;
        const promptRangeAABB = new AABB(
            levelEndAABB.center.clone(),
            new Vec2(
                levelEndAABB.halfSize.x + promptTuning.rangePaddingX,
                levelEndAABB.halfSize.y + promptTuning.rangePaddingY
            )
        );
        this.playerCanInteractWithLevelEnd = playerAABB.overlapArea(promptRangeAABB) > 0;

        this.levelEndPromptPanel.visible = this.playerCanInteractWithLevelEnd;
        this.levelEndPromptLabel.visible = this.playerCanInteractWithLevelEnd;
    }
    /**
     * This is the same healthbar found in The Yellow Submarine. I've adapted it slightly to account for the zoom factor. Other than that, the
     * code is basically the same.
     * 
     * @param currentHealth the current health of the player
     * @param maxHealth the maximum health of the player
     */
    protected handleHealthChange(currentHealth: number, maxHealth: number): void {
        this.updateHealthBarBounds(maxHealth);

        const frameInset = 2;
        const fillHeight = Math.max(this.healthBarBg.size.y - frameInset, 2);
        const maxFillWidth = Math.max(this.healthBarBg.size.x - frameInset, 1);
        const clampedHealth = Math.max(0, Math.min(currentHealth, maxHealth));
        const fillWidth = maxHealth > 0 ? (maxFillWidth * clampedHealth) / maxHealth : 0;
        const zoom = this.getViewScale();
        const fillLeft = this.healthBarBg.position.x - maxFillWidth / (2 * zoom);

        this.healthBar.size.set(fillWidth, fillHeight);
        this.healthBar.position.set(fillLeft + fillWidth / (2 * zoom), this.healthBarBg.position.y);

        this.healthBar.backgroundColor = MBLevel.HEALTH_BAR_FILL_COLOR;
    }

    protected grantUpgrade(upgradeId: UpgradeId, refreshUI: boolean = true): void {
        const granted = MBProgress.grantUpgrade(upgradeId);

        if(granted){
            this.applyGrantedUpgradeEffects(upgradeId);
        }

        if(refreshUI){
            this.refreshInventoryUI();
        }
    }

    public modifyIncomingPlayerDamage(amount: number, damageType: string = "generic"): number {
        if(this.consumeShieldCharge(amount, damageType)){
            return 0;
        }

        return amount;
    }

    public isPlayerDamageDisabled(): boolean {
        return MBProgress.isGodModeEnabled();
    }

    protected initializeShieldState(): void {
        this.shieldCharges = MBProgress.hasUpgrade(UpgradeId.SHIELD) ? MBLevel.SHIELD_MAX_CHARGES : 0;
    }

    protected consumeShieldCharge(amount: number, _damageType: string = "generic"): boolean {
        if(amount <= 0 || !MBProgress.hasUpgrade(UpgradeId.SHIELD) || this.shieldCharges <= 0){
            return false;
        }

        this.shieldCharges = Math.max(0, this.shieldCharges - 1);

        if(this.player !== undefined){
            const controller = this.player.ai as PlayerController | undefined;
            controller?.grantInvulnerability(MBLevel.SHIELD_BLOCK_INVULNERABILITY);
        }

        this.refreshShieldUI();
        this.refreshInventoryUI();
        return true;
    }

    protected applyFurCoatMountainDamageReduction(amount: number, damageType: string = "generic", attackDamageMultiplier: number = 0.35): number {
        if(!MBProgress.hasUpgrade(UpgradeId.FUR_COAT)){
            return amount;
        }

        if(damageType === "environment_tick"){
            return 0;
        }

        return amount * attackDamageMultiplier;
    }

    protected getEssentialHudUpgrades(): Array<UpgradeId | null> {
        return MBProgress.getEssentialHudUpgrades();
    }

    protected getOwnedForPauseList(): Array<UpgradeId> {
        return MBProgress.getOwnedForPauseList();
    }

    protected refreshInventoryUI(): void {
        if(this.hudInventorySlots.length > 0){
            this.refreshHudInventorySlots();
        }

        if(this.pauseInventorySlots.length > 0){
            this.refreshPauseInventoryList();
        }

        if(this.pauseInventoryPopupLines.length > 0){
            this.refreshPauseInventoryPopup();
        }
    }

    protected updateHealthBarBounds(maxHealth: number): void {
        if(this.healthBarBg === undefined || this.healthBar === undefined){
            return;
        }

        const hud = MBLevel.HUD_TUNING;
        const zoom = this.getViewScale();
        const maxHealthRatio = Math.max(1, maxHealth) / MBLevel.PLAYER_BASE_MAX_HEALTH;
        const healthBarWidth = Math.round(hud.healthBarWidth * maxHealthRatio);
        const healthBarHeight = hud.healthBarHeight;
        const healthBarCenterX = (hud.left + healthBarWidth / 2) / zoom;
        const healthBarCenterY = (hud.healthBarTop + healthBarHeight / 2) / zoom;

        this.healthBarBg.size.set(healthBarWidth, healthBarHeight);
        this.healthBarBg.position.set(healthBarCenterX, healthBarCenterY);
        this.healthBar.position.y = healthBarCenterY;
        this.updateShieldBarBounds(healthBarWidth, healthBarHeight);
    }

    protected updateShieldBarBounds(healthBarWidth: number, healthBarHeight: number): void {
        if(this.shieldBarBg === undefined || this.shieldBar === undefined){
            return;
        }

        const hud = MBLevel.HUD_TUNING;
        const zoom = this.getViewScale();
        const shieldBarWidth = hud.shieldBarWidth;
        const shieldBarCenterX = (hud.left + healthBarWidth + hud.shieldBarGap + shieldBarWidth / 2) / zoom;
        const shieldBarCenterY = (hud.healthBarTop + healthBarHeight / 2) / zoom;

        this.shieldBarBg.size.set(shieldBarWidth, healthBarHeight);
        this.shieldBarBg.position.set(shieldBarCenterX, shieldBarCenterY);
        this.shieldBar.position.y = shieldBarCenterY;
        this.refreshShieldUI();
    }

    protected getResolvedPlayerMaxHealth(): number {
        let maxHealth = MBLevel.PLAYER_BASE_MAX_HEALTH;

        if(MBProgress.hasUpgrade(UpgradeId.HEALTH_BUFF)){
            maxHealth += MBLevel.HEALTH_BUFF_MAX_HEALTH_BONUS;
        }

        return maxHealth;
    }

    protected applyPlayerProgressEffects(fillToMax: boolean = false, grantedUpgradeId?: UpgradeId): void {
        if(this.player === undefined){
            return;
        }

        const controller = this.player.ai as PlayerController | undefined;
        if(controller === undefined){
            return;
        }

        const previousMaxHealth = controller.maxHealth;
        const previousHealth = controller.health;
        const resolvedMaxHealth = this.getResolvedPlayerMaxHealth();
        controller.maxHealth = resolvedMaxHealth;

        if(fillToMax){
            controller.health = resolvedMaxHealth;
            return;
        }

        if(grantedUpgradeId === UpgradeId.HEALTH_BUFF && resolvedMaxHealth > previousMaxHealth){
            controller.health = Math.min(resolvedMaxHealth, previousHealth + (resolvedMaxHealth - previousMaxHealth));
            return;
        }

        controller.health = Math.min(previousHealth, resolvedMaxHealth);
    }

    protected applyGrantedUpgradeEffects(upgradeId: UpgradeId): void {
        const controller = this.player !== undefined
            ? this.player.ai as PlayerController | undefined
            : undefined;

        switch(upgradeId){
            case UpgradeId.HEALTH_BUFF:
                this.applyPlayerProgressEffects(false, upgradeId);
                break;
            case UpgradeId.UPGRADED_BOOTS:
                if(controller !== undefined){
                    controller.speed = controller.getBaseMoveSpeed();
                }
                break;
            case UpgradeId.SHIELD:
                this.shieldCharges = MBLevel.SHIELD_MAX_CHARGES;
                this.refreshShieldUI();
                break;
            default:
                break;
        }
    }

    protected refreshShieldUI(): void {
        if(this.shieldBarBg === undefined || this.shieldBar === undefined){
            return;
        }

        const hasShield = MBProgress.hasUpgrade(UpgradeId.SHIELD);
        this.shieldBarBg.visible = hasShield;
        this.shieldBar.visible = hasShield && this.shieldCharges > 0;

        if(!hasShield){
            return;
        }

        const frameInset = 2;
        const fillHeight = Math.max(this.shieldBarBg.size.y - frameInset, 2);
        const maxFillWidth = Math.max(this.shieldBarBg.size.x - frameInset, 1);
        const fillWidth = (maxFillWidth * Math.max(0, Math.min(this.shieldCharges, MBLevel.SHIELD_MAX_CHARGES))) / MBLevel.SHIELD_MAX_CHARGES;
        const zoom = this.getViewScale();
        const fillLeft = this.shieldBarBg.position.x - maxFillWidth / (2 * zoom);

        this.shieldBar.size.set(fillWidth, fillHeight);
        this.shieldBar.position.set(fillLeft + fillWidth / (2 * zoom), this.shieldBarBg.position.y);
        this.shieldBar.backgroundColor = MBLevel.SHIELD_BAR_FILL_COLOR;
        this.shieldBarBg.backgroundColor = MBLevel.SHIELD_BAR_TRACK_COLOR;
        this.shieldBarBg.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
    }

    protected refreshPlayerHealthUIFromController(): void {
        if(this.player === undefined){
            return;
        }

        const controller = this.player.ai as PlayerController | undefined;
        if(controller === undefined){
            return;
        }

        this.handleHealthChange(controller.health, controller.maxHealth);
    }

    protected handleBossParticleHit(particleId: number): void {
        if(this.boss === undefined || this.boss.isDefeated()){
            return;
        }

        const bossTarget = this.getBossDamageTarget();
        if(bossTarget === null || !bossTarget.hasPhysics){
            return;
        }

        const particle = this.playerWeaponSystem.getPool().find(candidate => candidate.id === particleId);
        if(particle === undefined || !particle.inUse){
            return;
        }

        const bossAABB = bossTarget.collisionShape.getBoundingRect();
        if(particle.sweptRect.overlapArea(bossAABB) <= 0){
            return;
        }

        particle.setParticleInactive();
        particle.vel = Vec2.ZERO;

        if(this.bossDamageCooldownTimer > 0){
            return;
        }

        this.boss.damage(this.getPlayerWeaponDamage());
        this.bossDamageCooldownTimer = this.bossDamageCooldownDuration;
    }

    protected handleEnemyParticleHit(particleId: number): void {
        if(this.damageableEnemies.length === 0){
            return;
        }

        const particle = this.playerWeaponSystem.getPool().find(candidate => candidate.id === particleId);
        if(particle === undefined || !particle.inUse){
            return;
        }

        for(let i = this.damageableEnemies.length - 1; i >= 0; i--){
            const binding = this.damageableEnemies[i];

            if(binding.damageable.isDefeated() && !binding.sprite.hasPhysics){
                this.damageableEnemies.splice(i, 1);
                continue;
            }

            if(binding.damageable.isDefeated() || !binding.sprite.hasPhysics){
                continue;
            }

            const enemyAABB = binding.sprite.collisionShape.getBoundingRect();
            if(particle.sweptRect.overlapArea(enemyAABB) <= 0){
                continue;
            }

            particle.setParticleInactive();
            particle.vel = Vec2.ZERO;
            binding.damageable.damage(this.getPlayerWeaponDamage());
            return;
        }
    }

    protected registerDamageableEnemy(sprite: AnimatedSprite, damageable: EnemyDamageable): void {
        const existing = this.damageableEnemies.find(binding => binding.sprite === sprite);
        if(existing !== undefined){
            existing.damageable = damageable;
            return;
        }

        this.damageableEnemies.push({ sprite, damageable });
    }

    protected unregisterDamageableEnemy(sprite: AnimatedSprite): void {
        this.damageableEnemies = this.damageableEnemies.filter(binding => binding.sprite !== sprite);
    }

    protected refreshBossUI(): void {
        if(this.bossNameLabel === undefined || this.bossHealthBar === undefined || this.bossHealthBarBg === undefined){
            return;
        }

        const bossVisible = this.boss !== undefined && this.boss.hasFightStarted() && !this.boss.isDefeated();

        this.bossNameLabel.visible = bossVisible;
        this.bossHealthBar.visible = bossVisible;
        this.bossHealthBarBg.visible = bossVisible;

        if(!bossVisible){
            return;
        }

        const boss = this.boss;
        const maxHealth = Math.max(1, boss.getMaxHealth());
        const currentHealth = Math.max(0, Math.min(boss.getCurrentHealth(), maxHealth));
        const frameInset = 2;
        const fillHeight = Math.max(this.bossHealthBarBg.size.y - frameInset, 2);
        const maxFillWidth = Math.max(this.bossHealthBarBg.size.x - frameInset, 1);
        const fillWidth = (maxFillWidth * currentHealth) / maxHealth;

        this.bossNameLabel.text = boss.getDisplayName();
        this.bossHealthBar.size.set(fillWidth, fillHeight);
        this.bossHealthBar.position.set(this.bossHealthBarBg.position.x, this.bossHealthBarBg.position.y);
        this.bossHealthBar.backgroundColor = MBLevel.HEALTH_BAR_FILL_COLOR;
    }

    protected refreshHudInventorySlots(): void {
        const hudUpgrades = this.getEssentialHudUpgrades();

        hudUpgrades.forEach((upgradeId, index) => {
            const slot = this.hudInventorySlots[index];
            const icon = this.hudInventoryIcons[index];
            if(slot === undefined){
                return;
            }

            const isOwned = upgradeId !== null && MBProgress.hasUpgrade(upgradeId);
            const metadata = upgradeId !== null ? UPGRADE_METADATA[upgradeId] : null;

            slot.font = "PixelSimple";
            slot.fontSize = 9;
            slot.textColor = isOwned ? new Color(246, 236, 205, 1) : new Color(122, 116, 102, 1);
            const hasIcon = isOwned && this.getUpgradeIconImageKey(upgradeId) !== null;
            slot.backgroundColor = hasIcon
                ? Color.TRANSPARENT
                : isOwned
                    ? (metadata !== null && metadata.essential ? new Color(62, 48, 30, 0.98) : new Color(46, 38, 32, 0.98))
                    : new Color(18, 16, 22, 0.94);
            slot.borderColor = hasIcon ? Color.TRANSPARENT : new Color(183, 146, 82, 1);
            slot.text = "";

            if(icon !== undefined){
                this.updateInventoryIconSprite(icon, upgradeId, hasIcon);
                icon.visible = hasIcon;
            }
        });
    }

    protected refreshPauseInventoryList(): void {
        UPGRADE_ORDER.forEach((upgradeId, index) => {
            const slot = this.pauseInventorySlots[index];
            const icon = this.pauseInventoryIcons[index];

            if(slot === undefined){
                return;
            }

            const metadata = UPGRADE_METADATA[upgradeId];
            const isOwned = MBProgress.hasUpgrade(upgradeId);
            const isEssential = metadata.essential;
            const isSelected = this.currentSelectedUpgradeId === upgradeId && isOwned;
            const hasIcon = isOwned && this.getUpgradeIconImageKey(upgradeId) !== null;

            slot.backgroundColor = hasIcon
                ? Color.TRANSPARENT
                : isOwned
                    ? (isEssential ? new Color(62, 48, 30, 0.98) : new Color(46, 38, 32, 0.98))
                    : new Color(18, 16, 22, 0.94);
            slot.borderColor = hasIcon
                ? Color.TRANSPARENT
                : isOwned
                    ? (isSelected ? new Color(231, 194, 119, 1) : new Color(183, 146, 82, 1))
                    : new Color(116, 94, 60, 0.8);
            slot.textColor = isOwned ? new Color(246, 238, 214, 1) : new Color(170, 154, 126, 1);
            slot.font = "PixelSimple";
            slot.fontSize = 11;
            slot.text = hasIcon ? "" : (isOwned ? metadata.shortLabel : "???");

            if(icon !== undefined){
                this.updateInventoryIconSprite(icon, upgradeId, hasIcon);
                icon.visible = hasIcon;
            }
        });
    }

    protected getUpgradeIconImageKey(upgradeId: UpgradeId | null): string | null {
        switch(upgradeId){
            case UpgradeId.LANTERN:
                return MBLevel.LANTERN_ICON_KEY;
            case UpgradeId.FUR_COAT:
                return MBLevel.FUR_COAT_ICON_KEY;
            case UpgradeId.DOUBLE_JUMP:
                return MBLevel.DOUBLE_JUMP_ICON_KEY;
            case UpgradeId.REVIVAL_TOTEM_L1:
            case UpgradeId.REVIVAL_TOTEM_L3:
                return MBLevel.REVIVAL_ICON_KEY;
            case UpgradeId.UPGRADED_BOOTS:
                return MBLevel.UPGRADED_BOOTS_ICON_KEY;
            case UpgradeId.ICE_PICK:
                return MBLevel.ICE_PICK_ICON_KEY;
            case UpgradeId.SHATTERDIVE:
                return MBLevel.SHATTERDIVE_ICON_KEY;
            case UpgradeId.HEALTH_BUFF:
                return MBLevel.HEALTH_BUFF_ICON_KEY;
            case UpgradeId.UPGRADED_SWORD:
                return MBLevel.UPGRADED_SWORD_ICON_KEY;
            case UpgradeId.SHIELD:
                return this.shieldCharges > 0 ? MBLevel.SHIELD_ICON_KEY : MBLevel.SHIELD_BROKEN_ICON_KEY;
            case UpgradeId.ASHEN_SEAL_FRAGMENT:
            case UpgradeId.ASHEN_SEAL_FRAGMENT_BLUE:
                return MBLevel.ASHEN_SEAL_FRAGMENT_ICON_KEY;
            default:
                return null;
        }
    }

    protected getUpgradeIconImageOffset(upgradeId: UpgradeId): Vec2 {
        switch(upgradeId){
            case UpgradeId.ASHEN_SEAL_FRAGMENT_BLUE:
                return new Vec2(0, 128);
            case UpgradeId.ASHEN_SEAL_FRAGMENT:
                return Vec2.ZERO;
            default:
                return Vec2.ZERO;
        }
    }

    protected getUpgradeIconFrameSize(upgradeId: UpgradeId, image: HTMLImageElement): Vec2 {
        switch(upgradeId){
            case UpgradeId.ASHEN_SEAL_FRAGMENT:
            case UpgradeId.ASHEN_SEAL_FRAGMENT_BLUE:
                return new Vec2(128, 128);
            default:
                return new Vec2(image.width, image.height);
        }
    }

    protected updateInventoryIconSprite(icon: Sprite, upgradeId: UpgradeId | null, visible: boolean): void {
        if(upgradeId === null || !visible){
            return;
        }

        const imageKey = this.getUpgradeIconImageKey(upgradeId);
        if(imageKey === null){
            return;
        }

        if(icon.imageId !== imageKey){
            icon.imageId = imageKey;
        }

        const image = ResourceManager.getInstance().getImage(imageKey);
        icon.size.copy(this.getUpgradeIconFrameSize(upgradeId, image));
        icon.setImageOffset(this.getUpgradeIconImageOffset(upgradeId));
    }

    protected setPauseInventorySelection(upgradeId: UpgradeId | null): void {
        if(this.currentSelectedUpgradeId === upgradeId){
            this.currentSelectedUpgradeId = null;
        } else {
            this.currentSelectedUpgradeId = upgradeId;
        }

        this.refreshPauseInventoryList();
        this.refreshPauseInventoryPopup();
    }

    protected refreshPauseInventoryPopup(): void {
        const selectedUpgradeId = this.currentSelectedUpgradeId;
        const popupVisible = selectedUpgradeId !== null && MBProgress.hasUpgrade(selectedUpgradeId);

        this.pauseInventoryPopupPanel.visible = popupVisible;
        this.pauseInventoryPopupTitle.visible = popupVisible;
        for(const line of this.pauseInventoryPopupLines){
            line.visible = popupVisible;
        }

        if(!popupVisible){
            return;
        }

        const metadata = UPGRADE_METADATA[selectedUpgradeId];
        this.pauseInventoryPopupTitle.text = metadata.name;

        const wrappedLines = this.wrapPausePopupDescription(metadata.description, 34, this.pauseInventoryPopupLines.length);
        this.pauseInventoryPopupLines.forEach((line, index) => {
            line.text = wrappedLines[index] ?? "";
        });
    }

    protected wrapPausePopupDescription(text: string, lineLength: number, maxLines: number): Array<string> {
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const lines = new Array<string>();
        let currentLine = "";

        for(const word of words){
            const candidateLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
            if(candidateLine.length <= lineLength){
                currentLine = candidateLine;
                continue;
            }

            if(currentLine.length > 0){
                lines.push(currentLine);
            }
            currentLine = word;

            if(lines.length === maxLines){
                break;
            }
        }

        if(lines.length < maxLines && currentLine.length > 0){
            lines.push(currentLine);
        }

        if(lines.length > maxLines){
            lines.length = maxLines;
        }

        if(lines.length === maxLines && words.length > 0){
            const lastIndex = maxLines - 1;
            if(lines[lastIndex].length > lineLength - 3){
                lines[lastIndex] = `${lines[lastIndex].slice(0, Math.max(0, lineLength - 3))}...`;
            }
        }

        return lines;
    }

    protected hasBlockingModal(): boolean {
        return this.upgradeRewardOpen || this.dialogueOpen;
    }

    protected isDialogueOpen(): boolean {
        return this.dialogueOpen;
    }

    protected showDialogue(pages: ReadonlyArray<DialoguePage>, onComplete?: () => void): void {
        if(pages.length === 0){
            return;
        }

        this.dialoguePages = pages.map(page => ({
            speaker: page.speaker,
            text: page.text
        }));
        this.dialoguePageIndex = 0;
        this.dialogueOnComplete = onComplete ?? null;
        this.dialogueOpen = true;
        this.pauseCheatInput.focused = false;

        for(const element of this.dialogueElements){
            element.visible = true;
        }

        this.refreshDialoguePage();
        this.setGameplayPaused(true);
    }

    protected advanceDialogue(): void {
        if(!this.dialogueOpen){
            return;
        }

        if(this.dialoguePageIndex < this.dialoguePages.length - 1){
            this.dialoguePageIndex += 1;
            this.refreshDialoguePage();
            return;
        }

        const onComplete = this.dialogueOnComplete;
        this.hideDialogue();

        if(onComplete !== null){
            onComplete();
        }
    }

    protected hideDialogue(): void {
        this.dialogueOpen = false;
        this.dialoguePages = new Array();
        this.dialoguePageIndex = 0;
        this.dialogueOnComplete = null;

        for(const element of this.dialogueElements){
            element.visible = false;
        }

        this.setGameplayPaused(this.pauseMenuOpen);
    }

    protected refreshDialoguePage(): void {
        if(!this.dialogueOpen || this.dialoguePages.length === 0){
            return;
        }

        const currentPage = this.dialoguePages[this.dialoguePageIndex];
        const wrappedLines = this.wrapPausePopupDescription(currentPage.text, 54, this.dialogueLines.length);
        this.dialogueSpeakerLabel.text = currentPage.speaker;
        this.dialogueLines.forEach((line, index) => {
            line.text = wrappedLines[index] ?? "";
        });

        const isLastPage = this.dialoguePageIndex >= this.dialoguePages.length - 1;
        this.dialogueAdvanceLabel.text = isLastPage ? "[Enter / Click] Close" : "[Enter / Click] Next";
    }

    protected showUpgradeRewardPopup(upgradeId: UpgradeId, onConfirm?: () => void): void {
        const metadata = UPGRADE_METADATA[upgradeId];
        const rewardText = `${metadata.name} has been added to your inventory. ${metadata.description}`;
        const wrappedLines = this.wrapPausePopupDescription(rewardText, 34, this.upgradeRewardLines.length);

        this.upgradeRewardTitle.text = "UPGRADE ACQUIRED";
        this.upgradeRewardLines.forEach((line, index) => {
            line.text = wrappedLines[index] ?? "";
        });

        this.upgradeRewardOpen = true;
        this.upgradeRewardOnConfirm = onConfirm ?? null;
        this.pauseCheatInput.focused = false;

        for(const element of this.upgradeRewardElements){
            element.visible = true;
        }

        this.setGameplayPaused(true);
    }

    protected confirmUpgradeRewardPopup(): void {
        if(!this.upgradeRewardOpen){
            return;
        }

        const onConfirm = this.upgradeRewardOnConfirm;
        this.hideUpgradeRewardPopup();

        if(onConfirm !== null){
            onConfirm();
        }
    }

    protected hideUpgradeRewardPopup(): void {
        this.upgradeRewardOpen = false;
        this.upgradeRewardOnConfirm = null;

        for(const element of this.upgradeRewardElements){
            element.visible = false;
        }

        this.setGameplayPaused(this.pauseMenuOpen);
    }
    /* Initialization methods for everything in the scene */

    /**
     * Initialzes the layers
     */
    protected initLayers(): void {
        // Add a layer for UI
        this.addUILayer(MBLayers.UI);
        this.addUILayer(MBLayers.PAUSE);
        // Add a layer for players and enemies
        this.addLayer(MBLayers.PRIMARY);
        this.getLayer(MBLayers.PAUSE).disable();
    }
    /**
     * Initializes the tilemaps
     * @param key the key for the tilemap data
     * @param scale the scale factor for the tilemap
     */
    protected initializeTilemap(): void {
        if (this.tilemapKey === undefined || this.tilemapScale === undefined) {
            throw new Error("Cannot add the homework 4 tilemap unless the tilemap key and scale are set.");
        }
        // Add the tilemap to the scene
        this.add.tilemap(this.tilemapKey, this.tilemapScale);

        if (this.wallsLayerKey === undefined) {
            throw new Error("Make sure the key for the wall layer is set");
        }

        // Get the wall layer 
        this.walls = this.getTilemap(this.wallsLayerKey) as OrthogonalTilemap;
        if(this.walls === null){
            throw new Error(`Could not find wall tilemap layer \"${this.wallsLayerKey}\"`);
        }

        // Add physicss to the wall layer
        this.walls.addPhysics();

        // Compute an out-of-bounds death floor below the level bottom
        const mapDimensions = this.walls.getDimensions();
        const tileSize = this.walls.getTileSize();
        this.deathY = mapDimensions.y * tileSize.y + 2 * tileSize.y;

        // Add physics to the destructible layer of the tilemap, if one is configured
        this.destructable = undefined;
        if(this.destructibleLayerKey !== undefined){
            if(this.destructibleLayerKey === this.wallsLayerKey){
                throw new Error("Destructible and wall layer keys must be different if both are provided");
            }

            this.destructable = this.getTilemap(this.destructibleLayerKey) as OrthogonalTilemap;
            if(this.destructable === null){
                throw new Error(`Could not find destructible tilemap layer \"${this.destructibleLayerKey}\"`);
            }

            this.destructable.addPhysics();
        }

        this.damaging = undefined;
        if(this.damagingLayerKey !== undefined){
            if(this.damagingLayerKey === this.wallsLayerKey || this.damagingLayerKey === this.destructibleLayerKey){
                throw new Error("Damaging layer key must be different from the wall and destructible layer keys");
            }

            const damagingTilemap = this.getTilemap(this.damagingLayerKey) as OrthogonalTilemap | null;
            if(damagingTilemap !== null){
                this.damaging = damagingTilemap;
            }
        }
    }

    /**
     * Instantly kills the player if they fall below the map bounds.
     */
    protected handleOutOfBoundsDeath(): void {
        if(this.deathTriggered || this.player === undefined){
            return;
        }

        if(this.isPlayerDamageDisabled()){
            return;
        }

        if(this.player.position.y > this.deathY){
            this.deathTriggered = true;
            this.emitter.fireEvent(MBEvents.PLAYER_DEAD);
        }
    }

    /**
     * Damages the player while their collider overlaps any tile in the damaging layer.
     */
    protected handleDamagingTileContact(): void {
        if(this.damaging === undefined || this.player === undefined){
            return;
        }

        const controller = this.player.ai as PlayerController | undefined;
        if(controller === undefined || !controller.canTakeDamage()){
            return;
        }

        const playerBounds = this.player.collisionShape.getBoundingRect();
        const horizontalInset = Math.min(4, Math.max(1, playerBounds.hw * 0.2));
        const verticalInset = Math.min(4, Math.max(1, playerBounds.hh * 0.2));
        const probeDistance = 2;
        const damagingProbes = [
            { position: new Vec2(playerBounds.left + horizontalInset, playerBounds.top - probeDistance), direction: Vec2.DOWN },
            { position: new Vec2(playerBounds.center.x, playerBounds.top - probeDistance), direction: Vec2.DOWN },
            { position: new Vec2(playerBounds.right - horizontalInset, playerBounds.top - probeDistance), direction: Vec2.DOWN },
            { position: new Vec2(playerBounds.left + horizontalInset, playerBounds.bottom + probeDistance), direction: Vec2.UP },
            { position: new Vec2(playerBounds.center.x, playerBounds.bottom + probeDistance), direction: Vec2.UP },
            { position: new Vec2(playerBounds.right - horizontalInset, playerBounds.bottom + probeDistance), direction: Vec2.UP },
            { position: new Vec2(playerBounds.left - probeDistance, playerBounds.top + verticalInset), direction: Vec2.RIGHT },
            { position: new Vec2(playerBounds.left - probeDistance, playerBounds.center.y), direction: Vec2.RIGHT },
            { position: new Vec2(playerBounds.left - probeDistance, playerBounds.bottom - verticalInset), direction: Vec2.RIGHT },
            { position: new Vec2(playerBounds.right + probeDistance, playerBounds.top + verticalInset), direction: Vec2.LEFT },
            { position: new Vec2(playerBounds.right + probeDistance, playerBounds.center.y), direction: Vec2.LEFT },
            { position: new Vec2(playerBounds.right + probeDistance, playerBounds.bottom - verticalInset), direction: Vec2.LEFT }
        ];

        for(const probe of damagingProbes){
            if(this.isDamagingTileAt(probe.position)){
                controller.applyDamage(this.damagingTileDamage, this.getDamagingTileKnockback(probe.direction));
                return;
            }
        }

        const min = playerBounds.topLeft;
        const max = playerBounds.bottomRight;
        min.add(new Vec2(0.001, 0.001));
        max.add(new Vec2(-0.001, -0.001));

        const minIndex = this.damaging.getColRowAt(min);
        const maxIndex = this.damaging.getColRowAt(max);

        for(let col = minIndex.x; col <= maxIndex.x; col++){
            for(let row = minIndex.y; row <= maxIndex.y; row++){
                if(this.damaging.isTileCollidable(col, row)){
                    controller.applyDamage(
                        this.damagingTileDamage,
                        this.getDamagingTileKnockbackFromTile(playerBounds.center, col, row)
                    );
                    return;
                }
            }
        }
    }

    protected isDamagingTileAt(worldPosition: Vec2): boolean {
        if(this.damaging === undefined){
            return false;
        }

        const tileIndex = this.damaging.getColRowAt(worldPosition);
        return this.damaging.isTileCollidable(tileIndex.x, tileIndex.y);
    }

    protected getDamagingTileKnockback(direction: Vec2): Vec2 {
        const knockbackDirection = direction.clone();
        if(knockbackDirection.isZero()){
            knockbackDirection.set(0, -1);
        } else {
            knockbackDirection.normalize();
        }

        return knockbackDirection.scale(this.damagingTileKnockbackSpeed);
    }

    protected getDamagingTileKnockbackFromTile(playerCenter: Vec2, col: number, row: number): Vec2 {
        if(this.damaging === undefined){
            return this.getDamagingTileKnockback(Vec2.UP);
        }

        const tileSize = this.damaging.getTileSize();
        const tileCenter = new Vec2(
            col * tileSize.x + tileSize.x / 2,
            row * tileSize.y + tileSize.y / 2
        );

        const awayDirection = tileCenter.vecTo(playerCenter);
        if(awayDirection.isZero()){
            awayDirection.set(0, -1);
        }

        return this.getDamagingTileKnockback(awayDirection);
    }

    /**
     * Initializes an optional scenic background image.
     */
    protected initializeBackground(): void {
        if(this.backgroundImageKey === undefined){
            return;
        }

        this.addParallaxLayer(MBLayers.BACKGROUND, this.backgroundParallax, this.backgroundLayerDepth);
        const bg = this.add.sprite(this.backgroundImageKey, MBLayers.BACKGROUND);
        bg.scale.copy(this.tilemapScale);
        bg.position.set((bg.size.x * bg.scale.x)/2, (bg.size.y * bg.scale.y)/2);
    }
    /**
     * Handles all subscriptions to events
     */
    protected subscribeToEvents(): void {
        this.receiver.subscribe(MBEvents.PLAYER_ENTERED_LEVEL_END);
        this.receiver.subscribe(MBEvents.LEVEL_START);
        this.receiver.subscribe(MBEvents.LEVEL_END);
        this.receiver.subscribe(MBEvents.HEALTH_CHANGE);
        this.receiver.subscribe(MBEvents.PLAYER_DEAD);
        this.receiver.subscribe(MBEvents.PLAYER_RESPAWN);
        this.receiver.subscribe(MBEvents.PARTICLE_HIT);
        this.receiver.subscribe(MBEvents.BOSS_PARTICLE_HIT);
        this.receiver.subscribe(MBEvents.ENEMY_PARTICLE_HIT);
    }
    /**
     * Adds in any necessary UI to the game
     */
    protected initializeUI(): void {
        const hud = MBLevel.HUD_TUNING;
        const bossHud = MBLevel.BOSS_HUD_TUNING;
        const zoom = this.getViewScale();
        const toUIScreenX = (screenX: number): number => screenX / zoom;
        const toUIScreenY = (screenY: number): number => screenY / zoom;
        const hudLeft = hud.left;
        const hpBarTop = hud.healthBarTop;
        const hpBarWidth = hud.healthBarWidth;
        const hpBarHeight = hud.healthBarHeight;
        const inventoryY = hpBarTop + hpBarHeight + hud.inventoryOffsetY;
        const slotSize = hud.slotSize;
        const slotGap = hud.slotGap;
        const hpBarCenterX = toUIScreenX(hudLeft + hpBarWidth / 2);
        const hpBarCenterY = toUIScreenY(hpBarTop + hpBarHeight / 2);
        const slotCenterY = toUIScreenY(inventoryY + slotSize / 2);

        // HealthBar Border
        this.healthBarBg = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: new Vec2(hpBarCenterX, hpBarCenterY),
            text: ""
        });
        this.healthBarBg.size = new Vec2(hpBarWidth, hpBarHeight);
        this.healthBarBg.backgroundColor = MBLevel.HEALTH_BAR_TRACK_COLOR;
        this.healthBarBg.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.healthBarBg.borderRadius = hud.healthBarRadius;

        // HealthBar
        this.healthBar = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: new Vec2(hpBarCenterX, hpBarCenterY),
            text: ""
        });
        this.healthBar.size = new Vec2(hpBarWidth - 2, hpBarHeight - 2);
        this.healthBar.backgroundColor = MBLevel.HEALTH_BAR_FILL_COLOR;
        this.healthBar.borderRadius = hud.healthBarRadius;

        const shieldBarCenterX = toUIScreenX(hudLeft + hpBarWidth + hud.shieldBarGap + hud.shieldBarWidth / 2);
        this.shieldBarBg = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: new Vec2(shieldBarCenterX, hpBarCenterY),
            text: ""
        });
        this.shieldBarBg.size = new Vec2(hud.shieldBarWidth, hpBarHeight);
        this.shieldBarBg.backgroundColor = MBLevel.SHIELD_BAR_TRACK_COLOR;
        this.shieldBarBg.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.shieldBarBg.borderRadius = hud.healthBarRadius;
        this.shieldBarBg.visible = false;

        this.shieldBar = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: new Vec2(shieldBarCenterX, hpBarCenterY),
            text: ""
        });
        this.shieldBar.size = new Vec2(hud.shieldBarWidth - 2, hpBarHeight - 2);
        this.shieldBar.backgroundColor = MBLevel.SHIELD_BAR_FILL_COLOR;
        this.shieldBar.borderRadius = hud.healthBarRadius;
        this.shieldBar.visible = false;

        for(let i = 0; i < 5; i++){
            const slotCenterX = toUIScreenX(hudLeft + slotSize / 2 + i * (slotSize + slotGap));
            const slot = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
                position: new Vec2(slotCenterX, slotCenterY),
                text: ""
            });
            slot.size.set(slotSize, slotSize);
            slot.backgroundColor = new Color(24, 22, 28, 0.95);
            slot.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
            slot.borderRadius = hud.slotRadius;
            this.hudInventorySlots.push(slot);

            const icon = this.add.sprite(MBLevel.LANTERN_ICON_KEY, MBLayers.UI);
            icon.position.copy(slot.position);
            const hudIconSize = Math.max(hud.iconSize, 8);
            const hudIconScale = hudIconSize / 128;
            icon.scale.set(hudIconScale, hudIconScale);
            icon.visible = false;
            this.hudInventoryIcons.push(icon);
        }

        this.refreshHudInventorySlots();
        this.refreshPlayerHealthUIFromController();

        this.initializeBossUI(
            new Vec2(toUIScreenX(bossHud.nameCenterX), toUIScreenY(bossHud.nameCenterY)),
            new Vec2(toUIScreenX(bossHud.barCenterX), toUIScreenY(bossHud.barCenterY)),
            new Vec2(bossHud.nameWidth, bossHud.nameHeight),
            new Vec2(bossHud.barWidth, bossHud.barHeight),
            bossHud.barRadius
        );

        // End of level label (start off screen)
        this.levelEndLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, { position: new Vec2(-300, 100), text: "Level Complete" });
        this.levelEndLabel.size.set(1200, 60);
        this.levelEndLabel.borderRadius = 0;
        this.levelEndLabel.backgroundColor = new Color(34, 32, 52);
        this.levelEndLabel.textColor = Color.WHITE;
        this.levelEndLabel.fontSize = 48;
        this.levelEndLabel.font = "PixelSimple";

        // Add a tween to move the label on screen
        this.levelEndLabel.tweens.add("slideIn", {
            startDelay: 0,
            duration: 1000,
            effects: [
                {
                    property: TweenableProperties.posX,
                    start: -300,
                    end: 300,
                    ease: EaseFunctionType.OUT_SINE
                }
            ]
        });

        const promptTuning = MBLevel.LEVEL_END_PROMPT_TUNING;
        const promptPosition = new Vec2(promptTuning.screenCenterX / this.getViewScale(), promptTuning.screenCenterY / this.getViewScale());

        this.levelEndPromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: new Vec2(196, 40)
        });
        this.levelEndPromptPanel.color = new Color(20, 18, 24, 0.94);
        this.levelEndPromptPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.levelEndPromptPanel.visible = false;

        this.levelEndPromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] Enter Portal"
        });
        this.levelEndPromptLabel.size.set(220, 24);
        this.levelEndPromptLabel.font = "PixelSimple";
        this.levelEndPromptLabel.fontSize = 18;
        this.levelEndPromptLabel.textColor = new Color(246, 238, 214, 1);
        this.levelEndPromptLabel.visible = false;

        const viewCenter = this.viewport.getHalfSize();
        const viewSize = viewCenter.scaled(2);

        this.levelTransitionScreen = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: viewCenter.clone(),
            size: viewSize.clone()
        });
        this.levelTransitionScreen.color = new Color(34, 32, 52);
        this.levelTransitionScreen.alpha = 1;

        this.levelTransitionScreen.tweens.add("fadeIn", {
            startDelay: 0,
            duration: 1000,
            effects: [
                {
                    property: TweenableProperties.alpha,
                    start: 0,
                    end: 1,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ],
            onEnd: MBEvents.LEVEL_END
        });

        /*
             Adds a tween to fade in the start of the level. After the tween has
             finished playing, a level start event gets sent to the EventQueue.
        */
        this.levelTransitionScreen.tweens.add("fadeOut", {
            startDelay: 0,
            duration: 1000,
            effects: [
                {
                    property: TweenableProperties.alpha,
                    start: 1,
                    end: 0,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ],
            onEnd: MBEvents.LEVEL_START
        });

        this.levelTransitionScreen.tweens.add("deathFadeIn", {
            startDelay: 0,
            duration: 1200,
            effects: [
                {
                    property: TweenableProperties.alpha,
                    start: 0,
                    end: 1,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ],
            onEnd: MBEvents.PLAYER_RESPAWN
        });

        this.deathLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: viewCenter.clone(),
            text: "YOU DIED"
        });
        this.deathLabel.size.set(viewSize.x, 80);
        this.deathLabel.font = "PixelSimple";
        this.deathLabel.fontSize = 56;
        this.deathLabel.textColor = Color.WHITE;
        this.deathLabel.backgroundColor = Color.TRANSPARENT;
        this.deathLabel.borderColor = Color.TRANSPARENT;
        this.deathLabel.visible = false;
        this.deathLabel.alpha = 0;
        this.deathLabel.tweens.add("deathFadeIn", {
            startDelay: 150,
            duration: 800,
            effects: [
                {
                    property: TweenableProperties.alpha,
                    start: 0,
                    end: 1,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ]
        });

        this.revivalFlash = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: viewCenter.clone(),
            size: viewSize.clone()
        });
        this.revivalFlash.color = Color.WHITE;
        this.revivalFlash.alpha = 0;
        this.revivalFlash.visible = false;

        this.revivalIcon = this.add.sprite(MBLevel.REVIVAL_ICON_KEY, MBLayers.UI);
        this.revivalIcon.position.copy(viewCenter);
        this.revivalIcon.scale.set(0.68, 0.68);
        this.revivalIcon.alpha = 0;
        this.revivalIcon.visible = false;

        this.initializeUpgradeRewardUI();
        this.initializeDialogueUI();
    }

    protected initializeBossUI(namePosition: Vec2, barPosition: Vec2, nameSize: Vec2, barSize: Vec2, barRadius: number): void {
        this.bossNameLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: namePosition,
            text: ""
        });
        this.bossNameLabel.size.copy(nameSize);
        this.bossNameLabel.font = "PixelSimple";
        this.bossNameLabel.fontSize = 18;
        this.bossNameLabel.textColor = new Color(246, 238, 214, 1);
        this.bossNameLabel.backgroundColor = Color.TRANSPARENT;
        this.bossNameLabel.visible = false;

        this.bossHealthBarBg = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: barPosition,
            text: ""
        });
        this.bossHealthBarBg.size.copy(barSize);
        this.bossHealthBarBg.backgroundColor = MBLevel.HEALTH_BAR_TRACK_COLOR;
        this.bossHealthBarBg.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.bossHealthBarBg.borderRadius = barRadius;
        this.bossHealthBarBg.visible = false;

        this.bossHealthBar = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: barPosition,
            text: ""
        });
        this.bossHealthBar.size = new Vec2(barSize.x - 2, Math.max(barSize.y - 2, 2));
        this.bossHealthBar.backgroundColor = MBLevel.HEALTH_BAR_FILL_COLOR;
        this.bossHealthBar.borderRadius = barRadius;
        this.bossHealthBar.visible = false;

        this.refreshBossUI();
    }
    protected initializePauseMenuUI(): void {
        const pause = MBLevel.PAUSE_TUNING;
        const size = this.viewport.getHalfSize();
        const viewSize = size.scaled(2);
        const viewportPosition = (x: number, y: number): Vec2 => new Vec2(viewSize.x * (x / 1200), viewSize.y * (y / 800));
        const viewportGraphicSize = (x: number, y: number): Vec2 => new Vec2(viewSize.x * (x / 1200), viewSize.y * (y / 800));

        const overlay = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PAUSE, {
            position: size.clone(),
            size: viewSize
        });
        overlay.color = new Color(12, 10, 18, 0.82);

        const titleBox = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PAUSE, {
            position: viewportPosition(pause.titleCenterX, pause.titleY),
            size: viewportGraphicSize(320, 70)
        });
        titleBox.color = new Color(20, 18, 24, 0.85);
        titleBox.borderColor = new Color(186, 150, 86, 1);
        this.pauseMenuElements.push(titleBox);

        const title = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
            position: viewportPosition(pause.titleCenterX, pause.titleY),
            text: "PAUSED"
        });
        title.textColor = Color.WHITE;
        title.font = "PixelSimple";
        title.fontSize = 40;
        this.pauseMenuElements.push(title);

        const buttonX = viewportPosition(pause.buttonCenterX, 0).x;
        const continueButton = this.initializePauseButton(new Vec2(buttonX, viewportPosition(0, pause.continueY).y), "Continue", () => this.setPauseMenuOpen(false));
        this.pauseMenuElements.push(continueButton);

        this.pauseControlsButton = this.initializePauseButton(new Vec2(buttonX, viewportPosition(0, pause.controlsY).y), "Controls", () => {
            this.showPauseControls(!this.pauseControlsOpen);
        });
        this.pauseMenuElements.push(this.pauseControlsButton);

        const quitButton = this.initializePauseButton(new Vec2(buttonX, viewportPosition(0, pause.quitY).y), "Quit", () => {
            this.emitter.fireEvent(GameEventType.STOP_SOUND, { key: this.levelMusicKey });
            this.sceneManager.changeToScene(SplashScreen);
        });
        this.pauseMenuElements.push(quitButton);

        const inventoryPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PAUSE, {
            position: viewportPosition(pause.inventoryCenterX, pause.inventoryPanelCenterY),
            size: viewportGraphicSize(pause.inventoryPanelWidth, pause.inventoryPanelHeight)
        });
        inventoryPanel.color = new Color(20, 18, 24, 0.9);
        inventoryPanel.borderColor = new Color(186, 150, 86, 1);
        this.pauseMenuElements.push(inventoryPanel);

        const inventoryTitle = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
            position: viewportPosition(pause.inventoryCenterX, pause.inventoryTitleY),
            text: "INVENTORY"
        });
        inventoryTitle.textColor = Color.WHITE;
        inventoryTitle.font = "PixelSimple";
        inventoryTitle.fontSize = 26;
        this.pauseMenuElements.push(inventoryTitle);

        const inventorySubTitle = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
            position: viewportPosition(pause.inventoryCenterX, pause.inventorySubtitleY),
            text: "Click Owned Slots"
        });
        inventorySubTitle.textColor = new Color(194, 186, 166, 1);
        inventorySubTitle.font = "PixelSimple";
        inventorySubTitle.fontSize = 16;
        this.pauseMenuElements.push(inventorySubTitle);

        const slotCenterX = viewportPosition(pause.inventoryCenterX, 0).x;
        const slotStartY = viewportPosition(0, pause.inventorySlotStartY).y;
        const slotStepY = viewSize.y * (pause.inventorySlotStepY / 800);
        const fragmentSlotStepX = viewSize.x * ((pause.inventorySlotSize + 10) / 1200);
        const fragmentRowIndex = UPGRADE_ORDER.indexOf(UpgradeId.ASHEN_SEAL_FRAGMENT);
        const pauseSlotSize = viewportGraphicSize(pause.inventorySlotSize, pause.inventorySlotSize);

        UPGRADE_ORDER.forEach((upgradeId, index) => {
            const fragmentColumnOffset = upgradeId === UpgradeId.ASHEN_SEAL_FRAGMENT
                ? -fragmentSlotStepX / 2
                : upgradeId === UpgradeId.ASHEN_SEAL_FRAGMENT_BLUE
                    ? fragmentSlotStepX / 2
                    : 0;
            const layoutIndex = upgradeId === UpgradeId.ASHEN_SEAL_FRAGMENT_BLUE ? fragmentRowIndex : index;
            const slotX = slotCenterX + fragmentColumnOffset;
            const slotY = slotStartY + layoutIndex * slotStepY;

            const slot = <Button>this.add.uiElement(UIElementType.BUTTON, MBLayers.PAUSE, {
                position: new Vec2(slotX, slotY),
                text: ""
            });
            slot.size.copy(pauseSlotSize);
            slot.backgroundColor = new Color(18, 16, 22, 0.94);
            slot.borderColor = new Color(116, 94, 60, 0.8);
            slot.borderRadius = 6;
            slot.setPadding(new Vec2(0, 0));
            slot.font = "PixelSimple";
            slot.fontSize = 11;
            slot.onClick = () => {
                if(MBProgress.hasUpgrade(upgradeId)){
                    this.setPauseInventorySelection(upgradeId);
                }
            };
            this.pauseInventorySlots.push(slot);
            this.pauseMenuElements.push(slot);

            const icon = this.add.sprite(MBLevel.LANTERN_ICON_KEY, MBLayers.PAUSE);
            icon.position.copy(slot.position);
            const pauseIconSize = Math.max(pause.inventoryIconSize, 12);
            const pauseIconScale = pauseIconSize / 128;
            icon.scale.set(pauseIconScale, pauseIconScale);
            icon.visible = false;
            this.pauseInventoryIcons.push(icon);
            this.pauseMenuElements.push(icon);
        });

        this.pauseInventoryPopupPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PAUSE, {
            position: viewportPosition(pause.popupCenterX, pause.popupCenterY),
            size: viewportGraphicSize(pause.popupWidth, pause.popupHeight)
        });
        this.pauseInventoryPopupPanel.color = new Color(16, 14, 20, 0.97);
        this.pauseInventoryPopupPanel.borderColor = new Color(186, 150, 86, 1);
        this.pauseInventoryPopupPanel.visible = false;
        this.pauseMenuElements.push(this.pauseInventoryPopupPanel);

        this.pauseInventoryPopupTitle = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
            position: viewportPosition(pause.popupCenterX, pause.popupTitleY),
            text: ""
        });
        this.pauseInventoryPopupTitle.size.copy(viewportGraphicSize(300, 26));
        this.pauseInventoryPopupTitle.font = "PixelSimple";
        this.pauseInventoryPopupTitle.fontSize = 20;
        this.pauseInventoryPopupTitle.textColor = new Color(246, 238, 214, 1);
        this.pauseInventoryPopupTitle.visible = false;
        this.pauseMenuElements.push(this.pauseInventoryPopupTitle);

        for(let i = 0; i < 5; i++){
            const line = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
                position: viewportPosition(pause.popupCenterX, pause.popupLineStartY + i * pause.popupLineStepY),
                text: ""
            });
            line.size.copy(viewportGraphicSize(320, 20));
            line.font = "PixelSimple";
            line.fontSize = 14;
            line.textColor = new Color(225, 224, 230, 1);
            line.visible = false;
            this.pauseInventoryPopupLines.push(line);
            this.pauseMenuElements.push(line);
        }

        this.pauseControlsPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PAUSE, {
            position: viewportPosition(600, 355),
            size: viewportGraphicSize(760, 420)
        });
        this.pauseControlsPanel.color = new Color(20, 18, 24, 1);
        this.pauseControlsPanel.borderColor = Color.WHITE;
        this.pauseControlsPanel.visible = false;
        this.pauseControlsElements.push(this.pauseControlsPanel);

        const controlsTitle = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
            position: viewportPosition(600, 170),
            text: "CONTROLS"
        });
        controlsTitle.textColor = Color.WHITE;
        controlsTitle.font = "PixelSimple";
        controlsTitle.visible = false;
        this.pauseControlsElements.push(controlsTitle);

        const leftX = viewportPosition(420, 0).x;
        const rightX = viewportPosition(780, 0).x;
        const startY = viewportPosition(0, 220).y;
        const stepY = viewSize.y * (55 / 800);

        MBLevel.PAUSE_CONTROLS.forEach((entry, index) => {
            const y = startY + index * stepY;

            const left = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
                position: new Vec2(leftX, y),
                text: entry[0]
            });
            left.textColor = Color.WHITE;
            left.font = "PixelSimple";
            left.visible = false;
            this.pauseControlsElements.push(left);

            const right = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
                position: new Vec2(rightX, y),
                text: entry[1]
            });
            right.textColor = Color.WHITE;
            right.font = "PixelSimple";
            right.visible = false;
            this.pauseControlsElements.push(right);
        });

        const backButton = this.initializePauseButton(new Vec2(buttonX, viewportPosition(0, 610).y), "Back", () => {
            this.showPauseControls(false);
        });
        backButton.visible = false;
        this.pauseControlsElements.push(backButton);

        const cheatTitle = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
            position: viewportPosition(pause.buttonCenterX, pause.cheatTitleY),
            text: "Cheat Codes"
        });
        cheatTitle.textColor = Color.WHITE;
        cheatTitle.font = "PixelSimple";
        cheatTitle.fontSize = 22;
        cheatTitle.size.set(260, 30);
        this.pauseMenuElements.push(cheatTitle);

        this.pauseCheatInput = <TextInput>this.add.uiElement(UIElementType.TEXT_INPUT, MBLayers.PAUSE, {
            position: viewportPosition(pause.buttonCenterX, pause.cheatInputY)
        });
        this.pauseCheatInput.size.set(320, 42);
        this.pauseCheatInput.font = "PixelSimple";
        this.pauseCheatInput.fontSize = 22;
        this.pauseCheatInput.backgroundColor = new Color(255, 255, 255, 1);
        this.pauseCheatInput.borderColor = Color.WHITE;
        this.pauseCheatInput.borderRadius = 0;
        this.pauseMenuElements.push(this.pauseCheatInput);

        this.refreshPauseInventoryList();
        this.refreshPauseInventoryPopup();
    }

    protected initializePauseButton(position: Vec2, text: string, onClick: () => void): Button {
        const button = <Button>this.add.uiElement(UIElementType.BUTTON, MBLayers.PAUSE, {
            position: position,
            text: text
        });
        button.backgroundColor = new Color(26, 22, 28, 0.92);
        button.borderColor = new Color(186, 150, 86, 1);
        button.borderRadius = 4;
        button.setPadding(new Vec2(50, 10));
        button.font = "PixelSimple";
        button.fontSize = 24;
        button.textColor = new Color(246, 238, 214, 1);
        button.onClick = onClick;
        return button;
    }

    protected initializeUpgradeRewardUI(): void {
        const size = this.viewport.getHalfSize();
        const viewSize = size.scaled(2);
        const viewportPosition = (x: number, y: number): Vec2 => new Vec2(viewSize.x * (x / 1200), viewSize.y * (y / 800));
        const viewportGraphicSize = (x: number, y: number): Vec2 => new Vec2(viewSize.x * (x / 1200), viewSize.y * (y / 800));

        this.upgradeRewardOverlay = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: size.clone(),
            size: viewSize
        });
        this.upgradeRewardOverlay.color = new Color(12, 10, 18, 0.78);
        this.upgradeRewardOverlay.visible = false;
        this.upgradeRewardElements.push(this.upgradeRewardOverlay);

        this.upgradeRewardPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: viewportPosition(600, 360),
            size: viewportGraphicSize(430, 250)
        });
        this.upgradeRewardPanel.color = new Color(20, 18, 24, 0.96);
        this.upgradeRewardPanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.upgradeRewardPanel.visible = false;
        this.upgradeRewardElements.push(this.upgradeRewardPanel);

        this.upgradeRewardTitle = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: viewportPosition(600, 285),
            text: ""
        });
        this.upgradeRewardTitle.size.copy(viewportGraphicSize(340, 28));
        this.upgradeRewardTitle.font = "PixelSimple";
        this.upgradeRewardTitle.fontSize = 22;
        this.upgradeRewardTitle.textColor = new Color(246, 238, 214, 1);
        this.upgradeRewardTitle.visible = false;
        this.upgradeRewardElements.push(this.upgradeRewardTitle);

        for(let i = 0; i < 5; i++){
            const line = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
                position: viewportPosition(600, 332 + i * 26),
                text: ""
            });
            line.size.copy(viewportGraphicSize(340, 20));
            line.font = "PixelSimple";
            line.fontSize = 14;
            line.textColor = new Color(225, 224, 230, 1);
            line.visible = false;
            this.upgradeRewardLines.push(line);
            this.upgradeRewardElements.push(line);
        }

        this.upgradeRewardConfirmButton = <Button>this.add.uiElement(UIElementType.BUTTON, MBLayers.UI, {
            position: viewportPosition(600, 440),
            text: "OK"
        });
        this.upgradeRewardConfirmButton.backgroundColor = new Color(26, 22, 28, 0.92);
        this.upgradeRewardConfirmButton.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.upgradeRewardConfirmButton.borderRadius = 4;
        this.upgradeRewardConfirmButton.setPadding(new Vec2(40, 8));
        this.upgradeRewardConfirmButton.font = "PixelSimple";
        this.upgradeRewardConfirmButton.fontSize = 20;
        this.upgradeRewardConfirmButton.textColor = new Color(246, 238, 214, 1);
        this.upgradeRewardConfirmButton.onClick = () => this.confirmUpgradeRewardPopup();
        this.upgradeRewardConfirmButton.visible = false;
        this.upgradeRewardElements.push(this.upgradeRewardConfirmButton);
    }

    protected initializeDialogueUI(): void {
        const size = this.viewport.getHalfSize();
        const viewSize = size.scaled(2);
        const viewportPosition = (x: number, y: number): Vec2 => new Vec2(viewSize.x * (x / 1200), viewSize.y * (y / 800));
        const viewportGraphicSize = (x: number, y: number): Vec2 => new Vec2(viewSize.x * (x / 1200), viewSize.y * (y / 800));

        this.dialogueOverlay = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: size.clone(),
            size: viewSize
        });
        this.dialogueOverlay.color = new Color(12, 10, 18, 0.72);
        this.dialogueOverlay.visible = false;
        this.dialogueElements.push(this.dialogueOverlay);

        this.dialoguePanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: viewportPosition(600, 642),
            size: viewportGraphicSize(760, 150)
        });
        this.dialoguePanel.color = new Color(18, 16, 22, 0.97);
        this.dialoguePanel.borderColor = MBLevel.HEALTH_BAR_BORDER_COLOR;
        this.dialoguePanel.visible = false;
        this.dialogueElements.push(this.dialoguePanel);

        this.dialogueSpeakerLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: viewportPosition(360, 594),
            text: ""
        });
        this.dialogueSpeakerLabel.size.copy(viewportGraphicSize(260, 24));
        this.dialogueSpeakerLabel.font = "PixelSimple";
        this.dialogueSpeakerLabel.fontSize = 18;
        this.dialogueSpeakerLabel.textColor = new Color(246, 238, 214, 1);
        this.dialogueSpeakerLabel.setHAlign("left");
        this.dialogueSpeakerLabel.visible = false;
        this.dialogueElements.push(this.dialogueSpeakerLabel);

        for(let i = 0; i < 4; i++){
            const line = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
                position: viewportPosition(600, 622 + i * 20),
                text: ""
            });
            line.size.copy(viewportGraphicSize(680, 18));
            line.font = "PixelSimple";
            line.fontSize = 14;
            line.textColor = new Color(228, 226, 232, 1);
            line.setHAlign("left");
            line.visible = false;
            this.dialogueLines.push(line);
            this.dialogueElements.push(line);
        }

        this.dialogueAdvanceLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: viewportPosition(846, 706),
            text: ""
        });
        this.dialogueAdvanceLabel.size.copy(viewportGraphicSize(220, 18));
        this.dialogueAdvanceLabel.font = "PixelSimple";
        this.dialogueAdvanceLabel.fontSize = 11;
        this.dialogueAdvanceLabel.textColor = new Color(210, 196, 164, 1);
        this.dialogueAdvanceLabel.visible = false;
        this.dialogueElements.push(this.dialogueAdvanceLabel);
    }

    /**
     * Initializes the particles system used by the player's weapon.
     */
    protected initializeWeaponSystem(): void {
        this.playerWeaponSystem = new PlayerWeapon(200, Vec2.ZERO, 1000, 1, 0, 200);
        this.playerWeaponSystem.initializePool(this, MBLayers.PRIMARY);
    }

    /**
     * Initializes an optional boss for the level.
     * Override in levels that have a boss encounter.
     */
    protected initializeBoss(): void {}

    protected getBossDamageTarget(): AnimatedSprite | null {
        return null;
    }

    protected getPlayerWeaponDamage(): number {
        return MBProgress.hasUpgrade(UpgradeId.UPGRADED_SWORD) ? 2 : 1;
    }

    /**
     * Initializes the player, setting the player's initial position to the given position.
     * @param position the player's spawn position
     */
    protected initializePlayer(key: string): void {
        if (this.playerWeaponSystem === undefined) {
            throw new Error("Player weapon system must be initialized before initializing the player!");
        }
        if (this.playerSpawn === undefined) {
            throw new Error("Player spawn must be set before initializing the player!");
        }

        // Add the player to the scene
        this.player = this.add.animatedSprite(key, MBLayers.PRIMARY);
        this.player.scale.set(1, 1);
        this.player.position.copy(this.playerSpawn);
        
        // Give the player physics
        const playerHitbox = MBLevel.PLAYER_HITBOX_TUNING;
        this.player.addPhysics(
            new AABB(this.player.position.clone(), new Vec2(playerHitbox.halfWidth, playerHitbox.halfHeight)),
            new Vec2(0, playerHitbox.offsetY)
        );

        // TODO - give the player their flip tween

        // Give the player a death animation
        this.player.tweens.add(PlayerTweens.DEATH, {
            startDelay: 0,
            duration: 500,
            effects: [
                {
                    property: "rotation",
                    start: 0,
                    end: Math.PI,
                    ease: EaseFunctionType.IN_OUT_QUAD
                },
                {
                    property: "alpha",
                    start: 1,
                    end: 0,
                    ease: EaseFunctionType.IN_OUT_QUAD
                }
            ],
            onEnd: MBEvents.PLAYER_DEAD
        });

        this.player.tweens.add(PlayerTweens.FLIP, {
            startDelay: 0,
            duration: 300,
            effects: [{
                property: TweenableProperties.rotation,
                resetOnComplete: true,
                start: 0,
                end: 2 * Math.PI,
                ease: EaseFunctionType.OUT_IN_QUAD
            }],
            reverseOnComplete: false,
            loop: false, 
        })

        // Give the player it's AI
        this.player.addAI(PlayerController, { 
            weaponSystem: this.playerWeaponSystem, 
            tilemap: this.wallsLayerKey
        });
        this.applyPlayerProgressEffects(true);
    }
    /**
     * Initializes the viewport
     */
    protected initializeViewport(): void {
        if (this.player === undefined) {
            throw new Error("Player must be initialized before setting the viewport to folow the player");
        }
        this.viewport.follow(this.player);
        this.viewport.setZoomLevel(3);
        this.viewport.setBounds(0, 0, 512, 512);
    }
    /**
     * Initializes the level end area
     */
    protected initializeLevelEnds(): void {
        if (!this.layers.has(MBLayers.PRIMARY)) {
            throw new Error("Can't initialize the level ends until the primary layer has been added to the scene!");
        }
        
        this.levelEndArea = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.PRIMARY, { position: this.levelEndPosition, size: this.levelEndHalfSize });
        this.levelEndArea.addPhysics(undefined, undefined, false, true);
        this.levelEndArea.color = new Color(255, 0, 255, .20);
        
    }

    /* Misc methods */

    // Get the key of the player's jump audio file
    public getJumpAudioKey(): string {
        return this.jumpAudioKey
    }

    public getDashAudioKey(): string {
        return this.dashAudioKey;
    }

    public getAttackAudioKey(): string {
        return this.attackAudioKey;
    }

    public getDamageAudioKey(): string {
        return this.damageAudioKey;
    }
}
