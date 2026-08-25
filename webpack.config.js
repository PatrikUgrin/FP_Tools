const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

function freshExportApi() {
	delete require.cache[require.resolve("./bakerPaths")];
	delete require.cache[require.resolve("./exportApi")];
	return require("./exportApi");
}

module.exports = (_env, argv) => {
	return {
		stats: "minimal",
		entry: "./src/index.ts",
		output: {
			path: path.resolve(__dirname, "dist"),
			filename: "bundle.js"
		},
		devServer: {
			compress: true,
			hot: true,
			open: false,
			port: 3456,
			host: "0.0.0.0",
			allowedHosts: "all",
			client: {
				overlay: false,
				webSocketURL: "auto://0.0.0.0:0/ws"
			},
			setupMiddlewares: (middlewares, devServer) => {
				if (!devServer) {
					throw new Error("webpack-dev-server is not defined");
				}
				devServer.app.use("/spine", (req, res, next) => {
					freshExportApi().createSpineStatic()(req, res, next);
				});
				devServer.app.use("/spritesheet", (req, res, next) => {
					freshExportApi().createSpritesheetStatic()(req, res, next);
				});
				devServer.app.use("/api", (req, res, next) => {
					freshExportApi().createExportRouter()(req, res, next);
				});
				return middlewares;
			}
		},
		performance: { hints: false },
		devtool: argv.mode === "production" ? false : "source-map",
		module: {
			rules: [
				{
					test: /\.ts$/,
					loader: "ts-loader",
					exclude: /node_modules/
				}
			]
		},
		resolve: {
			extensions: [".ts", ".js"]
		},
		plugins: [
			new CopyPlugin({
				patterns: [{
					from: "static",
					noErrorOnMissing: true
				}]
			}),
			new HtmlWebpackPlugin({
				template: "src/index.ejs",
				hash: true,
				minify: false
			})
		]
	};
};
