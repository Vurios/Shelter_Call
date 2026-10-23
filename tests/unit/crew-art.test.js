import { it, expect } from 'vitest';
import { Box3, Vector3 } from 'three';
import { createCrew, CREW_FORM, poseCrew } from '../../src/art/crew.js';
import { optimizeCrew } from '../../src/art/rig.js';

it.each(Object.keys(CREW_FORM))(
  'optimized %s preserves ground pivot, dimensions, colors and independent joints',
  (id) => {
    const source = createCrew(id),
      before = new Box3().setFromObject(source);
    const rig = optimizeCrew(source),
      after = new Box3().setFromObject(rig);
    expect(after.min.distanceTo(before.min)).toBeLessThan(0.00001);
    expect(after.max.distanceTo(before.max)).toBeLessThan(0.00001);
    expect(after.min.y).toBeCloseTo(0, 5);
    let calls = 0,
      visible = 0,
      triangles = 0;
    rig.traverse((node) => {
      if (node.isMesh) {
        calls++;
        if (node.visible) visible++;
        triangles += node.geometry.attributes.position.count / 3;
        expect(node.geometry.attributes.color.count).toBe(
          node.geometry.attributes.position.count,
        );
        expect(node.material.vertexColors).toBe(true);
      }
    });
    // Six merged joints plus three switchable expressions, one shown at a time.
    expect(calls).toBe(9);
    expect(visible).toBe(7);
    expect(triangles).toBeLessThan(6000);
    expect(after.getSize(new Vector3()).y).toBeGreaterThan(2);
    poseCrew(rig, { pose: 'work', time: 1 });
    expect(rig.getObjectByName('arm-left').rotation.x).toBeLessThan(-0.4);
    poseCrew(rig, { pose: 'idle', reduced: true });
    expect(rig.getObjectByName('arm-left').rotation.x).toBe(0);
    poseCrew(rig, { pose: 'tired', seated: true });
    expect(rig.getObjectByName('expr-tired').visible).toBe(true);
    expect(rig.getObjectByName('expr-smile').visible).toBe(false);
    expect(rig.getObjectByName('leg-left').rotation.x).toBeLessThan(-1.2);
    poseCrew(rig, { pose: 'concern' });
    expect(rig.getObjectByName('expr-worry').visible).toBe(true);
  },
);
