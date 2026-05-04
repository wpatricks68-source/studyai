"use strict";exports.id=501,exports.ids=[501],exports.modules={32281:(e,i,t)=>{t.d(i,{Z:()=>l});var r=t(97247),o=t(28964),n=t(20579),a=t(30754),s=t(99219),p=t(69964);function c(e){if("cv"===e.tipo)return"C"===e.gabarito?"CERTO":"E"===e.gabarito?"ERRADO":e.gabarito||"-";if("number"==typeof e.correct){let i=["A","B","C","D","E"][e.correct]??String(e.correct+1),t=e.options?.[e.correct];return t?`${i} - ${t}`:i}return e.gabarito||"-"}function d(e,i){return void 0!==i&&i===("cv"===e.tipo?e.gabarito??"":"number"==typeof e.correct?e.correct:null)}function l({questions:e,loading:i=!1,title:t="Quest\xf5es do tema",maxWidth:l=820,showEmptyState:x,onOpenManual:u,onGenerateAI:g,onImport:h}){let[f,b]=(0,o.useState)({}),[q,v]=(0,o.useState)({}),[w,y]=(0,o.useState)(!1);(0,o.useMemo)(()=>e.map((e,i)=>e.id??`${i}:${e.question}`).join("|"),[e]);let j=x??!!(u||g);if(i)return(0,r.jsxs)("div",{className:"iq-shell",style:{maxWidth:l,width:"100%"},children:[r.jsx(m,{}),(0,r.jsxs)("div",{className:"iq-loading",children:[r.jsx("div",{className:"iq-spinner"}),"Gerando quest\xf5es..."]})]});if(0===e.length)return j?(0,r.jsxs)("div",{className:"iq-shell",style:{maxWidth:l,width:"100%"},children:[r.jsx(m,{}),(0,r.jsxs)("div",{className:"iq-empty",children:[r.jsx("div",{className:"iq-empty-icon",children:r.jsx(n.Z,{size:22})}),r.jsx("div",{className:"iq-empty-title",children:"Nenhuma quest\xe3o gerada ainda"}),r.jsx("div",{className:"iq-empty-copy",children:"Crie quest\xf5es para praticar sem sair do resumo."}),(0,r.jsxs)("div",{className:"iq-empty-actions",children:[g&&(0,r.jsxs)("button",{className:"iq-primary-action",onClick:g,children:[r.jsx(a.Z,{size:15})," Gerar com IA"]}),u&&(0,r.jsxs)("button",{className:"iq-secondary-action",onClick:u,children:[r.jsx(s.Z,{size:15})," Criar manualmente"]})]})]})]}):null;let k=Object.keys(q).length,N=Object.entries(q).filter(([i,t])=>!!t&&d(e[Number(i)],f[Number(i)])).length,z=k>0?Math.round(N/k*100):0;return(0,r.jsxs)("section",{className:"iq-shell",style:{maxWidth:l,width:"100%"},children:[r.jsx(m,{}),(0,r.jsxs)("div",{className:"iq-header",children:[(0,r.jsxs)("div",{children:[r.jsx("div",{className:"iq-title",children:t}),(0,r.jsxs)("div",{className:"iq-count",children:[e.length," quest",1!==e.length?"\xf5es":"\xe3o"]})]}),(0,r.jsxs)("div",{className:"iq-header-actions iq-screen-control",children:[h&&(0,r.jsxs)("button",{className:"iq-secondary-action iq-compact-action",onClick:h,title:"Importar de arquivo TXT/CSV",children:[r.jsx(p.Z,{size:14})," Importar"]}),u&&(0,r.jsxs)("button",{className:"iq-secondary-action iq-compact-action",onClick:u,children:[r.jsx(s.Z,{size:14})," Nova quest\xe3o"]}),g&&(0,r.jsxs)("button",{className:"iq-primary-action iq-compact-action",onClick:g,children:[r.jsx(a.Z,{size:14})," Gerar"]})]})]}),k>0&&(0,r.jsxs)("div",{className:"iq-score iq-screen-control",children:[(0,r.jsxs)("div",{className:"iq-score-value",style:{color:z>=70?"#10b981":z>=50?"#f59e0b":"#ef4444"},children:[z,"%"]}),(0,r.jsxs)("div",{children:[(0,r.jsxs)("div",{className:"iq-score-main",children:[N," de ",k," corretas"]}),r.jsx("div",{className:"iq-score-sub",children:e.length-k>0?`${e.length-k} ainda n\xe3o respondida(s)`:"Todas respondidas"})]})]}),r.jsx("div",{className:"iq-list",children:e.map((e,i)=>{let t=void 0!==f[i],o=!!q[i],n=d(e,f[i]);return(0,r.jsxs)("article",{className:"iq-card",children:[(0,r.jsxs)("div",{className:"iq-card-header",children:[(0,r.jsxs)("div",{className:"iq-card-meta",children:[(0,r.jsxs)("span",{className:"iq-number",children:["Q",i+1]}),r.jsx("span",{className:"cv"===e.tipo?"iq-badge iq-badge-cv":"iq-badge iq-badge-mc",children:"cv"===e.tipo?"Certo / Errado":"M\xfaltipla escolha"})]}),e.banca&&r.jsx("span",{className:"iq-bank",children:e.banca})]}),r.jsx("div",{className:"iq-question-text",children:e.question}),"cv"===e.tipo?r.jsx("div",{className:"iq-cv-options",children:["C","E"].map(t=>{let n=f[i]===t,a=t===e.gabarito,s=o?a?"iq-option-correct":n?"iq-option-wrong":"":n?"iq-option-selected":"";return r.jsx("button",{className:`iq-option-button ${s}`,onClick:()=>!o&&b(e=>({...e,[i]:t})),disabled:o,children:"C"===t?"Certo":"Errado"},t)})}):r.jsx("div",{className:"iq-mc-options",children:(e.options??[]).map((t,n)=>{let a=f[i]===n,s=n===e.correct,p=o?s?"iq-option-correct":a?"iq-option-wrong":"":a?"iq-option-selected":"";return(0,r.jsxs)("button",{className:`iq-option-button iq-mc-option ${p}`,onClick:()=>!o&&b(e=>({...e,[i]:n})),disabled:o,children:[r.jsx("span",{className:"iq-option-letter",children:["A","B","C","D","E"][n]}),r.jsx("span",{children:t})]},n)})}),o?(0,r.jsxs)("div",{className:n?"iq-feedback iq-feedback-correct iq-screen-control":"iq-feedback iq-feedback-wrong iq-screen-control",children:[r.jsx("div",{className:"iq-feedback-title",children:n?"Resposta correta":"Resposta incorreta"}),r.jsx("div",{className:"iq-feedback-copy",children:e.explanation||`Gabarito: ${c(e)}`})]}):r.jsx("button",{className:"iq-confirm iq-screen-control",onClick:()=>t&&v(e=>({...e,[i]:!0})),disabled:!t,children:"Confirmar resposta"}),(0,r.jsxs)("div",{className:"iq-print-answer",children:[r.jsx("strong",{children:"Gabarito:"})," ",c(e),e.explanation&&(0,r.jsxs)("div",{children:[r.jsx("strong",{children:"Explica\xe7\xe3o:"})," ",e.explanation]})]})]},e.id??i)})}),(0,r.jsxs)("div",{className:"iq-gabarito iq-screen-control",children:[r.jsx("button",{className:"iq-gabarito-toggle",onClick:()=>y(e=>!e),children:w?"Ocultar gabarito":"Ver gabarito"}),w&&r.jsx("div",{className:"iq-gabarito-list",children:e.map((e,i)=>(0,r.jsxs)("div",{className:"iq-gabarito-row",children:[(0,r.jsxs)("span",{className:"iq-gabarito-index",children:["Q",i+1]}),r.jsx("span",{className:"iq-gabarito-answer",children:c(e)})]},e.id??i))})]})]})}function m(){return r.jsx("style",{children:`
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
    `})}},57501:(e,i,t)=>{t.d(i,{Z:()=>p});var r=t(97247);let o=(0,t(26323).Z)("FileDown",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M12 18v-6",key:"17g6i2"}],["path",{d:"m9 15 3 3 3-3",key:"1npd3o"}]]);var n=t(37013),a=t(32281);function s(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}function p({title:e,subtitle:i,resumo:t,flashcards:p=[],questions:c=[],onClose:d}){let l=function(e){if(!e)return"";try{let i=JSON.parse(e);if(i?.type==="rich"&&"string"==typeof i.canvas)return i.canvas}catch{}return""}(t);return(0,r.jsxs)("div",{id:"resumo-print-window",style:{position:"fixed",inset:0,zIndex:1e3,background:"var(--bg,#0a0c12)",display:"flex",flexDirection:"column",color:"var(--text,#e8eaf6)"},children:[r.jsx("style",{children:`
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
      `}),(0,r.jsxs)("div",{className:"resumo-print-topbar",style:{height:"60px",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--border,#1f2640)",background:"var(--surface,#111420)",flexShrink:0,gap:"16px"},children:[(0,r.jsxs)("div",{style:{minWidth:0},children:[r.jsx("div",{style:{fontSize:"14px",fontWeight:600,color:"var(--text,#e8eaf6)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:e}),i&&r.jsx("div",{style:{fontSize:"11px",color:"var(--muted,#6b7194)",textTransform:"uppercase",letterSpacing:"1px",marginTop:"3px"},children:i})]}),(0,r.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"10px",flexShrink:0},children:[(0,r.jsxs)("button",{onClick:()=>window.print(),style:{background:"var(--accent,#6c63ff)",border:"none",color:"#fff",borderRadius:"8px",height:"32px",padding:"0 12px",display:"flex",alignItems:"center",gap:"6px",cursor:"pointer",fontSize:"12px",fontWeight:700},children:[r.jsx(o,{size:14})," ",r.jsx("span",{className:"resumo-export-label",children:"Exportar PDF"})]}),r.jsx("button",{onClick:d,title:"Fechar",style:{background:"var(--surface2,#181d2e)",border:"1px solid var(--border,#1f2640)",color:"var(--text,#e8eaf6)",borderRadius:"8px",width:"32px",height:"32px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},children:r.jsx(n.Z,{size:18})})]})]}),r.jsx("div",{className:"resumo-print-scroll",style:{flex:1,overflowY:"auto",padding:"32px 20px"},children:(0,r.jsxs)("article",{className:"resumo-print-page",style:{display:"block",margin:"0 auto",width:"100%",maxWidth:"900px",background:"var(--surface,#111420)",border:"1px solid var(--border,#1f2640)",borderRadius:"10px",padding:"34px 42px",height:"auto",minHeight:"calc(100vh - 124px)",boxShadow:"0 20px 60px rgba(0,0,0,0.4)",marginBottom:"32px"},children:[(0,r.jsxs)("header",{style:{marginBottom:"28px",borderBottom:"1px solid var(--border,#1f2640)",paddingBottom:"16px"},children:[r.jsx("h1",{style:{margin:0,color:"var(--text,#e8eaf6)",fontSize:"24px",lineHeight:1.25},children:e}),r.jsx("div",{className:"resumo-print-meta",style:{marginTop:"8px",color:"var(--muted,#6b7194)",fontSize:"12px"},children:i||"StudyAI"})]}),(0,r.jsxs)("section",{className:"resumo-print-section",style:{marginBottom:"36px"},children:[r.jsx("div",{className:"resumo-print-section-title",style:{color:"var(--accent,#6c63ff)",fontSize:"12px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"16px"},children:"Resumo"}),(0,r.jsxs)("div",{style:{position:"relative"},children:[r.jsx("div",{className:"resumo-print-content",style:{color:"var(--text,#e8eaf6)",fontSize:"14px",lineHeight:1.85},dangerouslySetInnerHTML:{__html:function(e){if(!e)return"<p>Conte\xfado n\xe3o dispon\xedvel.</p>";try{let i=JSON.parse(e);if(i?.type==="rich"&&"string"==typeof i.html)return i.html}catch{}return function(e){let i=!1,t="";for(let r of e.split("\n"))r.startsWith("## ")?(i&&(t+="</ul>",i=!1),t+=`<h2>${s(r.slice(3))}</h2>`):r.startsWith("### ")?(i&&(t+="</ul>",i=!1),t+=`<h3>${s(r.slice(4))}</h3>`):r.startsWith("- ")||r.startsWith("• ")?(i||(t+="<ul>",i=!0),t+=`<li>${s(r.replace(/^[-•] /,""))}</li>`):""===r.trim()?(i&&(t+="</ul>",i=!1),t+='<div class="resumo-print-break"><br/></div>'):(i&&(t+="</ul>",i=!1),t+=`<p>${s(r)}</p>`);return i&&(t+="</ul>"),t}(e)}(t)}}),l&&r.jsx("img",{src:l,alt:"Anota\xe7\xf5es",style:{position:"absolute",inset:"0 auto auto 0",width:"100%",height:"auto",pointerEvents:"none"}})]})]}),p.length>0&&(0,r.jsxs)("section",{className:"resumo-print-section",style:{marginTop:"34px"},children:[(0,r.jsxs)("div",{className:"resumo-print-section-title",style:{color:"var(--accent,#6c63ff)",fontSize:"12px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"16px"},children:["Flashcards (",p.length,")"]}),r.jsx("div",{style:{display:"grid",gap:"12px"},children:p.map((e,i)=>(0,r.jsxs)("div",{className:"resumo-print-card",style:{border:"1px solid var(--border,#1f2640)",borderRadius:"8px",padding:"14px 16px",background:"var(--surface2,#181d2e)"},children:[(0,r.jsxs)("div",{style:{fontSize:"11px",color:"var(--accent,#6c63ff)",fontWeight:800,textTransform:"uppercase",marginBottom:"8px"},children:["Card ",i+1]}),r.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)",fontWeight:700,lineHeight:1.6,marginBottom:"8px"},children:e.front}),r.jsx("div",{style:{fontSize:"13px",color:"var(--text,#e8eaf6)",lineHeight:1.65,background:"rgba(0,212,170,0.08)",borderLeft:"3px solid var(--accent2,#00d4aa)",borderRadius:"6px",padding:"10px 12px"},children:e.back})]},e.id??i))})]}),c.length>0&&r.jsx("section",{className:"resumo-print-section",style:{marginTop:"34px"},children:r.jsx(a.Z,{questions:c,title:"Quest\xf5es",maxWidth:"none",showEmptyState:!1})})]})})]})}},20579:(e,i,t)=>{t.d(i,{Z:()=>r});let r=(0,t(26323).Z)("CircleHelp",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]])}};