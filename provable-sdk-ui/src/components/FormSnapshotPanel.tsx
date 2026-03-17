import React, { useEffect, useMemo, useRef } from 'react';
import { KayrosEnvelope } from 'provable-proof-js';

function buildFormSnapshot(formHtml: string, data: any): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = formHtml;

  const dataKeys = new Set(Object.keys(data || {}));

  container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
    .forEach(element => {
      const name = element.getAttribute('name');
      if (name && dataKeys.has(name)) {
        if (element instanceof HTMLInputElement) {
          if (element.type === 'checkbox' || element.type === 'radio') {
            if (element.hasAttribute('checked')) {
              element.checked = true;
              element.classList.add('kayros-filled');
            }
          } else if (element.type === 'file') {
            if (element.hasAttribute('data-has-files')) {
              element.classList.add('kayros-filled');
            }
          } else if (element.hasAttribute('value') && element.getAttribute('value')) {
            element.classList.add('kayros-filled');
          }
        } else if (element instanceof HTMLTextAreaElement) {
          if (element.textContent && element.textContent.trim()) {
            element.classList.add('kayros-filled');
          }
        } else if (element instanceof HTMLSelectElement) {
          Array.from(element.options).forEach(option => {
            if (option.hasAttribute('selected')) {
              option.selected = true;
            }
          });

          const hasSelected = Array.from(element.options).some(opt => opt.selected);
          if (hasSelected) {
            element.classList.add('kayros-filled');
          }
        }
      }

      element.setAttribute('disabled', 'true');
      element.style.pointerEvents = 'none';
    });

  container.querySelectorAll<HTMLElement>('[role="radio"], [role="checkbox"]').forEach(element => {
    const isChecked = element.getAttribute('aria-checked') === 'true';
    if (isChecked) {
      element.classList.add('kayros-filled');
      element.setAttribute('data-kayros-checked', 'true');
    }
    element.style.pointerEvents = 'none';
  });

  container.querySelectorAll('button').forEach(el => {
    el.setAttribute('disabled', 'true');
    (el as HTMLElement).style.pointerEvents = 'none';
  });

  container.querySelectorAll('script').forEach(script => script.remove());

  const allElements = container.querySelectorAll<HTMLElement>('*');
  allElements.forEach(el => {
    if (el.style.overflow === 'hidden' || el.style.overflow === 'hidden auto') {
      el.style.overflow = 'visible';
    }

    if (el.style.visibility === 'hidden') {
      el.style.visibility = 'visible';
    }

    if (el.style.height && (el.style.height.includes('vh') || el.style.position === 'absolute')) {
      el.style.height = 'auto';
    }

    if (el.style.position === 'absolute' || el.style.position === 'fixed') {
      el.style.position = 'static';
    }
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'pv-form-snapshot-inner';
  wrapper.appendChild(container);
  return wrapper;
}

export function FormSnapshotPanel({ envelope }: { envelope: KayrosEnvelope }) {
  const data = envelope.data as any;
  const formHtml = data?.form?.formHtml as string | undefined;
  const formData = data?.form?.data ?? data?.network?.formData ?? {};
  const pageUrl = data?.pageUrl ?? data?.form?.source ?? data?.network?.url;

  const snapshotData = useMemo(() => {
    if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
      return {};
    }
    return formData;
  }, [formData]);

  const snapshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = snapshotRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!formHtml) {
      container.textContent = 'No form HTML available';
      container.classList.add('pv-empty');
      return;
    }

    const snapshot = buildFormSnapshot(formHtml, snapshotData);
    container.classList.remove('pv-empty');
    container.appendChild(snapshot);
  }, [formHtml, snapshotData]);

  return (
    <section className="pv-section">
      <h2 className="pv-section-title">Provable Form Snapshot</h2>
      {pageUrl && <div className="pv-subtle">{pageUrl}</div>}
      <div className="pv-form-snapshot" ref={snapshotRef} />
    </section>
  );
}
