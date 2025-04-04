import {
  EventDispatcher,
  SphereGeometry,
  ShaderMaterial,
  Mesh,
  TextureLoader,
  Color,
  DoubleSide,
  PlaneGeometry,
  MeshStandardMaterial,
} from "three";
import {
  AxesHelper,
  EquirectangularReflectionMapping,
  sRGBEncoding,
} from "three";
import { Configuration, gridSpacing, viewBounds } from "../core/configuration";
import { EVENT_CHANGED } from "../core/events";

export class Skybox extends EventDispatcher {
  constructor(scene, renderer) {
    super();

    this.defaultEnvironment = "/rooms/textures/envs/Garden.png";
    this.useEnvironment = false;
    this.topColor = 0xffffff;
    this.bottomColor = 0xffffff;
    this.verticalOffset = 400;
    this.exponent = 0.5;

    var uniforms = {
      topColor: { type: "c", value: new Color(this.topColor) },
      bottomColor: { type: "c", value: new Color(this.bottomColor) },
      offset: { type: "f", value: this.verticalOffset },
      exponent: { type: "f", value: this.exponent },
    };

    this.scene = scene;
    this.renderer = renderer;

    this.sphereRadius = 0;
    this.__gridSize = Configuration.getNumericValue(viewBounds) * 5.0;
    this.widthSegments = 32;
    this.heightSegments = 15;
    this.sky = null;

    this.__shadowPlane = null;

    this.plainVertexShader = [
      "varying vec3 vWorldPosition;",
      "void main() {",
      "vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
      "vWorldPosition = worldPosition.xyz;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );",
      "}",
    ].join("\n");
    this.plainFragmentShader = [
      "uniform vec3 bottomColor;",
      "uniform vec3 topColor;",
      "uniform float offset;",
      "uniform float exponent;",
      "varying vec3 vWorldPosition;",
      "void main() {",
      " float h = normalize( vWorldPosition + offset ).y;",
      " gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max(h, 0.0 ), exponent ), 0.0 ) ), 1.0 );",
      "}",
    ].join("\n");

    this.vertexShader = [
      "varying vec2 vUV;",
      "void main() {",
      "  vUV=uv;",
      "  vec4 pos = vec4(position, 1.0);",
      "   gl_Position = projectionMatrix * modelViewMatrix * pos;",
      "}",
    ].join("\n");
    this.fragmentShader = [
      "uniform sampler2D textureSampler;",
      "varying vec2 vUV;",
      "void main() {",
      "  vec4 texel = texture2D(textureSampler, vUV);",
      "  gl_FragColor = vec4(texel.xyz, texel.w);",
      "}",
    ].join("\n");

    this.texture = new TextureLoader();
    this.plainSkyMat = new ShaderMaterial({
      vertexShader: this.plainVertexShader,
      fragmentShader: this.plainFragmentShader,
      uniforms: uniforms,
      side: DoubleSide,
    });
    this.plainSkyMat.name = "PlainSkyMaterial";
    this.skyMat = undefined;

    this.skyGeo = new SphereGeometry(
      this.sphereRadius,
      this.widthSegments,
      this.heightSegments,
    );
    this.sky = new Mesh(this.skyGeo, this.plainSkyMat);

    let axesHelper = new AxesHelper(1000);
    // this.scene.add(axesHelper);
    this.scene.add(this.sky);

    this.__createShadowPlane();
    this.init();
    Configuration.getInstance().addEventListener(
      EVENT_CHANGED,
      this.__updatePlane.bind(this),
    );
  }

  __createShadowPlane() {
    if (this.__shadowPlane) {
      this.scene.remove(this.__shadowPlane);
    }

    // 그림자를 받을 plane 생성
    const planeGeometry = new PlaneGeometry(this.__gridSize, this.__gridSize);
    const planeMaterial = new MeshStandardMaterial({
      color: 0x383838,
      roughness: 1.0,
      metalness: 0.0,
    });

    this.__shadowPlane = new Mesh(planeGeometry, planeMaterial);
    this.__shadowPlane.rotation.x = -Math.PI / 2; // 수평으로 눕히기
    this.__shadowPlane.position.y = -10;
    this.__shadowPlane.receiveShadow = true; // 그림자를 받도록 설정

    this.scene.add(this.__shadowPlane);
    this.scene.needsUpdate = true;
  }

  __updatePlane(evt) {
    this.__gridSize = Configuration.getNumericValue(viewBounds);
    this.sky.scale.set(
      this.__gridSize * 0.5,
      this.__gridSize * 0.5,
      this.__gridSize * 0.5,
    );
    this.__createShadowPlane();
  }

  toggleEnvironment(flag) {
    this.useEnvironment = flag;
    if (!flag) {
      this.__shadowPlane.visible = true;
      this.sky.material = this.plainSkyMat;
      this.sky.material.needsUpdate = true;
    } else {
      this.__shadowPlane.visible = false;
      if (!this.skyMat) {
        this.setEnvironmentMap(this.defaultEnvironment);
      } else {
        this.sky.material = this.skyMat;
      }
      this.sky.visible = true;
    }
    this.scene.needsUpdate = true;
  }

  setEnvironmentMap(url) {
    var scope = this;
    scope.texture.load(
      url,
      function (t) {
        t.mapping = EquirectangularReflectionMapping;
        t.encoding = sRGBEncoding;
        var uniforms = {
          textureSampler: { value: t },
        };
        scope.skyMat = new ShaderMaterial({
          vertexShader: scope.vertexShader,
          fragmentShader: scope.fragmentShader,
          uniforms: uniforms,
          side: DoubleSide,
        });
        scope.skyMat.name = "SkyMaterial";
        scope.toggleEnvironment(scope.useEnvironment);
      },
      undefined,
      function () {
        console.log("ERROR LOADING FILE");
      },
    );
  }

  init() {
    this.toggleEnvironment(false);
  }
}
