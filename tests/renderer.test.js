// Renderer animation regression tests.
// Run with: node tests/renderer.test.js

class ClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach(name => this.values.add(name));
  }

  remove(...names) {
    names.forEach(name => this.values.delete(name));
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.values.has(name) : Boolean(force);
    if (shouldAdd) this.values.add(name);
    else this.values.delete(name);
    return shouldAdd;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class Fragment {
  constructor() {
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
  }
}

class Element {
  constructor(tagName = 'div') {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.classList = new ClassList();
    this.textContent = '';
    this.hidden = false;
    this.tabIndex = -1;
    this.offsetWidth = 0;
  }

  get className() {
    return [...this.classList.values].join(' ');
  }

  set className(value) {
    this.classList = new ClassList();
    String(value).split(/\s+/).filter(Boolean).forEach(name => this.classList.add(name));
  }

  set textContent(value) {
    this._text = String(value);
    if (value === '') this.children = [];
  }

  get textContent() {
    return this._text || '';
  }

  appendChild(child) {
    if (child instanceof Fragment) {
      child.children.forEach(item => this.appendChild(item));
      return child;
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  querySelectorAll(selector) {
    const className = selector.startsWith('.') ? selector.slice(1) : null;
    const result = [];
    const walk = element => {
      for (const child of element.children) {
        if (!className || child.classList.contains(className)) result.push(child);
        walk(child);
      }
    };
    walk(this);
    return result;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

const elements = {
  board: new Element('div'),
  numpad: new Element('div'),
  errors: new Element('div'),
  'error-count': new Element('span'),
  timer: new Element('span')
};

global.SudokuConstants = require('../js/constants.js');
global.document = {
  getElementById(id) {
    return elements[id] || null;
  },
  createElement(tagName) {
    return new Element(tagName);
  },
  createDocumentFragment() {
    return new Fragment();
  }
};

const SudokuRenderer = require('../js/renderer.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hasFlash(row, col) {
  return SudokuRenderer.getCellElement(row, col).classList.contains('complete-flash');
}

console.log('🧪 Sudoku Renderer Tests');
console.log('='.repeat(50));

(async () => {
  SudokuRenderer.init();

  assert(SudokuRenderer.getCellElement(0, 0) !== null, 'Board cells are built');
  assert(SudokuRenderer.getCellElement(8, 8) !== null, 'All 81 cells are available');

  console.log('\n📋 Sequential completions');
  SudokuRenderer.animateCompletion(0, 0, { row: true });
  assert(hasFlash(0, 0) && hasFlash(0, 8), 'First completed row flashes');

  await sleep(200);
  SudokuRenderer.animateCompletion(1, 1, { row: true });
  assert(hasFlash(1, 0) && hasFlash(1, 8), 'Second completed row flashes');
  assert(hasFlash(0, 0), 'First row is still flashing during the second animation');

  await sleep(550);
  assert(!hasFlash(0, 0) && !hasFlash(0, 8), 'First row clears on its own timer');
  assert(hasFlash(1, 0) && hasFlash(1, 8), 'Second row remains flashing');

  await sleep(300);
  assert(!hasFlash(1, 0) && !hasFlash(1, 8), 'Second row clears on its own timer');

  console.log('\n📋 Hint and completion overlap');
  SudokuRenderer.flashCell(2, 2);
  assert(hasFlash(2, 2), 'Hint cell flashes');

  await sleep(100);
  SudokuRenderer.animateCompletion(2, 0, { row: true });
  assert(hasFlash(2, 2), 'Row completion includes the hinted cell');

  await sleep(750);
  assert(!hasFlash(2, 2), 'Overlapping hint and completion clear together');

  console.log('\n📋 Reset');
  SudokuRenderer.animateCompletion(3, 3, { row: true, col: true });
  assert(hasFlash(3, 3), 'Row/column completion flashes');
  SudokuRenderer.resetAnimations();
  assert(!hasFlash(3, 3) && !hasFlash(3, 0) && !hasFlash(0, 3),
    'Reset clears every completion flash');

  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);

  if (failed > 0) process.exit(1);
  console.log('\n🎉 All renderer tests passed!');
})();
