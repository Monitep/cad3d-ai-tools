import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../cad3d-live/payload/assets/', import.meta.url);
const site = fs.readFileSync(new URL('site-performance-v1.js', root), 'utf8');
const media = fs.readFileSync(new URL('media-performance-v1.js', root), 'utf8');

// Execute the actual module with GSAP present: critical copy must never be hidden.
const calls = [];
const gsap = {
  registerPlugin() {},
  matchMedia: () => ({add: (_query, callback) => callback()}),
  from: (selector, options) => calls.push([selector, options]),
  to: (selector, options) => calls.push([selector, options]),
  timeline() { throw new Error('An entrance timeline was started before first paint'); },
};
const button = {addEventListener() {}};
const dialog = {querySelector: () => button, addEventListener() {}};
const document = {
  documentElement: {lang: 'it'}, body: {dataset: {assets: '/assets/'}},
  querySelector: selector => selector === '.hero' ? {} : selector === '.lightbox' ? dialog : selector === '.lightbox-close' ? button : null,
  querySelectorAll: () => [], addEventListener() {},
  fonts: {ready: Promise.resolve()},
};
const ScrollTrigger = {refresh() {}};
vm.runInNewContext(site, {document, window: {gsap, ScrollTrigger}, gsap, ScrollTrigger,
  matchMedia: () => ({matches: false}), console});
assert(!calls.some(([selector, options]) => selector.includes('.hero') &&
  (options.autoAlpha === 0 || options.opacity === 0)), 'Critical home content was hidden');

function fixture() {
  const resources = [], observers = [], handlers = {}, sceneButtons = [];
  const node = (dataset = {}) => ({dataset, hidden: false, textContent: '',
    classList: {toggle() {}}, setAttribute() {},
    addEventListener(event, callback) { this.events ??= {}; this.events[event] = callback; }});
  const surface = node(), fallback = node(), status = node(), controls = node(), hint = node();
  surface.querySelector = () => null;
  const plus = node({pano: 'plus'});
  for (const id of ['terrace', 'pool']) sceneButtons.push(node({panoramaSelect: id}));
  const wrapper = {querySelectorAll: () => sceneButtons};
  const map = {'.panorama-surface': surface, '.panorama-fallback': fallback,
    '.pano-status': status, '.panorama-controls': controls, '.panorama-hint': hint};
  const container = {...node({panoramaScene: 'pool'}), closest: () => wrapper,
    querySelector: selector => map[selector], querySelectorAll: () => [plus]};
  const doc = {documentElement: {lang: 'it'}, body: {dataset: {assets: '/assets/'}},
    querySelectorAll: selector => selector === '.panorama' ? [container] : [],
    addEventListener() {}, head: {append: node => resources.push(node)},
    createElement: tag => ({tag, remove() { this.removed = true; }})};
  let creations = 0, zoom = null, loadedScene = null;
  const viewer = {on: (event, callback) => {handlers[event] = callback;},
    getHfov: () => 100, setHfov: value => {zoom = value;},
    getScene: () => 'pool', loadScene: id => {loadedScene = id;}, resize() {}};
  const api = {viewer: () => {creations++; return viewer;}};
  const sandbox = {document: doc, window: {}, matchMedia: () => ({matches: false}), console,
    ResizeObserver: class {observe() {}},
    IntersectionObserver: class {
      constructor(callback) {this.callback = callback; observers.push(this);}
      observe() {} disconnect() {}
    }};
  vm.runInNewContext(media, sandbox);
  return {resources, observers, plus, sceneButtons, fallback, status, controls, container,
    handlers, sandbox, api, get creations() {return creations;}, get zoom() {return zoom;},
    get loadedScene() {return loadedScene;}};
}

const f = fixture();
assert.equal(f.resources.length, 0, 'Panorama dependencies fetched at page startup');
f.observers[0].callback([{isIntersecting: true}]);
assert.equal(f.resources.length, 2, 'Expected one stylesheet and one script near viewport');
// A control clicked while the dependencies are still loading must await the same start.
const click = f.plus.events.click();
assert.equal(f.resources.length, 2, 'Concurrent initialization fetched duplicate dependencies');
f.sandbox.window.pannellum = f.api;
f.sandbox.pannellum = f.api;
f.resources[0].onload(); f.resources[1].onload();
await click;
assert.equal(f.creations, 1);
assert.equal(f.zoom, 85, 'Pending zoom action was lost while dependencies loaded');
f.handlers.load();
assert.equal(f.container.dataset.panoramaReady, 'true');
assert.equal(f.fallback.hidden, true);
f.sceneButtons[0].events.click();
assert.equal(f.loadedScene, 'terrace');
assert.equal(f.container.dataset.panoramaScene, 'terrace');

const failed = fixture();
failed.observers[0].callback([{isIntersecting: true}]);
const pending = failed.plus.events.click();
failed.resources[0].onload(); failed.resources[1].onerror();
await pending;
assert.equal(failed.creations, 0);
assert.equal(failed.fallback.hidden, false, 'Network failure removed the fallback image');
assert.equal(failed.controls.hidden, true);
assert(failed.status.textContent.includes('non disponibile'));
console.log('Home performance: critical copy, deferred loading, concurrency, controls, scene change and error fallback passed.');
