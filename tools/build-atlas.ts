import { ATLASES_DIR, LOGS_DIR, RGB, TOOLS_DIR, UV } from '../src/util';
import { LOG, log, LOG_ERROR, LOG_INFO, LOG_OKAY, LOG_WARN } from './logging';
import { isDirSetup, ASSERT, getAverageColour, getMinecraftDir, setupLogsDir, Model, Texture, EParentModel } from './misc';

import fs from 'fs';
import path from 'path';
import images from 'images';
import { PNG } from 'pngjs';
import chalk from 'chalk';
import prompt from 'prompt';
const AdmZip = require('adm-zip');
const copydir = require('copy-dir');

void async function main() {
    try {
        cleanTempDirectories();

        // Get user permission to access files
        const minecraftDir = getMinecraftDir();
        LOG_INFO(`This script requires files inside of ${minecraftDir}`);
        const { permission } = await prompt.get({
            properties: {
                permission: {
                    pattern: /^[YyNn]$/,
                    description: 'Do you give permission to access these files? (Y/n)',
                    message: 'Response must be Y or N',
                    required: true,
                },
            },
        });
        const responseYes = ['Y', 'y'].includes(permission as string);
        if (!responseYes) {
            return;
        }
        
        // Check Minecraft Java Edition installation
        if (!fs.existsSync(minecraftDir)) {
            LOG_ERROR(`Could not find ${minecraftDir}`);
            LOG_ERROR('To use this tool you need to install Minecraft Java Edition');
            return;
        }
        LOG_OKAY(`Found Minecraft Java Edition installation at ${minecraftDir}`);

        // Check resource packs directory exists
        const resourcePacksDir = path.join(minecraftDir, './resourcepacks');
        if (!fs.existsSync(resourcePacksDir)) {
            LOG_ERROR(`Could not find ${resourcePacksDir}`);
            return;
        }
        LOG_OKAY(`Successfully found ${resourcePacksDir}`);

        // Print all installed resource packs
        LOG_INFO('Looking for resource packs...');
        const resourcePacks = fs.readdirSync(resourcePacksDir);
        LOG(`1) Vanilla`);
        for (let i = 0; i < resourcePacks.length; ++i) {
            LOG(`${i+2}) ${resourcePacks[i]}`);
        }

        // Get user to choose resource pack to load textures from
        const { packChoice } = await prompt.get({
            properties: {
                packChoice: {
                    description: `Which resource pack do you want to build an atlas for? (1-${resourcePacks.length+1})`,
                    message: `Response must be between 1 and ${resourcePacks.length+1}`,
                    required: true,
                    conform: (value) => {
                        return value >= 1 && value <= resourcePacks.length + 1;
                    },
                },
            },
        });
        const resourcePack = (<number>packChoice === 1) ? 'Vanilla' : resourcePacks[(<number>packChoice) - 2];

        // Check versions directory exists
        const versionsDir = path.join(minecraftDir, './versions');
        if (!fs.existsSync(versionsDir)) {
            LOG_ERROR(`Could not find ${versionsDir}`);
            return;
        }
        LOG_OKAY(`Successfully found ${versionsDir}`);
        
        // Get all installed verions
        const versions = fs.readdirSync(versionsDir)
            .filter((file) => fs.lstatSync(path.join(versionsDir, file)).isDirectory())
            .map((file) => ({ file, birthtime: fs.lstatSync(path.join(versionsDir, file)).birthtime }))
            .sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());
        LOG_OKAY(`Successfully found ${versions.length} installed versions`);
        
        // Find the .jar of the newest installed version
        for (let i = 0; i < versions.length; ++i) {
            const versionName = versions[i].file;
            LOG_INFO(`Searching in ${versionName} for ${versionName}.jar...`);
    
            const versionDir = path.join(versionsDir, versionName);
            const versionFiles = fs.readdirSync(versionDir);
            if (!versionFiles.includes(versionName + '.jar')) {
                continue;
            }
            LOG_OKAY(`Successfully found ${versionName}.jar`);
    
            // Load vanilla textures and models
            LOG_INFO(`Upzipping ${versionName}.jar...`);
            const versionJarPath = path.join(versionDir, `${versionName}.jar`);
            const zip = new AdmZip(versionJarPath);
            const zipEntries = zip.getEntries();
            zipEntries.forEach((zipEntry: any) => {
                if (zipEntry.entryName.startsWith('assets/minecraft/textures/block')) {
                    zip.extractEntryTo(zipEntry.entryName, path.join(TOOLS_DIR, './blocks'), false, true);
                } else if (zipEntry.entryName.startsWith('assets/minecraft/models/block')) {
                    zip.extractEntryTo(zipEntry.entryName, path.join(TOOLS_DIR, './models'), false, true);
                }
            });
            LOG_OKAY(`Successfully extracted vanilla textures and models`);
            break;
        }

        // Load resource pack textures
        if (resourcePack !== 'Vanilla') {
            LOG_WARN('Non-16x16 texture packs are not supported');
    
            // Unzip resource pack if necessary
            const resourcePackDir = path.join(getMinecraftDir(), './resourcepacks', resourcePack);
            if (fs.lstatSync(resourcePackDir).isDirectory()) {
                const blockTexturesSrc = path.join(resourcePackDir, 'assets/minecraft/textures/block');
                const blockTexturesDst = path.join(TOOLS_DIR, './blocks');
                LOG_INFO(`Copying ${blockTexturesSrc} to ${blockTexturesDst}...`);
                copydir(blockTexturesSrc, blockTexturesDst, {
                    utimes: true,
                    mode: true,
                    cover: true,
                });
                LOG_OKAY(`Successfully copied resource pack block textures`);
            } else {
                LOG_INFO(`Resource pack '${resourcePack}' is not a directory, unzipping...`);
                const zip = new AdmZip(resourcePackDir);
                const zipEntries = zip.getEntries();
                zipEntries.forEach((zipEntry: any) => {
                    if (zipEntry.entryName.startsWith('assets/minecraft/textures/block')) {
                        zip.extractEntryTo(zipEntry.entryName, path.join(TOOLS_DIR, './blocks'), false, true);
                    }
                });
                LOG_OKAY(`Successfully copied block textures`);
            }
        }
    

        await buildAtlas();
        cleanTempDirectories();
    } catch (error: any) {
        LOG('\n');
        LOG_ERROR('Something went wrong');
        if (error instanceof Error) {
            const logDir = path.join(LOGS_DIR, `./atlas-${Date.now()}.log`);
            setupLogsDir();
            fs.writeFileSync(logDir, `${error.name}\n${error.message}\n${error.stack}`);
            LOG_ERROR(`For details check ${logDir}\n`);
        }
    }
}();

/**
 * Delete /tools/blocks and /tools/models if they exist
 */
function cleanTempDirectories() {
    const blocksDir = path.join(TOOLS_DIR, '/blocks');
    if (fs.existsSync(blocksDir)) {
        log('info', `Deleting ${blocksDir}...`);
        fs.rmSync(blocksDir, { recursive: true, force: true });
    }

    const modelsDir = path.join(TOOLS_DIR, '/models');
    if (fs.existsSync(modelsDir)) {
        log('info', `Deleting ${modelsDir}...`);
        fs.rmSync(path.join(TOOLS_DIR, '/models'), { recursive: true, force: true });
    }
}

async function buildAtlas() {
    // Check /blocks and /models is setup correctly
    LOG_INFO('Checking assets are provided...');   
    const texturesDirSetup = isDirSetup('./blocks', 'assets/minecraft/textures/block');
    ASSERT(texturesDirSetup, '/blocks is not setup correctly');
    LOG_OKAY('/tools/blocks/ is setup correctly');   
    const modelsDirSetup = isDirSetup('./models', 'assets/minecraft/models/block');
    ASSERT(modelsDirSetup, '/models is not setup correctly');
    log('okay', '/tools/models/ is setup correctly');   

    // Load the ignore list
    log('info', 'Loading ignore list...');
    let ignoreList: Array<string> = [];
    const ignoreListPath = path.join(TOOLS_DIR, './ignore-list.txt');
    if (fs.existsSync(ignoreListPath)) {
        log('okay', 'Found ignore list');
        ignoreList = fs.readFileSync(ignoreListPath, 'utf-8').replace(/\r/g, '').split('\n');
    } else {
        log('warn', 'No ignore list found, looked for ignore-list.txt');
    }
    log('okay', `${ignoreList.length} blocks found in ignore list`);
    
    log('info', 'Loading block models...');
    const faces = ['north', 'south', 'up', 'down', 'east', 'west'];
    const allModels: Array<Model> = [];
    const allBlockNames: Set<string> = new Set();
    const usedTextures: Set<string> = new Set();
    fs.readdirSync(path.join(TOOLS_DIR, './models')).forEach((filename) => {
        if (path.extname(filename) !== '.json') {
            return;
        };

        const filePath = path.join(TOOLS_DIR, './models', filename);
        const fileData = fs.readFileSync(filePath, 'utf8');
        const modelData = JSON.parse(fileData);
        const parsedPath = path.parse(filePath);
        const modelName = parsedPath.name;

        if (ignoreList.includes(filename)) {
            return;
        }

        let faceData: { [face: string]: Texture } = {};
        switch (modelData.parent) {
            case EParentModel.CubeAll:
                faceData = {
                    up: { name: modelData.textures.all },
                    down: { name: modelData.textures.all },
                    north: { name: modelData.textures.all },
                    south: { name: modelData.textures.all },
                    east: { name: modelData.textures.all },
                    west: { name: modelData.textures.all },
                };
                break;
            case EParentModel.CubeColumn:
                faceData = {
                    up: { name: modelData.textures.end },
                    down: { name: modelData.textures.end },
                    north: { name: modelData.textures.side },
                    south: { name: modelData.textures.side },
                    east: { name: modelData.textures.side },
                    west: { name: modelData.textures.side },
                };
                break;
            case EParentModel.Cube:
                faceData = {
                    up: { name: modelData.textures.up },
                    down: { name: modelData.textures.down },
                    north: { name: modelData.textures.north },
                    south: { name: modelData.textures.south },
                    east: { name: modelData.textures.east },
                    west: { name: modelData.textures.west },
                };
                break;
            case EParentModel.TemplateSingleFace:
                faceData = {
                    up: { name: modelData.textures.texture },
                    down: { name: modelData.textures.texture },
                    north: { name: modelData.textures.texture },
                    south: { name: modelData.textures.texture },
                    east: { name: modelData.textures.texture },
                    west: { name: modelData.textures.texture },
                };
                break;
            case EParentModel.TemplateGlazedTerracotta:
                faceData = {
                    up: { name: modelData.textures.pattern },
                    down: { name: modelData.textures.pattern },
                    north: { name: modelData.textures.pattern },
                    south: { name: modelData.textures.pattern },
                    east: { name: modelData.textures.pattern },
                    west: { name: modelData.textures.pattern },
                };
                break;
            default:
                return;
        }

        for (const face of faces) {
            usedTextures.add(faceData[face].name);
        }

        allModels.push({
            name: modelName,
            faces: faceData,
        });
        allBlockNames.add(modelName);
    });
    if (allModels.length === 0) {
        log('error', 'No blocks loaded');
        process.exit(0);
    }
    log('okay', `${allModels.length} blocks loaded`);

    const atlasSize = Math.ceil(Math.sqrt(usedTextures.size));
    const atlasWidth = atlasSize * 16;

    let offsetX = 0;
    let offsetY = 0;
    const outputImage = images(atlasWidth * 3, atlasWidth * 3);

    const textureDetails: { [textureName: string]: { texcoord: UV, colour: RGB } } = {};

    const { atlasName } = await prompt.get({
        properties: {
            atlasName: {
                pattern: /^[a-zA-Z\-]+$/,
                description: 'What do you want to call this texture atlas?',
                message: 'Name must only be letters or dash',
                required: true,
            },
        },
    });

    log('info', `Building ${atlasName}.png...`);
    usedTextures.forEach((textureName) => {
        const shortName = textureName.split('/')[1]; // Eww
        const absolutePath = path.join(TOOLS_DIR, './blocks', shortName + '.png');
        const fileData = fs.readFileSync(absolutePath);
        const pngData = PNG.sync.read(fileData);
        const image = images(absolutePath);

        for (let x = 0; x < 3; ++x) {
            for (let y = 0; y < 3; ++y) {
                outputImage.draw(image, 16 * (3 * offsetX + x), 16 * (3 * offsetY + y));
            }
        }

        textureDetails[textureName] = {
            texcoord: new UV(
                16 * (3 * offsetX + 1) / (atlasWidth * 3),
                16 * (3 * offsetY + 1) / (atlasWidth * 3),
            ),
            colour: getAverageColour(pngData),
        },

        ++offsetX;
        if (offsetX >= atlasSize) {
            ++offsetY;
            offsetX = 0;
        }
    });


    // Build up the output JSON
    log('info', `Building ${atlasName}.atlas...\n`);
    for (const model of allModels) {
        const blockColour = new RGB(0, 0, 0);
        for (const face of faces) {
            const faceTexture = textureDetails[model.faces[face].name];
            const faceColour = faceTexture.colour;
            blockColour.r += faceColour.r;
            blockColour.g += faceColour.g;
            blockColour.b += faceColour.b;
            model.faces[face].texcoord = faceTexture.texcoord;
        }
        blockColour.r /= 6;
        blockColour.g /= 6;
        blockColour.b /= 6;
        model.colour = blockColour;
    }

    log('info', 'Exporting...');
    const atlasDir = path.join(ATLASES_DIR, `./${atlasName}.png`);
    outputImage.save(atlasDir);
    log('okay', `${atlasName}.png exported to /resources/atlases/`);
    const outputJSON = {
        atlasSize: atlasSize,
        blocks: allModels,
        supportedBlockNames: Array.from(allBlockNames),
    };
    fs.writeFileSync(path.join(ATLASES_DIR, `./${atlasName}.atlas`), JSON.stringify(outputJSON, null, 4));
    log('okay', `${atlasName}.atlas exported to /resources/atlases/\n`);

    /* eslint-disable */
    console.log(chalk.cyanBright(chalk.inverse('DONE') + ' Now run ' + chalk.inverse(' npm start ') + ' and the new texture atlas can be used'));
    /* eslint-enable */
}
