/**
 * Deep-tech knowledge graph — startups ↔ founders ↔ papers ↔ patents ↔
 * universities ↔ topics ↔ competing labs. Powers graph-based discovery
 * ("who else is working on rare-earth-free magnets?").
 *
 * Demo data spans the app's FICTIONAL portfolio; competing labs are fictional
 * too, so no real organization is placed in fabricated relationships.
 * Production builds this graph from the data room, publication APIs, and the
 * science-monitoring agent.
 */

export type GraphNodeKind =
  | 'startup'
  | 'university'
  | 'founder'
  | 'topic'
  | 'paper'
  | 'patent'
  | 'lab';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Startup id when the node maps to an investable offering. */
  startupId?: string;
}

export type GraphEdgeKind =
  | 'spun out of'
  | 'founded by'
  | 'published'
  | 'protected by'
  | 'works on'
  | 'competes on';

export interface GraphEdge {
  from: string;
  to: string;
  kind: GraphEdgeKind;
}

export const GRAPH_NODES: GraphNode[] = [
  // Startups
  { id: 'st:helion', kind: 'startup', label: 'Helion Dynamics', startupId: 's1' },
  { id: 'st:qubit', kind: 'startup', label: 'Qubit Foundry', startupId: 's2' },
  { id: 'st:vasca', kind: 'startup', label: 'Vasca Bio', startupId: 's3' },
  { id: 'st:meridian', kind: 'startup', label: 'Meridian Robotics', startupId: 's4' },
  { id: 'st:lattice', kind: 'startup', label: 'Lattice Materials', startupId: 's5' },
  // Universities
  { id: 'u:mit', kind: 'university', label: 'MIT' },
  { id: 'u:eth', kind: 'university', label: 'ETH Zürich' },
  { id: 'u:oxford', kind: 'university', label: 'Oxford' },
  { id: 'u:delft', kind: 'university', label: 'TU Delft' },
  { id: 'u:kaist', kind: 'university', label: 'KAIST' },
  // Founders (fictional, from the app's cast)
  { id: 'f:reyes', kind: 'founder', label: 'Dr. Sofia Reyes' },
  { id: 'f:keller', kind: 'founder', label: 'Prof. N. Keller' },
  { id: 'f:osei', kind: 'founder', label: 'Dr. E. Osei' },
  { id: 'f:devries', kind: 'founder', label: 'L. de Vries' },
  { id: 'f:kim', kind: 'founder', label: 'Dr. J. Kim' },
  // Topics
  { id: 't:hts', kind: 'topic', label: 'Rare-earth-free HTS magnets' },
  { id: 't:cryo', kind: 'topic', label: 'Cryogenic engineering' },
  { id: 't:qec', kind: 'topic', label: 'Photonic error correction' },
  { id: 't:scaffold', kind: 'topic', label: 'Bioresorbable scaffolds' },
  { id: 't:swarm', kind: 'topic', label: 'Subsea swarm autonomy' },
  { id: 't:selfheal', kind: 'topic', label: 'Self-healing composites' },
  // Papers (fictional publications from the app's lore)
  { id: 'p:nature21t', kind: 'paper', label: 'Nature Energy \'25 — 21T coil' },
  { id: 'p:science-lq', kind: 'paper', label: 'Science \'25 — logical qubit' },
  { id: 'p:lancet', kind: 'paper', label: 'Lancet preprint — autologous scaffold' },
  // Patents (from the data rooms)
  { id: 'ip:hts', kind: 'patent', label: 'HTS substrate family (11 patents)' },
  { id: 'ip:qec', kind: 'patent', label: 'Error-correction lattice family' },
  { id: 'ip:vasc', kind: 'patent', label: 'Vascular-network patents' },
  // Competing labs (fictional)
  { id: 'l:meiji', kind: 'lab', label: 'Meiji Superconduct Lab' },
  { id: 'l:pacific', kind: 'lab', label: 'Pacific Quantum Devices' },
  { id: 'l:helixweave', kind: 'lab', label: 'HelixWeave Bio' },

  // --- Global expansion: Canada / Singapore / Australia ---
  // Startups
  { id: 'st:torus', kind: 'startup', label: 'Torus AI', startupId: 's6' },
  { id: 'st:qform', kind: 'startup', label: 'Qform Quantum', startupId: 's7' },
  { id: 'st:tropos', kind: 'startup', label: 'Tropos Carbon', startupId: 's8' },
  { id: 'st:helios', kind: 'startup', label: 'Helios Grid', startupId: 's9' },
  { id: 'st:cygnus', kind: 'startup', label: 'Cygnus Bio', startupId: 's10' },
  { id: 'st:silex', kind: 'startup', label: 'Silex Quantum', startupId: 's11' },
  // Universities
  { id: 'u:toronto', kind: 'university', label: 'University of Toronto' },
  { id: 'u:waterloo', kind: 'university', label: 'University of Waterloo' },
  { id: 'u:nus', kind: 'university', label: 'NUS' },
  { id: 'u:ntu', kind: 'university', label: 'NTU' },
  { id: 'u:melbourne', kind: 'university', label: 'University of Melbourne' },
  { id: 'u:unsw', kind: 'university', label: 'UNSW Sydney' },
  // Founders
  { id: 'f:tremblay', kind: 'founder', label: 'É. Tremblay' },
  { id: 'f:singh', kind: 'founder', label: 'Dr. A. Singh' },
  { id: 'f:tan', kind: 'founder', label: 'Dr. W. Tan' },
  { id: 'f:lim', kind: 'founder', label: 'Dr. J. Lim' },
  { id: 'f:ellery', kind: 'founder', label: 'Dr. M. Ellery' },
  { id: 'f:novak', kind: 'founder', label: 'Prof. C. Novak' },
  // Topics (new + shared for cross-portfolio links)
  { id: 't:neuromorphic', kind: 'topic', label: 'Neuromorphic compute' },
  { id: 't:siliconqubit', kind: 'topic', label: 'Silicon spin qubits' },
  { id: 't:oceancapture', kind: 'topic', label: 'Ocean carbon capture' },
  { id: 't:perovskite', kind: 'topic', label: 'Perovskite photovoltaics' },
  { id: 't:radioligand', kind: 'topic', label: 'Targeted radioligand therapy' },
  // Papers & patents
  { id: 'p:isscc-torus', kind: 'paper', label: 'ISSCC \'25 — 41 TOPS/W' },
  { id: 'p:science-qform', kind: 'paper', label: 'Science \'25 — sub-µs decoding' },
  { id: 'p:nature-silex', kind: 'paper', label: 'Nature \'25 — hot silicon qubit' },
  { id: 'ip:torus', kind: 'patent', label: 'Event-driven dataflow family' },
  { id: 'ip:helios', kind: 'patent', label: 'Tandem interface + encapsulation' },
  { id: 'ip:silex', kind: 'patent', label: 'Silicon spin-qubit device family' },
  // Competing labs
  { id: 'l:borealis', kind: 'lab', label: 'Borealis Neuromorphic' },
  { id: 'l:coralcap', kind: 'lab', label: 'CoralCapture Labs' },
];

export const GRAPH_EDGES: GraphEdge[] = [
  // Spinout lineage
  { from: 'st:helion', to: 'u:mit', kind: 'spun out of' },
  { from: 'st:qubit', to: 'u:eth', kind: 'spun out of' },
  { from: 'st:vasca', to: 'u:oxford', kind: 'spun out of' },
  { from: 'st:meridian', to: 'u:delft', kind: 'spun out of' },
  { from: 'st:lattice', to: 'u:kaist', kind: 'spun out of' },
  // Founders
  { from: 'st:helion', to: 'f:reyes', kind: 'founded by' },
  { from: 'st:qubit', to: 'f:keller', kind: 'founded by' },
  { from: 'st:vasca', to: 'f:osei', kind: 'founded by' },
  { from: 'st:meridian', to: 'f:devries', kind: 'founded by' },
  { from: 'st:lattice', to: 'f:kim', kind: 'founded by' },
  // Papers & patents
  { from: 'f:reyes', to: 'p:nature21t', kind: 'published' },
  { from: 'st:helion', to: 'ip:hts', kind: 'protected by' },
  { from: 'f:keller', to: 'p:science-lq', kind: 'published' },
  { from: 'st:qubit', to: 'ip:qec', kind: 'protected by' },
  { from: 'f:osei', to: 'p:lancet', kind: 'published' },
  { from: 'st:vasca', to: 'ip:vasc', kind: 'protected by' },
  // Topics — the discovery layer
  { from: 'st:helion', to: 't:hts', kind: 'works on' },
  { from: 'st:helion', to: 't:cryo', kind: 'works on' },
  { from: 'st:qubit', to: 't:qec', kind: 'works on' },
  { from: 'st:qubit', to: 't:cryo', kind: 'works on' }, // shared topic → cross-portfolio link
  { from: 'st:vasca', to: 't:scaffold', kind: 'works on' },
  { from: 'st:meridian', to: 't:swarm', kind: 'works on' },
  { from: 'st:lattice', to: 't:selfheal', kind: 'works on' },
  // Competing labs
  { from: 'l:meiji', to: 't:hts', kind: 'competes on' },
  { from: 'l:pacific', to: 't:qec', kind: 'competes on' },
  { from: 'l:helixweave', to: 't:scaffold', kind: 'competes on' },

  // --- Global expansion: Canada / Singapore / Australia ---
  // Spinout lineage
  { from: 'st:torus', to: 'u:toronto', kind: 'spun out of' },
  { from: 'st:qform', to: 'u:waterloo', kind: 'spun out of' },
  { from: 'st:tropos', to: 'u:nus', kind: 'spun out of' },
  { from: 'st:helios', to: 'u:ntu', kind: 'spun out of' },
  { from: 'st:cygnus', to: 'u:melbourne', kind: 'spun out of' },
  { from: 'st:silex', to: 'u:unsw', kind: 'spun out of' },
  // Founders
  { from: 'st:torus', to: 'f:tremblay', kind: 'founded by' },
  { from: 'st:qform', to: 'f:singh', kind: 'founded by' },
  { from: 'st:tropos', to: 'f:tan', kind: 'founded by' },
  { from: 'st:helios', to: 'f:lim', kind: 'founded by' },
  { from: 'st:cygnus', to: 'f:ellery', kind: 'founded by' },
  { from: 'st:silex', to: 'f:novak', kind: 'founded by' },
  // Papers & patents
  { from: 'f:tremblay', to: 'p:isscc-torus', kind: 'published' },
  { from: 'st:torus', to: 'ip:torus', kind: 'protected by' },
  { from: 'f:singh', to: 'p:science-qform', kind: 'published' },
  { from: 'st:helios', to: 'ip:helios', kind: 'protected by' },
  { from: 'f:novak', to: 'p:nature-silex', kind: 'published' },
  { from: 'st:silex', to: 'ip:silex', kind: 'protected by' },
  // Topics — new spaces plus deliberate cross-links into the existing portfolio
  { from: 'st:torus', to: 't:neuromorphic', kind: 'works on' },
  { from: 'st:qform', to: 't:qec', kind: 'works on' },      // shared with Qubit Foundry
  { from: 'st:tropos', to: 't:oceancapture', kind: 'works on' },
  { from: 'st:helios', to: 't:perovskite', kind: 'works on' },
  { from: 'st:cygnus', to: 't:radioligand', kind: 'works on' },
  { from: 'st:silex', to: 't:siliconqubit', kind: 'works on' },
  { from: 'st:silex', to: 't:cryo', kind: 'works on' },     // shared with Helion + Qubit
  // Competing labs
  { from: 'l:borealis', to: 't:neuromorphic', kind: 'competes on' },
  { from: 'l:coralcap', to: 't:oceancapture', kind: 'competes on' },
];

/** All nodes directly connected to `nodeId`, with the linking edge kind. */
export function neighborsOf(nodeId: string): { node: GraphNode; edge: GraphEdgeKind }[] {
  const out: { node: GraphNode; edge: GraphEdgeKind }[] = [];
  for (const e of GRAPH_EDGES) {
    const otherId = e.from === nodeId ? e.to : e.to === nodeId ? e.from : null;
    if (!otherId) continue;
    const node = GRAPH_NODES.find((n) => n.id === otherId);
    if (node) out.push({ node, edge: e.kind });
  }
  return out;
}
