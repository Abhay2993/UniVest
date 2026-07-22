/**
 * Per-deal scientific-diligence data. All labs, patent assignees, and hires
 * are FICTIONAL (consistent with the app's universe and its fictional
 * competing labs) so no real person or organization is placed in a fabricated
 * relationship. Production sources replication from the lab marketplace, FTO
 * from patent-data providers, and talent flow from public professional data.
 */
import { Patent, ReplicationStudy, TalentMove } from '../utils/diligence';

export const REPLICATION_STUDIES: Record<string, ReplicationStudy[]> = {
  s1: [
    {
      id: 'r1',
      milestoneTitle: 'Prototype Validation (21T coil)',
      labName: 'National High-Field Magnet Facility',
      fee: 42_000,
      status: 'replicated',
      result: 'Reproduced 20.7T sustained for 46h — within 1.4% of the reported field.',
      completedDate: '2026-03-18',
    },
    {
      id: 'r2',
      milestoneTitle: 'Lab-Scale Coil Demonstration',
      labName: 'Cryomagnetics Independent Lab',
      fee: 18_000,
      status: 'replicated',
      result: 'Benchtop 5T result confirmed.',
      completedDate: '2025-08-01',
    },
    {
      id: 'r3',
      milestoneTitle: 'Pilot Manufacturing Line',
      labName: 'Fraunhofer-style Materials Institute',
      fee: 55_000,
      status: 'available',
    },
  ],
  s2: [
    {
      id: 'r1',
      milestoneTitle: 'Logical Qubit Demo',
      labName: 'Photonics Metrology Consortium',
      fee: 60_000,
      status: 'in_progress',
    },
  ],
  s3: [
    {
      id: 'r1',
      milestoneTitle: 'Pre-Clinical Trials',
      labName: 'Independent Vascular Pathology Lab',
      fee: 38_000,
      status: 'replicated',
      result: 'Zero-thrombosis finding reproduced in a 12-implant blinded study.',
      completedDate: '2025-11-20',
    },
    {
      id: 'r2',
      milestoneTitle: 'Regulatory Clearance (Phase I)',
      labName: 'Contract Research Organization',
      fee: 25_000,
      status: 'available',
    },
  ],
};

export const FTO_PATENTS: Record<string, Patent[]> = {
  s1: [
    { id: 'p1', title: 'Rare-earth-free HTS coil winding', assignee: 'Helion Dynamics', relation: 'owned', jurisdiction: 'US' },
    { id: 'p2', title: 'Substrate deposition for HTS tape', assignee: 'Helion Dynamics', relation: 'owned', jurisdiction: 'US/EP' },
    { id: 'p3', title: 'Cryogenic quench-protection circuit', assignee: 'Meiji Superconduct Lab', relation: 'adjacent', jurisdiction: 'JP' },
    { id: 'p4', title: 'Coil geometry (exclusive MIT license)', assignee: 'MIT', relation: 'licensed', jurisdiction: 'US' },
  ],
  s2: [
    { id: 'p1', title: 'Photonic error-correction lattice', assignee: 'Qubit Foundry', relation: 'owned', jurisdiction: 'US/EP' },
    { id: 'p2', title: 'Interposer low-loss coupling', assignee: 'Pacific Quantum Devices', relation: 'blocking', jurisdiction: 'US' },
    { id: 'p3', title: 'CMOS photonic standard cell', assignee: 'Qubit Foundry', relation: 'owned', jurisdiction: 'US' },
  ],
  s3: [
    { id: 'p1', title: 'Autologous cell-seeding process', assignee: 'Oxford (exclusive license)', relation: 'licensed', jurisdiction: 'UK/US' },
    { id: 'p2', title: 'Resorbable scaffold architecture', assignee: 'Vasca Bio', relation: 'owned', jurisdiction: 'UK/US/EP' },
  ],
};

export const TALENT_MOVES: Record<string, TalentMove[]> = {
  s1: [
    { id: 't1', name: 'Dr. A. Novak', role: 'Head of Magnet Engineering', fromOrg: 'ex-Meiji Superconduct Lab', pedigree: 'star', joinedDate: '2026-05-02' },
    { id: 't2', name: 'M. Okoro', role: 'Principal Cryo Engineer', fromOrg: 'ex-national fusion program', pedigree: 'senior', joinedDate: '2026-04-11' },
    { id: 't3', name: 'L. Petrov', role: 'Staff Materials Scientist', fromOrg: 'ex-Cryomagnetics Lab', pedigree: 'notable', joinedDate: '2026-06-01' },
  ],
  s2: [
    { id: 't1', name: 'Prof. R. Adeyemi', role: 'Chief Scientist', fromOrg: 'ex-Pacific Quantum Devices', pedigree: 'star', joinedDate: '2026-03-20' },
  ],
  s3: [
    { id: 't1', name: 'Dr. S. Bianchi', role: 'VP Clinical', fromOrg: 'ex-top-10 device maker', pedigree: 'senior', joinedDate: '2026-02-15' },
    { id: 't2', name: 'K. Adeyçmi', role: 'Regulatory Lead', fromOrg: 'ex-national regulator', pedigree: 'notable', joinedDate: '2026-05-19' },
  ],
};
