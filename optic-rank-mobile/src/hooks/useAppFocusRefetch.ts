import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

/**
 * When the app returns to foreground after being backgrounded,
 * invalidate all queries so stale data (from completed analyses) is refreshed.
 */
export function useAppFocusRefetch() {
  const queryClient = useQueryClient();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      // App came back to foreground from background/inactive
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        queryClient.invalidateQueries();
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, [queryClient]);
}
