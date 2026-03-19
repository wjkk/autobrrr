'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { UsePlannerPageStateResult } from '../hooks/use-planner-page-state';

const PlannerPageContext = createContext<UsePlannerPageStateResult | null>(null);

export function PlannerPageContextProvider(props: {
  value: UsePlannerPageStateResult;
  children: ReactNode;
}) {
  return <PlannerPageContext.Provider value={props.value}>{props.children}</PlannerPageContext.Provider>;
}

export function usePlannerPageContext() {
  const value = useContext(PlannerPageContext);
  if (!value) {
    throw new Error('usePlannerPageContext must be used within PlannerPageContextProvider.');
  }

  return value;
}
