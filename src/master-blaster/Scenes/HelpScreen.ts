import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Button from "../../Wolfie2D/Nodes/UIElements/Button";
import Label, { HAlign } from "../../Wolfie2D/Nodes/UIElements/Label";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../Wolfie2D/Scene/Scene";
import Color from "../../Wolfie2D/Utils/Color";
import MainMenu from "./MainMenu";
import CheatCodeScreen from "./CheatCodeScreen";

export const HelpLayers = {
    MAIN: "MAIN",
    UI: "UI"
} as const;

export default class HelpScreen extends Scene {

    public startScene(): void {
        this.addLayer(HelpLayers.MAIN);
        this.addUILayer(HelpLayers.UI);

        const size = this.viewport.getHalfSize();
        this.viewport.setFocus(size);
        this.viewport.setZoomLevel(1);

        const title = <Label>this.add.uiElement(UIElementType.LABEL, HelpLayers.UI, {
                    position: new Vec2(size.x, 100),
                    text: "HELP"
                });
                title.textColor = Color.WHITE;
                title.font = "PixelSimple";

        const titleBox = <Rect>this.add.graphic(GraphicType.RECT, HelpLayers.MAIN, {
            position: new Vec2(size.x, 100),
            size: new Vec2(260, 60)
        });
        titleBox.color = new Color(20, 18, 24, 0.85);
        titleBox.borderColor = Color.WHITE;

        const panel = <Rect>this.add.graphic(GraphicType.RECT, HelpLayers.MAIN, {
            position: new Vec2(size.x, 355),
            size: new Vec2(760, 420)
        });
        panel.color = new Color(20, 18, 24, 0.85);
        panel.borderColor = Color.WHITE;

        const loreLines = [
            "The city of Vaelundra was built atop the bones of dead gods.",
            "For centuries, humanity harnessed their residual divine",
            "energy, called Embersoul, to power civilization. Then a",
            "celebrated warrior named Kael performed a forbidden ritual",
            "to claim godhood for himself. It shattered the barrier",
            "between the mortal world and the mythological underworld,",
            "releasing four corrupted god fragments into Vaelundra.",
            "The city fell overnight. Kael was obliterated.",
            "",
            "Centuries later, you wake up in the ruins. No name.",
            "No memory. Just a weapon and a strange glowing necklace",
            "around your neck called the Ashen Seal. You do not know",
            "what it is.",
            "",
            "You will."
        ];

        const loreStartX = size.x;
        const loreStartY = 205;
        const loreLineHeight = 22;

        loreLines.forEach((line, i) => {
            const loreLine = <Label>this.add.uiElement(UIElementType.LABEL, HelpLayers.UI, {
                position: new Vec2(loreStartX, loreStartY + i * loreLineHeight),
                text: line
            });
            loreLine.textColor = Color.WHITE;
            loreLine.font = "PixelSimple";
            loreLine.fontSize = 24;
            loreLine.setHAlign(HAlign.LEFT);
        });

        const backBtn = <Button>this.add.uiElement(UIElementType.BUTTON, HelpLayers.UI, {
            position: new Vec2(size.x - 220, 680),
            text: "Back"
        });
        backBtn.backgroundColor = Color.TRANSPARENT;
        backBtn.borderColor = Color.WHITE;
        backBtn.borderRadius = 0;
        backBtn.setPadding(new Vec2(50, 10));
        backBtn.font = "PixelSimple";

        backBtn.onClick = () => {
            this.sceneManager.changeToScene(MainMenu);
        };

        const cheatBtn = <Button>this.add.uiElement(UIElementType.BUTTON, HelpLayers.UI, {
            position: new Vec2(size.x + 220, 680),
            text: "Cheat Codes"
        });
        cheatBtn.backgroundColor = Color.TRANSPARENT;
        cheatBtn.borderColor = Color.WHITE;
        cheatBtn.borderRadius = 0;
        cheatBtn.setPadding(new Vec2(50, 10));
        cheatBtn.font = "PixelSimple";

        cheatBtn.onClick = () => {
            this.sceneManager.changeToScene(CheatCodeScreen);
        };
    }
}
