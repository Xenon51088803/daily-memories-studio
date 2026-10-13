import type { ComponentType } from 'react';

export type StudioExtension = {
  id: string;
  title: string;
  Component: ComponentType<{onDirtyChange:(dirty:boolean)=>void}>;
};
