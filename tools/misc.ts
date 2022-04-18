import { LOG, log, LOG_OKAY } from './logging';
import { LOGS_DIR, RGB, TOOLS_DIR, UV } from '../src/util';

import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import prompt from 'prompt';

export const ASSERT = (condition: boolean, onFailMessage: string) => {
    if (!condition) {
        log('error', onFailMessage);
        process.exit(0);
    }
};

export function setupLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR);
        LOG_OKAY(`Created ${LOGS_DIR}`);
    }
}

export function isDirSetup(relativePath: string, jarAssetDir: string) {
    const dir = path.join(TOOLS_DIR, relativePath);
    if (fs.existsSync(dir)) {
        if (fs.readdirSync(dir).length > 0) {
            return true;
        }
    } else {
        fs.mkdirSync(dir);
    }
    log('warn', `Copy the contents of .minecraft/versions/<version>/<version>.jar/${jarAssetDir} from a Minecraft game files into ${relativePath} or fetch them automatically`);
    return false;
}

export function getAverageColour(image: PNG) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let x = 0; x < image.width; ++x) {
        for (let y = 0; y < image.height; ++y) {
            const index = 4 * (image.width * y + x);
            const rgba = image.data.slice(index, index + 4);
            r += rgba[0];
            g += rgba[1];
            b += rgba[2];
        }
    }
    const numPixels = image.width * image.height;
    return new RGB(r / (255 * numPixels), g / (255 * numPixels), b / (255 * numPixels));
}

export function getMinecraftDir(): string {
    switch (process.platform) {
        case 'darwin': // MacOS
            return path.join(process.env.HOME!, './Library/Application Support/minecraft');
        case 'win32': // Windows
            return path.join(process.env.APPDATA!, './.minecraft');
        default:
            return path.join(require('os').homedir(), '/.minecraft');
    }
}


/* eslint-disable */
export enum EParentModel {
    Cube = 'minecraft:block/cube',
    CubeAll = 'minecraft:block/cube_all',
    CubeColumn = 'minecraft:block/cube_column',
    CubeColumnHorizontal = 'minecraft:block/cube_column_horizontal',
    TemplateSingleFace = 'minecraft:block/template_single_face',
    TemplateGlazedTerracotta = 'minecraft:block/template_glazed_terracotta',
}
/* eslint-enable */

export interface Model {
    name: string,
    colour?: RGB,
    faces: {
        [face: string]: Texture
    }
}

export interface Texture {
    name: string,
    texcoord?: UV,
    colour?: RGB
}
