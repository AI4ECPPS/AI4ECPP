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

// ========== ADVANCED MODELS ==========

// Kuhn-Tucker: max f(x,y)=xy s.t. px*x + py*y ≤ I, x≥0, y≥0
// L = xy - λ(px*x+py*y-I). FOC: y=λpx, x=λpy → x*px = y*py. Budget: 2px*x=I → x=I/(2px), y=I/(2py)
// Corner: if I/(2px) or I/(2py) negative, or when interior gives negative. For interior: x,y>0.
function kuhnTucker(px, py, I) {
  if (px <= 0 || py <= 0 || I < 0) return null
  const xInterior = I / (2 * px)
  const yInterior = I / (2 * py)
  if (xInterior <= 0 || yInterior <= 0) return null
  const lambda = yInterior / px // or xInterior/py
  const u = xInterior * yInterior
  return { x: xInterior, y: yInterior, lambda, u, corner: false }
}

// Corner solution: Perfect substitutes U = ax + by. Buy only x if a/px > b/py, only y if b/py > a/px
function cornerPerfectSubstitutes(a, b, px, py, I) {
  if (px <= 0 || py <= 0 || I < 0) return null
  const utilPerDollarX = a / px
  const utilPerDollarY = b / py
  if (utilPerDollarX > utilPerDollarY)
    return { x: I / px, y: 0, corner: 'x', u: a * (I / px) }
  if (utilPerDollarY > utilPerDollarX)
    return { x: 0, y: I / py, corner: 'y', u: b * (I / py) }
  return { x: I / px, y: 0, corner: 'any', u: a * (I / px) }
}

// Concave optimization: max f(x,y) = -(x-ax)² - (y-ay)² (unconstrained)
// FOC: -2(x-ax)=0, -2(y-ay)=0 → x*=ax, y*=ay, f*=0
function concaveOpt(ax, ay) {
  return { x: ax, y: ay, f: 0 }
}

// Pareto (2-agent exchange): Agent 1: U1=x1^α y1^(1-α), Agent 2: U2=x2^β y2^(1-β)
// Total endowment X, Y. Pareto: MRS1=MRS2. MRS1=(α/(1-α))(y1/x1), MRS2=(β/(1-β))(y2/x2)
// Contract curve: (α/(1-α))(y1/x1) = (β/(1-β))((Y-y1)/(X-x1))
// For α=β: y1/x1 = (Y-y1)/(X-x1) → y1*X = x1*Y → y1 = (Y/X)*x1
function pareto2x2(alpha, beta, X, Y, x1) {
  if (X <= 0 || Y <= 0 || x1 < 0 || x1 > X) return null
  if (alpha <= 0 || alpha >= 1 || beta <= 0 || beta >= 1) return null
  const mrs1 = (alpha / (1 - alpha))
  const mrs2 = (beta / (1 - beta))
  const x2 = X - x1
  if (x2 <= 0) return null
  const y1 = (mrs2 * x1 * (Y) / (mrs1 * x2 + mrs2 * x1))
  const y2 = Y - y1
  if (y1 < 0 || y2 < 0) return null
  const u1 = Math.pow(x1, alpha) * Math.pow(y1, 1 - alpha)
  const u2 = Math.pow(x2, beta) * Math.pow(y2, 1 - beta)
  return { x1, y1, x2, y2, u1, u2 }
}

// Expected utility: lottery (p, x1; 1-p, x2). u(x)=x^γ (CRRA), γ<1 risk averse
function expectedUtility(p, x1, x2, gamma) {
  if (p < 0 || p > 1 || x1 < 0 || x2 < 0) return null
  if (gamma <= 0) return null
  const u = (w) => gamma === 1 ? Math.log(Math.max(w, 0.001)) : Math.pow(w, gamma)
  const EU = p * u(x1) + (1 - p) * u(x2)
  const Ex = p * x1 + (1 - p) * x2
  return { EU, Ex, uType: gamma === 1 ? 'log' : `CRRA γ=${gamma}` }
}

// Risk aversion: CE such that u(CE)=EU. Risk premium RP = E[x] - CE
function riskAversion(p, x1, x2, gamma) {
  const euRes = expectedUtility(p, x1, x2, gamma)
  if (!euRes) return null
  const { EU, Ex } = euRes
  const u = (w) => gamma === 1 ? Math.log(Math.max(w, 0.001)) : Math.pow(w, gamma)
  const invU = (uVal) => gamma === 1 ? Math.exp(uVal) : Math.pow(Math.max(uVal, 0), 1 / gamma)
  const CE = invU(EU)
  const RP = Ex - CE
  const riskAverse = RP > 0
  return { ...euRes, CE, RP, riskAverse }
}

// CES utility: U = (α·x^ρ + β·y^ρ)^(1/ρ), σ=1/(1-ρ) elasticity of substitution
// MRS = (α/β)(y/x)^(1-ρ). Budget: px*x+py*y=I. FOC: MRS = px/py
function cesUtility(alpha, beta, rho, px, py, I) {
  if (px <= 0 || py <= 0 || I < 0 || alpha <= 0 || beta <= 0) return null
  if (rho >= 1) return null
  const sigma = 1 / (1 - rho)
  const t = 1 / (rho - 1)
  const x = I / (px + py * Math.pow((beta * px) / (alpha * py), t))
  const y = (I - px * x) / py
  if (x < 0 || y < 0) return null
  const U = Math.pow(alpha * Math.pow(x, rho) + beta * Math.pow(y, rho), 1 / rho)
  return { x, y, U, sigma }
}

// Slutsky: Total = Substitution + Income. For Cobb-Douglas x*=αI/px: dx/dpx = -αI/px², dx/dI = α/px
// Total effect: dx/dpx = (∂x/∂px)|u - x(∂x/∂I) = Sub - Income. Sub = Total + x*(α/px)
function slutsky(alpha, beta, I, px, py, dpx) {
  if (px <= 0 || py <= 0 || I < 0 || alpha <= 0 || beta <= 0) return null
  const sum = alpha + beta
  const x0 = (alpha * I) / (sum * px)
  const pxNew = px + dpx
  const x1 = (alpha * I) / (sum * pxNew)
  const totalEffect = x1 - x0
  const incomeEffect = -x0 * (alpha / (sum * px)) * dpx
  const subEffect = totalEffect - incomeEffect
  return { x0, x1, totalEffect, incomeEffect, subEffect }
}

// Negative externality + Pigouvian tax: MSC = MPC + MEC, MEC = e (constant)
// Market eq (private): Q*, P*. Social optimum: MB = MSC → Q_opt
// Pigouvian tax t* = MEC = e internalizes externality
function pigouvian(a, b, c, d, e) {
  if (b + d <= 0 || e < 0) return null
  const market = computeEquilibrium(a, b, c, d)
  if (!market || market.Q <= 0) return null
  const { P: PStar, Q: QStar } = market
  const Qopt = (a * d + b * c - b * d * e) / (b + d)
  if (Qopt < 0) return null
  const Popt = (a - Qopt) / b
  const PsOpt = (Qopt - c) / d
  const taxRev = e * Qopt
  const DWL = 0.5 * (QStar - Qopt) * e
  return { QStar, PStar, Qopt, Popt, PsOpt, tax: e, taxRev, DWL, MEC: e }
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
      { id: 'pigouvian', name: 'Externality + Pigouvian Tax', desc: 'Negative externality, 负外部性, optimal tax', icon: '🌫', color: 'from-amber-600 to-orange-600' },
    ],
  },
  {
    title: 'Consumer & Producer',
    items: [
      { id: 'cobb-douglas', name: 'Cobb-Douglas', desc: 'Utility max, optimal bundle', icon: '🧾', color: 'from-lime-500 to-green-500' },
      { id: 'cost', name: 'Cost & Supply', desc: 'Quadratic cost, MC, profit max', icon: '🏭', color: 'from-cyan-500 to-blue-500' },
      { id: 'ces', name: 'CES Utility', desc: 'Elasticity of substitution σ', icon: '🔀', color: 'from-teal-500 to-cyan-500' },
      { id: 'slutsky', name: 'Slutsky Decomposition', desc: 'Substitution + Income effect', icon: '📊', color: 'from-indigo-500 to-violet-500' },
    ],
  },
  {
    title: 'Optimization & Constraints',
    items: [
      { id: 'kuhn-tucker', name: 'Kuhn-Tucker', desc: 'Inequality constraints, Lagrangian', icon: '∇', color: 'from-amber-500 to-yellow-500' },
      { id: 'corner', name: 'Corner Solution', desc: 'Perfect substitutes, 角点解', icon: '◻', color: 'from-orange-500 to-red-500' },
      { id: 'concave', name: 'Concave Optimization', desc: 'Unconstrained max, FOC', icon: '∩', color: 'from-slate-500 to-gray-600' },
    ],
  },
  {
    title: 'Welfare & Risk',
    items: [
      { id: 'pareto', name: 'Pareto Optimality', desc: 'Contract curve, 帕累托', icon: '⇄', color: 'from-fuchsia-500 to-pink-500' },
      { id: 'expected-utility', name: 'Expected Utility', desc: 'Lottery, EU calculation', icon: '🎲', color: 'from-violet-500 to-purple-600' },
      { id: 'risk-aversion', name: 'Risk Aversion', desc: 'CE, Risk premium', icon: '⚠', color: 'from-red-500 to-rose-600' },
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

  // Advanced models state
  const [ktPx, setKtPx] = useState(2)
  const [ktPy, setKtPy] = useState(4)
  const [ktI, setKtI] = useState(100)
  const [cornerA, setCornerA] = useState(2)
  const [cornerB, setCornerB] = useState(1)
  const [cornerPx, setCornerPx] = useState(1)
  const [cornerPy, setCornerPy] = useState(2)
  const [cornerI, setCornerI] = useState(100)
  const [concaveAx, setConcaveAx] = useState(5)
  const [concaveAy, setConcaveAy] = useState(3)
  const [paretoAlpha, setParetoAlpha] = useState(0.5)
  const [paretoBeta, setParetoBeta] = useState(0.5)
  const [paretoX, setParetoX] = useState(10)
  const [paretoY, setParetoY] = useState(10)
  const [paretoX1, setParetoX1] = useState(5)
  const [euP, setEuP] = useState(0.5)
  const [euX1, setEuX1] = useState(100)
  const [euX2, setEuX2] = useState(0)
  const [euGamma, setEuGamma] = useState(0.5)
  const [cesAlpha, setCesAlpha] = useState(0.5)
  const [cesBeta, setCesBeta] = useState(0.5)
  const [cesRho, setCesRho] = useState(0.5)
  const [cesPx, setCesPx] = useState(2)
  const [cesPy, setCesPy] = useState(4)
  const [cesI, setCesI] = useState(100)
  const [slutAlpha, setSlutAlpha] = useState(0.5)
  const [slutBeta, setSlutBeta] = useState(0.5)
  const [slutI, setSlutI] = useState(100)
  const [slutPx, setSlutPx] = useState(2)
  const [slutPy, setSlutPy] = useState(4)
  const [slutDpx, setSlutDpx] = useState(1)
  const [extMEC, setExtMEC] = useState(5)

  const eq = computeEquilibrium(a, b, c, d)
  const elast = elasticity(a, b, c, d)
  const mono = monopoly(monoA, monoB, monoC)
  const taxRes = tax(a, b, c, d, taxRate)
  const cd = cobbDouglas(cdAlpha, cdBeta, cdI, cdPx, cdPy)
  const costRes = costQuadratic(costF, costV, costK, costP)
  const ceilingRes = priceCeiling(a, b, c, d, Pceil)
  const ktRes = kuhnTucker(ktPx, ktPy, ktI)
  const cornerRes = cornerPerfectSubstitutes(cornerA, cornerB, cornerPx, cornerPy, cornerI)
  const concaveRes = concaveOpt(concaveAx, concaveAy)
  const paretoRes = pareto2x2(paretoAlpha, paretoBeta, paretoX, paretoY, paretoX1)
  const euRes = expectedUtility(euP, euX1, euX2, euGamma)
  const riskRes = riskAversion(euP, euX1, euX2, euGamma)
  const cesRes = cesUtility(cesAlpha, cesBeta, cesRho, cesPx, cesPy, cesI)
  const slutskyRes = slutsky(slutAlpha, slutBeta, slutI, slutPx, slutPy, slutDpx)
  const pigouvianRes = pigouvian(a, b, c, d, extMEC)

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
    if (model === 'kuhn-tucker') return `# Kuhn-Tucker: max xy s.t. px*x+py*y<=I\npx<-${ktPx}; py<-${ktPy}; I<-${ktI}\nx <- I/(2*px); y <- I/(2*py)\ncat("x* =", x, " y* =", y, "\\n")`
    if (model === 'corner') return `# Corner: U = ax + by (perfect substitutes)\nif (${cornerA}/${cornerPx} > ${cornerB}/${cornerPy}) { x <- ${cornerI}/${cornerPx}; y <- 0 }\nelse { x <- 0; y <- ${cornerI}/${cornerPy} }\ncat("x =", x, " y =", y, "\\n")`
    if (model === 'concave') return `# Concave max f = -(x-ax)^2 - (y-ay)^2\nx <- ${concaveAx}; y <- ${concaveAy}\ncat("x* =", x, " y* =", y, " f* = 0\\n")`
    if (model === 'pareto') return `# Pareto: MRS1 = MRS2 on contract curve\ny1 <- (beta/alpha * x1/(X-x1) * (Y-y1) + ... ) # solve numerically`
    if (model === 'expected-utility') return `# EU = p*u(x1) + (1-p)*u(x2), u(x)=x^gamma\np <- ${euP}; x1 <- ${euX1}; x2 <- ${euX2}; g <- ${euGamma}\nu <- function(x) x^g\nEU <- p*u(x1) + (1-p)*u(x2)\ncat("EU =", EU, "\\n")`
    if (model === 'risk-aversion') return `# CE: u(CE)=EU; Risk premium = E[x]-CE\np <- ${euP}; x1 <- ${euX1}; x2 <- ${euX2}; g <- ${euGamma}\nEU <- p*x1^g + (1-p)*x2^g\nCE <- EU^(1/g)\nEx <- p*x1 + (1-p)*x2\ncat("CE =", CE, " RP =", Ex - CE, "\\n")`
    if (model === 'ces') return `# CES: U = (a*x^rho + b*y^rho)^(1/rho)\nt <- 1/(${cesRho}-1)\nx <- ${cesI}/(${cesPx}+${cesPy}*((${cesBeta}*${cesPx})/(${cesAlpha}*${cesPy}))^t)\ncat("x* =", x, " y* =", (${cesI}-${cesPx}*x)/${cesPy}, "\\n")`
    if (model === 'slutsky') return `# Slutsky: Total = Substitution + Income\ndx_total <- x_new - x_old\ndx_income <- -x_old * (alpha/(alpha+beta)) * (1/px) * dpx\ndx_sub <- dx_total - dx_income`
    if (model === 'pigouvian') return `# Negative externality + Pigouvian tax\na<-${a}; b<-${b}; c<-${c}; d<-${d}; e<-${extMEC}\nP_star <- (a-c)/(b+d)\nQ_star <- a - b*P_star\nQ_opt <- (a*d + b*c - b*d*e)/(b+d)\ntax <- e  # Pigouvian tax = MEC\ncat("Q* =", Q_star, " Q_opt =", Q_opt, " Pigouvian tax =", tax, "\\n")`
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

            {model === 'pigouvian' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">负外部性 + Pigouvian 税</h2>
                <p className="text-sm text-gray-600 mb-4">MSC = MPC + MEC. 市场均衡过度生产，Pigouvian 税 t* = MEC 使产量降至社会最优 Q<sub>opt</sub>.</p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div><label className="block text-xs text-gray-500">a</label><input type="number" value={a} onChange={e => setA(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">b</label><input type="number" value={b} onChange={e => setB(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">c</label><input type="number" value={c} onChange={e => setC(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">d</label><input type="number" value={d} onChange={e => setD(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                <div className="mb-4"><label className="block text-xs text-gray-500">MEC (边际外部成本)</label><input type="number" value={extMEC} onChange={e => setExtMEC(parseFloat(e.target.value) || 0)} className="w-24 border rounded px-2 py-1" /></div>
                {pigouvianRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>市场均衡: Q* = <strong>{pigouvianRes.QStar.toFixed(2)}</strong>, P* = <strong>{pigouvianRes.PStar.toFixed(2)}</strong></p>
                    <p>社会最优: Q<sub>opt</sub> = <strong>{pigouvianRes.Qopt.toFixed(2)}</strong>, P<sub>d</sub> = <strong>{pigouvianRes.Popt.toFixed(2)}</strong></p>
                    <p>Pigouvian 税 t* = <strong>{pigouvianRes.tax.toFixed(2)}</strong>, 税收 = <strong>{pigouvianRes.taxRev.toFixed(2)}</strong></p>
                    <p>无税时 DWL = <strong>{pigouvianRes.DWL.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need b,d&gt;0, a&gt;c, MEC≥0, Q<sub>opt</sub>≥0.</p>
                )}
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

            {/* Kuhn-Tucker */}
            {model === 'kuhn-tucker' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Kuhn-Tucker</h2>
                <p className="text-sm text-gray-600 mb-4">max xy s.t. p<sub>x</sub>x + p<sub>y</sub>y ≤ I, x,y ≥ 0. Lagrangian FOC.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">p<sub>x</sub>, p<sub>y</sub></label><div className="flex gap-2"><input type="number" value={ktPx} onChange={e => setKtPx(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" value={ktPy} onChange={e => setKtPy(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">I</label><input type="number" value={ktI} onChange={e => setKtI(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {ktRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>x* = <strong>{ktRes.x.toFixed(2)}</strong>, y* = <strong>{ktRes.y.toFixed(2)}</strong></p>
                    <p>λ = <strong>{ktRes.lambda.toFixed(2)}</strong>, U = <strong>{ktRes.u.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need p<sub>x</sub>, p<sub>y</sub> &gt; 0, I ≥ 0.</p>
                )}
              </>
            )}

            {/* Corner solution */}
            {model === 'corner' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Corner Solution 角点解</h2>
                <p className="text-sm text-gray-600 mb-4">Perfect substitutes U = ax + by. Buy only x or only y if marginal utility per dollar differs.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">a, b (coefficients)</label><div className="flex gap-2"><input type="number" value={cornerA} onChange={e => setCornerA(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" value={cornerB} onChange={e => setCornerB(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">p<sub>x</sub>, p<sub>y</sub></label><div className="flex gap-2"><input type="number" value={cornerPx} onChange={e => setCornerPx(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" value={cornerPy} onChange={e => setCornerPy(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">I</label><input type="number" value={cornerI} onChange={e => setCornerI(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {cornerRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>x* = <strong>{cornerRes.x.toFixed(2)}</strong>, y* = <strong>{cornerRes.y.toFixed(2)}</strong></p>
                    <p>Corner at <strong>{cornerRes.corner === 'x' ? 'x (buy only good x)' : cornerRes.corner === 'y' ? 'y (buy only good y)' : 'any'}</strong>, U = <strong>{cornerRes.u.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need p<sub>x</sub>, p<sub>y</sub> &gt; 0, I ≥ 0.</p>
                )}
              </>
            )}

            {/* Concave optimization */}
            {model === 'concave' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Concave Optimization</h2>
                <p className="text-sm text-gray-600 mb-4">max f(x,y) = −(x−a<sub>x</sub>)² − (y−a<sub>y</sub>)². Unconstrained, FOC: x*=a<sub>x</sub>, y*=a<sub>y</sub>.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">a<sub>x</sub></label><input type="number" value={concaveAx} onChange={e => setConcaveAx(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">a<sub>y</sub></label><input type="number" value={concaveAy} onChange={e => setConcaveAy(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {concaveRes && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p>x* = <strong>{concaveRes.x}</strong>, y* = <strong>{concaveRes.y}</strong>, f* = <strong>{concaveRes.f}</strong></p>
                  </div>
                )}
              </>
            )}

            {/* Pareto */}
            {model === 'pareto' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Pareto Optimality 帕累托</h2>
                <p className="text-sm text-gray-600 mb-4">2-agent exchange: U<sub>1</sub>=x<sub>1</sub><sup>α</sup>y<sub>1</sub><sup>1−α</sup>, U<sub>2</sub>=x<sub>2</sub><sup>β</sup>y<sub>2</sub><sup>1−β</sup>. Contract curve: MRS<sub>1</sub>=MRS<sub>2</sub>.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">α, β</label><div className="flex gap-2"><input type="number" step="0.1" value={paretoAlpha} onChange={e => setParetoAlpha(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" step="0.1" value={paretoBeta} onChange={e => setParetoBeta(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">Total X, Y</label><div className="flex gap-2"><input type="number" value={paretoX} onChange={e => setParetoX(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" value={paretoY} onChange={e => setParetoY(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">x<sub>1</sub> (agent 1&apos;s x)</label><input type="number" value={paretoX1} onChange={e => setParetoX1(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {paretoRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>Agent 1: (x<sub>1</sub>, y<sub>1</sub>) = (<strong>{paretoRes.x1.toFixed(2)}</strong>, <strong>{paretoRes.y1.toFixed(2)}</strong>), U<sub>1</sub> = <strong>{paretoRes.u1.toFixed(2)}</strong></p>
                    <p>Agent 2: (x<sub>2</sub>, y<sub>2</sub>) = (<strong>{paretoRes.x2.toFixed(2)}</strong>, <strong>{paretoRes.y2.toFixed(2)}</strong>), U<sub>2</sub> = <strong>{paretoRes.u2.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need 0&lt;α,β&lt;1, X,Y&gt;0, 0≤x<sub>1</sub>≤X.</p>
                )}
              </>
            )}

            {/* Expected utility */}
            {model === 'expected-utility' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Expected Utility</h2>
                <p className="text-sm text-gray-600 mb-4">Lottery: (p, x<sub>1</sub>; 1−p, x<sub>2</sub>). u(x)=x<sup>γ</sup> (CRRA). EU = p·u(x<sub>1</sub>) + (1−p)·u(x<sub>2</sub>).</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">p (prob of x1)</label><input type="number" step="0.1" value={euP} onChange={e => setEuP(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">x<sub>1</sub>, x<sub>2</sub></label><div className="flex gap-2"><input type="number" value={euX1} onChange={e => setEuX1(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" value={euX2} onChange={e => setEuX2(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">γ (CRRA, &lt;1 risk averse)</label><input type="number" step="0.1" value={euGamma} onChange={e => setEuGamma(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {euRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>EU = <strong>{euRes.EU.toFixed(4)}</strong>, E[x] = <strong>{euRes.Ex.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need 0≤p≤1, x<sub>1</sub>,x<sub>2</sub>≥0, γ&gt;0.</p>
                )}
              </>
            )}

            {/* Risk aversion */}
            {model === 'risk-aversion' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Risk Aversion</h2>
                <p className="text-sm text-gray-600 mb-4">Certainty equivalent CE: u(CE)=EU. Risk premium RP = E[x] − CE. RP&gt;0 ⇒ risk averse.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">p, x<sub>1</sub>, x<sub>2</sub></label><div className="flex gap-2"><input type="number" step="0.1" value={euP} onChange={e => setEuP(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /><input type="number" value={euX1} onChange={e => setEuX1(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /><input type="number" value={euX2} onChange={e => setEuX2(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">γ</label><input type="number" step="0.1" value={euGamma} onChange={e => setEuGamma(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {riskRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>EU = <strong>{riskRes.EU.toFixed(4)}</strong>, E[x] = <strong>{riskRes.Ex.toFixed(2)}</strong></p>
                    <p>CE = <strong>{riskRes.CE.toFixed(2)}</strong>, RP = <strong>{riskRes.RP.toFixed(2)}</strong></p>
                    <p>{riskRes.riskAverse ? 'Risk averse (RP &gt; 0)' : 'Risk loving or neutral'}</p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need valid parameters.</p>
                )}
              </>
            )}

            {/* CES */}
            {model === 'ces' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">CES Utility</h2>
                <p className="text-sm text-gray-600 mb-4">U = (αx<sup>ρ</sup> + βy<sup>ρ</sup>)<sup>1/ρ</sup>, σ = 1/(1−ρ) elasticity of substitution.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">α, β</label><div className="flex gap-2"><input type="number" step="0.1" value={cesAlpha} onChange={e => setCesAlpha(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" step="0.1" value={cesBeta} onChange={e => setCesBeta(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">ρ (&lt;1, ρ→0 → Cobb-Douglas)</label><input type="number" step="0.1" value={cesRho} onChange={e => setCesRho(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                  <div><label className="block text-xs text-gray-500">p<sub>x</sub>, p<sub>y</sub>, I</label><div className="flex gap-2"><input type="number" value={cesPx} onChange={e => setCesPx(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /><input type="number" value={cesPy} onChange={e => setCesPy(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /><input type="number" value={cesI} onChange={e => setCesI(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /></div></div>
                </div>
                {cesRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>x* = <strong>{cesRes.x.toFixed(2)}</strong>, y* = <strong>{cesRes.y.toFixed(2)}</strong></p>
                    <p>U = <strong>{cesRes.U.toFixed(2)}</strong>, σ = <strong>{cesRes.sigma.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need ρ&lt;1, α,β,p<sub>x</sub>,p<sub>y</sub>,I&gt;0.</p>
                )}
              </>
            )}

            {/* Slutsky */}
            {model === 'slutsky' && (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Slutsky Decomposition</h2>
                <p className="text-sm text-gray-600 mb-4">Cobb-Douglas x* = αI/[(α+β)p<sub>x</sub>]. Price change: Total = Substitution + Income effect.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="block text-xs text-gray-500">α, β</label><div className="flex gap-2"><input type="number" step="0.1" value={slutAlpha} onChange={e => setSlutAlpha(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /><input type="number" step="0.1" value={slutBeta} onChange={e => setSlutBeta(parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">I, p<sub>x</sub>, p<sub>y</sub></label><div className="flex gap-2"><input type="number" value={slutI} onChange={e => setSlutI(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /><input type="number" value={slutPx} onChange={e => setSlutPx(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /><input type="number" value={slutPy} onChange={e => setSlutPy(parseFloat(e.target.value) || 0)} className="w-16 border rounded px-2 py-1" /></div></div>
                  <div><label className="block text-xs text-gray-500">Δp<sub>x</sub></label><input type="number" value={slutDpx} onChange={e => setSlutDpx(parseFloat(e.target.value) || 0)} className="w-full border rounded px-2 py-1" /></div>
                </div>
                {slutskyRes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <p>x<sub>0</sub> = <strong>{slutskyRes.x0.toFixed(2)}</strong>, x<sub>1</sub> = <strong>{slutskyRes.x1.toFixed(2)}</strong></p>
                    <p>Total effect = <strong>{slutskyRes.totalEffect.toFixed(2)}</strong></p>
                    <p>Substitution effect = <strong>{slutskyRes.subEffect.toFixed(2)}</strong>, Income effect = <strong>{slutskyRes.incomeEffect.toFixed(2)}</strong></p>
                  </div>
                ) : (
                  <p className="text-amber-700 text-sm">Need valid parameters.</p>
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
