export const paths = {
  home: '/',
  auth: { signIn: '/auth/sign-in'},
  dashboard: {
    dashboard: '/dashboard',
    queryLog: '/dashboard/query-log',
    upstreamServers: '/dashboard/upstream-servers',
    clients: '/dashboard/clients',
    settings: '/dashboard/settings',
    geosite: '/dashboard/geosite',
    ruleChecker: '/dashboard/rule-checker',
    log: '/dashboard/log',
    term: '/dashboard/term',
  },
  errors: { notFound: '/errors/not-found' },
} as const;
