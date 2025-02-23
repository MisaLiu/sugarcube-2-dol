#!/usr/bin/env node
/***********************************************************************************************************************

	build.js (v1.7.1, 2021-12-21)
		A Node.js-hosted build script for SugarCube.

	Copyright © 2013–2021 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/
/* eslint-env node, es2021 */
'use strict';


/*******************************************************************************
	Configuration
*******************************************************************************/

const CONFIG = {
	js : {
		files : [
			// The ordering herein is significant.
			'src/lib/alert.js',
			'src/lib/patterns.js',
			'src/lib/extensions.js',
			'src/lib/browser.js',
			'src/lib/has.js',
			'src/lib/visibility.js',
			'src/lib/fullscreen.js',
			'src/lib/helpers.js',
			'src/lib/jquery-plugins.js',
			'src/lib/util.js',
			'src/lib/simplestore/simplestore.js',
			'src/lib/simplestore/adapters/webstorage.js',
			'src/lib/simplestore/adapters/cookie.js',
			'src/lib/debugview.js',
			'src/lib/nodetyper.js',
			'src/lib/prngwrapper.js',
			'src/lib/stylewrapper.js',
			'src/util/enumfrom.js',
			'src/lib/diff.js',
			'src/l10n/l10n.js',
			'src/l10n/legacy.js',
			'src/l10n/strings.js',
			'src/config.js',
			'src/simpleaudio.js',
			'src/state.js',
			'src/markup/scripting.js',
			'src/markup/lexer.js',
			'src/markup/wikifier.js',
			'src/markup/parserlib.js',
			'src/markup/template.js',
			'src/macros/macro.js',
			'src/macros/macrocontext.js',
			'src/macros/macrolib.js',
			'src/dialog.js',
			'src/engine.js',
			'src/passage.js',
			'src/save.js',
			'src/setting.js',
			'src/story.js',
			'src/ui.js',
			'src/uibar.js',
			'src/debugbar.js',
			'src/loadscreen.js',
			'src/idb_backend.js',
			'src/hotkeys.js',
			'src/sugarcube.js'
		],
		wrap : {
			intro : 'src/templates/intro.js',
			outro : 'src/templates/outro.js'
		}
	},
	css : {
		mixins : 'src/css/_mixins.css',
		files  : [
			// The ordering herein is significant.
			'src/vendor/normalize.css',
			'src/css/init-screen.css',
			'src/css/font.css',
			'src/css/core.css',
			'src/css/core-display.css',
			'src/css/core-passage.css',
			'src/css/core-macro.css',
			'src/css/ui-dialog.css',
			'src/css/ui.css',
			'src/css/ui-bar.css',
			'src/css/ui-debug.css',
			'src/css/idb_backend.css'
		]
	},
	libs : [
		// The ordering herein is significant.
		'src/vendor/classList.min.js',
		'src/vendor/jsondiffpatch.umd.min.js',
		'src/vendor/jquery.min.js',
		'src/vendor/jquery.ba-throttle-debounce.min.js',
		'src/vendor/imagesloaded.pkgd.min.js',
		'src/vendor/lz-string.min.js',
		'src/vendor/FileSaver.min.js',
		'src/vendor/seedrandom.min.js',
		'src/vendor/console-hack.min.js'
	],
	twine1 : {
		build : {
			src  : 'src/templates/twine1/html.tpl',
			dest : 'build/twine1/sugarcube-2/header.html'
		},
		copy : [
			{
				src  : 'src/templates/twine1/sugarcube-2.py',
				dest : 'build/twine1/sugarcube-2/sugarcube-2.py'
			},
			{
				src  : 'LICENSE',
				dest : 'build/twine1/sugarcube-2/LICENSE'
			}
		]
	},
	twine2 : {
		build : {
			src  : 'src/templates/twine2/html.tpl',
			dest : 'build/twine2/sugarcube-2/format.js',
			json : 'src/templates/twine2/config.json'
		},
		copy : [
			{
				src  : 'icon.svg',
				dest : 'build/twine2/sugarcube-2/icon.svg'
			},
			{
				src  : 'LICENSE',
				dest : 'build/twine2/sugarcube-2/LICENSE'
			}
		]
	}
};


/*******************************************************************************
	Main Script
*******************************************************************************/

// NOTICE!
//
// Where string replacements are done, we use the replacement function style to
// disable all special replacement patterns, since some of them may exist within
// the replacement strings—e.g., `$&` within the HTML or JavaScript sources.

const {
	log,
	die,
	fileExists,
	makePath,
	copyFile,
	readFileContents,
	writeFileContents,
	concatFiles
} = require('./scripts/build-utils');
const _path = require('path');
const _opt  = require('node-getopt').create([
	['b', 'build=VERSION', 'Build only for Twine major version: 1 or 2; default: build for all.'],
	['d', 'debug',         'Keep debugging code; gated by DEBUG symbol.'],
	['u', 'unminified',    'Suppress minification stages.'],
	['t', 'transpile',  'Enable JavaScript transpilation stages.'],
	['h', 'help',          'Print this help, then exit.']
])
	.bindHelp()
	.parseSystem();

let _buildForTwine1 = false;
let _buildForTwine2 = true;

if (_opt.options.build) {
	switch (_opt.options.build) {
	case '1':
		_buildForTwine1 = true;
		_buildForTwine2 = false;
		break;

	case '2':
		_buildForTwine1 = false;
		break;

	default:
		die(`unknown Twine major version: ${_opt.options.build}; valid values: 1 or 2`);
		break;
	}
}

// Build the project.
(async () => {
	console.log('Starting builds...');

	// Create the build ID file, if nonexistent.
	if (!fileExists('.build')) {
		writeFileContents('.build', '0');
	}

	// Get the version info and build metadata.
	const version = (() => {
		const semver = require('semver');
		const { name, version } = require('./package.json'); // relative path must be prefixed ('./')
		const prerelease = semver.prerelease(version);

		return {
			title      : name,
			major      : semver.major(version),
			minor      : semver.minor(version),
			patch      : semver.patch(version),
			prerelease : prerelease && prerelease.length > 0 ? prerelease.join('.') : null,
			build      : Number(readFileContents('.build')) + 1,
			date       : new Date().toISOString(),

			toString() {
				const prerelease = this.prerelease ? `-${this.prerelease}` : '';
				return `${this.major}.${this.minor}.${this.patch}${prerelease}`;
			}
		};
	})();

	// Build for Twine 1.x.
	if (_buildForTwine1 && CONFIG.twine1) {
		console.log('\nBuilding Twine 1.x version:');

		// Process the header templates and write the outfiles.
		projectBuild({
			build     : CONFIG.twine1.build,
			version   : version, // eslint-disable-line object-shorthand
			libSource : assembleLibraries(CONFIG.libs),                        // combine the libraries
			appSource : await compileJavaScript(CONFIG.js, { twine1 : true }), // combine and minify the app JS
			cssSource : compileStyles(CONFIG.css)                              // combine and minify the app CSS
		});

		// Process the files that simply need copied into the build.
		projectCopy(CONFIG.twine1.copy);
	}

	// Build for Twine 2.x.
	if (_buildForTwine2 && CONFIG.twine2) {
		console.log('\nBuilding Twine 2.x version:');

		// Process the story format templates and write the outfiles.
		projectBuild({
			build     : CONFIG.twine2.build,
			version   : version, // eslint-disable-line object-shorthand
			libSource : assembleLibraries(CONFIG.libs),                         // combine the libraries
			appSource : await compileJavaScript(CONFIG.js, { twine1 : false }), // combine and minify the app JS
			cssSource : compileStyles(CONFIG.css),                              // combine and minify the app CSS

			postProcess(sourceString) {
				// Load the output format.
				let output = require(`./${_path.normalize(this.build.json)}`); // relative path must be prefixed ('./')

				// Merge data into the output format.
				output = Object.assign(output, {
					description : output.description.replace(
						/(['"`])\{\{BUILD_VERSION_MAJOR\}\}\1/g,
						() => this.version.major
					),
					version : this.version.toString(),
					source  : sourceString
				});

				// Wrap the output in the `storyFormat()` function.
				output = `window.storyFormat(${JSON.stringify(output)});`;

				return output;
			}
		});

		// Process the files that simply need copied into the build.
		projectCopy(CONFIG.twine2.copy);
	}

	// Update the build ID.
	writeFileContents('.build', String(version.build));
})()
	.then(() => console.log('\nBuilds complete!  (check the "build" directory)'))
	.catch(reason => console.log('\nERROR:', reason));


/*******************************************************************************
	Utility Functions
*******************************************************************************/
function assembleLibraries(filenames) {
	log('assembling libraries...');

	return concatFiles(filenames, contents => contents.replace(/^\n+|\n+$/g, ''));
}

function compileJavaScript(filenameObj, options) {
	log('compiling JavaScript...');

	// Join the files.
	let bundle = concatFiles(filenameObj.files);

	// Transpile to ES5 with Babel.
	if (_opt.options.transpile) {
		const { transform } = require('@babel/core');
		bundle = transform(bundle, {
			// babelHelpers : 'bundled',
			code     : true,
			compact  : false,
			presets  : [['@babel/preset-env']],
			filename : 'sugarcube.bundle.js'
		}).code;
	}

	bundle = `${readFileContents(filenameObj.wrap.intro)}\n${bundle}\n${readFileContents(filenameObj.wrap.outro)}`;

	return (async source => {
		if (_opt.options.unminified) {
			return [
				`window.TWINE1=${Boolean(options.twine1)}`,
				`window.DEBUG=${_opt.options.debug || false}`,
				source
			].join(';\n');
		}

		// Minify the code with Terser.
		const { minify } = require('terser');
		const minified   = await minify(source, {
			compress : {
				global_defs : { // eslint-disable-line camelcase
					TWINE1 : !!options.twine1,
					DEBUG  : _opt.options.debug || false
				}
			},
			mangle : false
		});

		if (minified.error) {
			const { message, line, col, pos } = minified.error;
			die(`JavaScript minification error: ${message}\n[@: ${line}/${col}/${pos}]`);
		}

		return minified.code;
	})(bundle);
}

function compileStyles(config) {
	log('compiling CSS...');

	const autoprefixer = require('autoprefixer');
	const mixins       = require('postcss-mixins');
	const postcss      = require('postcss');
	const CleanCSS     = require('clean-css');
	const excludeRE    = /(?:normalize)\.css$/;
	const mixinContent = readFileContents(config.mixins);

	return concatFiles(config.files, (contents, filename) => {
		let css = contents;

		// Do not run the postcss plugins on files that match the exclusion regexp.
		if (!excludeRE.test(filename)) {
			css = `${mixinContent}\n${css}`;

			const processed = postcss([mixins]).process(css, { from : filename });

			css = processed.css;

			processed.warnings().forEach(mesg => console.warn(mesg.text));
		}

		if (!_opt.options.unminified) {
			css = new CleanCSS({
				level         : 1,
				compatibility : '*'
			})
				.minify(css)
				.styles;
		}

		const fileSlug = _path.basename(filename, '.css').toLowerCase().replace(/[^0-9a-z]+/g, '-');

		return `<style id="style-${fileSlug}" type="text/css">${css}</style>`;
	});
}

function projectBuild(project) {
	const infile  = _path.normalize(project.build.src);
	const outfile = _path.normalize(project.build.dest);

	log(`building: "${outfile}"`);

	// Load the story format template.
	let output = readFileContents(infile);

	// Process the source replacement tokens. (First!)
	output = output.replace(/(['"`])\{\{BUILD_LIB_SOURCE\}\}\1/, () => project.libSource);
	output = output.replace(/(['"`])\{\{BUILD_APP_SOURCE\}\}\1/, () => project.appSource);
	output = output.replace(/(['"`])\{\{BUILD_CSS_SOURCE\}\}\1/, () => project.cssSource);

	// Process the build replacement tokens.
	const prerelease = JSON.stringify(project.version.prerelease);
	const date       = JSON.stringify(project.version.date);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_MAJOR\}\}\1/g, () => project.version.major);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_MINOR\}\}\1/g, () => project.version.minor);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_PATCH\}\}\1/g, () => project.version.patch);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_PRERELEASE\}\}\1/g, () => prerelease);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_BUILD\}\}\1/g, () => project.version.build);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_DATE\}\}\1/g, () => date);
	output = output.replace(/(['"`])\{\{BUILD_VERSION_VERSION\}\}\1/g, () => project.version);

	// Post-process hook.
	if (typeof project.postProcess === 'function') {
		output = project.postProcess(output);
	}

	// Write the outfile.
	makePath(_path.dirname(outfile));
	writeFileContents(outfile, output);
}

function projectCopy(fileObjs) {
	fileObjs.forEach(file => {
		const infile  = _path.normalize(file.src);
		const outfile = _path.normalize(file.dest);

		log(`copying : "${outfile}"`);

		makePath(_path.dirname(outfile));
		copyFile(infile, outfile);
	});
}
