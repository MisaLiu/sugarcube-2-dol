/***********************************************************************************************************************

	lib/simplestore/adapters/FCHost.Storage.js

	Copyright Â© 2013â€“2019 Thomas Michael Edwards <thomasmedwards@gmail.com>. All rights reserved.
	Use of this source code is governed by a BSD 2-clause "Simplified" License, which may be found in the LICENSE file.

***********************************************************************************************************************/
/* global SimpleStore, Util */

SimpleStore.adapters.push((() => {
	'use strict';

	// Adapter readiness state.
	let _ok = false;


	/*******************************************************************************************************************
		_FCHostStorageAdapter Class.
        Note that FCHost is only intended for a single document, so we ignore both prefixing and storageID
	*******************************************************************************************************************/
	class _FCHostStorageAdapter {
		constructor(persistent) {
			let engine = null;
			let name   = null;

			if (persistent) {
				engine = window.FCHostPersistent;
				name   = 'FCHostPersistent';
			}
			else {
			    engine = window.FCHostSession;
				name   = 'FCHostSession';
			}

			Object.defineProperties(this, {
				_engine : {
					value : engine
				},
                
				name : {
					value : name
				},

				persistent : {
					value : !!persistent
				}
			});
		}

		/* legacy */
		get length() {
			if (DEBUG) { console.log(`[<SimpleStore:${this.name}>.length : Number]`); }

			return this._engine.size();
		}
		/* /legacy */

		size() {
			if (DEBUG) { console.log(`[<SimpleStore:${this.name}>.size() : Number]`); }

			return this._engine.size();
		}

		keys() {
			if (DEBUG) { console.log(`[<SimpleStore:${this.name}>.keys() : String Array]`); }

			return this._engine.keys();
		}

		has(key) {
			if (DEBUG) { console.log(`[<SimpleStore:${this.name}>.has(key: "${key}") : Boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			return this._engine.has(key);
		}

		get(key) {
			if (DEBUG) { console.log(`[<SimpleStore:${this.name}>.get(key: "${key}") : Any]`); }

			if (typeof key !== 'string' || !key) {
				return null;
			}

			const value = this._engine.get(key);

			return value == null ? null : _FCHostStorageAdapter._deserialize(value); // lazy equality for null
		}

		set(key, value) {
			if (DEBUG) { console.log(`[<SimpleStore:${this.name}>.set(key: "${key}", value: \u2026) : Boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			this._engine.set(key, _FCHostStorageAdapter._serialize(value));

			return true;
		}

		delete(key) {
			if (DEBUG) { console.log(`[<SimpleStore:${this.name}>.delete(key: "${key}") : Boolean]`); }

			if (typeof key !== 'string' || !key) {
				return false;
			}

			this._engine.remove(key);

			return true;
		}

		clear() {
			if (DEBUG) { console.log(`[<SimpleStore:${this.name}>.clear() : Boolean]`); }

			this._engine.clear();

			return true;
		}

		static _serialize(obj) {
			return JSON.stringify(obj);
		}

		static _deserialize(str) {
			return JSON.parse(str);
		}
	}


	/*******************************************************************************************************************
		Adapter Utility Functions.
	*******************************************************************************************************************/
	function adapterInit() {
		// FCHost feature test.
		function hasFCHostStorage() {
			try {
			    if (typeof window.FCHostPersistent !== 'undefined')
			        return true;
			}
			catch (ex) { /* no-op */ }

			return false;
		}

		_ok = hasFCHostStorage();
		
		return _ok;
	}

	function adapterCreate(storageId, persistent) {
		if (!_ok) {
			throw new Error('adapter not initialized');
		}

		return new _FCHostStorageAdapter(persistent);
	}


	/*******************************************************************************************************************
		Module Exports.
	*******************************************************************************************************************/
	return Object.freeze(Object.defineProperties({}, {
		init   : { value : adapterInit },
		create : { value : adapterCreate }
	}));
})());
