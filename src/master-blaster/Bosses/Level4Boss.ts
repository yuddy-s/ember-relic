import { BossHandle, BossId } from "./BossHandle";

export const FirstEmberAnimations = {
    PHASE1_IDLE: "PHASE1_IDLE",
    PHASE1_WALK: "PHASE1_WALK",
    PHASE1_SLASH: "PHASE1_SLASH",
    PHASE1_DASH: "PHASE1_DASH",
    PHASE1_SLAM: "PHASE1_SLAM",
    PHASE1_TRANSITION: "PHASE1_TRANSITION",
    PHASE2_ENTRANCE: "PHASE2_ENTRANCE",
    PHASE2_IDLE: "PHASE2_IDLE",
    PHASE2_WALK: "PHASE2_WALK",
    PHASE2_UPPERCUT: "PHASE2_UPPERCUT",
    PHASE2_SPIN_SLAM: "PHASE2_SPIN_SLAM",
    PHASE2_WALL_DIVE: "PHASE2_WALL_DIVE",
    PHASE2_WALL_SPIN_SLAM: "PHASE2_WALL_SPIN_SLAM",
    PHASE2_CROSS_DASH: "PHASE2_CROSS_DASH",
    DYING: "DYING"
} as const;

export enum FirstEmberPhase {
    PHASE_1 = "PHASE_1",
    TRANSITION = "TRANSITION",
    PHASE_2 = "PHASE_2"
}

/**
 * Lightweight state object for The First Ember encounter.
 * Owns health, phase, and fight progression for HUD/controller code.
 */
export default class Level4Boss implements BossHandle {
    public readonly id: BossId = BossId.LEVEL_4;

    private displayName: string;
    private currentHealth: number;
    private maxHealth: number;
    private fightStarted: boolean;
    private defeated: boolean;
    private phase: FirstEmberPhase;
    private phaseTransitionTriggered: boolean;

    public constructor(displayName: string = "The First Ember", maxHealth: number = 160) {
        this.displayName = displayName;
        this.maxHealth = Math.max(1, maxHealth);
        this.currentHealth = this.maxHealth;
        this.fightStarted = false;
        this.defeated = false;
        this.phase = FirstEmberPhase.PHASE_1;
        this.phaseTransitionTriggered = false;
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
        this.phase = FirstEmberPhase.PHASE_1;
        this.phaseTransitionTriggered = false;
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
            this.fightStarted = true;
            if(this.phase === FirstEmberPhase.PHASE_1){
                this.defeated = false;
            } else if(this.phase === FirstEmberPhase.PHASE_2 || this.phase === FirstEmberPhase.TRANSITION){
                this.defeated = true;
            }
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

    public getPhase(): FirstEmberPhase {
        return this.phase;
    }

    public setPhase(phase: FirstEmberPhase): void {
        this.phase = phase;
    }

    public isInPhaseTwo(): boolean {
        return this.phase === FirstEmberPhase.PHASE_2;
    }

    public hasTriggeredPhaseTransition(): boolean {
        return this.phaseTransitionTriggered;
    }

    public triggerPhaseTransition(): void {
        this.defeated = false;
        this.phaseTransitionTriggered = true;
        this.phase = FirstEmberPhase.TRANSITION;
    }

    public enterPhaseTwo(phaseTwoHealth?: number): void {
        this.defeated = false;
        this.phase = FirstEmberPhase.PHASE_2;
        this.phaseTransitionTriggered = true;

        if(phaseTwoHealth !== undefined){
            this.maxHealth = Math.max(1, phaseTwoHealth);
            this.currentHealth = Math.max(1, Math.min(phaseTwoHealth, this.maxHealth));
        }
    }
}
