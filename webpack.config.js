const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { createExportRouter } = require("./exportApi");

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
			open: true,
			port: 1234,
			host: "127.0.0.1",
			client: {
				overlay: {
					errors: true,
					warnings: false
				}
			},
			setupMiddlewares: (middlewares, devServer) => {
				if (!devServer) {
					throw new Error("webpack-dev-server is not defined");
				}
				devServer.app.use("/api", createExportRouter());
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
				patterns: [{ from: "static/" }]
			}),
			new HtmlWebpackPlugin({
				template: "src/index.ejs",
				hash: true,
				minify: false
			})
		]
	};
};
