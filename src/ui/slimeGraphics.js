import { teams } from '../config.js';

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
 * Applies animation effects to the slime element
 * 
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {Object} velocity - Current velocity of the slime
 */
export function applySlimeAnimationEffects(slimeElement, velocity) {
  // Squash and stretch effect based on horizontal velocity
  const horizontalEffect = velocity.x * 2;

  slimeElement.style.borderTopLeftRadius = `${70 + horizontalEffect}px`;
  slimeElement.style.borderTopRightRadius = `${70 - horizontalEffect}px`;

  // Height adjustment based on horizontal speed (squash effect)
  const baseHeight = parseInt(slimeElement.style.height);
  const heightReduction = Math.abs(velocity.x * 1);

  if (!isNaN(baseHeight)) {
    slimeElement.style.height = `${baseHeight - heightReduction}px`;
  }
}

/**
 * Renders slime position and appearance
 * 
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {Object} position - Position {x, y} of the slime
 * @param {Object} velocity - Velocity {x, y} of the slime
 * @param {number} width - Width of the slime
 * @param {number} height - Base height of the slime
 */
export function renderSlime(slimeElement, position, velocity, width, height) {
  // Apply position
  slimeElement.style.left = `${position.x - width / 2}px`;

  // Apply height adjustment and vertical position with squash effect
  const heightReduction = Math.abs(velocity.x * 1);
  slimeElement.style.height = `${height - heightReduction}px`;
  slimeElement.style.top = `${position.y - height + heightReduction}px`;

  // Apply deformation effect
  applySlimeAnimationEffects(slimeElement, velocity);
}

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
