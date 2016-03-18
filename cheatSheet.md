Web Components Cheat Sheet
===

Registering a new Element
```javascript
document.registerElement("my-hello", {prototype: Object.create(HTMLElement.prototype, {})});
```

Cloning a Template
```javascript
var template = document.querySelector("#exampleTemplate");
var clone = document.importNode(template.content, true);
var shadowRoot = document.querySelector("#root").createShadowRoot();
```


Polymer
---


X-Tag
---


Bosonic
---

