import { Mesh } from '../src/mesh';
import { ObjImporter } from '../src/importers/obj_importer';
import { IVoxeliser } from '../src/voxelisers/base-voxeliser';
import { VoxelMesh, VoxelMeshParams } from '../src/voxel_mesh';
import { BlockMesh, BlockMeshParams } from '../src/block_mesh';
import { IExporter, Litematic, Schematic } from '../src/schematic';
import { RayVoxeliser } from '../src/voxelisers/ray-voxeliser';
import { NormalCorrectedRayVoxeliser } from '../src/voxelisers/normal-corrected-ray-voxeliser';
import { TextureFiltering } from '../src/texture';
import { ColourSpace } from '../src/util';
import { log, LogStyle } from './logging';
import { headlessConfig } from './headless-config';

void async function main() {
    const mesh = _import({
        absoluteFilePathLoad: headlessConfig.import.absoluteFilePathLoad,
    });
    const voxelMesh = _voxelise(mesh, {
        voxeliser: headlessConfig.voxelise.voxeliser === 'raybased' ? new RayVoxeliser() : new NormalCorrectedRayVoxeliser(),
        voxelMeshParams: {
            desiredHeight: headlessConfig.voxelise.voxelMeshParams.desiredHeight,
            useMultisampleColouring: headlessConfig.voxelise.voxelMeshParams.useMultisampleColouring,
            textureFiltering: headlessConfig.voxelise.voxelMeshParams.textureFiltering === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest,
        },
    });
    const blockMesh = _palette(voxelMesh, {
        blockMeshParams: {
            textureAtlas: headlessConfig.palette.blockMeshParams.textureAtlas,
            blockPalette: headlessConfig.palette.blockMeshParams.blockPalette,
            ditheringEnabled: headlessConfig.palette.blockMeshParams.ditheringEnabled,
            colourSpace: headlessConfig.palette.blockMeshParams.colourSpace as ColourSpace,
        },
    });
    _export(blockMesh, {
        absoluteFilePathSave: headlessConfig.export.absoluteFilePathSave,
        exporter: headlessConfig.export.exporter === 'schematic' ? new Schematic() : new Litematic(),
    });
    log(LogStyle.Success, 'Finished!');
}();

interface ImportParams {
    absoluteFilePathLoad: string;
}

interface VoxeliseParams {
    voxeliser: IVoxeliser;
    voxelMeshParams: VoxelMeshParams;
}

interface PaletteParams {
    blockMeshParams: BlockMeshParams;
}

interface ExportParams {
    absoluteFilePathSave: string;
    exporter: IExporter;
}

function _import(params: ImportParams): Mesh {
    log(LogStyle.Info, 'Importing...');
    const importer = new ObjImporter();
    importer.parseFile(params.absoluteFilePathLoad);
    for (const warning of importer.getWarnings()) {
        log(LogStyle.Warning, warning);
    }
    const mesh = importer.toMesh();
    mesh.processMesh();
    return mesh;
}

function _voxelise(mesh: Mesh, params: VoxeliseParams): VoxelMesh {
    log(LogStyle.Info, 'Voxelising...');
    const voxeliser: IVoxeliser = params.voxeliser;
    return voxeliser.voxelise(mesh, params.voxelMeshParams);
}

function _palette(voxelMesh: VoxelMesh, params: PaletteParams): BlockMesh {
    log(LogStyle.Info, 'Assigning blocks...');
    return BlockMesh.createFromVoxelMesh(voxelMesh, params.blockMeshParams);
}

function _export(blockMesh: BlockMesh, params: ExportParams) {
    log(LogStyle.Info, 'Exporting...');
    params.exporter.export(blockMesh, params.absoluteFilePathSave);
}
