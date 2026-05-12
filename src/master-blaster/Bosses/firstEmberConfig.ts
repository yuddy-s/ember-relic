import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import { FirstEmberPhase } from "./Level4Boss";

export const FirstEmberActions = {
    IDLE: "idle",
    PURSUE: "pursue",
    PHASE1_SLASH: "phase1_slash",
    PHASE1_DASH: "phase1_dash",
    PHASE1_SLAM: "phase1_slam",
    PHASE1_TRANSITION: "phase1_transition",
    PHASE2_ENTRANCE: "phase2_entrance",
    PHASE2_UPPERCUT: "phase2_uppercut",
    PHASE2_SPIN_SLAM: "phase2_spin_slam",
    PHASE2_CROSS_DASH: "phase2_cross_dash",
    PHASE2_WALL_DIVE: "phase2_wall_dive",
    PHASE2_WALL_SPIN_SLAM: "phase2_wall_spin_slam",
    DYING: "dying"
} as const;

export type FirstEmberAction = typeof FirstEmberActions[keyof typeof FirstEmberActions];

export const FirstEmberAttackPhases = {
    NONE: "none",
    WINDUP: "windup",
    ACTIVE: "active",
    RECOVERY: "recovery"
} as const;

export type FirstEmberAttackPhase = typeof FirstEmberAttackPhases[keyof typeof FirstEmberAttackPhases];

export type FirstEmberBlackboard = {
    deltaX: number;
    absDeltaX: number;
    deltaY: number;
    absDeltaY: number;
    playerOnLeft: boolean;
    playerInCloseRange: boolean;
    playerInMidRange: boolean;
    playerInChargeLane: boolean;
    playerInSlamRange: boolean;
    playerFarAway: boolean;
    playerAboveBoss: boolean;
};

export type FirstEmberPhaseTuning = {
    phase: FirstEmberPhase;
    moveSpeed: number;
    aggroRange: number;
    aggroHeightThreshold: number;
    decisionInterval: number;
    closeRange: number;
    midRange: number;
    farRange: number;
    chargeLaneThreshold: number;
};

export type FirstEmberMountedSlashTuning = {
    cooldown: number;
    windup: number;
    active: number;
    recovery: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    hitboxOffset: Vec2;
    hitboxHalfSize: Vec2;
};

export type FirstEmberMountedDashTuning = {
    cooldown: number;
    windup: number;
    active: number;
    recovery: number;
    dashSpeed: number;
    dashDuration: number;
    maxTravelDistance: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    hitboxOffset: Vec2;
    hitboxHalfSize: Vec2;
};

export type FirstEmberMountedSlamTuning = {
    cooldown: number;
    windup: number;
    active: number;
    recovery: number;
    warningDuration: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    warningOffset: Vec2;
    warningHalfSize: Vec2;
    hitboxOffset: Vec2;
    hitboxHalfSize: Vec2;
};

export type FirstEmberUppercutTuning = {
    cooldown: number;
    windup: number;
    active: number;
    recovery: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    hitboxOffset: Vec2;
    hitboxHalfSize: Vec2;
};

export type FirstEmberGroundSpinSlamTuning = {
    cooldown: number;
    windup: number;
    active: number;
    recovery: number;
    warningDuration: number;
    slamSoundDelay: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    warningHalfSize: Vec2;
    hitboxOffset: Vec2;
    hitboxHalfSize: Vec2;
};

export type FirstEmberCrossDashTuning = {
    cooldown: number;
    windup: number;
    active: number;
    recovery: number;
    fadeDuration: number;
    dashSpeed: number;
    dashDuration: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    hitboxOffset: Vec2;
    hitboxHalfSize: Vec2;
};

export type FirstEmberWallAttackTuning = {
    cooldown: number;
    warningDuration: number;
    wallHangDuration: number;
    hitboxDelay: number;
    dashDuration: number;
    fadeDuration: number;
    slamSoundDelay: number;
    recoveryDuration: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    warningHalfSize: Vec2;
    hitboxHalfSize: Vec2;
    shockwaveDuration: number;
    shockwaveHalfSize: Vec2;
    shockwaveGap: number;
    shockwaveDamage: number;
    shockwaveKnockbackX: number;
    shockwaveKnockbackY: number;
};

export type FirstEmberExplosionHazardTuning = {
    cooldown: number;
    warningDuration: number;
    duration: number;
    damage: number;
    knockbackX: number;
    knockbackY: number;
    halfSize: Vec2;
    visualSize: Vec2;
};

export type FirstEmberTransitionTuning = {
    phaseOneMaxHealth: number;
    phaseTwoMaxHealth: number;
    playerHealPercentOnTransition: number;
    smokeDuration: number;
    entranceDelay: number;
};

export type FirstEmberBossTuning = {
    gravity: number;
    maxFallSpeed: number;
    hitboxHalfSize: Vec2;
    playerAboveForceDiveDuration: number;
    phase1: FirstEmberPhaseTuning;
    phase2: FirstEmberPhaseTuning;
    mountedSlash: FirstEmberMountedSlashTuning;
    mountedDash: FirstEmberMountedDashTuning;
    mountedSlam: FirstEmberMountedSlamTuning;
    uppercut: FirstEmberUppercutTuning;
    phase2SpinSlam: FirstEmberGroundSpinSlamTuning;
    crossDash: FirstEmberCrossDashTuning;
    wallDive: FirstEmberWallAttackTuning;
    wallSpinSlam: FirstEmberWallAttackTuning;
    explosionHazard: FirstEmberExplosionHazardTuning;
    transition: FirstEmberTransitionTuning;
};

export const DEFAULT_FIRST_EMBER_TUNING: FirstEmberBossTuning = {
    gravity: 760,
    maxFallSpeed: 920,
    hitboxHalfSize: new Vec2(32, 41),
    playerAboveForceDiveDuration: 0.5,
    phase1: {
        phase: FirstEmberPhase.PHASE_1,
        moveSpeed: 45,
        aggroRange: 260,
        aggroHeightThreshold: 70,
        decisionInterval: 0.18,
        closeRange: 78,
        midRange: 180,
        farRange: 340,
        chargeLaneThreshold: 56
    },
    phase2: {
        phase: FirstEmberPhase.PHASE_2,
        moveSpeed: 140,
        aggroRange: 340,
        aggroHeightThreshold: 110,
        decisionInterval: 0.12,
        closeRange: 86,
        midRange: 250,
        farRange: 300,
        chargeLaneThreshold: 64
    },
    mountedSlash: {
        cooldown: 0.38,
        windup: 0.56,
        active: 0.32,
        recovery: 0.18,
        damage: 10,
        knockbackX: 120,
        knockbackY: -120,
        hitboxOffset: new Vec2(55, -5),
        hitboxHalfSize: new Vec2(39, 30)
    },
    mountedDash: {
        cooldown: 1.1,
        windup: 0.5,
        active: 0.82,
        recovery: 0.1,
        dashSpeed: 270,
        dashDuration: 0.7,
        maxTravelDistance: 280,
        damage: 20,
        knockbackX: 180,
        knockbackY: -140,
        hitboxOffset: new Vec2(35, 0),
        hitboxHalfSize: new Vec2(46, 28)
    },
    mountedSlam: {
        cooldown: 2.6,
        windup: 1.2,
        active: 0.28,
        recovery: 0.1,
        warningDuration: 1.2,
        damage: 14,
        knockbackX: 100,
        knockbackY: -180,
        warningOffset: new Vec2(48, 18),
        warningHalfSize: new Vec2(66, 24),
        hitboxOffset: new Vec2(48, 14),
        hitboxHalfSize: new Vec2(48, 28)
    },
    uppercut: {
        cooldown: 0.7,
        windup: 0.6,
        active: 0.22,
        recovery: 0.12,
        damage: 20,
        knockbackX: 150,
        knockbackY: -210,
        hitboxOffset: new Vec2(32, -9),
        hitboxHalfSize: new Vec2(30, 35)
    },
    phase2SpinSlam: {
        cooldown: 3.6,
        windup: 0.78,
        active: 0.36,
        recovery: 0.3,
        warningDuration: 0.58,
        slamSoundDelay: 0.0,
        damage: 30,
        knockbackX: 130,
        knockbackY: -230,
        warningHalfSize: new Vec2(110, 30),
        hitboxOffset: new Vec2(0, 18),
        hitboxHalfSize: new Vec2(98, 38)
    },
    crossDash: {
        cooldown: 1.0,
        windup: 1.55,
        active: 0.42,
        recovery: 0.32,
        fadeDuration: 1.0,
        dashSpeed: 585,
        dashDuration: 0.32,
        damage: 12,
        knockbackX: 220,
        knockbackY: -120,
        hitboxOffset: new Vec2(23, 0),
        hitboxHalfSize: new Vec2(28, 32)
    },
    wallDive: {
        cooldown: 2.2,
        warningDuration: 1.25,
        wallHangDuration: 2.2,
        hitboxDelay: 0.24,
        dashDuration: 0.92,
        fadeDuration: 1.0,
        slamSoundDelay: 0.72,
        recoveryDuration: 1.45,
        damage: 20,
        knockbackX: 170,
        knockbackY: -220,
        warningHalfSize: new Vec2(84, 22),
        hitboxHalfSize: new Vec2(35, 30),
        shockwaveDuration: 0.22,
        shockwaveHalfSize: new Vec2(62, 16),
        shockwaveGap: 21,
        shockwaveDamage: 10,
        shockwaveKnockbackX: 180,
        shockwaveKnockbackY: -180
    },
    wallSpinSlam: {
        cooldown: 4.5,
        warningDuration: 1.25,
        wallHangDuration: 2.2,
        hitboxDelay: 0.28,
        dashDuration: 1.0,
        fadeDuration: 1.0,
        slamSoundDelay: 4.3,
        recoveryDuration: 1.6,
        damage: 25,
        knockbackX: 180,
        knockbackY: -260,
        warningHalfSize: new Vec2(80, 15),
        hitboxHalfSize: new Vec2(37, 35),
        shockwaveDuration: 0.28,
        shockwaveHalfSize: new Vec2(70, 12),
        shockwaveGap: 23,
        shockwaveDamage: 12,
        shockwaveKnockbackX: 220,
        shockwaveKnockbackY: -220
    },
    explosionHazard: {
        cooldown: 2.6,
        warningDuration: 1.35,
        duration: 1.25,
        damage: 15,
        knockbackX: 170,
        knockbackY: -190,
        halfSize: new Vec2(12, 56),
        visualSize: new Vec2(32, 128)
    },
    transition: {
        phaseOneMaxHealth: 50,
        phaseTwoMaxHealth: 75,
        playerHealPercentOnTransition: 1.0,
        smokeDuration: 0.7,
        entranceDelay: 0.35
    }
};
