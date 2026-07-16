/**
 * Spinout Directory — a curated, FACTUAL reference of notable real companies
 * spun out of Oxford, MIT, and Harvard. This is public, educational reference
 * material: real names, real science, and public listing status only.
 *
 * It is deliberately NOT an investment surface — no fundraising figures, no
 * milestone attestations, no "invest" actions. UniVest does not offer these
 * securities, and nothing here implies otherwise. The list is a representative
 * selection of well-documented spinouts, not an exhaustive registry.
 *
 * Descriptions are limited to what each company publicly does; founding years
 * and listing status are included only where well established. Several deep-
 * tech companies originate from joint university/institute research (e.g. the
 * Broad Institute is MIT + Harvard) — the `note` field records that nuance.
 */

export type DirectoryUniversity = 'Oxford' | 'MIT' | 'Harvard';
export type ListingStatus = 'Public' | 'Private' | 'Acquired';

export interface DirectorySpinout {
  id: string;
  name: string;
  university: DirectoryUniversity;
  sector: string;
  founded?: number;
  status: ListingStatus;
  /** Factual, public description of what the company does. */
  description: string;
  /** Attribution or context nuance (joint origin, current corporate status). */
  note?: string;
}

export const DIRECTORY_UNIVERSITIES: DirectoryUniversity[] = ['Oxford', 'MIT', 'Harvard'];

export const DIRECTORY_SPINOUTS: DirectorySpinout[] = [
  // ---------------------------------------------------------------- Oxford
  {
    id: 'ox-nanopore',
    name: 'Oxford Nanopore Technologies',
    university: 'Oxford',
    sector: 'Genomics',
    founded: 2005,
    status: 'Public',
    description:
      'Real-time, portable DNA and RNA sequencing that reads long strands through protein nanopores; devices range from the handheld MinION to high-throughput PromethION.',
    note: 'Listed on the London Stock Exchange (2021). Spun out of the University of Oxford.',
  },
  {
    id: 'ox-vaccitech',
    name: 'Vaccitech',
    university: 'Oxford',
    sector: 'Immunotherapy & Vaccines',
    founded: 2016,
    status: 'Public',
    description:
      'Developed the ChAdOx viral-vector platform behind the Oxford–AstraZeneca COVID-19 vaccine, and T-cell immunotherapies for chronic disease and cancer.',
    note: 'Now part of Barinthus Biotherapeutics (Nasdaq).',
  },
  {
    id: 'ox-pv',
    name: 'Oxford PV',
    university: 'Oxford',
    sector: 'Clean Energy',
    founded: 2010,
    status: 'Private',
    description:
      'Perovskite-on-silicon tandem solar cells that push photovoltaic conversion efficiency well beyond conventional silicon panels.',
  },
  {
    id: 'ox-firstlight',
    name: 'First Light Fusion',
    university: 'Oxford',
    sector: 'Fusion Energy',
    founded: 2011,
    status: 'Private',
    description:
      'Inertial-confinement fusion using a projectile-driven approach to compress a fuel target, aiming at a simpler path to fusion gain.',
  },
  {
    id: 'ox-oxa',
    name: 'Oxa',
    university: 'Oxford',
    sector: 'AI & Robotics',
    founded: 2014,
    status: 'Private',
    description:
      'Self-driving vehicle software ("Universal Autonomy") for deploying autonomous systems across industrial and transport settings.',
    note: 'Formerly Oxbotica.',
  },
  {
    id: 'ox-oqc',
    name: 'Oxford Quantum Circuits',
    university: 'Oxford',
    sector: 'Quantum Computing',
    founded: 2017,
    status: 'Private',
    description:
      'Superconducting quantum computers built on a proprietary "Coaxmon" architecture, offered as quantum-computing-as-a-service.',
  },
  {
    id: 'ox-organox',
    name: 'OrganOx',
    university: 'Oxford',
    sector: 'MedTech',
    founded: 2008,
    status: 'Private',
    description:
      'Normothermic machine perfusion (the metra device) that keeps donor organs functioning outside the body to improve transplant outcomes.',
  },
  {
    id: 'ox-mindfoundry',
    name: 'Mind Foundry',
    university: 'Oxford',
    sector: 'Artificial Intelligence',
    founded: 2016,
    status: 'Private',
    description:
      'Applied machine-learning platform for high-stakes decisions in insurance, defence, and the public sector, from Oxford\'s Machine Learning Research Group.',
  },
  {
    id: 'ox-brainomix',
    name: 'Brainomix',
    university: 'Oxford',
    sector: 'MedTech & AI',
    founded: 2010,
    status: 'Private',
    description:
      'AI-powered medical imaging (e-Stroke) that helps clinicians interpret brain and lung scans faster for stroke and fibrosis care.',
  },

  // ------------------------------------------------------------------- MIT
  {
    id: 'mit-cfs',
    name: 'Commonwealth Fusion Systems',
    university: 'MIT',
    sector: 'Fusion Energy',
    founded: 2018,
    status: 'Private',
    description:
      'High-temperature superconducting magnet tokamak (SPARC) targeting net-energy fusion, spun out of the MIT Plasma Science and Fusion Center.',
  },
  {
    id: 'mit-ginkgo',
    name: 'Ginkgo Bioworks',
    university: 'MIT',
    sector: 'Synthetic Biology',
    founded: 2008,
    status: 'Public',
    description:
      'A cell-programming platform that engineers microorganisms to produce chemicals, materials, and therapeutics on demand.',
    note: 'Co-founded by MIT researchers including Tom Knight. Public (NYSE).',
  },
  {
    id: 'mit-form',
    name: 'Form Energy',
    university: 'MIT',
    sector: 'Grid-Scale Storage',
    founded: 2017,
    status: 'Private',
    description:
      'Multi-day iron-air battery storage designed to hold renewable energy on the grid for 100+ hours.',
    note: 'Co-founded by MIT\'s Yet-Ming Chiang.',
  },
  {
    id: 'mit-ambri',
    name: 'Ambri',
    university: 'MIT',
    sector: 'Energy Storage',
    founded: 2010,
    status: 'Private',
    description:
      'Liquid-metal batteries for long-duration, grid-scale energy storage, from the lab of MIT\'s Donald Sadoway.',
  },
  {
    id: 'mit-desktopmetal',
    name: 'Desktop Metal',
    university: 'MIT',
    sector: 'Advanced Manufacturing',
    founded: 2015,
    status: 'Public',
    description:
      'Metal and mass-production additive manufacturing (3D printing) systems for industrial parts.',
    note: 'Co-founded by MIT\'s Ely Sachs and others. Public (NYSE).',
  },
  {
    id: 'mit-bostonmetal',
    name: 'Boston Metal',
    university: 'MIT',
    sector: 'Advanced Materials',
    founded: 2013,
    status: 'Private',
    description:
      'Molten oxide electrolysis to produce steel and metals with greatly reduced carbon emissions, from MIT research by Donald Sadoway and Antoine Allanore.',
  },
  {
    id: 'mit-sublime',
    name: 'Sublime Systems',
    university: 'MIT',
    sector: 'Decarbonization',
    founded: 2020,
    status: 'Private',
    description:
      'Low-carbon cement made through an electrochemical process that avoids the fossil-fuel kilns of conventional production.',
    note: 'Co-founded by MIT\'s Yet-Ming Chiang.',
  },
  {
    id: 'mit-eink',
    name: 'E Ink',
    university: 'MIT',
    sector: 'Advanced Materials',
    founded: 1997,
    status: 'Public',
    description:
      'Electronic-paper display technology (electrophoretic "microcapsule" displays) used in e-readers and signage, from the MIT Media Lab.',
  },
  {
    id: 'mit-akamai',
    name: 'Akamai Technologies',
    university: 'MIT',
    sector: 'Computing Infrastructure',
    founded: 1998,
    status: 'Public',
    description:
      'Content delivery network and cloud-security services built on distributed-systems research by Tom Leighton and Daniel Lewin at MIT.',
  },
  {
    id: 'mit-irobot',
    name: 'iRobot',
    university: 'MIT',
    sector: 'Robotics',
    founded: 1990,
    status: 'Public',
    description:
      'Consumer and field robotics — best known for the Roomba — founded by MIT roboticists Rodney Brooks, Colin Angle, and Helen Greiner.',
  },

  // --------------------------------------------------------------- Harvard
  {
    id: 'hv-moderna',
    name: 'Moderna',
    university: 'Harvard',
    sector: 'mRNA Therapeutics',
    founded: 2010,
    status: 'Public',
    description:
      'mRNA medicines and vaccines, including a widely deployed COVID-19 vaccine, built on messenger-RNA science associated with Harvard\'s Derrick Rossi.',
    note: 'Public (Nasdaq).',
  },
  {
    id: 'hv-editas',
    name: 'Editas Medicine',
    university: 'Harvard',
    sector: 'Gene Editing',
    founded: 2013,
    status: 'Public',
    description:
      'CRISPR genome-editing therapeutics targeting genetic diseases.',
    note: 'Co-founded on Harvard/Broad and MIT research (George Church, Feng Zhang). Public (Nasdaq).',
  },
  {
    id: 'hv-beam',
    name: 'Beam Therapeutics',
    university: 'Harvard',
    sector: 'Gene Editing',
    founded: 2017,
    status: 'Public',
    description:
      'Base editing — precise single-letter DNA changes without cutting the double helix — for genetic disease.',
    note: 'Based on David Liu\'s work (Harvard/Broad). Public (Nasdaq).',
  },
  {
    id: 'hv-prime',
    name: 'Prime Medicine',
    university: 'Harvard',
    sector: 'Gene Editing',
    founded: 2019,
    status: 'Public',
    description:
      'Prime editing, a "search-and-replace" genome-editing technology capable of a wide range of precise DNA corrections.',
    note: 'From David Liu\'s lab (Harvard/Broad). Public (Nasdaq).',
  },
  {
    id: 'hv-verve',
    name: 'Verve Therapeutics',
    university: 'Harvard',
    sector: 'Gene Editing',
    founded: 2018,
    status: 'Public',
    description:
      'Single-course base-editing therapies aimed at permanently lowering cardiovascular disease risk.',
    note: 'Founded on Broad/Harvard research (Sekar Kathiresan). Public (Nasdaq).',
  },
  {
    id: 'hv-sherlock',
    name: 'Sherlock Biosciences',
    university: 'Harvard',
    sector: 'Diagnostics',
    founded: 2019,
    status: 'Private',
    description:
      'CRISPR-based molecular diagnostics for fast, low-cost detection of pathogens and genetic signatures.',
    note: 'From Broad Institute / Harvard research (Feng Zhang, James Collins).',
  },
  {
    id: 'hv-quera',
    name: 'QuEra Computing',
    university: 'Harvard',
    sector: 'Quantum Computing',
    founded: 2018,
    status: 'Private',
    description:
      'Neutral-atom quantum computers that trap arrays of atoms with lasers to run programmable quantum algorithms.',
    note: 'Based on Harvard (Mikhail Lukin) and MIT (Vladan Vuletić) research.',
  },
  {
    id: 'hv-vicarious',
    name: 'Vicarious Surgical',
    university: 'Harvard',
    sector: 'Surgical Robotics',
    founded: 2014,
    status: 'Public',
    description:
      'Miniaturized surgical robots controlled through a virtual-reality interface for minimally invasive procedures.',
    note: 'Public (NYSE).',
  },
  {
    id: 'hv-dyno',
    name: 'Dyno Therapeutics',
    university: 'Harvard',
    sector: 'AI-Enabled Gene Therapy',
    founded: 2018,
    status: 'Private',
    description:
      'Uses machine learning to design improved AAV capsids — the delivery vehicles for gene therapies.',
    note: 'From the Wyss Institute at Harvard (George Church, Eric Kelsic).',
  },
  {
    id: 'hv-kula',
    name: 'Kula Bio',
    university: 'Harvard',
    sector: 'AgTech',
    founded: 2018,
    status: 'Private',
    description:
      'Engineered nitrogen-fixing microbes that deliver a low-carbon alternative to synthetic fertilizer.',
    note: 'From the Wyss Institute at Harvard (Pamela Silver).',
  },
];
