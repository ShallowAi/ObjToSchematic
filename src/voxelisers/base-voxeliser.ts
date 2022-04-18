import { UVTriangle, Triangle } from '../triangle';
import { RGB, UV } from '../util';
import { Vector3 } from '../vector';
import { Mesh } from '../mesh';
import { VoxelMesh, VoxelMeshParams} from '../voxel_mesh';
import { TextureFiltering } from '../texture';
import { StatusHandler } from '../status';

export abstract class IVoxeliser {
    public voxelise(mesh: Mesh, voxelMeshParams: VoxelMeshParams): VoxelMesh {
        const voxelMesh = this._voxelise(mesh, voxelMeshParams);

        StatusHandler.Get.add('info', `像素 Mesh 共有 ${voxelMesh.getVoxelCount().toLocaleString()} 像素`);

        const dim = voxelMesh.getBounds().getDimensions().addScalar(1);
        StatusHandler.Get.add('info', `维度 ${dim.x.toLocaleString()}x${dim.y.toLocaleString()}x${dim.z.toLocaleString()} 体素`);

        return voxelMesh;
    }

    protected abstract _voxelise(mesh: Mesh, voxelMeshParams: VoxelMeshParams): VoxelMesh;

    protected _getVoxelColour(mesh: Mesh, triangle: UVTriangle, materialName: string, location: Vector3, filtering: TextureFiltering): RGB {
        const area01 = new Triangle(triangle.v0, triangle.v1, location).getArea();
        const area12 = new Triangle(triangle.v1, triangle.v2, location).getArea();
        const area20 = new Triangle(triangle.v2, triangle.v0, location).getArea();
        const total = area01 + area12 + area20;

        const w0 = area12 / total;
        const w1 = area20 / total;
        const w2 = area01 / total;

        const uv = new UV(
            triangle.uv0.u * w0 + triangle.uv1.u * w1 + triangle.uv2.u * w2,
            triangle.uv0.v * w0 + triangle.uv1.v * w1 + triangle.uv2.v * w2,
        );
        
        return mesh.sampleMaterial(materialName, uv, filtering);
    }
}
