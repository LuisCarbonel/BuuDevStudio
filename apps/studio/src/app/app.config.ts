import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideNzIcons } from 'ng-zorro-antd/icon';

import { routes } from './app.routes';
import { DEVICE_GATEWAY } from '@core/gateways/device-gateway/device-gateway';
import { TauriDeviceGateway } from '@core/gateways/device-gateway/tauri-device.gateway';
import { APP_ICONS } from '@shared/icons/app-icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    provideNzIcons(APP_ICONS),
    { provide: DEVICE_GATEWAY, useFactory: () => new TauriDeviceGateway() },
  ]
};
