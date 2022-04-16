import chalk from 'chalk';

/* eslint-disable */
export type LogStyle = 'none' | 'info' | 'warn' | 'fail' | 'ok';
/* eslint-enable */

export function log(style: LogStyle, message: string) {
    const LogStyling: Map<LogStyle, { style: chalk.Chalk, prefix: string }> = new Map([
        ['none', { style: chalk.blue, prefix: chalk.blue.inverse('INFO') }],
        ['warn', { style: chalk.yellow, prefix: chalk.yellow.inverse('WARN') }],
        ['fail', { style: chalk.red, prefix: chalk.red.inverse('UHOH') }],
        ['ok', { style: chalk.green, prefix: chalk.green.inverse(' OK ') }],
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
