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
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import Button from "../../Wolfie2D/Nodes/UIElements/Button";
import Label, { HAlign } from "../../Wolfie2D/Nodes/UIElements/Label";
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

        this.initializeUI();

        // Initialize the player 
        this.initializePlayer(this.playerSpriteKey);

        // Initialize the viewport - this must come after the player has been initialized
        this.initializeViewport();
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
            this.destructable.setTrigger(MBPhysicsGroups.PLAYER_WEAPON, MBEvents.PARTICLE_HIT, null);
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

        for(const element of this.pauseControlsElements){
            element.visible = visible;
        }

        for(const element of this.pauseMenuElements){
            element.visible = !visible;
        }
    }

    protected async executePauseCheatCode(rawCode: string): Promise<void> {
        const code = rawCode.trim().toUpperCase();

        switch(code){
            case "EMBERSKIP1":
                break;
            case "EMBERSKIP2":
                break;
            case "EMBERSKIP3":
                break;
            case "EMBERSKIP4":
                break;
            case "GODMODE":
                break;
            case "KILLBOSS":
                break;
            case "HEARTHUNLOCK":
                break;
            default:
                break;
        }
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
                this.sceneManager.changeToScene(this.nextLevel);
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
		let unit = this.healthBarBg.size.x / maxHealth;
        
		this.healthBar.size.set(this.healthBarBg.size.x - unit * (maxHealth - currentHealth), this.healthBarBg.size.y);
		this.healthBar.position.set(this.healthBarBg.position.x - (unit / 2 / this.getViewScale()) * (maxHealth - currentHealth), this.healthBarBg.position.y);

		this.healthBar.backgroundColor = currentHealth < maxHealth * 1/4 ? Color.RED: currentHealth < maxHealth * 3/4 ? Color.YELLOW : Color.GREEN;
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

        // HP Label
		this.healthLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {position: new Vec2(205, 20), text: "HP "});
		this.healthLabel.size.set(300, 30);
		this.healthLabel.fontSize = 24;
		this.healthLabel.font = "Courier";

        // HealthBar
		this.healthBar = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {position: new Vec2(250, 20), text: ""});
		this.healthBar.size = new Vec2(300, 25);
		this.healthBar.backgroundColor = Color.GREEN;

        // HealthBar Border
		this.healthBarBg = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {position: new Vec2(250, 20), text: ""});
		this.healthBarBg.size = new Vec2(300, 25);
		this.healthBarBg.borderColor = Color.BLACK;

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
            position: viewportPosition(600, 100),
            size: viewportGraphicSize(320, 70)
        });
        titleBox.color = new Color(20, 18, 24, 0.85);
        titleBox.borderColor = Color.WHITE;
        this.pauseMenuElements.push(titleBox);

        const title = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.PAUSE, {
            position: viewportPosition(600, 100),
            text: "PAUSED"
        });
        title.textColor = Color.WHITE;
        title.font = "PixelSimple";
        title.fontSize = 40;
        this.pauseMenuElements.push(title);

        const buttonX = viewportPosition(600, 0).x;
        const continueButton = this.initializePauseButton(new Vec2(buttonX, viewportPosition(0, 280).y), "Continue", () => this.setPauseMenuOpen(false));
        this.pauseMenuElements.push(continueButton);

        this.pauseControlsButton = this.initializePauseButton(new Vec2(buttonX, viewportPosition(0, 355).y), "Controls", () => {
            this.showPauseControls(!this.pauseControlsOpen);
        });
        this.pauseMenuElements.push(this.pauseControlsButton);

        const quitButton = this.initializePauseButton(new Vec2(buttonX, viewportPosition(0, 430).y), "Quit", () => {
            this.emitter.fireEvent(GameEventType.STOP_SOUND, { key: this.levelMusicKey });
            this.sceneManager.changeToScene(SplashScreen);
        });
        this.pauseMenuElements.push(quitButton);

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
            position: viewportPosition(600, 665),
            text: "Cheat Codes"
        });
        cheatTitle.textColor = Color.WHITE;
        cheatTitle.font = "PixelSimple";
        cheatTitle.fontSize = 22;
        cheatTitle.size.set(260, 30);
        this.pauseMenuElements.push(cheatTitle);

        this.pauseCheatInput = <TextInput>this.add.uiElement(UIElementType.TEXT_INPUT, MBLayers.PAUSE, {
            position: viewportPosition(600, 720)
        });
        this.pauseCheatInput.size.set(320, 42);
        this.pauseCheatInput.font = "PixelSimple";
        this.pauseCheatInput.fontSize = 22;
        this.pauseCheatInput.backgroundColor = new Color(255, 255, 255, 1);
        this.pauseCheatInput.borderColor = Color.WHITE;
        this.pauseCheatInput.borderRadius = 0;
        this.pauseMenuElements.push(this.pauseCheatInput);
        
    }

    protected initializePauseButton(position: Vec2, text: string, onClick: () => void): Button {
        const button = <Button>this.add.uiElement(UIElementType.BUTTON, MBLayers.PAUSE, {
            position: position,
            text: text
        });
        button.backgroundColor = Color.TRANSPARENT;
        button.borderColor = Color.WHITE;
        button.borderRadius = 0;
        button.setPadding(new Vec2(50, 10));
        button.font = "PixelSimple";
        button.fontSize = 24;
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
        this.player.scale.set(0.125, 0.125);
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
        this.levelEndArea.setTrigger(MBPhysicsGroups.PLAYER, MBEvents.PLAYER_ENTERED_LEVEL_END, null);
        this.levelEndArea.color = new Color(255, 0, 255, .20);
        
    }

    /* Misc methods */

    // Get the key of the player's jump audio file
    public getJumpAudioKey(): string {
        return this.jumpAudioKey
    }
}
