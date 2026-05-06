import { BossId } from "../Bosses/BossHandle";

export enum UpgradeId {
    LANTERN = "LANTERN",
    FUR_COAT = "FUR_COAT",
    DOUBLE_JUMP = "DOUBLE_JUMP",
    SHIELD = "SHIELD",
    REVIVAL_TOTEM_L1 = "REVIVAL_TOTEM_L1",
    UPGRADED_BOOTS = "UPGRADED_BOOTS",
    ICE_PICK = "ICE_PICK",
    SHATTERDIVE = "SHATTERDIVE",
    HEALTH_BUFF = "HEALTH_BUFF",
    REVIVAL_TOTEM_L3 = "REVIVAL_TOTEM_L3",
    UPGRADED_SWORD = "UPGRADED_SWORD",
    ASHEN_SEAL_FRAGMENT = "ASHEN_SEAL_FRAGMENT"
}

export type UpgradeMetadata = {
    name: string;
    description: string;
    iconKey: string;
    essential: boolean;
    shortLabel: string;
};

export const UPGRADE_ORDER: Array<UpgradeId> = [
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
];

export const UPGRADE_METADATA: Record<UpgradeId, UpgradeMetadata> = {
    [UpgradeId.LANTERN]: {
        name: "Lantern",
        description: "A warm light that reveals the Sunken Warrens and cuts through the pitch-black cave passages.",
        iconKey: "lantern",
        essential: true,
        shortLabel: "LN"
    },
    [UpgradeId.FUR_COAT]: {
        name: "Fur Coat",
        description: "Heavy winter gear that protects Kael from the freezing bite of Seris Peak.",
        iconKey: "fur_coat",
        essential: true,
        shortLabel: "FC"
    },
    [UpgradeId.DOUBLE_JUMP]: {
        name: "Double Jump",
        description: "Lets Kael leap again in midair and is required to climb the fractured final ascent.",
        iconKey: "double_jump",
        essential: true,
        shortLabel: "DJ"
    },
    [UpgradeId.SHIELD]: {
        name: "Shield",
        description: "Adds a shield reserve that can absorb up to five hits before breaking.",
        iconKey: "shield",
        essential: false,
        shortLabel: "SH"
    },
    [UpgradeId.REVIVAL_TOTEM_L1]: {
        name: "Revival Totem I",
        description: "A one-time safety charm that revives Kael instead of letting him fall in battle.",
        iconKey: "revival_totem_1",
        essential: false,
        shortLabel: "R1"
    },
    [UpgradeId.UPGRADED_BOOTS]: {
        name: "Upgraded Boots",
        description: "Lightened boots that give Kael a noticeable bump in movement speed.",
        iconKey: "upgraded_boots",
        essential: false,
        shortLabel: "UB"
    },
    [UpgradeId.ICE_PICK]: {
        name: "Ice Pick",
        description: "Allows Kael to latch onto side walls and survive tougher mountain traversal.",
        iconKey: "ice_pick",
        essential: false,
        shortLabel: "IP"
    },
    [UpgradeId.SHATTERDIVE]: {
        name: "Shatterdive",
        description: "Turning a long fall into a close-range impact blast that damages nearby threats.",
        iconKey: "shatterdive",
        essential: false,
        shortLabel: "SD"
    },
    [UpgradeId.HEALTH_BUFF]: {
        name: "Health Buff",
        description: "Raises Kael's maximum health so he can survive longer fights and rougher platforming.",
        iconKey: "health_buff",
        essential: false,
        shortLabel: "HB"
    },
    [UpgradeId.REVIVAL_TOTEM_L3]: {
        name: "Revival Totem II",
        description: "A second revival charm recovered later in the journey for another clutch comeback.",
        iconKey: "revival_totem_2",
        essential: false,
        shortLabel: "R2"
    },
    [UpgradeId.UPGRADED_SWORD]: {
        name: "Upgraded Sword",
        description: "An empowered blade that boosts Kael's damage output against tougher enemies and bosses.",
        iconKey: "upgraded_sword",
        essential: false,
        shortLabel: "SW"
    },
    [UpgradeId.ASHEN_SEAL_FRAGMENT]: {
        name: "Ashen Seal Fragment",
        description: "A relic shard tied to Kael's fate that marks the seal's growing instability after major victories.",
        iconKey: "ashen_seal_fragment",
        essential: false,
        shortLabel: "AS"
    }
};

export interface MBProgressState {
    ownedUpgrades: Set<UpgradeId>;
    acquisitionOrder: Array<UpgradeId>;
    defeatedBosses: Set<BossId>;
    hearthUnlocked: boolean;
    godModeEnabled: boolean;
    solenConversationStage: number;
}

export interface MBProgressSnapshot {
    ownedUpgrades: Array<UpgradeId>;
    acquisitionOrder: Array<UpgradeId>;
    defeatedBosses: Array<BossId>;
    hearthUnlocked: boolean;
    godModeEnabled: boolean;
    solenConversationStage: number;
}

export type MBProgressInitData = MBProgressSnapshot;

const ESSENTIAL_HUD_UPGRADES: Array<UpgradeId> = [
    UpgradeId.LANTERN,
    UpgradeId.FUR_COAT,
    UpgradeId.DOUBLE_JUMP
];

const UPGRADE_LOOKUP = new Set<UpgradeId>(UPGRADE_ORDER);
const BOSS_ID_ORDER: Array<BossId> = [
    BossId.LEVEL_1,
    BossId.LEVEL_2,
    BossId.LEVEL_3,
    BossId.LEVEL_4
];
const BOSS_ID_LOOKUP = new Set<BossId>(BOSS_ID_ORDER);

function isUpgradeId(value: unknown): value is UpgradeId {
    return typeof value === "string" && UPGRADE_LOOKUP.has(value as UpgradeId);
}

function normalizeUpgradeList(upgrades?: Iterable<unknown> | null): Array<UpgradeId> {
    const normalized: Array<UpgradeId> = [];
    const seen = new Set<UpgradeId>();

    if(upgrades === undefined || upgrades === null){
        return normalized;
    }

    for(const upgradeId of upgrades){
        if(!isUpgradeId(upgradeId) || seen.has(upgradeId)){
            continue;
        }

        seen.add(upgradeId);
        normalized.push(upgradeId);
    }

    return normalized;
}

function normalizeBossList(bosses?: Iterable<unknown> | null): Array<BossId> {
    const normalized: Array<BossId> = [];
    const seen = new Set<BossId>();

    if(bosses === undefined || bosses === null){
        return normalized;
    }

    for(const bossId of bosses){
        if(typeof bossId !== "string" || !BOSS_ID_LOOKUP.has(bossId as BossId) || seen.has(bossId as BossId)){
            continue;
        }

        seen.add(bossId as BossId);
        normalized.push(bossId as BossId);
    }

    return normalized;
}

export function createMBProgressState(): MBProgressState {
    return {
        ownedUpgrades: new Set<UpgradeId>(),
        acquisitionOrder: [],
        defeatedBosses: new Set<BossId>(),
        hearthUnlocked: false,
        godModeEnabled: false,
        solenConversationStage: 0
    };
}

export function cloneMBProgressState(state: MBProgressState): MBProgressState {
    return {
        ownedUpgrades: new Set<UpgradeId>(state.ownedUpgrades),
        acquisitionOrder: state.acquisitionOrder.slice(),
        defeatedBosses: new Set<BossId>(state.defeatedBosses),
        hearthUnlocked: state.hearthUnlocked,
        godModeEnabled: state.godModeEnabled,
        solenConversationStage: state.solenConversationStage
    };
}

export function createMBProgressSnapshot(state: MBProgressState): MBProgressSnapshot {
    return {
        ownedUpgrades: Array.from(state.ownedUpgrades),
        acquisitionOrder: state.acquisitionOrder.slice(),
        defeatedBosses: Array.from(state.defeatedBosses),
        hearthUnlocked: state.hearthUnlocked,
        godModeEnabled: state.godModeEnabled,
        solenConversationStage: state.solenConversationStage
    };
}

export class MBProgressStore {
    private state: MBProgressState;

    public constructor(snapshot?: Partial<MBProgressSnapshot> | null) {
        this.state = createMBProgressState();

        if(snapshot !== undefined && snapshot !== null){
            this.applySnapshot(snapshot);
        }
    }

    public reset(): MBProgressState {
        this.state = createMBProgressState();
        return this.cloneState();
    }

    public cloneState(): MBProgressState {
        return cloneMBProgressState(this.state);
    }

    public snapshot(): MBProgressSnapshot {
        return createMBProgressSnapshot(this.state);
    }

    public getInitData(): MBProgressInitData {
        return this.snapshot();
    }

    public toInitData(): MBProgressInitData {
        return this.getInitData();
    }

    public loadFromInitData(init?: Record<string, any>): MBProgressState {
        if(init === undefined || init === null){
            return this.reset();
        }

        if(Array.isArray(init.ownedUpgrades) || Array.isArray(init.acquisitionOrder) || Array.isArray(init.defeatedBosses)){
            return this.applySnapshot(init as Partial<MBProgressSnapshot>);
        }

        if(init.progressState !== undefined && init.progressState !== null){
            return this.applySnapshot(init.progressState as Partial<MBProgressSnapshot>);
        }

        return this.reset();
    }

    public applySnapshot(snapshot?: Partial<MBProgressSnapshot> | null): MBProgressState {
        if(snapshot === undefined || snapshot === null){
            return this.reset();
        }

        const ownedUpgrades = normalizeUpgradeList(snapshot.ownedUpgrades);
        const acquisitionSeed = normalizeUpgradeList(
            snapshot.acquisitionOrder !== undefined && snapshot.acquisitionOrder.length > 0
                ? snapshot.acquisitionOrder
                : ownedUpgrades
        );
        const acquisitionOrder = normalizeUpgradeList([...acquisitionSeed, ...ownedUpgrades]);
        const defeatedBosses = normalizeBossList(snapshot.defeatedBosses);

        this.state.ownedUpgrades = new Set<UpgradeId>(acquisitionOrder);
        this.state.acquisitionOrder = acquisitionOrder.slice();
        this.state.defeatedBosses = new Set<BossId>(defeatedBosses);
        this.state.hearthUnlocked = snapshot.hearthUnlocked === true;
        this.state.godModeEnabled = snapshot.godModeEnabled === true;
        this.state.solenConversationStage = Math.max(0, Math.floor(snapshot.solenConversationStage ?? 0));

        return this.cloneState();
    }

    public applyProgressPreset(snapshot: {
        upgrades: ReadonlyArray<UpgradeId>;
        defeatedBosses: ReadonlyArray<BossId>;
        hearthUnlocked: boolean;
        godModeEnabled?: boolean;
    }): MBProgressState {
        return this.applySnapshot({
            ownedUpgrades: [...snapshot.upgrades],
            acquisitionOrder: [...snapshot.upgrades],
            defeatedBosses: [...snapshot.defeatedBosses],
            hearthUnlocked: snapshot.hearthUnlocked,
            godModeEnabled: snapshot.godModeEnabled === true,
            solenConversationStage: snapshot.upgrades.includes(UpgradeId.LANTERN) ? 1 : 0
        });
    }

    public hasUpgrade(upgradeId: UpgradeId): boolean {
        return this.state.ownedUpgrades.has(upgradeId);
    }

    public grantUpgrade(upgradeId: UpgradeId): boolean {
        if(this.state.ownedUpgrades.has(upgradeId)){
            return false;
        }

        this.state.ownedUpgrades.add(upgradeId);
        this.state.acquisitionOrder = this.state.acquisitionOrder.filter(id => id !== upgradeId);
        this.state.acquisitionOrder.push(upgradeId);
        return true;
    }

    public grantUpgrades(upgradeIds: Iterable<UpgradeId>): boolean {
        let changed = false;

        for(const upgradeId of upgradeIds){
            changed = this.grantUpgrade(upgradeId) || changed;
        }

        return changed;
    }

    public consumeUpgrade(upgradeId: UpgradeId): boolean {
        if(!this.state.ownedUpgrades.has(upgradeId)){
            return false;
        }

        this.state.ownedUpgrades.delete(upgradeId);
        this.state.acquisitionOrder = this.state.acquisitionOrder.filter(id => id !== upgradeId);
        return true;
    }

    public hasDefeatedBoss(bossId: BossId): boolean {
        return this.state.defeatedBosses.has(bossId);
    }

    public defeatBoss(bossId: BossId): boolean {
        if(bossId.length === 0 || this.state.defeatedBosses.has(bossId)){
            return false;
        }

        this.state.defeatedBosses.add(bossId);
        return true;
    }

    public defeatBosses(bossIds: Iterable<BossId>): boolean {
        let changed = false;

        for(const bossId of bossIds){
            changed = this.defeatBoss(bossId) || changed;
        }

        return changed;
    }

    public unlockHearth(): boolean {
        if(this.state.hearthUnlocked){
            return false;
        }

        this.state.hearthUnlocked = true;
        return true;
    }

    public setGodMode(enabled: boolean): void {
        this.state.godModeEnabled = enabled;
    }

    public isGodModeEnabled(): boolean {
        return this.state.godModeEnabled;
    }

    public isHearthUnlocked(): boolean {
        return this.state.hearthUnlocked;
    }

    public getDefeatedBossCount(): number {
        return this.state.defeatedBosses.size;
    }

    public getSolenConversationStage(): number {
        return this.state.solenConversationStage;
    }

    public setSolenConversationStage(stage: number): void {
        this.state.solenConversationStage = Math.max(0, Math.floor(stage));
    }

    public advanceSolenConversationStage(): number {
        this.state.solenConversationStage += 1;
        return this.state.solenConversationStage;
    }

    public getEssentialHudUpgrades(): Array<UpgradeId | null> {
        const hudUpgrades: Array<UpgradeId | null> = ESSENTIAL_HUD_UPGRADES.slice();
        const recentOptionalUpgrades = this.state.acquisitionOrder
            .filter(upgradeId => !UPGRADE_METADATA[upgradeId].essential)
            .slice(-2)
            .reverse();

        recentOptionalUpgrades.forEach(upgradeId => hudUpgrades.push(upgradeId));

        while(hudUpgrades.length < 5){
            hudUpgrades.push(null);
        }

        return hudUpgrades.slice(0, 5);
    }

    public getOwnedForPauseList(): Array<UpgradeId> {
        return UPGRADE_ORDER.filter(upgradeId => this.state.ownedUpgrades.has(upgradeId));
    }
}

export const MBProgress = new MBProgressStore();
