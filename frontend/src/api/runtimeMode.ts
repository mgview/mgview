export const isStaticHosting = import.meta.env?.VITE_MGVIEW_STATIC === 'true';

export const canPersistScenesToServer = !isStaticHosting;
