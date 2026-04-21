(()=>{var e={};e.id=305,e.ids=[305],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},66335:(e,r,a)=>{"use strict";a.r(r),a.d(r,{GlobalError:()=>d.a,__next_app__:()=>p,originalPathname:()=>u,pages:()=>c,routeModule:()=>x,tree:()=>s}),a(25401),a(94123),a(89455),a(90996);var t=a(30170),i=a(45002),o=a(83876),d=a.n(o),n=a(66299),l={};for(let e in n)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>n[e]);a.d(r,l);let s=["",{children:["dashboard",{children:["admin",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,25401)),"C:\\Users\\Meu computador\\Documents\\Reposit\xf3rios\\app\\dashboard\\admin\\page.tsx"]}]},{}]},{layout:[()=>Promise.resolve().then(a.bind(a,94123)),"C:\\Users\\Meu computador\\Documents\\Reposit\xf3rios\\app\\dashboard\\layout.tsx"]}]},{layout:[()=>Promise.resolve().then(a.bind(a,89455)),"C:\\Users\\Meu computador\\Documents\\Reposit\xf3rios\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,90996,23)),"next/dist/client/components/not-found-error"]}],c=["C:\\Users\\Meu computador\\Documents\\Reposit\xf3rios\\app\\dashboard\\admin\\page.tsx"],u="/dashboard/admin/page",p={require:a,loadChunk:()=>Promise.resolve()},x=new t.AppPageRouteModule({definition:{kind:i.x.APP_PAGE,page:"/dashboard/admin/page",pathname:"/dashboard/admin",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:s}})},10911:(e,r,a)=>{Promise.resolve().then(a.bind(a,29699)),Promise.resolve().then(a.bind(a,40492))},29699:(e,r,a)=>{"use strict";a.d(r,{default:()=>l});var t=a(97247),i=a(28964);function o(e){let r=new Date(`${e}T00:00:00`);return Number.isNaN(r.getTime())?e:new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(r)}function d(e){let r=new Date(e);return Number.isNaN(r.getTime())?"Nao informado":new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(r)}function n(e,r,a){return e||r||`${a.slice(0,8)}...${a.slice(-4)}`}function l({usageRows:e}){let[r,a]=(0,i.useState)(""),[l,s]=(0,i.useState)(()=>Array.from(new Set(e.map(e=>e.usage_date)))[0]??""),c=(0,i.useMemo)(()=>Array.from(new Set(e.map(e=>e.usage_date))),[e]),u=e.filter(e=>(!l||e.usage_date===l)&&[e.name??"",e.email??"",e.plan_tier??"",e.role??"",e.user_id].join(" ").toLowerCase().includes(r.trim().toLowerCase())),p=u.reduce((e,r)=>e+r.alto_busca_count,0),x=u.reduce((e,r)=>e+r.advanced_busca_count,0),m=u.filter(e=>e.alto_busca_count>0||e.advanced_busca_count>0).length;return(0,t.jsxs)(t.Fragment,{children:[t.jsx("style",{children:`
        .admin-usage-table {
          width: 100%;
          border-collapse: collapse;
        }
        .admin-usage-table th,
        .admin-usage-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border,#1f2640);
          text-align: left;
          vertical-align: middle;
        }
        .admin-usage-table th {
          font-size: 11px;
          color: var(--muted,#6b7194);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          white-space: nowrap;
        }
        .admin-usage-table td {
          font-size: 13px;
          color: var(--text,#e8eaf6);
        }
        .admin-usage-toolbar {
          padding: 18px 20px;
          border-bottom: 1px solid var(--border,#1f2640);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .admin-usage-toolbar-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .admin-usage-mobile {
          display: none;
          padding: 14px;
          gap: 12px;
        }
        .admin-usage-card {
          border: 1px solid var(--border,#1f2640);
          background: var(--surface2,#181d2e);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .admin-usage-card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1080px) {
          .admin-usage-desktop {
            display: none;
          }
          .admin-usage-mobile {
            display: grid;
          }
        }
        @media (max-width: 760px) {
          .admin-usage-toolbar {
            align-items: stretch;
          }
          .admin-usage-toolbar-controls {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
          }
          .admin-usage-card-grid {
            grid-template-columns: 1fr;
          }
        }
      `}),(0,t.jsxs)("section",{style:{background:"var(--surface,#111420)",border:"1px solid var(--border,#1f2640)",borderRadius:"18px",overflow:"hidden"},children:[(0,t.jsxs)("div",{className:"admin-usage-toolbar",children:[(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"16px",fontWeight:700,color:"var(--text,#e8eaf6)"},children:"Uso diario"}),t.jsx("div",{style:{fontSize:"12px",color:"var(--muted,#6b7194)",marginTop:"4px"},children:"Acompanhe o consumo de Alto Busca e Busca Avancada por usuario e por data."})]}),(0,t.jsxs)("div",{className:"admin-usage-toolbar-controls",children:[t.jsx("select",{value:l,onChange:e=>s(e.target.value),style:{minWidth:"170px",background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"var(--text,#e8eaf6)",padding:"10px 12px",outline:"none"},children:0===c.length?t.jsx("option",{value:"",children:"Sem dados"}):c.map(e=>t.jsx("option",{value:e,children:o(e)},e))}),t.jsx("input",{value:r,onChange:e=>a(e.target.value),placeholder:"Filtrar por usuario, email, role ou plano...",style:{width:"320px",maxWidth:"100%",background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"var(--text,#e8eaf6)",padding:"10px 12px",outline:"none"}})]})]}),t.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"12px",padding:"18px 20px",borderBottom:"1px solid var(--border,#1f2640)"},children:[{label:"Usuarios ativos",value:String(m),color:"#fff"},{label:"Alto Busca",value:String(p),color:"#34d399"},{label:"Busca avancada",value:String(x),color:"#60a5fa"},{label:"Registros",value:String(u.length),color:"#fbbf24"}].map(e=>(0,t.jsxs)("div",{style:{background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"14px",padding:"14px 16px"},children:[t.jsx("div",{style:{fontSize:"11px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px"},children:e.label}),t.jsx("div",{style:{fontSize:"26px",fontWeight:800,color:e.color,marginTop:"8px"},children:e.value})]},e.label))}),t.jsx("div",{className:"admin-usage-desktop",children:t.jsx("div",{className:"admin-usage-wrap",style:{overflowX:"auto"},children:(0,t.jsxs)("table",{className:"admin-usage-table",children:[t.jsx("thead",{children:(0,t.jsxs)("tr",{children:[t.jsx("th",{children:"Usuario"}),t.jsx("th",{children:"Role"}),t.jsx("th",{children:"Plano"}),t.jsx("th",{children:"Alto Busca"}),t.jsx("th",{children:"Avancada"}),t.jsx("th",{children:"Ultima atualizacao"})]})}),t.jsx("tbody",{children:0===u.length?t.jsx("tr",{children:t.jsx("td",{colSpan:6,style:{padding:"22px 14px",color:"var(--muted,#6b7194)",textAlign:"center"},children:"Nenhum registro encontrado para os filtros atuais."})}):u.map(e=>(0,t.jsxs)("tr",{children:[t.jsx("td",{children:(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",gap:"3px"},children:[t.jsx("strong",{style:{color:"var(--text,#e8eaf6)",fontSize:"13px"},children:n(e.name,e.email,e.user_id)}),t.jsx("span",{style:{color:"var(--muted,#6b7194)",fontSize:"12px"},children:e.email||`${e.user_id.slice(0,8)}...${e.user_id.slice(-4)}`})]})}),t.jsx("td",{style:{color:"admin"===e.role?"#fbbf24":"var(--muted,#6b7194)",fontWeight:700},children:"admin"===e.role?"Admin":"User"}),t.jsx("td",{style:{color:"var(--muted,#6b7194)"},children:e.plan_tier||"gratuito"}),t.jsx("td",{style:{color:"#34d399",fontWeight:700},children:e.alto_busca_count}),t.jsx("td",{style:{color:"#60a5fa",fontWeight:700},children:e.advanced_busca_count}),t.jsx("td",{style:{color:"var(--muted,#6b7194)"},children:d(e.updated_at)})]},e.id))})]})})}),t.jsx("div",{className:"admin-usage-mobile",children:0===u.length?t.jsx("div",{style:{padding:"18px",borderRadius:"14px",border:"1px solid var(--border,#1f2640)",background:"var(--surface2,#181d2e)",color:"var(--muted,#6b7194)",textAlign:"center"},children:"Nenhum registro encontrado para os filtros atuais."}):u.map(e=>(0,t.jsxs)("div",{className:"admin-usage-card",children:[(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",gap:"4px"},children:[t.jsx("strong",{style:{color:"var(--text,#e8eaf6)",fontSize:"14px"},children:n(e.name,e.email,e.user_id)}),t.jsx("span",{style:{color:"var(--muted,#6b7194)",fontSize:"12px"},children:e.email||`${e.user_id.slice(0,8)}...${e.user_id.slice(-4)}`})]}),(0,t.jsxs)("div",{className:"admin-usage-card-grid",children:[(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Role"}),t.jsx("div",{style:{fontSize:"13px",color:"admin"===e.role?"#fbbf24":"var(--text,#e8eaf6)",fontWeight:700},children:"admin"===e.role?"Admin":"User"})]}),(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Plano"}),t.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)"},children:e.plan_tier||"gratuito"})]}),(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Alto Busca"}),t.jsx("div",{style:{fontSize:"13px",color:"#34d399",fontWeight:700},children:e.alto_busca_count})]}),(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Avancada"}),t.jsx("div",{style:{fontSize:"13px",color:"#60a5fa",fontWeight:700},children:e.advanced_busca_count})]}),(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Data"}),t.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)"},children:o(e.usage_date)})]}),(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Atualizado"}),t.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)"},children:d(e.updated_at)})]})]})]},e.id))})]})]})}},40492:(e,r,a)=>{"use strict";a.d(r,{default:()=>c});var t=a(97247),i=a(28964),o=a(34178);let d=[{value:"gratuito",label:"Gratuito"},{value:"basico",label:"Basico"},{value:"premium",label:"Premium"}],n=[{value:"user",label:"User"},{value:"admin",label:"Admin"}];function l(e){let r=new Date(e);return Number.isNaN(r.getTime())?"Nao informado":new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(r)}function s(e){return e?`${e.slice(0,8)}...${e.slice(-4)}`:"Sem identificador"}function c({users:e}){var r;let a=(0,o.useRouter)(),[c,u]=(0,i.useTransition)(),[p,x]=(0,i.useState)(""),[m,f]=(0,i.useState)("all"),[g,h]=(0,i.useState)("all"),[v,b]=(0,i.useState)("all"),[y,j]=(0,i.useState)(Object.fromEntries(e.map(e=>[e.id,{planTier:e.plan_tier??"gratuito",role:"admin"===e.role?"admin":"user"}]))),[_,S]=(0,i.useState)(null),[w,R]=(0,i.useState)(null),k=(0,i.useMemo)(()=>e.filter(e=>{if(![e.name??"",e.email??"",e.id,e.target_exam??"",e.plan_tier??"",e.role??""].join(" ").toLowerCase().includes(p.trim().toLowerCase())||"all"!==m&&("admin"===e.role?"admin":"user")!==m||"all"!==g&&(e.plan_tier??"gratuito")!==g)return!1;let r=e.alto_today>0||e.advanced_today>0;return("used_today"!==v||!!r)&&("no_usage_today"!==v||!r)}),[e,p,m,g,v]),z=e.filter(e=>e.alto_today>0||e.advanced_today>0).length,N=e.filter(e=>"admin"===e.role).length,T=e.filter(e=>"premium"===e.plan_tier).length;async function P(e){let r=y[e];if(r){S(e),R(null);try{let t=await fetch(`/api/admin/users/${e}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({planTier:r.planTier,role:r.role})}),i=await t.json().catch(()=>({}));if(!t.ok)throw Error(i.error||"Nao foi possivel atualizar o usuario.");R({tone:i.auditWarning?"neutral":"success",text:i.message||"Alteracoes salvas com sucesso."}),u(()=>a.refresh())}catch(e){R({tone:"error",text:e instanceof Error?e.message:"Falha inesperada ao atualizar o usuario."})}finally{S(null)}}}return(0,t.jsxs)(t.Fragment,{children:[t.jsx("style",{children:`
        .admin-users-table {
          width: 100%;
          border-collapse: collapse;
        }
        .admin-users-table th,
        .admin-users-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border,#1f2640);
          text-align: left;
          vertical-align: middle;
        }
        .admin-users-table th {
          font-size: 11px;
          color: var(--muted,#6b7194);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          white-space: nowrap;
        }
        .admin-users-table td {
          font-size: 13px;
          color: var(--text,#e8eaf6);
        }
        .admin-users-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(110px, 1fr));
          gap: 10px;
          min-width: 340px;
        }
        .admin-users-filters {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border,#1f2640);
          display: grid;
          grid-template-columns: minmax(220px,1.4fr) repeat(3, minmax(160px,.6fr));
          gap: 10px;
        }
        .admin-users-mobile {
          display: none;
          padding: 14px;
          gap: 12px;
        }
        .admin-user-card {
          border: 1px solid var(--border,#1f2640);
          background: var(--surface2,#181d2e);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .admin-user-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .admin-user-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1400px) {
          .admin-users-filters {
            grid-template-columns: repeat(2, minmax(220px, 1fr));
          }
        }
        @media (max-width: 1180px) {
          .admin-users-stats {
            min-width: 100%;
          }
        }
        @media (max-width: 1080px) {
          .admin-users-desktop {
            display: none;
          }
          .admin-users-mobile {
            display: grid;
          }
        }
        @media (max-width: 760px) {
          .admin-users-filters {
            grid-template-columns: 1fr;
          }
          .admin-users-stats {
            grid-template-columns: 1fr;
          }
          .admin-user-meta,
          .admin-user-fields {
            grid-template-columns: 1fr;
          }
        }
      `}),(0,t.jsxs)("section",{style:{background:"var(--surface,#111420)",border:"1px solid var(--border,#1f2640)",borderRadius:"18px",overflow:"hidden"},children:[(0,t.jsxs)("div",{style:{padding:"18px 20px",borderBottom:"1px solid var(--border,#1f2640)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"16px",flexWrap:"wrap"},children:[(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"16px",fontWeight:700,color:"var(--text,#e8eaf6)"},children:"Gestao de usuarios"}),t.jsx("div",{style:{fontSize:"12px",color:"var(--muted,#6b7194)",marginTop:"4px",maxWidth:"560px",lineHeight:1.6},children:"Promova ou revogue administradores, ajuste planos e acompanhe o consumo do dia com filtros operacionais mais completos."})]}),t.jsx("div",{className:"admin-users-stats",children:[{label:"Admins",value:String(N),color:"#fbbf24"},{label:"Premium",value:String(T),color:"#60a5fa"},{label:"Uso hoje",value:String(z),color:"#34d399"}].map(e=>(0,t.jsxs)("div",{style:{background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"14px",padding:"12px 14px"},children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px"},children:e.label}),t.jsx("div",{style:{fontSize:"24px",fontWeight:800,color:e.color,marginTop:"6px"},children:e.value})]},e.label))})]}),(0,t.jsxs)("div",{className:"admin-users-filters",children:[t.jsx("input",{value:p,onChange:e=>x(e.target.value),placeholder:"Buscar por nome, email, id, role ou concurso...",style:{width:"100%",background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"var(--text,#e8eaf6)",padding:"10px 12px",outline:"none"}}),(0,t.jsxs)("select",{value:m,onChange:e=>f(e.target.value),style:{background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"var(--text,#e8eaf6)",padding:"10px 12px",outline:"none"},children:[t.jsx("option",{value:"all",children:"Todas as roles"}),t.jsx("option",{value:"admin",children:"Apenas admins"}),t.jsx("option",{value:"user",children:"Apenas users"})]}),(0,t.jsxs)("select",{value:g,onChange:e=>h(e.target.value),style:{background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"var(--text,#e8eaf6)",padding:"10px 12px",outline:"none"},children:[t.jsx("option",{value:"all",children:"Todos os planos"}),t.jsx("option",{value:"gratuito",children:"Gratuito"}),t.jsx("option",{value:"basico",children:"Basico"}),t.jsx("option",{value:"premium",children:"Premium"})]}),(0,t.jsxs)("select",{value:v,onChange:e=>b(e.target.value),style:{background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"var(--text,#e8eaf6)",padding:"10px 12px",outline:"none"},children:[t.jsx("option",{value:"all",children:"Todo uso de hoje"}),t.jsx("option",{value:"used_today",children:"Com uso hoje"}),t.jsx("option",{value:"no_usage_today",children:"Sem uso hoje"})]})]}),w&&t.jsx("div",{style:{margin:"16px 20px 0",padding:"12px 14px",borderRadius:"12px",fontSize:"13px",..."success"===(r=w.tone)?{border:"1px solid rgba(16,185,129,.25)",background:"rgba(16,185,129,.1)",color:"#34d399"}:"error"===r?{border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.1)",color:"#f87171"}:{border:"1px solid rgba(245,158,11,.25)",background:"rgba(245,158,11,.1)",color:"#fbbf24"}},children:w.text}),t.jsx("div",{className:"admin-users-desktop",children:t.jsx("div",{className:"admin-users-wrap",style:{overflowX:"auto"},children:(0,t.jsxs)("table",{className:"admin-users-table",children:[t.jsx("thead",{children:(0,t.jsxs)("tr",{children:[t.jsx("th",{children:"Usuario"}),t.jsx("th",{children:"Concurso"}),t.jsx("th",{children:"Uso hoje"}),t.jsx("th",{children:"Role"}),t.jsx("th",{children:"Plano"}),t.jsx("th",{children:"Criado em"}),t.jsx("th",{children:"Acoes"})]})}),t.jsx("tbody",{children:0===k.length?t.jsx("tr",{children:t.jsx("td",{colSpan:7,style:{padding:"22px 14px",color:"var(--muted,#6b7194)",textAlign:"center"},children:"Nenhum usuario encontrado com os filtros atuais."})}):k.map(e=>{let r=y[e.id]??{planTier:e.plan_tier??"gratuito",role:"admin"===e.role?"admin":"user"},a=_===e.id,i=r.planTier!==(e.plan_tier??"gratuito")||r.role!==("admin"===e.role?"admin":"user");return(0,t.jsxs)("tr",{children:[t.jsx("td",{children:(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",gap:"3px"},children:[t.jsx("strong",{style:{color:"var(--text,#e8eaf6)",fontSize:"13px"},children:e.name||"Sem nome"}),t.jsx("span",{style:{color:"var(--muted,#6b7194)",fontSize:"12px"},children:e.email||s(e.id)}),t.jsx("span",{style:{color:"var(--muted,#6b7194)",fontSize:"11px"},children:s(e.id)})]})}),t.jsx("td",{style:{color:"var(--muted,#6b7194)"},children:e.target_exam||"Nao informado"}),t.jsx("td",{children:(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",gap:"4px"},children:[(0,t.jsxs)("span",{style:{color:"#34d399",fontWeight:700},children:["Alto: ",e.alto_today]}),(0,t.jsxs)("span",{style:{color:"#60a5fa",fontWeight:700},children:["Avancada: ",e.advanced_today]})]})}),t.jsx("td",{children:t.jsx("select",{value:r.role,onChange:a=>j(t=>({...t,[e.id]:{...t[e.id]??r,role:a.target.value}})),disabled:a||c,style:{minWidth:"110px",background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"admin"===r.role?"#fbbf24":"var(--text,#e8eaf6)",padding:"9px 10px",outline:"none",fontWeight:700},children:n.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))})}),t.jsx("td",{children:t.jsx("select",{value:r.planTier,onChange:a=>j(t=>({...t,[e.id]:{...t[e.id]??r,planTier:a.target.value}})),disabled:a||c,style:{minWidth:"130px",background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"var(--text,#e8eaf6)",padding:"9px 10px",outline:"none"},children:d.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))})}),t.jsx("td",{style:{color:"var(--muted,#6b7194)"},children:l(e.created_at)}),t.jsx("td",{children:t.jsx("button",{type:"button",onClick:()=>P(e.id),disabled:!i||a||c,style:{padding:"9px 12px",borderRadius:"10px",border:"none",background:!i||a||c?"var(--surface2,#181d2e)":"var(--accent,#6c63ff)",color:!i||a||c?"var(--muted,#6b7194)":"#fff",fontSize:"12px",fontWeight:700,cursor:!i||a||c?"default":"pointer",minWidth:"128px"},children:a?"Salvando...":"Salvar alteracoes"})})]},e.id)})})]})})}),t.jsx("div",{className:"admin-users-mobile",children:0===k.length?t.jsx("div",{style:{padding:"18px",borderRadius:"14px",border:"1px solid var(--border,#1f2640)",background:"var(--surface2,#181d2e)",color:"var(--muted,#6b7194)",textAlign:"center"},children:"Nenhum usuario encontrado com os filtros atuais."}):k.map(e=>{let r=y[e.id]??{planTier:e.plan_tier??"gratuito",role:"admin"===e.role?"admin":"user"},a=_===e.id,i=r.planTier!==(e.plan_tier??"gratuito")||r.role!==("admin"===e.role?"admin":"user");return(0,t.jsxs)("div",{className:"admin-user-card",children:[(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",gap:"4px"},children:[t.jsx("strong",{style:{color:"var(--text,#e8eaf6)",fontSize:"14px"},children:e.name||"Sem nome"}),t.jsx("span",{style:{color:"var(--muted,#6b7194)",fontSize:"12px"},children:e.email||s(e.id)}),t.jsx("span",{style:{color:"var(--muted,#6b7194)",fontSize:"11px"},children:s(e.id)})]}),(0,t.jsxs)("div",{className:"admin-user-meta",children:[(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Concurso"}),t.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)"},children:e.target_exam||"Nao informado"})]}),(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Criado em"}),t.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)"},children:l(e.created_at)})]}),(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Alto hoje"}),t.jsx("div",{style:{fontSize:"13px",color:"#34d399",fontWeight:700},children:e.alto_today})]}),(0,t.jsxs)("div",{children:[t.jsx("div",{style:{fontSize:"10px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"},children:"Avancada hoje"}),t.jsx("div",{style:{fontSize:"13px",color:"#60a5fa",fontWeight:700},children:e.advanced_today})]})]}),(0,t.jsxs)("div",{className:"admin-user-fields",children:[t.jsx("select",{value:r.role,onChange:a=>j(t=>({...t,[e.id]:{...t[e.id]??r,role:a.target.value}})),disabled:a||c,style:{width:"100%",background:"var(--surface,#111420)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"admin"===r.role?"#fbbf24":"var(--text,#e8eaf6)",padding:"10px 12px",outline:"none",fontWeight:700},children:n.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))}),t.jsx("select",{value:r.planTier,onChange:a=>j(t=>({...t,[e.id]:{...t[e.id]??r,planTier:a.target.value}})),disabled:a||c,style:{width:"100%",background:"var(--surface,#111420)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",color:"var(--text,#e8eaf6)",padding:"10px 12px",outline:"none"},children:d.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))})]}),t.jsx("button",{type:"button",onClick:()=>P(e.id),disabled:!i||a||c,style:{width:"100%",padding:"11px 14px",borderRadius:"10px",border:"none",background:!i||a||c?"var(--surface,#111420)":"var(--accent,#6c63ff)",color:!i||a||c?"var(--muted,#6b7194)":"#fff",fontSize:"12px",fontWeight:700,cursor:!i||a||c?"default":"pointer"},children:a?"Salvando...":"Salvar alteracoes"})]},e.id)})})]})]})}},26323:(e,r,a)=>{"use strict";a.d(r,{Z:()=>l});var t=a(28964);let i=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),o=(...e)=>e.filter((e,r,a)=>!!e&&a.indexOf(e)===r).join(" ");var d={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};let n=(0,t.forwardRef)(({color:e="currentColor",size:r=24,strokeWidth:a=2,absoluteStrokeWidth:i,className:n="",children:l,iconNode:s,...c},u)=>(0,t.createElement)("svg",{ref:u,...d,width:r,height:r,stroke:e,strokeWidth:i?24*Number(a)/Number(r):a,className:o("lucide",n),...c},[...s.map(([e,r])=>(0,t.createElement)(e,r)),...Array.isArray(l)?l:[l]])),l=(e,r)=>{let a=(0,t.forwardRef)(({className:a,...d},l)=>(0,t.createElement)(n,{ref:l,iconNode:r,className:o(`lucide-${i(e)}`,a),...d}));return a.displayName=`${e}`,a}},17712:(e,r,a)=>{"use strict";a.d(r,{Z:()=>t});let t=(0,a(26323).Z)("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]])},6683:(e,r,a)=>{"use strict";a.d(r,{Z:()=>t});let t=(0,a(26323).Z)("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]])},5495:(e,r,a)=>{"use strict";a.d(r,{Z:()=>t});let t=(0,a(26323).Z)("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]])},56173:(e,r,a)=>{"use strict";a.d(r,{Z:()=>t});let t=(0,a(26323).Z)("Pause",[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]])},40721:(e,r,a)=>{"use strict";a.d(r,{Z:()=>t});let t=(0,a(26323).Z)("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]])},10302:(e,r,a)=>{"use strict";a.d(r,{Z:()=>t});let t=(0,a(26323).Z)("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]])},12662:(e,r,a)=>{"use strict";a.d(r,{Z:()=>t});let t=(0,a(26323).Z)("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]])},37013:(e,r,a)=>{"use strict";a.d(r,{Z:()=>t});let t=(0,a(26323).Z)("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]])},25401:(e,r,a)=>{"use strict";a.r(r),a.d(r,{default:()=>f});var t=a(72051),i=a(45347);let o=(0,i.createProxy)(String.raw`C:\Users\Meu computador\Documents\Repositórios\components\admin\AdminUsagePanel.tsx#default`),d=(0,i.createProxy)(String.raw`C:\Users\Meu computador\Documents\Repositórios\components\admin\AdminUsersPanel.tsx#default`);var n=a(41288),l=a(86660),s=a(48141);async function c(){let e=(0,l.e)(),{data:{user:r},error:a}=await e.auth.getUser();if(a||!r)return{supabase:e,user:null,profile:null,role:"user"};let{data:t}=await e.from("profiles").select("*").eq("id",r.id).maybeSingle();return{supabase:e,user:r,profile:t,role:(0,s.w)(t?.role)}}async function u(){let e=await c();return e.user||(0,n.redirect)("/auth/login"),"admin"!==e.role&&(0,n.redirect)("/dashboard"),e}var p=a(6274);async function x(e){let r=[],a=1;for(;;){let{data:t,error:i}=await e.auth.admin.listUsers({page:a,perPage:1e3});if(i)throw i;let o=t.users.map(e=>({id:e.id,email:e.email??null}));if(r.push(...o),o.length<1e3)break;a+=1}return r}function m(e){if(e instanceof Error)return e.message;if("string"==typeof e)return e;if(e&&"object"==typeof e&&"message"in e){let r=e.message;if("string"==typeof r&&r.trim())return r}try{return JSON.stringify(e)}catch{return"Falha inesperada ao carregar dados administrativos."}}async function f(){await u();let e=[],r=[],a="",i=[];try{let a=(0,p.i)(),t=new Date().toISOString().slice(0,10),o=function(e){let r=new Date;return r.setDate(r.getDate()-29),r.toISOString().slice(0,10)}(0),[d,n]=await Promise.all([a.from("profiles").select("id, name, plan_tier, role, target_exam, created_at").order("created_at",{ascending:!1}),a.from("usage_daily").select("id, user_id, usage_date, alto_busca_count, advanced_busca_count, updated_at").gte("usage_date",o).order("usage_date",{ascending:!1}).order("updated_at",{ascending:!1})]);if(d.error)throw d.error;if(n.error)throw n.error;let l=d.data??[],s=n.data??[],c=[];try{c=await x(a)}catch(e){i.push(`Nao foi possivel carregar emails via auth admin: ${m(e)}`)}let u=new Map(c.map(e=>[e.id,e.email])),f=new Map(l.map(e=>[e.id,e])),g=new Map;for(let e of s){if(e.usage_date!==t)continue;let r=g.get(e.user_id)??{alto:0,advanced:0};g.set(e.user_id,{alto:r.alto+(e.alto_busca_count??0),advanced:r.advanced+(e.advanced_busca_count??0)})}e=l.map(e=>{let r=g.get(e.id)??{alto:0,advanced:0};return{...e,email:u.get(e.id)??null,alto_today:r.alto,advanced_today:r.advanced}}),r=s.map(e=>{let r=f.get(e.user_id);return{...e,name:r?.name??null,email:u.get(e.user_id)??null,plan_tier:r?.plan_tier??null,role:r?.role??null}})}catch(e){a=m(e)}let n=e.length,l=e.filter(e=>"admin"===e.role).length,s=e.filter(e=>"premium"===e.plan_tier).length,c=e.filter(e=>"basico"===e.plan_tier).length,f=e.reduce((e,r)=>(e.alto+=r.alto_today,e.advanced+=r.advanced_today,e),{alto:0,advanced:0});return(0,t.jsxs)(t.Fragment,{children:[t.jsx("style",{children:`
        .admin-page-shell {
          padding: 28px 32px 36px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-height: 100%;
          background: var(--bg,#0a0c12);
        }
        .admin-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }
        .admin-hero-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(120px, 1fr));
          gap: 12px;
          min-width: 380px;
          max-width: 520px;
          flex: 1;
        }
        @media (max-width: 1180px) {
          .admin-page-shell {
            padding: 22px 18px 28px;
          }
          .admin-hero-metrics {
            min-width: 100%;
          }
        }
        @media (max-width: 760px) {
          .admin-page-shell {
            padding: 18px 14px 24px;
          }
          .admin-hero-metrics {
            grid-template-columns: repeat(2, minmax(120px, 1fr));
          }
        }
        @media (max-width: 520px) {
          .admin-hero-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}),(0,t.jsxs)("div",{className:"admin-page-shell",children:[t.jsx("section",{style:{background:"linear-gradient(135deg, rgba(245,158,11,.16), rgba(108,99,255,.14) 58%, rgba(17,20,32,.94))",border:"1px solid rgba(245,158,11,.18)",borderRadius:"20px",padding:"24px"},children:(0,t.jsxs)("div",{className:"admin-hero",children:[(0,t.jsxs)("div",{style:{maxWidth:"720px"},children:[t.jsx("div",{style:{display:"inline-flex",alignItems:"center",gap:"8px",borderRadius:"999px",padding:"6px 11px",border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"#fff",fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:".8px"},children:"Painel protegido"}),t.jsx("h1",{style:{margin:"14px 0 0",fontSize:"30px",lineHeight:1.08,letterSpacing:"-1px",color:"#fff"},children:"Administracao operacional com governanca de acesso e visao diaria de consumo."}),t.jsx("p",{style:{margin:"12px 0 0",maxWidth:"700px",fontSize:"14px",lineHeight:1.75,color:"rgba(232,234,246,.82)"},children:"Esta segunda camada libera promocao e revogacao de admins, filtros operacionais completos e leitura consolidada do uso diario por usuario."})]}),t.jsx("div",{className:"admin-hero-metrics",children:[{label:"Usuarios",value:String(n),color:"#fff"},{label:"Admins",value:String(l),color:"#fbbf24"},{label:"Planos Basico",value:String(c),color:"#34d399"},{label:"Planos Premium",value:String(s),color:"#60a5fa"},{label:"Alto hoje",value:String(f.alto),color:"#22c55e"},{label:"Avancada hoje",value:String(f.advanced),color:"#38bdf8"}].map(e=>(0,t.jsxs)("div",{style:{background:"rgba(7,10,18,.34)",border:"1px solid rgba(255,255,255,.08)",borderRadius:"16px",padding:"14px 16px"},children:[t.jsx("div",{style:{fontSize:"11px",color:"rgba(232,234,246,.62)",textTransform:"uppercase",letterSpacing:"1px"},children:e.label}),t.jsx("div",{style:{fontSize:"28px",fontWeight:800,color:e.color,marginTop:"8px"},children:e.value})]},e.label))})]})}),a&&(0,t.jsxs)("div",{style:{padding:"14px 16px",borderRadius:"14px",border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.08)",color:"#fca5a5",fontSize:"13px",lineHeight:1.7},children:["Nao foi possivel carregar os dados administrativos. Detalhe: ",a]}),!a&&i.length>0&&t.jsx("div",{style:{padding:"14px 16px",borderRadius:"14px",border:"1px solid rgba(245,158,11,.25)",background:"rgba(245,158,11,.08)",color:"#fbbf24",fontSize:"13px",lineHeight:1.7},children:i.join(" | ")}),t.jsx(d,{users:e}),t.jsx(o,{usageRows:r})]})]})}},48141:(e,r,a)=>{"use strict";function t(e){return"admin"===e?"admin":"user"}a.d(r,{w:()=>t})},6274:(e,r,a)=>{"use strict";a.d(r,{i:()=>i});var t=a(30311);function i(){let e="https://xxxxxxxxxxxx.supabase.co",r=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!e||!r)throw Error("SUPABASE_SERVICE_ROLE_KEY nao configurada no ambiente do servidor.");return(0,t.eI)(e,r,{auth:{autoRefreshToken:!1,persistSession:!1}})}},41288:(e,r,a)=>{"use strict";var t=a(71083);a.o(t,"redirect")&&a.d(r,{redirect:function(){return t.redirect}})},71083:(e,r,a)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),function(e,r){for(var a in r)Object.defineProperty(e,a,{enumerable:!0,get:r[a]})}(r,{ReadonlyURLSearchParams:function(){return d},RedirectType:function(){return t.RedirectType},notFound:function(){return i.notFound},permanentRedirect:function(){return t.permanentRedirect},redirect:function(){return t.redirect}});let t=a(1192),i=a(76868);class o extends Error{constructor(){super("Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams")}}class d extends URLSearchParams{append(){throw new o}delete(){throw new o}set(){throw new o}sort(){throw new o}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),e.exports=r.default)},76868:(e,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),function(e,r){for(var a in r)Object.defineProperty(e,a,{enumerable:!0,get:r[a]})}(r,{isNotFoundError:function(){return i},notFound:function(){return t}});let a="NEXT_NOT_FOUND";function t(){let e=Error(a);throw e.digest=a,e}function i(e){return"object"==typeof e&&null!==e&&"digest"in e&&e.digest===a}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),e.exports=r.default)},83701:(e,r)=>{"use strict";var a;Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"RedirectStatusCode",{enumerable:!0,get:function(){return a}}),function(e){e[e.SeeOther=303]="SeeOther",e[e.TemporaryRedirect=307]="TemporaryRedirect",e[e.PermanentRedirect=308]="PermanentRedirect"}(a||(a={})),("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),e.exports=r.default)},1192:(e,r,a)=>{"use strict";var t;Object.defineProperty(r,"__esModule",{value:!0}),function(e,r){for(var a in r)Object.defineProperty(e,a,{enumerable:!0,get:r[a]})}(r,{RedirectType:function(){return t},getRedirectError:function(){return l},getRedirectStatusCodeFromError:function(){return m},getRedirectTypeFromError:function(){return x},getURLFromRedirectError:function(){return p},isRedirectError:function(){return u},permanentRedirect:function(){return c},redirect:function(){return s}});let i=a(54580),o=a(72934),d=a(83701),n="NEXT_REDIRECT";function l(e,r,a){void 0===a&&(a=d.RedirectStatusCode.TemporaryRedirect);let t=Error(n);t.digest=n+";"+r+";"+e+";"+a+";";let o=i.requestAsyncStorage.getStore();return o&&(t.mutableCookies=o.mutableCookies),t}function s(e,r){void 0===r&&(r="replace");let a=o.actionAsyncStorage.getStore();throw l(e,r,(null==a?void 0:a.isAction)?d.RedirectStatusCode.SeeOther:d.RedirectStatusCode.TemporaryRedirect)}function c(e,r){void 0===r&&(r="replace");let a=o.actionAsyncStorage.getStore();throw l(e,r,(null==a?void 0:a.isAction)?d.RedirectStatusCode.SeeOther:d.RedirectStatusCode.PermanentRedirect)}function u(e){if("object"!=typeof e||null===e||!("digest"in e)||"string"!=typeof e.digest)return!1;let[r,a,t,i]=e.digest.split(";",4),o=Number(i);return r===n&&("replace"===a||"push"===a)&&"string"==typeof t&&!isNaN(o)&&o in d.RedirectStatusCode}function p(e){return u(e)?e.digest.split(";",3)[2]:null}function x(e){if(!u(e))throw Error("Not a redirect error");return e.digest.split(";",2)[1]}function m(e){if(!u(e))throw Error("Not a redirect error");return Number(e.digest.split(";",4)[3])}(function(e){e.push="push",e.replace="replace"})(t||(t={})),("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),e.exports=r.default)}};var r=require("../../../webpack-runtime.js");r.C(e);var a=e=>r(r.s=e),t=r.X(0,[787,485,841,795,474],()=>a(66335));module.exports=t})();