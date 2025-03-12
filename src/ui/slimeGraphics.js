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
 * 
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {Object} position - Position {x, y} of the slime
 * @param {Object} velocity - Velocity {x, y} of the slime
 * @param {number} width - Width of the slime
 * @param {number} height - Base height of the slime
 */
export function renderSlime(slimeElement, position, velocity, width, height) {
  // Apply position - ensure slime stays on the ground
  slimeElement.style.left = `${position.x - width / 2}px`;

  // Keep slime on the ground
  slimeElement.style.top = `${position.y - height}px`;

  // Apply squash effect based on horizontal velocity
  const squashFactor = Math.min(Math.abs(velocity.x) * 0.03, 0.3);

  // When moving, slightly adjust width and height for squash effect
  // but maintain the volume of the half-circle
  const stretchedWidth = width * (1 + squashFactor);
  const compressedHeight = height * (1 - squashFactor * 0.5);

  slimeElement.style.width = `${stretchedWidth}px`;
  slimeElement.style.height = `${compressedHeight}px`;

  // Apply deformation effect - adjust border radius for a more dynamic look
  const horizontalEffect = velocity.x * 2;
  const baseRadius = stretchedWidth; // Make sure it's a half-circle

  slimeElement.style.borderTopLeftRadius = `${baseRadius - horizontalEffect}px`;
  slimeElement.style.borderTopRightRadius = `${baseRadius + horizontalEffect}px`;

  // Ensure perfect half circle when still
  if (Math.abs(velocity.x) < 0.1) {
    slimeElement.style.borderTopLeftRadius = `${baseRadius}px`;
    slimeElement.style.borderTopRightRadius = `${baseRadius}px`;
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
 * Creates the ground element
 * 
 * @returns {HTMLElement} Ground element
 */
export function createGround() {
  const ground = document.createElement('div');
  ground.id = 'ground';
  ground.style.position = 'absolute';
  ground.style.bottom = '0';
  ground.style.width = '100%';
  ground.style.height = '40px';
  ground.style.backgroundColor = '#8B4513';
  ground.style.backgroundImage = 'linear-gradient(0deg, #8B4513 60%, #A0522D 100%)';
  ground.style.borderTop = '2px solid #654321';
  ground.style.zIndex = '30';

  return ground;
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
