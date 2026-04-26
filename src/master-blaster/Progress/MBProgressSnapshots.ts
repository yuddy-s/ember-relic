import { BossId } from "../Bosses/BossHandle";
import { UpgradeId } from "./MBProgress";

export enum ProgressSnapshotId {
    EMBERSKIP1 = "EMBERSKIP1",
    EMBERSKIP2 = "EMBERSKIP2",
    EMBERSKIP3 = "EMBERSKIP3",
    EMBERSKIP4 = "EMBERSKIP4"
}

export enum ProgressTargetSceneId {
    LEVEL_1 = "LEVEL_1",
    LEVEL_2 = "LEVEL_2",
    LEVEL_3 = "LEVEL_3",
    LEVEL_4 = "LEVEL_4"
}

export interface MBProgressSnapshot {
    readonly upgrades: ReadonlyArray<UpgradeId>;
    readonly defeatedBosses: ReadonlyArray<BossId>;
    readonly hearthUnlocked: boolean;
    readonly targetSceneId: ProgressTargetSceneId;
    readonly godModeEnabled?: boolean;
}

function createSnapshot(snapshot: MBProgressSnapshot): MBProgressSnapshot {
    return Object.freeze({
        ...snapshot,
        upgrades: Object.freeze([...snapshot.upgrades]),
        defeatedBosses: Object.freeze([...snapshot.defeatedBosses])
    });
}

export const MB_PROGRESS_SNAPSHOTS: Readonly<Record<ProgressSnapshotId, MBProgressSnapshot>> = Object.freeze({
    [ProgressSnapshotId.EMBERSKIP1]: createSnapshot({
        upgrades: [
            UpgradeId.LANTERN
        ],
        defeatedBosses: [],
        hearthUnlocked: true,
        targetSceneId: ProgressTargetSceneId.LEVEL_1
    }),
    [ProgressSnapshotId.EMBERSKIP2]: createSnapshot({
        upgrades: [
            UpgradeId.LANTERN,
            UpgradeId.FUR_COAT,
            UpgradeId.SHIELD,
            UpgradeId.REVIVAL_TOTEM_L1,
            UpgradeId.ASHEN_SEAL_FRAGMENT
        ],
        defeatedBosses: [
            BossId.LEVEL_1
        ],
        hearthUnlocked: true,
        targetSceneId: ProgressTargetSceneId.LEVEL_2
    }),
    [ProgressSnapshotId.EMBERSKIP3]: createSnapshot({
        upgrades: [
            UpgradeId.LANTERN,
            UpgradeId.FUR_COAT,
            UpgradeId.DOUBLE_JUMP,
            UpgradeId.SHIELD,
            UpgradeId.REVIVAL_TOTEM_L1,
            UpgradeId.UPGRADED_BOOTS,
            UpgradeId.ICE_PICK,
            UpgradeId.ASHEN_SEAL_FRAGMENT
        ],
        defeatedBosses: [
            BossId.LEVEL_1,
            BossId.LEVEL_2
        ],
        hearthUnlocked: true,
        targetSceneId: ProgressTargetSceneId.LEVEL_3
    }),
    [ProgressSnapshotId.EMBERSKIP4]: createSnapshot({
        upgrades: [
            UpgradeId.LANTERN,
            UpgradeId.FUR_COAT,
            UpgradeId.DOUBLE_JUMP,
            UpgradeId.SHIELD,
            UpgradeId.REVIVAL_TOTEM_L1,
            UpgradeId.UPGRADED_BOOTS,
            UpgradeId.ICE_PICK,
            UpgradeId.SHATTERDIVE,
            UpgradeId.HEALTH_BUFF,
            UpgradeId.REVIVAL_TOTEM_L3,
            UpgradeId.UPGRADED_SWORD,
            UpgradeId.ASHEN_SEAL_FRAGMENT
        ],
        defeatedBosses: [
            BossId.LEVEL_1,
            BossId.LEVEL_2,
            BossId.LEVEL_3
        ],
        hearthUnlocked: true,
        targetSceneId: ProgressTargetSceneId.LEVEL_4
    })
});

export function getMBProgressSnapshot(snapshotId: ProgressSnapshotId): MBProgressSnapshot {
    const snapshot = MB_PROGRESS_SNAPSHOTS[snapshotId];

    return {
        ...snapshot,
        upgrades: [...snapshot.upgrades],
        defeatedBosses: [...snapshot.defeatedBosses]
    };
}
