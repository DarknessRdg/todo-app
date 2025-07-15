import { createContext, useContext } from "react";
import { Container } from "inversify";

export const ContainerContext = createContext<Container | null>(null);

export function useContainer(): Container {
  const container = useContext(ContainerContext);
  if (container === null) {
    throw new Error(
      "Required ContainerContext is not provided. Did you miss to use <ContainerContext.Provider value={}> ?"
    );
  }

  return container;
}
