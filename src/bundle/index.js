(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var user = window.Polymer || {};
var parts = location.search.slice(1).split('&');
for (var i = 0, o; i < parts.length && (o = parts[i]); i++) {
o = o.split('=');
o[0] && (user[o[0]] = o[1] || true);
}
var wantShadow = user.dom === 'shadow';
var hasShadow = Boolean(Element.prototype.createShadowRoot);
var nativeShadow = hasShadow && !window.ShadowDOMPolyfill;
var useShadow = wantShadow && hasShadow;
var hasNativeImports = Boolean('import' in document.createElement('link'));
var useNativeImports = hasNativeImports;
var useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
var usePolyfillProto = !useNativeCustomElements && !Object.__proto__;
return {
wantShadow: wantShadow,
hasShadow: hasShadow,
nativeShadow: nativeShadow,
useShadow: useShadow,
useNativeShadow: useShadow && nativeShadow,
useNativeImports: useNativeImports,
useNativeCustomElements: useNativeCustomElements,
usePolyfillProto: usePolyfillProto
};
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
for (var i = 0; i < this._callbacks.length; i++) {
this._callbacks[i]();
}
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
},
_afterNextRenderQueue: [],
_waitingNextRender: false,
afterNextRender: function (element, fn, args) {
this._watchNextRender();
this._afterNextRenderQueue.push([
element,
fn,
args
]);
},
_watchNextRender: function () {
if (!this._waitingNextRender) {
this._waitingNextRender = true;
var fn = function () {
Polymer.RenderStatus._flushNextRender();
};
if (!this._ready) {
this.whenReady(fn);
} else {
requestAnimationFrame(fn);
}
}
},
_flushNextRender: function () {
var self = this;
setTimeout(function () {
self._flushRenderCallbacks(self._afterNextRenderQueue);
self._afterNextRenderQueue = [];
self._waitingNextRender = false;
});
},
_flushRenderCallbacks: function (callbacks) {
for (var i = 0, h; i < callbacks.length; i++) {
h = callbacks[i];
h[1].apply(h[0], h[2] || Polymer.nar);
}
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
this._doBehavior('registered');
},
createdCallback: function () {
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
attachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = true;
self._doBehavior('attached');
});
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name, oldValue, newValue) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', [
name,
oldValue,
newValue
]);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
var n$ = Object.getOwnPropertyNames(api);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
this.copyOwnProperty(n, api, prototype);
}
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDomModulesUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDomModulesUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
var modules = doc.querySelectorAll('dom-module');
for (var i = modules.length - 1, m; i >= 0 && (m = modules[i]); i--) {
if (m.__upgraded__) {
return;
} else {
CustomElements.upgrade(m);
}
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
var behaviorSet = [];
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
var b = behaviors[i];
if (behaviorSet.indexOf(b) === -1) {
this._mixinBehavior(b);
behaviorSet.unshift(b);
}
}
return behaviorSet;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
for (var i = 0; i < behaviors.length; i++) {
var b = behaviors[i];
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}
return flat;
},
_mixinBehavior: function (b) {
var n$ = Object.getOwnPropertyNames(b);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
if (!Polymer.Base._behaviorProperties[n] && !this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
}
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
for (var i = 0; i < this.behaviors.length; i++) {
this._invokeBehavior(this.behaviors[i], name, args);
}
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
for (var i = 0; i < this.behaviors.length; i++) {
this._marshalBehavior(this.behaviors[i]);
}
this._marshalBehavior(this);
}
});
Polymer.Base._behaviorProperties = {
hostAttributes: true,
beforeRegister: true,
registered: true,
properties: true,
observers: true,
listeners: true,
created: true,
attached: true,
detached: true,
attributeChanged: true,
ready: true
};
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
for (var i = 0; i < this.behaviors.length; i++) {
info = this._getPropertyInfo(property, this.behaviors[i].properties);
if (info) {
return info;
}
}
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
},
_prepPropertyInfo: function () {
this._propertyInfo = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._addPropertyInfo(this._propertyInfo, this.behaviors[i].properties);
}
this._addPropertyInfo(this._propertyInfo, this.properties);
this._addPropertyInfo(this._propertyInfo, this._propertyEffects);
},
_addPropertyInfo: function (target, source) {
if (source) {
var t, s;
for (var i in source) {
t = target[i];
s = source[i];
if (i[0] === '_' && !s.readOnly) {
continue;
}
if (!target[i]) {
target[i] = {
type: typeof s === 'function' ? s : s.type,
readOnly: s.readOnly,
attribute: Polymer.CaseMap.camelToDashCase(i)
};
} else {
if (!t.type) {
t.type = s.type;
}
if (!t.readOnly) {
t.readOnly = s.readOnly;
}
}
}
}
}
});
Polymer.CaseMap = {
_caseMap: {},
_rx: {
dashToCamel: /-[a-z]/g,
camelToDash: /([A-Z])/g
},
dashToCamelCase: function (dash) {
return this._caseMap[dash] || (this._caseMap[dash] = dash.indexOf('-') < 0 ? dash : dash.replace(this._rx.dashToCamel, function (m) {
return m[1].toUpperCase();
}));
},
camelToDashCase: function (camel) {
return this._caseMap[camel] || (this._caseMap[camel] = camel.replace(this._rx.camelToDash, '-$1').toLowerCase());
}
};
Polymer.Base._addFeature({
_addHostAttributes: function (attributes) {
if (!this._aggregatedAttributes) {
this._aggregatedAttributes = {};
}
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
if (this._aggregatedAttributes) {
this._applyAttributes(this, this._aggregatedAttributes);
}
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
var v = attr$[n];
this.serializeValueToAttribute(v, n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
if (this.hasAttributes()) {
for (var i in this._propertyInfo) {
var info = this._propertyInfo[i];
if (this.hasAttribute(info.attribute)) {
this._setAttributeToProperty(model, info.attribute, i, info);
}
}
}
},
_setAttributeToProperty: function (model, attribute, property, info) {
if (!this._serializing) {
property = property || Polymer.CaseMap.dashToCamelCase(attribute);
info = info || this._propertyInfo && this._propertyInfo[property];
if (info && !info.readOnly) {
var v = this.getAttribute(attribute);
model[property] = this.deserialize(v, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (property, attribute, value) {
this._serializing = true;
value = value === undefined ? this[property] : value;
this.serializeValueToAttribute(value, attribute || Polymer.CaseMap.camelToDashCase(property));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
node = node || this;
if (str === undefined) {
node.removeAttribute(attribute);
} else {
node.setAttribute(attribute, str);
}
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value != null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value.toString();
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.version = '1.3.1';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
if (this._template === undefined) {
this._template = Polymer.DomModule.import(this.is, 'template');
}
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(this._template);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_registerHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._clients = null;
this._clientsReadied = false;
},
_beginHosting: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_endHosting: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
this._readied = false;
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
if (this._template) {
this._setupRoot();
this._readyClients();
}
this._clientsReadied = true;
this._clients = null;
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
if (c$) {
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
}
this._finishDistribute();
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (i = 1; i < rowCount; i++) {
for (j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
(function () {
'use strict';
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeAppendChild = Element.prototype.appendChild;
var nativeRemoveChild = Element.prototype.removeChild;
Polymer.TreeApi = {
arrayCopyChildNodes: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstChild; n; n = n.nextSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopyChildren: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopy: function (a$) {
var l = a$.length;
var copy = new Array(l);
for (var i = 0; i < l; i++) {
copy[i] = a$[i];
}
return copy;
}
};
Polymer.TreeApi.Logical = {
hasParentNode: function (node) {
return Boolean(node.__dom && node.__dom.parentNode);
},
hasChildNodes: function (node) {
return Boolean(node.__dom && node.__dom.childNodes !== undefined);
},
getChildNodes: function (node) {
return this.hasChildNodes(node) ? this._getChildNodes(node) : node.childNodes;
},
_getChildNodes: function (node) {
if (!node.__dom.childNodes) {
node.__dom.childNodes = [];
for (var n = node.__dom.firstChild; n; n = n.__dom.nextSibling) {
node.__dom.childNodes.push(n);
}
}
return node.__dom.childNodes;
},
getParentNode: function (node) {
return node.__dom && node.__dom.parentNode !== undefined ? node.__dom.parentNode : node.parentNode;
},
getFirstChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? node.__dom.firstChild : node.firstChild;
},
getLastChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? node.__dom.lastChild : node.lastChild;
},
getNextSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? node.__dom.nextSibling : node.nextSibling;
},
getPreviousSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? node.__dom.previousSibling : node.previousSibling;
},
getFirstElementChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? this._getFirstElementChild(node) : node.firstElementChild;
},
_getFirstElementChild: function (node) {
var n = node.__dom.firstChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getLastElementChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? this._getLastElementChild(node) : node.lastElementChild;
},
_getLastElementChild: function (node) {
var n = node.__dom.lastChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
getNextElementSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? this._getNextElementSibling(node) : node.nextElementSibling;
},
_getNextElementSibling: function (node) {
var n = node.__dom.nextSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getPreviousElementSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? this._getPreviousElementSibling(node) : node.previousElementSibling;
},
_getPreviousElementSibling: function (node) {
var n = node.__dom.previousSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
saveChildNodes: function (node) {
if (!this.hasChildNodes(node)) {
node.__dom = node.__dom || {};
node.__dom.firstChild = node.firstChild;
node.__dom.lastChild = node.lastChild;
node.__dom.childNodes = [];
for (var n = node.firstChild; n; n = n.nextSibling) {
n.__dom = n.__dom || {};
n.__dom.parentNode = node;
node.__dom.childNodes.push(n);
n.__dom.nextSibling = n.nextSibling;
n.__dom.previousSibling = n.previousSibling;
}
}
},
recordInsertBefore: function (node, container, ref_node) {
container.__dom.childNodes = null;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
for (var n = node.firstChild; n; n = n.nextSibling) {
this._linkNode(n, container, ref_node);
}
} else {
this._linkNode(node, container, ref_node);
}
},
_linkNode: function (node, container, ref_node) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (ref_node) {
ref_node.__dom = ref_node.__dom || {};
}
node.__dom.previousSibling = ref_node ? ref_node.__dom.previousSibling : container.__dom.lastChild;
if (node.__dom.previousSibling) {
node.__dom.previousSibling.__dom.nextSibling = node;
}
node.__dom.nextSibling = ref_node;
if (node.__dom.nextSibling) {
node.__dom.nextSibling.__dom.previousSibling = node;
}
node.__dom.parentNode = container;
if (ref_node) {
if (ref_node === container.__dom.firstChild) {
container.__dom.firstChild = node;
}
} else {
container.__dom.lastChild = node;
if (!container.__dom.firstChild) {
container.__dom.firstChild = node;
}
}
container.__dom.childNodes = null;
},
recordRemoveChild: function (node, container) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (node === container.__dom.firstChild) {
container.__dom.firstChild = node.__dom.nextSibling;
}
if (node === container.__dom.lastChild) {
container.__dom.lastChild = node.__dom.previousSibling;
}
var p = node.__dom.previousSibling;
var n = node.__dom.nextSibling;
if (p) {
p.__dom.nextSibling = n;
}
if (n) {
n.__dom.previousSibling = p;
}
node.__dom.parentNode = node.__dom.previousSibling = node.__dom.nextSibling = undefined;
container.__dom.childNodes = null;
}
};
Polymer.TreeApi.Composed = {
getChildNodes: function (node) {
return Polymer.TreeApi.arrayCopyChildNodes(node);
},
getParentNode: function (node) {
return node.parentNode;
},
clearChildNodes: function (node) {
node.textContent = '';
},
insertBefore: function (parentNode, newChild, refChild) {
return nativeInsertBefore.call(parentNode, newChild, refChild || null);
},
appendChild: function (parentNode, newChild) {
return nativeAppendChild.call(parentNode, newChild);
},
removeChild: function (parentNode, node) {
return nativeRemoveChild.call(parentNode, node);
}
};
}());
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = function (node) {
this.node = needsToWrap ? DomApi.wrap(node) : node;
};
var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
DomApi.wrap = window.wrap ? window.wrap : function (node) {
return node;
};
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var doc = node.ownerDocument;
while (n && n !== doc && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && DomApi.matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = dom(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
},
_query: function (matcher, node, halter) {
node = node || this.node;
var list = [];
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
return list;
},
_queryElements: function (elements, matcher, halter, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
if (this._queryElement(c, matcher, halter, list)) {
return true;
}
}
}
},
_queryElement: function (node, matcher, halter, list) {
var result = matcher(node);
if (result) {
list.push(node);
}
if (halter && halter(result)) {
return result;
}
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
}
};
var CONTENT = DomApi.CONTENT = 'content';
var dom = DomApi.factory = function (node) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi.ctor(node);
}
return node.__domApi;
};
DomApi.hasApi = function (node) {
return Boolean(node.__domApi);
};
DomApi.ctor = DomApi;
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return DomApi.factory(obj, patch);
}
};
var p = Element.prototype;
DomApi.matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return DomApi;
}();
(function () {
'use strict';
var Settings = Polymer.Settings;
var DomApi = Polymer.DomApi;
var dom = DomApi.factory;
var TreeApi = Polymer.TreeApi;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var CONTENT = DomApi.CONTENT;
if (Settings.useShadow) {
return;
}
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
Polymer.Base.extend(DomApi.prototype, {
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this.insertBefore(node);
},
insertBefore: function (node, ref_node) {
if (ref_node && TreeApi.Logical.getParentNode(ref_node) !== this.node) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
if (DomApi.hasApi(parent)) {
dom(parent).notifyObserver();
}
this._removeNode(node);
} else {
this._removeOwnerShadyRoot(node);
}
}
if (!this._addNode(node, ref_node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (ref_node) {
TreeApi.Composed.insertBefore(container, node, ref_node);
} else {
TreeApi.Composed.appendChild(container, node);
}
}
this.notifyObserver();
return node;
},
_addNode: function (node, ref_node) {
var root = this.getOwnerRoot();
if (root) {
var ipAdded = this._maybeAddInsertionPoint(node, this.node);
if (!root._invalidInsertionPoints) {
root._invalidInsertionPoints = ipAdded;
}
this._addNodeToHost(root.host, node);
}
if (TreeApi.Logical.hasChildNodes(this.node)) {
TreeApi.Logical.recordInsertBefore(node, this.node, ref_node);
}
var handled = this._maybeDistribute(node) || this.node.shadyRoot;
if (handled) {
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
while (node.firstChild) {
TreeApi.Composed.removeChild(node, node.firstChild);
}
} else {
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
return handled;
},
removeChild: function (node) {
if (TreeApi.Logical.getParentNode(node) !== this.node) {
throw Error('The node to be removed is not a child of this node: ' + node);
}
if (!this._removeNode(node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
var parent = TreeApi.Composed.getParentNode(node);
if (container === parent) {
TreeApi.Composed.removeChild(container, node);
}
}
this.notifyObserver();
return node;
},
_removeNode: function (node) {
var logicalParent = TreeApi.Logical.hasParentNode(node) && TreeApi.Logical.getParentNode(node);
var distributed;
var root = this._ownerShadyRootForNode(node);
if (logicalParent) {
distributed = dom(node)._maybeDistributeParent();
TreeApi.Logical.recordRemoveChild(node, logicalParent);
if (root && this._removeDistributedChildren(root, node)) {
root._invalidInsertionPoints = true;
this._lazyDistribute(root.host);
}
}
this._removeOwnerShadyRoot(node);
if (root) {
this._removeNodeFromHost(root.host, node);
}
return distributed;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
var root = node._ownerShadyRoot;
if (root === undefined) {
if (node._isShadyRoot) {
root = node;
} else {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
if (root || document.documentElement.contains(node)) {
node._ownerShadyRoot = root;
}
}
return root;
},
_maybeDistribute: function (node) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && TreeApi.Logical.getParentNode(fragContent).nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this.getOwnerRoot();
if (root) {
this._lazyDistribute(root.host);
}
}
var needsDist = this._nodeNeedsDistribution(this.node);
if (needsDist) {
this._lazyDistribute(this.node);
}
return needsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = dom(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = TreeApi.Logical.getParentNode(n);
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
TreeApi.Logical.saveChildNodes(parent);
TreeApi.Logical.saveChildNodes(node);
added = true;
}
return added;
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = dom(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(TreeApi.Logical.getParentNode(c));
}
},
_nodeNeedsDistribution: function (node) {
return node && node.shadyRoot && DomApi.hasInsertionPoint(node.shadyRoot);
},
_addNodeToHost: function (host, node) {
if (host._elementAdd) {
host._elementAdd(node);
}
},
_removeNodeFromHost: function (host, node) {
if (host._elementRemove) {
host._elementRemove(node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = dom(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = TreeApi.Logical.getParentNode(node);
}
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = TreeApi.Logical.getChildNodes(node);
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = dom(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = dom(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
var result = this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node, function (n) {
return Boolean(n);
})[0];
return result || null;
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._maybeDistributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._maybeDistributeParent();
},
_maybeDistributeParent: function () {
if (this._nodeNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
return true;
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = TreeApi.Logical.getChildNodes(externalNode);
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
_getComposedInnerHTML: function () {
return getInnerHTML(this.node, true);
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var active = document.activeElement;
if (!active) {
return null;
}
var isShadyRoot = !!this.node._isShadyRoot;
if (this.node !== document) {
if (!isShadyRoot) {
return null;
}
if (this.node.host === active || !this.node.host.contains(active)) {
return null;
}
}
var activeRoot = dom(active).getOwnerRoot();
while (activeRoot && activeRoot !== this.node) {
active = activeRoot.host;
activeRoot = dom(active).getOwnerRoot();
}
if (this.node === document) {
return activeRoot ? null : active;
} else {
return activeRoot === this.node ? active : null;
}
},
configurable: true
},
childNodes: {
get: function () {
var c$ = TreeApi.Logical.getChildNodes(this.node);
return Array.isArray(c$) ? c$ : TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
if (TreeApi.Logical.hasChildNodes(this.node)) {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
} else {
return TreeApi.arrayCopyChildren(this.node);
}
},
configurable: true
},
parentNode: {
get: function () {
return TreeApi.Logical.getParentNode(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return TreeApi.Logical.getFirstChild(this.node);
},
configurable: true
},
lastChild: {
get: function () {
return TreeApi.Logical.getLastChild(this.node);
},
configurable: true
},
nextSibling: {
get: function () {
return TreeApi.Logical.getNextSibling(this.node);
},
configurable: true
},
previousSibling: {
get: function () {
return TreeApi.Logical.getPreviousSibling(this.node);
},
configurable: true
},
firstElementChild: {
get: function () {
return TreeApi.Logical.getFirstElementChild(this.node);
},
configurable: true
},
lastElementChild: {
get: function () {
return TreeApi.Logical.getLastElementChild(this.node);
},
configurable: true
},
nextElementSibling: {
get: function () {
return TreeApi.Logical.getNextElementSibling(this.node);
},
configurable: true
},
previousElementSibling: {
get: function () {
return TreeApi.Logical.getPreviousElementSibling(this.node);
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = TreeApi.arrayCopyChildNodes(d);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.hasInsertionPoint = function (root) {
return Boolean(root && root._insertionPoints.length);
};
}());
(function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = Polymer.DomApi;
if (!Settings.useShadow) {
return;
}
Polymer.Base.extend(DomApi.prototype, {
querySelectorAll: function (selector) {
return TreeApi.arrayCopy(this.node.querySelectorAll(selector));
},
getOwnerRoot: function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
},
getDestinationInsertionPoints: function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? TreeApi.arrayCopy(n$) : [];
},
getDistributedNodes: function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? TreeApi.arrayCopy(n$) : [];
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var node = DomApi.wrap(this.node);
var activeElement = node.activeElement;
return node.contains(activeElement) ? activeElement : null;
},
configurable: true
},
childNodes: {
get: function () {
return TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return TreeApi.arrayCopyChildren(this.node);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardMethods = function (m$) {
for (var i = 0; i < m$.length; i++) {
forwardMethod(m$[i]);
}
};
var forwardMethod = function (method) {
DomApi.prototype[method] = function () {
return this.node[method].apply(this.node, arguments);
};
};
forwardMethods([
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild',
'setAttribute',
'removeAttribute',
'querySelector'
]);
var forwardProperties = function (f$) {
for (var i = 0; i < f$.length; i++) {
forwardProperty(f$[i]);
}
};
var forwardProperty = function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
};
forwardProperties([
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
]);
}());
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
while (this._debouncers.length) {
this._debouncers.shift().complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
return this.event.path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var current = this.rootTarget;
while (current) {
path.push(current);
var insertionPoints = Polymer.dom(current).getDestinationInsertionPoints();
if (insertionPoints.length) {
for (var i = 0; i < insertionPoints.length - 1; i++) {
path.push(insertionPoints[i]);
}
current = insertionPoints[insertionPoints.length - 1];
} else {
current = Polymer.dom(current).parentNode || current.host;
}
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var useShadow = Polymer.Settings.useShadow;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this._distributeParent();
},
_distributeParent: function () {
if (!useShadow) {
this.domApi._maybeDistributeParent();
}
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function () {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var self = this;
var h = Polymer.dom(content).observeNodes(function () {
self._scheduleNotify();
});
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = function () {
self._flush();
};
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
var self = this;
this._observer = Polymer.dom(host).observeNodes(function () {
self._scheduleNotify();
});
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());
(function () {
var DomApi = Polymer.DomApi;
var TreeApi = Polymer.TreeApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_setupShady: function () {
this.shadyRoot = null;
if (!this.__domApi) {
this.__domApi = null;
}
if (!this.__dom) {
this.__dom = null;
}
if (!this._ownerShadyRoot) {
this._ownerShadyRoot = undefined;
}
},
_poolContent: function () {
if (this._useContent) {
TreeApi.Logical.saveChildNodes(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLogicalChildren(TreeApi.Logical.getChildNodes(this));
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._hasDistributed = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
TreeApi.Logical.saveChildNodes(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
this.shadyRoot._invalidInsertionPoints = this.shadyRoot._invalidInsertionPoints || updateInsertionPoints;
var host = getTopDistributingHost(this);
Polymer.dom(this)._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
if (this.shadyRoot._invalidInsertionPoints) {
Polymer.dom(this)._updateInsertionPoints(this);
this.shadyRoot._invalidInsertionPoints = false;
}
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && DomApi.hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (DomApi.hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
TreeApi.Composed.clearChildNodes(this);
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return DomApi.matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = TreeApi.Logical.getChildNodes(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = TreeApi.Logical.getParentNode(p);
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = TreeApi.Logical.getChildNodes(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = TreeApi.Composed.getChildNodes(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (TreeApi.Composed.getParentNode(n) === container) {
TreeApi.Composed.removeChild(container, n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
TreeApi.Composed.insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = TreeApi.Logical.getParentNode(content);
if (parent && parent.shadyRoot && DomApi.hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = TreeApi.Logical.getChildNodes(host);
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName && c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (DomApi.hasApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (DomApi.hasApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLogicalChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
var self = this;
this.boundComplete = function () {
self.complete();
};
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return !!(debouncer && debouncer.finish);
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
}
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list, template.hasAttribute('strip-whitespace'));
return list;
},
_parseNodeAnnotations: function (node, list, stripWhiteSpace) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list, stripWhiteSpace);
},
_bindingRegex: function () {
var IDENT = '(?:' + '[a-zA-Z_$][\\w.:$\\-*]*' + ')';
var NUMBER = '(?:' + '[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?' + ')';
var SQUOTE_STRING = '(?:' + '\'(?:[^\'\\\\]|\\\\.)*\'' + ')';
var DQUOTE_STRING = '(?:' + '"(?:[^"\\\\]|\\\\.)*"' + ')';
var STRING = '(?:' + SQUOTE_STRING + '|' + DQUOTE_STRING + ')';
var ARGUMENT = '(?:' + IDENT + '|' + NUMBER + '|' + STRING + '\\s*' + ')';
var ARGUMENTS = '(?:' + ARGUMENT + '(?:,\\s*' + ARGUMENT + ')*' + ')';
var ARGUMENT_LIST = '(?:' + '\\(\\s*' + '(?:' + ARGUMENTS + '?' + ')' + '\\)\\s*' + ')';
var BINDING = '(' + IDENT + '\\s*' + ARGUMENT_LIST + '?' + ')';
var OPEN_BRACKET = '(\\[\\[|{{)' + '\\s*';
var CLOSE_BRACKET = '(?:]]|}})';
var NEGATE = '(?:(!)\\s*)?';
var EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET;
return new RegExp(EXPRESSION, 'g');
}(),
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var lastIndex = 0;
var m;
while ((m = re.exec(text)) !== null) {
if (m.index > lastIndex) {
parts.push({ literal: text.slice(lastIndex, m.index) });
}
var mode = m[1][0];
var negate = Boolean(m[2]);
var value = m[3].trim();
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list, stripWhiteSpace) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list, stripWhiteSpace);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, stripWhiteSpace) {
if (root.firstChild) {
var node = root.firstChild;
var i = 0;
while (node) {
var next = node.nextSibling;
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = next;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
next = n.nextSibling;
root.removeChild(n);
n = next;
}
if (stripWhiteSpace && !node.textContent.trim()) {
root.removeChild(node);
i--;
}
}
if (node.parentNode) {
var childAnnotation = this._parseNodeAnnotations(node, list, stripWhiteSpace);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
node = next;
i++;
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName === 'input' && origName === 'value') {
node.setAttribute(origName, '');
}
node.removeAttribute(origName);
var propertyName = Polymer.CaseMap.dashToCamelCase(name);
if (kind === 'property') {
name = propertyName;
}
return {
kind: kind,
name: name,
propertyName: propertyName,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
if (parent) {
for (var n = parent.firstChild, i = 0; n; n = n.nextSibling) {
if (annote.index === i++) {
return n;
}
}
} else {
return root;
}
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
var self = this;
Polymer.Annotations.prepElement = function (element) {
self._prepElement(element);
};
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
this._processAnnotations(this._notes);
}
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
var signature = this._parseMethod(p.value);
if (signature) {
p.signature = signature;
} else {
p.model = this._modelForPath(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
name: '_parent_' + prop,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
for (var i = 0, n; i < notes.length && (n = notes[i]); i++) {
for (var j = 0, b$ = n.bindings, b; j < b$.length && (b = b$[j]); j++) {
for (var k = 0, p$ = b.parts, p; k < p$.length && (p = p$[k]); k++) {
if (p.signature) {
var args = p.signature.args;
for (var kk = 0; kk < args.length; kk++) {
var model = args[kk].model;
if (model) {
pp[model] = true;
}
}
} else {
if (p.model) {
pp[p.model] = true;
}
}
}
}
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
}
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}
},
_marshalAnnotatedNodes: function () {
if (this._notes && this._notes.length) {
var r = new Array(this._notes.length);
for (var i = 0; i < this._notes.length; i++) {
r[i] = this._findAnnotatedNode(this.root, this._notes[i]);
}
this._nodes = r;
}
},
_marshalAnnotatedListeners: function () {
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
for (var j = 0, e$ = a.events, e; j < e$.length && (e = e$[j]); j++) {
this.listen(node, e.name, e.value);
}
}
}
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, eventName;
for (eventName in listeners) {
if (eventName.indexOf('.') < 0) {
node = this;
name = eventName;
} else {
name = eventName.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[eventName]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var wrap = Polymer.DomApi.wrap;
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
stateObj.movefn = null;
stateObj.upfn = null;
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = wrap(ev.currentTarget);
var gobj = node[GESTURE_KEY];
if (!gobj) {
return;
}
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend' && !ev.__polymerSimulatedTouch) {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1 && r.reset) {
r.reset();
}
}
}
for (i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: null,
upfn: null
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: function (e) {
return Gestures.prevent(e);
}
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: null,
upfn: null,
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
if (self.info.state === 'start') {
Gestures.prevent('tap');
}
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
if (this.info.state === 'start') {
Gestures.prevent('tap');
}
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_setupGestures: function () {
this.__polymerGestures = null;
},
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
detail = detail === null || detail === undefined ? {} : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var useCache = options._useCache;
var event = this._getEvent(type, bubbles, cancelable, useCache);
event.detail = detail;
if (useCache) {
this.__eventCache[type] = null;
}
node.dispatchEvent(event);
if (useCache) {
this.__eventCache[type] = event;
}
return event;
},
__eventCache: {},
_getEvent: function (type, bubbles, cancelable, useCache) {
var event = useCache && this.__eventCache[type];
if (!event || (event.bubbles != bubbles || event.cancelable != cancelable)) {
event = new Event(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable
});
}
return event;
},
async: function (callback, waitTime) {
var self = this;
return Polymer.Async.run(function () {
callback.call(self);
}, waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror, optAsync) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
optAsync = Boolean(optAsync);
if (optAsync) {
l.setAttribute('async', '');
}
var self = this;
if (onload) {
l.onload = function (e) {
return onload.call(self, e);
};
}
if (onerror) {
l.onerror = function (e) {
return onerror.call(self, e);
};
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
_dataEventCache: {},
prepareModel: function (model) {
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (source, event, value) {
value = value === undefined ? this[source] : value;
event = event || Polymer.CaseMap.camelToDashCase(source) + '-changed';
this.fire(event, { value: value }, {
bubbles: false,
cancelable: false,
_useCache: true
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
for (var i = 0, l = effects.length, fx; i < l && (fx = effects[i]); i++) {
fx.fn.call(this, property, value, fx.effect, old, fromAbove);
}
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
if (!model._propertyEffects) {
model._propertyEffects = {};
}
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
var propEffect = {
kind: kind,
effect: effect,
fn: Polymer.Bind['_' + kind + 'Effect']
};
fx.push(propEffect);
return propEffect;
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'annotatedComputation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event, negated) {
if (!model._bindListeners) {
model._bindListeners = [];
}
var fn = this._notedListenerFactory(property, path, this._isStructured(path), negated);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, negated) {
return function (target, value, targetPath) {
if (targetPath) {
this._notifyPath(this._fixPath(path, property, targetPath), value);
} else {
value = target[property];
if (negated) {
value = !value;
}
if (!isStructured) {
this[path] = value;
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
var b$ = inst._bindListeners;
for (var i = 0, l = b$.length, info; i < l && (info = b$[i]); i++) {
var node = inst._nodes[info.index];
this._addNotifyListener(node, inst, info.event, info.changedFn);
}
},
_addNotifyListener: function (element, context, event, changedFn) {
element.addEventListener(event, function (e) {
return context._notifyListener(changedFn, e);
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(effect, calc);
}
},
_reflectEffect: function (source, value, effect) {
this.reflectPropertyToAttribute(source, effect.attribute, value);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source, effect.event, value);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(this, args);
this.__setProperty(effect.name, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(effect, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
var bailoutEarly = args.length > 1 || effect.dynamicFn;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base._get(name, model);
} else {
v = model[name];
}
if (bailoutEarly && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
var prop = Polymer.Bind.addPropertyEffect(this, property, kind, effect);
prop.pathFn = this['_' + prop.kind + 'PathEffect'];
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify', { event: Polymer.CaseMap.camelToDashCase(p) + '-changed' });
}
if (prop.reflectToAttribute) {
this._addPropertyEffect(p, 'reflect', { attribute: Polymer.CaseMap.camelToDashCase(p) });
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'compute', {
method: sig.method,
args: sig.args,
trigger: null,
name: name,
dynamicFn: dynamicFn
});
}
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
for (var i = 0, o; i < observers.length && (o = observers[i]); i++) {
this._addComplexObserverEffect(o);
}
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
if (!sig) {
throw new Error('Malformed observer expression \'' + observer + '\'');
}
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: null,
dynamicFn: dynamicFn
});
}
},
_addAnnotationEffects: function (notes) {
for (var i = 0, note; i < notes.length && (note = notes[i]); i++) {
var b$ = note.bindings;
for (var j = 0, binding; j < b$.length && (binding = b$[j]); j++) {
this._addAnnotationEffect(binding, i);
}
}
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event, note.parts[0].negate);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
propertyName: note.propertyName,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}
if (sig.dynamicFn) {
this.__addAnnotatedComputationEffect(sig.method, index, note, part, null);
}
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger,
dynamicFn: part.signature.dynamicFn
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (this.getPropertyInfo(sig.method) !== Polymer.nob) {
sig.static = false;
sig.dynamicFn = true;
}
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = { name: arg };
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.model = this._modelForPath(arg);
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
if (this._bindListeners) {
Polymer.Bind.setupBindListeners(this);
}
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
var pinfo;
if (!node._propertyInfo || !(pinfo = node._propertyInfo[property]) || !pinfo.readOnly) {
this.__setProperty(property, value, false, node);
}
}
},
_executeStaticEffects: function () {
if (this._propertyEffects && this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
(function () {
var usePolyfillProto = Polymer.Settings.usePolyfillProto;
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
this._handlers = [];
this._aboveConfig = null;
if (initialConfig) {
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
var info = this._propertyInfo[name];
if (!info || !info.readOnly) {
this._config[name] = value;
}
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._configureProperties(this.behaviors[i].properties, config);
}
this._configureProperties(this.properties, config);
this.mixin(config, this._aboveConfig);
this._config = config;
if (this._clients && this._clients.length) {
this._distributeConfig(this._config);
}
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (!usePolyfillProto && this.hasOwnProperty(i) && this._propertyEffects && this._propertyEffects[i]) {
config[i] = this[i];
delete this[i];
} else if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation' && !x.isCompound) {
var node = this._nodes[x.effect.index];
var name = x.effect.propertyName;
var isAttr = x.effect.kind == 'attribute';
var hasEffect = node._propertyEffects && node._propertyEffects[name];
if (node._configValue && (hasEffect || !isAttr)) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
if (isAttr) {
value = node.deserialize(this.serialize(value), node._propertyInfo[name].type);
}
node._configValue(name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!Polymer.Bind._isEventBogus(e, e.target)) {
var value, path;
if (e.detail) {
value = e.detail.value;
path = e.detail.path;
}
if (!this._clientsReadied) {
this._queueHandler([
fn,
e.target,
value,
path
]);
} else {
return fn.call(this, e.target, value, path);
}
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2], h[3]);
}
this._handlers = [];
}
});
}());
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
this._get(path, this, info);
if (info.path) {
this._notifyPath(info.path, value, fromAbove);
}
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
var old, key;
if (last[0] == '#') {
key = last;
old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
old = prop[last];
key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects && this._propertyEffects[model];
if (fx$) {
for (var i = 0, fx; i < fx$.length && (fx = fx$[i]); i++) {
var fxFn = fx.pathFn;
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node._notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this._notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this._notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPathUp: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, {
bubbles: false,
_useCache: true
});
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
if (!array.hasOwnProperty('splices')) {
Object.defineProperty(array, 'splices', {
configurable: true,
writable: true
});
}
array.splices = change;
this._notifyPath(path + '.splices', change);
this._notifyPath(path + '.length', array.length);
change.keySplices = null;
change.indexSplices = null;
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
_getEvent: Polymer.Base._getEvent,
__eventCache: Polymer.Base.__eventCache,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
return {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = this._expandUnicodeEscapes(t);
t = t.replace(this._rx.multipleSpaces, ' ');
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
node.keyframesName = node.selector.split(this._rx.multipleSpaces).pop();
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
_expandUnicodeEscapes: function (s) {
return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
var code = arguments[1], repeat = 6 - code.length;
while (repeat--) {
code = '0' + code;
}
return '\\' + code;
});
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) === 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/,
multipleSpaces: /\s+/g
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRule(this.rulesForStyle(s), styleRuleCallback, keyframesRuleCallback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
isKeyframesSelector: function (rule) {
return rule.parent && rule.parent.type === this.ruleTypes.KEYFRAMES_RULE;
},
forEachRule: function (node, styleRuleCallback, keyframesRuleCallback) {
if (!node) {
return;
}
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
styleRuleCallback(node);
} else if (keyframesRuleCallback && node.type === this.ruleTypes.KEYFRAMES_RULE) {
keyframesRuleCallback(node);
} else if (node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachRule(r, styleRuleCallback, keyframesRuleCallback);
}
}
},
applyCss: function (cssText, moniker, target, afterNode) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
target = target || document.head;
if (!afterNode) {
var n$ = target.querySelectorAll('style[scope]');
afterNode = n$[n$.length - 1];
}
target.insertBefore(style, afterNode && afterNode.nextSibling || target.firstChild);
return style;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this.cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Polymer.TreeApi.arrayCopy(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this.cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, (c ? c + ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
if (!styleUtil.isKeyframesSelector(rule)) {
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(CONTENT_START, HOST + ' $1');
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=\[])+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?::host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /::content|::shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
var CONTENT_START = new RegExp('^(' + CONTENT + ')');
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachRule(rules, function (rule) {
self._mapRuleOntoParent(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRuleOntoParent: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || [];
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow && Boolean(this._template);
}
if (this._template) {
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
this._prepStyleProperties();
var needsStatic = this._styles.length && !this._needsStyleProperties();
if (needsStatic || !nativeShadow) {
cssText = needsStatic ? cssText : ' ';
var style = styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null);
if (!nativeShadow) {
this._scopeStyle = style;
}
}
} else {
this._styles = [];
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
var p = this._template && this._template.parentNode;
if (this._template && (!p || p.id.toLowerCase() !== this.is)) {
cssText += styleUtil.cssFromElement(this._template);
}
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
var className = node.getAttribute('class');
node.setAttribute('class', self._scopeElementClass(node, className));
var n$ = node.querySelectorAll('*');
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
className = n.getAttribute('class');
n.setAttribute('class', self._scopeElementClass(n, className));
}
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
for (var i = 0, m; i < mxns.length && (m = mxns[i]); i++) {
if (m.addedNodes) {
for (var j = 0; j < m.addedNodes.length; j++) {
scopify(m.addedNodes[j]);
}
}
}
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {}, keyframes = [];
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
}, function onKeyframesRule(rule) {
keyframes.push(rule);
});
styles._keyframes = keyframes;
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
return this.collectConsumingCssText(rule.parsedCssText);
},
collectConsumingCssText: function (cssText) {
return cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var colon = p.indexOf(':');
if (colon !== -1) {
var pp = p.substring(colon);
pp = pp.trim();
pp = this.valueForProperty(pp, props) || pp;
p = p.substring(0, colon) + pp;
}
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
applyKeyframeTransforms: function (rule, keyframeTransforms) {
var input = rule.cssText;
var output = rule.cssText;
if (rule.hasAnimations == null) {
rule.hasAnimations = this.rx.ANIMATION_MATCH.test(input);
}
if (rule.hasAnimations) {
var transform;
if (rule.keyframeNamesToTransform == null) {
rule.keyframeNamesToTransform = [];
for (var keyframe in keyframeTransforms) {
transform = keyframeTransforms[keyframe];
output = transform(input);
if (input !== output) {
input = output;
rule.keyframeNamesToTransform.push(keyframe);
}
}
} else {
for (var i = 0; i < rule.keyframeNamesToTransform.length; ++i) {
transform = keyframeTransforms[rule.keyframeNamesToTransform[i]];
input = transform(input);
}
output = input;
}
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
var keyframeTransforms = this._elementKeyframeTransforms(element, scopeSelector);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (!nativeShadow && !Polymer.StyleUtil.isKeyframesSelector(rule) && rule.cssText) {
self.applyKeyframeTransforms(rule, keyframeTransforms);
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_elementKeyframeTransforms: function (element, scopeSelector) {
var keyframesRules = element._styles._keyframes;
var keyframeTransforms = {};
if (!nativeShadow && keyframesRules) {
for (var i = 0, keyframesRule = keyframesRules[i]; i < keyframesRules.length; keyframesRule = keyframesRules[++i]) {
this._scopeKeyframes(keyframesRule, scopeSelector);
keyframeTransforms[keyframesRule.keyframesName] = this._keyframesRuleTransformer(keyframesRule);
}
}
return keyframeTransforms;
},
_keyframesRuleTransformer: function (keyframesRule) {
return function (cssText) {
return cssText.replace(keyframesRule.keyframesNameRx, keyframesRule.transformedKeyframesName);
};
},
_scopeKeyframes: function (rule, scopeId) {
rule.keyframesNameRx = new RegExp(rule.keyframesName, 'g');
rule.transformedKeyframesName = rule.keyframesName + '-' + scopeId;
rule.transformedSelector = rule.transformedSelector || rule.selector;
rule.selector = rule.transformedSelector.replace(rule.keyframesName, rule.transformedKeyframesName);
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.getAttribute('class') || '';
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.setAttribute('class', v);
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,()]*)|(?:[^;()]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
ANIMATION_MATCH: /(animation\s*:)|(animation-name\s*:)/,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles && this._styles.length ? propertyUtils.decorateStyles(this._styles) : null;
},
customStyle: null,
getComputedStyleValue: function (property) {
return this._styleProperties && this._styleProperties[property] || getComputedStyle(this).getPropertyValue(property);
},
_setupStyleProperties: function () {
this.customStyle = {};
this._styleCache = null;
this._styleProperties = null;
this._scopeSelector = null;
this._ownStyleProperties = null;
this._customStyle = null;
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = this.shadyRoot && this.shadyRoot._hasDistributed ? Polymer.dom(node) : node;
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector = (selector ? selector + ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepConstructor();
this._prepTemplate();
this._prepStyles();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepPropertyInfo();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._setupGestures();
this._setupConfigure();
this._setupStyleProperties();
this._setupDebouncers();
this._setupShady();
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
this._marshalAnnotationReferences();
}
this._marshalInstanceEffects();
this._marshalBehaviors();
this._marshalHostAttributes();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
if (b.listeners) {
this._listenListeners(b.listeners);
}
}
});
(function () {
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
_template: null,
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply(true);
} else {
var self = this;
var observer = new MutationObserver(function () {
observer.disconnect();
self._apply(true);
});
observer.observe(e, { childList: true });
}
}
}
},
_apply: function (deferProperties) {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
var self = this;
var fn = function fn() {
self._applyCustomProperties(e);
};
if (this._pendingApplyProperties) {
cancelAnimationFrame(this._pendingApplyProperties);
this._pendingApplyProperties = null;
}
if (deferProperties) {
this._pendingApplyProperties = requestAnimationFrame(fn);
} else {
fn();
}
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepPropertyInfo();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
archetype.__setPropertyOrig = this.__setProperty;
archetype.__setProperty = this.__setPropertyImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
__setPropertyImpl: function (property, value, fromAbove, node) {
if (node && node.__hideTemplateChildren__ && property == 'textContent') {
property = '__polymerTextContent__';
}
this.__setPropertyOrig(property, value, fromAbove, node);
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function () {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = function () {
rootDataHost._prepElement();
};
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop),
fn: Polymer.Bind._functionEffect
},
{
kind: 'notify',
fn: Polymer.Bind._notifyEffect,
effect: { event: Polymer.CaseMap.camelToDashCase(parentProp) + '-changed' }
}
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
var self = this;
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = function (source, value) {
self._forwardParentProp(source, value);
};
}
this._extendTemplate(template, proto);
template._pathEffector = function (path, value, fromAbove) {
return self._pathEffectorImpl(path, value, fromAbove);
};
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
var n$ = Object.getOwnPropertyNames(proto);
if (proto._propertySetter) {
template._propertySetter = proto._propertySetter;
}
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
}
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = this._modelForPath(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._registerHost(host);
this._beginHosting();
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._endHosting();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
if (model[prop] === undefined) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
_template: null,
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
if (key = this._parseKey(key)) {
this._removeFromMap(this.store[key]);
delete this.store[key];
}
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key && key[0] == '#') {
return key.slice(1);
}
},
setItem: function (key, item) {
if (key = this._parseKey(key)) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
}
},
getItem: function (key) {
if (key = this._parseKey(key)) {
return this.store[key];
}
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
s.addedKeys = [];
for (var j = 0; j < s.removed.length; j++) {
key = this.getKey(s.removed[j]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.addedCount; j++) {
var item = this.userArray[s.index + j];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}
var removed = [];
var added = [];
for (key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
_template: null,
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number,
renderedItemCount: {
type: Number,
notify: true,
readOnly: true
},
initialCount: {
type: Number,
observer: '_initializeChunking'
},
targetFramerate: {
type: Number,
value: 20
},
_targetFrameTime: {
type: Number,
computed: '_computeFrameTime(targetFramerate)'
}
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
this._pool = [];
this._limit = Infinity;
var self = this;
this._boundRenderChunk = function () {
self._renderChunk();
};
},
detached: function () {
this.__isDetached = true;
for (var i = 0; i < this._instances.length; i++) {
this._detachInstance(i);
}
},
attached: function () {
if (this.__isDetached) {
this.__isDetached = false;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
for (var i = 0; i < this._instances.length; i++) {
this._attachInstance(i, parent);
}
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function (sort) {
var dataHost = this._getRootDataHost();
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function (filter) {
var dataHost = this._getRootDataHost();
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_computeFrameTime: function (rate) {
return Math.ceil(1000 / rate);
},
_initializeChunking: function () {
if (this.initialCount) {
this._limit = this.initialCount;
this._chunkCount = this.initialCount;
this._lastChunkTime = performance.now();
}
},
_tryRenderChunk: function () {
if (this.items && this._limit < this.items.length) {
this.debounce('renderChunk', this._requestRenderChunk);
}
},
_requestRenderChunk: function () {
requestAnimationFrame(this._boundRenderChunk);
},
_renderChunk: function () {
var currChunkTime = performance.now();
var ratio = this._targetFrameTime / (currChunkTime - this._lastChunkTime);
this._chunkCount = Math.round(this._chunkCount * ratio) || 1;
this._limit += this._chunkCount;
this._lastChunkTime = currChunkTime;
this._debounceTemplate(this._render);
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._initializeChunking();
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else if (this._keySplices.length) {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
} else {
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder && i < this._limit) {
inst = this._insertInstance(i, inst.__key__);
} else if (!inst.isPlaceholder && i >= this._limit) {
inst = this._downgradeInstance(i, inst.__key__);
}
keyToIdx[inst.__key__] = i;
if (!inst.isPlaceholder) {
inst.__setProperty(this.indexAs, i, true);
}
}
this._pool.length = 0;
this._setRenderedItemCount(this._instances.length);
this.fire('dom-change');
this._tryRenderChunk();
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
var self = this;
if (this._filterFn) {
keys = keys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
if (this._sortFn) {
keys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
}
for (i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__key__ = key;
if (!inst.isPlaceholder && i < this._limit) {
inst.__setProperty(this.as, c.getItem(key), true);
}
} else if (i < this._limit) {
this._insertInstance(i, key);
} else {
this._insertPlaceholder(i, key);
}
}
for (var j = this._instances.length - 1; j >= i; j--) {
this._detachAndRemoveInstance(j);
}
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var keyMap = {};
var key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
key = s.removed[j];
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.added.length; j++) {
key = s.added[j];
keyMap[key] = keyMap[key] ? null : 1;
}
}
var removedIdxs = [];
var addedKeys = [];
for (key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
this._detachAndRemoveInstance(idx);
}
}
}
var self = this;
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
addedKeys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
var start = 0;
for (i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i]);
}
}
},
_insertRowUserSort: function (start, key) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = this._sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._insertPlaceholder(idx, key);
return idx;
},
_applySplicesArrayOrder: function (splices) {
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
this._detachAndRemoveInstance(s.index);
}
for (j = 0; j < s.addedKeys.length; j++) {
this._insertPlaceholder(s.index + j, s.addedKeys[j]);
}
}
},
_detachInstance: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
return inst;
}
},
_attachInstance: function (idx, parent) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
parent.insertBefore(inst.root, this);
}
},
_detachAndRemoveInstance: function (idx) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
this._instances.splice(idx, 1);
},
_insertPlaceholder: function (idx, key) {
this._instances.splice(idx, 0, {
isPlaceholder: true,
__key__: key
});
},
_stampInstance: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
return this.stamp(model);
},
_insertInstance: function (idx, key) {
var inst = this._pool.pop();
if (inst) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._stampInstance(idx, key);
}
var beforeRow = this._instances[idx + 1];
var beforeNode = beforeRow && !beforeRow.isPlaceholder ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
this._instances[idx] = inst;
return inst;
},
_downgradeInstance: function (idx, key) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
inst = {
isPlaceholder: true,
__key__: key
};
this._instances[idx] = inst;
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst.__setProperty(prop, value, true);
}
}
},
_forwardParentPath: function (path, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst._notifyPath(path, value, true);
}
}
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst && !inst.isPlaceholder) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
_template: null,
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
_template: null,
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
if (!this.parentNode || this.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE && (!Polymer.Settings.hasShadow || !(this.parentNode instanceof ShadowRoot))) {
this._teardownInstance();
}
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
var parentNode = Polymer.dom(this).parentNode;
if (parentNode) {
var parent = Polymer.dom(parentNode);
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
parent.insertBefore(root, this);
} else {
var c$ = this._instance._children;
if (c$ && c$.length) {
var lastChild = Polymer.dom(this).previousSibling;
if (lastChild !== c$[c$.length - 1]) {
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.insertBefore(n, this);
}
}
}
}
}
},
_teardownInstance: function () {
if (this._instance) {
var c$ = this._instance._children;
if (c$ && c$.length) {
var parent = Polymer.dom(Polymer.dom(c$[0]).parentNode);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.removeChild(n);
}
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
_template: null,
created: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
if (document.readyState == 'loading') {
document.addEventListener('DOMContentLoaded', function () {
self._markImportsReady();
});
} else {
self._markImportsReady();
}
});
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
var setupConfigure = this._setupConfigure;
this._setupConfigure = function () {
setupConfigure.call(this, config);
};
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
this._prepPropertyInfo();
Polymer.Base._initFeatures.call(this);
this._children = Polymer.TreeApi.arrayCopyChildNodes(this.root);
}
this._insertChildren();
this.fire('dom-change');
}
});
Polymer({
    is: 'paper-material',

    properties: {
      /**
       * The z-depth of this element, from 0-5. Setting to 0 will remove the
       * shadow, and each increasing number greater than 0 will be "deeper"
       * than the last.
       *
       * @attribute elevation
       * @type number
       * @default 1
       */
      elevation: {
        type: Number,
        reflectToAttribute: true,
        value: 1
      },

      /**
       * Set this to true to animate the shadow when setting a new
       * `elevation` value.
       *
       * @attribute animated
       * @type boolean
       * @default false
       */
      animated: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      }
    }
  });
(function (document, Polymer) {
            "use strict";

            Polymer({
                is: "p-board",
                properties: {
                    title: String
                }
            });
        })(document, Polymer);
// DOMTokenList polyfill for IE9
(function () {

if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;

var prototype = Array.prototype,
    indexOf = prototype.indexOf,
    slice = prototype.slice,
    push = prototype.push,
    splice = prototype.splice,
    join = prototype.join;

function DOMTokenList(el) {
  this._element = el;
  if (el.className != this._classCache) {
    this._classCache = el.className;

    if (!this._classCache) return;

      // The className needs to be trimmed and split on whitespace
      // to retrieve a list of classes.
      var classes = this._classCache.replace(/^\s+|\s+$/g,'').split(/\s+/),
        i;
    for (i = 0; i < classes.length; i++) {
      push.call(this, classes[i]);
    }
  }
};

function setToClassName(el, classes) {
  el.className = classes.join(' ');
}

DOMTokenList.prototype = {
  add: function(token) {
    if(this.contains(token)) return;
    push.call(this, token);
    setToClassName(this._element, slice.call(this, 0));
  },
  contains: function(token) {
    return indexOf.call(this, token) !== -1;
  },
  item: function(index) {
    return this[index] || null;
  },
  remove: function(token) {
    var i = indexOf.call(this, token);
     if (i === -1) {
       return;
     }
    splice.call(this, i, 1);
    setToClassName(this._element, slice.call(this, 0));
  },
  toString: function() {
    return join.call(this, ' ');
  },
  toggle: function(token) {
    if (indexOf.call(this, token) === -1) {
      this.add(token);
    } else {
      this.remove(token);
    }
  }
};

window.DOMTokenList = DOMTokenList;

function defineElementGetter (obj, prop, getter) {
  if (Object.defineProperty) {
    Object.defineProperty(obj, prop,{
      get : getter
    })
  } else {
    obj.__defineGetter__(prop, getter);
  }
}

defineElementGetter(Element.prototype, 'classList', function () {
  return new DOMTokenList(this);
});

})();


/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
// @version 0.7.20
(function() {
  window.WebComponents = window.WebComponents || {
    flags: {}
  };
  var file = "webcomponents-lite.js";
  var script = document.querySelector('script[src*="' + file + '"]');
  var flags = {};
  if (!flags.noOpts) {
    location.search.slice(1).split("&").forEach(function(option) {
      var parts = option.split("=");
      var match;
      if (parts[0] && (match = parts[0].match(/wc-(.+)/))) {
        flags[match[1]] = parts[1] || true;
      }
    });
    if (script) {
      for (var i = 0, a; a = script.attributes[i]; i++) {
        if (a.name !== "src") {
          flags[a.name] = a.value || true;
        }
      }
    }
    if (flags.log && flags.log.split) {
      var parts = flags.log.split(",");
      flags.log = {};
      parts.forEach(function(f) {
        flags.log[f] = true;
      });
    } else {
      flags.log = {};
    }
  }
  if (flags.register) {
    window.CustomElements = window.CustomElements || {
      flags: {}
    };
    window.CustomElements.flags.register = flags.register;
  }
  WebComponents.flags = flags;
})();

(function(scope) {
  "use strict";
  var hasWorkingUrl = false;
  if (!scope.forceJURL) {
    try {
      var u = new URL("b", "http://a");
      u.pathname = "c%20d";
      hasWorkingUrl = u.href === "http://a/c%20d";
    } catch (e) {}
  }
  if (hasWorkingUrl) return;
  var relative = Object.create(null);
  relative["ftp"] = 21;
  relative["file"] = 0;
  relative["gopher"] = 70;
  relative["http"] = 80;
  relative["https"] = 443;
  relative["ws"] = 80;
  relative["wss"] = 443;
  var relativePathDotMapping = Object.create(null);
  relativePathDotMapping["%2e"] = ".";
  relativePathDotMapping[".%2e"] = "..";
  relativePathDotMapping["%2e."] = "..";
  relativePathDotMapping["%2e%2e"] = "..";
  function isRelativeScheme(scheme) {
    return relative[scheme] !== undefined;
  }
  function invalid() {
    clear.call(this);
    this._isInvalid = true;
  }
  function IDNAToASCII(h) {
    if ("" == h) {
      invalid.call(this);
    }
    return h.toLowerCase();
  }
  function percentEscape(c) {
    var unicode = c.charCodeAt(0);
    if (unicode > 32 && unicode < 127 && [ 34, 35, 60, 62, 63, 96 ].indexOf(unicode) == -1) {
      return c;
    }
    return encodeURIComponent(c);
  }
  function percentEscapeQuery(c) {
    var unicode = c.charCodeAt(0);
    if (unicode > 32 && unicode < 127 && [ 34, 35, 60, 62, 96 ].indexOf(unicode) == -1) {
      return c;
    }
    return encodeURIComponent(c);
  }
  var EOF = undefined, ALPHA = /[a-zA-Z]/, ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/;
  function parse(input, stateOverride, base) {
    function err(message) {
      errors.push(message);
    }
    var state = stateOverride || "scheme start", cursor = 0, buffer = "", seenAt = false, seenBracket = false, errors = [];
    loop: while ((input[cursor - 1] != EOF || cursor == 0) && !this._isInvalid) {
      var c = input[cursor];
      switch (state) {
       case "scheme start":
        if (c && ALPHA.test(c)) {
          buffer += c.toLowerCase();
          state = "scheme";
        } else if (!stateOverride) {
          buffer = "";
          state = "no scheme";
          continue;
        } else {
          err("Invalid scheme.");
          break loop;
        }
        break;

       case "scheme":
        if (c && ALPHANUMERIC.test(c)) {
          buffer += c.toLowerCase();
        } else if (":" == c) {
          this._scheme = buffer;
          buffer = "";
          if (stateOverride) {
            break loop;
          }
          if (isRelativeScheme(this._scheme)) {
            this._isRelative = true;
          }
          if ("file" == this._scheme) {
            state = "relative";
          } else if (this._isRelative && base && base._scheme == this._scheme) {
            state = "relative or authority";
          } else if (this._isRelative) {
            state = "authority first slash";
          } else {
            state = "scheme data";
          }
        } else if (!stateOverride) {
          buffer = "";
          cursor = 0;
          state = "no scheme";
          continue;
        } else if (EOF == c) {
          break loop;
        } else {
          err("Code point not allowed in scheme: " + c);
          break loop;
        }
        break;

       case "scheme data":
        if ("?" == c) {
          this._query = "?";
          state = "query";
        } else if ("#" == c) {
          this._fragment = "#";
          state = "fragment";
        } else {
          if (EOF != c && "	" != c && "\n" != c && "\r" != c) {
            this._schemeData += percentEscape(c);
          }
        }
        break;

       case "no scheme":
        if (!base || !isRelativeScheme(base._scheme)) {
          err("Missing scheme.");
          invalid.call(this);
        } else {
          state = "relative";
          continue;
        }
        break;

       case "relative or authority":
        if ("/" == c && "/" == input[cursor + 1]) {
          state = "authority ignore slashes";
        } else {
          err("Expected /, got: " + c);
          state = "relative";
          continue;
        }
        break;

       case "relative":
        this._isRelative = true;
        if ("file" != this._scheme) this._scheme = base._scheme;
        if (EOF == c) {
          this._host = base._host;
          this._port = base._port;
          this._path = base._path.slice();
          this._query = base._query;
          this._username = base._username;
          this._password = base._password;
          break loop;
        } else if ("/" == c || "\\" == c) {
          if ("\\" == c) err("\\ is an invalid code point.");
          state = "relative slash";
        } else if ("?" == c) {
          this._host = base._host;
          this._port = base._port;
          this._path = base._path.slice();
          this._query = "?";
          this._username = base._username;
          this._password = base._password;
          state = "query";
        } else if ("#" == c) {
          this._host = base._host;
          this._port = base._port;
          this._path = base._path.slice();
          this._query = base._query;
          this._fragment = "#";
          this._username = base._username;
          this._password = base._password;
          state = "fragment";
        } else {
          var nextC = input[cursor + 1];
          var nextNextC = input[cursor + 2];
          if ("file" != this._scheme || !ALPHA.test(c) || nextC != ":" && nextC != "|" || EOF != nextNextC && "/" != nextNextC && "\\" != nextNextC && "?" != nextNextC && "#" != nextNextC) {
            this._host = base._host;
            this._port = base._port;
            this._username = base._username;
            this._password = base._password;
            this._path = base._path.slice();
            this._path.pop();
          }
          state = "relative path";
          continue;
        }
        break;

       case "relative slash":
        if ("/" == c || "\\" == c) {
          if ("\\" == c) {
            err("\\ is an invalid code point.");
          }
          if ("file" == this._scheme) {
            state = "file host";
          } else {
            state = "authority ignore slashes";
          }
        } else {
          if ("file" != this._scheme) {
            this._host = base._host;
            this._port = base._port;
            this._username = base._username;
            this._password = base._password;
          }
          state = "relative path";
          continue;
        }
        break;

       case "authority first slash":
        if ("/" == c) {
          state = "authority second slash";
        } else {
          err("Expected '/', got: " + c);
          state = "authority ignore slashes";
          continue;
        }
        break;

       case "authority second slash":
        state = "authority ignore slashes";
        if ("/" != c) {
          err("Expected '/', got: " + c);
          continue;
        }
        break;

       case "authority ignore slashes":
        if ("/" != c && "\\" != c) {
          state = "authority";
          continue;
        } else {
          err("Expected authority, got: " + c);
        }
        break;

       case "authority":
        if ("@" == c) {
          if (seenAt) {
            err("@ already seen.");
            buffer += "%40";
          }
          seenAt = true;
          for (var i = 0; i < buffer.length; i++) {
            var cp = buffer[i];
            if ("	" == cp || "\n" == cp || "\r" == cp) {
              err("Invalid whitespace in authority.");
              continue;
            }
            if (":" == cp && null === this._password) {
              this._password = "";
              continue;
            }
            var tempC = percentEscape(cp);
            null !== this._password ? this._password += tempC : this._username += tempC;
          }
          buffer = "";
        } else if (EOF == c || "/" == c || "\\" == c || "?" == c || "#" == c) {
          cursor -= buffer.length;
          buffer = "";
          state = "host";
          continue;
        } else {
          buffer += c;
        }
        break;

       case "file host":
        if (EOF == c || "/" == c || "\\" == c || "?" == c || "#" == c) {
          if (buffer.length == 2 && ALPHA.test(buffer[0]) && (buffer[1] == ":" || buffer[1] == "|")) {
            state = "relative path";
          } else if (buffer.length == 0) {
            state = "relative path start";
          } else {
            this._host = IDNAToASCII.call(this, buffer);
            buffer = "";
            state = "relative path start";
          }
          continue;
        } else if ("	" == c || "\n" == c || "\r" == c) {
          err("Invalid whitespace in file host.");
        } else {
          buffer += c;
        }
        break;

       case "host":
       case "hostname":
        if (":" == c && !seenBracket) {
          this._host = IDNAToASCII.call(this, buffer);
          buffer = "";
          state = "port";
          if ("hostname" == stateOverride) {
            break loop;
          }
        } else if (EOF == c || "/" == c || "\\" == c || "?" == c || "#" == c) {
          this._host = IDNAToASCII.call(this, buffer);
          buffer = "";
          state = "relative path start";
          if (stateOverride) {
            break loop;
          }
          continue;
        } else if ("	" != c && "\n" != c && "\r" != c) {
          if ("[" == c) {
            seenBracket = true;
          } else if ("]" == c) {
            seenBracket = false;
          }
          buffer += c;
        } else {
          err("Invalid code point in host/hostname: " + c);
        }
        break;

       case "port":
        if (/[0-9]/.test(c)) {
          buffer += c;
        } else if (EOF == c || "/" == c || "\\" == c || "?" == c || "#" == c || stateOverride) {
          if ("" != buffer) {
            var temp = parseInt(buffer, 10);
            if (temp != relative[this._scheme]) {
              this._port = temp + "";
            }
            buffer = "";
          }
          if (stateOverride) {
            break loop;
          }
          state = "relative path start";
          continue;
        } else if ("	" == c || "\n" == c || "\r" == c) {
          err("Invalid code point in port: " + c);
        } else {
          invalid.call(this);
        }
        break;

       case "relative path start":
        if ("\\" == c) err("'\\' not allowed in path.");
        state = "relative path";
        if ("/" != c && "\\" != c) {
          continue;
        }
        break;

       case "relative path":
        if (EOF == c || "/" == c || "\\" == c || !stateOverride && ("?" == c || "#" == c)) {
          if ("\\" == c) {
            err("\\ not allowed in relative path.");
          }
          var tmp;
          if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
            buffer = tmp;
          }
          if (".." == buffer) {
            this._path.pop();
            if ("/" != c && "\\" != c) {
              this._path.push("");
            }
          } else if ("." == buffer && "/" != c && "\\" != c) {
            this._path.push("");
          } else if ("." != buffer) {
            if ("file" == this._scheme && this._path.length == 0 && buffer.length == 2 && ALPHA.test(buffer[0]) && buffer[1] == "|") {
              buffer = buffer[0] + ":";
            }
            this._path.push(buffer);
          }
          buffer = "";
          if ("?" == c) {
            this._query = "?";
            state = "query";
          } else if ("#" == c) {
            this._fragment = "#";
            state = "fragment";
          }
        } else if ("	" != c && "\n" != c && "\r" != c) {
          buffer += percentEscape(c);
        }
        break;

       case "query":
        if (!stateOverride && "#" == c) {
          this._fragment = "#";
          state = "fragment";
        } else if (EOF != c && "	" != c && "\n" != c && "\r" != c) {
          this._query += percentEscapeQuery(c);
        }
        break;

       case "fragment":
        if (EOF != c && "	" != c && "\n" != c && "\r" != c) {
          this._fragment += c;
        }
        break;
      }
      cursor++;
    }
  }
  function clear() {
    this._scheme = "";
    this._schemeData = "";
    this._username = "";
    this._password = null;
    this._host = "";
    this._port = "";
    this._path = [];
    this._query = "";
    this._fragment = "";
    this._isInvalid = false;
    this._isRelative = false;
  }
  function jURL(url, base) {
    if (base !== undefined && !(base instanceof jURL)) base = new jURL(String(base));
    this._url = url;
    clear.call(this);
    var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, "");
    parse.call(this, input, null, base);
  }
  jURL.prototype = {
    toString: function() {
      return this.href;
    },
    get href() {
      if (this._isInvalid) return this._url;
      var authority = "";
      if ("" != this._username || null != this._password) {
        authority = this._username + (null != this._password ? ":" + this._password : "") + "@";
      }
      return this.protocol + (this._isRelative ? "//" + authority + this.host : "") + this.pathname + this._query + this._fragment;
    },
    set href(href) {
      clear.call(this);
      parse.call(this, href);
    },
    get protocol() {
      return this._scheme + ":";
    },
    set protocol(protocol) {
      if (this._isInvalid) return;
      parse.call(this, protocol + ":", "scheme start");
    },
    get host() {
      return this._isInvalid ? "" : this._port ? this._host + ":" + this._port : this._host;
    },
    set host(host) {
      if (this._isInvalid || !this._isRelative) return;
      parse.call(this, host, "host");
    },
    get hostname() {
      return this._host;
    },
    set hostname(hostname) {
      if (this._isInvalid || !this._isRelative) return;
      parse.call(this, hostname, "hostname");
    },
    get port() {
      return this._port;
    },
    set port(port) {
      if (this._isInvalid || !this._isRelative) return;
      parse.call(this, port, "port");
    },
    get pathname() {
      return this._isInvalid ? "" : this._isRelative ? "/" + this._path.join("/") : this._schemeData;
    },
    set pathname(pathname) {
      if (this._isInvalid || !this._isRelative) return;
      this._path = [];
      parse.call(this, pathname, "relative path start");
    },
    get search() {
      return this._isInvalid || !this._query || "?" == this._query ? "" : this._query;
    },
    set search(search) {
      if (this._isInvalid || !this._isRelative) return;
      this._query = "?";
      if ("?" == search[0]) search = search.slice(1);
      parse.call(this, search, "query");
    },
    get hash() {
      return this._isInvalid || !this._fragment || "#" == this._fragment ? "" : this._fragment;
    },
    set hash(hash) {
      if (this._isInvalid) return;
      this._fragment = "#";
      if ("#" == hash[0]) hash = hash.slice(1);
      parse.call(this, hash, "fragment");
    },
    get origin() {
      var host;
      if (this._isInvalid || !this._scheme) {
        return "";
      }
      switch (this._scheme) {
       case "data":
       case "file":
       case "javascript":
       case "mailto":
        return "null";
      }
      host = this.host;
      if (!host) {
        return "";
      }
      return this._scheme + "://" + host;
    }
  };
  var OriginalURL = scope.URL;
  if (OriginalURL) {
    jURL.createObjectURL = function(blob) {
      return OriginalURL.createObjectURL.apply(OriginalURL, arguments);
    };
    jURL.revokeObjectURL = function(url) {
      OriginalURL.revokeObjectURL(url);
    };
  }
  scope.URL = jURL;
})(self);

if (typeof WeakMap === "undefined") {
  (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;
    var WeakMap = function() {
      this.name = "__st" + (Math.random() * 1e9 >>> 0) + (counter++ + "__");
    };
    WeakMap.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key) entry[1] = value; else defineProperty(key, this.name, {
          value: [ key, value ],
          writable: true
        });
        return this;
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined;
      },
      "delete": function(key) {
        var entry = key[this.name];
        if (!entry || entry[0] !== key) return false;
        entry[0] = entry[1] = undefined;
        return true;
      },
      has: function(key) {
        var entry = key[this.name];
        if (!entry) return false;
        return entry[0] === key;
      }
    };
    window.WeakMap = WeakMap;
  })();
}

(function(global) {
  if (global.JsMutationObserver) {
    return;
  }
  var registrationsTable = new WeakMap();
  var setImmediate;
  if (/Trident|Edge/.test(navigator.userAgent)) {
    setImmediate = setTimeout;
  } else if (window.setImmediate) {
    setImmediate = window.setImmediate;
  } else {
    var setImmediateQueue = [];
    var sentinel = String(Math.random());
    window.addEventListener("message", function(e) {
      if (e.data === sentinel) {
        var queue = setImmediateQueue;
        setImmediateQueue = [];
        queue.forEach(function(func) {
          func();
        });
      }
    });
    setImmediate = function(func) {
      setImmediateQueue.push(func);
      window.postMessage(sentinel, "*");
    };
  }
  var isScheduled = false;
  var scheduledObservers = [];
  function scheduleCallback(observer) {
    scheduledObservers.push(observer);
    if (!isScheduled) {
      isScheduled = true;
      setImmediate(dispatchCallbacks);
    }
  }
  function wrapIfNeeded(node) {
    return window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(node) || node;
  }
  function dispatchCallbacks() {
    isScheduled = false;
    var observers = scheduledObservers;
    scheduledObservers = [];
    observers.sort(function(o1, o2) {
      return o1.uid_ - o2.uid_;
    });
    var anyNonEmpty = false;
    observers.forEach(function(observer) {
      var queue = observer.takeRecords();
      removeTransientObserversFor(observer);
      if (queue.length) {
        observer.callback_(queue, observer);
        anyNonEmpty = true;
      }
    });
    if (anyNonEmpty) dispatchCallbacks();
  }
  function removeTransientObserversFor(observer) {
    observer.nodes_.forEach(function(node) {
      var registrations = registrationsTable.get(node);
      if (!registrations) return;
      registrations.forEach(function(registration) {
        if (registration.observer === observer) registration.removeTransientObservers();
      });
    });
  }
  function forEachAncestorAndObserverEnqueueRecord(target, callback) {
    for (var node = target; node; node = node.parentNode) {
      var registrations = registrationsTable.get(node);
      if (registrations) {
        for (var j = 0; j < registrations.length; j++) {
          var registration = registrations[j];
          var options = registration.options;
          if (node !== target && !options.subtree) continue;
          var record = callback(options);
          if (record) registration.enqueue(record);
        }
      }
    }
  }
  var uidCounter = 0;
  function JsMutationObserver(callback) {
    this.callback_ = callback;
    this.nodes_ = [];
    this.records_ = [];
    this.uid_ = ++uidCounter;
  }
  JsMutationObserver.prototype = {
    observe: function(target, options) {
      target = wrapIfNeeded(target);
      if (!options.childList && !options.attributes && !options.characterData || options.attributeOldValue && !options.attributes || options.attributeFilter && options.attributeFilter.length && !options.attributes || options.characterDataOldValue && !options.characterData) {
        throw new SyntaxError();
      }
      var registrations = registrationsTable.get(target);
      if (!registrations) registrationsTable.set(target, registrations = []);
      var registration;
      for (var i = 0; i < registrations.length; i++) {
        if (registrations[i].observer === this) {
          registration = registrations[i];
          registration.removeListeners();
          registration.options = options;
          break;
        }
      }
      if (!registration) {
        registration = new Registration(this, target, options);
        registrations.push(registration);
        this.nodes_.push(target);
      }
      registration.addListeners();
    },
    disconnect: function() {
      this.nodes_.forEach(function(node) {
        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          var registration = registrations[i];
          if (registration.observer === this) {
            registration.removeListeners();
            registrations.splice(i, 1);
            break;
          }
        }
      }, this);
      this.records_ = [];
    },
    takeRecords: function() {
      var copyOfRecords = this.records_;
      this.records_ = [];
      return copyOfRecords;
    }
  };
  function MutationRecord(type, target) {
    this.type = type;
    this.target = target;
    this.addedNodes = [];
    this.removedNodes = [];
    this.previousSibling = null;
    this.nextSibling = null;
    this.attributeName = null;
    this.attributeNamespace = null;
    this.oldValue = null;
  }
  function copyMutationRecord(original) {
    var record = new MutationRecord(original.type, original.target);
    record.addedNodes = original.addedNodes.slice();
    record.removedNodes = original.removedNodes.slice();
    record.previousSibling = original.previousSibling;
    record.nextSibling = original.nextSibling;
    record.attributeName = original.attributeName;
    record.attributeNamespace = original.attributeNamespace;
    record.oldValue = original.oldValue;
    return record;
  }
  var currentRecord, recordWithOldValue;
  function getRecord(type, target) {
    return currentRecord = new MutationRecord(type, target);
  }
  function getRecordWithOldValue(oldValue) {
    if (recordWithOldValue) return recordWithOldValue;
    recordWithOldValue = copyMutationRecord(currentRecord);
    recordWithOldValue.oldValue = oldValue;
    return recordWithOldValue;
  }
  function clearRecords() {
    currentRecord = recordWithOldValue = undefined;
  }
  function recordRepresentsCurrentMutation(record) {
    return record === recordWithOldValue || record === currentRecord;
  }
  function selectRecord(lastRecord, newRecord) {
    if (lastRecord === newRecord) return lastRecord;
    if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord)) return recordWithOldValue;
    return null;
  }
  function Registration(observer, target, options) {
    this.observer = observer;
    this.target = target;
    this.options = options;
    this.transientObservedNodes = [];
  }
  Registration.prototype = {
    enqueue: function(record) {
      var records = this.observer.records_;
      var length = records.length;
      if (records.length > 0) {
        var lastRecord = records[length - 1];
        var recordToReplaceLast = selectRecord(lastRecord, record);
        if (recordToReplaceLast) {
          records[length - 1] = recordToReplaceLast;
          return;
        }
      } else {
        scheduleCallback(this.observer);
      }
      records[length] = record;
    },
    addListeners: function() {
      this.addListeners_(this.target);
    },
    addListeners_: function(node) {
      var options = this.options;
      if (options.attributes) node.addEventListener("DOMAttrModified", this, true);
      if (options.characterData) node.addEventListener("DOMCharacterDataModified", this, true);
      if (options.childList) node.addEventListener("DOMNodeInserted", this, true);
      if (options.childList || options.subtree) node.addEventListener("DOMNodeRemoved", this, true);
    },
    removeListeners: function() {
      this.removeListeners_(this.target);
    },
    removeListeners_: function(node) {
      var options = this.options;
      if (options.attributes) node.removeEventListener("DOMAttrModified", this, true);
      if (options.characterData) node.removeEventListener("DOMCharacterDataModified", this, true);
      if (options.childList) node.removeEventListener("DOMNodeInserted", this, true);
      if (options.childList || options.subtree) node.removeEventListener("DOMNodeRemoved", this, true);
    },
    addTransientObserver: function(node) {
      if (node === this.target) return;
      this.addListeners_(node);
      this.transientObservedNodes.push(node);
      var registrations = registrationsTable.get(node);
      if (!registrations) registrationsTable.set(node, registrations = []);
      registrations.push(this);
    },
    removeTransientObservers: function() {
      var transientObservedNodes = this.transientObservedNodes;
      this.transientObservedNodes = [];
      transientObservedNodes.forEach(function(node) {
        this.removeListeners_(node);
        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          if (registrations[i] === this) {
            registrations.splice(i, 1);
            break;
          }
        }
      }, this);
    },
    handleEvent: function(e) {
      e.stopImmediatePropagation();
      switch (e.type) {
       case "DOMAttrModified":
        var name = e.attrName;
        var namespace = e.relatedNode.namespaceURI;
        var target = e.target;
        var record = new getRecord("attributes", target);
        record.attributeName = name;
        record.attributeNamespace = namespace;
        var oldValue = e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;
        forEachAncestorAndObserverEnqueueRecord(target, function(options) {
          if (!options.attributes) return;
          if (options.attributeFilter && options.attributeFilter.length && options.attributeFilter.indexOf(name) === -1 && options.attributeFilter.indexOf(namespace) === -1) {
            return;
          }
          if (options.attributeOldValue) return getRecordWithOldValue(oldValue);
          return record;
        });
        break;

       case "DOMCharacterDataModified":
        var target = e.target;
        var record = getRecord("characterData", target);
        var oldValue = e.prevValue;
        forEachAncestorAndObserverEnqueueRecord(target, function(options) {
          if (!options.characterData) return;
          if (options.characterDataOldValue) return getRecordWithOldValue(oldValue);
          return record;
        });
        break;

       case "DOMNodeRemoved":
        this.addTransientObserver(e.target);

       case "DOMNodeInserted":
        var changedNode = e.target;
        var addedNodes, removedNodes;
        if (e.type === "DOMNodeInserted") {
          addedNodes = [ changedNode ];
          removedNodes = [];
        } else {
          addedNodes = [];
          removedNodes = [ changedNode ];
        }
        var previousSibling = changedNode.previousSibling;
        var nextSibling = changedNode.nextSibling;
        var record = getRecord("childList", e.target.parentNode);
        record.addedNodes = addedNodes;
        record.removedNodes = removedNodes;
        record.previousSibling = previousSibling;
        record.nextSibling = nextSibling;
        forEachAncestorAndObserverEnqueueRecord(e.relatedNode, function(options) {
          if (!options.childList) return;
          return record;
        });
      }
      clearRecords();
    }
  };
  global.JsMutationObserver = JsMutationObserver;
  if (!global.MutationObserver) {
    global.MutationObserver = JsMutationObserver;
    JsMutationObserver._isPolyfilled = true;
  }
})(self);

if (typeof HTMLTemplateElement === "undefined") {
  (function() {
    var TEMPLATE_TAG = "template";
    var contentDoc = document.implementation.createHTMLDocument("template");
    var canDecorate = true;
    HTMLTemplateElement = function() {};
    HTMLTemplateElement.prototype = Object.create(HTMLElement.prototype);
    HTMLTemplateElement.decorate = function(template) {
      if (template.content) {
        return;
      }
      template.content = contentDoc.createDocumentFragment();
      var child;
      while (child = template.firstChild) {
        template.content.appendChild(child);
      }
      if (canDecorate) {
        try {
          Object.defineProperty(template, "innerHTML", {
            get: function() {
              var o = "";
              for (var e = this.content.firstChild; e; e = e.nextSibling) {
                o += e.outerHTML || escapeData(e.data);
              }
              return o;
            },
            set: function(text) {
              contentDoc.body.innerHTML = text;
              HTMLTemplateElement.bootstrap(contentDoc);
              while (this.content.firstChild) {
                this.content.removeChild(this.content.firstChild);
              }
              while (contentDoc.body.firstChild) {
                this.content.appendChild(contentDoc.body.firstChild);
              }
            },
            configurable: true
          });
        } catch (err) {
          canDecorate = false;
        }
      }
      HTMLTemplateElement.bootstrap(template.content);
    };
    HTMLTemplateElement.bootstrap = function(doc) {
      var templates = doc.querySelectorAll(TEMPLATE_TAG);
      for (var i = 0, l = templates.length, t; i < l && (t = templates[i]); i++) {
        HTMLTemplateElement.decorate(t);
      }
    };
    document.addEventListener("DOMContentLoaded", function() {
      HTMLTemplateElement.bootstrap(document);
    });
    var createElement = document.createElement;
    document.createElement = function() {
      "use strict";
      var el = createElement.apply(document, arguments);
      if (el.localName == "template") {
        HTMLTemplateElement.decorate(el);
      }
      return el;
    };
    var escapeDataRegExp = /[&\u00A0<>]/g;
    function escapeReplace(c) {
      switch (c) {
       case "&":
        return "&amp;";

       case "<":
        return "&lt;";

       case ">":
        return "&gt;";

       case " ":
        return "&nbsp;";
      }
    }
    function escapeData(s) {
      return s.replace(escapeDataRegExp, escapeReplace);
    }
  })();
}

(function(scope) {
  "use strict";
  if (!window.performance) {
    var start = Date.now();
    window.performance = {
      now: function() {
        return Date.now() - start;
      }
    };
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function() {
      var nativeRaf = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
      return nativeRaf ? function(callback) {
        return nativeRaf(function() {
          callback(performance.now());
        });
      } : function(callback) {
        return window.setTimeout(callback, 1e3 / 60);
      };
    }();
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function() {
      return window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || function(id) {
        clearTimeout(id);
      };
    }();
  }
  var workingDefaultPrevented = function() {
    var e = document.createEvent("Event");
    e.initEvent("foo", true, true);
    e.preventDefault();
    return e.defaultPrevented;
  }();
  if (!workingDefaultPrevented) {
    var origPreventDefault = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function() {
      if (!this.cancelable) {
        return;
      }
      origPreventDefault.call(this);
      Object.defineProperty(this, "defaultPrevented", {
        get: function() {
          return true;
        },
        configurable: true
      });
    };
  }
  var isIE = /Trident/.test(navigator.userAgent);
  if (!window.CustomEvent || isIE && typeof window.CustomEvent !== "function") {
    window.CustomEvent = function(inType, params) {
      params = params || {};
      var e = document.createEvent("CustomEvent");
      e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
      return e;
    };
    window.CustomEvent.prototype = window.Event.prototype;
  }
  if (!window.Event || isIE && typeof window.Event !== "function") {
    var origEvent = window.Event;
    window.Event = function(inType, params) {
      params = params || {};
      var e = document.createEvent("Event");
      e.initEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable));
      return e;
    };
    window.Event.prototype = origEvent.prototype;
  }
})(window.WebComponents);

window.HTMLImports = window.HTMLImports || {
  flags: {}
};

(function(scope) {
  var IMPORT_LINK_TYPE = "import";
  var useNative = Boolean(IMPORT_LINK_TYPE in document.createElement("link"));
  var hasShadowDOMPolyfill = Boolean(window.ShadowDOMPolyfill);
  var wrap = function(node) {
    return hasShadowDOMPolyfill ? window.ShadowDOMPolyfill.wrapIfNeeded(node) : node;
  };
  var rootDocument = wrap(document);
  var currentScriptDescriptor = {
    get: function() {
      var script = window.HTMLImports.currentScript || document.currentScript || (document.readyState !== "complete" ? document.scripts[document.scripts.length - 1] : null);
      return wrap(script);
    },
    configurable: true
  };
  Object.defineProperty(document, "_currentScript", currentScriptDescriptor);
  Object.defineProperty(rootDocument, "_currentScript", currentScriptDescriptor);
  var isIE = /Trident/.test(navigator.userAgent);
  function whenReady(callback, doc) {
    doc = doc || rootDocument;
    whenDocumentReady(function() {
      watchImportsLoad(callback, doc);
    }, doc);
  }
  var requiredReadyState = isIE ? "complete" : "interactive";
  var READY_EVENT = "readystatechange";
  function isDocumentReady(doc) {
    return doc.readyState === "complete" || doc.readyState === requiredReadyState;
  }
  function whenDocumentReady(callback, doc) {
    if (!isDocumentReady(doc)) {
      var checkReady = function() {
        if (doc.readyState === "complete" || doc.readyState === requiredReadyState) {
          doc.removeEventListener(READY_EVENT, checkReady);
          whenDocumentReady(callback, doc);
        }
      };
      doc.addEventListener(READY_EVENT, checkReady);
    } else if (callback) {
      callback();
    }
  }
  function markTargetLoaded(event) {
    event.target.__loaded = true;
  }
  function watchImportsLoad(callback, doc) {
    var imports = doc.querySelectorAll("link[rel=import]");
    var parsedCount = 0, importCount = imports.length, newImports = [], errorImports = [];
    function checkDone() {
      if (parsedCount == importCount && callback) {
        callback({
          allImports: imports,
          loadedImports: newImports,
          errorImports: errorImports
        });
      }
    }
    function loadedImport(e) {
      markTargetLoaded(e);
      newImports.push(this);
      parsedCount++;
      checkDone();
    }
    function errorLoadingImport(e) {
      errorImports.push(this);
      parsedCount++;
      checkDone();
    }
    if (importCount) {
      for (var i = 0, imp; i < importCount && (imp = imports[i]); i++) {
        if (isImportLoaded(imp)) {
          newImports.push(this);
          parsedCount++;
          checkDone();
        } else {
          imp.addEventListener("load", loadedImport);
          imp.addEventListener("error", errorLoadingImport);
        }
      }
    } else {
      checkDone();
    }
  }
  function isImportLoaded(link) {
    return useNative ? link.__loaded || link.import && link.import.readyState !== "loading" : link.__importParsed;
  }
  if (useNative) {
    new MutationObserver(function(mxns) {
      for (var i = 0, l = mxns.length, m; i < l && (m = mxns[i]); i++) {
        if (m.addedNodes) {
          handleImports(m.addedNodes);
        }
      }
    }).observe(document.head, {
      childList: true
    });
    function handleImports(nodes) {
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        if (isImport(n)) {
          handleImport(n);
        }
      }
    }
    function isImport(element) {
      return element.localName === "link" && element.rel === "import";
    }
    function handleImport(element) {
      var loaded = element.import;
      if (loaded) {
        markTargetLoaded({
          target: element
        });
      } else {
        element.addEventListener("load", markTargetLoaded);
        element.addEventListener("error", markTargetLoaded);
      }
    }
    (function() {
      if (document.readyState === "loading") {
        var imports = document.querySelectorAll("link[rel=import]");
        for (var i = 0, l = imports.length, imp; i < l && (imp = imports[i]); i++) {
          handleImport(imp);
        }
      }
    })();
  }
  whenReady(function(detail) {
    window.HTMLImports.ready = true;
    window.HTMLImports.readyTime = new Date().getTime();
    var evt = rootDocument.createEvent("CustomEvent");
    evt.initCustomEvent("HTMLImportsLoaded", true, true, detail);
    rootDocument.dispatchEvent(evt);
  });
  scope.IMPORT_LINK_TYPE = IMPORT_LINK_TYPE;
  scope.useNative = useNative;
  scope.rootDocument = rootDocument;
  scope.whenReady = whenReady;
  scope.isIE = isIE;
})(window.HTMLImports);

(function(scope) {
  var modules = [];
  var addModule = function(module) {
    modules.push(module);
  };
  var initializeModules = function() {
    modules.forEach(function(module) {
      module(scope);
    });
  };
  scope.addModule = addModule;
  scope.initializeModules = initializeModules;
})(window.HTMLImports);

window.HTMLImports.addModule(function(scope) {
  var CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
  var CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g;
  var path = {
    resolveUrlsInStyle: function(style, linkUrl) {
      var doc = style.ownerDocument;
      var resolver = doc.createElement("a");
      style.textContent = this.resolveUrlsInCssText(style.textContent, linkUrl, resolver);
      return style;
    },
    resolveUrlsInCssText: function(cssText, linkUrl, urlObj) {
      var r = this.replaceUrls(cssText, urlObj, linkUrl, CSS_URL_REGEXP);
      r = this.replaceUrls(r, urlObj, linkUrl, CSS_IMPORT_REGEXP);
      return r;
    },
    replaceUrls: function(text, urlObj, linkUrl, regexp) {
      return text.replace(regexp, function(m, pre, url, post) {
        var urlPath = url.replace(/["']/g, "");
        if (linkUrl) {
          urlPath = new URL(urlPath, linkUrl).href;
        }
        urlObj.href = urlPath;
        urlPath = urlObj.href;
        return pre + "'" + urlPath + "'" + post;
      });
    }
  };
  scope.path = path;
});

window.HTMLImports.addModule(function(scope) {
  var xhr = {
    async: true,
    ok: function(request) {
      return request.status >= 200 && request.status < 300 || request.status === 304 || request.status === 0;
    },
    load: function(url, next, nextContext) {
      var request = new XMLHttpRequest();
      if (scope.flags.debug || scope.flags.bust) {
        url += "?" + Math.random();
      }
      request.open("GET", url, xhr.async);
      request.addEventListener("readystatechange", function(e) {
        if (request.readyState === 4) {
          var redirectedUrl = null;
          try {
            var locationHeader = request.getResponseHeader("Location");
            if (locationHeader) {
              redirectedUrl = locationHeader.substr(0, 1) === "/" ? location.origin + locationHeader : locationHeader;
            }
          } catch (e) {
            console.error(e.message);
          }
          next.call(nextContext, !xhr.ok(request) && request, request.response || request.responseText, redirectedUrl);
        }
      });
      request.send();
      return request;
    },
    loadDocument: function(url, next, nextContext) {
      this.load(url, next, nextContext).responseType = "document";
    }
  };
  scope.xhr = xhr;
});

window.HTMLImports.addModule(function(scope) {
  var xhr = scope.xhr;
  var flags = scope.flags;
  var Loader = function(onLoad, onComplete) {
    this.cache = {};
    this.onload = onLoad;
    this.oncomplete = onComplete;
    this.inflight = 0;
    this.pending = {};
  };
  Loader.prototype = {
    addNodes: function(nodes) {
      this.inflight += nodes.length;
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        this.require(n);
      }
      this.checkDone();
    },
    addNode: function(node) {
      this.inflight++;
      this.require(node);
      this.checkDone();
    },
    require: function(elt) {
      var url = elt.src || elt.href;
      elt.__nodeUrl = url;
      if (!this.dedupe(url, elt)) {
        this.fetch(url, elt);
      }
    },
    dedupe: function(url, elt) {
      if (this.pending[url]) {
        this.pending[url].push(elt);
        return true;
      }
      var resource;
      if (this.cache[url]) {
        this.onload(url, elt, this.cache[url]);
        this.tail();
        return true;
      }
      this.pending[url] = [ elt ];
      return false;
    },
    fetch: function(url, elt) {
      flags.load && console.log("fetch", url, elt);
      if (!url) {
        setTimeout(function() {
          this.receive(url, elt, {
            error: "href must be specified"
          }, null);
        }.bind(this), 0);
      } else if (url.match(/^data:/)) {
        var pieces = url.split(",");
        var header = pieces[0];
        var body = pieces[1];
        if (header.indexOf(";base64") > -1) {
          body = atob(body);
        } else {
          body = decodeURIComponent(body);
        }
        setTimeout(function() {
          this.receive(url, elt, null, body);
        }.bind(this), 0);
      } else {
        var receiveXhr = function(err, resource, redirectedUrl) {
          this.receive(url, elt, err, resource, redirectedUrl);
        }.bind(this);
        xhr.load(url, receiveXhr);
      }
    },
    receive: function(url, elt, err, resource, redirectedUrl) {
      this.cache[url] = resource;
      var $p = this.pending[url];
      for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
        this.onload(url, p, resource, err, redirectedUrl);
        this.tail();
      }
      this.pending[url] = null;
    },
    tail: function() {
      --this.inflight;
      this.checkDone();
    },
    checkDone: function() {
      if (!this.inflight) {
        this.oncomplete();
      }
    }
  };
  scope.Loader = Loader;
});

window.HTMLImports.addModule(function(scope) {
  var Observer = function(addCallback) {
    this.addCallback = addCallback;
    this.mo = new MutationObserver(this.handler.bind(this));
  };
  Observer.prototype = {
    handler: function(mutations) {
      for (var i = 0, l = mutations.length, m; i < l && (m = mutations[i]); i++) {
        if (m.type === "childList" && m.addedNodes.length) {
          this.addedNodes(m.addedNodes);
        }
      }
    },
    addedNodes: function(nodes) {
      if (this.addCallback) {
        this.addCallback(nodes);
      }
      for (var i = 0, l = nodes.length, n, loading; i < l && (n = nodes[i]); i++) {
        if (n.children && n.children.length) {
          this.addedNodes(n.children);
        }
      }
    },
    observe: function(root) {
      this.mo.observe(root, {
        childList: true,
        subtree: true
      });
    }
  };
  scope.Observer = Observer;
});

window.HTMLImports.addModule(function(scope) {
  var path = scope.path;
  var rootDocument = scope.rootDocument;
  var flags = scope.flags;
  var isIE = scope.isIE;
  var IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE;
  var IMPORT_SELECTOR = "link[rel=" + IMPORT_LINK_TYPE + "]";
  var importParser = {
    documentSelectors: IMPORT_SELECTOR,
    importsSelectors: [ IMPORT_SELECTOR, "link[rel=stylesheet]:not([type])", "style:not([type])", "script:not([type])", 'script[type="application/javascript"]', 'script[type="text/javascript"]' ].join(","),
    map: {
      link: "parseLink",
      script: "parseScript",
      style: "parseStyle"
    },
    dynamicElements: [],
    parseNext: function() {
      var next = this.nextToParse();
      if (next) {
        this.parse(next);
      }
    },
    parse: function(elt) {
      if (this.isParsed(elt)) {
        flags.parse && console.log("[%s] is already parsed", elt.localName);
        return;
      }
      var fn = this[this.map[elt.localName]];
      if (fn) {
        this.markParsing(elt);
        fn.call(this, elt);
      }
    },
    parseDynamic: function(elt, quiet) {
      this.dynamicElements.push(elt);
      if (!quiet) {
        this.parseNext();
      }
    },
    markParsing: function(elt) {
      flags.parse && console.log("parsing", elt);
      this.parsingElement = elt;
    },
    markParsingComplete: function(elt) {
      elt.__importParsed = true;
      this.markDynamicParsingComplete(elt);
      if (elt.__importElement) {
        elt.__importElement.__importParsed = true;
        this.markDynamicParsingComplete(elt.__importElement);
      }
      this.parsingElement = null;
      flags.parse && console.log("completed", elt);
    },
    markDynamicParsingComplete: function(elt) {
      var i = this.dynamicElements.indexOf(elt);
      if (i >= 0) {
        this.dynamicElements.splice(i, 1);
      }
    },
    parseImport: function(elt) {
      elt.import = elt.__doc;
      if (window.HTMLImports.__importsParsingHook) {
        window.HTMLImports.__importsParsingHook(elt);
      }
      if (elt.import) {
        elt.import.__importParsed = true;
      }
      this.markParsingComplete(elt);
      if (elt.__resource && !elt.__error) {
        elt.dispatchEvent(new CustomEvent("load", {
          bubbles: false
        }));
      } else {
        elt.dispatchEvent(new CustomEvent("error", {
          bubbles: false
        }));
      }
      if (elt.__pending) {
        var fn;
        while (elt.__pending.length) {
          fn = elt.__pending.shift();
          if (fn) {
            fn({
              target: elt
            });
          }
        }
      }
      this.parseNext();
    },
    parseLink: function(linkElt) {
      if (nodeIsImport(linkElt)) {
        this.parseImport(linkElt);
      } else {
        linkElt.href = linkElt.href;
        this.parseGeneric(linkElt);
      }
    },
    parseStyle: function(elt) {
      var src = elt;
      elt = cloneStyle(elt);
      src.__appliedElement = elt;
      elt.__importElement = src;
      this.parseGeneric(elt);
    },
    parseGeneric: function(elt) {
      this.trackElement(elt);
      this.addElementToDocument(elt);
    },
    rootImportForElement: function(elt) {
      var n = elt;
      while (n.ownerDocument.__importLink) {
        n = n.ownerDocument.__importLink;
      }
      return n;
    },
    addElementToDocument: function(elt) {
      var port = this.rootImportForElement(elt.__importElement || elt);
      port.parentNode.insertBefore(elt, port);
    },
    trackElement: function(elt, callback) {
      var self = this;
      var done = function(e) {
        elt.removeEventListener("load", done);
        elt.removeEventListener("error", done);
        if (callback) {
          callback(e);
        }
        self.markParsingComplete(elt);
        self.parseNext();
      };
      elt.addEventListener("load", done);
      elt.addEventListener("error", done);
      if (isIE && elt.localName === "style") {
        var fakeLoad = false;
        if (elt.textContent.indexOf("@import") == -1) {
          fakeLoad = true;
        } else if (elt.sheet) {
          fakeLoad = true;
          var csr = elt.sheet.cssRules;
          var len = csr ? csr.length : 0;
          for (var i = 0, r; i < len && (r = csr[i]); i++) {
            if (r.type === CSSRule.IMPORT_RULE) {
              fakeLoad = fakeLoad && Boolean(r.styleSheet);
            }
          }
        }
        if (fakeLoad) {
          setTimeout(function() {
            elt.dispatchEvent(new CustomEvent("load", {
              bubbles: false
            }));
          });
        }
      }
    },
    parseScript: function(scriptElt) {
      var script = document.createElement("script");
      script.__importElement = scriptElt;
      script.src = scriptElt.src ? scriptElt.src : generateScriptDataUrl(scriptElt);
      scope.currentScript = scriptElt;
      this.trackElement(script, function(e) {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        scope.currentScript = null;
      });
      this.addElementToDocument(script);
    },
    nextToParse: function() {
      this._mayParse = [];
      return !this.parsingElement && (this.nextToParseInDoc(rootDocument) || this.nextToParseDynamic());
    },
    nextToParseInDoc: function(doc, link) {
      if (doc && this._mayParse.indexOf(doc) < 0) {
        this._mayParse.push(doc);
        var nodes = doc.querySelectorAll(this.parseSelectorsForNode(doc));
        for (var i = 0, l = nodes.length, p = 0, n; i < l && (n = nodes[i]); i++) {
          if (!this.isParsed(n)) {
            if (this.hasResource(n)) {
              return nodeIsImport(n) ? this.nextToParseInDoc(n.__doc, n) : n;
            } else {
              return;
            }
          }
        }
      }
      return link;
    },
    nextToParseDynamic: function() {
      return this.dynamicElements[0];
    },
    parseSelectorsForNode: function(node) {
      var doc = node.ownerDocument || node;
      return doc === rootDocument ? this.documentSelectors : this.importsSelectors;
    },
    isParsed: function(node) {
      return node.__importParsed;
    },
    needsDynamicParsing: function(elt) {
      return this.dynamicElements.indexOf(elt) >= 0;
    },
    hasResource: function(node) {
      if (nodeIsImport(node) && node.__doc === undefined) {
        return false;
      }
      return true;
    }
  };
  function nodeIsImport(elt) {
    return elt.localName === "link" && elt.rel === IMPORT_LINK_TYPE;
  }
  function generateScriptDataUrl(script) {
    var scriptContent = generateScriptContent(script);
    return "data:text/javascript;charset=utf-8," + encodeURIComponent(scriptContent);
  }
  function generateScriptContent(script) {
    return script.textContent + generateSourceMapHint(script);
  }
  function generateSourceMapHint(script) {
    var owner = script.ownerDocument;
    owner.__importedScripts = owner.__importedScripts || 0;
    var moniker = script.ownerDocument.baseURI;
    var num = owner.__importedScripts ? "-" + owner.__importedScripts : "";
    owner.__importedScripts++;
    return "\n//# sourceURL=" + moniker + num + ".js\n";
  }
  function cloneStyle(style) {
    var clone = style.ownerDocument.createElement("style");
    clone.textContent = style.textContent;
    path.resolveUrlsInStyle(clone);
    return clone;
  }
  scope.parser = importParser;
  scope.IMPORT_SELECTOR = IMPORT_SELECTOR;
});

window.HTMLImports.addModule(function(scope) {
  var flags = scope.flags;
  var IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE;
  var IMPORT_SELECTOR = scope.IMPORT_SELECTOR;
  var rootDocument = scope.rootDocument;
  var Loader = scope.Loader;
  var Observer = scope.Observer;
  var parser = scope.parser;
  var importer = {
    documents: {},
    documentPreloadSelectors: IMPORT_SELECTOR,
    importsPreloadSelectors: [ IMPORT_SELECTOR ].join(","),
    loadNode: function(node) {
      importLoader.addNode(node);
    },
    loadSubtree: function(parent) {
      var nodes = this.marshalNodes(parent);
      importLoader.addNodes(nodes);
    },
    marshalNodes: function(parent) {
      return parent.querySelectorAll(this.loadSelectorsForNode(parent));
    },
    loadSelectorsForNode: function(node) {
      var doc = node.ownerDocument || node;
      return doc === rootDocument ? this.documentPreloadSelectors : this.importsPreloadSelectors;
    },
    loaded: function(url, elt, resource, err, redirectedUrl) {
      flags.load && console.log("loaded", url, elt);
      elt.__resource = resource;
      elt.__error = err;
      if (isImportLink(elt)) {
        var doc = this.documents[url];
        if (doc === undefined) {
          doc = err ? null : makeDocument(resource, redirectedUrl || url);
          if (doc) {
            doc.__importLink = elt;
            this.bootDocument(doc);
          }
          this.documents[url] = doc;
        }
        elt.__doc = doc;
      }
      parser.parseNext();
    },
    bootDocument: function(doc) {
      this.loadSubtree(doc);
      this.observer.observe(doc);
      parser.parseNext();
    },
    loadedAll: function() {
      parser.parseNext();
    }
  };
  var importLoader = new Loader(importer.loaded.bind(importer), importer.loadedAll.bind(importer));
  importer.observer = new Observer();
  function isImportLink(elt) {
    return isLinkRel(elt, IMPORT_LINK_TYPE);
  }
  function isLinkRel(elt, rel) {
    return elt.localName === "link" && elt.getAttribute("rel") === rel;
  }
  function hasBaseURIAccessor(doc) {
    return !!Object.getOwnPropertyDescriptor(doc, "baseURI");
  }
  function makeDocument(resource, url) {
    var doc = document.implementation.createHTMLDocument(IMPORT_LINK_TYPE);
    doc._URL = url;
    var base = doc.createElement("base");
    base.setAttribute("href", url);
    if (!doc.baseURI && !hasBaseURIAccessor(doc)) {
      Object.defineProperty(doc, "baseURI", {
        value: url
      });
    }
    var meta = doc.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    doc.head.appendChild(meta);
    doc.head.appendChild(base);
    doc.body.innerHTML = resource;
    if (window.HTMLTemplateElement && HTMLTemplateElement.bootstrap) {
      HTMLTemplateElement.bootstrap(doc);
    }
    return doc;
  }
  if (!document.baseURI) {
    var baseURIDescriptor = {
      get: function() {
        var base = document.querySelector("base");
        return base ? base.href : window.location.href;
      },
      configurable: true
    };
    Object.defineProperty(document, "baseURI", baseURIDescriptor);
    Object.defineProperty(rootDocument, "baseURI", baseURIDescriptor);
  }
  scope.importer = importer;
  scope.importLoader = importLoader;
});

window.HTMLImports.addModule(function(scope) {
  var parser = scope.parser;
  var importer = scope.importer;
  var dynamic = {
    added: function(nodes) {
      var owner, parsed, loading;
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        if (!owner) {
          owner = n.ownerDocument;
          parsed = parser.isParsed(owner);
        }
        loading = this.shouldLoadNode(n);
        if (loading) {
          importer.loadNode(n);
        }
        if (this.shouldParseNode(n) && parsed) {
          parser.parseDynamic(n, loading);
        }
      }
    },
    shouldLoadNode: function(node) {
      return node.nodeType === 1 && matches.call(node, importer.loadSelectorsForNode(node));
    },
    shouldParseNode: function(node) {
      return node.nodeType === 1 && matches.call(node, parser.parseSelectorsForNode(node));
    }
  };
  importer.observer.addCallback = dynamic.added.bind(dynamic);
  var matches = HTMLElement.prototype.matches || HTMLElement.prototype.matchesSelector || HTMLElement.prototype.webkitMatchesSelector || HTMLElement.prototype.mozMatchesSelector || HTMLElement.prototype.msMatchesSelector;
});

(function(scope) {
  var initializeModules = scope.initializeModules;
  var isIE = scope.isIE;
  if (scope.useNative) {
    return;
  }
  initializeModules();
  var rootDocument = scope.rootDocument;
  function bootstrap() {
    window.HTMLImports.importer.bootDocument(rootDocument);
  }
  if (document.readyState === "complete" || document.readyState === "interactive" && !window.attachEvent) {
    bootstrap();
  } else {
    document.addEventListener("DOMContentLoaded", bootstrap);
  }
})(window.HTMLImports);

window.CustomElements = window.CustomElements || {
  flags: {}
};

(function(scope) {
  var flags = scope.flags;
  var modules = [];
  var addModule = function(module) {
    modules.push(module);
  };
  var initializeModules = function() {
    modules.forEach(function(module) {
      module(scope);
    });
  };
  scope.addModule = addModule;
  scope.initializeModules = initializeModules;
  scope.hasNative = Boolean(document.registerElement);
  scope.isIE = /Trident/.test(navigator.userAgent);
  scope.useNative = !flags.register && scope.hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || window.HTMLImports.useNative);
})(window.CustomElements);

window.CustomElements.addModule(function(scope) {
  var IMPORT_LINK_TYPE = window.HTMLImports ? window.HTMLImports.IMPORT_LINK_TYPE : "none";
  function forSubtree(node, cb) {
    findAllElements(node, function(e) {
      if (cb(e)) {
        return true;
      }
      forRoots(e, cb);
    });
    forRoots(node, cb);
  }
  function findAllElements(node, find, data) {
    var e = node.firstElementChild;
    if (!e) {
      e = node.firstChild;
      while (e && e.nodeType !== Node.ELEMENT_NODE) {
        e = e.nextSibling;
      }
    }
    while (e) {
      if (find(e, data) !== true) {
        findAllElements(e, find, data);
      }
      e = e.nextElementSibling;
    }
    return null;
  }
  function forRoots(node, cb) {
    var root = node.shadowRoot;
    while (root) {
      forSubtree(root, cb);
      root = root.olderShadowRoot;
    }
  }
  function forDocumentTree(doc, cb) {
    _forDocumentTree(doc, cb, []);
  }
  function _forDocumentTree(doc, cb, processingDocuments) {
    doc = window.wrap(doc);
    if (processingDocuments.indexOf(doc) >= 0) {
      return;
    }
    processingDocuments.push(doc);
    var imports = doc.querySelectorAll("link[rel=" + IMPORT_LINK_TYPE + "]");
    for (var i = 0, l = imports.length, n; i < l && (n = imports[i]); i++) {
      if (n.import) {
        _forDocumentTree(n.import, cb, processingDocuments);
      }
    }
    cb(doc);
  }
  scope.forDocumentTree = forDocumentTree;
  scope.forSubtree = forSubtree;
});

window.CustomElements.addModule(function(scope) {
  var flags = scope.flags;
  var forSubtree = scope.forSubtree;
  var forDocumentTree = scope.forDocumentTree;
  function addedNode(node, isAttached) {
    return added(node, isAttached) || addedSubtree(node, isAttached);
  }
  function added(node, isAttached) {
    if (scope.upgrade(node, isAttached)) {
      return true;
    }
    if (isAttached) {
      attached(node);
    }
  }
  function addedSubtree(node, isAttached) {
    forSubtree(node, function(e) {
      if (added(e, isAttached)) {
        return true;
      }
    });
  }
  var hasThrottledAttached = window.MutationObserver._isPolyfilled && flags["throttle-attached"];
  scope.hasPolyfillMutations = hasThrottledAttached;
  scope.hasThrottledAttached = hasThrottledAttached;
  var isPendingMutations = false;
  var pendingMutations = [];
  function deferMutation(fn) {
    pendingMutations.push(fn);
    if (!isPendingMutations) {
      isPendingMutations = true;
      setTimeout(takeMutations);
    }
  }
  function takeMutations() {
    isPendingMutations = false;
    var $p = pendingMutations;
    for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
      p();
    }
    pendingMutations = [];
  }
  function attached(element) {
    if (hasThrottledAttached) {
      deferMutation(function() {
        _attached(element);
      });
    } else {
      _attached(element);
    }
  }
  function _attached(element) {
    if (element.__upgraded__ && !element.__attached) {
      element.__attached = true;
      if (element.attachedCallback) {
        element.attachedCallback();
      }
    }
  }
  function detachedNode(node) {
    detached(node);
    forSubtree(node, function(e) {
      detached(e);
    });
  }
  function detached(element) {
    if (hasThrottledAttached) {
      deferMutation(function() {
        _detached(element);
      });
    } else {
      _detached(element);
    }
  }
  function _detached(element) {
    if (element.__upgraded__ && element.__attached) {
      element.__attached = false;
      if (element.detachedCallback) {
        element.detachedCallback();
      }
    }
  }
  function inDocument(element) {
    var p = element;
    var doc = window.wrap(document);
    while (p) {
      if (p == doc) {
        return true;
      }
      p = p.parentNode || p.nodeType === Node.DOCUMENT_FRAGMENT_NODE && p.host;
    }
  }
  function watchShadow(node) {
    if (node.shadowRoot && !node.shadowRoot.__watched) {
      flags.dom && console.log("watching shadow-root for: ", node.localName);
      var root = node.shadowRoot;
      while (root) {
        observe(root);
        root = root.olderShadowRoot;
      }
    }
  }
  function handler(root, mutations) {
    if (flags.dom) {
      var mx = mutations[0];
      if (mx && mx.type === "childList" && mx.addedNodes) {
        if (mx.addedNodes) {
          var d = mx.addedNodes[0];
          while (d && d !== document && !d.host) {
            d = d.parentNode;
          }
          var u = d && (d.URL || d._URL || d.host && d.host.localName) || "";
          u = u.split("/?").shift().split("/").pop();
        }
      }
      console.group("mutations (%d) [%s]", mutations.length, u || "");
    }
    var isAttached = inDocument(root);
    mutations.forEach(function(mx) {
      if (mx.type === "childList") {
        forEach(mx.addedNodes, function(n) {
          if (!n.localName) {
            return;
          }
          addedNode(n, isAttached);
        });
        forEach(mx.removedNodes, function(n) {
          if (!n.localName) {
            return;
          }
          detachedNode(n);
        });
      }
    });
    flags.dom && console.groupEnd();
  }
  function takeRecords(node) {
    node = window.wrap(node);
    if (!node) {
      node = window.wrap(document);
    }
    while (node.parentNode) {
      node = node.parentNode;
    }
    var observer = node.__observer;
    if (observer) {
      handler(node, observer.takeRecords());
      takeMutations();
    }
  }
  var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
  function observe(inRoot) {
    if (inRoot.__observer) {
      return;
    }
    var observer = new MutationObserver(handler.bind(this, inRoot));
    observer.observe(inRoot, {
      childList: true,
      subtree: true
    });
    inRoot.__observer = observer;
  }
  function upgradeDocument(doc) {
    doc = window.wrap(doc);
    flags.dom && console.group("upgradeDocument: ", doc.baseURI.split("/").pop());
    var isMainDocument = doc === window.wrap(document);
    addedNode(doc, isMainDocument);
    observe(doc);
    flags.dom && console.groupEnd();
  }
  function upgradeDocumentTree(doc) {
    forDocumentTree(doc, upgradeDocument);
  }
  var originalCreateShadowRoot = Element.prototype.createShadowRoot;
  if (originalCreateShadowRoot) {
    Element.prototype.createShadowRoot = function() {
      var root = originalCreateShadowRoot.call(this);
      window.CustomElements.watchShadow(this);
      return root;
    };
  }
  scope.watchShadow = watchShadow;
  scope.upgradeDocumentTree = upgradeDocumentTree;
  scope.upgradeDocument = upgradeDocument;
  scope.upgradeSubtree = addedSubtree;
  scope.upgradeAll = addedNode;
  scope.attached = attached;
  scope.takeRecords = takeRecords;
});

window.CustomElements.addModule(function(scope) {
  var flags = scope.flags;
  function upgrade(node, isAttached) {
    if (node.localName === "template") {
      if (window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
        HTMLTemplateElement.decorate(node);
      }
    }
    if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
      var is = node.getAttribute("is");
      var definition = scope.getRegisteredDefinition(node.localName) || scope.getRegisteredDefinition(is);
      if (definition) {
        if (is && definition.tag == node.localName || !is && !definition.extends) {
          return upgradeWithDefinition(node, definition, isAttached);
        }
      }
    }
  }
  function upgradeWithDefinition(element, definition, isAttached) {
    flags.upgrade && console.group("upgrade:", element.localName);
    if (definition.is) {
      element.setAttribute("is", definition.is);
    }
    implementPrototype(element, definition);
    element.__upgraded__ = true;
    created(element);
    if (isAttached) {
      scope.attached(element);
    }
    scope.upgradeSubtree(element, isAttached);
    flags.upgrade && console.groupEnd();
    return element;
  }
  function implementPrototype(element, definition) {
    if (Object.__proto__) {
      element.__proto__ = definition.prototype;
    } else {
      customMixin(element, definition.prototype, definition.native);
      element.__proto__ = definition.prototype;
    }
  }
  function customMixin(inTarget, inSrc, inNative) {
    var used = {};
    var p = inSrc;
    while (p !== inNative && p !== HTMLElement.prototype) {
      var keys = Object.getOwnPropertyNames(p);
      for (var i = 0, k; k = keys[i]; i++) {
        if (!used[k]) {
          Object.defineProperty(inTarget, k, Object.getOwnPropertyDescriptor(p, k));
          used[k] = 1;
        }
      }
      p = Object.getPrototypeOf(p);
    }
  }
  function created(element) {
    if (element.createdCallback) {
      element.createdCallback();
    }
  }
  scope.upgrade = upgrade;
  scope.upgradeWithDefinition = upgradeWithDefinition;
  scope.implementPrototype = implementPrototype;
});

window.CustomElements.addModule(function(scope) {
  var isIE = scope.isIE;
  var upgradeDocumentTree = scope.upgradeDocumentTree;
  var upgradeAll = scope.upgradeAll;
  var upgradeWithDefinition = scope.upgradeWithDefinition;
  var implementPrototype = scope.implementPrototype;
  var useNative = scope.useNative;
  function register(name, options) {
    var definition = options || {};
    if (!name) {
      throw new Error("document.registerElement: first argument `name` must not be empty");
    }
    if (name.indexOf("-") < 0) {
      throw new Error("document.registerElement: first argument ('name') must contain a dash ('-'). Argument provided was '" + String(name) + "'.");
    }
    if (isReservedTag(name)) {
      throw new Error("Failed to execute 'registerElement' on 'Document': Registration failed for type '" + String(name) + "'. The type name is invalid.");
    }
    if (getRegisteredDefinition(name)) {
      throw new Error("DuplicateDefinitionError: a type with name '" + String(name) + "' is already registered");
    }
    if (!definition.prototype) {
      definition.prototype = Object.create(HTMLElement.prototype);
    }
    definition.__name = name.toLowerCase();
    definition.lifecycle = definition.lifecycle || {};
    definition.ancestry = ancestry(definition.extends);
    resolveTagName(definition);
    resolvePrototypeChain(definition);
    overrideAttributeApi(definition.prototype);
    registerDefinition(definition.__name, definition);
    definition.ctor = generateConstructor(definition);
    definition.ctor.prototype = definition.prototype;
    definition.prototype.constructor = definition.ctor;
    if (scope.ready) {
      upgradeDocumentTree(document);
    }
    return definition.ctor;
  }
  function overrideAttributeApi(prototype) {
    if (prototype.setAttribute._polyfilled) {
      return;
    }
    var setAttribute = prototype.setAttribute;
    prototype.setAttribute = function(name, value) {
      changeAttribute.call(this, name, value, setAttribute);
    };
    var removeAttribute = prototype.removeAttribute;
    prototype.removeAttribute = function(name) {
      changeAttribute.call(this, name, null, removeAttribute);
    };
    prototype.setAttribute._polyfilled = true;
  }
  function changeAttribute(name, value, operation) {
    name = name.toLowerCase();
    var oldValue = this.getAttribute(name);
    operation.apply(this, arguments);
    var newValue = this.getAttribute(name);
    if (this.attributeChangedCallback && newValue !== oldValue) {
      this.attributeChangedCallback(name, oldValue, newValue);
    }
  }
  function isReservedTag(name) {
    for (var i = 0; i < reservedTagList.length; i++) {
      if (name === reservedTagList[i]) {
        return true;
      }
    }
  }
  var reservedTagList = [ "annotation-xml", "color-profile", "font-face", "font-face-src", "font-face-uri", "font-face-format", "font-face-name", "missing-glyph" ];
  function ancestry(extnds) {
    var extendee = getRegisteredDefinition(extnds);
    if (extendee) {
      return ancestry(extendee.extends).concat([ extendee ]);
    }
    return [];
  }
  function resolveTagName(definition) {
    var baseTag = definition.extends;
    for (var i = 0, a; a = definition.ancestry[i]; i++) {
      baseTag = a.is && a.tag;
    }
    definition.tag = baseTag || definition.__name;
    if (baseTag) {
      definition.is = definition.__name;
    }
  }
  function resolvePrototypeChain(definition) {
    if (!Object.__proto__) {
      var nativePrototype = HTMLElement.prototype;
      if (definition.is) {
        var inst = document.createElement(definition.tag);
        nativePrototype = Object.getPrototypeOf(inst);
      }
      var proto = definition.prototype, ancestor;
      var foundPrototype = false;
      while (proto) {
        if (proto == nativePrototype) {
          foundPrototype = true;
        }
        ancestor = Object.getPrototypeOf(proto);
        if (ancestor) {
          proto.__proto__ = ancestor;
        }
        proto = ancestor;
      }
      if (!foundPrototype) {
        console.warn(definition.tag + " prototype not found in prototype chain for " + definition.is);
      }
      definition.native = nativePrototype;
    }
  }
  function instantiate(definition) {
    return upgradeWithDefinition(domCreateElement(definition.tag), definition);
  }
  var registry = {};
  function getRegisteredDefinition(name) {
    if (name) {
      return registry[name.toLowerCase()];
    }
  }
  function registerDefinition(name, definition) {
    registry[name] = definition;
  }
  function generateConstructor(definition) {
    return function() {
      return instantiate(definition);
    };
  }
  var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  function createElementNS(namespace, tag, typeExtension) {
    if (namespace === HTML_NAMESPACE) {
      return createElement(tag, typeExtension);
    } else {
      return domCreateElementNS(namespace, tag);
    }
  }
  function createElement(tag, typeExtension) {
    if (tag) {
      tag = tag.toLowerCase();
    }
    if (typeExtension) {
      typeExtension = typeExtension.toLowerCase();
    }
    var definition = getRegisteredDefinition(typeExtension || tag);
    if (definition) {
      if (tag == definition.tag && typeExtension == definition.is) {
        return new definition.ctor();
      }
      if (!typeExtension && !definition.is) {
        return new definition.ctor();
      }
    }
    var element;
    if (typeExtension) {
      element = createElement(tag);
      element.setAttribute("is", typeExtension);
      return element;
    }
    element = domCreateElement(tag);
    if (tag.indexOf("-") >= 0) {
      implementPrototype(element, HTMLElement);
    }
    return element;
  }
  var domCreateElement = document.createElement.bind(document);
  var domCreateElementNS = document.createElementNS.bind(document);
  var isInstance;
  if (!Object.__proto__ && !useNative) {
    isInstance = function(obj, ctor) {
      if (obj instanceof ctor) {
        return true;
      }
      var p = obj;
      while (p) {
        if (p === ctor.prototype) {
          return true;
        }
        p = p.__proto__;
      }
      return false;
    };
  } else {
    isInstance = function(obj, base) {
      return obj instanceof base;
    };
  }
  function wrapDomMethodToForceUpgrade(obj, methodName) {
    var orig = obj[methodName];
    obj[methodName] = function() {
      var n = orig.apply(this, arguments);
      upgradeAll(n);
      return n;
    };
  }
  wrapDomMethodToForceUpgrade(Node.prototype, "cloneNode");
  wrapDomMethodToForceUpgrade(document, "importNode");
  if (isIE) {
    (function() {
      var importNode = document.importNode;
      document.importNode = function() {
        var n = importNode.apply(document, arguments);
        if (n.nodeType == n.DOCUMENT_FRAGMENT_NODE) {
          var f = document.createDocumentFragment();
          f.appendChild(n);
          return f;
        } else {
          return n;
        }
      };
    })();
  }
  document.registerElement = register;
  document.createElement = createElement;
  document.createElementNS = createElementNS;
  scope.registry = registry;
  scope.instanceof = isInstance;
  scope.reservedTagList = reservedTagList;
  scope.getRegisteredDefinition = getRegisteredDefinition;
  document.register = document.registerElement;
});

(function(scope) {
  var useNative = scope.useNative;
  var initializeModules = scope.initializeModules;
  var isIE = scope.isIE;
  if (useNative) {
    var nop = function() {};
    scope.watchShadow = nop;
    scope.upgrade = nop;
    scope.upgradeAll = nop;
    scope.upgradeDocumentTree = nop;
    scope.upgradeSubtree = nop;
    scope.takeRecords = nop;
    scope.instanceof = function(obj, base) {
      return obj instanceof base;
    };
  } else {
    initializeModules();
  }
  var upgradeDocumentTree = scope.upgradeDocumentTree;
  var upgradeDocument = scope.upgradeDocument;
  if (!window.wrap) {
    if (window.ShadowDOMPolyfill) {
      window.wrap = window.ShadowDOMPolyfill.wrapIfNeeded;
      window.unwrap = window.ShadowDOMPolyfill.unwrapIfNeeded;
    } else {
      window.wrap = window.unwrap = function(node) {
        return node;
      };
    }
  }
  if (window.HTMLImports) {
    window.HTMLImports.__importsParsingHook = function(elt) {
      if (elt.import) {
        upgradeDocument(wrap(elt.import));
      }
    };
  }
  function bootstrap() {
    upgradeDocumentTree(window.wrap(document));
    window.CustomElements.ready = true;
    var requestAnimationFrame = window.requestAnimationFrame || function(f) {
      setTimeout(f, 16);
    };
    requestAnimationFrame(function() {
      setTimeout(function() {
        window.CustomElements.readyTime = Date.now();
        if (window.HTMLImports) {
          window.CustomElements.elapsed = window.CustomElements.readyTime - window.HTMLImports.readyTime;
        }
        document.dispatchEvent(new CustomEvent("WebComponentsReady", {
          bubbles: true
        }));
      });
    });
  }
  if (document.readyState === "complete" || scope.flags.eager) {
    bootstrap();
  } else if (document.readyState === "interactive" && !window.attachEvent && (!window.HTMLImports || window.HTMLImports.ready)) {
    bootstrap();
  } else {
    var loadEvent = window.HTMLImports && !window.HTMLImports.ready ? "HTMLImportsLoaded" : "DOMContentLoaded";
    window.addEventListener(loadEvent, bootstrap);
  }
})(window.CustomElements);

(function(scope) {
  var style = document.createElement("style");
  style.textContent = "" + "body {" + "transition: opacity ease-in 0.2s;" + " } \n" + "body[unresolved] {" + "opacity: 0; display: block; overflow: hidden; position: relative;" + " } \n";
  var head = document.querySelector("head");
  head.insertBefore(style, head.firstChild);
})(window.WebComponents);
/*!
 * PEP v0.4.0 | https://github.com/jquery/PEP
 * Copyright jQuery Foundation and other contributors | http://jquery.org/license
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  global.PointerEventsPolyfill = factory()
}(this, function () { 'use strict';

  /**
   * This is the constructor for new PointerEvents.
   *
   * New Pointer Events must be given a type, and an optional dictionary of
   * initialization properties.
   *
   * Due to certain platform requirements, events returned from the constructor
   * identify as MouseEvents.
   *
   * @constructor
   * @param {String} inType The type of the event to create.
   * @param {Object} [inDict] An optional dictionary of initial event properties.
   * @return {Event} A new PointerEvent of type `inType`, initialized with properties from `inDict`.
   */
  var MOUSE_PROPS = [
    'bubbles',
    'cancelable',
    'view',
    'detail',
    'screenX',
    'screenY',
    'clientX',
    'clientY',
    'ctrlKey',
    'altKey',
    'shiftKey',
    'metaKey',
    'button',
    'relatedTarget',
    'pageX',
    'pageY'
  ];

  var MOUSE_DEFAULTS = [
    false,
    false,
    null,
    null,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null,
    0,
    0
  ];

  function PointerEvent(inType, inDict) {
    inDict = inDict || Object.create(null);

    var e = document.createEvent('Event');
    e.initEvent(inType, inDict.bubbles || false, inDict.cancelable || false);

    // define inherited MouseEvent properties
    // skip bubbles and cancelable since they're set above in initEvent()
    for (var i = 2, p; i < MOUSE_PROPS.length; i++) {
      p = MOUSE_PROPS[i];
      e[p] = inDict[p] || MOUSE_DEFAULTS[i];
    }
    e.buttons = inDict.buttons || 0;

    // Spec requires that pointers without pressure specified use 0.5 for down
    // state and 0 for up state.
    var pressure = 0;
    if (inDict.pressure) {
      pressure = inDict.pressure;
    } else {
      pressure = e.buttons ? 0.5 : 0;
    }

    // add x/y properties aliased to clientX/Y
    e.x = e.clientX;
    e.y = e.clientY;

    // define the properties of the PointerEvent interface
    e.pointerId = inDict.pointerId || 0;
    e.width = inDict.width || 0;
    e.height = inDict.height || 0;
    e.pressure = pressure;
    e.tiltX = inDict.tiltX || 0;
    e.tiltY = inDict.tiltY || 0;
    e.pointerType = inDict.pointerType || '';
    e.hwTimestamp = inDict.hwTimestamp || 0;
    e.isPrimary = inDict.isPrimary || false;
    return e;
  }

  var _PointerEvent = PointerEvent;

  /**
   * This module implements a map of pointer states
   */
  var USE_MAP = window.Map && window.Map.prototype.forEach;
  var PointerMap = USE_MAP ? Map : SparseArrayMap;

  function SparseArrayMap() {
    this.array = [];
    this.size = 0;
  }

  SparseArrayMap.prototype = {
    set: function(k, v) {
      if (v === undefined) {
        return this.delete(k);
      }
      if (!this.has(k)) {
        this.size++;
      }
      this.array[k] = v;
    },
    has: function(k) {
      return this.array[k] !== undefined;
    },
    delete: function(k) {
      if (this.has(k)) {
        delete this.array[k];
        this.size--;
      }
    },
    get: function(k) {
      return this.array[k];
    },
    clear: function() {
      this.array.length = 0;
      this.size = 0;
    },

    // return value, key, map
    forEach: function(callback, thisArg) {
      return this.array.forEach(function(v, k) {
        callback.call(thisArg, v, k, this);
      }, this);
    }
  };

  var _pointermap = PointerMap;

  var CLONE_PROPS = [

    // MouseEvent
    'bubbles',
    'cancelable',
    'view',
    'detail',
    'screenX',
    'screenY',
    'clientX',
    'clientY',
    'ctrlKey',
    'altKey',
    'shiftKey',
    'metaKey',
    'button',
    'relatedTarget',

    // DOM Level 3
    'buttons',

    // PointerEvent
    'pointerId',
    'width',
    'height',
    'pressure',
    'tiltX',
    'tiltY',
    'pointerType',
    'hwTimestamp',
    'isPrimary',

    // event instance
    'type',
    'target',
    'currentTarget',
    'which',
    'pageX',
    'pageY',
    'timeStamp'
  ];

  var CLONE_DEFAULTS = [

    // MouseEvent
    false,
    false,
    null,
    null,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null,

    // DOM Level 3
    0,

    // PointerEvent
    0,
    0,
    0,
    0,
    0,
    0,
    '',
    0,
    false,

    // event instance
    '',
    null,
    null,
    0,
    0,
    0,
    0
  ];

  var HAS_SVG_INSTANCE = (typeof SVGElementInstance !== 'undefined');

  /**
   * This module is for normalizing events. Mouse and Touch events will be
   * collected here, and fire PointerEvents that have the same semantics, no
   * matter the source.
   * Events fired:
   *   - pointerdown: a pointing is added
   *   - pointerup: a pointer is removed
   *   - pointermove: a pointer is moved
   *   - pointerover: a pointer crosses into an element
   *   - pointerout: a pointer leaves an element
   *   - pointercancel: a pointer will no longer generate events
   */
  var dispatcher = {
    pointermap: new _pointermap(),
    eventMap: Object.create(null),
    captureInfo: Object.create(null),

    // Scope objects for native events.
    // This exists for ease of testing.
    eventSources: Object.create(null),
    eventSourceList: [],
    /**
     * Add a new event source that will generate pointer events.
     *
     * `inSource` must contain an array of event names named `events`, and
     * functions with the names specified in the `events` array.
     * @param {string} name A name for the event source
     * @param {Object} source A new source of platform events.
     */
    registerSource: function(name, source) {
      var s = source;
      var newEvents = s.events;
      if (newEvents) {
        newEvents.forEach(function(e) {
          if (s[e]) {
            this.eventMap[e] = s[e].bind(s);
          }
        }, this);
        this.eventSources[name] = s;
        this.eventSourceList.push(s);
      }
    },
    register: function(element) {
      var l = this.eventSourceList.length;
      for (var i = 0, es; (i < l) && (es = this.eventSourceList[i]); i++) {

        // call eventsource register
        es.register.call(es, element);
      }
    },
    unregister: function(element) {
      var l = this.eventSourceList.length;
      for (var i = 0, es; (i < l) && (es = this.eventSourceList[i]); i++) {

        // call eventsource register
        es.unregister.call(es, element);
      }
    },
    contains: /*scope.external.contains || */function(container, contained) {
      try {
        return container.contains(contained);
      } catch (ex) {

        // most likely: https://bugzilla.mozilla.org/show_bug.cgi?id=208427
        return false;
      }
    },

    // EVENTS
    down: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointerdown', inEvent);
    },
    move: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointermove', inEvent);
    },
    up: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointerup', inEvent);
    },
    enter: function(inEvent) {
      inEvent.bubbles = false;
      this.fireEvent('pointerenter', inEvent);
    },
    leave: function(inEvent) {
      inEvent.bubbles = false;
      this.fireEvent('pointerleave', inEvent);
    },
    over: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointerover', inEvent);
    },
    out: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointerout', inEvent);
    },
    cancel: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointercancel', inEvent);
    },
    leaveOut: function(event) {
      this.out(event);
      if (!this.contains(event.target, event.relatedTarget)) {
        this.leave(event);
      }
    },
    enterOver: function(event) {
      this.over(event);
      if (!this.contains(event.target, event.relatedTarget)) {
        this.enter(event);
      }
    },

    // LISTENER LOGIC
    eventHandler: function(inEvent) {

      // This is used to prevent multiple dispatch of pointerevents from
      // platform events. This can happen when two elements in different scopes
      // are set up to create pointer events, which is relevant to Shadow DOM.
      if (inEvent._handledByPE) {
        return;
      }
      var type = inEvent.type;
      var fn = this.eventMap && this.eventMap[type];
      if (fn) {
        fn(inEvent);
      }
      inEvent._handledByPE = true;
    },

    // set up event listeners
    listen: function(target, events) {
      events.forEach(function(e) {
        this.addEvent(target, e);
      }, this);
    },

    // remove event listeners
    unlisten: function(target, events) {
      events.forEach(function(e) {
        this.removeEvent(target, e);
      }, this);
    },
    addEvent: /*scope.external.addEvent || */function(target, eventName) {
      target.addEventListener(eventName, this.boundHandler);
    },
    removeEvent: /*scope.external.removeEvent || */function(target, eventName) {
      target.removeEventListener(eventName, this.boundHandler);
    },

    // EVENT CREATION AND TRACKING
    /**
     * Creates a new Event of type `inType`, based on the information in
     * `inEvent`.
     *
     * @param {string} inType A string representing the type of event to create
     * @param {Event} inEvent A platform event with a target
     * @return {Event} A PointerEvent of type `inType`
     */
    makeEvent: function(inType, inEvent) {

      // relatedTarget must be null if pointer is captured
      if (this.captureInfo[inEvent.pointerId]) {
        inEvent.relatedTarget = null;
      }
      var e = new _PointerEvent(inType, inEvent);
      if (inEvent.preventDefault) {
        e.preventDefault = inEvent.preventDefault;
      }
      e._target = e._target || inEvent.target;
      return e;
    },

    // make and dispatch an event in one call
    fireEvent: function(inType, inEvent) {
      var e = this.makeEvent(inType, inEvent);
      return this.dispatchEvent(e);
    },
    /**
     * Returns a snapshot of inEvent, with writable properties.
     *
     * @param {Event} inEvent An event that contains properties to copy.
     * @return {Object} An object containing shallow copies of `inEvent`'s
     *    properties.
     */
    cloneEvent: function(inEvent) {
      var eventCopy = Object.create(null);
      var p;
      for (var i = 0; i < CLONE_PROPS.length; i++) {
        p = CLONE_PROPS[i];
        eventCopy[p] = inEvent[p] || CLONE_DEFAULTS[i];

        // Work around SVGInstanceElement shadow tree
        // Return the <use> element that is represented by the instance for Safari, Chrome, IE.
        // This is the behavior implemented by Firefox.
        if (HAS_SVG_INSTANCE && (p === 'target' || p === 'relatedTarget')) {
          if (eventCopy[p] instanceof SVGElementInstance) {
            eventCopy[p] = eventCopy[p].correspondingUseElement;
          }
        }
      }

      // keep the semantics of preventDefault
      if (inEvent.preventDefault) {
        eventCopy.preventDefault = function() {
          inEvent.preventDefault();
        };
      }
      return eventCopy;
    },
    getTarget: function(inEvent) {

      // if pointer capture is set, route all events for the specified pointerId
      // to the capture target
      return this.captureInfo[inEvent.pointerId] || inEvent._target;
    },
    setCapture: function(inPointerId, inTarget) {
      if (this.captureInfo[inPointerId]) {
        this.releaseCapture(inPointerId);
      }
      this.captureInfo[inPointerId] = inTarget;
      var e = document.createEvent('Event');
      e.initEvent('gotpointercapture', true, false);
      e.pointerId = inPointerId;
      this.implicitRelease = this.releaseCapture.bind(this, inPointerId);
      document.addEventListener('pointerup', this.implicitRelease);
      document.addEventListener('pointercancel', this.implicitRelease);
      e._target = inTarget;
      this.asyncDispatchEvent(e);
    },
    releaseCapture: function(inPointerId) {
      var t = this.captureInfo[inPointerId];
      if (t) {
        var e = document.createEvent('Event');
        e.initEvent('lostpointercapture', true, false);
        e.pointerId = inPointerId;
        this.captureInfo[inPointerId] = undefined;
        document.removeEventListener('pointerup', this.implicitRelease);
        document.removeEventListener('pointercancel', this.implicitRelease);
        e._target = t;
        this.asyncDispatchEvent(e);
      }
    },
    /**
     * Dispatches the event to its target.
     *
     * @param {Event} inEvent The event to be dispatched.
     * @return {Boolean} True if an event handler returns true, false otherwise.
     */
    dispatchEvent: /*scope.external.dispatchEvent || */function(inEvent) {
      var t = this.getTarget(inEvent);
      if (t) {
        return t.dispatchEvent(inEvent);
      }
    },
    asyncDispatchEvent: function(inEvent) {
      requestAnimationFrame(this.dispatchEvent.bind(this, inEvent));
    }
  };
  dispatcher.boundHandler = dispatcher.eventHandler.bind(dispatcher);

  var _dispatcher = dispatcher;

  var targeting = {
    shadow: function(inEl) {
      if (inEl) {
        return inEl.shadowRoot || inEl.webkitShadowRoot;
      }
    },
    canTarget: function(shadow) {
      return shadow && Boolean(shadow.elementFromPoint);
    },
    targetingShadow: function(inEl) {
      var s = this.shadow(inEl);
      if (this.canTarget(s)) {
        return s;
      }
    },
    olderShadow: function(shadow) {
      var os = shadow.olderShadowRoot;
      if (!os) {
        var se = shadow.querySelector('shadow');
        if (se) {
          os = se.olderShadowRoot;
        }
      }
      return os;
    },
    allShadows: function(element) {
      var shadows = [];
      var s = this.shadow(element);
      while (s) {
        shadows.push(s);
        s = this.olderShadow(s);
      }
      return shadows;
    },
    searchRoot: function(inRoot, x, y) {
      if (inRoot) {
        var t = inRoot.elementFromPoint(x, y);
        var st, sr;

        // is element a shadow host?
        sr = this.targetingShadow(t);
        while (sr) {

          // find the the element inside the shadow root
          st = sr.elementFromPoint(x, y);
          if (!st) {

            // check for older shadows
            sr = this.olderShadow(sr);
          } else {

            // shadowed element may contain a shadow root
            var ssr = this.targetingShadow(st);
            return this.searchRoot(ssr, x, y) || st;
          }
        }

        // light dom element is the target
        return t;
      }
    },
    owner: function(element) {
      var s = element;

      // walk up until you hit the shadow root or document
      while (s.parentNode) {
        s = s.parentNode;
      }

      // the owner element is expected to be a Document or ShadowRoot
      if (s.nodeType !== Node.DOCUMENT_NODE && s.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
        s = document;
      }
      return s;
    },
    findTarget: function(inEvent) {
      var x = inEvent.clientX;
      var y = inEvent.clientY;

      // if the listener is in the shadow root, it is much faster to start there
      var s = this.owner(inEvent.target);

      // if x, y is not in this root, fall back to document search
      if (!s.elementFromPoint(x, y)) {
        s = document;
      }
      return this.searchRoot(s, x, y);
    }
  };

  /**
   * This module uses Mutation Observers to dynamically adjust which nodes will
   * generate Pointer Events.
   *
   * All nodes that wish to generate Pointer Events must have the attribute
   * `touch-action` set to `none`.
   */
  var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
  var map = Array.prototype.map.call.bind(Array.prototype.map);
  var toArray = Array.prototype.slice.call.bind(Array.prototype.slice);
  var filter = Array.prototype.filter.call.bind(Array.prototype.filter);
  var MO = window.MutationObserver || window.WebKitMutationObserver;
  var SELECTOR = '[touch-action]';
  var OBSERVER_INIT = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['touch-action']
  };

  function Installer(add, remove, changed, binder) {
    this.addCallback = add.bind(binder);
    this.removeCallback = remove.bind(binder);
    this.changedCallback = changed.bind(binder);
    if (MO) {
      this.observer = new MO(this.mutationWatcher.bind(this));
    }
  }

  Installer.prototype = {
    watchSubtree: function(target) {

      // Only watch scopes that can target find, as these are top-level.
      // Otherwise we can see duplicate additions and removals that add noise.
      //
      // TODO(dfreedman): For some instances with ShadowDOMPolyfill, we can see
      // a removal without an insertion when a node is redistributed among
      // shadows. Since it all ends up correct in the document, watching only
      // the document will yield the correct mutations to watch.
      if (this.observer && targeting.canTarget(target)) {
        this.observer.observe(target, OBSERVER_INIT);
      }
    },
    enableOnSubtree: function(target) {
      this.watchSubtree(target);
      if (target === document && document.readyState !== 'complete') {
        this.installOnLoad();
      } else {
        this.installNewSubtree(target);
      }
    },
    installNewSubtree: function(target) {
      forEach(this.findElements(target), this.addElement, this);
    },
    findElements: function(target) {
      if (target.querySelectorAll) {
        return target.querySelectorAll(SELECTOR);
      }
      return [];
    },
    removeElement: function(el) {
      this.removeCallback(el);
    },
    addElement: function(el) {
      this.addCallback(el);
    },
    elementChanged: function(el, oldValue) {
      this.changedCallback(el, oldValue);
    },
    concatLists: function(accum, list) {
      return accum.concat(toArray(list));
    },

    // register all touch-action = none nodes on document load
    installOnLoad: function() {
      document.addEventListener('readystatechange', function() {
        if (document.readyState === 'complete') {
          this.installNewSubtree(document);
        }
      }.bind(this));
    },
    isElement: function(n) {
      return n.nodeType === Node.ELEMENT_NODE;
    },
    flattenMutationTree: function(inNodes) {

      // find children with touch-action
      var tree = map(inNodes, this.findElements, this);

      // make sure the added nodes are accounted for
      tree.push(filter(inNodes, this.isElement));

      // flatten the list
      return tree.reduce(this.concatLists, []);
    },
    mutationWatcher: function(mutations) {
      mutations.forEach(this.mutationHandler, this);
    },
    mutationHandler: function(m) {
      if (m.type === 'childList') {
        var added = this.flattenMutationTree(m.addedNodes);
        added.forEach(this.addElement, this);
        var removed = this.flattenMutationTree(m.removedNodes);
        removed.forEach(this.removeElement, this);
      } else if (m.type === 'attributes') {
        this.elementChanged(m.target, m.oldValue);
      }
    }
  };

  var installer = Installer;

  function shadowSelector(v) {
    return 'body /shadow-deep/ ' + selector(v);
  }
  function selector(v) {
    return '[touch-action="' + v + '"]';
  }
  function rule(v) {
    return '{ -ms-touch-action: ' + v + '; touch-action: ' + v + '; touch-action-delay: none; }';
  }
  var attrib2css = [
    'none',
    'auto',
    'pan-x',
    'pan-y',
    {
      rule: 'pan-x pan-y',
      selectors: [
        'pan-x pan-y',
        'pan-y pan-x'
      ]
    }
  ];
  var styles = '';

  // only install stylesheet if the browser has touch action support
  var hasNativePE = window.PointerEvent || window.MSPointerEvent;

  // only add shadow selectors if shadowdom is supported
  var hasShadowRoot = !window.ShadowDOMPolyfill && document.head.createShadowRoot;

  function applyAttributeStyles() {
    if (hasNativePE) {
      attrib2css.forEach(function(r) {
        if (String(r) === r) {
          styles += selector(r) + rule(r) + '\n';
          if (hasShadowRoot) {
            styles += shadowSelector(r) + rule(r) + '\n';
          }
        } else {
          styles += r.selectors.map(selector) + rule(r.rule) + '\n';
          if (hasShadowRoot) {
            styles += r.selectors.map(shadowSelector) + rule(r.rule) + '\n';
          }
        }
      });

      var el = document.createElement('style');
      el.textContent = styles;
      document.head.appendChild(el);
    }
  }

  var mouse__pointermap = _dispatcher.pointermap;

  // radius around touchend that swallows mouse events
  var DEDUP_DIST = 25;

  // left, middle, right, back, forward
  var BUTTON_TO_BUTTONS = [1, 4, 2, 8, 16];

  var HAS_BUTTONS = false;
  try {
    HAS_BUTTONS = new MouseEvent('test', { buttons: 1 }).buttons === 1;
  } catch (e) {}

  // handler block for native mouse events
  var mouseEvents = {
    POINTER_ID: 1,
    POINTER_TYPE: 'mouse',
    events: [
      'mousedown',
      'mousemove',
      'mouseup',
      'mouseover',
      'mouseout'
    ],
    register: function(target) {
      _dispatcher.listen(target, this.events);
    },
    unregister: function(target) {
      _dispatcher.unlisten(target, this.events);
    },
    lastTouches: [],

    // collide with the global mouse listener
    isEventSimulatedFromTouch: function(inEvent) {
      var lts = this.lastTouches;
      var x = inEvent.clientX;
      var y = inEvent.clientY;
      for (var i = 0, l = lts.length, t; i < l && (t = lts[i]); i++) {

        // simulated mouse events will be swallowed near a primary touchend
        var dx = Math.abs(x - t.x);
        var dy = Math.abs(y - t.y);
        if (dx <= DEDUP_DIST && dy <= DEDUP_DIST) {
          return true;
        }
      }
    },
    prepareEvent: function(inEvent) {
      var e = _dispatcher.cloneEvent(inEvent);

      // forward mouse preventDefault
      var pd = e.preventDefault;
      e.preventDefault = function() {
        inEvent.preventDefault();
        pd();
      };
      e.pointerId = this.POINTER_ID;
      e.isPrimary = true;
      e.pointerType = this.POINTER_TYPE;
      return e;
    },
    prepareButtonsForMove: function(e, inEvent) {
      var p = mouse__pointermap.get(this.POINTER_ID);
      e.buttons = p ? p.buttons : 0;
      inEvent.buttons = e.buttons;
    },
    mousedown: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var p = mouse__pointermap.get(this.POINTER_ID);
        var e = this.prepareEvent(inEvent);
        if (!HAS_BUTTONS) {
          e.buttons = BUTTON_TO_BUTTONS[e.button];
          if (p) { e.buttons |= p.buttons; }
          inEvent.buttons = e.buttons;
        }
        mouse__pointermap.set(this.POINTER_ID, inEvent);
        if (!p) {
          _dispatcher.down(e);
        } else {
          _dispatcher.move(e);
        }
      }
    },
    mousemove: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var e = this.prepareEvent(inEvent);
        if (!HAS_BUTTONS) { this.prepareButtonsForMove(e, inEvent); }
        _dispatcher.move(e);
      }
    },
    mouseup: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var p = mouse__pointermap.get(this.POINTER_ID);
        var e = this.prepareEvent(inEvent);
        if (!HAS_BUTTONS) {
          var up = BUTTON_TO_BUTTONS[e.button];

          // Produces wrong state of buttons in Browsers without `buttons` support
          // when a mouse button that was pressed outside the document is released
          // inside and other buttons are still pressed down.
          e.buttons = p ? p.buttons & ~up : 0;
          inEvent.buttons = e.buttons;
        }
        mouse__pointermap.set(this.POINTER_ID, inEvent);
        if (e.buttons === 0 || e.buttons === BUTTON_TO_BUTTONS[e.button]) {
          this.cleanupMouse();
          _dispatcher.up(e);
        } else {
          _dispatcher.move(e);
        }
      }
    },
    mouseover: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var e = this.prepareEvent(inEvent);
        if (!HAS_BUTTONS) { this.prepareButtonsForMove(e, inEvent); }
        _dispatcher.enterOver(e);
      }
    },
    mouseout: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var e = this.prepareEvent(inEvent);
        if (!HAS_BUTTONS) { this.prepareButtonsForMove(e, inEvent); }
        _dispatcher.leaveOut(e);
      }
    },
    cancel: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      _dispatcher.cancel(e);
      this.cleanupMouse();
    },
    cleanupMouse: function() {
      mouse__pointermap.delete(this.POINTER_ID);
    }
  };

  var mouse = mouseEvents;

  var captureInfo = _dispatcher.captureInfo;
  var findTarget = targeting.findTarget.bind(targeting);
  var allShadows = targeting.allShadows.bind(targeting);
  var touch__pointermap = _dispatcher.pointermap;

  // This should be long enough to ignore compat mouse events made by touch
  var DEDUP_TIMEOUT = 2500;
  var CLICK_COUNT_TIMEOUT = 200;
  var ATTRIB = 'touch-action';
  var INSTALLER;

  // The presence of touch event handlers blocks scrolling, and so we must be careful to
  // avoid adding handlers unnecessarily.  Chrome plans to add a touch-action-delay property
  // (crbug.com/329559) to address this, and once we have that we can opt-in to a simpler
  // handler registration mechanism.  Rather than try to predict how exactly to opt-in to
  // that we'll just leave this disabled until there is a build of Chrome to test.
  var HAS_TOUCH_ACTION_DELAY = false;

  // handler block for native touch events
  var touchEvents = {
    events: [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel'
    ],
    register: function(target) {
      if (HAS_TOUCH_ACTION_DELAY) {
        _dispatcher.listen(target, this.events);
      } else {
        INSTALLER.enableOnSubtree(target);
      }
    },
    unregister: function(target) {
      if (HAS_TOUCH_ACTION_DELAY) {
        _dispatcher.unlisten(target, this.events);
      } else {

        // TODO(dfreedman): is it worth it to disconnect the MO?
      }
    },
    elementAdded: function(el) {
      var a = el.getAttribute(ATTRIB);
      var st = this.touchActionToScrollType(a);
      if (st) {
        el._scrollType = st;
        _dispatcher.listen(el, this.events);

        // set touch-action on shadows as well
        allShadows(el).forEach(function(s) {
          s._scrollType = st;
          _dispatcher.listen(s, this.events);
        }, this);
      }
    },
    elementRemoved: function(el) {
      el._scrollType = undefined;
      _dispatcher.unlisten(el, this.events);

      // remove touch-action from shadow
      allShadows(el).forEach(function(s) {
        s._scrollType = undefined;
        _dispatcher.unlisten(s, this.events);
      }, this);
    },
    elementChanged: function(el, oldValue) {
      var a = el.getAttribute(ATTRIB);
      var st = this.touchActionToScrollType(a);
      var oldSt = this.touchActionToScrollType(oldValue);

      // simply update scrollType if listeners are already established
      if (st && oldSt) {
        el._scrollType = st;
        allShadows(el).forEach(function(s) {
          s._scrollType = st;
        }, this);
      } else if (oldSt) {
        this.elementRemoved(el);
      } else if (st) {
        this.elementAdded(el);
      }
    },
    scrollTypes: {
      EMITTER: 'none',
      XSCROLLER: 'pan-x',
      YSCROLLER: 'pan-y',
      SCROLLER: /^(?:pan-x pan-y)|(?:pan-y pan-x)|auto$/
    },
    touchActionToScrollType: function(touchAction) {
      var t = touchAction;
      var st = this.scrollTypes;
      if (t === 'none') {
        return 'none';
      } else if (t === st.XSCROLLER) {
        return 'X';
      } else if (t === st.YSCROLLER) {
        return 'Y';
      } else if (st.SCROLLER.exec(t)) {
        return 'XY';
      }
    },
    POINTER_TYPE: 'touch',
    firstTouch: null,
    isPrimaryTouch: function(inTouch) {
      return this.firstTouch === inTouch.identifier;
    },
    setPrimaryTouch: function(inTouch) {

      // set primary touch if there no pointers, or the only pointer is the mouse
      if (touch__pointermap.size === 0 || (touch__pointermap.size === 1 && touch__pointermap.has(1))) {
        this.firstTouch = inTouch.identifier;
        this.firstXY = { X: inTouch.clientX, Y: inTouch.clientY };
        this.scrolling = false;
        this.cancelResetClickCount();
      }
    },
    removePrimaryPointer: function(inPointer) {
      if (inPointer.isPrimary) {
        this.firstTouch = null;
        this.firstXY = null;
        this.resetClickCount();
      }
    },
    clickCount: 0,
    resetId: null,
    resetClickCount: function() {
      var fn = function() {
        this.clickCount = 0;
        this.resetId = null;
      }.bind(this);
      this.resetId = setTimeout(fn, CLICK_COUNT_TIMEOUT);
    },
    cancelResetClickCount: function() {
      if (this.resetId) {
        clearTimeout(this.resetId);
      }
    },
    typeToButtons: function(type) {
      var ret = 0;
      if (type === 'touchstart' || type === 'touchmove') {
        ret = 1;
      }
      return ret;
    },
    touchToPointer: function(inTouch) {
      var cte = this.currentTouchEvent;
      var e = _dispatcher.cloneEvent(inTouch);

      // We reserve pointerId 1 for Mouse.
      // Touch identifiers can start at 0.
      // Add 2 to the touch identifier for compatibility.
      var id = e.pointerId = inTouch.identifier + 2;
      e.target = captureInfo[id] || findTarget(e);
      e.bubbles = true;
      e.cancelable = true;
      e.detail = this.clickCount;
      e.button = 0;
      e.buttons = this.typeToButtons(cte.type);
      e.width = inTouch.radiusX || inTouch.webkitRadiusX || 0;
      e.height = inTouch.radiusY || inTouch.webkitRadiusY || 0;
      e.pressure = inTouch.force || inTouch.webkitForce || 0.5;
      e.isPrimary = this.isPrimaryTouch(inTouch);
      e.pointerType = this.POINTER_TYPE;

      // forward touch preventDefaults
      var self = this;
      e.preventDefault = function() {
        self.scrolling = false;
        self.firstXY = null;
        cte.preventDefault();
      };
      return e;
    },
    processTouches: function(inEvent, inFunction) {
      var tl = inEvent.changedTouches;
      this.currentTouchEvent = inEvent;
      for (var i = 0, t; i < tl.length; i++) {
        t = tl[i];
        inFunction.call(this, this.touchToPointer(t));
      }
    },

    // For single axis scrollers, determines whether the element should emit
    // pointer events or behave as a scroller
    shouldScroll: function(inEvent) {
      if (this.firstXY) {
        var ret;
        var scrollAxis = inEvent.currentTarget._scrollType;
        if (scrollAxis === 'none') {

          // this element is a touch-action: none, should never scroll
          ret = false;
        } else if (scrollAxis === 'XY') {

          // this element should always scroll
          ret = true;
        } else {
          var t = inEvent.changedTouches[0];

          // check the intended scroll axis, and other axis
          var a = scrollAxis;
          var oa = scrollAxis === 'Y' ? 'X' : 'Y';
          var da = Math.abs(t['client' + a] - this.firstXY[a]);
          var doa = Math.abs(t['client' + oa] - this.firstXY[oa]);

          // if delta in the scroll axis > delta other axis, scroll instead of
          // making events
          ret = da >= doa;
        }
        this.firstXY = null;
        return ret;
      }
    },
    findTouch: function(inTL, inId) {
      for (var i = 0, l = inTL.length, t; i < l && (t = inTL[i]); i++) {
        if (t.identifier === inId) {
          return true;
        }
      }
    },

    // In some instances, a touchstart can happen without a touchend. This
    // leaves the pointermap in a broken state.
    // Therefore, on every touchstart, we remove the touches that did not fire a
    // touchend event.
    // To keep state globally consistent, we fire a
    // pointercancel for this "abandoned" touch
    vacuumTouches: function(inEvent) {
      var tl = inEvent.touches;

      // pointermap.size should be < tl.length here, as the touchstart has not
      // been processed yet.
      if (touch__pointermap.size >= tl.length) {
        var d = [];
        touch__pointermap.forEach(function(value, key) {

          // Never remove pointerId == 1, which is mouse.
          // Touch identifiers are 2 smaller than their pointerId, which is the
          // index in pointermap.
          if (key !== 1 && !this.findTouch(tl, key - 2)) {
            var p = value.out;
            d.push(p);
          }
        }, this);
        d.forEach(this.cancelOut, this);
      }
    },
    touchstart: function(inEvent) {
      this.vacuumTouches(inEvent);
      this.setPrimaryTouch(inEvent.changedTouches[0]);
      this.dedupSynthMouse(inEvent);
      if (!this.scrolling) {
        this.clickCount++;
        this.processTouches(inEvent, this.overDown);
      }
    },
    overDown: function(inPointer) {
      touch__pointermap.set(inPointer.pointerId, {
        target: inPointer.target,
        out: inPointer,
        outTarget: inPointer.target
      });
      _dispatcher.over(inPointer);
      _dispatcher.enter(inPointer);
      _dispatcher.down(inPointer);
    },
    touchmove: function(inEvent) {
      if (!this.scrolling) {
        if (this.shouldScroll(inEvent)) {
          this.scrolling = true;
          this.touchcancel(inEvent);
        } else {
          inEvent.preventDefault();
          this.processTouches(inEvent, this.moveOverOut);
        }
      }
    },
    moveOverOut: function(inPointer) {
      var event = inPointer;
      var pointer = touch__pointermap.get(event.pointerId);

      // a finger drifted off the screen, ignore it
      if (!pointer) {
        return;
      }
      var outEvent = pointer.out;
      var outTarget = pointer.outTarget;
      _dispatcher.move(event);
      if (outEvent && outTarget !== event.target) {
        outEvent.relatedTarget = event.target;
        event.relatedTarget = outTarget;

        // recover from retargeting by shadow
        outEvent.target = outTarget;
        if (event.target) {
          _dispatcher.leaveOut(outEvent);
          _dispatcher.enterOver(event);
        } else {

          // clean up case when finger leaves the screen
          event.target = outTarget;
          event.relatedTarget = null;
          this.cancelOut(event);
        }
      }
      pointer.out = event;
      pointer.outTarget = event.target;
    },
    touchend: function(inEvent) {
      this.dedupSynthMouse(inEvent);
      this.processTouches(inEvent, this.upOut);
    },
    upOut: function(inPointer) {
      if (!this.scrolling) {
        _dispatcher.up(inPointer);
        _dispatcher.out(inPointer);
        _dispatcher.leave(inPointer);
      }
      this.cleanUpPointer(inPointer);
    },
    touchcancel: function(inEvent) {
      this.processTouches(inEvent, this.cancelOut);
    },
    cancelOut: function(inPointer) {
      _dispatcher.cancel(inPointer);
      _dispatcher.out(inPointer);
      _dispatcher.leave(inPointer);
      this.cleanUpPointer(inPointer);
    },
    cleanUpPointer: function(inPointer) {
      touch__pointermap.delete(inPointer.pointerId);
      this.removePrimaryPointer(inPointer);
    },

    // prevent synth mouse events from creating pointer events
    dedupSynthMouse: function(inEvent) {
      var lts = mouse.lastTouches;
      var t = inEvent.changedTouches[0];

      // only the primary finger will synth mouse events
      if (this.isPrimaryTouch(t)) {

        // remember x/y of last touch
        var lt = { x: t.clientX, y: t.clientY };
        lts.push(lt);
        var fn = (function(lts, lt) {
          var i = lts.indexOf(lt);
          if (i > -1) {
            lts.splice(i, 1);
          }
        }).bind(null, lts, lt);
        setTimeout(fn, DEDUP_TIMEOUT);
      }
    }
  };

  if (!HAS_TOUCH_ACTION_DELAY) {
    INSTALLER = new installer(touchEvents.elementAdded, touchEvents.elementRemoved,
      touchEvents.elementChanged, touchEvents);
  }

  var touch = touchEvents;

  var ms__pointermap = _dispatcher.pointermap;
  var HAS_BITMAP_TYPE = window.MSPointerEvent &&
    typeof window.MSPointerEvent.MSPOINTER_TYPE_MOUSE === 'number';
  var msEvents = {
    events: [
      'MSPointerDown',
      'MSPointerMove',
      'MSPointerUp',
      'MSPointerOut',
      'MSPointerOver',
      'MSPointerCancel',
      'MSGotPointerCapture',
      'MSLostPointerCapture'
    ],
    register: function(target) {
      _dispatcher.listen(target, this.events);
    },
    unregister: function(target) {
      _dispatcher.unlisten(target, this.events);
    },
    POINTER_TYPES: [
      '',
      'unavailable',
      'touch',
      'pen',
      'mouse'
    ],
    prepareEvent: function(inEvent) {
      var e = inEvent;
      if (HAS_BITMAP_TYPE) {
        e = _dispatcher.cloneEvent(inEvent);
        e.pointerType = this.POINTER_TYPES[inEvent.pointerType];
      }
      return e;
    },
    cleanup: function(id) {
      ms__pointermap.delete(id);
    },
    MSPointerDown: function(inEvent) {
      ms__pointermap.set(inEvent.pointerId, inEvent);
      var e = this.prepareEvent(inEvent);
      _dispatcher.down(e);
    },
    MSPointerMove: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      _dispatcher.move(e);
    },
    MSPointerUp: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      _dispatcher.up(e);
      this.cleanup(inEvent.pointerId);
    },
    MSPointerOut: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      _dispatcher.leaveOut(e);
    },
    MSPointerOver: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      _dispatcher.enterOver(e);
    },
    MSPointerCancel: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      _dispatcher.cancel(e);
      this.cleanup(inEvent.pointerId);
    },
    MSLostPointerCapture: function(inEvent) {
      var e = _dispatcher.makeEvent('lostpointercapture', inEvent);
      _dispatcher.dispatchEvent(e);
    },
    MSGotPointerCapture: function(inEvent) {
      var e = _dispatcher.makeEvent('gotpointercapture', inEvent);
      _dispatcher.dispatchEvent(e);
    }
  };

  var ms = msEvents;

  function platform_events__applyPolyfill() {

    // only activate if this platform does not have pointer events
    if (!window.PointerEvent) {
      window.PointerEvent = _PointerEvent;

      if (window.navigator.msPointerEnabled) {
        var tp = window.navigator.msMaxTouchPoints;
        Object.defineProperty(window.navigator, 'maxTouchPoints', {
          value: tp,
          enumerable: true
        });
        _dispatcher.registerSource('ms', ms);
      } else {
        _dispatcher.registerSource('mouse', mouse);
        if (window.ontouchstart !== undefined) {
          _dispatcher.registerSource('touch', touch);
        }
      }

      _dispatcher.register(document);
    }
  }

  var n = window.navigator;
  var s, r;
  function assertDown(id) {
    if (!_dispatcher.pointermap.has(id)) {
      throw new Error('InvalidPointerId');
    }
  }
  if (n.msPointerEnabled) {
    s = function(pointerId) {
      assertDown(pointerId);
      this.msSetPointerCapture(pointerId);
    };
    r = function(pointerId) {
      assertDown(pointerId);
      this.msReleasePointerCapture(pointerId);
    };
  } else {
    s = function setPointerCapture(pointerId) {
      assertDown(pointerId);
      _dispatcher.setCapture(pointerId, this);
    };
    r = function releasePointerCapture(pointerId) {
      assertDown(pointerId);
      _dispatcher.releaseCapture(pointerId, this);
    };
  }

  function capture__applyPolyfill() {
    if (window.Element && !Element.prototype.setPointerCapture) {
      Object.defineProperties(Element.prototype, {
        'setPointerCapture': {
          value: s
        },
        'releasePointerCapture': {
          value: r
        }
      });
    }
  }

  applyAttributeStyles();
  platform_events__applyPolyfill();
  capture__applyPolyfill();

  var pointerevents = {
    dispatcher: _dispatcher,
    Installer: installer,
    PointerEvent: _PointerEvent,
    PointerMap: _pointermap,
    targetFinding: targeting
  };

  return pointerevents;

}));

(function () {

/*** Variables ***/

  var win = window,
    doc = document,
    attrProto = {
      setAttribute: Element.prototype.setAttribute,
      removeAttribute: Element.prototype.removeAttribute
    },
    hasShadow = Element.prototype.createShadowRoot,
    container = doc.createElement('div'),
    noop = function(){},
    trueop = function(){ return true; },
    regexReplaceCommas = /,/g,
    regexCamelToDash = /([a-z])([A-Z])/g,
    regexPseudoParens = /\(|\)/g,
    regexPseudoCapture = /:(\w+)\u276A(.+?(?=\u276B))|:(\w+)/g,
    regexDigits = /(\d+)/g,
    keypseudo = {
      action: function (pseudo, event) {
        return pseudo.value.match(regexDigits).indexOf(String(event.keyCode)) > -1 == (pseudo.name == 'keypass') || null;
      }
    },
    /*
      - The prefix object generated here is added to the xtag object as xtag.prefix later in the code
      - Prefix provides a variety of prefix variations for the browser in which your code is running
      - The 4 variations of prefix are as follows:
        * prefix.dom: the correct prefix case and form when used on DOM elements/style properties
        * prefix.lowercase: a lowercase version of the prefix for use in various user-code situations
        * prefix.css: the lowercase, dashed version of the prefix
        * prefix.js: addresses prefixed APIs present in global and non-Element contexts
    */
    prefix = (function () {
      var styles = win.getComputedStyle(doc.documentElement, ''),
          pre = (Array.prototype.slice
            .call(styles)
            .join('')
            .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
          )[1];
      return {
        dom: pre == 'ms' ? 'MS' : pre,
        lowercase: pre,
        css: '-' + pre + '-',
        js: pre == 'ms' ? pre : pre[0].toUpperCase() + pre.substr(1)
      };
    })(),
    matchSelector = Element.prototype.matches || Element.prototype.matchesSelector || Element.prototype[prefix.lowercase + 'MatchesSelector'];

/*** Functions ***/

// Utilities

  /*
    This is an enhanced typeof check for all types of objects. Where typeof would normaly return
    'object' for many common DOM objects (like NodeLists and HTMLCollections).
    - For example: typeOf(document.children) will correctly return 'htmlcollection'
  */
  var typeCache = {},
      typeString = typeCache.toString,
      typeRegexp = /\s([a-zA-Z]+)/;
  function typeOf(obj) {
    var type = typeString.call(obj);
    return typeCache[type] || (typeCache[type] = type.match(typeRegexp)[1].toLowerCase());
  }

  function clone(item, type){
    var fn = clone[type || typeOf(item)];
    return fn ? fn(item) : item;
  }
    clone.object = function(src){
      var obj = {};
      for (var key in src) obj[key] = clone(src[key]);
      return obj;
    };
    clone.array = function(src){
      var i = src.length, array = new Array(i);
      while (i--) array[i] = clone(src[i]);
      return array;
    };

  /*
    The toArray() method allows for conversion of any object to a true array. For types that
    cannot be converted to an array, the method returns a 1 item array containing the passed-in object.
  */
  var unsliceable = { 'undefined': 1, 'null': 1, 'number': 1, 'boolean': 1, 'string': 1, 'function': 1 };
  function toArray(obj){
    return unsliceable[typeOf(obj)] ? [obj] : Array.prototype.slice.call(obj, 0);
  }

// DOM

  var str = '';
  function query(element, selector){
    return (selector || str).length ? toArray(element.querySelectorAll(selector)) : [];
  }

// Pseudos

  function parsePseudo(fn){fn();}

// Mixins

  function mergeOne(source, key, current){
    var type = typeOf(current);
    if (type == 'object' && typeOf(source[key]) == 'object') xtag.merge(source[key], current);
    else source[key] = clone(current, type);
    return source;
  }

  function mergeMixin(tag, original, mixin, name) {
    var key, keys = {};
    for (var z in original) keys[z.split(':')[0]] = z;
    for (z in mixin) {
      key = keys[z.split(':')[0]];
      if (typeof original[key] == 'function') {
        if (!key.match(':mixins')) {
          original[key + ':mixins'] = original[key];
          delete original[key];
          key = key + ':mixins';
        }
        original[key].__mixin__ = xtag.applyPseudos(z + (z.match(':mixins') ? '' : ':mixins'), mixin[z], tag.pseudos, original[key].__mixin__);
      }
      else {
        original[z] = mixin[z];
        delete original[key];
      }
    }
  }

  var uniqueMixinCount = 0;
  function addMixin(tag, original, mixin){
    for (var z in mixin){
      original[z + ':__mixin__(' + (uniqueMixinCount++) + ')'] = xtag.applyPseudos(z, mixin[z], tag.pseudos);
    }
  }

  function resolveMixins(mixins, output){
    var index = mixins.length;
    while (index--){
      output.unshift(mixins[index]);
      if (xtag.mixins[mixins[index]].mixins) resolveMixins(xtag.mixins[mixins[index]].mixins, output);
    }
    return output;
  }

  function applyMixins(tag) {
    resolveMixins(tag.mixins, []).forEach(function(name){
      var mixin = xtag.mixins[name];
      for (var type in mixin) {
        var item = mixin[type],
            original = tag[type];
        if (!original) tag[type] = item;
        else {
          switch (type){
            case 'mixins': break;
            case 'events': addMixin(tag, original, item); break;
            case 'accessors':
            case 'prototype':
              for (var z in item) {
                if (!original[z]) original[z] = item[z];
                else mergeMixin(tag, original[z], item[z], name);
              }
              break;
            default: mergeMixin(tag, original, item, name);
          }
        }
      }
    });
    return tag;
  }

// Events

  function delegateAction(pseudo, event) {
    var match,
        target = event.target,
        root = event.currentTarget;
    while (!match && target && target != root) {
      if (target.tagName && matchSelector.call(target, pseudo.value)) match = target;
      target = target.parentNode;
    }
    if (!match && root.tagName && matchSelector.call(root, pseudo.value)) match = root;
    return match ? pseudo.listener = pseudo.listener.bind(match) : null;
  }

  function touchFilter(event){
    return event.button === 0;
  }

  function writeProperty(key, event, base, desc){
    if (desc) event[key] = base[key];
    else Object.defineProperty(event, key, {
      writable: true,
      enumerable: true,
      value: base[key]
    });
  }

  var skipProps = {};
  for (var z in doc.createEvent('CustomEvent')) skipProps[z] = 1;
  function inheritEvent(event, base){
    var desc = Object.getOwnPropertyDescriptor(event, 'target');
    for (var z in base) {
      if (!skipProps[z]) writeProperty(z, event, base, desc);
    }
    event.baseEvent = base;
  }

// Accessors

  function modAttr(element, attr, name, value, method){
    attrProto[method].call(element, name, attr && attr.boolean ? '' : value);
  }

  function syncAttr(element, attr, name, value, method){
    if (attr && (attr.property || attr.selector)) {
      var nodes = attr.property ? [element.xtag[attr.property]] : attr.selector ? xtag.query(element, attr.selector) : [],
          index = nodes.length;
      while (index--) nodes[index][method](name, value);
    }
  }

  function attachProperties(tag, prop, z, accessor, attr, name){
    var key = z.split(':'), type = key[0];
    if (type == 'get') {
      key[0] = prop;
      tag.prototype[prop].get = xtag.applyPseudos(key.join(':'), accessor[z], tag.pseudos, accessor[z]);
    }
    else if (type == 'set') {
      key[0] = prop;
      var setter = tag.prototype[prop].set = xtag.applyPseudos(key.join(':'), attr ? function(value){
        var old, method = 'setAttribute';
        if (attr.boolean){
          value = !!value;
          old = this.hasAttribute(name);
          if (!value) method = 'removeAttribute';
        }
        else {
          value = attr.validate ? attr.validate.call(this, value) : value;
          old = this.getAttribute(name);
        }
        modAttr(this, attr, name, value, method);
        accessor[z].call(this, value, old);
        syncAttr(this, attr, name, value, method);
      } : accessor[z] ? function(value){
        accessor[z].call(this, value);
      } : null, tag.pseudos, accessor[z]);

      if (attr) attr.setter = accessor[z];
    }
    else tag.prototype[prop][z] = accessor[z];
  }

  function parseAccessor(tag, prop){
    tag.prototype[prop] = {};
    var accessor = tag.accessors[prop],
        attr = accessor.attribute,
        name;

    if (attr) {
      name = attr.name = (attr ? (attr.name || prop.replace(regexCamelToDash, '$1-$2')) : prop).toLowerCase();
      attr.key = prop;
      tag.attributes[name] = attr;
    }

    for (var z in accessor) attachProperties(tag, prop, z, accessor, attr, name);

    if (attr) {
      if (!tag.prototype[prop].get) {
        var method = (attr.boolean ? 'has' : 'get') + 'Attribute';
        tag.prototype[prop].get = function(){
          return this[method](name);
        };
      }
      if (!tag.prototype[prop].set) tag.prototype[prop].set = function(value){
        value = attr.boolean ? !!value : attr.validate ? attr.validate.call(this, value) : value;
        var method = attr.boolean ? (value ? 'setAttribute' : 'removeAttribute') : 'setAttribute';
        modAttr(this, attr, name, value, method);
        syncAttr(this, attr, name, value, method);
      };
    }
  }

  var unwrapComment = /\/\*!?(?:\@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)\s*\*\//;
  function parseMultiline(fn){
    return typeof fn == 'function' ? unwrapComment.exec(fn.toString())[1] : fn;
  }

/*** X-Tag Object Definition ***/

  var xtag = {
    tags: {},
    defaultOptions: {
      pseudos: [],
      mixins: [],
      events: {},
      methods: {},
      accessors: {},
      lifecycle: {},
      attributes: {},
      'prototype': {
        xtag: {
          get: function(){
            return this.__xtag__ ? this.__xtag__ : (this.__xtag__ = { data: {} });
          }
        }
      }
    },
    register: function (name, options) {
      var _name;
      if (typeof name == 'string') _name = name.toLowerCase();
      else throw 'First argument must be a Custom Element string name';
      xtag.tags[_name] = options || {};

      var basePrototype = options.prototype;
      delete options.prototype;
      var tag = xtag.tags[_name].compiled = applyMixins(xtag.merge({}, xtag.defaultOptions, options));

      for (var z in tag.events) tag.events[z] = xtag.parseEvent(z, tag.events[z]);
      for (z in tag.lifecycle) tag.lifecycle[z.split(':')[0]] = xtag.applyPseudos(z, tag.lifecycle[z], tag.pseudos, tag.lifecycle[z]);
      for (z in tag.methods) tag.prototype[z.split(':')[0]] = { value: xtag.applyPseudos(z, tag.methods[z], tag.pseudos, tag.methods[z]), enumerable: true };
      for (z in tag.accessors) parseAccessor(tag, z);

      if (tag.shadow) tag.shadow = tag.shadow.nodeName ? tag.shadow : xtag.createFragment(tag.shadow);
      if (tag.content) tag.content = tag.content.nodeName ? tag.content.innerHTML : parseMultiline(tag.content);
      var created = tag.lifecycle.created;
      var finalized = tag.lifecycle.finalized;
      tag.prototype.createdCallback = {
        enumerable: true,
        value: function(){
          var element = this;
          if (tag.shadow && hasShadow) this.createShadowRoot().appendChild(tag.shadow.cloneNode(true));
          if (tag.content) this.appendChild(document.createElement('div')).outerHTML = tag.content;
          var output = created ? created.apply(this, arguments) : null;
          xtag.addEvents(this, tag.events);
          for (var name in tag.attributes) {
            var attr = tag.attributes[name],
                hasAttr = this.hasAttribute(name),
                hasDefault = attr.def !== undefined;
            if (hasAttr || attr.boolean || hasDefault) {
              this[attr.key] = attr.boolean ? hasAttr : !hasAttr && hasDefault ? attr.def : this.getAttribute(name);
            }
          }
          tag.pseudos.forEach(function(obj){
            obj.onAdd.call(element, obj);
          });
          this.xtagComponentReady = true;
          if (finalized) finalized.apply(this, arguments);
          return output;
        }
      };

      var inserted = tag.lifecycle.inserted,
          removed = tag.lifecycle.removed;
      if (inserted || removed) {
        tag.prototype.attachedCallback = { value: function(){
          if (removed) this.xtag.__parentNode__ = this.parentNode;
          if (inserted) return inserted.apply(this, arguments);
        }, enumerable: true };
      }
      if (removed) {
        tag.prototype.detachedCallback = { value: function(){
          var args = toArray(arguments);
          args.unshift(this.xtag.__parentNode__);
          var output = removed.apply(this, args);
          delete this.xtag.__parentNode__;
          return output;
        }, enumerable: true };
      }
      if (tag.lifecycle.attributeChanged) tag.prototype.attributeChangedCallback = { value: tag.lifecycle.attributeChanged, enumerable: true };

      tag.prototype.setAttribute = {
        writable: true,
        enumerable: true,
        value: function (name, value){
          var old;
          var _name = name.toLowerCase();
          var attr = tag.attributes[_name];
          if (attr) {
            old = this.getAttribute(_name);
            value = attr.boolean ? '' : attr.validate ? attr.validate.call(this, value) : value;
          }
          modAttr(this, attr, _name, value, 'setAttribute');
          if (attr) {
            if (attr.setter) attr.setter.call(this, attr.boolean ? true : value, old);
            syncAttr(this, attr, _name, value, 'setAttribute');
          }
        }
      };

      tag.prototype.removeAttribute = {
        writable: true,
        enumerable: true,
        value: function (name){
          var _name = name.toLowerCase();
          var attr = tag.attributes[_name];
          var old = this.hasAttribute(_name);
          modAttr(this, attr, _name, '', 'removeAttribute');
          if (attr) {
            if (attr.setter) attr.setter.call(this, attr.boolean ? false : undefined, old);
            syncAttr(this, attr, _name, '', 'removeAttribute');
          }
        }
      };

      var elementProto = basePrototype ?
            basePrototype :
            tag['extends'] ?
            Object.create(doc.createElement(tag['extends']).constructor).prototype :
            win.HTMLElement.prototype;

      var definition = {
        'prototype': Object.create(elementProto, tag.prototype)
      };
      if (tag['extends']) {
        definition['extends'] = tag['extends'];
      }
      var reg = doc.registerElement(_name, definition);
      return reg;
    },

    /* Exposed Variables */

    mixins: {},
    prefix: prefix,
    captureEvents: { focus: 1, blur: 1, scroll: 1, DOMMouseScroll: 1 },
    customEvents: {
      animationstart: {
        attach: [prefix.dom + 'AnimationStart']
      },
      animationend: {
        attach: [prefix.dom + 'AnimationEnd']
      },
      transitionend: {
        attach: [prefix.dom + 'TransitionEnd']
      },
      move: {
        attach: ['pointermove']
      },
      enter: {
        attach: ['pointerenter']
      },
      leave: {
        attach: ['pointerleave']
      },
      scrollwheel: {
        attach: ['DOMMouseScroll', 'mousewheel'],
        condition: function(event){
          event.delta = event.wheelDelta ? event.wheelDelta / 40 : Math.round(event.detail / 3.5 * -1);
          return true;
        }
      },
      tap: {
        attach: ['pointerdown', 'pointerup'],
        condition: function(event, custom){
          if (event.type == 'pointerdown') {
            custom.startX = event.clientX;
            custom.startY = event.clientY;
          }
          else if (event.button === 0 &&
                   Math.abs(custom.startX - event.clientX) < 10 &&
                   Math.abs(custom.startY - event.clientY) < 10) return true;
        }
      },
      tapstart: {
        attach: ['pointerdown'],
        condition: touchFilter
      },
      tapend: {
        attach: ['pointerup'],
        condition: touchFilter
      },
      tapmove: {
        attach: ['pointerdown', 'pointerup'],
        condition: function(event, custom){
          if (event.type == 'pointerdown') {
            if (!custom.moveListener) custom.moveListener = xtag.addEvent(this, 'pointermove', custom.listener);
          }
          else if (event.type == 'pointerup') {
            xtag.removeEvent(this, custom.moveListener);
            custom.moveListener = null;
          }
          else return true;
        }
      },
      taphold: {
        attach: ['pointerdown', 'pointerup'],
        condition: function(event, custom){
          if (event.type == 'pointerdown') {
            (custom.pointers = custom.pointers || {})[event.pointerId] = setTimeout(
              xtag.fireEvent.bind(null, this, 'taphold'),
              custom.duration || 1000
            );
          }
          else if (event.type == 'pointerup') {
            if (custom.pointers) {
              clearTimeout(custom.pointers[event.pointerId]);
              delete custom.pointers[event.pointerId];
            }
          }
          else return true;
        }
      }
    },
    pseudos: {
      __mixin__: {},
      mixins: {
        onCompiled: function(fn, pseudo){
          var mixin = pseudo.source && pseudo.source.__mixin__ || pseudo.source;
          if (mixin) switch (pseudo.value) {
            case null: case '': case 'before': return function(){
              mixin.apply(this, arguments);
              return fn.apply(this, arguments);
            };
            case 'after': return function(){
              var returns = fn.apply(this, arguments);
              mixin.apply(this, arguments);
              return returns;
            };
            case 'none': return fn;
          }
          else return fn;
        }
      },
      keypass: keypseudo,
      keyfail: keypseudo,
      delegate: {
        action: delegateAction
      },
      preventable: {
        action: function (pseudo, event) {
          return !event.defaultPrevented;
        }
      },
      duration: {
        onAdd: function(pseudo){
          pseudo.source.duration = Number(pseudo.value);
        }
      },
      capture: {
        onCompiled: function(fn, pseudo){
          if (pseudo.source) pseudo.source.capture = true;
        }
      }
    },

    /* UTILITIES */

    clone: clone,
    typeOf: typeOf,
    toArray: toArray,

    wrap: function (original, fn) {
      return function(){
        var output = original.apply(this, arguments);
        fn.apply(this, arguments);
        return output;
      };
    },
    /*
      Recursively merges one object with another. The first argument is the destination object,
      all other objects passed in as arguments are merged from right to left, conflicts are overwritten
    */
    merge: function(source, k, v){
      if (typeOf(k) == 'string') return mergeOne(source, k, v);
      for (var i = 1, l = arguments.length; i < l; i++){
        var object = arguments[i];
        for (var key in object) mergeOne(source, key, object[key]);
      }
      return source;
    },

    /*
      ----- This should be simplified! -----
      Generates a random ID string
    */
    uid: function(){
      return Math.random().toString(36).substr(2,10);
    },

    /* DOM */

    query: query,

    skipTransition: function(element, fn, bind){
      var prop = prefix.js + 'TransitionProperty';
      element.style[prop] = element.style.transitionProperty = 'none';
      var callback = fn ? fn.call(bind || element) : null;
      return xtag.skipFrame(function(){
        element.style[prop] = element.style.transitionProperty = '';
        if (callback) callback.call(bind || element);
      });
    },

    requestFrame: (function(){
      var raf = win.requestAnimationFrame ||
                win[prefix.lowercase + 'RequestAnimationFrame'] ||
                function(fn){ return win.setTimeout(fn, 20); };
      return function(fn){ return raf(fn); };
    })(),

    cancelFrame: (function(){
      var cancel = win.cancelAnimationFrame ||
                   win[prefix.lowercase + 'CancelAnimationFrame'] ||
                   win.clearTimeout;
      return function(id){ return cancel(id); };
    })(),

    skipFrame: function(fn){
      var id = xtag.requestFrame(function(){ id = xtag.requestFrame(fn); });
      return id;
    },

    matchSelector: function (element, selector) {
      return matchSelector.call(element, selector);
    },

    set: function (element, method, value) {
      element[method] = value;
      if (window.CustomElements) CustomElements.upgradeAll(element);
    },

    innerHTML: function(el, html){
      xtag.set(el, 'innerHTML', html);
    },

    hasClass: function (element, klass) {
      return element.className.split(' ').indexOf(klass.trim())>-1;
    },

    addClass: function (element, klass) {
      var list = element.className.trim().split(' ');
      klass.trim().split(' ').forEach(function (name) {
        if (!~list.indexOf(name)) list.push(name);
      });
      element.className = list.join(' ').trim();
      return element;
    },

    removeClass: function (element, klass) {
      var classes = klass.trim().split(' ');
      element.className = element.className.trim().split(' ').filter(function (name) {
        return name && !~classes.indexOf(name);
      }).join(' ');
      return element;
    },

    toggleClass: function (element, klass) {
      return xtag[xtag.hasClass(element, klass) ? 'removeClass' : 'addClass'].call(null, element, klass);
    },

    /*
      Runs a query on only the children of an element
    */
    queryChildren: function (element, selector) {
      var id = element.id,
          attr = '#' + (element.id = id || 'x_' + xtag.uid()) + ' > ',
          parent = element.parentNode || !container.appendChild(element);
      selector = attr + (selector + '').replace(regexReplaceCommas, ',' + attr);
      var result = element.parentNode.querySelectorAll(selector);
      if (!id) element.removeAttribute('id');
      if (!parent) container.removeChild(element);
      return toArray(result);
    },

    /*
      Creates a document fragment with the content passed in - content can be
      a string of HTML, an element, or an array/collection of elements
    */
    createFragment: function(content) {
      var template = document.createElement('template');
      if (content) {
        if (content.nodeName) toArray(arguments).forEach(function(e){
          template.content.appendChild(e);
        });
        else template.innerHTML = parseMultiline(content);
      }
      return document.importNode(template.content, true);
    },

    /*
      Removes an element from the DOM for more performant node manipulation. The element
      is placed back into the DOM at the place it was taken from.
    */
    manipulate: function(element, fn){
      var next = element.nextSibling,
          parent = element.parentNode,
          returned = fn.call(element) || element;
      if (next) parent.insertBefore(returned, next);
      else parent.appendChild(returned);
    },

    /* PSEUDOS */

    applyPseudos: function(key, fn, target, source) {
      var listener = fn,
          pseudos = {};
      if (key.match(':')) {
        var matches = [],
            valueFlag = 0;
        key.replace(regexPseudoParens, function(match){
          if (match == '(') return ++valueFlag == 1 ? '\u276A' : '(';
          return !--valueFlag ? '\u276B' : ')';
        }).replace(regexPseudoCapture, function(z, name, value, solo){
          matches.push([name || solo, value]);
        });
        var i = matches.length;
        while (i--) parsePseudo(function(){
          var name = matches[i][0],
              value = matches[i][1];
          if (!xtag.pseudos[name]) throw "pseudo not found: " + name + " " + value;
          value = (value === '' || typeof value == 'undefined') ? null : value;
          var pseudo = pseudos[i] = Object.create(xtag.pseudos[name]);
          pseudo.key = key;
          pseudo.name = name;
          pseudo.value = value;
          pseudo['arguments'] = (value || '').split(',');
          pseudo.action = pseudo.action || trueop;
          pseudo.source = source;
          pseudo.onAdd = pseudo.onAdd || noop;
          pseudo.onRemove = pseudo.onRemove || noop;
          var original = pseudo.listener = listener;
          listener = function(){
            var output = pseudo.action.apply(this, [pseudo].concat(toArray(arguments)));
            if (output === null || output === false) return output;
            output = pseudo.listener.apply(this, arguments);
            pseudo.listener = original;
            return output;
          };
          if (!target) pseudo.onAdd.call(fn, pseudo);
          else target.push(pseudo);
        });
      }
      for (var z in pseudos) {
        if (pseudos[z].onCompiled) listener = pseudos[z].onCompiled(listener, pseudos[z]) || listener;
      }
      return listener;
    },

    removePseudos: function(target, pseudos){
      pseudos.forEach(function(obj){
        obj.onRemove.call(target, obj);
      });
    },

  /*** Events ***/

    parseEvent: function(type, fn) {
      var pseudos = type.split(':'),
          key = pseudos.shift(),
          custom = xtag.customEvents[key],
          event = xtag.merge({
            type: key,
            stack: noop,
            condition: trueop,
            capture: xtag.captureEvents[key],
            attach: [],
            _attach: [],
            pseudos: '',
            _pseudos: [],
            onAdd: noop,
            onRemove: noop
          }, custom || {});
      event.attach = toArray(event.base || event.attach);
      event.chain = key + (event.pseudos.length ? ':' + event.pseudos : '') + (pseudos.length ? ':' + pseudos.join(':') : '');
      var stack = xtag.applyPseudos(event.chain, fn, event._pseudos, event);
      event.stack = function(e){
        e.currentTarget = e.currentTarget || this;
        var detail = e.detail || {};
        if (!detail.__stack__) return stack.apply(this, arguments);
        else if (detail.__stack__ == stack) {
          e.stopPropagation();
          e.cancelBubble = true;
          return stack.apply(this, arguments);
        }
      };
      event.listener = function(e){
        var args = toArray(arguments),
            output = event.condition.apply(this, args.concat([event]));
        if (!output) return output;
        // The second condition in this IF is to address the following Blink regression: https://code.google.com/p/chromium/issues/detail?id=367537
        // Remove this when affected browser builds with this regression fall below 5% marketshare
        if (e.type != key && (e.baseEvent && e.type != e.baseEvent.type)) {
          xtag.fireEvent(e.target, key, {
            baseEvent: e,
            detail: output !== true && (output.__stack__ = stack) ? output : { __stack__: stack }
          });
        }
        else return event.stack.apply(this, args);
      };
      event.attach.forEach(function(name) {
        event._attach.push(xtag.parseEvent(name, event.listener));
      });
      return event;
    },

    addEvent: function (element, type, fn, capture) {
      var event = typeof fn == 'function' ? xtag.parseEvent(type, fn) : fn;
      event._pseudos.forEach(function(obj){
        obj.onAdd.call(element, obj);
      });
      event._attach.forEach(function(obj) {
        xtag.addEvent(element, obj.type, obj);
      });
      event.onAdd.call(element, event, event.listener);
      element.addEventListener(event.type, event.stack, capture || event.capture);
      return event;
    },

    addEvents: function (element, obj) {
      var events = {};
      for (var z in obj) {
        events[z] = xtag.addEvent(element, z, obj[z]);
      }
      return events;
    },

    removeEvent: function (element, type, event) {
      event = event || type;
      event.onRemove.call(element, event, event.listener);
      xtag.removePseudos(element, event._pseudos);
      event._attach.forEach(function(obj) {
        xtag.removeEvent(element, obj);
      });
      element.removeEventListener(event.type, event.stack);
    },

    removeEvents: function(element, obj){
      for (var z in obj) xtag.removeEvent(element, obj[z]);
    },

    fireEvent: function(element, type, options){
      var event = doc.createEvent('CustomEvent');
      options = options || {};
      event.initCustomEvent(type,
        options.bubbles !== false,
        options.cancelable !== false,
        options.detail
      );
      if (options.baseEvent) inheritEvent(event, options.baseEvent);
      element.dispatchEvent(event);
    }

  };

  if (typeof define === 'function' && define.amd) define(xtag);
  else if (typeof module !== 'undefined' && module.exports) module.exports = xtag;
  else win.xtag = xtag;

  doc.addEventListener('WebComponentsReady', function(){
    xtag.fireEvent(doc.body, 'DOMComponentsLoaded');
  });

})();
(function (document, xtag) {
    "use strict";

    xtag.register("x-clock", {
        lifecycle: {
            created: function () {
                this.start();
            }
        },
        methods: {
            start: function () {
                this.update();
                this.xtag.interval = setInterval(this.update.bind(this), 1000);
            },
            stop: function () {
                this.xtag.interval = clearInterval(this.xtag.interval);
            },
            update: function () {
                this.textContent = new Date().toLocaleTimeString();
            }
        },
        events: {
            tap: function () {
                if (this.xtag.interval) this.stop();
                else this.start();
            }
        }
    });
})(document, xtag);
(function (document, Polymer) {
            "use strict";

            Polymer({
                is: "p-drag",
                properties: {
                    id: Number
                },
                startDrag: function(event){
                    console.log("startDrag",event.target.id);
                    event.dataTransfer.setData("text", event.target.id);
                },
                handleTrack: function(e){
                    switch(e.detail.state){
                        case "start":
                            console.log("Tracking started!");
                            break;
                        case "track":
                            console.log("Tracking in progress..." + e.detail.x + "," + e.detail.y);
                            break
                        case "end":
                            console.log("Tracking ended!");
                            break;
                    }
                },
            });
        })(document, Polymer);
(function(document, Polymer){
            "use strict";
            
            Polymer({
                is: "p-droparea",
                listeners: {
                    "droparea.on-drop": "onDrop",
                    "droparea.on-dragover": "allowDrop"
                },
                onDrop: function(event){
                    console.log("OnDrop");
                    event.preventDefault();
                    var data = event.dataTransfer.getData("text");
                    this.$.droparea.appendChild(document.getElementById(data));
                },
                allowDrop: function(event){
                    console.log("AllowDrop");
                    event.preventDefault();
                },
                addChild: function(item){
                    this.$.droparea.appendChild(item);
                }
            });
        })(document, Polymer);
(function(document, Polymer){
            "use strict";
            
            Polymer({
                is: "p-footer"
            });
        })(document, Polymer);
(function() {
      'use strict';

      var SHADOW_WHEN_SCROLLING = 1;
      var SHADOW_ALWAYS = 2;
      var MODE_CONFIGS = {
        outerScroll: {
          'scroll': true
        },

        shadowMode: {
          'standard': SHADOW_ALWAYS,
          'waterfall': SHADOW_WHEN_SCROLLING,
          'waterfall-tall': SHADOW_WHEN_SCROLLING
        },

        tallMode: {
          'waterfall-tall': true
        }
      };

      Polymer({
        is: 'paper-header-panel',

        /**
         * Fired when the content has been scrolled.  `event.detail.target` returns
         * the scrollable element which you can use to access scroll info such as
         * `scrollTop`.
         *
         *     <paper-header-panel on-content-scroll="scrollHandler">
         *       ...
         *     </paper-header-panel>
         *
         *
         *     scrollHandler: function(event) {
         *       var scroller = event.detail.target;
         *       console.log(scroller.scrollTop);
         *     }
         *
         * @event content-scroll
         */

        properties: {
          /**
           * Controls header and scrolling behavior. Options are
           * `standard`, `seamed`, `waterfall`, `waterfall-tall`, `scroll` and
           * `cover`. Default is `standard`.
           *
           * `standard`: The header is a step above the panel. The header will consume the
           * panel at the point of entry, preventing it from passing through to the
           * opposite side.
           *
           * `seamed`: The header is presented as seamed with the panel.
           *
           * `waterfall`: Similar to standard mode, but header is initially presented as
           * seamed with panel, but then separates to form the step.
           *
           * `waterfall-tall`: The header is initially taller (`tall` class is added to
           * the header).  As the user scrolls, the header separates (forming an edge)
           * while condensing (`tall` class is removed from the header).
           *
           * `scroll`: The header keeps its seam with the panel, and is pushed off screen.
           *
           * `cover`: The panel covers the whole `paper-header-panel` including the
           * header. This allows user to style the panel in such a way that the panel is
           * partially covering the header.
           *
           *     <paper-header-panel mode="cover">
           *       <paper-toolbar class="tall">
           *         <paper-icon-button icon="menu"></paper-icon-button>
           *       </paper-toolbar>
           *       <div class="content"></div>
           *     </paper-header-panel>
           */
          mode: {
            type: String,
            value: 'standard',
            observer: '_modeChanged',
            reflectToAttribute: true
          },

          /**
           * If true, the drop-shadow is always shown no matter what mode is set to.
           */
          shadow: {
            type: Boolean,
            value: false
          },

          /**
           * The class used in waterfall-tall mode.  Change this if the header
           * accepts a different class for toggling height, e.g. "medium-tall"
           */
          tallClass: {
            type: String,
            value: 'tall'
          },

          /**
           * If true, the scroller is at the top
           */
          atTop: {
            type: Boolean,
            value: true,
            notify: true,
            readOnly: true,
            reflectToAttribute: true
          }
        },

        observers: [
          '_computeDropShadowHidden(atTop, mode, shadow)'
        ],

        ready: function() {
          this.scrollHandler = this._scroll.bind(this);
        },

        attached: function() {
          this._addListener();
          // Run `scroll` logic once to initialize class names, etc.
          this._keepScrollingState();
        },

        detached: function() {
          this._removeListener();
        },

        /**
         * Returns the header element
         *
         * @property header
         * @type Object
         */
        get header() {
          return Polymer.dom(this.$.headerContent).getDistributedNodes()[0];
        },

        /**
         * Returns the scrollable element.
         *
         * @property scroller
         * @type Object
         */
        get scroller() {
          return this._getScrollerForMode(this.mode);
        },

        /**
         * Returns true if the scroller has a visible shadow.
         *
         * @property visibleShadow
         * @type Boolean
         */
        get visibleShadow() {
          return this.$.dropShadow.classList.contains('has-shadow');
        },

        _computeDropShadowHidden: function(atTop, mode, shadow) {
          var shadowMode = MODE_CONFIGS.shadowMode[mode];

          if (this.shadow) {
            this.toggleClass('has-shadow', true, this.$.dropShadow);
          } else if (shadowMode === SHADOW_ALWAYS) {
            this.toggleClass('has-shadow', true, this.$.dropShadow);
          } else if (shadowMode === SHADOW_WHEN_SCROLLING && !atTop) {
            this.toggleClass('has-shadow', true, this.$.dropShadow);
          } else {
            this.toggleClass('has-shadow', false, this.$.dropShadow);
          }
        },

        _computeMainContainerClass: function(mode) {
          // TODO:  It will be useful to have a utility for classes
          // e.g. Polymer.Utils.classes({ foo: true });

          var classes = {};

          classes['flex'] = mode !== 'cover';

          return Object.keys(classes).filter(
            function(className) {
              return classes[className];
            }).join(' ');
        },

        _addListener: function() {
          this.scroller.addEventListener('scroll', this.scrollHandler, false);
        },

        _removeListener: function() {
          this.scroller.removeEventListener('scroll', this.scrollHandler);
        },

        _modeChanged: function(newMode, oldMode) {
          var configs = MODE_CONFIGS;
          var header = this.header;
          var animateDuration = 200;

          if (header) {
            // in tallMode it may add tallClass to the header; so do the cleanup
            // when mode is changed from tallMode to not tallMode
            if (configs.tallMode[oldMode] && !configs.tallMode[newMode]) {
              header.classList.remove(this.tallClass);
              this.async(function() {
                header.classList.remove('animate');
              }, animateDuration);
            } else {
              header.classList.toggle('animate', configs.tallMode[newMode]);
            }
          }
          this._keepScrollingState();
        },

        _keepScrollingState: function() {
          var main = this.scroller;
          var header = this.header;

          this._setAtTop(main.scrollTop === 0);

          if (header && this.tallClass && MODE_CONFIGS.tallMode[this.mode]) {
            this.toggleClass(this.tallClass, this.atTop ||
                header.classList.contains(this.tallClass) &&
                main.scrollHeight < this.offsetHeight, header);
          }
        },

        _scroll: function() {
          this._keepScrollingState();
          this.fire('content-scroll', {target: this.scroller}, {bubbles: false});
        },

        _getScrollerForMode: function(mode) {
          return MODE_CONFIGS.outerScroll[mode] ?
              this : this.$.mainContainer;
        }
      });
    })();
Polymer({
      is: 'paper-toolbar',

      hostAttributes: {
        'role': 'toolbar'
      },

      properties: {
        /**
         * Controls how the items are aligned horizontally when they are placed
         * at the bottom.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         */
        bottomJustify: {
          type: String,
          value: ''
        },

        /**
         * Controls how the items are aligned horizontally.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         */
        justify: {
          type: String,
          value: ''
        },

        /**
         * Controls how the items are aligned horizontally when they are placed
         * in the middle.
         * Options are `start`, `center`, `end`, `justified` and `around`.
         */
        middleJustify: {
          type: String,
          value: ''
        }

      },

      attached: function() {
        this._observer = this._observe(this);
        this._updateAriaLabelledBy();
      },

      detached: function() {
        if (this._observer) {
          this._observer.disconnect();
        }
      },

      _observe: function(node) {
        var observer = new MutationObserver(function() {
          this._updateAriaLabelledBy();
        }.bind(this));
        observer.observe(node, {
          childList: true,
          subtree: true
        });
        return observer;
      },

      _updateAriaLabelledBy: function() {
        var labelledBy = [];
        var contents = Polymer.dom(this.root).querySelectorAll('content');
        for (var content, index = 0; content = contents[index]; index++) {
          var nodes = Polymer.dom(content).getDistributedNodes();
          for (var node, jndex = 0; node = nodes[jndex]; jndex++) {
            if (node.classList && node.classList.contains('title')) {
              if (node.id) {
                labelledBy.push(node.id);
              } else {
                var id = 'paper-toolbar-label-' + Math.floor(Math.random() * 10000);
                node.id = id;
                labelledBy.push(id);
              }
            }
          }
        }
        if (labelledBy.length > 0) {
          this.setAttribute('aria-labelledby', labelledBy.join(' '));
        }
      },

      _computeBarExtraClasses: function(barJustify) {
        if (!barJustify) return '';

        return barJustify + (barJustify === 'justified' ? '' : '-justified');
      }
    });
(function (document, Polymer) {
            "use strict";

            Polymer({
                is: "p-header",
                properties: {
                    title: String
                }
            });
        })(document, Polymer);
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3] || ''
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? this.options.sanitizer
          ? this.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0]
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.text(escape(this.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) return text;
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
'use strict';

  Polymer({

    is: 'marked-element',

    properties: {

      /**
       * The markdown source that should be rendered by this element.
       */
      markdown: {
        observer: 'render',
        type: String,
        value: null
      },
      /**
       * Conform to obscure parts of markdown.pl as much as possible. Don't fix any of the original markdown bugs or poor behavior.
       */
      pedantic: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Sanitize the output. Ignore any HTML that has been input.
       */
      sanitize: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Use "smart" typographic punctuation for things like quotes and dashes.
       */
      smartypants: {
        observer: 'render',
        type: Boolean,
        value: false
      }
    },

    ready: function() {
      if (!this.markdown) {
        // Use the Markdown from the first `<script>` descendant whose MIME type starts with
        // "text/markdown". Script elements beyond the first are ignored.
        var markdownElement = Polymer.dom(this).querySelector('[type^="text/markdown"]');
        if (markdownElement != null) {
          this.markdown = this._unindent(markdownElement.textContent);
        }
      }
    },

    /**
     * Renders `markdown` to HTML when the element is attached.
     *
     * This serves a dual purpose:
     *
     *  * Prevents unnecessary work (no need to render when not visible).
     *
     *  * `attached` fires top-down, so we can give ancestors a chance to
     *    register listeners for the `syntax-highlight` event _before_ we render
     *    any markdown.
     *
     */
    attached: function() {
      this._attached = true;
      this._outputElement = this.outputElement;
      this.render();
    },

    detached: function() {
      this._attached = false;
    },

    /**
     * Unindents the markdown source that will be rendered.
     */
    unindent: function(text) {
      return this._unindent(text);
    },

    get outputElement () {
      var child = Polymer.dom(this).queryDistributedElements('.markdown-html')[0];

      if (child)
        return child;

      this.toggleClass('hidden', false, this.$.content);
      return this.$.content;
    },

    /**
     * The `marked-render-complete` event is fired once Markdown to HTML
     * conversion has finished, and the DOM has been populated via the resulting
     * HTML.
     *
     * @event marked-render-complete
     */

    /**
     * Renders `markdown` into this element's DOM.
     *
     * This is automatically called whenever the `markdown` property is changed.
     *
     * The only case where you should be calling this is if you are providing
     * markdown via `<script type="text/markdown">` after this element has been
     * constructed (or updating that markdown).
     */
    render: function() {
      if (!this._attached) return;
      if (!this.markdown) {
        Polymer.dom(this._outputElement).innerHTML = '';
        return;
      }
      var opts = {
        highlight: this._highlight.bind(this),
        sanitize: this.sanitize,
        pedantic: this.pedantic,
        smartypants: this.smartypants
      };
      Polymer.dom(this._outputElement).innerHTML = marked(this.markdown, opts);
      this.fire('marked-render-complete');
    },

    _highlight: function(code, lang) {
      var event = this.fire('syntax-highlight', {code: code, lang: lang});
      return event.detail.code || code;
    },

    _unindent: function(text) {
      if (!text) return text;
      var lines  = text.replace(/\t/g, '  ').split('\n');
      var indent = lines.reduce(function(prev, line) {
        if (/^\s*$/.test(line)) return prev;  // Completely ignore blank lines.

        var lineIndent = line.match(/^(\s*)/)[0].length;
        if (prev === null) return lineIndent;
        return lineIndent < prev ? lineIndent : prev;
      }, null);

      return lines.map(function(l) { return l.substr(indent); }).join('\n');
    }

  });
(function(document, Polymer){
            "use strict";

            Polymer({
                is: "p-markdown",
                properties: {
                    content: String
                },
                ready: function(){
                    this.$.marked.markdown = this.content;
                }
            });
        })(document, Polymer);
Polymer({
      is: 'iron-image',

      properties: {
        /**
         * The URL of an image.
         */
        src: {
          observer: '_srcChanged',
          type: String,
          value: ''
        },

        /**
         * A short text alternative for the image.
         */
        alt: {
          type: String,
          value: null
        },

        /**
         * When true, the image is prevented from loading and any placeholder is
         * shown.  This may be useful when a binding to the src property is known to
         * be invalid, to prevent 404 requests.
         */
        preventLoad: {
          type: Boolean,
          value: false,
          observer: '_preventLoadChanged'
        },

        /**
         * Sets a sizing option for the image.  Valid values are `contain` (full
         * aspect ratio of the image is contained within the element and
         * letterboxed) or `cover` (image is cropped in order to fully cover the
         * bounds of the element), or `null` (default: image takes natural size).
         */
        sizing: {
          type: String,
          value: null,
          reflectToAttribute: true
        },

        /**
         * When a sizing option is used (`cover` or `contain`), this determines
         * how the image is aligned within the element bounds.
         */
        position: {
          type: String,
          value: 'center'
        },

        /**
         * When `true`, any change to the `src` property will cause the `placeholder`
         * image to be shown until the new image has loaded.
         */
        preload: {
          type: Boolean,
          value: false
        },

        /**
         * This image will be used as a background/placeholder until the src image has
         * loaded.  Use of a data-URI for placeholder is encouraged for instant rendering.
         */
        placeholder: {
          type: String,
          value: null,
          observer: '_placeholderChanged'
        },

        /**
         * When `preload` is true, setting `fade` to true will cause the image to
         * fade into place.
         */
        fade: {
          type: Boolean,
          value: false
        },

        /**
         * Read-only value that is true when the image is loaded.
         */
        loaded: {
          notify: true,
          readOnly: true,
          type: Boolean,
          value: false
        },

        /**
         * Read-only value that tracks the loading state of the image when the `preload`
         * option is used.
         */
        loading: {
          notify: true,
          readOnly: true,
          type: Boolean,
          value: false
        },

        /**
         * Read-only value that indicates that the last set `src` failed to load.
         */
        error: {
          notify: true,
          readOnly: true,
          type: Boolean,
          value: false
        },

        /**
         * Can be used to set the width of image (e.g. via binding); size may also be
         * set via CSS.
         */
        width: {
          observer: '_widthChanged',
          type: Number,
          value: null
        },

        /**
         * Can be used to set the height of image (e.g. via binding); size may also be
         * set via CSS.
         *
         * @attribute height
         * @type number
         * @default null
         */
        height: {
          observer: '_heightChanged',
          type: Number,
          value: null
        },
      },

      observers: [
        '_transformChanged(sizing, position)'
      ],

      ready: function() {
        var img = this.$.img;

        img.onload = function() {
          if (this.$.img.src !== this._resolveSrc(this.src)) return;

          this._setLoading(false);
          this._setLoaded(true);
          this._setError(false);
        }.bind(this);

        img.onerror = function() {
          if (this.$.img.src !== this._resolveSrc(this.src)) return;

          this._reset();

          this._setLoading(false);
          this._setLoaded(false);
          this._setError(true);
        }.bind(this);

        this._resolvedSrc = '';
      },

      _load: function(src) {
        if (src) {
          this.$.img.src = src;
        } else {
          this.$.img.removeAttribute('src');
        }
        this.$.sizedImgDiv.style.backgroundImage = src ? 'url("' + src + '")' : '';

        this._setLoading(!!src);
        this._setLoaded(false);
        this._setError(false);
      },

      _reset: function() {
        this.$.img.removeAttribute('src');
        this.$.sizedImgDiv.style.backgroundImage = '';

        this._setLoading(false);
        this._setLoaded(false);
        this._setError(false);
      },

      _computePlaceholderHidden: function() {
        return !this.preload || (!this.fade && !this.loading && this.loaded);
      },

      _computePlaceholderClassName: function() {
        return (this.preload && this.fade && !this.loading && this.loaded) ? 'faded-out' : '';
      },

      _computeImgDivHidden: function() {
        return !this.sizing;
      },

      _computeImgDivARIAHidden: function() {
        return this.alt === '' ? 'true' : undefined;
      },

      _computeImgDivARIALabel: function() {
        if (this.alt !== null) {
          return this.alt;
        }

        // Polymer.ResolveUrl.resolveUrl will resolve '' relative to a URL x to
        // that URL x, but '' is the default for src.
        if (this.src === '') {
          return '';
        }

        var pathComponents = (new URL(this._resolveSrc(this.src))).pathname.split("/");
        return pathComponents[pathComponents.length - 1];
      },

      _computeImgHidden: function() {
        return !!this.sizing;
      },

      _widthChanged: function() {
        this.style.width = isNaN(this.width) ? this.width : this.width + 'px';
      },

      _heightChanged: function() {
        this.style.height = isNaN(this.height) ? this.height : this.height + 'px';
      },

      _preventLoadChanged: function() {
        if (this.preventLoad || this.loaded) return;

        this._reset();
        this._load(this.src);
      },

      _srcChanged: function(newSrc, oldSrc) {
        var newResolvedSrc = this._resolveSrc(newSrc);
        if (newResolvedSrc === this._resolvedSrc) return;
        this._resolvedSrc = newResolvedSrc;

        this._reset();
        if (!this.preventLoad) {
          this._load(newSrc);
        }
      },

      _placeholderChanged: function() {
        this.$.placeholder.style.backgroundImage =
          this.placeholder ? 'url("' + this.placeholder + '")' : '';
      },

      _transformChanged: function() {
        var sizedImgDivStyle = this.$.sizedImgDiv.style;
        var placeholderStyle = this.$.placeholder.style;

        sizedImgDivStyle.backgroundSize =
        placeholderStyle.backgroundSize =
          this.sizing;

        sizedImgDivStyle.backgroundPosition =
        placeholderStyle.backgroundPosition =
          this.sizing ? this.position : '';

        sizedImgDivStyle.backgroundRepeat =
        placeholderStyle.backgroundRepeat =
          this.sizing ? 'no-repeat' : '';
      },

      _resolveSrc: function(testSrc) {
        return Polymer.ResolveUrl.resolveUrl(testSrc, this.ownerDocument.baseURI);
      }
    });
Polymer({
      is: 'paper-card',

      properties: {
        /**
         * The title of the card.
         */
        heading: {
          type: String,
          value: '',
          observer: '_headingChanged'
        },

        /**
         * The url of the title image of the card.
         */
        image: {
          type: String,
          value: ''
        },

        /**
         * When `true`, any change to the image url property will cause the
         * `placeholder` image to be shown until the image is fully rendered.
         */
        preloadImage: {
          type: Boolean,
          value: false
        },

        /**
         * When `preloadImage` is true, setting `fadeImage` to true will cause the
         * image to fade into place.
         */
        fadeImage: {
          type: Boolean,
          value: false
        },

        /**
         * The z-depth of the card, from 0-5.
         */
        elevation: {
          type: Number,
          value: 1,
          reflectToAttribute: true
        },

        /**
         * Set this to true to animate the card shadow when setting a new
         * `z` value.
         */
        animatedShadow: {
          type: Boolean,
          value: false
        },

        /**
         * Read-only property used to pass down the `animatedShadow` value to
         * the underlying paper-material style (since they have different names).
         */
        animated: {
          type: Boolean,
          reflectToAttribute: true,
          readOnly: true,
          computed: '_computeAnimated(animatedShadow)'
        }
      },

      _headingChanged: function(heading) {
        var label = this.getAttribute('aria-label');
        this.setAttribute('aria-label', heading);
      },

      _computeHeadingClass: function(image) {
        var cls = 'title-text';
        if (image)
          cls += ' over-image';
        return cls;
      },

      _computeAnimated: function(animatedShadow) {
        return animatedShadow;
      }
    });
(function() {
    'use strict';

    /**
     * Chrome uses an older version of DOM Level 3 Keyboard Events
     *
     * Most keys are labeled as text, but some are Unicode codepoints.
     * Values taken from: http://www.w3.org/TR/2007/WD-DOM-Level-3-Events-20071221/keyset.html#KeySet-Set
     */
    var KEY_IDENTIFIER = {
      'U+0008': 'backspace',
      'U+0009': 'tab',
      'U+001B': 'esc',
      'U+0020': 'space',
      'U+007F': 'del'
    };

    /**
     * Special table for KeyboardEvent.keyCode.
     * KeyboardEvent.keyIdentifier is better, and KeyBoardEvent.key is even better
     * than that.
     *
     * Values from: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.keyCode#Value_of_keyCode
     */
    var KEY_CODE = {
      8: 'backspace',
      9: 'tab',
      13: 'enter',
      27: 'esc',
      33: 'pageup',
      34: 'pagedown',
      35: 'end',
      36: 'home',
      32: 'space',
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down',
      46: 'del',
      106: '*'
    };

    /**
     * MODIFIER_KEYS maps the short name for modifier keys used in a key
     * combo string to the property name that references those same keys
     * in a KeyboardEvent instance.
     */
    var MODIFIER_KEYS = {
      'shift': 'shiftKey',
      'ctrl': 'ctrlKey',
      'alt': 'altKey',
      'meta': 'metaKey'
    };

    /**
     * KeyboardEvent.key is mostly represented by printable character made by
     * the keyboard, with unprintable keys labeled nicely.
     *
     * However, on OS X, Alt+char can make a Unicode character that follows an
     * Apple-specific mapping. In this case, we fall back to .keyCode.
     */
    var KEY_CHAR = /[a-z0-9*]/;

    /**
     * Matches a keyIdentifier string.
     */
    var IDENT_CHAR = /U\+/;

    /**
     * Matches arrow keys in Gecko 27.0+
     */
    var ARROW_KEY = /^arrow/;

    /**
     * Matches space keys everywhere (notably including IE10's exceptional name
     * `spacebar`).
     */
    var SPACE_KEY = /^space(bar)?/;

    /**
     * Transforms the key.
     * @param {string} key The KeyBoardEvent.key
     * @param {Boolean} [noSpecialChars] Limits the transformation to
     * alpha-numeric characters.
     */
    function transformKey(key, noSpecialChars) {
      var validKey = '';
      if (key) {
        var lKey = key.toLowerCase();
        if (lKey === ' ' || SPACE_KEY.test(lKey)) {
          validKey = 'space';
        } else if (lKey.length == 1) {
          if (!noSpecialChars || KEY_CHAR.test(lKey)) {
            validKey = lKey;
          }
        } else if (ARROW_KEY.test(lKey)) {
          validKey = lKey.replace('arrow', '');
        } else if (lKey == 'multiply') {
          // numpad '*' can map to Multiply on IE/Windows
          validKey = '*';
        } else {
          validKey = lKey;
        }
      }
      return validKey;
    }

    function transformKeyIdentifier(keyIdent) {
      var validKey = '';
      if (keyIdent) {
        if (keyIdent in KEY_IDENTIFIER) {
          validKey = KEY_IDENTIFIER[keyIdent];
        } else if (IDENT_CHAR.test(keyIdent)) {
          keyIdent = parseInt(keyIdent.replace('U+', '0x'), 16);
          validKey = String.fromCharCode(keyIdent).toLowerCase();
        } else {
          validKey = keyIdent.toLowerCase();
        }
      }
      return validKey;
    }

    function transformKeyCode(keyCode) {
      var validKey = '';
      if (Number(keyCode)) {
        if (keyCode >= 65 && keyCode <= 90) {
          // ascii a-z
          // lowercase is 32 offset from uppercase
          validKey = String.fromCharCode(32 + keyCode);
        } else if (keyCode >= 112 && keyCode <= 123) {
          // function keys f1-f12
          validKey = 'f' + (keyCode - 112);
        } else if (keyCode >= 48 && keyCode <= 57) {
          // top 0-9 keys
          validKey = String(48 - keyCode);
        } else if (keyCode >= 96 && keyCode <= 105) {
          // num pad 0-9
          validKey = String(96 - keyCode);
        } else {
          validKey = KEY_CODE[keyCode];
        }
      }
      return validKey;
    }

    /**
      * Calculates the normalized key for a KeyboardEvent.
      * @param {KeyboardEvent} keyEvent
      * @param {Boolean} [noSpecialChars] Set to true to limit keyEvent.key
      * transformation to alpha-numeric chars. This is useful with key
      * combinations like shift + 2, which on FF for MacOS produces
      * keyEvent.key = @
      * To get 2 returned, set noSpecialChars = true
      * To get @ returned, set noSpecialChars = false
     */
    function normalizedKeyForEvent(keyEvent, noSpecialChars) {
      // Fall back from .key, to .keyIdentifier, to .keyCode, and then to
      // .detail.key to support artificial keyboard events.
      return transformKey(keyEvent.key, noSpecialChars) ||
        transformKeyIdentifier(keyEvent.keyIdentifier) ||
        transformKeyCode(keyEvent.keyCode) ||
        transformKey(keyEvent.detail.key, noSpecialChars) || '';
    }

    function keyComboMatchesEvent(keyCombo, event) {
      // For combos with modifiers we support only alpha-numeric keys
      var keyEvent = normalizedKeyForEvent(event, keyCombo.hasModifiers);
      return keyEvent === keyCombo.key &&
        (!keyCombo.hasModifiers || (
          !!event.shiftKey === !!keyCombo.shiftKey &&
          !!event.ctrlKey === !!keyCombo.ctrlKey &&
          !!event.altKey === !!keyCombo.altKey &&
          !!event.metaKey === !!keyCombo.metaKey)
        );
    }

    function parseKeyComboString(keyComboString) {
      if (keyComboString.length === 1) {
        return {
          combo: keyComboString,
          key: keyComboString,
          event: 'keydown'
        };
      }
      return keyComboString.split('+').reduce(function(parsedKeyCombo, keyComboPart) {
        var eventParts = keyComboPart.split(':');
        var keyName = eventParts[0];
        var event = eventParts[1];

        if (keyName in MODIFIER_KEYS) {
          parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
          parsedKeyCombo.hasModifiers = true;
        } else {
          parsedKeyCombo.key = keyName;
          parsedKeyCombo.event = event || 'keydown';
        }

        return parsedKeyCombo;
      }, {
        combo: keyComboString.split(':').shift()
      });
    }

    function parseEventString(eventString) {
      return eventString.trim().split(' ').map(function(keyComboString) {
        return parseKeyComboString(keyComboString);
      });
    }

    /**
     * `Polymer.IronA11yKeysBehavior` provides a normalized interface for processing
     * keyboard commands that pertain to [WAI-ARIA best practices](http://www.w3.org/TR/wai-aria-practices/#kbd_general_binding).
     * The element takes care of browser differences with respect to Keyboard events
     * and uses an expressive syntax to filter key presses.
     *
     * Use the `keyBindings` prototype property to express what combination of keys
     * will trigger the event to fire.
     *
     * Use the `key-event-target` attribute to set up event handlers on a specific
     * node.
     * The `keys-pressed` event will fire when one of the key combinations set with the
     * `keys` property is pressed.
     *
     * @demo demo/index.html
     * @polymerBehavior
     */
    Polymer.IronA11yKeysBehavior = {
      properties: {
        /**
         * The HTMLElement that will be firing relevant KeyboardEvents.
         */
        keyEventTarget: {
          type: Object,
          value: function() {
            return this;
          }
        },

        /**
         * If true, this property will cause the implementing element to
         * automatically stop propagation on any handled KeyboardEvents.
         */
        stopKeyboardEventPropagation: {
          type: Boolean,
          value: false
        },

        _boundKeyHandlers: {
          type: Array,
          value: function() {
            return [];
          }
        },

        // We use this due to a limitation in IE10 where instances will have
        // own properties of everything on the "prototype".
        _imperativeKeyBindings: {
          type: Object,
          value: function() {
            return {};
          }
        }
      },

      observers: [
        '_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'
      ],

      keyBindings: {},

      registered: function() {
        this._prepKeyBindings();
      },

      attached: function() {
        this._listenKeyEventListeners();
      },

      detached: function() {
        this._unlistenKeyEventListeners();
      },

      /**
       * Can be used to imperatively add a key binding to the implementing
       * element. This is the imperative equivalent of declaring a keybinding
       * in the `keyBindings` prototype property.
       */
      addOwnKeyBinding: function(eventString, handlerName) {
        this._imperativeKeyBindings[eventString] = handlerName;
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      /**
       * When called, will remove all imperatively-added key bindings.
       */
      removeOwnKeyBindings: function() {
        this._imperativeKeyBindings = {};
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      keyboardEventMatchesKeys: function(event, eventString) {
        var keyCombos = parseEventString(eventString);
        for (var i = 0; i < keyCombos.length; ++i) {
          if (keyComboMatchesEvent(keyCombos[i], event)) {
            return true;
          }
        }
        return false;
      },

      _collectKeyBindings: function() {
        var keyBindings = this.behaviors.map(function(behavior) {
          return behavior.keyBindings;
        });

        if (keyBindings.indexOf(this.keyBindings) === -1) {
          keyBindings.push(this.keyBindings);
        }

        return keyBindings;
      },

      _prepKeyBindings: function() {
        this._keyBindings = {};

        this._collectKeyBindings().forEach(function(keyBindings) {
          for (var eventString in keyBindings) {
            this._addKeyBinding(eventString, keyBindings[eventString]);
          }
        }, this);

        for (var eventString in this._imperativeKeyBindings) {
          this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
        }

        // Give precedence to combos with modifiers to be checked first.
        for (var eventName in this._keyBindings) {
          this._keyBindings[eventName].sort(function (kb1, kb2) {
            var b1 = kb1[0].hasModifiers;
            var b2 = kb2[0].hasModifiers;
            return (b1 === b2) ? 0 : b1 ? -1 : 1;
          })
        }
      },

      _addKeyBinding: function(eventString, handlerName) {
        parseEventString(eventString).forEach(function(keyCombo) {
          this._keyBindings[keyCombo.event] =
            this._keyBindings[keyCombo.event] || [];

          this._keyBindings[keyCombo.event].push([
            keyCombo,
            handlerName
          ]);
        }, this);
      },

      _resetKeyEventListeners: function() {
        this._unlistenKeyEventListeners();

        if (this.isAttached) {
          this._listenKeyEventListeners();
        }
      },

      _listenKeyEventListeners: function() {
        Object.keys(this._keyBindings).forEach(function(eventName) {
          var keyBindings = this._keyBindings[eventName];
          var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);

          this._boundKeyHandlers.push([this.keyEventTarget, eventName, boundKeyHandler]);

          this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
        }, this);
      },

      _unlistenKeyEventListeners: function() {
        var keyHandlerTuple;
        var keyEventTarget;
        var eventName;
        var boundKeyHandler;

        while (this._boundKeyHandlers.length) {
          // My kingdom for block-scope binding and destructuring assignment..
          keyHandlerTuple = this._boundKeyHandlers.pop();
          keyEventTarget = keyHandlerTuple[0];
          eventName = keyHandlerTuple[1];
          boundKeyHandler = keyHandlerTuple[2];

          keyEventTarget.removeEventListener(eventName, boundKeyHandler);
        }
      },

      _onKeyBindingEvent: function(keyBindings, event) {
        if (this.stopKeyboardEventPropagation) {
          event.stopPropagation();
        }

        // if event has been already prevented, don't do anything
        if (event.defaultPrevented) {
          return;
        }

        for (var i = 0; i < keyBindings.length; i++) {
          var keyCombo = keyBindings[i][0];
          var handlerName = keyBindings[i][1];
          if (keyComboMatchesEvent(keyCombo, event)) {
            this._triggerKeyHandler(keyCombo, handlerName, event);
            // exit the loop if eventDefault was prevented
            if (event.defaultPrevented) {
              return;
            }
          }
        }
      },

      _triggerKeyHandler: function(keyCombo, handlerName, keyboardEvent) {
        var detail = Object.create(keyCombo);
        detail.keyboardEvent = keyboardEvent;
        var event = new CustomEvent(keyCombo.event, {
          detail: detail,
          cancelable: true
        });
        this[handlerName].call(this, event);
        if (event.defaultPrevented) {
          keyboardEvent.preventDefault();
        }
      }
    };
  })();
(function() {
    var Utility = {
      distance: function(x1, y1, x2, y2) {
        var xDelta = (x1 - x2);
        var yDelta = (y1 - y2);

        return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
      },

      now: window.performance && window.performance.now ?
          window.performance.now.bind(window.performance) : Date.now
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function ElementMetrics(element) {
      this.element = element;
      this.width = this.boundingRect.width;
      this.height = this.boundingRect.height;

      this.size = Math.max(this.width, this.height);
    }

    ElementMetrics.prototype = {
      get boundingRect () {
        return this.element.getBoundingClientRect();
      },

      furthestCornerDistanceFrom: function(x, y) {
        var topLeft = Utility.distance(x, y, 0, 0);
        var topRight = Utility.distance(x, y, this.width, 0);
        var bottomLeft = Utility.distance(x, y, 0, this.height);
        var bottomRight = Utility.distance(x, y, this.width, this.height);

        return Math.max(topLeft, topRight, bottomLeft, bottomRight);
      }
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function Ripple(element) {
      this.element = element;
      this.color = window.getComputedStyle(element).color;

      this.wave = document.createElement('div');
      this.waveContainer = document.createElement('div');
      this.wave.style.backgroundColor = this.color;
      this.wave.classList.add('wave');
      this.waveContainer.classList.add('wave-container');
      Polymer.dom(this.waveContainer).appendChild(this.wave);

      this.resetInteractionState();
    }

    Ripple.MAX_RADIUS = 300;

    Ripple.prototype = {
      get recenters() {
        return this.element.recenters;
      },

      get center() {
        return this.element.center;
      },

      get mouseDownElapsed() {
        var elapsed;

        if (!this.mouseDownStart) {
          return 0;
        }

        elapsed = Utility.now() - this.mouseDownStart;

        if (this.mouseUpStart) {
          elapsed -= this.mouseUpElapsed;
        }

        return elapsed;
      },

      get mouseUpElapsed() {
        return this.mouseUpStart ?
          Utility.now () - this.mouseUpStart : 0;
      },

      get mouseDownElapsedSeconds() {
        return this.mouseDownElapsed / 1000;
      },

      get mouseUpElapsedSeconds() {
        return this.mouseUpElapsed / 1000;
      },

      get mouseInteractionSeconds() {
        return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
      },

      get initialOpacity() {
        return this.element.initialOpacity;
      },

      get opacityDecayVelocity() {
        return this.element.opacityDecayVelocity;
      },

      get radius() {
        var width2 = this.containerMetrics.width * this.containerMetrics.width;
        var height2 = this.containerMetrics.height * this.containerMetrics.height;
        var waveRadius = Math.min(
          Math.sqrt(width2 + height2),
          Ripple.MAX_RADIUS
        ) * 1.1 + 5;

        var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
        var timeNow = this.mouseInteractionSeconds / duration;
        var size = waveRadius * (1 - Math.pow(80, -timeNow));

        return Math.abs(size);
      },

      get opacity() {
        if (!this.mouseUpStart) {
          return this.initialOpacity;
        }

        return Math.max(
          0,
          this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity
        );
      },

      get outerOpacity() {
        // Linear increase in background opacity, capped at the opacity
        // of the wavefront (waveOpacity).
        var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
        var waveOpacity = this.opacity;

        return Math.max(
          0,
          Math.min(outerOpacity, waveOpacity)
        );
      },

      get isOpacityFullyDecayed() {
        return this.opacity < 0.01 &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isRestingAtMaxRadius() {
        return this.opacity >= this.initialOpacity &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isAnimationComplete() {
        return this.mouseUpStart ?
          this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
      },

      get translationFraction() {
        return Math.min(
          1,
          this.radius / this.containerMetrics.size * 2 / Math.sqrt(2)
        );
      },

      get xNow() {
        if (this.xEnd) {
          return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
        }

        return this.xStart;
      },

      get yNow() {
        if (this.yEnd) {
          return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
        }

        return this.yStart;
      },

      get isMouseDown() {
        return this.mouseDownStart && !this.mouseUpStart;
      },

      resetInteractionState: function() {
        this.maxRadius = 0;
        this.mouseDownStart = 0;
        this.mouseUpStart = 0;

        this.xStart = 0;
        this.yStart = 0;
        this.xEnd = 0;
        this.yEnd = 0;
        this.slideDistance = 0;

        this.containerMetrics = new ElementMetrics(this.element);
      },

      draw: function() {
        var scale;
        var translateString;
        var dx;
        var dy;

        this.wave.style.opacity = this.opacity;

        scale = this.radius / (this.containerMetrics.size / 2);
        dx = this.xNow - (this.containerMetrics.width / 2);
        dy = this.yNow - (this.containerMetrics.height / 2);


        // 2d transform for safari because of border-radius and overflow:hidden clipping bug.
        // https://bugs.webkit.org/show_bug.cgi?id=98538
        this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
        this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
        this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
        this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
      },

      /** @param {Event=} event */
      downAction: function(event) {
        var xCenter = this.containerMetrics.width / 2;
        var yCenter = this.containerMetrics.height / 2;

        this.resetInteractionState();
        this.mouseDownStart = Utility.now();

        if (this.center) {
          this.xStart = xCenter;
          this.yStart = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        } else {
          this.xStart = event ?
              event.detail.x - this.containerMetrics.boundingRect.left :
              this.containerMetrics.width / 2;
          this.yStart = event ?
              event.detail.y - this.containerMetrics.boundingRect.top :
              this.containerMetrics.height / 2;
        }

        if (this.recenters) {
          this.xEnd = xCenter;
          this.yEnd = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        }

        this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(
          this.xStart,
          this.yStart
        );

        this.waveContainer.style.top =
          (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
        this.waveContainer.style.left =
          (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';

        this.waveContainer.style.width = this.containerMetrics.size + 'px';
        this.waveContainer.style.height = this.containerMetrics.size + 'px';
      },

      /** @param {Event=} event */
      upAction: function(event) {
        if (!this.isMouseDown) {
          return;
        }

        this.mouseUpStart = Utility.now();
      },

      remove: function() {
        Polymer.dom(this.waveContainer.parentNode).removeChild(
          this.waveContainer
        );
      }
    };

    Polymer({
      is: 'paper-ripple',

      behaviors: [
        Polymer.IronA11yKeysBehavior
      ],

      properties: {
        /**
         * The initial opacity set on the wave.
         *
         * @attribute initialOpacity
         * @type number
         * @default 0.25
         */
        initialOpacity: {
          type: Number,
          value: 0.25
        },

        /**
         * How fast (opacity per second) the wave fades out.
         *
         * @attribute opacityDecayVelocity
         * @type number
         * @default 0.8
         */
        opacityDecayVelocity: {
          type: Number,
          value: 0.8
        },

        /**
         * If true, ripples will exhibit a gravitational pull towards
         * the center of their container as they fade away.
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        recenters: {
          type: Boolean,
          value: false
        },

        /**
         * If true, ripples will center inside its container
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        center: {
          type: Boolean,
          value: false
        },

        /**
         * A list of the visual ripples.
         *
         * @attribute ripples
         * @type Array
         * @default []
         */
        ripples: {
          type: Array,
          value: function() {
            return [];
          }
        },

        /**
         * True when there are visible ripples animating within the
         * element.
         */
        animating: {
          type: Boolean,
          readOnly: true,
          reflectToAttribute: true,
          value: false
        },

        /**
         * If true, the ripple will remain in the "down" state until `holdDown`
         * is set to false again.
         */
        holdDown: {
          type: Boolean,
          value: false,
          observer: '_holdDownChanged'
        },

        /**
         * If true, the ripple will not generate a ripple effect
         * via pointer interaction.
         * Calling ripple's imperative api like `simulatedRipple` will
         * still generate the ripple effect.
         */
        noink: {
          type: Boolean,
          value: false
        },

        _animating: {
          type: Boolean
        },

        _boundAnimate: {
          type: Function,
          value: function() {
            return this.animate.bind(this);
          }
        }
      },

      get target () {
        var ownerRoot = Polymer.dom(this).getOwnerRoot();
        var target;

        if (this.parentNode.nodeType == 11) { // DOCUMENT_FRAGMENT_NODE
          target = ownerRoot.host;
        } else {
          target = this.parentNode;
        }

        return target;
      },

      keyBindings: {
        'enter:keydown': '_onEnterKeydown',
        'space:keydown': '_onSpaceKeydown',
        'space:keyup': '_onSpaceKeyup'
      },

      attached: function() {
        // Set up a11yKeysBehavior to listen to key events on the target,
        // so that space and enter activate the ripple even if the target doesn't
        // handle key events. The key handlers deal with `noink` themselves.
        this.keyEventTarget = this.target;
        this.listen(this.target, 'up', 'uiUpAction');
        this.listen(this.target, 'down', 'uiDownAction');
      },

      detached: function() {
        this.unlisten(this.target, 'up', 'uiUpAction');
        this.unlisten(this.target, 'down', 'uiDownAction');
      },

      get shouldKeepAnimating () {
        for (var index = 0; index < this.ripples.length; ++index) {
          if (!this.ripples[index].isAnimationComplete) {
            return true;
          }
        }

        return false;
      },

      simulatedRipple: function() {
        this.downAction(null);

        // Please see polymer/polymer#1305
        this.async(function() {
          this.upAction();
        }, 1);
      },

      /**
       * Provokes a ripple down effect via a UI event,
       * respecting the `noink` property.
       * @param {Event=} event
       */
      uiDownAction: function(event) {
        if (!this.noink) {
          this.downAction(event);
        }
      },

      /**
       * Provokes a ripple down effect via a UI event,
       * *not* respecting the `noink` property.
       * @param {Event=} event
       */
      downAction: function(event) {
        if (this.holdDown && this.ripples.length > 0) {
          return;
        }

        var ripple = this.addRipple();

        ripple.downAction(event);

        if (!this._animating) {
          this.animate();
        }
      },

      /**
       * Provokes a ripple up effect via a UI event,
       * respecting the `noink` property.
       * @param {Event=} event
       */
      uiUpAction: function(event) {
        if (!this.noink) {
          this.upAction(event);
        }
      },

      /**
       * Provokes a ripple up effect via a UI event,
       * *not* respecting the `noink` property.
       * @param {Event=} event
       */
      upAction: function(event) {
        if (this.holdDown) {
          return;
        }

        this.ripples.forEach(function(ripple) {
          ripple.upAction(event);
        });

        this.animate();
      },

      onAnimationComplete: function() {
        this._animating = false;
        this.$.background.style.backgroundColor = null;
        this.fire('transitionend');
      },

      addRipple: function() {
        var ripple = new Ripple(this);

        Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
        this.$.background.style.backgroundColor = ripple.color;
        this.ripples.push(ripple);

        this._setAnimating(true);

        return ripple;
      },

      removeRipple: function(ripple) {
        var rippleIndex = this.ripples.indexOf(ripple);

        if (rippleIndex < 0) {
          return;
        }

        this.ripples.splice(rippleIndex, 1);

        ripple.remove();

        if (!this.ripples.length) {
          this._setAnimating(false);
        }
      },

      animate: function() {
        var index;
        var ripple;

        this._animating = true;

        for (index = 0; index < this.ripples.length; ++index) {
          ripple = this.ripples[index];

          ripple.draw();

          this.$.background.style.opacity = ripple.outerOpacity;

          if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
            this.removeRipple(ripple);
          }
        }

        if (!this.shouldKeepAnimating && this.ripples.length === 0) {
          this.onAnimationComplete();
        } else {
          window.requestAnimationFrame(this._boundAnimate);
        }
      },

      _onEnterKeydown: function() {
        this.uiDownAction();
        this.async(this.uiUpAction, 1);
      },

      _onSpaceKeydown: function() {
        this.uiDownAction();
      },

      _onSpaceKeyup: function() {
        this.uiUpAction();
      },

      // note: holdDown does not respect noink since it can be a focus based
      // effect.
      _holdDownChanged: function(newVal, oldVal) {
        if (oldVal === undefined) {
          return;
        }
        if (newVal) {
          this.downAction();
        } else {
          this.upAction();
        }
      }
    });
  })();
/**
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronControlState = {

    properties: {

      /**
       * If true, the element currently has focus.
       */
      focused: {
        type: Boolean,
        value: false,
        notify: true,
        readOnly: true,
        reflectToAttribute: true
      },

      /**
       * If true, the user cannot interact with this element.
       */
      disabled: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_disabledChanged',
        reflectToAttribute: true
      },

      _oldTabIndex: {
        type: Number
      },

      _boundFocusBlurHandler: {
        type: Function,
        value: function() {
          return this._focusBlurHandler.bind(this);
        }
      }

    },

    observers: [
      '_changedControlState(focused, disabled)'
    ],

    ready: function() {
      this.addEventListener('focus', this._boundFocusBlurHandler, true);
      this.addEventListener('blur', this._boundFocusBlurHandler, true);
    },

    _focusBlurHandler: function(event) {
      // NOTE(cdata):  if we are in ShadowDOM land, `event.target` will
      // eventually become `this` due to retargeting; if we are not in
      // ShadowDOM land, `event.target` will eventually become `this` due
      // to the second conditional which fires a synthetic event (that is also
      // handled). In either case, we can disregard `event.path`.

      if (event.target === this) {
        this._setFocused(event.type === 'focus');
      } else if (!this.shadowRoot && !this.isLightDescendant(event.target)) {
        this.fire(event.type, {sourceEvent: event}, {
          node: this,
          bubbles: event.bubbles,
          cancelable: event.cancelable
        });
      }
    },

    _disabledChanged: function(disabled, old) {
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      this.style.pointerEvents = disabled ? 'none' : '';
      if (disabled) {
        this._oldTabIndex = this.tabIndex;
        this.focused = false;
        this.tabIndex = -1;
        this.blur();
      } else if (this._oldTabIndex !== undefined) {
        this.tabIndex = this._oldTabIndex;
      }
    },

    _changedControlState: function() {
      // _controlStateChanged is abstract, follow-on behaviors may implement it
      if (this._controlStateChanged) {
        this._controlStateChanged();
      }
    }

  };
/**
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronButtonState
   */
  Polymer.IronButtonStateImpl = {

    properties: {

      /**
       * If true, the user is currently holding down the button.
       */
      pressed: {
        type: Boolean,
        readOnly: true,
        value: false,
        reflectToAttribute: true,
        observer: '_pressedChanged'
      },

      /**
       * If true, the button toggles the active state with each tap or press
       * of the spacebar.
       */
      toggles: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      /**
       * If true, the button is a toggle and is currently in the active state.
       */
      active: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * True if the element is currently being pressed by a "pointer," which
       * is loosely defined as mouse or touch input (but specifically excluding
       * keyboard input).
       */
      pointerDown: {
        type: Boolean,
        readOnly: true,
        value: false
      },

      /**
       * True if the input device that caused the element to receive focus
       * was a keyboard.
       */
      receivedFocusFromKeyboard: {
        type: Boolean,
        readOnly: true
      },

      /**
       * The aria attribute to be set if the button is a toggle and in the
       * active state.
       */
      ariaActiveAttribute: {
        type: String,
        value: 'aria-pressed',
        observer: '_ariaActiveAttributeChanged'
      }
    },

    listeners: {
      down: '_downHandler',
      up: '_upHandler',
      tap: '_tapHandler'
    },

    observers: [
      '_detectKeyboardFocus(focused)',
      '_activeChanged(active, ariaActiveAttribute)'
    ],

    keyBindings: {
      'enter:keydown': '_asyncClick',
      'space:keydown': '_spaceKeyDownHandler',
      'space:keyup': '_spaceKeyUpHandler',
    },

    _mouseEventRe: /^mouse/,

    _tapHandler: function() {
      if (this.toggles) {
       // a tap is needed to toggle the active state
        this._userActivate(!this.active);
      } else {
        this.active = false;
      }
    },

    _detectKeyboardFocus: function(focused) {
      this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
    },

    // to emulate native checkbox, (de-)activations from a user interaction fire
    // 'change' events
    _userActivate: function(active) {
      if (this.active !== active) {
        this.active = active;
        this.fire('change');
      }
    },

    _downHandler: function(event) {
      this._setPointerDown(true);
      this._setPressed(true);
      this._setReceivedFocusFromKeyboard(false);
    },

    _upHandler: function() {
      this._setPointerDown(false);
      this._setPressed(false);
    },

    /**
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyDownHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      var target = Polymer.dom(keyboardEvent).localTarget;

      // Ignore the event if this is coming from a focused light child, since that
      // element will deal with it.
      if (this.isLightDescendant(/** @type {Node} */(target)))
        return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopImmediatePropagation();
      this._setPressed(true);
    },

    /**
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyUpHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      var target = Polymer.dom(keyboardEvent).localTarget;

      // Ignore the event if this is coming from a focused light child, since that
      // element will deal with it.
      if (this.isLightDescendant(/** @type {Node} */(target)))
        return;

      if (this.pressed) {
        this._asyncClick();
      }
      this._setPressed(false);
    },

    // trigger click asynchronously, the asynchrony is useful to allow one
    // event handler to unwind before triggering another event
    _asyncClick: function() {
      this.async(function() {
        this.click();
      }, 1);
    },

    // any of these changes are considered a change to button state

    _pressedChanged: function(pressed) {
      this._changedButtonState();
    },

    _ariaActiveAttributeChanged: function(value, oldValue) {
      if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
        this.removeAttribute(oldValue);
      }
    },

    _activeChanged: function(active, ariaActiveAttribute) {
      if (this.toggles) {
        this.setAttribute(this.ariaActiveAttribute,
                          active ? 'true' : 'false');
      } else {
        this.removeAttribute(this.ariaActiveAttribute);
      }
      this._changedButtonState();
    },

    _controlStateChanged: function() {
      if (this.disabled) {
        this._setPressed(false);
      } else {
        this._changedButtonState();
      }
    },

    // provide hook for follow-on behaviors to react to button-state

    _changedButtonState: function() {
      if (this._buttonStateChanged) {
        this._buttonStateChanged(); // abstract
      }
    }

  };

  /** @polymerBehavior */
  Polymer.IronButtonState = [
    Polymer.IronA11yKeysBehavior,
    Polymer.IronButtonStateImpl
  ];
/**
   * `Polymer.PaperRippleBehavior` dynamically implements a ripple
   * when the element has focus via pointer or keyboard.
   *
   * NOTE: This behavior is intended to be used in conjunction with and after
   * `Polymer.IronButtonState` and `Polymer.IronControlState`.
   *
   * @polymerBehavior Polymer.PaperRippleBehavior
   */
  Polymer.PaperRippleBehavior = {

    properties: {
      /**
       * If true, the element will not produce a ripple effect when interacted
       * with via the pointer.
       */
      noink: {
        type: Boolean,
        observer: '_noinkChanged'
      },

      /**
       * @type {Element|undefined}
       */
      _rippleContainer: {
        type: Object,
      }
    },

    /**
     * Ensures a `<paper-ripple>` element is available when the element is
     * focused.
     */
    _buttonStateChanged: function() {
      if (this.focused) {
        this.ensureRipple();
      }
    },

    /**
     * In addition to the functionality provided in `IronButtonState`, ensures
     * a ripple effect is created when the element is in a `pressed` state.
     */
    _downHandler: function(event) {
      Polymer.IronButtonStateImpl._downHandler.call(this, event);
      if (this.pressed) {
        this.ensureRipple(event);
      }
    },

    /**
     * Ensures this element contains a ripple effect. For startup efficiency
     * the ripple effect is dynamically on demand when needed.
     * @param {!Event=} optTriggeringEvent (optional) event that triggered the
     * ripple.
     */
    ensureRipple: function(optTriggeringEvent) {
      if (!this.hasRipple()) {
        this._ripple = this._createRipple();
        this._ripple.noink = this.noink;
        var rippleContainer = this._rippleContainer || this.root;
        if (rippleContainer) {
          Polymer.dom(rippleContainer).appendChild(this._ripple);
        }
        if (optTriggeringEvent) {
          // Check if the event happened inside of the ripple container
          // Fall back to host instead of the root because distributed text
          // nodes are not valid event targets
          var domContainer = Polymer.dom(this._rippleContainer || this);
          var target = Polymer.dom(optTriggeringEvent).rootTarget;
          if (domContainer.deepContains( /** @type {Node} */(target))) {
            this._ripple.uiDownAction(optTriggeringEvent);
          }
        }
      }
    },

    /**
     * Returns the `<paper-ripple>` element used by this element to create
     * ripple effects. The element's ripple is created on demand, when
     * necessary, and calling this method will force the
     * ripple to be created.
     */
    getRipple: function() {
      this.ensureRipple();
      return this._ripple;
    },

    /**
     * Returns true if this element currently contains a ripple effect.
     * @return {boolean}
     */
    hasRipple: function() {
      return Boolean(this._ripple);
    },

    /**
     * Create the element's ripple effect via creating a `<paper-ripple>`.
     * Override this method to customize the ripple element.
     * @return {!PaperRippleElement} Returns a `<paper-ripple>` element.
     */
    _createRipple: function() {
      return /** @type {!PaperRippleElement} */ (
          document.createElement('paper-ripple'));
    },

    _noinkChanged: function(noink) {
      if (this.hasRipple()) {
        this._ripple.noink = noink;
      }
    }

  };
/** @polymerBehavior Polymer.PaperButtonBehavior */
  Polymer.PaperButtonBehaviorImpl = {

    properties: {

      /**
       * The z-depth of this element, from 0-5. Setting to 0 will remove the
       * shadow, and each increasing number greater than 0 will be "deeper"
       * than the last.
       *
       * @attribute elevation
       * @type number
       * @default 1
       */
      elevation: {
        type: Number,
        reflectToAttribute: true,
        readOnly: true
      }

    },

    observers: [
      '_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
      '_computeKeyboardClass(receivedFocusFromKeyboard)'
    ],

    hostAttributes: {
      role: 'button',
      tabindex: '0',
      animated: true
    },

    _calculateElevation: function() {
      var e = 1;
      if (this.disabled) {
        e = 0;
      } else if (this.active || this.pressed) {
        e = 4;
      } else if (this.receivedFocusFromKeyboard) {
        e = 3;
      }
      this._setElevation(e);
    },

    _computeKeyboardClass: function(receivedFocusFromKeyboard) {
      this.toggleClass('keyboard-focus', receivedFocusFromKeyboard);
    },

    /**
     * In addition to `IronButtonState` behavior, when space key goes down,
     * create a ripple down effect.
     *
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyDownHandler: function(event) {
      Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
      // Ensure that there is at most one ripple when the space key is held down.
      if (this.hasRipple() && this.getRipple().ripples.length < 1) {
        this._ripple.uiDownAction();
      }
    },

    /**
     * In addition to `IronButtonState` behavior, when space key goes up,
     * create a ripple up effect.
     *
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyUpHandler: function(event) {
      Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
      if (this.hasRipple()) {
        this._ripple.uiUpAction();
      }
    }

  };

  /** @polymerBehavior */
  Polymer.PaperButtonBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperRippleBehavior,
    Polymer.PaperButtonBehaviorImpl
  ];
Polymer({
    is: 'paper-button',

    behaviors: [
      Polymer.PaperButtonBehavior
    ],

    properties: {
      /**
       * If true, the button should be styled with a shadow.
       */
      raised: {
        type: Boolean,
        reflectToAttribute: true,
        value: false,
        observer: '_calculateElevation'
      }
    },

    _calculateElevation: function() {
      if (!this.raised) {
        this._setElevation(0);
      } else {
        Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
      }
    }
    /**

    Fired when the animation finishes.
    This is useful if you want to wait until
    the ripple animation finishes to perform some action.

    @event transitionend
    @param {{node: Object}} detail Contains the animated node.
    */
  });
(function (document, Polymer) {
            "use strict";

            Polymer({
                is: "p-status",
                properties: {
                    status: String
                }
            });
        })(document, Polymer);
(function() {

    // monostate data
    var metaDatas = {};
    var metaArrays = {};
    var singleton = null;

    Polymer.IronMeta = Polymer({

      is: 'iron-meta',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * The key used to store `value` under the `type` namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          observer: '_valueChanged'
        },

        /**
         * If true, `value` is set to the iron-meta instance itself.
         */
         self: {
          type: Boolean,
          observer: '_selfChanged'
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      hostAttributes: {
        hidden: true
      },

      /**
       * Only runs if someone invokes the factory/constructor directly
       * e.g. `new Polymer.IronMeta()`
       *
       * @param {{type: (string|undefined), key: (string|undefined), value}=} config
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
              case 'value':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key, old) {
        this._resetRegistration(old);
      },

      _valueChanged: function(value) {
        this._resetRegistration(this.key);
      },

      _selfChanged: function(self) {
        if (self) {
          this.value = this;
        }
      },

      _typeChanged: function(type) {
        this._unregisterKey(this.key);
        if (!metaDatas[type]) {
          metaDatas[type] = {};
        }
        this._metaData = metaDatas[type];
        if (!metaArrays[type]) {
          metaArrays[type] = [];
        }
        this.list = metaArrays[type];
        this._registerKeyValue(this.key, this.value);
      },

      /**
       * Retrieves meta data value by key.
       *
       * @method byKey
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      },

      _resetRegistration: function(oldKey) {
        this._unregisterKey(oldKey);
        this._registerKeyValue(this.key, this.value);
      },

      _unregisterKey: function(key) {
        this._unregister(key, this._metaData, this.list);
      },

      _registerKeyValue: function(key, value) {
        this._register(key, value, this._metaData, this.list);
      },

      _register: function(key, value, data, list) {
        if (key && data && value !== undefined) {
          data[key] = value;
          list.push(value);
        }
      },

      _unregister: function(key, data, list) {
        if (key && data) {
          if (key in data) {
            var value = data[key];
            delete data[key];
            this.arrayDelete(list, value);
          }
        }
      }

    });

    Polymer.IronMeta.getIronMeta = function getIronMeta() {
       if (singleton === null) {
         singleton = new Polymer.IronMeta();
       }
       return singleton;
     };

    /**
    `iron-meta-query` can be used to access infomation stored in `iron-meta`.

    Examples:

    If I create an instance like this:

        <iron-meta key="info" value="foo/bar"></iron-meta>

    Note that value="foo/bar" is the metadata I've defined. I could define more
    attributes or use child nodes to define additional metadata.

    Now I can access that element (and it's metadata) from any `iron-meta-query` instance:

         var value = new Polymer.IronMetaQuery({key: 'info'}).value;

    @group Polymer Iron Elements
    @element iron-meta-query
    */
    Polymer.IronMetaQuery = Polymer({

      is: 'iron-meta-query',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * Specifies a key to use for retrieving `value` from the `type`
         * namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          readOnly: true
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      /**
       * Actually a factory method, not a true constructor. Only runs if
       * someone invokes it directly (via `new Polymer.IronMeta()`);
       *
       * @param {{type: (string|undefined), key: (string|undefined)}=} config
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key) {
        this._setValue(this._metaData && this._metaData[key]);
      },

      _typeChanged: function(type) {
        this._metaData = metaDatas[type];
        this.list = metaArrays[type];
        if (this.key) {
          this._keyChanged(this.key);
        }
      },

      /**
       * Retrieves meta data value by key.
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      }

    });

  })();
/**
   * Use `Polymer.NeonAnimationBehavior` to implement an animation.
   * @polymerBehavior
   */
  Polymer.NeonAnimationBehavior = {

    properties: {

      /**
       * Defines the animation timing.
       */
      animationTiming: {
        type: Object,
        value: function() {
          return {
            duration: 500,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'both'
          }
        }
      }

    },

    registered: function() {
      new Polymer.IronMeta({type: 'animation', key: this.is, value: this.constructor});
    },

    /**
     * Do any animation configuration here.
     */
    // configure: function(config) {
    // },

    /**
     * Returns the animation timing by mixing in properties from `config` to the defaults defined
     * by the animation.
     */
    timingFromConfig: function(config) {
      if (config.timing) {
        for (var property in config.timing) {
          this.animationTiming[property] = config.timing[property];
        }
      }
      return this.animationTiming;
    },

    /**
     * Sets `transform` and `transformOrigin` properties along with the prefixed versions.
     */
    setPrefixedProperty: function(node, property, value) {
      var map = {
        'transform': ['webkitTransform'],
        'transformOrigin': ['mozTransformOrigin', 'webkitTransformOrigin']
      };
      var prefixes = map[property];
      for (var prefix, index = 0; prefix = prefixes[index]; index++) {
        node.style[prefix] = value;
      }
      node.style[property] = value;
    },

    /**
     * Called when the animation finishes.
     */
    complete: function() {}

  };
// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

!function(a,b){b["true"]=a;var c={},d={},e={},f=null;!function(a){function b(a){if("number"==typeof a)return a;var b={};for(var c in a)b[c]=a[c];return b}function c(){this._delay=0,this._endDelay=0,this._fill="none",this._iterationStart=0,this._iterations=1,this._duration=0,this._playbackRate=1,this._direction="normal",this._easing="linear"}function d(b,d){var e=new c;return d&&(e.fill="both",e.duration="auto"),"number"!=typeof b||isNaN(b)?void 0!==b&&Object.getOwnPropertyNames(b).forEach(function(c){if("auto"!=b[c]){if(("number"==typeof e[c]||"duration"==c)&&("number"!=typeof b[c]||isNaN(b[c])))return;if("fill"==c&&-1==s.indexOf(b[c]))return;if("direction"==c&&-1==t.indexOf(b[c]))return;if("playbackRate"==c&&1!==b[c]&&a.isDeprecated("AnimationEffectTiming.playbackRate","2014-11-28","Use Animation.playbackRate instead."))return;e[c]=b[c]}}):e.duration=b,e}function e(a){return"number"==typeof a&&(a=isNaN(a)?{duration:0}:{duration:a}),a}function f(b,c){b=a.numericTimingToObject(b);var e=d(b,c);return e._easing=i(e.easing),e}function g(a,b,c,d){return 0>a||a>1||0>c||c>1?B:function(e){function f(a,b,c){return 3*a*(1-c)*(1-c)*c+3*b*(1-c)*c*c+c*c*c}if(0==e||1==e)return e;for(var g=0,h=1;;){var i=(g+h)/2,j=f(a,c,i);if(Math.abs(e-j)<.001)return f(b,d,i);e>j?g=i:h=i}}}function h(a,b){return function(c){if(c>=1)return 1;var d=1/a;return c+=b*d,c-c%d}}function i(a){var b=z.exec(a);if(b)return g.apply(this,b.slice(1).map(Number));var c=A.exec(a);if(c)return h(Number(c[1]),{start:u,middle:v,end:w}[c[2]]);var d=x[a];return d?d:B}function j(a){return Math.abs(k(a)/a.playbackRate)}function k(a){return a.duration*a.iterations}function l(a,b,c){return null==b?C:b<c.delay?D:b>=c.delay+a?E:F}function m(a,b,c,d,e){switch(d){case D:return"backwards"==b||"both"==b?0:null;case F:return c-e;case E:return"forwards"==b||"both"==b?a:null;case C:return null}}function n(a,b,c,d){return(d.playbackRate<0?b-a:b)*d.playbackRate+c}function o(a,b,c,d,e){return 1/0===c||c===-1/0||c-d==b&&e.iterations&&(e.iterations+e.iterationStart)%1==0?a:c%a}function p(a,b,c,d){return 0===c?0:b==a?d.iterationStart+d.iterations-1:Math.floor(c/a)}function q(a,b,c,d){var e=a%2>=1,f="normal"==d.direction||d.direction==(e?"alternate-reverse":"alternate"),g=f?c:b-c,h=g/b;return b*d.easing(h)}function r(a,b,c){var d=l(a,b,c),e=m(a,c.fill,b,d,c.delay);if(null===e)return null;if(0===a)return d===D?0:1;var f=c.iterationStart*c.duration,g=n(a,e,f,c),h=o(c.duration,k(c),g,f,c),i=p(c.duration,h,g,c);return q(i,c.duration,h,c)/c.duration}var s="backwards|forwards|both|none".split("|"),t="reverse|alternate|alternate-reverse".split("|");c.prototype={_setMember:function(b,c){this["_"+b]=c,this._effect&&(this._effect._timingInput[b]=c,this._effect._timing=a.normalizeTimingInput(a.normalizeTimingInput(this._effect._timingInput)),this._effect.activeDuration=a.calculateActiveDuration(this._effect._timing),this._effect._animation&&this._effect._animation._rebuildUnderlyingAnimation())},get playbackRate(){return this._playbackRate},set delay(a){this._setMember("delay",a)},get delay(){return this._delay},set endDelay(a){this._setMember("endDelay",a)},get endDelay(){return this._endDelay},set fill(a){this._setMember("fill",a)},get fill(){return this._fill},set iterationStart(a){this._setMember("iterationStart",a)},get iterationStart(){return this._iterationStart},set duration(a){this._setMember("duration",a)},get duration(){return this._duration},set direction(a){this._setMember("direction",a)},get direction(){return this._direction},set easing(a){this._setMember("easing",a)},get easing(){return this._easing},set iterations(a){this._setMember("iterations",a)},get iterations(){return this._iterations}};var u=1,v=.5,w=0,x={ease:g(.25,.1,.25,1),"ease-in":g(.42,0,1,1),"ease-out":g(0,0,.58,1),"ease-in-out":g(.42,0,.58,1),"step-start":h(1,u),"step-middle":h(1,v),"step-end":h(1,w)},y="\\s*(-?\\d+\\.?\\d*|-?\\.\\d+)\\s*",z=new RegExp("cubic-bezier\\("+y+","+y+","+y+","+y+"\\)"),A=/steps\(\s*(\d+)\s*,\s*(start|middle|end)\s*\)/,B=function(a){return a},C=0,D=1,E=2,F=3;a.cloneTimingInput=b,a.makeTiming=d,a.numericTimingToObject=e,a.normalizeTimingInput=f,a.calculateActiveDuration=j,a.calculateTimeFraction=r,a.calculatePhase=l,a.toTimingFunction=i}(c,f),function(a){function b(a,b){return a in h?h[a][b]||b:b}function c(a,c,d){var g=e[a];if(g){f.style[a]=c;for(var h in g){var i=g[h],j=f.style[i];d[i]=b(i,j)}}else d[a]=b(a,c)}function d(b){function d(){var a=e.length;null==e[a-1].offset&&(e[a-1].offset=1),a>1&&null==e[0].offset&&(e[0].offset=0);for(var b=0,c=e[0].offset,d=1;a>d;d++){var f=e[d].offset;if(null!=f){for(var g=1;d-b>g;g++)e[b+g].offset=c+(f-c)*g/(d-b);b=d,c=f}}}if(!Array.isArray(b)&&null!==b)throw new TypeError("Keyframes must be null or an array of keyframes");if(null==b)return[];for(var e=b.map(function(b){var d={};for(var e in b){var f=b[e];if("offset"==e){if(null!=f&&(f=Number(f),!isFinite(f)))throw new TypeError("keyframe offsets must be numbers.")}else{if("composite"==e)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"add compositing is not supported"};f="easing"==e?a.toTimingFunction(f):""+f}c(e,f,d)}return void 0==d.offset&&(d.offset=null),void 0==d.easing&&(d.easing=a.toTimingFunction("linear")),d}),f=!0,g=-1/0,h=0;h<e.length;h++){var i=e[h].offset;if(null!=i){if(g>i)throw{code:DOMException.INVALID_MODIFICATION_ERR,name:"InvalidModificationError",message:"Keyframes are not loosely sorted by offset. Sort or specify offsets."};g=i}else f=!1}return e=e.filter(function(a){return a.offset>=0&&a.offset<=1}),f||d(),e}var e={background:["backgroundImage","backgroundPosition","backgroundSize","backgroundRepeat","backgroundAttachment","backgroundOrigin","backgroundClip","backgroundColor"],border:["borderTopColor","borderTopStyle","borderTopWidth","borderRightColor","borderRightStyle","borderRightWidth","borderBottomColor","borderBottomStyle","borderBottomWidth","borderLeftColor","borderLeftStyle","borderLeftWidth"],borderBottom:["borderBottomWidth","borderBottomStyle","borderBottomColor"],borderColor:["borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"],borderLeft:["borderLeftWidth","borderLeftStyle","borderLeftColor"],borderRadius:["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],borderRight:["borderRightWidth","borderRightStyle","borderRightColor"],borderTop:["borderTopWidth","borderTopStyle","borderTopColor"],borderWidth:["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"],flex:["flexGrow","flexShrink","flexBasis"],font:["fontFamily","fontSize","fontStyle","fontVariant","fontWeight","lineHeight"],margin:["marginTop","marginRight","marginBottom","marginLeft"],outline:["outlineColor","outlineStyle","outlineWidth"],padding:["paddingTop","paddingRight","paddingBottom","paddingLeft"]},f=document.createElementNS("http://www.w3.org/1999/xhtml","div"),g={thin:"1px",medium:"3px",thick:"5px"},h={borderBottomWidth:g,borderLeftWidth:g,borderRightWidth:g,borderTopWidth:g,fontSize:{"xx-small":"60%","x-small":"75%",small:"89%",medium:"100%",large:"120%","x-large":"150%","xx-large":"200%"},fontWeight:{normal:"400",bold:"700"},outlineWidth:g,textShadow:{none:"0px 0px 0px transparent"},boxShadow:{none:"0px 0px 0px 0px transparent"}};a.normalizeKeyframes=d}(c,f),function(a){var b={};a.isDeprecated=function(a,c,d,e){var f=e?"are":"is",g=new Date,h=new Date(c);return h.setMonth(h.getMonth()+3),h>g?(a in b||console.warn("Web Animations: "+a+" "+f+" deprecated and will stop working on "+h.toDateString()+". "+d),b[a]=!0,!1):!0},a.deprecated=function(b,c,d,e){var f=e?"are":"is";if(a.isDeprecated(b,c,d,e))throw new Error(b+" "+f+" no longer supported. "+d)}}(c),function(){if(document.documentElement.animate){var a=document.documentElement.animate([],0),b=!0;if(a&&(b=!1,"play|currentTime|pause|reverse|playbackRate|cancel|finish|startTime|playState".split("|").forEach(function(c){void 0===a[c]&&(b=!0)})),!b)return}!function(a,b){function c(a){for(var b={},c=0;c<a.length;c++)for(var d in a[c])if("offset"!=d&&"easing"!=d&&"composite"!=d){var e={offset:a[c].offset,easing:a[c].easing,value:a[c][d]};b[d]=b[d]||[],b[d].push(e)}for(var f in b){var g=b[f];if(0!=g[0].offset||1!=g[g.length-1].offset)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"Partial keyframes are not supported"}}return b}function d(a){var c=[];for(var d in a)for(var e=a[d],f=0;f<e.length-1;f++){var g=e[f].offset,h=e[f+1].offset,i=e[f].value,j=e[f+1].value;g==h&&(1==h?i=j:j=i),c.push({startTime:g,endTime:h,easing:e[f].easing,property:d,interpolation:b.propertyInterpolation(d,i,j)})}return c.sort(function(a,b){return a.startTime-b.startTime}),c}b.convertEffectInput=function(e){var f=a.normalizeKeyframes(e),g=c(f),h=d(g);return function(a,c){if(null!=c)h.filter(function(a){return 0>=c&&0==a.startTime||c>=1&&1==a.endTime||c>=a.startTime&&c<=a.endTime}).forEach(function(d){var e=c-d.startTime,f=d.endTime-d.startTime,g=0==f?0:d.easing(e/f);b.apply(a,d.property,d.interpolation(g))});else for(var d in g)"offset"!=d&&"easing"!=d&&"composite"!=d&&b.clear(a,d)}}}(c,d,f),function(a){function b(a,b,c){e[c]=e[c]||[],e[c].push([a,b])}function c(a,c,d){for(var e=0;e<d.length;e++){var f=d[e];b(a,c,f),/-/.test(f)&&b(a,c,f.replace(/-(.)/g,function(a,b){return b.toUpperCase()}))}}function d(b,c,d){if("initial"==c||"initial"==d){var g=b.replace(/-(.)/g,function(a,b){return b.toUpperCase()});"initial"==c&&(c=f[g]),"initial"==d&&(d=f[g])}for(var h=c==d?[]:e[b],i=0;h&&i<h.length;i++){var j=h[i][0](c),k=h[i][0](d);if(void 0!==j&&void 0!==k){var l=h[i][1](j,k);if(l){var m=a.Interpolation.apply(null,l);return function(a){return 0==a?c:1==a?d:m(a)}}}}return a.Interpolation(!1,!0,function(a){return a?d:c})}var e={};a.addPropertiesHandler=c;var f={backgroundColor:"transparent",backgroundPosition:"0% 0%",borderBottomColor:"currentColor",borderBottomLeftRadius:"0px",borderBottomRightRadius:"0px",borderBottomWidth:"3px",borderLeftColor:"currentColor",borderLeftWidth:"3px",borderRightColor:"currentColor",borderRightWidth:"3px",borderSpacing:"2px",borderTopColor:"currentColor",borderTopLeftRadius:"0px",borderTopRightRadius:"0px",borderTopWidth:"3px",bottom:"auto",clip:"rect(0px, 0px, 0px, 0px)",color:"black",fontSize:"100%",fontWeight:"400",height:"auto",left:"auto",letterSpacing:"normal",lineHeight:"120%",marginBottom:"0px",marginLeft:"0px",marginRight:"0px",marginTop:"0px",maxHeight:"none",maxWidth:"none",minHeight:"0px",minWidth:"0px",opacity:"1.0",outlineColor:"invert",outlineOffset:"0px",outlineWidth:"3px",paddingBottom:"0px",paddingLeft:"0px",paddingRight:"0px",paddingTop:"0px",right:"auto",textIndent:"0px",textShadow:"0px 0px 0px transparent",top:"auto",transform:"",verticalAlign:"0px",visibility:"visible",width:"auto",wordSpacing:"normal",zIndex:"auto"};a.propertyInterpolation=d}(d,f),function(a,b){function c(b){var c=a.calculateActiveDuration(b),d=function(d){return a.calculateTimeFraction(c,d,b)};return d._totalDuration=b.delay+c+b.endDelay,d._isCurrent=function(d){var e=a.calculatePhase(c,d,b);return e===PhaseActive||e===PhaseBefore},d}b.KeyframeEffect=function(d,e,f){var g,h=c(a.normalizeTimingInput(f)),i=b.convertEffectInput(e),j=function(){i(d,g)};return j._update=function(a){return g=h(a),null!==g},j._clear=function(){i(d,null)},j._hasSameTarget=function(a){return d===a},j._isCurrent=h._isCurrent,j._totalDuration=h._totalDuration,j},b.NullEffect=function(a){var b=function(){a&&(a(),a=null)};return b._update=function(){return null},b._totalDuration=0,b._isCurrent=function(){return!1},b._hasSameTarget=function(){return!1},b}}(c,d,f),function(a){a.apply=function(b,c,d){b.style[a.propertyName(c)]=d},a.clear=function(b,c){b.style[a.propertyName(c)]=""}}(d,f),function(a){window.Element.prototype.animate=function(b,c){return a.timeline._play(a.KeyframeEffect(this,b,c))}}(d),function(a){function b(a,c,d){if("number"==typeof a&&"number"==typeof c)return a*(1-d)+c*d;if("boolean"==typeof a&&"boolean"==typeof c)return.5>d?a:c;if(a.length==c.length){for(var e=[],f=0;f<a.length;f++)e.push(b(a[f],c[f],d));return e}throw"Mismatched interpolation arguments "+a+":"+c}a.Interpolation=function(a,c,d){return function(e){return d(b(a,c,e))}}}(d,f),function(a,b){a.sequenceNumber=0;var c=function(a,b,c){this.target=a,this.currentTime=b,this.timelineTime=c,this.type="finish",this.bubbles=!1,this.cancelable=!1,this.currentTarget=a,this.defaultPrevented=!1,this.eventPhase=Event.AT_TARGET,this.timeStamp=Date.now()};b.Animation=function(b){this._sequenceNumber=a.sequenceNumber++,this._currentTime=0,this._startTime=null,this._paused=!1,this._playbackRate=1,this._inTimeline=!0,this._finishedFlag=!1,this.onfinish=null,this._finishHandlers=[],this._effect=b,this._inEffect=this._effect._update(0),this._idle=!0,this._currentTimePending=!1},b.Animation.prototype={_ensureAlive:function(){this._inEffect=this._effect._update(this.playbackRate<0&&0===this.currentTime?-1:this.currentTime),this._inTimeline||!this._inEffect&&this._finishedFlag||(this._inTimeline=!0,b.timeline._animations.push(this))},_tickCurrentTime:function(a,b){a!=this._currentTime&&(this._currentTime=a,this._isFinished&&!b&&(this._currentTime=this._playbackRate>0?this._totalDuration:0),this._ensureAlive())},get currentTime(){return this._idle||this._currentTimePending?null:this._currentTime},set currentTime(a){a=+a,isNaN(a)||(b.restart(),this._paused||null==this._startTime||(this._startTime=this._timeline.currentTime-a/this._playbackRate),this._currentTimePending=!1,this._currentTime!=a&&(this._tickCurrentTime(a,!0),b.invalidateEffects()))},get startTime(){return this._startTime},set startTime(a){a=+a,isNaN(a)||this._paused||this._idle||(this._startTime=a,this._tickCurrentTime((this._timeline.currentTime-this._startTime)*this.playbackRate),b.invalidateEffects())},get playbackRate(){return this._playbackRate},set playbackRate(a){if(a!=this._playbackRate){var b=this.currentTime;this._playbackRate=a,this._startTime=null,"paused"!=this.playState&&"idle"!=this.playState&&this.play(),null!=b&&(this.currentTime=b)}},get _isFinished(){return!this._idle&&(this._playbackRate>0&&this._currentTime>=this._totalDuration||this._playbackRate<0&&this._currentTime<=0)},get _totalDuration(){return this._effect._totalDuration},get playState(){return this._idle?"idle":null==this._startTime&&!this._paused&&0!=this.playbackRate||this._currentTimePending?"pending":this._paused?"paused":this._isFinished?"finished":"running"},play:function(){this._paused=!1,(this._isFinished||this._idle)&&(this._currentTime=this._playbackRate>0?0:this._totalDuration,this._startTime=null,b.invalidateEffects()),this._finishedFlag=!1,b.restart(),this._idle=!1,this._ensureAlive()},pause:function(){this._isFinished||this._paused||this._idle||(this._currentTimePending=!0),this._startTime=null,this._paused=!0},finish:function(){this._idle||(this.currentTime=this._playbackRate>0?this._totalDuration:0,this._startTime=this._totalDuration-this.currentTime,this._currentTimePending=!1)},cancel:function(){this._inEffect&&(this._inEffect=!1,this._idle=!0,this.currentTime=0,this._startTime=null,this._effect._update(null),b.invalidateEffects(),b.restart())},reverse:function(){this.playbackRate*=-1,this.play()},addEventListener:function(a,b){"function"==typeof b&&"finish"==a&&this._finishHandlers.push(b)},removeEventListener:function(a,b){if("finish"==a){var c=this._finishHandlers.indexOf(b);c>=0&&this._finishHandlers.splice(c,1)}},_fireEvents:function(a){var b=this._isFinished;if((b||this._idle)&&!this._finishedFlag){var d=new c(this,this._currentTime,a),e=this._finishHandlers.concat(this.onfinish?[this.onfinish]:[]);setTimeout(function(){e.forEach(function(a){a.call(d.target,d)})},0)}this._finishedFlag=b},_tick:function(a){return this._idle||this._paused||(null==this._startTime?this.startTime=a-this._currentTime/this.playbackRate:this._isFinished||this._tickCurrentTime((a-this._startTime)*this.playbackRate)),this._currentTimePending=!1,this._fireEvents(a),!this._idle&&(this._inEffect||!this._finishedFlag)}}}(c,d,f),function(a,b){function c(a){var b=i;i=[],a<s.currentTime&&(a=s.currentTime),g(a),b.forEach(function(b){b[1](a)}),o&&g(a),f(),l=void 0}function d(a,b){return a._sequenceNumber-b._sequenceNumber}function e(){this._animations=[],this.currentTime=window.performance&&performance.now?performance.now():0}function f(){p.forEach(function(a){a()}),p.length=0}function g(a){n=!1;var c=b.timeline;c.currentTime=a,c._animations.sort(d),m=!1;var e=c._animations;c._animations=[];var f=[],g=[];e=e.filter(function(b){return b._inTimeline=b._tick(a),b._inEffect?g.push(b._effect):f.push(b._effect),b._isFinished||b._paused||b._idle||(m=!0),b._inTimeline}),p.push.apply(p,f),p.push.apply(p,g),c._animations.push.apply(c._animations,e),o=!1,m&&requestAnimationFrame(function(){})}var h=window.requestAnimationFrame,i=[],j=0;window.requestAnimationFrame=function(a){var b=j++;return 0==i.length&&h(c),i.push([b,a]),b},window.cancelAnimationFrame=function(a){i.forEach(function(b){b[0]==a&&(b[1]=function(){})})},e.prototype={_play:function(c){c._timing=a.normalizeTimingInput(c.timing);var d=new b.Animation(c);return d._idle=!1,d._timeline=this,this._animations.push(d),b.restart(),b.invalidateEffects(),d}};var k,l=void 0,k=function(){return void 0==l&&(l=window.performance&&performance.now?performance.now():Date.now()),l},m=!1,n=!1;b.restart=function(){return m||(m=!0,requestAnimationFrame(function(){}),n=!0),n};var o=!1;b.invalidateEffects=function(){o=!0};var p=[],q=1e3/60,r=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){if(o){var a=k();a-s.currentTime>0&&(s.currentTime+=q*(Math.floor((a-s.currentTime)/q)+1)),g(s.currentTime)}return f(),r.apply(this,arguments)}});var s=new e;b.timeline=s}(c,d,f),function(a){function b(a,b){var c=a.exec(b);return c?(c=a.ignoreCase?c[0].toLowerCase():c[0],[c,b.substr(c.length)]):void 0}function c(a,b){b=b.replace(/^\s*/,"");var c=a(b);return c?[c[0],c[1].replace(/^\s*/,"")]:void 0}function d(a,d,e){a=c.bind(null,a);for(var f=[];;){var g=a(e);if(!g)return[f,e];if(f.push(g[0]),e=g[1],g=b(d,e),!g||""==g[1])return[f,e];e=g[1]}}function e(a,b){for(var c=0,d=0;d<b.length&&(!/\s|,/.test(b[d])||0!=c);d++)if("("==b[d])c++;else if(")"==b[d]&&(c--,0==c&&d++,0>=c))break;var e=a(b.substr(0,d));return void 0==e?void 0:[e,b.substr(d)]}function f(a,b){for(var c=a,d=b;c&&d;)c>d?c%=d:d%=c;return c=a*b/(c+d)}function g(a){return function(b){var c=a(b);return c&&(c[0]=void 0),c}}function h(a,b){return function(c){var d=a(c);return d?d:[b,c]}}function i(b,c){for(var d=[],e=0;e<b.length;e++){var f=a.consumeTrimmed(b[e],c);if(!f||""==f[0])return;void 0!==f[0]&&d.push(f[0]),c=f[1]}return""==c?d:void 0}function j(a,b,c,d,e){for(var g=[],h=[],i=[],j=f(d.length,e.length),k=0;j>k;k++){var l=b(d[k%d.length],e[k%e.length]);if(!l)return;g.push(l[0]),h.push(l[1]),i.push(l[2])}return[g,h,function(b){var d=b.map(function(a,b){return i[b](a)}).join(c);return a?a(d):d}]}function k(a,b,c){for(var d=[],e=[],f=[],g=0,h=0;h<c.length;h++)if("function"==typeof c[h]){var i=c[h](a[g],b[g++]);d.push(i[0]),e.push(i[1]),f.push(i[2])}else!function(a){d.push(!1),e.push(!1),f.push(function(){return c[a]})}(h);return[d,e,function(a){for(var b="",c=0;c<a.length;c++)b+=f[c](a[c]);return b}]}a.consumeToken=b,a.consumeTrimmed=c,a.consumeRepeated=d,a.consumeParenthesised=e,a.ignore=g,a.optional=h,a.consumeList=i,a.mergeNestedRepeated=j.bind(null,null),a.mergeWrappedNestedRepeated=j,a.mergeList=k}(d),function(a){function b(b){function c(b){var c=a.consumeToken(/^inset/i,b);if(c)return d.inset=!0,c;var c=a.consumeLengthOrPercent(b);if(c)return d.lengths.push(c[0]),c;var c=a.consumeColor(b);return c?(d.color=c[0],c):void 0}var d={inset:!1,lengths:[],color:null},e=a.consumeRepeated(c,/^/,b);return e&&e[0].length?[d,e[1]]:void 0}function c(c){var d=a.consumeRepeated(b,/^,/,c);return d&&""==d[1]?d[0]:void 0}function d(b,c){for(;b.lengths.length<Math.max(b.lengths.length,c.lengths.length);)b.lengths.push({px:0});for(;c.lengths.length<Math.max(b.lengths.length,c.lengths.length);)c.lengths.push({px:0});if(b.inset==c.inset&&!!b.color==!!c.color){for(var d,e=[],f=[[],0],g=[[],0],h=0;h<b.lengths.length;h++){var i=a.mergeDimensions(b.lengths[h],c.lengths[h],2==h);f[0].push(i[0]),g[0].push(i[1]),e.push(i[2])}if(b.color&&c.color){var j=a.mergeColors(b.color,c.color);f[1]=j[0],g[1]=j[1],d=j[2]}return[f,g,function(a){for(var c=b.inset?"inset ":" ",f=0;f<e.length;f++)c+=e[f](a[0][f])+" ";return d&&(c+=d(a[1])),c}]}}function e(b,c,d,e){function f(a){return{inset:a,color:[0,0,0,0],lengths:[{px:0},{px:0},{px:0},{px:0}]}}for(var g=[],h=[],i=0;i<d.length||i<e.length;i++){var j=d[i]||f(e[i].inset),k=e[i]||f(d[i].inset);g.push(j),h.push(k)}return a.mergeNestedRepeated(b,c,g,h)}var f=e.bind(null,d,", ");a.addPropertiesHandler(c,f,["box-shadow","text-shadow"])}(d),function(a){function b(a){return a.toFixed(3).replace(".000","")}function c(a,b,c){return Math.min(b,Math.max(a,c))}function d(a){return/^\s*[-+]?(\d*\.)?\d+\s*$/.test(a)?Number(a):void 0}function e(a,c){return[a,c,b]}function f(a,b){return 0!=a?h(0,1/0)(a,b):void 0}function g(a,b){return[a,b,function(a){return Math.round(c(1,1/0,a))}]}function h(a,d){return function(e,f){return[e,f,function(e){return b(c(a,d,e))}]}}function i(a,b){return[a,b,Math.round]}a.clamp=c,a.addPropertiesHandler(d,h(0,1/0),["border-image-width","line-height"]),a.addPropertiesHandler(d,h(0,1),["opacity","shape-image-threshold"]),a.addPropertiesHandler(d,f,["flex-grow","flex-shrink"]),a.addPropertiesHandler(d,g,["orphans","widows"]),a.addPropertiesHandler(d,i,["z-index"]),a.parseNumber=d,a.mergeNumbers=e,a.numberToString=b}(d,f),function(a){function b(a,b){return"visible"==a||"visible"==b?[0,1,function(c){return 0>=c?a:c>=1?b:"visible"}]:void 0}a.addPropertiesHandler(String,b,["visibility"])}(d),function(a){function b(a){a=a.trim(),e.fillStyle="#000",e.fillStyle=a;var b=e.fillStyle;if(e.fillStyle="#fff",e.fillStyle=a,b==e.fillStyle){e.fillRect(0,0,1,1);var c=e.getImageData(0,0,1,1).data;e.clearRect(0,0,1,1);var d=c[3]/255;return[c[0]*d,c[1]*d,c[2]*d,d]}}function c(b,c){return[b,c,function(b){function c(a){return Math.max(0,Math.min(255,a))}if(b[3])for(var d=0;3>d;d++)b[d]=Math.round(c(b[d]/b[3]));return b[3]=a.numberToString(a.clamp(0,1,b[3])),"rgba("+b.join(",")+")"}]}var d=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");d.width=d.height=1;var e=d.getContext("2d");a.addPropertiesHandler(b,c,["background-color","border-bottom-color","border-left-color","border-right-color","border-top-color","color","outline-color","text-decoration-color"]),a.consumeColor=a.consumeParenthesised.bind(null,b),a.mergeColors=c}(d,f),function(a,b){function c(a,b){if(b=b.trim().toLowerCase(),"0"==b&&"px".search(a)>=0)return{px:0};if(/^[^(]*$|^calc/.test(b)){b=b.replace(/calc\(/g,"(");var c={};b=b.replace(a,function(a){return c[a]=null,"U"+a});for(var d="U("+a.source+")",e=b.replace(/[-+]?(\d*\.)?\d+/g,"N").replace(new RegExp("N"+d,"g"),"D").replace(/\s[+-]\s/g,"O").replace(/\s/g,""),f=[/N\*(D)/g,/(N|D)[*\/]N/g,/(N|D)O\1/g,/\((N|D)\)/g],g=0;g<f.length;)f[g].test(e)?(e=e.replace(f[g],"$1"),g=0):g++;if("D"==e){for(var h in c){var i=eval(b.replace(new RegExp("U"+h,"g"),"").replace(new RegExp(d,"g"),"*0"));if(!isFinite(i))return;c[h]=i}return c}}}function d(a,b){return e(a,b,!0)}function e(b,c,d){var e,f=[];for(e in b)f.push(e);for(e in c)f.indexOf(e)<0&&f.push(e);return b=f.map(function(a){return b[a]||0}),c=f.map(function(a){return c[a]||0}),[b,c,function(b){var c=b.map(function(c,e){return 1==b.length&&d&&(c=Math.max(c,0)),a.numberToString(c)+f[e]}).join(" + ");return b.length>1?"calc("+c+")":c}]}var f="px|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc",g=c.bind(null,new RegExp(f,"g")),h=c.bind(null,new RegExp(f+"|%","g")),i=c.bind(null,/deg|rad|grad|turn/g);a.parseLength=g,a.parseLengthOrPercent=h,a.consumeLengthOrPercent=a.consumeParenthesised.bind(null,h),a.parseAngle=i,a.mergeDimensions=e;var j=a.consumeParenthesised.bind(null,g),k=a.consumeRepeated.bind(void 0,j,/^/),l=a.consumeRepeated.bind(void 0,k,/^,/);a.consumeSizePairList=l;var m=function(a){var b=l(a);return b&&""==b[1]?b[0]:void 0},n=a.mergeNestedRepeated.bind(void 0,d," "),o=a.mergeNestedRepeated.bind(void 0,n,",");a.mergeNonNegativeSizePair=n,a.addPropertiesHandler(m,o,["background-size"]),a.addPropertiesHandler(h,d,["border-bottom-width","border-image-width","border-left-width","border-right-width","border-top-width","flex-basis","font-size","height","line-height","max-height","max-width","outline-width","width"]),a.addPropertiesHandler(h,e,["border-bottom-left-radius","border-bottom-right-radius","border-top-left-radius","border-top-right-radius","bottom","left","letter-spacing","margin-bottom","margin-left","margin-right","margin-top","min-height","min-width","outline-offset","padding-bottom","padding-left","padding-right","padding-top","perspective","right","shape-margin","text-indent","top","vertical-align","word-spacing"])}(d,f),function(a){function b(b){return a.consumeLengthOrPercent(b)||a.consumeToken(/^auto/,b)}function c(c){var d=a.consumeList([a.ignore(a.consumeToken.bind(null,/^rect/)),a.ignore(a.consumeToken.bind(null,/^\(/)),a.consumeRepeated.bind(null,b,/^,/),a.ignore(a.consumeToken.bind(null,/^\)/))],c);return d&&4==d[0].length?d[0]:void 0}function d(b,c){return"auto"==b||"auto"==c?[!0,!1,function(d){var e=d?b:c;if("auto"==e)return"auto";var f=a.mergeDimensions(e,e);return f[2](f[0])}]:a.mergeDimensions(b,c)}function e(a){return"rect("+a+")"}var f=a.mergeWrappedNestedRepeated.bind(null,e,d,", ");a.parseBox=c,a.mergeBoxes=f,a.addPropertiesHandler(c,f,["clip"])}(d,f),function(a){function b(a){return function(b){var c=0;return a.map(function(a){return a===j?b[c++]:a})}}function c(a){return a}function d(b){if(b=b.toLowerCase().trim(),"none"==b)return[];for(var c,d=/\s*(\w+)\(([^)]*)\)/g,e=[],f=0;c=d.exec(b);){if(c.index!=f)return;f=c.index+c[0].length;var g=c[1],h=m[g];if(!h)return;var i=c[2].split(","),j=h[0];if(j.length<i.length)return;for(var n=[],o=0;o<j.length;o++){var p,q=i[o],r=j[o];if(p=q?{A:function(b){return"0"==b.trim()?l:a.parseAngle(b)},N:a.parseNumber,T:a.parseLengthOrPercent,L:a.parseLength}[r.toUpperCase()](q):{a:l,n:n[0],t:k}[r],void 0===p)return;n.push(p)}if(e.push({t:g,d:n}),d.lastIndex==b.length)return e}}function e(a){return a.toFixed(6).replace(".000000","")}function f(b,c){if(b.decompositionPair!==c){b.decompositionPair=c;var d=a.makeMatrixDecomposition(b)}if(c.decompositionPair!==b){c.decompositionPair=b;var f=a.makeMatrixDecomposition(c)}return null==d[0]||null==f[0]?[[!1],[!0],function(a){return a?c[0].d:b[0].d}]:(d[0].push(0),f[0].push(1),[d,f,function(b){var c=a.quat(d[0][3],f[0][3],b[5]),g=a.composeMatrix(b[0],b[1],b[2],c,b[4]),h=g.map(e).join(",");return h}])}function g(a){return a.replace(/[xy]/,"")}function h(a){return a.replace(/(x|y|z|3d)?$/,"3d")}function i(b,c){var d=a.makeMatrixDecomposition&&!0,e=!1;if(!b.length||!c.length){b.length||(e=!0,b=c,c=[]);for(var i=0;i<b.length;i++){var j=b[i].t,k=b[i].d,l="scale"==j.substr(0,5)?1:0;c.push({t:j,d:k.map(function(a){if("number"==typeof a)return l;var b={};for(var c in a)b[c]=l;return b})})}}var n=function(a,b){return"perspective"==a&&"perspective"==b||("matrix"==a||"matrix3d"==a)&&("matrix"==b||"matrix3d"==b)},o=[],p=[],q=[];if(b.length!=c.length){if(!d)return;var r=f(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]]}else for(var i=0;i<b.length;i++){var j,s=b[i].t,t=c[i].t,u=b[i].d,v=c[i].d,w=m[s],x=m[t];if(n(s,t)){if(!d)return;var r=f([b[i]],[c[i]]);o.push(r[0]),p.push(r[1]),q.push(["matrix",[r[2]]])}else{if(s==t)j=s;else if(w[2]&&x[2]&&g(s)==g(t))j=g(s),u=w[2](u),v=x[2](v);else{if(!w[1]||!x[1]||h(s)!=h(t)){if(!d)return;var r=f(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]];break}j=h(s),u=w[1](u),v=x[1](v)}for(var y=[],z=[],A=[],B=0;B<u.length;B++){var C="number"==typeof u[B]?a.mergeNumbers:a.mergeDimensions,r=C(u[B],v[B]);y[B]=r[0],z[B]=r[1],A.push(r[2])}o.push(y),p.push(z),q.push([j,A])}}if(e){var D=o;o=p,p=D}return[o,p,function(a){return a.map(function(a,b){var c=a.map(function(a,c){return q[b][1][c](a)}).join(",");return"matrix"==q[b][0]&&16==c.split(",").length&&(q[b][0]="matrix3d"),q[b][0]+"("+c+")"}).join(" ")}]}var j=null,k={px:0},l={deg:0},m={matrix:["NNNNNN",[j,j,0,0,j,j,0,0,0,0,1,0,j,j,0,1],c],matrix3d:["NNNNNNNNNNNNNNNN",c],rotate:["A"],rotatex:["A"],rotatey:["A"],rotatez:["A"],rotate3d:["NNNA"],perspective:["L"],scale:["Nn",b([j,j,1]),c],scalex:["N",b([j,1,1]),b([j,1])],scaley:["N",b([1,j,1]),b([1,j])],scalez:["N",b([1,1,j])],scale3d:["NNN",c],skew:["Aa",null,c],skewx:["A",null,b([j,l])],skewy:["A",null,b([l,j])],translate:["Tt",b([j,j,k]),c],translatex:["T",b([j,k,k]),b([j,k])],translatey:["T",b([k,j,k]),b([k,j])],translatez:["L",b([k,k,j])],translate3d:["TTL",c]};a.addPropertiesHandler(d,i,["transform"])}(d,f),function(a){function b(a,b){b.concat([a]).forEach(function(b){b in document.documentElement.style&&(c[a]=b)})}var c={};b("transform",["webkitTransform","msTransform"]),b("transformOrigin",["webkitTransformOrigin"]),b("perspective",["webkitPerspective"]),b("perspectiveOrigin",["webkitPerspectiveOrigin"]),a.propertyName=function(a){return c[a]||a}}(d,f)}(),!function(a,b){function c(a){var b=window.document.timeline;b.currentTime=a,b._discardAnimations(),0==b._animations.length?e=!1:requestAnimationFrame(c)}var d=window.requestAnimationFrame;window.requestAnimationFrame=function(a){return d(function(b){window.document.timeline._updateAnimationsPromises(),a(b),window.document.timeline._updateAnimationsPromises()})},b.AnimationTimeline=function(){this._animations=[],this.currentTime=void 0},b.AnimationTimeline.prototype={getAnimations:function(){return this._discardAnimations(),this._animations.slice()},_updateAnimationsPromises:function(){b.animationsWithPromises=b.animationsWithPromises.filter(function(a){return a._updatePromises()})},_discardAnimations:function(){this._updateAnimationsPromises(),this._animations=this._animations.filter(function(a){return"finished"!=a.playState&&"idle"!=a.playState})},_play:function(a){var c=new b.Animation(a,this);return this._animations.push(c),b.restartWebAnimationsNextTick(),c._updatePromises(),c._animation.play(),c._updatePromises(),c},play:function(a){return a&&a.remove(),this._play(a)}};var e=!1;b.restartWebAnimationsNextTick=function(){e||(e=!0,requestAnimationFrame(c))};var f=new b.AnimationTimeline;b.timeline=f;try{Object.defineProperty(window.document,"timeline",{configurable:!0,get:function(){return f}})}catch(g){}try{window.document.timeline=f}catch(g){}}(c,e,f),function(a,b){b.animationsWithPromises=[],b.Animation=function(b,c){if(this.effect=b,b&&(b._animation=this),!c)throw new Error("Animation with null timeline is not supported");this._timeline=c,this._sequenceNumber=a.sequenceNumber++,this._holdTime=0,this._paused=!1,this._isGroup=!1,this._animation=null,this._childAnimations=[],this._callback=null,this._oldPlayState="idle",this._rebuildUnderlyingAnimation(),this._animation.cancel(),this._updatePromises()},b.Animation.prototype={_updatePromises:function(){var a=this._oldPlayState,b=this.playState;return this._readyPromise&&b!==a&&("idle"==b?(this._rejectReadyPromise(),this._readyPromise=void 0):"pending"==a?this._resolveReadyPromise():"pending"==b&&(this._readyPromise=void 0)),this._finishedPromise&&b!==a&&("idle"==b?(this._rejectFinishedPromise(),this._finishedPromise=void 0):"finished"==b?this._resolveFinishedPromise():"finished"==a&&(this._finishedPromise=void 0)),this._oldPlayState=this.playState,this._readyPromise||this._finishedPromise},_rebuildUnderlyingAnimation:function(){this._updatePromises();var a,c,d,e,f=this._animation?!0:!1;f&&(a=this.playbackRate,c=this._paused,d=this.startTime,e=this.currentTime,this._animation.cancel(),this._animation._wrapper=null,this._animation=null),(!this.effect||this.effect instanceof window.KeyframeEffect)&&(this._animation=b.newUnderlyingAnimationForKeyframeEffect(this.effect),b.bindAnimationForKeyframeEffect(this)),(this.effect instanceof window.SequenceEffect||this.effect instanceof window.GroupEffect)&&(this._animation=b.newUnderlyingAnimationForGroup(this.effect),b.bindAnimationForGroup(this)),this.effect&&this.effect._onsample&&b.bindAnimationForCustomEffect(this),f&&(1!=a&&(this.playbackRate=a),null!==d?this.startTime=d:null!==e?this.currentTime=e:null!==this._holdTime&&(this.currentTime=this._holdTime),c&&this.pause()),this._updatePromises()
},_updateChildren:function(){if(this.effect&&"idle"!=this.playState){var a=this.effect._timing.delay;this._childAnimations.forEach(function(c){this._arrangeChildren(c,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c.effect))}.bind(this))}},_setExternalAnimation:function(a){if(this.effect&&this._isGroup)for(var b=0;b<this.effect.children.length;b++)this.effect.children[b]._animation=a,this._childAnimations[b]._setExternalAnimation(a)},_constructChildAnimations:function(){if(this.effect&&this._isGroup){var a=this.effect._timing.delay;this._removeChildAnimations(),this.effect.children.forEach(function(c){var d=window.document.timeline._play(c);this._childAnimations.push(d),d.playbackRate=this.playbackRate,this._paused&&d.pause(),c._animation=this.effect._animation,this._arrangeChildren(d,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c))}.bind(this))}},_arrangeChildren:function(a,b){null===this.startTime?a.currentTime=this.currentTime-b/this.playbackRate:a.startTime!==this.startTime+b/this.playbackRate&&(a.startTime=this.startTime+b/this.playbackRate)},get timeline(){return this._timeline},get playState(){return this._animation?this._animation.playState:"idle"},get finished(){return window.Promise?(this._finishedPromise||(-1==b.animationsWithPromises.indexOf(this)&&b.animationsWithPromises.push(this),this._finishedPromise=new Promise(function(a,b){this._resolveFinishedPromise=function(){a(this)},this._rejectFinishedPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"finished"==this.playState&&this._resolveFinishedPromise()),this._finishedPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get ready(){return window.Promise?(this._readyPromise||(-1==b.animationsWithPromises.indexOf(this)&&b.animationsWithPromises.push(this),this._readyPromise=new Promise(function(a,b){this._resolveReadyPromise=function(){a(this)},this._rejectReadyPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"pending"!==this.playState&&this._resolveReadyPromise()),this._readyPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get onfinish(){return this._onfinish},set onfinish(a){"function"==typeof a?(this._onfinish=a,this._animation.onfinish=function(b){b.target=this,a.call(this,b)}.bind(this)):(this._animation.onfinish=a,this.onfinish=this._animation.onfinish)},get currentTime(){this._updatePromises();var a=this._animation.currentTime;return this._updatePromises(),a},set currentTime(a){this._updatePromises(),this._animation.currentTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.currentTime=a-c}),this._updatePromises()},get startTime(){return this._animation.startTime},set startTime(a){this._updatePromises(),this._animation.startTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.startTime=a+c}),this._updatePromises()},get playbackRate(){return this._animation.playbackRate},set playbackRate(a){this._updatePromises();var b=this.currentTime;this._animation.playbackRate=a,this._forEachChild(function(b){b.playbackRate=a}),"paused"!=this.playState&&"idle"!=this.playState&&this.play(),null!==b&&(this.currentTime=b),this._updatePromises()},play:function(){this._updatePromises(),this._paused=!1,this._animation.play(),-1==this._timeline._animations.indexOf(this)&&this._timeline._animations.push(this),this._register(),b.awaitStartTime(this),this._forEachChild(function(a){var b=a.currentTime;a.play(),a.currentTime=b}),this._updatePromises()},pause:function(){this._updatePromises(),this.currentTime&&(this._holdTime=this.currentTime),this._animation.pause(),this._register(),this._forEachChild(function(a){a.pause()}),this._paused=!0,this._updatePromises()},finish:function(){this._updatePromises(),this._animation.finish(),this._register(),this._updatePromises()},cancel:function(){this._updatePromises(),this._animation.cancel(),this._register(),this._removeChildAnimations(),this._updatePromises()},reverse:function(){this._updatePromises();var a=this.currentTime;this._animation.reverse(),this._forEachChild(function(a){a.reverse()}),null!==a&&(this.currentTime=a),this._updatePromises()},addEventListener:function(a,b){var c=b;"function"==typeof b&&(c=function(a){a.target=this,b.call(this,a)}.bind(this),b._wrapper=c),this._animation.addEventListener(a,c)},removeEventListener:function(a,b){this._animation.removeEventListener(a,b&&b._wrapper||b)},_removeChildAnimations:function(){for(;this._childAnimations.length;)this._childAnimations.pop().cancel()},_forEachChild:function(b){var c=0;if(this.effect.children&&this._childAnimations.length<this.effect.children.length&&this._constructChildAnimations(),this._childAnimations.forEach(function(a){b.call(this,a,c),this.effect instanceof window.SequenceEffect&&(c+=a.effect.activeDuration)}.bind(this)),"pending"!=this.playState){var d=this.effect._timing,e=this.currentTime;null!==e&&(e=a.calculateTimeFraction(a.calculateActiveDuration(d),e,d)),(null==e||isNaN(e))&&this._removeChildAnimations()}}},window.Animation=b.Animation}(c,e,f),function(a,b){function c(b){this._frames=a.normalizeKeyframes(b)}function d(){for(var a=!1;h.length;){var b=h.shift();b._updateChildren(),a=!0}return a}var e=function(a){if(a._animation=void 0,a instanceof window.SequenceEffect||a instanceof window.GroupEffect)for(var b=0;b<a.children.length;b++)e(a.children[b])};b.removeMulti=function(a){for(var b=[],c=0;c<a.length;c++){var d=a[c];d._parent?(-1==b.indexOf(d._parent)&&b.push(d._parent),d._parent.children.splice(d._parent.children.indexOf(d),1),d._parent=null,e(d)):d._animation&&d._animation.effect==d&&(d._animation.cancel(),d._animation.effect=new KeyframeEffect(null,[]),d._animation._callback&&(d._animation._callback._animation=null),d._animation._rebuildUnderlyingAnimation(),e(d))}for(c=0;c<b.length;c++)b[c]._rebuild()},b.KeyframeEffect=function(b,d,e){return this.target=b,this._parent=null,e=a.numericTimingToObject(e),this._timingInput=a.cloneTimingInput(e),this._timing=a.normalizeTimingInput(e),this.timing=a.makeTiming(e,!1,this),this.timing._effect=this,"function"==typeof d?(a.deprecated("Custom KeyframeEffect","2015-06-22","Use KeyframeEffect.onsample instead."),this._normalizedKeyframes=d):this._normalizedKeyframes=new c(d),this._keyframes=d,this.activeDuration=a.calculateActiveDuration(this._timing),this},b.KeyframeEffect.prototype={getFrames:function(){return"function"==typeof this._normalizedKeyframes?this._normalizedKeyframes:this._normalizedKeyframes._frames},set onsample(a){if("function"==typeof this.getFrames())throw new Error("Setting onsample on custom effect KeyframeEffect is not supported.");this._onsample=a,this._animation&&this._animation._rebuildUnderlyingAnimation()},get parent(){return this._parent},clone:function(){if("function"==typeof this.getFrames())throw new Error("Cloning custom effects is not supported.");var b=new KeyframeEffect(this.target,[],a.cloneTimingInput(this._timingInput));return b._normalizedKeyframes=this._normalizedKeyframes,b._keyframes=this._keyframes,b},remove:function(){b.removeMulti([this])}};var f=Element.prototype.animate;Element.prototype.animate=function(a,c){return b.timeline._play(new b.KeyframeEffect(this,a,c))};var g=document.createElementNS("http://www.w3.org/1999/xhtml","div");b.newUnderlyingAnimationForKeyframeEffect=function(a){if(a){var b=a.target||g,c=a._keyframes;"function"==typeof c&&(c=[]);var d=a._timingInput}else var b=g,c=[],d=0;return f.apply(b,[c,d])},b.bindAnimationForKeyframeEffect=function(a){a.effect&&"function"==typeof a.effect._normalizedKeyframes&&b.bindAnimationForCustomEffect(a)};var h=[];b.awaitStartTime=function(a){null===a.startTime&&a._isGroup&&(0==h.length&&requestAnimationFrame(d),h.push(a))};var i=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){window.document.timeline._updateAnimationsPromises();var a=i.apply(this,arguments);return d()&&(a=i.apply(this,arguments)),window.document.timeline._updateAnimationsPromises(),a}}),window.KeyframeEffect=b.KeyframeEffect,window.Element.prototype.getAnimations=function(){return document.timeline.getAnimations().filter(function(a){return null!==a.effect&&a.effect.target==this}.bind(this))}}(c,e,f),function(a,b){function c(a){a._registered||(a._registered=!0,f.push(a),g||(g=!0,requestAnimationFrame(d)))}function d(){var a=f;f=[],a.sort(function(a,b){return a._sequenceNumber-b._sequenceNumber}),a=a.filter(function(a){a();var b=a._animation?a._animation.playState:"idle";return"running"!=b&&"pending"!=b&&(a._registered=!1),a._registered}),f.push.apply(f,a),f.length?(g=!0,requestAnimationFrame(d)):g=!1}var e=(document.createElementNS("http://www.w3.org/1999/xhtml","div"),0);b.bindAnimationForCustomEffect=function(b){var d,f=b.effect.target,g="function"==typeof b.effect.getFrames();d=g?b.effect.getFrames():b.effect._onsample;var h=b.effect.timing,i=null;h=a.normalizeTimingInput(h);var j=function(){var c=j._animation?j._animation.currentTime:null;null!==c&&(c=a.calculateTimeFraction(a.calculateActiveDuration(h),c,h),isNaN(c)&&(c=null)),c!==i&&(g?d(c,f,b.effect):d(c,b.effect,b.effect._animation)),i=c};j._animation=b,j._registered=!1,j._sequenceNumber=e++,b._callback=j,c(j)};var f=[],g=!1;b.Animation.prototype._register=function(){this._callback&&c(this._callback)}}(c,e,f),function(a,b){function c(a){return a._timing.delay+a.activeDuration+a._timing.endDelay}function d(b,c){this._parent=null,this.children=b||[],this._reparent(this.children),c=a.numericTimingToObject(c),this._timingInput=a.cloneTimingInput(c),this._timing=a.normalizeTimingInput(c,!0),this.timing=a.makeTiming(c,!0,this),this.timing._effect=this,"auto"===this._timing.duration&&(this._timing.duration=this.activeDuration)}window.SequenceEffect=function(){d.apply(this,arguments)},window.GroupEffect=function(){d.apply(this,arguments)},d.prototype={_isAncestor:function(a){for(var b=this;null!==b;){if(b==a)return!0;b=b._parent}return!1},_rebuild:function(){for(var a=this;a;)"auto"===a.timing.duration&&(a._timing.duration=a.activeDuration),a=a._parent;this._animation&&this._animation._rebuildUnderlyingAnimation()},_reparent:function(a){b.removeMulti(a);for(var c=0;c<a.length;c++)a[c]._parent=this},_putChild:function(a,b){for(var c=b?"Cannot append an ancestor or self":"Cannot prepend an ancestor or self",d=0;d<a.length;d++)if(this._isAncestor(a[d]))throw{type:DOMException.HIERARCHY_REQUEST_ERR,name:"HierarchyRequestError",message:c};for(var d=0;d<a.length;d++)b?this.children.push(a[d]):this.children.unshift(a[d]);this._reparent(a),this._rebuild()},append:function(){this._putChild(arguments,!0)},prepend:function(){this._putChild(arguments,!1)},get parent(){return this._parent},get firstChild(){return this.children.length?this.children[0]:null},get lastChild(){return this.children.length?this.children[this.children.length-1]:null},clone:function(){for(var b=a.cloneTimingInput(this._timingInput),c=[],d=0;d<this.children.length;d++)c.push(this.children[d].clone());return this instanceof GroupEffect?new GroupEffect(c,b):new SequenceEffect(c,b)},remove:function(){b.removeMulti([this])}},window.SequenceEffect.prototype=Object.create(d.prototype),Object.defineProperty(window.SequenceEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a+=c(b)}),Math.max(a,0)}}),window.GroupEffect.prototype=Object.create(d.prototype),Object.defineProperty(window.GroupEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a=Math.max(a,c(b))}),a}}),b.newUnderlyingAnimationForGroup=function(c){var d,e=null,f=function(b){var c=d._wrapper;return c&&"pending"!=c.playState&&c.effect?null==b?void c._removeChildAnimations():0==b&&c.playbackRate<0&&(e||(e=a.normalizeTimingInput(c.effect.timing)),b=a.calculateTimeFraction(a.calculateActiveDuration(e),-1,e),isNaN(b)||null==b)?(c._forEachChild(function(a){a.currentTime=-1}),void c._removeChildAnimations()):void 0:void 0},g=new KeyframeEffect(null,[],c._timing);return g.onsample=f,d=b.timeline._play(g)},b.bindAnimationForGroup=function(a){a._animation._wrapper=a,a._isGroup=!0,b.awaitStartTime(a),a._constructChildAnimations(),a._setExternalAnimation(a)},b.groupChildDuration=c}(c,e,f)}({},function(){return this}());
//# sourceMappingURL=web-animations-next-lite.min.js.map
Polymer({

    is: 'opaque-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      node.style.opacity = '0';
      this._effect = new KeyframeEffect(node, [
        {'opacity': '1'},
        {'opacity': '1'}
      ], this.timingFromConfig(config));
      return this._effect;
    },

    complete: function(config) {
      config.node.style.opacity = '';
    }

  });
/**
   * `Polymer.NeonAnimatableBehavior` is implemented by elements containing animations for use with
   * elements implementing `Polymer.NeonAnimationRunnerBehavior`.
   * @polymerBehavior
   */
  Polymer.NeonAnimatableBehavior = {

    properties: {

      /**
       * Animation configuration. See README for more info.
       */
      animationConfig: {
        type: Object
      },

      /**
       * Convenience property for setting an 'entry' animation. Do not set `animationConfig.entry`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      entryAnimation: {
        observer: '_entryAnimationChanged',
        type: String
      },

      /**
       * Convenience property for setting an 'exit' animation. Do not set `animationConfig.exit`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      exitAnimation: {
        observer: '_exitAnimationChanged',
        type: String
      }

    },

    _entryAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      if (this.entryAnimation !== 'fade-in-animation') {
        // insert polyfill hack
        this.animationConfig['entry'] = [{
          name: 'opaque-animation',
          node: this
        }, {
          name: this.entryAnimation,
          node: this
        }];
      } else {
        this.animationConfig['entry'] = [{
          name: this.entryAnimation,
          node: this
        }];
      }
    },

    _exitAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      this.animationConfig['exit'] = [{
        name: this.exitAnimation,
        node: this
      }];
    },

    _copyProperties: function(config1, config2) {
      // shallowly copy properties from config2 to config1
      for (var property in config2) {
        config1[property] = config2[property];
      }
    },

    _cloneConfig: function(config) {
      var clone = {
        isClone: true
      };
      this._copyProperties(clone, config);
      return clone;
    },

    _getAnimationConfigRecursive: function(type, map, allConfigs) {
      if (!this.animationConfig) {
        return;
      }

      if(this.animationConfig.value && typeof this.animationConfig.value === 'function') {
      	this._warn(this._logf('playAnimation', "Please put 'animationConfig' inside of your components 'properties' object instead of outside of it."));
      	return;
      }

      // type is optional
      var thisConfig;
      if (type) {
        thisConfig = this.animationConfig[type];
      } else {
        thisConfig = this.animationConfig;
      }

      if (!Array.isArray(thisConfig)) {
        thisConfig = [thisConfig];
      }

      // iterate animations and recurse to process configurations from child nodes
      if (thisConfig) {
        for (var config, index = 0; config = thisConfig[index]; index++) {
          if (config.animatable) {
            config.animatable._getAnimationConfigRecursive(config.type || type, map, allConfigs);
          } else {
            if (config.id) {
              var cachedConfig = map[config.id];
              if (cachedConfig) {
                // merge configurations with the same id, making a clone lazily
                if (!cachedConfig.isClone) {
                  map[config.id] = this._cloneConfig(cachedConfig)
                  cachedConfig = map[config.id];
                }
                this._copyProperties(cachedConfig, config);
              } else {
                // put any configs with an id into a map
                map[config.id] = config;
              }
            } else {
              allConfigs.push(config);
            }
          }
        }
      }
    },

    /**
     * An element implementing `Polymer.NeonAnimationRunnerBehavior` calls this method to configure
     * an animation with an optional type. Elements implementing `Polymer.NeonAnimatableBehavior`
     * should define the property `animationConfig`, which is either a configuration object
     * or a map of animation type to array of configuration objects.
     */
    getAnimationConfig: function(type) {
      var map = {};
      var allConfigs = [];
      this._getAnimationConfigRecursive(type, map, allConfigs);
      // append the configurations saved in the map to the array
      for (var key in map) {
        allConfigs.push(map[key]);
      }
      return allConfigs;
    }

  };
/**
   * `Polymer.NeonAnimationRunnerBehavior` adds a method to run animations.
   *
   * @polymerBehavior Polymer.NeonAnimationRunnerBehavior
   */
  Polymer.NeonAnimationRunnerBehaviorImpl = {

    properties: {

      _animationMeta: {
        type: Object,
        value: function() {
          return new Polymer.IronMeta({type: 'animation'});
        }
      },

      /** @type {?Object} */
      _player: {
        type: Object
      }

    },

    _configureAnimationEffects: function(allConfigs) {
      var allAnimations = [];
      if (allConfigs.length > 0) {
        for (var config, index = 0; config = allConfigs[index]; index++) {
          var animationConstructor = this._animationMeta.byKey(config.name);
          if (animationConstructor) {
            var animation = animationConstructor && new animationConstructor();
            var effect = animation.configure(config);
            if (effect) {
              allAnimations.push({
                animation: animation,
                config: config,
                effect: effect
              });
            }
          } else {
            console.warn(this.is + ':', config.name, 'not found!');
          }
        }
      }
      return allAnimations;
    },

    _runAnimationEffects: function(allEffects) {
      return document.timeline.play(new GroupEffect(allEffects));
    },

    _completeAnimations: function(allAnimations) {
      for (var animation, index = 0; animation = allAnimations[index]; index++) {
        animation.animation.complete(animation.config);
      }
    },

    /**
     * Plays an animation with an optional `type`.
     * @param {string=} type
     * @param {!Object=} cookie
     */
    playAnimation: function(type, cookie) {
      var allConfigs = this.getAnimationConfig(type);
      if (!allConfigs) {
        return;
      }
      var allAnimations = this._configureAnimationEffects(allConfigs);
      var allEffects = allAnimations.map(function(animation) {
        return animation.effect;
      });

      if (allEffects.length > 0) {
        this._player = this._runAnimationEffects(allEffects);
        this._player.onfinish = function() {
          this._completeAnimations(allAnimations);

          if (this._player) {
            this._player.cancel();
            this._player = null;
          }

          this.fire('neon-animation-finish', cookie, {bubbles: false});
        }.bind(this);

      } else {
        this.fire('neon-animation-finish', cookie, {bubbles: false});
      }
    },

    /**
     * Cancels the currently running animation.
     */
    cancelAnimation: function() {
      if (this._player) {
        this._player.cancel();
      }
    }
  };

  /** @polymerBehavior Polymer.NeonAnimationRunnerBehavior */
  Polymer.NeonAnimationRunnerBehavior = [
    Polymer.NeonAnimatableBehavior,
    Polymer.NeonAnimationRunnerBehaviorImpl
  ];
/**
Polymer.IronFitBehavior fits an element in another element using `max-height` and `max-width`, and
optionally centers it in the window or another element.

The element will only be sized and/or positioned if it has not already been sized and/or positioned
by CSS.

CSS properties               | Action
-----------------------------|-------------------------------------------
`position` set               | Element is not centered horizontally or vertically
`top` or `bottom` set        | Element is not vertically centered
`left` or `right` set        | Element is not horizontally centered
`max-height` or `height` set | Element respects `max-height` or `height`
`max-width` or `width` set   | Element respects `max-width` or `width`

@demo demo/index.html
@polymerBehavior
*/

  Polymer.IronFitBehavior = {

    properties: {

      /**
       * The element that will receive a `max-height`/`width`. By default it is the same as `this`,
       * but it can be set to a child element. This is useful, for example, for implementing a
       * scrolling region inside the element.
       * @type {!Element}
       */
      sizingTarget: {
        type: Object,
        value: function() {
          return this;
        }
      },

      /**
       * The element to fit `this` into.
       */
      fitInto: {
        type: Object,
        value: window
      },

      /**
       * Set to true to auto-fit on attach.
       */
      autoFitOnAttach: {
        type: Boolean,
        value: false
      },

      /** @type {?Object} */
      _fitInfo: {
        type: Object
      }

    },

    get _fitWidth() {
      var fitWidth;
      if (this.fitInto === window) {
        fitWidth = this.fitInto.innerWidth;
      } else {
        fitWidth = this.fitInto.getBoundingClientRect().width;
      }
      return fitWidth;
    },

    get _fitHeight() {
      var fitHeight;
      if (this.fitInto === window) {
        fitHeight = this.fitInto.innerHeight;
      } else {
        fitHeight = this.fitInto.getBoundingClientRect().height;
      }
      return fitHeight;
    },

    get _fitLeft() {
      var fitLeft;
      if (this.fitInto === window) {
        fitLeft = 0;
      } else {
        fitLeft = this.fitInto.getBoundingClientRect().left;
      }
      return fitLeft;
    },

    get _fitTop() {
      var fitTop;
      if (this.fitInto === window) {
        fitTop = 0;
      } else {
        fitTop = this.fitInto.getBoundingClientRect().top;
      }
      return fitTop;
    },

    attached: function() {
      if (this.autoFitOnAttach) {
        if (window.getComputedStyle(this).display === 'none') {
          setTimeout(function() {
            this.fit();
          }.bind(this));
        } else {
          this.fit();
        }
      }
    },

    /**
     * Fits and optionally centers the element into the window, or `fitInfo` if specified.
     */
    fit: function() {
      this._discoverInfo();
      this.constrain();
      this.center();
    },

    /**
     * Memoize information needed to position and size the target element.
     */
    _discoverInfo: function() {
      if (this._fitInfo) {
        return;
      }
      var target = window.getComputedStyle(this);
      var sizer = window.getComputedStyle(this.sizingTarget);
      this._fitInfo = {
        inlineStyle: {
          top: this.style.top || '',
          left: this.style.left || ''
        },
        positionedBy: {
          vertically: target.top !== 'auto' ? 'top' : (target.bottom !== 'auto' ?
            'bottom' : null),
          horizontally: target.left !== 'auto' ? 'left' : (target.right !== 'auto' ?
            'right' : null),
          css: target.position
        },
        sizedBy: {
          height: sizer.maxHeight !== 'none',
          width: sizer.maxWidth !== 'none'
        },
        margin: {
          top: parseInt(target.marginTop, 10) || 0,
          right: parseInt(target.marginRight, 10) || 0,
          bottom: parseInt(target.marginBottom, 10) || 0,
          left: parseInt(target.marginLeft, 10) || 0
        }
      };
    },

    /**
     * Resets the target element's position and size constraints, and clear
     * the memoized data.
     */
    resetFit: function() {
      if (!this._fitInfo || !this._fitInfo.sizedBy.width) {
        this.sizingTarget.style.maxWidth = '';
      }
      if (!this._fitInfo || !this._fitInfo.sizedBy.height) {
        this.sizingTarget.style.maxHeight = '';
      }
      this.style.top = this._fitInfo ? this._fitInfo.inlineStyle.top : '';
      this.style.left = this._fitInfo ? this._fitInfo.inlineStyle.left : '';
      if (this._fitInfo) {
        this.style.position = this._fitInfo.positionedBy.css;
      }
      this._fitInfo = null;
    },

    /**
     * Equivalent to calling `resetFit()` and `fit()`. Useful to call this after the element,
     * the window, or the `fitInfo` element has been resized.
     */
    refit: function() {
      this.resetFit();
      this.fit();
    },

    /**
     * Constrains the size of the element to the window or `fitInfo` by setting `max-height`
     * and/or `max-width`.
     */
    constrain: function() {
      var info = this._fitInfo;
      // position at (0px, 0px) if not already positioned, so we can measure the natural size.
      if (!this._fitInfo.positionedBy.vertically) {
        this.style.top = '0px';
      }
      if (!this._fitInfo.positionedBy.horizontally) {
        this.style.left = '0px';
      }
      if (!this._fitInfo.positionedBy.vertically || !this._fitInfo.positionedBy.horizontally) {
        // need position:fixed to properly size the element
        this.style.position = 'fixed';
      }
      // need border-box for margin/padding
      this.sizingTarget.style.boxSizing = 'border-box';
      // constrain the width and height if not already set
      var rect = this.getBoundingClientRect();
      if (!info.sizedBy.height) {
        this._sizeDimension(rect, info.positionedBy.vertically, 'top', 'bottom', 'Height');
      }
      if (!info.sizedBy.width) {
        this._sizeDimension(rect, info.positionedBy.horizontally, 'left', 'right', 'Width');
      }
    },

    _sizeDimension: function(rect, positionedBy, start, end, extent) {
      var info = this._fitInfo;
      var max = extent === 'Width' ? this._fitWidth : this._fitHeight;
      var flip = (positionedBy === end);
      var offset = flip ? max - rect[end] : rect[start];
      var margin = info.margin[flip ? start : end];
      var offsetExtent = 'offset' + extent;
      var sizingOffset = this[offsetExtent] - this.sizingTarget[offsetExtent];
      this.sizingTarget.style['max' + extent] = (max - margin - offset - sizingOffset) + 'px';
    },

    /**
     * Centers horizontally and vertically if not already positioned. This also sets
     * `position:fixed`.
     */
    center: function() {
      var positionedBy = this._fitInfo.positionedBy;
      if (positionedBy.vertically && positionedBy.horizontally) {
        // Already positioned.
        return;
      }
      // Need position:fixed to center
      this.style.position = 'fixed';
      // Take into account the offset caused by parents that create stacking
      // contexts (e.g. with transform: translate3d). Translate to 0,0 and
      // measure the bounding rect.
      if (!positionedBy.vertically) {
        this.style.top = '0px';
      }
      if (!positionedBy.horizontally) {
        this.style.left = '0px';
      }
      // It will take in consideration margins and transforms
      var rect = this.getBoundingClientRect();
      if (!positionedBy.vertically) {
        var top = this._fitTop - rect.top + (this._fitHeight - rect.height) / 2;
        this.style.top = top + 'px';
      }
      if (!positionedBy.horizontally) {
        var left = this._fitLeft - rect.left + (this._fitWidth - rect.width) / 2;
        this.style.left = left + 'px';
      }
    }

  };
/**
   * `IronResizableBehavior` is a behavior that can be used in Polymer elements to
   * coordinate the flow of resize events between "resizers" (elements that control the
   * size or hidden state of their children) and "resizables" (elements that need to be
   * notified when they are resized or un-hidden by their parents in order to take
   * action on their new measurements).
   * 
   * Elements that perform measurement should add the `IronResizableBehavior` behavior to
   * their element definition and listen for the `iron-resize` event on themselves.
   * This event will be fired when they become showing after having been hidden,
   * when they are resized explicitly by another resizable, or when the window has been
   * resized.
   * 
   * Note, the `iron-resize` event is non-bubbling.
   *
   * @polymerBehavior Polymer.IronResizableBehavior
   * @demo demo/index.html
   **/
  Polymer.IronResizableBehavior = {
    properties: {
      /**
       * The closest ancestor element that implements `IronResizableBehavior`.
       */
      _parentResizable: {
        type: Object,
        observer: '_parentResizableChanged'
      },

      /**
       * True if this element is currently notifying its descedant elements of
       * resize.
       */
      _notifyingDescendant: {
        type: Boolean,
        value: false
      }
    },

    listeners: {
      'iron-request-resize-notifications': '_onIronRequestResizeNotifications'
    },

    created: function() {
      // We don't really need property effects on these, and also we want them
      // to be created before the `_parentResizable` observer fires:
      this._interestedResizables = [];
      this._boundNotifyResize = this.notifyResize.bind(this);
    },

    attached: function() {
      this.fire('iron-request-resize-notifications', null, {
        node: this,
        bubbles: true,
        cancelable: true
      });

      if (!this._parentResizable) {
        window.addEventListener('resize', this._boundNotifyResize);
        this.notifyResize();
      }
    },

    detached: function() {
      if (this._parentResizable) {
        this._parentResizable.stopResizeNotificationsFor(this);
      } else {
        window.removeEventListener('resize', this._boundNotifyResize);
      }

      this._parentResizable = null;
    },

    /**
     * Can be called to manually notify a resizable and its descendant
     * resizables of a resize change.
     */
    notifyResize: function() {
      if (!this.isAttached) {
        return;
      }

      this._interestedResizables.forEach(function(resizable) {
        if (this.resizerShouldNotify(resizable)) {
          this._notifyDescendant(resizable);
        }
      }, this);

      this._fireResize();
    },

    /**
     * Used to assign the closest resizable ancestor to this resizable
     * if the ancestor detects a request for notifications.
     */
    assignParentResizable: function(parentResizable) {
      this._parentResizable = parentResizable;
    },

    /**
     * Used to remove a resizable descendant from the list of descendants
     * that should be notified of a resize change.
     */
    stopResizeNotificationsFor: function(target) {
      var index = this._interestedResizables.indexOf(target);

      if (index > -1) {
        this._interestedResizables.splice(index, 1);
        this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
      }
    },

    /**
     * This method can be overridden to filter nested elements that should or
     * should not be notified by the current element. Return true if an element
     * should be notified, or false if it should not be notified.
     *
     * @param {HTMLElement} element A candidate descendant element that
     * implements `IronResizableBehavior`.
     * @return {boolean} True if the `element` should be notified of resize.
     */
    resizerShouldNotify: function(element) { return true; },

    _onDescendantIronResize: function(event) {
      if (this._notifyingDescendant) {
        event.stopPropagation();
        return;
      }

      // NOTE(cdata): In ShadowDOM, event retargetting makes echoing of the
      // otherwise non-bubbling event "just work." We do it manually here for
      // the case where Polymer is not using shadow roots for whatever reason:
      if (!Polymer.Settings.useShadow) {
        this._fireResize();
      }
    },

    _fireResize: function() {
      this.fire('iron-resize', null, {
        node: this,
        bubbles: false
      });
    },

    _onIronRequestResizeNotifications: function(event) {
      var target = event.path ? event.path[0] : event.target;

      if (target === this) {
        return;
      }

      if (this._interestedResizables.indexOf(target) === -1) {
        this._interestedResizables.push(target);
        this.listen(target, 'iron-resize', '_onDescendantIronResize');
      }

      target.assignParentResizable(this);
      this._notifyDescendant(target);

      event.stopPropagation();
    },

    _parentResizableChanged: function(parentResizable) {
      if (parentResizable) {
        window.removeEventListener('resize', this._boundNotifyResize);
      }
    },

    _notifyDescendant: function(descendant) {
      // NOTE(cdata): In IE10, attached is fired on children first, so it's
      // important not to notify them if the parent is not attached yet (or
      // else they will get redundantly notified when the parent attaches).
      if (!this.isAttached) {
        return;
      }

      this._notifyingDescendant = true;
      descendant.notifyResize();
      this._notifyingDescendant = false;
    }
  };
/**
   * @struct
   * @constructor
   */
  Polymer.IronOverlayManagerClass = function() {
    this._overlays = [];
    // Used to keep track of the last focused node before an overlay gets opened.
    this._lastFocusedNodes = [];

    /**
     * iframes have a default z-index of 100, so this default should be at least
     * that.
     * @private {number}
     */
    this._minimumZ = 101;

    this._backdrops = [];

    this._backdropElement = null;
    Object.defineProperty(this, 'backdropElement', {
      get: function() {
        if (!this._backdropElement) {
          this._backdropElement = document.createElement('iron-overlay-backdrop');
        }
        return this._backdropElement;
      }.bind(this)
    });

    /**
     * The deepest active element.
     * returns {?Node} element the active element
     */
    this.deepActiveElement = null;
    Object.defineProperty(this, 'deepActiveElement', {
      get: function() {
        var active = document.activeElement;
        // document.activeElement can be null
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
        while (active && active.root && Polymer.dom(active.root).activeElement) {
          active = Polymer.dom(active.root).activeElement;
        }
        return active;
      }.bind(this)
    });
  };

  /**
   * If a node is contained in an overlay.
   * @private
   * @param {Node} node
   * @returns {Boolean}
   */
  Polymer.IronOverlayManagerClass.prototype._isChildOfOverlay = function(node) {
    while (node && node !== document.body) {
      // Use logical parentNode, or native ShadowRoot host.
      node = Polymer.dom(node).parentNode || node.host;
      // Check if it is an overlay.
      if (node && node.behaviors && node.behaviors.indexOf(Polymer.IronOverlayBehaviorImpl) !== -1) {
        return true;
      }
    }
    return false;
  };

  Polymer.IronOverlayManagerClass.prototype._applyOverlayZ = function(overlay, aboveZ) {
    this._setZ(overlay, aboveZ + 2);
  };

  Polymer.IronOverlayManagerClass.prototype._setZ = function(element, z) {
    element.style.zIndex = z;
  };

  /**
   * track overlays for z-index and focus managemant
   */
  Polymer.IronOverlayManagerClass.prototype.addOverlay = function(overlay) {
    var minimumZ = Math.max(this.currentOverlayZ(), this._minimumZ);
    this._overlays.push(overlay);
    var newZ = this.currentOverlayZ();
    if (newZ <= minimumZ) {
      this._applyOverlayZ(overlay, minimumZ);
    }
    var element = this.deepActiveElement;
    // If already in other overlay, don't reset focus there.
    if (this._isChildOfOverlay(element)) {
      element = null;
    }
    this._lastFocusedNodes.push(element);
  };

  Polymer.IronOverlayManagerClass.prototype.removeOverlay = function(overlay) {
    var i = this._overlays.indexOf(overlay);
    if (i >= 0) {
      this._overlays.splice(i, 1);
      this._setZ(overlay, '');

      var node = this._lastFocusedNodes[i];
      // Focus only if still contained in document.body
      if (overlay.restoreFocusOnClose && node && Polymer.dom(document.body).deepContains(node)) {
        node.focus();
      }
      this._lastFocusedNodes.splice(i, 1);
    }
  };

  Polymer.IronOverlayManagerClass.prototype.currentOverlay = function() {
    var i = this._overlays.length - 1;
    while (this._overlays[i] && !this._overlays[i].opened) {
      --i;
    }
    return this._overlays[i];
  };

  Polymer.IronOverlayManagerClass.prototype.currentOverlayZ = function() {
    return this._getOverlayZ(this.currentOverlay());
  };

  /**
   * Ensures that the minimum z-index of new overlays is at least `minimumZ`.
   * This does not effect the z-index of any existing overlays.
   *
   * @param {number} minimumZ
   */
  Polymer.IronOverlayManagerClass.prototype.ensureMinimumZ = function(minimumZ) {
    this._minimumZ = Math.max(this._minimumZ, minimumZ);
  };

  Polymer.IronOverlayManagerClass.prototype.focusOverlay = function() {
    var current = this.currentOverlay();
    // We have to be careful to focus the next overlay _after_ any current
    // transitions are complete (due to the state being toggled prior to the
    // transition). Otherwise, we risk infinite recursion when a transitioning
    // (closed) overlay becomes the current overlay.
    //
    // NOTE: We make the assumption that any overlay that completes a transition
    // will call into focusOverlay to kick the process back off. Currently:
    // transitionend -> _applyFocus -> focusOverlay.
    if (current && !current.transitioning) {
      current._applyFocus();
    }
  };

  Polymer.IronOverlayManagerClass.prototype.trackBackdrop = function(element) {
    // backdrops contains the overlays with a backdrop that are currently
    // visible
    var index = this._backdrops.indexOf(element);
    if (element.opened && element.withBackdrop) {
      // no duplicates
      if (index === -1) {
        this._backdrops.push(element);
      }
    } else if (index >= 0) {
      this._backdrops.splice(index, 1);
    }
  };

  Polymer.IronOverlayManagerClass.prototype.getBackdrops = function() {
    return this._backdrops;
  };

  /**
   * Returns the z-index for the backdrop.
   */
  Polymer.IronOverlayManagerClass.prototype.backdropZ = function() {
    return this._getOverlayZ(this._overlayWithBackdrop()) - 1;
  };

  /**
   * Returns the first opened overlay that has a backdrop.
   */
  Polymer.IronOverlayManagerClass.prototype._overlayWithBackdrop = function() {
    for (var i = 0; i < this._overlays.length; i++) {
      if (this._overlays[i].opened && this._overlays[i].withBackdrop) {
        return this._overlays[i];
      }
    }
  };

  /**
   * Calculates the minimum z-index for the overlay.
   */
  Polymer.IronOverlayManagerClass.prototype._getOverlayZ = function(overlay) {
    var z = this._minimumZ;
    if (overlay) {
      var z1 = Number(window.getComputedStyle(overlay).zIndex);
      // Check if is a number
      // Number.isNaN not supported in IE 10+
      if (z1 === z1) {
        z = z1;
      }
    }
    return z;
  };

  Polymer.IronOverlayManager = new Polymer.IronOverlayManagerClass();
(function() {

  Polymer({

    is: 'iron-overlay-backdrop',

    properties: {

      /**
       * Returns true if the backdrop is opened.
       */
      opened: {
        readOnly: true,
        reflectToAttribute: true,
        type: Boolean,
        value: false
      },

      _manager: {
        type: Object,
        value: Polymer.IronOverlayManager
      }

    },

    listeners: {
      'transitionend' : '_onTransitionend'
    },

    /**
     * Appends the backdrop to document body and sets its `z-index` to be below the latest overlay.
     */
    prepare: function() {
      // Always update z-index
      this.style.zIndex = this._manager.backdropZ();
      if (!this.parentNode) {
        Polymer.dom(document.body).appendChild(this);
      }
    },

    /**
     * Shows the backdrop if needed.
     */
    open: function() {
      // only need to make the backdrop visible if this is called by the first overlay with a backdrop
      if (this._manager.getBackdrops().length < 2) {
        this._setOpened(true);
      }
    },

    /**
     * Hides the backdrop if needed.
     */
    close: function() {
      // Always update z-index
      this.style.zIndex = this._manager.backdropZ();
      // close only if no element with backdrop is left
      if (this._manager.getBackdrops().length === 0) {
        // Read style before setting opened.
        var cs = getComputedStyle(this);
        var noAnimation = (cs.transitionDuration === '0s' || cs.opacity == 0);
        this._setOpened(false);
        // In case of no animations, complete
        if (noAnimation) {
          this.complete();
        }
      }
    },

    /**
     * Removes the backdrop from document body if needed.
     */
    complete: function() {
      // only remove the backdrop if there are no more overlays with backdrops
      if (this._manager.getBackdrops().length === 0 && this.parentNode) {
        Polymer.dom(this.parentNode).removeChild(this);
      }
    },

    _onTransitionend: function (event) {
      if (event && event.target === this) {
        this.complete();
      }
    }

  });

})();
/**
Use `Polymer.IronOverlayBehavior` to implement an element that can be hidden or shown, and displays
on top of other content. It includes an optional backdrop, and can be used to implement a variety
of UI controls including dialogs and drop downs. Multiple overlays may be displayed at once.

### Closing and canceling

A dialog may be hidden by closing or canceling. The difference between close and cancel is user
intent. Closing generally implies that the user acknowledged the content on the overlay. By default,
it will cancel whenever the user taps outside it or presses the escape key. This behavior is
configurable with the `no-cancel-on-esc-key` and the `no-cancel-on-outside-click` properties.
`close()` should be called explicitly by the implementer when the user interacts with a control
in the overlay element. When the dialog is canceled, the overlay fires an 'iron-overlay-canceled'
event. Call `preventDefault` on this event to prevent the overlay from closing.

### Positioning

By default the element is sized and positioned to fit and centered inside the window. You can
position and size it manually using CSS. See `Polymer.IronFitBehavior`.

### Backdrop

Set the `with-backdrop` attribute to display a backdrop behind the overlay. The backdrop is
appended to `<body>` and is of type `<iron-overlay-backdrop>`. See its doc page for styling
options.

### Limitations

The element is styled to appear on top of other content by setting its `z-index` property. You
must ensure no element has a stacking context with a higher `z-index` than its parent stacking
context. You should place this element as a child of `<body>` whenever possible.

@demo demo/index.html
@polymerBehavior Polymer.IronOverlayBehavior
*/

  Polymer.IronOverlayBehaviorImpl = {

    properties: {

      /**
       * True if the overlay is currently displayed.
       */
      opened: {
        observer: '_openedChanged',
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * True if the overlay was canceled when it was last closed.
       */
      canceled: {
        observer: '_canceledChanged',
        readOnly: true,
        type: Boolean,
        value: false
      },

      /**
       * Set to true to display a backdrop behind the overlay.
       */
      withBackdrop: {
        observer: '_withBackdropChanged',
        type: Boolean
      },

      /**
       * Set to true to disable auto-focusing the overlay or child nodes with
       * the `autofocus` attribute` when the overlay is opened.
       */
      noAutoFocus: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay with the ESC key.
       */
      noCancelOnEscKey: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay by clicking outside it.
       */
      noCancelOnOutsideClick: {
        type: Boolean,
        value: false
      },

      /**
       * Returns the reason this dialog was last closed.
       */
      closingReason: {
        // was a getter before, but needs to be a property so other
        // behaviors can override this.
        type: Object
      },

      /**
       * The HTMLElement that will be firing relevant KeyboardEvents.
       * Used for capturing esc and tab. Overridden from `IronA11yKeysBehavior`.
       */
      keyEventTarget: {
        type: Object,
        value: document
      },

      /**
       * Set to true to enable restoring of focus when overlay is closed.
       */
      restoreFocusOnClose: {
        type: Boolean,
        value: false
      },

      _manager: {
        type: Object,
        value: Polymer.IronOverlayManager
      },

      _boundOnCaptureClick: {
        type: Function,
        value: function() {
          return this._onCaptureClick.bind(this);
        }
      },

      _boundOnCaptureFocus: {
        type: Function,
        value: function() {
          return this._onCaptureFocus.bind(this);
        }
      },

      /**
       * The node being focused.
       * @type {?Node}
       */
      _focusedChild: {
        type: Object
      }

    },

    keyBindings: {
      'esc': '__onEsc',
      'tab': '__onTab'
    },

    listeners: {
      'iron-resize': '_onIronResize'
    },

    /**
     * The backdrop element.
     * @type {Node}
     */
    get backdropElement() {
      return this._manager.backdropElement;
    },

    /**
     * Returns the node to give focus to.
     * @type {Node}
     */
    get _focusNode() {
      return this._focusedChild || Polymer.dom(this).querySelector('[autofocus]') || this;
    },

    /**
     * Array of nodes that can receive focus (overlay included), ordered by `tabindex`.
     * This is used to retrieve which is the first and last focusable nodes in order
     * to wrap the focus for overlays `with-backdrop`.
     *
     * If you know what is your content (specifically the first and last focusable children),
     * you can override this method to return only `[firstFocusable, lastFocusable];`
     * @type {[Node]}
     * @protected
     */
    get _focusableNodes() {
      // Elements that can be focused even if they have [disabled] attribute.
      var FOCUSABLE_WITH_DISABLED = [
        'a[href]',
        'area[href]',
        'iframe',
        '[tabindex]',
        '[contentEditable=true]'
      ];

      // Elements that cannot be focused if they have [disabled] attribute.
      var FOCUSABLE_WITHOUT_DISABLED = [
        'input',
        'select',
        'textarea',
        'button'
      ];

      // Discard elements with tabindex=-1 (makes them not focusable).
      var selector = FOCUSABLE_WITH_DISABLED.join(':not([tabindex="-1"]),') +
        ':not([tabindex="-1"]),' +
        FOCUSABLE_WITHOUT_DISABLED.join(':not([disabled]):not([tabindex="-1"]),') +
        ':not([disabled]):not([tabindex="-1"])';

      var focusables = Polymer.dom(this).querySelectorAll(selector);
      if (this.tabIndex >= 0) {
        // Insert at the beginning because we might have all elements with tabIndex = 0,
        // and the overlay should be the first of the list.
        focusables.splice(0, 0, this);
      }
      // Sort by tabindex.
      return focusables.sort(function (a, b) {
        if (a.tabIndex === b.tabIndex) {
          return 0;
        }
        if (a.tabIndex === 0 || a.tabIndex > b.tabIndex) {
          return 1;
        }
        return -1;
      });
    },

    ready: function() {
      // Used to skip calls to notifyResize and refit while the overlay is animating.
      this.__isAnimating = false;
      // with-backdrop needs tabindex to be set in order to trap the focus.
      // If it is not set, IronOverlayBehavior will set it, and remove it if with-backdrop = false.
      this.__shouldRemoveTabIndex = false;
      // Used for wrapping the focus on TAB / Shift+TAB.
      this.__firstFocusableNode = this.__lastFocusableNode = null;
      this._ensureSetup();
    },

    attached: function() {
      // Call _openedChanged here so that position can be computed correctly.
      if (this.opened) {
        this._openedChanged();
      }
      this._observer = Polymer.dom(this).observeNodes(this._onNodesChange);
    },

    detached: function() {
      Polymer.dom(this).unobserveNodes(this._observer);
      this._observer = null;
      this.opened = false;
      this._manager.trackBackdrop(this);
      this._manager.removeOverlay(this);
    },

    /**
     * Toggle the opened state of the overlay.
     */
    toggle: function() {
      this._setCanceled(false);
      this.opened = !this.opened;
    },

    /**
     * Open the overlay.
     */
    open: function() {
      this._setCanceled(false);
      this.opened = true;
    },

    /**
     * Close the overlay.
     */
    close: function() {
      this._setCanceled(false);
      this.opened = false;
    },

    /**
     * Cancels the overlay.
     * @param {?Event} event The original event
     */
    cancel: function(event) {
      var cancelEvent = this.fire('iron-overlay-canceled', event, {cancelable: true});
      if (cancelEvent.defaultPrevented) {
        return;
      }

      this._setCanceled(true);
      this.opened = false;
    },

    _ensureSetup: function() {
      if (this._overlaySetup) {
        return;
      }
      this._overlaySetup = true;
      this.style.outline = 'none';
      this.style.display = 'none';
    },

    _openedChanged: function() {
      if (this.opened) {
        this.removeAttribute('aria-hidden');
      } else {
        this.setAttribute('aria-hidden', 'true');
      }

      // wait to call after ready only if we're initially open
      if (!this._overlaySetup) {
        return;
      }

      this._manager.trackBackdrop(this);

      this.__isAnimating = true;
      if (this.opened) {
        this._prepareRenderOpened();
      }

      if (this._openChangedAsync) {
        this.cancelAsync(this._openChangedAsync);
      }
      // Async here to allow overlay layer to become visible, and to avoid
      // listeners to immediately close via a click.
      this._openChangedAsync = this.async(function() {
        // overlay becomes visible here
        this.style.display = '';
        // Force layout to ensure transition will go. Set offsetWidth to itself
        // so that compilers won't remove it.
        this.offsetWidth = this.offsetWidth;
        if (this.opened) {
          this._renderOpened();
        } else {
          this._renderClosed();
        }
        this._toggleListeners();
        this._openChangedAsync = null;
      }, 1);
    },

    _canceledChanged: function() {
      this.closingReason = this.closingReason || {};
      this.closingReason.canceled = this.canceled;
    },

    _withBackdropChanged: function() {
      // If tabindex is already set, no need to override it.
      if (this.withBackdrop && !this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '-1');
        this.__shouldRemoveTabIndex = true;
      } else if (this.__shouldRemoveTabIndex) {
        this.removeAttribute('tabindex');
        this.__shouldRemoveTabIndex = false;
      }
      if (this.opened) {
        this._manager.trackBackdrop(this);
        if (this.withBackdrop) {
          this.backdropElement.prepare();
          // Give time to be added to document.
          this.async(function(){
            this.backdropElement.open();
          }, 1);
        } else {
          this.backdropElement.close();
        }
      }
    },

    _toggleListener: function(enable, node, event, boundListener, capture) {
      if (enable) {
        // enable document-wide tap recognizer
        if (event === 'tap') {
          Polymer.Gestures.add(document, 'tap', null);
        }
        node.addEventListener(event, boundListener, capture);
      } else {
        // disable document-wide tap recognizer
        if (event === 'tap') {
          Polymer.Gestures.remove(document, 'tap', null);
        }
        node.removeEventListener(event, boundListener, capture);
      }
    },

    _toggleListeners: function() {
      this._toggleListener(this.opened, document, 'tap', this._boundOnCaptureClick, true);
      this._toggleListener(this.opened, document, 'focus', this._boundOnCaptureFocus, true);
    },

    // tasks which must occur before opening; e.g. making the element visible
    _prepareRenderOpened: function() {

      this._manager.addOverlay(this);

      // Needed to calculate the size of the overlay so that transitions on its size
      // will have the correct starting points.
      this._preparePositioning();
      this.refit();
      this._finishPositioning();

      if (this.withBackdrop) {
        this.backdropElement.prepare();
      }

      // Safari will apply the focus to the autofocus element when displayed for the first time,
      // so we blur it. Later, _applyFocus will set the focus if necessary.
      if (this.noAutoFocus && document.activeElement === this._focusNode) {
        this._focusNode.blur();
      }
    },

    // tasks which cause the overlay to actually open; typically play an
    // animation
    _renderOpened: function() {
      if (this.withBackdrop) {
        this.backdropElement.open();
      }
      this._finishRenderOpened();
    },

    _renderClosed: function() {
      if (this.withBackdrop) {
        this.backdropElement.close();
      }
      this._finishRenderClosed();
    },

    _finishRenderOpened: function() {
      // Focus the child node with [autofocus]
      this._applyFocus();

      this.notifyResize();
      this.__isAnimating = false;
      this.fire('iron-overlay-opened');
    },

    _finishRenderClosed: function() {
      // Hide the overlay and remove the backdrop.
      this.style.display = 'none';
      this._manager.removeOverlay(this);

      this._applyFocus();

      this.notifyResize();
      this.__isAnimating = false;
      this.fire('iron-overlay-closed', this.closingReason);
    },

    _preparePositioning: function() {
      this.style.transition = this.style.webkitTransition = 'none';
      this.style.transform = this.style.webkitTransform = 'none';
      this.style.display = '';
    },

    _finishPositioning: function() {
      this.style.display = 'none';
      this.style.transform = this.style.webkitTransform = '';
      // Force layout layout to avoid application of transform.
      // Set offsetWidth to itself so that compilers won't remove it.
      this.offsetWidth = this.offsetWidth;
      this.style.transition = this.style.webkitTransition = '';
    },

    _applyFocus: function() {
      if (this.opened) {
        if (!this.noAutoFocus) {
          this._focusNode.focus();
        }
      } else {
        this._focusNode.blur();
        this._focusedChild = null;
        this._manager.focusOverlay();
      }
    },

    _onCaptureClick: function(event) {
      if (this._manager.currentOverlay() === this &&
          Polymer.dom(event).path.indexOf(this) === -1) {
        if (this.noCancelOnOutsideClick) {
          this._applyFocus();
        } else {
          this.cancel(event);
        }
      }
    },

    _onCaptureFocus: function (event) {
      if (this._manager.currentOverlay() === this && this.withBackdrop) {
        var path = Polymer.dom(event).path;
        if (path.indexOf(this) === -1) {
          event.stopPropagation();
          this._applyFocus();
        } else {
          this._focusedChild = path[0];
        }
      }
    },

    _onIronResize: function() {
      if (this.__isAnimating) {
        return;
      }

      if (this.opened) {
        this.refit();
      }
    },

    /**
     * @protected
     * Will call notifyResize if overlay is opened.
     * Can be overridden in order to avoid multiple observers on the same node.
     */
    _onNodesChange: function() {
      if (this.opened && !this.__isAnimating) {
        this.notifyResize();
      }
      // Store it so we don't query too much.
      var focusableNodes = this._focusableNodes;
      this.__firstFocusableNode = focusableNodes[0];
      this.__lastFocusableNode = focusableNodes[focusableNodes.length - 1];
    },

    __onEsc: function(event) {
      // Not opened or not on top, so return.
      if (this._manager.currentOverlay() !== this) {
        return;
      }
      if (!this.noCancelOnEscKey) {
        this.cancel(event);
      }
    },

    __onTab: function(event) {
      // Not opened or not on top, so return.
      if (this._manager.currentOverlay() !== this) {
        return;
      }
      // TAB wraps from last to first focusable.
      // Shift + TAB wraps from first to last focusable.
      var shift = event.detail.keyboardEvent.shiftKey;
      var nodeToCheck = shift ? this.__firstFocusableNode : this.__lastFocusableNode;
      var nodeToSet = shift ? this.__lastFocusableNode : this.__firstFocusableNode;
      if (this.withBackdrop && this._focusedChild === nodeToCheck) {
        // We set here the _focusedChild so that _onCaptureFocus will handle the
        // wrapping of the focus (the next event after tab is focus).
        this._focusedChild = nodeToSet;
      }
    }
  };

  /** @polymerBehavior */
  Polymer.IronOverlayBehavior = [Polymer.IronA11yKeysBehavior, Polymer.IronFitBehavior, Polymer.IronResizableBehavior, Polymer.IronOverlayBehaviorImpl];

  /**
  * Fired after the `iron-overlay` opens.
  * @event iron-overlay-opened
  */

  /**
  * Fired when the `iron-overlay` is canceled, but before it is closed.
  * Cancel the event to prevent the `iron-overlay` from closing.
  * @event iron-overlay-canceled
  * @param {Event} event The closing of the `iron-overlay` can be prevented
  * by calling `event.preventDefault()`. The `event.detail` is the original event that originated
  * the canceling (e.g. ESC keyboard event or click event outside the `iron-overlay`).
  */

  /**
  * Fired after the `iron-overlay` closes.
  * @event iron-overlay-closed
  * @param {{canceled: (boolean|undefined)}} closingReason Contains `canceled` (whether the overlay was canceled).
  */
/**
Use `Polymer.PaperDialogBehavior` and `paper-dialog-shared-styles.html` to implement a Material Design
dialog.

For example, if `<paper-dialog-impl>` implements this behavior:

    <paper-dialog-impl>
        <h2>Header</h2>
        <div>Dialog body</div>
        <div class="buttons">
            <paper-button dialog-dismiss>Cancel</paper-button>
            <paper-button dialog-confirm>Accept</paper-button>
        </div>
    </paper-dialog-impl>

`paper-dialog-shared-styles.html` provide styles for a header, content area, and an action area for buttons.
Use the `<h2>` tag for the header and the `buttons` class for the action area. You can use the
`paper-dialog-scrollable` element (in its own repository) if you need a scrolling content area.

Use the `dialog-dismiss` and `dialog-confirm` attributes on interactive controls to close the
dialog. If the user dismisses the dialog with `dialog-confirm`, the `closingReason` will update
to include `confirmed: true`.

### Styling

The following custom properties and mixins are available for styling.

Custom property | Description | Default
----------------|-------------|----------
`--paper-dialog-background-color` | Dialog background color                     | `--primary-background-color`
`--paper-dialog-color`            | Dialog foreground color                     | `--primary-text-color`
`--paper-dialog`                  | Mixin applied to the dialog                 | `{}`
`--paper-dialog-title`            | Mixin applied to the title (`<h2>`) element | `{}`
`--paper-dialog-button-color`     | Button area foreground color                | `--default-primary-color`

### Accessibility

This element has `role="dialog"` by default. Depending on the context, it may be more appropriate
to override this attribute with `role="alertdialog"`.

If `modal` is set, the element will set `aria-modal` and prevent the focus from exiting the element.
It will also ensure that focus remains in the dialog.

The `aria-labelledby` attribute will be set to the header element, if one exists.

@hero hero.svg
@demo demo/index.html
@polymerBehavior Polymer.PaperDialogBehavior
*/

  Polymer.PaperDialogBehaviorImpl = {

    hostAttributes: {
      'role': 'dialog',
      'tabindex': '-1'
    },

    properties: {

      /**
       * If `modal` is true, this implies `no-cancel-on-outside-click`, `no-cancel-on-esc-key` and `with-backdrop`.
       */
      modal: {
        type: Boolean,
        value: false
      }

    },

    observers: [
      '_modalChanged(modal, _readied)'
    ],

    listeners: {
      'tap': '_onDialogClick'
    },

    ready: function () {
      // Only now these properties can be read.
      this.__prevNoCancelOnOutsideClick = this.noCancelOnOutsideClick;
      this.__prevNoCancelOnEscKey = this.noCancelOnEscKey;
      this.__prevWithBackdrop = this.withBackdrop;
    },

    attached: function() {
      // this._observer is used by iron-overlay-behavior
      this._ariaObserver = Polymer.dom(this).observeNodes(this._updateAriaLabelledBy);
      this._updateAriaLabelledBy();
    },

    detached: function() {
      Polymer.dom(this).unobserveNodes(this._ariaObserver);
    },

    _modalChanged: function(modal, readied) {
      if (modal) {
        this.setAttribute('aria-modal', 'true');
      } else {
        this.setAttribute('aria-modal', 'false');
      }

      // modal implies noCancelOnOutsideClick, noCancelOnEscKey and withBackdrop.
      // We need to wait for the element to be ready before we can read the
      // properties values.
      if (!readied) {
        return;
      }

      if (modal) {
        this.__prevNoCancelOnOutsideClick = this.noCancelOnOutsideClick;
        this.__prevNoCancelOnEscKey = this.noCancelOnEscKey;
        this.__prevWithBackdrop = this.withBackdrop;
        this.noCancelOnOutsideClick = true;
        this.noCancelOnEscKey = true;
        this.withBackdrop = true;
      } else {
        // If the value was changed to false, let it false.
        this.noCancelOnOutsideClick = this.noCancelOnOutsideClick &&
          this.__prevNoCancelOnOutsideClick;
        this.noCancelOnEscKey = this.noCancelOnEscKey &&
          this.__prevNoCancelOnEscKey;
        this.withBackdrop = this.withBackdrop && this.__prevWithBackdrop;
      }
    },

    _updateAriaLabelledBy: function() {
      var header = Polymer.dom(this).querySelector('h2');
      if (!header) {
        this.removeAttribute('aria-labelledby');
        return;
      }
      var headerId = header.getAttribute('id');
      if (headerId && this.getAttribute('aria-labelledby') === headerId) {
        return;
      }
      // set aria-describedBy to the header element
      var labelledById;
      if (headerId) {
        labelledById = headerId;
      } else {
        labelledById = 'paper-dialog-header-' + new Date().getUTCMilliseconds();
        header.setAttribute('id', labelledById);
      }
      this.setAttribute('aria-labelledby', labelledById);
    },

    _updateClosingReasonConfirmed: function(confirmed) {
      this.closingReason = this.closingReason || {};
      this.closingReason.confirmed = confirmed;
    },

    /**
     * Will dismiss the dialog if user clicked on an element with dialog-dismiss
     * or dialog-confirm attribute.
     */
    _onDialogClick: function(event) {
      // Search for the element with dialog-confirm or dialog-dismiss,
      // from the root target until this (excluded).
      var path = Polymer.dom(event).path;
      for (var i = 0; i < path.indexOf(this); i++) {
        var target = path[i];
        if (target.hasAttribute && (target.hasAttribute('dialog-dismiss') || target.hasAttribute('dialog-confirm'))) {
          this._updateClosingReasonConfirmed(target.hasAttribute('dialog-confirm'));
          this.close();
          event.stopPropagation();
          break;
        }
      }
    }

  };

  /** @polymerBehavior */
  Polymer.PaperDialogBehavior = [Polymer.IronOverlayBehavior, Polymer.PaperDialogBehaviorImpl];
(function() {

  Polymer({

    is: 'paper-dialog',

    behaviors: [
      Polymer.PaperDialogBehavior,
      Polymer.NeonAnimationRunnerBehavior
    ],

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _renderOpened: function() {
      this.cancelAnimation();
      if (this.withBackdrop) {
        this.backdropElement.open();
      }
      this.playAnimation('entry');
    },

    _renderClosed: function() {
      this.cancelAnimation();
      if (this.withBackdrop) {
        this.backdropElement.close();
      }
      this.playAnimation('exit');
    },

    _onNeonAnimationFinish: function() {
      if (this.opened) {
        this._finishRenderOpened();
      } else {
        this._finishRenderClosed();
      }
    }

  });

})();
/**
  Polymer.IronFormElementBehavior enables a custom element to be included
  in an `iron-form`.

  @demo demo/index.html
  @polymerBehavior
  */
  Polymer.IronFormElementBehavior = {

    properties: {
      /**
       * Fired when the element is added to an `iron-form`.
       *
       * @event iron-form-element-register
       */

      /**
       * Fired when the element is removed from an `iron-form`.
       *
       * @event iron-form-element-unregister
       */

      /**
       * The name of this element.
       */
      name: {
        type: String
      },

      /**
       * The value for this element.
       */
      value: {
        notify: true,
        type: String
      },

      /**
       * Set to true to mark the input as required. If used in a form, a
       * custom element that uses this behavior should also use
       * Polymer.IronValidatableBehavior and define a custom validation method.
       * Otherwise, a `required` element will always be considered valid.
       * It's also strongly recommended to provide a visual style for the element
       * when its value is invalid.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The form that the element is registered to.
       */
      _parentForm: {
        type: Object
      }
    },

    attached: function() {
      // Note: the iron-form that this element belongs to will set this
      // element's _parentForm property when handling this event.
      this.fire('iron-form-element-register');
    },

    detached: function() {
      if (this._parentForm) {
        this._parentForm.fire('iron-form-element-unregister', {target: this});
      }
    }

  };
/**
   * `Use Polymer.IronValidatableBehavior` to implement an element that validates user input.
   * Use the related `Polymer.IronValidatorBehavior` to add custom validation logic to an iron-input.
   *
   * By default, an `<iron-form>` element validates its fields when the user presses the submit button.
   * To validate a form imperatively, call the form's `validate()` method, which in turn will
   * call `validate()` on all its children. By using `Polymer.IronValidatableBehavior`, your
   * custom element will get a public `validate()`, which
   * will return the validity of the element, and a corresponding `invalid` attribute,
   * which can be used for styling.
   *
   * To implement the custom validation logic of your element, you must override
   * the protected `_getValidity()` method of this behaviour, rather than `validate()`.
   * See [this](https://github.com/PolymerElements/iron-form/blob/master/demo/simple-element.html)
   * for an example.
   *
   * ### Accessibility
   *
   * Changing the `invalid` property, either manually or by calling `validate()` will update the
   * `aria-invalid` attribute.
   *
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronValidatableBehavior = {

    properties: {

      /**
       * Namespace for this validator.
       */
      validatorType: {
        type: String,
        value: 'validator'
      },

      /**
       * Name of the validator to use.
       */
      validator: {
        type: String
      },

      /**
       * True if the last call to `validate` is invalid.
       */
      invalid: {
        notify: true,
        reflectToAttribute: true,
        type: Boolean,
        value: false
      },

      _validatorMeta: {
        type: Object
      }

    },

    observers: [
      '_invalidChanged(invalid)'
    ],

    get _validator() {
      return this._validatorMeta && this._validatorMeta.byKey(this.validator);
    },

    ready: function() {
      this._validatorMeta = new Polymer.IronMeta({type: this.validatorType});
    },

    _invalidChanged: function() {
      if (this.invalid) {
        this.setAttribute('aria-invalid', 'true');
      } else {
        this.removeAttribute('aria-invalid');
      }
    },

    /**
     * @return {boolean} True if the validator `validator` exists.
     */
    hasValidator: function() {
      return this._validator != null;
    },

    /**
     * Returns true if the `value` is valid, and updates `invalid`. If you want
     * your element to have custom validation logic, do not override this method;
     * override `_getValidity(value)` instead.

     * @param {Object} value The value to be validated. By default, it is passed
     * to the validator's `validate()` function, if a validator is set.
     * @return {boolean} True if `value` is valid.
     */
    validate: function(value) {
      this.invalid = !this._getValidity(value);
      return !this.invalid;
    },

    /**
     * Returns true if `value` is valid.  By default, it is passed
     * to the validator's `validate()` function, if a validator is set. You
     * should override this method if you want to implement custom validity
     * logic for your element.
     *
     * @param {Object} value The value to be validated.
     * @return {boolean} True if `value` is valid.
     */

    _getValidity: function(value) {
      if (this.hasValidator()) {
        return this._validator.validate(value);
      }
      return true;
    }
  };
/*
`<iron-input>` adds two-way binding and custom validators using `Polymer.IronValidatorBehavior`
to `<input>`.

### Two-way binding

By default you can only get notified of changes to an `input`'s `value` due to user input:

    <input value="{{myValue::input}}">

`iron-input` adds the `bind-value` property that mirrors the `value` property, and can be used
for two-way data binding. `bind-value` will notify if it is changed either by user input or by script.

    <input is="iron-input" bind-value="{{myValue}}">

### Custom validators

You can use custom validators that implement `Polymer.IronValidatorBehavior` with `<iron-input>`.

    <input is="iron-input" validator="my-custom-validator">

### Stopping invalid input

It may be desirable to only allow users to enter certain characters. You can use the
`prevent-invalid-input` and `allowed-pattern` attributes together to accomplish this. This feature
is separate from validation, and `allowed-pattern` does not affect how the input is validated.

    <!-- only allow characters that match [0-9] -->
    <input is="iron-input" prevent-invalid-input allowed-pattern="[0-9]">

@hero hero.svg
@demo demo/index.html
*/

  Polymer({

    is: 'iron-input',

    extends: 'input',

    behaviors: [
      Polymer.IronValidatableBehavior
    ],

    properties: {

      /**
       * Use this property instead of `value` for two-way data binding.
       */
      bindValue: {
        observer: '_bindValueChanged',
        type: String
      },

      /**
       * Set to true to prevent the user from entering invalid input. The new input characters are
       * matched with `allowedPattern` if it is set, otherwise it will use the `type` attribute (only
       * supported for `type=number`).
       */
      preventInvalidInput: {
        type: Boolean
      },

      /**
       * Regular expression expressing a set of characters to enforce the validity of input characters.
       * The recommended value should follow this format: `[a-ZA-Z0-9.+-!;:]` that list the characters 
       * allowed as input.
       */
      allowedPattern: {
        type: String,
        observer: "_allowedPatternChanged"
      },

      _previousValidInput: {
        type: String,
        value: ''
      },

      _patternAlreadyChecked: {
        type: Boolean,
        value: false
      }

    },

    listeners: {
      'input': '_onInput',
      'keypress': '_onKeypress'
    },

    get _patternRegExp() {
      var pattern;
      if (this.allowedPattern) {
        pattern = new RegExp(this.allowedPattern);
      } else {
        switch (this.type) {
          case 'number':
            pattern = /[0-9.,e-]/;
            break;
        }
      }
      return pattern;
    },

    ready: function() {
      this.bindValue = this.value;
    },

    /**
     * @suppress {checkTypes}
     */
    _bindValueChanged: function() {
      if (this.value !== this.bindValue) {
        this.value = !(this.bindValue || this.bindValue === 0 || this.bindValue === false) ? '' : this.bindValue;
      }
      // manually notify because we don't want to notify until after setting value
      this.fire('bind-value-changed', {value: this.bindValue});
    },

    _allowedPatternChanged: function() {
      // Force to prevent invalid input when an `allowed-pattern` is set
      this.preventInvalidInput = this.allowedPattern ? true : false;
    },

    _onInput: function() {
      // Need to validate each of the characters pasted if they haven't
      // been validated inside `_onKeypress` already.
      if (this.preventInvalidInput && !this._patternAlreadyChecked) {
        var valid = this._checkPatternValidity();
        if (!valid) {
          this.value = this._previousValidInput;
        }
      }

      this.bindValue = this.value;
      this._previousValidInput = this.value;
      this._patternAlreadyChecked = false;
    },

    _isPrintable: function(event) {
      // What a control/printable character is varies wildly based on the browser.
      // - most control characters (arrows, backspace) do not send a `keypress` event
      //   in Chrome, but the *do* on Firefox
      // - in Firefox, when they do send a `keypress` event, control chars have
      //   a charCode = 0, keyCode = xx (for ex. 40 for down arrow)
      // - printable characters always send a keypress event.
      // - in Firefox, printable chars always have a keyCode = 0. In Chrome, the keyCode
      //   always matches the charCode.
      // None of this makes any sense.

      // For these keys, ASCII code == browser keycode.
      var anyNonPrintable =
        (event.keyCode == 8)   ||  // backspace
        (event.keyCode == 9)   ||  // tab
        (event.keyCode == 13)  ||  // enter
        (event.keyCode == 27);     // escape

      // For these keys, make sure it's a browser keycode and not an ASCII code.
      var mozNonPrintable =
        (event.keyCode == 19)  ||  // pause
        (event.keyCode == 20)  ||  // caps lock
        (event.keyCode == 45)  ||  // insert
        (event.keyCode == 46)  ||  // delete
        (event.keyCode == 144) ||  // num lock
        (event.keyCode == 145) ||  // scroll lock
        (event.keyCode > 32 && event.keyCode < 41)   || // page up/down, end, home, arrows
        (event.keyCode > 111 && event.keyCode < 124); // fn keys

      return !anyNonPrintable && !(event.charCode == 0 && mozNonPrintable);
    },

    _onKeypress: function(event) {
      if (!this.preventInvalidInput && this.type !== 'number') {
        return;
      }
      var regexp = this._patternRegExp;
      if (!regexp) {
        return;
      }

      // Handle special keys and backspace
      if (event.metaKey || event.ctrlKey || event.altKey)
        return;

      // Check the pattern either here or in `_onInput`, but not in both.
      this._patternAlreadyChecked = true;

      var thisChar = String.fromCharCode(event.charCode);
      if (this._isPrintable(event) && !regexp.test(thisChar)) {
        event.preventDefault();
      }
    },

    _checkPatternValidity: function() {
      var regexp = this._patternRegExp;
      if (!regexp) {
        return true;
      }
      for (var i = 0; i < this.value.length; i++) {
        if (!regexp.test(this.value[i])) {
          return false;
        }
      }
      return true;
    },

    /**
     * Returns true if `value` is valid. The validator provided in `validator` will be used first,
     * then any constraints.
     * @return {boolean} True if the value is valid.
     */
    validate: function() {
      // Empty, non-required input is valid.
      if (!this.required && this.value == '') {
        this.invalid = false;
        return true;
      }

      var valid;
      if (this.hasValidator()) {
        valid = Polymer.IronValidatableBehavior.validate.call(this, this.value);
      } else {
        valid = this.checkValidity();
        this.invalid = !valid;
      }
      this.fire('iron-input-validate');
      return valid;
    }

  });

  /*
  The `iron-input-validate` event is fired whenever `validate()` is called.
  @event iron-input-validate
  */
/**
   * Use `Polymer.PaperInputBehavior` to implement inputs with `<paper-input-container>`. This
   * behavior is implemented by `<paper-input>`. It exposes a number of properties from
   * `<paper-input-container>` and `<input is="iron-input">` and they should be bound in your
   * template.
   *
   * The input element can be accessed by the `inputElement` property if you need to access
   * properties or methods that are not exposed.
   * @polymerBehavior Polymer.PaperInputBehavior
   */
  Polymer.PaperInputBehaviorImpl = {
    properties: {
      /**
       * Fired when the input changes due to user interaction.
       *
       * @event change
       */

      /**
       * The label for this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * `<label>`'s content and `hidden` property, e.g.
       * `<label hidden$="[[!label]]">[[label]]</label>` in your `template`
       */
      label: {
        type: String
      },

      /**
       * The value for this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `bindValue`
       * property, or the value property of your input that is `notify:true`.
       */
      value: {
        notify: true,
        type: String
      },

      /**
       * Set to true to disable this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * both the `<paper-input-container>`'s and the input's `disabled` property.
       */
      disabled: {
        type: Boolean,
        value: false
      },

      /**
       * Returns true if the value is invalid. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to both the
       * `<paper-input-container>`'s and the input's `invalid` property.
       *
       * If `autoValidate` is true, the `invalid` attribute is managed automatically,
       * which can clobber attempts to manage it manually.
       */
      invalid: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * Set to true to prevent the user from entering invalid input. If you're
       * using PaperInputBehavior to  implement your own paper-input-like element,
       * bind this to `<input is="iron-input">`'s `preventInvalidInput` property.
       */
      preventInvalidInput: {
        type: Boolean
      },

      /**
       * Set this to specify the pattern allowed by `preventInvalidInput`. If
       * you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `allowedPattern`
       * property.
       */
      allowedPattern: {
        type: String
      },

      /**
       * The type of the input. The supported types are `text`, `number` and `password`.
       * If you're using PaperInputBehavior to implement your own paper-input-like element,
       * bind this to the `<input is="iron-input">`'s `type` property.
       */
      type: {
        type: String
      },

      /**
       * The datalist of the input (if any). This should match the id of an existing `<datalist>`.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `list` property.
       */
      list: {
        type: String
      },

      /**
       * A pattern to validate the `input` with. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `pattern` property.
       */
      pattern: {
        type: String
      },

      /**
       * Set to true to mark the input as required. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `required` property.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The error message to display when the input is invalid. If you're using
       * PaperInputBehavior to implement your own paper-input-like element,
       * bind this to the `<paper-input-error>`'s content, if using.
       */
      errorMessage: {
        type: String
      },

      /**
       * Set to true to show a character counter.
       */
      charCounter: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable the floating label. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `noLabelFloat` property.
       */
      noLabelFloat: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to always float the label. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `alwaysFloatLabel` property.
       */
      alwaysFloatLabel: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to auto-validate the input value. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `autoValidate` property.
       */
      autoValidate: {
        type: Boolean,
        value: false
      },

      /**
       * Name of the validator to use. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `validator` property.
       */
      validator: {
        type: String
      },

      // HTMLInputElement attributes for binding if needed

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocomplete` property.
       */
      autocomplete: {
        type: String,
        value: 'off'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autofocus` property.
       */
      autofocus: {
        type: Boolean
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `inputmode` property.
       */
      inputmode: {
        type: String
      },

      /**
       * The minimum length of the input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `minlength` property.
       */
      minlength: {
        type: Number
      },

      /**
       * The maximum length of the input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `maxlength` property.
       */
      maxlength: {
        type: Number
      },

      /**
       * The minimum (numeric or date-time) input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `min` property.
       */
      min: {
        type: String
      },

      /**
       * The maximum (numeric or date-time) input value.
       * Can be a String (e.g. `"2000-1-1"`) or a Number (e.g. `2`).
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `max` property.
       */
      max: {
        type: String
      },

      /**
       * Limits the numeric or date-time increments.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `step` property.
       */
      step: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `name` property.
       */
      name: {
        type: String
      },

      /**
       * A placeholder string in addition to the label. If this is set, the label will always float.
       */
      placeholder: {
        type: String,
        // need to set a default so _computeAlwaysFloatLabel is run
        value: ''
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `readonly` property.
       */
      readonly: {
        type: Boolean,
        value: false
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `size` property.
       */
      size: {
        type: Number
      },

      // Nonstandard attributes for binding if needed

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocapitalize` property.
       */
      autocapitalize: {
        type: String,
        value: 'none'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocorrect` property.
       */
      autocorrect: {
        type: String,
        value: 'off'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autosave` property,
       * used with type=search.
       */
      autosave: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `results` property,
       * used with type=search.
       */
      results: {
        type: Number
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `accept` property,
       * used with type=file.
       */
      accept: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the`<input is="iron-input">`'s `multiple` property,
       * used with type=file.
       */
      multiple: {
        type: Boolean
      },

      _ariaDescribedBy: {
        type: String,
        value: ''
      },

      _ariaLabelledBy: {
        type: String,
        value: ''
      }

    },

    listeners: {
      'addon-attached': '_onAddonAttached',
    },

    keyBindings: {
      'shift+tab:keydown': '_onShiftTabDown'
    },

    hostAttributes: {
      tabindex: 0
    },

    /**
     * Returns a reference to the input element.
     */
    get inputElement() {
      return this.$.input;
    },

    /**
     * Returns a reference to the focusable element.
     */
    get _focusableElement() {
      return this.inputElement;
    },

    registered: function() {
      // These types have some default placeholder text; overlapping
      // the label on top of it looks terrible. Auto-float the label in this case.
      this._typesThatHaveText = ["date", "datetime", "datetime-local", "month",
          "time", "week", "file"];
    },

    attached: function() {
      this._updateAriaLabelledBy();

      if (this.inputElement &&
          this._typesThatHaveText.indexOf(this.inputElement.type) !== -1) {
        this.alwaysFloatLabel = true;
      }
    },

    _appendStringWithSpace: function(str, more) {
      if (str) {
        str = str + ' ' + more;
      } else {
        str = more;
      }
      return str;
    },

    _onAddonAttached: function(event) {
      var target = event.path ? event.path[0] : event.target;
      if (target.id) {
        this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, target.id);
      } else {
        var id = 'paper-input-add-on-' + Math.floor((Math.random() * 100000));
        target.id = id;
        this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, id);
      }
    },

    /**
     * Validates the input element and sets an error style if needed.
     *
     * @return {boolean}
     */
    validate: function() {
      return this.inputElement.validate();
    },

    /**
     * Forward focus to inputElement. Overriden from IronControlState.
     */
    _focusBlurHandler: function(event) {
      if (this._shiftTabPressed)
        return;

      Polymer.IronControlState._focusBlurHandler.call(this, event);

      // Forward the focus to the nested input.
      if (this.focused)
        this._focusableElement.focus();
    },

    /**
     * Handler that is called when a shift+tab keypress is detected by the menu.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onShiftTabDown: function(event) {
      var oldTabIndex = this.getAttribute('tabindex');
      this._shiftTabPressed = true;
      this.setAttribute('tabindex', '-1');
      this.async(function() {
        this.setAttribute('tabindex', oldTabIndex);
        this._shiftTabPressed = false;
      }, 1);
    },

    /**
     * If `autoValidate` is true, then validates the element.
     */
    _handleAutoValidate: function() {
      if (this.autoValidate)
        this.validate();
    },

    /**
     * Restores the cursor to its original position after updating the value.
     * @param {string} newValue The value that should be saved.
     */
    updateValueAndPreserveCaret: function(newValue) {
      // Not all elements might have selection, and even if they have the
      // right properties, accessing them might throw an exception (like for
      // <input type=number>)
      try {
        var start = this.inputElement.selectionStart;
        this.value = newValue;

        // The cursor automatically jumps to the end after re-setting the value,
        // so restore it to its original position.
        this.inputElement.selectionStart = start;
        this.inputElement.selectionEnd = start;
      } catch (e) {
        // Just set the value and give up on the caret.
        this.value = newValue;
      }
    },

    _computeAlwaysFloatLabel: function(alwaysFloatLabel, placeholder) {
      return placeholder || alwaysFloatLabel;
    },

    _updateAriaLabelledBy: function() {
      var label = Polymer.dom(this.root).querySelector('label');
      if (!label) {
        this._ariaLabelledBy = '';
        return;
      }
      var labelledBy;
      if (label.id) {
        labelledBy = label.id;
      } else {
        labelledBy = 'paper-input-label-' + new Date().getUTCMilliseconds();
        label.id = labelledBy;
      }
      this._ariaLabelledBy = labelledBy;
    },

    _onChange:function(event) {
      // In the Shadow DOM, the `change` event is not leaked into the
      // ancestor tree, so we must do this manually.
      // See https://w3c.github.io/webcomponents/spec/shadow/#events-that-are-not-leaked-into-ancestor-trees.
      if (this.shadowRoot) {
        this.fire(event.type, {sourceEvent: event}, {
          node: this,
          bubbles: event.bubbles,
          cancelable: event.cancelable
        });
      }
    }
  };

  /** @polymerBehavior */
  Polymer.PaperInputBehavior = [
    Polymer.IronControlState,
    Polymer.IronA11yKeysBehavior,
    Polymer.PaperInputBehaviorImpl
  ];
/**
   * Use `Polymer.PaperInputAddonBehavior` to implement an add-on for `<paper-input-container>`. A
   * add-on appears below the input, and may display information based on the input value and
   * validity such as a character counter or an error message.
   * @polymerBehavior
   */
  Polymer.PaperInputAddonBehavior = {

    hostAttributes: {
      'add-on': ''
    },

    attached: function() {
      this.fire('addon-attached');
    },

    /**
     * The function called by `<paper-input-container>` when the input value or validity changes.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
    }

  };
Polymer({
    is: 'paper-input-char-counter',

    behaviors: [
      Polymer.PaperInputAddonBehavior
    ],

    properties: {
      _charCounterStr: {
        type: String,
        value: '0'
      }
    },

    /**
     * This overrides the update function in PaperInputAddonBehavior.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
      if (!state.inputElement) {
        return;
      }

      state.value = state.value || '';

      var counter = state.value.length.toString();

      if (state.inputElement.hasAttribute('maxlength')) {
        counter += '/' + state.inputElement.getAttribute('maxlength');
      }

      this._charCounterStr = counter;
    }
  });
Polymer({
    is: 'paper-input-container',

    properties: {
      /**
       * Set to true to disable the floating label. The label disappears when the input value is
       * not null.
       */
      noLabelFloat: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to always float the floating label.
       */
      alwaysFloatLabel: {
        type: Boolean,
        value: false
      },

      /**
       * The attribute to listen for value changes on.
       */
      attrForValue: {
        type: String,
        value: 'bind-value'
      },

      /**
       * Set to true to auto-validate the input value when it changes.
       */
      autoValidate: {
        type: Boolean,
        value: false
      },

      /**
       * True if the input is invalid. This property is set automatically when the input value
       * changes if auto-validating, or when the `iron-input-validate` event is heard from a child.
       */
      invalid: {
        observer: '_invalidChanged',
        type: Boolean,
        value: false
      },

      /**
       * True if the input has focus.
       */
      focused: {
        readOnly: true,
        type: Boolean,
        value: false,
        notify: true
      },

      _addons: {
        type: Array
        // do not set a default value here intentionally - it will be initialized lazily when a
        // distributed child is attached, which may occur before configuration for this element
        // in polyfill.
      },

      _inputHasContent: {
        type: Boolean,
        value: false
      },

      _inputSelector: {
        type: String,
        value: 'input,textarea,.paper-input-input'
      },

      _boundOnFocus: {
        type: Function,
        value: function() {
          return this._onFocus.bind(this);
        }
      },

      _boundOnBlur: {
        type: Function,
        value: function() {
          return this._onBlur.bind(this);
        }
      },

      _boundOnInput: {
        type: Function,
        value: function() {
          return this._onInput.bind(this);
        }
      },

      _boundValueChanged: {
        type: Function,
        value: function() {
          return this._onValueChanged.bind(this);
        }
      }
    },

    listeners: {
      'addon-attached': '_onAddonAttached',
      'iron-input-validate': '_onIronInputValidate'
    },

    get _valueChangedEvent() {
      return this.attrForValue + '-changed';
    },

    get _propertyForValue() {
      return Polymer.CaseMap.dashToCamelCase(this.attrForValue);
    },

    get _inputElement() {
      return Polymer.dom(this).querySelector(this._inputSelector);
    },

    get _inputElementValue() {
      return this._inputElement[this._propertyForValue] || this._inputElement.value;
    },

    ready: function() {
      if (!this._addons) {
        this._addons = [];
      }
      this.addEventListener('focus', this._boundOnFocus, true);
      this.addEventListener('blur', this._boundOnBlur, true);
      if (this.attrForValue) {
        this._inputElement.addEventListener(this._valueChangedEvent, this._boundValueChanged);
      } else {
        this.addEventListener('input', this._onInput);
      }
    },

    attached: function() {
      // Only validate when attached if the input already has a value.
      if (this._inputElementValue != '') {
        this._handleValueAndAutoValidate(this._inputElement);
      } else {
        this._handleValue(this._inputElement);
      }
    },

    _onAddonAttached: function(event) {
      if (!this._addons) {
        this._addons = [];
      }
      var target = event.target;
      if (this._addons.indexOf(target) === -1) {
        this._addons.push(target);
        if (this.isAttached) {
          this._handleValue(this._inputElement);
        }
      }
    },

    _onFocus: function() {
      this._setFocused(true);
    },

    _onBlur: function() {
      this._setFocused(false);
      this._handleValueAndAutoValidate(this._inputElement);
    },

    _onInput: function(event) {
      this._handleValueAndAutoValidate(event.target);
    },

    _onValueChanged: function(event) {
      this._handleValueAndAutoValidate(event.target);
    },

    _handleValue: function(inputElement) {
      var value = this._inputElementValue;

      // type="number" hack needed because this.value is empty until it's valid
      if (value || value === 0 || (inputElement.type === 'number' && !inputElement.checkValidity())) {
        this._inputHasContent = true;
      } else {
        this._inputHasContent = false;
      }

      this.updateAddons({
        inputElement: inputElement,
        value: value,
        invalid: this.invalid
      });
    },

    _handleValueAndAutoValidate: function(inputElement) {
      if (this.autoValidate) {
        var valid;
        if (inputElement.validate) {
          valid = inputElement.validate(this._inputElementValue);
        } else {
          valid = inputElement.checkValidity();
        }
        this.invalid = !valid;
      }

      // Call this last to notify the add-ons.
      this._handleValue(inputElement);
    },

    _onIronInputValidate: function(event) {
      this.invalid = this._inputElement.invalid;
    },

    _invalidChanged: function() {
      if (this._addons) {
        this.updateAddons({invalid: this.invalid});
      }
    },

    /**
     * Call this to update the state of add-ons.
     * @param {Object} state Add-on state.
     */
    updateAddons: function(state) {
      for (var addon, index = 0; addon = this._addons[index]; index++) {
        addon.update(state);
      }
    },

    _computeInputContentClass: function(noLabelFloat, alwaysFloatLabel, focused, invalid, _inputHasContent) {
      var cls = 'input-content';
      if (!noLabelFloat) {
        var label = this.querySelector('label');

        if (alwaysFloatLabel || _inputHasContent) {
          cls += ' label-is-floating';
          // If the label is floating, ignore any offsets that may have been
          // applied from a prefix element.
          this.$.labelAndInputContainer.style.position = 'static';

          if (invalid) {
            cls += ' is-invalid';
          } else if (focused) {
            cls += " label-is-highlighted";
          }
        } else {
          // When the label is not floating, it should overlap the input element.
          if (label) {
            this.$.labelAndInputContainer.style.position = 'relative';
          }
        }
      } else {
        if (_inputHasContent) {
          cls += ' label-is-hidden';
        }
      }
      return cls;
    },

    _computeUnderlineClass: function(focused, invalid) {
      var cls = 'underline';
      if (invalid) {
        cls += ' is-invalid';
      } else if (focused) {
        cls += ' is-highlighted'
      }
      return cls;
    },

    _computeAddOnContentClass: function(focused, invalid) {
      var cls = 'add-on-content';
      if (invalid) {
        cls += ' is-invalid';
      } else if (focused) {
        cls += ' is-highlighted'
      }
      return cls;
    }
  });
Polymer({
    is: 'paper-input-error',

    behaviors: [
      Polymer.PaperInputAddonBehavior
    ],

    properties: {
      /**
       * True if the error is showing.
       */
      invalid: {
        readOnly: true,
        reflectToAttribute: true,
        type: Boolean
      }
    },

    /**
     * This overrides the update function in PaperInputAddonBehavior.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
      this._setInvalid(state.invalid);
    }
  });
Polymer({
    is: 'paper-input',

    behaviors: [
      Polymer.IronFormElementBehavior,
      Polymer.PaperInputBehavior
    ]
  });
(function(document, Polymer){
            "use strict";
            
            Polymer({
                is: "p-storyControl",
                properties: {
                    title: String
                },
                listeners: {
                    "todoAccept.tap": "addTodo",
                    "todoCancel.tap": "resetInput"
                },
                generateId: function(){
                    return Math.random();
                },
                addTodo: function(e, detail){
                    var todo = {
                        id: this.generateId(),
                        title: this.$.inputTitle.value,
                        description: this.$.inputDescription.value
                    };
                    this.fire("addTodo", todo);
                    this.resetInput();
                },
                resetInput: function(){
                    this.$.inputTitle.value = "";
                    this.$.inputDescription.value = "";
                }
            });
        })(document, Polymer);
Polymer({

    is: 'iron-collapse',

    behaviors: [
      Polymer.IronResizableBehavior
    ],

    properties: {

      /**
       * If true, the orientation is horizontal; otherwise is vertical.
       *
       * @attribute horizontal
       */
      horizontal: {
        type: Boolean,
        value: false,
        observer: '_horizontalChanged'
      },

      /**
       * Set opened to true to show the collapse element and to false to hide it.
       *
       * @attribute opened
       */
      opened: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_openedChanged'
      },

      /**
       * Set noAnimation to true to disable animations
       *
       * @attribute noAnimation
       */
      noAnimation: {
        type: Boolean
      },

    },

    get dimension() {
      return this.horizontal ? 'width' : 'height';
    },

    hostAttributes: {
      role: 'group',
      'aria-hidden': 'true',
      'aria-expanded': 'false'
    },

    listeners: {
      transitionend: '_transitionEnd'
    },

    attached: function() {
      // It will take care of setting correct classes and styles.
      this._transitionEnd();
    },

    /**
     * Toggle the opened state.
     *
     * @method toggle
     */
    toggle: function() {
      this.opened = !this.opened;
    },

    show: function() {
      this.opened = true;
    },

    hide: function() {
      this.opened = false;
    },

    updateSize: function(size, animated) {
      // No change!
      if (this.style[this.dimension] === size) {
        return;
      }

      this._updateTransition(false);
      // If we can animate, must do some prep work.
      if (animated && !this.noAnimation) {
        // Animation will start at the current size.
        var startSize = this._calcSize();
        // For `auto` we must calculate what is the final size for the animation.
        // After the transition is done, _transitionEnd will set the size back to `auto`.
        if (size === 'auto') {
          this.style[this.dimension] = size;
          size = this._calcSize();
        }
        // Go to startSize without animation.
        this.style[this.dimension] = startSize;
        // Force layout to ensure transition will go. Set offsetHeight to itself
        // so that compilers won't remove it.
        this.offsetHeight = this.offsetHeight;
        // Enable animation.
        this._updateTransition(true);
      }
      // Set the final size.
      this.style[this.dimension] = size;
    },

    /**
     * enableTransition() is deprecated, but left over so it doesn't break existing code.
     * Please use `noAnimation` property instead.
     *
     * @method enableTransition
     * @deprecated since version 1.0.4
     */
    enableTransition: function(enabled) {
      console.warn('`enableTransition()` is deprecated, use `noAnimation` instead.');
      this.noAnimation = !enabled;
    },

    _updateTransition: function(enabled) {
      this.style.transitionDuration = (enabled && !this.noAnimation) ? '' : '0s';
    },

    _horizontalChanged: function() {
      this.style.transitionProperty = this.dimension;
      var otherDimension = this.dimension === 'width' ? 'height' : 'width';
      this.style[otherDimension] = '';
      this.updateSize(this.opened ? 'auto' : '0px', false);
    },

    _openedChanged: function() {
      this.setAttribute('aria-expanded', this.opened);
      this.setAttribute('aria-hidden', !this.opened);

      this.toggleClass('iron-collapse-closed', false);
      this.toggleClass('iron-collapse-opened', false);
      this.updateSize(this.opened ? 'auto' : '0px', true);

      // Focus the current collapse.
      if (this.opened) {
        this.focus();
      }
      if (this.noAnimation) {
        this._transitionEnd();
      }
    },

    _transitionEnd: function() {
      if (this.opened) {
        this.style[this.dimension] = 'auto';
      }
      this.toggleClass('iron-collapse-closed', !this.opened);
      this.toggleClass('iron-collapse-opened', this.opened);
      this._updateTransition(false);
      this.notifyResize();
    },

    _calcSize: function() {
      return this.getBoundingClientRect()[this.dimension] + 'px';
    }

  });
(function (document, Polymer) {
            "use strict";

            Polymer({
                is: "p-toolbar",
                properties: {
                    title: String
                }
            });
        })(document, Polymer);
Polymer({

      is: 'iron-icon',

      properties: {

        /**
         * The name of the icon to use. The name should be of the form:
         * `iconset_name:icon_name`.
         */
        icon: {
          type: String,
          observer: '_iconChanged'
        },

        /**
         * The name of the theme to used, if one is specified by the
         * iconset.
         */
        theme: {
          type: String,
          observer: '_updateIcon'
        },

        /**
         * If using iron-icon without an iconset, you can set the src to be
         * the URL of an individual icon image file. Note that this will take
         * precedence over a given icon attribute.
         */
        src: {
          type: String,
          observer: '_srcChanged'
        },

        /**
         * @type {!Polymer.IronMeta}
         */
        _meta: {
          value: Polymer.Base.create('iron-meta', {type: 'iconset'}),
          observer: '_updateIcon'
        }

      },

      _DEFAULT_ICONSET: 'icons',

      _iconChanged: function(icon) {
        var parts = (icon || '').split(':');
        this._iconName = parts.pop();
        this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
        this._updateIcon();
      },

      _srcChanged: function(src) {
        this._updateIcon();
      },

      _usesIconset: function() {
        return this.icon || !this.src;
      },

      /** @suppress {visibility} */
      _updateIcon: function() {
        if (this._usesIconset()) {
          if (this._img && this._img.parentNode) {
            Polymer.dom(this.root).removeChild(this._img);
          }
          if (this._iconName === "") {
            if (this._iconset) {
              this._iconset.removeIcon(this);
            }
          } else if (this._iconsetName && this._meta) {
            this._iconset = /** @type {?Polymer.Iconset} */ (
              this._meta.byKey(this._iconsetName));
            if (this._iconset) {
              this._iconset.applyIcon(this, this._iconName, this.theme);
              this.unlisten(window, 'iron-iconset-added', '_updateIcon');
            } else {
              this.listen(window, 'iron-iconset-added', '_updateIcon');
            }
          }
        } else {
          if (this._iconset) {
            this._iconset.removeIcon(this);
          }
          if (!this._img) {
            this._img = document.createElement('img');
            this._img.style.width = '100%';
            this._img.style.height = '100%';
            this._img.draggable = false;
          }
          this._img.src = this.src;
          Polymer.dom(this.root).appendChild(this._img);
        }
      }

    });
/**
   * The `iron-iconset-svg` element allows users to define their own icon sets
   * that contain svg icons. The svg icon elements should be children of the
   * `iron-iconset-svg` element. Multiple icons should be given distinct id's.
   *
   * Using svg elements to create icons has a few advantages over traditional
   * bitmap graphics like jpg or png. Icons that use svg are vector based so
   * they are resolution independent and should look good on any device. They
   * are stylable via css. Icons can be themed, colorized, and even animated.
   *
   * Example:
   *
   *     <iron-iconset-svg name="my-svg-icons" size="24">
   *       <svg>
   *         <defs>
   *           <g id="shape">
   *             <rect x="12" y="0" width="12" height="24" />
   *             <circle cx="12" cy="12" r="12" />
   *           </g>
   *         </defs>
   *       </svg>
   *     </iron-iconset-svg>
   *
   * This will automatically register the icon set "my-svg-icons" to the iconset
   * database.  To use these icons from within another element, make a
   * `iron-iconset` element and call the `byId` method
   * to retrieve a given iconset. To apply a particular icon inside an
   * element use the `applyIcon` method. For example:
   *
   *     iconset.applyIcon(iconNode, 'car');
   *
   * @element iron-iconset-svg
   * @demo demo/index.html
   * @implements {Polymer.Iconset}
   */
  Polymer({
    is: 'iron-iconset-svg',

    properties: {

      /**
       * The name of the iconset.
       */
      name: {
        type: String,
        observer: '_nameChanged'
      },

      /**
       * The size of an individual icon. Note that icons must be square.
       */
      size: {
        type: Number,
        value: 24
      }

    },

    attached: function() {
      this.style.display = 'none';
    },

    /**
     * Construct an array of all icon names in this iconset.
     *
     * @return {!Array} Array of icon names.
     */
    getIconNames: function() {
      this._icons = this._createIconMap();
      return Object.keys(this._icons).map(function(n) {
        return this.name + ':' + n;
      }, this);
    },

    /**
     * Applies an icon to the given element.
     *
     * An svg icon is prepended to the element's shadowRoot if it exists,
     * otherwise to the element itself.
     *
     * @method applyIcon
     * @param {Element} element Element to which the icon is applied.
     * @param {string} iconName Name of the icon to apply.
     * @return {?Element} The svg element which renders the icon.
     */
    applyIcon: function(element, iconName) {
      // insert svg element into shadow root, if it exists
      element = element.root || element;
      // Remove old svg element
      this.removeIcon(element);
      // install new svg element
      var svg = this._cloneIcon(iconName);
      if (svg) {
        var pde = Polymer.dom(element);
        pde.insertBefore(svg, pde.childNodes[0]);
        return element._svgIcon = svg;
      }
      return null;
    },

    /**
     * Remove an icon from the given element by undoing the changes effected
     * by `applyIcon`.
     *
     * @param {Element} element The element from which the icon is removed.
     */
    removeIcon: function(element) {
      // Remove old svg element
      if (element._svgIcon) {
        Polymer.dom(element).removeChild(element._svgIcon);
        element._svgIcon = null;
      }
    },

    /**
     *
     * When name is changed, register iconset metadata
     *
     */
    _nameChanged: function() {
      new Polymer.IronMeta({type: 'iconset', key: this.name, value: this});
      this.async(function() {
        this.fire('iron-iconset-added', this, {node: window});
      });
    },

    /**
     * Create a map of child SVG elements by id.
     *
     * @return {!Object} Map of id's to SVG elements.
     */
    _createIconMap: function() {
      // Objects chained to Object.prototype (`{}`) have members. Specifically,
      // on FF there is a `watch` method that confuses the icon map, so we
      // need to use a null-based object here.
      var icons = Object.create(null);
      Polymer.dom(this).querySelectorAll('[id]')
        .forEach(function(icon) {
          icons[icon.id] = icon;
        });
      return icons;
    },

    /**
     * Produce installable clone of the SVG element matching `id` in this
     * iconset, or `undefined` if there is no matching element.
     *
     * @return {Element} Returns an installable clone of the SVG element
     * matching `id`.
     */
    _cloneIcon: function(id) {
      // create the icon map on-demand, since the iconset itself has no discrete
      // signal to know when it's children are fully parsed
      this._icons = this._icons || this._createIconMap();
      return this._prepareSvgClone(this._icons[id], this.size);
    },

    /**
     * @param {Element} sourceSvg
     * @param {number} size
     * @return {Element}
     */
    _prepareSvgClone: function(sourceSvg, size) {
      if (sourceSvg) {
        var content = sourceSvg.cloneNode(true),
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
            viewBox = content.getAttribute('viewBox') || '0 0 ' + size + ' ' + size;
        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        // TODO(dfreedm): `pointer-events: none` works around https://crbug.com/370136
        // TODO(sjmiles): inline style may not be ideal, but avoids requiring a shadow-root
        svg.style.cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';
        svg.appendChild(content).removeAttribute('id');
        return svg;
      }
      return null;
    }

  });
(function (document, Polymer) {
            "use strict";

            Polymer({
                is: "p-toggleIcon",
                properties: {
                    open: Boolean 
                }
            });
        })(document, Polymer);
(function (document, Polymer) {
            "use strict";

            Polymer({
                is: "p-toggleCollapse",
                properties: {
                    title: String
                },
                toggleStyle: function(open){
                    if(open){
                        this.customStyle["--toggle-open-visible"] = "hidden";
                        this.customStyle["--toggle-closed-visible"] = "visible";
                    }else{
                        this.customStyle["--toggle-open-visible"] = "visible";
                        this.customStyle["--toggle-closed-visible"] = "hidden";
                    }
                    this.updateStyles();
                },
                toggle: function(){
                    this.$.collapse.toggle();
                    if(this.$.collapse.opened){
                        this.toggleStyle(true);
                    }else{
                        this.toggleStyle(false);
                    }
                }
            });
        })(document, Polymer);
(function (document, Polymer) {
            "use strict";

            var STATUS = {
                TODO: "Todo",
                DONE: "Done",
                TEST: "Ready for Test",
                BLOCKED: "Road Blocked",
                PROGRESS: "In Progress"
            };

            Polymer({
                is: "p-todo",
                properties: {
                    id: Number,
                    title: String,
                    content: String,
                    status: {
                        type: String,
                        notify: true,
                        value: STATUS.PROGRESS
                    },
                    color: {
                        type: String,
                        notify: false,
                        value: "green"
                    }
                },
                handleClick: function (e, detail) {
                    console.log(e.target.id === "done", detail);
                    this.updateStatus(e.target.id);
                },
                updateStatus: function (newStatus) {
                    if (!!newStatus) {
                        switch (newStatus) {
                        case "Done":
                        case "done":
                            this.status = STATUS.DONE;
                            this.customStyle["--card-status-color"] = "green";
                            this.updateStyles();
                            break;
                        case "Ready to Test":
                        case "test":
                            this.status = STATUS.TEST;
                            this.customStyle["--card-status-color"] = "blue";
                            this.updateStyles();
                            break;
                        case "In Progress":
                            this.status = STATUS.PROGRESS
                            this.customStyle["--card-status-color"] = "yellow";
                            this.updateStyles();
                            break;
                        case "blocked":
                            this.status = STATUS.BLOCKED;
                            this.customStyle["--card-status-color"] = "red";
                            this.updateStyles();
                            break;
                        default:
                            this.status = STATUS.TODO;
                            this.customStyle["--card-status-color"] = "green";
                            this.updateStyles();
                            break;
                        }
                    }
                }
            });
        })(document, Polymer);
(function(document, Polymer){
            "use strict";
            
            Polymer({
                is: "p-storySection",
                listeners: {
                    "droparea.on-drop": "onDrop",
                    "droparea.on-dragover": "allowDrop"
                },
                onDrop: function(event){
                    console.log("Story:OnDrop",event);
                    event.preventDefault();
                    var data = event.dataTransfer.getData("text");
                    document.getElementById(data).updateStatus(this.title);
                },
                allowDrop: function(event){
                    console.log("AllowDrop");
                    event.preventDefault();
                },
                addTodo: function(item){
                    var newTodo = document.createElement("p-todo");
                    newTodo.id = item.id;
                    newTodo.title = item.title;
                    newTodo.content = item.description;
                    console.log("droparea", this.$.droparea);
                    this.$.droparea.addChild(newTodo);
                }
            });
        })(document, Polymer);
(function (document, Polymer) {
            "use strict";

            Polymer({
                is: "p-story",
                properties: {
                    title: String
                },
                ready: function(){
                    this.$.storyControl.addEventListener("addTodo", this.addTodo);
                },
                addTodo: function(event){
                    var todo = event.detail;
                    var todoSection = document.querySelector("#todoSection");
                    console.log("addTodo", todo);
                    console.log("todoSection", todoSection);
                    todoSection.addTodo(todo);
                }
            });
        })(document, Polymer);