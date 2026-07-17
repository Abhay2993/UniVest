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
