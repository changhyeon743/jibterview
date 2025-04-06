import {
  Mesh,
  FontLoader,
  Line,
  TextGeometry,
  BufferGeometry,
  Box3,
  MathUtils,
  Group,
  Object3D,
  ExtrudeBufferGeometry,
  BoundingBoxHelper,
  Vector3,
  VertexColors,
  ArrowHelper,
  AxesHelper,
  SphereGeometry,
  MeshBasicMaterial,
  Matrix4,
  sRGBEncoding,
  LinearEncoding,
  PointLightHelper,
  SpotLight,
  PointLight,
  SpotLightHelper,
  TextureLoader,
  RepeatWrapping,
  MeshPhongMaterial,
  Plane,
  CompressedPixelFormat,
  Euler,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  EVENT_ITEM_LOADED,
  EVENT_ITEM_LOADING,
  EVENT_UPDATED,
  EVENT_PARAMETRIC_GEOMETRY_UPATED,
  EVENT_ITEM_REMOVED,
} from "../core/events";
import { Utils } from "../core/utils";
import {
  BoxGeometry,
  LineBasicMaterial,
  LineSegments,
  EdgesGeometry,
  ObjectLoader,
  Vector2,
} from "three";
import { FloorMaterial3D } from "../materials/FloorMaterial3D";
import { ConfigurationHelper } from "../helpers/ConfigurationHelper";
import { Configuration, shadowVisible } from "../core/configuration.js";
import { gsap, Power0 } from "gsap";
import { WallFloorItem } from "../items/wall_floor_item";
import { InWallItem } from "../items/in_wall_item";
import { InWallFloorItem } from "../items/in_wall_floor_item";
import { ItemStatistics3D } from "./ItemStatistics3D";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader";

// import { Group } from "three/build/three.module";
// @orchestra blueprint

export class Physical3DItem extends Mesh {
  constructor(itemModel, dragControls, opts) {
    super();
    opts = opts || {};
    let options = {
      statistics: {
        dimension: {
          unselectedColor: 0xffff00,
          selectedColor: 0xffff00,
        },
        distance: {
          unselectedColor: 0xf0f0f0,
          selectedColor: 0xf0f0f0,
        },
      },
    };
    for (let opt in options) {
      if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
        options[opt] = opts[opt];
      }
    }
    let boxHelperMaterial = new LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
      transparent: true,
    });
    this.__options = options;
    this.__itemModel = itemModel;
    this.__dragControls = dragControls;
    this.__box = null;
    this.castShadow = true;
    this.receiveShadow = true;
    this.__shadowVisible = true;
    this.__center = null;
    this.__size = null;
    this.__itemType = null;
    this.__selected = false;
    this.__currentPosition = new Vector3();
    /** Show rotate option in context menu */
    this.allowRotate = true;
    this.halfSize = this.__itemModel.halfSize; //new Vector3(0, 0, 0);

    this.__selectedMaterial = boxHelperMaterial;
    this.__boxhelper = new LineSegments(
      new EdgesGeometry(new BoxGeometry(1, 1, 1)),
      this.__selectedMaterial,
    );
    this.__boxMaterialAnimator = gsap.fromTo(
      this.__boxhelper.material,
      {
        opacity: 1.0,
      },
      {
        opacity: 0.0,
        duration: 1.0,
        repeat: 0,
        yoyo: true,
        ease: Power0.easeNone,
        paused: true,
        onStart: function () {
          this.__boxhelper.visible = true;
        }.bind(this),
        onFinish: function () {
          this.__boxhelper.visible = false;
          // this.__boxhelper.material.opacity = 0.0;
        }.bind(this),
      },
    );
    this.__itemStatistics = null;

    this.__dimensionHelper = new Group();
    this.__measurementgroup = new Object3D();
    this.__pointLightHelper = null;
    this.__spotLightHelper = null;
    this.__customIntersectionPlanes = []; // Useful for intersecting only wall planes, only floorplanes, only ceiling planes etc
    this.configurationHelper = new ConfigurationHelper();
    this.__gltfLoader = new GLTFLoader();
    this.__gltfLoadingProgressEvent = this.__gltfLoadingProgress.bind(this);
    this.__gltfLoadedEvent = this.__gltfLoaded.bind(this);
    this.__itemUpdatedEvent = this.__itemUpdated.bind(this);
    this.__parametricGeometryUpdateEvent =
      this.__parametricGeometryUpdate.bind(this);
    this.__disposeEvent = this.dispose.bind(this);

    this.__itemModel.addEventListener(EVENT_UPDATED, this.__itemUpdatedEvent);
    this.__itemModel.addEventListener(EVENT_ITEM_REMOVED, this.__disposeEvent);
    this.add(this.__boxhelper);
    this.selected = false;
    this.position.copy(this.__itemModel.position);
    if (this.__itemModel.isParametric) {
      this.__createParametricItem();
    } else {
      this.__loadItemModel();
    }

    this.__realistic = true;
    this.__initialDropOffset = 80; // 50 units 위에서 시작
    this.__dropAnimationDuration = 1.2; // 애니메이션 지속 시간
  }

  // Add setter/getter for realistic mode
  set realistic(value) {
    this.__realistic = value;
    if (this.__loadedItem) {
      this.updateMaterials();
    }
  }

  get realistic() {
    return this.__realistic;
  }

  updateMaterials() {
    if (!this.__loadedItem) return;

    const toonMaterial = new MeshPhongMaterial({
      color: 0xffffff, // 기본 흰색
      specular: 0x000000, // 반사 없음
      shininess: 0, // 광택 없음
      flatShading: true, // 플랫 셰이딩 적용
    });

    const outlineMaterial = new LineBasicMaterial({
      color: 0x000000,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });

    this.__loadedItem.traverse((child) => {
      if (child.isMesh) {
        if (this.__realistic) {
          // Restore original materials if they exist
          if (child.__originalMaterial) {
            child.material = child.__originalMaterial;
          }
          // Remove outline if it exists
          const outline = child.getObjectByName("outline");
          if (outline) {
            child.remove(outline);
          }
        } else {
          // Store original material if not already stored
          if (!child.__originalMaterial) {
            child.__originalMaterial = child.material.clone();
          }
          // Apply toon material
          child.material = toonMaterial.clone();

          // Add outline if it doesn't exist
          if (!child.getObjectByName("outline")) {
            const edges = new EdgesGeometry(child.geometry, 30);
            const outline = new LineSegments(edges, outlineMaterial);
            outline.name = "outline";
            child.add(outline);
          }
        }

        // Update shadow settings
        child.castShadow = this.__shadowVisible;
        child.receiveShadow = true;
      }
    });
  }
  objectHalfSize(geometry) {
    geometry.computeBoundingBox();
    let objectBox = geometry.boundingBox.clone();
    return objectBox.max.clone().sub(objectBox.min).divideScalar(2);
  }

  __parametricGeometryUpdate(evt) {
    let mLocal = this.matrixWorld.clone().invert(); //new Matrix4().getInverse(this.matrixWorld);
    this.__loadedItem.geometry = this.__itemModel.parametricClass.geometry;
    this.parent.needsUpdate = true;

    this.__box = this.__loadedItem.geometry.boundingBox.clone(); //new Box3().setFromObject(this.__loadedItem);
    this.__center = this.__box.getCenter(new Vector3());
    this.__size = this.__box.getSize(new Vector3());
    let localCenter = this.__center.clone().applyMatrix4(mLocal);
    let m = new Matrix4();
    m = m.makeTranslation(-localCenter.x, -localCenter.y, -localCenter.z);

    this.__boxhelper.geometry = new EdgesGeometry(
      new BoxGeometry(this.__size.x, this.__size.y, this.__size.z),
    );
    // this.__boxhelper.geometry.applyMatrix4(m);

    this.__boxhelper.rotation.x = this.__itemModel.combinedRotation.x;
    this.__boxhelper.rotation.y = this.__itemModel.combinedRotation.y;
    this.__boxhelper.rotation.z = this.__itemModel.combinedRotation.z;
  }

  resize(newSize) {
    // Update the item model's metadata size
    this.__itemModel.size = newSize;
  }

  rotate(newRotation) {
    this.__itemModel.innerRotation = newRotation;
  }

  __itemUpdated(evt) {
    let scope = this;
    let duration = 0.25;
    if (!scope.parent) {
      return;
    }
    if (evt.property === "position") {
      this.position.set(
        this.__itemModel.position.x,
        this.__itemModel.position.y,
        this.__itemModel.position.z,
      );
    }
    if (evt.property === "scale") {
      this.scale.set(
        this.__itemModel.scale.x,
        this.__itemModel.scale.y,
        this.__itemModel.scale.z,
      );
    }
    if (evt.property === "size") {
      const newSize = new Vector3().fromArray(this.__itemModel.__metadata.size);
      this.__updateSize(newSize);
    }
    if (evt.property === "rotation") {
      // const newRotation = this.__itemModel.rotation;
      // const eulerRotation = new Euler(newRotation.x, newRotation.y, newRotation.z);
      // this.rotation.copy(eulerRotation);
      //
      // if (!this.itemModel.__metadata.rotation) {return;}
      // const newRotation = new Vector3().fromArray(this.__itemModel.__metadata.rotation);
      // this.__updateRotation(newRotation);
    }
    if (evt.property === "innerRotation") {
      // const newRotation = this.__itemModel.innerRotation;
      // const eulerRotation = new Euler(newRotation.x, newRotation.y, newRotation.z);
      // this.rotation.copy(eulerRotation);
      if (!this.itemModel.__metadata.innerRotation) {
        return;
      }
      const newRotation = new Vector3().fromArray(
        this.__itemModel.__metadata.innerRotation,
      );
      this.__updateRotation(newRotation);
    }
    if (evt.property === "visible") {
      this.visible = this.__itemModel.visible;
    }
  }

  __updateRotation(newRotation) {
    const eulerRotation = new Euler(
      newRotation.x,
      newRotation.y,
      newRotation.z,
    );

    if (this.__loadedItem) {
      this.__loadedItem.rotation.copy(eulerRotation);
    }

    // boxhelper's rotation update
    this.__boxhelper.rotation.copy(eulerRotation);

    // itemStatistics' rotation update (if it exists)
    if (this.__itemStatistics) {
      this.__itemStatistics.rotation.copy(eulerRotation);
    }

    // Update intersection planes if necessary
    if (this.__itemModel.updateIntersectionPlanes) {
      this.__itemModel.updateIntersectionPlanes();
    }

    // Update parent if necessary
    if (this.parent) {
      this.parent.needsUpdate = true;
    }
  }

  __updateSize(newSize) {
    // Calculate scale factors
    const currentSize = this.__size.clone();
    const scaleFactors = new Vector3(
      newSize.x / currentSize.x,
      newSize.y / currentSize.y,
      newSize.z / currentSize.z,
    );

    // Calculate the height difference
    // const heightDifference = newSize.y - currentSize.y;

    // this.position.y += heightDifference / 2;
    // this.itemModel.__metadata.position[1] += heightDifference / 2;

    // Update the loaded item's scale
    // this.scale.multiply(scaleFactors);
    this.__loadedItem.scale.multiply(scaleFactors);

    // Update the item's size and bounding box
    this.__size.copy(newSize);
    this.__box = new Box3().setFromObject(this.__loadedItem);

    // Update halfSize
    this.__halfSize = this.__size.clone().divideScalar(2);

    // Update boxhelper
    this.__boxhelper.geometry = new EdgesGeometry(
      new BoxGeometry(this.__size.x, this.__size.y, this.__size.z),
    );
    this.__boxhelper.position.set(0, 0, 0);

    // Update item statistics
    if (this.__itemStatistics) {
      this.__itemStatistics.updateDimensions();
      this.__itemStatistics.updateDistances();
    }

    // Update geometry
    this.geometry = new BoxGeometry(
      this.__size.x,
      this.__size.y,
      this.__size.z,
      1,
      1,
      1,
    );
    this.geometry.computeBoundingBox();

    // Update position if necessary (e.g., for wall items)
    if (this.__itemModel.isWallDependent) {
      const wallEdge = this.__itemModel.currentWallEdge;
      if (wallEdge) {
        this.__itemModel.snapToWall(
          this.__itemModel.position,
          this.__itemModel.currentWall,
          wallEdge,
        );
      }
    }

    // Update parent if necessary
    if (this.parent) {
      this.parent.needsUpdate = true;
    }
  }

  __initializeChildItem() {
    this.name = this.__itemModel.__metadata.itemName;

    // modelSize 사용
    const modelSize = new Vector3().fromArray(this.__itemModel.__metadata.size);

    // 원래 경계 상자와 원하는 크기를 기반으로 스케일 계수 계산
    const originalBox = new Box3().setFromObject(this.__loadedItem);
    const originalSize = originalBox.getSize(new Vector3());
    const scaleFactors = new Vector3(
      modelSize.x / originalSize.x,
      modelSize.y / originalSize.y,
      modelSize.z / originalSize.z,
    );

    // __loadedItem에 계산된 스케일 적용
    this.__loadedItem.scale.multiply(scaleFactors);

    // 스케일링과 회전 후 경계 상자 재계산
    this.__box = new Box3().setFromObject(this.__loadedItem);
    this.__size = this.__box.getSize(new Vector3());

    // 경계 상자 재계산 (이제 중심은 (0,0,0)이 됨)
    this.__box.setFromObject(this.__loadedItem);
    this.__center = this.__box.getCenter(new Vector3());

    // metadata의 rotation 적용
    const metadataRotation = new Euler().fromArray(
      this.__itemModel.__metadata.innerRotation || [0, 0, 0],
    );
    this.__loadedItem.rotation.copy(metadataRotation);
    this.__loadedItem.position.set(0, 0, 0);

    // 드롭 애니메이션을 위한 초기 위치 설정
    const targetY = this.__itemModel.position.y;
    this.__itemModel.position.y = targetY + this.__initialDropOffset;
    this.position.copy(this.__itemModel.position);

    // 드롭 애니메이션 설정
    const dropAnimation = gsap.to(this.__itemModel.position, {
      y: targetY,
      duration: this.__dropAnimationDuration,
      ease: "expo.inOut",
      onUpdate: () => {
        this.position.copy(this.__itemModel.position);
      },
    });

    // // 스케일 애니메이션 추가
    const scaleAnimation = gsap.from(this.__loadedItem.scale, {
      x: 0.8,
      y: 0.8,
      z: 0.8,
      duration: this.__dropAnimationDuration * 0.4,
      ease: "back.out(1.7)",
    });

    // 나머지 초기화 코드
    this.__itemType = this.__itemModel.__metadata.itemType;
    this.__loadedItem.castShadow = true;
    this.__loadedItem.receiveShadow = true;

    // boxhelper 업데이트 (원점 기준)
    this.__boxhelper.geometry = new EdgesGeometry(
      new BoxGeometry(this.__size.x, this.__size.y, this.__size.z),
    );
    this.__boxhelper.rotation.copy(metadataRotation);
    this.__boxhelper.position.set(0, 0, 0);

    // ItemStatistics3D 초기화
    this.__options.statistics["offsetToFront"] =
      this.itemModel instanceof InWallItem ||
      this.itemModel instanceof InWallFloorItem;
    this.__itemStatistics = new ItemStatistics3D(
      this,
      this.__dragControls,
      this.__options.statistics,
    );
    this.__itemStatistics.rotation.copy(metadataRotation);
    this.__itemStatistics.position.set(0, 0, 0);

    if (this.__itemModel.__metadata.isLight) {
      this.__loadedItem.name = this.__itemModel.__metadata.itemName;
      this.parent.__light3d.push(this.__loadedItem);
    }

    // geometry 업데이트
    this.geometry = new BoxGeometry(
      this.__size.x,
      this.__size.y,
      this.__size.z,
      1,
      1,
      1,
    );
    this.geometry.computeBoundingBox();

    this.material.visible = false;
    this.material.transparent = true;
    this.material.opacity = 0;
    this.userData.currentPosition = this.__currentPosition;

    // 필요한 경우 부모 업데이트
    if (this.parent) {
      this.parent.needsUpdate = true;
    }

    // ItemStatistics 업데이트 및 구성
    this.__itemStatistics.updateDistances();
    this.__itemStatistics.updateDimensions();
    this.__itemStatistics.turnOffDimensions();
    this.__itemStatistics.turnOffDistances();

    // 자식 객체 추가
    this.add(this.__loadedItem);
    this.add(this.__itemStatistics);
    this.add(this.__boxhelper);

    this.dispatchEvent({ type: EVENT_UPDATED });
  }

  __loadItemModel() {
    this.__itemModel.name = this.__itemModel.__metadata.itemName || null;
    if (
      !this.__itemModel.modelURL ||
      this.__itemModel.modelURL === undefined ||
      this.__itemModel.modelURL === "undefined"
    ) {
      return;
    }

    if (this.__loadedItem) {
      this.remove(this.__loadedItem);
    }
    this.__gltfLoader.load(
      this.__itemModel.modelURL,
      this.__gltfLoadedEvent,
      this.__gltfLoadingProgressEvent,
      (error) => {
        console.error("Error loading GLTF model:", error);
      },
    );
  }

  // Function - Add the textures to the models
  initColor(parent, type, mtl) {
    let texturepack = {};
    let material = new FloorMaterial3D({}, texturepack, parent);
    material.__multiComponentTextureUpdate(texturepack, parent, mtl);
  }

  // Modify __initialMaterial to preserve the toon shading
  // Modify __initialMaterial to work with both modes
  __initialMaterial() {
    let meshList = [];
    let meshMap = [];

    if (this.__itemModel.textures.length != 0) {
      this.initColor(this.__loadedItem, "", this.__itemModel.textures);
    } else {
      this.__loadedItem.children.forEach((mesh) => {
        meshList.push(mesh.name);
        meshMap.push({
          name: mesh.name,
          texture: "",
          color: this.__realistic ? "" : "#ffffff",
          shininess: this.__realistic ? 10 : 0,
          size: [],
        });
      });
      this.__itemModel.__metadata.mesh = meshList;
      this.__itemModel.__metadata.textures = meshMap;
    }
  }

  // Modify the __gltfLoaded function
  // Modify __gltfLoaded to use the new material system
  __gltfLoaded(gltfModel) {
    this.__itemModelglb = gltfModel;
    this.__loadedItem = gltfModel.scene;
    this.__loadedItem.castShadow = this.__shadowVisible;
    this.__loadedItem.receiveShadow = this.__shadowVisible;

    // Apply initial materials based on realistic mode
    this.updateMaterials();

    this.__initialMaterial();
    this.__initializeChildItem();

    this.__itemModel.model.dispatchEvent({ type: EVENT_ITEM_LOADED });
  }

  __gltfLoadingProgress(xhr) {
    this.__itemModel.model.dispatchEvent({
      type: EVENT_ITEM_LOADING,
      loaded: xhr.loaded,
      total: xhr.total,
      percent: (xhr.loaded / xhr.total) * 100,
      jsraw: xhr,
    });
  }

  __createParametricItem() {
    let parametricData = this.__itemModel.parametricClass;
    if (parametricData) {
      this.__loadedItem = new Mesh(
        parametricData.geometry,
        parametricData.material,
      );
      this.__itemModel.parametricClass.addEventListener(
        EVENT_PARAMETRIC_GEOMETRY_UPATED,
        this.__parametricGeometryUpdateEvent,
      );
      this.__initializeChildItem();
      this.dispatchEvent({ type: EVENT_ITEM_LOADED });
    }
  }

  dispose() {
    this.__itemModel.removeEventListener(
      EVENT_UPDATED,
      this.__itemUpdatedEvent,
    );
    this.__itemModel.removeEventListener(
      EVENT_ITEM_REMOVED,
      this.__disposeEvent,
    );
    this.parent.remove(this);
  }

  /**
   *
   * @param {Vector3} position
   * @param {Boolean} midPoints
   * @param {Boolean} forWallItem
   * @param {Boolean} noConversionTo2D
   * @description Returns the plane that make up this item based on its size. For a floor item it returns
   * the plane on (x, z) coordinates. For a wall item depending on its orientation it will return the plane.
   * Also if the noConversionTo3D is true, it returns the plane on the wall in 3D.
   * @returns {Array} of {Vector2} or {Vector3} depending on noConversionTo2D
   */
  getItemPolygon(
    position = null,
    midPoints = false,
    forWallItem = false,
    noConversionTo2D = false,
    scale = 1.0,
  ) {
    let coords = [];
    let c1 = new Vector3(
      -this.halfSize.x,
      !forWallItem ? 0 : -this.halfSize.y,
      forWallItem ? 0 : -this.halfSize.z,
    );
    let c2 = new Vector3(
      this.halfSize.x,
      !forWallItem ? 0 : -this.halfSize.y,
      forWallItem ? 0 : -this.halfSize.z,
    );
    let c3 = new Vector3(
      this.halfSize.x,
      !forWallItem ? 0 : this.halfSize.y,
      forWallItem ? 0 : this.halfSize.z,
    );
    let c4 = new Vector3(
      -this.halfSize.x,
      !forWallItem ? 0 : this.halfSize.y,
      forWallItem ? 0 : this.halfSize.z,
    );
    let midC1C2 = null;
    let midC2C3 = null;
    let midC3C4 = null;
    let midC4C1 = null;

    let rotationTransform = new Matrix4();
    let scaleTransform = new Matrix4();
    let translateTransform = new Matrix4();

    position = position || this.__itemModel.position;
    scaleTransform.scale(new Vector3(scale, scale, scale));
    if (forWallItem) {
      rotationTransform.makeRotationY(this.__itemModel.rotation.y);
    } else {
      rotationTransform.makeRotationY(this.__itemModel.innerRotation.y);
    }
    rotationTransform.multiply(scaleTransform);

    c1 = c1.applyMatrix4(rotationTransform);
    c2 = c2.applyMatrix4(rotationTransform);
    c3 = c3.applyMatrix4(rotationTransform);
    c4 = c4.applyMatrix4(rotationTransform);

    translateTransform.setPosition(
      new Vector3(position.x, position.y, position.z),
    );

    c1 = c1.applyMatrix4(translateTransform);
    c2 = c2.applyMatrix4(translateTransform);
    c3 = c3.applyMatrix4(translateTransform);
    c4 = c4.applyMatrix4(translateTransform);

    if (forWallItem) {
      coords.push(c1);
      coords.push(c2);
      coords.push(c3);
      coords.push(c4);
    } else {
      coords.push(new Vector2(c1.x, c1.z));
      coords.push(new Vector2(c2.x, c2.z));
      coords.push(new Vector2(c3.x, c3.z));
      coords.push(new Vector2(c4.x, c4.z));
    }

    if (midPoints) {
      midC1C2 = c1.clone().add(c2.clone().sub(c1).multiplyScalar(0.5));
      midC2C3 = c2.clone().add(c3.clone().sub(c2).multiplyScalar(0.5));
      midC3C4 = c3.clone().add(c4.clone().sub(c3).multiplyScalar(0.5));
      midC4C1 = c4.clone().add(c1.clone().sub(c4).multiplyScalar(0.5));
      if (forWallItem) {
        coords.push(midC1C2);
        coords.push(midC2C3);
        coords.push(midC3C4);
        coords.push(midC4C1);
      } else {
        coords.push(new Vector2(midC1C2.x, midC1C2.z));
        coords.push(new Vector2(midC2C3.x, midC2C3.z));
        coords.push(new Vector2(midC3C4.x, midC3C4.z));
        coords.push(new Vector2(midC4C1.x, midC4C1.z));
      }
    }

    if (forWallItem && !noConversionTo2D) {
      return Utils.polygons2DFrom3D(coords);
    } else if (forWallItem && noConversionTo2D) {
      return coords;
    }
    return coords;
  }

  getAlignedPositionForFloor(toAlignWith) {
    function getCoordinate3D(selected, alignWith, position) {
      let vector = null;
      selected = new Vector3(selected.x, position.y, selected.y);
      alignWith = new Vector3(alignWith.x, position.y, alignWith.y);
      vector = selected.clone().sub(position);
      return alignWith.clone().sub(vector);
    }

    let myPosition = this.__itemModel.position;
    let myPolygon2D = this.getItemPolygon(myPosition, true);
    let otherPolygon2D = toAlignWith.getItemPolygon(null, true);
    let minimalDistance = 9999999.0; //Set a threshold of 10 cms to check closest points
    let finalCoordinate3d = null;
    myPolygon2D.forEach((coord) => {
      otherPolygon2D.forEach((otherCoord) => {
        let distance = coord.clone().sub(otherCoord).length();
        if (distance < minimalDistance) {
          finalCoordinate3d = getCoordinate3D(coord, otherCoord, myPosition);
          minimalDistance = distance;
        }
      });
    });
    return finalCoordinate3d;
  }

  getAlignedPositionForWall(toAlignWith) {
    function getCoordinate3D(selected, alignWith, position) {
      let vector = null;
      let newPosition = null;
      vector = selected.clone().sub(position).multiplyScalar(1.001);
      newPosition = alignWith.clone().sub(vector);
      return newPosition;
    }

    let myPosition = this.__itemModel.position;
    let myPolygon3D = this.getItemPolygon(null, true, true, true);
    let otherPolygon3D = toAlignWith.getItemPolygon(null, true, true, true);
    let minimalDistance = 10.0; //Set a threshold of 10 cms to check closest points
    let finalCoordinate3d = null;
    myPolygon3D.forEach((coord) => {
      otherPolygon3D.forEach((otherCoord) => {
        let distance = coord.clone().sub(otherCoord).length();
        if (distance < minimalDistance) {
          finalCoordinate3d = getCoordinate3D(coord, otherCoord, myPosition);
          minimalDistance = distance;
        }
      });
    });
    return finalCoordinate3d;
  }

  handleFloorItemsPositioning(coordinate3d, normal, intersectingPlane) {
    let coordinate3dOriginal = coordinate3d.clone();
    let withinRoomBounds = false;
    let myPolygon2D = this.getItemPolygon(coordinate3d, false);
    let rooms = this.__itemModel.model.floorplan.getRooms();
    let i = 0;
    let isBoundToFloor = this.itemModel.isBoundToFloor;
    let isBoundToRoof = this.itemModel.isBoundToRoof;
    for (i = 0; i < rooms.length; i++) {
      let flag = Utils.polygonInsidePolygon(
        myPolygon2D,
        rooms[i].interiorCorners,
      );
      if (flag) {
        withinRoomBounds = true;
      }
    }
    if (this.itemModel.snap3D) {
      myPolygon2D = this.getItemPolygon(
        coordinate3d,
        false,
        false,
        false,
        1.25,
      );
      for (i = 0; i < this.parent.physicalRoomItems.length; i++) {
        let otherObject = this.parent.physicalRoomItems[i];
        let otherPolygon2D = null;
        let flag = false;
        if (
          otherObject != this &&
          otherObject.itemModel.isBoundToFloor == isBoundToFloor &&
          otherObject.itemModel.isBoundToRoof == isBoundToRoof
        ) {
          otherPolygon2D = otherObject.polygon2D;
          flag = Utils.polygonPolygonIntersect(myPolygon2D, otherPolygon2D);
          if (flag) {
            let alignedCoordinate =
              this.getAlignedPositionForFloor(otherObject);
            otherObject.animateBounds();
            if (alignedCoordinate) {
              coordinate3d = alignedCoordinate;
            }
            break;
          }
        }
      }
    }
    if (withinRoomBounds || this.itemModel instanceof WallFloorItem) {
      if (this.__itemModel.isBoundToRoof) {
        coordinate3d.y = coordinate3dOriginal.y;
      }
      this.__itemModel.snapToPoint(
        coordinate3d,
        normal,
        intersectingPlane,
        this,
      );
    }
  }

  handleWallItemsPositioning(coordinate3d, normal, intersectingPlane) {
    let myPolygon2D = this.getItemPolygon(
      coordinate3d,
      false,
      true,
      false,
      1.5,
    );
    let i = 0;
    let myWallUUID = this.itemModel.currentWall
      ? this.itemModel.currentWall.uuid
      : null;
    if (this.itemModel.snap3D) {
      // console.log(myPolygon2D);
      for (i = 0; i < this.parent.physicalRoomItems.length; i++) {
        let otherObject = this.parent.physicalRoomItems[i];
        let otherWallUUID =
          otherObject.itemModel.isWallDependent &&
          otherObject.itemModel.currentWall
            ? otherObject.itemModel.currentWall.uuid
            : null;
        let otherPolygon2D = null;
        let flag = false;
        if (!myWallUUID || !otherWallUUID || myWallUUID != otherWallUUID) {
          continue;
        }
        if (otherObject != this) {
          // otherPolygon2D = otherObject.polygon2D;
          otherPolygon2D = otherObject.getItemPolygon(
            null,
            false,
            true,
            false,
            1.5,
          );
          // console.log(otherPolygon2D);
          flag = Utils.polygonPolygonIntersect(myPolygon2D, otherPolygon2D);
          if (flag) {
            let alignedCoordinate = this.getAlignedPositionForWall(otherObject);
            if (alignedCoordinate) {
              coordinate3d = alignedCoordinate;
            }
            break;
          }
        }
      }
    }
    this.__itemModel.snapToPoint(coordinate3d, normal, intersectingPlane, this);
  }

  snapToPoint(coordinate3d, normal, intersectingPlane) {
    if (this.itemModel.isWallDependent) {
      this.handleWallItemsPositioning(coordinate3d, normal, intersectingPlane);
      return;
    }
    this.handleFloorItemsPositioning(coordinate3d, normal, intersectingPlane);
  }

  snapToWall(coordinate3d, wall, wallEdge) {
    this.__itemModel.snapToWall(coordinate3d, wall, wallEdge);
  }

  animateBounds() {
    // this.__boxhelper.visible = true;
    // this.__boxhelper.material.opacity = 1.0;
    // if(!this.__boxMaterialAnimator.isActive()){
    this.__boxMaterialAnimator.play(0);
    // }
  }

  get loadedItem() {
    return this.__loadedItem;
  }

  get statistics() {
    return this.__itemStatistics;
  }

  get worldBox() {
    // return this.box.clone().applyMatrix4(this.__loadedItem.matrixWorld.clone().multiply(this.matrixWorld));
    return this.box.clone().applyMatrix4(this.matrixWorld);
  }

  get box() {
    return this.__box;
  }

  get selected() {
    return this.__selected;
  }

  set selected(flag) {
    this.__selected = flag;
    this.__boxhelper.visible = flag;
    this.__boxhelper.material.opacity = flag ? 1.0 : 0.0;
    this.__dimensionHelper.visible = flag;
    this.__measurementgroup.visible = flag;
  }

  set location(coordinate3d) {
    this.__itemModel.position = coordinate3d;
  }

  get location() {
    return this.__itemModel.position.clone();
  }

  get intersectionPlanes() {
    return this.__itemModel.intersectionPlanes;
  }

  get intersectionPlanes_wall() {
    return this.__itemModel.intersectionPlanes_wall;
  }

  get itemModel() {
    return this.__itemModel;
  }

  get polygon2D() {
    if (this.itemModel.isWallDependent) {
      return this.getItemPolygon(null, false, true, false);
    }
    return this.getItemPolygon();
  }

  get boxhelper() {
    return this.__boxhelper;
  }
}

/**
 export class Physical3DItem {
 constructor(itemModel) {
 console.log(this);
 return new Proxy(new Physical3DItemNonProxy(itemModel), {
 get(target, name, receiver) {
 console.log('USING REFLECT.GET ', target);
 if (!Reflect.has(target, name) && !Reflect.has(target.itemModel, name)) {
 return undefined;
 }
 if (Reflect.has(target, name)) {
 return Reflect.get(target, name);
 }
 if (Reflect.has(target.itemModel, name)) {
 return Reflect.get(target.itemModel, name);
 }
 return undefined;
 }
 });
 }
 }
 */
