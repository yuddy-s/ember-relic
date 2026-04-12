import Particle from "../../Wolfie2D/Nodes/Graphics/Particle";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import ParticleSystem from "../../Wolfie2D/Rendering/Animations/ParticleSystem";
import Color from "../../Wolfie2D/Utils/Color";
import { EaseFunctionType } from "../../Wolfie2D/Utils/EaseFunctions";
import RandUtils from "../../Wolfie2D/Utils/RandUtils";

 

/**
 * // TODO get the particles to move towards the mouse when the player attacks
 * 
 * The particle system used for the player's attack. Particles in the particle system should
 * be spawned at the player's position and fired in the direction of the mouse's position.
 */
export default class PlayerWeapon extends ParticleSystem {
    /** Direction to fire particles when system starts (snapshotted on attack press). */
    protected slashDirection: Vec2 = Vec2.RIGHT;
    protected slashRadius: number = 22;
    protected slashArc: number = Math.PI / 2.5;
    protected maxSlashThickness: number = 5;

    /**
     * Sets the direction particles should fire in on the next attack.
     * @param direction a world-space direction vector
     */
    public setSlashDirection(direction: Vec2): void {
    if (!direction.isZero()) {
        this.slashDirection = direction.clone().normalize();
    }
}


    public getPool(): Readonly<Array<Particle>> {
        return this.particlePool;
    }

    /**
     * @returns true if the particle system is running; false otherwise.
     */
    public isSystemRunning(): boolean { return this.systemRunning; }

    /**
     * Sets the animations for a particle in the player's weapon
     * @param particle the particle to give the animation to
     */
    public setParticleAnimation(particle: Particle) {
        const baseAngle = Math.atan2(this.slashDirection.y, this.slashDirection.x);
        const arcOffset = RandUtils.randFloat(-this.slashArc / 2, this.slashArc / 2);
        const angle = baseAngle + arcOffset;

        const normalized = Math.abs(arcOffset) / (this.slashArc / 2);
        const centerWeight = 1 - normalized;

        const shapedWeight = centerWeight * centerWeight * centerWeight;

        const thickness = this.maxSlashThickness * shapedWeight;
        const innerRadius = this.slashRadius - thickness / 2;
        const outerRadius = this.slashRadius + thickness / 2;
        const radius = RandUtils.randFloat(innerRadius, outerRadius);

        const arcPos = new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);

        particle.position.copy(this.sourcePoint.clone().add(arcPos));
        particle.vel = Vec2.ZERO;
        particle.color = Color.RED;

        particle.tweens.add("active", {
            startDelay: 0,
            duration: 260,
            effects: [
                {
                    property: "alpha",
                    start: 1,
                    end: 0,
                    ease: EaseFunctionType.IN_OUT_SINE
                }
            ]
        });
    }

}
