// Eagerly warm route chunks for primary nav — avoids first-click Suspense flash.

const MAIN_PAGE_LOADERS = {
  home: () => import('src/pages/home'),
  learning: () => import('src/pages/learning'),
  workflows: () => import('src/pages/workflows'),
  aiAuditFutures: () => import('src/pages/ai-audit-futures'),
  partnerWithIsca: () => import('src/pages/partner-with-isca'),
  aiForum: () => import('src/pages/ai-forum'),
  announcements: () => import('src/pages/announcements'),
};

export function prefetchMainPages() {
  Object.values(MAIN_PAGE_LOADERS).forEach((load) => {
    void load();
  });
}

export function prefetchMainPage(key) {
  const load = MAIN_PAGE_LOADERS[key];
  if (load) void load();
}
