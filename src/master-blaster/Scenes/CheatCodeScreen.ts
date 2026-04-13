import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Line from "../../Wolfie2D/Nodes/Graphics/Line";
import Button from "../../Wolfie2D/Nodes/UIElements/Button";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { GraphicType } from "../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../Wolfie2D/Scene/Scene";
import Color from "../../Wolfie2D/Utils/Color";
import HelpScreen from "./HelpScreen";
import Rect from "../../Wolfie2D/Nodes/Graphics/Rect";

export const CheatLayers = {
    MAIN: "MAIN",
    UI: "UI"
} as const;

export default class ControlsScreen extends Scene {

    public startScene(): void {
        this.addLayer(CheatLayers.MAIN);
        this.addUILayer(CheatLayers.UI);

        const size = this.viewport.getHalfSize();
        this.viewport.setFocus(size);
        this.viewport.setZoomLevel(1);

        const title = <Label>this.add.uiElement(UIElementType.LABEL, CheatLayers.UI, {
            position: new Vec2(size.x, 100),
            text: "CHEATS"
        });
        title.textColor = Color.WHITE;
        title.font = "PixelSimple";

        const titleBox = <Rect>this.add.graphic(GraphicType.RECT, CheatLayers.MAIN, {
            position: new Vec2(size.x, 100),
            size: new Vec2(260, 60)
        });
        titleBox.color = new Color(20, 18, 24, 0.85);
        titleBox.borderColor = Color.WHITE;

        const panel = <Rect>this.add.graphic(GraphicType.RECT, CheatLayers.MAIN, {
            position: new Vec2(size.x, 355),
            size: new Vec2(760, 420)
        });
        panel.color = new Color(20, 18, 24, 0.85);
        panel.borderColor = Color.WHITE;

        const divider = <Line>this.add.graphic(GraphicType.LINE, CheatLayers.MAIN, {
            start: new Vec2(size.x, 170),
            end: new Vec2(size.x, 560)
        });
        divider.color = Color.WHITE;

        const leftX = size.x - 180;
        const rightX = size.x + 180;
        const startY = 200;
        const stepY = 55;

        const controls = [
            ["EMBERSKIP1", "Skip to level 1"],
            ["EMBERSKIP2", "Skip to level 2"],
            ["EMBERSKIP3", "Skip to level 3"],
            ["EMBERSKIP4", "Skip to level 4"],
            ["GODMODE", "Take no damage"],
            ["KILLBOSS", "Kill current boss"],
            ["HEARTHUNLOCK", "Unlocks secret door"]
        ];

        controls.forEach((entry, i) => {
            const y = startY + i * stepY;

            const left = <Label>this.add.uiElement(UIElementType.LABEL, CheatLayers.UI, {
                position: new Vec2(leftX, y),
                text: entry[0]
            });
            left.textColor = Color.WHITE;
            left.font = "PixelSimple";

            const right = <Label>this.add.uiElement(UIElementType.LABEL, CheatLayers.UI, {
                position: new Vec2(rightX, y),
                text: entry[1]
            });
            right.textColor = Color.WHITE;
            right.font = "PixelSimple";
        });

        const backBtn = <Button>this.add.uiElement(UIElementType.BUTTON, CheatLayers.UI, {
            position: new Vec2(size.x, 680),
            text: "Back"
        });
        backBtn.backgroundColor = Color.TRANSPARENT;
        backBtn.borderColor = Color.WHITE;
        backBtn.borderRadius = 0;
        backBtn.setPadding(new Vec2(50, 10));
        backBtn.font = "PixelSimple";

        backBtn.onClick = () => {
            this.sceneManager.changeToScene(HelpScreen);
        };
    }
}
