import { BossHandle, BossId } from "./BossHandle";

export const SerisAnimations = {
    IDLE:             "IDLE",
    WALK:             "WALK",
    GLACIAL_ROAR:     "GLACIAL_ROAR",
    TAIL_LASH:        "TAIL_LASH",
    DOUBLE_TAIL_LASH: "DOUBLE_TAIL_LASH",
    ICE_BREATH:       "ICE_BREATH",
    FLYING:           "FLYING",
    DYING:            "DYING"
} as const;

/**
 * Lightweight scaffold for the Level 3 boss encounter — Seris the Scaleless.
 * Owns fight state for HUD, cheats, and visibility logic.
 * Mirrors the Level2Boss (Vorrath) scaffold pattern exactly.
 */
export default class Level3Boss implements BossHandle {
    public readonly id: BossId = BossId.LEVEL_3;

    private displayName: string;
    private currentHealth: number;
    private maxHealth: number;
    private fightStarted: boolean;
    private defeated: boolean;

    public constructor(displayName: string = "???", maxHealth: number = 300) {
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

        if (this.currentHealth === 0) {
            this.defeated = true;
            this.fightStarted = true;
        } else if (this.currentHealth < this.maxHealth) {
            this.fightStarted = true;
        }
    }

    public damage(amount: number): void {
        if (this.defeated) {
            return;
        }

        this.startFight();
        this.setCurrentHealth(this.currentHealth - Math.max(0, amount));
    }

    public heal(amount: number): void {
        if (this.defeated) {
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