---
title: 3D WebGL Multi-Domain Workspace (SURFACES-HTML & D3.js 2D/3D Parity Plan)
domain: CODEREF-CORE
status: open
created: 2026-07-24
stub_ref: null
---

# 3D WebGL Multi-Domain Workspace & D3 2D Parity Plan

## 1. Purpose
Integrate the high-performance Three.js 3D WebGL workspace app with 100% `SURFACES-HTML` standards alignment, Lucide icon system, and true **D3.js 2D Force-Directed Simulation Parity** across 4 ecosystem domains:
1. 🌐 **Codebase Map**: Full repository 3D WebGL module radar + live D3.js 2D force-directed layout.
2. 🧠 **Skills Graph**: 3D & 2D skill taxonomy rendering skills and typed dependency beams/arcs.
3. 🛡️ **Standards Matrix**: Machine-checker compliance matrix (0 PASS Green, 1 WARN Amber, 2 FAIL Red).
4. 📚 **Docs Mesh**: Dual-node knowledge mesh connecting markdown docs to code implementation modules.

## 2. Audit: 2D Viewer Implementations (Original D3.js vs Static Fallback)

| Feature | Original Real 2D Viewer (`viewer.js` + D3.js) | Lightweight Static Fallback | D3 2D Engine Integration Plan |
|---|---|---|---|
| **Physics Simulation** | **Live D3 Force Simulation** (`d3.forceSimulation`) with `forceManyBody`, `forceLink`, `forceCenter`. | Static 2D orthographic projection of 3D coordinates. | Embed live D3 v7 force simulation in `#svg-2d-canvas`. |
| **Node Dragging & Pinning** | **D3 Dragging** (`d3.drag`) with node position pinning (`node.fx`, `node.fy`). | Static non-draggable SVG circles. | Full D3 drag behavior with double-click unpin. |
| **Viewport Navigation** | **D3 Zoom Matrix** (`d3.zoom`) with smooth mousewheel zoom & pan. | Static centered SVG element. | Full D3 zoom & pan behavior across 2D graph plane. |
| **Edge Geometry** | Curved SVG arcs with directed arrowheads (`<marker>`) and logarithmic stroke weights. | Straight uniform lines. | Curved D3 SVG paths with arrowheads and weighted stroke thickness. |

## 3. Icon & Aesthetics Standards (SURFACES-HTML Compliance)
- **Lucide Icons**: Replaced all emojis with official Lucide SVG icons (`globe`, `brain`, `shield`, `book-open`, `box`, `eye`, `target`, `zoom-in`, `mouse-pointer`).
- **CSS Token Vocabulary**: Uses canonical tokens (`--background`, `--foreground`, `--card`, `--border`, `--primary`, `--secondary`, `--accent`, `--muted`, `--destructive`).
- **BEM Class Scoping**: All UI classes are BEM-scoped (`.surfaces-3d-workspace__*`).
- **Event Bus Alignment**: Dispatches `surfaces-html:domain-changed` events on `document`.

## 4. Implemented Sandbox Deliverables
- Master Backup: `threejs_3d_codebase_radar.v1_master.html`
- Unified Workspace App: `threejs_3d_codebase_radar.html`

## 5. Next Step
Promote plan to feature stub:
```bash
/stub 3d-webgl-map-integration --domain=CODEREF-CORE --category=feature
```
