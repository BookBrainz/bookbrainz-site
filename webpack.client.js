const path = require('path');
const webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

const production = process.env.NODE_ENV === 'production';

const cleanWebpackPluginOpts = {
	cleanOnceBeforeBuildPatterns: [
		'js/**/*',
		'stylesheets',
		'!**/.keep'
	]
};


const clientConfig = {
	context: path.resolve(__dirname, 'src', 'client'),
	entry: {
		adminLogs: ['./controllers/adminLogs'],
		adminPanel: ['./controllers/admin-panel'],
		searchAdmin: ['./controllers/admin/searchAdmin.tsx'],
		collection: ['./controllers/collection/collection'],
		'collection/create': ['./controllers/collection/userCollectionForm'],
		collections: ['./controllers/collections'],
		deletion: ['./controllers/deletion.js'],
		preview: ['./controllers/preview.js'],
		error: ['./controllers/error.js'],
		externalService: ['./controllers/externalService.js'],
		identifierTypes: ['./controllers/identifierTypes.tsx'],
		index: ['./controllers/index.js'],
		registrationDetails: ['./controllers/registrationDetails.js'],
		relationshipTypes: ['./controllers/relationshipTypes.tsx'],
		revision: ['./controllers/revision.js'],
		revisions: ['./controllers/revisions.js'],
		search: ['./controllers/search.js'],
		statistics: ['./controllers/statistics.js'],
		'editor/achievement': ['./controllers/editor/achievement.js'],
		'editor/edit': ['./controllers/editor/edit.js'],
		'editor/editor': ['./controllers/editor/editor.js'],
		'entity/entity': ['./controllers/entity/entity.js'],
		'entity-editor': ['./entity-editor/controller.js'],
		'unified-form':['./unified-form/controller.js'],
		'entity-merge': ['./entity-editor/entity-merge.tsx'],
		'import-entity/discard-import-entity': ['./controllers/import-entity/discard-import-entity.js'],
		'import-entity/recent-imports': ['./controllers/import-entity/recent-imports.js'],
		style: './stylesheets/style.scss',
		'relationship-type-editor': ['./controllers/type-editor/relationship-type.tsx'],
		'identifier-type-editor': ['./controllers/type-editor/identifier-type.tsx']
	},
	externals: {
		moment: 'moment'
	},
	output: {
		/** Figure out how to use manifest to load the right chunkNamed file in src/server/templates/target.js */
		// chunkFilename: production ? 'js/[name].[chunkhash].js' : 'js/[name].js',
		// filename: production ? 'js/[name].[chunkhash].js' : 'js/[name].js',
		filename: 'js/[name].js',
		path: path.resolve(__dirname, 'static'),
		publicPath: '/'
	},
	mode: production ? 'production' : 'development',
	module: {
		rules: [
			{
				test: /\.s?css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader'
					},
					{
						loader: 'resolve-url-loader'
					},
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true
						}
					}
				]
			},
			{
				include: /node_modules/,
				test: /\.(js|mjs)$/,
				resolve: {
					fullySpecified: false
				}
			},
			{
				// babel configuration in .babelrc file
				include: path.resolve(__dirname, 'src'),
				test: /\.(js|jsx|ts|tsx)$/,
				use: ['babel-loader']
			},
			{
				test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
				use: [{
					loader: 'file-loader',
					options: {
						emitFile: false,
						name: '[name].[ext]',
						outputPath: 'webfonts/',
					}
				}]
			},
			{
				test: /\.(jpg|jpeg|png|gif|svg)$/,
				type: 'asset/resource',
				generator: {
					filename: 'images/[name][ext][query]'
				}
			}
		]
	},
	optimization: {
		splitChunks: {
			chunks: 'all',
			name: 'bundle'
		}
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: 'stylesheets/[name].css'
		}),
		new CleanWebpackPlugin(cleanWebpackPluginOpts)
	],
	resolve: {
		extensions: ['.js', '.jsx', '.ts', '.tsx']
	},
	target: 'web'
}


if (production) {
	clientConfig.plugins.push(new CompressionPlugin());
}
if (!production) {
	clientConfig.plugins = [
		...clientConfig.plugins,
		new webpack.HotModuleReplacementPlugin()
	]

	if (process.env.BUNDLE_ANALYZER) {
		clientConfig.plugins.push(new BundleAnalyzerPlugin());
	}

	/* Add webpack HMR middleware to all entry files except for styles */
	for (const entry in clientConfig.entry) {
		if (Object.prototype.hasOwnProperty.call(clientConfig.entry, entry)) {
			if(entry !== "style"){
				clientConfig.entry[entry].push('webpack-hot-middleware/client');
			}
		}
	}
	clientConfig.devtool = 'inline-source-map';
}


module.exports = clientConfig;
