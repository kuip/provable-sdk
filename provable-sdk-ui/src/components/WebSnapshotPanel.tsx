import React, { useMemo, useState } from 'react';
import { KayrosEnvelope } from 'provable-sdk-js';

export function WebSnapshotPanel({ envelope }: { envelope: KayrosEnvelope }) {
  const data = envelope.data as any;
  const meta = data?.meta?.value;
  const screenshot = data?.screenshot?.value as string | undefined;
  const outerHtml = data?.outerHTML?.value as string | undefined;
  const serverHtml = data?.serverHTML?.value;

  const [activeTab, setActiveTab] = useState('outerHTML');

  const serverHtmlContent = useMemo(() => {
    if (!serverHtml) {
      return '';
    }
    const body = serverHtml.body ?? '';
    if (serverHtml.base64Encoded) {
      try {
        return atob(body);
      } catch {
        return '';
      }
    }
    return body;
  }, [serverHtml]);

  const dataSources = useMemo(() => {
    if (!data || typeof data !== 'object') {
      return [];
    }

    return Object.entries(data)
      .filter(([, value]) => value && typeof value === 'object' && 'hash' in value)
      .map(([key, value]) => ({ key, hash: (value as any).hash }))
      .filter(entry => entry.hash);
  }, [data]);

  const sourceDescriptions: Record<string, string> = {
    meta: 'Metadata (URL, timestamp, proof level)',
    screenshot: 'Page screenshot (PNG)',
    outerHTML: 'Final rendered DOM (document.documentElement.outerHTML)',
    serverHTML: 'Server HTML response (no JS)',
    scripts: 'Detected scripts',
    networkRequests: 'Network requests'
  };

  const tabs = [
    { key: 'outerHTML', label: 'Final HTML', enabled: Boolean(outerHtml) },
    { key: 'serverHTML', label: 'Server HTML', enabled: Boolean(serverHtmlContent) },
    { key: 'screenshot', label: 'Screenshot', enabled: Boolean(screenshot) }
  ].filter(tab => tab.enabled);

  return (
    <section className="pv-section">
      <h2 className="pv-section-title">Provable Web Snapshot</h2>
      {meta?.url && <div className="pv-subtle">{meta.url}</div>}

      {meta && (
        <div className="pv-meta-grid">
          <div className="pv-meta-item">
            <div className="pv-label">URL</div>
            <div className="pv-value">{meta.url || 'N/A'}</div>
          </div>
          <div className="pv-meta-item">
            <div className="pv-label">Captured At</div>
            <div className="pv-value">
              {meta.capturedAt ? new Date(meta.capturedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
          <div className="pv-meta-item">
            <div className="pv-label">Proof Level</div>
            <div className="pv-value">{meta.proofLevel ?? 'N/A'}</div>
          </div>
          <div className="pv-meta-item">
            <div className="pv-label">Hash Algorithm</div>
            <div className="pv-value">{envelope.kayros.hashAlgorithm || 'sha256'}</div>
          </div>
        </div>
      )}

      {tabs.length > 0 && (
        <div className="pv-tabs">
          <div className="pv-tab-list">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`pv-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="pv-tab-panel">
            {activeTab === 'outerHTML' && outerHtml && (
              <iframe className="pv-snapshot-frame" sandbox="allow-scripts allow-same-origin" srcDoc={outerHtml} />
            )}
            {activeTab === 'serverHTML' && serverHtmlContent && (
              <iframe className="pv-snapshot-frame" sandbox="allow-scripts allow-same-origin" srcDoc={serverHtmlContent} />
            )}
            {activeTab === 'screenshot' && screenshot && (
              <img className="pv-snapshot-image" src={screenshot} alt="Page screenshot" />
            )}
          </div>
        </div>
      )}

      {dataSources.length > 0 && (
        <div className="pv-data-sources">
          <h3 className="pv-section-subtitle">Data Sources & Hashes</h3>
          {dataSources.map(source => (
            <div key={source.key} className="pv-data-source">
              <div className="pv-data-source-title">
                {sourceDescriptions[source.key] || source.key}
              </div>
              <div className="pv-hash">{source.hash}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
