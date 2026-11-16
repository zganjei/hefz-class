import { i as __toESM, t as __commonJSMin } from "../../_runtime.mjs";
// node_modules/react/cjs/react.production.js
/**
* @license React
* react.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	var REACT_PORTAL_TYPE = Symbol.for("react.portal");
	var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
	var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
	var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
	var REACT_CONTEXT_TYPE = Symbol.for("react.context");
	var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
	var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
	var REACT_MEMO_TYPE = Symbol.for("react.memo");
	var REACT_LAZY_TYPE = Symbol.for("react.lazy");
	var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
	var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
	var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
	function getIteratorFn(maybeIterable) {
		if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
		maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
		return "function" === typeof maybeIterable ? maybeIterable : null;
	}
	var ReactNoopUpdateQueue = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	};
	var assign = Object.assign;
	var emptyObject = {};
	function Component(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	Component.prototype.isReactComponent = {};
	Component.prototype.setState = function(partialState, callback) {
		if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, partialState, callback, "setState");
	};
	Component.prototype.forceUpdate = function(callback) {
		this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
	};
	function ComponentDummy() {}
	ComponentDummy.prototype = Component.prototype;
	function PureComponent(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
	pureComponentPrototype.constructor = PureComponent;
	assign(pureComponentPrototype, Component.prototype);
	pureComponentPrototype.isPureReactComponent = !0;
	var isArrayImpl = Array.isArray;
	function noop() {}
	var ReactSharedInternals = {
		H: null,
		A: null,
		T: null,
		S: null
	};
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	function ReactElement(type, key, props) {
		var refProp = props.ref;
		return {
			$$typeof: REACT_ELEMENT_TYPE,
			type,
			key,
			ref: void 0 !== refProp ? refProp : null,
			props
		};
	}
	function cloneAndReplaceKey(oldElement, newKey) {
		return ReactElement(oldElement.type, newKey, oldElement.props);
	}
	function isValidElement(object) {
		return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
	}
	function escape(key) {
		var escaperLookup = {
			"=": "=0",
			":": "=2"
		};
		return "$" + key.replace(/[=:]/g, function(match) {
			return escaperLookup[match];
		});
	}
	var userProvidedKeyEscapeRegex = /\/+/g;
	function getElementKey(element, index) {
		return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
	}
	function resolveThenable(thenable) {
		switch (thenable.status) {
			case "fulfilled": return thenable.value;
			case "rejected": throw thenable.reason;
			default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
				"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
			}, function(error) {
				"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			})), thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
			}
		}
		throw thenable;
	}
	function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
		var type = typeof children;
		if ("undefined" === type || "boolean" === type) children = null;
		var invokeCallback = !1;
		if (null === children) invokeCallback = !0;
		else switch (type) {
			case "bigint":
			case "string":
			case "number":
				invokeCallback = !0;
				break;
			case "object": switch (children.$$typeof) {
				case REACT_ELEMENT_TYPE:
				case REACT_PORTAL_TYPE:
					invokeCallback = !0;
					break;
				case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
			}
		}
		if (invokeCallback) return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
			return c;
		})) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + invokeCallback)), array.push(callback)), 1;
		invokeCallback = 0;
		var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
		if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if (i = getIteratorFn(children), "function" === typeof i) for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if ("object" === type) {
			if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
			array = String(children);
			throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
		}
		return invokeCallback;
	}
	function mapChildren(children, func, context) {
		if (null == children) return children;
		var result = [], count = 0;
		mapIntoArray(children, result, "", "", function(child) {
			return func.call(context, child, count++);
		});
		return result;
	}
	function lazyInitializer(payload) {
		if (-1 === payload._status) {
			var ctor = payload._result, thenable = ctor();
			thenable.then(function(moduleObject) {
				if (0 === payload._status || -1 === payload._status) payload._status = 1, payload._result = moduleObject, void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
			}, function(error) {
				if (0 === payload._status || -1 === payload._status) payload._status = 2, payload._result = error, void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			});
			-1 === payload._status && (payload._status = 0, payload._result = thenable);
		}
		if (1 === payload._status) return payload._result.default;
		throw payload._result;
	}
	var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
		if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
			var event = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
				error
			});
			if (!window.dispatchEvent(event)) return;
		} else if ("object" === typeof process && "function" === typeof process.emit) {
			process.emit("uncaughtException", error);
			return;
		}
		console.error(error);
	};
	function startTransition(scope) {
		var prevTransition = ReactSharedInternals.T, currentTransition = {};
		currentTransition.types = null !== prevTransition ? prevTransition.types : null;
		ReactSharedInternals.T = currentTransition;
		try {
			var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
			null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
			"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
		} catch (error) {
			reportGlobalError(error);
		} finally {
			null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
		}
	}
	function addTransitionType(type) {
		var transition = ReactSharedInternals.T;
		if (null !== transition) {
			var transitionTypes = transition.types;
			null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
		} else startTransition(addTransitionType.bind(null, type));
	}
	var Children = {
		map: mapChildren,
		forEach: function(children, forEachFunc, forEachContext) {
			mapChildren(children, function() {
				forEachFunc.apply(this, arguments);
			}, forEachContext);
		},
		count: function(children) {
			var n = 0;
			mapChildren(children, function() {
				n++;
			});
			return n;
		},
		toArray: function(children) {
			return mapChildren(children, function(child) {
				return child;
			}) || [];
		},
		only: function(children) {
			if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
			return children;
		}
	};
	exports.Activity = REACT_ACTIVITY_TYPE;
	exports.Children = Children;
	exports.Component = Component;
	exports.Fragment = REACT_FRAGMENT_TYPE;
	exports.Profiler = REACT_PROFILER_TYPE;
	exports.PureComponent = PureComponent;
	exports.StrictMode = REACT_STRICT_MODE_TYPE;
	exports.Suspense = REACT_SUSPENSE_TYPE;
	exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
	exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
	exports.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(size) {
			return ReactSharedInternals.H.useMemoCache(size);
		}
	};
	exports.addTransitionType = addTransitionType;
	exports.cache = function(fn) {
		return function() {
			return fn.apply(null, arguments);
		};
	};
	exports.cacheSignal = function() {
		return null;
	};
	exports.cloneElement = function(element, config, children) {
		if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
		var props = assign({}, element.props), key = element.key;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
		var propName = arguments.length - 2;
		if (1 === propName) props.children = children;
		else if (1 < propName) {
			for (var childArray = Array(propName), i = 0; i < propName; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		return ReactElement(element.type, key, props);
	};
	exports.createContext = function(defaultValue) {
		defaultValue = {
			$$typeof: REACT_CONTEXT_TYPE,
			_currentValue: defaultValue,
			_currentValue2: defaultValue,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		};
		defaultValue.Provider = defaultValue;
		defaultValue.Consumer = {
			$$typeof: REACT_CONSUMER_TYPE,
			_context: defaultValue
		};
		return defaultValue;
	};
	exports.createElement = function(type, config, children) {
		var propName, props = {}, key = null;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
		var childrenLength = arguments.length - 2;
		if (1 === childrenLength) props.children = children;
		else if (1 < childrenLength) {
			for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === props[propName] && (props[propName] = childrenLength[propName]);
		return ReactElement(type, key, props);
	};
	exports.createRef = function() {
		return { current: null };
	};
	exports.forwardRef = function(render) {
		return {
			$$typeof: REACT_FORWARD_REF_TYPE,
			render
		};
	};
	exports.isValidElement = isValidElement;
	exports.lazy = function(ctor) {
		return {
			$$typeof: REACT_LAZY_TYPE,
			_payload: {
				_status: -1,
				_result: ctor
			},
			_init: lazyInitializer
		};
	};
	exports.memo = function(type, compare) {
		return {
			$$typeof: REACT_MEMO_TYPE,
			type,
			compare: void 0 === compare ? null : compare
		};
	};
	exports.startTransition = startTransition;
	exports.unstable_useCacheRefresh = function() {
		return ReactSharedInternals.H.useCacheRefresh();
	};
	exports.use = function(usable) {
		return ReactSharedInternals.H.use(usable);
	};
	exports.useActionState = function(action, initialState, permalink) {
		return ReactSharedInternals.H.useActionState(action, initialState, permalink);
	};
	exports.useCallback = function(callback, deps) {
		return ReactSharedInternals.H.useCallback(callback, deps);
	};
	exports.useContext = function(Context) {
		return ReactSharedInternals.H.useContext(Context);
	};
	exports.useDebugValue = function() {};
	exports.useDeferredValue = function(value, initialValue) {
		return ReactSharedInternals.H.useDeferredValue(value, initialValue);
	};
	exports.useEffect = function(create, deps) {
		return ReactSharedInternals.H.useEffect(create, deps);
	};
	exports.useEffectEvent = function(callback) {
		return ReactSharedInternals.H.useEffectEvent(callback);
	};
	exports.useId = function() {
		return ReactSharedInternals.H.useId();
	};
	exports.useImperativeHandle = function(ref, create, deps) {
		return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
	};
	exports.useInsertionEffect = function(create, deps) {
		return ReactSharedInternals.H.useInsertionEffect(create, deps);
	};
	exports.useLayoutEffect = function(create, deps) {
		return ReactSharedInternals.H.useLayoutEffect(create, deps);
	};
	exports.useMemo = function(create, deps) {
		return ReactSharedInternals.H.useMemo(create, deps);
	};
	exports.useOptimistic = function(passthrough, reducer) {
		return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
	};
	exports.useReducer = function(reducer, initialArg, init) {
		return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
	};
	exports.useRef = function(initialValue) {
		return ReactSharedInternals.H.useRef(initialValue);
	};
	exports.useState = function(initialState) {
		return ReactSharedInternals.H.useState(initialState);
	};
	exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
		return ReactSharedInternals.H.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	};
	exports.useTransition = function() {
		return ReactSharedInternals.H.useTransition();
	};
	exports.version = "19.3.1";
}));
// node_modules/react/index.js
var require_react = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_react_production();
}));
// node_modules/@base-ui/utils/esm/formatErrorMessage.js
/**
* Creates a formatErrorMessage function with a custom URL and prefix.
* @param baseUrl - The base URL for the error page (e.g., 'https://base-ui.com/production-error')
* @param prefix - The prefix for the error message (e.g., 'Base UI')
* @returns A function that formats error messages with the given URL and prefix
*/
function createFormatErrorMessage(baseUrl, prefix) {
	return function formatErrorMessage(code, ...args) {
		const url = new URL(baseUrl);
		url.searchParams.set("code", code.toString());
		args.forEach((arg) => url.searchParams.append("args[]", arg));
		return `${prefix} error #${code}; visit ${url} for the full message.`;
	};
}
/**
* WARNING: Don't import this directly. It's imported by the code generated by
* `@mui/internal-babel-plugin-minify-errors`. Make sure to always use string literals in `Error`
* constructors to ensure the plugin works as expected. Supported patterns include:
*   throw new Error('My message');
*   throw new Error(`My message: ${foo}`);
*   throw new Error(`My message: ${foo}` + 'another string');
*   ...
*/
var formatErrorMessage = createFormatErrorMessage("https://base-ui.com/production-error", "Base UI");
// node_modules/@base-ui/utils/esm/useRefWithInit.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var UNINITIALIZED = {};
/**
* A React.useRef() that is initialized with a function. Note that it accepts an optional
* initialization argument, so the initialization function doesn't need to be an inline closure.
*
* @usage
*   const ref = useRefWithInit(sortColumns, columns)
*/
function useRefWithInit(init, initArg) {
	const ref = import_react.useRef(UNINITIALIZED);
	if (ref.current === UNINITIALIZED) ref.current = init(initArg);
	return ref;
}
// node_modules/@base-ui/utils/esm/useMergedRefs.js
/**
* Merges refs into a single memoized callback ref or `null`.
* This makes sure multiple refs are updated together and have the same value.
*
* This function accepts up to four refs. If you need to merge more, or have an unspecified number of refs to merge,
* use `useMergedRefsN` instead.
*/
function useMergedRefs(a, b, c, d) {
	const forkRef = useRefWithInit(createForkRef).current;
	if (didChange(forkRef, a, b, c, d)) update(forkRef, [
		a,
		b,
		c,
		d
	]);
	return forkRef.callback;
}
/**
* Merges an array of refs into a single memoized callback ref or `null`.
*
* If you need to merge a fixed number (up to four) of refs, use `useMergedRefs` instead for better performance.
*/
function useMergedRefsN(refs) {
	const forkRef = useRefWithInit(createForkRef).current;
	if (didChangeN(forkRef, refs)) update(forkRef, refs);
	return forkRef.callback;
}
function createForkRef() {
	return {
		callback: null,
		cleanup: null,
		refs: []
	};
}
function didChange(forkRef, a, b, c, d) {
	return forkRef.refs[0] !== a || forkRef.refs[1] !== b || forkRef.refs[2] !== c || forkRef.refs[3] !== d;
}
function didChangeN(forkRef, newRefs) {
	return forkRef.refs.length !== newRefs.length || forkRef.refs.some((ref, index) => ref !== newRefs[index]);
}
function update(forkRef, refs) {
	forkRef.refs = refs;
	if (refs.every((ref) => ref == null)) {
		forkRef.callback = null;
		return;
	}
	forkRef.callback = (instance) => {
		if (forkRef.cleanup) {
			forkRef.cleanup();
			forkRef.cleanup = null;
		}
		if (instance != null) {
			const cleanupCallbacks = Array(refs.length).fill(null);
			for (let i = 0; i < refs.length; i += 1) {
				const ref = refs[i];
				if (ref == null) continue;
				switch (typeof ref) {
					case "function": {
						const refCleanup = ref(instance);
						if (typeof refCleanup === "function") cleanupCallbacks[i] = refCleanup;
						break;
					}
					case "object": ref.current = instance;
				}
			}
			forkRef.cleanup = () => {
				for (let i = 0; i < refs.length; i += 1) {
					const ref = refs[i];
					if (ref == null) continue;
					switch (typeof ref) {
						case "function": {
							const cleanupCallback = cleanupCallbacks[i];
							if (typeof cleanupCallback === "function") cleanupCallback();
							else ref(null);
							break;
						}
						case "object": ref.current = null;
					}
				}
			};
		}
	};
}
// node_modules/@base-ui/utils/esm/reactVersion.js
var majorVersion = parseInt("19.3.1", 10);
function isReactVersionAtLeast(reactVersionToCheck) {
	return majorVersion >= reactVersionToCheck;
}
// node_modules/@base-ui/utils/esm/getReactElementRef.js
/**
* Extracts the `ref` from a React element, handling different React versions.
*/
function getReactElementRef(element) {
	if (!/*#__PURE__*/ import_react.isValidElement(element)) return null;
	const reactElement = element;
	const propsWithRef = reactElement.props;
	return (isReactVersionAtLeast(19) ? propsWithRef?.ref : reactElement.ref) ?? null;
}
// node_modules/@base-ui/utils/esm/mergeObjects.js
function mergeObjects(a, b) {
	if (a && !b) return a;
	if (!a && b) return b;
	if (a || b) return {
		...a,
		...b
	};
}
Object.freeze([]);
var EMPTY_OBJECT = Object.freeze({});
// node_modules/@base-ui/react/esm/internals/getStateAttributesProps.js
function getStateAttributesProps(state, customMapping) {
	const props = {};
	for (const key in state) {
		const value = state[key];
		if (customMapping?.hasOwnProperty(key)) {
			const customProps = customMapping[key](value);
			if (customProps != null) Object.assign(props, customProps);
			continue;
		}
		if (value === true) props[`data-${key.toLowerCase()}`] = "";
		else if (value) props[`data-${key.toLowerCase()}`] = value.toString();
	}
	return props;
}
// node_modules/@base-ui/react/esm/utils/resolveClassName.js
/**
* If the provided className is a string, it will be returned as is.
* Otherwise, the function will call the className function with the state as the first argument.
*
* @param className
* @param state
*/
function resolveClassName(className, state) {
	return typeof className === "function" ? className(state) : className;
}
// node_modules/@base-ui/react/esm/utils/resolveStyle.js
/**
* If the provided style is an object, it will be returned as is.
* Otherwise, the function will call the style function with the state as the first argument.
*
* @param style
* @param state
*/
function resolveStyle(style, state) {
	return typeof style === "function" ? style(state) : style;
}
// node_modules/@base-ui/react/esm/merge-props/mergeProps.js
var EMPTY_PROPS = {};
/**
* Merges multiple sets of React props. It follows the Object.assign pattern where the rightmost object's fields overwrite
* the conflicting ones from others. This doesn't apply to event handlers, `className` and `style` props.
*
* Event handlers are merged and called in right-to-left order (rightmost handler executes first, leftmost last).
* For React synthetic events, the rightmost handler can prevent prior (left-positioned) handlers from executing
* by calling `event.preventBaseUIHandler()`. For non-synthetic events (custom events with primitive/object values),
* all handlers always execute without prevention capability.
*
* The `className` prop is merged by concatenating classes in right-to-left order (rightmost class appears first in the string).
* The `style` prop is merged with rightmost styles overwriting the prior ones.
*
* Props can either be provided as objects or as functions that take the previous props as an argument.
* The function will receive the merged props up to that point (going from left to right):
* so in the case of `(obj1, obj2, fn, obj3)`, `fn` will receive the merged props of `obj1` and `obj2`.
* The function is responsible for chaining event handlers if needed (that is, we don't run the merge logic).
*
* Event handlers returned by the functions are not automatically prevented when `preventBaseUIHandler` is called.
* They must check `event.baseUIHandlerPrevented` themselves and bail out if it's true.
*
* @important **`ref` is not merged.**
* @param a Props object to merge.
* @param b Props object to merge. The function will overwrite conflicting props from `a`.
* @param c Props object to merge. The function will overwrite conflicting props from previous parameters.
* @param d Props object to merge. The function will overwrite conflicting props from previous parameters.
* @param e Props object to merge. The function will overwrite conflicting props from previous parameters.
* @returns The merged props.
* @public
*/
function mergeProps(a, b, c, d, e) {
	if (!c && !d && !e && !a) return createInitialMergedProps(b);
	let merged = createInitialMergedProps(a);
	if (b) merged = mergeInto(merged, b);
	if (c) merged = mergeInto(merged, c);
	if (d) merged = mergeInto(merged, d);
	if (e) merged = mergeInto(merged, e);
	return merged;
}
/**
* Merges an arbitrary number of React props using the same logic as {@link mergeProps}.
* This function accepts an array of props instead of individual arguments.
*
* This has slightly lower performance than {@link mergeProps} due to accepting an array
* instead of a fixed number of arguments. Prefer {@link mergeProps} when merging 5 or
* fewer prop sets for better performance.
*
* @param props Array of props to merge.
* @returns The merged props.
* @see mergeProps
* @public
*/
function mergePropsN(props) {
	if (props.length === 0) return EMPTY_PROPS;
	if (props.length === 1) return createInitialMergedProps(props[0]);
	let merged = createInitialMergedProps(props[0]);
	for (let i = 1; i < props.length; i += 1) merged = mergeInto(merged, props[i]);
	return merged;
}
function createInitialMergedProps(inputProps) {
	if (isPropsGetter(inputProps)) return { ...resolvePropsGetter(inputProps, EMPTY_PROPS) };
	return copyInitialProps(inputProps);
}
function mergeInto(merged, inputProps) {
	if (isPropsGetter(inputProps)) return resolvePropsGetter(inputProps, merged);
	return mutablyMergeInto(merged, inputProps);
}
function copyInitialProps(inputProps) {
	const copiedProps = { ...inputProps };
	for (const propName in copiedProps) {
		const propValue = copiedProps[propName];
		if (isEventHandler(propName, propValue)) copiedProps[propName] = wrapEventHandler(propValue);
	}
	return copiedProps;
}
/**
* Merges two sets of props. In case of conflicts, the external props take precedence.
*/
function mutablyMergeInto(mergedProps, externalProps) {
	if (!externalProps) return mergedProps;
	for (const propName in externalProps) {
		const externalPropValue = externalProps[propName];
		switch (propName) {
			case "style":
				mergedProps[propName] = mergeObjects(mergedProps.style, externalPropValue);
				break;
			case "className":
				mergedProps[propName] = mergeClassNames(mergedProps.className, externalPropValue);
				break;
			default: if (isEventHandler(propName, externalPropValue)) mergedProps[propName] = mergeEventHandlers(mergedProps[propName], externalPropValue);
			else mergedProps[propName] = externalPropValue;
		}
	}
	return mergedProps;
}
function isEventHandler(key, value) {
	const code0 = key.charCodeAt(0);
	const code1 = key.charCodeAt(1);
	const code2 = key.charCodeAt(2);
	return code0 === 111 && code1 === 110 && code2 >= 65 && code2 <= 90 && (typeof value === "function" || typeof value === "undefined");
}
function isPropsGetter(inputProps) {
	return typeof inputProps === "function";
}
function resolvePropsGetter(inputProps, previousProps) {
	if (isPropsGetter(inputProps)) return inputProps(previousProps);
	return inputProps ?? EMPTY_PROPS;
}
function mergeEventHandlers(ourHandler, theirHandler) {
	if (!theirHandler) return ourHandler;
	if (!ourHandler) return wrapEventHandler(theirHandler);
	return (...args) => {
		const event = args[0];
		if (isSyntheticEvent(event)) {
			const baseUIEvent = event;
			makeEventPreventable(baseUIEvent);
			const result = theirHandler(...args);
			if (!baseUIEvent.baseUIHandlerPrevented) ourHandler?.(...args);
			return result;
		}
		const result = theirHandler(...args);
		ourHandler?.(...args);
		return result;
	};
}
function wrapEventHandler(handler) {
	if (!handler) return handler;
	return (...args) => {
		const event = args[0];
		if (isSyntheticEvent(event)) makeEventPreventable(event);
		return handler(...args);
	};
}
function makeEventPreventable(event) {
	event.preventBaseUIHandler = () => {
		event.baseUIHandlerPrevented = true;
	};
	return event;
}
function mergeClassNames(ourClassName, theirClassName) {
	if (theirClassName) {
		if (ourClassName) return theirClassName + " " + ourClassName;
		return theirClassName;
	}
	return ourClassName;
}
function isSyntheticEvent(event) {
	return event != null && typeof event === "object" && "nativeEvent" in event;
}
// node_modules/@base-ui/react/esm/internals/useRenderElement.js
/**
* Renders a Base UI element.
*
* @param element The default HTML element to render. Can be overridden by the `render` prop.
* @param componentProps An object containing the `render` and `className` props to be used for element customization. Other props are ignored.
* @param params Additional parameters for rendering the element.
*/
function useRenderElement(element, componentProps, params = {}) {
	const renderProp = componentProps.render;
	const outProps = useRenderElementProps(componentProps, params);
	if (params.enabled === false) return null;
	return evaluateRenderProp(element, renderProp, outProps, params.state ?? EMPTY_OBJECT);
}
/**
* Computes render element final props.
*/
function useRenderElementProps(componentProps, params = {}) {
	const { className: classNameProp, style: styleProp, render: renderProp } = componentProps;
	const { state = EMPTY_OBJECT, ref, props, stateAttributesMapping, enabled = true } = params;
	const className = enabled ? resolveClassName(classNameProp, state) : void 0;
	const style = enabled ? resolveStyle(styleProp, state) : void 0;
	const stateProps = enabled ? getStateAttributesProps(state, stateAttributesMapping) : EMPTY_OBJECT;
	const resolvedProps = enabled && props ? resolveRenderFunctionProps(props) : void 0;
	const outProps = enabled ? mergeObjects(stateProps, resolvedProps) ?? {} : EMPTY_OBJECT;
	if (typeof document !== "undefined") {
		if (!enabled) useMergedRefs(null, null);
		else if (Array.isArray(ref)) outProps.ref = useMergedRefsN([
			outProps.ref,
			getReactElementRef(renderProp),
			...ref
		]);
		else outProps.ref = useMergedRefs(outProps.ref, getReactElementRef(renderProp), ref);
	}
	if (!enabled) return EMPTY_OBJECT;
	if (className !== void 0) outProps.className = mergeClassNames(outProps.className, className);
	if (style !== void 0) outProps.style = mergeObjects(outProps.style, style);
	return outProps;
}
function resolveRenderFunctionProps(props) {
	if (Array.isArray(props)) return mergePropsN(props);
	return mergeProps(void 0, props);
}
var REACT_LAZY_TYPE = Symbol.for("react.lazy");
function evaluateRenderProp(element, render, props, state) {
	if (render) {
		if (typeof render === "function") return render(props, state);
		const mergedProps = mergeProps(props, render.props);
		mergedProps.ref = props.ref;
		let newElement = render;
		if (newElement?.$$typeof === REACT_LAZY_TYPE) newElement = import_react.Children.toArray(render)[0];
		return /*#__PURE__*/ import_react.cloneElement(newElement, mergedProps);
	}
	if (element) {
		if (typeof element === "string") return renderTag(element, props);
	}
	throw new Error(formatErrorMessage(8));
}
function renderTag(Tag, props) {
	if (Tag === "button") return /*#__PURE__*/ (0, import_react.createElement)("button", {
		type: "button",
		...props,
		key: props.key
	});
	if (Tag === "img") return /*#__PURE__*/ (0, import_react.createElement)("img", {
		alt: "",
		...props,
		key: props.key
	});
	return /*#__PURE__*/ import_react.createElement(Tag, props);
}
// node_modules/@base-ui/react/esm/use-render/useRender.js
/**
* Renders a Base UI element.
*
* @public
*/
function useRender(params) {
	return useRenderElement(params.defaultTagName ?? "div", params, params);
}
export { require_react as n, useRender as t };
