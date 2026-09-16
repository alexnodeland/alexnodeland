import BuildOnIcon from './BuildOnIcon';
import ConversationIcon from './ConversationIcon';
import FocusIcon from './FocusIcon';
import ProofOfConceptIcon from './ProofOfConceptIcon';
import type { ExpertiseIcon } from '../expertise-icons/iconBase';

/**
 * One per step of `homepageConfig.consulting.steps`, in the same order — the
 * consulting page pairs them by index, so the two lists move together. Drawn
 * in the homepage expertise icons' system (iconBase): a 48-unit frame, one
 * stroke, one motion each, and a still frame under reduced motion.
 */
export const consultingStepIcons: ExpertiseIcon[] = [
  ConversationIcon, // a conversation
  FocusIcon, // deciding what to address
  ProofOfConceptIcon, // a quick proof of concept
  BuildOnIcon, // then, if it helps
];

export { BuildOnIcon, ConversationIcon, FocusIcon, ProofOfConceptIcon };
