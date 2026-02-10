import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

const ROW_LABELS = ['Up', 'Down']
const COL_LABELS = ['Left', 'Right']

function findPureNash(payoff1, payoff2) {
  const nash = []
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const p1Best = payoff1[i][j] >= payoff1[1 - i][j]
      const p2Best = payoff2[i][j] >= payoff2[i][1 - j]
      if (p1Best && p2Best) nash.push({ row: i, col: j })
    }
  }
  return nash
}

function findMixedNash(payoff1, payoff2) {
  const denom2 = payoff2[0][0] - payoff2[1][0] - payoff2[0][1] + payoff2[1][1]
  const p = (Math.abs(denom2) < 1e-10) ? null : (payoff2[1][1] - payoff2[1][0]) / denom2
  const denom1 = payoff1[0][0] - payoff1[0][1] - payoff1[1][0] + payoff1[1][1]
  const q = (Math.abs(denom1) < 1e-10) ? null : (payoff1[1][1] - payoff1[1][0]) / denom1
  if (p != null && q != null && p >= 0 && p <= 1 && q >= 0 && q <= 1) return { p, q }
  return null
}

function cournot(a, b, c) {
  if (b <= 0 || a <= c) return null
  const q = (a - c) / (3 * b)
  return { q1: q, q2: q, Q: 2 * q, P: a - 2 * b * q, pi1: (a - 2 * b * q - c) * q, pi2: (a - 2 * b * q - c) * q }
}

function bertrand(c) {
  return { P1: c, P2: c, P: c, pi1: 0, pi2: 0 }
}

function stackelberg(a, b, c) {
  if (b <= 0 || a <= c) return null
  const q1 = (a - c) / (2 * b)
  const q2 = (a - c) / (4 * b)
  const Q = q1 + q2
  const P = a - b * Q
  return { q1, q2, Q, P, pi1: (P - c) * q1, pi2: (P - c) * q2 }
}

// Repeated (infinite): grim trigger. (0,0)=cooperate. dev = payoff from one-shot deviation, coop = (0,0), pun = (1,1).
function repeatedDeltaMin(payoff1, payoff2) {
  const coop1 = payoff1[0][0]
  const dev1 = payoff1[1][0]
  const pun1 = payoff1[1][1]
  const coop2 = payoff2[0][0]
  const dev2 = payoff2[0][1]
  const pun2 = payoff2[1][1]
  if (dev1 <= coop1 && dev2 <= coop2) return { deltaMin: 0, sustainable: true }
  const d1 = (dev1 - coop1) / (dev1 - pun1)
  const d2 = (dev2 - coop2) / (dev2 - pun2)
  const deltaMin = Math.max(isFinite(d1) ? d1 : 1, isFinite(d2) ? d2 : 1)
  return { deltaMin: Math.max(0, Math.min(1, deltaMin)), sustainable: true }
}

// Bayesian: two games with prior p. Expected matrix = p*M1 + (1-p)*M2.
function bayesianNash(payoff1A, payoff2A, payoff1B, payoff2B, prior) {
  const E1 = [[0, 0], [0, 0]]
  const E2 = [[0, 0], [0, 0]]
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      E1[i][j] = prior * payoff1A[i][j] + (1 - prior) * payoff1B[i][j]
      E2[i][j] = prior * payoff2A[i][j] + (1 - prior) * payoff2B[i][j]
    }
  return findPureNash(E1, E2)
}

// MPE: two states. State 0: (0,0) keeps state 0, else go to state 1. State 1: Nash forever. δ discount.
function mpeDeltaMin(payoff1_0, payoff2_0, payoff1_1, payoff2_1) {
  const nash1 = findPureNash(payoff1_1, payoff2_1)
  const V1_1 = nash1.length > 0 ? payoff1_1[nash1[0].row][nash1[0].col] : payoff1_1[1][1]
  const V1_2 = nash1.length > 0 ? payoff2_1[nash1[0].row][nash1[0].col] : payoff2_1[1][1]
  const coop1 = payoff1_0[0][0]
  const dev1 = payoff1_0[1][0]
  const coop2 = payoff2_0[0][0]
  const dev2 = payoff2_0[0][1]
  const d1 = (dev1 - V1_1) <= 0 ? 1 : (dev1 - coop1) / (dev1 - V1_1)
  const d2 = (dev2 - V1_2) <= 0 ? 1 : (dev2 - coop2) / (dev2 - V1_2)
  const deltaMin = Math.max(0, Math.min(1, Math.max(isFinite(d1) ? d1 : 1, isFinite(d2) ? d2 : 1)))
  return { deltaMin: Math.max(0, Math.min(1, deltaMin)), V1_1, V1_2 }
}

const MODEL_GROUPS = [
  {
    title: 'Basic',
    items: [
      { id: '2x2-pure', name: '2×2 Pure Nash', desc: 'One-shot, pure strategies', icon: '🎯', color: 'from-amber-500 to-orange-500' },
      { id: '2x2-mixed', name: '2×2 Mixed Nash', desc: 'Mixed strategy equilibrium', icon: '🎲', color: 'from-lime-500 to-green-500' },
    ],
  },
  {
    title: 'Oligopoly',
    items: [
      { id: 'cournot', name: 'Cournot', desc: 'Quantity competition', icon: '📦', color: 'from-cyan-500 to-blue-500' },
      { id: 'bertrand', name: 'Bertrand', desc: 'Price competition', icon: '💰', color: 'from-emerald-500 to-teal-500' },
      { id: 'stackelberg', name: 'Stackelberg', desc: 'Leader–follower', icon: '👑', color: 'from-violet-500 to-purple-500' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { id: 'repeated', name: 'Repeated Game', desc: 'Infinite horizon, grim trigger', icon: '🔄', color: 'from-rose-500 to-pink-500' },
      { id: 'bayesian', name: 'Bayesian Game', desc: 'Incomplete information, prior', icon: '🔮', color: 'from-indigo-500 to-blue-500' },
      { id: 'mpe', name: 'MPE', desc: 'Two-state Markov perfect', icon: '⚡', color: 'from-sky-500 to-cyan-500' },
    ],
  },
]

function GameTheoryLab() {
  const navigate = useNavigate()
  const [model, setModel] = useState('2x2-pure')

  const [payoff1, setPayoff1] = useState([[3, 0], [0, 2]])
  const [payoff2, setPayoff2] = useState([[3, 0], [0, 2]])

  const [cournotA, setCournotA] = useState(100)
  const [cournotB, setCournotB] = useState(1)
  const [cournotC, setCournotC] = useState(10)
  const [bertrandC, setBertrandC] = useState(20)
  const [stackA, setStackA] = useState(100)
  const [stackB, setStackB] = useState(1)
  const [stackC, setStackC] = useState(10)

  const [repeatedDelta, setRepeatedDelta] = useState(0.9)
  const [bayesianPrior, setBayesianPrior] = useState(0.5)
  const [payoff1B, setPayoff1B] = useState([[2, 1], [1, 0]])
  const [payoff2B, setPayoff2B] = useState([[2, 1], [1, 0]])
  const [mpeDelta, setMpeDelta] = useState(0.9)
  const [payoff1_1, setPayoff1_1] = useState([[0, 0], [0, 0]])
  const [payoff2_1, setPayoff2_1] = useState([[0, 0], [0, 0]])

  const nash = findPureNash(payoff1, payoff2)
  const mixed = findMixedNash(payoff1, payoff2)
  const cournotRes = cournot(cournotA, cournotB, cournotC)
  const bertrandRes = bertrand(bertrandC)
  const stackRes = stackelberg(stackA, stackB, stackC)
  const repeatedRes = repeatedDeltaMin(payoff1, payoff2)
  const bayesianNashList = bayesianNash(payoff1, payoff2, payoff1B, payoff2B, bayesianPrior)
  const mpeRes = mpeDeltaMin(payoff1, payoff2, payoff1_1, payoff2_1)

  const setCell = (player, i, j, val, setter) => {
    const n = parseInt(val, 10)
    if (isNaN(n)) return
    const arr = player === 1 ? (setter ? null : payoff1) : (setter ? null : payoff2)
    if (setter) {
      const which = setter === 'B1' ? payoff1B : setter === 'B2' ? payoff2B : setter === 'M1' ? payoff1_1 : payoff2_1
      const next = which.map((row, r) => row.map((cell, c) => (r === i && c === j ? n : cell)))
      if (setter === 'B1') setPayoff1B(next)
      else if (setter === 'B2') setPayoff2B(next)
      else if (setter === 'M1') setPayoff1_1(next)
      else setPayoff2_1(next)
      return
    }
    const set = player === 1 ? setPayoff1 : setPayoff2
    const which = player === 1 ? payoff1 : payoff2
    const next = which.map((row, r) => row.map((cell, c) => (r === i && c === j ? n : cell)))
    set(next)
  }

  const setCellMain = (player, i, j, val) => setCell(player, i, j, val, null)

  const getCodeSnippet = () => {
    if (model === '2x2-pure') {
      return `# 2x2 pure-strategy Nash\npayoff1 <- matrix(c(${payoff1.flat().join(', ')}), 2, 2, byrow=TRUE)\npayoff2 <- matrix(c(${payoff2.flat().join(', ')}), 2, 2, byrow=TRUE)\nfor (i in 1:2) for (j in 1:2)\n  if (payoff1[i,j]>=max(payoff1[,j]) && payoff2[i,j]>=max(payoff2[i,])) cat("Nash:", i, j, "\\n")`
    }
    if (model === '2x2-mixed') {
      return `# 2x2 mixed-strategy Nash\npayoff1 <- matrix(c(${payoff1.flat().join(', ')}), 2, 2, byrow=TRUE)\npayoff2 <- matrix(c(${payoff2.flat().join(', ')}), 2, 2, byrow=TRUE)\np <- (payoff2[2,2]-payoff2[2,1])/(payoff2[1,1]-payoff2[2,1]-payoff2[1,2]+payoff2[2,2])\nq <- (payoff1[2,2]-payoff1[2,1])/(payoff1[1,1]-payoff1[1,2]-payoff1[2,1]+payoff1[2,2])\ncat("P1(Up)=", p, ", P2(Left)=", q, "\\n")`
    }
    if (model === 'cournot') return `# Cournot\na<-${cournotA}; b<-${cournotB}; c<-${cournotC}\nq<-(a-c)/(3*b); P<-a-2*b*q\ncat("q*=", q, " P*=", P, "\\n")`
    if (model === 'bertrand') return `# Bertrand: P=MC\ncat("P*=", ${bertrandC}, "\\n")`
    if (model === 'stackelberg') return `# Stackelberg\na<-${stackA}; b<-${stackB}; c<-${stackC}\nq1<-(a-c)/(2*b); q2<-(a-c)/(4*b)\ncat("q1=", q1, " q2=", q2, "\\n")`
    if (model === 'repeated') return `# Repeated: grim trigger. (0,0)=cooperate. delta_min = ${repeatedRes.deltaMin.toFixed(3)}\npayoff1 <- matrix(c(${payoff1.flat().join(', ')}), 2, 2, byrow=TRUE)\npayoff2 <- matrix(c(${payoff2.flat().join(', ')}), 2, 2, byrow=TRUE)\ndev1 <- payoff1[2,1]; coop1 <- payoff1[1,1]; pun1 <- payoff1[2,2]\ndelta_min <- (dev1-coop1)/(dev1-pun1)\ncat("Min delta for (C,C) SPE:", delta_min, "\\n")`
    if (model === 'bayesian') return `# Bayesian: E[u] = p*M1 + (1-p)*M2, then pure Nash of E\np <- ${bayesianPrior}\nE1 <- p*matrix(c(${payoff1.flat().join(', ')}),2,2,byrow=TRUE) + (1-p)*matrix(c(${payoff1B.flat().join(', ')}),2,2,byrow=TRUE)\nE2 <- p*matrix(c(${payoff2.flat().join(', ')}),2,2,byrow=TRUE) + (1-p)*matrix(c(${payoff2B.flat().join(', ')}),2,2,byrow=TRUE)\n# Find pure Nash of (E1,E2)\\n`
    if (model === 'mpe') return `# MPE: state 0 (0,0)->0 else->1; state 1 Nash. delta_min = ${mpeRes.deltaMin.toFixed(3)}\n# State 0 payoff matrices and state 1 payoff matrices; solve for delta threshold.\\n`
    return ''
  }

  const copyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet()).then(() => alert('Copied!'))
  }

  const renderPayoffTable = (p1, p2, setCellFn, highlightNash = null) => (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border border-gray-300 p-2 bg-gray-100"></th>
          <th className="border border-gray-300 p-2 bg-gray-100">Left</th>
          <th className="border border-gray-300 p-2 bg-gray-100">Right</th>
        </tr>
      </thead>
      <tbody>
        {[0, 1].map(i => (
          <tr key={i}>
            <td className="border border-gray-300 p-2 bg-gray-100 font-medium">{ROW_LABELS[i]}</td>
            {[0, 1].map(j => {
              const isNash = highlightNash && highlightNash.some(n => n.row === i && n.col === j)
              return (
                <td key={j} className={`border border-gray-300 p-2 ${isNash ? 'bg-amber-100' : ''}`}>
                  <div className="flex gap-1 items-center justify-center">
                    <input type="number" value={p1[i][j]} onChange={e => setCellFn(1, i, j, e.target.value)} className="w-12 border rounded px-1 py-0.5 text-center text-xs" />
                    <span className="text-gray-400">,</span>
                    <input type="number" value={p2[i][j]} onChange={e => setCellFn(2, i, j, e.target.value)} className="w-12 border rounded px-1 py-0.5 text-center text-xs" />
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/profession-dashboard')} className="text-gray-600 hover:text-gray-900">← Back</button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Game Theory Lab</h1>
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
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all shadow-sm border-2 ${
                        model === m.id
                          ? `border-gray-800 bg-white shadow-md`
                          : 'border-transparent bg-white hover:border-gray-300 hover:shadow'
                      }`}
                    >
                      <span className="text-2xl">{m.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.desc}</p>
                      </div>
                      {model === m.id && (
                        <span className={`ml-2 w-2 h-2 rounded-full bg-gradient-to-r ${m.color}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            {model === '2x2-pure' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Payoff matrix</h2>
                {renderPayoffTable(payoff1, payoff2, setCellMain, nash)}
                <p className="text-xs text-gray-500 mt-2">(P1, P2). Yellow = pure Nash.</p>
                <h3 className="font-semibold text-gray-800 mt-4">Pure Nash</h3>
                {nash.length === 0 ? <p className="text-gray-600">None.</p> : (
                  <ul className="list-disc list-inside text-gray-700">{nash.map((n, k) => <li key={k}>({ROW_LABELS[n.row]}, {COL_LABELS[n.col]})</li>)}</ul>
                )}
              </>
            )}

            {model === '2x2-mixed' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Payoff matrix</h2>
                {renderPayoffTable(payoff1, payoff2, setCellMain)}
                <h3 className="font-semibold text-gray-800 mt-4">Mixed Nash</h3>
                {mixed ? <p>P1(Up) = <strong>{(mixed.p * 100).toFixed(1)}%</strong>, P2(Left) = <strong>{(mixed.q * 100).toFixed(1)}%</strong>.</p> : <p className="text-gray-600">No mixed NE in [0,1].</p>}
              </>
            )}

            {model === 'cournot' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Cournot duopoly</h2>
                <p className="text-sm text-gray-600 mb-4">P = a − b·Q, MC = c. Symmetric.</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">a</label><input type="number" value={cournotA} onChange={e => setCournotA(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">b</label><input type="number" value={cournotB} onChange={e => setCournotB(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">c</label><input type="number" value={cournotC} onChange={e => setCournotC(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {cournotRes ? <div className="bg-gray-50 rounded-lg p-3 text-sm">q* = {cournotRes.q1.toFixed(2)}, P* = {cournotRes.P.toFixed(2)}, π each = {cournotRes.pi1.toFixed(2)}</div> : <p className="text-amber-700 text-sm">Need a &gt; c, b &gt; 0.</p>}
              </>
            )}

            {model === 'bertrand' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Bertrand</h2>
                <p className="text-sm text-gray-600 mb-4">Homogeneous, MC = c. Nash: P = c.</p>
                <div className="mb-4"><label className="block text-xs text-gray-500">MC c</label><input type="number" value={bertrandC} onChange={e => setBertrandC(parseFloat(e.target.value) || 0)} className="w-32 border rounded px-2 py-1" /></div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">P* = {bertrandRes.P}, π = 0</div>
              </>
            )}

            {model === 'stackelberg' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Stackelberg</h2>
                <p className="text-sm text-gray-600 mb-4">Leader q₁, follower best responds.</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">a</label><input type="number" value={stackA} onChange={e => setStackA(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">b</label><input type="number" value={stackB} onChange={e => setStackB(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">c</label><input type="number" value={stackC} onChange={e => setStackC(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {stackRes ? <div className="bg-gray-50 rounded-lg p-3 text-sm">q₁* = {stackRes.q1.toFixed(2)}, q₂* = {stackRes.q2.toFixed(2)}, P* = {stackRes.P.toFixed(2)}</div> : <p className="text-amber-700 text-sm">Need a &gt; c, b &gt; 0.</p>}
              </>
            )}

            {model === 'repeated' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Repeated game (infinite)</h2>
                <p className="text-sm text-gray-600 mb-4">Stage game below. (Up, Left) = cooperate; grim trigger: deviate → (Down, Right) forever. Discount δ.</p>
                {renderPayoffTable(payoff1, payoff2, setCellMain)}
                <div className="mt-4"><label className="block text-xs text-gray-500">Discount δ</label><input type="number" step="0.01" min="0" max="1" value={repeatedDelta} onChange={e => setRepeatedDelta(parseFloat(e.target.value) || 0)} className="w-24 border rounded px-2 py-1" /></div>
                <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
                  <p>Min δ for (C,C) to be SPE (grim trigger): <strong>δ ≥ {repeatedRes.deltaMin.toFixed(3)}</strong></p>
                  <p className="mt-1">Your δ = {repeatedDelta}: {(repeatedDelta >= repeatedRes.deltaMin ? 'Cooperation is sustainable.' : 'Cooperation not sustainable.')}</p>
                </div>
              </>
            )}

            {model === 'bayesian' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Bayesian game</h2>
                <p className="text-sm text-gray-600 mb-4">Nature picks game A w.p. p, game B w.p. 1−p. Players know p but not the draw. Bayesian Nash = pure Nash of expected payoffs.</p>
                <div className="mb-2"><label className="block text-xs text-gray-500">Prior P(game A)</label><input type="number" step="0.01" min="0" max="1" value={bayesianPrior} onChange={e => setBayesianPrior(parseFloat(e.target.value) || 0)} className="w-24 border rounded px-2 py-1" /></div>
                <p className="text-xs font-medium text-gray-600 mt-2">Game A (P1, P2)</p>
                {renderPayoffTable(payoff1, payoff2, setCellMain)}
                <p className="text-xs font-medium text-gray-600 mt-4">Game B (P1, P2)</p>
                {renderPayoffTable(payoff1B, payoff2B, (pl, i, j, v) => setCell(pl, i, j, v, pl === 1 ? 'B1' : 'B2'))}
                <h3 className="font-semibold text-gray-800 mt-4">Bayesian Nash (pure in expected game)</h3>
                {bayesianNashList.length === 0 ? <p className="text-gray-600">None.</p> : (
                  <ul className="list-disc list-inside text-gray-700">{bayesianNashList.map((n, k) => <li key={k}>({ROW_LABELS[n.row]}, {COL_LABELS[n.col]})</li>)}</ul>
                )}
              </>
            )}

            {model === 'mpe' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">MPE (two-state)</h2>
                <p className="text-sm text-gray-600 mb-4">State 0: play below. If (Up, Left) → stay in 0; else → state 1. State 1: one-shot Nash forever. Discount δ.</p>
                <p className="text-xs font-medium text-gray-600">State 0 payoffs</p>
                {renderPayoffTable(payoff1, payoff2, setCellMain)}
                <p className="text-xs font-medium text-gray-600 mt-4">State 1 payoffs (punishment state)</p>
                {renderPayoffTable(payoff1_1, payoff2_1, (pl, i, j, v) => setCell(pl, i, j, v, pl === 1 ? 'M1' : 'M2'))}
                <div className="mt-4"><label className="block text-xs text-gray-500">Discount δ</label><input type="number" step="0.01" min="0" max="1" value={mpeDelta} onChange={e => setMpeDelta(parseFloat(e.target.value) || 0)} className="w-24 border rounded px-2 py-1" /></div>
                <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
                  <p>Min δ for (Up, Left) in state 0 to be MPE: <strong>δ ≥ {mpeRes.deltaMin.toFixed(3)}</strong></p>
                  <p className="mt-1">Your δ = {mpeDelta}: {(mpeDelta >= mpeRes.deltaMin ? 'Cooperation in state 0 is MPE.' : 'Not MPE.')}</p>
                </div>
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

export default GameTheoryLab
