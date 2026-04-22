const STATIC_ROUTES = [
  { name: 'home', path: '/home' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'providerdashboard', path: '/provider/dashboard' },
  { name: 'providereditprofile', path: '/provider/profile/edit' },
  { name: 'admindashboard', path: '/admin/dashboard' },
];

const DYNAMIC_PATTERNS = [
  {
    pattern: /^\/providers\/(\d+)$/,
    mapMatch: (match) => ({ name: 'providerdetail', providerId: Number(match[1]) }),
  },
  {
    pattern: /^\/providers\/(\d+)\/request$/,
    mapMatch: (match) => ({ name: 'solicitudform', providerId: Number(match[1]) }),
  },
  {
    pattern: /^\/chat\/(\d+)$/,
    mapMatch: (match, search) => ({
      name: 'chat',
      chatWithUserId: Number(match[1]),
      chatWithName: new URLSearchParams(search).get('name') || '',
    }),
  },
];

export const normalizePathname = (pathname = '/') => {
  if (!pathname || pathname === '/') return '/';
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
};

export const joinBasePath = (basePath = '', path = '') => {
  const normalizedBase = normalizePathname(basePath);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!normalizedBase || normalizedBase === '/') {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
};

export const stripBasePath = (pathname = '/', basePath = '') => {
  const normalizedPath = normalizePathname(pathname);
  if (!basePath) return normalizedPath;
  if (normalizedPath === basePath) return '/';
  if (normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath.slice(basePath.length) || '/';
  }
  return normalizedPath;
};

export const getBasePath = (pathname = '/') => {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/') return '';

  const staticMatch = STATIC_ROUTES.find((route) => normalizedPath.endsWith(route.path));
  if (staticMatch) {
    return normalizedPath.slice(0, normalizedPath.length - staticMatch.path.length);
  }

  for (const route of DYNAMIC_PATTERNS) {
    const match = normalizedPath.match(new RegExp(`^(.+)${route.pattern.source.slice(1)}`));
    if (match) {
      return match[1];
    }
  }

  return '';
};

export const parseRoute = (pathname, search = '', basePath = '') => {
  const normalizedPath = stripBasePath(pathname, basePath);

  if (normalizedPath === '/') {
    return { name: 'root' };
  }

  const staticRoute = STATIC_ROUTES.find((route) => route.path === normalizedPath);
  if (staticRoute) {
    return { name: staticRoute.name };
  }

  for (const route of DYNAMIC_PATTERNS) {
    const match = normalizedPath.match(route.pattern);
    if (match) {
      return route.mapMatch(match, search);
    }
  }

  return { name: 'notfound' };
};

export const parseRouteFromPath = (path, basePath = '') => {
  const url = new URL(path, 'http://localhost');
  return parseRoute(url.pathname, url.search, basePath);
};

export const getCurrentRoute = (basePath = '') => {
  if (typeof window === 'undefined') return { name: 'home' };
  return parseRoute(window.location.pathname, window.location.search, basePath);
};

export const buildAppPath = (name, params = {}, basePath = '') => {
  const routeName = String(name || 'home').toLowerCase();

  const staticRoute = STATIC_ROUTES.find((route) => route.name === routeName);
  if (staticRoute) {
    return joinBasePath(basePath, staticRoute.path);
  }

  if (routeName === 'providerdetail') {
    const providerId = params.provider?.id || params.selectedProvider?.id || params.providerId;
    return providerId
      ? joinBasePath(basePath, `/providers/${providerId}`)
      : joinBasePath(basePath, '/home');
  }

  if (routeName === 'solicitudform') {
    const providerId = params.provider?.id || params.selectedProvider?.id || params.providerId;
    return providerId
      ? joinBasePath(basePath, `/providers/${providerId}/request`)
      : joinBasePath(basePath, '/home');
  }

  if (routeName === 'chat') {
    const chatWithUserId = params.chatWithUserId || params.userId;
    if (!chatWithUserId) return joinBasePath(basePath, '/home');

    const query = new URLSearchParams();
    if (params.chatWithName) {
      query.set('name', params.chatWithName);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return `${joinBasePath(basePath, `/chat/${chatWithUserId}`)}${suffix}`;
  }

  return joinBasePath(basePath, '/home');
};
