// @ts-nocheck
// @orchestra blueprint
import {
    WebGLRenderer,
    OrthographicCamera,
    PerspectiveCamera,
    AxesHelper,
    Scene,
    RGBFormat,
    LinearMipmapLinearFilter,
    sRGBEncoding,
    HemisphereLight,
    DirectionalLight,
    AmbientLight,
    Box3,
    DirectionalLightHelper,
    CameraHelper,
    PCFSoftShadowMap,
    WebGLCubeRenderTarget,
    CubeCamera,
    MathUtils,
    NoToneMapping,Vector3
} from "three";
import {TrackballControls} from "three/addons/controls/TrackballControls.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter";
import {CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer.js";

import {DragRoomItemsControl3D} from "./DragRoomItemsControl3D.js";
import {Edge3D} from "./edge3d.js";
import {Floor3D} from "./floor3d.js";
import {Physical3DItem} from "./Physical3DItem.js";
import {Skybox} from "./skybox.js";
import {
    Configuration,
    viewBounds,
    shadowVisible,
} from "../core/configuration.js";
import {
    EVENT_ITEM_UPDATE,
    EVENT_ITEM_REMOVED,
    EVENT_CAMERA_ACTIVE_STATUS,
    EVENT_LOADED,
    EVENT_ITEM_SELECTED,
    EVENT_ITEM_MOVE,
    EVENT_ITEM_MOVE_FINISH,
    EVENT_NO_ITEM_SELECTED,
    EVENT_WALL_CLICKED,
    EVENT_ROOM_CLICKED,
    EVENT_GLTF_READY,
    EVENT_NEW_ITEM,
    EVENT_NEW_ROOMS_ADDED,
    EVENT_MODE_RESET,
    EVENT_UPDATED,
    EVENT_WALLS_COMPLETED,
} from "../core/events.js";
import {ConfigurationHelper} from "../helpers/ConfigurationHelper";

// @orchestra blueprint

export const states = {
    UNSELECTED: 0,
    SELECTED: 1,
    DRAGGING: 2,
    ROTATING: 3,
    ROTATING_FREE: 4,
    PANNING: 5,
};

export class Viewer3D extends Scene {
    constructor(model, element, opts) {
        super();
        let options = {
            occludedRoofs: false,
            occludedWalls: false,
            resize: true,
            pushHref: false,
            spin: true,
            spinSpeed: 0.5,
            clickPan: true,
            canMoveFixedItems: false,
            gridVisibility: false,
            groundArrowhelper: false,
        };
        for (let opt in options) {
            if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
                options[opt] = opts[opt];
            }
        }
        this.__physicalRoomItems = [];
        this.__enabled = false;
        this.model = model;
        this.floorplan = this.model.floorplan;
        this.__options = options;
        this.domElement = document.getElementById(element);
        this.perspectivecamera = null;
        this.camera = null;
        this.__environmentCamera = null;
        this.userHasDragged = false;

        this.cameraNear = 10;
        this.cameraFar = 100000;
        this.controls = null;
        this.trackballControls = null;

        this.renderer = null;
        this.controller = null;

        this.needsUpdate = false;
        this.lastRender = Date.now();

        this.heightMargin = null;
        this.widthMargin = null;
        this.elementHeight = null;
        this.elementWidth = null;
        this.pauseRender = false;

        this.edges3d = [];
        this.floors3d = [];
        this.__currentItemSelected = null;
        this.__currentLightSelected = null;
        this.__rgbeLoader = null;

        this.needsUpdate = true;

        this.__newItemEvent = this.__addNewItem.bind(this);
        this.__wallSelectedEvent = this.__wallSelected.bind(this);
        this.__roomSelectedEvent = this.__roomSelected.bind(this);
        this.__roomItemSelectedEvent = this.__roomItemSelected.bind(this);
        this.__roomItemUnselectedEvent = this.__roomItemUnselected.bind(this);
        this.__roomItemDraggedEvent = this.__roomItemDragged.bind(this);
        this.__roomItemRemovedEvent = this.__roomItemRemoved.bind(this);
        this.__roomItemDragFinishEvent = this.__roomItemDragFinish.bind(this);

        this.__resetDesignEvent = this.__resetDesign.bind(this);
        this.__directionalLight = null;

        this.init();
    }

    init() {
        let scope = this;
        scope.scene = new Scene();
        this.name = "Scene";
        const aspect = 5 / 4; // div의 aspect ratio와 일치
        this.frustumSize = 1450;

        // 초기 카메라 설정
        scope.camera = new OrthographicCamera(
            -this.frustumSize / 2,
            this.frustumSize / 2,
            this.frustumSize / 2,
            -this.frustumSize / 2,
            scope.cameraNear,
            scope.cameraFar
        );

        scope.camera.lookAt(0, 0, 0);

        // scope.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, scope.cameraNear, scope.cameraFar);

        let cubeRenderTarget = new WebGLCubeRenderTarget(16, {
            format: RGBFormat,
            generateMipmaps: true,
            minFilter: LinearMipmapLinearFilter,
        });
        scope.__environmentCamera = new CubeCamera(1, 100000, cubeRenderTarget);
        scope.__environmentCamera.renderTarget.texture.encoding = sRGBEncoding;

        scope.renderer = scope.getARenderer();
        scope.domElement.appendChild(scope.renderer.domElement);

        scope.dragcontrols = new DragRoomItemsControl3D(
            this.floorplan.wallPlanesForIntersection,
            this.floorplan.floorPlanesForIntersection,
            this.physicalRoomItems,
            scope,
            scope.renderer.domElement,
        );
        scope.controls = new OrbitControls(scope.camera, scope.domElement);

        // scope.controls.autoRotate = false
        scope.controls.autoRotate = this.__options["spin"];
        scope.controls.autoRotateSpeed = 0.01;
        scope.controls.enableDamping = true;
        scope.controls.dampingFactor = 0.07;
        scope.controls.maxPolarAngle = Math.PI * 1.0; //Math.PI * 0.35;//Math.PI * 1.0; //
        scope.controls.maxDistance = Configuration.getNumericValue(viewBounds); // 7500; //2500
        scope.controls.minDistance = 100; //1000; //1000
        scope.controls.screenSpacePanning = true;
        scope.controls.rotateSpeed = 0.4;
        scope.controls.zoomSpeed = 0.4;
        scope.controls.panSpeed = 0.4;

        scope.controls.addEventListener("start", () => {
            if (!scope.userHasDragged) {
                scope.userHasDragged = true;
                scope.controls.autoRotate = false;
                scope.needsUpdate = true;
            }
        });

        // scope.trackballControls = new TrackballControls(scope.camera, scope.domElement);
        // scope.trackballControls.noRotate = true; // Disable rotation for TrackballControls
        // scope.trackballControls.noZoom = true; // Disable zoom for TrackballControls
        // scope.trackballControls.noPan = false; // Enable panning for TrackballControls
        // scope.trackballControls.panSpeed = 0.6; // Adjust for desired pan speed
        // scope.trackballControls.dynamicDampingFactor = 0.1; // Adjust for desired smoothness
        //
        // scope.trackballControls.target = scope.controls.target;

        // scope.skybox = new Skybox(this, scope.renderer, this.floorplan);
        // scope.camera.position.set(0, 600, 1500);
        scope.controls.update();

        scope.axes = new AxesHelper(500);
        // handle window resizing
        scope.updateWindowSize();
        if (scope.__options.resize) {
            window.addEventListener("resize", () => {
                scope.updateWindowSize();
            });
            window.addEventListener("orientationchange", () => {
                scope.updateWindowSize();
            });
        }

        scope.model.addEventListener(EVENT_NEW_ITEM, scope.__newItemEvent);
        scope.model.addEventListener(EVENT_MODE_RESET, scope.__resetDesignEvent);
        // scope.model.addEventListener(
        //     EVENT_NEW_ROOMS_ADDED,
        //     scope.addRoomItems.bind(scope),
        // );
        scope.model.addEventListener(EVENT_LOADED, scope.addRoomItems.bind(scope));
        scope.floorplan.addEventListener(
            EVENT_NEW_ROOMS_ADDED,
            scope.addRoomsAndWalls.bind(scope),
        );
        scope.controls.addEventListener("change", () => {
            scope.needsUpdate = true;
            // this.updateLightPosition();
        });

        scope.dragcontrols.addEventListener(
            EVENT_ITEM_SELECTED,
            this.__roomItemSelectedEvent,
        );
        scope.dragcontrols.addEventListener(
            EVENT_ITEM_MOVE,
            this.__roomItemDraggedEvent,
        );
        scope.model.addEventListener(
            EVENT_ITEM_REMOVED,
            this.__roomItemRemovedEvent,
        );
        scope.dragcontrols.addEventListener(
            EVENT_ITEM_MOVE_FINISH,
            this.__roomItemDragFinishEvent,
        );
        scope.dragcontrols.addEventListener(
            EVENT_NO_ITEM_SELECTED,
            this.__roomItemUnselectedEvent,
        );
        scope.dragcontrols.addEventListener(
            EVENT_WALL_CLICKED,
            this.__wallSelectedEvent,
        );
        scope.dragcontrols.addEventListener(
            EVENT_ROOM_CLICKED,
            this.__roomSelectedEvent,
        );

        // Lights setup (integrated from the original Lights class)
        const tol = 1;
        const height = 60;

        // Directional light
        const light = new DirectionalLight(0xffffff, 1.65); // intensity를 1로 조절
        // light.position.set(30, height, 10);
        light.position.set(500, 900, 900); // 더 극적인 그림자를 위해
        light.castShadow = false;

        // 그림자 설정 조정
        // 더 넓은 범위의 그림자를 위한 설정
        light.shadow.camera.left = -1000;
        light.shadow.camera.right = 1000;
        light.shadow.camera.top = 1000;
        light.shadow.camera.bottom = -1000;

        // 필요하다면 맵 사이즈도 증가
        light.shadow.mapSize.width = 8192;
        light.shadow.mapSize.height = 8192;
        light.shadow.camera.far = 2000;
        scope.__directionalLight = light;
        scope.add(light);

        //         const lightHelper = new DirectionalLightHelper(light, 100); // 두 번째 파라미터는 helper의 크기
        //         scope.add(lightHelper);
        //
        // // Shadow Camera Helper 추가
        //         const shadowHelper = new CameraHelper(light.shadow.camera);
        //         scope.add(shadowHelper);

        // 부드러운 그림자를 위한 AmbientLight 추가 (선택사항)
        const ambient = new AmbientLight(0xffffff, 2);
        scope.add(ambient);

        // scope.controls.enabled = false;//To test the drag controls
        //SEt the animation loop
        scope.renderer.setAnimationLoop(scope.render.bind(this));
        scope.render();
    }

    updateLightPosition() {
        // 카메라의 위치와 방향을 기반으로 light 위치 업데이트
        const cameraPosition = this.camera.position.clone();
        const targetPosition = this.controls.target.clone();

        // 카메라 위치에서 약간 오프셋을 준 위치에 light 배치
        this.__directionalLight.position.copy(cameraPosition);
        this.__directionalLight.position.y += 700; // 높이 오프셋

        // light가 항상 타겟을 향하도록 설정
        this.__directionalLight.target.position.copy(targetPosition);
        this.__directionalLight.target.updateMatrixWorld();
    }

    getAutoRotationAngle() {
        return ((2 * Math.PI) / 60 / 60) * this.__options.spinSpeed;
    }

    // In Viewer3D class
    switchCameraMode() {
        const position = this.camera.position.clone();
        const target = this.controls.target.clone();

        if (this.camera instanceof PerspectiveCamera) {
            this.camera = new OrthographicCamera(
                -this.frustumSize / 2,
                this.frustumSize / 2,
                this.frustumSize / 2,
                -this.frustumSize / 2,
                this.cameraNear,
                this.cameraFar
            );
        } else {
            this.camera = new PerspectiveCamera(
                45,
                window.innerWidth / window.innerHeight,
                this.cameraNear,
                this.cameraFar
            );
        }

        // Update camera and controls
        this.camera.position.copy(position);
        this.camera.lookAt(target);
        this.controls.object = this.camera;
        this.controls.target.copy(target);

        // Update dragcontrols camera reference
        this.dragcontrols.__camera = this.camera;  // Add this line

        this.updateWindowSize();
        this.controls.update();
        this.needsUpdate = true;
    }


    switchToTopView() {
        // Calculate the bounding box of the floorplan
        const boundingBox = new Box3();
        this.floors3d.forEach((floor) => {
            if (floor.floorPlane) {
                boundingBox.expandByObject(floor.floorPlane);
            }
        });

        // Calculate the center and size of the bounding box
        const center = new Vector3();
        boundingBox.getCenter(center);
        const size = new Vector3();
        boundingBox.getSize(size);

        // Determine a suitable height for the top view based on floorplan size
        const maxDim = Math.max(size.x, size.y, size.z);
        const height = maxDim * 2; // Adjust multiplier as needed

        // Set camera position directly above the floorplan
        this.camera.position.set(center.x, center.y + height, center.z);

        // Make the camera look at the center of the floorplan
        this.camera.lookAt(center);

        // Update the controls target to the center
        this.controls.target.copy(center);
        this.controls.update();

        // Request a render update
        this.needsUpdate = true;
    }

    __focusOnWallOrRoom(normal, center, distance, y = 0) {
        let cameraPosition = center
            .clone()
            .add(normal.clone().multiplyScalar(distance));
        this.controls.target = center.clone();
        this.camera.position.copy(cameraPosition);
        this.controls.update();
        this.needsUpdate = true;
    }

    __wallSelected(evt) {
        let edge = evt.item;
        let y = Math.max(edge.wall.startElevation, edge.wall.endElevation) * 0.5;
        let center2d = edge.interiorCenter();
        let center = new Vector3(center2d.x, y, center2d.y);
        let distance = edge.interiorDistance() * 1.5;
        let normal = evt.normal;

        this.__focusOnWallOrRoom(normal, center, distance, y);
        this.dispatchEvent(evt);
    }

    __roomSelected(evt) {
        let room = evt.item;
        let y = room.corners[0].elevation;
        let normal = room.normal.clone();
        let center2d = room.areaCenter.clone();
        let center = new Vector3(center2d.x, 0, center2d.y);
        let distance = y * 3.0;
        this.__focusOnWallOrRoom(normal, center, distance, y);
        this.dispatchEvent(evt);
    }

    __roomItemSelected(evt) {
        if (this.__currentItemSelected) {
            this.__currentItemSelected.selected = false;
        }
        this.controls.enabled = false;
        this.__currentItemSelected = evt.item;
        this.__currentItemSelected.selected = true;
        this.needsUpdate = true;
        if (this.__currentItemSelected.itemModel != undefined) {
            evt.itemModel = this.__currentItemSelected.itemModel;
        }
        this.dispatchEvent(evt);
    }

    __roomItemRemoved(evt) {
      console.log("__roomItemRemoved before physical: ",this.__physicalRoomItems, "before dragcontrols draggableItems: ", this.dragcontrols.draggableItems)
      this.__physicalRoomItems = this.__physicalRoomItems.filter(item => item.uuid !== evt.item.uuid);
      this.dragcontrols.draggableItems = this.dragcontrols.draggableItems.filter(
          dragItem => dragItem.uuid !== evt.item.uuid
      );
        console.log("__roomItemRemoved after physical: ",this.__physicalRoomItems.length, "after dragcontrols draggableItems: ", this.dragcontrols.draggableItems.length)

        this.needsUpdate = true;
    }

    __roomItemDragged(evt) {
        this.controls.enabled = false;
        this.needsUpdate = true;
    }

    __roomItemDragFinish(evt) {
        this.controls.enabled = true;
    }

    __roomItemUnselected(evt) {
        this.controls.enabled = true;
        if (this.__currentItemSelected) {
            this.dragcontrols.selected = null;
            this.__currentItemSelected.selected = false;
            this.__currentItemSelected = null;
            this.needsUpdate = true;
        }
        this.dispatchEvent(evt);
    }

    __addNewItem(evt) {
        if (!evt.item) {
            return;
        }

        let physicalRoomItem = new Physical3DItem(
            evt.item,
            this.dragcontrols,
            this.__options,
        );
        this.add(physicalRoomItem);
        this.__physicalRoomItems.push(physicalRoomItem);
        this.__roomItemSelected({
            type: EVENT_ITEM_SELECTED,
            item: physicalRoomItem,
        });

        // this.dragcontrols.enabled = true;
        // this.dragcontrols.selected = physicalRoomItem;
        // this.needsUpdate = true;
    }

    __resetDesign(evt) {
        this.dragcontrols.selected = null;
        this.__physicalRoomItems.length = 0;
        this.edges3d.length = 0;
        this.floors3d.length = 0;
    }

    updateControlsTarget() {
        const boundingBox = new Box3();

        this.floors3d.forEach((floor) => {
            if (floor.floorPlane) {
                boundingBox.expandByObject(floor.floorPlane);
            }
        });

        const center = new Vector3();
        boundingBox.getCenter(center);
        this.controls.target.copy(center);

        const size = new Vector3();
        boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2; // 기본 거리 계산

        // 카메라 위치 조정
        this.camera.position.set(
            center.x + distance * 0.9,
            center.y + distance * 1.1,
            center.z + distance * 0.9,
        );

        this.controls.update();
        this.needsUpdate = true;
    }

    addRoomItems() {
        const ANIMATION_DELAY = 50; // 각 아이템 사이의 딜레이 (밀리초)

        // 기존 아이템 제거
        for (let i = 0; i < this.__physicalRoomItems.length; i++) {
            this.__physicalRoomItems[i].dispose();
            this.remove(this.__physicalRoomItems[i]);
        }
        this.__physicalRoomItems.length = 0;

        const roomItems = this.model.roomItems;

        // 아이템 순차적 생성 함수
        const createItemWithDelay = (index) => {
            if (index < roomItems.length) {
                setTimeout(() => {
                    // 새 아이템 생성
                    const physicalRoomItem = new Physical3DItem(
                        roomItems[index],
                        this.dragcontrols,
                        this.__options,
                    );

                    // 씬에 추가
                    this.add(physicalRoomItem);
                    this.__physicalRoomItems.push(physicalRoomItem);

                    // 다음 아이템 생성
                    createItemWithDelay(index + 1);
                }, ANIMATION_DELAY);
            }
        };

        // 순차적 생성 시작
        if (roomItems.length > 0) {
            createItemWithDelay(0);
        }
    }

    addRoomsAndWalls() {
        let scope = this;

        // Clear existing elements
        scope.floors3d.forEach((floor) => {
            floor.destroy();
            floor = null;
        });
        scope.edges3d.forEach((edge3d) => {
            edge3d.remove();
            edge3d = null;
        });
        scope.edges3d = [];
        scope.floors3d = [];

        const wallEdges = scope.floorplan.wallEdges();
        const rooms = scope.floorplan.getRooms();
        const ANIMATION_DELAY = 50;

        // 바닥과 외벽 생성 함수
        const createInitialStructure = () => {
            // 바닥 생성
            for (let i = 0; i < rooms.length; i++) {
                const threeFloor = new Floor3D(scope, rooms[i], scope.controls, this.__options);
                scope.floors3d.push(threeFloor);
            }
            scope.updateControlsTarget();

            // 외벽 찾아서 생성 (20% 진행률)
            let exteriorWallsCount = 0;
            wallEdges.forEach((edge, index) => {
                if (isExteriorWall(edge)) {
                    const edge3d = new Edge3D(scope, edge, scope.controls, this.__options);
                    scope.edges3d.push(edge3d);
                    exteriorWallsCount++;
                    scope.dispatchEvent({
                        type: 'wallsProgress',
                        progress: (exteriorWallsCount / wallEdges.length) * 20
                    });
                }
            });

            scope.shouldRender = true;
            animateInnerWalls();
        };

        const isExteriorWall = (edge) => {
            return edge.wall.start.getAttachedRooms().length < 2 ||
                edge.wall.end.getAttachedRooms().length < 2;
        };

        // 내부 벽 애니메이션 함수 (20%에서 100%까지)
        const animateInnerWalls = () => {
            const innerWalls = wallEdges.filter(edge => !isExteriorWall(edge));
            const totalWalls = innerWalls.length;

            const createWallWithDelay = (index) => {
                if (index < innerWalls.length) {
                    setTimeout(() => {
                        const edge3d = new Edge3D(scope, innerWalls[index], scope.controls, this.__options);
                        scope.edges3d.push(edge3d);
                        scope.shouldRender = true;

                        // 진행률 업데이트 (20%에서 100%까지)
                        const progress = 20 + ((index + 1) / totalWalls) * 80;
                        scope.model.dispatchEvent({ type: 'wallsProgress', progress });

                        createWallWithDelay(index + 1);
                    }, ANIMATION_DELAY);
                } else {
                    scope.model.dispatchEvent({ type: EVENT_WALLS_COMPLETED });
                }
            };

            // 내부 벽 생성 시작
            createWallWithDelay(0);
        };

        // 시작
        createInitialStructure();
    }

    getARenderer() {
        let renderer = new WebGLRenderer({antialias: true, alpha: true});
        renderer.autoClear = true; //true
        renderer.shadowMap.enabled = true;
        // renderer.shadowMapAutoUpdate = true;
        renderer.physicallyCorrectLights = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
        // renderer.setClearColor(0xFFFFFF, 1);
        renderer.setClearColor(0x000000, 0.0);
        renderer.outputEncoding = sRGBEncoding;
        renderer.toneMapping = NoToneMapping;
        // renderer.toneMappingExposure = 0.5;
        // renderer.toneMappingExposure = Math.pow(0.7, 5.0);
        renderer.setPixelRatio(window.devicePixelRatio);
        return renderer;
    }

    // updateWindowSize() {
    //   let heightMargin = this.domElement.offsetTop;
    //   let widthMargin = this.domElement.offsetLeft;
    //   let elementWidth = this.__options.resize
    //     ? window.innerWidth - widthMargin
    //     : this.domElement.clientWidth;
    //   let elementHeight = this.__options.resize
    //     ? window.innerHeight - heightMargin
    //     : this.domElement.clientHeight;
    //
    //   this.camera.aspect = elementWidth / elementHeight;
    //   this.camera.updateProjectionMatrix();
    //   this.renderer.setSize(elementWidth, elementHeight);
    //   this.needsUpdate = true;
    // }
    updateWindowSize() {
        // 부모 div의 크기 가져오기
        let elementWidth = this.domElement.clientWidth;
        let elementHeight = this.domElement.clientHeight;

        // 현재 종횡비 계산
        const aspect = elementWidth / elementHeight;

        // OrthographicCamera의 frustum을 종횡비에 맞게 조정
        if (aspect > 1) {
            // 너비가 더 큰 경우
            this.camera.left = -this.frustumSize * aspect / 2;
            this.camera.right = this.frustumSize * aspect / 2;
            this.camera.top = this.frustumSize / 2;
            this.camera.bottom = -this.frustumSize / 2;
        } else {
            // 높이가 더 큰 경우
            this.camera.left = -this.frustumSize / 2;
            this.camera.right = this.frustumSize / 2;
            this.camera.top = this.frustumSize / (2 * aspect);
            this.camera.bottom = -this.frustumSize / (2 * aspect);
        }

        // 카메라 매트릭스 업데이트
        this.camera.updateProjectionMatrix();

        // 렌더러 크기 조정
        this.renderer.setSize(elementWidth, elementHeight);
        this.needsUpdate = true;
    }

    render() {
        if (!this.enabled) {
            return;
        }
        let scope = this;
        scope.controls.update();
        if (!scope.needsUpdate) {
            return;
        }
        scope.renderer.render(scope, scope.camera);
        scope.lastRender = Date.now();
        this.needsUpdate = false;
    }

    pauseTheRendering(flag) {
        this.needsUpdate = flag;
    }

    exportSceneAsGTLF() {
        let scope = this;
        let exporter = new GLTFExporter();
        exporter.parse(this, function (gltf) {
            scope.dispatchEvent({
                type: EVENT_GLTF_READY,
                gltf: JSON.stringify(gltf),
            });
        });
    }

    forceRender() {
        let scope = this;
        scope.renderer.render(scope, scope.camera);
        scope.lastRender = Date.now();
    }

    addRoomplanListener(type, listener) {
        this.addEventListener(type, listener);
    }

    removeRoomplanListener(type, listener) {
        this.removeEventListener(type, listener);
    }

    get environmentCamera() {
        return this.__environmentCamera;
    }

    get physicalRoomItems() {
        return this.__physicalRoomItems;
    }

    get enabled() {
        return this.__enabled;
    }

    set enabled(flag) {
        this.dragcontrols.deactivate();
        this.__enabled = flag;
        this.controls.enabled = flag;
        if (flag) {
            this.dragcontrols.activate();
        }
    }
}
