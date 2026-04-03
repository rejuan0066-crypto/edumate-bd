import { createContext, useContext, type ReactNode } from 'react';

const EmbeddedContext = createContext(false);

export const EmbeddedProvider = ({ children }: { children: ReactNode }) => (
  <EmbeddedContext.Provider value={true}>{children}</EmbeddedContext.Provider>
);

export const useIsEmbedded = () => useContext(EmbeddedContext);
