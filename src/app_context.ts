import { UI } from './ui/layout';
import { Litematic, Schematic } from './schematic';
import { Renderer } from './renderer';
import { ColourSpace, LOG } from './util';

import { remote } from 'electron';
import { TextureFiltering } from './texture';

import { Exporters, FromWorkerMessage, ToWorkerMessage, Voxelisers } from './child';

import { fork, ChildProcess } from 'child_process';
import path from 'path';

/* eslint-disable */
export enum ActionReturnType {
    Success,
    Warning,
    Failure
}
/* eslint-enable */
export interface ReturnStatus {
    message: string,
    type: ActionReturnType,
    error?: unknown
}

/* eslint-disable */
export enum Action {
    Import = 0,
    Simplify = 1,
    Voxelise = 2,
    Palette = 3,
    Export = 4,
    MAX = 5,
}
/* eslint-enable */

export class AppContext {
    private _worker: ChildProcess;

    private static _instance: AppContext;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }

        UI.Get.build();
        UI.Get.registerEvents();
        UI.Get.disable(Action.Simplify);

        LOG('Creating worker...');
        const workerPath = path.join(__dirname, './proxy.js');
        this._worker = fork(workerPath);
        this._worker.on('message', this._handleWorkerMessage);

        Renderer.Get.toggleIsGridEnabled();
    }

    public do(action: Action) {
        LOG(`Doing ${action}`);
        const groupName = UI.Get.uiOrder[action];

        UI.Get.disable(action + 1);
        UI.Get.cacheValues(action);

        const workerMessage = this._getWorkerMessage(action);
        if (workerMessage) {
            this._worker.send(workerMessage);
        }

        UI.Get.layoutDull[groupName].submitButton.startLoading('Loading...');
    }

    private _getWorkerMessage(action: Action): ToWorkerMessage | void {
        switch (action) {
            case Action.Import: {
                const uiElements = UI.Get.layout.import.elements;
                return {
                    action: 'Import',
                    params: {
                        filepath: uiElements.input.getCachedValue(),
                    },
                };
            }
            case Action.Voxelise: {
                const uiElements = UI.Get.layout.build.elements;
                return {
                    action: 'Voxelise',
                    params: {
                        voxeliser: uiElements.voxeliser.getCachedValue() as Voxelisers,
                        params: {
                            desiredHeight: uiElements.height.getCachedValue() as number,
                            useMultisampleColouring: uiElements.multisampleColouring.getCachedValue() === 'on',
                            textureFiltering: uiElements.textureFiltering.getCachedValue() === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest,
                        },
                    },
                };
            }
            case Action.Palette: {
                const uiElements = UI.Get.layout.palette.elements;
                return {
                    action: 'Palette',
                    params: {
                        params: {
                            textureAtlas: uiElements.textureAtlas.getCachedValue(),
                            blockPalette: uiElements.blockPalette.getCachedValue(),
                            ditheringEnabled: uiElements.dithering.getCachedValue() === 'on',
                            colourSpace: uiElements.colourSpace.getCachedValue() as ColourSpace,
                        },
                    },
                };
            }
            case Action.Export: {
                const uiElements = UI.Get.layout.export.elements;

                const exportFormat = uiElements.export.getCachedValue() as Exporters;
                const exporter = (exportFormat === 'schematic') ? new Schematic() : new Litematic();

                const filepath = remote.dialog.showSaveDialogSync({
                    title: 'Save structure',
                    buttonLabel: 'Save',
                    filters: [exporter.getFormatFilter()],
                });

                if (filepath) {
                    return {
                        action: 'Export',
                        params: {
                            filepath: filepath,
                            exporter: exportFormat as Exporters,
                        },
                    };
                }
            }
        }
    }

    public sendWorker(message: ToWorkerMessage) {
        this._worker.send(message);
    }

    private _handleWorkerMessage(message: FromWorkerMessage) {
        switch (message.action) {
            case 'Import': {
                UI.Get.layout.import.output.setMessage(`Imported successfully with ${message.result.numTriangles} triangles`, ActionReturnType.Success);
                UI.Get.layout.import.submitButton.stopLoading();
                
                const renderMessage: ToWorkerMessage = { action: 'RenderMesh' };
                AppContext.Get.sendWorker(renderMessage);
                UI.Get.layout.import.submitButton.startLoading('Rendering...');
                break;
            }
            case 'RenderMesh': {
                Renderer.Get.parseRawMeshData(message.result);
                UI.Get.layout.import.submitButton.stopLoading();
                UI.Get.enable(Action.Voxelise);
                break;
            }
            case 'Voxelise': {
                const dim = message.result.dimensions;
                UI.Get.layout.build.output.setMessage(`Voxelised successfully <code>${dim.x}x${dim.y}x${dim.z}</code>`, ActionReturnType.Success);
                UI.Get.layout.build.submitButton.stopLoading();

                const renderMessage: ToWorkerMessage = {
                    action: 'RenderVoxelMesh',
                    params: {
                        ambientOcclusionEnabled: UI.Get.layout.build.elements.ambientOcclusion.getCachedValue() === 'on',
                    },
                };
                AppContext.Get.sendWorker(renderMessage);
                UI.Get.layout.build.submitButton.startLoading('Rendering...');
                break;
            }
            case 'RenderVoxelMesh': {
                Renderer.Get.parseRawVoxelMeshData(message.result);
                UI.Get.layout.build.submitButton.stopLoading();
                UI.Get.enable(Action.Palette);
                break;
            }
            case 'Palette': {
                break;
            }
            case 'RenderBlockMesh': {
                break;
            }
            case 'Export': {
                break;
            }
        }
    }

    public draw() {
        Renderer.Get.update();
        Renderer.Get.draw();
    }
}
