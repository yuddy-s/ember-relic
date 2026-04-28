export const SolenAnimations = {
    IDLE: "IDLE"
} as const;

export type SolenAnimationKey = typeof SolenAnimations[keyof typeof SolenAnimations];
