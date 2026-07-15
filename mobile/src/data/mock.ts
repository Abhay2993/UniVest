import { Startup, University, Vertical } from '../types';

export const VERTICALS: Vertical[] = [
  'Fusion Energy',
  'Quantum Computing',
  'MedTech',
  'AI & Robotics',
  'Advanced Materials',
];

const mit: University = { id: 'u1', name: 'Massachusetts Institute of Technology', shortName: 'MIT', country: 'USA', activeDeals: 4 };
const eth: University = { id: 'u2', name: 'ETH Zürich', shortName: 'ETH', country: 'CHE', activeDeals: 3 };
const oxford: University = { id: 'u3', name: 'University of Oxford', shortName: 'Oxford', country: 'GBR', activeDeals: 2 };
const tudelft: University = { id: 'u4', name: 'TU Delft', shortName: 'TU Delft', country: 'NLD', activeDeals: 2 };
const kaist: University = { id: 'u5', name: 'KAIST', shortName: 'KAIST', country: 'KOR', activeDeals: 1 };

export const UNIVERSITIES: University[] = [mit, eth, oxford, tudelft, kaist];

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
      { id: 'm1', title: 'Lab-Scale Coil Demonstration', description: '5T sustained field in benchtop prototype, validated by MIT PSFC.', status: 'completed', date: '2025-06-12', hasVideoUpdate: true },
      { id: 'm2', title: 'Prototype Validation', description: '21T full-scale coil, 48-hour continuous operation at 20 K.', status: 'completed', date: '2026-01-30', hasVideoUpdate: true },
      { id: 'm3', title: 'Pilot Manufacturing Line', description: 'First 10 production coils delivered to two fusion pilot-plant customers.', status: 'in_progress', date: '2026-11-15' },
      { id: 'm4', title: 'Utility-Scale Order Book', description: 'Framework supply agreements covering 3 announced pilot plants.', status: 'upcoming', date: '2027-06-01' },
      { id: 'm5', title: 'Series B / Exit Window', description: 'Institutional round or strategic acquisition; SPV liquidity event.', status: 'upcoming', date: '2028-03-01' },
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
      { id: 'm1', title: 'Logical Qubit Demo', description: 'Error-corrected logical qubit on photonic test chip.', status: 'completed', date: '2025-09-02', hasVideoUpdate: true },
      { id: 'm2', title: 'Foundry Process Transfer', description: 'Design kit ported to a commercial 300mm CMOS line.', status: 'in_progress', date: '2026-10-01' },
      { id: 'm3', title: 'First Royalty Silicon', description: 'Customer wafers taped out under royalty agreement.', status: 'upcoming', date: '2027-02-15' },
      { id: 'm4', title: '64-Logical-Qubit Module', description: 'Rack-mounted module for quantum cloud deployment.', status: 'upcoming', date: '2027-12-01' },
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
      { id: 'm1', title: 'Pre-Clinical Trials', description: '40-implant large-animal study, zero adverse events.', status: 'completed', date: '2025-04-20', hasVideoUpdate: true },
      { id: 'm2', title: 'Regulatory Clearance (Phase I)', description: 'MHRA approval for first-in-human trial.', status: 'completed', date: '2026-02-14' },
      { id: 'm3', title: 'Phase I Trials', description: '12-patient safety cohort at John Radcliffe Hospital.', status: 'in_progress', date: '2026-12-20' },
      { id: 'm4', title: 'Phase II Multi-Centre', description: '120 patients across UK and German centres.', status: 'upcoming', date: '2027-09-30' },
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
      { id: 'm2', title: 'North Sea Field Trial', description: '30-day unattended deployment on an operating farm.', status: 'completed', date: '2026-05-22', hasVideoUpdate: true },
      { id: 'm3', title: 'Commercial Pilot Contracts', description: 'Two operators, 120 turbines under paid inspection.', status: 'in_progress', date: '2026-12-01' },
      { id: 'm4', title: 'Fleet Scale-Up', description: '50-robot production run and third operator signed.', status: 'upcoming', date: '2027-07-01' },
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
      { id: 'm1', title: 'Material Qualification (Lab)', description: '50-cycle damage-heal validation at −55°C to 120°C.', status: 'completed', date: '2025-08-18', hasVideoUpdate: true },
      { id: 'm2', title: 'Prime Contractor Test Articles', description: 'Wing-panel test articles delivered to two primes.', status: 'in_progress', date: '2026-09-30' },
      { id: 'm3', title: 'Certification Programme', description: 'EASA/FAA material qualification programme entry.', status: 'upcoming', date: '2027-05-01' },
    ],
  },
];
