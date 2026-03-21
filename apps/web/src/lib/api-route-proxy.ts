function joinEncoded(segments: string[]) {
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

function withApiPrefix(path: string) {
  return path.startsWith('/api/') ? path : `/api/${path}`;
}

export function mapWebApiPathToAivApiPath(pathSegments: string[]) {
  if (pathSegments.length === 0) {
    return null;
  }

  const [scope, second, third, ...rest] = pathSegments;

  if (scope === 'auth' || scope === 'explore' || scope === 'model-endpoints' || scope === 'provider-configs' || scope === 'studio') {
    return withApiPrefix(joinEncoded(pathSegments));
  }

  if (scope === 'planner') {
    if (second === 'projects' && third) {
      return withApiPrefix(joinEncoded(['projects', third, 'planner', ...rest]));
    }

    if (second === 'runs' && third) {
      return withApiPrefix(joinEncoded(['runs', third]));
    }

    return withApiPrefix(joinEncoded(pathSegments));
  }

  if (scope === 'creation') {
    if (second === 'projects' && third) {
      if (rest[0] === 'workspace') {
        return withApiPrefix(joinEncoded(['projects', third, 'creation', 'workspace']));
      }

      return withApiPrefix(joinEncoded(['projects', third, ...rest]));
    }

    if (second === 'runs' && third) {
      return withApiPrefix(joinEncoded(['runs', third]));
    }
  }

  if (scope === 'publish' && second === 'projects' && third) {
    return withApiPrefix(joinEncoded(['projects', third, 'publish', ...rest]));
  }

  return null;
}
