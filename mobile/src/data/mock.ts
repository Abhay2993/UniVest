import {
  ActivityItem,
  AuctionWindowData,
  ExitedPosition,
  PortfolioPosition,
  ScienceSignal,
  Startup,
  SyndicateInfo,
  TaxDocument,
  University,
  Vertical,
} from '../types';

export const VERTICALS: Vertical[] = [
  'Fusion Energy',
  'Quantum Computing',
  'MedTech',
  'AI & Robotics',
  'Advanced Materials',
  'Climate Tech',
  'Semiconductors',
];

const mit: University = { id: 'u1', name: 'Massachusetts Institute of Technology', shortName: 'MIT', country: 'USA', city: 'Cambridge', latitude: 42.3601, longitude: -71.0942, activeDeals: 4 };
const eth: University = { id: 'u2', name: 'ETH Zürich', shortName: 'ETH', country: 'CHE', city: 'Zürich', latitude: 47.3763, longitude: 8.5481, activeDeals: 3 };
const oxford: University = { id: 'u3', name: 'University of Oxford', shortName: 'Oxford', country: 'GBR', city: 'Oxford', latitude: 51.7548, longitude: -1.2544, activeDeals: 2 };
const tudelft: University = { id: 'u4', name: 'TU Delft', shortName: 'TU Delft', country: 'NLD', city: 'Delft', latitude: 52.0022, longitude: 4.3736, activeDeals: 2 };
const kaist: University = { id: 'u5', name: 'KAIST', shortName: 'KAIST', country: 'KOR', city: 'Daejeon', latitude: 36.3721, longitude: 127.3604, activeDeals: 1 };
// Global expansion — premier universities in the regimes the compliance engine
// already supports (Canada, Singapore, Australia).
const toronto: University = { id: 'u6', name: 'University of Toronto', shortName: 'Toronto', country: 'CAN', city: 'Toronto', latitude: 43.6629, longitude: -79.3957, activeDeals: 1 };
const waterloo: University = { id: 'u7', name: 'University of Waterloo', shortName: 'Waterloo', country: 'CAN', city: 'Waterloo', latitude: 43.4723, longitude: -80.5449, activeDeals: 1 };
const nus: University = { id: 'u8', name: 'National University of Singapore', shortName: 'NUS', country: 'SGP', city: 'Singapore', latitude: 1.2966, longitude: 103.7764, activeDeals: 1 };
const ntu: University = { id: 'u9', name: 'Nanyang Technological University', shortName: 'NTU', country: 'SGP', city: 'Singapore', latitude: 1.3483, longitude: 103.6831, activeDeals: 1 };
const melbourne: University = { id: 'u10', name: 'University of Melbourne', shortName: 'Melbourne', country: 'AUS', city: 'Melbourne', latitude: -37.7964, longitude: 144.9612, activeDeals: 1 };
const unsw: University = { id: 'u11', name: 'UNSW Sydney', shortName: 'UNSW', country: 'AUS', city: 'Sydney', latitude: -33.9173, longitude: 151.2313, activeDeals: 1 };

export const UNIVERSITIES: University[] = [
  mit, eth, oxford, tudelft, kaist,
  toronto, waterloo, nus, ntu, melbourne, unsw,
];

export const STARTUPS: Startup[] = [
  {
    id: 's1',
    name: 'Helion Dynamics',
    university: mit,
    vertical: 'Fusion Energy',
    tagline: 'Compact stellarator magnets for grid-scale fusion.',
    verified: true,
    targetAmount: 2_500_000,
    raisedAmount: 1_870_000,
    investorCount: 1_243,
    minInvestment: 100,
    daysLeft: 18,
    leadInvestor: 'The Engine Ventures',
    pitch: {
      plainEnglish:
        'Fusion is how the sun makes energy. To copy it on Earth you need magnets strong enough to bottle a star. Helion Dynamics builds those magnets — smaller, colder, and far cheaper than anything before.',
      commercialization:
        'Every fusion pilot plant announced for 2028–2032 needs high-temperature superconducting magnets. Helion sells the picks and shovels of the fusion gold rush, with two paid pilot contracts already signed.',
      labProof:
        'A 21-tesla field sustained for 48 hours in a rare-earth-free HTS coil — peer-reviewed in Nature Energy (2025) and independently replicated by the PSFC.',
    },
    milestones: [
      {
        id: 'm1', title: 'Lab-Scale Coil Demonstration', description: '5T sustained field in benchtop prototype, validated by MIT PSFC.', status: 'completed', date: '2025-06-12', hasVideoUpdate: true,
        attestation: { verifierName: 'Prof. D. Vasquez', verifierOrg: 'MIT Plasma Science & Fusion Center', role: 'independent_reviewer', signedAt: '2025-06-18', keyFingerprint: '4C7F·A2D9' },
      },
      {
        id: 'm2', title: 'Prototype Validation', description: '21T full-scale coil, 48-hour continuous operation at 20 K.', status: 'completed', date: '2026-01-30', hasVideoUpdate: true,
        attestation: { verifierName: 'K. Brennan', verifierOrg: 'MIT Technology Licensing Office', role: 'tto', signedAt: '2026-02-04', keyFingerprint: '8F3A·22C1' },
      },
      { id: 'm3', title: 'Pilot Manufacturing Line', description: 'First 10 production coils delivered to two fusion pilot-plant customers.', status: 'in_progress', date: '2026-11-15' },
      { id: 'm4', title: 'Utility-Scale Order Book', description: 'Framework supply agreements covering 3 announced pilot plants.', status: 'upcoming', date: '2027-06-01' },
      { id: 'm5', title: 'Series B / Exit Window', description: 'Institutional round or strategic acquisition; SPV liquidity event.', status: 'upcoming', date: '2028-03-01' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'M. Okafor', role: 'investor', date: '2026-06-28', upvotes: 41,
        body: 'What keeps the coil superconducting if the cryoplant loses power mid-operation?',
        answers: [
          { id: 'a1', authorName: 'Dr. Sofia Reyes · CTO', role: 'founder', date: '2026-06-29', body: 'The coil quenches safely by design: a copper stabilizer matrix absorbs the stored energy while dump resistors shed the field in under two seconds. We ran three controlled quenches during the 48-hour validation — full data is in the technical annex.' },
        ],
      },
      {
        id: 'q2', authorName: 'J. Lindqvist', role: 'investor', date: '2026-07-02', upvotes: 27,
        body: 'Your rare-earth-free claim — does that cover the tape substrate too, or only the superconductor layer?',
        answers: [
          { id: 'a1', authorName: 'Dr. Sofia Reyes · CTO', role: 'founder', date: '2026-07-02', body: 'Both. The substrate is a hastelloy variant and the buffer stack uses no rare-earth oxides — that is the core of the cost advantage.' },
          { id: 'a2', authorName: 'K. Brennan · MIT TLO', role: 'tto', date: '2026-07-03', body: 'Confirming from the licensing side: the substrate patent family is included in the exclusive license held by the company, with the university equity position per the standardized USIT terms.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'Exclusive License Agreement', section: '§2.1 Field of Use', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'MIT grants the company an exclusive, worldwide, royalty-bearing license to the 11-patent HTS coil family (incl. the substrate and buffer-stack claims) for all energy applications. The university holds 12% equity under USIT terms; the license survives change of control.' },
      { id: 'd2', docTitle: 'Market & Competition Memo', section: '§3 Competitive Landscape', keywords: ['competitor', 'competitors', 'competition', 'market', 'rivals'], text: 'Direct competitors are Commonwealth-adjacent magnet suppliers and two Japanese tape manufacturers; both depend on rare-earth REBCO tape. Helion\'s rare-earth-free process undercuts tape cost by ~60%, and no competitor has demonstrated >15T without rare-earth materials.' },
      { id: 'd3', docTitle: 'Financial Model v7', section: '§5 Use of Funds & Runway', keywords: ['runway', 'burn', 'cash', 'funds', 'financials', 'revenue'], text: 'The $2.5M raise extends runway to 22 months at a $95K/month burn, funding the 10-coil pilot line. Two signed pilot contracts contribute $1.4M of milestone revenue across 2026–27; break-even is modeled at 30 production coils/year.' },
    ],
  },
  {
    id: 's2',
    name: 'Qubit Foundry',
    university: eth,
    vertical: 'Quantum Computing',
    tagline: 'Error-corrected logical qubits on photonic chips.',
    verified: true,
    targetAmount: 1_800_000,
    raisedAmount: 940_000,
    investorCount: 687,
    minInvestment: 250,
    daysLeft: 32,
    leadInvestor: 'ETH Foundry Fund',
    pitch: {
      plainEnglish:
        'Quantum computers today make too many mistakes to be useful. Qubit Foundry prints light-based quantum chips that catch and fix their own errors — like spell-check for quantum math.',
      commercialization:
        'Licenses chip designs to the three largest quantum cloud providers on a per-wafer royalty. First royalty agreement signed with a top-3 provider in Q1 2026.',
      labProof:
        'Demonstrated a logical qubit with error rate 100× below the physical baseline on a CMOS-compatible photonic process — published in Science (2025).',
    },
    milestones: [
      {
        id: 'm1', title: 'Logical Qubit Demo', description: 'Error-corrected logical qubit on photonic test chip.', status: 'completed', date: '2025-09-02', hasVideoUpdate: true,
        attestation: { verifierName: 'Dr. L. Baumann', verifierOrg: 'ETH transfer — ETH Zürich', role: 'tto', signedAt: '2025-09-09', keyFingerprint: '1B9E·77F0' },
      },
      { id: 'm2', title: 'Foundry Process Transfer', description: 'Design kit ported to a commercial 300mm CMOS line.', status: 'in_progress', date: '2026-10-01' },
      { id: 'm3', title: 'First Royalty Silicon', description: 'Customer wafers taped out under royalty agreement.', status: 'upcoming', date: '2027-02-15' },
      { id: 'm4', title: '64-Logical-Qubit Module', description: 'Rack-mounted module for quantum cloud deployment.', status: 'upcoming', date: '2027-12-01' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'A. Fernandes', role: 'investor', date: '2026-06-20', upvotes: 33,
        body: 'How does the logical error rate scale when you go from one logical qubit to a 64-qubit module?',
        answers: [
          { id: 'a1', authorName: 'Prof. N. Keller · Co-founder', role: 'founder', date: '2026-06-21', body: 'The code distance is fixed per tile, so error rates stay flat as tiles are added — the challenge is photon routing loss between tiles, which our interposer keeps below 0.2 dB per hop. Scaling data from the 4-tile testbed ships with the next milestone update.' },
        ],
      },
      {
        id: 'q2', authorName: 'T. Nakamura', role: 'investor', date: '2026-07-05', upvotes: 18,
        body: 'Is the process genuinely portable to a commercial 300mm fab, or is it tied to the university research line?',
        answers: [
          { id: 'a1', authorName: 'Prof. N. Keller · Co-founder', role: 'founder', date: '2026-07-06', body: 'Portable — that is exactly what the current milestone proves. The design kit uses only standard-cell photonic components qualified on the partner fab\'s process; no research-line steps remain.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'IP & License Summary', section: '§1 Patent Estate', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'Seven patent families covering the error-correction lattice and photonic interposer, ETH-owned and exclusively licensed. Royalty structure: per-wafer fee on customer silicon; ETH equity at 10% under the standardized template.' },
      { id: 'd2', docTitle: 'Market & Competition Memo', section: '§2 Landscape', keywords: ['competitor', 'competitors', 'competition', 'market', 'rivals'], text: 'Superconducting-qubit incumbents require dilution refrigerators; trapped-ion players scale slowly. Qubit Foundry is the only photonic error-corrected design that is CMOS-fab portable — the royalty model competes with no one\'s capex.' },
      { id: 'd3', docTitle: 'Financial Model v4', section: '§4 Runway', keywords: ['runway', 'burn', 'cash', 'funds', 'financials', 'revenue'], text: 'The $1.8M raise funds 20 months at $88K/month, through foundry process transfer and first royalty silicon. The signed top-3 provider agreement carries a $0.9M minimum royalty commitment in year one of production.' },
    ],
  },
  {
    id: 's3',
    name: 'Vasca Bio',
    university: oxford,
    vertical: 'MedTech',
    tagline: 'Bio-resorbable stents grown from patient cells.',
    verified: true,
    targetAmount: 3_200_000,
    raisedAmount: 2_980_000,
    investorCount: 2_011,
    minInvestment: 100,
    daysLeft: 6,
    leadInvestor: 'Oxford Science Enterprises',
    pitch: {
      plainEnglish:
        'Metal stents prop open blocked arteries but stay in the body forever and cause problems. Vasca grows a scaffold from the patient\'s own cells that does the job, then safely dissolves.',
      commercialization:
        'The coronary stent market exceeds $9B annually. Vasca targets premium PCI centres first, with reimbursement pathways mapped in the UK and Germany.',
      labProof:
        'Six-month large-animal trials showed full endothelialisation and zero thrombosis events across 40 implants — Lancet pre-print, Phase I human trial approved.',
    },
    milestones: [
      {
        id: 'm1', title: 'Pre-Clinical Trials', description: '40-implant large-animal study, zero adverse events.', status: 'completed', date: '2025-04-20', hasVideoUpdate: true,
        attestation: { verifierName: 'Prof. A. Rahman', verifierOrg: 'Independent Review Panel — Royal Society', role: 'independent_reviewer', signedAt: '2025-04-28', keyFingerprint: 'D24A·0C55' },
      },
      {
        id: 'm2', title: 'Regulatory Clearance (Phase I)', description: 'MHRA approval for first-in-human trial.', status: 'completed', date: '2026-02-14',
        attestation: { verifierName: 'S. Clarke', verifierOrg: 'Oxford University Innovation', role: 'tto', signedAt: '2026-02-20', keyFingerprint: '66E1·B3A7' },
      },
      { id: 'm3', title: 'Phase I Trials', description: '12-patient safety cohort at John Radcliffe Hospital.', status: 'in_progress', date: '2026-12-20' },
      { id: 'm4', title: 'Phase II Multi-Centre', description: '120 patients across UK and German centres.', status: 'upcoming', date: '2027-09-30' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'R. Delacroix', role: 'investor', date: '2026-06-15', upvotes: 52,
        body: 'What happens if the scaffold resorbs faster than the artery wall remodels?',
        answers: [
          { id: 'a1', authorName: 'Dr. E. Osei · Founder & CMO', role: 'founder', date: '2026-06-16', body: 'Resorption is staged: the load-bearing lattice holds full radial strength for 90 days and only then begins to hydrolyse, tracking the remodelling curve we measured pre-clinically. No early-resorption events were observed across the 40-implant study.' },
        ],
      },
      {
        id: 'q2', authorName: 'P. Whitmore', role: 'investor', date: '2026-07-01', upvotes: 24,
        body: 'Who owns the cell-processing patents — the company or the university?',
        answers: [
          { id: 'a1', authorName: 'S. Clarke · Oxford University Innovation', role: 'tto', date: '2026-07-02', body: 'The patents are university-owned and exclusively licensed to the company under the standardized deal template, with the university\'s equity capped per the pre-cleared terms shown on the offering page. The license survives an acquisition.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'License & IP Agreement', section: '§2 Grant', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'Oxford holds the cell-processing and scaffold-architecture patents; the company holds an exclusive worldwide license (all vascular indications) surviving change of control. University equity: 15% per the pre-cleared USIT-style template.' },
      { id: 'd2', docTitle: 'Clinical & Market Assessment', section: '§6 Competition', keywords: ['competitor', 'competitors', 'competition', 'market', 'stent'], text: 'Bio-resorbable stents from two large incumbents were withdrawn after thrombosis signals; both used polymer-only scaffolds. Vasca\'s autologous-cell approach eliminated thrombosis in pre-clinical work — no direct autologous competitor has reached Phase I.' },
      { id: 'd3', docTitle: 'Financial Model v6', section: '§5 Use of Funds', keywords: ['runway', 'burn', 'cash', 'funds', 'financials', 'trial'], text: 'The $3.2M raise funds the 12-patient Phase I cohort and 18 months of runway at $140K/month. Phase II is gated on a planned Series A; reimbursement dossiers for the UK and Germany are budgeted within this raise.' },
    ],
  },
  {
    id: 's4',
    name: 'Meridian Robotics',
    university: tudelft,
    vertical: 'AI & Robotics',
    tagline: 'Swarm inspection robots for offshore wind farms.',
    verified: false,
    targetAmount: 1_200_000,
    raisedAmount: 310_000,
    investorCount: 264,
    minInvestment: 100,
    daysLeft: 44,
    leadInvestor: 'Delft Enterprises',
    pitch: {
      plainEnglish:
        'Offshore wind turbines need constant checkups, and sending humans by boat is slow and dangerous. Meridian\'s robot swarms live at the wind farm and inspect the blades on their own.',
      commercialization:
        'Inspection-as-a-service contracts priced per turbine per year; a single North Sea farm is worth €2.4M ARR. Two paid pilots underway with European operators.',
      labProof:
        'Autonomous 6-robot swarm completed a 30-day unattended deployment in North Sea conditions, detecting 94% of seeded blade defects.',
    },
    milestones: [
      { id: 'm1', title: 'Swarm Autonomy Demo', description: '6-robot coordinated inspection in wave-tank conditions.', status: 'completed', date: '2025-11-05', hasVideoUpdate: true },
      {
        id: 'm2', title: 'North Sea Field Trial', description: '30-day unattended deployment on an operating farm.', status: 'completed', date: '2026-05-22', hasVideoUpdate: true,
        attestation: { verifierName: 'Ir. M. Janssen', verifierOrg: 'DNV Marine Assurance', role: 'independent_reviewer', signedAt: '2026-05-30', keyFingerprint: '9A05·4E12' },
      },
      { id: 'm3', title: 'Commercial Pilot Contracts', description: 'Two operators, 120 turbines under paid inspection.', status: 'in_progress', date: '2026-12-01' },
      { id: 'm4', title: 'Fleet Scale-Up', description: '50-robot production run and third operator signed.', status: 'upcoming', date: '2027-07-01' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'H. Sørensen', role: 'investor', date: '2026-06-25', upvotes: 15,
        body: 'How do the robots survive North Sea winter storms — do they dock or ride it out?',
        answers: [
          { id: 'a1', authorName: 'L. de Vries · Founder & CEO', role: 'founder', date: '2026-06-26', body: 'They dock. Each swarm has a subsea garage rated to sea state 8; forecast integration sends the fleet home six hours ahead of a front. The 30-day trial included two force-9 events with zero losses.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'IP Assignment & License', section: '§1 Background IP', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'TU Delft assigned the swarm-coordination patents to the company against a 10% equity position; the perception stack is company-developed foreground IP. TTO verification of the assignment is in progress (expected this quarter).' },
      { id: 'd2', docTitle: 'Market Study — Offshore Wind O&M', section: '§4 Competition', keywords: ['competitor', 'competitors', 'competition', 'market', 'inspection'], text: 'Incumbent inspection is crewed vessels plus rope-access technicians at ~€45K per turbine per year. Drone providers cover blades-above-waterline only. No competitor offers resident subsea-to-blade-tip robotic coverage.' },
      { id: 'd3', docTitle: 'Financial Plan v3', section: '§3 Runway & Unit Economics', keywords: ['runway', 'burn', 'cash', 'funds', 'financials', 'revenue'], text: 'The €1.2M raise funds 16 months at €70K/month and the 12-robot pilot fleet. Contracted pilots yield €380K ARR; a single mid-size farm at full deployment is worth €2.4M ARR at 68% gross margin.' },
    ],
  },
  {
    id: 's5',
    name: 'Lattice Materials',
    university: kaist,
    vertical: 'Advanced Materials',
    tagline: 'Self-healing polymer composites for aerospace.',
    verified: true,
    targetAmount: 900_000,
    raisedAmount: 552_000,
    investorCount: 421,
    minInvestment: 100,
    daysLeft: 25,
    leadInvestor: 'KAIST Venture Fund',
    pitch: {
      plainEnglish:
        'Aircraft parts crack invisibly over time. Lattice makes a material that senses tiny cracks and heals them by itself — like skin, but for airplanes.',
      commercialization:
        'Qualification programmes with two aerospace primes; material sold at a 40% premium over conventional composites with maintenance-cost savings that pay back in 18 months.',
      labProof:
        'Demonstrated 92% fracture-toughness recovery after 50 damage-heal cycles at aerospace operating temperatures — Advanced Materials cover article (2025).',
    },
    milestones: [
      {
        id: 'm1', title: 'Material Qualification (Lab)', description: '50-cycle damage-heal validation at −55°C to 120°C.', status: 'completed', date: '2025-08-18', hasVideoUpdate: true,
        attestation: { verifierName: 'Dr. H. Park', verifierOrg: 'KAIST Technology Licensing Office', role: 'tto', signedAt: '2025-08-25', keyFingerprint: '3F60·8B9C' },
      },
      { id: 'm2', title: 'Prime Contractor Test Articles', description: 'Wing-panel test articles delivered to two primes.', status: 'in_progress', date: '2026-09-30' },
      { id: 'm3', title: 'Certification Programme', description: 'EASA/FAA material qualification programme entry.', status: 'upcoming', date: '2027-05-01' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'C. Almeida', role: 'investor', date: '2026-07-03', upvotes: 9,
        body: 'Does the self-healing capacity survive repeated thermal cycling at cruise altitude, or does it deplete?',
        answers: [
          { id: 'a1', authorName: 'Dr. J. Kim · Founder', role: 'founder', date: '2026-07-04', body: 'The healing agent is vascular, not capsule-based, so it replenishes from the reservoir network rather than depleting. The 50-cycle qualification ran at −55°C to 120°C — cruise-altitude cycling is inside that envelope.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'License Agreement', section: '§2 Scope', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'KAIST owns the vascular-network patents and licenses them exclusively for aerospace and defense applications; the company retains foreground IP on the resin chemistry. University equity: 12% under the standardized template.' },
      { id: 'd2', docTitle: 'Competitive Assessment', section: '§3 Alternatives', keywords: ['competitor', 'competitors', 'competition', 'market', 'materials'], text: 'Capsule-based self-healing composites (two US startups) lose capacity after first rupture. Thermoplastic-weld approaches need autoclave access in the field. Lattice\'s vascular system is the only replenishable option at aerospace temperatures.' },
      { id: 'd3', docTitle: 'Financial Model v2', section: '§4 Runway', keywords: ['runway', 'burn', 'cash', 'funds', 'financials', 'revenue'], text: 'The $900K raise funds 14 months at $58K/month through prime-contractor test-article delivery. Qualification programme entry converts to a paid JDP worth $600K, modeled for Q3 2027.' },
    ],
  },

  // --------------------------------------------------------------------------
  // Global expansion — Canada, Singapore, Australia (regimes already coded)
  // --------------------------------------------------------------------------
  {
    id: 's6',
    name: 'Torus AI',
    university: toronto,
    vertical: 'Semiconductors',
    tagline: 'Neuromorphic inference chips that run large models at a tenth of the power.',
    verified: true,
    targetAmount: 3_200_000,
    raisedAmount: 1_410_000,
    investorCount: 806,
    minInvestment: 100,
    daysLeft: 27,
    leadInvestor: 'Radical Ventures',
    pitch: {
      plainEnglish:
        'Running today\'s AI models burns enormous amounts of electricity. Torus builds a chip modeled on how neurons fire — it only does work when the data changes, so it answers the same questions using a fraction of the power.',
      commercialization:
        'Edge AI in phones, cameras, and cars can\'t afford datacentre power budgets. Torus sells an inference accelerator with two design-win evaluations underway at tier-one device makers.',
      labProof:
        'A 28nm test chip sustained 41 TOPS/W on transformer inference — an order of magnitude better than incumbent NPUs — presented at ISSCC 2025 and independently benchmarked by the Vector Institute.',
    },
    milestones: [
      {
        id: 'm1', title: 'Test-Chip Tape-out', description: '28nm neuromorphic core, silicon-validated at 41 TOPS/W.', status: 'completed', date: '2025-11-04', hasVideoUpdate: true,
        attestation: { verifierName: 'Prof. R. Grosse', verifierOrg: 'University of Toronto — Dept. of ECE', role: 'independent_reviewer', signedAt: '2025-11-12', keyFingerprint: '9A11·4E7D' },
      },
      { id: 'm2', title: 'Design-Win Evaluations', description: 'Two tier-one device makers running silicon in eval kits.', status: 'in_progress', date: '2026-10-15' },
      { id: 'm3', title: 'Automotive-Grade Qualification', description: 'AEC-Q100 qualification for in-cabin perception.', status: 'upcoming', date: '2027-06-01' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'D. Okonkwo', role: 'investor', date: '2026-07-08', upvotes: 12,
        body: 'How portable is the toolchain? Adoption dies if customers have to rewrite their models for your architecture.',
        answers: [
          { id: 'a1', authorName: 'É. Tremblay · Founder', role: 'founder', date: '2026-07-09', body: 'We compile from standard ONNX and PyTorch exports — the sparsity mapping happens in our compiler, not in the customer\'s model. Both eval partners brought their existing models and were running on silicon within a week.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'License Agreement', section: '§2 IP', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'The University of Toronto owns the event-driven dataflow patent family (7 filings) and licenses it exclusively to the company; foreground compiler IP is company-owned. University equity: 10% under the standardized template.' },
      { id: 'd2', docTitle: 'Competitive Assessment', section: '§3 Alternatives', keywords: ['competitor', 'competitors', 'competition', 'market'], text: 'Incumbent NPUs optimize dense matrix throughput and hit a power wall at the edge; two research-stage neuromorphic efforts remain analog and hard to program. Torus is digital, ONNX-compatible, and silicon-proven.' },
      { id: 'd3', docTitle: 'Financial Model v3', section: '§4 Runway', keywords: ['runway', 'burn', 'cash', 'financials', 'revenue'], text: 'The $3.2M round funds 16 months to automotive qualification; the first design win is modeled to convert to an NRE + per-unit royalty worth $2.4M over the program.' },
    ],
  },
  {
    id: 's7',
    name: 'Qform Quantum',
    university: waterloo,
    vertical: 'Quantum Computing',
    tagline: 'Real-time error-correction control for fault-tolerant qubits.',
    verified: true,
    targetAmount: 2_800_000,
    raisedAmount: 980_000,
    investorCount: 512,
    minInvestment: 100,
    daysLeft: 33,
    leadInvestor: 'Golden Ventures',
    pitch: {
      plainEnglish:
        'Quantum computers make constant tiny errors. Qform builds the ultra-fast control system that spots and fixes those errors in real time — the missing piece between a lab qubit and a useful machine.',
      commercialization:
        'Every quantum hardware maker needs a decoder fast enough to keep up with error correction. Qform licenses its FPGA decoder as the control layer, with two hardware partners in paid integration.',
      labProof:
        'Sub-microsecond surface-code decoding sustained below the fault-tolerance threshold — published in Science (2025) and reproduced on a partner\'s superconducting device at the Institute for Quantum Computing.',
    },
    milestones: [
      {
        id: 'm1', title: 'Real-Time Decoder Demonstration', description: 'Surface-code decoding under 1µs, below threshold.', status: 'completed', date: '2025-09-22', hasVideoUpdate: true,
        attestation: { verifierName: 'K. Nourredine', verifierOrg: 'University of Waterloo — WatCo (TTO)', role: 'tto', signedAt: '2025-09-29', keyFingerprint: '2D48·B1F0' },
      },
      { id: 'm2', title: 'Hardware Partner Integration', description: 'Decoder integrated into two partners\' control stacks.', status: 'in_progress', date: '2026-11-01' },
      { id: 'm3', title: 'Logical-Qubit Lifetime Extension', description: 'Demonstrate logical lifetime beyond physical, on-device.', status: 'upcoming', date: '2027-04-15' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'H. Weiss', role: 'investor', date: '2026-07-05', upvotes: 8,
        body: 'Is this locked to superconducting qubits, or does the decoder generalize to other modalities?',
        answers: [
          { id: 'a1', authorName: 'Dr. A. Singh · Founder', role: 'founder', date: '2026-07-06', body: 'The decoder is modality-agnostic — it consumes a syndrome stream and returns corrections. One integration partner is superconducting, the other is neutral-atom, and the same core runs for both with different front-end timing.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'License Agreement', section: '§2 IP', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'Waterloo owns the low-latency decoder-architecture patents and licenses them exclusively; the company owns its FPGA and ASIC implementations. University equity: 11% under the standardized template.' },
      { id: 'd2', docTitle: 'Competitive Assessment', section: '§3 Alternatives', keywords: ['competitor', 'competitors', 'competition', 'market'], text: 'Software decoders run offline and cannot close the real-time loop; in-house hardware efforts at large vendors are captive. Qform is the only vendor-neutral, sub-microsecond decoder available to integrate.' },
      { id: 'd3', docTitle: 'Financial Model v2', section: '§4 Runway', keywords: ['runway', 'burn', 'cash', 'financials', 'revenue'], text: 'The $2.8M raise funds 15 months to an on-device logical-lifetime result; integration agreements convert to per-system license fees modeled at $1.8M ARR by 2028.' },
    ],
  },
  {
    id: 's8',
    name: 'Tropos Carbon',
    university: nus,
    vertical: 'Climate Tech',
    tagline: 'Electrochemical ocean carbon capture at container scale.',
    verified: true,
    targetAmount: 2_100_000,
    raisedAmount: 1_260_000,
    investorCount: 918,
    minInvestment: 100,
    daysLeft: 21,
    leadInvestor: 'Wavemaker Partners',
    pitch: {
      plainEnglish:
        'The ocean already absorbs huge amounts of CO₂. Tropos runs seawater through an electrochemical cell that pulls the carbon out as a stable mineral, then returns the water ready to absorb more — carbon removal that rides on nature\'s biggest pump.',
      commercialization:
        'Corporates need durable, measurable carbon removal for net-zero commitments. Tropos sells removal credits from containerized units co-located with coastal desalination and port infrastructure, with two pre-purchase agreements signed.',
      labProof:
        'A pilot cell removed CO₂ at under US$180/tonne with >0.9 mole efficiency and verified permanence — results validated by the NUS Centre for Nature-based Climate Solutions.',
    },
    milestones: [
      {
        id: 'm1', title: 'Pilot Cell — Efficiency & Permanence', description: 'Sub-$180/t removal at pilot scale, permanence verified.', status: 'completed', date: '2025-10-09', hasVideoUpdate: true,
        attestation: { verifierName: 'Prof. L. Rahman', verifierOrg: 'NUS — Industry Liaison Office (TTO)', role: 'tto', signedAt: '2025-10-16', keyFingerprint: '6C21·9D3B' },
      },
      { id: 'm2', title: 'Container Unit Field Deployment', description: 'First 1,000 t/yr unit installed at a partner port.', status: 'in_progress', date: '2026-12-01' },
      { id: 'm3', title: 'Third-Party Credit Certification', description: 'Removal methodology certified by an independent registry.', status: 'upcoming', date: '2027-03-31' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'M. Halimah', role: 'investor', date: '2026-07-02', upvotes: 15,
        body: 'How do you prove permanence to a credit buyer — what stops the captured carbon from re-releasing?',
        answers: [
          { id: 'a1', authorName: 'Dr. W. Tan · Founder', role: 'founder', date: '2026-07-03', body: 'The carbon leaves as solid carbonate mineral, not dissolved gas, so re-release isn\'t a pathway. Permanence is >10,000 years by geochemistry, and each batch is assayed and logged for the registry\'s MRV requirements.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'License Agreement', section: '§2 IP', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'NUS owns the electrochemical cell and mineralization patents and licenses them exclusively; the company owns its stack and controls IP. University equity: 12% under the standardized template.' },
      { id: 'd2', docTitle: 'Offtake Summary', section: '§3 Demand', keywords: ['revenue', 'offtake', 'credits', 'customers', 'market'], text: 'Two corporate pre-purchase agreements cover 24,000 tonnes over three years at an average $210/t. Pipeline of coastal port sites supports 8 units by 2028.' },
      { id: 'd3', docTitle: 'Financial Model v2', section: '§4 Runway', keywords: ['runway', 'burn', 'cash', 'financials'], text: 'The $2.1M raise funds 13 months through field deployment and certification; certified credits unlock the signed offtakes worth $5.0M.' },
    ],
  },
  {
    id: 's9',
    name: 'Helios Grid',
    university: ntu,
    vertical: 'Climate Tech',
    tagline: 'Perovskite–silicon tandem cells that break the 30% efficiency ceiling.',
    verified: true,
    targetAmount: 2_600_000,
    raisedAmount: 730_000,
    investorCount: 389,
    minInvestment: 100,
    daysLeft: 39,
    leadInvestor: 'Vertex Ventures SE Asia',
    pitch: {
      plainEnglish:
        'Ordinary solar panels waste most of the sunlight that hits them. Helios stacks a thin perovskite layer on top of a normal silicon cell so the two capture different colours of light together — more power from the same panel.',
      commercialization:
        'Panel makers want higher efficiency without rebuilding their factories. Helios licenses a drop-in perovskite top-cell process, with a pilot line running at a Southeast Asian module manufacturer.',
      labProof:
        'A 31.2% certified tandem efficiency with a 1,000-hour stability result under damp-heat testing — verified by the NTU-affiliated Energy Research Institute and an accredited PV test lab.',
    },
    milestones: [
      {
        id: 'm1', title: 'Certified Tandem Efficiency', description: '31.2% cell efficiency, independently certified.', status: 'completed', date: '2025-12-03', hasVideoUpdate: true,
        attestation: { verifierName: 'Prof. S. Kumar', verifierOrg: 'NTU — Innovation & Enterprise (TTO)', role: 'tto', signedAt: '2025-12-10', keyFingerprint: '4B90·77AE' },
      },
      { id: 'm2', title: 'Pilot Line Yield', description: '>90% yield on 210mm wafers at pilot manufacturer.', status: 'in_progress', date: '2026-11-20' },
      { id: 'm3', title: 'Field Reliability (IEC 61215)', description: 'Full IEC module certification on deployed strings.', status: 'upcoming', date: '2027-07-01' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'R. Prakash', role: 'investor', date: '2026-07-07', upvotes: 10,
        body: 'Perovskite stability has always been the killer. What\'s different about your encapsulation?',
        answers: [
          { id: 'a1', authorName: 'Dr. J. Lim · Founder', role: 'founder', date: '2026-07-08', body: 'We moved to an all-inorganic top cell and a glass-glass edge seal — the 1,000-hour damp-heat result held above 95% of initial power, which is the IEC durability bar. Field strings go in this quarter to confirm outdoors.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'License Agreement', section: '§2 IP', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'NTU owns the tandem interface and encapsulation patents and licenses them exclusively; process recipes are company foreground IP. University equity: 13% under the standardized template.' },
      { id: 'd2', docTitle: 'Competitive Assessment', section: '§3 Alternatives', keywords: ['competitor', 'competitors', 'competition', 'market'], text: 'Two Western perovskite startups target greenfield lines; Helios is a drop-in top-cell for existing silicon capacity, cutting adoption cost. Stability data now matches the field-reliability bar competitors miss.' },
      { id: 'd3', docTitle: 'Financial Model v2', section: '§4 Runway', keywords: ['runway', 'burn', 'cash', 'financials', 'revenue'], text: 'The $2.6M raise funds 15 months through pilot-line yield and IEC certification; a per-watt process license is modeled at $3.1M ARR against the partner\'s 2GW capacity.' },
    ],
  },
  {
    id: 's10',
    name: 'Cygnus Bio',
    university: melbourne,
    vertical: 'MedTech',
    tagline: 'Targeted radioligand therapy for treatment-resistant cancers.',
    verified: true,
    targetAmount: 3_500_000,
    raisedAmount: 2_040_000,
    investorCount: 1_120,
    minInvestment: 100,
    daysLeft: 15,
    leadInvestor: 'Brandon Capital',
    pitch: {
      plainEnglish:
        'Cygnus builds guided missiles for cancer: a targeting molecule that seeks out tumour cells carries a tiny radioactive payload directly to them, sparing healthy tissue that chemotherapy would damage.',
      commercialization:
        'Radioligand therapy is one of oncology\'s fastest-growing modalities. Cygnus is advancing a lead candidate for a solid tumour with few options, with orphan-drug designation and a hospital manufacturing partner.',
      labProof:
        'Complete tumour regression in 8 of 10 patient-derived xenograft models with no dose-limiting toxicity — data reviewed by the Peter Doherty Institute and the University of Melbourne\'s medical faculty.',
    },
    milestones: [
      {
        id: 'm1', title: 'Preclinical Efficacy & Safety', description: 'Regression in 8/10 PDX models; clean toxicology.', status: 'completed', date: '2025-07-30', hasVideoUpdate: false,
        attestation: { verifierName: 'Prof. A. Nguyen', verifierOrg: 'University of Melbourne — Business & Innovation (TTO)', role: 'tto', signedAt: '2025-08-06', keyFingerprint: '1E55·C0A2' },
      },
      { id: 'm2', title: 'IND-Enabling GMP Batch', description: 'GMP radiolabelled batch released for first-in-human.', status: 'in_progress', date: '2026-10-30' },
      { id: 'm3', title: 'Phase I First-in-Human', description: 'Dose-escalation trial opens at two Australian sites.', status: 'upcoming', date: '2027-05-15' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'S. Whitfield', role: 'investor', date: '2026-07-01', upvotes: 14,
        body: 'Radioligand supply chains are notoriously hard — how do you handle isotope sourcing and short half-lives?',
        answers: [
          { id: 'a1', authorName: 'Dr. E. Osei · Reviewer', role: 'investor', date: '2026-07-02', body: 'The isotope is generator-produced on-site at the hospital partner, so half-life logistics stay inside one building. That partnership is the moat as much as the ligand — it\'s why the GMP batch timeline is credible.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'License Agreement', section: '§2 IP', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'The University of Melbourne owns the targeting-ligand composition-of-matter patents and licenses them exclusively; the company owns formulation and process IP. University equity: 14% under the standardized template.' },
      { id: 'd2', docTitle: 'Regulatory Summary', section: '§3 Path', keywords: ['regulatory', 'fda', 'tga', 'trial', 'orphan'], text: 'Orphan-drug designation granted; pre-IND feedback supports a streamlined Phase I/II. Manufacturing at the hospital partner de-risks the radiochemistry that sinks most radioligand programs.' },
      { id: 'd3', docTitle: 'Financial Model v2', section: '§4 Runway', keywords: ['runway', 'burn', 'cash', 'financials', 'revenue'], text: 'The $3.5M raise funds 14 months through the GMP batch and trial opening; positive Phase I data is the value-inflection point modeled for a licensing deal or Series B.' },
    ],
  },
  {
    id: 's11',
    name: 'Silex Quantum',
    university: unsw,
    vertical: 'Quantum Computing',
    tagline: 'Silicon spin qubits built on the CMOS fabs the world already has.',
    verified: true,
    targetAmount: 3_000_000,
    raisedAmount: 1_650_000,
    investorCount: 742,
    minInvestment: 100,
    daysLeft: 24,
    leadInvestor: 'Main Sequence Ventures',
    pitch: {
      plainEnglish:
        'Most quantum computers need exotic hardware. Silex builds qubits out of silicon — the same material as ordinary computer chips — so they can be made in existing chip factories and cooled with standard equipment, the cheapest path to scale.',
      commercialization:
        'Silicon\'s manufacturability is the industry\'s scaling bet. Silex is developing a spin-qubit process portable to commercial CMOS foundries, with a foundry shuttle run booked and a control-electronics partner.',
      labProof:
        'Two-qubit gate fidelity above 99.5% in an isotopically purified silicon device that survives above 1 kelvin — reported in Nature (2025) and reproduced on a second wafer lot at UNSW.',
    },
    milestones: [
      {
        id: 'm1', title: 'High-Fidelity Two-Qubit Gate', description: '>99.5% fidelity, hot-qubit operation above 1K.', status: 'completed', date: '2025-10-27', hasVideoUpdate: true,
        attestation: { verifierName: 'Dr. P. O’Reilly', verifierOrg: 'UNSW — Knowledge Exchange (TTO)', role: 'tto', signedAt: '2025-11-03', keyFingerprint: '7F03·5C2E' },
      },
      { id: 'm2', title: 'Foundry Shuttle Run', description: 'Spin-qubit process ported to a commercial CMOS shuttle.', status: 'in_progress', date: '2026-12-15' },
      { id: 'm3', title: 'Multi-Qubit Array', description: 'Operate a 16-qubit array with shared control.', status: 'upcoming', date: '2027-08-01' },
    ],
    questions: [
      {
        id: 'q1', authorName: 'T. Andersson', role: 'investor', date: '2026-07-04', upvotes: 11,
        body: 'Hot-qubit operation is the headline — how much does running above 1K actually change the system cost?',
        answers: [
          { id: 'a1', authorName: 'Dr. P. O’Reilly · Reviewer', role: 'investor', date: '2026-07-05', body: 'It changes everything downstream. Above 1K you can put classical control electronics next to the qubits and use far cheaper cryogenics, which is the difference between a dilution fridge per handful of qubits and a scalable rack.' },
        ],
      },
    ],
    dataRoom: [
      { id: 'd1', docTitle: 'License Agreement', section: '§2 IP', keywords: ['patent', 'patents', 'license', 'ip', 'ownership', 'university'], text: 'UNSW owns the silicon spin-qubit device patents (a deep portfolio) and licenses them exclusively; the company owns its process-integration IP. University equity: 12% under the standardized template.' },
      { id: 'd2', docTitle: 'Competitive Assessment', section: '§3 Alternatives', keywords: ['competitor', 'competitors', 'competition', 'market', 'cryogenic'], text: 'Superconducting and trapped-ion systems lead on qubit count today but scale poorly per rack; Silex trades near-term count for CMOS manufacturability and hot-qubit operation — the cheapest cryogenic footprint in the field.' },
      { id: 'd3', docTitle: 'Financial Model v2', section: '§4 Runway', keywords: ['runway', 'burn', 'cash', 'financials', 'revenue'], text: 'The $3.0M raise funds 15 months through the foundry shuttle and a 16-qubit array; a foundry-portable process is the asset modeled for a strategic partnership with a CMOS fab.' },
    ],
  },
];

// ----------------------------------------------------------------------------
// Portfolio (settled positions with quarterly NAV marks)
// ----------------------------------------------------------------------------
export const PORTFOLIO_POSITIONS: PortfolioPosition[] = [
  {
    id: 'p1',
    startupId: 's1',
    startupName: 'Helion Dynamics',
    spvName: 'UniVest SPV Series 042',
    units: 250,
    costBasis: 2_500,
    investedOn: '2025-07-01',
    navSeries: [
      { date: '2025-09-30', navPerUnit: 10.0 },
      { date: '2025-12-31', navPerUnit: 10.4 },
      { date: '2026-03-31', navPerUnit: 11.8 },
      { date: '2026-06-30', navPerUnit: 13.25 },
    ],
  },
  {
    id: 'p2',
    startupId: 's3',
    startupName: 'Vasca Bio',
    spvName: 'UniVest SPV Series 019',
    units: 120,
    costBasis: 1_200,
    investedOn: '2025-05-15',
    navSeries: [
      { date: '2025-09-30', navPerUnit: 10.0 },
      { date: '2025-12-31', navPerUnit: 11.2 },
      { date: '2026-03-31', navPerUnit: 12.9 },
      { date: '2026-06-30', navPerUnit: 14.1 },
    ],
  },
  {
    id: 'p3',
    startupId: 's2',
    startupName: 'Qubit Foundry',
    spvName: 'UniVest SPV Series 021',
    units: 100,
    costBasis: 1_000,
    investedOn: '2026-01-10',
    navSeries: [
      { date: '2026-03-31', navPerUnit: 9.6 },
      { date: '2026-06-30', navPerUnit: 10.9 },
    ],
  },
];

export const TAX_DOCUMENTS: TaxDocument[] = [
  { id: 't1', taxYear: 2025, kind: 'Schedule K-1', spvName: 'UniVest SPV Series 042', issuedOn: '2026-03-12', status: 'available' },
  { id: 't2', taxYear: 2025, kind: 'Schedule K-1', spvName: 'UniVest SPV Series 019', issuedOn: '2026-03-12', status: 'available' },
  { id: 't3', taxYear: 2026, kind: 'Schedule K-1', spvName: 'UniVest SPV Series 021', status: 'pending' },
];

// ----------------------------------------------------------------------------
// Batch auction (Liquidity Engine v2)
// ----------------------------------------------------------------------------
export const ACTIVE_AUCTION: AuctionWindowData = {
  id: 'w1',
  spvName: 'UniVest SPV Series 042',
  startupId: 's1',
  closesAt: '2026-07-17T16:00:00Z',
  history: [
    { date: '2026-02-15', price: 10.75 },
    { date: '2026-03-15', price: 11.1 },
    { date: '2026-04-15', price: 11.6 },
    { date: '2026-05-15', price: 11.4 },
    { date: '2026-06-15', price: 12.1 },
  ],
  book: [
    { side: 'buy', units: 100, limitPrice: 13.0 },
    { side: 'buy', units: 200, limitPrice: 12.5 },
    { side: 'buy', units: 150, limitPrice: 12.0 },
    { side: 'sell', units: 120, limitPrice: 11.5 },
    { side: 'sell', units: 180, limitPrice: 12.25 },
    { side: 'sell', units: 200, limitPrice: 12.75 },
  ],
};

export const SYNDICATES: SyndicateInfo[] = [
  { id: 'sy1', name: 'The Engine Ventures', thesis: 'Tough-tech spinouts from the MIT ecosystem', verified: true },
  { id: 'sy2', name: 'ETH Foundry Fund', thesis: 'Swiss deep-tech: quantum, robotics, climate', verified: true },
  { id: 'sy3', name: 'Oxford Science Enterprises', thesis: 'Life sciences and frontier computing out of Oxford', verified: true },
];

// ----------------------------------------------------------------------------
// Realized exits (distribution waterfall demo)
// ----------------------------------------------------------------------------
export const EXITED_POSITIONS: ExitedPosition[] = [
  {
    id: 'e1',
    startupName: 'Corvid Photonics',
    spvName: 'UniVest SPV Series 007',
    exitKind: 'Acquisition by a defense prime',
    exitedOn: '2026-05-28',
    units: 200,
    costBasis: 2_000,
    grossProceeds: 5_200,
    carryPct: 15,
  },
];

// ----------------------------------------------------------------------------
// Science-monitoring agent output. Demo: curated examples referencing the
// app's FICTIONAL companies and fictional competing labs; production polls
// arXiv/PubMed/USPTO and scores relevance + stance with the Claude API.
// ----------------------------------------------------------------------------
export const SCIENCE_SIGNALS: ScienceSignal[] = [
  {
    id: 'sig1',
    startupId: 's1',
    source: 'arXiv',
    title: 'Meiji Superconduct Lab reports 18T rare-earth-free coil (preprint)',
    summary:
      'A competing group demonstrates 18T without rare-earth materials — below Helion\'s attested 21T, but with a cheaper deposition process. Watch their next result; the cost axis matters as much as field strength.',
    stance: 'competitive',
    date: '2026-07-11',
  },
  {
    id: 'sig2',
    startupId: 's1',
    source: 'USPTO',
    title: 'HTS substrate patent family granted (final two claims)',
    summary:
      'The remaining claims in the licensed substrate family were granted, completing IP coverage on the rare-earth-free stack described in the data room.',
    stance: 'supportive',
    date: '2026-07-05',
  },
  {
    id: 'sig3',
    startupId: 's2',
    source: 'Conference',
    title: 'Photonic interposer loss below 0.15 dB/hop shown at QIP',
    summary:
      'An academic group beat Qubit Foundry\'s published 0.2 dB interposer loss. Their approach is research-line only — no CMOS portability — but it pressures the roadmap\'s scaling headline.',
    stance: 'competitive',
    date: '2026-07-08',
  },
  {
    id: 'sig4',
    startupId: 's3',
    source: 'PubMed',
    title: 'Meta-analysis backs autologous scaffolds over polymer-only designs',
    summary:
      'A 14-study meta-analysis reports significantly lower thrombosis rates for cell-seeded resorbable scaffolds — directly supportive of Vasca\'s core thesis ahead of Phase I readout.',
    stance: 'supportive',
    date: '2026-06-30',
  },
  {
    id: 'sig5',
    startupId: 's5',
    source: 'arXiv',
    title: 'Vascular self-healing composites reviewed as leading aerospace approach',
    summary:
      'A survey of self-healing materials ranks replenishable vascular networks (Lattice\'s architecture) ahead of capsule-based systems for repeated-damage aerospace duty cycles.',
    stance: 'supportive',
    date: '2026-07-02',
  },
];

// ----------------------------------------------------------------------------
// Activity feed (server-push lands here in production)
// ----------------------------------------------------------------------------
export const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'n0',
    kind: 'science_signal',
    title: 'Science alert — competing 18T rare-earth-free result',
    body: 'The science agent flagged an arXiv preprint from a competing lab relevant to your Helion Dynamics position. Stance: competitive. Details on the deal page.',
    date: '2026-07-11T07:40:00Z',
  },
  {
    id: 'n1',
    kind: 'distribution',
    title: 'Distribution paid — Corvid Photonics',
    body: 'Your net proceeds of $4,720.00 from the Series 007 exit have been sent to your linked account. Statement available in your portfolio.',
    date: '2026-07-14T09:20:00Z',
  },
  {
    id: 'n2',
    kind: 'auction_cleared',
    title: 'Liquidity window cleared at $12.38',
    body: 'The June window for UniVest SPV Series 042 crossed 300 units at a uniform price of $12.38 — a new NAV reference mark.',
    date: '2026-07-12T16:05:00Z',
  },
  {
    id: 'n3',
    kind: 'milestone_attested',
    title: 'Milestone attested — Vasca Bio',
    body: 'Phase I regulatory clearance was independently signed by Oxford University Innovation (key 66E1·B3A7).',
    date: '2026-07-10T11:32:00Z',
  },
  {
    id: 'n4',
    kind: 'closing_soon',
    title: 'Vasca Bio closes in 6 days',
    body: 'The offering is 93.1% subscribed. Cancellation remains available until 48 hours before close.',
    date: '2026-07-09T08:00:00Z',
  },
  {
    id: 'n5',
    kind: 'tax_document',
    title: 'Schedule K-1 available',
    body: 'Your 2025 K-1 for UniVest SPV Series 042 is ready in the Document Vault.',
    date: '2026-03-12T14:45:00Z',
  },
];
