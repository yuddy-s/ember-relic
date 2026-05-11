import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
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
import MBAnimatedSprite from "../Nodes/MBAnimatedSprite";
import { MBEvents } from "../MBEvents";
import { MBPhysicsGroups } from "../MBPhysicsGroups";
import { placeGroundEnemyOnFloor } from "../Enemies/EnemyPhysicsUtils";
import { MBProgress } from "../Progress/MBProgress";
import { ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";
import MBLevel, { MBLayers } from "./MBLevel";
import MainMenu from "./MainMenu";
import {
    getPendingSolenConversation,
    getSolenConversationForInteraction,
    SolenAnimations,
    SolenConversation,
    SOLEN_HITBOX_HALF_SIZE,
    SOLEN_INTERACTION_HALF_SIZE,
    SOLEN_INTERACTION_RANGE_PADDING,
    SOLEN_SPRITE_KEY,
    SOLEN_SPRITE_PATH,
    SOLEN_TEST_SCALE
} from "../NPCs/solen";

declare const require: (path: string) => { default: new (...args: any) => Scene };

type PortalPlacement = {
    col: number;
    row: number;
    frame: number;
    targetSceneId: ProgressTargetSceneId;
    promptText?: string;
};

type HubPortalBinding = {
    sprite: Sprite;
    targetSceneId: ProgressTargetSceneId;
    promptText: string;
    interactionHalfSize: Vec2;
};

export default class HubLevel extends MBLevel {
    private portalSprites: Array<Sprite> = [];
    private hubPortalBindings: Array<HubPortalBinding> = [];
    private hubBackground!: Sprite;
    private hubCaveBackground!: Rect;
    private campfireSprite: Sprite | null = null;
    private solen!: MBAnimatedSprite;
    private solenTextBubbleSprite: Sprite | null = null;
    private solenPromptPanel!: Rect;
    private solenPromptLabel!: Label;
    private playerCanInteractWithSolen: boolean = false;

    public static readonly PLAYER_SPAWN = new Vec2(256, 864);
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
    public static readonly CAMPFIRE_POSITION = new Vec2(624, 896);
    public static readonly SOLEN_POSITION = new Vec2(656, 880);
    public static readonly SOLEN_TEXT_BUBBLE_IMAGE_KEY = "SOLEN_TEXT_BUBBLE";
    public static readonly SOLEN_TEXT_BUBBLE_IMAGE_PATH = "game_assets/art/textBubbles.png";
    public static readonly SOLEN_TEXT_BUBBLE_OFFSET = new Vec2(5, -27);
    public static readonly SOLEN_TEXT_BUBBLE_SCALE = new Vec2(0.15, 0.15);

    private static readonly DEFAULT_PORTAL_PLACEMENTS: Array<PortalPlacement> = [
        { col: 87, row: 81, frame: 2, targetSceneId: ProgressTargetSceneId.LEVEL_2 },
        { col: 4, row: 10, frame: 1 , targetSceneId: ProgressTargetSceneId.LEVEL_3 },
        { col: 158, row: 46, frame: 4, targetSceneId: ProgressTargetSceneId.LEVEL_4 }, 
    ];

    public static readonly TILEMAP_WIDTH_TILES = 192;
    public static readonly TILEMAP_HEIGHT_TILES = 112;
    public static readonly TILE_SIZE = 16;
    public static readonly LEVEL_ZOOM = 2.6;

    public static readonly LEVEL_MUSIC_KEY = "LEVEL_MUSIC";
    public static readonly LEVEL_MUSIC_PATH = "game_assets/music/hub_level_music.wav";

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

    public static readonly BACKGROUND_IMAGE_KEY = "HUB_BACKGROUND";
    public static readonly BACKGROUND_IMAGE_PATH = "game_assets/tilemaps/hubBg.png";
    public static readonly BACKGROUND_PARALLAX = new Vec2(0.25, 0.15);
    public static readonly BACKGROUND_LAYER_DEPTH = -100;
    public static readonly BACKGROUND_VIEW_PADDING = 1.05;
    public static readonly CAVE_BACKGROUND_START_Y = 1152;

    public constructor(viewport: Viewport, sceneManager: SceneManager, renderingManager: RenderingManager, options: Record<string, any>) {
        super(viewport, sceneManager, renderingManager, options);

        this.tilemapKey = HubLevel.TILEMAP_KEY;
        this.tilemapScale = HubLevel.TILEMAP_SCALE;
        this.destructibleLayerKey = HubLevel.DESTRUCTIBLE_LAYER_KEY;
        this.damagingLayerKey = HubLevel.DAMAGING_LAYER_KEY;
        this.wallsLayerKey = HubLevel.WALLS_LAYER_KEY;
        this.backgroundImageKey = undefined;
        this.backgroundParallax = HubLevel.BACKGROUND_PARALLAX;

        this.playerSpriteKey = HubLevel.PLAYER_SPRITE_KEY;
        this.playerSpawn = HubLevel.PLAYER_SPAWN;

        this.levelMusicKey = HubLevel.LEVEL_MUSIC_KEY;
        this.jumpAudioKey = HubLevel.JUMP_AUDIO_KEY;
        this.dashAudioKey = HubLevel.DASH_AUDIO_KEY;
        this.attackAudioKey = HubLevel.ATTACK_AUDIO_KEY;
        this.damageAudioKey = HubLevel.DAMAGE_AUDIO_KEY;
        this.tileDestroyedAudioKey = HubLevel.TILE_DESTROYED_KEY;
        this.dyingAudioKey = HubLevel.DYING_AUDIO_KEY;

        this.levelEndPosition = new Vec2(1880, 170);
        this.levelEndHalfSize = new Vec2(32, 32).mult(this.tilemapScale);
    }

    public loadScene(): void {
        this.load.tilemap(this.tilemapKey, HubLevel.TILEMAP_PATH);
        this.load.spritesheet(this.playerSpriteKey, HubLevel.PLAYER_SPRITE_PATH);
        this.load.spritesheet(SOLEN_SPRITE_KEY, SOLEN_SPRITE_PATH);
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
        this.load.image(HubLevel.CAMPFIRE_IMAGE_KEY, HubLevel.CAMPFIRE_IMAGE_PATH);
        this.load.image(HubLevel.SOLEN_TEXT_BUBBLE_IMAGE_KEY, HubLevel.SOLEN_TEXT_BUBBLE_IMAGE_PATH);
        this.load.audio(this.levelMusicKey, HubLevel.LEVEL_MUSIC_PATH);
        this.load.audio(this.jumpAudioKey, HubLevel.JUMP_AUDIO_PATH);
        this.load.audio(this.dashAudioKey, HubLevel.DASH_AUDIO_PATH);
        this.load.audio(this.attackAudioKey, HubLevel.ATTACK_AUDIO_PATH);
        this.load.audio(this.damageAudioKey, HubLevel.DAMAGE_AUDIO_PATH);
        this.load.audio(this.tileDestroyedAudioKey, HubLevel.TILE_DESTROYED_PATH);
        this.load.audio(this.dyingAudioKey, HubLevel.DYING_AUDIO_PATH);
        this.load.image(HubLevel.BACKGROUND_IMAGE_KEY, HubLevel.BACKGROUND_IMAGE_PATH);
    }

    public unloadScene(): void {
        this.resourceManager.keepSpritesheet(this.playerSpriteKey);
        this.resourceManager.keepSpritesheet(SOLEN_SPRITE_KEY);
        this.resourceManager.keepAudio(this.jumpAudioKey);
        this.resourceManager.keepAudio(this.dashAudioKey);
        this.resourceManager.keepAudio(this.attackAudioKey);
        this.resourceManager.keepAudio(this.damageAudioKey);
        this.resourceManager.keepAudio(this.dyingAudioKey);
        this.resourceManager.keepAudio(this.tileDestroyedAudioKey);
    }

    public startScene(): void {
        super.startScene();
        this.initializeSolen();
        this.initializeSolenTextBubble();
        const defaultPortalDestination = this.resolveProgressTargetScene(ProgressTargetSceneId.LEVEL_1);
        if(defaultPortalDestination !== null){
            this.travelPortalDestination = defaultPortalDestination;
        }
        this.updateHubBackground();
    }

    public updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        this.updateHubBackground();
        this.updateSolenFacing();
        this.updateSolenTextBubble();
        this.updateSolenPrompt();

        if(
            this.playerCanInteractWithSolen &&
            !this.pauseMenuOpen &&
            !this.hasBlockingModal() &&
            !this.levelEndTransitionStarted &&
            Input.isKeyJustPressed("e")
        ){
            this.startSolenConversation();
        }
    }

    protected initializeBackground(): void {
        this.addParallaxLayer(MBLayers.BACKGROUND, HubLevel.BACKGROUND_PARALLAX, HubLevel.BACKGROUND_LAYER_DEPTH);
        this.addParallaxLayer(MBLayers.CAVE_BACKGROUND, HubLevel.BACKGROUND_PARALLAX, HubLevel.BACKGROUND_LAYER_DEPTH + 1);
        this.hubBackground = this.add.sprite(HubLevel.BACKGROUND_IMAGE_KEY, MBLayers.BACKGROUND);
        this.hubCaveBackground = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.CAVE_BACKGROUND, {
            position: Vec2.ZERO,
            size: Vec2.ZERO
        });
        this.hubCaveBackground.color = Color.BLACK;
        this.hubCaveBackground.visible = false;
        this.updateHubBackground();
    }

    protected updateHubBackground(): void {
        if(this.hubBackground === undefined || this.hubCaveBackground === undefined){
            return;
        }

        const view = this.viewport.getView();
        const viewWidth = view.hw * 2;
        const viewHeight = view.hh * 2;
        const origin = this.viewport.getOrigin();
        const backgroundPosition = new Vec2(
            origin.x * HubLevel.BACKGROUND_PARALLAX.x + view.hw,
            origin.y * HubLevel.BACKGROUND_PARALLAX.y + view.hh
        );

        const coverScale = Math.max(
            viewWidth / this.hubBackground.size.x,
            viewHeight / this.hubBackground.size.y
        ) * HubLevel.BACKGROUND_VIEW_PADDING;

        this.hubBackground.scale.set(coverScale, coverScale);
        this.hubBackground.position.copy(backgroundPosition);
        this.hubBackground.visible = true;

        const caveTopInView = Math.max(0, Math.min(viewHeight, HubLevel.CAVE_BACKGROUND_START_Y - origin.y));
        const caveVisibleHeight = viewHeight - caveTopInView;

        this.hubCaveBackground.visible = caveVisibleHeight > 0;
        if(this.hubCaveBackground.visible){
            this.hubCaveBackground.size.set(
                viewWidth * HubLevel.BACKGROUND_VIEW_PADDING,
                caveVisibleHeight
            );
            this.hubCaveBackground.position.set(
                backgroundPosition.x,
                origin.y * HubLevel.BACKGROUND_PARALLAX.y + caveTopInView + caveVisibleHeight / 2
            );
        }
    }

    protected updateSolenFacing(): void {
        if(this.solen === undefined || this.player === undefined){
            return;
        }

        this.solen.invertX = this.player.position.x < this.solen.position.x;
    }

    public getDyingAudioKey(): string {
        return this.dyingAudioKey;
    }

    protected initializeTilemap(): void {
        super.initializeTilemap();
        this.initializePortalSprites();
        this.initializeCampfireSprite();
    }

    protected initializeLevelEnds(): void {}

    protected initializeViewport(): void {
        super.initializeViewport();
        this.viewport.setZoomLevel(HubLevel.LEVEL_ZOOM);

        const worldWidth = HubLevel.TILEMAP_WIDTH_TILES * HubLevel.TILE_SIZE * this.tilemapScale.x;
        const worldHeight = HubLevel.TILEMAP_HEIGHT_TILES * HubLevel.TILE_SIZE * this.tilemapScale.y;
        this.viewport.setBounds(0, 0, worldWidth, worldHeight);
    }

    protected initializeUI(): void {
        super.initializeUI();

        const promptPosition = this.getInteractionPromptPosition();
        this.solenPromptPanel = <Rect>this.add.graphic(GraphicType.RECT, MBLayers.UI, {
            position: promptPosition,
            size: MBLevel.INTERACTION_PROMPT_PANEL_SIZE.clone()
        });

        this.solenPromptLabel = <Label>this.add.uiElement(UIElementType.LABEL, MBLayers.UI, {
            position: promptPosition,
            text: "[E] Speak with Solen"
        });
        this.formatInteractionPrompt(this.solenPromptPanel, this.solenPromptLabel);
    }

    protected initializeSolen(): void {
        this.solen = this.add.animatedSprite(SOLEN_SPRITE_KEY, MBLayers.PRIMARY);
        this.solen.position.copy(HubLevel.SOLEN_POSITION);
        this.solen.scale.copy(SOLEN_TEST_SCALE);
        placeGroundEnemyOnFloor(this.solen, this.walls, this.tilemapScale, SOLEN_HITBOX_HALF_SIZE.clone());
        this.solen.addPhysics(
            new AABB(this.solen.position.clone(), SOLEN_HITBOX_HALF_SIZE.clone()),
            undefined,
            true,
            true
        );
        this.solen.setGroup(MBPhysicsGroups.NPC);
        this.solen.animation.play(SolenAnimations.IDLE, true);
    }

    protected initializeSolenTextBubble(): void {
        this.solenTextBubbleSprite = this.add.sprite(HubLevel.SOLEN_TEXT_BUBBLE_IMAGE_KEY, MBLayers.PRIMARY);
        this.solenTextBubbleSprite.scale.copy(HubLevel.SOLEN_TEXT_BUBBLE_SCALE);
        this.solenTextBubbleSprite.visible = false;
        this.updateSolenTextBubble();
    }

    protected updateSolenTextBubble(): void {
        if(this.solen === undefined || this.solenTextBubbleSprite === null){
            return;
        }

        this.solenTextBubbleSprite.position.copy(
            this.solen.position.clone().add(HubLevel.SOLEN_TEXT_BUBBLE_OFFSET)
        );
        this.solenTextBubbleSprite.visible = getPendingSolenConversation() !== null &&
            !this.hasBlockingModal() &&
            !this.levelEndTransitionStarted;
    }

    protected updateSolenPrompt(): void {
        if(
            this.solen === undefined ||
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.playerCanInteractWithSolen = false;
            this.solenPromptPanel.visible = false;
            this.solenPromptLabel.visible = false;
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        const interactionAABB = this.solen.hasPhysics
            ? this.solen.collisionShape.getBoundingRect()
            : new AABB(this.solen.position.clone(), SOLEN_INTERACTION_HALF_SIZE.clone());
        const promptAABB = new AABB(
            interactionAABB.center.clone(),
            new Vec2(
                interactionAABB.halfSize.x + SOLEN_INTERACTION_RANGE_PADDING.x,
                interactionAABB.halfSize.y + SOLEN_INTERACTION_RANGE_PADDING.y
            )
        );

        this.playerCanInteractWithSolen = playerAABB.overlapArea(promptAABB) > 0;
        this.solenPromptLabel.text = getSolenConversationForInteraction().promptText;
        this.solenPromptPanel.visible = this.playerCanInteractWithSolen;
        this.solenPromptLabel.visible = this.playerCanInteractWithSolen;
    }

    protected startSolenConversation(): void {
        const conversation = getSolenConversationForInteraction();
        this.playerCanInteractWithSolen = false;
        this.solenPromptPanel.visible = false;
        this.solenPromptLabel.visible = false;
        if(this.solenTextBubbleSprite !== null){
            this.solenTextBubbleSprite.visible = false;
        }
        this.showDialogue(conversation.pages, () => this.completeSolenConversation(conversation));
    }

    protected completeSolenConversation(conversation: SolenConversation): void {
        const finalizeConversation = (): void => {
            if(conversation.id === "solen_intro_lantern"){
                MBProgress.unlockHearth();
            }

            if(conversation.advanceStageOnComplete && conversation.stageIndex !== undefined){
                MBProgress.setSolenConversationStage(
                    Math.max(MBProgress.getSolenConversationStage(), conversation.stageIndex + 1)
                );
            }
        };

        if(conversation.rewardUpgradeId !== undefined && !MBProgress.hasUpgrade(conversation.rewardUpgradeId)){
            this.showUpgradeRewardPopup(conversation.rewardUpgradeId, () => {
                this.grantUpgrade(conversation.rewardUpgradeId);
                finalizeConversation();
            });
            return;
        }

        finalizeConversation();
    }

    protected initializePortalSprites(): void {
        const portalMarkers = this.getTilemap(HubLevel.PORTAL_MARKER_LAYER_KEY) as OrthogonalTilemap | null;
        const tileSize = portalMarkers?.getTileSize() ?? new Vec2(HubLevel.TILE_SIZE, HubLevel.TILE_SIZE);
        const placements = portalMarkers !== null ? this.getPortalPlacementsFromLayer(portalMarkers) : [];
        const portalsToSpawn = placements.length > 0 ? placements : HubLevel.DEFAULT_PORTAL_PLACEMENTS;

        this.portalSprites = [];
        this.hubPortalBindings = [];

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
            this.hubPortalBindings.push({
                sprite: portal,
                targetSceneId: placement.targetSceneId,
                promptText: placement.promptText ?? "[E] Enter Portal",
                interactionHalfSize: new Vec2(
                    (HubLevel.PORTAL_FRAME_SIZE.x * portal.scale.x) / 2 + 16,
                    (HubLevel.PORTAL_FRAME_SIZE.y * portal.scale.y) / 2 + 20
                )
            });
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
        const defaultPlacements = HubLevel.DEFAULT_PORTAL_PLACEMENTS;

        for(let row = 0; row < dimensions.y; row++){
            for(let col = 0; col < dimensions.x; col++){
                const tile = portalMarkers.getTileAtRowCol(new Vec2(col, row));
                const frame = tile - firstPortalGid;

                if(frame < 0 || frame >= HubLevel.PORTAL_FRAME_COUNT){
                    continue;
                }

                const defaultPlacement = defaultPlacements[placements.length] ?? defaultPlacements[defaultPlacements.length - 1];
                placements.push({
                    col,
                    row,
                    frame,
                    targetSceneId: defaultPlacement.targetSceneId,
                    promptText: defaultPlacement.promptText
                });
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

    protected updateLevelEndPrompt(): void {
        if(
            this.player === undefined ||
            !this.player.hasPhysics ||
            this.pauseMenuOpen ||
            this.hasBlockingModal() ||
            this.levelEndTransitionStarted
        ){
            this.playerCanInteractWithLevelEnd = false;
            this.levelEndPromptPanel.visible = false;
            this.levelEndPromptLabel.visible = false;
            return;
        }

        const playerAABB = this.player.collisionShape.getBoundingRect();
        let activePortal: HubPortalBinding | null = null;
        let bestOverlap = 0;

        for(const portal of this.hubPortalBindings){
            const promptAABB = new AABB(portal.sprite.position.clone(), portal.interactionHalfSize.clone());
            const overlapArea = playerAABB.overlapArea(promptAABB);
            if(overlapArea <= 0 || overlapArea <= bestOverlap){
                continue;
            }

            bestOverlap = overlapArea;
            activePortal = portal;
        }

        this.playerCanInteractWithLevelEnd = activePortal !== null;
        this.levelEndPromptPanel.visible = this.playerCanInteractWithLevelEnd;
        this.levelEndPromptLabel.visible = this.playerCanInteractWithLevelEnd;

        if(activePortal === null){
            return;
        }

        const destination = this.resolveProgressTargetScene(activePortal.targetSceneId);
        if(destination === null){
            this.playerCanInteractWithLevelEnd = false;
            this.levelEndPromptPanel.visible = false;
            this.levelEndPromptLabel.visible = false;
            return;
        }

        this.travelPortalDestination = destination;
        this.levelEndPromptLabel.text = activePortal.promptText;
    }

    protected resolveProgressTargetScene(targetSceneId: ProgressTargetSceneId): (new (...args: any) => Scene) | null {
        switch(targetSceneId){
            case ProgressTargetSceneId.HUB:
                return HubLevel;
            case ProgressTargetSceneId.LEVEL_1:
                return require("./MBLevel1").default;
            case ProgressTargetSceneId.LEVEL_2:
                return require("./MBLevel2").default;
            case ProgressTargetSceneId.LEVEL_3:
                return require("./MBLevel3").default;
            case ProgressTargetSceneId.LEVEL_4:
                return require("./MBLevel4").default;
            default:
                return null;
        }
    }

    protected getPlayerDeathDestination(): new (...args: any) => Scene {
        return HubLevel;
    }
}
