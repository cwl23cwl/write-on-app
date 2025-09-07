import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";

export type ExcalidrawAPI = ExcalidrawImperativeAPI;
export type ExcalidrawComponentProps = ExcalidrawProps;

export interface SceneData {
  elements: ReadonlyArray<unknown>;
  appState?: Record<string, unknown>;
}

export interface BridgeHandlers {
  onApiReady: (api: ExcalidrawAPI | null) => void;
}

