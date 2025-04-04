import { FloorItem } from './floor_item.js';
import { Vector3, Raycaster, Box3, Object3D } from 'three';

//@orchestra blueprint

export class PropItem extends FloorItem {
  constructor(model, metadata, id) {
    super(model, metadata, id);
    this.__canBeBase = false;
    this.__raycaster = new Raycaster();
  }

  findSupportingSurface(point) {
    const validFloorItems = this.__model.roomItems.filter(item => {
      if (!(item instanceof FloorItem) || item === this) {
        return false;
      }
      const hasValidMesh = item.mesh instanceof Object3D;
      const hasBasicProperties = item.position && item.halfSize;
      return hasValidMesh || hasBasicProperties;
    });

    if (validFloorItems.length === 0) {
      return null;
    }

    let nearestIntersection = null;
    let nearestItem = null;
    let minDistance = Infinity;

    for (const item of validFloorItems) {
      try {
        if (!(item.mesh instanceof Object3D)) {
          const itemY = item.position.y + item.halfSize.y;
          const itemMinX = item.position.x - item.halfSize.x;
          const itemMaxX = item.position.x + item.halfSize.x;
          const itemMinZ = item.position.z - item.halfSize.z;
          const itemMaxZ = item.position.z + item.halfSize.z;

          if (point.x >= itemMinX && point.x <= itemMaxX &&
              point.z >= itemMinZ && point.z <= itemMaxZ) {
            nearestItem = item;
            minDistance = Math.abs(point.y - itemY);
            break;
          }
        } else {
          const intersects = this.__raycaster.intersectObject(item.mesh, true);
          if (intersects.length > 0) {
            const intersection = intersects[0];
            if (intersection.distance < minDistance) {
              minDistance = intersection.distance;
              nearestIntersection = intersection;
              nearestItem = item;
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    return nearestItem;
  }

  snapToPoint(point, normal, intersectingPlane) {
    const supportingItem = this.findSupportingSurface(point);

    if (supportingItem) {
      const newPosition = point.clone();

      if (supportingItem.mesh && typeof supportingItem.mesh.updateMatrixWorld === 'function') {
        try {
          const bbox = new Box3().setFromObject(supportingItem.mesh);
          newPosition.y = bbox.max.y + this.halfSize.y;
        } catch (error) {
          newPosition.y = supportingItem.position.y + supportingItem.halfSize.y + this.halfSize.y;
        }
      } else {
        newPosition.y = supportingItem.position.y + supportingItem.halfSize.y + this.halfSize.y;
      }
      this.position = newPosition;
    } else {
      super.snapToPoint(point, normal, intersectingPlane);
    }
  }
}
