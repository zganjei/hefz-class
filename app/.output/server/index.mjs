globalThis.__nitro_main__ = import.meta.url;
import { n as serve, t as NodeResponse } from "./_libs/srvx.mjs";
import { i as toEventHandler, n as defineHandler, o as HTTPError, r as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import "./_libs/hookable.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
// #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs").then((n) => n.n)) };
globalThis.__nitro_vite_envs__ = services;
// node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
// #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
// node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
// #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/favicon.svg": {
		"type": "image/svg+xml",
		"etag": "\"18a-iWVZt4hNyeqB+PFwD/42p3wd4p0\"",
		"mtime": "2026-11-15T20:57:42.313Z",
		"size": 394,
		"path": "../public/favicon.svg"
	},
	"/assets/ibm-plex-mono-cyrillic-600-DiqaCFl3.woff2": {
		"type": "font/woff2",
		"etag": "\"15ac-G2h5Lo3s6Xp9HqWpKL2NJ36tV74\"",
		"mtime": "2026-11-15T20:57:40.281Z",
		"size": 5548,
		"path": "../public/assets/ibm-plex-mono-cyrillic-600-DiqaCFl3.woff2"
	},
	"/assets/ibm-plex-mono-cyrillic-400-DkeVBss5.woff2": {
		"type": "font/woff2",
		"etag": "\"1564-8+PvX0p8QVrbuzvTJ7m8mSqTU30\"",
		"mtime": "2026-11-15T20:57:40.280Z",
		"size": 5476,
		"path": "../public/assets/ibm-plex-mono-cyrillic-400-DkeVBss5.woff2"
	},
	"/assets/ibm-plex-mono-cyrillic-ext-500-CU9Da17h.woff2": {
		"type": "font/woff2",
		"etag": "\"10f0-9JKRt5EU0TBf17ofgpEWU93L3vI\"",
		"mtime": "2026-11-15T20:57:40.283Z",
		"size": 4336,
		"path": "../public/assets/ibm-plex-mono-cyrillic-ext-500-CU9Da17h.woff2"
	},
	"/assets/ibm-plex-mono-cyrillic-500-dnJBCtls.woff2": {
		"type": "font/woff2",
		"etag": "\"157c-aVomdjcSXW3z8Bc2vJxBkeUpd9E\"",
		"mtime": "2026-11-15T20:57:40.280Z",
		"size": 5500,
		"path": "../public/assets/ibm-plex-mono-cyrillic-500-dnJBCtls.woff2"
	},
	"/assets/ibm-plex-mono-latin-500-C820gu2e.woff2": {
		"type": "font/woff2",
		"etag": "\"274c-OiZouUtcE4jv0YOEZwuC6xkeUG0\"",
		"mtime": "2026-11-15T20:57:40.285Z",
		"size": 10060,
		"path": "../public/assets/ibm-plex-mono-latin-500-C820gu2e.woff2"
	},
	"/assets/ibm-plex-mono-cyrillic-ext-400-BKehAWor.woff2": {
		"type": "font/woff2",
		"etag": "\"10fc-RCs+yYfoyLwcYPlcoSJyZzsRQZg\"",
		"mtime": "2026-11-15T20:57:40.282Z",
		"size": 4348,
		"path": "../public/assets/ibm-plex-mono-cyrillic-ext-400-BKehAWor.woff2"
	},
	"/assets/ibm-plex-mono-latin-700-Bm1Kh9QZ.woff2": {
		"type": "font/woff2",
		"etag": "\"2790-lElgtykWMolMVVgPLI51B03w+w4\"",
		"mtime": "2026-11-15T20:57:40.286Z",
		"size": 10128,
		"path": "../public/assets/ibm-plex-mono-latin-700-Bm1Kh9QZ.woff2"
	},
	"/assets/ibm-plex-mono-latin-ext-400-C05TWSE2.woff2": {
		"type": "font/woff2",
		"etag": "\"229c-EI1QkISaIxaKB4L03XMpcfDrSdE\"",
		"mtime": "2026-11-15T20:57:40.287Z",
		"size": 8860,
		"path": "../public/assets/ibm-plex-mono-latin-ext-400-C05TWSE2.woff2"
	},
	"/assets/ibm-plex-mono-latin-ext-500-BQJS6Ovj.woff2": {
		"type": "font/woff2",
		"etag": "\"2290-JDl6PoNbZMzCJDyDwXYqGbKTBtM\"",
		"mtime": "2026-11-15T20:57:40.287Z",
		"size": 8848,
		"path": "../public/assets/ibm-plex-mono-latin-ext-500-BQJS6Ovj.woff2"
	},
	"/assets/ibm-plex-mono-latin-ext-600-BRMVj9uZ.woff2": {
		"type": "font/woff2",
		"etag": "\"2300-U1oxFKckByacAdyq/sRbwi1P30g\"",
		"mtime": "2026-11-15T20:57:40.288Z",
		"size": 8960,
		"path": "../public/assets/ibm-plex-mono-latin-ext-600-BRMVj9uZ.woff2"
	},
	"/assets/ibm-plex-mono-vietnamese-600-Dky8cY56.woff2": {
		"type": "font/woff2",
		"etag": "\"1014-eSWi3WwMGnxP7XNiwKOIYl18D+8\"",
		"mtime": "2026-11-15T20:57:40.289Z",
		"size": 4116,
		"path": "../public/assets/ibm-plex-mono-vietnamese-600-Dky8cY56.woff2"
	},
	"/assets/ibm-plex-mono-latin-600-DpGnXj3s.woff2": {
		"type": "font/woff2",
		"etag": "\"2788-wRrckTAkoblSg41oU8DEFPKCXXk\"",
		"mtime": "2026-11-15T20:57:40.286Z",
		"size": 10120,
		"path": "../public/assets/ibm-plex-mono-latin-600-DpGnXj3s.woff2"
	},
	"/assets/ibm-plex-mono-latin-400-BJoXLJYV.woff2": {
		"type": "font/woff2",
		"etag": "\"2744-LJus8CQbFCvY6PHfqFW7KTpJCuE\"",
		"mtime": "2026-11-15T20:57:40.284Z",
		"size": 10052,
		"path": "../public/assets/ibm-plex-mono-latin-400-BJoXLJYV.woff2"
	},
	"/assets/inter-cyrillic-C5ekK6td.woff2": {
		"type": "font/woff2",
		"etag": "\"4938-N3S2eKZrRgCJpY2MefXWBufCQaA\"",
		"mtime": "2026-11-15T20:57:40.289Z",
		"size": 18744,
		"path": "../public/assets/inter-cyrillic-C5ekK6td.woff2"
	},
	"/assets/inter-cyrillic-ext-Cpd2YT5r.woff2": {
		"type": "font/woff2",
		"etag": "\"64f4-tK7ixsAzSz1n1+rZ0d41uh7QBHY\"",
		"mtime": "2026-11-15T20:57:40.290Z",
		"size": 25844,
		"path": "../public/assets/inter-cyrillic-ext-Cpd2YT5r.woff2"
	},
	"/assets/index-9pAFz8gz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5ccad-arojlrNzteZd+e2Aaoirxuc4Cr0\"",
		"mtime": "2026-11-15T20:57:40.169Z",
		"size": 380077,
		"path": "../public/assets/index-9pAFz8gz.js"
	},
	"/assets/ibm-plex-mono-latin-ext-700-BqoVA4Sx.woff2": {
		"type": "font/woff2",
		"etag": "\"222c-pC24jdTU4TUCDC80OBc5NrqaSr0\"",
		"mtime": "2026-11-15T20:57:40.288Z",
		"size": 8748,
		"path": "../public/assets/ibm-plex-mono-latin-ext-700-BqoVA4Sx.woff2"
	},
	"/assets/inter-greek-ext-Ai74Rjx-.woff2": {
		"type": "font/woff2",
		"etag": "\"2c08-0jmpRV2Mkkir4F2SgNetftT+X2g\"",
		"mtime": "2026-11-15T20:57:40.291Z",
		"size": 11272,
		"path": "../public/assets/inter-greek-ext-Ai74Rjx-.woff2"
	},
	"/assets/inter-latin-8kRkwJBP.woff2": {
		"type": "font/woff2",
		"etag": "\"bd30-HcBE9IJP1a9r/tZ/7ki+cPoGnz8\"",
		"mtime": "2026-11-15T20:57:40.291Z",
		"size": 48432,
		"path": "../public/assets/inter-latin-8kRkwJBP.woff2"
	},
	"/assets/ibm-plex-mono-cyrillic-700-CBG_B1Ax.woff2": {
		"type": "font/woff2",
		"etag": "\"15a4-dpZ/UKTavoCAhxN2KhucYEfQDdo\"",
		"mtime": "2026-11-15T20:57:40.282Z",
		"size": 5540,
		"path": "../public/assets/ibm-plex-mono-cyrillic-700-CBG_B1Ax.woff2"
	},
	"/assets/ibm-plex-mono-cyrillic-ext-700-C1_pm3Uf.woff2": {
		"type": "font/woff2",
		"etag": "\"10f8-GLJ2i7uQ99WJlVFKckqW880M7es\"",
		"mtime": "2026-11-15T20:57:40.284Z",
		"size": 4344,
		"path": "../public/assets/ibm-plex-mono-cyrillic-ext-700-C1_pm3Uf.woff2"
	},
	"/assets/ibm-plex-mono-cyrillic-ext-600-hCF3fsXQ.woff2": {
		"type": "font/woff2",
		"etag": "\"10e0-wxSiXDoqEt19B8iXROBQ4MTcoMA\"",
		"mtime": "2026-11-15T20:57:40.283Z",
		"size": 4320,
		"path": "../public/assets/ibm-plex-mono-cyrillic-ext-600-hCF3fsXQ.woff2"
	},
	"/assets/inter-latin-ext-B_-bZUTo.woff2": {
		"type": "font/woff2",
		"etag": "\"14d18-Uh4k0XQeDHQ4ioQoYVD4qScmVZc\"",
		"mtime": "2026-11-15T20:57:40.302Z",
		"size": 85272,
		"path": "../public/assets/inter-latin-ext-B_-bZUTo.woff2"
	},
	"/assets/inter-greek-BQL42Lnq.woff2": {
		"type": "font/woff2",
		"etag": "\"4a64-m06OCqyGws0mpyGBBfmbbVtFPSU\"",
		"mtime": "2026-11-15T20:57:40.290Z",
		"size": 19044,
		"path": "../public/assets/inter-greek-BQL42Lnq.woff2"
	},
	"/assets/inter-vietnamese-YEzCLjIM.woff2": {
		"type": "font/woff2",
		"etag": "\"2828-F3GDdFn8yIqL/ZsbzNDCHlQrmMo\"",
		"mtime": "2026-11-15T20:57:40.324Z",
		"size": 10280,
		"path": "../public/assets/inter-vietnamese-YEzCLjIM.woff2"
	},
	"/assets/routes-C057WpOg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"392d-BYh4oNuBMC33ug8ni0V1FLXW7Yc\"",
		"mtime": "2026-11-15T20:57:40.279Z",
		"size": 14637,
		"path": "../public/assets/routes-C057WpOg.js"
	},
	"/assets/space-grotesk-latin-DPT1xrvW.woff2": {
		"type": "font/woff2",
		"etag": "\"5730-y+5yNMHXU+fGP46pvbGch/U3i/s\"",
		"mtime": "2026-11-15T20:57:40.325Z",
		"size": 22320,
		"path": "../public/assets/space-grotesk-latin-DPT1xrvW.woff2"
	},
	"/presets/cover.png": {
		"type": "image/png",
		"etag": "\"21d57-KTNiKPBelLGybLet5QV9ZJt0K3o\"",
		"mtime": "2026-11-15T20:57:42.331Z",
		"size": 138583,
		"path": "../public/presets/cover.png"
	},
	"/assets/space-grotesk-latin-ext-wJGaI8U0.woff2": {
		"type": "font/woff2",
		"etag": "\"49ec-HvqHdjQZgmp6U3ahYW+hnU6bwuQ\"",
		"mtime": "2026-11-15T20:57:40.325Z",
		"size": 18924,
		"path": "../public/assets/space-grotesk-latin-ext-wJGaI8U0.woff2"
	},
	"/presets/how-product-works.png": {
		"type": "image/png",
		"etag": "\"1d0f6-rBa8y5B4EGB5vWQgX9GqkaOLwag\"",
		"mtime": "2026-11-15T20:57:42.296Z",
		"size": 119030,
		"path": "../public/presets/how-product-works.png"
	},
	"/presets/explain.png": {
		"type": "image/png",
		"etag": "\"1c79a-Je0PTw9lkS4TOlkdJ4gaeYXtFlw\"",
		"mtime": "2026-11-15T20:57:42.301Z",
		"size": 116634,
		"path": "../public/presets/explain.png"
	},
	"/presets/hyper-motion.png": {
		"type": "image/png",
		"etag": "\"21cf8-fHTFdzFPMDdKbRwgINH53NsbiUk\"",
		"mtime": "2026-11-15T20:57:42.321Z",
		"size": 138488,
		"path": "../public/presets/hyper-motion.png"
	},
	"/assets/styles-Dw8z5AT3.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"54c9a-OrJx7RhU9Gj8jABkXgzyD/Qh7JQ\"",
		"mtime": "2026-11-15T20:57:40.326Z",
		"size": 347290,
		"path": "../public/assets/styles-Dw8z5AT3.css"
	},
	"/assets/space-grotesk-vietnamese-zl6yUm_6.woff2": {
		"type": "font/woff2",
		"etag": "\"1a74-nQIBUtKi93oKKuLBLvyTFS94pEw\"",
		"mtime": "2026-11-15T20:57:40.326Z",
		"size": 6772,
		"path": "../public/assets/space-grotesk-vietnamese-zl6yUm_6.woff2"
	}
};
// #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
// #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
// node_modules/nitro/dist/runtime/internal/static.mjs
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
// #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_625GQr = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_625GQr
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
// node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function createNitroApp() {
	const hooks = void 0;
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		{
			const routeRules = getRouteRules(method, pathname);
			event.context.routeRules = routeRules?.routeRules;
			if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		}
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
// node_modules/nitro/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
// #nitro/virtual/tracing
var tracingSrvxPlugins = [];
// node_modules/nitro/dist/presets/node/runtime/node-server.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: nitroApp.fetch,
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var node_server_default = {};
export { node_server_default as default };
