const path = require('path');

const commonConfig = {
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            /*
            {
                test: /\.ts$/,
                enforce: 'pre',
                loader: 'tslint-loader',
                options: {
                    typeCheck: true,
                    emitErrors: true
                },
            },
            */
            {
                test: /\.tsx?$/,
                use: [
                    { loader: 'babel-loader' },
                    { loader: 'ts-loader' },
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.ts', '.tsx', '.jsx', '.json'],
    },
};

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
    /*
    Object.assign(
        {
            target: 'electron-main',
            entry: { main: './src/main.ts' },
        },
        commonConfig),
    */
    Object.assign(
        {
            target: 'electron-renderer',
            entry: { gui: './src/client.ts' },
            plugins: [new HtmlWebpackPlugin({
                title: 'ObjToSchematic',
                template: 'template.html',
            })],
        },
        commonConfig),
];
