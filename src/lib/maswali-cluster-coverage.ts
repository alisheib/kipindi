/** Bounded integrity reads must say exactly how much of the record was considered and shown. */
export const CLUSTER_HOLDER_SCAN_LIMIT = 5_000;
export const CLUSTER_SOURCE_GROUP_LIMIT = 500;
export const CLUSTER_GROUP_DISPLAY_LIMIT = 50;

export type ClusterCoverage = {
  holdersTotal: number;
  connectedHoldersChecked: number;
  connectionSourceLimitReached: boolean;
  groupsFound: number;
  groupsShown: number;
  limited: boolean;
};

export function clusterCoverage(holdersTotal: number, groupsFound: number, connectionSourceLimitReached: boolean): ClusterCoverage {
  const connectedHoldersChecked = Math.min(holdersTotal, CLUSTER_HOLDER_SCAN_LIMIT);
  const groupsShown = Math.min(groupsFound, CLUSTER_GROUP_DISPLAY_LIMIT);
  return {
    holdersTotal, connectedHoldersChecked, connectionSourceLimitReached, groupsFound, groupsShown,
    limited: connectedHoldersChecked < holdersTotal || connectionSourceLimitReached || groupsShown < groupsFound,
  };
}
