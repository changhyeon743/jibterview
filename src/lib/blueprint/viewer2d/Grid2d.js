import { Graphics } from "pixi.js";
import { Vector2 } from "three";

import { Configuration, gridSpacing, viewBounds } from "../core/configuration";
import { Dimensioning } from "../core/dimensioning";
import { EVENT_CHANGED } from "../core/events";

const GRID_SIZE = 1000;

export class Grid2D extends Graphics {
  constructor(canvas, options) {
    super();
    // this.drawRect(0, 0, GRID_SIZE, GRID_SIZE);
    this.__canvasHolder = canvas;
    this.__options = options;
    this.__size = new Vector2(GRID_SIZE, GRID_SIZE);
    this.__gridScale = 1.0;
    this.width = this.__size.x;
    this.height = this.__size.y;
    this.drawRect(0, 0, GRID_SIZE, GRID_SIZE);
    this.pivot.x = this.pivot.y = 0.5;
    Configuration.getInstance().addEventListener(EVENT_CHANGED, (evt) =>
      this.__updateGrid(evt.key),
    );
    this.__updateGrid();
  }

  __updateGrid() {
    let gridSize = Dimensioning.cmToPixel(
      Configuration.getNumericValue(viewBounds) * 1,
    );
    let spacingCMS = Configuration.getNumericValue(gridSpacing) * 10; //임의로 곱하기 10
    let spacing = Dimensioning.cmToPixel(spacingCMS);
    let totalLines = gridSize / spacing;
    let halfSize = gridSize * 0.5;
    let linewidth = Math.max(1.0 / this.__gridScale, 1.0);
    let highlightLineWidth = Math.max(2.0 / this.__gridScale, 1.0);
    let normalColor = 0xe0e0e0;
    let highlightColor = 0xd0d0d0;
    this.clear();
    for (let i = 0; i < totalLines; i++) {
      let co = i * spacing - halfSize;
      if (i % 5 === 0) {
        this.lineStyle(highlightLineWidth, highlightColor)
          .moveTo(-halfSize, co)
          .lineTo(halfSize, co);
        this.lineStyle(highlightLineWidth, highlightColor)
          .moveTo(co, -halfSize)
          .lineTo(co, halfSize);
      } else {
        this.lineStyle(linewidth, normalColor)
          .moveTo(-halfSize, co)
          .lineTo(halfSize, co);
        this.lineStyle(linewidth, normalColor)
          .moveTo(co, -halfSize)
          .lineTo(co, halfSize);
      }
    }

    // this.beginFill(0xFF0000, 1.0);
    // this.drawCircle(-halfSize, -halfSize,20);
    // this.drawCircle(halfSize, -halfSize,20);
    // this.drawCircle(halfSize, halfSize,20);
    // this.drawCircle(-halfSize, halfSize,20);
    // this.drawCircle(0, 0, 20);
    // this.endFill();
  }

  get gridScale() {
    return this.__gridScale;
  }

  set gridScale(value) {
    this.__gridScale = value;
    this.__updateGrid();
  }

  __configurationUpdate(evt) {
    if (evt.key === gridSpacing) {
      this.__updateGrid();
    }
  }
}
