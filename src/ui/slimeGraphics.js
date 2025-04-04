import { teams } from '../../config.js';

/**
 * @typedef {Object} SlimeAppearance
 * @property {string} color - Color of the slime
 * @property {Object} [decorations] - Optional decorative elements
 */

/**
 * Creates a slime DOM element with appropriate styling
 * 
 * @param {SlimeAppearance} appearance - Slime appearance options
 * @returns {HTMLElement} The slime DOM element
 */
export function createSlimeElement(appearance) {
  const slime = document.createElement('div');
  slime.classList.add('slime');

  // Set basic styling
  slime.style.backgroundColor = appearance.color || '#888888';

  return slime;
}

/**
 * Sets slime attributes and identifiers
 * 
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {Object} options - Configuration options
 * @param {string} options.slimeId - Unique identifier for the slime
 * @param {number} options.teamNumber - Team number the slime belongs to
 * @param {number} options.width - Width of the slime in pixels
 * @param {number} options.height - Height of the slime in pixels
 */
export function configureSlimeElement(slimeElement, options) {
  const { slimeId, teamNumber, width, height } = options;

  // Set dimensions
  if (width) slimeElement.style.width = `${width}px`;
  if (height) slimeElement.style.height = `${height}px`;

  // Set identifiers
  if (slimeId) {
    slimeElement.setAttribute('data-slime-id', slimeId);
  }

  if (teamNumber) {
    slimeElement.classList.add(`slime-${teamNumber}`);
  }
}

/**
 * Updates slime appearance based on team
 * 
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {number} teamNumber - Team number (1 or 2)
 * @returns {string} The team color
 */
export function updateSlimeTeamAppearance(slimeElement, teamNumber) {
  // Remove existing team classes
  slimeElement.classList.remove('teamColorOne', 'teamColorTwo');

  let teamColor = '#888888';

  if (teamNumber === 1) {
    slimeElement.classList.add('teamColorOne');
    teamColor = teams.TEAM_1_COLOR;
    slimeElement.style.backgroundColor = teamColor;
  } else if (teamNumber === 2) {
    slimeElement.classList.add('teamColorTwo');
    teamColor = teams.TEAM_2_COLOR;
    slimeElement.style.backgroundColor = teamColor;
  }

  return teamColor;
}

/**
 * Renders slime position and appearance with proper half-circle shape
 * Fixes hovering issue and prevents widening during movement
 * 
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {Object} position - Position {x, y} of the slime
 * @param {Object} velocity - Velocity {x, y} of the slime
 * @param {number} width - Width of the slime
 * @param {number} height - Base height of the slime
 */
export function renderSlime(slimeElement, position, velocity, width, height, isHuggingWall) {
  // Apply position, width, height (existing logic - keep)
  slimeElement.style.left = `${position.x - width / 2}px`;
  slimeElement.style.top = `${position.y - height}px`;
  slimeElement.style.width = `${width}px`;
  slimeElement.style.height = `${height}px`;

  // --- Calculate Base Border Radius based on Velocity (existing logic - keep) ---
  const horizontalEffect = Math.min(Math.abs(velocity.x) * 0.5, 15);
  const velocityDirectionSign = Math.sign(velocity.x);
  let radiusLeft = width - (velocityDirectionSign < 0 ? horizontalEffect : -horizontalEffect);
  let radiusRight = width - (velocityDirectionSign > 0 ? horizontalEffect : -horizontalEffect);

  // Reset to perfect half-circle if still (existing logic - keep)
  if (Math.abs(velocity.x) < 0.1) {
    radiusLeft = width;
    radiusRight = width;
  }

  // --- ADJUST BORDER RADIUS FOR WALL HUGGING (existing logic - keep) ---
  const flatEdgeRadius = width * 0.75; // Your preferred value (was 0.65 before, adjust if needed)

  if (isHuggingWall === -1) { // Hugging left wall
    radiusLeft = flatEdgeRadius; // Make the left edge flatter
  } else if (isHuggingWall === 1) { // Hugging right wall
    radiusRight = flatEdgeRadius; // Make the right edge flatter
  }
  // Apply the final calculated border radii (existing logic - keep)
  slimeElement.style.borderTopLeftRadius = `${radiusLeft}px`;
  slimeElement.style.borderTopRightRadius = `${radiusRight}px`;


  // --- Handle Skew and Scale Transforms ---
  let skewDegree = 0;
  let scaleY = 1.0; // <<< ADD: Initialize scaleY to default
  const wallHugFlattenAmount = 0.95;
  const wallHugSkewAmount = -12;

  if (isHuggingWall !== 0) {
    // --- Skew TOWARDS the wall when hugging ---
    if (isHuggingWall === -1) { // Hugging left wall
      skewDegree = wallHugSkewAmount; // Adjust sign if needed based on desired lean
    } else { // Hugging right wall (isHuggingWall === 1)
      skewDegree = -wallHugSkewAmount; // Adjust sign if needed based on desired lean
    }
    // <<< ADD: Set scaleY when hugging >>>
    scaleY = wallHugFlattenAmount;
    // <<< ADD: Set transform-origin for scaleY >>>
    slimeElement.style.transformOrigin = (isHuggingWall === -1) ? 'right bottom' : 'left bottom';

  } else {
    // --- Skew based on VELOCITY when not hugging ---
    if (Math.abs(velocity.x) > 0.5) {
      skewDegree = Math.min(Math.abs(velocity.x) * 0.3, 5) * velocityDirectionSign;
    }
    // scaleY remains 1.0 (default)
    // <<< ADD: Reset transform origin when not hugging >>>
    slimeElement.style.transformOrigin = 'center bottom';
  }

  // Apply the combined calculated transforms
  // --- MODIFY THIS LINE ---
  // It now includes both skewX() and scaleY()
  slimeElement.style.transform = `skewX(${-skewDegree}deg) scaleY(${scaleY})`;

} // End renderSlime

/**
 * Creates an effect when slime performs a special move
 * 
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {string} effectType - Type of effect ('jump', 'wallJump', 'directionChange')
 * @param {string} baseColor - Base color of the slime
 */
export function createSlimeEffect(slimeElement, effectType, baseColor) {
  switch (effectType) {
    case 'jump':
      // Jump flash effect
      slimeElement.style.background = `radial-gradient(circle, white 0%, ${baseColor} 70%)`;
      setTimeout(() => {
        slimeElement.style.background = baseColor;
      }, 150);
      break;

    case 'wallJump':
      // Wall jump streak effect
      slimeElement.style.background = `linear-gradient(90deg, white 0%, ${baseColor} 60%)`;
      setTimeout(() => {
        slimeElement.style.background = baseColor;
      }, 150);
      break;

    case 'directionChange':
      // Direction change pulse effect
      slimeElement.style.background = `linear-gradient(0deg, ${baseColor} 50%, white 65%, ${baseColor} 80%)`;
      setTimeout(() => {
        slimeElement.style.background = baseColor;
      }, 150);
      break;

    default:
      // Reset to default
      slimeElement.style.background = baseColor;
  }
}

/**
 * Creates the center wall/net with a half-circle top
 * 
 * @param {number} groundHeight - Height of the ground element
 * @param {number} fieldHeight - Total height of the playing field
 * @returns {HTMLElement} Wall element
 */
