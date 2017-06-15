declare namespace GcsFrontendBrowserVisualization {
    export class Visualization {
        constructor(window: Window, sceneContainer: HTMLElement, gameKey: string, gameCommunicationCallback: (methodName: string, elementId: string, data: any) => void, slots: any, ownUser: any);
        destroy(): void;
        handleGameEvent(event: string, data: any): void;
        handleSlotEvent(slots: any, ownUser: any): void;
        elements: any;
    }
}

declare module "gcs-frontend-browser-matchvisualization-3d" {
    export = GcsFrontendBrowserVisualization;
}