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
export function renderSlime(slimeElement, position, velocity, width, height) {
  // Apply horizontal position
  slimeElement.style.left = `${position.x - width / 2}px`;

  // Important: Keep the bottom of the slime firmly on the ground at all times
  slimeElement.style.top = `${position.y - height}px`;

  // Keep width fixed - no stretching horizontally
  slimeElement.style.width = `${width}px`;
  slimeElement.style.height = `${height}px`;

  const horizontalEffect = Math.min(Math.abs(velocity.x) * 0.5, 15);
  const directionSign = Math.sign(velocity.x);

  // When moving, the leading edge of the slime gets more pointed
  // and the trailing edge gets more rounded
  slimeElement.style.borderTopLeftRadius = `${width - (directionSign < 0 ? horizontalEffect : -horizontalEffect)}px`;
  slimeElement.style.borderTopRightRadius = `${width - (directionSign > 0 ? horizontalEffect : -horizontalEffect)}px`;

  // Return to perfect half-circle when still
  if (Math.abs(velocity.x) < 0.1) {
    slimeElement.style.borderTopLeftRadius = `${width}px`;
    slimeElement.style.borderTopRightRadius = `${width}px`;
  }

  // Optional: Add a subtle "squish" effect by adding a transform
  // This doesn't affect the position, just the visual appearance
  if (Math.abs(velocity.x) > 0.5) {
    const skewDegree = Math.min(Math.abs(velocity.x) * 0.3, 5) * directionSign;
    slimeElement.style.transform = `skewX(${-skewDegree}deg)`;
  } else {
    slimeElement.style.transform = 'skewX(0deg)';
  }
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

/**
 * Creates the center wall/net with improved height
 * 
 * @param {number} groundHeight - Height of the ground element
 * @param {number} fieldHeight - Total height of the playing field
 * @returns {HTMLElement} Wall element
 */
export function createWall(groundHeight = 40, fieldHeight = 400) {
  const netHeight = fieldHeight * 0.3; // 30% of field height

  const wall = document.createElement('div');
  wall.id = 'wall';
  wall.style.position = 'absolute';
  wall.style.bottom = `${groundHeight}px`; // Start at ground level
  wall.style.left = '50%';
  wall.style.transform = 'translateX(-50%)';
  wall.style.width = '10px';
  wall.style.height = `${netHeight}px`;
  wall.style.backgroundColor = '#0066cc';
  wall.style.borderTopLeftRadius = '5px';
  wall.style.borderTopRightRadius = '5px';
  wall.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.3)';
  wall.style.zIndex = '40';

  // Add a net texture
  const netTexture = document.createElement('div');
  netTexture.style.position = 'absolute';
  netTexture.style.top = '0';
  netTexture.style.left = '0';
  netTexture.style.width = '100%';
  netTexture.style.height = '100%';
  netTexture.style.backgroundImage = 'repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(255, 255, 255, 0.1) 10px, rgba(255, 255, 255, 0.1) 20px)';

  wall.appendChild(netTexture);

  return wall;
}
