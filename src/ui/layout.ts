import { BaseUIElement } from './elements/base';
import { SliderElement } from './elements/slider';
import { ComboBoxElement, ComboBoxItem } from './elements/combobox';
import { FileInputElement } from './elements/file_input';
import { ButtonElement } from './elements/button';
import { OutputElement } from './elements/output';
import { EAction, AppContext } from '../app_context';
import { ASSERT, ATLASES_DIR, LOG, PALETTES_DIR } from '../util';

import fs from 'fs';
import { ToolbarItemElement } from './elements/toolbar_item';
import { EAppEvent } from '../event';
import { MeshType, Renderer } from '../renderer';
import { ArcballCamera } from '../camera';

export interface Group {
    label: string;
    elements: { [key: string]: BaseUIElement<any> };
    elementsOrder: string[];
    submitButton: ButtonElement;
    output: OutputElement;
    postElements?: { [key: string]: BaseUIElement<any> };
    postElementsOrder?: string[];
}

export interface ToolbarGroup {
    elements: { [key: string]: ToolbarItemElement };
    elementsOrder: string[];
}

export class UI {
    public uiOrder = ['import', 'simplify', 'build', 'assign', 'export'];
    private _ui = {
        'import': {
            label: '导入',
            elements: {
                'input': new FileInputElement('Wavefront .obj 文件', 'obj'),
            },
            elementsOrder: ['input'],
            submitButton: new ButtonElement('导入 Mesh', () => {
                this._appContext.do(EAction.Import);
            }),
            output: new OutputElement(),
        },
        'simplify': {
            label: '简化',
            elements: {
                'ratio': new SliderElement('比例', 0.0, 1.0, 2, 0.5),
            },
            elementsOrder: ['ratio'],
            submitButton: new ButtonElement('简化 Mesh', () => {
                this._appContext.do(EAction.Simplify);
            }),
            output: new OutputElement(),
        },
        'build': {
            label: '构建',
            elements: {
                'height': new SliderElement('设计高度 Desired height', 3, 320, 0, 80),
                'voxeliser': new ComboBoxElement('算法 Algorithm', [
                    { id: 'bvhraybased', displayText: '基于层次包围盒的光线追踪 BVH Ray-based' },
                    { id: 'normalcorrectedraybased', displayText: '普通矫正光线追踪 NCRB' },
                    { id: 'raybased', displayText: '光线追踪 Ray-based (旧的)' },
                ]),
                'ambientOcclusion': new ComboBoxElement('环境光遮蔽 Ambient occlusion', [
                    { id: 'on', displayText: '开 (推荐)' },
                    { id: 'off', displayText: '关 (快)' },
                ]),
                'multisampleColouring': new ComboBoxElement('多重采样 Multisample colouring', [
                    { id: 'on', displayText: '开 (推荐)' },
                    { id: 'off', displayText: '关 (快)' },
                ]),
                'textureFiltering': new ComboBoxElement('纹理过滤 Texture filtering', [
                    { id: 'linear', displayText: '线性 Linear (推荐)' },
                    { id: 'nearest', displayText: '近似 Nearest (快)' },
                ]),
            },
            elementsOrder: ['height', 'voxeliser', 'ambientOcclusion', 'multisampleColouring', 'textureFiltering'],
            submitButton: new ButtonElement('像素化 Mesh', () => {
                this._appContext.do(EAction.Voxelise);
            }),
            output: new OutputElement(),
        },
<<<<<<< HEAD
        'palette': {
            label: '调色',
=======
        'assign': {
            label: 'Assign',
>>>>>>> 9d760b1b8448bb991a78ee4370d3ae7bf6ac10c4
            elements: {
                'textureAtlas': new ComboBoxElement('纹理图集 Texture atlas', this._getTextureAtlases()),
                'blockPalette': new ComboBoxElement('方块状态 Block palette', this._getBlockPalettes()),
                'dithering': new ComboBoxElement('色阶强化 Dithering', [
                    { id: 'on', displayText: '开 (推荐)' },
                    { id: 'off', displayText: '关' },
                ]),
                'colourSpace': new ComboBoxElement('色彩空间 Colour space', [
                    { id: 'rgb', displayText: 'RGB (快)' },
                    { id: 'lab', displayText: 'LAB (推荐, 慢)' },
                ]),
            },
            elementsOrder: ['textureAtlas', 'blockPalette', 'dithering', 'colourSpace'],
<<<<<<< HEAD
            submitButton: new ButtonElement('赋予方块 Assign blocks', () => {
                this._appContext.do(EAction.Palette);
=======
            submitButton: new ButtonElement('Assign blocks', () => {
                this._appContext.do(EAction.Assign);
>>>>>>> 9d760b1b8448bb991a78ee4370d3ae7bf6ac10c4
            }),
            output: new OutputElement(),
        },
        'export': {
            label: '导出',
            elements: {
                'export': new ComboBoxElement('文件格式', [
                    { id: 'litematic', displayText: 'Litematic' },
                    { id: 'schematic', displayText: 'Schematic' },
                ]),
            },
            elementsOrder: ['export'],
            submitButton: new ButtonElement('导出 结构文件', () => {
                this._appContext.do(EAction.Export);
            }),
            output: new OutputElement(),
        },
    };

    private _toolbarLeft = {
        groups: {
            'viewmode': {
                elements: {
                    'mesh': new ToolbarItemElement('mesh', () => {
                        Renderer.Get.setModelToUse(MeshType.TriangleMesh);
                    },
                    EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        return modelUsed === MeshType.TriangleMesh;
                    },
                    EAppEvent.onModelAvailableChanged, (...args: any[]) => {
                        const modelType = args[0][0][0] as MeshType;
                        const isCached = args[0][0][1] as boolean;
                        return modelType >= MeshType.TriangleMesh && isCached;
                    }),
                    
                    'voxelMesh': new ToolbarItemElement('voxel', () => {
                        Renderer.Get.setModelToUse(MeshType.VoxelMesh);
                    }, EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        return modelUsed === MeshType.VoxelMesh;
                    }, EAppEvent.onModelAvailableChanged, (...args: any[]) => {
                        const modelType = args[0][0][0] as MeshType;
                        const isCached = args[0][0][1] as boolean;
                        return modelType >= MeshType.VoxelMesh && isCached;
                    }),

                    'blockMesh': new ToolbarItemElement('block', () => {
                        Renderer.Get.setModelToUse(MeshType.BlockMesh);
                    }, EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        return modelUsed === MeshType.BlockMesh;
                    }, EAppEvent.onModelAvailableChanged, (...args: any[]) => {
                        const modelType = args[0][0][0] as MeshType;
                        const isCached = args[0][0][1] as boolean;
                        return modelType >= MeshType.BlockMesh && isCached;
                    }),
                },
                elementsOrder: ['mesh', 'voxelMesh', 'blockMesh'],
            },
            'zoom': {
                elements: {
                    'zoomOut': new ToolbarItemElement('minus', () => {
                        ArcballCamera.Get.onZoomOut();
                    }),
                    'zoomIn': new ToolbarItemElement('plus', () => {
                        ArcballCamera.Get.onZoomIn();
                    }),
                    'centre': new ToolbarItemElement('centre', () => {
                        ArcballCamera.Get.reset();
                    }),
                },
                elementsOrder: ['zoomOut', 'zoomIn', 'centre'],
            },
            'debug': {
                elements: {
                    'grid': new ToolbarItemElement('grid', () => {
                        Renderer.Get.toggleIsGridEnabled();
                    }, EAppEvent.onGridEnabledChanged, (...args: any[]) => {
                        const isEnabled = args[0][0][0] as boolean;
                        return isEnabled;
                    }),
                },
                elementsOrder: ['grid'],
            },
        },
        groupsOrder: ['viewmode', 'zoom', 'debug'],
    };

    private _toolbarRight = {
        groups: {
            'debug': {
                elements: {
                    'wireframe': new ToolbarItemElement('wireframe', () => {
                        Renderer.Get.toggleIsWireframeEnabled();
                    }, EAppEvent.onWireframeEnabledChanged, (...args: any[]) => {
                        const isEnabled = args[0][0][0] as boolean;
                        return isEnabled;
                    }, EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        return modelUsed === MeshType.TriangleMesh || modelUsed === MeshType.VoxelMesh;
                    }),
                    'normals': new ToolbarItemElement('normal', () => {
                        Renderer.Get.toggleIsNormalsEnabled();
                    }, EAppEvent.onNormalsEnabledChanged, (...args: any[]) => {
                        const isEnabled = args[0][0][0] as boolean;
                        return isEnabled;
                    }, EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        return modelUsed === MeshType.TriangleMesh;
                    }),
                    'dev': new ToolbarItemElement('debug', () => {
                        Renderer.Get.toggleIsDevDebugEnabled();
                    }, EAppEvent.onDevViewEnabledChanged, (...args: any[]) => {
                        const isEnabled = args[0][0][0] as boolean;
                        return isEnabled;
                    }, EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        const devBufferAvailable = Renderer.Get.getModelsAvailable() >= 2;
                        return modelUsed === MeshType.TriangleMesh && devBufferAvailable;
                    }),
                },
                elementsOrder: ['wireframe', 'normals', 'dev'],
            },
        },
        groupsOrder: ['debug'],
    };

    private _uiDull: { [key: string]: Group } = this._ui;
    private _toolbarLeftDull: { [key: string]: ToolbarGroup } = this._toolbarLeft.groups;
    private _toolbarRightDull: { [key: string]: ToolbarGroup } = this._toolbarRight.groups;

    private _appContext: AppContext;

    constructor(appContext: AppContext) {
        this._appContext = appContext;
    }

    public build() {
        const groupHTML: { [key: string]: string } = {};
        for (const groupName in this._ui) {
            const group = this._uiDull[groupName];
            groupHTML[groupName] = `
            <div class="item item-body">
                <div class="prop-right">
                    <div class="h-div">
                    </div>
                </div>
                <div class="group-heading">
                    ${group.label.toUpperCase()}
                </div>
                <div class="prop-right">
                    <div class="h-div">
                    </div>
                </div>
            </div>
            `;
            groupHTML[groupName] += this._buildGroup(group);
        }

        let itemHTML = '';
        for (const groupName of this.uiOrder) {
            itemHTML += groupHTML[groupName];
        }

        document.getElementById('properties')!.innerHTML = `<div class="container">
        ` + itemHTML + `</div>`;
        
        // Build toolbar
        let toolbarHTML = '';
        // Left
        toolbarHTML += '<div class="toolbar-column">';
        for (const toolbarGroupName of this._toolbarLeft.groupsOrder) {
            toolbarHTML += '<div class="toolbar-group">';
            const toolbarGroup = this._toolbarLeftDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                const groupElement = toolbarGroup.elements[groupElementName];
                toolbarHTML += groupElement.generateHTML();
            }
            toolbarHTML += '</div>';
        }
        toolbarHTML += '</div>';
        // Right
        toolbarHTML += '<div class="toolbar-column">';
        for (const toolbarGroupName of this._toolbarRight.groupsOrder) {
            toolbarHTML += '<div class="toolbar-group">';
            const toolbarGroup = this._toolbarRightDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                const groupElement = toolbarGroup.elements[groupElementName];
                toolbarHTML += groupElement.generateHTML();
            }
            toolbarHTML += '</div>';
        }
        toolbarHTML += '</div>';

        document.getElementById('toolbar')!.innerHTML = toolbarHTML;
    }

    public cacheValues(action: EAction) {
        const group = this._getEActionGroup(action);
        for (const elementName of group.elementsOrder) {
            LOG(`Caching ${elementName}`);
            const element = group.elements[elementName];
            element.cacheValue();
        }
    }

    private _buildGroup(group: Group) {
        let groupHTML = '';
        for (const elementName of group.elementsOrder) {
            const element = group.elements[elementName];
            groupHTML += this._buildSubcomponent(element);
        }

        let postGroupHTML = '';
        if (group.postElements) {
            ASSERT(group.postElementsOrder, 'No post elements order');
            for (const elementName of group.postElementsOrder) {
                const element = group.postElements[elementName];
                postGroupHTML += this._buildSubcomponent(element);
            }
        }

        return `
            ${groupHTML}
            <div class="item item-body">
                <div class="prop-right">
                    ${group.submitButton.generateHTML()}
                </div>
            </div>
            <div class="item item-body">
                <div class="prop-right">
                    ${group.output.generateHTML()}
                </div>
            </div>
            ${postGroupHTML}
        `;
    }

    private _buildSubcomponent(element: BaseUIElement<any>) {
        return `
            <div class="item item-body">
                ${element.generateHTML()}
            </div>
        `;
    }

    public registerEvents() {
        for (const groupName in this._ui) {
            const group = this._uiDull[groupName];
            for (const elementName in group.elements) {
                const element = group.elements[elementName];
                element.registerEvents();
            }
            group.submitButton.registerEvents();
            if (group.postElements) {
                ASSERT(group.postElementsOrder);
                for (const elementName in group.postElements) {
                    const element = group.postElements[elementName];
                    element.registerEvents();
                }
            }
        }

        // Register toolbar left
        for (const toolbarGroupName of this._toolbarLeft.groupsOrder) {
            const toolbarGroup = this._toolbarLeftDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                toolbarGroup.elements[groupElementName].registerEvents();
            }
        } 
        // Register toolbar right
        for (const toolbarGroupName of this._toolbarRight.groupsOrder) {
            const toolbarGroup = this._toolbarRightDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                toolbarGroup.elements[groupElementName].registerEvents();
            }
        } 
    }

    public get layout() {
        return this._ui;
    }

    public get layoutDull() {
        return this._uiDull;
    }

    public enable(action: EAction) {
        if (action >= EAction.MAX) {
            return;
        }

        LOG('enabling', action);
        // TODO: Remove once Simplify has been implemented
        if (action === EAction.Simplify) {
            action = EAction.Voxelise;
        }
        const group = this._getEActionGroup(action);
        for (const compName in group.elements) {
            group.elements[compName].setEnabled(true);
        }
        group.submitButton.setEnabled(true);
        // Enable the post elements of the previous group
        const prevGroup = this._getEActionGroup(action - 1);
        if (prevGroup && prevGroup.postElements) {
            ASSERT(prevGroup.postElementsOrder);
            for (const postElementName in prevGroup.postElements) {
                prevGroup.postElements[postElementName].setEnabled(true);
            }
        }
    }

    public disable(action: EAction) {
        if (action < 0) {
            return;
        }

        for (let i = action; i < EAction.MAX; ++i) {
            const group = this._getEActionGroup(i);
            LOG('disabling', group.label);
            for (const compName in group.elements) {
                group.elements[compName].setEnabled(false);
            }
            group.submitButton.setEnabled(false);
            group.output.clearMessage();
            if (group.postElements) {
                LOG(group.label, 'has post-element');
                ASSERT(group.postElementsOrder);
                for (const postElementName in group.postElements) {
                    LOG('disabling post-element', postElementName, 'for', group.label);
                    group.postElements[postElementName].setEnabled(false);
                }
            }
        }
        // Disable the post elements of the previous group
        const prevGroup = this._getEActionGroup(action - 1);
        if (prevGroup && prevGroup.postElements) {
            ASSERT(prevGroup.postElementsOrder);
            for (const postElementName in prevGroup.postElements) {
                prevGroup.postElements[postElementName].setEnabled(false);
            }
        }
    }

    private _getEActionGroup(action: EAction): Group {
        const key = this.uiOrder[action];
        return this._uiDull[key];
    }

    private _getTextureAtlases(): ComboBoxItem[] {
        const textureAtlases: ComboBoxItem[] = [];

        fs.readdirSync(ATLASES_DIR).forEach((file) => {
            if (file.endsWith('.atlas')) {
                const paletteID = file.split('.')[0];
                let paletteName = paletteID.replace('-', ' ').toLowerCase();
                paletteName = paletteName.charAt(0).toUpperCase() + paletteName.slice(1);
                textureAtlases.push({ id: paletteID, displayText: paletteName });
            }
        });

        return textureAtlases;
    }

    private _getBlockPalettes(): ComboBoxItem[] {
        const blockPalettes: ComboBoxItem[] = [];

        fs.readdirSync(PALETTES_DIR).forEach((file) => {
            if (file.endsWith('.palette')) {
                const paletteID = file.split('.')[0];
                let paletteName = paletteID.replace('-', ' ').toLowerCase();
                paletteName = paletteName.charAt(0).toUpperCase() + paletteName.slice(1);
                blockPalettes.push({ id: paletteID, displayText: paletteName });
            }
        });

        return blockPalettes;
    }
}
