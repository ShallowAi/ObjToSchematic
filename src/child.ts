import { RenderBuffer } from './buffer';
import { GeometryTemplates } from './geometry';
import { ObjImporter } from './importers/obj_importer';
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial } from './mesh';
import { ASSERT, CustomError } from './util';

import fs from 'fs';
import { VoxelMesh, VoxelMeshParams } from './voxel_mesh';
import { IVoxeliser } from './voxelisers/base-voxeliser';
import { Vector3 } from './vector';
import { RayVoxeliser } from './voxelisers/ray-voxeliser';
import { BVHRayVoxeliser } from './voxelisers/bvh-ray-voxeliser';
import { NormalCorrectedRayVoxeliser } from './voxelisers/normal-corrected-ray-voxeliser';
import { BlockMesh, BlockMeshParams } from './block_mesh';
import { Litematic, Schematic } from './schematic';

export type SuccessResult = { status: 'success'}
export type FailureResult = { status: 'failure', error: Error };

export interface ImportInput {
    filepath: string;
}


export type Voxelisers = 'raybased' | 'bvhraybased' | 'normalcorrectedraybased';
export type Exporters = 'schematic' | 'litematic';
export interface VoxeliseInput {
    voxeliser: Voxelisers;
    params: VoxelMeshParams;
}

export interface RenderVoxelMeshInput {
    ambientOcclusionEnabled: boolean;
}

export interface PaletteInput {
    params: BlockMeshParams;
}


export interface ImportOutput {
    numTriangles: number;
}

export interface VoxeliseOutput {
    dimensions: Vector3;
}

export interface RenderVoxelMeshOutput {
    rawBuffer: string;
    voxelSize: number;
    dimensions: Vector3;
}

export interface RenderBlockMeshOutput {
    rawBuffer: string;
}

export interface ExportInput {
    filepath: string;
    exporter: Exporters;
}

export type ToWorkerMessage = 
    | { action: 'Import', params: ImportInput }
    | { action: 'RenderMesh' }
    | { action: 'Voxelise', params: VoxeliseInput }
    | { action: 'RenderVoxelMesh', params: RenderVoxelMeshInput }
    | { action: 'Palette', params: PaletteInput }
    | { action: 'RenderBlockMesh' }
    | { action: 'Export', params: ExportInput }

export type FromWorkerMessage = 
    | { action: 'Import', result: ImportOutput }  
    | { action: 'RenderMesh', result: string } 
    | { action: 'Voxelise', result: VoxeliseOutput }  
    | { action: 'RenderVoxelMesh', result: RenderVoxelMeshOutput } 
    | { action: 'Palette' }  
    | { action: 'RenderBlockMesh', result: RenderBlockMeshOutput } 
    | { action: 'Export' }  
    | { action: 'KnownError', error: CustomError} 
    | { action: 'UnknownError', error: Error }  

export function doWork(message: ToWorkerMessage): FromWorkerMessage {
    try {
        switch (message.action) {
            case 'Import':
                return { action: 'Import', result: WorkerClient.Get.import(message.params) };
            case 'RenderMesh':
                return { action: 'RenderMesh', result: WorkerClient.Get.getMeshBuffer() };
            case 'Voxelise':
                return { action: 'Voxelise', result: WorkerClient.Get.voxelise(message.params) };
            case 'RenderVoxelMesh':
                return { action: 'RenderVoxelMesh', result: WorkerClient.Get.getVoxelMeshBuffer(message.params) };
            case 'Palette': 
                WorkerClient.Get.palette(message.params);
                return { action: 'Palette' };
            case 'RenderBlockMesh':
                return { action: 'RenderBlockMesh', result: WorkerClient.Get.getBlockMeshBuffer() };
            case 'Export':
                WorkerClient.Get.export(message.params);
                return { action: 'Export' };
        }
    } catch (e: any) {
        fs.writeFileSync('./worker-log.log', (<Error>e).message);
        return { action: e instanceof CustomError ? 'KnownError' : 'UnknownError', error: <Error>e };
    }
}

class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _loadedMesh?: Mesh;
    private _loadedVoxelMesh?: VoxelMesh;
    private _loadedBlockMesh?: BlockMesh;

    public import(params: ImportInput): ImportOutput {
        const importer = new ObjImporter();
        importer.parseFile(params.filepath);

        this._loadedMesh = importer.toMesh();
        this._loadedMesh.processMesh();

        return {
            numTriangles: this._loadedMesh.getTriangleCount(),
        };
    }

    public getMeshBuffer(): string {
        ASSERT(this._loadedMesh !== undefined);

        const materialBuffers: Array<{
            buffer: RenderBuffer,
            material: (SolidMaterial | (TexturedMaterial & { texturePath: string }))
        }> = [];
        
        for (const materialName in this._loadedMesh.getMaterials()) {
            const materialBuffer = new RenderBuffer([
                { name: 'position', numComponents: 3 },
                { name: 'texcoord', numComponents: 2 },
                { name: 'normal', numComponents: 3 },
            ]);
            
            for (let triIndex = 0; triIndex < this._loadedMesh.getTriangleCount(); ++triIndex) {
                const material = this._loadedMesh.getMaterialByTriangle(triIndex);
                if (material === materialName) {
                    const uvTri = this._loadedMesh.getUVTriangle(triIndex);
                    const triGeom = GeometryTemplates.getTriangleBufferData(uvTri);
                    materialBuffer.add(triGeom);
                }
            }

            const material = this._loadedMesh.getMaterialByName(materialName);
            if (material.type === MaterialType.solid) {
                materialBuffers.push({
                    buffer: materialBuffer,
                    material: material,
                });
            } else {
                materialBuffers.push({
                    buffer: materialBuffer,
                    material: {
                        type: MaterialType.textured,
                        path: material.path,
                        texturePath: material.path,
                    },
                });
            }
        }

        return JSON.stringify(materialBuffers);
    }

    public voxelise(params: VoxeliseInput): VoxeliseOutput {
        ASSERT(this._loadedMesh);
        let voxeliser: IVoxeliser;
        if (params.voxeliser === 'raybased') {
            voxeliser = new RayVoxeliser();
        } else if (params.voxeliser === 'bvhraybased') {
            voxeliser = new BVHRayVoxeliser();
        } else {
            ASSERT(params.voxeliser === 'normalcorrectedraybased');
            voxeliser = new NormalCorrectedRayVoxeliser();
        }

        this._loadedVoxelMesh = voxeliser.voxelise(this._loadedMesh, params.params);

        return {
            dimensions: this._loadedVoxelMesh.getBounds().getDimensions().addScalar(1),
        };
    }

    public getVoxelMeshBuffer(params: RenderVoxelMeshInput): RenderVoxelMeshOutput {
        ASSERT(this._loadedVoxelMesh);

        return {
            rawBuffer: JSON.stringify(this._loadedVoxelMesh.createBuffer(params.ambientOcclusionEnabled)),
            voxelSize: this._loadedVoxelMesh.getVoxelSize(),
            dimensions: this._loadedVoxelMesh.getBounds().getDimensions(),
        };
    }

    public palette(params: PaletteInput) {
        ASSERT(this._loadedVoxelMesh);

        this._loadedBlockMesh = BlockMesh.createFromVoxelMesh(this._loadedVoxelMesh, params.params);
    }

    public export(params: ExportInput) {
        ASSERT(this._loadedBlockMesh);

        if (params.filepath) {
            const exporter = (params.exporter === 'schematic') ? new Schematic() : new Litematic();
            exporter.export(this._loadedBlockMesh, params.filepath);
        }
    }

    public getBlockMeshBuffer(): RenderBlockMeshOutput {
        ASSERT(this._loadedBlockMesh);

        return {
            rawBuffer: JSON.stringify(this._loadedBlockMesh.createBuffer()),
        };
    }
}
