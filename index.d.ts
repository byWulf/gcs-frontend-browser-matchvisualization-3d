declare namespace GcsFrontendBrowserVisualization {
    export class Visualization {
        constructor(window: Window, sceneContainer: HTMLElement, gameKey: string, gameCommunicationCallback: (methodName: string, elementId: string, data: any) => void);
        destroy(): void;
        handleGameEvent(event: string, data: any): void;
    }
}

declare module "gcs-frontend-browser-visualization" {
    export = GcsFrontendBrowserVisualization;
}