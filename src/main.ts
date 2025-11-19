import './style.css';
import { CosmicDash } from './CosmicDash';

// Get canvas element
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}

// Initialize the game
const game = new CosmicDash(canvas);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  game.dispose();
});
