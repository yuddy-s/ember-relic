export default class BatState {
    private currentHealth: number;
    private readonly maxHealth: number;
    private defeated: boolean;

    public constructor(maxHealth: number) {
        this.maxHealth = Math.max(1, maxHealth);
        this.currentHealth = this.maxHealth;
        this.defeated = false;
    }

    public getCurrentHealth(): number {
        return this.currentHealth;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public isDefeated(): boolean {
        return this.defeated;
    }

    public damage(amount: number): boolean {
        if(this.defeated || amount <= 0){
            return false;
        }

        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.defeated = this.currentHealth === 0;
        return true;
    }
}
