import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Button from "../../Wolfie2D/Nodes/UIElements/Button";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../Wolfie2D/Scene/Scene";
import Color from "../../Wolfie2D/Utils/Color";
import SplashScreen from "./SplashScreen";
import ControlsScreen from "./ControlsScreen";
import HelpScreen from "./HelpScreen";


// Layers for the main menu scene
export const MenuLayers = {
    MAIN: "MAIN",
    UI: "UI"
} as const;

export default class MainMenu extends Scene {

    public static readonly LOGO_KEY = "MAIN_MENU_LOGO";
    public static readonly LOGO_PATH = "game_assets/art/Logo.png";
    public static readonly MUSIC_KEY = "MAIN_MENU_MUSIC";
    public static readonly MUSIC_PATH = "game_assets/music/MB_menu_music.mp3";

    public loadScene(): void {
        // Load the menu logo
        this.load.image(MainMenu.LOGO_KEY, MainMenu.LOGO_PATH);
        this.load.audio(MainMenu.MUSIC_KEY, MainMenu.MUSIC_PATH);

    }

    public startScene(): void {
        this.addLayer(MenuLayers.MAIN);
        this.addUILayer(MenuLayers.UI);

        // Center the viewport
        this.viewport.unfollow();
        this.viewport.setZoomLevel(1);
        let size = this.viewport.getHalfSize();
        this.viewport.setFocus(size);
        this.viewport.setCenter(size);

        const logo = this.add.sprite(MainMenu.LOGO_KEY, MenuLayers.MAIN);
        logo.scale.set(0.7, 0.7);
        logo.position.set(size.x, size.y - 130);

        // Create a play button
        let playBtn = <Button>this.add.uiElement(UIElementType.BUTTON, MenuLayers.UI, {position: new Vec2(size.x, size.y + 120), text: "Play Game"});
        playBtn.backgroundColor = Color.TRANSPARENT;
        playBtn.borderColor = Color.WHITE;
        playBtn.borderRadius = 0;
        playBtn.setPadding(new Vec2(50, 10));
        playBtn.font = "PixelSimple";

        let controlBtn = <Button>this.add.uiElement(UIElementType.BUTTON, MenuLayers.UI, {position: new Vec2(size.x, size.y + 180), text: "Controls"});
        controlBtn.backgroundColor = Color.TRANSPARENT;
        controlBtn.borderColor = Color.WHITE;
        controlBtn.borderRadius = 0;
        controlBtn.setPadding(new Vec2(50, 10));
        controlBtn.font = "PixelSimple";

        let helpBtn = <Button>this.add.uiElement(UIElementType.BUTTON, MenuLayers.UI, {position: new Vec2(size.x, size.y + 240), text: "Help"});
        helpBtn.backgroundColor = Color.TRANSPARENT;
        helpBtn.borderColor = Color.WHITE;
        helpBtn.borderRadius = 0;
        helpBtn.setPadding(new Vec2(50, 10));
        helpBtn.font = "PixelSimple";

        // When the play button is clicked, go to the next scene
        playBtn.onClick = () => {
            this.emitter.fireEvent(GameEventType.STOP_SOUND, {key: SplashScreen.MUSIC_KEY});

            import("./MBLevel1").then(({ default: Level1 }) => {
                this.sceneManager.changeToScene(Level1);
            });
        }

        controlBtn.onClick = () => {
            this.sceneManager.changeToScene(ControlsScreen);
        }

        helpBtn.onClick = () => {
            this.sceneManager.changeToScene(HelpScreen);
        }
    }
}
