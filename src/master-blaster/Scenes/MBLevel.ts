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
import Scene from "../../Wolfie2D/Scene/Scene";
import SceneManager from "../../Wolfie2D/Scene/SceneManager";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import Timer from "../../Wolfie2D/Timing/Timer";
import Color from "../../Wolfie2D/Utils/Color";
import { EaseFunctionType } from "../../Wolfie2D/Utils/EaseFunctions";
import PlayerController, { PlayerAnimations, PlayerTweens } from "../Player/PlayerController";
import PlayerWeapon from "../Player/PlayerWeapon";

import { MBEvents } from "../MBEvents";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import MBFactoryManager from "../Factory/MBFactoryManager";
import { BossHandle } from "../Bosses/BossHandle";
import { executeCheatCode } from "../Cheats/MBCheatCodes";
import { MBProgress, UPGRADE_METADATA, UPGRADE_ORDER, UpgradeId } from "../Progress/MBProgress";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";
import MainMenu from "./MainMenu";

import Particle from "../../Wolfie2D/Nodes/Graphics/Particle";
import SplashScreen from "./SplashScreen";

/**
 * A const object for the layer names
 */
export const MBLayers = {
    // Optional level background layer
    BACKGROUND: "LEVEL_BG",
    // The primary layer
    PRIMARY: "PRIMARY",
    // The UI layer
    UI: "UI",
    PAUSE: "PAUSE"
} as const;

// The layers as a type
export type MBLayer = typeof MBLayers[keyof typeof MBLayers]

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
    private hudInventorySlots: Array<Label>;
    private hudInventoryIcons: Array<Sprite>;
    private pauseInventorySlots: Array<Button>;
    private pauseInventoryIcons: Array<Sprite>;
    private pauseInventoryPopupPanel!: Rect;
    private pauseInventoryPopupTitle!: Label;
    private pauseInventoryPopupLines: Array<Label>;
    private currentSelectedUpgradeId: UpgradeId | null;
    protected boss?: BossHandle;


    /** The end of level stuff */

    protected levelEndPosition!: Vec2;
    protected levelEndHalfSize!: Vec2;

    protected levelEndArea!: Rect;
    protected nextLevel!: new (...args: any) => Scene;
    protected levelEndTimer!: Timer;
    protected levelEndLabel!: Label;

    // Level end transition timer and graphic
    protected levelTransitionTimer!: Timer;
    protected levelTransitionScreen!: Rect;

    /** The keys to the tilemap and different tilemap layers */
    protected tilemapKey!: string;
    protected destructibleLayerKey?: string;
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
    /** The wall layer of the tilemap */
    protected walls!: OrthogonalTilemap;

    /** Out-of-bounds kill floor for instant death */
    protected deathY!: number;
    protected deathTriggered: boolean;

    /** Sound and music */
    protected levelMusicKey!: string;
    protected jumpAudioKey!: string;
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
    
    // HUD TUNING"
    // Change these values to adjust the in-game health bar and quick-slot row.
    protected static readonly HUD_TUNING = {
        left: 18,
        healthBarTop: 16,
        healthBarWidth: 300,
        healthBarHeight: 16,
        inventoryOffsetY: 30,
        slotSize: 20,
        slotGap: 35,
        iconSize: 18,
        healthBarRadius: 1,
        slotRadius: 6
    };

    // PAUSE TUNING
    // Change these values to adjust the pause menu layout without digging through UI creation code.
    protected static readonly PAUSE_TUNING = {
        titleCenterX: 600,
        titleY: 100,
        buttonCenterX: 600,
        continueY: 270,
        controlsY: 345,
        quitY: 420,
        inventoryCenterX: 170,
        inventoryPanelCenterY: 400,
        inventoryPanelWidth: 240,
        inventoryPanelHeight: 700,
        inventoryTitleY: 92,
        inventorySubtitleY: 126,
        inventorySlotStartY: 172,
        inventorySlotStepY: 50,
        inventorySlotSize: 70,
        inventoryIconSize: 58,
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
                groupNames: [MBPhysicsGroups.GROUND, MBPhysicsGroups.PLAYER, MBPhysicsGroups.PLAYER_WEAPON, MBPhysicsGroups.DESTRUCTABLE],
                collisions: [
                    //        G  P  W  D
                    /* G */  [0, 1, 1, 0],
                    /* P */  [1, 0, 0, 1],
                    /* W */  [1, 0, 0, 1],
                    /* D */  [0, 1, 1, 0]
                ]
         }});
        this.add = new MBFactoryManager(this, this.tilemaps);
        this.backgroundParallax = new Vec2(0.35, 1);
        this.backgroundLayerDepth = -10;
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
        this.currentSelectedUpgradeId = null;
        this.boss = undefined;
    }

    public initScene(init: Record<string, any>): void {
        MBProgress.loadFromInitData(init);
    }

    public startScene(): void {
        this.deathTriggered = false;

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
        this.handlePauseInput();

        // Handle all game events
        while (this.receiver.hasNextEvent()) {
            this.handleEvent(this.receiver.getNextEvent());
        }

        if(!this.pauseMenuOpen){
            this.handleOutOfBoundsDeath();
        }
    }

    public getDyingAudioKey() {
        return this.dyingAudioKey;
    }

    protected handlePauseInput(): void {
        if(Input.isKeyJustPressed("escape")){
            this.setPauseMenuOpen(!this.pauseMenuOpen);
            return;
        }

        if(this.pauseMenuOpen && this.pauseCheatInput.focused && Input.isKeyJustPressed("enter")){
            void this.executePauseCheatCode(this.pauseCheatInput.text);
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
        if(visible){
            this.setPauseInventorySelection(null);
        }

        for(const element of this.pauseControlsElements){
            element.visible = visible;
        }

        for(const element of this.pauseMenuElements){
            element.visible = !visible;
        }
    }

    protected async executePauseCheatCode(rawCode: string): Promise<void> {
        const result = executeCheatCode(rawCode, {
            boss: this.boss,
            refreshCheatDrivenUI: () => this.refreshInventoryUI(),
            resolveProgressTargetScene: (targetSceneId: ProgressTargetSceneId) => this.resolveProgressTargetScene(targetSceneId),
            setPauseMenuOpen: (paused: boolean) => this.setPauseMenuOpen(paused),
            warpToScene: (scene, init) => this.warpToScene(scene, init)
        });

        if(result.success){
            this.pauseCheatInput.text = "";
        }
    }

    protected resolveProgressTargetScene(_targetSceneId: ProgressTargetSceneId): (new (...args: any) => Scene) | null {
        return null;
    }

    protected warpToScene(scene: new (...args: any) => Scene, init?: Record<string, any>): void {
        this.emitter.fireEvent(GameEventType.STOP_SOUND, { key: this.levelMusicKey });
        this.sceneManager.changeToScene(scene, init);
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

            // When the level ends, change the scene to the next level
            case MBEvents.LEVEL_END: {
                this.emitter.fireEvent(GameEventType.STOP_SOUND, { key: this.levelMusicKey })
                this.sceneManager.changeToScene(this.nextLevel, MBProgress.toInitData());
                break;
            }
            case MBEvents.HEALTH_CHANGE: {
                this.handleHealthChange(event.data.get("curhp"), event.data.get("maxhp"));
                break;
            }
            case MBEvents.PLAYER_DEAD: {
                this.emitter.fireEvent(GameEventType.STOP_SOUND, { key: this.levelMusicKey });
                this.sceneManager.changeToScene(MainMenu);
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
        // If the timer hasn't run yet, start the end level animation
        if (!this.levelEndTimer.hasRun() && this.levelEndTimer.isStopped()) {
            this.levelEndTimer.start();
            this.levelEndLabel.tweens.play("slideIn");
        }
    }
    /**
     * This is the same healthbar found in The Yellow Submarine. I've adapted it slightly to account for the zoom factor. Other than that, the
     * code is basically the same.
     * 
     * @param currentHealth the current health of the player
     * @param maxHealth the maximum health of the player
     */
    protected handleHealthChange(currentHealth: number, maxHealth: number): void {
        const frameInset = 2;
        const fillHeight = Math.max(this.healthBarBg.size.y - frameInset, 2);
        const maxFillWidth = Math.max(this.healthBarBg.size.x - frameInset, 1);
        const clampedHealth = Math.max(0, Math.min(currentHealth, maxHealth));
        const fillWidth = maxHealth > 0 ? (maxFillWidth * clampedHealth) / maxHealth : 0;
        const zoom = this.getViewScale();
        const fillLeft = this.healthBarBg.position.x - maxFillWidth / (2 * zoom);

        this.healthBar.size.set(fillWidth, fillHeight);
        this.healthBar.position.set(fillLeft + fillWidth / (2 * zoom), this.healthBarBg.position.y);

        this.healthBar.backgroundColor = currentHealth < maxHealth * 1/4
            ? new Color(184, 34, 34, 1)
            : currentHealth < maxHealth * 3/4
                ? new Color(222, 66, 66, 1)
                : new Color(246, 102, 102, 1);
    }

    protected grantUpgrade(upgradeId: UpgradeId, refreshUI: boolean = true): void {
        MBProgress.grantUpgrade(upgradeId);

        if(refreshUI){
            this.refreshInventoryUI();
        }
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
                icon.visible = hasIcon;
            }
        });
    }

    protected getUpgradeIconImageKey(upgradeId: UpgradeId | null): string | null {
        switch(upgradeId){
            case UpgradeId.LANTERN:
                return MBLevel.LANTERN_ICON_KEY;
            default:
                return null;
        }
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
        const popupVisible = this.currentSelectedUpgradeId !== null && MBProgress.hasUpgrade(this.currentSelectedUpgradeId);

        this.pauseInventoryPopupPanel.visible = popupVisible;
        this.pauseInventoryPopupTitle.visible = popupVisible;
        for(const line of this.pauseInventoryPopupLines){
            line.visible = popupVisible;
        }

        if(!popupVisible){
            return;
        }

        const metadata = UPGRADE_METADATA[this.currentSelectedUpgradeId];
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
    }

    /**
     * Instantly kills the player if they fall below the map bounds.
     */
    protected handleOutOfBoundsDeath(): void {
        if(this.deathTriggered || this.player === undefined){
            return;
        }

        if(this.player.position.y > this.deathY){
            this.deathTriggered = true;
            this.emitter.fireEvent(MBEvents.PLAYER_DEAD);
        }
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
        this.receiver.subscribe(MBEvents.PARTICLE_HIT);
    }
    /**
     * Adds in any necessary UI to the game
     */
    protected initializeUI(): void {
        const hud = MBLevel.HUD_TUNING;
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

        // HealthBar
        this.healthBar = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: new Vec2(hpBarCenterX, hpBarCenterY),
            text: ""
        });
        this.healthBar.size = new Vec2(hpBarWidth - 2, hpBarHeight - 2);
        this.healthBar.backgroundColor = new Color(238, 84, 84, 1);
        this.healthBar.borderRadius = hud.healthBarRadius;

        // HealthBar Border
        this.healthBarBg = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: new Vec2(hpBarCenterX, hpBarCenterY),
            text: ""
        });
        this.healthBarBg.size = new Vec2(hpBarWidth, hpBarHeight);
        this.healthBarBg.backgroundColor = new Color(38, 20, 18, 0.95);
        this.healthBarBg.borderColor = new Color(183, 146, 82, 1);
        this.healthBarBg.borderRadius = hud.healthBarRadius;

        for(let i = 0; i < 5; i++){
            const slotCenterX = toUIScreenX(hudLeft + slotSize / 2 + i * (slotSize + slotGap));
            const slot = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
                position: new Vec2(slotCenterX, slotCenterY),
                text: ""
            });
            slot.size.set(slotSize, slotSize);
            slot.backgroundColor = new Color(24, 22, 28, 0.95);
            slot.borderColor = new Color(183, 146, 82, 1);
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

        this.levelTransitionScreen = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, { position: new Vec2(300, 200), size: new Vec2(600, 400) });
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
        const pauseSlotSize = viewportGraphicSize(pause.inventorySlotSize, pause.inventorySlotSize);

        UPGRADE_ORDER.forEach((upgradeId, index) => {
            const slotY = slotStartY + index * slotStepY;

            const slot = <Button>this.add.uiElement(UIElementType.BUTTON, MBLayers.PAUSE, {
                position: new Vec2(slotCenterX, slotY),
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

    /**
     * Initializes the particles system used by the player's weapon.
     */
    protected initializeWeaponSystem(): void {
        this.playerWeaponSystem = new PlayerWeapon(50, Vec2.ZERO, 1000, 3, 0, 50);
        this.playerWeaponSystem.initializePool(this, MBLayers.PRIMARY);
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
        this.player.addPhysics(new AABB(this.player.position.clone(), this.player.boundary.getHalfSize().clone()));

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
        this.levelEndArea.setTrigger(MBPhysicsGroups.PLAYER, MBEvents.PLAYER_ENTERED_LEVEL_END, "");
        this.levelEndArea.color = new Color(255, 0, 255, .20);
        
    }

    /* Misc methods */

    // Get the key of the player's jump audio file
    public getJumpAudioKey(): string {
        return this.jumpAudioKey
    }
}
