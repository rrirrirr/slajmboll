/**
 * Creates a slime DOM element with appropriate styling
 * @param {Object} options - Slime appearance options
 * @param {string} options.color - The color of the slime
 * @param {number} options.width - Width of the slime in pixels
 * @param {number} options.height - Height of the slime in pixels
 * @param {string} options.slimeId - Unique identifier for the slime
 * @param {number} options.teamNumber - Team number the slime belongs to
 * @returns {HTMLElement} The slime DOM element
 */
export function createSlimeElement({ color, width, height, slimeId, teamNumber }) {
  const slime = document.createElement('div');
  slime.classList.add('slime');

  // Set styling
  slime.style.backgroundColor = color;
  slime.style.width = `${width}px`;
  slime.style.height = `${height}px`;

  // Set identifiers
  if (slimeId) {
    slime.setAttribute('data-slime-id', slimeId);
  }

  if (teamNumber) {
    slime.classList.add(`slime-${teamNumber}`);
  }

  return slime;
}

/**
 * Update slime appearance based on team
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {number} teamNumber - Team number (1 or 2)
 */
export function updateSlimeTeamAppearance(slimeElement, teamNumber) {
  // Remove existing team classes
  slimeElement.classList.remove('teamColorOne', 'teamColorTwo');

  if (teamNumber === 1) {
    slimeElement.classList.add('teamColorOne');
  } else if (teamNumber === 2) {
    slimeElement.classList.add('teamColorTwo');
  }
}

/**
 * Apply animation effects to the slime element
 * @param {HTMLElement} slimeElement - The slime DOM element
 * @param {Object} velocity - Current velocity of the slime
 * @param {Object} options - Animation options
 */
export function applySlimeAnimationEffects(slimeElement, velocity, options = {}) {
  // Squash and stretch effect based on horizontal velocity
  slimeElement.style.borderTopLeftRadius = `${70 + velocity.x * 2}px`;
  slimeElement.style.borderTopRightRadius = `${70 - velocity.x * 2}px`;

  // Height adjustment based on horizontal speed (squash effect)
  const heightReduction = Math.abs(velocity.x * 1);
  const baseHeight = parseInt(slimeElement.style.height);

  slimeElement.style.height = `${baseHeight - heightReduction}px`;
}

/**
 * Render slime position and appearance
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
  slimeElement.style.borderTopLeftRadius = `${70 + velocity.x * 2}px`;
  slimeElement.style.borderTopRightRadius = `${70 - velocity.x * 2}px`;
}
