import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { AppstoreOutline, UsbOutline, SoundOutline, PushpinOutline, PushpinFill, SettingOutline } from '@ant-design/icons-angular/icons';

import { routes } from './app.routes';
import { DEVICE_GATEWAY } from '@core/gateways/device-gateway/device-gateway';
import { TauriDeviceGateway } from '@core/gateways/device-gateway/tauri-device.gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideNzIcons([AppstoreOutline, UsbOutline, SoundOutline, PushpinOutline, PushpinFill, SettingOutline]),
    { provide: DEVICE_GATEWAY, useFactory: () => new TauriDeviceGateway() },
  ]
};
