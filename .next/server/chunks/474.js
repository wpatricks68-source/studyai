exports.id=474,exports.ids=[474],exports.modules={84832:(e,t,r)=>{Promise.resolve().then(r.bind(r,11412))},60080:(e,t,r)=>{Promise.resolve().then(r.bind(r,56095))},90818:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,63642,23)),Promise.resolve().then(r.t.bind(r,87586,23)),Promise.resolve().then(r.t.bind(r,47838,23)),Promise.resolve().then(r.t.bind(r,58057,23)),Promise.resolve().then(r.t.bind(r,77741,23)),Promise.resolve().then(r.t.bind(r,13118,23))},11412:(e,t,r)=>{"use strict";r.d(t,{ThemeProvider:()=>a});var i=r(97247);r(28964);var s=r(57797);function a({children:e,...t}){return i.jsx(s.f,{...t,children:e})}},56095:(e,t,r)=>{"use strict";r.d(t,{default:()=>y});var i=r(97247),s=r(28964),a=r(79906),o=r(34178),n=r(85014),l=r(12662),d=r(5495),c=r(57797);function x(){let{resolvedTheme:e,setTheme:t}=(0,c.F)(),[r,a]=s.useState(!1);if(s.useEffect(()=>{a(!0)},[]),!r)return i.jsx("div",{className:"w-9 h-9"});let o="dark"===e;return i.jsx("button",{type:"button",onClick:()=>t(o?"light":"dark"),className:"inline-flex items-center justify-center rounded-md p-2 text-muted hover:bg-surface2 hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent","aria-label":o?"Ativar tema claro":"Ativar tema escuro",children:o?i.jsx(l.Z,{className:"h-5 w-5"}):i.jsx(d.Z,{className:"h-5 w-5"})})}var h=r(6683),p=r(37013),u=r(17712),b=r(10302),g=r(56173),f=r(40721);function v(){let[e,t]=(0,s.useState)(0),[r,a]=(0,s.useState)(!1);return(0,i.jsxs)("div",{style:{background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.15)",borderRadius:"12px",padding:"12px",marginBottom:"16px",display:"flex",flexDirection:"column",gap:"8px"},children:[(0,i.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px",color:"var(--muted)",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px",fontWeight:600},children:[i.jsx(u.Z,{size:12})," Tempo de Estudo"]}),(0,i.jsxs)("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:[i.jsx("div",{style:{fontSize:"18px",fontWeight:700,fontFamily:"monospace",color:r?"var(--accent)":"var(--text)"},children:(e=>{let t=Math.floor(e/3600);return`${t>0?t.toString().padStart(2,"0")+":":""}${Math.floor(e%3600/60).toString().padStart(2,"0")}:${(e%60).toString().padStart(2,"0")}`})(e)}),(0,i.jsxs)("div",{style:{display:"flex",gap:"4px"},children:[i.jsx("button",{onClick:()=>{confirm("Zerar contador de tempo?")&&(a(!1),t(0))},style:{width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--surface2)",color:"var(--muted)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"},title:"Resetar",children:i.jsx(b.Z,{size:14})}),i.jsx("button",{onClick:()=>a(!r),style:{width:"32px",height:"32px",borderRadius:"8px",border:"none",background:r?"rgba(239,68,68,0.15)":"var(--accent)",color:r?"#ef4444":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"},children:r?i.jsx(g.Z,{size:16,fill:"currentColor"}):i.jsx(f.Z,{size:16,fill:"currentColor"})})]})]})]})}let m=[{section:"Principal",items:[{href:"/dashboard",label:"Dashboard",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"currentColor",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("rect",{x:"1",y:"1",width:"6",height:"6",rx:"1.5"}),i.jsx("rect",{x:"9",y:"1",width:"6",height:"6",rx:"1.5"}),i.jsx("rect",{x:"1",y:"9",width:"6",height:"6",rx:"1.5"}),i.jsx("rect",{x:"9",y:"9",width:"6",height:"6",rx:"1.5"})]})}},{href:"/dashboard/busca",label:"Edi\xe7\xe3o + IA",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("circle",{cx:"7",cy:"7",r:"5"}),i.jsx("path",{d:"M11 11l3 3"})]})}},{href:"/dashboard/resumos",label:"Resumos",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("path",{d:"M4 4h8M4 8h8M4 12h5"}),i.jsx("rect",{x:"1",y:"1",width:"14",height:"14",rx:"2"})]})}},{href:"/dashboard/flashcards",label:"Estudo Ativo",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("rect",{x:"2",y:"3",width:"12",height:"9",rx:"2"}),i.jsx("path",{d:"M5 7h6M5 10h4"})]})}}]},{section:"Organizacao",items:[{href:"/dashboard/cronograma",label:"Cronograma",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("rect",{x:"2",y:"3",width:"12",height:"12",rx:"1.5"}),i.jsx("path",{d:"M5 1v4M11 1v4M2 7h12"})]})}},{href:"/dashboard/controle-diario",label:"Controle Diario",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("rect",{x:"2",y:"2",width:"12",height:"12",rx:"2"}),i.jsx("path",{d:"M6.2 5.2l.8.8 1.5-1.8"}),i.jsx("path",{d:"M5 8h6M5 10.8h4"})]})}},{href:"/dashboard/edital-verticalizado",label:"Edital Verticalizado",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("path",{d:"M8 2l6 3-6 3-6-3 6-3z"}),i.jsx("path",{d:"M2 8l6 3 6-3"}),i.jsx("path",{d:"M2 11l6 3 6-3"})]})}},{href:"/dashboard/estatisticas",label:"Estatisticas",icon:function({active:e}){return i.jsx("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:i.jsx("path",{d:"M2 12l3-4 3 2 3-5 3 3"})})}}]},{section:"Ferramentas",items:[{href:"/dashboard/ferramentas",label:"Pomodoro",icon:function({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("circle",{cx:"8",cy:"8",r:"6"}),i.jsx("path",{d:"M8 4v4l3 2"})]})}}]}];function y({user:e,profile:t}){let r=(0,o.usePathname)(),l=(0,o.useRouter)(),[d,c]=(0,s.useState)(!1),u=[...m,..."admin"==("admin"===t?.role?"admin":"user")?[{section:"Administracao",items:[{href:"/dashboard/admin",label:"Painel Admin",icon:k}]}]:[]];async function b(){let e=(0,n.e)();await e.auth.signOut(),l.push("/login"),l.refresh()}let g=(t?.name??e.email??"U").split(" ").map(e=>e[0]).join("").toUpperCase().slice(0,2);return(0,i.jsxs)(i.Fragment,{children:[i.jsx("style",{children:`
        .sidebar-backdrop,
        .sidebar-mobile-toggle,
        .sidebar-close-btn {
          display: none;
        }

        .sb-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 11px;
          border-radius: 10px;
          margin-bottom: 2px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          color: var(--muted);
          transition: all .18s cubic-bezier(.4,0,.2,1);
          position: relative;
          letter-spacing: -0.1px;
        }
        .sb-nav-link:hover {
          color: var(--text);
          background: var(--sidebar-hover);
        }
        .sb-nav-link.active {
          color: #fff;
          background: linear-gradient(135deg, rgba(116,97,255,0.85) 0%, rgba(91,200,255,0.7) 100%);
          box-shadow: 0 4px 20px rgba(116,97,255,0.3);
          font-weight: 600;
        }
        .light .sb-nav-link.active {
          background: linear-gradient(135deg, rgba(91,79,255,0.9) 0%, rgba(0,140,255,0.7) 100%);
          box-shadow: 0 4px 20px rgba(91,79,255,0.25);
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
            border: 1px solid var(--sidebar-mobile-border);
            background: var(--sidebar-mobile-bg);
            color: var(--text);
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0,0,0,.38);
            backdrop-filter: blur(16px);
          }

          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 70;
            background: var(--sidebar-backdrop);
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
            width: min(82vw, 300px) !important;
            z-index: 80;
            transform: translateX(-100%);
            transition: transform .24s cubic-bezier(.4,0,.2,1), box-shadow .24s ease;
            box-shadow: none;
          }

          .sidebar-shell[data-open="true"] {
            transform: translateX(0);
            box-shadow: 0 0 80px rgba(0,0,0,.6);
          }

          .sidebar-close-btn {
            display: inline-flex;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid var(--sidebar-mobile-border);
            background: var(--sidebar-panel);
            color: var(--text);
            align-items: center;
            justify-content: center;
          }
        }
      `}),i.jsx("button",{type:"button",className:"sidebar-mobile-toggle","aria-label":"Abrir menu",onClick:()=>c(!0),children:i.jsx(h.Z,{size:18})}),i.jsx("div",{className:"sidebar-backdrop","data-open":d,onClick:()=>c(!1)}),(0,i.jsxs)("aside",{className:"sidebar-shell","data-open":d,style:{width:"215px",flexShrink:0,background:"var(--sidebar-bg)",borderRight:"1px solid var(--sidebar-border-subtle)",display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",position:"relative"},children:[i.jsx("div",{style:{position:"absolute",top:"-40px",left:"-40px",width:"200px",height:"200px",borderRadius:"50%",background:"var(--sidebar-orb)",pointerEvents:"none"}}),(0,i.jsxs)("div",{style:{padding:"20px 16px 16px",borderBottom:"1px solid var(--sidebar-divider)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"},children:[(0,i.jsxs)("div",{children:[i.jsx("div",{style:{fontSize:"19px",fontWeight:800,letterSpacing:"-0.7px",background:"linear-gradient(135deg, #7461ff, #00e5b0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"},children:"StudyAI"}),i.jsx("div",{style:{fontSize:"9px",color:"var(--muted)",letterSpacing:"2.5px",textTransform:"uppercase",marginTop:"3px"},children:"Concursos"})]}),(0,i.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[i.jsx(x,{}),i.jsx("button",{type:"button",className:"sidebar-close-btn","aria-label":"Fechar menu",onClick:()=>c(!1),children:i.jsx(p.Z,{size:16})})]})]}),i.jsx("div",{style:{padding:"4px 12px 0"},children:(0,i.jsxs)("div",{style:{display:"flex",flexDirection:"column",gap:"6px",padding:"10px",borderRadius:"16px",background:"var(--sidebar-panel)",border:"1px solid var(--sidebar-panel-border)",marginBottom:"4px"},children:[(0,i.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"10px",padding:"2px"},children:[i.jsx("div",{style:{width:"32px",height:"32px",borderRadius:"10px",background:t?.avatar_url?"transparent":"linear-gradient(135deg, #7461ff, #00e5b0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,color:"#fff",flexShrink:0,boxShadow:t?.avatar_url?"0 4px 10px rgba(0,0,0,0.12)":"0 4px 12px rgba(116,97,255,0.35)",overflow:"hidden"},children:t?.avatar_url?i.jsx("img",{src:t.avatar_url,alt:"Avatar",style:{width:"100%",height:"100%",objectFit:"cover"}}):g}),(0,i.jsxs)("div",{style:{minWidth:0},children:[i.jsx("div",{style:{fontSize:"12px",color:"var(--text)",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:t?.name?.split(" ")[0]??"Usu\xe1rio"}),i.jsx("div",{style:{fontSize:"10px",color:"var(--muted)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:t?.target_exam??"Concurso"})]})]}),i.jsx("div",{style:{height:"1px",background:"var(--sidebar-divider)",margin:"2px 0"}}),(0,i.jsxs)(a.default,{href:"/dashboard/aluno",onClick:()=>c(!1),className:`sb-nav-link${"/dashboard/aluno"===r?" active":""}`,style:{margin:0,padding:"7px 9px"},children:[i.jsx(j,{active:"/dashboard/aluno"===r}),"Area do Aluno"]})]})}),i.jsx("div",{style:{padding:"4px 12px 0"},children:i.jsx(v,{})}),i.jsx("nav",{style:{padding:"8px 10px 10px",flex:1,overflowY:"auto"},children:u.map(e=>(0,i.jsxs)("div",{style:{marginBottom:"10px"},children:[i.jsx("div",{style:{fontSize:"9px",color:"var(--muted)",letterSpacing:"2px",textTransform:"uppercase",padding:"8px 11px 5px",opacity:.85,fontWeight:600},children:e.section}),e.items.map(e=>{let t=r===e.href||"/dashboard"!==e.href&&r.startsWith(e.href);return(0,i.jsxs)(a.default,{href:e.href,onClick:()=>c(!1),className:`sb-nav-link${t?" active":""}`,children:[i.jsx(e.icon,{active:t}),e.label]},e.href)})]},e.section))}),i.jsx("div",{style:{padding:"8px 12px 12px",borderTop:"1px solid var(--sidebar-divider)"},children:i.jsx("button",{onClick:b,style:{width:"100%",padding:"8px",borderRadius:"9px",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.15)",color:"rgba(255,130,130,0.8)",fontSize:"12px",fontWeight:500,cursor:"pointer",transition:"all .16s ease",letterSpacing:"0.1px"},onMouseEnter:e=>{e.target.style.background="rgba(239,68,68,0.14)"},onMouseLeave:e=>{e.target.style.background="rgba(239,68,68,0.07)"},children:"Sair da conta"})})]})]})}function j({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("circle",{cx:"8",cy:"5",r:"2.5"}),i.jsx("path",{d:"M3 13c.8-2 2.6-3 5-3s4.2 1 5 3"})]})}function k({active:e}){return(0,i.jsxs)("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",style:{opacity:e?1:.7,flexShrink:0},children:[i.jsx("path",{d:"M8 1.5l5 2v3.9c0 3.1-1.9 5.9-5 7.1-3.1-1.2-5-4-5-7.1V3.5l5-2z"}),i.jsx("path",{d:"M6.2 8.1l1.2 1.2 2.5-2.8",strokeLinecap:"round",strokeLinejoin:"round"})]})}},85014:(e,t,r)=>{"use strict";r.d(t,{e:()=>s});var i=r(13215);function s(){return(0,i.createBrowserClient)("https://xxxxxxxxxxxx.supabase.co","sua_anon_key_aqui")}},94123:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>n});var i=r(72051),s=r(41288),a=r(86660);let o=(0,r(45347).createProxy)(String.raw`C:\Users\Meu computador\Documents\Repositórios\components\ui\Sidebar.tsx#default`);async function n({children:e}){let t=await (0,a.e)(),{data:{user:r}}=await t.auth.getUser();r||(0,s.redirect)("/auth/login");let{data:n}=await t.from("profiles").select("*").eq("id",r.id).maybeSingle();return(0,i.jsxs)(i.Fragment,{children:[i.jsx("style",{children:`
        @media (max-width: 960px) {
          .dashboard-main {
            padding-top: 58px;
          }
        }
      `}),(0,i.jsxs)("div",{style:{display:"flex",height:"100vh",overflow:"hidden",background:"var(--bg)"},children:[i.jsx(o,{user:r,profile:n}),i.jsx("main",{className:"dashboard-main",style:{flex:1,minWidth:0,overflow:"auto",display:"flex",flexDirection:"column"},children:e})]})]})}},89455:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o,metadata:()=>a});var i=r(72051);r(67272);let s=(0,r(45347).createProxy)(String.raw`C:\Users\Meu computador\Documents\Repositórios\components\ThemeProvider.tsx#ThemeProvider`),a={title:"StudyAI — Estudo inteligente para concursos",description:"Plataforma de estudos com IA para concurseiros. Resumos, flashcards, quest\xf5es e cronograma em um s\xf3 lugar.",keywords:["concursos","estudo","IA","flashcards","resumos","quest\xf5es"]};function o({children:e}){return i.jsx("html",{lang:"pt-BR",suppressHydrationWarning:!0,children:i.jsx("body",{children:i.jsx(s,{attribute:"class",defaultTheme:"system",enableSystem:!0,children:e})})})}},86660:(e,t,r)=>{"use strict";r.d(t,{e:()=>a});var i=r(27084),s=r(52845);function a(){let e=(0,s.cookies)();return(0,i.createServerClient)("https://xxxxxxxxxxxx.supabase.co","sua_anon_key_aqui",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:i})=>{e.set(t,r,i)})}catch{}}}})}},67272:()=>{}};