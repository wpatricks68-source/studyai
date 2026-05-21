"use strict";exports.id=883,exports.ids=[883],exports.modules={32281:(e,i,r)=>{r.d(i,{Z:()=>l});var t=r(97247),o=r(28964),n=r(20579),a=r(30754),s=r(99219);function d(e){if("cv"===e.tipo)return"C"===e.gabarito?"CERTO":"E"===e.gabarito?"ERRADO":e.gabarito||"-";if("number"==typeof e.correct){let i=["A","B","C","D","E"][e.correct]??String(e.correct+1),r=e.options?.[e.correct];return r?`${i} - ${r}`:i}return e.gabarito||"-"}function p(e,i){return void 0!==i&&i===("cv"===e.tipo?e.gabarito??"":"number"==typeof e.correct?e.correct:null)}function l({questions:e,loading:i=!1,title:r="Quest\xf5es do tema",maxWidth:l=820,showEmptyState:x,genTarget:m=null,onOpenManual:u,onGenerateAI:g,onImport:f,onDelete:h,onEdit:b}){let[v,q]=(0,o.useState)({}),[w,y]=(0,o.useState)({}),[j,k]=(0,o.useState)(!1);(0,o.useMemo)(()=>e.map((e,i)=>e.id??`${i}:${e.question}`).join("|"),[e]);let N=x??!!(u||g);if(i)return(0,t.jsxs)("div",{className:"iq-shell",style:{maxWidth:l,width:"100%"},children:[t.jsx(c,{}),(0,t.jsxs)("div",{className:"iq-loading",children:[t.jsx("div",{className:"iq-spinner"}),"Gerando quest\xf5es..."]})]});if(0===e.length)return N?(0,t.jsxs)("div",{className:"iq-shell",style:{maxWidth:l,width:"100%"},children:[t.jsx(c,{}),(0,t.jsxs)("div",{className:"iq-empty",children:[t.jsx("div",{className:"iq-empty-icon",children:t.jsx(n.Z,{size:22})}),t.jsx("div",{className:"iq-empty-title",children:"Nenhuma quest\xe3o gerada ainda"}),t.jsx("div",{className:"iq-empty-copy",children:"Crie quest\xf5es para praticar sem sair do resumo."}),(0,t.jsxs)("div",{className:"iq-empty-actions",style:{display:"flex",gap:"6px",flexWrap:"wrap"},children:[f&&(0,t.jsxs)("button",{onClick:f,style:{padding:"6px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid var(--border,#1f2640)",background:"transparent",color:"var(--muted,#6b7194)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[t.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:t.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"})}),"Importar"]}),g&&(0,t.jsxs)("button",{onClick:g,style:{padding:"6px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid #f59e0b",background:"transparent",color:"#f59e0b",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[t.jsx(a.Z,{size:12}),"questions"===m?"Gerando...":"Gerar com IA"]}),u&&(0,t.jsxs)("button",{onClick:u,style:{padding:"6px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid var(--border,#1f2640)",background:"transparent",color:"var(--muted,#6b7194)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[t.jsx(s.Z,{size:12}),"Criar manualmente"]})]})]})]}):null;let z=Object.keys(w).length,C=Object.entries(w).filter(([i,r])=>!!r&&p(e[Number(i)],v[Number(i)])).length,S=z>0?Math.round(C/z*100):0;return(0,t.jsxs)("section",{className:"iq-shell",style:{maxWidth:l,width:"100%"},children:[t.jsx(c,{}),(0,t.jsxs)("div",{className:"iq-header",children:[(0,t.jsxs)("div",{children:[t.jsx("div",{className:"iq-title",children:r}),(0,t.jsxs)("div",{className:"iq-count",children:[e.length," quest",1!==e.length?"\xf5es":"\xe3o"]})]}),(0,t.jsxs)("div",{className:"iq-header-actions iq-screen-control",style:{display:"flex",gap:"6px",flexWrap:"wrap"},children:[f&&(0,t.jsxs)("button",{onClick:f,title:"Importar de arquivo TXT/CSV",style:{padding:"6px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid var(--border,#1f2640)",background:"transparent",color:"var(--muted,#6b7194)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[t.jsx("svg",{width:"12",height:"12",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:t.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"})}),"Importar"]}),u&&(0,t.jsxs)("button",{onClick:u,style:{padding:"6px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid var(--border,#1f2640)",background:"transparent",color:"var(--muted,#6b7194)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[t.jsx(s.Z,{size:12}),"Nova quest\xe3o"]}),g&&(0,t.jsxs)("button",{onClick:g,style:{padding:"6px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid #f59e0b",background:"transparent",color:"#f59e0b",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:[t.jsx(a.Z,{size:12}),"questions"===m?"Gerando...":"Gerar"]})]})]}),z>0&&(0,t.jsxs)("div",{className:"iq-score iq-screen-control",children:[(0,t.jsxs)("div",{className:"iq-score-value",style:{color:S>=70?"#10b981":S>=50?"#f59e0b":"#ef4444"},children:[S,"%"]}),(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"iq-score-main",children:[C," de ",z," corretas"]}),t.jsx("div",{className:"iq-score-sub",children:e.length-z>0?`${e.length-z} ainda n\xe3o respondida(s)`:"Todas respondidas"})]})]}),t.jsx("div",{className:"iq-list",children:e.map((e,i)=>{let r=void 0!==v[i],o=!!w[i],n=p(e,v[i]);return(0,t.jsxs)("article",{className:"iq-card",children:[(0,t.jsxs)("div",{className:"iq-card-header",children:[(0,t.jsxs)("div",{className:"iq-card-meta",children:[(0,t.jsxs)("span",{className:"iq-number",children:["Q",i+1]}),t.jsx("span",{className:"cv"===e.tipo?"iq-badge iq-badge-cv":"iq-badge iq-badge-mc",children:"cv"===e.tipo?"Certo / Errado":"M\xfaltipla escolha"})]}),e.banca&&t.jsx("span",{className:"iq-bank",children:e.banca}),(b||h)&&(0,t.jsxs)("div",{className:"iq-card-actions",children:[b&&t.jsx("button",{className:"iq-action-btn",onClick:()=>b(e),title:"Editar",children:(0,t.jsxs)("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),t.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),h&&t.jsx("button",{className:"iq-action-btn",onClick:()=>{e.id&&confirm("Excluir esta quest\xe3o?")&&h(e.id)},title:"Excluir",style:{opacity:e.id?1:.4,cursor:e.id?"pointer":"not-allowed"},children:(0,t.jsxs)("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[t.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),t.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18"})]})})]})]}),t.jsx("div",{className:"iq-question-text",children:e.question}),"cv"===e.tipo?t.jsx("div",{className:"iq-cv-options",children:["C","E"].map(r=>{let n=v[i]===r,a=r===e.gabarito,s=o?a?"iq-option-correct":n?"iq-option-wrong":"":n?"iq-option-selected":"";return t.jsx("button",{className:`iq-option-button ${s}`,onClick:()=>!o&&q(e=>({...e,[i]:r})),disabled:o,children:"C"===r?"Certo":"Errado"},r)})}):t.jsx("div",{className:"iq-mc-options",children:(e.options??[]).map((r,n)=>{let a=v[i]===n,s=n===e.correct,d=o?s?"iq-option-correct":a?"iq-option-wrong":"":a?"iq-option-selected":"";return(0,t.jsxs)("button",{className:`iq-option-button iq-mc-option ${d}`,onClick:()=>!o&&q(e=>({...e,[i]:n})),disabled:o,children:[t.jsx("span",{className:"iq-option-letter",children:["A","B","C","D","E"][n]}),t.jsx("span",{children:r})]},n)})}),o?(0,t.jsxs)("div",{className:n?"iq-feedback iq-feedback-correct iq-screen-control":"iq-feedback iq-feedback-wrong iq-screen-control",children:[t.jsx("div",{className:"iq-feedback-title",children:n?"Resposta correta":"Resposta incorreta"}),t.jsx("div",{className:"iq-feedback-copy",children:e.explanation||`Gabarito: ${d(e)}`})]}):t.jsx("button",{className:"iq-confirm iq-screen-control",onClick:()=>r&&y(e=>({...e,[i]:!0})),disabled:!r,children:"Confirmar resposta"}),(0,t.jsxs)("div",{className:"iq-print-answer",children:[t.jsx("strong",{children:"Gabarito:"})," ",d(e),e.explanation&&(0,t.jsxs)("div",{children:[t.jsx("strong",{children:"Explica\xe7\xe3o:"})," ",e.explanation]})]})]},e.id??i)})}),(0,t.jsxs)("div",{className:"iq-gabarito iq-screen-control",children:[t.jsx("button",{className:"iq-gabarito-toggle",onClick:()=>k(e=>!e),children:j?"Ocultar gabarito":"Ver gabarito"}),j&&t.jsx("div",{className:"iq-gabarito-list",children:e.map((e,i)=>(0,t.jsxs)("div",{className:"iq-gabarito-row",children:[(0,t.jsxs)("span",{className:"iq-gabarito-index",children:["Q",i+1]}),t.jsx("span",{className:"iq-gabarito-answer",children:d(e)})]},e.id??i))})]})]})}function c(){return t.jsx("style",{children:`
      .iq-shell {
        color: var(--text,#e8eaf6);
      }

      .iq-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }

      .iq-title {
        color: var(--text,#e8eaf6);
        font-size: 18px;
        font-weight: 700;
        line-height: 1.25;
      }

      .iq-count,
      .iq-score-sub,
      .iq-empty-copy {
        color: var(--muted,#6b7194);
        font-size: 12px;
        line-height: 1.5;
      }

      .iq-header-actions,
      .iq-empty-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .iq-primary-action,
      .iq-secondary-action,
      .iq-confirm,
      .iq-gabarito-toggle {
        border-radius: 8px;
        min-height: 36px;
        padding: 8px 13px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      }

      .iq-primary-action {
        border: none;
        background: var(--accent,#6c63ff);
        color: #fff;
      }

      .iq-secondary-action {
        border: 1px solid var(--border,#1f2640);
        background: var(--surface2,#181d2e);
        color: var(--text,#e8eaf6);
      }

      .iq-score,
      .iq-empty,
      .iq-card,
      .iq-gabarito-list {
        background: var(--surface,#111420);
        border: 1px solid var(--border,#1f2640);
        border-radius: 12px;
      }

      .iq-score {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 18px;
        margin-bottom: 18px;
      }

      .iq-score-value {
        min-width: 56px;
        font-size: 28px;
        font-weight: 800;
        line-height: 1;
      }

      .iq-score-main {
        color: var(--text,#e8eaf6);
        font-size: 13px;
        font-weight: 700;
      }

      .iq-list {
        display: grid;
        gap: 14px;
      }

      .iq-card {
        padding: 18px;
        break-inside: avoid;
      }

      .iq-card-header,
      .iq-card-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .iq-card-header {
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .iq-card-actions {
        display: flex;
        gap: 4px;
      }

      .iq-action-btn {
        background: var(--surface2,#181d2e);
        border: 1px solid var(--border,#1f2640);
        border-radius: 6px;
        width: 26px;
        height: 26px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--muted,#6b7194);
        transition: all .15s;
      }

      .iq-action-btn:hover {
        color: var(--accent,#6c63ff);
      }

      .iq-action-btn:last-child:hover {
        color: #ef4444;
      }

      .iq-number {
        color: var(--accent,#6c63ff);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .iq-badge {
        border-radius: 5px;
        padding: 3px 7px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .iq-badge-cv {
        background: rgba(245,158,11,.12);
        color: #f59e0b;
      }

      .iq-badge-mc {
        background: rgba(108,99,255,.12);
        color: var(--accent,#6c63ff);
      }

      .iq-bank {
        color: var(--muted,#6b7194);
        font-size: 10px;
      }

      .iq-question-text {
        color: var(--text,#e8eaf6);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.7;
        margin-bottom: 16px;
        overflow-wrap: anywhere;
      }

      .iq-cv-options {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .iq-mc-options {
        display: grid;
        gap: 8px;
      }

      .iq-option-button {
        width: 100%;
        border: 1px solid var(--border,#1f2640);
        border-radius: 8px;
        background: var(--surface2,#181d2e);
        color: var(--text,#e8eaf6);
        min-height: 42px;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all .15s;
        text-align: left;
      }

      .iq-option-button:disabled {
        cursor: default;
      }

      .iq-mc-option {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-weight: 500;
        line-height: 1.55;
      }

      .iq-option-letter {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid currentColor;
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
      }

      .iq-option-selected {
        border-color: var(--accent,#6c63ff);
        background: rgba(108,99,255,.12);
        color: var(--accent,#6c63ff);
      }

      .iq-option-correct {
        border-color: #10b981;
        background: rgba(16,185,129,.12);
        color: #34d399;
      }

      .iq-option-wrong {
        border-color: #ef4444;
        background: rgba(239,68,68,.10);
        color: #f87171;
      }

      .iq-confirm {
        width: 100%;
        border: none;
        background: var(--accent,#6c63ff);
        color: #fff;
        margin-top: 14px;
      }

      .iq-confirm:disabled {
        background: var(--surface2,#181d2e);
        color: var(--muted,#6b7194);
        cursor: default;
      }

      .iq-feedback {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 8px;
        line-height: 1.65;
      }

      .iq-feedback-correct {
        border: 1px solid rgba(16,185,129,.3);
        background: rgba(16,185,129,.08);
      }

      .iq-feedback-wrong {
        border: 1px solid rgba(239,68,68,.25);
        background: rgba(239,68,68,.08);
      }

      .iq-feedback-title {
        font-size: 12px;
        font-weight: 800;
        margin-bottom: 4px;
      }

      .iq-feedback-correct .iq-feedback-title {
        color: #34d399;
      }

      .iq-feedback-wrong .iq-feedback-title {
        color: #f87171;
      }

      .iq-feedback-copy {
        color: #c8cae6;
        font-size: 12px;
      }

      .iq-gabarito {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--border,#1f2640);
      }

      .iq-gabarito-toggle {
        width: 100%;
        border: 1px solid var(--border,#1f2640);
        background: transparent;
        color: var(--muted,#6b7194);
      }

      .iq-gabarito-list {
        margin-top: 12px;
        overflow: hidden;
      }

      .iq-gabarito-row {
        display: grid;
        grid-template-columns: 54px minmax(0, 1fr);
        gap: 10px;
        padding: 11px 14px;
        border-bottom: 1px solid var(--border,#1f2640);
        font-size: 13px;
      }

      .iq-gabarito-row:last-child {
        border-bottom: none;
      }

      .iq-gabarito-index {
        color: var(--accent,#6c63ff);
        font-weight: 800;
      }

      .iq-gabarito-answer {
        color: var(--text,#e8eaf6);
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .iq-empty {
        padding: 34px 20px;
        text-align: center;
      }

      .iq-empty-icon {
        width: 42px;
        height: 42px;
        margin: 0 auto 12px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--accent,#6c63ff);
        background: rgba(108,99,255,.12);
      }

      .iq-empty-title {
        color: var(--text,#e8eaf6);
        font-size: 15px;
        font-weight: 800;
        margin-bottom: 5px;
      }

      .iq-empty-actions {
        justify-content: center;
        margin-top: 18px;
      }

      .iq-loading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--muted,#6b7194);
        font-size: 13px;
        padding: 18px 0;
      }

      .iq-spinner {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid var(--accent,#6c63ff);
        border-top-color: transparent;
        animation: iq-spin .7s linear infinite;
      }

      .iq-print-answer {
        display: none;
      }

      @keyframes iq-spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 720px) {
        .iq-header {
          align-items: stretch;
          flex-direction: column;
        }

        .iq-header-actions,
        .iq-empty-actions {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
        }

        .iq-compact-action,
        .iq-empty-actions button {
          width: 100%;
        }

        .iq-score {
          align-items: flex-start;
          padding: 13px 14px;
        }

        .iq-card {
          padding: 14px;
        }

        .iq-card-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .iq-question-text {
          font-size: 13px;
          line-height: 1.65;
        }

        .iq-cv-options {
          grid-template-columns: 1fr;
        }

        .iq-gabarito-row {
          grid-template-columns: 44px minmax(0, 1fr);
          padding: 10px 12px;
        }
      }

      @media print {
        .iq-screen-control {
          display: none !important;
        }

        .iq-shell,
        .iq-card,
        .iq-question-text,
        .iq-card * {
          color: #111 !important;
        }

        .iq-card {
          background: #fff !important;
          border-color: #d7dbe7 !important;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .iq-option-button {
          background: #fff !important;
          border-color: #d7dbe7 !important;
          color: #111 !important;
        }

        .iq-print-answer {
          display: block !important;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px dashed #ccd2e1;
          font-size: 12px;
          line-height: 1.55;
          color: #111 !important;
        }
      }
    `})}},62883:(e,i,r)=>{r.d(i,{Z:()=>d});var t=r(97247),o=r(754),n=r(37013),a=r(32281);function s(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}function d({title:e,subtitle:i,resumo:r,flashcards:d=[],questions:p=[],onClose:l}){let c=function(e){if(!e)return"";try{let i=JSON.parse(e);if(i?.type==="rich"&&"string"==typeof i.canvas)return i.canvas}catch{}return""}(r);return(0,t.jsxs)("div",{id:"resumo-print-window",style:{position:"fixed",inset:0,zIndex:1e3,background:"var(--bg,#0a0c12)",display:"flex",flexDirection:"column",color:"var(--text,#e8eaf6)"},children:[t.jsx("style",{children:`
        #resumo-print-window .resumo-print-content h2,
        #resumo-print-window .resumo-print-content .ed-h2 {
          font-size: 18px;
          margin: 24px 0 10px;
          color: var(--text,#e8eaf6);
        }

        #resumo-print-window .resumo-print-content h3,
        #resumo-print-window .resumo-print-content .ed-h3 {
          font-size: 15px;
          margin: 18px 0 8px;
          color: var(--text,#e8eaf6);
        }

        #resumo-print-window .resumo-print-content p,
        #resumo-print-window .resumo-print-content .ed-p {
          margin: 8px 0;
        }

        #resumo-print-window .resumo-print-content ul,
        #resumo-print-window .resumo-print-content .ed-ul {
          margin: 8px 0 12px 22px;
          padding: 0;
        }

        #resumo-print-window .resumo-print-content li,
        #resumo-print-window .resumo-print-content .ed-li {
          margin: 6px 0;
        }

        @media (max-width: 720px) {
          #resumo-print-window .resumo-print-topbar {
            height: auto !important;
            min-height: 60px;
            align-items: flex-start !important;
            padding: 12px 14px !important;
            gap: 12px !important;
          }

          #resumo-print-window .resumo-print-topbar > div:first-child {
            flex: 1 1 auto;
            min-width: 0;
          }

          #resumo-print-window .resumo-print-topbar > div:last-child {
            gap: 8px !important;
          }

          #resumo-print-window .resumo-print-scroll {
            padding: 14px 10px !important;
          }

          #resumo-print-window .resumo-print-page {
            padding: 22px 16px !important;
            border-radius: 8px !important;
            min-height: calc(100vh - 88px) !important;
          }

          #resumo-print-window .resumo-print-page h1 {
            font-size: 19px !important;
          }
        }

        @media (max-width: 420px) {
          #resumo-print-window .resumo-export-label {
            display: none;
          }
        }

        @media print {
          @page { margin: 18mm; }

          html,
          body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #resumo-print-window,
          #resumo-print-window * {
            visibility: visible !important;
          }

          #resumo-print-window {
            position: absolute !important;
            inset: auto !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            display: block !important;
            overflow: visible !important;
            background: #fff !important;
            color: #111 !important;
          }

          #resumo-print-window .resumo-print-topbar {
            display: none !important;
          }

          #resumo-print-window .resumo-print-scroll {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
          }

          #resumo-print-window .resumo-print-page {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #111 !important;
            padding: 0 !important;
          }

          #resumo-print-window .resumo-print-content,
          #resumo-print-window .resumo-print-content *,
          #resumo-print-window .resumo-print-meta,
          #resumo-print-window .resumo-print-section,
          #resumo-print-window .resumo-print-section * {
            color: #111 !important;
            overflow: visible !important;
          }

          #resumo-print-window .resumo-print-content h2,
          #resumo-print-window .resumo-print-content h3,
          #resumo-print-window .resumo-print-content .ed-h2,
          #resumo-print-window .resumo-print-content .ed-h3,
          #resumo-print-window .resumo-print-section-title {
            color: #1a1a2e !important;
          }

          #resumo-print-window .resumo-print-card,
          #resumo-print-window .resumo-print-question {
            break-inside: avoid;
            page-break-inside: avoid;
            background: #fff !important;
            border-color: #d7dbe7 !important;
          }
        }
      `}),(0,t.jsxs)("div",{className:"resumo-print-topbar",style:{height:"60px",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--border,#1f2640)",background:"var(--surface,#111420)",flexShrink:0,gap:"16px"},children:[(0,t.jsxs)("div",{style:{minWidth:0},children:[t.jsx("div",{style:{fontSize:"14px",fontWeight:600,color:"var(--text,#e8eaf6)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:e}),i&&t.jsx("div",{style:{fontSize:"11px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginTop:"3px"},children:i})]}),(0,t.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"10px",flexShrink:0},children:[(0,t.jsxs)("button",{onClick:()=>window.print(),style:{background:"var(--accent,#6c63ff)",border:"none",color:"#fff",borderRadius:"8px",height:"32px",padding:"0 12px",display:"flex",alignItems:"center",gap:"6px",cursor:"pointer",fontSize:"12px",fontWeight:700},children:[t.jsx(o.Z,{size:14})," ",t.jsx("span",{className:"resumo-export-label",children:"Exportar PDF"})]}),t.jsx("button",{onClick:l,title:"Fechar",style:{background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",color:"var(--text,#e8eaf6)",borderRadius:"8px",width:"32px",height:"32px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},children:t.jsx(n.Z,{size:18})})]})]}),t.jsx("div",{className:"resumo-print-scroll",style:{flex:1,overflowY:"auto",padding:"32px 20px"},children:(0,t.jsxs)("article",{className:"resumo-print-page",style:{display:"block",margin:"0 auto",width:"100%",maxWidth:"900px",background:"var(--surface,#111420)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",padding:"34px 42px",height:"auto",minHeight:"calc(100vh - 124px)",boxShadow:"0 20px 60px rgba(0,0,0,0.4)",marginBottom:"32px"},children:[(0,t.jsxs)("header",{style:{marginBottom:"28px",borderBottom:"1px solid var(--border,#1f2640)",paddingBottom:"16px"},children:[t.jsx("h1",{style:{margin:0,color:"var(--text,#e8eaf6)",fontSize:"24px",lineHeight:1.25},children:e}),t.jsx("div",{className:"resumo-print-meta",style:{marginTop:"8px",color:"var(--muted,#6b7194)",fontSize:"12px"},children:i||"StudyAI"})]}),(0,t.jsxs)("section",{className:"resumo-print-section",style:{marginBottom:"36px"},children:[t.jsx("div",{className:"resumo-print-section-title",style:{color:"var(--accent,#6c63ff)",fontSize:"12px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"16px"},children:"Resumo"}),(0,t.jsxs)("div",{style:{position:"relative"},children:[t.jsx("div",{className:"resumo-print-content",style:{color:"var(--text,#e8eaf6)",fontSize:"14px",lineHeight:1.85},dangerouslySetInnerHTML:{__html:function(e){if(!e)return"<p>Conte\xfado n\xe3o dispon\xedvel.</p>";try{let i=JSON.parse(e);if(i?.type==="rich"&&"string"==typeof i.html)return i.html}catch{}return function(e){let i=!1,r="";for(let t of e.split("\n"))t.startsWith("## ")?(i&&(r+="</ul>",i=!1),r+=`<h2>${s(t.slice(3))}</h2>`):t.startsWith("### ")?(i&&(r+="</ul>",i=!1),r+=`<h3>${s(t.slice(4))}</h3>`):t.startsWith("- ")||t.startsWith("• ")?(i||(r+="<ul>",i=!0),r+=`<li>${s(t.replace(/^[-•] /,""))}</li>`):""===t.trim()?(i&&(r+="</ul>",i=!1),r+='<div class="resumo-print-break"><br/></div>'):(i&&(r+="</ul>",i=!1),r+=`<p>${s(t)}</p>`);return i&&(r+="</ul>"),r}(e)}(r)}}),c&&t.jsx("img",{src:c,alt:"Anota\xe7\xf5es",style:{position:"absolute",inset:"0 auto auto 0",width:"100%",height:"auto",pointerEvents:"none"}})]})]}),d.length>0&&(0,t.jsxs)("section",{className:"resumo-print-section",style:{marginTop:"34px"},children:[(0,t.jsxs)("div",{className:"resumo-print-section-title",style:{color:"var(--accent,#6c63ff)",fontSize:"12px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"16px"},children:["Flashcards (",d.length,")"]}),t.jsx("div",{style:{display:"grid",gap:"12px"},children:d.map((e,i)=>(0,t.jsxs)("div",{className:"resumo-print-card",style:{border:"1px solid var(--border,#1f2640)",borderRadius:"8px",padding:"14px 16px",background:"var(--surface2,#181d2e)"},children:[(0,t.jsxs)("div",{style:{fontSize:"11px",color:"var(--accent,#6c63ff)",fontWeight:800,textTransform:"uppercase",marginBottom:"8px"},children:["Card ",i+1]}),t.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)",fontWeight:700,lineHeight:1.6,marginBottom:"8px"},children:e.front}),t.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)",lineHeight:1.65,background:"rgba(0,212,170,0.08)",borderLeft:"3px solid var(--accent2,#00d4aa)",borderRadius:"6px",padding:"10px 12px"},children:e.back})]},e.id??i))})]}),p.length>0&&t.jsx("section",{className:"resumo-print-section",style:{marginTop:"34px"},children:t.jsx(a.Z,{questions:p,title:"Quest\xf5es",maxWidth:"none",showEmptyState:!1})})]})})]})}}};