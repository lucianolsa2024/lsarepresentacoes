import { useState, useCallback } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Funcionario { id: number; nome: string; salario: number }
interface Material    { id: number; nome: string; qtde: number; preco: number }

interface Custos {
  diasMes: number; horasDia: number; produtividade: number;
  aluguel: number; energia: number; agua: number; internet: number;
  contabilidade: number; manutencao: number; outrosFixos: number;
  funcionarios: Funcionario[];
  aliquota: number; margem: number;
}

interface Orcamento {
  descricao: string; horas: number;
  materiais: Material[]; matMarkup: number;
  usarFrete: boolean; frete: number; freteMarkup: number;
  usarRT: boolean; rt: number; rtQuem: string;
  desconto: number; acrescimo: number;
}

interface ResultadoHora {
  precoHora: number; hProdutivas: number;
  custoPorHora: number; totalFixo: number;
  aliquota: number; margem: number;
}

type Tab = "custos" | "preco" | "orcamento" | "breakeven";

// ─── UTILS ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ENCARGOS = 0.68;

// ─── CONSTANTES DE CORES (consistentes com design da oficina) ─────────────────
const C = {
  primary: "#3d5a4c",
  primaryLight: "#5a7d6a",
  accent: "#c8a96e",
  accentLight: "#e8d5aa",
  bg: "#f5f4f0",
  card: "#ffffff",
  border: "#ddd8d0",
  muted: "#7a7a7a",
  highlight: "#fff8ec",
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </label>
      {children}
      {hint && <span style={{ fontSize: "0.75rem", color: C.muted }}>{hint}</span>}
    </div>
  );
}

function Input({
  value, onChange, type = "number", placeholder, prefix, suffix, min = 0, step = 1, readOnly,
}: {
  value: string | number; onChange?: (v: string) => void; type?: string;
  placeholder?: string; prefix?: string; suffix?: string;
  min?: number; step?: number; readOnly?: boolean;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span style={{ position: "absolute", left: 10, color: C.muted, fontSize: "0.9rem", fontWeight: 600, pointerEvents: "none" }}>
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: "100%",
          padding: `10px ${suffix ? "28px" : "12px"} 10px ${prefix ? "28px" : "12px"}`,
          border: `1.5px solid ${C.border}`,
          borderRadius: 7,
          fontSize: "0.95rem",
          background: readOnly ? "#f0f0f0" : "#fafaf8",
          color: readOnly ? C.muted : "#2c2c2c",
          outline: "none",
        }}
        onFocus={e => !readOnly && (e.target.style.borderColor = C.primary)}
        onBlur={e => (e.target.style.borderColor = C.border)}
      />
      {suffix && (
        <span style={{ position: "absolute", right: 10, color: C.muted, fontSize: "0.9rem", fontWeight: 600, pointerEvents: "none" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1.5px solid ${C.border}`,
      padding: 28, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...style,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: C.primary, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>{children}</h2>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, marginTop: 8 }}>{children}</div>;
}

function Divider() {
  return <hr style={{ border: "none", borderTop: `1.5px solid ${C.border}`, margin: "18px 0" }} />;
}

function BreakdownTable({ rows }: { rows: { label: string; value: string; muted?: boolean; highlight?: boolean; total?: boolean; indent?: boolean }[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={r.total ? { borderTop: `1.5px solid ${C.accentLight}` } : undefined}>
            <td style={{
              padding: "5px 4px",
              color: r.muted ? C.muted : r.highlight ? "#8b4513" : r.total ? C.primary : "#2c2c2c",
              fontSize: r.muted ? "0.82rem" : r.total ? "0.97rem" : "0.9rem",
              paddingLeft: r.indent ? 18 : 4,
            }}>
              {r.label}
            </td>
            <td style={{
              padding: "5px 4px", textAlign: "right", fontWeight: r.total ? 700 : 600,
              color: r.muted ? C.muted : r.highlight ? "#8b4513" : r.total ? C.primary : "#2c2c2c",
              fontSize: r.muted ? "0.82rem" : r.total ? "0.97rem" : "0.9rem",
            }}>
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Parameters<typeof BreakdownTable>[0]["rows"] }) {
  return (
    <div style={{ background: C.highlight, border: `1.5px solid ${C.accentLight}`, borderRadius: 10, padding: "18px 22px", marginTop: 12 }}>
      <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: C.primary, marginBottom: 12 }}>{title}</h3>
      <BreakdownTable rows={rows} />
    </div>
  );
}

function ResultBox({ mainVal, mainLabel, subItems }: {
  mainVal: string; mainLabel: string;
  subItems: { val: string; lbl: string }[];
}) {
  return (
    <div style={{
      background: C.primary, color: "#fff", borderRadius: 12, padding: "24px 28px",
      marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 20,
      alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: "2.4rem", fontWeight: 800 }}>{mainVal}</div>
        <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: 2 }}>{mainLabel}</div>
      </div>
      <div className="flex gap-6 flex-wrap">
        {subItems.map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: C.accentLight }}>{s.val}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.75, marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalcBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: 14, background: C.accent, color: C.primary,
        fontSize: "1rem", fontWeight: 700, border: "none", borderRadius: 8, cursor: "pointer",
        marginTop: 8, transition: "background 0.2s",
      }}
      onMouseOver={e => (e.currentTarget.style.background = "#b8954a")}
      onMouseOut={e => (e.currentTarget.style.background = C.accent)}
    >
      {children}
    </button>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff3cd", border: "1.5px solid #ffe69c", borderRadius: 8, padding: "12px 16px", fontSize: "0.88rem", color: "#7a5a00", marginBottom: 16 }}>
      {children}
    </div>
  );
}

// ─── EMPLOYEE HTML GENERATOR ──────────────────────────────────────────────────

function gerarHTMLFuncionaria(ph: number, matMarkup: number, simples: number): string {
  const scriptClose = "<" + "/script>";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Orçamento — Oficina de Estofados</title>
<style>
:root{--primary:#3d5a4c;--accent:#c8a96e;--accent-light:#e8d5aa;--muted:#7a7a7a;--border:#ddd8d0;--highlight:#fff8ec;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f5f4f0;color:#2c2c2c;min-height:100vh;}
header{background:var(--primary);color:#fff;padding:24px 32px;display:flex;align-items:center;gap:16px;}
.icon{font-size:2rem;} h1{font-size:1.5rem;font-weight:700;} header p{font-size:0.85rem;opacity:0.8;margin-top:2px;}
.container{max-width:780px;margin:0 auto;padding:32px 16px 64px;}
.card{background:#fff;border-radius:12px;border:1.5px solid var(--border);padding:28px;margin-bottom:20px;}
.card h2{font-size:1.05rem;font-weight:700;color:var(--primary);margin-bottom:18px;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:600px){.grid2{grid-template-columns:1fr;}}
.field{display:flex;flex-direction:column;gap:5px;}
.field label{font-size:0.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;}
.field input{padding:10px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:0.95rem;background:#fafaf8;width:100%;}
.field input:focus{outline:none;border-color:var(--primary);}
.hint{font-size:0.75rem;color:var(--muted);}
.wrap{position:relative;display:flex;align-items:center;}
.wrap .pre,.wrap .suf{position:absolute;color:var(--muted);font-size:0.9rem;font-weight:600;pointer-events:none;}
.wrap .pre{left:10px;} .wrap .suf{right:10px;}
.wrap .wp{padding-left:28px;} .wrap .ws{padding-right:28px;}
.divider{border:none;border-top:1.5px solid var(--border);margin:18px 0;}
.stitle{font-size:0.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;margin-top:8px;}
.toggle{display:flex;align-items:center;gap:10px;margin-bottom:12px;cursor:pointer;}
.toggle input{width:18px;height:18px;accent-color:var(--primary);cursor:pointer;}
.toggle span{font-size:0.9rem;font-weight:600;}
.btn{width:100%;padding:14px;background:var(--accent);color:var(--primary);font-size:1rem;font-weight:700;border:none;border-radius:8px;cursor:pointer;margin-top:8px;}
.res{background:linear-gradient(135deg,#3d5a4c,#5a7d6a);color:#fff;border-radius:12px;padding:28px;text-align:center;}
.res .lbl{font-size:0.9rem;opacity:0.8;margin-bottom:6px;}
.res .tot{font-size:3rem;font-weight:800;}
.res .det{font-size:0.82rem;opacity:0.75;margin-top:8px;}
.res-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;}
.res-item{background:rgba(255,255,255,0.12);border-radius:8px;padding:12px;text-align:left;}
.res-item .il{font-size:0.75rem;opacity:0.75;}
.res-item .iv{font-size:1.1rem;font-weight:700;margin-top:2px;}
.bk{background:var(--highlight);border:1.5px solid var(--accent-light);border-radius:10px;padding:18px 22px;margin-top:12px;}
.bk h3{font-size:0.88rem;font-weight:700;color:var(--primary);margin-bottom:12px;}
.bk table{width:100%;border-collapse:collapse;font-size:0.9rem;}
.bk table td{padding:5px 4px;}
.bk table td:last-child{text-align:right;font-weight:600;}
.bk table .tot-row td{border-top:1.5px solid var(--accent-light);padding-top:8px;font-weight:700;color:var(--primary);}
.mat-row{display:grid;grid-template-columns:2fr 1fr 1fr 32px;gap:8px;margin-bottom:8px;align-items:end;}
.del{height:38px;background:#fde;border:1.5px solid #f5c6c6;border-radius:6px;cursor:pointer;font-size:1rem;}
.add-btn{padding:8px 18px;background:var(--accent-light);border:1.5px solid var(--accent);border-radius:6px;cursor:pointer;font-weight:600;color:var(--primary);font-size:0.88rem;}
</style></head>
<body>
<header>
  <div class="icon">🪑</div>
  <div><h1>Orçamento de Serviço</h1><p>Oficina de Estofados</p></div>
</header>
<div class="container">
  <div class="card">
    <h2>🛠️ Dados do Serviço</h2>
    <div class="grid2">
      <div class="field"><label>Descrição</label><input type="text" id="desc" placeholder="Ex: Sofá 3 lugares"></div>
      <div class="field"><label>Horas estimadas</label><input type="number" id="horas" value="8" min="0" step="0.5"></div>
    </div>
    <div class="divider"></div>
    <div class="stitle">Matéria-Prima</div>
    <div id="mat-list">
      <div class="mat-row">
        <div class="field"><label>Item</label><input class="mn" type="text" value="Tecido (metro)"></div>
        <div class="field"><label>Qtde</label><input class="mq" type="number" value="8" min="0" step="0.1"></div>
        <div class="field"><label>Preço unit (R$)</label><input class="mp" type="number" value="35" min="0" step="0.01"></div>
        <button class="del" onclick="del(this)">✕</button>
      </div>
    </div>
    <button class="add-btn" onclick="addMat()">+ Adicionar material</button>
    <div style="margin-top:14px;max-width:220px;">
      <div class="field">
        <label>Markup materiais</label>
        <div class="wrap"><input class="ws" id="mmarkup" type="number" value="${matMarkup}" min="0" step="1"><span class="suf">%</span></div>
        <span class="hint">Cobre manuseio, compra e estoque</span>
      </div>
    </div>
    <div class="divider"></div>
    <label class="toggle"><input type="checkbox" id="chk-frete" onchange="tFrete()"><span>🚚 Incluir frete</span></label>
    <div id="frete-box" style="display:none;" class="grid2">
      <div class="field"><label>Valor frete</label><div class="wrap"><span class="pre">R$</span><input class="wp" id="vfrete" type="number" value="80" min="0"></div></div>
      <div class="field"><label>Markup frete</label><div class="wrap"><input class="ws" id="mfrete" type="number" value="20" min="0"><span class="suf">%</span></div></div>
    </div>
    <div class="divider"></div>
    <label class="toggle"><input type="checkbox" id="chk-rt" onchange="tRT()"><span>🤝 Incluir RT / Comissão</span></label>
    <div id="rt-box" style="display:none;" class="grid2">
      <div class="field"><label>RT (%)</label><div class="wrap"><input class="ws" id="vrt" type="number" value="10" min="0" max="50" step="0.5"><span class="suf">%</span></div></div>
      <div class="field"><label>Quem recebe</label><input id="rt-quem" type="text" placeholder="Ex: Arquiteto..."></div>
    </div>
    <div class="divider"></div>
    <div class="stitle">Ajuste</div>
    <div class="grid2">
      <div class="field"><label>Desconto</label><div class="wrap"><input class="ws" id="desc-pct" type="number" value="0" min="0"><span class="suf">%</span></div></div>
      <div class="field"><label>Urgência / acréscimo</label><div class="wrap"><input class="ws" id="acr-pct" type="number" value="0" min="0"><span class="suf">%</span></div></div>
    </div>
  </div>
  <button class="btn" onclick="calc()">💰 Calcular Orçamento</button>
  <div id="result" style="margin-top:20px;"></div>
</div>
<script>
const PH=${ph},S=${simples};
const f=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const g=id=>parseFloat(document.getElementById(id).value)||0;
function addMat(){
  const l=document.getElementById('mat-list');
  const d=document.createElement('div');d.className='mat-row';
  d.innerHTML='<div class="field"><label>Item</label><input class="mn" type="text" placeholder="Material"></div><div class="field"><label>Qtde</label><input class="mq" type="number" value="1" min="0" step="0.1"></div><div class="field"><label>Preço unit (R$)</label><input class="mp" type="number" value="0" min="0" step="0.01"></div><button class="del" onclick="del(this)">✕</button>';
  l.appendChild(d);
}
function del(b){b.closest('.mat-row').remove();}
function tFrete(){const s=document.getElementById('chk-frete').checked;document.getElementById('frete-box').style.display=s?'grid':'none';if(s)document.getElementById('frete-box').style.gridTemplateColumns='1fr 1fr';}
function tRT(){document.getElementById('rt-box').style.display=document.getElementById('chk-rt').checked?'grid':'none';if(document.getElementById('chk-rt').checked)document.getElementById('rt-box').style.gridTemplateColumns='1fr 1fr';}
function calc(){
  const horas=g('horas'),desc=g('desc-pct')/100,acr=g('acr-pct')/100,mm=g('mmarkup')/100;
  const mo=horas*PH;
  let cmat=0;const mats=[];
  document.querySelectorAll('.mat-row').forEach(r=>{
    const n=r.querySelector('.mn').value||'Material',q=parseFloat(r.querySelector('.mq').value)||0,p=parseFloat(r.querySelector('.mp').value)||0,c=q*p,cb=c*(1+mm);
    cmat+=c;if(c>0)mats.push({n,q,p,c,cb});
  });
  const tm=cmat*(1+mm),mkv=tm-cmat;
  let frete=0;
  if(document.getElementById('chk-frete').checked)frete=g('vfrete')*(1+g('mfrete')/100);
  let sub=mo+tm+frete,b0=sub;
  if(acr>0)sub*=(1+acr);if(desc>0)sub*=(1-desc);
  let tot=sub,vrt=0,rtp=0,rtq='';
  const ur=document.getElementById('chk-rt').checked;
  if(ur){rtp=g('vrt')/100;rtq=document.getElementById('rt-quem').value||'Indicação';const fk=1-rtp-rtp*S;if(fk<=0){alert('RT muito alto!');return;}tot=sub/fk;vrt=tot*rtp;}
  const des=document.getElementById('desc').value||'Serviço';
  let mr=mats.map(m=>'<tr><td>📦 '+m.n+' ('+m.q+'× '+f(m.p)+' +'+Math.round(mm*100)+'%)</td><td>'+f(m.cb)+'</td></tr>').join('');
  if(!mr)mr='<tr><td colspan="2" style="color:#7a7a7a">Nenhum material</td></tr>';
  const fr=frete>0?'<tr><td>🚚 Frete</td><td>'+f(frete)+'</td></tr>':'';
  const mkr=mkv>0?'<tr style="color:#7a7a7a;font-size:0.82rem"><td>↳ Markup mat.</td><td>'+f(mkv)+'</td></tr>':'';
  let aj='';if(acr>0)aj+='<tr><td>⚡ Urgência</td><td>+'+f(b0*acr)+'</td></tr>';if(desc>0)aj+='<tr><td>🎁 Desconto</td><td>-'+f(b0*desc)+'</td></tr>';
  const rtr=ur&&vrt>0?'<tr style="color:#8b4513"><td>🤝 RT '+rtq+' ('+Math.round(rtp*1000)/10+'%)</td><td>'+f(vrt)+'</td></tr>':'';
  document.getElementById('result').innerHTML='<div class="res"><div class="lbl">Valor total ao cliente</div><div class="tot">'+f(tot)+'</div><div class="det">'+des+' · '+horas+'h'+(ur?' · RT incluso':'')+'</div><div class="res-grid"><div class="res-item"><div class="il">Mão de obra</div><div class="iv">'+f(mo)+'</div></div><div class="res-item"><div class="il">Materiais</div><div class="iv">'+f(tm)+'</div></div>'+(frete>0?'<div class="res-item"><div class="il">Frete</div><div class="iv">'+f(frete)+'</div></div>':'')+(ur?'<div class="res-item" style="background:rgba(255,200,100,0.2)"><div class="il">RT '+rtq+'</div><div class="iv">'+f(vrt)+'</div></div>':'')+'</div></div><div class="bk" style="margin-top:16px"><h3>📋 Detalhamento</h3><table><tr><td>👐 Mão de obra ('+horas+'h)</td><td>'+f(mo)+'</td></tr>'+mr+mkr+fr+'<tr style="color:#7a7a7a;font-size:0.82rem"><td>Subtotal</td><td>'+f(b0)+'</td></tr>'+aj+(ur?'<tr style="color:#7a7a7a;font-size:0.82rem"><td>Subtotal s/ RT</td><td>'+f(sub)+'</td></tr>':'')+rtr+'<tr class="tot-row"><td>💰 TOTAL</td><td>'+f(tot)+'</td></tr></table></div><div style="margin-top:12px;text-align:center"><button onclick="window.print()" style="padding:10px 28px;background:#3d5a4c;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700">🖨️ Imprimir</button></div>';
}
${scriptClose}
</body></html>`;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PrecificacaoEstofados() {
  const [tab, setTab] = useState<Tab>("custos");

  // ── CUSTOS STATE ──────────────────────────────────────────────────────────
  const [custos, setCustos] = useState<Custos>({
    diasMes: 22, horasDia: 8, produtividade: 80,
    aluguel: 2000, energia: 400, agua: 80, internet: 100,
    contabilidade: 300, manutencao: 150, outrosFixos: 200,
    funcionarios: [{ id: 1, nome: "Estofador", salario: 2200 }],
    aliquota: 6, margem: 25,
  });

  const updCusto = (k: keyof Custos) => (val: string) =>
    setCustos(p => ({ ...p, [k]: parseFloat(val) || 0 }));

  const addFunc = () =>
    setCustos(p => ({ ...p, funcionarios: [...p.funcionarios, { id: Date.now(), nome: "", salario: 1518 }] }));

  const updFunc = (id: number, field: "nome" | "salario", val: string) =>
    setCustos(p => ({
      ...p,
      funcionarios: p.funcionarios.map(f => f.id === id ? { ...f, [field]: field === "salario" ? parseFloat(val) || 0 : val } : f),
    }));

  const delFunc = (id: number) =>
    setCustos(p => ({ ...p, funcionarios: p.funcionarios.filter(f => f.id !== id) }));

  // ── RESULTADO HORA STATE ──────────────────────────────────────────────────
  const [resultado, setResultado] = useState<ResultadoHora | null>(null);

  const calcularPrecoHora = useCallback(() => {
    const { diasMes, horasDia, produtividade, aluguel, energia, agua, internet,
            contabilidade, manutencao, outrosFixos, funcionarios, aliquota, margem } = custos;

    const hProdutivas = diasMes * horasDia * (produtividade / 100);
    const estrutura = aluguel + energia + agua + internet + contabilidade + manutencao + outrosFixos;
    const totalFunc = funcionarios.reduce((s, f) => s + f.salario * (1 + ENCARGOS), 0);
    const totalFixo = estrutura + totalFunc;
    const custoPorHora = totalFixo / hProdutivas;
    const aq = aliquota / 100, mg = margem / 100;
    const precoHora = (custoPorHora / (1 - aq)) * (1 + mg);

    setResultado({ precoHora, hProdutivas, custoPorHora, totalFixo, aliquota: aq, margem: mg });
    setTab("preco");
  }, [custos]);

  // ── ORÇAMENTO STATE ───────────────────────────────────────────────────────
  const [orc, setOrc] = useState<Orcamento>({
    descricao: "", horas: 8,
    materiais: [{ id: 1, nome: "Tecido (metro)", qtde: 8, preco: 35 }],
    matMarkup: 30,
    usarFrete: false, frete: 80, freteMarkup: 20,
    usarRT: false, rt: 10, rtQuem: "",
    desconto: 0, acrescimo: 0,
  });

  const updOrc = (k: keyof Orcamento) => (val: string | boolean) =>
    setOrc(p => ({ ...p, [k]: typeof val === "boolean" ? val : (typeof p[k] === "number" ? parseFloat(val as string) || 0 : val) }));

  const addMat = () =>
    setOrc(p => ({ ...p, materiais: [...p.materiais, { id: Date.now(), nome: "", qtde: 1, preco: 0 }] }));

  const updMat = (id: number, field: keyof Material, val: string) =>
    setOrc(p => ({
      ...p,
      materiais: p.materiais.map(m => m.id === id ? { ...m, [field]: ["qtde", "preco"].includes(field) ? parseFloat(val) || 0 : val } : m),
    }));

  const delMat = (id: number) =>
    setOrc(p => ({ ...p, materiais: p.materiais.filter(m => m.id !== id) }));

  // ── CALCULO ORÇAMENTO ─────────────────────────────────────────────────────
  const [orcResult, setOrcResult] = useState<React.ReactNode>(null);

  const calcularOrcamento = useCallback(() => {
    if (!resultado) { setTab("custos"); return; }

    const { precoHora, aliquota } = resultado;
    const mm  = orc.matMarkup / 100;
    const maoDeObra = orc.horas * precoHora;

    const matLinhas = orc.materiais
      .map(m => ({ ...m, custo: m.qtde * m.preco, cobrado: m.qtde * m.preco * (1 + mm) }))
      .filter(m => m.custo > 0);
    const custoMatBruto = matLinhas.reduce((s, m) => s + m.custo, 0);
    const totalMateriais = custoMatBruto * (1 + mm);
    const markupValor = totalMateriais - custoMatBruto;

    const cobradoFrete = orc.usarFrete ? orc.frete * (1 + orc.freteMarkup / 100) : 0;
    const base0 = maoDeObra + totalMateriais + cobradoFrete;

    let subtotal = base0;
    if (orc.acrescimo > 0) subtotal *= 1 + orc.acrescimo / 100;
    if (orc.desconto  > 0) subtotal *= 1 - orc.desconto  / 100;

    let total = subtotal, valorRT = 0, rtPct = 0;
    if (orc.usarRT) {
      rtPct = orc.rt / 100;
      const fator = 1 - rtPct - rtPct * aliquota;
      if (fator <= 0) { alert("RT muito alto!"); return; }
      total   = subtotal / fator;
      valorRT = total * rtPct;
    }

    const rtQuem = orc.rtQuem || "Indicação";

    const breakdownRows: Parameters<typeof BreakdownTable>[0]["rows"] = [
      { label: `👐 Mão de obra — ${orc.horas}h × ${fmt(precoHora)}/h`, value: fmt(maoDeObra) },
      ...matLinhas.map(m => ({
        label: `📦 ${m.nome} (${m.qtde}× ${fmt(m.preco)} +${Math.round(mm * 100)}%)`,
        value: fmt(m.cobrado),
      })),
      ...(markupValor > 0 ? [{ label: `↳ Markup materiais (${Math.round(mm * 100)}%)`, value: `+ ${fmt(markupValor)}`, muted: true, indent: true }] : []),
      ...(cobradoFrete > 0 ? [{ label: "🚚 Frete (cobrado)", value: fmt(cobradoFrete) }] : []),
      { label: "Subtotal base", value: fmt(base0), muted: true },
      ...(orc.acrescimo > 0 ? [{ label: `⚡ Urgência (+${orc.acrescimo}%)`, value: `+ ${fmt(base0 * orc.acrescimo / 100)}` }] : []),
      ...(orc.desconto  > 0 ? [{ label: `🎁 Desconto (−${orc.desconto}%)`,   value: `− ${fmt(base0 * orc.desconto  / 100)}` }] : []),
      ...(orc.usarRT ? [
        { label: "Subtotal antes do RT", value: fmt(subtotal), muted: true },
        { label: `🤝 RT ${rtQuem} (${(rtPct * 100).toFixed(1)}% sobre total bruto)`, value: fmt(valorRT), highlight: true },
        { label: `↳ Simples sobre RT (${(aliquota * 100).toFixed(1)}%)`, value: fmt(total * rtPct * aliquota), muted: true, indent: true },
      ] : []),
      { label: "💰 TOTAL AO CLIENTE", value: fmt(total), total: true },
    ];

    setOrcResult(
      <div>
        {/* ── HERO ── */}
        <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, color: "#fff", borderRadius: 12, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: 6 }}>Valor total ao cliente</div>
          <div style={{ fontSize: "3rem", fontWeight: 800 }}>{fmt(total)}</div>
          <div style={{ fontSize: "0.82rem", opacity: 0.75, marginTop: 8 }}>
            {orc.descricao || "Serviço de estofamento"} · {orc.horas}h de trabalho{orc.usarRT ? ` · RT ${(rtPct * 100).toFixed(1)}% incluso` : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            {[
              { lbl: `Mão de obra (${orc.horas}h)`, val: fmt(maoDeObra) },
              { lbl: "Materiais cobrados", val: fmt(totalMateriais) },
              ...(cobradoFrete > 0 ? [{ lbl: "Frete cobrado", val: fmt(cobradoFrete) }] : []),
              ...(orc.usarRT ? [{ lbl: `RT ${rtQuem}`, val: fmt(valorRT) }] : []),
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: 12, textAlign: "left" }}>
                <div style={{ fontSize: "0.75rem", opacity: 0.75 }}>{item.lbl}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 2 }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BREAKDOWN ── */}
        <Breakdown title="📋 Detalhamento completo" rows={breakdownRows} />

        {orc.usarRT && (
          <div style={{ marginTop: 10, fontSize: "0.8rem", color: C.muted, padding: "8px 4px" }}>
            ℹ️ Dos {fmt(total)}, você retém {fmt(total - valorRT)} e repassa {fmt(valorRT)} como RT.
            O Simples sobre o RT ({fmt(total * rtPct * aliquota)}) já está embutido no grossup.
          </div>
        )}

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "10px 28px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}
          >
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>
    );
  }, [resultado, orc]);

  // ── EXPORTAR FUNCIONÁRIA ──────────────────────────────────────────────────
  const exportarFuncionaria = useCallback(() => {
    if (!resultado) return;
    const html = gerarHTMLFuncionaria(resultado.precoHora, orc.matMarkup, resultado.aliquota);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "orcamento_funcionaria.html"; a.click();
    URL.revokeObjectURL(url);
  }, [resultado, orc.matMarkup]);

  // ── BREAKEVEN ─────────────────────────────────────────────────────────────
  const breakevenContent = useCallback(() => {
    if (!resultado) return null;
    const { precoHora, totalFixo, aliquota, margem, hProdutivas } = resultado;
    const horasBreakeven = totalFixo / (precoHora * (1 - aliquota) / (1 + margem));
    const fatBreakeven   = horasBreakeven * precoHora / (1 + margem);
    const fatComMargem   = hProdutivas * precoHora;
    const lucroMeta      = totalFixo * margem;
    const breakPct       = (horasBreakeven / hProdutivas * 100).toFixed(1);

    const cenarios = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1.0].map(ocup => {
      const hV = hProdutivas * ocup;
      const rec = hV * precoHora;
      const imp = rec * aliquota;
      const luc = rec - imp - totalFixo;
      return { ocup, hV, rec, imp, luc };
    });

    return (
      <div>
        <ResultBox
          mainVal={`${breakPct}%`}
          mainLabel="Taxa de ocupação mínima para não ter prejuízo"
          subItems={[
            { val: `${Math.round(horasBreakeven)}h`, lbl: "Horas/mês para breakeven" },
            { val: fmt(fatBreakeven), lbl: "Faturamento mínimo/mês" },
            { val: `${(hProdutivas - horasBreakeven).toFixed(0)}h`, lbl: "Horas 'de lucro' acima do break" },
          ]}
        />

        <Breakdown title="🔍 Entendendo o Breakeven" rows={[
          { label: "Total custos fixos mensais", value: fmt(totalFixo) },
          { label: "Horas produtivas/mês", value: `${hProdutivas.toFixed(0)}h` },
          { label: "Receita por hora cobrada", value: fmt(precoHora) },
          { label: `↳ Líquido após ${(aliquota*100).toFixed(1)}% impostos`, value: `${fmt(precoHora*(1-aliquota))}/h`, muted: true, indent: true },
          { label: "Horas mínimas para cobrir custos", value: `${horasBreakeven.toFixed(1)}h (${breakPct}%)`, total: true },
        ]} />

        <div style={{ background: C.highlight, border: `1.5px solid ${C.accentLight}`, borderRadius: 10, padding: "18px 22px", marginTop: 12 }}>
          <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: C.primary, marginBottom: 12 }}>📊 Simulação de Cenários</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ color: C.muted, fontSize: "0.8rem" }}>
                  {["Ocupação", "Receita bruta", "Impostos", "Custos fixos", "Lucro líquido"].map(h => (
                    <td key={h} style={{ padding: "4px 4px", fontWeight: 600 }}>{h}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cenarios.map((c, i) => {
                  const cor  = c.luc < 0 ? "#c0392b" : c.luc < totalFixo * 0.1 ? "#e67e22" : "#2e7d52";
                  const emoji = c.luc < 0 ? "🔴" : c.luc < totalFixo * 0.1 ? "🟡" : "🟢";
                  return (
                    <tr key={i}>
                      <td style={{ padding: "5px 4px" }}>{(c.ocup * 100).toFixed(0)}% ({c.hV.toFixed(0)}h)</td>
                      <td style={{ padding: "5px 4px", textAlign: "right" }}>{fmt(c.rec)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#c0392b" }}>-{fmt(c.imp)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: C.muted }}>-{fmt(totalFixo)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", fontWeight: 700, color: cor }}>{emoji} {fmt(c.luc)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: "0.78rem", color: C.muted }}>🔴 Prejuízo · 🟡 Lucro baixo · 🟢 Saudável</div>
        </div>

        <Breakdown title={`💡 Meta: ${(margem * 100).toFixed(0)}% de margem`} rows={[
          { label: "Lucro alvo mensal", value: fmt(lucroMeta) },
          { label: "Horas necessárias (100% ocupação)", value: `${hProdutivas.toFixed(0)}h` },
          { label: "Faturamento total a 100%", value: fmt(fatComMargem) },
        ]} />
      </div>
    );
  }, [resultado]);

  // ── TAB CONFIG ────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string }[] = [
    { id: "custos",    label: "1. Custos da Oficina" },
    { id: "preco",     label: "2. Preço/Hora" },
    { id: "orcamento", label: "3. Orçar Serviço" },
    { id: "breakeven", label: "4. Breakeven" },
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* HEADER */}
      <div style={{ background: C.primary, color: "#fff", padding: "24px 32px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
        <span style={{ fontSize: "2rem" }}>🪑</span>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Calculadora de Precificação</h1>
          <p style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: 2 }}>Oficina de Estofados — Preço por hora e orçamento de serviços</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px 64px" }}>
        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 22px",
                border: `2px solid ${tab === t.id ? C.primary : C.border}`,
                background: tab === t.id ? C.primary : C.card,
                borderRadius: "8px 8px 0 0",
                cursor: "pointer",
                fontSize: "0.92rem",
                fontWeight: 600,
                color: tab === t.id ? "#fff" : C.muted,
                transition: "all 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB 1: CUSTOS ══════════════════════════════════════════════════ */}
        {tab === "custos" && (
          <div>
            {/* Parâmetros de Trabalho */}
            <Card>
              <CardTitle>⚙️ Parâmetros de Trabalho</CardTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <Field label="Dias trabalhados/mês" hint="Ex: 22 dias úteis">
                  <Input value={custos.diasMes} onChange={updCusto("diasMes")} min={1} />
                </Field>
                <Field label="Horas trabalhadas/dia">
                  <Input value={custos.horasDia} onChange={updCusto("horasDia")} min={1} />
                </Field>
                <Field label="Produtividade real" hint="Recomendado: 70–85%">
                  <Input value={custos.produtividade} onChange={updCusto("produtividade")} suffix="%" min={10} />
                </Field>
              </div>
            </Card>

            {/* Custos Fixos */}
            <Card>
              <CardTitle>🏠 Custos Fixos Mensais</CardTitle>
              <SectionTitle>Estrutura</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Aluguel"><Input value={custos.aluguel} onChange={updCusto("aluguel")} prefix="R$" /></Field>
                <Field label="Energia elétrica"><Input value={custos.energia} onChange={updCusto("energia")} prefix="R$" /></Field>
                <Field label="Água"><Input value={custos.agua} onChange={updCusto("agua")} prefix="R$" /></Field>
                <Field label="Internet / telefone"><Input value={custos.internet} onChange={updCusto("internet")} prefix="R$" /></Field>
              </div>

              <Divider />
              <SectionTitle>Funcionários</SectionTitle>
              <Alert>
                💡 Encargos trabalhistas somam aprox. <strong>68%</strong> sobre o salário bruto (INSS, FGTS, férias + 1/3, 13º). O custo total é calculado automaticamente.
              </Alert>

              {custos.funcionarios.map(f => (
                <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 32px", gap: 8, marginBottom: 10, alignItems: "end" }}>
                  <Field label="Função">
                    <Input type="text" value={f.nome} onChange={v => updFunc(f.id, "nome", v)} placeholder="Ex: Estofador" />
                  </Field>
                  <Field label="Salário bruto">
                    <Input value={f.salario} onChange={v => updFunc(f.id, "salario", v)} prefix="R$" />
                  </Field>
                  <Field label="Custo total (c/ encargos)">
                    <Input value={(f.salario * (1 + ENCARGOS)).toFixed(2)} prefix="R$" readOnly />
                  </Field>
                  <button
                    onClick={() => delFunc(f.id)}
                    style={{ height: 38, background: "#fde", border: "1.5px solid #f5c6c6", borderRadius: 6, cursor: "pointer", fontSize: "1rem", alignSelf: "flex-end" }}
                  >✕</button>
                </div>
              ))}
              <button
                onClick={addFunc}
                style={{ padding: "8px 18px", background: C.accentLight, border: `1.5px solid ${C.accent}`, borderRadius: 6, cursor: "pointer", fontWeight: 600, color: C.primary, fontSize: "0.88rem" }}
              >
                + Adicionar funcionário
              </button>

              <Divider />
              <SectionTitle>Outros Custos Fixos</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Contabilidade / honorários"><Input value={custos.contabilidade} onChange={updCusto("contabilidade")} prefix="R$" /></Field>
                <Field label="Manutenção de equipamentos"><Input value={custos.manutencao} onChange={updCusto("manutencao")} prefix="R$" /></Field>
                <Field label="Outros (marketing, etc.)"><Input value={custos.outrosFixos} onChange={updCusto("outrosFixos")} prefix="R$" /></Field>
              </div>
            </Card>

            {/* Impostos */}
            <Card>
              <CardTitle>📊 Impostos sobre Faturamento</CardTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Alíquota do Simples" hint="Serviços: 6% (Anexo III) ou 15,5% (Anexo V)">
                  <Input value={custos.aliquota} onChange={updCusto("aliquota")} suffix="%" step={0.1} />
                </Field>
                <Field label="Margem de lucro desejada" hint="Sobre o custo total">
                  <Input value={custos.margem} onChange={updCusto("margem")} suffix="%" />
                </Field>
              </div>
            </Card>

            <CalcBtn onClick={calcularPrecoHora}>🔢 Calcular Preço por Hora →</CalcBtn>
          </div>
        )}

        {/* ══ TAB 2: PREÇO/HORA ═════════════════════════════════════════════ */}
        {tab === "preco" && (
          <div>
            {!resultado ? (
              <Alert>⬅️ Preencha os custos na aba <strong>"1. Custos da Oficina"</strong> e clique em "Calcular Preço por Hora".</Alert>
            ) : (
              <>
                <ResultBox
                  mainVal={fmt(resultado.precoHora)}
                  mainLabel="Preço mínimo por hora de serviço"
                  subItems={[
                    { val: `${resultado.hProdutivas.toFixed(0)}h`, lbl: "Horas produtivas/mês" },
                    { val: fmt(resultado.custoPorHora), lbl: "Custo/hora (sem impostos)" },
                    { val: fmt(resultado.totalFixo), lbl: "Total fixo/mês" },
                  ]}
                />

                <Breakdown title="🔢 Composição do Preço/Hora" rows={[
                  { label: "Custo fixo por hora produtiva", value: fmt(resultado.custoPorHora) },
                  { label: `↳ Baseado em ${resultado.hProdutivas.toFixed(1)}h produtivas/mês`, value: "", muted: true, indent: true },
                  { label: `Impostos (${(resultado.aliquota*100).toFixed(1)}% Simples)`, value: `+ ${fmt(resultado.custoPorHora * resultado.aliquota / (1 - resultado.aliquota))}` },
                  { label: `Margem de lucro (${(resultado.margem*100).toFixed(0)}%)`, value: `+ ${fmt(resultado.custoPorHora / (1 - resultado.aliquota) * resultado.margem)}` },
                  { label: "Preço mínimo / hora", value: fmt(resultado.precoHora), total: true },
                ]} />

                <Breakdown title="💡 Referências úteis" rows={[
                  { label: "Serviço de 2h",             value: fmt(resultado.precoHora * 2)  },
                  { label: "Serviço de 4h (meio dia)",   value: fmt(resultado.precoHora * 4)  },
                  { label: "Serviço de 8h (dia cheio)",  value: fmt(resultado.precoHora * 8)  },
                  { label: "Serviço de 16h (2 dias)",    value: fmt(resultado.precoHora * 16) },
                ]} />

                {/* Exportar funcionária */}
                <div style={{ marginTop: 20, padding: 20, background: "linear-gradient(135deg,#f0f7f3,#e8f4ee)", border: `2px dashed ${C.primary}`, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: C.primary, marginBottom: 6 }}>👩‍💼 Versão para Funcionária</div>
                  <div style={{ fontSize: "0.85rem", color: C.muted, marginBottom: 14 }}>
                    Gera um arquivo separado só com a ferramenta de orçamento. O preço/hora fica embutido mas <strong>invisível</strong> — ela não verá custos ou margens.
                  </div>
                  <button
                    onClick={exportarFuncionaria}
                    style={{ padding: "12px 28px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}
                  >
                    📤 Baixar versão para funcionária
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ TAB 3: ORÇAMENTO ══════════════════════════════════════════════ */}
        {tab === "orcamento" && (
          <div>
            <Card>
              <CardTitle>🛠️ Dados do Serviço</CardTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Descrição do serviço">
                  <Input type="text" value={orc.descricao} onChange={updOrc("descricao")} placeholder="Ex: Estofamento sofá 3 lugares" />
                </Field>
                <Field label="Horas estimadas">
                  <Input value={orc.horas} onChange={updOrc("horas")} step={0.5} />
                </Field>
              </div>

              <Divider />
              <SectionTitle>Matéria-Prima</SectionTitle>

              {orc.materiais.map(m => (
                <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 32px", gap: 8, marginBottom: 8, alignItems: "end" }}>
                  <Field label="Item">
                    <Input type="text" value={m.nome} onChange={v => updMat(m.id, "nome", v)} placeholder="Material" />
                  </Field>
                  <Field label="Qtde">
                    <Input value={m.qtde} onChange={v => updMat(m.id, "qtde", v)} step={0.1} />
                  </Field>
                  <Field label="Preço unit. (R$)">
                    <Input value={m.preco} onChange={v => updMat(m.id, "preco", v)} step={0.01} />
                  </Field>
                  <button onClick={() => delMat(m.id)} style={{ height: 38, background: "#fde", border: "1.5px solid #f5c6c6", borderRadius: 6, cursor: "pointer", fontSize: "1rem", alignSelf: "flex-end" }}>✕</button>
                </div>
              ))}

              <button onClick={addMat} style={{ padding: "8px 18px", background: C.accentLight, border: `1.5px solid ${C.accent}`, borderRadius: 6, cursor: "pointer", fontWeight: 600, color: C.primary, fontSize: "0.88rem" }}>
                + Adicionar material
              </button>

              <div style={{ marginTop: 14, maxWidth: 220 }}>
                <Field label="Markup sobre materiais" hint="Cobre manuseio, compra, estoque e margem">
                  <Input value={orc.matMarkup} onChange={updOrc("matMarkup")} suffix="%" />
                </Field>
              </div>

              <Divider />

              {/* Frete */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={orc.usarFrete} onChange={e => updOrc("usarFrete")(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: C.primary }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>🚚 Incluir frete / coleta e entrega</span>
              </label>
              {orc.usarFrete && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Valor do frete"><Input value={orc.frete} onChange={updOrc("frete")} prefix="R$" /></Field>
                  <Field label="Markup sobre frete"><Input value={orc.freteMarkup} onChange={updOrc("freteMarkup")} suffix="%" /></Field>
                </div>
              )}

              <Divider />

              {/* RT */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={orc.usarRT} onChange={e => updOrc("usarRT")(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: C.primary }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>🤝 Incluir RT / Comissão de indicação</span>
              </label>
              {orc.usarRT && (
                <>
                  <div style={{ background: "#f0f7f3", border: `1.5px solid #b8d8c8`, borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
                    <div style={{ fontSize: "0.82rem", color: C.primary, fontWeight: 600, marginBottom: 4 }}>Como funciona o cálculo do RT</div>
                    <div style={{ fontSize: "0.8rem", color: "#5a7a6a", lineHeight: 1.5 }}>
                      O RT é calculado sobre o total da nota. O preço é grosseado para cobrir o RT + os impostos sobre o valor adicional.
                      Fórmula: <strong>Total ÷ (1 − RT% − RT% × Simples%)</strong>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field label="Percentual do RT"><Input value={orc.rt} onChange={updOrc("rt")} suffix="%" step={0.5} /></Field>
                    <Field label="Quem recebe">
                      <Input type="text" value={orc.rtQuem} onChange={updOrc("rtQuem")} placeholder="Ex: Arquiteto, Decoradora..." />
                    </Field>
                  </div>
                  {resultado && orc.rt > 0 && (
                    <div style={{ marginTop: 8, padding: "10px 14px", background: C.highlight, border: `1.5px solid ${C.accentLight}`, borderRadius: 7, fontSize: "0.84rem", color: "#7a5a00" }}>
                      💡 Um serviço de <strong>R$ 1.000,00</strong> base passará a ser cobrado como{" "}
                      <strong>{fmt(1000 / (1 - orc.rt/100 - orc.rt/100 * custos.aliquota/100))}</strong>
                      {" "}— para cobrir RT ({orc.rt}%) + imposto sobre o RT ({custos.aliquota}%)
                    </div>
                  )}
                </>
              )}

              <Divider />
              <SectionTitle>Ajuste de desconto / acréscimo</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Desconto"><Input value={orc.desconto} onChange={updOrc("desconto")} suffix="%" /></Field>
                <Field label="Urgência / acréscimo"><Input value={orc.acrescimo} onChange={updOrc("acrescimo")} suffix="%" /></Field>
              </div>
            </Card>

            <CalcBtn onClick={calcularOrcamento}>💰 Calcular Orçamento</CalcBtn>

            {orcResult && <div style={{ marginTop: 20 }}>{orcResult}</div>}
          </div>
        )}

        {/* ══ TAB 4: BREAKEVEN ══════════════════════════════════════════════ */}
        {tab === "breakeven" && (
          <div>
            {!resultado ? (
              <Alert>⬅️ Preencha os custos na aba <strong>"1. Custos da Oficina"</strong> e clique em "Calcular Preço por Hora" primeiro.</Alert>
            ) : (
              breakevenContent()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
