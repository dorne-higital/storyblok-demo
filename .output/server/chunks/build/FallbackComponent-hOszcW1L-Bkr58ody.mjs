import { defineComponent, openBlock, createElementBlock, createElementVNode, createTextVNode, toDisplayString } from 'vue';

const m = { class: "fallback-component" }, d = { class: "component" }, f = /* @__PURE__ */ defineComponent({
  __name: "FallbackComponent",
  props: {
    blok: {}
  },
  setup(o) {
    return (e, t) => (openBlock(), createElementBlock("div", m, [
      createElementVNode("p", null, [
        createTextVNode(" Component could not be found for blok "),
        createElementVNode("span", d, toDisplayString(e.blok.component), 1),
        createTextVNode("! Is it configured correctly? ")
      ])
    ]));
  }
}), i = (o, e) => {
  const t = o.__vccOpts || o;
  for (const [s, a] of e)
    t[s] = a;
  return t;
}, u = /* @__PURE__ */ i(f, [["__scopeId", "data-v-93c770c0"]]);

export { u as default };
//# sourceMappingURL=FallbackComponent-hOszcW1L-Bkr58ody.mjs.map
