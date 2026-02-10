import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

function computeEquilibrium(a, b, c, d) {
  if (b + d <= 0) return null
  const P = (a - c) / (b + d)
  const Q = a - b * P
  if (P < 0 || Q < 0) return null
  return { P, Q }
}

// Elasticity at equilibrium: demand ε_d = (dQd/dP)*(P/Q) = -b*P/Q; supply ε_s = d*P/Q
function elasticity(a, b, c, d) {
  const eq = computeEquilibrium(a, b, c, d)
  if (!eq || eq.Q <= 0) return null
  return { ed: -b * eq.P / eq.Q, es: d * eq.P / eq.Q }
}

// Monopoly: inverse demand P = a - b*Q, MC = c. MR = a - 2b*Q. Q_m = (a-c)/(2b), P_m = (a+c)/2
function monopoly(a, b, c) {
  if (b <= 0 || a <= c) return null
  const Qm = (a - c) / (2 * b)
  const Pm = (a + c) / 2
  const CS = 0.5 * (a - Pm) * Qm
  const PS = (Pm - c) * Qm
  const competitiveQ = (a - c) / b
  const DWL = 0.5 * (Pm - c) * (competitiveQ - Qm)
  return { Qm, Pm, CS, PS, DWL }
}

// Per-unit tax t: Pd = Ps + t, Qd = a - b*Pd, Qs = c + d*Ps. So a - b*(Ps+t) = c + d*Ps => Ps = (a-c-b*t)/(b+d), Pd = Ps+t
function tax(a, b, c, d, t) {
  if (b + d <= 0) return null
  const Ps = (a - c - b * t) / (b + d)
  const Pd = Ps + t
  const Q = c + d * Ps
  if (Q < 0 || Pd < 0) return null
  const eq = computeEquilibrium(a, b, c, d)
  const taxRev = t * Q
  const DWL = eq ? 0.5 * t * Math.abs(eq.Q - Q) : null
  const consumerIncidence = eq && t > 0 ? (Pd - eq.P) / t : null
  const producerIncidence = eq && t > 0 ? (eq.P - Ps) / t : null
  return { Ps, Pd, Q, taxRev, DWL, consumerIncidence, producerIncidence }
}

// Cobb-Douglas: U = x^α y^β, I, px, py. x* = α*I/((α+β)*px), y* = β*I/((α+β)*py)
function cobbDouglas(alpha, beta, I, px, py) {
  if (px <= 0 || py <= 0 || I < 0) return null
  const sum = alpha + beta
  const x = (alpha * I) / (sum * px)
  const y = (beta * I) / (sum * py)
  return { x, y, u: Math.pow(x, alpha) * Math.pow(y, beta) }
}

// Cost: TC = F + v*Q (linear). MC = v, ATC = F/Q + v, AVC = v. Profit max P = MC => Q such that P = v.
function costLinear(F, v, P) {
  if (P < v) return { Q: 0, pi: -F, shutdown: true }
  return { Q: null, pi: null, shutdown: false, note: 'P = MC gives no unique Q with linear MC; any Q ≥ 0 yields π = (P-v)*Q - F. Max at Q→∞ if P > v.' }
}

// TC = F + v*Q + k*Q^2. MC = v + 2k*Q. ATC = F/Q + v + k*Q. P = MC => Q = (P-v)/(2k) for P >= v.
function costQuadratic(F, v, k, P) {
  if (k <= 0) return null
  if (P < v) return { Q: 0, pi: -F, shutdown: true }
  const Q = (P - v) / (2 * k)
  const pi = P * Q - (F + v * Q + k * Q * Q)
  return { Q, pi, shutdown: false }
}

// Price ceiling: P_ceiling. If P_ceiling < P*, quantity = Qs(P_ceiling), shortage.
function priceCeiling(a, b, c, d, Pceil) {
  const eq = computeEquilibrium(a, b, c, d)
  if (!eq) return null
  if (Pceil >= eq.P) return { binding: false, Q: eq.Q, P: eq.P, shortage: 0 }
  const Qs_at = c + d * Pceil
  const Qd_at = a - b * Pceil
  const Q = Math.max(0, Qs_at)
  const shortage = Math.max(0, Qd_at - Qs_at)
  return { binding: true, Q, P: Pceil, shortage, Qd_at, Qs_at }
}

const MODEL_GROUPS = [
  {
    title: 'Markets',
    items: [
      { id: 'demand-supply', name: 'Demand & Supply', desc: 'Linear D&S, equilibrium', icon: '📈', color: 'from-sky-500 to-blue-500' },
      { id: 'elasticity', name: 'Elasticity', desc: 'Price elasticity at equilibrium', icon: '📐', color: 'from-amber-500 to-orange-500' },
      { id: 'monopoly', name: 'Monopoly', desc: 'Single firm, MR = MC, DWL', icon: '🏢', color: 'from-violet-500 to-purple-500' },
      { id: 'tax', name: 'Tax & Incidence', desc: 'Per-unit tax, burden, DWL', icon: '💰', color: 'from-emerald-500 to-teal-500' },
      { id: 'ceiling', name: 'Price Ceiling', desc: 'Binding ceiling, shortage', icon: '📉', color: 'from-rose-500 to-pink-500' },
    ],
  },
  {
    title: 'Consumer & Producer',
    items: [
      { id: 'cobb-douglas', name: 'Cobb-Douglas', desc: 'Utility max, optimal bundle', icon: '🧾', color: 'from-lime-500 to-green-500' },
      { id: 'cost', name: 'Cost & Supply', desc: 'Quadratic cost, MC, profit max', icon: '🏭', color: 'from-cyan-500 to-blue-500' },
    ],
  },
]

function MicroeconomicsLab() {
  const navigate = useNavigate()
  const [model, setModel] = useState('demand-supply')

  const [a, setA] = useState(100)
  const [b, setB] = useState(2)
  const [c, setC] = useState(-20)
  const [d, setD] = useState(3)

  const [monoA, setMonoA] = useState(100)
  const [monoB, setMonoB] = useState(1)
  const [monoC, setMonoC] = useState(10)

  const [taxRate, setTaxRate] = useState(5)
  const [Pceil, setPceil] = useState(15)

  const [cdAlpha, setCdAlpha] = useState(0.5)
  const [cdBeta, setCdBeta] = useState(0.5)
  const [cdI, setCdI] = useState(100)
  const [cdPx, setCdPx] = useState(2)
  const [cdPy, setCdPy] = useState(4)

  const [costF, setCostF] = useState(50)
  const [costV, setCostV] = useState(5)
  const [costK, setCostK] = useState(0.5)
  const [costP, setCostP] = useState(15)

  const eq = computeEquilibrium(a, b, c, d)
  const elast = elasticity(a, b, c, d)
  const mono = monopoly(monoA, monoB, monoC)
  const taxRes = tax(a, b, c, d, taxRate)
  const cd = cobbDouglas(cdAlpha, cdBeta, cdI, cdPx, cdPy)
  const costRes = costQuadratic(costF, costV, costK, costP)
  const ceilingRes = priceCeiling(a, b, c, d, Pceil)

  const Pmax = b > 0 ? Math.max(a / b, eq ? eq.P + 2 : 10) : 10
  const Qmax = Math.max(a, d * Pmax + c, eq ? eq.Q + 10 : 50, 1)

  const getCodeSnippet = () => {
    if (model === 'demand-supply') return `# Demand & Supply\na<-${a}; b<-${b}; c<-${c}; d<-${d}\nP_star <- (a-c)/(b+d)\nQ_star <- a - b*P_star\ncat("P* =", P_star, " Q* =", Q_star, "\\n")`
    if (model === 'elasticity') return `# Elasticity at equilibrium\ned <- -b*P_star/Q_star  # demand\nes <- d*P_star/Q_star   # supply\ncat("Elasticity demand:", ed, " supply:", es, "\\n")`
    if (model === 'monopoly') return `# Monopoly: P = a - b*Q, MC = c\nQm <- (${monoA}-${monoC})/(2*${monoB})\nPm <- (${monoA}+${monoC})/2\ncat("Qm =", Qm, " Pm =", Pm, "\\n")`
    if (model === 'tax') return `# Per-unit tax t\nPs <- (a-c-b*${taxRate})/(b+d)\nPd <- Ps + ${taxRate}\nQ_tax <- c + d*Ps\ncat("Ps =", Ps, " Pd =", Pd, " Q =", Q_tax, "\\n")`
    if (model === 'ceiling') return `# Price ceiling\nif (P_ceiling < P_star) Q <- c + d*P_ceiling else Q <- Q_star\n# Shortage = Qd(P_ceiling) - Q\\n`
    if (model === 'cobb-douglas') return `# Cobb-Douglas U = x^α y^β\nx <- ${cdAlpha}*${cdI}/((${cdAlpha}+${cdBeta})*${cdPx})\ny <- ${cdBeta}*${cdI}/((${cdAlpha}+${cdBeta})*${cdPy})\ncat("x* =", x, " y* =", y, "\\n")`
    if (model === 'cost') return `# TC = F + v*Q + k*Q^2, MC = v + 2k*Q\nQ <- (${costP}-${costV})/(2*${costK})\npi <- ${costP}*Q - (${costF}+${costV}*Q+${costK}*Q^2)\ncat("Q* =", Q, " profit =", pi, "\\n")`
    return ''
  }

  const copyCode = () => navigator.clipboard.writeText(getCodeSnippet()).then(() => alert('Copied!'))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/profession-dashboard')} className="text-gray-600 hover:text-gray-900">← Back</button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Microeconomics Lab</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose a model</h2>
          <div className="space-y-6">
            {MODEL_GROUPS.map(group => (
              <div key={group.title}>
                <p className="text-xs font-medium text-gray-400 mb-2">{group.title}</p>
                <div className="flex flex-wrap gap-3">
                  {group.items.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModel(m.id)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all shadow-sm border-2 ${model === m.id ? 'border-gray-800 bg-white shadow-md' : 'border-transparent bg-white hover:border-gray-300 hover:shadow'}`}
                    >
                      <span className="text-2xl">{m.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.desc}</p>
                      </div>
                      {model === m.id && <span className={`ml-2 w-2 h-2 rounded-full bg-gradient-to-r ${m.color}`} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            {model === 'demand-supply' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Demand & Supply</h2>
                <p className="text-sm text-gray-600 mb-4">Q<sub>d</sub> = a − bP, Q<sub>s</sub> = c + dP.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">a</label><input type="number" value={a} onChange={e => setA(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">b</label><input type="number" value={b} onChange={e => setB(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">c</label><input type="number" value={c} onChange={e => setC(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">d</label><input type="number" value={d} onChange={e => setD(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {eq ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>P* = <strong>{eq.P.toFixed(2)}</strong>, Q* = <strong>{eq.Q.toFixed(2)}</strong></p>
                    {eq && (
                      <svg viewBox="0 0 200 120" className="w-full h-40 border border-gray-200 rounded bg-gray-50 mt-2">
                        <line x1={20} y1={100} x2={180} y2={100} stroke="#333" strokeWidth="1" />
                        <line x1={20} y1={100} x2={20} y2={20} stroke="#333" strokeWidth="1" />
                        {b > 0 && <line x1={20} y1={100 - 80 * (a / b) / Pmax} x2={20 + 160 * Math.min(a, Qmax) / Qmax} y2={100} stroke="#2563eb" strokeWidth="2" />}
                        {d > 0 && <line x1={20 + 160 * Math.max(0, c) / Qmax} y1={100} x2={20 + 160 * Math.min(c + d * Pmax, Qmax) / Qmax} y2={20} stroke="#dc2626" strokeWidth="2" />}
                        <circle cx={20 + 160 * eq.Q / Qmax} cy={100 - 80 * eq.P / Pmax} r="4" fill="#000" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">No positive equilibrium. Need b, d &gt; 0 and a &gt; c.</p>
                )}
              </>
            )}

            {model === 'elasticity' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Elasticity at equilibrium</h2>
                <p className="text-sm text-gray-600 mb-4">ε<sub>d</sub> = −b·(P/Q), ε<sub>s</sub> = d·(P/Q). Uses same D&S parameters.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">a</label><input type="number" value={a} onChange={e => setA(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">b</label><input type="number" value={b} onChange={e => setB(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">c</label><input type="number" value={c} onChange={e => setC(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">d</label><input type="number" value={d} onChange={e => setD(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {elast ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p>Price elasticity of demand (at P*, Q*): <strong>{elast.ed.toFixed(3)}</strong></p>
                    <p>Price elasticity of supply: <strong>{elast.es.toFixed(3)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">No equilibrium. Set D&S first.</p>
                )}
              </>
            )}

            {model === 'monopoly' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Monopoly</h2>
                <p className="text-sm text-gray-600 mb-4">Inverse demand P = a − b·Q, MC = c. MR = a − 2b·Q.</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">a</label><input type="number" value={monoA} onChange={e => setMonoA(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">b</label><input type="number" value={monoB} onChange={e => setMonoB(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">c (MC)</label><input type="number" value={monoC} onChange={e => setMonoC(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {mono ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>Q<sub>m</sub> = <strong>{mono.Qm.toFixed(2)}</strong>, P<sub>m</sub> = <strong>{mono.Pm.toFixed(2)}</strong></p>
                    <p>Consumer surplus = <strong>{mono.CS.toFixed(2)}</strong>, Producer surplus = <strong>{mono.PS.toFixed(2)}</strong></p>
                    <p>Deadweight loss = <strong>{mono.DWL.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need a &gt; c, b &gt; 0.</p>
                )}
              </>
            )}

            {model === 'tax' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Per-unit tax</h2>
                <p className="text-sm text-gray-600 mb-4">Tax t on sellers. P<sub>d</sub> = P<sub>s</sub> + t. Uses D&S parameters.</p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className="block text-xs text-gray-500">a</label><input type="number" value={a} onChange={e => setA(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">b</label><input type="number" value={b} onChange={e => setB(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">c</label><input type="number" value={c} onChange={e => setC(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">d</label><input type="number" value={d} onChange={e => setD(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                <div className="mb-4"><label className="block text-xs text-gray-500">Tax t</label><input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="w-24 border rounded px-2 py-1" /></div>
                {taxRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>P<sub>s</sub> = <strong>{taxRes.Ps.toFixed(2)}</strong>, P<sub>d</sub> = <strong>{taxRes.Pd.toFixed(2)}</strong>, Q = <strong>{taxRes.Q.toFixed(2)}</strong></p>
                    <p>Tax revenue = <strong>{taxRes.taxRev.toFixed(2)}</strong></p>
                    {taxRes.DWL != null && <p>DWL ≈ <strong>{taxRes.DWL.toFixed(2)}</strong></p>}
                    {taxRes.consumerIncidence != null && <p>Consumer share of tax ≈ <strong>{(taxRes.consumerIncidence * 100).toFixed(0)}%</strong></p>}
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Invalid parameters or negative quantity.</p>
                )}
              </>
            )}

            {model === 'ceiling' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Price ceiling</h2>
                <p className="text-sm text-gray-600 mb-4">If P_ceiling &lt; P*, quantity supplied = Q<sub>s</sub>(P_ceiling), shortage = Q<sub>d</sub> − Q<sub>s</sub>.</p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className="block text-xs text-gray-500">a</label><input type="number" value={a} onChange={e => setA(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">b</label><input type="number" value={b} onChange={e => setB(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">c</label><input type="number" value={c} onChange={e => setC(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">d</label><input type="number" value={d} onChange={e => setD(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                <div className="mb-4"><label className="block text-xs text-gray-500">Ceiling P</label><input type="number" value={Pceil} onChange={e => setPceil(parseFloat(e.target.value) || 0)} className="w-24 border rounded px-2 py-1" /></div>
                {ceilingRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    {ceilingRes.binding ? (
                      <>
                        <p>Binding. Quantity traded = <strong>{ceilingRes.Q.toFixed(2)}</strong></p>
                        <p>Shortage = <strong>{ceilingRes.shortage.toFixed(2)}</strong></p>
                      </>
                    ) : (
                      <p>Not binding. Equilibrium unchanged: Q* = {eq?.Q.toFixed(2)}, P* = {eq?.P.toFixed(2)}.</p>
                    )}
                  </div>
                ) : null}
              </>
            )}

            {model === 'cobb-douglas' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Cobb-Douglas utility</h2>
                <p className="text-sm text-gray-600 mb-4">U = x<sup>α</sup> y<sup>β</sup>, budget I, prices p<sub>x</sub>, p<sub>y</sub>. x* = αI/[(α+β)p<sub>x</sub>], y* = βI/[(α+β)p<sub>y</sub>].</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">α</label><input type="number" step="0.1" value={cdAlpha} onChange={e => setCdAlpha(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">β</label><input type="number" step="0.1" value={cdBeta} onChange={e => setCdBeta(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">I</label><input type="number" value={cdI} onChange={e => setCdI(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">p<sub>x</sub>, p<sub>y</sub></label><div className="flex gap-2"><input type="number" value={cdPx} onChange={e => setCdPx(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" value={cdPy} onChange={e => setCdPy(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                </div>
                {cd ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>x* = <strong>{cd.x.toFixed(2)}</strong>, y* = <strong>{cd.y.toFixed(2)}</strong></p>
                    <p>U(x*, y*) = <strong>{cd.u.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need p<sub>x</sub>, p<sub>y</sub> &gt; 0, I ≥ 0.</p>
                )}
              </>
            )}

            {model === 'cost' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Cost & profit max</h2>
                <p className="text-sm text-gray-600 mb-4">TC = F + v·Q + k·Q². MC = v + 2k·Q. Price-taker: set P = MC ⇒ Q* = (P−v)/(2k).</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">F</label><input type="number" value={costF} onChange={e => setCostF(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">v</label><input type="number" value={costV} onChange={e => setCostV(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">k</label><input type="number" step="0.1" value={costK} onChange={e => setCostK(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">Price P</label><input type="number" value={costP} onChange={e => setCostP(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {costRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    {costRes.shutdown ? (
                      <p>Shutdown (P &lt; AVC at min AVC). π = <strong>−F</strong>.</p>
                    ) : (
                      <>
                        <p>Q* = <strong>{costRes.Q.toFixed(2)}</strong>, profit = <strong>{costRes.pi.toFixed(2)}</strong></p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need k &gt; 0.</p>
                )}
              </>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-gray-800">R code</h2>
              <button onClick={copyCode} className="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Copy</button>
            </div>
            <pre className="w-full h-96 overflow-auto border rounded-lg bg-gray-900 text-green-400 p-4 text-xs whitespace-pre-wrap font-mono">
              {getCodeSnippet()}
            </pre>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MicroeconomicsLab
