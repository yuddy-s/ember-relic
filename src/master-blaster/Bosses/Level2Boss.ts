import { BossHandle, BossId } from "./BossHandle";

export const VorrathAnimations = {
    IDLE: "IDLE",
    WALK: "WALK",
    TWO_HAND_GROUND_SLAM: "TWO_HAND_GROUND_SLAM",
    NORMAL_PUNCH: "NORMAL_PUNCH",
    ROCK_THROW: "ROCK_THROW",
    ONE_HAND_GROUND_SLAM: "ONE_HAND_GROUND_SLAM",
    DYING: "DYING",
    DEAD: "DEAD"
} as const;

/**
 * A lightweight scaffold for the Level 2 boss encounter.
 * This owns boss fight state for HUD, cheats, and visibility logic
 * until the full animated boss implementation is ready.
 */
export default class Level2Boss implements BossHandle {
    public readonly id: BossId = BossId.LEVEL_2;

    private displayName: string;
    private currentHealth: number;
    private maxHealth: number;
    private fightStarted: boolean;
    private defeated: boolean;

    public constructor(displayName: string = "Seris the Scaleless", maxHealth: number = 250) {
        this.displayName = displayName;
        this.maxHealth = Math.max(1, maxHealth);
        this.currentHealth = this.maxHealth;
        this.fightStarted = false;
        this.defeated = false;
    }

    public getDisplayName(): string {
        return this.displayName;
    }

    public setDisplayName(displayName: string): void {
        this.displayName = displayName;
    }

    public hasFightStarted(): boolean {
        return this.fightStarted;
    }

    public startFight(): void {
        this.fightStarted = true;
    }

    public resetFight(): void {
        this.currentHealth = this.maxHealth;
        this.fightStarted = false;
        this.defeated = false;
    }

    public getCurrentHealth(): number {
        return this.currentHealth;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public setMaxHealth(maxHealth: number): void {
        this.maxHealth = Math.max(1, maxHealth);
        this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
    }

    public setCurrentHealth(currentHealth: number): void {
        const clampedHealth = Math.max(0, Math.min(currentHealth, this.maxHealth));
        this.currentHealth = clampedHealth;

        if(this.currentHealth === 0){
            this.defeated = true;
            this.fightStarted = true;
        } else if(this.currentHealth < this.maxHealth){
            this.fightStarted = true;
        }
    }

    public damage(amount: number): void {
        if(this.defeated){
            return;
        }

        this.startFight();
        this.setCurrentHealth(this.currentHealth - Math.max(0, amount));
    }

    public heal(amount: number): void {
        if(this.defeated){
            return;
        }

        this.setCurrentHealth(this.currentHealth + Math.max(0, amount));
    }

    public isDefeated(): boolean {
        return this.defeated;
    }

    public defeat(): void {
        this.setCurrentHealth(0);
    }
}
