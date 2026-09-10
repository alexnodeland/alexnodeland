import AiSystemsIcon from './AiSystemsIcon';
import CreativeTechnologyIcon from './CreativeTechnologyIcon';
import DataEngineeringIcon from './DataEngineeringIcon';
import EvaluationIcon from './EvaluationIcon';
import InfrastructureIcon from './InfrastructureIcon';
import TechnicalStrategyIcon from './TechnicalStrategyIcon';
import type { ExpertiseIcon } from './iconBase';

export type { ExpertiseIcon, ExpertiseIconProps } from './iconBase';

/**
 * Ordered to match `homepageConfig.expertise.items` — the homepage pairs them
 * by index, so the two lists have to move together.
 */
export const expertiseIcons: ExpertiseIcon[] = [
  AiSystemsIcon, // ai systems
  InfrastructureIcon, // infrastructure
  DataEngineeringIcon, // data engineering
  EvaluationIcon, // evaluation & observability
  TechnicalStrategyIcon, // technical strategy
  CreativeTechnologyIcon, // creative technology
];

export {
  AiSystemsIcon,
  CreativeTechnologyIcon,
  DataEngineeringIcon,
  EvaluationIcon,
  InfrastructureIcon,
  TechnicalStrategyIcon,
};
