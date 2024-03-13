import { effectScope, reactive, hasInjectionContext, getCurrentInstance, inject, toRef, version, unref, h as h$1, shallowRef, shallowReactive, isReadonly, isRef, isShallow, isReactive, toRaw, defineAsyncComponent, defineComponent, ref, resolveDynamicComponent, openBlock, createBlock, mergeProps, provide, createElementBlock, computed, Suspense, nextTick, Transition, watch, withCtx, createVNode, useSSRContext, onErrorCaptured, onServerPrefetch, createApp } from "vue";
import { useRuntimeConfig as useRuntimeConfig$1 } from "#internal/nitro";
import { $fetch } from "ofetch";
import { createHooks } from "hookable";
import { getContext } from "unctx";
import { sanitizeStatusCode, createError as createError$1 } from "h3";
import { getActiveHead } from "unhead";
import { defineHeadPlugin } from "@unhead/shared";
import { START_LOCATION, createMemoryHistory, createRouter, useRoute as useRoute$1, RouterView } from "vue-router";
import { withQuery, hasProtocol, parseURL, isScriptProtocol, joinURL } from "ufo";
import { defu } from "defu";
import "klona";
import "devalue";
import "destr";
import { ssrRenderComponent, ssrRenderSuspense, ssrRenderVNode } from "vue/server-renderer";
const appConfig = useRuntimeConfig$1().app;
const baseURL = () => appConfig.baseURL;
if (!globalThis.$fetch) {
  globalThis.$fetch = $fetch.create({
    baseURL: baseURL()
  });
}
const nuxtAppCtx = /* @__PURE__ */ getContext("nuxt-app", {
  asyncContext: false
});
const NuxtPluginIndicator = "__nuxt_plugin";
function createNuxtApp(options) {
  let hydratingCount = 0;
  const nuxtApp = {
    _scope: effectScope(),
    provide: void 0,
    globalName: "nuxt",
    versions: {
      get nuxt() {
        return "3.10.3";
      },
      get vue() {
        return nuxtApp.vueApp.version;
      }
    },
    payload: reactive({
      data: {},
      state: {},
      once: /* @__PURE__ */ new Set(),
      _errors: {},
      ...{ serverRendered: true }
    }),
    static: {
      data: {}
    },
    runWithContext: (fn) => nuxtApp._scope.run(() => callWithNuxt(nuxtApp, fn)),
    isHydrating: false,
    deferHydration() {
      if (!nuxtApp.isHydrating) {
        return () => {
        };
      }
      hydratingCount++;
      let called = false;
      return () => {
        if (called) {
          return;
        }
        called = true;
        hydratingCount--;
        if (hydratingCount === 0) {
          nuxtApp.isHydrating = false;
          return nuxtApp.callHook("app:suspense:resolve");
        }
      };
    },
    _asyncDataPromises: {},
    _asyncData: {},
    _payloadRevivers: {},
    ...options
  };
  nuxtApp.hooks = createHooks();
  nuxtApp.hook = nuxtApp.hooks.hook;
  {
    const contextCaller = async function(hooks, args) {
      for (const hook of hooks) {
        await nuxtApp.runWithContext(() => hook(...args));
      }
    };
    nuxtApp.hooks.callHook = (name, ...args) => nuxtApp.hooks.callHookWith(contextCaller, name, ...args);
  }
  nuxtApp.callHook = nuxtApp.hooks.callHook;
  nuxtApp.provide = (name, value) => {
    const $name = "$" + name;
    defineGetter(nuxtApp, $name, value);
    defineGetter(nuxtApp.vueApp.config.globalProperties, $name, value);
  };
  defineGetter(nuxtApp.vueApp, "$nuxt", nuxtApp);
  defineGetter(nuxtApp.vueApp.config.globalProperties, "$nuxt", nuxtApp);
  {
    if (nuxtApp.ssrContext) {
      nuxtApp.ssrContext.nuxt = nuxtApp;
      nuxtApp.ssrContext._payloadReducers = {};
      nuxtApp.payload.path = nuxtApp.ssrContext.url;
    }
    nuxtApp.ssrContext = nuxtApp.ssrContext || {};
    if (nuxtApp.ssrContext.payload) {
      Object.assign(nuxtApp.payload, nuxtApp.ssrContext.payload);
    }
    nuxtApp.ssrContext.payload = nuxtApp.payload;
    nuxtApp.ssrContext.config = {
      public: options.ssrContext.runtimeConfig.public,
      app: options.ssrContext.runtimeConfig.app
    };
  }
  const runtimeConfig = options.ssrContext.runtimeConfig;
  nuxtApp.provide("config", runtimeConfig);
  return nuxtApp;
}
async function applyPlugin(nuxtApp, plugin2) {
  if (plugin2.hooks) {
    nuxtApp.hooks.addHooks(plugin2.hooks);
  }
  if (typeof plugin2 === "function") {
    const { provide: provide2 } = await nuxtApp.runWithContext(() => plugin2(nuxtApp)) || {};
    if (provide2 && typeof provide2 === "object") {
      for (const key in provide2) {
        nuxtApp.provide(key, provide2[key]);
      }
    }
  }
}
async function applyPlugins(nuxtApp, plugins2) {
  var _a, _b;
  const resolvedPlugins = [];
  const unresolvedPlugins = [];
  const parallels = [];
  const errors = [];
  let promiseDepth = 0;
  async function executePlugin(plugin2) {
    var _a2;
    const unresolvedPluginsForThisPlugin = ((_a2 = plugin2.dependsOn) == null ? void 0 : _a2.filter((name) => plugins2.some((p) => p._name === name) && !resolvedPlugins.includes(name))) ?? [];
    if (unresolvedPluginsForThisPlugin.length > 0) {
      unresolvedPlugins.push([new Set(unresolvedPluginsForThisPlugin), plugin2]);
    } else {
      const promise = applyPlugin(nuxtApp, plugin2).then(async () => {
        if (plugin2._name) {
          resolvedPlugins.push(plugin2._name);
          await Promise.all(unresolvedPlugins.map(async ([dependsOn, unexecutedPlugin]) => {
            if (dependsOn.has(plugin2._name)) {
              dependsOn.delete(plugin2._name);
              if (dependsOn.size === 0) {
                promiseDepth++;
                await executePlugin(unexecutedPlugin);
              }
            }
          }));
        }
      });
      if (plugin2.parallel) {
        parallels.push(promise.catch((e) => errors.push(e)));
      } else {
        await promise;
      }
    }
  }
  for (const plugin2 of plugins2) {
    if (((_a = nuxtApp.ssrContext) == null ? void 0 : _a.islandContext) && ((_b = plugin2.env) == null ? void 0 : _b.islands) === false) {
      continue;
    }
    await executePlugin(plugin2);
  }
  await Promise.all(parallels);
  if (promiseDepth) {
    for (let i = 0; i < promiseDepth; i++) {
      await Promise.all(parallels);
    }
  }
  if (errors.length) {
    throw errors[0];
  }
}
// @__NO_SIDE_EFFECTS__
function defineNuxtPlugin(plugin2) {
  if (typeof plugin2 === "function") {
    return plugin2;
  }
  const _name = plugin2._name || plugin2.name;
  delete plugin2.name;
  return Object.assign(plugin2.setup || (() => {
  }), plugin2, { [NuxtPluginIndicator]: true, _name });
}
function callWithNuxt(nuxt, setup, args) {
  const fn = () => args ? setup(...args) : setup();
  {
    return nuxt.vueApp.runWithContext(() => nuxtAppCtx.callAsync(nuxt, fn));
  }
}
// @__NO_SIDE_EFFECTS__
function tryUseNuxtApp() {
  var _a;
  let nuxtAppInstance;
  if (hasInjectionContext()) {
    nuxtAppInstance = (_a = getCurrentInstance()) == null ? void 0 : _a.appContext.app.$nuxt;
  }
  nuxtAppInstance = nuxtAppInstance || nuxtAppCtx.tryUse();
  return nuxtAppInstance || null;
}
// @__NO_SIDE_EFFECTS__
function useNuxtApp() {
  const nuxtAppInstance = /* @__PURE__ */ tryUseNuxtApp();
  if (!nuxtAppInstance) {
    {
      throw new Error("[nuxt] instance unavailable");
    }
  }
  return nuxtAppInstance;
}
// @__NO_SIDE_EFFECTS__
function useRuntimeConfig(_event) {
  return (/* @__PURE__ */ useNuxtApp()).$config;
}
function defineGetter(obj, key, val) {
  Object.defineProperty(obj, key, { get: () => val });
}
const LayoutMetaSymbol = Symbol("layout-meta");
const PageRouteSymbol = Symbol("route");
const useRouter = () => {
  var _a;
  return (_a = /* @__PURE__ */ useNuxtApp()) == null ? void 0 : _a.$router;
};
const useRoute = () => {
  if (hasInjectionContext()) {
    return inject(PageRouteSymbol, (/* @__PURE__ */ useNuxtApp())._route);
  }
  return (/* @__PURE__ */ useNuxtApp())._route;
};
// @__NO_SIDE_EFFECTS__
function defineNuxtRouteMiddleware(middleware) {
  return middleware;
}
const isProcessingMiddleware = () => {
  try {
    if ((/* @__PURE__ */ useNuxtApp())._processingMiddleware) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
};
const navigateTo = (to, options) => {
  if (!to) {
    to = "/";
  }
  const toPath = typeof to === "string" ? to : withQuery(to.path || "/", to.query || {}) + (to.hash || "");
  if (options == null ? void 0 : options.open) {
    return Promise.resolve();
  }
  const isExternal = (options == null ? void 0 : options.external) || hasProtocol(toPath, { acceptRelative: true });
  if (isExternal) {
    if (!(options == null ? void 0 : options.external)) {
      throw new Error("Navigating to an external URL is not allowed by default. Use `navigateTo(url, { external: true })`.");
    }
    const protocol = parseURL(toPath).protocol;
    if (protocol && isScriptProtocol(protocol)) {
      throw new Error(`Cannot navigate to a URL with '${protocol}' protocol.`);
    }
  }
  const inMiddleware = isProcessingMiddleware();
  const router = useRouter();
  const nuxtApp = /* @__PURE__ */ useNuxtApp();
  {
    if (nuxtApp.ssrContext) {
      const fullPath = typeof to === "string" || isExternal ? toPath : router.resolve(to).fullPath || "/";
      const location2 = isExternal ? toPath : joinURL((/* @__PURE__ */ useRuntimeConfig()).app.baseURL, fullPath);
      const redirect = async function(response) {
        await nuxtApp.callHook("app:redirected");
        const encodedLoc = location2.replace(/"/g, "%22");
        nuxtApp.ssrContext._renderResponse = {
          statusCode: sanitizeStatusCode((options == null ? void 0 : options.redirectCode) || 302, 302),
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          headers: { location: location2 }
        };
        return response;
      };
      if (!isExternal && inMiddleware) {
        router.afterEach((final) => final.fullPath === fullPath ? redirect(false) : void 0);
        return to;
      }
      return redirect(!inMiddleware ? void 0 : (
        /* abort route navigation */
        false
      ));
    }
  }
  if (isExternal) {
    nuxtApp._scope.stop();
    if (options == null ? void 0 : options.replace) {
      (void 0).replace(toPath);
    } else {
      (void 0).href = toPath;
    }
    if (inMiddleware) {
      if (!nuxtApp.isHydrating) {
        return false;
      }
      return new Promise(() => {
      });
    }
    return Promise.resolve();
  }
  return (options == null ? void 0 : options.replace) ? router.replace(to) : router.push(to);
};
const NUXT_ERROR_SIGNATURE = "__nuxt_error";
const useError = () => toRef((/* @__PURE__ */ useNuxtApp()).payload, "error");
const showError = (error) => {
  const nuxtError = createError(error);
  try {
    const nuxtApp = /* @__PURE__ */ useNuxtApp();
    const error2 = useError();
    if (false)
      ;
    error2.value = error2.value || nuxtError;
  } catch {
    throw nuxtError;
  }
  return nuxtError;
};
const isNuxtError = (error) => !!error && typeof error === "object" && NUXT_ERROR_SIGNATURE in error;
const createError = (error) => {
  const nuxtError = createError$1(error);
  Object.defineProperty(nuxtError, NUXT_ERROR_SIGNATURE, {
    value: true,
    configurable: false,
    writable: false
  });
  return nuxtError;
};
version.startsWith("3");
function resolveUnref(r) {
  return typeof r === "function" ? r() : unref(r);
}
function resolveUnrefHeadInput(ref2, lastKey = "") {
  if (ref2 instanceof Promise)
    return ref2;
  const root = resolveUnref(ref2);
  if (!ref2 || !root)
    return root;
  if (Array.isArray(root))
    return root.map((r) => resolveUnrefHeadInput(r, lastKey));
  if (typeof root === "object") {
    return Object.fromEntries(
      Object.entries(root).map(([k2, v2]) => {
        if (k2 === "titleTemplate" || k2.startsWith("on"))
          return [k2, unref(v2)];
        return [k2, resolveUnrefHeadInput(v2, k2)];
      })
    );
  }
  return root;
}
defineHeadPlugin({
  hooks: {
    "entries:resolve": function(ctx) {
      for (const entry2 of ctx.entries)
        entry2.resolvedInput = resolveUnrefHeadInput(entry2.input);
    }
  }
});
const headSymbol = "usehead";
const _global = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
const globalKey$1 = "__unhead_injection_handler__";
function setHeadInjectionHandler(handler) {
  _global[globalKey$1] = handler;
}
function injectHead() {
  if (globalKey$1 in _global) {
    return _global[globalKey$1]();
  }
  const head = inject(headSymbol);
  if (!head && process.env.NODE_ENV !== "production")
    console.warn("Unhead is missing Vue context, falling back to shared context. This may have unexpected results.");
  return head || getActiveHead();
}
const unhead_KgADcZ0jPj = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:head",
  enforce: "pre",
  setup(nuxtApp) {
    const head = nuxtApp.ssrContext.head;
    setHeadInjectionHandler(
      // need a fresh instance of the nuxt app to avoid parallel requests interfering with each other
      () => (/* @__PURE__ */ useNuxtApp()).vueApp._context.provides.usehead
    );
    nuxtApp.vueApp.use(head);
  }
});
function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als && currentInstance === void 0) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      contexts[key];
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
_globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());
function executeAsync(function_) {
  const restores = [];
  for (const leaveHandler of asyncHandlers) {
    const restore2 = leaveHandler();
    if (restore2) {
      restores.push(restore2);
    }
  }
  const restore = () => {
    for (const restore2 of restores) {
      restore2();
    }
  };
  let awaitable = function_();
  if (awaitable && typeof awaitable === "object" && "catch" in awaitable) {
    awaitable = awaitable.catch((error) => {
      restore();
      throw error;
    });
  }
  return [awaitable, restore];
}
const interpolatePath = (route, match) => {
  return match.path.replace(/(:\w+)\([^)]+\)/g, "$1").replace(/(:\w+)[?+*]/g, "$1").replace(/:\w+/g, (r) => {
    var _a;
    return ((_a = route.params[r.slice(1)]) == null ? void 0 : _a.toString()) || "";
  });
};
const generateRouteKey$1 = (routeProps, override) => {
  const matchedRoute = routeProps.route.matched.find((m2) => {
    var _a;
    return ((_a = m2.components) == null ? void 0 : _a.default) === routeProps.Component.type;
  });
  const source = override ?? (matchedRoute == null ? void 0 : matchedRoute.meta.key) ?? (matchedRoute && interpolatePath(routeProps.route, matchedRoute));
  return typeof source === "function" ? source(routeProps.route) : source;
};
const wrapInKeepAlive = (props, children) => {
  return { default: () => children };
};
function toArray(value) {
  return Array.isArray(value) ? value : [value];
}
const __nuxt_page_meta = null;
const _routes = [
  {
    name: "index",
    path: "/",
    meta: {},
    alias: [],
    redirect: __nuxt_page_meta == null ? void 0 : __nuxt_page_meta.redirect,
    component: () => import("./_nuxt/index-D-fp-k7O.js").then((m2) => m2.default || m2)
  }
];
const _wrapIf = (component, props, slots) => {
  props = props === true ? {} : props;
  return { default: () => {
    var _a;
    return props ? h$1(component, props, slots) : (_a = slots.default) == null ? void 0 : _a.call(slots);
  } };
};
function generateRouteKey(route) {
  const source = (route == null ? void 0 : route.meta.key) ?? route.path.replace(/(:\w+)\([^)]+\)/g, "$1").replace(/(:\w+)[?+*]/g, "$1").replace(/:\w+/g, (r) => {
    var _a;
    return ((_a = route.params[r.slice(1)]) == null ? void 0 : _a.toString()) || "";
  });
  return typeof source === "function" ? source(route) : source;
}
function isChangingPage(to, from) {
  if (to === from || from === START_LOCATION) {
    return false;
  }
  if (generateRouteKey(to) !== generateRouteKey(from)) {
    return true;
  }
  const areComponentsSame = to.matched.every(
    (comp, index) => {
      var _a, _b;
      return comp.components && comp.components.default === ((_b = (_a = from.matched[index]) == null ? void 0 : _a.components) == null ? void 0 : _b.default);
    }
  );
  if (areComponentsSame) {
    return false;
  }
  return true;
}
const appLayoutTransition = false;
const appPageTransition = false;
const appKeepalive = false;
const nuxtLinkDefaults = { "componentName": "NuxtLink" };
const routerOptions0 = {
  scrollBehavior(to, from, savedPosition) {
    var _a;
    const nuxtApp = /* @__PURE__ */ useNuxtApp();
    const behavior = ((_a = useRouter().options) == null ? void 0 : _a.scrollBehaviorType) ?? "auto";
    let position = savedPosition || void 0;
    const routeAllowsScrollToTop = typeof to.meta.scrollToTop === "function" ? to.meta.scrollToTop(to, from) : to.meta.scrollToTop;
    if (!position && from && to && routeAllowsScrollToTop !== false && isChangingPage(to, from)) {
      position = { left: 0, top: 0 };
    }
    if (to.path === from.path) {
      if (from.hash && !to.hash) {
        return { left: 0, top: 0 };
      }
      if (to.hash) {
        return { el: to.hash, top: _getHashElementScrollMarginTop(to.hash), behavior };
      }
      return false;
    }
    const hasTransition = (route) => !!(route.meta.pageTransition ?? appPageTransition);
    const hookToWait = hasTransition(from) && hasTransition(to) ? "page:transition:finish" : "page:finish";
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce(hookToWait, async () => {
        await new Promise((resolve2) => setTimeout(resolve2, 0));
        if (to.hash) {
          position = { el: to.hash, top: _getHashElementScrollMarginTop(to.hash), behavior };
        }
        resolve(position);
      });
    });
  }
};
function _getHashElementScrollMarginTop(selector) {
  try {
    const elem = (void 0).querySelector(selector);
    if (elem) {
      return parseFloat(getComputedStyle(elem).scrollMarginTop);
    }
  } catch {
  }
  return 0;
}
const configRouterOptions = {
  hashMode: false,
  scrollBehaviorType: "auto"
};
const routerOptions = {
  ...configRouterOptions,
  ...routerOptions0
};
const validate = /* @__PURE__ */ defineNuxtRouteMiddleware(async (to) => {
  var _a;
  let __temp, __restore;
  if (!((_a = to.meta) == null ? void 0 : _a.validate)) {
    return;
  }
  useRouter();
  const result = ([__temp, __restore] = executeAsync(() => Promise.resolve(to.meta.validate(to))), __temp = await __temp, __restore(), __temp);
  if (result === true) {
    return;
  }
  {
    return result;
  }
});
const manifest_45route_45rule = /* @__PURE__ */ defineNuxtRouteMiddleware(async (to) => {
  {
    return;
  }
});
const globalMiddleware = [
  validate,
  manifest_45route_45rule
];
const namedMiddleware = {};
const plugin = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:router",
  enforce: "pre",
  async setup(nuxtApp) {
    var _a, _b, _c;
    let __temp, __restore;
    let routerBase = (/* @__PURE__ */ useRuntimeConfig()).app.baseURL;
    if (routerOptions.hashMode && !routerBase.includes("#")) {
      routerBase += "#";
    }
    const history = ((_a = routerOptions.history) == null ? void 0 : _a.call(routerOptions, routerBase)) ?? createMemoryHistory(routerBase);
    const routes = ((_b = routerOptions.routes) == null ? void 0 : _b.call(routerOptions, _routes)) ?? _routes;
    let startPosition;
    const initialURL = nuxtApp.ssrContext.url;
    const router = createRouter({
      ...routerOptions,
      scrollBehavior: (to, from, savedPosition) => {
        if (from === START_LOCATION) {
          startPosition = savedPosition;
          return;
        }
        if (routerOptions.scrollBehavior) {
          router.options.scrollBehavior = routerOptions.scrollBehavior;
          if ("scrollRestoration" in (void 0).history) {
            const unsub = router.beforeEach(() => {
              unsub();
              (void 0).history.scrollRestoration = "manual";
            });
          }
          return routerOptions.scrollBehavior(to, START_LOCATION, startPosition || savedPosition);
        }
      },
      history,
      routes
    });
    nuxtApp.vueApp.use(router);
    const previousRoute = shallowRef(router.currentRoute.value);
    router.afterEach((_to, from) => {
      previousRoute.value = from;
    });
    Object.defineProperty(nuxtApp.vueApp.config.globalProperties, "previousRoute", {
      get: () => previousRoute.value
    });
    const _route = shallowRef(router.resolve(initialURL));
    const syncCurrentRoute = () => {
      _route.value = router.currentRoute.value;
    };
    nuxtApp.hook("page:finish", syncCurrentRoute);
    router.afterEach((to, from) => {
      var _a2, _b2, _c2, _d;
      if (((_b2 = (_a2 = to.matched[0]) == null ? void 0 : _a2.components) == null ? void 0 : _b2.default) === ((_d = (_c2 = from.matched[0]) == null ? void 0 : _c2.components) == null ? void 0 : _d.default)) {
        syncCurrentRoute();
      }
    });
    const route = {};
    for (const key in _route.value) {
      Object.defineProperty(route, key, {
        get: () => _route.value[key]
      });
    }
    nuxtApp._route = shallowReactive(route);
    nuxtApp._middleware = nuxtApp._middleware || {
      global: [],
      named: {}
    };
    useError();
    try {
      if (true) {
        ;
        [__temp, __restore] = executeAsync(() => router.push(initialURL)), await __temp, __restore();
        ;
      }
      ;
      [__temp, __restore] = executeAsync(() => router.isReady()), await __temp, __restore();
      ;
    } catch (error2) {
      [__temp, __restore] = executeAsync(() => nuxtApp.runWithContext(() => showError(error2))), await __temp, __restore();
    }
    if ((_c = nuxtApp.ssrContext) == null ? void 0 : _c.islandContext) {
      return { provide: { router } };
    }
    const initialLayout = nuxtApp.payload.state._layout;
    router.beforeEach(async (to, from) => {
      var _a2, _b2;
      await nuxtApp.callHook("page:loading:start");
      to.meta = reactive(to.meta);
      if (nuxtApp.isHydrating && initialLayout && !isReadonly(to.meta.layout)) {
        to.meta.layout = initialLayout;
      }
      nuxtApp._processingMiddleware = true;
      if (!((_a2 = nuxtApp.ssrContext) == null ? void 0 : _a2.islandContext)) {
        const middlewareEntries = /* @__PURE__ */ new Set([...globalMiddleware, ...nuxtApp._middleware.global]);
        for (const component of to.matched) {
          const componentMiddleware = component.meta.middleware;
          if (!componentMiddleware) {
            continue;
          }
          for (const entry2 of toArray(componentMiddleware)) {
            middlewareEntries.add(entry2);
          }
        }
        for (const entry2 of middlewareEntries) {
          const middleware = typeof entry2 === "string" ? nuxtApp._middleware.named[entry2] || await ((_b2 = namedMiddleware[entry2]) == null ? void 0 : _b2.call(namedMiddleware).then((r) => r.default || r)) : entry2;
          if (!middleware) {
            throw new Error(`Unknown route middleware: '${entry2}'.`);
          }
          const result = await nuxtApp.runWithContext(() => middleware(to, from));
          {
            if (result === false || result instanceof Error) {
              const error2 = result || createError$1({
                statusCode: 404,
                statusMessage: `Page Not Found: ${initialURL}`
              });
              await nuxtApp.runWithContext(() => showError(error2));
              return false;
            }
          }
          if (result === true) {
            continue;
          }
          if (result || result === false) {
            return result;
          }
        }
      }
    });
    router.onError(async () => {
      delete nuxtApp._processingMiddleware;
      await nuxtApp.callHook("page:loading:end");
    });
    router.afterEach(async (to, _from, failure) => {
      delete nuxtApp._processingMiddleware;
      if (failure) {
        await nuxtApp.callHook("page:loading:end");
      }
      if ((failure == null ? void 0 : failure.type) === 4) {
        return;
      }
      if (to.matched.length === 0) {
        await nuxtApp.runWithContext(() => showError(createError$1({
          statusCode: 404,
          fatal: false,
          statusMessage: `Page not found: ${to.fullPath}`,
          data: {
            path: to.fullPath
          }
        })));
      } else if (to.redirectedFrom && to.fullPath !== initialURL) {
        await nuxtApp.runWithContext(() => navigateTo(to.fullPath || "/"));
      }
    });
    nuxtApp.hooks.hookOnce("app:created", async () => {
      try {
        const to = router.resolve(initialURL);
        if ("name" in to) {
          to.name = void 0;
        }
        await router.replace({
          ...to,
          force: true
        });
        router.options.scrollBehavior = routerOptions.scrollBehavior;
      } catch (error2) {
        await nuxtApp.runWithContext(() => showError(error2));
      }
    });
    return { provide: { router } };
  }
});
function definePayloadReducer(name, reduce) {
  {
    (/* @__PURE__ */ useNuxtApp()).ssrContext._payloadReducers[name] = reduce;
  }
}
const reducers = {
  NuxtError: (data) => isNuxtError(data) && data.toJSON(),
  EmptyShallowRef: (data) => isRef(data) && isShallow(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_"),
  EmptyRef: (data) => isRef(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_"),
  ShallowRef: (data) => isRef(data) && isShallow(data) && data.value,
  ShallowReactive: (data) => isReactive(data) && isShallow(data) && toRaw(data),
  Ref: (data) => isRef(data) && data.value,
  Reactive: (data) => isReactive(data) && toRaw(data)
};
const revive_payload_server_eJ33V7gbc6 = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:revive-payload:server",
  setup() {
    for (const reducer in reducers) {
      definePayloadReducer(reducer, reducers[reducer]);
    }
  }
});
const LazyFeature = defineAsyncComponent(() => import("./_nuxt/Feature-tRGk_CQI.js").then((r) => r.default));
const LazyGrid = defineAsyncComponent(() => import("./_nuxt/Grid-BfP1yYiX.js").then((r) => r.default));
const LazyPage = defineAsyncComponent(() => import("./_nuxt/Page-Bty_3pFI.js").then((r) => r.default));
const LazyTeaser = defineAsyncComponent(() => import("./_nuxt/Teaser-CU1NNxVO.js").then((r) => r.default));
const lazyGlobalComponents = [
  ["Feature", LazyFeature],
  ["Grid", LazyGrid],
  ["Page", LazyPage],
  ["Teaser", LazyTeaser]
];
const components_plugin_KR1HBZs4kY = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:global-components",
  setup(nuxtApp) {
    for (const [name, component] of lazyGlobalComponents) {
      nuxtApp.vueApp.component(name, component);
      nuxtApp.vueApp.component("Lazy" + name, component);
    }
  }
});
const H = (i) => new Promise((e, t) => {
  return;
});
var q = Object.defineProperty, V = (i, e, t) => e in i ? q(i, e, { enumerable: true, configurable: true, writable: true, value: t }) : i[e] = t, h = (i, e, t) => (V(i, typeof e != "symbol" ? e + "" : e, t), t);
function C(i) {
  return !(i !== i || i === 1 / 0 || i === -1 / 0);
}
function D(i, e, t) {
  if (!C(e))
    throw new TypeError("Expected `limit` to be a finite number");
  if (!C(t))
    throw new TypeError("Expected `interval` to be a finite number");
  const s = [];
  let r = [], o = 0;
  const n = function() {
    o++;
    const a = setTimeout(function() {
      o--, s.length > 0 && n(), r = r.filter(function(u) {
        return u !== a;
      });
    }, t);
    r.indexOf(a) < 0 && r.push(a);
    const c = s.shift();
    c.resolve(i.apply(c.self, c.args));
  }, l = function(...a) {
    const c = this;
    return new Promise(function(u, p) {
      s.push({
        resolve: u,
        reject: p,
        args: a,
        self: c
      }), o < e && n();
    });
  };
  return l.abort = function() {
    r.forEach(clearTimeout), r = [], s.forEach(function(a) {
      a.reject(function() {
        Error.call(this, "Throttled function aborted"), this.name = "AbortError";
      });
    }), s.length = 0;
  }, l;
}
class k {
  constructor() {
    h(this, "isCDNUrl", (e = "") => e.indexOf("/cdn/") > -1), h(this, "getOptionsPage", (e, t = 25, s = 1) => ({
      ...e,
      per_page: t,
      page: s
    })), h(this, "delay", (e) => new Promise((t) => setTimeout(t, e))), h(this, "arrayFrom", (e = 0, t) => [...Array(e)].map(t)), h(this, "range", (e = 0, t = e) => {
      const s = Math.abs(t - e) || 0, r = e < t ? 1 : -1;
      return this.arrayFrom(s, (o, n) => n * r + e);
    }), h(this, "asyncMap", async (e, t) => Promise.all(e.map(t))), h(this, "flatMap", (e = [], t) => e.map(t).reduce((s, r) => [...s, ...r], [])), h(this, "escapeHTML", function(e) {
      const t = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }, s = /[&<>"']/g, r = RegExp(s.source);
      return e && r.test(e) ? e.replace(s, (o) => t[o]) : e;
    });
  }
  /**
   * @method stringify
   * @param  {Object} params
   * @param  {String} prefix
   * @param  {Boolean} isArray
   * @return {String} Stringified object
   */
  stringify(e, t, s) {
    const r = [];
    for (const o in e) {
      if (!Object.prototype.hasOwnProperty.call(e, o))
        continue;
      const n = e[o], l = s ? "" : encodeURIComponent(o);
      let a;
      typeof n == "object" ? a = this.stringify(
        n,
        t ? t + encodeURIComponent("[" + l + "]") : l,
        Array.isArray(n)
      ) : a = (t ? t + encodeURIComponent("[" + l + "]") : l) + "=" + encodeURIComponent(n), r.push(a);
    }
    return r.join("&");
  }
  /**
   * @method getRegionURL
   * @param  {String} regionCode region code, could be eu, us, cn, ap or ca
   * @return {String} The base URL of the region
   */
  getRegionURL(e) {
    const t = "api.storyblok.com", s = "api-us.storyblok.com", r = "app.storyblokchina.cn", o = "api-ap.storyblok.com", n = "api-ca.storyblok.com";
    switch (e) {
      case "us":
        return s;
      case "cn":
        return r;
      case "ap":
        return o;
      case "ca":
        return n;
      default:
        return t;
    }
  }
}
const B = function(i, e) {
  const t = {};
  for (const s in i) {
    const r = i[s];
    e.indexOf(s) > -1 && r !== null && (t[s] = r);
  }
  return t;
}, J = (i) => i === "email", K = () => ({
  singleTag: "hr"
}), Y = () => ({
  tag: "blockquote"
}), W = () => ({
  tag: "ul"
}), G = (i) => ({
  tag: [
    "pre",
    {
      tag: "code",
      attrs: i.attrs
    }
  ]
}), Q = () => ({
  singleTag: "br"
}), X = (i) => ({
  tag: `h${i.attrs.level}`
}), Z = (i) => ({
  singleTag: [
    {
      tag: "img",
      attrs: B(i.attrs, ["src", "alt", "title"])
    }
  ]
}), ee = () => ({
  tag: "li"
}), te = () => ({
  tag: "ol"
}), se = () => ({
  tag: "p"
}), re = (i) => ({
  tag: [
    {
      tag: "span",
      attrs: {
        "data-type": "emoji",
        "data-name": i.attrs.name,
        emoji: i.attrs.emoji
      }
    }
  ]
}), oe = () => ({
  tag: "b"
}), ie = () => ({
  tag: "s"
}), ne = () => ({
  tag: "u"
}), ae = () => ({
  tag: "strong"
}), le = () => ({
  tag: "code"
}), ce = () => ({
  tag: "i"
}), he = (i) => {
  if (!i.attrs)
    return {
      tag: ""
    };
  const e = new k().escapeHTML, t = { ...i.attrs }, { linktype: s = "url" } = i.attrs;
  if (delete t.linktype, t.href && (t.href = e(i.attrs.href || "")), J(s) && (t.href = `mailto:${t.href}`), t.anchor && (t.href = `${t.href}#${t.anchor}`, delete t.anchor), t.custom) {
    for (const r in t.custom)
      t[r] = t.custom[r];
    delete t.custom;
  }
  return {
    tag: [
      {
        tag: "a",
        attrs: t
      }
    ]
  };
}, ue = (i) => ({
  tag: [
    {
      tag: "span",
      attrs: i.attrs
    }
  ]
}), pe = () => ({
  tag: "sub"
}), de = () => ({
  tag: "sup"
}), ge = (i) => ({
  tag: [
    {
      tag: "span",
      attrs: i.attrs
    }
  ]
}), fe = (i) => {
  var e;
  return (e = i.attrs) != null && e.color ? {
    tag: [
      {
        tag: "span",
        attrs: {
          style: `background-color:${i.attrs.color};`
        }
      }
    ]
  } : {
    tag: ""
  };
}, me = (i) => {
  var e;
  return (e = i.attrs) != null && e.color ? {
    tag: [
      {
        tag: "span",
        attrs: {
          style: `color:${i.attrs.color}`
        }
      }
    ]
  } : {
    tag: ""
  };
}, ye = {
  nodes: {
    horizontal_rule: K,
    blockquote: Y,
    bullet_list: W,
    code_block: G,
    hard_break: Q,
    heading: X,
    image: Z,
    list_item: ee,
    ordered_list: te,
    paragraph: se,
    emoji: re
  },
  marks: {
    bold: oe,
    strike: ie,
    underline: ne,
    strong: ae,
    code: le,
    italic: ce,
    link: he,
    styled: ue,
    subscript: pe,
    superscript: de,
    anchor: ge,
    highlight: fe,
    textStyle: me
  }
}, be = function(i) {
  const e = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }, t = /[&<>"']/g, s = RegExp(t.source);
  return i && s.test(i) ? i.replace(t, (r) => e[r]) : i;
};
class v {
  constructor(e) {
    h(this, "marks"), h(this, "nodes"), e || (e = ye), this.marks = e.marks || [], this.nodes = e.nodes || [];
  }
  addNode(e, t) {
    this.nodes[e] = t;
  }
  addMark(e, t) {
    this.marks[e] = t;
  }
  render(e, t = { optimizeImages: false }) {
    if (e && e.content && Array.isArray(e.content)) {
      let s = "";
      return e.content.forEach((r) => {
        s += this.renderNode(r);
      }), t.optimizeImages ? this.optimizeImages(s, t.optimizeImages) : s;
    }
    return console.warn(
      `The render method must receive an Object with a "content" field.
			The "content" field must be an array of nodes as the type ISbRichtext.
			ISbRichtext:
				content?: ISbRichtext[]
				marks?: ISbRichtext[]
				attrs?: any
				text?: string
				type: string
				
				Example:
				{
					content: [
						{
							content: [
								{
									text: 'Hello World',
									type: 'text'
								}
							],
							type: 'paragraph'
						}
					],
					type: 'doc'
				}`
    ), "";
  }
  optimizeImages(e, t) {
    let s = 0, r = 0, o = "", n = "";
    typeof t != "boolean" && (typeof t.width == "number" && t.width > 0 && (o += `width="${t.width}" `, s = t.width), typeof t.height == "number" && t.height > 0 && (o += `height="${t.height}" `, r = t.height), (t.loading === "lazy" || t.loading === "eager") && (o += `loading="${t.loading}" `), typeof t.class == "string" && t.class.length > 0 && (o += `class="${t.class}" `), t.filters && (typeof t.filters.blur == "number" && t.filters.blur >= 0 && t.filters.blur <= 100 && (n += `:blur(${t.filters.blur})`), typeof t.filters.brightness == "number" && t.filters.brightness >= -100 && t.filters.brightness <= 100 && (n += `:brightness(${t.filters.brightness})`), t.filters.fill && (t.filters.fill.match(/[0-9A-Fa-f]{6}/g) || t.filters.fill === "transparent") && (n += `:fill(${t.filters.fill})`), t.filters.format && ["webp", "png", "jpeg"].includes(t.filters.format) && (n += `:format(${t.filters.format})`), typeof t.filters.grayscale == "boolean" && t.filters.grayscale && (n += ":grayscale()"), typeof t.filters.quality == "number" && t.filters.quality >= 0 && t.filters.quality <= 100 && (n += `:quality(${t.filters.quality})`), t.filters.rotate && [90, 180, 270].includes(t.filters.rotate) && (n += `:rotate(${t.filters.rotate})`), n.length > 0 && (n = "/filters" + n))), o.length > 0 && (e = e.replace(/<img/g, `<img ${o.trim()}`));
    const l = s > 0 || r > 0 || n.length > 0 ? `${s}x${r}${n}` : "";
    return e = e.replace(
      /a.storyblok.com\/f\/(\d+)\/([^.]+)\.(gif|jpg|jpeg|png|tif|tiff|bmp)/g,
      `a.storyblok.com/f/$1/$2.$3/m/${l}`
    ), typeof t != "boolean" && (t.sizes || t.srcset) && (e = e.replace(/<img.*?src=["|'](.*?)["|']/g, (a) => {
      var c, u;
      const p = a.match(
        /a.storyblok.com\/f\/(\d+)\/([^.]+)\.(gif|jpg|jpeg|png|tif|tiff|bmp)/g
      );
      if (p && p.length > 0) {
        const g = {
          srcset: (c = t.srcset) == null ? void 0 : c.map((d) => {
            if (typeof d == "number")
              return `//${p}/m/${d}x0${n} ${d}w`;
            if (typeof d == "object" && d.length === 2) {
              let w = 0, S = 0;
              return typeof d[0] == "number" && (w = d[0]), typeof d[1] == "number" && (S = d[1]), `//${p}/m/${w}x${S}${n} ${w}w`;
            }
          }).join(", "),
          sizes: (u = t.sizes) == null ? void 0 : u.map((d) => d).join(", ")
        };
        let f = "";
        return g.srcset && (f += `srcset="${g.srcset}" `), g.sizes && (f += `sizes="${g.sizes}" `), a.replace(/<img/g, `<img ${f.trim()}`);
      }
      return a;
    })), e;
  }
  renderNode(e) {
    const t = [];
    e.marks && e.marks.forEach((r) => {
      const o = this.getMatchingMark(r);
      o && o.tag !== "" && t.push(this.renderOpeningTag(o.tag));
    });
    const s = this.getMatchingNode(e);
    return s && s.tag && t.push(this.renderOpeningTag(s.tag)), e.content ? e.content.forEach((r) => {
      t.push(this.renderNode(r));
    }) : e.text ? t.push(be(e.text)) : s && s.singleTag ? t.push(this.renderTag(s.singleTag, " /")) : s && s.html ? t.push(s.html) : e.type === "emoji" && t.push(this.renderEmoji(e)), s && s.tag && t.push(this.renderClosingTag(s.tag)), e.marks && e.marks.slice(0).reverse().forEach((r) => {
      const o = this.getMatchingMark(r);
      o && o.tag !== "" && t.push(this.renderClosingTag(o.tag));
    }), t.join("");
  }
  renderTag(e, t) {
    return e.constructor === String ? `<${e}${t}>` : e.map((s) => {
      if (s.constructor === String)
        return `<${s}${t}>`;
      {
        let r = `<${s.tag}`;
        if (s.attrs)
          for (const o in s.attrs) {
            const n = s.attrs[o];
            n !== null && (r += ` ${o}="${n}"`);
          }
        return `${r}${t}>`;
      }
    }).join("");
  }
  renderOpeningTag(e) {
    return this.renderTag(e, "");
  }
  renderClosingTag(e) {
    return e.constructor === String ? `</${e}>` : e.slice(0).reverse().map((t) => t.constructor === String ? `</${t}>` : `</${t.tag}>`).join("");
  }
  getMatchingNode(e) {
    const t = this.nodes[e.type];
    if (typeof t == "function")
      return t(e);
  }
  getMatchingMark(e) {
    const t = this.marks[e.type];
    if (typeof t == "function")
      return t(e);
  }
  renderEmoji(e) {
    if (e.attrs.emoji)
      return e.attrs.emoji;
    const t = [
      {
        tag: "img",
        attrs: {
          src: e.attrs.fallbackImage,
          draggable: "false",
          loading: "lazy",
          align: "absmiddle"
        }
      }
    ];
    return this.renderTag(t, " /");
  }
}
class ke {
  constructor(e) {
    h(this, "baseURL"), h(this, "timeout"), h(this, "headers"), h(this, "responseInterceptor"), h(this, "fetch"), h(this, "ejectInterceptor"), h(this, "url"), h(this, "parameters"), h(this, "fetchOptions"), this.baseURL = e.baseURL, this.headers = e.headers || new Headers(), this.timeout = e != null && e.timeout ? e.timeout * 1e3 : 0, this.responseInterceptor = e.responseInterceptor, this.fetch = (...t) => e.fetch ? e.fetch(...t) : fetch(...t), this.ejectInterceptor = false, this.url = "", this.parameters = {}, this.fetchOptions = {};
  }
  /**
   *
   * @param url string
   * @param params ISbStoriesParams
   * @returns Promise<ISbResponse | Error>
   */
  get(e, t) {
    return this.url = e, this.parameters = t, this._methodHandler("get");
  }
  post(e, t) {
    return this.url = e, this.parameters = t, this._methodHandler("post");
  }
  put(e, t) {
    return this.url = e, this.parameters = t, this._methodHandler("put");
  }
  delete(e, t) {
    return this.url = e, this.parameters = t, this._methodHandler("delete");
  }
  async _responseHandler(e) {
    const t = [], s = {
      data: {},
      headers: {},
      status: 0,
      statusText: ""
    };
    e.status !== 204 && await e.json().then((r) => {
      s.data = r;
    });
    for (const r of e.headers.entries())
      t[r[0]] = r[1];
    return s.headers = { ...t }, s.status = e.status, s.statusText = e.statusText, s;
  }
  async _methodHandler(e) {
    let t = `${this.baseURL}${this.url}`, s = null;
    if (e === "get") {
      const a = new k();
      t = `${this.baseURL}${this.url}?${a.stringify(
        this.parameters
      )}`;
    } else
      s = JSON.stringify(this.parameters);
    const r = new URL(t), o = new AbortController(), { signal: n } = o;
    let l;
    this.timeout && (l = setTimeout(() => o.abort(), this.timeout));
    try {
      const a = await this.fetch(`${r}`, {
        method: e,
        headers: this.headers,
        body: s,
        signal: n,
        ...this.fetchOptions
      });
      this.timeout && clearTimeout(l);
      const c = await this._responseHandler(
        a
      );
      return this.responseInterceptor && !this.ejectInterceptor ? this._statusHandler(this.responseInterceptor(c)) : this._statusHandler(c);
    } catch (a) {
      return {
        message: a
      };
    }
  }
  setFetchOptions(e = {}) {
    Object.keys(e).length > 0 && "method" in e && delete e.method, this.fetchOptions = { ...e };
  }
  eject() {
    this.ejectInterceptor = true;
  }
  _statusHandler(e) {
    const t = /20[0-6]/g;
    return new Promise((s, r) => {
      if (t.test(`${e.status}`))
        return s(e);
      const o = {
        message: e.statusText,
        status: e.status,
        response: Array.isArray(e.data) ? e.data[0] : e.data.error || e.data.slug
      };
      r(o);
    });
  }
}
const P = "SB-Agent", R = {
  defaultAgentName: "SB-JS-CLIENT",
  defaultAgentVersion: "SB-Agent-Version",
  packageVersion: "6.0.0"
};
let b = {};
const m = {};
class ve {
  /**
   *
   * @param config ISbConfig interface
   * @param endpoint string, optional
   */
  constructor(e, t) {
    h(this, "client"), h(this, "maxRetries"), h(this, "throttle"), h(this, "accessToken"), h(this, "cache"), h(this, "helpers"), h(this, "resolveCounter"), h(this, "relations"), h(this, "links"), h(this, "richTextResolver"), h(this, "resolveNestedRelations"), h(this, "stringifiedStoriesCache");
    let s = e.endpoint || t;
    if (!s) {
      const n = new k().getRegionURL, l = e.https === false ? "http" : "https";
      e.oauthToken ? s = `${l}://${n(e.region)}/v1` : s = `${l}://${n(e.region)}/v2`;
    }
    const r = new Headers();
    if (r.set("Content-Type", "application/json"), r.set("Accept", "application/json"), e.headers)
      for (const n in e.headers)
        r.set(n, e.headers[n]);
    r.has(P) || (r.set(P, R.defaultAgentName), r.set(
      R.defaultAgentVersion,
      R.packageVersion
    ));
    let o = 5;
    e.oauthToken && (r.set("Authorization", e.oauthToken), o = 3), e.rateLimit && (o = e.rateLimit), e.richTextSchema ? this.richTextResolver = new v(e.richTextSchema) : this.richTextResolver = new v(), e.componentResolver && this.setComponentResolver(e.componentResolver), this.maxRetries = e.maxRetries || 5, this.throttle = D(this.throttledRequest, o, 1e3), this.accessToken = e.accessToken || "", this.relations = {}, this.links = {}, this.cache = e.cache || { clear: "manual" }, this.helpers = new k(), this.resolveCounter = 0, this.resolveNestedRelations = e.resolveNestedRelations || true, this.stringifiedStoriesCache = {}, this.client = new ke({
      baseURL: s,
      timeout: e.timeout || 0,
      headers: r,
      responseInterceptor: e.responseInterceptor,
      fetch: e.fetch
    });
  }
  setComponentResolver(e) {
    this.richTextResolver.addNode("blok", (t) => {
      let s = "";
      return t.attrs.body && t.attrs.body.forEach((r) => {
        s += e(r.component, r);
      }), {
        html: s
      };
    });
  }
  parseParams(e) {
    return e.token || (e.token = this.getToken()), e.cv || (e.cv = m[e.token]), Array.isArray(e.resolve_relations) && (e.resolve_relations = e.resolve_relations.join(",")), typeof e.resolve_relations < "u" && (e.resolve_level = 2), e;
  }
  factoryParamOptions(e, t) {
    return this.helpers.isCDNUrl(e) ? this.parseParams(t) : t;
  }
  makeRequest(e, t, s, r) {
    const o = this.factoryParamOptions(
      e,
      this.helpers.getOptionsPage(t, s, r)
    );
    return this.cacheResponse(e, o);
  }
  get(e, t, s) {
    t || (t = {});
    const r = `/${e}`, o = this.factoryParamOptions(r, t);
    return this.client.setFetchOptions(s), this.cacheResponse(r, o);
  }
  async getAll(e, t, s, r) {
    const o = (t == null ? void 0 : t.per_page) || 25, n = `/${e}`, l = n.split("/"), a = s || l[l.length - 1], c = 1, u = await this.makeRequest(n, t, o, c), p = u.total ? Math.ceil(u.total / o) : 1;
    this.client.setFetchOptions(r);
    const g = await this.helpers.asyncMap(
      this.helpers.range(c, p),
      (f) => this.makeRequest(n, t, o, f + 1)
    );
    return this.helpers.flatMap(
      [u, ...g],
      (f) => Object.values(f.data[a])
    );
  }
  post(e, t, s) {
    const r = `/${e}`;
    return this.client.setFetchOptions(s), Promise.resolve(this.throttle("post", r, t));
  }
  put(e, t, s) {
    const r = `/${e}`;
    return this.client.setFetchOptions(s), Promise.resolve(this.throttle("put", r, t));
  }
  delete(e, t, s) {
    const r = `/${e}`;
    return this.client.setFetchOptions(s), Promise.resolve(this.throttle("delete", r, t));
  }
  getStories(e, t) {
    return this.client.setFetchOptions(t), this._addResolveLevel(e), this.get("cdn/stories", e);
  }
  getStory(e, t, s) {
    return this.client.setFetchOptions(s), this._addResolveLevel(t), this.get(`cdn/stories/${e}`, t);
  }
  getToken() {
    return this.accessToken;
  }
  ejectInterceptor() {
    this.client.eject();
  }
  _addResolveLevel(e) {
    typeof e.resolve_relations < "u" && (e.resolve_level = 2);
  }
  _cleanCopy(e) {
    return JSON.parse(JSON.stringify(e));
  }
  _insertLinks(e, t, s) {
    const r = e[t];
    r && r.fieldtype == "multilink" && r.linktype == "story" && typeof r.id == "string" && this.links[s][r.id] ? r.story = this._cleanCopy(this.links[s][r.id]) : r && r.linktype === "story" && typeof r.uuid == "string" && this.links[s][r.uuid] && (r.story = this._cleanCopy(this.links[s][r.uuid]));
  }
  /**
   *
   * @param resolveId A counter number as a string
   * @param uuid The uuid of the story
   * @returns string | object
   */
  getStoryReference(e, t) {
    return this.relations[e][t] ? (this.stringifiedStoriesCache[t] || (this.stringifiedStoriesCache[t] = JSON.stringify(
      this.relations[e][t]
    )), JSON.parse(this.stringifiedStoriesCache[t])) : t;
  }
  _insertRelations(e, t, s, r) {
    s.indexOf(`${e.component}.${t}`) > -1 && (typeof e[t] == "string" ? e[t] = this.getStoryReference(r, e[t]) : Array.isArray(e[t]) && (e[t] = e[t].map((o) => this.getStoryReference(r, o)).filter(Boolean)));
  }
  iterateTree(e, t, s) {
    const r = (o) => {
      if (o != null) {
        if (o.constructor === Array)
          for (let n = 0; n < o.length; n++)
            r(o[n]);
        else if (o.constructor === Object) {
          if (o._stopResolving)
            return;
          for (const n in o)
            (o.component && o._uid || o.type === "link") && (this._insertRelations(
              o,
              n,
              t,
              s
            ), this._insertLinks(
              o,
              n,
              s
            )), r(o[n]);
        }
      }
    };
    r(e.content);
  }
  async resolveLinks(e, t, s) {
    let r = [];
    if (e.link_uuids) {
      const o = e.link_uuids.length, n = [], l = 50;
      for (let a = 0; a < o; a += l) {
        const c = Math.min(o, a + l);
        n.push(e.link_uuids.slice(a, c));
      }
      for (let a = 0; a < n.length; a++)
        (await this.getStories({
          per_page: l,
          language: t.language,
          version: t.version,
          by_uuids: n[a].join(",")
        })).data.stories.forEach(
          (c) => {
            r.push(c);
          }
        );
    } else
      r = e.links;
    r.forEach((o) => {
      this.links[s][o.uuid] = {
        ...o,
        _stopResolving: true
      };
    });
  }
  async resolveRelations(e, t, s) {
    let r = [];
    if (e.rel_uuids) {
      const o = e.rel_uuids.length, n = [], l = 50;
      for (let a = 0; a < o; a += l) {
        const c = Math.min(o, a + l);
        n.push(e.rel_uuids.slice(a, c));
      }
      for (let a = 0; a < n.length; a++)
        (await this.getStories({
          per_page: l,
          language: t.language,
          version: t.version,
          by_uuids: n[a].join(","),
          excluding_fields: t.excluding_fields
        })).data.stories.forEach((c) => {
          r.push(c);
        });
    } else
      r = e.rels;
    r && r.length > 0 && r.forEach((o) => {
      this.relations[s][o.uuid] = {
        ...o,
        _stopResolving: true
      };
    });
  }
  /**
   *
   * @param responseData
   * @param params
   * @param resolveId
   * @description Resolves the relations and links of the stories
   * @returns Promise<void>
   *
   */
  async resolveStories(e, t, s) {
    var r, o;
    let n = [];
    if (this.links[s] = {}, this.relations[s] = {}, typeof t.resolve_relations < "u" && t.resolve_relations.length > 0 && (typeof t.resolve_relations == "string" && (n = t.resolve_relations.split(",")), await this.resolveRelations(e, t, s)), t.resolve_links && ["1", "story", "url", "link"].indexOf(t.resolve_links) > -1 && ((r = e.links) != null && r.length || (o = e.link_uuids) != null && o.length) && await this.resolveLinks(e, t, s), this.resolveNestedRelations)
      for (const l in this.relations[s])
        this.iterateTree(
          this.relations[s][l],
          n,
          s
        );
    e.story ? this.iterateTree(e.story, n, s) : e.stories.forEach((l) => {
      this.iterateTree(l, n, s);
    }), this.stringifiedStoriesCache = {}, delete this.links[s], delete this.relations[s];
  }
  async cacheResponse(e, t, s) {
    (typeof s > "u" || !s) && (s = 0);
    const r = this.helpers.stringify({ url: e, params: t }), o = this.cacheProvider();
    if (this.cache.clear === "auto" && t.version === "draft" && await this.flushCache(), t.version === "published" && e != "/cdn/spaces/me") {
      const n = await o.get(r);
      if (n)
        return Promise.resolve(n);
    }
    return new Promise(async (n, l) => {
      var a;
      try {
        const c = await this.throttle("get", e, t);
        if (c.status !== 200)
          return l(c);
        let u = { data: c.data, headers: c.headers };
        if ((a = c.headers) != null && a["per-page"] && (u = Object.assign({}, u, {
          perPage: c.headers["per-page"] ? parseInt(c.headers["per-page"]) : 0,
          total: c.headers["per-page"] ? parseInt(c.headers.total) : 0
        })), u.data.story || u.data.stories) {
          const p = this.resolveCounter = ++this.resolveCounter % 1e3;
          await this.resolveStories(u.data, t, `${p}`);
        }
        return t.version === "published" && e != "/cdn/spaces/me" && await o.set(r, u), u.data.cv && t.token && (t.version === "draft" && m[t.token] != u.data.cv && await this.flushCache(), m[t.token] = t.cv ? t.cv : u.data.cv), n(u);
      } catch (c) {
        if (c.response && c.status === 429 && (s = s ? s + 1 : 0, s < this.maxRetries))
          return console.log(`Hit rate limit. Retrying in ${s} seconds.`), await this.helpers.delay(1e3 * s), this.cacheResponse(e, t, s).then(n).catch(l);
        l(c);
      }
    });
  }
  throttledRequest(e, t, s) {
    return this.client[e](t, s);
  }
  cacheVersions() {
    return m;
  }
  cacheVersion() {
    return m[this.accessToken];
  }
  setCacheVersion(e) {
    this.accessToken && (m[this.accessToken] = e);
  }
  cacheProvider() {
    switch (this.cache.type) {
      case "memory":
        return {
          get(e) {
            return Promise.resolve(b[e]);
          },
          getAll() {
            return Promise.resolve(b);
          },
          set(e, t) {
            return b[e] = t, Promise.resolve(void 0);
          },
          flush() {
            return b = {}, Promise.resolve(void 0);
          }
        };
      case "custom":
        if (this.cache.custom)
          return this.cache.custom;
      default:
        return {
          get() {
            return Promise.resolve();
          },
          getAll() {
            return Promise.resolve(void 0);
          },
          set() {
            return Promise.resolve(void 0);
          },
          flush() {
            return Promise.resolve(void 0);
          }
        };
    }
  }
  async flushCache() {
    return await this.cacheProvider().flush(), this;
  }
}
const xe = (i = {}) => {
  const { apiOptions: e } = i;
  if (!e.accessToken) {
    console.error(
      "You need to provide an access token to interact with Storyblok API. Read https://www.storyblok.com/docs/api/content-delivery#topics/authentication"
    );
    return;
  }
  return { storyblokApi: new ve(e) };
}, we = (i) => {
  if (typeof i != "object" || typeof i._editable > "u")
    return {};
  try {
    const e = JSON.parse(
      i._editable.replace(/^<!--#storyblok#/, "").replace(/-->$/, "")
    );
    return e ? {
      "data-blok-c": JSON.stringify(e),
      "data-blok-uid": e.id + "-" + e.uid
    } : {};
  } catch {
    return {};
  }
};
let T;
const Re = (i = {}) => {
  const {
    bridge: s,
    accessToken: r,
    use: o = [],
    apiOptions: n = {},
    richText: l = {},
    bridgeUrl: a
  } = i;
  n.accessToken = n.accessToken || r;
  const c = { bridge: s, apiOptions: n };
  let u = {};
  o.forEach((g) => {
    u = { ...u, ...g(c) };
  });
  const p = !("undefined" > "u");
  return s !== false && p && H(), T = new v(l.schema), l.resolver && I(T, l.resolver), u;
}, I = (i, e) => {
  i.addNode("blok", (t) => {
    let s = "";
    return t.attrs.body.forEach((r) => {
      s += e(r.component, r);
    }), {
      html: s
    };
  });
}, Te = /* @__PURE__ */ defineComponent({
  __name: "StoryblokComponent",
  props: {
    blok: {}
  },
  setup(i, { expose: e }) {
    const t = i, s = ref();
    e({
      value: s
    });
    const r = typeof resolveDynamicComponent(t.blok.component) != "string", o = inject("VueSDKOptions"), n = ref(t.blok.component);
    return r || (o.enableFallbackComponent ? (n.value = o.customFallbackComponent ?? "FallbackComponent", typeof resolveDynamicComponent(n.value) == "string" && console.error(
      `Is the Fallback component "${n.value}" registered properly?`
    )) : console.error(
      `Component could not be found for blok "${t.blok.component}"! Is it defined in main.ts as "app.component("${t.blok.component}", ${t.blok.component});"?`
    )), (l, a) => (openBlock(), createBlock(resolveDynamicComponent(n.value), mergeProps({
      ref_key: "blokRef",
      ref: s
    }, { ...l.$props, ...l.$attrs }), null, 16));
  }
}), Se = {
  beforeMount(i, e) {
    if (e.value) {
      const t = we(e.value);
      Object.keys(t).length > 0 && (i.setAttribute("data-blok-c", t["data-blok-c"]), i.setAttribute("data-blok-uid", t["data-blok-uid"]), i.classList.add("storyblok__outline"));
    }
  }
}, E = (i) => {
  console.error(`You can't use ${i} if you're not loading apiPlugin. Please provide it on StoryblokVue initialization.
    `);
};
let y = null;
const Pe = () => (y || E("useStoryblokApi"), y), Ie = {
  install(i, e = {}) {
    i.directive("editable", Se), i.component("StoryblokComponent", Te), e.enableFallbackComponent && !e.customFallbackComponent && i.component(
      "FallbackComponent",
      defineAsyncComponent(() => import("./_nuxt/FallbackComponent-hOszcW1L-Bkr58ody.js"))
    );
    const { storyblokApi: t } = Re(e);
    y = t, i.provide("VueSDKOptions", e);
  }
};
const clientOnlySymbol = Symbol.for("nuxt:client-only");
defineComponent({
  name: "ClientOnly",
  inheritAttrs: false,
  // eslint-disable-next-line vue/require-prop-types
  props: ["fallback", "placeholder", "placeholderTag", "fallbackTag"],
  setup(_, { slots, attrs }) {
    const mounted = ref(false);
    provide(clientOnlySymbol, true);
    return (props) => {
      var _a;
      if (mounted.value) {
        return (_a = slots.default) == null ? void 0 : _a.call(slots);
      }
      const slot = slots.fallback || slots.placeholder;
      if (slot) {
        return slot();
      }
      const fallbackStr = props.fallback || props.placeholder || "";
      const fallbackTag = props.fallbackTag || props.placeholderTag || "span";
      return createElementBlock(fallbackTag, attrs, fallbackStr);
    };
  }
});
const plugin_KlVwwuJRCL = /* @__PURE__ */ defineNuxtPlugin(({ vueApp }) => {
  let { storyblok } = (/* @__PURE__ */ useRuntimeConfig()).public;
  storyblok = JSON.parse(JSON.stringify(storyblok));
  vueApp.use(Ie, { ...storyblok, use: [xe] });
});
const plugins = [
  unhead_KgADcZ0jPj,
  plugin,
  revive_payload_server_eJ33V7gbc6,
  components_plugin_KR1HBZs4kY,
  plugin_KlVwwuJRCL
];
const layouts = {};
const LayoutLoader = defineComponent({
  name: "LayoutLoader",
  inheritAttrs: false,
  props: {
    name: String,
    layoutProps: Object
  },
  async setup(props, context) {
    const LayoutComponent = await layouts[props.name]().then((r) => r.default || r);
    return () => h$1(LayoutComponent, props.layoutProps, context.slots);
  }
});
const __nuxt_component_0 = defineComponent({
  name: "NuxtLayout",
  inheritAttrs: false,
  props: {
    name: {
      type: [String, Boolean, Object],
      default: null
    },
    fallback: {
      type: [String, Object],
      default: null
    }
  },
  setup(props, context) {
    const nuxtApp = /* @__PURE__ */ useNuxtApp();
    const injectedRoute = inject(PageRouteSymbol);
    const route = injectedRoute === useRoute() ? useRoute$1() : injectedRoute;
    const layout = computed(() => {
      let layout2 = unref(props.name) ?? route.meta.layout ?? "default";
      if (layout2 && !(layout2 in layouts)) {
        if (props.fallback) {
          layout2 = unref(props.fallback);
        }
      }
      return layout2;
    });
    const layoutRef = ref();
    context.expose({ layoutRef });
    const done = nuxtApp.deferHydration();
    return () => {
      const hasLayout = layout.value && layout.value in layouts;
      const transitionProps = route.meta.layoutTransition ?? appLayoutTransition;
      return _wrapIf(Transition, hasLayout && transitionProps, {
        default: () => h$1(Suspense, { suspensible: true, onResolve: () => {
          nextTick(done);
        } }, {
          default: () => h$1(
            LayoutProvider,
            {
              layoutProps: mergeProps(context.attrs, { ref: layoutRef }),
              key: layout.value || void 0,
              name: layout.value,
              shouldProvide: !props.name,
              hasTransition: !!transitionProps
            },
            context.slots
          )
        })
      }).default();
    };
  }
});
const LayoutProvider = defineComponent({
  name: "NuxtLayoutProvider",
  inheritAttrs: false,
  props: {
    name: {
      type: [String, Boolean]
    },
    layoutProps: {
      type: Object
    },
    hasTransition: {
      type: Boolean
    },
    shouldProvide: {
      type: Boolean
    }
  },
  setup(props, context) {
    const name = props.name;
    if (props.shouldProvide) {
      provide(LayoutMetaSymbol, {
        isCurrent: (route) => name === (route.meta.layout ?? "default")
      });
    }
    return () => {
      var _a, _b;
      if (!name || typeof name === "string" && !(name in layouts)) {
        return (_b = (_a = context.slots).default) == null ? void 0 : _b.call(_a);
      }
      return h$1(
        LayoutLoader,
        { key: name, layoutProps: props.layoutProps, name },
        context.slots
      );
    };
  }
});
const RouteProvider = defineComponent({
  props: {
    vnode: {
      type: Object,
      required: true
    },
    route: {
      type: Object,
      required: true
    },
    vnodeRef: Object,
    renderKey: String,
    trackRootNodes: Boolean
  },
  setup(props) {
    const previousKey = props.renderKey;
    const previousRoute = props.route;
    const route = {};
    for (const key in props.route) {
      Object.defineProperty(route, key, {
        get: () => previousKey === props.renderKey ? props.route[key] : previousRoute[key]
      });
    }
    provide(PageRouteSymbol, shallowReactive(route));
    return () => {
      return h$1(props.vnode, { ref: props.vnodeRef });
    };
  }
});
const __nuxt_component_1 = defineComponent({
  name: "NuxtPage",
  inheritAttrs: false,
  props: {
    name: {
      type: String
    },
    transition: {
      type: [Boolean, Object],
      default: void 0
    },
    keepalive: {
      type: [Boolean, Object],
      default: void 0
    },
    route: {
      type: Object
    },
    pageKey: {
      type: [Function, String],
      default: null
    }
  },
  setup(props, { attrs, expose }) {
    const nuxtApp = /* @__PURE__ */ useNuxtApp();
    const pageRef = ref();
    const forkRoute = inject(PageRouteSymbol, null);
    let previousPageKey;
    expose({ pageRef });
    inject(LayoutMetaSymbol, null);
    let vnode;
    const done = nuxtApp.deferHydration();
    if (props.pageKey) {
      watch(() => props.pageKey, (next, prev) => {
        if (next !== prev) {
          nuxtApp.callHook("page:loading:start");
        }
      });
    }
    return () => {
      return h$1(RouterView, { name: props.name, route: props.route, ...attrs }, {
        default: (routeProps) => {
          if (!routeProps.Component) {
            done();
            return;
          }
          const key = generateRouteKey$1(routeProps, props.pageKey);
          if (!nuxtApp.isHydrating && !hasChildrenRoutes(forkRoute, routeProps.route, routeProps.Component) && previousPageKey === key) {
            nuxtApp.callHook("page:loading:end");
          }
          previousPageKey = key;
          const hasTransition = !!(props.transition ?? routeProps.route.meta.pageTransition ?? appPageTransition);
          const transitionProps = hasTransition && _mergeTransitionProps([
            props.transition,
            routeProps.route.meta.pageTransition,
            appPageTransition,
            { onAfterLeave: () => {
              nuxtApp.callHook("page:transition:finish", routeProps.Component);
            } }
          ].filter(Boolean));
          const keepaliveConfig = props.keepalive ?? routeProps.route.meta.keepalive ?? appKeepalive;
          vnode = _wrapIf(
            Transition,
            hasTransition && transitionProps,
            wrapInKeepAlive(
              keepaliveConfig,
              h$1(Suspense, {
                suspensible: true,
                onPending: () => nuxtApp.callHook("page:start", routeProps.Component),
                onResolve: () => {
                  nextTick(() => nuxtApp.callHook("page:finish", routeProps.Component).then(() => nuxtApp.callHook("page:loading:end")).finally(done));
                }
              }, {
                default: () => {
                  const providerVNode = h$1(RouteProvider, {
                    key: key || void 0,
                    vnode: routeProps.Component,
                    route: routeProps.route,
                    renderKey: key || void 0,
                    trackRootNodes: hasTransition,
                    vnodeRef: pageRef
                  });
                  return providerVNode;
                }
              })
            )
          ).default();
          return vnode;
        }
      });
    };
  }
});
function _mergeTransitionProps(routeProps) {
  const _props = routeProps.map((prop) => ({
    ...prop,
    onAfterLeave: prop.onAfterLeave ? toArray(prop.onAfterLeave) : void 0
  }));
  return defu(..._props);
}
function hasChildrenRoutes(fork, newRoute, Component) {
  if (!fork) {
    return false;
  }
  const index = newRoute.matched.findIndex((m2) => {
    var _a;
    return ((_a = m2.components) == null ? void 0 : _a.default) === (Component == null ? void 0 : Component.type);
  });
  return index < newRoute.matched.length - 1;
}
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_main$2 = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  const _component_NuxtLayout = __nuxt_component_0;
  const _component_NuxtPage = __nuxt_component_1;
  _push(ssrRenderComponent(_component_NuxtLayout, _attrs, {
    default: withCtx((_, _push2, _parent2, _scopeId) => {
      if (_push2) {
        _push2(ssrRenderComponent(_component_NuxtPage, null, null, _parent2, _scopeId));
      } else {
        return [
          createVNode(_component_NuxtPage)
        ];
      }
    }),
    _: 1
  }, _parent));
}
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt/dist/pages/runtime/app.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const AppComponent = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["ssrRender", _sfc_ssrRender]]);
const _sfc_main$1 = {
  __name: "nuxt-error-page",
  __ssrInlineRender: true,
  props: {
    error: Object
  },
  setup(__props) {
    const props = __props;
    const _error = props.error;
    (_error.stack || "").split("\n").splice(1).map((line) => {
      const text = line.replace("webpack:/", "").replace(".vue", ".js").trim();
      return {
        text,
        internal: line.includes("node_modules") && !line.includes(".cache") || line.includes("internal") || line.includes("new Promise")
      };
    }).map((i) => `<span class="stack${i.internal ? " internal" : ""}">${i.text}</span>`).join("\n");
    const statusCode = Number(_error.statusCode || 500);
    const is404 = statusCode === 404;
    const statusMessage = _error.statusMessage ?? (is404 ? "Page Not Found" : "Internal Server Error");
    const description = _error.message || _error.toString();
    const stack = void 0;
    const _Error404 = defineAsyncComponent(() => import("./_nuxt/error-404-jg1rrRm8.js").then((r) => r.default || r));
    const _Error = defineAsyncComponent(() => import("./_nuxt/error-500-B5NlqPTd.js").then((r) => r.default || r));
    const ErrorTemplate = is404 ? _Error404 : _Error;
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ErrorTemplate), mergeProps({ statusCode: unref(statusCode), statusMessage: unref(statusMessage), description: unref(description), stack: unref(stack) }, _attrs), null, _parent));
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt/dist/app/components/nuxt-error-page.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const ErrorComponent = _sfc_main$1;
const _sfc_main = {
  __name: "nuxt-root",
  __ssrInlineRender: true,
  setup(__props) {
    const IslandRenderer = defineAsyncComponent(() => import("./_nuxt/island-renderer-DDLplZlz.js").then((r) => r.default || r));
    const nuxtApp = /* @__PURE__ */ useNuxtApp();
    nuxtApp.deferHydration();
    nuxtApp.ssrContext.url;
    const SingleRenderer = false;
    provide(PageRouteSymbol, useRoute());
    nuxtApp.hooks.callHookWith((hooks) => hooks.map((hook) => hook()), "vue:setup");
    const error = useError();
    onErrorCaptured((err, target, info) => {
      nuxtApp.hooks.callHook("vue:error", err, target, info).catch((hookError) => console.error("[nuxt] Error in `vue:error` hook", hookError));
      {
        const p = nuxtApp.runWithContext(() => showError(err));
        onServerPrefetch(() => p);
        return false;
      }
    });
    const islandContext = nuxtApp.ssrContext.islandContext;
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderSuspense(_push, {
        default: () => {
          if (unref(error)) {
            _push(ssrRenderComponent(unref(ErrorComponent), { error: unref(error) }, null, _parent));
          } else if (unref(islandContext)) {
            _push(ssrRenderComponent(unref(IslandRenderer), { context: unref(islandContext) }, null, _parent));
          } else if (unref(SingleRenderer)) {
            ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(SingleRenderer)), null, null), _parent);
          } else {
            _push(ssrRenderComponent(unref(AppComponent), null, null, _parent));
          }
        },
        _: 1
      });
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt/dist/app/components/nuxt-root.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RootComponent = _sfc_main;
let entry;
{
  entry = async function createNuxtAppServer(ssrContext) {
    const vueApp = createApp(RootComponent);
    const nuxt = createNuxtApp({ vueApp, ssrContext });
    try {
      await applyPlugins(nuxt, plugins);
      await nuxt.hooks.callHook("app:created", vueApp);
    } catch (error) {
      await nuxt.hooks.callHook("app:error", error);
      nuxt.payload.error = nuxt.payload.error || createError(error);
    }
    if (ssrContext == null ? void 0 : ssrContext._renderResponse) {
      throw new Error("skipping render");
    }
    return vueApp;
  };
}
const entry$1 = (ssrContext) => entry(ssrContext);
export {
  Pe as P,
  _export_sfc as _,
  useRuntimeConfig as a,
  navigateTo as b,
  createError as c,
  useNuxtApp as d,
  entry$1 as default,
  injectHead as i,
  nuxtLinkDefaults as n,
  resolveUnrefHeadInput as r,
  useRouter as u
};
//# sourceMappingURL=server.mjs.map
