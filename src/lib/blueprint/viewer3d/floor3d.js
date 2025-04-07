import {
  EventDispatcher,
  FrontSide,
  DoubleSide,
  Vector2,
  Vector3,
  Shape,
  ShapeGeometry,
  Mesh,
  PointLight,
  BackSide,
  MaxEquation,
  SpotLight,
  SpotLightHelper,
  DirectionalLightHelper,
  DirectionalLight,
  CameraHelper,
  MeshStandardMaterial,
  LineBasicMaterial,
  EdgesGeometry,
  LineSegments,
  BufferGeometry,
  Float32BufferAttribute,
  Box3,
 HemisphereLight, HemisphereLightHelper } from "three";

import {
  TEXTURE_PROPERTY_COLOR,
  TEXTURE_PROPERTY_REPEAT,
  TEXTURE_PROPERTY_ROTATE,
  TEXTURE_PROPERTY_REFLECTIVE,
  TEXTURE_PROPERTY_SHININESS,
} from "../core/constants.js";
import {
  EVENT_CHANGED,
  EVENT_UPDATE_TEXTURES,
  EVENT_ROOM_ATTRIBUTES_CHANGED,
  EVENT_MODIFY_TEXTURE_ATTRIBUTE,
} from "../core/events.js";
import { Utils } from "../core/utils.js";
import { FloorMaterial3D } from "../materials/FloorMaterial3D.js";

export class Floor3D extends EventDispatcher {
  constructor(scene, room, controls, opts) {
    super();

    let options = { occludedRoofs: false };
    for (let opt in options) {
      if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
        options[opt] = opts[opt];
      }
    }
    this.__options = options;

    this.scene = scene;
    this.room = room;
    this.controls = controls;
    this.roomLight = null;
    this.roomLightHelper = null;
    this.floorPlane = null;
    this.roofPlane = null;
    this.realistic = true; // private 프로퍼티로 변경

    this.changedevent = this.redraw.bind(this);
    this.__materialChangedEvent = this.__updateTexturePack.bind(this);
    this.__updateReflectionsEvent = this.__updateReflections.bind(this);

    this.__floorMaterial3D = null;

    this.room.addEventListener(
      EVENT_ROOM_ATTRIBUTES_CHANGED,
      this.changedevent,
    );
    this.room.addEventListener(EVENT_CHANGED, this.changedevent);
    this.room.addEventListener(
      EVENT_UPDATE_TEXTURES,
      this.__materialChangedEvent,
    );
    this.room.addEventListener(
      EVENT_MODIFY_TEXTURE_ATTRIBUTE,
      this.__materialChangedEvent,
    );
    this.controls.addEventListener("change", this.__updateReflectionsEvent);

    this.init();
  }

  get realistic() {
    return this.__realistic;
  }

  set realistic(value) {
    if (this.__realistic !== value) {
      this.__realistic = value;
      this.redraw();
    }
  }

  __updateReflections() {
    if (
      this.__floorMaterial3D &&
      this.__floorMaterial3D.isReflective &&
      this.scene.enabled
    ) {
      let floorSize = this.room.floorRectangleSize.clone();
      this.floorPlane.visible = false;
      this.__floorMaterial3D.envMapCamera.clear(this.scene.renderer);
      this.__floorMaterial3D.envMapCamera.position.set(
        floorSize.x,
        0,
        floorSize.y,
      );
      this.__floorMaterial3D.envMapCamera.update(
        this.scene.renderer,
        this.scene,
      );
      this.__floorMaterial3D.needsUpdate = true;
    }
  }

  __updateTexturePack(evt) {
    if (evt.type === EVENT_UPDATE_TEXTURES) {
      let floorSize = this.room.floorRectangleSize.clone();
      let texturePack = this.room.getTexture();
      if (!this.__floorMaterial3D) {
        this.__floorMaterial3D = new FloorMaterial3D(
          { color: texturePack.color, side: DoubleSide, wireframe: false },
          texturePack,
          this.scene,
        );
      }
      this.__floorMaterial3D.textureMapPack = texturePack;
      this.__floorMaterial3D.dimensions = floorSize;
    } else if (evt.type === EVENT_MODIFY_TEXTURE_ATTRIBUTE) {
      if (this.__floorMaterial3D) {
        let attribute = evt.attribute;
        let value = evt.value;
        if (attribute === TEXTURE_PROPERTY_COLOR) {
          this.__floorMaterial3D.textureColor = value;
        }
        if (attribute === TEXTURE_PROPERTY_REPEAT) {
          this.__floorMaterial3D.repeat = value;
        }
        if (attribute === TEXTURE_PROPERTY_ROTATE) {
          this.__floorMaterial3D.map.rotation = value;
        }
        if (attribute === TEXTURE_PROPERTY_REFLECTIVE) {
          this.__floorMaterial3D.reflective = value;
        }
        if (attribute === TEXTURE_PROPERTY_SHININESS) {
          this.__floorMaterial3D.shininess = value;
        }
      }
    }
    this.scene.needsUpdate = true;
  }

  switchWireframe(flag) {
    this.floorPlane.visible = !flag;
    this.roofPlane.visible = !flag;
  }

  init() {
    this.__updateTexturePack({ type: EVENT_UPDATE_TEXTURES });
    this.redraw();
  }

  redraw() {
    this.removeFromScene();
    this.roomLight = null; //this.addRoomLight();
    this.floorPlane = this.buildFloor();
    this.roofPlane = this.buildRoofVaryingHeight();
    this.addToScene();
  }

  addRoomLight() {
    let position = new Vector3(
      this.room.areaCenter.x,
      300,
      this.room.areaCenter.y,
    );
    let light = new DirectionalLight(0xffffff, 0.15);

    light.position.copy(position);
    light.castShadow = true;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;

    light.shadow.camera.near = 1;
    light.shadow.camera.far = 1000;
    light.shadow.camera.top = 1000;
    light.shadow.camera.right = 1000;
    light.shadow.camera.bottom = -1000;
    light.shadow.camera.left = -1000;
    light.shadow.bias = -0.00001;
    light.shadow.radius = 0;
    light.visible = true;
    light.target.position.set(
      this.room.areaCenter.x,
      0,
      this.room.areaCenter.y,
    );

    return light;
  }

  buildFloor() {
    let points = [];
    let min = new Vector2(Number.MAX_VALUE, Number.MAX_VALUE);
    this.room.interiorCorners.forEach((corner) => {
      min.x = Math.min(min.x, corner.x);
      min.y = Math.min(min.y, corner.y);
      points.push(new Vector2(corner.x, corner.y));
    });

    let floorSize = this.room.floorRectangleSize.clone();
    let shape = new Shape(points);
    let useGeometry = new ShapeGeometry(shape);
    let positionAttribute = null;
    let uvAttribute = null;
    let box3 = null;

    // realistic 모드에 따라 다른 재질 사용
    let material;
    if (this.__realistic) {
      material = this.__floorMaterial3D;
    } else {
      material = new MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: DoubleSide,
      });
    }

    let floor = new Mesh(useGeometry, material);
    let vec3 = new Vector3();

    floor.receiveShadow = true;
    floor.rotation.set(Math.PI * 0.5, 0, 0);

    floor.geometry.computeVertexNormals();
    floor.geometry.normalizeNormals();

    box3 = new Box3().setFromObject(floor);

    positionAttribute = floor.geometry.getAttribute("position");
    uvAttribute = floor.geometry.getAttribute("uv");

    for (let i = 0; i < positionAttribute.count; i++) {
      vec3.fromBufferAttribute(positionAttribute, i);
      uvAttribute.setXY(
        i,
        (vec3.x - box3.min.x) / floorSize.x,
        (vec3.y - box3.min.y) / floorSize.y,
      );
    }

    uvAttribute.needsUpdate = true;

    return floor;
  }

  buildRoofVaryingHeight() {
    function getCornerForVertex(vertex2d) {
      for (let i = 0; i < this.room.interiorCorners.length; i++) {
        let iCorner = this.room.interiorCorners[i];
        if (vertex2d.clone().sub(iCorner).length() < 1e-3) {
          return i;
        }
      }
      return 0;
    }
    let side =
      this.room.isLocked || this.__options.occludedRoofs
        ? DoubleSide
        : FrontSide;
    // 재질 설정 수정
    let roofMaterial = new MeshStandardMaterial({
      side: side,
      color: 0xffffff,
      opacity: 0.1,
      transparent: true, // 투명도 활성화
    });

    let spoints = [];
    this.room.interiorCorners.forEach((corner) => {
      spoints.push(new Vector2(corner.x, corner.y));
    });

    let shape = new Shape(spoints);
    let shapeGeometry = new ShapeGeometry(shape);
    const vertices = shapeGeometry.getAttribute("position");

    for (let i = 0; i < vertices.count; i++) {
      let cornerIndex;
      let corner;
      let interiorCorner;
      vertices.setZ(i, vertices.getY(i));
      cornerIndex = getCornerForVertex.bind(this)(
        new Vector2(vertices.getX(i), vertices.getZ(i)),
      );
      interiorCorner = this.room.interiorCorners[cornerIndex];
      corner = this.room.corners[cornerIndex];
      vertices.setY(i, corner.elevation + 1.0);
    }

    shapeGeometry.computeVertexNormals();
    shapeGeometry.normalizeNormals();
    shapeGeometry.normalsNeedUpdate = true;

    let roof = new Mesh(shapeGeometry, roofMaterial);
    // 그림자 설정 수정
    roof.castShadow = false; // 그림자를 만들지 않음
    roof.receiveShadow = false; // 그림자를 받지 않음
    roof.name = "roof";
    return roof;
  }

  addToScene() {
    // this.scene.add(this.roomLight);
    this.scene.add(this.floorPlane);
    this.scene.add(this.roofPlane);
  }

  removeFromScene() {
    // this.scene.remove(this.roomLight);
    this.scene.remove(this.floorPlane);
    this.scene.remove(this.roofPlane);
  }

  showRoof(flag) {
    this.roofPlane.visible = flag;
  }

  destroy() {
    this.room.removeEventListener(
      EVENT_ROOM_ATTRIBUTES_CHANGED,
      this.changedevent,
    );
    this.room.removeEventListener(EVENT_CHANGED, this.changedevent);
    this.room.removeEventListener(
      EVENT_UPDATE_TEXTURES,
      this.__materialChangedEvent,
    );
    this.room.removeEventListener(
      EVENT_MODIFY_TEXTURE_ATTRIBUTE,
      this.__materialChangedEvent,
    );
    this.controls.removeEventListener("change", this.__updateReflectionsEvent);
    this.removeFromScene();
  }
}
