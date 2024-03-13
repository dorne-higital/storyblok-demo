import { resolveDirective, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrGetDirectiveProps, ssrInterpolate } from 'vue/server-renderer';

const _sfc_main = {
  __name: "Feature",
  __ssrInlineRender: true,
  props: { blok: Object },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      const _directive_editable = resolveDirective("editable");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "w-full p-12 bg-[#f7f6fd] rounded-[5px] text-center" }, _attrs, ssrGetDirectiveProps(_ctx, _directive_editable, __props.blok)))}><h3 class="text-2xl text-[#1d243d] font-bold">${ssrInterpolate(__props.blok.name)}</h3><p>${ssrInterpolate(__props.blok.description)}</p></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("storyblok/Feature.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=Feature-tRGk_CQI.mjs.map
