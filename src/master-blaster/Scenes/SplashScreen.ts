import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Input from "../../Wolfie2D/Input/Input";
import Scene from "../../Wolfie2D/Scene/Scene";
import MainMenu from "./MainMenu";
import { TweenableProperties } from "../../Wolfie2D/Nodes/GameNode";
import { EaseFunctionType } from "../../Wolfie2D/Utils/EaseFunctions";

export const SplashLayers = {
    BG: "BG",
    FG: "FG"
} as const;

export default class SplashScreen extends Scene {

    public static readonly SPLASH_KEY = "SPLASH_IMAGE";
    public static readonly SPLASH_PATH = "game_assets/art/Logo.png";
    public static readonly SPLASH_TEXT_KEY = "WORDS";
    public static readonly SPLASH_TEXT_PATH = "game_assets/art/ClickToContinue.jpeg";
    public static readonly MUSIC_KEY = "SPLASH_MUSIC";
    public static readonly MUSIC_PATH = "game_assets/music/main_Menu_music.wav";

    public loadScene(): void {
        this.load.image(SplashScreen.SPLASH_KEY, SplashScreen.SPLASH_PATH);
        this.load.image(SplashScreen.SPLASH_TEXT_KEY, SplashScreen.SPLASH_TEXT_PATH);
        this.load.audio(SplashScreen.MUSIC_KEY, SplashScreen.MUSIC_PATH);
    }

    public startScene(): void {
        this.addLayer(SplashLayers.BG, 0);
        this.addLayer(SplashLayers.FG, 1);

        this.viewport.unfollow();
        this.viewport.setZoomLevel(1);
        const size = this.viewport.getHalfSize();
        this.viewport.setFocus(size);
        this.viewport.setCenter(size);
        Input.enableInput();

        const logo = this.add.sprite(SplashScreen.SPLASH_KEY, SplashLayers.BG);
        logo.scale.set(0.9,0.9);
        logo.position.set(size.x, size.y - 70);

        const prompt = this.add.sprite(SplashScreen.SPLASH_TEXT_KEY, SplashLayers.FG);
        prompt.position.set(size.x, size.y + 300);

        prompt.tweens.add("pulse", {
            startDelay: 0,
            duration: 1000,
            effects: [
                {
                    property: TweenableProperties.alpha,
                    start: 1,
                    end: 0.2,
                    ease: EaseFunctionType.IN_OUT_SINE
                }
            ],
            reverseOnComplete: true,
            loop: true
        });

        prompt.tweens.play("pulse");

        this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: SplashScreen.MUSIC_KEY, loop: true, holdReference: true});
        
    }


    public updateScene(deltaT: number): void {
        if (Input.isMouseJustPressed()) {
            this.sceneManager.changeToScene(MainMenu);
        }
    }

}
