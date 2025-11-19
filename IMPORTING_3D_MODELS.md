# How to Import Your 3D Model into Cosmic Dash

## Quick Setup Guide

### Step 1: Prepare Your 3D Model

Babylon.js supports multiple formats:
- **.glb / .gltf** (Recommended - best compatibility)
- **.obj** (with .mtl for materials)
- **.fbx**
- **.stl**
- **.babylon** (Babylon.js native format)

**Recommended:** Convert your model to `.glb` format for best results.

### Step 2: Add Model to Project

1. Create a `models` folder inside the `public` directory:
   ```
   comsic-dash/
   ├── public/
   │   └── models/          ← Create this folder
   │       └── spaceship.glb ← Put your model here
   ├── src/
   └── ...
   ```

2. Place your 3D model file in `public/models/`

3. Name it `spaceship.glb` (or update the filename in the code)

### Step 3: Update the Code (if needed)

In `src/CosmicDash.ts`, find the `loadPlayerModel()` method and adjust:

```typescript
private async loadPlayerModel(): Promise<Mesh> {
  const modelPath = '/models/';           // Folder path
  const modelFile = 'spaceship.glb';      // ← Change to your filename
  
  // ... rest of the code
}
```

### Step 4: Adjust Scale and Rotation

After placing your model, you may need to adjust its size and orientation.

In the `loadPlayerModel()` method, modify these values:

```typescript
// Scale the model (make it bigger/smaller)
playerMesh.scaling = new Vector3(1, 1, 1); // Change to 0.5 to make half size, 2 to double, etc.

// Rotate the model if it's facing the wrong direction
playerMesh.rotation.y = Math.PI;     // Rotate 180° on Y-axis
playerMesh.rotation.x = 0;           // Tilt forward/backward
playerMesh.rotation.z = 0;           // Bank left/right
```

### Step 5: Test

1. Save all files
2. Refresh your browser
3. The game should load your 3D model!

## Supported File Formats & Import Lines

### For .glb / .gltf (Already configured)
```typescript
import '@babylonjs/loaders/glTF';
```

### For .obj files
```typescript
import '@babylonjs/loaders/OBJ';
const modelFile = 'spaceship.obj';
```

### For .stl files
```typescript
import '@babylonjs/loaders/STL';
const modelFile = 'spaceship.stl';
```

## Troubleshooting

### Model doesn't appear
- Check browser console (F12) for errors
- Verify the file path is correct: `/models/yourfile.glb`
- Make sure the file is in the `public/models/` folder
- Check the file extension matches in the code

### Model is too big/small
- Adjust `playerMesh.scaling` values
- Try: `new Vector3(0.1, 0.1, 0.1)` for smaller or `new Vector3(5, 5, 5)` for bigger

### Model is facing wrong direction
- Adjust rotation values
- Common fixes:
  - `rotation.y = Math.PI` (180° turn)
  - `rotation.y = Math.PI / 2` (90° turn)

### Model has no texture/color
- Ensure your model file includes materials
- For .obj files, make sure the .mtl file is in the same folder
- Try adding emissive color in code:
  ```typescript
  result.meshes.forEach(mesh => {
    if (mesh.material) {
      (mesh.material as StandardMaterial).emissiveColor = new Color3(0, 1, 1);
    }
  });
  ```

## Example File Structure

```
public/
└── models/
    ├── spaceship.glb      ← Your main model
    ├── asteroid.glb       ← Optional: custom obstacles
    └── powerup.glb        ← Optional: custom collectibles
```

## Current Status

✅ @babylonjs/loaders installed
✅ glTF/GLB loader imported
✅ Model loading code added with fallback
✅ Ready to use your 3D model!

Just add your model file to `public/models/spaceship.glb` and it will load automatically!
