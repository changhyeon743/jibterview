// @orchestra blueprint
export const VIEWER_IDS = {
  FLOORPLANNER: "bp3djs-floorplanner",
  VIEWER3D: "bp3djs-viewer3d",
};

export const BLUEPRINT_OPTIONS = {
  viewer2d: {
    id: VIEWER_IDS.FLOORPLANNER,
    viewer2dOptions: {
      "corner-radius": 5.0,
      "boundary-point-radius": 10.0,
      "boundary-line-thickness": 3.0,
      "boundary-point-color": "#030303",
      "boundary-line-color": "#090909",
      pannable: true,
      zoomable: true,
      scale: false,
      rotate: true,
      translate: true,
      dimlinecolor: "#000000",
      dimarrowcolor: "#000000",
      dimtextcolor: "#000000",
      pixiAppOptions: {
        resolution: 1,
      },
      pixiViewportOptions: {
        passiveWheel: false,
      },
    },
  },
  viewer3d: {
    id: VIEWER_IDS.VIEWER3D,
    viewer3dOptions: {
      occludedWalls: false,
      occludedRoofs: false,
    },
  },
  textureDir: "models/textures/",
  widget: false,
  resize: true,
};
