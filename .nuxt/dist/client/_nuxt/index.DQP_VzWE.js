import{L as c,M as y,m as l,P as p,o as f,$ as m,N as _,O as u,Q as d,R as k,i as v,t as b}from"./entry.C0thVPMp.js";const x="$s";function h(...e){const n=typeof e[e.length-1]=="string"?e.pop():void 0;typeof e[0]!="string"&&e.unshift(n);const[s,o]=e;if(!s||typeof s!="string")throw new TypeError("[nuxt] [useState] key must be a string: "+s);if(o!==void 0&&typeof o!="function")throw new Error("[nuxt] [useState] init must be a function: "+o);const t=x+s,r=l(),a=c(r.payload.state,t);if(a.value===void 0&&o){const i=o();if(y(i))return r.payload.state[t]=i,i;a.value=i}return a}const S=async(e,n={},s={})=>{const o=`${JSON.stringify(n)}${e}`,t=h(`${o}-state`),r=p();if(f(()=>{t.value&&t.value.id&&m(t.value.id,a=>t.value=a,s)}),!t.value){const{data:a}=await r.get(`cdn/stories/${e}`,n);t.value=a.story}return t},$={__name:"index",async setup(e){let n,s;const o=([n,s]=_(()=>S("home",{version:"draft"},{customParent:"https://app.storyblok.com"})),n=await n,s(),n);return(t,r)=>{const a=v("StoryblokComponent");return u(o)?(b(),d(a,{key:0,blok:u(o).content},null,8,["blok"])):k("",!0)}}};export{$ as default};
