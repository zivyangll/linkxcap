// Presentation coordinates only. Sector names and company membership live in content.json.
export const focusHub = { x: 1310, y: 525, z: 0 };
export type FocusPoint = {
  x: number;
  y: number;
  z: number;
  side: 'left' | 'right';
};
export const focusLayout: Record<string, FocusPoint> = {
  foundation: { x: 1210, y: 755, z: 35, side: 'right' },
  infrastructure: { x: 1180, y: 285, z: 70, side: 'left' },
  applications: { x: 1600, y: 460, z: -65, side: 'right' },
  physical: { x: 1000, y: 650, z: 15, side: 'left' },
  frontiers: { x: 1660, y: 325, z: -90, side: 'left' },
};
const branches: Record<string, number[][]> = {
  foundation: [
    [955, 940],
    [1300, 985],
    [1470, 930],
    [1540, 850],
  ],
  infrastructure: [
    [1280, 110],
    [1480, 150],
    [1580, 240],
    [1415, 395],
    [1185, 530],
    [1010, 545],
    [1060, 900],
    [1050, 110],
  ],
  applications: [
    [1260, 220],
    [1755, 240],
    [1760, 695],
    [1450, 660],
  ],
  physical: [
    [865, 860],
    [1110, 940],
    [875, 430],
  ],
  frontiers: [
    [1550, 120],
    [1750, 180],
    [1770, 500],
  ],
};
export function focusBranch(
  sector: string,
  index: number,
  count: number,
): FocusPoint {
  const parent = focusLayout[sector];
  const preset = branches[sector] || [];
  let point = preset[index];
  if (count > preset.length || !point) {
    // Keep newly added companies within the graph, without touching copy on the left.
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    point = [
      Math.max(880, Math.min(1750, parent.x + Math.cos(angle) * 260)),
      Math.max(120, Math.min(970, parent.y + Math.sin(angle) * 230)),
    ];
  }
  return {
    x: point[0],
    y: point[1],
    z: parent.z + ((index % 3) - 1) * 30,
    side: point[0] < parent.x || point[0] > 1690 ? 'left' : 'right',
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
};
const mobileBranches: Record<string, number[][]> = {
  foundation: [
    [45, 500],
    [145, 545],
    [300, 515],
    [45, 400],
  ],
  infrastructure: [
    [235, 15],
    [325, 85],
    [325, 225],
    [320, 495],
    [190, 545],
    [40, 465],
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
