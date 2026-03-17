import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProofViewer } from './components/ProofViewer';
import './styles.css';
import { KayrosEnvelope } from '@kuip/provable-proof';

export function mountProofViewer(
  element: HTMLElement,
  options: {
    envelope: KayrosEnvelope;
    theme?: string;
    showRemoteRecord?: boolean;
  }
) {
  const root = createRoot(element);
  root.render(
    <ProofViewer
      envelope={options.envelope}
      theme={options.theme}
      showRemoteRecord={options.showRemoteRecord}
    />
  );

  return () => root.unmount();
}

if (typeof window !== 'undefined') {
  window.ProvableSdkUi = {
    mountProofViewer
  };
}

declare global {
  interface Window {
    ProvableSdkUi?: {
      mountProofViewer: typeof mountProofViewer;
    };
  }
}
