export enum BossId {
    LEVEL_1 = "LEVEL_1",
    LEVEL_2 = "LEVEL_2",
    LEVEL_3 = "LEVEL_3",
    LEVEL_4 = "LEVEL_4"
}

export interface BossHandle {
    readonly id: BossId;
    isDefeated(): boolean;
    defeat(): void;
}
