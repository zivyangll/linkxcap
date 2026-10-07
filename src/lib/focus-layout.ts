// Presentation coordinates only. Sector names and company membership live in content.json.
export const focusHub = { x: 1290, y: 370, z: 0 };
export type FocusPoint = {
  x: number;
  y: number;
  z: number;
  side: 'left' | 'right';
};
// Figma 275:1994 (zh) / 275:2916 (en): the selected node sits at (1120.7,
// 603.5) and the five other sectors rise to its upper right.
export const focusLayout: Record<string, FocusPoint> = {
  foundation: { x: 1120.7, y: 603.5, z: 35, side: 'right' },
  infrastructure: { x: 1210.9, y: 359.3, z: 70, side: 'left' },
  applications: { x: 1490.9, y: 440.3, z: -65, side: 'right' },
  physical: { x: 1352.9, y: 223.3, z: 15, side: 'right' },
  frontiers: { x: 1339.9, y: 344.3, z: -90, side: 'right' },
  chips: { x: 1121.9, y: 189.3, z: 45, side: 'left' },
};
// [x, y, label side] of the company dots; sectors without a preset fan
// out around their node.
const branches: Record<string, [number, number, 'left' | 'right'][]> = {
  // Spread around the selected node, clear of the copy panel on its right.
  foundation: [
    [1301, 915, 'right'],
    [1150, 942, 'right'],
    [1022, 908, 'left'],
    [928, 833, 'left'],
    [750, 801, 'left'],
    [685, 665, 'left'],
    [749, 524, 'left'],
    [832, 423, 'left'],
    [924, 351, 'left'],
    [1031, 328, 'left'],
    [1114, 404, 'left'],
    [1309, 472, 'right'],
    [632, 426, 'left'],
    [866, 1011, 'left'],
  ],
};
export function focusBranch(
  sector: string,
  index: number,
  count: number,
): FocusPoint {
  const parent = focusLayout[sector];
  const preset = branches[sector] || [];
  const authored = preset[index];
  let point: number[] | undefined = authored && [authored[0], authored[1]];
  if (count > preset.length || !point) {
    // Larger sectors must not collapse into an even radial fan. A deterministic
    // angular jitter plus several distance bands creates the authored mix of
    // short/long branches and dense/sparse pockets while retaining all nodes.
    const seed = [...sector].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    );
    const angle =
      -Math.PI +
      (index * Math.PI * 2) / count +
      Math.sin((index + seed) * 1.73) * 0.15;
    const radiusX = 250 + ((index * 73 + seed) % 190);
    const radiusY = 175 + ((index * 47 + seed) % 175);
    const centreX = Math.max(1050, Math.min(1500, parent.x));
    point = [
      Math.max(820, Math.min(1810, centreX + Math.cos(angle) * radiusX)),
      Math.max(100, Math.min(990, parent.y + Math.sin(angle) * radiusY)),
    ];
  }
  return {
    x: point[0],
    y: point[1],
    z: parent.z + ((index % 3) - 1) * 30,
    side:
      authored?.[2] ||
      (point[0] < parent.x || point[0] > 1690 ? 'left' : 'right'),
  };
}

// Touch layout uses the same sectors/companies in a taller, readable 360 × 560 graph.
export const mobileFocusHub = { x: 180, y: 270, z: 0 };
export const mobileFocusLayout: Record<string, FocusPoint> = {
  foundation: { x: 140, y: 450, z: 18, side: 'right' },
  infrastructure: { x: 140, y: 100, z: 35, side: 'left' },
  applications: { x: 290, y: 370, z: -30, side: 'left' },
  physical: { x: 70, y: 285, z: 8, side: 'right' },
  frontiers: { x: 290, y: 150, z: -45, side: 'left' },
  chips: { x: 245, y: 60, z: 22, side: 'left' },
};
const mobileBranches: Record<string, number[][]> = {
  foundation: [
    [45, 500],
    [145, 545],
    [300, 515],
    [15, 400],
  ],
  infrastructure: [
    [235, 15],
    [325, 85],
    [325, 225],
    [320, 495],
    [190, 545],
    [15, 465],
    [30, 205],
    [45, 60],
  ],
  applications: [
    [130, 220],
    [325, 265],
    [315, 500],
    [60, 525],
  ],
  physical: [
    [15, 420],
    [150, 545],
    [35, 155],
  ],
};
export function mobileFocusBranch(
  sector: string,
  index: number,
  count: number,
): FocusPoint {
  const parent = mobileFocusLayout[sector];
  const preset = mobileBranches[sector] || [];
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const [x, y] =
    count <= preset.length
      ? preset[index]
      : [180 + Math.cos(angle) * 145, 280 + Math.sin(angle) * 245];
  return {
    x,
    y,
    z: parent.z + ((index % 3) - 1) * 12,
    side: x < 180 ? 'right' : 'left',
  };
}
