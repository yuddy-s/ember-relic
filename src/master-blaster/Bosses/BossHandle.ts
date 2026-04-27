export enum BossId {
    LEVEL_1 = "LEVEL_1",
    LEVEL_2 = "LEVEL_2",
    LEVEL_3 = "LEVEL_3",
    LEVEL_4 = "LEVEL_4"
}

export interface BossHandle {
    readonly id: BossId;
    getDisplayName(): string;
    hasFightStarted(): boolean;
    getCurrentHealth(): number;
    getMaxHealth(): number;
    damage(amount: number): void;
    isDefeated(): boolean;
    defeat(): void;
}
