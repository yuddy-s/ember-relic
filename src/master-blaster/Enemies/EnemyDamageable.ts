export interface EnemyDamageable {
    damage(amount: number): boolean;
    isDefeated(): boolean;
}

