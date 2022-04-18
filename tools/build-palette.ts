import { log, LOG_DONE, LOG_ERROR, LOG_INFO, LOG_OKAY } from './logging';
import { TOOLS_DIR, PALETTES_DIR, LOGS_DIR } from '../src/util';

import fs from 'fs';
import path from 'path';
import prompt from 'prompt';
import { setupLogsDir } from './misc';

void async function main() {
    try {
        // Check new-palette-blocks.txt exists
        const paletteBlocksDir = path.join(TOOLS_DIR, './new-palette-blocks.txt');
        if (!fs.existsSync(paletteBlocksDir)) {
            LOG_ERROR(`Could not find new-palette-blocks.txt at ${paletteBlocksDir}`);
            return;
        }
        LOG_OKAY(`Found new-palette-blocks.txt at ${paletteBlocksDir}`);
        
        // Load new-palette-blocks.txt into blocksToUse
        let blocksToUse: string[] = fs.readFileSync(paletteBlocksDir, 'utf8').replace(/\r/g, '').split('\n');
        blocksToUse = blocksToUse.filter((block) => {
            return block.length !== 0;
        });
        if (blocksToUse.length === 0) {
            LOG_ERROR('No blocks listed for palette');
            LOG_INFO(`List the blocks you want the palette to use in ${paletteBlocksDir}`);
            return;
        }
        LOG_OKAY(`Found ${blocksToUse.length} blocks to use`);
        
        // Prompt user for palette name
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

        // Write the new palette
        fs.writeFileSync(path.join(PALETTES_DIR, `./${promptUser.paletteName}.palette`), JSON.stringify({ blocks: blocksToUse }, null, 4));
        LOG_DONE(`Successfully created ${promptUser.paletteName}.palette in ${paletteBlocksDir}\n`);
    } catch (error: any) {
        log('error', 'Something went wrong');
        if (error instanceof Error) {
            const logDir = path.join(LOGS_DIR, `./palette-${Date.now()}.log`);
            setupLogsDir();
            fs.writeFileSync(logDir, `${error.name}\n${error.message}\n${error.stack}`);
            log('error', `For details check ${logDir}`);
        }
    }
}();
