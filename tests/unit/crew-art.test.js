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
      triangles = 0;
    rig.traverse((node) => {
      if (node.isMesh) {
        calls++;
        triangles += node.geometry.attributes.position.count / 3;
        expect(node.geometry.attributes.color.count).toBe(
          node.geometry.attributes.position.count,
        );
        expect(node.material.vertexColors).toBe(true);
      }
    });
    expect(calls).toBe(6);
    expect(triangles).toBeLessThan(6000);
    expect(after.getSize(new Vector3()).y).toBeGreaterThan(2);
    poseCrew(rig, { pose: 'work', time: 1 });
    expect(rig.getObjectByName('arm-left').rotation.x).toBeLessThan(-0.4);
    poseCrew(rig, { pose: 'idle', reduced: true });
    expect(rig.getObjectByName('arm-left').rotation.x).toBe(0);
  },
);
