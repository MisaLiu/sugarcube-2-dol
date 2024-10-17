import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
	/** @type {import('vite').UserConfig} */
	const config = {
		define: {
			DEBUG: JSON.stringify(mode === 'production' ? false : true),
		},
		build: {
			minify: mode === 'production' ? 'esbuild' : false,
			lib: {
				entry: resolve(__dirname, './src/main.js'),
				name: 'SugarCube',
				fileName: 'sugarcube',
				formats: [ 'cjs', 'umd', 'es' ],
			}
		},
	};

	return config;
});
