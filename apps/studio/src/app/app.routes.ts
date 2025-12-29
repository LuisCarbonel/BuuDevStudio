import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'editor' },
      {
        path: 'editor',
        loadComponent: () => import('./features/editor/editor.page').then(m => m.EditorPage),
      },
      {
        path: 'firmware',
        loadComponent: () => import('./features/firmware/firmware.page').then(m => m.FirmwarePage),
      },
      {
        path: 'recorder',
        loadComponent: () => import('./features/recorder/recorder.page').then(m => m.RecorderPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
