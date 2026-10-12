/*!
BSD 3-Clause License

Copyright (c) 2017 Google LLC. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: f, getOwnPropertySymbols: p, getPrototypeOf: m } = Object, h = globalThis, ee = h.trustedTypes, te = ee ? ee.emptyScript : "", ne = h.reactiveElementPolyfillSupport, g = (e, t) => e, _ = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? te : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, re = (e, t) => !l(e, t), ie = {
	attribute: !0,
	type: String,
	converter: _,
	reflect: !1,
	useDefault: !1,
	hasChanged: re
};
Symbol.metadata ??= Symbol("metadata"), h.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var v = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ie) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? ie;
	}
	static _$Ei() {
		if (this.hasOwnProperty(g("elementProperties"))) return;
		let e = m(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(g("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(g("properties"))) {
			let e = this.properties, t = [...f(e), ...p(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? _ : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? _ : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? re)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
v.elementStyles = [], v.shadowRootOptions = { mode: "open" }, v[g("elementProperties")] = /* @__PURE__ */ new Map(), v[g("finalized")] = /* @__PURE__ */ new Map(), ne?.({ ReactiveElement: v }), (h.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var ae = globalThis, oe = (e) => e, y = ae.trustedTypes, se = y ? y.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ce = "$lit$", b = `lit$${Math.random().toFixed(9).slice(2)}$`, x = "?" + b, le = `<${x}>`, S = document, C = () => S.createComment(""), w = (e) => e === null || typeof e != "object" && typeof e != "function", T = Array.isArray, ue = (e) => T(e) || typeof e?.[Symbol.iterator] == "function", E = "[ 	\n\f\r]", D = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, de = /-->/g, fe = />/g, O = RegExp(`>|${E}(?:([^\\s"'>=/]+)(${E}*=${E}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), pe = /'/g, me = /"/g, he = /^(?:script|style|textarea|title)$/i, k = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), A = Symbol.for("lit-noChange"), j = Symbol.for("lit-nothing"), ge = /* @__PURE__ */ new WeakMap(), M = S.createTreeWalker(S, 129);
function _e(e, t) {
	if (!T(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return se === void 0 ? t : se.createHTML(t);
}
var ve = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = D;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === D ? c[1] === "!--" ? o = de : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = O) : (he.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = O) : o = fe : o === O ? c[0] === ">" ? (o = i ?? D, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? O : c[3] === "\"" ? me : pe) : o === me || o === pe ? o = O : o === de || o === fe ? o = D : (o = O, i = void 0);
		let d = o === O && e[t + 1].startsWith("/>") ? " " : "";
		a += o === D ? n + le : l >= 0 ? (r.push(s), n.slice(0, l) + ce + n.slice(l) + b + d) : n + b + (l === -2 ? t : d);
	}
	return [_e(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, N = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = ve(t, n);
		if (this.el = e.createElement(l, r), M.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = M.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ce)) {
					let t = u[o++], n = i.getAttribute(e).split(b), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? be : r[1] === "?" ? xe : r[1] === "@" ? Se : I
					}), i.removeAttribute(e);
				} else e.startsWith(b) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (he.test(i.tagName)) {
					let e = i.textContent.split(b), t = e.length - 1;
					if (t > 0) {
						i.textContent = y ? y.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], C()), M.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], C());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === x) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(b, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += b.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = S.createElement("template");
		return n.innerHTML = e, n;
	}
};
function P(e, t, n = e, r) {
	if (t === A) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = w(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = P(e, i._$AS(e, t.values), i, r)), t;
}
var ye = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? S).importNode(t, !0);
		M.currentNode = r;
		let i = M.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new F(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ce(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = M.nextNode(), a++);
		}
		return M.currentNode = S, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, F = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = j, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = P(this, e, t), w(e) ? e === j || e == null || e === "" ? (this._$AH !== j && this._$AR(), this._$AH = j) : e !== this._$AH && e !== A && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ue(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== j && w(this._$AH) ? this._$AA.nextSibling.data = e : this.T(S.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = N.createElement(_e(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ye(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ge.get(e.strings);
		return t === void 0 && ge.set(e.strings, t = new N(e)), t;
	}
	k(t) {
		T(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(C()), this.O(C()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = oe(e).nextSibling;
			oe(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, I = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = j, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = j;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = P(this, e, t, 0), a = !w(e) || e !== this._$AH && e !== A, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = P(this, r[n + o], t, o), s === A && (s = this._$AH[o]), a ||= !w(s) || s !== this._$AH[o], s === j ? e = j : e !== j && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === j ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, be = class extends I {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === j ? void 0 : e;
	}
}, xe = class extends I {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== j);
	}
}, Se = class extends I {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = P(this, e, t, 0) ?? j) === A) return;
		let n = this._$AH, r = e === j && n !== j || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== j && (n === j || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ce = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		P(this, e);
	}
}, we = {
	M: ce,
	P: b,
	A: x,
	C: 1,
	L: ve,
	R: ye,
	D: ue,
	V: P,
	I: F,
	H: I,
	N: xe,
	U: Se,
	B: be,
	F: Ce
}, Te = ae.litHtmlPolyfillSupport;
Te?.(N, F), (ae.litHtmlVersions ??= []).push("3.3.3");
var Ee = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new F(t.insertBefore(C(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, L = globalThis, R = class extends v {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ee(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return A;
	}
};
R._$litElement$ = !0, R.finalized = !0, L.litElementHydrateSupport?.({ LitElement: R });
var De = L.litElementPolyfillSupport;
De?.({ LitElement: R }), (L.litElementVersions ??= []).push("4.2.2");
function z(e) {
	return e === 1;
}
function B(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) throw Error("Expected an object");
	return e;
}
function V(e) {
	if (typeof e != "string" || !e.trim().length || e.length > 512) throw Error("Invalid text");
	return e;
}
function H(e) {
	let t = V(e);
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(t) || !Number.isFinite(Date.parse(t))) throw Error("Invalid instant");
	return t;
}
function Oe(e) {
	let t = H(e);
	if (!/(?:Z|\+00:00)$/.test(t) || new Date(t).toISOString().slice(0, 19) !== t.slice(0, 19)) throw Error("Invalid metadata UTC instant");
	return t;
}
function U(e) {
	if (typeof e != "number" || !Number.isInteger(e) || e < 0 || e > 30) throw Error("Invalid coverage count");
	return e;
}
function ke(e, t, n) {
	let r = B(e);
	if (r.status !== "complete" && r.status !== "partial" && r.status !== "stale" && r.status !== "unavailable") throw Error("Invalid coverage status");
	let i = U(r.selected_members), a = U(r.verified_members), o = U(r.missing_members), s = r.metadata_fetched_at === null ? null : Oe(r.metadata_fetched_at), c = r.metadata_expires_at === null ? null : Oe(r.metadata_expires_at);
	if (a + o !== i || (r.status === "partial" ? o === 0 : o !== 0) || r.status === "stale" && i === 0 || (r.status === "unavailable" ? i !== 0 || s !== null || c !== null : s === null || c === null || Date.parse(c) <= Date.parse(s) || Date.parse(s) > n + 6e4) || (r.status === "partial" || r.status === "unavailable" || i === 0) && t !== "unavailable" || r.status === "stale" && t === "ready") throw Error("Inconsistent station coverage");
	return {
		status: r.status,
		selected_members: i,
		verified_members: a,
		missing_members: o,
		metadata_fetched_at: s,
		metadata_expires_at: c
	};
}
function Ae(e) {
	let t = B(e);
	if (![
		"bus",
		"tram",
		"metro",
		"unknown"
	].includes(String(t.transport)) || t.cancelled !== null && typeof t.cancelled != "boolean" || !(t.delay_seconds === null || Number.isSafeInteger(t.delay_seconds))) throw Error("Invalid departure");
	return {
		id: V(t.id),
		line: V(t.line),
		destination: V(t.destination),
		transport: t.transport,
		scheduled_at: H(t.scheduled_at),
		expected_at: t.expected_at === null ? null : H(t.expected_at),
		cancelled: t.cancelled,
		delay_seconds: t.delay_seconds
	};
}
function je(e, t, n) {
	let r = B(e);
	if (!z(r.contract_version)) throw Error("Unsupported contract version");
	if (r.entity_id !== t || ![
		"ready",
		"stale",
		"unavailable"
	].includes(String(r.status)) || !Number.isSafeInteger(r.walking_minutes) || Number(r.walking_minutes) < 0 || !Array.isArray(r.departures) || r.departures.length > 5e3) throw Error("Invalid board");
	let i = B(r.stop), a = r.fetched_at === null ? null : H(r.fetched_at), o = r.expires_at === null ? null : H(r.expires_at);
	if (r.status === "unavailable") {
		if (a !== null || o !== null || r.departures.length) throw Error("Unavailable board contains source data");
	} else if (a === null || o === null || Date.parse(o) <= Date.parse(a) || Date.parse(o) - Date.parse(a) > 174e4 || Date.parse(a) > n + 6e4) throw Error("Invalid source validity");
	return {
		contract_version: 1,
		board_id: V(r.board_id),
		entity_id: t,
		stop: {
			id: V(i.id),
			name: V(i.name)
		},
		status: r.status,
		fetched_at: a,
		expires_at: o,
		walking_minutes: r.walking_minutes,
		departures: r.departures.map(Ae),
		...Object.hasOwn(r, "coverage") ? { coverage: ke(r.coverage, r.status, n) } : {}
	};
}
//#endregion
//#region src/model.ts
function W(e, t) {
	if (!Array.isArray(e) || e.some((e) => typeof e != "string" || !e.trim() || e.length > 512)) throw Error(`${t}: use a list of non-empty strings`);
	return [...new Set(e.map((e) => e.trim()))];
}
function Me(e) {
	let t = B(e), n = W(t.entities, "entities");
	if (n.length < 1 || n.length > 12 || n.some((e) => !/^sensor\.[a-z0-9_]+$/.test(e))) throw Error("entities: select 1 to 12 OVAPI sensors");
	if (!["custom:ovapi-departures-card", "custom:ovapi-commute-card"].includes(String(t.type))) throw Error("type: select an OVAPI departure or commute card");
	let r = t.max_departures ?? 5;
	if (!Number.isInteger(r) || Number(r) < 1 || Number(r) > 20) throw Error("max_departures: use 1 to 20");
	let i = t.max_routes === void 0 ? 5 : t.max_routes;
	if (!Number.isInteger(i) || Number(i) < 1 || Number(i) > 20) throw Error("max_routes: use 1 to 20");
	let a = t.display_mode === void 0 ? "departures" : t.display_mode;
	if (a !== "departures" && a !== "grouped") throw Error("display_mode: use departures or grouped");
	if (t.walking_minutes !== void 0 && (!Number.isInteger(t.walking_minutes) || Number(t.walking_minutes) < 0 || Number(t.walking_minutes) > 120)) throw Error("walking_minutes: use 0 to 120");
	if (t.title !== void 0 && (typeof t.title != "string" || t.title.length > 120)) throw Error("title: maximum 120 characters");
	let o = t.language ?? "auto";
	if (![
		"auto",
		"en",
		"nl"
	].includes(String(o))) throw Error("language: use auto, en or nl");
	return {
		type: t.type,
		entities: n,
		...t.title === void 0 ? {} : { title: t.title },
		lines: W(t.lines ?? [], "lines"),
		destinations: W(t.destinations ?? [], "destinations"),
		max_departures: r,
		display_mode: a,
		max_routes: i,
		...t.walking_minutes === void 0 ? {} : { walking_minutes: t.walking_minutes },
		language: o
	};
}
var G = (e) => Date.parse(e.expected_at ?? e.scheduled_at), K = (e, t) => Math.max(0, Math.floor((e - t) / 6e4)), q = (e) => e.trim().toLowerCase(), Ne = (e, t) => G(e) - G(t) || e.id.localeCompare(t.id);
function J(e, t, n) {
	let r = (e, t) => !e.length || e.some((e) => q(e) === q(t));
	return e.departures.filter((e) => G(e) > n && r(t.lines, e.line) && r(t.destinations, e.destination)).sort(Ne);
}
function Pe(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Set();
	for (let a of J(e, t, n)) {
		let e = JSON.stringify([
			a.id,
			a.transport,
			a.line,
			a.destination,
			Date.parse(a.scheduled_at),
			a.expected_at === null ? null : Date.parse(a.expected_at),
			a.cancelled,
			a.delay_seconds
		]);
		if (i.has(e)) continue;
		i.add(e);
		let t = JSON.stringify([
			a.transport,
			q(a.line),
			q(a.destination)
		]), n = r.get(t);
		n || (n = {
			upcoming: [],
			cancelled: []
		}, r.set(t, n)), (a.cancelled === !0 ? n.cancelled : n.upcoming).push(a);
	}
	return [...r.entries()].map(([e, t]) => ({
		key: e,
		departure: t.upcoming[0] ?? t.cancelled[0],
		following: t.upcoming.slice(1, 4),
		cancellations: t.cancelled.slice(0, 3),
		additionalCancellations: Math.max(0, t.cancelled.length - 3)
	})).sort((e, t) => Number(e.departure.cancelled === !0) - Number(t.departure.cancelled === !0) || Ne(e.departure, t.departure) || e.key.localeCompare(t.key)).slice(0, t.max_routes);
}
function Fe(e, t, n) {
	if (e.status !== "ready") return;
	let r = t.walking_minutes ?? e.walking_minutes, i = J(e, t, n).find((e) => e.cancelled !== !0 && G(e) - r * 6e4 >= n);
	return i ? {
		departure: i,
		leaveAt: G(i) - r * 6e4,
		walking: r
	} : void 0;
}
//#endregion
//#region src/localize.ts
var Ie = {
	departures: "Departures",
	commute: "Time to leave",
	loading: "Connecting to your departure board…",
	unavailable: "Departure data unavailable. Check the OVAPI integration.",
	expired: "Departure data expired. Waiting for a fresh update.",
	disconnected: "Disconnected from Home Assistant. Waiting to reconnect.",
	error: "Cannot read this board. Check the entity, permissions and integration/card versions.",
	ready: "Updated",
	stale: "Outdated · last update",
	staleAdvice: "Update failed. Check departures before leaving.",
	coveragePartial: (e, t) => `Station coverage incomplete: ${e} of ${t} platforms verified for the selected transport types. Departures hidden. Check the OVAPI integration.`,
	coverageUnavailable: "Station coverage unknown. Departures hidden. Check the OVAPI integration.",
	coverageExpired: "Station coverage information expired. Departures hidden until the integration updates it.",
	coverageStale: "Station coverage update failed. Previously verified platforms are still valid; check departures before leaving.",
	coverageEmpty: "No station platforms match the selected transport types. Check your favourite in the OVAPI integration.",
	empty: "No upcoming departures in this board.",
	filtered: "No departures match your filters.",
	noCommute: "No catchable departure. Try another favourite or check your walking time.",
	cancelled: "Cancelled",
	scheduled: "Scheduled",
	expected: "Expected",
	subMinuteEarly: "<1 min early",
	subMinuteLate: "<1 min late",
	onTime: "On time",
	unknown: "Live status unknown",
	leaveIn: "Leave in",
	leaveNow: "Leave now",
	min: "min",
	walk: "walk",
	departs: "Departs",
	bus: "Bus",
	tram: "Tram",
	metro: "Metro",
	transport: "Service",
	title: "Title",
	entities: "Favourite OVAPI sensors",
	entitiesError: "Select 1 to 12 OVAPI sensors. Changes are not applied until the selection is valid.",
	lines: "Lines",
	destinations: "Destinations",
	addFilter: "Add",
	removeFilter: "Remove",
	walking: "Walking minutes (empty = integration setting)",
	maximum: "Maximum departures per stop",
	displayMode: "Departure display",
	individual: "Individual departures",
	grouped: "Grouped routes",
	maxRoutes: "Maximum route rows per favourite",
	groupedHelp: "One row per transport + line + destination, soonest first. Opposite directions count separately. Up to three following times; cancelled-only routes appear last.",
	alsoIn: "Also in",
	oneMoreCancelled: "more cancelled",
	moreCancelled: "more cancelled",
	language: "Language",
	auto: "Automatic",
	choose: "Choose one or more OVAPI sensors.",
	editorHelp: "One exact value per field; commas are part of the name. Filters narrow the existing board and never request more data."
}, Le = {
	departures: "Vertrektijden",
	commute: "Tijd om te vertrekken",
	loading: "Verbinding met je vertrekbord…",
	unavailable: "Vertrekgegevens niet beschikbaar. Controleer de OVAPI-integratie.",
	expired: "Vertrekgegevens verlopen. Wachten op een nieuwe update.",
	disconnected: "Verbinding met Home Assistant verbroken. Wachten op herstel.",
	error: "Dit bord kan niet worden gelezen. Controleer de entiteit, rechten en integratie-/kaartversies.",
	ready: "Bijgewerkt",
	stale: "Verouderd · laatste update",
	staleAdvice: "Bijwerken mislukt. Controleer vertrektijden voordat je vertrekt.",
	coveragePartial: (e, t) => `Station niet volledig gedekt: ${e} van ${t} perrons geverifieerd voor de geselecteerde vervoertypen. Vertrekken verborgen. Controleer de OVAPI-integratie.`,
	coverageUnavailable: "Stationsdekking onbekend. Vertrekken verborgen. Controleer de OVAPI-integratie.",
	coverageExpired: "Informatie over stationsdekking verlopen. Vertrekken verborgen totdat de integratie deze bijwerkt.",
	coverageStale: "Bijwerken van stationsdekking mislukt. Eerder geverifieerde perrons zijn nog geldig; controleer vertrektijden voordat je vertrekt.",
	coverageEmpty: "Geen stationsperrons voor de geselecteerde vervoertypen. Controleer je favoriet in de OVAPI-integratie.",
	empty: "Geen komende vertrekken op dit bord.",
	filtered: "Geen vertrekken voor je filters.",
	noCommute: "Geen haalbaar vertrek. Kies een andere favoriet of controleer je looptijd.",
	cancelled: "Vervallen",
	scheduled: "Gepland",
	expected: "Verwacht",
	subMinuteEarly: "<1 min eerder",
	subMinuteLate: "<1 min later",
	onTime: "Op tijd",
	unknown: "Actuele status onbekend",
	leaveIn: "Vertrek over",
	leaveNow: "Vertrek nu",
	min: "min",
	walk: "lopen",
	departs: "Vertrek",
	bus: "Bus",
	tram: "Tram",
	metro: "Metro",
	transport: "Vervoer",
	title: "Titel",
	entities: "Favoriete OVAPI-sensoren",
	entitiesError: "Selecteer 1 tot 12 OVAPI-sensoren. Wijzigingen worden pas toegepast als de selectie geldig is.",
	lines: "Lijnen",
	destinations: "Bestemmingen",
	addFilter: "Toevoegen",
	removeFilter: "Verwijderen",
	walking: "Looptijd in minuten (leeg = integratie-instelling)",
	maximum: "Maximum vertrekken per halte",
	displayMode: "Vertrekweergave",
	individual: "Afzonderlijke vertrekken",
	grouped: "Gegroepeerde routes",
	maxRoutes: "Maximum routerijen per favoriet",
	groupedHelp: "Een rij per vervoertype + lijn + bestemming, eerstvolgende bovenaan. Tegengestelde richtingen tellen apart. Tot drie volgende tijden; routes met alleen vervallen ritten staan onderaan.",
	alsoIn: "Ook over",
	oneMoreCancelled: "andere vervallen rit",
	moreCancelled: "andere vervallen ritten",
	language: "Taal",
	auto: "Automatisch",
	choose: "Kies een of meer OVAPI-sensoren.",
	editorHelp: "Een exacte waarde per veld; komma's horen bij de naam. Filters beperken het bestaande bord en vragen nooit extra gegevens op."
};
function Re(e, t) {
	return e.language === "auto" ? (t?.locale?.language ?? t?.language ?? "en").startsWith("nl") ? "nl" : "en" : e.language;
}
function Y(e, t) {
	return Re(e, t) === "nl" ? Le : Ie;
}
function X(e, t, n) {
	let r = n?.locale?.time_format;
	return new Intl.DateTimeFormat(Re(t, n), {
		timeZone: n?.config.time_zone ?? "Europe/Amsterdam",
		hour: "2-digit",
		minute: "2-digit",
		...r === "12" ? { hour12: !0 } : r === "24" ? { hour12: !1 } : {}
	}).format(new Date(e));
}
//#endregion
//#region src/subscription.ts
function ze(e, t) {
	return e.coverage?.metadata_expires_at && Date.parse(e.coverage.metadata_expires_at) <= t ? {
		status: "unavailable",
		coverageExpired: !0
	} : e.board && Date.parse(e.board.expires_at) <= t ? {
		status: "expired",
		...e.coverage ? { coverage: e.coverage } : {}
	} : e;
}
function Be(e) {
	return Math.min(e.board ? Date.parse(e.board.expires_at) : Infinity, e.coverage?.metadata_expires_at ? Date.parse(e.coverage.metadata_expires_at) : Infinity);
}
var Ve = /* @__PURE__ */ new WeakMap(), He = class {
	connection;
	entity;
	listeners = /* @__PURE__ */ new Set();
	view = { status: "loading" };
	timer;
	unsubscribe;
	disposed = !1;
	constructor(e, t) {
		this.connection = e, this.entity = t, e.addEventListener("disconnected", this.disconnected), e.addEventListener("ready", this.ready), this.view = { status: e.connected ? "loading" : "disconnected" }, e.subscribeMessage(this.receive, {
			type: "ovapi/subscribe",
			entity_id: t
		}).then((e) => {
			this.disposed ? this.release(e) : this.unsubscribe = e;
		}, () => {
			this.disposed || this.publish({ status: "error" });
		});
	}
	release(e) {
		e().catch(() => {
			console.warn("OVAPI subscription cleanup failed; reload the dashboard.");
		});
	}
	publish(e) {
		clearTimeout(this.timer), this.timer = void 0, this.view = ze(e, Date.now()), this.listeners.forEach((e) => e(this.view));
		let t = Be(this.view) - Date.now();
		Number.isFinite(t) && (this.timer = setTimeout(() => this.publish(this.view), Math.min(t, 2147483647)));
	}
	disconnected = () => {
		this.publish({ status: "disconnected" });
	};
	ready = () => {
		this.view.board || this.publish({ status: "loading" });
	};
	receive = (e) => {
		if (this.disposed || !this.connection.connected) return;
		let t;
		try {
			t = je(e, this.entity, Date.now());
		} catch {
			this.publish({ status: "error" });
			return;
		}
		this.publish({
			status: t.status,
			...t.status === "unavailable" ? {} : { board: t },
			...t.coverage ? { coverage: t.coverage } : {}
		});
	};
	current() {
		return Be(this.view) <= Date.now() && this.publish(this.view), this.view;
	}
	add(e) {
		let t = this.current();
		this.listeners.add(e), e(t);
	}
	remove(e) {
		return this.listeners.delete(e), !this.listeners.size && (this.disposed = !0, this.publish({ status: "unavailable" }), this.connection.removeEventListener("disconnected", this.disconnected), this.connection.removeEventListener("ready", this.ready), this.unsubscribe && this.release(this.unsubscribe), !0);
	}
};
function Ue(e, t) {
	return Ve.get(e)?.get(t)?.current();
}
function We(e, t, n) {
	let r = Ve.get(e);
	r || (r = /* @__PURE__ */ new Map(), Ve.set(e, r));
	let i = r.get(t);
	i || (i = new He(e, t), r.set(t, i)), i.add(n);
	let a = !0;
	return () => {
		a && (a = !1, i.remove(n) && r.delete(t));
	};
}
//#endregion
//#region src/styles.ts
var Ge = o`
  :host {
    display: block;
    container-type: inline-size;
    color: var(--primary-text-color, #212121);
    font-family: var(
      --ha-font-family-body,
      var(--paper-font-body1_-_font-family, sans-serif)
    );
    font-size: var(--ha-font-size-m, 14px);
    line-height: 1.5;
    --ovapi-muted: var(--secondary-text-color, #595959);
    --ovapi-accent: var(--primary-color, #006b99);
  }
  * {
    box-sizing: border-box;
  }
  ha-card {
    display: block;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: var(--ha-card-border-width, 1px) solid
      var(--ha-card-border-color, var(--divider-color, #ddd));
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: var(--ha-card-box-shadow, none);
    overflow: hidden;
  }
  header {
    padding: 20px 20px 12px;
  }
  h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 500;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  section {
    padding: 12px 20px 20px;
  }
  section + section {
    border-top: 1px solid var(--divider-color, #ddd);
    padding-top: 20px;
  }
  .status,
  .detail {
    color: var(--ovapi-muted);
    font-size: 0.875rem;
  }
  .status {
    margin: 4px 0 12px;
  }
  .message {
    margin: 8px 0;
    overflow-wrap: anywhere;
  }
  .warning {
    font-weight: 600;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .departure {
    display: grid;
    grid-template-columns: 3.25rem minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 14px 0;
  }
  .departure + .departure {
    border-top: 1px solid var(--divider-color, #ddd);
  }
  .line {
    border: 1px solid currentColor;
    border-radius: 6px;
    padding: 4px;
    font-size: 1.05rem;
    font-weight: 700;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .destination {
    font-size: 1rem;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .following,
  .cancellations {
    margin-top: 4px;
    font-variant-numeric: tabular-nums;
  }
  .time {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .time strong {
    font-size: 1.2rem;
    font-weight: 600;
  }
  .cancelled .destination {
    text-decoration: line-through;
  }
  .cancelled-label {
    font-weight: 700;
  }
  .leave {
    margin: 16px 0 12px;
    line-height: 1.2;
    font-size: 1.3rem;
  }
  .leave strong {
    display: block;
    font-size: clamp(2.5rem, 8vw, 3.5rem);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .commute-route {
    display: flex;
    align-items: start;
    gap: 12px;
  }
  .commute-route .line {
    min-width: 3.25rem;
    max-width: 6rem;
  }
  .commute-detail {
    margin: 16px 0 0;
    color: var(--ovapi-muted);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 20px;
    min-width: 0;
  }
  legend {
    font-weight: 600;
    margin-bottom: 8px;
  }
  label {
    display: block;
    margin: 14px 0 6px;
  }
  input,
  select,
  textarea,
  button {
    font: inherit;
    color: inherit;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--ovapi-muted);
    border-radius: 6px;
  }
  textarea {
    resize: vertical;
  }
  button {
    width: auto;
    cursor: pointer;
  }
  .filters {
    margin-top: 20px;
  }
  .filter-row {
    display: flex;
    align-items: start;
    gap: 8px;
    margin-bottom: 12px;
  }
  .filter-row textarea {
    min-width: 0;
  }
  .choice {
    display: flex;
    gap: 12px;
    align-items: center;
    min-height: 44px;
    margin: 0;
    cursor: pointer;
    overflow-wrap: anywhere;
  }
  .choice input {
    width: 20px;
    height: 20px;
    min-height: 20px;
    flex: 0 0 20px;
    accent-color: var(--ovapi-accent);
  }
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  button:focus-visible {
    outline: 3px solid var(--ovapi-accent);
    outline-offset: 3px;
  }
  input:hover,
  select:hover,
  textarea:hover,
  button:hover {
    border-color: var(--primary-text-color, #212121);
  }
  .editor {
    padding: 16px;
  }
  .error {
    border: 1px solid currentColor;
    padding: 12px;
    overflow-wrap: anywhere;
  }
  @media (max-width: 360px) {
    header {
      padding: 16px 12px 8px;
    }
    section {
      padding: 12px;
    }
    .departure {
      gap: 8px;
      grid-template-columns: 2.75rem minmax(0, 1fr) auto;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
  @container (max-width: 280px) {
    header {
      padding: 16px 12px 8px;
    }
    section {
      padding: 12px;
    }
    .departure {
      grid-template-columns: 2.75rem minmax(0, 1fr);
      gap: 8px;
    }
    .time {
      grid-column: 2;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      text-align: start;
    }
    .time br {
      display: none;
    }
    .commute-route {
      flex-wrap: wrap;
    }
  }
`, Z = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Ke = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), qe = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: Je } = we, Ye = (e) => e, Xe = (e) => e.strings === void 0, Ze = () => document.createComment(""), Q = (e, t, n) => {
	let r = e._$AA.parentNode, i = t === void 0 ? e._$AB : t._$AA;
	if (n === void 0) n = new Je(r.insertBefore(Ze(), i), r.insertBefore(Ze(), i), e, e.options);
	else {
		let t = n._$AB.nextSibling, a = n._$AM, o = a !== e;
		if (o) {
			let t;
			n._$AQ?.(e), n._$AM = e, n._$AP !== void 0 && (t = e._$AU) !== a._$AU && n._$AP(t);
		}
		if (t !== i || o) {
			let e = n._$AA;
			for (; e !== t;) {
				let t = Ye(e).nextSibling;
				Ye(r).insertBefore(e, i), e = t;
			}
		}
	}
	return n;
}, $ = (e, t, n = e) => (e._$AI(t, n), e), Qe = {}, $e = (e, t = Qe) => e._$AH = t, et = (e) => e._$AH, tt = (e) => {
	e._$AR(), e._$AA.remove();
}, nt = Ke(class extends qe {
	constructor(e) {
		if (super(e), e.type !== Z.PROPERTY && e.type !== Z.ATTRIBUTE && e.type !== Z.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
		if (!Xe(e)) throw Error("`live` bindings can only contain a single expression");
	}
	render(e) {
		return e;
	}
	update(e, [t]) {
		if (t === A || t === j) return t;
		let n = e.element, r = e.name;
		if (e.type === Z.PROPERTY) {
			if (t === n[r]) return A;
		} else if (e.type === Z.BOOLEAN_ATTRIBUTE) {
			if (!!t === n.hasAttribute(r)) return A;
		} else if (e.type === Z.ATTRIBUTE && n.getAttribute(r) === t + "") return A;
		return $e(e), t;
	}
}), rt = (e, t, n) => {
	let r = /* @__PURE__ */ new Map();
	for (let i = t; i <= n; i++) r.set(e[i], i);
	return r;
}, it = Ke(class extends qe {
	constructor(e) {
		if (super(e), e.type !== Z.CHILD) throw Error("repeat() can only be used in text expressions");
	}
	dt(e, t, n) {
		let r;
		n === void 0 ? n = t : t !== void 0 && (r = t);
		let i = [], a = [], o = 0;
		for (let t of e) i[o] = r ? r(t, o) : o, a[o] = n(t, o), o++;
		return {
			values: a,
			keys: i
		};
	}
	render(e, t, n) {
		return this.dt(e, t, n).values;
	}
	update(e, [t, n, r]) {
		let i = et(e), { values: a, keys: o } = this.dt(t, n, r);
		if (!Array.isArray(i)) return this.ut = o, a;
		let s = this.ut ??= [], c = [], l, u, d = 0, f = i.length - 1, p = 0, m = a.length - 1;
		for (; d <= f && p <= m;) if (i[d] === null) d++;
		else if (i[f] === null) f--;
		else if (s[d] === o[p]) c[p] = $(i[d], a[p]), d++, p++;
		else if (s[f] === o[m]) c[m] = $(i[f], a[m]), f--, m--;
		else if (s[d] === o[m]) c[m] = $(i[d], a[m]), Q(e, c[m + 1], i[d]), d++, m--;
		else if (s[f] === o[p]) c[p] = $(i[f], a[p]), Q(e, i[d], i[f]), f--, p++;
		else if (l === void 0 && (l = rt(o, p, m), u = rt(s, d, f)), l.has(s[d])) {
			if (l.has(s[f])) {
				let t = u.get(o[p]), n = t === void 0 ? null : i[t];
				if (n === null) {
					let t = Q(e, i[d]);
					$(t, a[p]), c[p] = t;
				} else c[p] = $(n, a[p]), Q(e, i[d], n), i[t] = null;
				p++;
			} else tt(i[f]), f--;
		} else tt(i[d]), d++;
		for (; p <= m;) {
			let t = Q(e, c[m + 1]);
			$(t, a[p]), c[p++] = t;
		}
		for (; d <= f;) {
			let e = i[d++];
			e !== null && tt(e);
		}
		return this.ut = o, $e(e, c), A;
	}
});
//#endregion
//#region src/editor.ts
function at(e) {
	return JSON.stringify(e, (e, t) => {
		if (typeof t != "object" || !t || Array.isArray(t)) return t;
		let n = B(t);
		return Object.fromEntries(Object.keys(n).sort().map((e) => [e, n[e]]));
	});
}
var ot = class extends R {
	static styles = Ge;
	config = {};
	acceptedConfig;
	ha;
	error = "";
	set hass(e) {
		this.ha = e, this.requestUpdate();
	}
	setConfig(e) {
		let t = { ...B(e) }, n = at(t);
		n !== this.acceptedConfig && (this.config = t, this.acceptedConfig = n, this.error = "", this.requestUpdate());
	}
	selectedEntities() {
		return Array.isArray(this.config.entities) ? this.config.entities.filter((e) => typeof e == "string") : [];
	}
	toggleEntity(e, t) {
		let n = this.selectedEntities();
		n.includes(e) === t ? this.requestUpdate() : t && n.length >= 12 ? (this.error = "entities: select 1 to 12 OVAPI sensors", this.requestUpdate()) : this.change("entities", t ? [...n, e] : n.filter((t) => t !== e));
	}
	change(e, t) {
		let n = {
			...this.config,
			[e]: t
		};
		t === void 0 && delete n[e];
		for (let e of ["lines", "destinations"]) Array.isArray(n[e]) && (n[e] = n[e].filter((e) => typeof e != "string" || e.trim()));
		this.config = n;
		try {
			Me(n), this.error = "", this.acceptedConfig = at(n), this.dispatchEvent(new CustomEvent("config-changed", {
				detail: { config: n },
				bubbles: !0,
				composed: !0
			}));
		} catch (e) {
			this.error = e instanceof Error ? e.message : "Invalid configuration";
		}
		this.requestUpdate();
	}
	input(e) {
		return e.target;
	}
	filters(e) {
		return Array.isArray(this.config[e]) ? this.config[e] : [];
	}
	addFilter(e) {
		this.config = {
			...this.config,
			[e]: [...this.filters(e), ""]
		}, this.requestUpdate(), this.updateComplete.then(() => {
			this.shadowRoot?.querySelector(`#${e}-${this.filters(e).length - 1}`)?.focus();
		});
	}
	render() {
		let e = this.config.language === "nl" || this.config.language === "en" ? this.config.language : "auto", t = Y({ language: e }, this.ha), n = this.config.type !== "custom:ovapi-commute-card", r = n && this.config.display_mode === "grouped", i = this.selectedEntities(), a = [.../* @__PURE__ */ new Set([...i, ...Object.entries(this.ha?.states ?? {}).filter(([e, t]) => e.startsWith("sensor.") && z(t.attributes.contract_version) && typeof t.attributes.board_id == "string").map(([e]) => e)])].sort();
		return k`<div class="editor">
      <fieldset>
        <legend>${t.entities}</legend>
        ${a.length ? it(a, (e) => e, (e) => k`<label class="choice">
                    <input
                      type="checkbox"
                      .value=${e}
                      .checked=${nt(i.includes(e))}
                      @change=${(t) => this.toggleEntity(e, this.input(t).checked)}
                    />
                    ${String(this.ha?.states[e]?.attributes.friendly_name ?? e)}
                  </label>`) : k`<p>${t.choose}</p>`}
      </fieldset>
      ${this.error ? k`<p class="error" role="alert">${this.error.startsWith("entities:") ? t.entitiesError : this.error}</p>` : j}
      <label for="title">${t.title}</label
      ><input
        id="title"
        maxlength="120"
        .value=${String(this.config.title ?? "")}
        @change=${(e) => this.change("title", this.input(e).value)}
      />
      ${["lines", "destinations"].map((e) => k`<fieldset class="filters">
            <legend>${t[e]}</legend>
            ${this.filters(e).map((n, r) => k`
                <label for="${e}-${r}">${t[e]} ${r + 1}</label>
                <div class="filter-row">
                  <textarea
                    id="${e}-${r}"
                    rows="1"
                    .value=${n}
                    @change=${(t) => this.change(e, this.filters(e).map((e, n) => n === r ? this.input(t).value : e))}
                  ></textarea>
                  <button
                    type="button"
                    aria-label="${t.removeFilter} ${t[e]} ${r + 1}"
                    @click=${() => this.change(e, this.filters(e).filter((e, t) => t !== r))}
                  >
                    ${t.removeFilter}
                  </button>
                </div>
              `)}
            <button type="button" @click=${() => this.addFilter(e)}>
              ${t.addFilter} ${t[e]}
            </button>
          </fieldset>`)}
      <p class="detail">${t.editorHelp}</p>
      <label for="walking">${t.walking}</label
      ><input
        id="walking"
        type="number"
        min="0"
        max="120"
        step="1"
        .value=${String(this.config.walking_minutes ?? "")}
        @change=${(e) => this.change("walking_minutes", this.input(e).value === "" ? void 0 : Number(this.input(e).value))}
      />
      ${n ? k`<label for="display-mode">${t.displayMode}</label>
              <select
                id="display-mode"
                .value=${this.config.display_mode ?? "departures"}
                @change=${(e) => this.change("display_mode", this.input(e).value)}
              >
                <option value="departures">${t.individual}</option>
                <option value="grouped">${t.grouped}</option>
              </select>` : j}
      ${r ? k`<label for="max-routes">${t.maxRoutes}</label>
              <input
                id="max-routes"
                type="number"
                min="1"
                max="20"
                step="1"
                aria-describedby="grouped-help"
                .value=${String(this.config.max_routes ?? 5)}
                @change=${(e) => this.change("max_routes", Number(this.input(e).value))}
              />
              <p id="grouped-help" class="detail">${t.groupedHelp}</p>` : k`<label for="maximum">${t.maximum}</label
              ><input
                id="maximum"
                type="number"
                min="1"
                max="20"
                step="1"
                .value=${String(this.config.max_departures ?? 5)}
                @change=${(e) => this.change("max_departures", Number(this.input(e).value))}
              />`}
      <label for="language">${t.language}</label
      ><select
        id="language"
        .value=${e}
        @change=${(e) => this.change("language", this.input(e).value)}
      >
        <option value="auto">${t.auto}</option>
        <option value="en">English</option>
        <option value="nl">Nederlands</option>
      </select>
    </div>`;
	}
};
customElements.get("ovapi-card-editor") || customElements.define("ovapi-card-editor", ot);
//#endregion
//#region src/cards.ts
var st = class extends R {
	static styles = Ge;
	config;
	ha;
	stops = [];
	tick;
	paused = !1;
	static getConfigElement() {
		return document.createElement("ovapi-card-editor");
	}
	static getStubConfig(e) {
		return { entities: Object.entries(e?.states ?? {}).filter(([e, t]) => e.startsWith("sensor.") && z(t.attributes.contract_version) && typeof t.attributes.board_id == "string").slice(0, 1).map(([e]) => e) };
	}
	setConfig(e) {
		this.config = Me(e), this.restart(), this.requestUpdate();
	}
	set hass(e) {
		let t = this.ha?.connection !== e.connection;
		this.ha = e, (t || !this.stops.length) && this.restart(), this.requestUpdate();
	}
	get hass() {
		return this.ha;
	}
	getCardSize() {
		let e = this.config?.display_mode === "grouped" ? this.config.max_routes : this.config?.max_departures ?? 5;
		return (this.config?.entities.length ?? 1) * (this.commute ? 5 : e + 2);
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6
		};
	}
	get commute() {
		return !1;
	}
	connectedCallback() {
		super.connectedCallback(), this.paused = document.hidden, document.addEventListener("visibilitychange", this.visibility), window.addEventListener("pagehide", this.pagehide), window.addEventListener("pageshow", this.pageshow), this.restart();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), document.removeEventListener("visibilitychange", this.visibility), window.removeEventListener("pagehide", this.pagehide), window.removeEventListener("pageshow", this.pageshow), this.clear(), this.requestUpdate();
	}
	visibility = () => {
		this.paused = document.hidden, this.restart();
	};
	pagehide = () => {
		this.paused = !0, this.restart();
	};
	pageshow = () => {
		this.paused = document.hidden, this.restart();
	};
	clear() {
		this.stops.forEach((e) => e()), this.stops = [], clearInterval(this.tick), this.tick = void 0;
	}
	restart() {
		this.clear(), this.isConnected && !this.paused && this.config && this.ha && (this.stops = this.config.entities.map((e) => We(this.ha.connection, e, () => {
			this.requestUpdate();
		})), this.tick = setInterval(() => this.requestUpdate(), 1e3)), this.requestUpdate();
	}
	render() {
		if (!this.config) return j;
		let e = Y(this.config, this.ha);
		return k` <!-- THESIS: Read departures and leave times, never decorative metrics.
      OWN-WORLD: Home Assistant theme, restrained dividers, tabular times.
      STORY: Choose a favourite, read freshness, decide when to leave.
      FIRST VIEWPORT: Title, named stop, status, aligned line/destination/time.
      FORM: Brief-pinned HA dashboard cards; no independent visual-world roll. -->
      <ha-card>
        <header>
          <h2>
            ${this.config.title || (this.commute ? e.commute : e.departures)}
          </h2>
        </header>
        ${this.config.entities.map((t) => {
			let n = (this.isConnected && !this.paused && this.ha ? Ue(this.ha.connection, t) : void 0) ?? { status: "loading" }, r = n.board;
			if (!r) {
				let r = n.status, i = this.renderCoverage(n);
				return k`<section>
              <h3>${t}</h3>
              ${i}
              ${i === j || n.coverage?.status === "stale" ? k`<p class="message" role="status">
                      ${e[r === "ready" || r === "stale" ? "loading" : r]}
                    </p>` : j}
            </section>`;
			}
			return this.renderBoard(r);
		})}
      </ha-card>`;
	}
	renderBoard(e) {
		let t = this.config, n = Y(t, this.ha);
		return k`<section>
      <h3>${e.stop.name}</h3>
      <p class="status" role="status">
        ${e.status === "stale" ? n.stale : n.ready}
        <time datetime=${e.fetched_at}
          >${X(e.fetched_at, t, this.ha)}</time
        >
      </p>
      ${e.status === "stale" ? k`<p class="message warning">${n.staleAdvice}</p>` : j}
      ${this.renderCoverage({
			status: e.status,
			coverage: e.coverage
		})}
      ${this.commute ? this.renderCommute(e) : this.renderDepartures(e)}
    </section>`;
	}
	renderCoverage(e) {
		let t = Y(this.config, this.ha), n = e.coverage, r = e.coverageExpired ? t.coverageExpired : n?.status === "unavailable" ? t.coverageUnavailable : n?.status === "partial" ? t.coveragePartial(n.verified_members, n.selected_members) : n?.selected_members === 0 ? t.coverageEmpty : n?.status === "stale" ? t.coverageStale : null;
		return r ? k`<p class="message warning coverage" role="status">${r}</p>` : j;
	}
	renderDepartures(e) {
		let t = this.config, n = Y(t, this.ha), r = Date.now(), i = t.display_mode === "grouped" ? Pe(e, t, r).map((e) => ({
			departure: e.departure,
			group: e
		})) : J(e, t, r).slice(0, t.max_departures).map((e) => ({ departure: e }));
		return i.length ? k`<ol aria-label=${n.departures}>
      ${i.map((e) => this.renderDeparture(e.departure, r, e.group))}
    </ol>` : k`<p class="message">
        ${t.lines.length || t.destinations.length ? n.filtered : n.empty}
      </p>`;
	}
	renderDeparture(e, t, n) {
		let r = this.config, i = Y(r, this.ha), a = n?.cancellations.filter((t) => t !== e) ?? [];
		return k`<li
      class="departure ${e.cancelled === !0 ? "cancelled" : ""}"
    >
      <span class="line">${e.line}</span>
      <div>
        <div class="destination">${e.destination}</div>
        <div class="detail">
          ${e.transport === "unknown" ? i.transport : i[e.transport]} ·
          <span class=${e.cancelled === !0 ? "cancelled-label" : ""}
            >${this.serviceStatus(e)}</span
          >
        </div>
        ${n?.following.length ? k`<div class="following detail">
                ${i.alsoIn}
                ${n.following.map((e, n) => {
			let r = K(G(e), t), a = this.serviceStatus(e);
			return k`${n ? ", " : ""}<time
                      datetime=${e.expected_at ?? e.scheduled_at}
                      title=${a}
                      aria-label="${r} ${i.min} · ${a}"
                      >${r}</time
                    >`;
		})}
                ${i.min}
              </div>` : j}
        ${a.length ? k`<div class="cancellations detail">
                <span class="cancelled-label">${i.cancelled}</span>:
                ${a.map((e, t) => k`${t ? ", " : ""}<time
                        datetime=${e.expected_at ?? e.scheduled_at}
                        >${X(G(e), r, this.ha)}</time
                      >`)}
              </div>` : j}
        ${n?.additionalCancellations ? k`<div class="detail cancelled-label">
                ${n.additionalCancellations}
                ${n.additionalCancellations === 1 ? i.oneMoreCancelled : i.moreCancelled}
              </div>` : j}
      </div>
      <div class="time">
        ${e.cancelled === !0 ? j : k`<strong
                  >${K(G(e), t)}
                  <small>${i.min}</small></strong
                ><br />`}
        <time datetime=${e.expected_at ?? e.scheduled_at}
          >${X(G(e), r, this.ha)}</time
        >
      </div>
    </li>`;
	}
	serviceStatus(e) {
		let t = Y(this.config, this.ha);
		if (e.cancelled === !0) return t.cancelled;
		if (e.delay_seconds !== null && e.delay_seconds !== 0) {
			if (Math.abs(e.delay_seconds) < 60) return `${t.expected} ${e.delay_seconds < 0 ? t.subMinuteEarly : t.subMinuteLate}`;
			let n = Math.round(e.delay_seconds / 60);
			return `${t.expected} ${n >= 0 ? "+" : ""}${n} ${t.min}`;
		}
		return e.cancelled === null ? t.unknown : e.expected_at === null ? t.scheduled : e.delay_seconds === 0 ? t.onTime : t.expected;
	}
	renderCommute(e) {
		let t = this.config, n = Y(t, this.ha);
		if (e.status === "stale") return j;
		let r = Fe(e, t, Date.now());
		if (!r) return k`<p class="message">${n.noCommute}</p>`;
		let { departure: i, leaveAt: a, walking: o } = r, s = K(a, Date.now());
		return k` <div class="leave">
        ${s ? n.leaveIn : n.leaveNow}${s ? k`<strong>${s} <small>${n.min}</small></strong>` : j}
      </div>
      <div class="commute-route">
        <span class="line">${i.line}</span>
        <div>
          <div class="destination">${i.destination}</div>
          <div class="detail">
            ${i.transport === "unknown" ? n.transport : n[i.transport]} ·
            ${this.serviceStatus(i)}
          </div>
        </div>
      </div>
      <p class="commute-detail">
        ${o} ${n.min} ${n.walk} · ${n.departs}
        <time datetime=${i.expected_at ?? i.scheduled_at}
          >${X(G(i), t, this.ha)}</time
        >
      </p>`;
	}
}, ct = class extends st {
	get commute() {
		return !0;
	}
};
//#endregion
//#region src/index.ts
for (let [e, t, n, r] of [[
	"ovapi-departures-card",
	st,
	"OVAPI departures",
	"Upcoming departures with honest freshness and cancellation status."
], [
	"ovapi-commute-card",
	ct,
	"OVAPI commute",
	"When to leave for your favourite stops, including walking time."
]]) customElements.get(e) || customElements.define(e, t), window.customCards ??= [], window.customCards.some((t) => t.type === e) || window.customCards.push({
	type: e,
	name: n,
	description: r,
	preview: !0,
	documentationURL: "https://github.com/DevSecNinja/lovelace-ovapi"
});
//#endregion
