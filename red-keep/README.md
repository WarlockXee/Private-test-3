# The Red Keep

A walkable 3D model of Kate Pryde's stronghold on Hellfire Bay, Krakoa, built with three.js.

**Stage 1: layout blockout.** All nine floors, the spiral stair and lift, the guest stair and beach tunnel, the hidden tunnel from the operations room, and the grotto. Surfaces use plain colours for now. The cliff, beach, jungle and the White Palace across the bay are scenery only.

## Opening it

The easiest way is the published page on claude.ai (private to you). To run this folder locally, serve it over HTTP, since browsers block ES modules opened straight from disk:

```
cd red-keep
python3 -m http.server 8000
# then open http://localhost:8000
```

It needs an internet connection for three.js (loaded from jsDelivr).

## Controls

- **Dollhouse:** drag to orbit, right-drag to pan, scroll to zoom. Pick a floor on the left, then click a room tag to walk into it.
- **Walk:** click to look around. `W A S D` move, `Shift` run, `Space` jump, `P` phase (walk through walls), `M` back to the dollhouse. Stand in the glass lift and press `1`–`9` to ride.

## Files

- `index.html`: page shell and interface
- `app.js`: floor plans, geometry, terrain, walking physics
- `textures/waternormals.jpg`: water normal map from the three.js examples (MIT)
