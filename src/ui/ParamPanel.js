import { DEFAULT_PARAMS, EDGE_COLORS, EDGE_PROFILES, PARAM_RANGE } from '../config.js';

const KEYS = ['width', 'depth', 'height'];

function clamp(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  const snapped = Math.round(value / PARAM_RANGE.step) * PARAM_RANGE.step;
  return Math.min(PARAM_RANGE.max, Math.max(PARAM_RANGE.min, Number(snapped.toFixed(2))));
}

export class ParamPanel {
  constructor(root, onChange) {
    this.onChange = onChange;
    this.values = { ...DEFAULT_PARAMS };
    this.inputs = {};
    this.specs = root.querySelector('#specs');

    for (const key of KEYS) {
      const number = root.querySelector(`#${key}`);
      const range = root.querySelector(`#${key}-range`);
      this.inputs[key] = { number, range };

      range.addEventListener('input', () => this.set(key, parseFloat(range.value)));
      number.addEventListener('change', () => this.set(key, parseFloat(number.value)));
    }

    this.profile = root.querySelector('#profile');
    this.profile.innerHTML = Object.entries(EDGE_PROFILES)
      .map(([id, spec]) => `<option value="${id}">${spec.label}</option>`)
      .join('');
    this.profile.addEventListener('change', () => {
      this.values.profile = this.profile.value;
      this.onChange(this.values);
    });

    this.swatches = root.querySelector('#color');
    this.swatches.innerHTML = Object.entries(EDGE_COLORS)
      .map(([id, preset]) => {
        const level = Math.round(Math.pow(preset.value, 1 / 2.2) * 255);
        return `<button type="button" data-color="${id}" title="${preset.label}" style="--swatch: rgb(${level},${level},${level})"></button>`;
      })
      .join('');
    this.swatches.addEventListener('click', (event) => {
      const button = event.target.closest('[data-color]');
      if (!button) return;
      this.values.color = button.dataset.color;
      this.sync();
      this.onChange(this.values);
    });

    root.querySelector('#reset').addEventListener('click', () => {
      this.values = { ...DEFAULT_PARAMS };
      this.sync();
      this.onChange(this.values);
    });

    this.sync();
  }

  set(key, raw) {
    const value = clamp(raw, this.values[key]);
    this.values[key] = value;
    this.sync();
    this.onChange(this.values);
  }

  sync() {
    for (const key of KEYS) {
      const { number, range } = this.inputs[key];
      const value = this.values[key].toFixed(2);
      if (number.value !== value) number.value = value;
      if (range.value !== value) range.value = value;
    }

    if (this.profile.value !== this.values.profile) this.profile.value = this.values.profile;
    for (const button of this.swatches.querySelectorAll('[data-color]')) {
      button.classList.toggle('is-active', button.dataset.color === this.values.color);
    }
  }

  renderStats(stats) {
    const rows = [
      ['Габарити по колонах', `${this.values.width.toFixed(2)} × ${this.values.depth.toFixed(2)} м`],
      ['Верх даху', `${stats.roofTop.toFixed(2)} м`],
      ['Площа покриття', `${stats.roofArea.toFixed(2)} м²`],
      ['Профіль периметру', EDGE_PROFILES[this.values.profile].label],
      ['Колон', stats.columns],
      ['Крокв', stats.rafters],
      ['Дошок настилу', stats.deckBoards],
      ['Полотен покриття', stats.roofSheets],
      ['Усього деталей', stats.parts]
    ];

    this.specs.innerHTML = rows
      .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
      .join('');
  }
}
