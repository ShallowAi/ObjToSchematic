import chalk from 'chalk';

/* eslint-disable */
export type LogStyle = 'none' | 'info' | 'warn' | 'error' | 'okay' | 'done';
/* eslint-enable */

export const LOG = (message: string) => log('none', message);
export const LOG_WARN = (message: string) => log('warn', message);
export const LOG_ERROR = (message: string) => log('error', message);
export const LOG_OKAY = (message: string) => log('okay', message);
export const LOG_INFO = (message: string) => log('info', message);
export const LOG_DONE = (message: string) => log('done', message);

export function log(style: LogStyle, message: string) {
    const LogStyling: Map<LogStyle, { style: chalk.Chalk, prefix: string }> = new Map([
        ['info', { style: chalk.blue, prefix: chalk.blue.inverse('INFO') }],
        ['warn', { style: chalk.yellow, prefix: chalk.yellow.inverse('WARN') }],
        ['error', { style: chalk.red, prefix: chalk.red.inverse('UHOH') }],
        ['okay', { style: chalk.green, prefix: chalk.green.inverse('OKAY') }],
        ['done', { style: chalk.magenta, prefix: chalk.magenta.inverse('DONE') }],
    ]);

    if (style === 'none') {
        /* eslint-disable */
        console.log(chalk.whiteBright(message));
        /* eslint-enable */
    } else {
        const details: {style: chalk.Chalk, prefix: string} = LogStyling.get(style)!;
        /* eslint-disable */
        console.log(details.prefix + ' ' + details.style(message));
        /* eslint-enable */
    }
}
