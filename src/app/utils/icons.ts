/**
 * Icon generation utilities for agents
 * Creates programmatic icons using Canvas API
 */

/**
 * Generate a pedestrian-like arrow icon
 * Returns an ImageBitmap that can be used with map.addImage()
 */
export async function generateAgentIcon(): Promise<ImageBitmap | null> {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  // Center point
  const cx = size / 2;
  const cy = size / 2;

  // Draw a small arrow/pointer shape pointing UP (0 degrees)
  // MapLibre rotates from 0 = up, clockwise
  ctx.save();
  ctx.translate(cx, cy);

  // Draw arrow shape
  ctx.beginPath();
  // Arrow pointing up
  ctx.moveTo(0, -10); // Tip
  ctx.lineTo(-4, 2);  // Left base
  ctx.lineTo(0, 0);   // Center indent
  ctx.lineTo(4, 2);   // Right base
  ctx.closePath();

  // Fill with cyan color
  ctx.fillStyle = '#8efcff';
  ctx.fill();

  // Subtle stroke
  ctx.strokeStyle = '#4dd0e1';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Small glow effect
  ctx.shadowColor = '#8efcff';
  ctx.shadowBlur = 2;
  ctx.fill();

  ctx.restore();

  // Create ImageBitmap from canvas
  return createImageBitmap(canvas);
}

/**
 * Generate a simple dot icon as fallback
 */
export async function generateDotIcon(): Promise<ImageBitmap | null> {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = 4;

  // Draw circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#8efcff';
  ctx.fill();

  // Subtle stroke
  ctx.strokeStyle = '#4dd0e1';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  return createImageBitmap(canvas);
}

/**
 * Generate a capsule/elongated icon for directionality
 */
export async function generateCapsuleIcon(): Promise<ImageBitmap | null> {
  const width = 12;
  const height = 20;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Draw capsule shape pointing up
  ctx.beginPath();
  // Top rounded
  ctx.arc(width / 2, height / 3, width / 2 - 1, Math.PI, 0);
  // Right side
  ctx.lineTo(width - 1, height * 0.7);
  // Bottom point
  ctx.lineTo(width / 2, height - 1);
  // Left side
  ctx.lineTo(1, height * 0.7);
  ctx.closePath();

  // Fill
  ctx.fillStyle = '#8efcff';
  ctx.fill();

  // Stroke
  ctx.strokeStyle = '#4dd0e1';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  return createImageBitmap(canvas);
}

/**
 * Icon names for reference
 */
export const AGENT_ICON_NAMES = {
  ARROW: 'agent-arrow',
  DOT: 'agent-dot',
  CAPSULE: 'agent-capsule',
} as const;

/**
 * Add all agent icons to the map
 */
export async function addAgentIcons(map: maplibregl.Map): Promise<void> {
  try {
    // Add arrow icon (primary)
    const arrowIcon = await generateAgentIcon();
    if (arrowIcon && !map.hasImage(AGENT_ICON_NAMES.ARROW)) {
      map.addImage(AGENT_ICON_NAMES.ARROW, arrowIcon, { sdf: false });
    }

    // Add dot icon (fallback)
    const dotIcon = await generateDotIcon();
    if (dotIcon && !map.hasImage(AGENT_ICON_NAMES.DOT)) {
      map.addImage(AGENT_ICON_NAMES.DOT, dotIcon, { sdf: false });
    }

    // Add capsule icon (alternative)
    const capsuleIcon = await generateCapsuleIcon();
    if (capsuleIcon && !map.hasImage(AGENT_ICON_NAMES.CAPSULE)) {
      map.addImage(AGENT_ICON_NAMES.CAPSULE, capsuleIcon, { sdf: false });
    }

    console.log('✅ Agent icons added to map');
  } catch (error) {
    console.error('Failed to add agent icons:', error);
  }
}
