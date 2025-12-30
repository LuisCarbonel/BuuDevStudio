import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { DEVICE_GATEWAY } from './services/device-gateway/device-gateway';
import { TauriDeviceGateway } from './services/device-gateway/tauri-device.gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: DEVICE_GATEWAY, useFactory: () => new TauriDeviceGateway() },
  ]
};
