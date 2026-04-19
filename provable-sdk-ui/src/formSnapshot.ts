export type FormSnapshotData = Record<string, unknown>;

const toValueSet = (value: unknown): Set<string> => {
  if (Array.isArray(value)) {
    return new Set(value.map(item => String(item)));
  }
  if (value === undefined || value === null) {
    return new Set();
  }
  return new Set([String(value)]);
};

const inputValueMatches = (input: HTMLInputElement, value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  const values = toValueSet(value);
  return values.has(input.value) || values.has(input.getAttribute('value') ?? '');
};

export const getNetworkFormData = (network: unknown): unknown => {
  if (Array.isArray(network)) {
    return network.find(entry => entry && typeof entry === 'object' && 'formData' in entry)?.formData;
  }
  if (network && typeof network === 'object' && 'formData' in network) {
    return network.formData;
  }
  return undefined;
};

export const createFormSnapshotElement = (formHtml: string, data: FormSnapshotData = {}): HTMLElement => {
  const container = document.createElement('div');
  container.innerHTML = formHtml;

  const dataKeys = new Set(Object.keys(data));

  container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
    .forEach(element => {
      const name = element.getAttribute('name');

      if (name && dataKeys.has(name)) {
        const value = data[name];

        if (element instanceof HTMLInputElement) {
          if (element.type === 'checkbox' || element.type === 'radio') {
            const checked = inputValueMatches(element, value);
            if (checked) {
              element.classList.add('kayros-filled');
            }
            element.checked = checked;
            element.toggleAttribute('checked', checked);
          } else if (element.type === 'file') {
            if (element.hasAttribute('data-has-files')) {
              element.classList.add('kayros-filled');
              if (value && typeof value === 'object' && 'fileName' in value) {
                const fileInfo = value as { fileName: string; size?: number };
                const size = typeof fileInfo.size === 'number' ? ` (${fileInfo.size} bytes)` : '';
                element.title = `${fileInfo.fileName}${size}`;
              }
            }
          } else if (value !== undefined && value !== null) {
            element.value = String(value);
            element.setAttribute('value', String(value));
            element.classList.add('kayros-filled');
          }
        } else if (element instanceof HTMLTextAreaElement) {
          if (value !== undefined && value !== null) {
            element.value = String(value);
            element.textContent = String(value);
            element.classList.add('kayros-filled');
          }
        } else if (element instanceof HTMLSelectElement) {
          const selectedValues = toValueSet(value);
          Array.from(element.options).forEach(option => {
            const selected = selectedValues.has(option.value) || selectedValues.has(option.text);
            option.selected = selected;
            option.toggleAttribute('selected', selected);
          });

          if (Array.from(element.options).some(option => option.selected)) {
            element.classList.add('kayros-filled');
          }
        }
      }

      element.setAttribute('disabled', 'true');
      element.style.pointerEvents = 'none';
    });

  container.querySelectorAll<HTMLElement>('[role="radio"], [role="checkbox"]').forEach(element => {
    if (element.getAttribute('aria-checked') === 'true') {
      element.classList.add('kayros-filled');
      element.setAttribute('data-kayros-checked', 'true');
    }
    element.style.pointerEvents = 'none';
  });

  container.querySelectorAll('button').forEach(element => {
    element.setAttribute('disabled', 'true');
    (element as HTMLElement).style.pointerEvents = 'none';
  });

  container.querySelectorAll('script').forEach(script => script.remove());

  container.querySelectorAll<HTMLElement>('*').forEach(element => {
    element.style.maxWidth = '100%';

    if (element.style.overflow === 'hidden' || element.style.overflow === 'hidden auto') {
      element.style.overflow = 'visible';
    }
    if (element.style.visibility === 'hidden') {
      element.style.visibility = 'visible';
    }
    if (element.style.height && (element.style.height.includes('vh') || element.style.position === 'absolute')) {
      element.style.height = 'auto';
    }
    if (element.style.position === 'absolute' || element.style.position === 'fixed') {
      element.style.position = 'static';
    }
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'pv-form-snapshot-inner';
  wrapper.appendChild(container);
  return wrapper;
};
