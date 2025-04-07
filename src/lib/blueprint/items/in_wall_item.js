import { Matrix4, Vector2, Vector3, Plane, Quaternion } from "three";

import { UP_VECTOR } from "./item.js";
import { WallItem } from "./wall_item.js";
import { Utils } from "../core/utils.js";
// @orchestra blueprint

/** */
export class InWallItem extends WallItem {
  constructor(model, metadata, id) {
    super(model, metadata, id);
    this.__customIntersectionPlanes =
      this.__model.floorplan.wallPlanesForIntersection;
  }

  snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
    this.snapToWall(point, intersectingPlane.wall, intersectingPlane.edge);
  }

  snapToWall(point, wall, wallEdge) {
    // 정규화된 normal 벡터 사용
    let normal = wallEdge.normal.clone().normalize();
    let plane = new Plane(normal);
    let normal2d = new Vector2(normal.x, normal.z).normalize();
    let angle = Utils.angle(UP_VECTOR, normal2d);
    let tempPoint = new Vector3();
    let matrix = new Matrix4();

    // 오브젝트의 스케일 고려 (필요한 경우에만 사용)
    let objectScale = this.scale.clone();
    let maxScale = Math.max(objectScale.x, objectScale.y, objectScale.z);

    point = this.__fitToWallBounds(point, wallEdge);

    matrix.setPosition(wallEdge.center);
    plane.applyMatrix4(matrix);
    plane.projectPoint(point, tempPoint);
    point = tempPoint.clone();

    // 오브젝트 스케일을 고려한 위치 조정 (벽 두께 제외)
    let offset = (this.wallOffset || 0) * maxScale;
    point = point.clone().sub(normal.clone().multiplyScalar(offset));

    // 회전 설정
    this.rotation = new Vector3(0, angle, 0);
    this.innerRotation = new Vector3(0, angle, 0);

    this.position = point;
    this.__currentWallSnapPoint = point.clone();
    this.__currentWallNormal = normal.clone();
    this.__addToAWall(wall, wallEdge);

    // 디버깅을 위한 로그
    console.log("Object Scale:", objectScale);
    console.log("Normal:", normal);
    console.log("Angle:", angle);
    console.log("Final Position:", this.position);
    console.log("Final Rotation:", this.rotation);
  }
}
