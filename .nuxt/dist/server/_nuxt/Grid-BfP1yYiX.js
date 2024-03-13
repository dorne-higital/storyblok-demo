import { resolveComponent, resolveDirective, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrGetDirectiveProps, ssrRenderList, ssrRenderComponent } from "vue/server-renderer";
const _sfc_main = {
  __name: "Grid",
  __ssrInlineRender: true,
  props: { blok: Object },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      const _component_StoryblokComponent = resolveComponent("StoryblokComponent");
      const _directive_editable = resolveDirective("editable");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "container mx-auto grid md:grid-cols-3 gap-12 my-12 place-items-center" }, _attrs, ssrGetDirectiveProps(_ctx, _directive_editable, __props.blok)))}><!--[-->`);
      ssrRenderList(__props.blok.columns, (blok) => {
        _push(ssrRenderComponent(_component_StoryblokComponent, {
          key: blok._uid,
          blok
        }, null, _parent));
      });
      _push(`<!--]--></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("storyblok/Grid.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=Grid-BfP1yYiX.js.map
