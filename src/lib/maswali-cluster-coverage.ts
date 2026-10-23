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

/**
 * MASWALI-BUILD S6-INT · the same disclosure for a report that read every holder and carries every line (the S6 data
 * lane's cluster report: no cap, a crowded place reported on a line of its own, a long line paged from its row) — so
 * the integrity page's one disclosure says, truthfully, that nothing was left out. `linesFound` counts the report's
 * lines (groups and crowded lines); each is carried, so every one is "shown".
 */
export function wholeReadCoverage(holdersTotal: number, linesFound: number): ClusterCoverage {
  return {
    holdersTotal, connectedHoldersChecked: holdersTotal, connectionSourceLimitReached: false,
    groupsFound: linesFound, groupsShown: linesFound, limited: false,
  };
}
