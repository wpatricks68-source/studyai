exports.id=474,exports.ids=[474],exports.modules={84832:(e,t,r)=>{Promise.resolve().then(r.bind(r,11412))},60080:(e,t,r)=>{Promise.resolve().then(r.bind(r,85634))},90818:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,63642,23)),Promise.resolve().then(r.t.bind(r,87586,23)),Promise.resolve().then(r.t.bind(r,47838,23)),Promise.resolve().then(r.t.bind(r,58057,23)),Promise.resolve().then(r.t.bind(r,77741,23)),Promise.resolve().then(r.t.bind(r,13118,23))},11412:(e,t,r)=>{"use strict";r.d(t,{ThemeProvider:()=>o});var i=r(97247);r(28964);var s=r(57797);function o({children:e,...t}){return i.jsx(s.f,{...t,children:e})}},85634:(e,t,r)=>{"use strict";r.d(t,{default:()=>y});var i=r(97247),s=r(28964),o=r(79906),n=r(34178),a=r(85014),l=r(12662),d=r(5495),c=r(57797);function x(){let{theme:e,setTheme:t}=(0,c.F)(),[r,o]=s.useState(!1);return(s.useEffect(()=>{o(!0)},[]),r)?i.jsx("button",{onClick:()=>t("dark"===e?"light":"dark"),className:"inline-flex items-center justify-center rounded-md p-2 text-muted hover:bg-surface2 hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent","aria-label":"Toggle theme",children:"dark"===e?i.jsx(l.Z,{className:"h-5 w-5"}):i.jsx(d.Z,{className:"h-5 w-5"})}):i.jsx("div",{className:"w-9 h-9"})}var h=r(6683),p=r(37013),u=r(17712),f=r(10302),g=r(56173),b=r(40721);function m(){let[e,t]=(0,s.useState)(0),[r,o]=(0,s.useState)(!1);return(0,i.jsxs)("div",{style:{background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.15)",borderRadius:"12px",padding:"12px",marginBottom:"16px",display:"flex",flexDirection:"column",gap:"8px"},children:[(0,i.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px",color:"var(--muted)",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px",fontWeight:600},children:[i.jsx(u.Z,{size:12})," Tempo de Estudo"]}),(0,i.jsxs)("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:[i.jsx("div",{style:{fontSize:"18px",fontWeight:700,fontFamily:"monospace",color:r?"var(--accent)":"var(--text)"},children:(e=>{let t=Math.floor(e/3600);return`${t>0?t.toString().padStart(2,"0")+":":""}${Math.floor(e%3600/60).toString().padStart(2,"0")}:${(e%60).toString().padStart(2,"0")}`})(e)}),(0,i.jsxs)("div",{style:{display:"flex",gap:"4px"},children:[i.jsx("button",{onClick:()=>{confirm("Zerar contador de tempo?")&&(o(!1),t(0))},style:{width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--muted)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"},title:"Resetar",children:i.jsx(f.Z,{size:14})}),i.jsx("button",{onClick:()=>o(!r),style:{width:"32px",height:"32px",borderRadius:"8px",border:"none",background:r?"rgba(239,68,68,0.15)":"var(--accent)",color:r?"#ef4444":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"},children:r?i.jsx(g.Z,{size:16,fill:"currentColor"}):i.jsx(b.Z,{size:16,fill:"currentColor"})})]})]})]})}let v=[{section:"Principal",items:[{href:"/dashboard",label:"Dashboard",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"currentColor",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("rect",{x:"1",y:"1",width:"6",height:"6",rx:"1.5"}),i.jsx("rect",{x:"9",y:"1",width:"6",height:"6",rx:"1.5"}),i.jsx("rect",{x:"1",y:"9",width:"6",height:"6",rx:"1.5"}),i.jsx("rect",{x:"9",y:"9",width:"6",height:"6",rx:"1.5"})]})}},{href:"/dashboard/aluno",label:"Area do Aluno",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("circle",{cx:"8",cy:"5",r:"2.5"}),i.jsx("path",{d:"M3 13c.8-2 2.6-3 5-3s4.2 1 5 3"})]})}},{href:"/dashboard/busca",label:"Busca + IA",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("circle",{cx:"7",cy:"7",r:"5"}),i.jsx("path",{d:"M11 11l3 3"})]})}},{href:"/dashboard/resumos",label:"Resumos",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("path",{d:"M4 4h8M4 8h8M4 12h5"}),i.jsx("rect",{x:"1",y:"1",width:"14",height:"14",rx:"2"})]})}},{href:"/dashboard/flashcards",label:"Estudo Ativo",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("rect",{x:"2",y:"3",width:"12",height:"9",rx:"2"}),i.jsx("path",{d:"M5 7h6M5 10h4"})]})}}]},{section:"Organizacao",items:[{href:"/dashboard/cronograma",label:"Cronograma",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("rect",{x:"2",y:"3",width:"12",height:"12",rx:"1.5"}),i.jsx("path",{d:"M5 1v4M11 1v4M2 7h12"})]})}},{href:"/dashboard/controle-diario",label:"Controle Diario",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("rect",{x:"2",y:"2",width:"12",height:"12",rx:"2"}),i.jsx("path",{d:"M6.2 5.2l.8.8 1.5-1.8"}),i.jsx("path",{d:"M5 8h6M5 10.8h4"})]})}},{href:"/dashboard/edital-verticalizado",label:"Edital Verticalizado",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("path",{d:"M8 2l6 3-6 3-6-3 6-3z"}),i.jsx("path",{d:"M2 8l6 3 6-3"}),i.jsx("path",{d:"M2 11l6 3 6-3"})]})}},{href:"/dashboard/estatisticas",label:"Estatisticas",icon:function({active:e}){return i.jsx("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:i.jsx("path",{d:"M2 12l3-4 3 2 3-5 3 3"})})}}]},{section:"Ferramentas",items:[{href:"/dashboard/ferramentas",label:"Pomodoro",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("circle",{cx:"8",cy:"8",r:"6"}),i.jsx("path",{d:"M8 4v4l3 2"})]})}}]}];function y({user:e,profile:t}){let r=(0,n.usePathname)(),l=(0,n.useRouter)(),[d,c]=(0,s.useState)(!1);async function u(){let e=(0,a.e)();await e.auth.signOut(),l.push("/login"),l.refresh()}let f=(t?.name??e.email??"U").split(" ").map(e=>e[0]).join("").toUpperCase().slice(0,2);return(0,i.jsxs)(i.Fragment,{children:[i.jsx("style",{children:`
        .sidebar-backdrop,
        .sidebar-mobile-toggle,
        .sidebar-close-btn {
          display: none;
        }

        @media (max-width: 960px) {
          .sidebar-mobile-toggle {
            display: inline-flex;
            position: fixed;
            top: 14px;
            left: 14px;
            z-index: 90;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,.08);
            background: rgba(17,20,32,.9);
            color: var(--text);
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0,0,0,.28);
            backdrop-filter: blur(12px);
          }

          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 70;
            background: rgba(5,7,12,.58);
            opacity: 0;
            pointer-events: none;
            transition: opacity .2s ease;
          }

          .sidebar-backdrop[data-open="true"] {
            opacity: 1;
            pointer-events: auto;
          }

          .sidebar-shell {
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            width: min(82vw, 320px) !important;
            z-index: 80;
            transform: translateX(-100%);
            transition: transform .24s ease, box-shadow .24s ease;
            box-shadow: none;
          }

          .sidebar-shell[data-open="true"] {
            transform: translateX(0);
            box-shadow: 0 22px 60px rgba(0,0,0,.42);
          }

          .sidebar-close-btn {
            display: inline-flex;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,.08);
            background: rgba(255,255,255,.04);
            color: var(--text);
            align-items: center;
            justify-content: center;
          }
        }
      `}),i.jsx("button",{type:"button",className:"sidebar-mobile-toggle","aria-label":"Abrir menu",onClick:()=>c(!0),children:i.jsx(h.Z,{size:18})}),i.jsx("div",{className:"sidebar-backdrop","data-open":d,onClick:()=>c(!1)}),(0,i.jsxs)("aside",{className:"sidebar-shell","data-open":d,style:{width:"200px",flexShrink:0,background:"var(--surface)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"},children:[(0,i.jsxs)("div",{style:{padding:"18px 16px 14px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"},children:[(0,i.jsxs)("div",{children:[i.jsx("div",{style:{fontSize:"18px",fontWeight:700,color:"var(--accent)",letterSpacing:"-0.5px"},children:"StudyAI"}),i.jsx("div",{style:{fontSize:"10px",color:"var(--muted)",letterSpacing:"2px",textTransform:"uppercase",marginTop:"2px"},children:"Concursos"})]}),(0,i.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px"},children:[i.jsx(x,{}),i.jsx("button",{type:"button",className:"sidebar-close-btn","aria-label":"Fechar menu",onClick:()=>c(!1),children:i.jsx(p.Z,{size:16})})]})]}),i.jsx("div",{style:{padding:"4px 12px 0"},children:i.jsx(m,{})}),i.jsx("nav",{style:{padding:"0 8px 10px",flex:1,overflowY:"auto"},children:v.map(e=>(0,i.jsxs)("div",{children:[i.jsx("div",{style:{fontSize:"10px",color:"var(--muted)",letterSpacing:"1.5px",textTransform:"uppercase",padding:"10px 10px 5px"},children:e.section}),e.items.map(e=>{let t=r===e.href||"/dashboard"!==e.href&&r.startsWith(e.href);return(0,i.jsxs)(o.default,{href:e.href,onClick:()=>c(!1),style:{display:"flex",alignItems:"center",gap:"9px",padding:t?"8px 8px 8px 8px":"8px 10px",borderRadius:"8px",marginBottom:"2px",fontSize:"13px",textDecoration:"none",color:t?"var(--accent)":"var(--muted)",background:t?"rgba(108,99,255,.15)":"transparent",borderLeft:t?"2px solid var(--accent)":"2px solid transparent",transition:"all .12s"},children:[i.jsx(e.icon,{active:t}),e.label]},e.href)})]},e.section))}),(0,i.jsxs)("div",{style:{padding:"12px",borderTop:"1px solid var(--border)"},children:[(0,i.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"},children:[i.jsx("div",{style:{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#6c63ff,#00d4aa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:600,color:"#fff",flexShrink:0},children:f}),(0,i.jsxs)("div",{children:[i.jsx("div",{style:{fontSize:"12px",color:"var(--text)",fontWeight:500},children:t?.name?.split(" ")[0]??"Usuario"}),i.jsx("div",{style:{fontSize:"10px",color:"var(--muted)"},children:t?.target_exam??"Concurso"})]})]}),i.jsx("button",{onClick:u,style:{width:"100%",padding:"7px",borderRadius:"7px",background:"transparent",border:"1px solid var(--border)",color:"var(--muted)",fontSize:"12px",cursor:"pointer",transition:"all .12s"},children:"Sair"})]})]})]})}},85014:(e,t,r)=>{"use strict";r.d(t,{e:()=>s});var i=r(13215);function s(){return(0,i.createBrowserClient)("https://xxxxxxxxxxxx.supabase.co","sua_anon_key_aqui")}},94123:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>a});var i=r(72051),s=r(41288),o=r(86660);let n=(0,r(45347).createProxy)(String.raw`C:\Users\Meu computador\Documents\Repositórios\components\ui\Sidebar.tsx#default`);async function a({children:e}){let t=await (0,o.e)(),{data:{user:r}}=await t.auth.getUser();r||(0,s.redirect)("/auth/login");let{data:a}=await t.from("profiles").select("*").eq("id",r.id).maybeSingle();return(0,i.jsxs)(i.Fragment,{children:[i.jsx("style",{children:`
        @media (max-width: 960px) {
          .dashboard-main {
            padding-top: 58px;
          }
        }
      `}),(0,i.jsxs)("div",{style:{display:"flex",height:"100vh",overflow:"hidden",background:"var(--bg)"},children:[i.jsx(n,{user:r,profile:a}),i.jsx("main",{className:"dashboard-main",style:{flex:1,minWidth:0,overflow:"auto",display:"flex",flexDirection:"column"},children:e})]})]})}},89455:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>n,metadata:()=>o});var i=r(72051);r(67272);let s=(0,r(45347).createProxy)(String.raw`C:\Users\Meu computador\Documents\Repositórios\components\ThemeProvider.tsx#ThemeProvider`),o={title:"StudyAI — Estudo inteligente para concursos",description:"Plataforma de estudos com IA para concurseiros. Resumos, flashcards, quest\xf5es e cronograma em um s\xf3 lugar.",keywords:["concursos","estudo","IA","flashcards","resumos","quest\xf5es"]};function n({children:e}){return i.jsx("html",{lang:"pt-BR",suppressHydrationWarning:!0,children:i.jsx("body",{children:i.jsx(s,{attribute:"class",defaultTheme:"system",enableSystem:!0,children:e})})})}},86660:(e,t,r)=>{"use strict";r.d(t,{e:()=>o});var i=r(11415),s=r(52845);function o(){let e=(0,s.cookies)();return(0,i.createServerClient)("https://xxxxxxxxxxxx.supabase.co","sua_anon_key_aqui",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:i})=>{e.set(t,r,i)})}catch{}}}})}},67272:()=>{}};