import { log } from './logging';
import { TOOLS_DIR, PALETTES_DIR } from '../src/util';

import fs from 'fs';
import path from 'path';
import prompt from 'prompt';

void async function main() {
    log('info', 'Creating a new palette...');
    
    const paletteBlocksDir = path.join(TOOLS_DIR, './new-palette-blocks.txt');
    if (!fs.existsSync(paletteBlocksDir)) {
        log('fail', 'Could not find /tools/new-palette-blocks.txt');
        return;
    }
    log('ok', 'Found list of blocks to use in /tools/new-palette-blocks.txt');
    
    let blocksToUse: string[] = fs.readFileSync(paletteBlocksDir, 'utf8').replace(/\r/g, '').split('\n');
    blocksToUse = blocksToUse.filter((block) => {
        return block.length !== 0;
    });
    if (blocksToUse.length === 0) {
        log('fail', 'No blocks listed for palette');
        log('info', 'List the blocks you want from /tools/all-supported-blocks.txt ');
        return;
    }
    log('info', `Found ${blocksToUse.length} blocks to use`);
    
    const schema: prompt.Schema = {
        properties: {
            paletteName: {
                pattern: /^[a-zA-Z\-]+$/,
                description: 'What do you want to call this block palette? (e.g. my-block-palette)',
                message: 'Must be only letters or dash',
                required: true,
            },
        },
    };

    const promptUser = await prompt.get(schema);

    const paletteJSON = {
        blocks: blocksToUse,
    };

    fs.writeFileSync(path.join(PALETTES_DIR, `./${promptUser.paletteName}.palette`), JSON.stringify(paletteJSON, null, 4));
    log('ok', `Successfully created ${promptUser.paletteName}.palette in /resources/palettes/`);
}();
