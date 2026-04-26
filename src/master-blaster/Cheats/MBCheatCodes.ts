import Scene from "../../Wolfie2D/Scene/Scene";
import { BossHandle } from "../Bosses/BossHandle";
import { MBProgress } from "../Progress/MBProgress";
import { getMBProgressSnapshot, ProgressSnapshotId, ProgressTargetSceneId } from "../Progress/MBProgressSnapshots";

export enum MBCheatCode {
    GODMODE = "GODMODE",
    KILLBOSS = "KILLBOSS",
    HEARTHUNLOCK = "HEARTHUNLOCK",
    EMBERSKIP1 = "EMBERSKIP1",
    EMBERSKIP2 = "EMBERSKIP2",
    EMBERSKIP3 = "EMBERSKIP3",
    EMBERSKIP4 = "EMBERSKIP4"
}

export interface CheatExecutionContext {
    boss?: BossHandle;
    refreshCheatDrivenUI(): void;
    resolveProgressTargetScene(targetSceneId: ProgressTargetSceneId): (new (...args: any) => Scene) | null;
    setPauseMenuOpen(paused: boolean): void;
    warpToScene(scene: new (...args: any) => Scene, init?: Record<string, any>): void;
}

export interface CheatExecutionResult {
    success: boolean;
    message: string;
    code: MBCheatCode | null;
    targetSceneId?: ProgressTargetSceneId;
}

export function normalizeCheatCode(input: string): string {
    return input.trim().toUpperCase();
}

export function parseCheatCode(input: string): MBCheatCode | null {
    const normalizedCode = normalizeCheatCode(input);

    switch(normalizedCode){
        case MBCheatCode.GODMODE:
        case MBCheatCode.KILLBOSS:
        case MBCheatCode.HEARTHUNLOCK:
        case MBCheatCode.EMBERSKIP1:
        case MBCheatCode.EMBERSKIP2:
        case MBCheatCode.EMBERSKIP3:
        case MBCheatCode.EMBERSKIP4:
            return normalizedCode;
        default:
            return null;
    }
}

export function executeCheatCode(input: string, context: CheatExecutionContext): CheatExecutionResult {
    const code = parseCheatCode(input);

    if(code === null){
        return {
            success: false,
            message: "Unknown cheat code.",
            code: null
        };
    }

    switch(code){
        case MBCheatCode.GODMODE:
            return executeGodModeCheat();
        case MBCheatCode.KILLBOSS:
            return executeKillBossCheat(context);
        case MBCheatCode.HEARTHUNLOCK:
            return executeHearthUnlockCheat();
        case MBCheatCode.EMBERSKIP1:
            return executeEmberSkipCheat(ProgressSnapshotId.EMBERSKIP1, code, context);
        case MBCheatCode.EMBERSKIP2:
            return executeEmberSkipCheat(ProgressSnapshotId.EMBERSKIP2, code, context);
        case MBCheatCode.EMBERSKIP3:
            return executeEmberSkipCheat(ProgressSnapshotId.EMBERSKIP3, code, context);
        case MBCheatCode.EMBERSKIP4:
            return executeEmberSkipCheat(ProgressSnapshotId.EMBERSKIP4, code, context);
        default:
            return {
                success: false,
                message: "Unknown cheat code.",
                code
            };
    }
}

function executeGodModeCheat(): CheatExecutionResult {
    const nextValue = !MBProgress.isGodModeEnabled();
    MBProgress.setGodMode(nextValue);

    return {
        success: true,
        message: nextValue ? "God mode enabled." : "God mode disabled.",
        code: MBCheatCode.GODMODE
    };
}

function executeKillBossCheat(context: CheatExecutionContext): CheatExecutionResult {
    if(context.boss === undefined){
        return {
            success: false,
            message: "No boss is active in this level.",
            code: MBCheatCode.KILLBOSS
        };
    }

    if(context.boss.isDefeated()){
        return {
            success: false,
            message: "The boss is already defeated.",
            code: MBCheatCode.KILLBOSS
        };
    }

    context.boss.defeat();
    MBProgress.defeatBoss(context.boss.id);
    context.refreshCheatDrivenUI();

    return {
        success: true,
        message: "Boss defeated.",
        code: MBCheatCode.KILLBOSS
    };
}

function executeHearthUnlockCheat(): CheatExecutionResult {
    MBProgress.unlockHearth();

    return {
        success: true,
        message: "Hearth unlocked.",
        code: MBCheatCode.HEARTHUNLOCK
    };
}

function executeEmberSkipCheat(snapshotId: ProgressSnapshotId, code: MBCheatCode, context: CheatExecutionContext): CheatExecutionResult {
    const snapshot = getMBProgressSnapshot(snapshotId);
    MBProgress.applyProgressPreset(snapshot);
    context.refreshCheatDrivenUI();

    const targetScene = context.resolveProgressTargetScene(snapshot.targetSceneId);

    if(targetScene !== null){
        context.setPauseMenuOpen(false);
        context.warpToScene(targetScene, MBProgress.toInitData());
        return {
            success: true,
            message: `Applied ${code}.`,
            code,
            targetSceneId: snapshot.targetSceneId
        };
    }

    return {
        success: true,
        message: `Applied ${code}, but ${snapshot.targetSceneId} is not wired yet.`,
        code,
        targetSceneId: snapshot.targetSceneId
    };
}
