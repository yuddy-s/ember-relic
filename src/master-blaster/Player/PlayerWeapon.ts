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
    protected fireDirection: Vec2 = Vec2.RIGHT;

    /** Max angle offset from fireDirection in radians. */
    protected spread: number = Math.PI / 8;

    /**
     * Sets the direction particles should fire in on the next attack.
     * @param direction a world-space direction vector
     */
    public setFireDirection(direction: Vec2): void {
        if (!direction.isZero()) {
            this.fireDirection = direction.clone().normalize();
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
        // Fire particles in the snapshot direction with a little random spread.
        const speed = RandUtils.randFloat(100, 200);
        const offset = RandUtils.randFloat(-this.spread, this.spread);
        particle.vel = this.fireDirection.clone().rotateCCW(offset).normalize().scale(speed);
        particle.color = Color.RED;

        // Give the particle tweens
        particle.tweens.add("active", {
            startDelay: 0,
            duration: this.lifetime,
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
