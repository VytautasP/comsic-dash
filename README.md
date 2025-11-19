# Cosmic Dash 🚀

An endless runner 3D game built with TypeScript, HTML, CSS, and Babylon.js.

## Game Overview

Navigate your spaceship through an endless cosmic tunnel, dodging obstacles and collecting power-ups to achieve the highest score possible!

## Features Implemented

### Core Mechanics
- ✅ **Player Control**: Move left and right using Arrow Keys or A/D keys
- ✅ **Procedural Generation**: Obstacles continuously generated ahead of the player
- ✅ **Collision Detection**: Game ends when player hits an obstacle (unless shielded)
- ✅ **Scoring System**: Score increases based on time survived

### Additional Features
- ✅ **Collectible Items**:
  - 🟢 **Green Spheres**: Award 100 bonus points
  - 🔵 **Blue Spheres**: Grant a temporary shield (5 seconds)
  
- ✅ **Varied Obstacle Patterns**:
  - **Static**: Obstacles stay in their lane
  - **Sine Wave**: Obstacles move side-to-side in a wave pattern
  - **Circular**: Obstacles move in a circular motion
  
- ✅ **Progressive Difficulty**: Speed increases over time based on score
  
- ✅ **Visual Effects**:
  - Particle trail effect for the player's spaceship
  - Explosion particles on collision
  - Glow effects on all game objects
  - Animated tunnel rings creating depth
  - Wireframe grid floor
  - Atmospheric colored lighting

### UI Features
- Real-time score display
- High score tracking (persisted in localStorage)
- Game over screen with final score
- Instructions screen
- Restart functionality

## How to Play

1. **Start**: Click the "Start Game" button
2. **Move**: Use **Arrow Keys** (← →) or **A/D** keys to move between three lanes
3. **Dodge**: Avoid red obstacles coming toward you
4. **Collect**: 
   - Grab green spheres for bonus points
   - Grab blue spheres for a temporary shield
5. **Survive**: Last as long as possible - speed increases over time!

## Controls

- **Left Arrow** or **A**: Move left
- **Right Arrow** or **D**: Move right

## Installation & Running

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

The game will be available at `http://localhost:5173/`

## Technical Details

### Technologies Used
- **TypeScript**: Type-safe game logic
- **Babylon.js**: 3D rendering engine
- **Vite**: Fast build tool and dev server
- **CSS3**: Modern styling with gradients and animations

### Game Architecture
- **CosmicDash.ts**: Main game class handling:
  - Scene setup and rendering
  - Player controls and physics
  - Obstacle and collectible spawning
  - Collision detection
  - Particle systems
  - UI management
  - Score tracking

### Performance
- Efficient object pooling for obstacles
- Optimized particle systems
- Automatic cleanup of off-screen objects
- Smooth 60 FPS rendering

## Future Enhancements

Potential additions:
- Multiple spaceship designs
- Different environment themes
- Power-up varieties (speed boost, magnet, invincibility)
- Leaderboard system
- Sound effects and music
- Mobile touch controls
- Multiplayer mode

## Credits

Built as a demonstration of 3D game development with TypeScript and Babylon.js.

Enjoy playing Cosmic Dash! 🎮✨
