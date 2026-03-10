/*! For license information please see worker.js.LICENSE.txt */
(() => {
  'use strict';
  var e = {
      191: (e, t, n) => {
        e.exports = n.p + '8a318c6db885c2a56afb.mjs';
      },
      470: (e, t, n) => {
        e.exports = n.p + '99429dafbc248a507a37.wasm';
      },
    },
    t = {};
  function n(r) {
    var s = t[r];
    if (void 0 !== s) return s.exports;
    var a = (t[r] = { exports: {} });
    return (e[r](a, a.exports, n), a.exports);
  }
  ((n.m = e),
    (n.d = (e, t) => {
      for (var r in t)
        n.o(t, r) &&
          !n.o(e, r) &&
          Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
    }),
    (n.g = (function () {
      if ('object' == typeof globalThis) return globalThis;
      try {
        return this || new Function('return this')();
      } catch (e) {
        if ('object' == typeof window) return window;
      }
    })()),
    (n.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
    (n.r = e => {
      ('undefined' != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
        Object.defineProperty(e, '__esModule', { value: !0 }));
    }),
    (() => {
      var e;
      n.g.importScripts && (e = n.g.location + '');
      var t = n.g.document;
      if (
        !e &&
        t &&
        (t.currentScript &&
          'SCRIPT' === t.currentScript.tagName.toUpperCase() &&
          (e = t.currentScript.src),
        !e)
      ) {
        var r = t.getElementsByTagName('script');
        if (r.length)
          for (var s = r.length - 1; s > -1 && (!e || !/^http(s?):/.test(e)); )
            e = r[s--].src;
      }
      if (!e)
        throw new Error(
          'Automatic publicPath is not supported in this browser'
        );
      ((e = e
        .replace(/^blob:/, '')
        .replace(/#.*$/, '')
        .replace(/\?.*$/, '')
        .replace(/\/[^\/]+$/, '/')),
        (n.p = e));
    })(),
    (n.b = self.location + ''));
  var r = {};
  (n.r(r),
    n.d(r, {
      InferenceSession: () => B,
      TRACE: () => P,
      TRACE_EVENT_BEGIN: () => L,
      TRACE_EVENT_END: () => z,
      TRACE_FUNC_BEGIN: () => I,
      TRACE_FUNC_END: () => O,
      Tensor: () => S,
      default: () => zn,
      env: () => h,
      registerBackend: () => i,
    }));
  var s,
    a,
    o,
    i,
    l,
    c,
    u,
    d,
    p,
    h,
    f,
    _,
    m,
    g,
    w,
    y,
    b,
    v,
    x,
    M,
    k,
    E,
    A,
    T,
    C,
    S,
    P,
    F,
    I,
    O,
    L,
    z,
    N,
    B,
    $ = Object.defineProperty,
    D = Object.getOwnPropertyDescriptor,
    R = Object.getOwnPropertyNames,
    U = Object.prototype.hasOwnProperty,
    G =
      ((s = function (e) {
        if (typeof require < 'u') return require.apply(this, arguments);
        throw Error('Dynamic require of "' + e + '" is not supported');
      }),
      typeof require < 'u'
        ? require
        : typeof Proxy < 'u'
          ? new Proxy(s, {
              get: (e, t) => (typeof require < 'u' ? require : e)[t],
            })
          : s),
    V = (e, t) => () => (e && (t = e((e = 0))), t),
    j = (e, t) => {
      for (var n in t) $(e, n, { get: t[n], enumerable: !0 });
    },
    W = e =>
      ((e, t, n, r) => {
        if ((t && 'object' == typeof t) || 'function' == typeof t)
          for (let n of R(t))
            !U.call(e, n) &&
              undefined !== n &&
              $(e, n, {
                get: () => t[n],
                enumerable: !(r = D(t, n)) || r.enumerable,
              });
        return e;
      })($({}, '__esModule', { value: !0 }), e),
    q = V(() => {
      ((a = new Map()),
        (o = []),
        (i = (e, t, n) => {
          if (
            t &&
            'function' == typeof t.init &&
            'function' == typeof t.createInferenceSessionHandler
          ) {
            let r = a.get(e);
            if (void 0 === r) a.set(e, { backend: t, priority: n });
            else {
              if (r.priority > n) return;
              if (r.priority === n && r.backend !== t)
                throw new Error(
                  `cannot register backend "${e}" using priority ${n}`
                );
            }
            if (n >= 0) {
              let t = o.indexOf(e);
              -1 !== t && o.splice(t, 1);
              for (let t = 0; t < o.length; t++)
                if (a.get(o[t]).priority <= n) return void o.splice(t, 0, e);
              o.push(e);
            }
            return;
          }
          throw new TypeError('not a valid backend');
        }),
        (l = async e => {
          let t = a.get(e);
          if (!t) return 'backend not found.';
          if (t.initialized) return t.backend;
          if (t.aborted) return t.error;
          {
            let n = !!t.initPromise;
            try {
              return (
                n || (t.initPromise = t.backend.init(e)),
                await t.initPromise,
                (t.initialized = !0),
                t.backend
              );
            } catch (e) {
              return (n || ((t.error = `${e}`), (t.aborted = !0)), t.error);
            } finally {
              delete t.initPromise;
            }
          }
        }),
        (c = async e => {
          let t,
            n = e.executionProviders || [],
            r = n.map(e => ('string' == typeof e ? e : e.name)),
            s = 0 === r.length ? o : r,
            a = [],
            i = new Set();
          for (let e of s) {
            let n = await l(e);
            'string' == typeof n
              ? a.push({ name: e, err: n })
              : (t || (t = n), t === n && i.add(e));
          }
          if (!t)
            throw new Error(
              `no available backend found. ERR: ${a.map(e => `[${e.name}] ${e.err}`).join(', ')}`
            );
          for (let { name: e, err: t } of a)
            r.includes(e) &&
              console.warn(
                `removing requested execution provider "${e}" from session options because it is not available: ${t}`
              );
          let c = n.filter(e => i.has('string' == typeof e ? e : e.name));
          return [
            t,
            new Proxy(e, {
              get: (e, t) =>
                'executionProviders' === t ? c : Reflect.get(e, t),
            }),
          ];
        }));
    }),
    H = V(() => {
      q();
    }),
    Q = V(() => {
      u = '1.24.0-dev.20251116-b39e144322';
    }),
    X = V(() => {
      (Q(),
        (d = 'warning'),
        (p = {
          wasm: {},
          webgl: {},
          webgpu: {},
          versions: { common: u },
          set logLevel(e) {
            if (void 0 !== e) {
              if (
                'string' != typeof e ||
                -1 ===
                  ['verbose', 'info', 'warning', 'error', 'fatal'].indexOf(e)
              )
                throw new Error(`Unsupported logging level: ${e}`);
              d = e;
            }
          },
          get logLevel() {
            return d;
          },
        }),
        Object.defineProperty(p, 'logLevel', { enumerable: !0 }));
    }),
    Y = V(() => {
      (X(), (h = p));
    }),
    J = V(() => {
      ((f = (e, t) => {
        let n =
          typeof document < 'u'
            ? document.createElement('canvas')
            : new OffscreenCanvas(1, 1);
        ((n.width = e.dims[3]), (n.height = e.dims[2]));
        let r = n.getContext('2d');
        if (null != r) {
          let s, a;
          void 0 !== t?.tensorLayout && 'NHWC' === t.tensorLayout
            ? ((s = e.dims[2]), (a = e.dims[3]))
            : ((s = e.dims[3]), (a = e.dims[2]));
          let o,
            i,
            l = void 0 !== t?.format ? t.format : 'RGB',
            c = t?.norm;
          (void 0 === c || void 0 === c.mean
            ? (o = [255, 255, 255, 255])
            : 'number' == typeof c.mean
              ? (o = [c.mean, c.mean, c.mean, c.mean])
              : ((o = [c.mean[0], c.mean[1], c.mean[2], 0]),
                void 0 !== c.mean[3] && (o[3] = c.mean[3])),
            void 0 === c || void 0 === c.bias
              ? (i = [0, 0, 0, 0])
              : 'number' == typeof c.bias
                ? (i = [c.bias, c.bias, c.bias, c.bias])
                : ((i = [c.bias[0], c.bias[1], c.bias[2], 0]),
                  void 0 !== c.bias[3] && (i[3] = c.bias[3])));
          let u = a * s,
            d = 0,
            p = u,
            h = 2 * u,
            f = -1;
          'RGBA' === l
            ? ((d = 0), (p = u), (h = 2 * u), (f = 3 * u))
            : 'RGB' === l
              ? ((d = 0), (p = u), (h = 2 * u))
              : 'RBG' === l && ((d = 0), (h = u), (p = 2 * u));
          for (let t = 0; t < a; t++)
            for (let n = 0; n < s; n++) {
              let s = (e.data[d++] - i[0]) * o[0],
                a = (e.data[p++] - i[1]) * o[1],
                l = (e.data[h++] - i[2]) * o[2],
                c = -1 === f ? 255 : (e.data[f++] - i[3]) * o[3];
              ((r.fillStyle = 'rgba(' + s + ',' + a + ',' + l + ',' + c + ')'),
                r.fillRect(n, t, 1, 1));
            }
          if ('toDataURL' in n) return n.toDataURL();
          throw new Error('toDataURL is not supported');
        }
        throw new Error('Can not access image data');
      }),
        (_ = (e, t) => {
          let n,
            r =
              typeof document < 'u'
                ? document.createElement('canvas').getContext('2d')
                : new OffscreenCanvas(1, 1).getContext('2d');
          if (null == r) throw new Error('Can not access image data');
          {
            let s, a, o;
            void 0 !== t?.tensorLayout && 'NHWC' === t.tensorLayout
              ? ((s = e.dims[2]), (a = e.dims[1]), (o = e.dims[3]))
              : ((s = e.dims[3]), (a = e.dims[2]), (o = e.dims[1]));
            let i,
              l,
              c = void 0 !== t && void 0 !== t.format ? t.format : 'RGB',
              u = t?.norm;
            (void 0 === u || void 0 === u.mean
              ? (i = [255, 255, 255, 255])
              : 'number' == typeof u.mean
                ? (i = [u.mean, u.mean, u.mean, u.mean])
                : ((i = [u.mean[0], u.mean[1], u.mean[2], 255]),
                  void 0 !== u.mean[3] && (i[3] = u.mean[3])),
              void 0 === u || void 0 === u.bias
                ? (l = [0, 0, 0, 0])
                : 'number' == typeof u.bias
                  ? (l = [u.bias, u.bias, u.bias, u.bias])
                  : ((l = [u.bias[0], u.bias[1], u.bias[2], 0]),
                    void 0 !== u.bias[3] && (l[3] = u.bias[3])));
            let d = a * s;
            if (
              void 0 !== t &&
              ((void 0 !== t.format && 4 === o && 'RGBA' !== t.format) ||
                (3 === o && 'RGB' !== t.format && 'BGR' !== t.format))
            )
              throw new Error("Tensor format doesn't match input tensor dims");
            let p = 4,
              h = 0,
              f = 1,
              _ = 2,
              m = 3,
              g = 0,
              w = d,
              y = 2 * d,
              b = -1;
            ('RGBA' === c
              ? ((g = 0), (w = d), (y = 2 * d), (b = 3 * d))
              : 'RGB' === c
                ? ((g = 0), (w = d), (y = 2 * d))
                : 'RBG' === c && ((g = 0), (y = d), (w = 2 * d)),
              (n = r.createImageData(s, a)));
            for (let t = 0; t < a * s; h += p, f += p, _ += p, m += p, t++)
              ((n.data[h] = (e.data[g++] - l[0]) * i[0]),
                (n.data[f] = (e.data[w++] - l[1]) * i[1]),
                (n.data[_] = (e.data[y++] - l[2]) * i[2]),
                (n.data[m] = -1 === b ? 255 : (e.data[b++] - l[3]) * i[3]));
          }
          return n;
        }));
    }),
    K = V(() => {
      (te(),
        (m = (e, t) => {
          if (void 0 === e) throw new Error('Image buffer must be defined');
          if (void 0 === t.height || void 0 === t.width)
            throw new Error('Image height and width must be defined');
          if ('NHWC' === t.tensorLayout)
            throw new Error('NHWC Tensor layout is not supported yet');
          let n,
            r,
            { height: s, width: a } = t,
            o = t.norm ?? { mean: 255, bias: 0 };
          ((n =
            'number' == typeof o.mean
              ? [o.mean, o.mean, o.mean, o.mean]
              : [o.mean[0], o.mean[1], o.mean[2], o.mean[3] ?? 255]),
            (r =
              'number' == typeof o.bias
                ? [o.bias, o.bias, o.bias, o.bias]
                : [o.bias[0], o.bias[1], o.bias[2], o.bias[3] ?? 0]));
          let i = void 0 !== t.format ? t.format : 'RGBA',
            l =
              void 0 !== t.tensorFormat && void 0 !== t.tensorFormat
                ? t.tensorFormat
                : 'RGB',
            c = s * a,
            u =
              'RGBA' === l ? new Float32Array(4 * c) : new Float32Array(3 * c),
            d = 4,
            p = 0,
            h = 1,
            f = 2,
            _ = 3,
            m = 0,
            g = c,
            w = 2 * c,
            y = -1;
          ('RGB' === i && ((d = 3), (p = 0), (h = 1), (f = 2), (_ = -1)),
            'RGBA' === l
              ? (y = 3 * c)
              : 'RBG' === l
                ? ((m = 0), (w = c), (g = 2 * c))
                : 'BGR' === l && ((w = 0), (g = c), (m = 2 * c)));
          for (let t = 0; t < c; t++, p += d, f += d, h += d, _ += d)
            ((u[m++] = (e[p] + r[0]) / n[0]),
              (u[g++] = (e[h] + r[1]) / n[1]),
              (u[w++] = (e[f] + r[2]) / n[2]),
              -1 !== y && -1 !== _ && (u[y++] = (e[_] + r[3]) / n[3]));
          return new C(
            'float32',
            u,
            'RGBA' === l ? [1, 4, s, a] : [1, 3, s, a]
          );
        }),
        (g = async (e, t) => {
          let n,
            r = typeof HTMLImageElement < 'u' && e instanceof HTMLImageElement,
            s = typeof ImageData < 'u' && e instanceof ImageData,
            a = typeof ImageBitmap < 'u' && e instanceof ImageBitmap,
            o = 'string' == typeof e,
            i = t ?? {},
            l = () => {
              if (typeof document < 'u')
                return document.createElement('canvas');
              if (typeof OffscreenCanvas < 'u')
                return new OffscreenCanvas(1, 1);
              throw new Error('Canvas is not supported');
            },
            c = e =>
              (typeof HTMLCanvasElement < 'u' &&
                e instanceof HTMLCanvasElement) ||
              e instanceof OffscreenCanvas
                ? e.getContext('2d')
                : null;
          if (r) {
            let r = l();
            ((r.width = e.width), (r.height = e.height));
            let s = c(r);
            if (null == s) throw new Error('Can not access image data');
            {
              let r = e.height,
                a = e.width;
              if (
                (void 0 !== t &&
                  void 0 !== t.resizedHeight &&
                  void 0 !== t.resizedWidth &&
                  ((r = t.resizedHeight), (a = t.resizedWidth)),
                void 0 !== t)
              ) {
                if (((i = t), void 0 !== t.tensorFormat))
                  throw new Error(
                    'Image input config format must be RGBA for HTMLImageElement'
                  );
                ((i.tensorFormat = 'RGBA'), (i.height = r), (i.width = a));
              } else ((i.tensorFormat = 'RGBA'), (i.height = r), (i.width = a));
              (s.drawImage(e, 0, 0), (n = s.getImageData(0, 0, a, r).data));
            }
          } else {
            if (!s) {
              if (a) {
                if (void 0 === t)
                  throw new Error(
                    'Please provide image config with format for Imagebitmap'
                  );
                let r = l();
                ((r.width = e.width), (r.height = e.height));
                let s = c(r);
                if (null != s) {
                  let t = e.height,
                    r = e.width;
                  return (
                    s.drawImage(e, 0, 0, r, t),
                    (n = s.getImageData(0, 0, r, t).data),
                    (i.height = t),
                    (i.width = r),
                    m(n, i)
                  );
                }
                throw new Error('Can not access image data');
              }
              if (o)
                return new Promise((t, n) => {
                  let r = l(),
                    s = c(r);
                  if (!e || !s) return n();
                  let a = new Image();
                  ((a.crossOrigin = 'Anonymous'),
                    (a.src = e),
                    (a.onload = () => {
                      ((r.width = a.width),
                        (r.height = a.height),
                        s.drawImage(a, 0, 0, r.width, r.height));
                      let e = s.getImageData(0, 0, r.width, r.height);
                      ((i.height = r.height),
                        (i.width = r.width),
                        t(m(e.data, i)));
                    }));
                });
              throw new Error(
                'Input data provided is not supported - aborted tensor creation'
              );
            }
            {
              let r, s;
              if (
                (void 0 !== t &&
                void 0 !== t.resizedWidth &&
                void 0 !== t.resizedHeight
                  ? ((r = t.resizedHeight), (s = t.resizedWidth))
                  : ((r = e.height), (s = e.width)),
                void 0 !== t && (i = t),
                (i.format = 'RGBA'),
                (i.height = r),
                (i.width = s),
                void 0 !== t)
              ) {
                let t = l();
                ((t.width = s), (t.height = r));
                let a = c(t);
                if (null == a) throw new Error('Can not access image data');
                (a.putImageData(e, 0, 0),
                  (n = a.getImageData(0, 0, s, r).data));
              } else n = e.data;
            }
          }
          if (void 0 !== n) return m(n, i);
          throw new Error(
            'Input data provided is not supported - aborted tensor creation'
          );
        }),
        (w = (e, t) => {
          let { width: n, height: r, download: s, dispose: a } = t;
          return new C({
            location: 'texture',
            type: 'float32',
            texture: e,
            dims: [1, r, n, 4],
            download: s,
            dispose: a,
          });
        }),
        (y = (e, t) => {
          let { dataType: n, dims: r, download: s, dispose: a } = t;
          return new C({
            location: 'gpu-buffer',
            type: n ?? 'float32',
            gpuBuffer: e,
            dims: r,
            download: s,
            dispose: a,
          });
        }),
        (b = (e, t) => {
          let { dataType: n, dims: r, download: s, dispose: a } = t;
          return new C({
            location: 'ml-tensor',
            type: n ?? 'float32',
            mlTensor: e,
            dims: r,
            download: s,
            dispose: a,
          });
        }),
        (v = (e, t, n) =>
          new C({
            location: 'cpu-pinned',
            type: e,
            data: t,
            dims: n ?? [t.length],
          })));
    }),
    Z = V(() => {
      ((x = new Map([
        ['float32', Float32Array],
        ['uint8', Uint8Array],
        ['int8', Int8Array],
        ['uint16', Uint16Array],
        ['int16', Int16Array],
        ['int32', Int32Array],
        ['bool', Uint8Array],
        ['float64', Float64Array],
        ['uint32', Uint32Array],
        ['int4', Uint8Array],
        ['uint4', Uint8Array],
      ])),
        (M = new Map([
          [Float32Array, 'float32'],
          [Uint8Array, 'uint8'],
          [Int8Array, 'int8'],
          [Uint16Array, 'uint16'],
          [Int16Array, 'int16'],
          [Int32Array, 'int32'],
          [Float64Array, 'float64'],
          [Uint32Array, 'uint32'],
        ])),
        (k = !1),
        (E = () => {
          if (!k) {
            k = !0;
            let e = typeof BigInt64Array < 'u' && BigInt64Array.from,
              t = typeof BigUint64Array < 'u' && BigUint64Array.from,
              n = globalThis.Float16Array,
              r = typeof n < 'u' && n.from;
            (e &&
              (x.set('int64', BigInt64Array), M.set(BigInt64Array, 'int64')),
              t &&
                (x.set('uint64', BigUint64Array),
                M.set(BigUint64Array, 'uint64')),
              r
                ? (x.set('float16', n), M.set(n, 'float16'))
                : x.set('float16', Uint16Array));
          }
        }));
    }),
    ee = V(() => {
      (te(),
        (A = e => {
          let t = 1;
          for (let n = 0; n < e.length; n++) {
            let r = e[n];
            if ('number' != typeof r || !Number.isSafeInteger(r))
              throw new TypeError(`dims[${n}] must be an integer, got: ${r}`);
            if (r < 0)
              throw new RangeError(
                `dims[${n}] must be a non-negative integer, got: ${r}`
              );
            t *= r;
          }
          return t;
        }),
        (T = (e, t) => {
          switch (e.location) {
            case 'cpu':
              return new C(e.type, e.data, t);
            case 'cpu-pinned':
              return new C({
                location: 'cpu-pinned',
                data: e.data,
                type: e.type,
                dims: t,
              });
            case 'texture':
              return new C({
                location: 'texture',
                texture: e.texture,
                type: e.type,
                dims: t,
              });
            case 'gpu-buffer':
              return new C({
                location: 'gpu-buffer',
                gpuBuffer: e.gpuBuffer,
                type: e.type,
                dims: t,
              });
            case 'ml-tensor':
              return new C({
                location: 'ml-tensor',
                mlTensor: e.mlTensor,
                type: e.type,
                dims: t,
              });
            default:
              throw new Error(
                `tensorReshape: tensor location ${e.location} is not supported`
              );
          }
        }));
    }),
    te = V(() => {
      (J(),
        K(),
        Z(),
        ee(),
        (C = class {
          constructor(e, t, n) {
            let r, s;
            if ((E(), 'object' == typeof e && 'location' in e))
              switch (
                ((this.dataLocation = e.location),
                (r = e.type),
                (s = e.dims),
                e.location)
              ) {
                case 'cpu-pinned': {
                  let t = x.get(r);
                  if (!t)
                    throw new TypeError(
                      `unsupported type "${r}" to create tensor from pinned buffer`
                    );
                  if (!(e.data instanceof t))
                    throw new TypeError(`buffer should be of type ${t.name}`);
                  this.cpuData = e.data;
                  break;
                }
                case 'texture':
                  if ('float32' !== r)
                    throw new TypeError(
                      `unsupported type "${r}" to create tensor from texture`
                    );
                  ((this.gpuTextureData = e.texture),
                    (this.downloader = e.download),
                    (this.disposer = e.dispose));
                  break;
                case 'gpu-buffer':
                  if (
                    'float32' !== r &&
                    'float16' !== r &&
                    'int32' !== r &&
                    'int64' !== r &&
                    'uint32' !== r &&
                    'uint8' !== r &&
                    'bool' !== r &&
                    'uint4' !== r &&
                    'int4' !== r
                  )
                    throw new TypeError(
                      `unsupported type "${r}" to create tensor from gpu buffer`
                    );
                  ((this.gpuBufferData = e.gpuBuffer),
                    (this.downloader = e.download),
                    (this.disposer = e.dispose));
                  break;
                case 'ml-tensor':
                  if (
                    'float32' !== r &&
                    'float16' !== r &&
                    'int32' !== r &&
                    'int64' !== r &&
                    'uint32' !== r &&
                    'uint64' !== r &&
                    'int8' !== r &&
                    'uint8' !== r &&
                    'bool' !== r &&
                    'uint4' !== r &&
                    'int4' !== r
                  )
                    throw new TypeError(
                      `unsupported type "${r}" to create tensor from MLTensor`
                    );
                  ((this.mlTensorData = e.mlTensor),
                    (this.downloader = e.download),
                    (this.disposer = e.dispose));
                  break;
                default:
                  throw new Error(
                    `Tensor constructor: unsupported location '${this.dataLocation}'`
                  );
              }
            else {
              let a, o;
              if ('string' == typeof e)
                if (((r = e), (o = n), 'string' === e)) {
                  if (!Array.isArray(t))
                    throw new TypeError(
                      "A string tensor's data must be a string array."
                    );
                  a = t;
                } else {
                  let n = x.get(e);
                  if (void 0 === n)
                    throw new TypeError(`Unsupported tensor type: ${e}.`);
                  if (Array.isArray(t)) {
                    if (
                      ('float16' === e && n === Uint16Array) ||
                      'uint4' === e ||
                      'int4' === e
                    )
                      throw new TypeError(
                        `Creating a ${e} tensor from number array is not supported. Please use ${n.name} as data.`
                      );
                    a =
                      'uint64' === e || 'int64' === e
                        ? n.from(t, BigInt)
                        : n.from(t);
                  } else if (t instanceof n) a = t;
                  else if (t instanceof Uint8ClampedArray) {
                    if ('uint8' !== e)
                      throw new TypeError(
                        "A Uint8ClampedArray tensor's data must be type of uint8"
                      );
                    a = Uint8Array.from(t);
                  } else {
                    if (
                      !(
                        'float16' === e &&
                        t instanceof Uint16Array &&
                        n !== Uint16Array
                      )
                    )
                      throw new TypeError(
                        `A ${r} tensor's data must be type of ${n}`
                      );
                    a = new globalThis.Float16Array(
                      t.buffer,
                      t.byteOffset,
                      t.length
                    );
                  }
                }
              else if (((o = t), Array.isArray(e))) {
                if (0 === e.length)
                  throw new TypeError(
                    'Tensor type cannot be inferred from an empty array.'
                  );
                let t = typeof e[0];
                if ('string' === t) ((r = 'string'), (a = e));
                else {
                  if ('boolean' !== t)
                    throw new TypeError(
                      `Invalid element type of data array: ${t}.`
                    );
                  ((r = 'bool'), (a = Uint8Array.from(e)));
                }
              } else if (e instanceof Uint8ClampedArray)
                ((r = 'uint8'), (a = Uint8Array.from(e)));
              else {
                let t = M.get(e.constructor);
                if (void 0 === t)
                  throw new TypeError(
                    `Unsupported type for tensor data: ${e.constructor}.`
                  );
                ((r = t), (a = e));
              }
              if (void 0 === o) o = [a.length];
              else if (!Array.isArray(o))
                throw new TypeError("A tensor's dims must be a number array");
              ((s = o), (this.cpuData = a), (this.dataLocation = 'cpu'));
            }
            let a = A(s);
            if (
              this.cpuData &&
              a !== this.cpuData.length &&
              (('uint4' !== r && 'int4' !== r) ||
                Math.ceil(a / 2) !== this.cpuData.length)
            )
              throw new Error(
                `Tensor's size(${a}) does not match data length(${this.cpuData.length}).`
              );
            ((this.type = r), (this.dims = s), (this.size = a));
          }
          static async fromImage(e, t) {
            return g(e, t);
          }
          static fromTexture(e, t) {
            return w(e, t);
          }
          static fromGpuBuffer(e, t) {
            return y(e, t);
          }
          static fromMLTensor(e, t) {
            return b(e, t);
          }
          static fromPinnedBuffer(e, t, n) {
            return v(e, t, n);
          }
          toDataURL(e) {
            return f(this, e);
          }
          toImageData(e) {
            return _(this, e);
          }
          get data() {
            if ((this.ensureValid(), !this.cpuData))
              throw new Error(
                'The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.'
              );
            return this.cpuData;
          }
          get location() {
            return this.dataLocation;
          }
          get texture() {
            if ((this.ensureValid(), !this.gpuTextureData))
              throw new Error('The data is not stored as a WebGL texture.');
            return this.gpuTextureData;
          }
          get gpuBuffer() {
            if ((this.ensureValid(), !this.gpuBufferData))
              throw new Error('The data is not stored as a WebGPU buffer.');
            return this.gpuBufferData;
          }
          get mlTensor() {
            if ((this.ensureValid(), !this.mlTensorData))
              throw new Error('The data is not stored as a WebNN MLTensor.');
            return this.mlTensorData;
          }
          async getData(e) {
            switch ((this.ensureValid(), this.dataLocation)) {
              case 'cpu':
              case 'cpu-pinned':
                return this.data;
              case 'texture':
              case 'gpu-buffer':
              case 'ml-tensor':
                if (!this.downloader)
                  throw new Error(
                    'The current tensor is not created with a specified data downloader.'
                  );
                if (this.isDownloading)
                  throw new Error('The current tensor is being downloaded.');
                try {
                  this.isDownloading = !0;
                  let t = await this.downloader();
                  return (
                    (this.downloader = void 0),
                    (this.dataLocation = 'cpu'),
                    (this.cpuData = t),
                    e &&
                      this.disposer &&
                      (this.disposer(), (this.disposer = void 0)),
                    t
                  );
                } finally {
                  this.isDownloading = !1;
                }
              default:
                throw new Error(
                  `cannot get data from location: ${this.dataLocation}`
                );
            }
          }
          dispose() {
            if (this.isDownloading)
              throw new Error('The current tensor is being downloaded.');
            (this.disposer && (this.disposer(), (this.disposer = void 0)),
              (this.cpuData = void 0),
              (this.gpuTextureData = void 0),
              (this.gpuBufferData = void 0),
              (this.mlTensorData = void 0),
              (this.downloader = void 0),
              (this.isDownloading = void 0),
              (this.dataLocation = 'none'));
          }
          ensureValid() {
            if ('none' === this.dataLocation)
              throw new Error('The tensor is disposed.');
          }
          reshape(e) {
            if ((this.ensureValid(), this.downloader || this.disposer))
              throw new Error(
                'Cannot reshape a tensor that owns GPU resource.'
              );
            return T(this, e);
          }
        }));
    }),
    ne = V(() => {
      (te(), (S = C));
    }),
    re = V(() => {
      (X(),
        (P = (e, t) => {
          (typeof p.trace > 'u' ? !p.wasm.trace : !p.trace) ||
            console.timeStamp(`${e}::ORT::${t}`);
        }),
        (F = (e, t) => {
          let n = new Error().stack?.split(/\r\n|\r|\n/g) || [],
            r = !1;
          for (let s = 0; s < n.length; s++) {
            if (r && !n[s].includes('TRACE_FUNC')) {
              let r = `FUNC_${e}::${n[s].trim().split(' ')[1]}`;
              return (t && (r += `::${t}`), void P('CPU', r));
            }
            n[s].includes('TRACE_FUNC') && (r = !0);
          }
        }),
        (I = e => {
          (typeof p.trace > 'u' ? !p.wasm.trace : !p.trace) || F('BEGIN', e);
        }),
        (O = e => {
          (typeof p.trace > 'u' ? !p.wasm.trace : !p.trace) || F('END', e);
        }),
        (L = e => {
          (typeof p.trace > 'u' ? !p.wasm.trace : !p.trace) ||
            console.time(`ORT::${e}`);
        }),
        (z = e => {
          (typeof p.trace > 'u' ? !p.wasm.trace : !p.trace) ||
            console.timeEnd(`ORT::${e}`);
        }));
    }),
    se = V(() => {
      (q(),
        ne(),
        re(),
        (N = class e {
          constructor(e) {
            this.handler = e;
          }
          async run(e, t, n) {
            (I(), L('InferenceSession.run'));
            let r = {},
              s = {};
            if (
              'object' != typeof e ||
              null === e ||
              e instanceof S ||
              Array.isArray(e)
            )
              throw new TypeError(
                "'feeds' must be an object that use input names as keys and OnnxValue as corresponding values."
              );
            let a = !0;
            if ('object' == typeof t) {
              if (null === t)
                throw new TypeError('Unexpected argument[1]: cannot be null.');
              if (t instanceof S)
                throw new TypeError("'fetches' cannot be a Tensor");
              if (Array.isArray(t)) {
                if (0 === t.length)
                  throw new TypeError("'fetches' cannot be an empty array.");
                a = !1;
                for (let e of t) {
                  if ('string' != typeof e)
                    throw new TypeError(
                      "'fetches' must be a string array or an object."
                    );
                  if (-1 === this.outputNames.indexOf(e))
                    throw new RangeError(
                      `'fetches' contains invalid output name: ${e}.`
                    );
                  r[e] = null;
                }
                if ('object' == typeof n && null !== n) s = n;
                else if (typeof n < 'u')
                  throw new TypeError("'options' must be an object.");
              } else {
                let e = !1,
                  o = Object.getOwnPropertyNames(t);
                for (let n of this.outputNames)
                  if (-1 !== o.indexOf(n)) {
                    let s = t[n];
                    (null === s || s instanceof S) &&
                      ((e = !0), (a = !1), (r[n] = s));
                  }
                if (e) {
                  if ('object' == typeof n && null !== n) s = n;
                  else if (typeof n < 'u')
                    throw new TypeError("'options' must be an object.");
                } else s = t;
              }
            } else if (typeof t < 'u')
              throw new TypeError(
                "Unexpected argument[1]: must be 'fetches' or 'options'."
              );
            for (let t of this.inputNames)
              if (typeof e[t] > 'u')
                throw new Error(`input '${t}' is missing in 'feeds'.`);
            if (a) for (let e of this.outputNames) r[e] = null;
            let o = await this.handler.run(e, r, s),
              i = {};
            for (let e in o)
              if (Object.hasOwnProperty.call(o, e)) {
                let t = o[e];
                i[e] = t instanceof S ? t : new S(t.type, t.data, t.dims);
              }
            return (z('InferenceSession.run'), O(), i);
          }
          async release() {
            return this.handler.dispose();
          }
          static async create(t, n, r, s) {
            (I(), L('InferenceSession.create'));
            let a,
              o = {};
            if ('string' == typeof t) {
              if (((a = t), 'object' == typeof n && null !== n)) o = n;
              else if (typeof n < 'u')
                throw new TypeError("'options' must be an object.");
            } else if (t instanceof Uint8Array) {
              if (((a = t), 'object' == typeof n && null !== n)) o = n;
              else if (typeof n < 'u')
                throw new TypeError("'options' must be an object.");
            } else {
              if (
                !(
                  t instanceof ArrayBuffer ||
                  (typeof SharedArrayBuffer < 'u' &&
                    t instanceof SharedArrayBuffer)
                )
              )
                throw new TypeError(
                  "Unexpected argument[0]: must be 'path' or 'buffer'."
                );
              {
                let e = t,
                  i = 0,
                  l = t.byteLength;
                if ('object' == typeof n && null !== n) o = n;
                else if ('number' == typeof n) {
                  if (((i = n), !Number.isSafeInteger(i)))
                    throw new RangeError("'byteOffset' must be an integer.");
                  if (i < 0 || i >= e.byteLength)
                    throw new RangeError(
                      `'byteOffset' is out of range [0, ${e.byteLength}).`
                    );
                  if (((l = t.byteLength - i), 'number' == typeof r)) {
                    if (((l = r), !Number.isSafeInteger(l)))
                      throw new RangeError("'byteLength' must be an integer.");
                    if (l <= 0 || i + l > e.byteLength)
                      throw new RangeError(
                        `'byteLength' is out of range (0, ${e.byteLength - i}].`
                      );
                    if ('object' == typeof s && null !== s) o = s;
                    else if (typeof s < 'u')
                      throw new TypeError("'options' must be an object.");
                  } else if (typeof r < 'u')
                    throw new TypeError("'byteLength' must be a number.");
                } else if (typeof n < 'u')
                  throw new TypeError("'options' must be an object.");
                a = new Uint8Array(e, i, l);
              }
            }
            let [i, l] = await c(o),
              u = await i.createInferenceSessionHandler(a, l);
            return (z('InferenceSession.create'), O(), new e(u));
          }
          startProfiling() {
            this.handler.startProfiling();
          }
          endProfiling() {
            this.handler.endProfiling();
          }
          get inputNames() {
            return this.handler.inputNames;
          }
          get outputNames() {
            return this.handler.outputNames;
          }
          get inputMetadata() {
            return this.handler.inputMetadata;
          }
          get outputMetadata() {
            return this.handler.outputMetadata;
          }
        }));
    }),
    ae = V(() => {
      (se(), (B = N));
    }),
    oe = V(() => {}),
    ie = V(() => {}),
    le = V(() => {}),
    ce = V(() => {}),
    ue = {};
  j(ue, {
    InferenceSession: () => B,
    TRACE: () => P,
    TRACE_EVENT_BEGIN: () => L,
    TRACE_EVENT_END: () => z,
    TRACE_FUNC_BEGIN: () => I,
    TRACE_FUNC_END: () => O,
    Tensor: () => S,
    env: () => h,
    registerBackend: () => i,
  });
  var de = V(() => {
      (H(), Y(), ae(), ne(), oe(), ie(), re(), le(), ce());
    }),
    pe = V(() => {}),
    he = {};
  j(he, { default: () => me });
  var fe,
    _e,
    me,
    ge = V(() => {
      (Tn(),
        It(),
        Ft(),
        (fe = 'ort-wasm-proxy-worker'),
        (_e = globalThis.self?.name === fe) &&
          (self.onmessage = e => {
            let { type: t, in: n } = e.data;
            try {
              switch (t) {
                case 'init-wasm':
                  Ve(n.wasm).then(
                    () => {
                      qt(n).then(
                        () => {
                          postMessage({ type: t });
                        },
                        e => {
                          postMessage({ type: t, err: e });
                        }
                      );
                    },
                    e => {
                      postMessage({ type: t, err: e });
                    }
                  );
                  break;
                case 'init-ep': {
                  let { epName: e, env: r } = n;
                  Ht(r, e).then(
                    () => {
                      postMessage({ type: t });
                    },
                    e => {
                      postMessage({ type: t, err: e });
                    }
                  );
                  break;
                }
                case 'copy-from': {
                  let { buffer: e } = n,
                    r = Jt(e);
                  postMessage({ type: t, out: r });
                  break;
                }
                case 'create': {
                  let { model: e, options: r } = n;
                  Kt(e, r).then(
                    e => {
                      postMessage({ type: t, out: e });
                    },
                    e => {
                      postMessage({ type: t, err: e });
                    }
                  );
                  break;
                }
                case 'release':
                  (Zt(n), postMessage({ type: t }));
                  break;
                case 'run': {
                  let {
                    sessionId: e,
                    inputIndices: r,
                    inputs: s,
                    outputIndices: a,
                    options: o,
                  } = n;
                  tn(e, r, s, a, new Array(a.length).fill(null), o).then(
                    e => {
                      e.some(e => 'cpu' !== e[3])
                        ? postMessage({
                            type: t,
                            err: 'Proxy does not support non-cpu tensor location.',
                          })
                        : postMessage({ type: t, out: e }, rn([...s, ...e]));
                    },
                    e => {
                      postMessage({ type: t, err: e });
                    }
                  );
                  break;
                }
                case 'end-profiling':
                  (nn(n), postMessage({ type: t }));
              }
            } catch (e) {
              postMessage({ type: t, err: e });
            }
          }),
        (me = _e
          ? null
          : e => new Worker(e ?? Ee, { type: 'module', name: fe })));
    }),
    we = {};
  async function ye(e = {}) {
    var t = e,
      r = !!globalThis.window,
      s = !!globalThis.WorkerGlobalScope,
      a = s && self.name?.startsWith('em-pthread');
    ((t.mountExternalData = (e, n) => {
      (e.startsWith('./') && (e = e.substring(2)),
        (t.Uc || (t.Uc = new Map())).set(e, n));
    }),
      (t.unmountExternalData = () => {
        delete t.Uc;
      }),
      globalThis.SharedArrayBuffer ??
        new WebAssembly.Memory({ initial: 0, maximum: 0, Be: !0 }).buffer
          .constructor);
    let o = () => {
      let e =
        e =>
        (...t) => {
          let n = Dt;
          return (
            (t = e(...t)),
            Dt != n
              ? new Promise((e, t) => {
                  qt = { resolve: e, reject: t };
                })
              : t
          );
        };
      ((() => {
        for (let n of [
          '_OrtAppendExecutionProvider',
          '_OrtCreateSession',
          '_OrtRun',
          '_OrtRunWithBinding',
          '_OrtBindInput',
        ])
          t[n] = e(t[n]);
      })(),
        typeof jsepRunAsync < 'u' &&
          ((t._OrtRun = jsepRunAsync(t._OrtRun)),
          (t._OrtRunWithBinding = jsepRunAsync(t._OrtRunWithBinding))),
        (o = void 0));
    };
    t.asyncInit = () => {
      o?.();
    };
    var i,
      l,
      c = (e, t) => {
        throw t;
      },
      u = '';
    if (r || s) {
      try {
        u = new URL(
          '.',
          'file:///Users/alexandernodeland/anodeland/projects/code/websites/alexnodeland/node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs'
        ).href;
      } catch {}
      (s &&
        (l = e => {
          var t = new XMLHttpRequest();
          return (
            t.open('GET', e, !1),
            (t.responseType = 'arraybuffer'),
            t.send(null),
            new Uint8Array(t.response)
          );
        }),
        (i = async e => {
          if (x(e))
            return new Promise((t, n) => {
              var r = new XMLHttpRequest();
              (r.open('GET', e, !0),
                (r.responseType = 'arraybuffer'),
                (r.onload = () => {
                  200 == r.status || (0 == r.status && r.response)
                    ? t(r.response)
                    : n(r.status);
                }),
                (r.onerror = n),
                r.send(null));
            });
          var t = await fetch(e, { credentials: 'same-origin' });
          if (t.ok) return t.arrayBuffer();
          throw Error(t.status + ' : ' + t.url);
        }));
    }
    var d,
      p,
      h,
      f,
      _,
      m,
      g = console.log.bind(console),
      w = console.error.bind(console),
      y = g,
      b = w,
      v = !1,
      x = e => e.startsWith('file://');
    function M() {
      ie.buffer != E.buffer && B();
    }
    if (a) {
      let e = function (n) {
        try {
          var r = n.data,
            s = r.Oc;
          if ('load' === s) {
            let n = [];
            ((self.onmessage = e => n.push(e)),
              (m = () => {
                postMessage({ Oc: 'loaded' });
                for (let t of n) e(t);
                self.onmessage = e;
              }));
            for (let e of r.de)
              (t[e] && !t[e].proxy) ||
                ((t[e] = (...t) => {
                  postMessage({ Oc: 'callHandler', ce: e, args: t });
                }),
                'print' == e && (y = t[e]),
                'printErr' == e && (b = t[e]));
            ((ie = r.je), B(), (p = r.ke), U(), xo());
          } else if ('run' === s) {
            ((a = r.Nc),
              (o = (M(), P)[((a + 52) >>> 2) >>> 0]),
              (a = (M(), P)[((a + 56) >>> 2) >>> 0]),
              Rs(o, o - a),
              Us(o),
              Ps(r.Nc, 0, 0, 1, 0, 0),
              se(),
              Ct(r.Nc),
              k || (is(), (k = !0)));
            try {
              le(r.he, r.Wc);
            } catch (a) {
              if ('unwind' != a) throw a;
            }
          } else
            'setimmediate' !== r.target &&
              ('checkMailbox' === s
                ? k && St()
                : s && (b(`worker: received unknown command ${s}`), b(r)));
        } catch (a) {
          throw (Fs(), a);
        }
        var a, o;
      };
      var k = !1;
      ((self.onunhandledrejection = e => {
        throw e.reason || e;
      }),
        (self.onmessage = e));
    }
    var E,
      A,
      T,
      C,
      S,
      P,
      F,
      I,
      O,
      L,
      z,
      N = !1;
    function B() {
      var e = ie.buffer;
      ((t.HEAP8 = E = new Int8Array(e)),
        (T = new Int16Array(e)),
        (t.HEAPU8 = A = new Uint8Array(e)),
        (C = new Uint16Array(e)),
        (t.HEAP32 = S = new Int32Array(e)),
        (t.HEAPU32 = P = new Uint32Array(e)),
        (F = new Float32Array(e)),
        (I = new Float64Array(e)),
        (O = new BigInt64Array(e)),
        (L = new BigUint64Array(e)));
    }
    function $() {
      ((N = !0), a ? m() : za._b());
    }
    function D(e) {
      throw (
        b((e = 'Aborted(' + e + ')')),
        (v = !0),
        (e = new WebAssembly.RuntimeError(
          e + '. Build with -sASSERTIONS for more info.'
        )),
        _?.(e),
        e
      );
    }
    function R() {
      return {
        a: {
          f: pe,
          J: fe,
          k: ye,
          p: be,
          l: ve,
          ta: xe,
          b: Me,
          ca: ke,
          Ka: Ae,
          s: Te,
          da: Ie,
          _a: Oe,
          Ga: Le,
          Ia: ze,
          $a: Ne,
          Ya: Be,
          Ra: $e,
          Xa: De,
          pa: Re,
          Ha: Ue,
          Yb: Ge,
          Za: Ve,
          Fa: je,
          eb: We,
          Da: Ze,
          Tb: et,
          Rb: lt,
          Ca: ut,
          M: dt,
          H: pt,
          Sb: _t,
          ka: Mt,
          Ub: kt,
          Ua: Et,
          Wb: Pt,
          La: It,
          Pb: Ot,
          la: Lt,
          Ta: Ct,
          bb: zt,
          U: Xt,
          n: nn,
          c: rt,
          sb: rn,
          w: sn,
          L: an,
          z: on,
          j: ln,
          o: cn,
          tb: un,
          G: dn,
          T: pn,
          g: hn,
          u: fn,
          m: _n,
          i: mn,
          Oa: gn,
          Pa: vn,
          Qa: xn,
          Ma: Mn,
          Na: kn,
          Qb: Tn,
          fb: Cn,
          db: Fn,
          Y: Ln,
          rb: zn,
          ma: Nn,
          cb: Sn,
          gb: Bn,
          ab: $n,
          Xb: Dn,
          N: An,
          hb: Rn,
          X: Un,
          Vb: Gn,
          ob: ur,
          C: dr,
          sa: pr,
          ra: hr,
          qb: fr,
          W: _r,
          v: mr,
          nb: gr,
          mb: wr,
          lb: yr,
          pb: br,
          kb: vr,
          jb: xr,
          ib: Mr,
          Va: Tr,
          Wa: Cr,
          Ja: K,
          ea: Sr,
          oa: Pr,
          Sa: Fr,
          na: Or,
          Db: bo,
          xa: po,
          Eb: yo,
          ya: uo,
          F: eo,
          e: Ua,
          r: Da,
          x: $a,
          D: Ja,
          Ib: io,
          ba: ao,
          B: Va,
          za: lo,
          $: ho,
          ha: oo,
          Fb: go,
          Gb: mo,
          Ba: to,
          Aa: so,
          Jb: no,
          wa: wo,
          aa: co,
          d: Ga,
          A: ja,
          q: Ra,
          Cb: vo,
          t: qa,
          y: Ka,
          I: Wa,
          E: Ha,
          K: Za,
          S: fo,
          ja: Ya,
          _: _o,
          Kb: Xa,
          Lb: Qa,
          P: ro,
          h: Lr,
          a: ie,
          Ob: Y,
          Hb: zr,
          ia: Nr,
          O: Br,
          qa: $r,
          Mb: Dr,
          Q: Rr,
          zb: Ur,
          Ab: Gr,
          ua: Vr,
          fa: jr,
          R: Wr,
          Ea: qr,
          va: Hr,
          Z: Qr,
          xb: Xr,
          Zb: Yr,
          V: Jr,
          Bb: Kr,
          ub: Zr,
          vb: ts,
          wb: ns,
          ga: rs,
          yb: ss,
          Nb: as,
        },
      };
    }
    async function U() {
      function e(e, n) {
        var r,
          s,
          a,
          o,
          i = (za = e.exports);
        e = {};
        for (let [t, n] of Object.entries(i))
          'function' == typeof n ? ((i = Bt(n)), (e[t] = i)) : (e[t] = n);
        return (
          (s = za = e),
          (a = e => t => e(t) >>> 0),
          (o = e => () => e() >>> 0),
          ((s = Object.assign({}, s)).$b = a(s.$b)),
          (s.Cc = o(s.Cc)),
          (s.Ec = a(s.Ec)),
          (s.rd = ((r = s.rd), (e, t) => r(e, t) >>> 0)),
          (s.wd = a(s.wd)),
          (s.xd = o(s.xd)),
          (s.Bd = a(s.Bd)),
          (za = s),
          te.push(za.id),
          (os = (e = za).$b),
          (is = e.ac),
          (t._OrtInit = e.bc),
          (t._OrtGetLastError = e.cc),
          (t._OrtCreateSessionOptions = e.dc),
          (t._OrtAppendExecutionProvider = e.ec),
          (t._OrtAddFreeDimensionOverride = e.fc),
          (t._OrtAddSessionConfigEntry = e.gc),
          (t._OrtReleaseSessionOptions = e.hc),
          (t._OrtCreateSession = e.ic),
          (t._OrtReleaseSession = e.jc),
          (t._OrtGetInputOutputCount = e.kc),
          (t._OrtGetInputOutputMetadata = e.lc),
          (t._OrtFree = e.mc),
          (t._OrtCreateTensor = e.nc),
          (t._OrtGetTensorData = e.oc),
          (t._OrtReleaseTensor = e.pc),
          (t._OrtCreateRunOptions = e.qc),
          (t._OrtAddRunConfigEntry = e.rc),
          (t._OrtReleaseRunOptions = e.sc),
          (t._OrtCreateBinding = e.tc),
          (t._OrtBindInput = e.uc),
          (t._OrtBindOutput = e.vc),
          (t._OrtClearBoundOutputs = e.wc),
          (t._OrtReleaseBinding = e.xc),
          (t._OrtRunWithBinding = e.yc),
          (t._OrtRun = e.zc),
          (t._OrtEndProfiling = e.Ac),
          (ls = t._OrtGetWebGpuDevice = e.Bc),
          (cs = e.Cc),
          (us = t._free = e.Dc),
          (ds = t._malloc = e.Ec),
          (ps = t._wgpuBufferRelease = e.Fc),
          (hs = t._wgpuCreateInstance = e.Gc),
          (fs = e.Hc),
          (_s = e.Ic),
          (ms = e.Jc),
          (gs = e.Kc),
          (ws = e.Lc),
          (ys = e.Pc),
          (bs = e.Zc),
          (vs = e._c),
          (xs = e.$c),
          (Ms = e.bd),
          (ks = e.cd),
          (Es = e.dd),
          (As = e.ed),
          (Ts = e.fd),
          (Cs = e.gd),
          (Ss = e.hd),
          (Ps = e.kd),
          (Fs = e.ld),
          (Is = e.md),
          (Os = e.nd),
          (Ls = e.od),
          (zs = e.pd),
          (Ns = e.qd),
          (Bs = e.rd),
          ($s = e.sd),
          (Ds = e.td),
          (Rs = e.ud),
          (Us = e.vd),
          (Gs = e.wd),
          (Vs = e.xd),
          (js = e.yd),
          (Ws = e.zd),
          (qs = e.Ad),
          (Hs = e.Bd),
          (Qs = e.Cd),
          (Xs = e.Dd),
          (Ys = e.Ed),
          (Js = e.Fd),
          (Ks = e.Gd),
          (Zs = e.Hd),
          (ea = e.Id),
          (ta = e.Jd),
          (na = e.Kd),
          (ra = e.Ld),
          (sa = e.Md),
          (aa = e.Nd),
          (oa = e.Od),
          (ia = e.Pd),
          (la = e.Qd),
          (ca = e.Rd),
          (ua = e.Td),
          (da = e.Ud),
          (pa = e.Vd),
          (ha = e.Wd),
          (fa = e.Yd),
          (_a = e.Zd),
          (ma = e._d),
          (ga = e.$d),
          (wa = e.ae),
          (ya = e.be),
          (ba = e.pe),
          (va = e.qe),
          (xa = e.re),
          (Ma = e.se),
          (ka = e.te),
          (Ea = e.ue),
          (Aa = e.ve),
          (Ta = e.we),
          (Ca = e.xe),
          (Sa = e.ye),
          (Pa = e.ze),
          (Fa = e.Xe),
          (Ia = e.Ye),
          (Oa = e.Ze),
          (La = e._e),
          (p = n),
          za
        );
      }
      var r,
        s = R();
      return t.instantiateWasm
        ? new Promise(n => {
            t.instantiateWasm(s, (t, r) => {
              n(e(t, r));
            });
          })
        : a
          ? e(new WebAssembly.Instance(p, R()), p)
          : ((z ??= t.locateFile
              ? t.locateFile
                ? t.locateFile('ort-wasm-simd-threaded.asyncify.wasm', u)
                : u + 'ort-wasm-simd-threaded.asyncify.wasm'
              : new URL(n(470), n.b).href),
            e(
              (r = await (async function (e) {
                var t = z;
                if (!d && !x(t))
                  try {
                    var n = fetch(t, { credentials: 'same-origin' });
                    return await WebAssembly.instantiateStreaming(n, e);
                  } catch (e) {
                    (b(`wasm streaming compile failed: ${e}`),
                      b('falling back to ArrayBuffer instantiation'));
                  }
                return (async function (e, t) {
                  try {
                    var n = await (async function (e) {
                      if (!d)
                        try {
                          var t = await i(e);
                          return new Uint8Array(t);
                        } catch {}
                      if (e == z && d) e = new Uint8Array(d);
                      else {
                        if (!l)
                          throw 'both async and sync fetching of the wasm failed';
                        e = l(e);
                      }
                      return e;
                    })(e);
                    return await WebAssembly.instantiate(n, t);
                  } catch (e) {
                    (b(`failed to asynchronously prepare wasm: ${e}`), D(e));
                  }
                })(t, e);
              })(s)).instance,
              r.module
            ));
    }
    class G {
      name = 'ExitStatus';
      constructor(e) {
        ((this.message = `Program terminated with exit(${e})`),
          (this.status = e));
      }
    }
    var V = e => {
        (e.terminate(), (e.onmessage = () => {}));
      },
      j = [],
      W = 0,
      q = null,
      H = e => {
        0 == Z.length && (oe(), ae(Z[0]));
        var t = Z.pop();
        if (!t) return 6;
        (ee.push(t), (ne[e.Nc] = t), (t.Nc = e.Nc));
        var n = { Oc: 'run', he: e.ge, Wc: e.Wc, Nc: e.Nc };
        return (t.postMessage(n, e.Yc), 0);
      },
      Q = 0,
      X = (e, t, ...n) => {
        var r,
          s = 16 * n.length,
          a = Vs(),
          o = Gs(s),
          i = o >>> 3;
        for (r of n)
          'bigint' == typeof r
            ? (((M(), O)[i++ >>> 0] = 1n), ((M(), O)[i++ >>> 0] = r))
            : (((M(), O)[i++ >>> 0] = 0n), ((M(), I)[i++ >>> 0] = r));
        return ((e = Is(e, 0, s, o, t)), Us(a), e);
      };
    function Y(e) {
      if (a) return X(0, 1, e);
      if (((h = e), !(0 < Q))) {
        for (var t of ee) V(t);
        for (t of Z) V(t);
        ((Z = []), (ee = []), (ne = {}), (v = !0));
      }
      c(0, new G(e));
    }
    function J(e) {
      if (a) return X(1, 0, e);
      K(e);
    }
    var K = e => {
        if (((h = e), a)) throw (J(e), 'unwind');
        Y(e);
      },
      Z = [],
      ee = [],
      te = [],
      ne = {},
      re = e => {
        var t = e.Nc;
        (delete ne[t],
          Z.push(e),
          ee.splice(ee.indexOf(e), 1),
          (e.Nc = 0),
          Os(t));
      };
    function se() {
      te.forEach(e => e());
    }
    var ae = e =>
      new Promise(n => {
        ((e.onmessage = r => {
          var s = r.data;
          if (((r = s.Oc), s.Vc && s.Vc != cs())) {
            var a = ne[s.Vc];
            a
              ? a.postMessage(s, s.Yc)
              : b(
                  `Internal error! Worker sent a message "${r}" to target pthread ${s.Vc}, but that thread no longer exists!`
                );
          } else
            'checkMailbox' === r
              ? St()
              : 'spawnThread' === r
                ? H(s)
                : 'cleanupThread' === r
                  ? At(() => {
                      re(ne[s.ie]);
                    })
                  : 'loaded' === r
                    ? ((e.loaded = !0), n(e))
                    : 'setimmediate' === s.target
                      ? e.postMessage(s)
                      : 'uncaughtException' === r
                        ? e.onerror(s.error)
                        : 'callHandler' === r
                          ? t[s.ce](...s.args)
                          : r && b(`worker sent an unknown command ${r}`);
        }),
          (e.onerror = e => {
            throw (
              b(
                `worker sent an error! ${e.filename}:${e.lineno}: ${e.message}`
              ),
              e
            );
          }));
        var r,
          s = [];
        for (r of []) t.propertyIsEnumerable(r) && s.push(r);
        e.postMessage({ Oc: 'load', de: s, je: ie, ke: p });
      });
    function oe() {
      var e = new Worker(new URL(n(191), n.b), {
        type: 'module',
        workerData: 'em-pthread',
        name: 'em-pthread',
      });
      Z.push(e);
    }
    var ie,
      le = (e, t) => {
        ((Q = 0), (e = Xs(e, t)), 0 < Q ? (h = e) : Ls(e));
      },
      ce = [],
      ue = 0,
      de = e =>
        -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
    function pe(e) {
      var t = new ge((e >>>= 0));
      return (
        0 == (M(), E)[(t.Qc + 12) >>> 0] && (_e(t, !0), ue--),
        me(t, !1),
        ce.push(t),
        Hs(e)
      );
    }
    var he = 0,
      fe = () => {
        $s(0, 0);
        var e = ce.pop();
        (js(e.Xc), (he = 0));
      };
    function _e(e, t) {
      ((t = t ? 1 : 0), ((M(), E)[(e.Qc + 12) >>> 0] = t));
    }
    function me(e, t) {
      ((t = t ? 1 : 0), ((M(), E)[(e.Qc + 13) >>> 0] = t));
    }
    class ge {
      constructor(e) {
        ((this.Xc = e), (this.Qc = e - 24));
      }
    }
    var we = e => {
      var t = he;
      if (!t) return (Ds(0), 0);
      var n = new ge(t);
      (M(), P)[((n.Qc + 16) >>> 2) >>> 0] = t;
      var r = (M(), P)[((n.Qc + 4) >>> 2) >>> 0];
      if (!r) return (Ds(0), t);
      for (var s of e) {
        if (0 === s || s === r) break;
        if (qs(s, r, n.Qc + 16)) return (Ds(s), t);
      }
      return (Ds(r), t);
    };
    function ye() {
      return we([]);
    }
    function be(e) {
      return we([e >>> 0]);
    }
    function ve(e, t, n, r) {
      return we([e >>> 0, t >>> 0, n >>> 0, r >>> 0]);
    }
    var xe = () => {
      var e = ce.pop();
      e || D('no exception to throw');
      var t = e.Xc;
      throw (
        0 == (M(), E)[(e.Qc + 13) >>> 0] &&
          (ce.push(e), me(e, !0), _e(e, !1), ue++),
        Ws(t),
        (he = t)
      );
    };
    function Me(e, t, n) {
      var r = new ge((e >>>= 0));
      throw (
        (t >>>= 0),
        (n >>>= 0),
        ((M(), P)[((r.Qc + 16) >>> 2) >>> 0] = 0),
        ((M(), P)[((r.Qc + 4) >>> 2) >>> 0] = t),
        ((M(), P)[((r.Qc + 8) >>> 2) >>> 0] = n),
        Ws(e),
        ue++,
        (he = e)
      );
    }
    var ke = () => ue;
    function Ee(e, t, n, r) {
      return a ? X(2, 1, e, t, n, r) : Ae(e, t, n, r);
    }
    function Ae(e, t, n, r) {
      if (
        ((e >>>= 0),
        (t >>>= 0),
        (n >>>= 0),
        (r >>>= 0),
        !globalThis.SharedArrayBuffer)
      )
        return 6;
      var s = [];
      return a && 0 === s.length
        ? Ee(e, t, n, r)
        : ((e = { ge: n, Nc: e, Wc: r, Yc: s }),
          a ? ((e.Oc = 'spawnThread'), postMessage(e, s), 0) : H(e));
    }
    function Te(e) {
      throw ((he ||= e >>> 0), he);
    }
    var Ce = globalThis.TextDecoder && new TextDecoder(),
      Se = (e, t, n, r) => {
        if (((n = t + n), r)) return n;
        for (; e[t] && !(t >= n); ) ++t;
        return t;
      },
      Pe = (e, t = 0, n, r) => {
        if (16 < (n = Se(e, (t >>>= 0), n, r)) - t && e.buffer && Ce)
          return Ce.decode(
            e.buffer instanceof ArrayBuffer ? e.subarray(t, n) : e.slice(t, n)
          );
        for (r = ''; t < n; ) {
          var s = e[t++];
          if (128 & s) {
            var a = 63 & e[t++];
            if (192 == (224 & s)) r += String.fromCharCode(((31 & s) << 6) | a);
            else {
              var o = 63 & e[t++];
              65536 >
              (s =
                224 == (240 & s)
                  ? ((15 & s) << 12) | (a << 6) | o
                  : ((7 & s) << 18) | (a << 12) | (o << 6) | (63 & e[t++]))
                ? (r += String.fromCharCode(s))
                : ((s -= 65536),
                  (r += String.fromCharCode(
                    55296 | (s >> 10),
                    56320 | (1023 & s)
                  )));
            }
          } else r += String.fromCharCode(s);
        }
        return r;
      },
      Fe = (e, t, n) => ((e >>>= 0) ? Pe((M(), A), e, t, n) : '');
    function Ie(e, t, n) {
      return a ? X(3, 1, e, t, n) : 0;
    }
    function Oe(e, t) {
      if (a) return X(4, 1, e, t);
    }
    function Le(e, t) {
      if (a) return X(5, 1, e, t);
    }
    function ze(e, t, n) {
      if (a) return X(6, 1, e, t, n);
    }
    function Ne(e, t, n) {
      return a ? X(7, 1, e, t, n) : 0;
    }
    function Be(e, t) {
      if (a) return X(8, 1, e, t);
    }
    function $e(e, t, n) {
      if (a) return X(9, 1, e, t, n);
    }
    function De(e, t, n, r) {
      if (a) return X(10, 1, e, t, n, r);
    }
    function Re(e, t, n, r) {
      if (a) return X(11, 1, e, t, n, r);
    }
    function Ue(e, t, n, r) {
      if (a) return X(12, 1, e, t, n, r);
    }
    function Ge(e) {
      if (a) return X(13, 1, e);
    }
    function Ve(e, t) {
      if (a) return X(14, 1, e, t);
    }
    function je(e, t, n) {
      if (a) return X(15, 1, e, t, n);
    }
    var We = () => D(''),
      qe = e => {
        e >>>= 0;
        for (var t = ''; ; ) {
          var n = (M(), A)[e++ >>> 0];
          if (!n) return t;
          t += String.fromCharCode(n);
        }
      },
      He = {},
      Qe = {},
      Xe = {},
      Ye = class extends Error {
        constructor(e) {
          (super(e), (this.name = 'BindingError'));
        }
      };
    function Je(e, t, n = {}) {
      return (function (e, t, n = {}) {
        var r = t.name;
        if (!e)
          throw new Ye(
            `type "${r}" must have a positive integer typeid pointer`
          );
        if (Qe.hasOwnProperty(e)) {
          if (n.ee) return;
          throw new Ye(`Cannot register type '${r}' twice`);
        }
        ((Qe[e] = t),
          delete Xe[e],
          He.hasOwnProperty(e) &&
            ((t = He[e]), delete He[e], t.forEach(e => e())));
      })(e, t, n);
    }
    var Ke = (e, t, n) => {
      switch (t) {
        case 1:
          return n ? e => (M(), E)[e >>> 0] : e => (M(), A)[e >>> 0];
        case 2:
          return n
            ? e => (M(), T)[(e >>> 1) >>> 0]
            : e => (M(), C)[(e >>> 1) >>> 0];
        case 4:
          return n
            ? e => (M(), S)[(e >>> 2) >>> 0]
            : e => (M(), P)[(e >>> 2) >>> 0];
        case 8:
          return n
            ? e => (M(), O)[(e >>> 3) >>> 0]
            : e => (M(), L)[(e >>> 3) >>> 0];
        default:
          throw new TypeError(`invalid integer width (${t}): ${e}`);
      }
    };
    function Ze(e, t, n, r, s) {
      ((e >>>= 0), (n >>>= 0), (t = qe(t >>> 0)));
      let a = e => e;
      if ((r = 0n === r)) {
        let e = 8 * n;
        ((a = t => BigInt.asUintN(e, t)), (s = a(s)));
      }
      Je(e, {
        name: t,
        Mc: a,
        Sc: (e, t) => ('number' == typeof t && (t = BigInt(t)), t),
        Rc: Ke(t, n, !r),
        Tc: null,
      });
    }
    function et(e, t, n, r) {
      Je((e >>>= 0), {
        name: (t = qe(t >>> 0)),
        Mc: function (e) {
          return !!e;
        },
        Sc: function (e, t) {
          return t ? n : r;
        },
        Rc: function (e) {
          return this.Mc((M(), A)[e >>> 0]);
        },
        Tc: null,
      });
    }
    var tt = [],
      nt = [0, 1, , 1, null, 1, !0, 1, !1, 1];
    function rt(e) {
      9 < (e >>>= 0) && 0 == --nt[e + 1] && ((nt[e] = void 0), tt.push(e));
    }
    var st = e => {
        if (!e) throw new Ye(`Cannot use deleted val. handle = ${e}`);
        return nt[e];
      },
      at = e => {
        switch (e) {
          case void 0:
            return 2;
          case null:
            return 4;
          case !0:
            return 6;
          case !1:
            return 8;
          default:
            let t = tt.pop() || nt.length;
            return ((nt[t] = e), (nt[t + 1] = 1), t);
        }
      };
    function ot(e) {
      return this.Mc((M(), P)[(e >>> 2) >>> 0]);
    }
    var it = {
      name: 'emscripten::val',
      Mc: e => {
        var t = st(e);
        return (rt(e), t);
      },
      Sc: (e, t) => at(t),
      Rc: ot,
      Tc: null,
    };
    function lt(e) {
      return Je(e >>> 0, it);
    }
    var ct = (e, t) => {
      switch (t) {
        case 4:
          return function (e) {
            return this.Mc((M(), F)[(e >>> 2) >>> 0]);
          };
        case 8:
          return function (e) {
            return this.Mc((M(), I)[(e >>> 3) >>> 0]);
          };
        default:
          throw new TypeError(`invalid float width (${t}): ${e}`);
      }
    };
    function ut(e, t, n) {
      ((n >>>= 0),
        Je((e >>>= 0), {
          name: (t = qe(t >>> 0)),
          Mc: e => e,
          Sc: (e, t) => t,
          Rc: ct(t, n),
          Tc: null,
        }));
    }
    function dt(e, t, n, r, s) {
      ((e >>>= 0), (n >>>= 0), (t = qe(t >>> 0)));
      let a = e => e;
      if (0 === r) {
        var o = 32 - 8 * n;
        ((a = e => (e << o) >>> o), (s = a(s)));
      }
      Je(e, {
        name: t,
        Mc: a,
        Sc: (e, t) => t,
        Rc: Ke(t, n, 0 !== r),
        Tc: null,
      });
    }
    function pt(e, t, n) {
      function r(e) {
        var t = (M(), P)[(e >>> 2) >>> 0];
        return (
          (e = (M(), P)[((e + 4) >>> 2) >>> 0]),
          new s((M(), E).buffer, e, t)
        );
      }
      var s = [
        Int8Array,
        Uint8Array,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
        BigInt64Array,
        BigUint64Array,
      ][t];
      Je((e >>>= 0), { name: (n = qe(n >>> 0)), Mc: r, Rc: r }, { ee: !0 });
    }
    var ht = (e, t, n) => {
        var r = (M(), A);
        if (((t >>>= 0), 0 < n)) {
          var s = t;
          n = t + n - 1;
          for (var a = 0; a < e.length; ++a) {
            var o = e.codePointAt(a);
            if (127 >= o) {
              if (t >= n) break;
              r[t++ >>> 0] = o;
            } else if (2047 >= o) {
              if (t + 1 >= n) break;
              ((r[t++ >>> 0] = 192 | (o >> 6)),
                (r[t++ >>> 0] = 128 | (63 & o)));
            } else if (65535 >= o) {
              if (t + 2 >= n) break;
              ((r[t++ >>> 0] = 224 | (o >> 12)),
                (r[t++ >>> 0] = 128 | ((o >> 6) & 63)),
                (r[t++ >>> 0] = 128 | (63 & o)));
            } else {
              if (t + 3 >= n) break;
              ((r[t++ >>> 0] = 240 | (o >> 18)),
                (r[t++ >>> 0] = 128 | ((o >> 12) & 63)),
                (r[t++ >>> 0] = 128 | ((o >> 6) & 63)),
                (r[t++ >>> 0] = 128 | (63 & o)),
                a++);
            }
          }
          ((r[t >>> 0] = 0), (e = t - s));
        } else e = 0;
        return e;
      },
      ft = e => {
        for (var t = 0, n = 0; n < e.length; ++n) {
          var r = e.charCodeAt(n);
          127 >= r
            ? t++
            : 2047 >= r
              ? (t += 2)
              : 55296 <= r && 57343 >= r
                ? ((t += 4), ++n)
                : (t += 3);
        }
        return t;
      };
    function _t(e, t) {
      Je((e >>>= 0), {
        name: (t = qe(t >>> 0)),
        Mc(e) {
          var t = (M(), P)[(e >>> 2) >>> 0];
          return ((t = Fe(e + 4, t, !0)), us(e), t);
        },
        Sc(e, t) {
          t instanceof ArrayBuffer && (t = new Uint8Array(t));
          var n = 'string' == typeof t;
          if (!(n || (ArrayBuffer.isView(t) && 1 == t.BYTES_PER_ELEMENT)))
            throw new Ye('Cannot pass non-string to std::string');
          var r = n ? ft(t) : t.length,
            s = ds(4 + r + 1),
            a = s + 4;
          return (
            ((M(), P)[(s >>> 2) >>> 0] = r),
            n ? ht(t, a, r + 1) : (M(), A).set(t, a >>> 0),
            null !== e && e.push(us, s),
            s
          );
        },
        Rc: ot,
        Tc(e) {
          us(e);
        },
      });
    }
    var mt = globalThis.TextDecoder ? new TextDecoder('utf-16le') : void 0,
      gt = (e, t, n) => {
        if (((e >>>= 1), 16 < (t = Se((M(), C), e, t / 2, n)) - e && mt))
          return mt.decode((M(), C).slice(e, t));
        for (n = ''; e < t; ++e) {
          var r = (M(), C)[e >>> 0];
          n += String.fromCharCode(r);
        }
        return n;
      },
      wt = (e, t, n) => {
        if (((n ??= 2147483647), 2 > n)) return 0;
        var r = t;
        n = (n -= 2) < 2 * e.length ? n / 2 : e.length;
        for (var s = 0; s < n; ++s) {
          var a = e.charCodeAt(s);
          (((M(), T)[(t >>> 1) >>> 0] = a), (t += 2));
        }
        return (((M(), T)[(t >>> 1) >>> 0] = 0), t - r);
      },
      yt = e => 2 * e.length,
      bt = (e, t, n) => {
        var r = '';
        e >>>= 2;
        for (var s = 0; !(s >= t / 4); s++) {
          var a = (M(), P)[(e + s) >>> 0];
          if (!a && !n) break;
          r += String.fromCodePoint(a);
        }
        return r;
      },
      vt = (e, t, n) => {
        if (((t >>>= 0), (n ??= 2147483647), 4 > n)) return 0;
        var r = t;
        n = r + n - 4;
        for (var s = 0; s < e.length; ++s) {
          var a = e.codePointAt(s);
          if (
            (65535 < a && s++,
            ((M(), S)[(t >>> 2) >>> 0] = a),
            (t += 4) + 4 > n)
          )
            break;
        }
        return (((M(), S)[(t >>> 2) >>> 0] = 0), t - r);
      },
      xt = e => {
        for (var t = 0, n = 0; n < e.length; ++n)
          (65535 < e.codePointAt(n) && n++, (t += 4));
        return t;
      };
    function Mt(e, t, n) {
      if (((e >>>= 0), (t >>>= 0), (n = qe((n >>>= 0))), 2 === t))
        var r = gt,
          s = wt,
          a = yt;
      else ((r = bt), (s = vt), (a = xt));
      Je(e, {
        name: n,
        Mc: e => {
          var n = (M(), P)[(e >>> 2) >>> 0];
          return ((n = r(e + 4, n * t, !0)), us(e), n);
        },
        Sc: (e, r) => {
          if ('string' != typeof r)
            throw new Ye(`Cannot pass non-string to C++ string type ${n}`);
          var o = a(r),
            i = ds(4 + o + t);
          return (
            ((M(), P)[(i >>> 2) >>> 0] = o / t),
            s(r, i + 4, o + t),
            null !== e && e.push(us, i),
            i
          );
        },
        Rc: ot,
        Tc(e) {
          us(e);
        },
      });
    }
    function kt(e, t) {
      Je((e >>>= 0), {
        fe: !0,
        name: (t = qe(t >>> 0)),
        Mc: () => {},
        Sc: () => {},
      });
    }
    function Et(e) {
      (Ps(e >>> 0, !s, 1, !r, 131072, !1), se());
    }
    var At = e => {
        if (!v)
          try {
            if ((e(), !(0 < Q)))
              try {
                a ? cs() && Ls(h) : K(h);
              } catch (e) {
                e instanceof G || 'unwind' == e || c(0, e);
              }
          } catch (e) {
            e instanceof G || 'unwind' == e || c(0, e);
          }
      },
      Tt =
        !Atomics.waitAsync ||
        (globalThis.navigator?.userAgent &&
          91 >
            Number(
              (navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) || [])[2]
            ));
    function Ct(e) {
      ((e >>>= 0),
        Tt ||
          (Atomics.waitAsync((M(), S), e >>> 2, e).value.then(St),
          (e += 128),
          Atomics.store((M(), S), e >>> 2, 1)));
    }
    var St = () =>
      At(() => {
        var e = cs();
        e && (Ct(e), Ns());
      });
    function Pt(e, t) {
      (e >>>= 0) == t >>> 0
        ? setTimeout(St)
        : a
          ? postMessage({ Vc: e, Oc: 'checkMailbox' })
          : (e = ne[e]) && e.postMessage({ Oc: 'checkMailbox' });
    }
    var Ft = [];
    function It(e, t, n, r, s) {
      for (
        t >>>= 0, s >>>= 0, Ft.length = 0, n = s >>> 3, r = (s + r) >>> 3;
        n < r;

      ) {
        var a;
        ((a = (M(), O)[n++ >>> 0] ? (M(), O)[n++ >>> 0] : (M(), I)[n++ >>> 0]),
          Ft.push(a));
      }
      return (t ? Ba[t] : Na[e])(...Ft);
    }
    var Ot = () => {
      Q = 0;
    };
    function Lt(e) {
      ((e >>>= 0), a ? postMessage({ Oc: 'cleanupThread', ie: e }) : re(ne[e]));
    }
    function zt(e) {}
    var Nt = e => {
      try {
        e();
      } catch (e) {
        D(e);
      }
    };
    function Bt(e) {
      var t = (...t) => {
        Ut.push(e);
        try {
          return e(...t);
        } finally {
          v ||
            (Ut.pop(),
            Dt &&
              1 === $t &&
              0 === Ut.length &&
              (($t = 0), (Q += 1), Nt(Ia), typeof Fibers < 'u' && Fibers.De()));
        }
      };
      return (jt.set(e, t), t);
    }
    var $t = 0,
      Dt = null,
      Rt = 0,
      Ut = [],
      Gt = new Map(),
      Vt = new Map(),
      jt = new Map(),
      Wt = 0,
      qt = null,
      Ht = [],
      Qt = e =>
        (function () {
          if (!v) {
            if (0 === $t) {
              var t = !1,
                n = !1;
              (e().then((e = 0) => {
                if (!v && ((Rt = e), (t = !0), n)) {
                  (($t = 2),
                    Nt(() => Oa(Dt)),
                    typeof MainLoop < 'u' && MainLoop.Xd && MainLoop.resume(),
                    (e = !1));
                  try {
                    var r =
                      ((o = (M(), S)[((Dt + 8) >>> 2) >>> 0]),
                      (o = Vt.get(o)),
                      (o = jt.get(o)),
                      --Q,
                      o());
                  } catch (o) {
                    ((r = o), (e = !0));
                  }
                  var s = !1;
                  if (!Dt) {
                    var a = qt;
                    a && ((qt = null), (e ? a.reject : a.resolve)(r), (s = !0));
                  }
                  if (e && !s) throw r;
                }
                var o;
              }),
                (n = !0),
                t ||
                  (($t = 1),
                  (Dt = (function () {
                    var e = ds(65548),
                      t = e + 12;
                    if (
                      (((M(), P)[(e >>> 2) >>> 0] = t),
                      ((M(), P)[((e + 4) >>> 2) >>> 0] = t + 65536),
                      (t = Ut[0]),
                      !Gt.has(t))
                    ) {
                      var n = Wt++;
                      (Gt.set(t, n), Vt.set(n, t));
                    }
                    return (
                      (t = Gt.get(t)),
                      ((M(), S)[((e + 8) >>> 2) >>> 0] = t),
                      e
                    );
                  })()),
                  typeof MainLoop < 'u' && MainLoop.Xd && MainLoop.pause(),
                  Nt(() => Fa(Dt))));
            } else
              2 === $t
                ? (($t = 0), Nt(La), us(Dt), (Dt = null), Ht.forEach(At))
                : D(`invalid state: ${$t}`);
            return Rt;
          }
        })();
    function Xt(e) {
      return (
        (e >>>= 0),
        Qt(async () => {
          var t = await st(e);
          return at(t);
        })
      );
    }
    var Yt = [],
      Jt = e => {
        var t = Yt.length;
        return (Yt.push(e), t);
      },
      Kt = (e, t) => {
        for (var n = Array(e), r = 0; r < e; ++r) {
          var s = r,
            a = (M(), P)[((t + 4 * r) >>> 2) >>> 0],
            o = Qe[a];
          if (void 0 === o)
            throw (
              (e = `parameter ${r}`),
              (a = os(a)),
              (t = qe(a)),
              us(a),
              new Ye(`${e} has unknown type ${t}`)
            );
          n[s] = o;
        }
        return n;
      },
      Zt = (e, t, n) => {
        var r = [];
        return (
          (e = e(r, n)),
          r.length && ((M(), P)[(t >>> 2) >>> 0] = at(r)),
          e
        );
      },
      en = {},
      tn = e => {
        var t = en[e];
        return void 0 === t ? qe(e) : t;
      };
    function nn(e, t, n) {
      var [r, ...s] = Kt(e, t >>> 0);
      t = r.Sc.bind(r);
      var a = s.map(e => e.Rc.bind(e));
      e--;
      var o = { toValue: st };
      switch (
        ((e = a.map((e, t) => {
          var n = `argFromPtr${t}`;
          return ((o[n] = e), `${n}(args${t ? '+' + 8 * t : ''})`);
        })),
        n)
      ) {
        case 0:
          var i = 'toValue(handle)';
          break;
        case 2:
          i = 'new (toValue(handle))';
          break;
        case 3:
          i = '';
          break;
        case 1:
          ((o.getStringOrSymbol = tn),
            (i = 'toValue(handle)[getStringOrSymbol(methodName)]'));
      }
      return (
        (i += `(${e})`),
        r.fe ||
          ((o.toReturnWire = t),
          (o.emval_returnValue = Zt),
          (i = `return emval_returnValue(toReturnWire, destructorsRef, ${i})`)),
        (i = `return function (handle, methodName, destructorsRef, args) {\n  ${i}\n  }`),
        (n = new Function(Object.keys(o), i)(...Object.values(o))),
        (i = `methodCaller<(${s.map(e => e.name)}) => ${r.name}>`),
        Jt(Object.defineProperty(n, 'name', { value: i }))
      );
    }
    function rn(e, t) {
      return ((t >>>= 0), (e = st(e >>> 0)) == st(t));
    }
    function sn(e) {
      return (e >>>= 0) ? ((e = tn(e)), at(globalThis[e])) : at(globalThis);
    }
    function an(e) {
      return ((e = tn(e >>> 0)), at(t[e]));
    }
    function on(e, t) {
      return ((t >>>= 0), (e = st(e >>> 0)), (t = st(t)), at(e[t]));
    }
    function ln(e) {
      9 < (e >>>= 0) && (nt[e + 1] += 1);
    }
    function cn(e, t, n, r, s) {
      return Yt[e >>> 0](t >>> 0, n >>> 0, r >>> 0, s >>> 0);
    }
    function un(e, t, n, r, s) {
      return cn(e >>> 0, t >>> 0, n >>> 0, r >>> 0, s >>> 0);
    }
    function dn() {
      return at([]);
    }
    function pn(e) {
      e = st(e >>> 0);
      for (var t = Array(e.length), n = 0; n < e.length; n++) t[n] = e[n];
      return at(t);
    }
    function hn(e) {
      return at(tn(e >>> 0));
    }
    function fn() {
      return at({});
    }
    function _n(e) {
      for (var t = st((e >>>= 0)); t.length; ) {
        var n = t.pop();
        t.pop()(n);
      }
      rt(e);
    }
    function mn(e, t, n) {
      ((t >>>= 0),
        (n >>>= 0),
        (e = st(e >>> 0)),
        (t = st(t)),
        (n = st(n)),
        (e[t] = n));
    }
    function gn(e, t) {
      ((e = de(e)),
        (t >>>= 0),
        (e = new Date(1e3 * e)),
        ((M(), S)[(t >>> 2) >>> 0] = e.getUTCSeconds()),
        ((M(), S)[((t + 4) >>> 2) >>> 0] = e.getUTCMinutes()),
        ((M(), S)[((t + 8) >>> 2) >>> 0] = e.getUTCHours()),
        ((M(), S)[((t + 12) >>> 2) >>> 0] = e.getUTCDate()),
        ((M(), S)[((t + 16) >>> 2) >>> 0] = e.getUTCMonth()),
        ((M(), S)[((t + 20) >>> 2) >>> 0] = e.getUTCFullYear() - 1900),
        ((M(), S)[((t + 24) >>> 2) >>> 0] = e.getUTCDay()),
        (e =
          ((e.getTime() - Date.UTC(e.getUTCFullYear(), 0, 1, 0, 0, 0, 0)) /
            864e5) |
          0),
        ((M(), S)[((t + 28) >>> 2) >>> 0] = e));
    }
    var wn = e => e % 4 == 0 && (e % 100 != 0 || e % 400 == 0),
      yn = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335],
      bn = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function vn(e, t) {
      ((e = de(e)),
        (t >>>= 0),
        (e = new Date(1e3 * e)),
        ((M(), S)[(t >>> 2) >>> 0] = e.getSeconds()),
        ((M(), S)[((t + 4) >>> 2) >>> 0] = e.getMinutes()),
        ((M(), S)[((t + 8) >>> 2) >>> 0] = e.getHours()),
        ((M(), S)[((t + 12) >>> 2) >>> 0] = e.getDate()),
        ((M(), S)[((t + 16) >>> 2) >>> 0] = e.getMonth()),
        ((M(), S)[((t + 20) >>> 2) >>> 0] = e.getFullYear() - 1900),
        ((M(), S)[((t + 24) >>> 2) >>> 0] = e.getDay()));
      var n =
        ((wn(e.getFullYear()) ? yn : bn)[e.getMonth()] + e.getDate() - 1) | 0;
      (((M(), S)[((t + 28) >>> 2) >>> 0] = n),
        ((M(), S)[((t + 36) >>> 2) >>> 0] = -60 * e.getTimezoneOffset()),
        (n = new Date(e.getFullYear(), 6, 1).getTimezoneOffset()));
      var r = new Date(e.getFullYear(), 0, 1).getTimezoneOffset();
      ((e = 0 | (n != r && e.getTimezoneOffset() == Math.min(r, n))),
        ((M(), S)[((t + 32) >>> 2) >>> 0] = e));
    }
    function xn(e) {
      e >>>= 0;
      var t = new Date(
          (M(), S)[((e + 20) >>> 2) >>> 0] + 1900,
          (M(), S)[((e + 16) >>> 2) >>> 0],
          (M(), S)[((e + 12) >>> 2) >>> 0],
          (M(), S)[((e + 8) >>> 2) >>> 0],
          (M(), S)[((e + 4) >>> 2) >>> 0],
          (M(), S)[(e >>> 2) >>> 0],
          0
        ),
        n = (M(), S)[((e + 32) >>> 2) >>> 0],
        r = t.getTimezoneOffset(),
        s = new Date(t.getFullYear(), 6, 1).getTimezoneOffset(),
        a = new Date(t.getFullYear(), 0, 1).getTimezoneOffset(),
        o = Math.min(a, s);
      return (
        0 > n
          ? ((M(), S)[((e + 32) >>> 2) >>> 0] = +(s != a && o == r))
          : 0 < n != (o == r) &&
            ((s = Math.max(a, s)),
            t.setTime(t.getTime() + 6e4 * ((0 < n ? o : s) - r))),
        ((M(), S)[((e + 24) >>> 2) >>> 0] = t.getDay()),
        (n =
          ((wn(t.getFullYear()) ? yn : bn)[t.getMonth()] + t.getDate() - 1) |
          0),
        ((M(), S)[((e + 28) >>> 2) >>> 0] = n),
        ((M(), S)[(e >>> 2) >>> 0] = t.getSeconds()),
        ((M(), S)[((e + 4) >>> 2) >>> 0] = t.getMinutes()),
        ((M(), S)[((e + 8) >>> 2) >>> 0] = t.getHours()),
        ((M(), S)[((e + 12) >>> 2) >>> 0] = t.getDate()),
        ((M(), S)[((e + 16) >>> 2) >>> 0] = t.getMonth()),
        ((M(), S)[((e + 20) >>> 2) >>> 0] = t.getYear()),
        (e = t.getTime()),
        BigInt(isNaN(e) ? -1 : e / 1e3)
      );
    }
    function Mn(e, t, n, r, s, o, i) {
      return a ? X(16, 1, e, t, n, r, s, o, i) : -52;
    }
    function kn(e, t, n, r, s, o) {
      if (a) return X(17, 1, e, t, n, r, s, o);
    }
    var En = {},
      An = () => performance.timeOrigin + performance.now();
    function Tn(e, t) {
      if (a) return X(18, 1, e, t);
      if ((En[e] && (clearTimeout(En[e].id), delete En[e]), !t)) return 0;
      var n = setTimeout(() => {
        (delete En[e],
          At(() => zs(e, performance.timeOrigin + performance.now())));
      }, t);
      return ((En[e] = { id: n, Ce: t }), 0);
    }
    function Cn(e, t, n, r) {
      ((e >>>= 0), (t >>>= 0), (n >>>= 0), (r >>>= 0));
      var s = new Date().getFullYear(),
        a = new Date(s, 0, 1).getTimezoneOffset();
      s = new Date(s, 6, 1).getTimezoneOffset();
      var o = Math.max(a, s);
      (((M(), P)[(e >>> 2) >>> 0] = 60 * o),
        ((M(), S)[(t >>> 2) >>> 0] = +(a != s)),
        (e = (t = e => {
          var t = Math.abs(e);
          return `UTC${0 <= e ? '-' : '+'}${String(Math.floor(t / 60)).padStart(2, '0')}${String(t % 60).padStart(2, '0')}`;
        })(a)),
        (t = t(s)),
        s < a ? (ht(e, n, 17), ht(t, r, 17)) : (ht(e, r, 17), ht(t, n, 17)));
    }
    var Sn = () => Date.now(),
      Pn = 1;
    function Fn(e, t, n) {
      if (((n >>>= 0), !(0 <= e && 3 >= e))) return 28;
      if (0 === e) e = Date.now();
      else {
        if (!Pn) return 52;
        e = performance.timeOrigin + performance.now();
      }
      return (
        (e = Math.round(1e6 * e)),
        ((M(), O)[(n >>> 3) >>> 0] = BigInt(e)),
        0
      );
    }
    var In = [],
      On = (e, t) => {
        In.length = 0;
        for (var n; (n = (M(), A)[e++ >>> 0]); ) {
          var r = 105 != n;
          ((t += (r &= 112 != n) && t % 8 ? 4 : 0),
            In.push(
              112 == n
                ? (M(), P)[(t >>> 2) >>> 0]
                : 106 == n
                  ? (M(), O)[(t >>> 3) >>> 0]
                  : 105 == n
                    ? (M(), S)[(t >>> 2) >>> 0]
                    : (M(), I)[(t >>> 3) >>> 0]
            ),
            (t += r ? 8 : 4));
        }
        return In;
      };
    function Ln(e, t, n) {
      return ((e >>>= 0), (t = On(t >>> 0, n >>> 0)), Ba[e](...t));
    }
    function zn(e, t, n) {
      return ((e >>>= 0), (t = On(t >>> 0, n >>> 0)), Ba[e](...t));
    }
    var Nn = () => {};
    function Bn(e, t) {
      return b(Fe(e >>> 0, t >>> 0));
    }
    var $n = () => {
      throw ((Q += 1), 'unwind');
    };
    function Dn() {
      return 4294901760;
    }
    var Rn = () => 1,
      Un = () => navigator.hardwareConcurrency;
    function Gn(e) {
      e >>>= 0;
      var t = (M(), A).length;
      if (e <= t || 4294901760 < e) return !1;
      for (var n = 1; 4 >= n; n *= 2) {
        var r = t * (1 + 0.2 / n);
        r = Math.min(r, e + 100663296);
        e: {
          r =
            ((Math.min(4294901760, 65536 * Math.ceil(Math.max(e, r) / 65536)) -
              ie.buffer.byteLength +
              65535) /
              65536) |
            0;
          try {
            (ie.grow(r), B());
            var s = 1;
            break e;
          } catch {}
          s = void 0;
        }
        if (s) return !0;
      }
      return !1;
    }
    var Vn = e => {
        var t = ft(e) + 1,
          n = Gs(t);
        return (ht(e, n, t), n);
      },
      jn = (e, t) => {
        (M(), P)[(e >>> 2) >>> 0] = t;
        var n = (M(), P)[(e >>> 2) >>> 0];
        (M(), P)[((e + 4) >>> 2) >>> 0] = (t - n) / 4294967296;
      },
      Wn = e =>
        (M(), P)[(e >>> 2) >>> 0] +
        4294967296 * (M(), S)[((e + 4) >>> 2) >>> 0],
      qn = [],
      Hn = (e, t) => {
        qn[e >>> 0] = t;
      },
      Qn = [],
      Xn = [],
      Yn = (e, t) => {
        Xn[e] = new Promise(n => t.finally(() => n(e)));
      },
      Jn = e => {
        if (e) return qn[e >>> 0];
      },
      Kn = (e, t) => {
        for (e = (M(), P)[(e >>> 2) >>> 0]; e; e = (M(), P)[(e >>> 2) >>> 0])
          t[(M(), S)[((e + 4) >>> 2) >>> 0]](e);
      },
      Zn = (e, t, n) => {
        (((M(), P)[(e >>> 2) >>> 0] = t),
          ((M(), P)[((e + 4) >>> 2) >>> 0] = n));
      },
      er = e => {
        var t = (M(), P)[(e >>> 2) >>> 0];
        return ((e = (M(), P)[((e + 4) >>> 2) >>> 0]), Fe(t, e));
      },
      tr = e => {
        var t = (M(), P)[(e >>> 2) >>> 0];
        return (
          (e = (M(), P)[((e + 4) >>> 2) >>> 0]),
          t ? Fe(t, e) : 0 === e ? '' : void 0
        );
      },
      nr = e => {
        var t = tr(e + 4),
          n = (n = (M(), P)[((e + 12) >>> 2) >>> 0]) ? Jn(n) : 'auto';
        if ((e += 16)) {
          var r = Jn((M(), P)[((e + 4) >>> 2) >>> 0]),
            s = (M(), P)[((e + 16) >>> 2) >>> 0],
            a = (M(), P)[((e + 20) >>> 2) >>> 0];
          if (s) {
            for (var o = {}, i = 0; i < s; ++i) {
              var l = a + 24 * i;
              o[er(l + 4)] = (M(), I)[((l + 16) >>> 3) >>> 0];
            }
            s = o;
          } else s = void 0;
          e = { module: r, constants: s, entryPoint: tr(e + 8) };
        } else e = void 0;
        return { label: t, layout: n, compute: e };
      },
      rr = (e, t) => {
        function n(n, r) {
          ((n = e[n]), ((M(), P)[((t + r) >>> 2) >>> 0] = n));
        }
        (n('maxTextureDimension1D', 4),
          n('maxTextureDimension2D', 8),
          n('maxTextureDimension3D', 12),
          n('maxTextureArrayLayers', 16),
          n('maxBindGroups', 20),
          n('maxBindGroupsPlusVertexBuffers', 24),
          n('maxBindingsPerBindGroup', 28),
          n('maxDynamicUniformBuffersPerPipelineLayout', 32),
          n('maxDynamicStorageBuffersPerPipelineLayout', 36),
          n('maxSampledTexturesPerShaderStage', 40),
          n('maxSamplersPerShaderStage', 44),
          n('maxStorageBuffersPerShaderStage', 48),
          n('maxStorageTexturesPerShaderStage', 52),
          n('maxUniformBuffersPerShaderStage', 56),
          n('minUniformBufferOffsetAlignment', 80),
          n('minStorageBufferOffsetAlignment', 84),
          jn(t + 64, e.maxUniformBufferBindingSize),
          jn(t + 72, e.maxStorageBufferBindingSize),
          n('maxVertexBuffers', 88),
          jn(t + 96, e.maxBufferSize),
          n('maxVertexAttributes', 104),
          n('maxVertexBufferArrayStride', 108),
          n('maxInterStageShaderVariables', 112),
          n('maxColorAttachments', 116),
          n('maxColorAttachmentBytesPerSample', 120),
          n('maxComputeWorkgroupStorageSize', 124),
          n('maxComputeInvocationsPerWorkgroup', 128),
          n('maxComputeWorkgroupSizeX', 132),
          n('maxComputeWorkgroupSizeY', 136),
          n('maxComputeWorkgroupSizeZ', 140),
          n('maxComputeWorkgroupsPerDimension', 144),
          void 0 !== e.Ae && n('maxImmediateSize', 148));
      },
      sr = [, 'validation', 'out-of-memory', 'internal'],
      ar = [, 'compatibility', 'core'],
      or = {
        1: 'core-features-and-limits',
        2: 'depth-clip-control',
        3: 'depth32float-stencil8',
        4: 'texture-compression-bc',
        5: 'texture-compression-bc-sliced-3d',
        6: 'texture-compression-etc2',
        7: 'texture-compression-astc',
        8: 'texture-compression-astc-sliced-3d',
        9: 'timestamp-query',
        10: 'indirect-first-instance',
        11: 'shader-f16',
        12: 'rg11b10ufloat-renderable',
        13: 'bgra8unorm-storage',
        14: 'float32-filterable',
        15: 'float32-blendable',
        16: 'clip-distances',
        17: 'dual-source-blending',
        18: 'subgroups',
        19: 'texture-formats-tier1',
        20: 'texture-formats-tier2',
        21: 'primitive-index',
        22: 'texture-component-swizzle',
        327692: 'chromium-experimental-unorm16-texture-formats',
        327729: 'chromium-experimental-multi-draw-indirect',
      },
      ir = [, 'low-power', 'high-performance'],
      lr = [, 'occlusion', 'timestamp'],
      cr = { undefined: 1, unknown: 1, destroyed: 2 };
    function ur(e, t, n, r, s, a) {
      ((t = de(t)), (n = de(n)), (r >>>= 0), (s >>>= 0), (a >>>= 0));
      var o = Jn(e >>> 0);
      if (((e = {}), a)) {
        var i = (M(), P)[((a + 12) >>> 2) >>> 0];
        if (i) {
          var l = (M(), P)[((a + 16) >>> 2) >>> 0];
          e.requiredFeatures = Array.from(
            (M(), P).subarray((l >>> 2) >>> 0, ((l + 4 * i) >>> 2) >>> 0),
            e => or[e]
          );
        }
        var c = (M(), P)[((a + 20) >>> 2) >>> 0];
        if (c) {
          let t = function (e, t, n = !1) {
              ((t = c + t),
                4294967295 == (t = (M(), P)[(t >>> 2) >>> 0]) ||
                  (n && 0 == t) ||
                  (u[e] = t));
            },
            n = function (e, t) {
              t = c + t;
              var n = (M(), P)[(t >>> 2) >>> 0],
                r = (M(), P)[((t + 4) >>> 2) >>> 0];
              (4294967295 == n && 4294967295 == r) || (u[e] = Wn(t));
            };
          var u = {};
          (t('maxTextureDimension1D', 4),
            t('maxTextureDimension2D', 8),
            t('maxTextureDimension3D', 12),
            t('maxTextureArrayLayers', 16),
            t('maxBindGroups', 20),
            t('maxBindGroupsPlusVertexBuffers', 24),
            t('maxDynamicUniformBuffersPerPipelineLayout', 32),
            t('maxDynamicStorageBuffersPerPipelineLayout', 36),
            t('maxSampledTexturesPerShaderStage', 40),
            t('maxSamplersPerShaderStage', 44),
            t('maxStorageBuffersPerShaderStage', 48),
            t('maxStorageTexturesPerShaderStage', 52),
            t('maxUniformBuffersPerShaderStage', 56),
            t('minUniformBufferOffsetAlignment', 80),
            t('minStorageBufferOffsetAlignment', 84),
            n('maxUniformBufferBindingSize', 64),
            n('maxStorageBufferBindingSize', 72),
            t('maxVertexBuffers', 88),
            n('maxBufferSize', 96),
            t('maxVertexAttributes', 104),
            t('maxVertexBufferArrayStride', 108),
            t('maxInterStageShaderVariables', 112),
            t('maxColorAttachments', 116),
            t('maxColorAttachmentBytesPerSample', 120),
            t('maxComputeWorkgroupStorageSize', 124),
            t('maxComputeInvocationsPerWorkgroup', 128),
            t('maxComputeWorkgroupSizeX', 132),
            t('maxComputeWorkgroupSizeY', 136),
            t('maxComputeWorkgroupSizeZ', 140),
            t('maxComputeWorkgroupsPerDimension', 144),
            t('maxImmediateSize', 148, !0),
            (e.requiredLimits = u));
        }
        ((i = (M(), P)[((a + 24) >>> 2) >>> 0]) &&
          ((i = { label: tr(i + 4) }), (e.defaultQueue = i)),
          (e.label = tr(a + 4)));
      }
      ((Q += 1),
        Yn(
          t,
          o.requestDevice(e).then(
            e => {
              (--Q,
                At(() => {
                  ((qn[s >>> 0] = e.queue),
                    (qn[r >>> 0] = e),
                    Yn(
                      n,
                      e.lost.then(t => {
                        At(() => {
                          e.onuncapturederror = () => {};
                          var r = Vs(),
                            s = Vn(t.message);
                          (ks(n, cr[t.reason], s), Us(r));
                        });
                      })
                    ),
                    (e.onuncapturederror = e => {
                      var t = 5;
                      e.error instanceof GPUValidationError
                        ? (t = 2)
                        : e.error instanceof GPUOutOfMemoryError
                          ? (t = 3)
                          : e.error instanceof GPUInternalError && (t = 4);
                      var n = Vs();
                      ((e = Vn(e.error.message)), Ss(r, t, e), Us(n));
                    }),
                    'adapterInfo' in e || (e.adapterInfo = o.info),
                    Cs(t, 1, r, 0));
                }));
            },
            e => {
              (--Q,
                At(() => {
                  var s = Vs(),
                    a = Vn(e.message);
                  (Cs(t, 3, r, a), n && ks(n, 4, a), Us(s));
                }));
            }
          )
        ));
    }
    function dr(e) {
      var t = Jn((e >>>= 0)),
        n = Qn[e];
      if (n) {
        for (var r = 0; r < n.length; ++r) n[r]();
        delete Qn[e];
      }
      t.destroy();
    }
    function pr(e, t, n) {
      n >>>= 0;
      var r = Jn((e >>>= 0));
      4294967295 == n && (n = void 0);
      try {
        var s = r.getMappedRange(t >>> 0, n);
      } catch {
        return 0;
      }
      var a = Bs(16, s.byteLength);
      return (
        (M(), A).set(new Uint8Array(s), a >>> 0),
        Qn[e].push(() => us(a)),
        a
      );
    }
    function hr(e, t, n) {
      n >>>= 0;
      var r = Jn((e >>>= 0));
      4294967295 == n && (n = void 0);
      try {
        var s = r.getMappedRange(t >>> 0, n);
      } catch {
        return 0;
      }
      var a = Bs(16, s.byteLength);
      return (
        (M(), A).fill(0, a, s.byteLength),
        Qn[e].push(() => {
          (new Uint8Array(s).set(
            (M(), A).subarray(a >>> 0, (a + s.byteLength) >>> 0)
          ),
            us(a));
        }),
        a
      );
    }
    function fr(e, t, n, r, s) {
      ((e >>>= 0), (t = de(t)), (n = de(n)), (s >>>= 0));
      var a = Jn(e);
      ((Qn[e] = []),
        4294967295 == s && (s = void 0),
        (Q += 1),
        Yn(
          t,
          a.mapAsync(n, r >>> 0, s).then(
            () => {
              (--Q,
                At(() => {
                  Es(t, 1, 0);
                }));
            },
            n => {
              (--Q,
                At(() => {
                  Vs();
                  var r = Vn(n.message);
                  (Es(
                    t,
                    'AbortError' === n.name
                      ? 4
                      : 'OperationError' === n.name
                        ? 3
                        : 0,
                    r
                  ),
                    delete Qn[e]);
                }));
            }
          )
        ));
    }
    function _r(e) {
      var t = Jn((e >>>= 0)),
        n = Qn[e];
      if (n) {
        for (var r = 0; r < n.length; ++r) n[r]();
        (delete Qn[e], t.unmap());
      }
    }
    function mr(e) {
      delete qn[e >>> 0];
    }
    function gr(e, t, n) {
      ((e >>>= 0), (t >>>= 0), (n >>>= 0));
      var r = !!(M(), P)[((t + 32) >>> 2) >>> 0];
      ((t = {
        label: tr(t + 4),
        usage: (M(), P)[((t + 16) >>> 2) >>> 0],
        size: Wn(t + 24),
        mappedAtCreation: r,
      }),
        (e = Jn(e)));
      try {
        var s = e.createBuffer(t);
      } catch {
        return !1;
      }
      return ((qn[n >>> 0] = s), r && (Qn[n] = []), !0);
    }
    function wr(e, t, n, r) {
      ((e >>>= 0),
        (t = de(t)),
        (r >>>= 0),
        (n = nr(n >>> 0)),
        (e = Jn(e)),
        (Q += 1),
        Yn(
          t,
          e.createComputePipelineAsync(n).then(
            e => {
              (--Q,
                At(() => {
                  ((qn[r >>> 0] = e), Ms(t, 1, r, 0));
                }));
            },
            e => {
              (--Q,
                At(() => {
                  var n = Vs(),
                    s = Vn(e.message);
                  (Ms(
                    t,
                    'validation' === e.reason
                      ? 3
                      : 'internal' === e.reason
                        ? 4
                        : 0,
                    r,
                    s
                  ),
                    Us(n));
                }));
            }
          )
        ));
    }
    function yr(e, t, n) {
      ((e >>>= 0), (t >>>= 0), (n >>>= 0));
      var r = (M(), P)[(t >>> 2) >>> 0],
        s = (M(), S)[((r + 4) >>> 2) >>> 0];
      ((t = { label: tr(t + 4), code: '' }),
        2 === s && (t.code = er(r + 8)),
        (e = Jn(e).createShaderModule(t)),
        (qn[n >>> 0] = e));
    }
    var br = e => {
      (((e = Jn(e)).onuncapturederror = null), e.destroy());
    };
    function vr(e, t) {
      ((t = de(t)),
        (e = Jn(e >>> 0)),
        (Q += 1),
        Yn(
          t,
          e.popErrorScope().then(
            e => {
              (--Q,
                At(() => {
                  var n = 5;
                  e
                    ? e instanceof GPUValidationError
                      ? (n = 2)
                      : e instanceof GPUOutOfMemoryError
                        ? (n = 3)
                        : e instanceof GPUInternalError && (n = 4)
                    : (n = 1);
                  var r = Vs(),
                    s = e ? Vn(e.message) : 0;
                  (As(t, 1, n, s), Us(r));
                }));
            },
            e => {
              (--Q,
                At(() => {
                  var n = Vs(),
                    r = Vn(e.message);
                  (As(t, 1, 5, r), Us(n));
                }));
            }
          )
        ));
    }
    function xr(e, t, n, r) {
      if (((t = de(t)), (r >>>= 0), (n >>>= 0))) {
        var s = {
          featureLevel: ar[(M(), S)[((n + 4) >>> 2) >>> 0]],
          powerPreference: ir[(M(), S)[((n + 8) >>> 2) >>> 0]],
          forceFallbackAdapter: !!(M(), P)[((n + 12) >>> 2) >>> 0],
        };
        0 !== (e = (M(), P)[(n >>> 2) >>> 0]) &&
          (M(), (s.Fe = !!(M(), P)[((e + 8) >>> 2) >>> 0]));
      }
      'gpu' in navigator
        ? ((Q += 1),
          Yn(
            t,
            navigator.gpu.requestAdapter(s).then(
              e => {
                (--Q,
                  At(() => {
                    if (e) ((qn[r >>> 0] = e), Ts(t, 1, r, 0));
                    else {
                      var n = Vs(),
                        s = Vn(
                          'WebGPU not available on this browser (requestAdapter returned null)'
                        );
                      (Ts(t, 3, r, s), Us(n));
                    }
                  }));
              },
              e => {
                (--Q,
                  At(() => {
                    var n = Vs(),
                      s = Vn(e.message);
                    (Ts(t, 4, r, s), Us(n));
                  }));
              }
            )
          ))
        : ((s = Vs()),
          (e = Vn(
            'WebGPU not available on this browser (navigator.gpu is not available)'
          )),
          Ts(t, 3, r, e),
          Us(s));
    }
    function Mr(e, t, n) {
      return (
        (e >>>= 0),
        (t >>>= 0),
        (n >>>= 0),
        Qt(async () => {
          var r = [];
          if (n) {
            var s = (M(), S)[(n >>> 2) >>> 0];
            ((r.length = t + 1),
              (r[t] = new Promise(e => setTimeout(e, s, 0))));
          } else r.length = t;
          for (var a = 0; a < t; ++a) {
            var o = Wn(e + 8 * a);
            if (!(o in Xn)) return o;
            r[a] = Xn[o];
          }
          return ((r = await Promise.race(r)), delete Xn[r], r);
        })
      );
    }
    var kr,
      Er = {},
      Ar = () => {
        if (!kr) {
          var e,
            t = {
              USER: 'web_user',
              LOGNAME: 'web_user',
              PATH: '/',
              PWD: '/',
              HOME: '/home/web_user',
              LANG:
                (globalThis.navigator?.language ?? 'C').replace('-', '_') +
                '.UTF-8',
              _: './this.program',
            };
          for (e in Er) void 0 === Er[e] ? delete t[e] : (t[e] = Er[e]);
          var n = [];
          for (e in t) n.push(`${e}=${t[e]}`);
          kr = n;
        }
        return kr;
      };
    function Tr(e, t) {
      if (a) return X(19, 1, e, t);
      ((e >>>= 0), (t >>>= 0));
      var n,
        r = 0,
        s = 0;
      for (n of Ar()) {
        var o = t + r;
        (((M(), P)[((e + s) >>> 2) >>> 0] = o),
          (r += ht(n, o, 1 / 0) + 1),
          (s += 4));
      }
      return 0;
    }
    function Cr(e, t) {
      if (a) return X(20, 1, e, t);
      ((e >>>= 0), (t >>>= 0));
      var n = Ar();
      for (var r of (((M(), P)[(e >>> 2) >>> 0] = n.length), (e = 0), n))
        e += ft(r) + 1;
      return (((M(), P)[(t >>> 2) >>> 0] = e), 0);
    }
    function Sr(e) {
      return a ? X(21, 1, e) : 52;
    }
    function Pr(e, t, n, r) {
      return a ? X(22, 1, e, t, n, r) : 52;
    }
    function Fr(e, t, n, r) {
      return a ? X(23, 1, e, t, n, r) : 70;
    }
    var Ir = [null, [], []];
    function Or(e, t, n, r) {
      if (a) return X(24, 1, e, t, n, r);
      ((t >>>= 0), (n >>>= 0), (r >>>= 0));
      for (var s = 0, o = 0; o < n; o++) {
        var i = (M(), P)[(t >>> 2) >>> 0],
          l = (M(), P)[((t + 4) >>> 2) >>> 0];
        t += 8;
        for (var c = 0; c < l; c++) {
          var u = e,
            d = (M(), A)[(i + c) >>> 0],
            p = Ir[u];
          0 === d || 10 === d
            ? ((1 === u ? y : b)(Pe(p)), (p.length = 0))
            : p.push(d);
        }
        s += l;
      }
      return (((M(), P)[(r >>> 2) >>> 0] = s), 0);
    }
    function Lr(e) {
      return e >>> 0;
    }
    function zr(e, t) {
      return (rr(Jn(e >>> 0).limits, t >>> 0), 1);
    }
    function Nr(e, t) {
      return Jn(e >>> 0).features.has(or[t]);
    }
    function Br(e) {
      return BigInt(Jn(e >>> 0).size);
    }
    function $r(e) {
      return BigInt(Jn(e >>> 0).usage);
    }
    function Dr(e, t) {
      if (((e >>>= 0), (t >>>= 0))) {
        var n = tr(t + 4);
        n = {
          label: n,
          timestampWrites: (t =
            0 !== (t = (M(), P)[((t + 12) >>> 2) >>> 0])
              ? {
                  querySet: Jn((M(), P)[((t + 4) >>> 2) >>> 0]),
                  beginningOfPassWriteIndex: (M(), P)[((t + 8) >>> 2) >>> 0],
                  endOfPassWriteIndex: (M(), P)[((t + 12) >>> 2) >>> 0],
                }
              : void 0),
        };
      }
      return (
        (t = Jn(e)),
        (e = ws(0)),
        (n = t.beginComputePass(n)),
        (qn[e >>> 0] = n),
        e
      );
    }
    function Rr(e, t, n, r, s, a) {
      ((n = de(n)),
        (s = de(s)),
        (a = de(a)),
        Jn(e >>> 0).copyBufferToBuffer(Jn(t >>> 0), n, Jn(r >>> 0), s, a));
    }
    function Ur(e) {
      var t = Jn(e >>> 0);
      return ((e = ms(0)), (t = t.finish()), (qn[e >>> 0] = t), e);
    }
    function Gr(e, t, n, r, s, a) {
      ((a = de(a)),
        Jn(e >>> 0).resolveQuerySet(Jn(t >>> 0), n, r, Jn(s >>> 0), a));
    }
    function Vr(e, t, n, r) {
      Jn(e >>> 0).dispatchWorkgroups(t, n, r);
    }
    function jr(e, t, n) {
      ((n = de(n)), Jn(e >>> 0).dispatchWorkgroupsIndirect(Jn(t >>> 0), n));
    }
    function Wr(e) {
      Jn(e >>> 0).end();
    }
    function qr(e, t, n, r, s) {
      ((r >>>= 0),
        (s >>>= 0),
        (e = Jn(e >>> 0)),
        (n = Jn(n >>> 0)),
        0 == r
          ? e.setBindGroup(t, n)
          : e.setBindGroup(t, n, (M(), P), s >>> 2, r));
    }
    function Hr(e, t) {
      Jn(e >>> 0).setPipeline(Jn(t >>> 0));
    }
    function Qr(e, t, n) {
      Jn(e >>> 0).Ee(Jn(t >>> 0), n);
    }
    function Xr(e, t) {
      var n = Jn(e >>> 0);
      return ((e = _s(0)), (t = n.getBindGroupLayout(t)), (qn[e >>> 0] = t), e);
    }
    function Yr(e, t) {
      function n(e) {
        var t = (M(), P)[((e + 8) >>> 2) >>> 0],
          n = (M(), P)[((e + 32) >>> 2) >>> 0],
          r = (M(), P)[((e + 36) >>> 2) >>> 0],
          s = 0;
        return (
          Kn(e, {
            327681: e => {
              s = (M(), P)[((e + 8) >>> 2) >>> 0];
            },
          }),
          t
            ? (-1 == (n = Wn(e + 24)) && (n = void 0),
              (t = { buffer: Jn(t), offset: Wn(e + 16), size: n }))
            : (t = Jn(n || r || s)),
          { binding: (M(), P)[((e + 4) >>> 2) >>> 0], resource: t }
        );
      }
      ((e >>>= 0),
        (t = {
          label: tr(4 + (t >>>= 0)),
          layout: Jn((M(), P)[((t + 12) >>> 2) >>> 0]),
          entries: (function (e, t) {
            for (var r = [], s = 0; s < e; ++s) r.push(n(t + 40 * s));
            return r;
          })(
            (M(), P)[((t + 16) >>> 2) >>> 0],
            (M(), P)[((t + 20) >>> 2) >>> 0]
          ),
        }),
        (e = Jn(e)));
      var r = fs(0);
      return (Hn(r, e.createBindGroup(t)), r);
    }
    function Jr(e, t) {
      var n;
      return (
        (e >>>= 0),
        (t >>>= 0) && (n = { label: tr(t + 4) }),
        (t = Jn(e)),
        (e = gs(0)),
        (n = t.createCommandEncoder(n)),
        (qn[e >>> 0] = n),
        e
      );
    }
    function Kr(e, t) {
      ((e >>>= 0),
        (t >>>= 0),
        (t = {
          type: lr[(M(), S)[((t + 12) >>> 2) >>> 0]],
          count: (M(), P)[((t + 16) >>> 2) >>> 0],
        }));
      var n = Jn(e);
      return ((e = ys(0)), (t = n.createQuerySet(t)), (qn[e >>> 0] = t), e);
    }
    function Zr(e, t) {
      ((e = Jn(e >>> 0).adapterInfo),
        (t >>>= 0),
        ((M(), P)[((t + 52) >>> 2) >>> 0] = e.subgroupMinSize),
        ((M(), P)[((t + 56) >>> 2) >>> 0] = e.subgroupMaxSize));
      var n = e.vendor + e.architecture + e.device + e.description,
        r = ft(n) + 1,
        s = ds(r);
      return (
        s && ht(n, s, r),
        (n = s),
        (r = ft(e.vendor)),
        Zn(t + 4, n, r),
        (n += r),
        (r = ft(e.architecture)),
        Zn(t + 12, n, r),
        (n += r),
        (r = ft(e.device)),
        Zn(t + 20, n, r),
        Zn(t + 28, n + r, ft(e.description)),
        ((M(), S)[((t + 36) >>> 2) >>> 0] = 2),
        (e = e.isFallbackAdapter ? 3 : 4),
        ((M(), S)[((t + 40) >>> 2) >>> 0] = e),
        ((M(), P)[((t + 44) >>> 2) >>> 0] = 0),
        ((M(), P)[((t + 48) >>> 2) >>> 0] = 0),
        1
      );
    }
    var es = {
      'core-features-and-limits': 1,
      'depth-clip-control': 2,
      'depth32float-stencil8': 3,
      'texture-compression-bc': 4,
      'texture-compression-bc-sliced-3d': 5,
      'texture-compression-etc2': 6,
      'texture-compression-astc': 7,
      'texture-compression-astc-sliced-3d': 8,
      'timestamp-query': 9,
      'indirect-first-instance': 10,
      'shader-f16': 11,
      'rg11b10ufloat-renderable': 12,
      'bgra8unorm-storage': 13,
      'float32-filterable': 14,
      'float32-blendable': 15,
      'clip-distances': 16,
      'dual-source-blending': 17,
      subgroups: 18,
      'texture-formats-tier1': 19,
      'texture-formats-tier2': 20,
      'primitive-index': 21,
      'texture-component-swizzle': 22,
      'chromium-experimental-unorm16-texture-formats': 327692,
      'chromium-experimental-multi-draw-indirect': 327729,
    };
    function ts(e, t) {
      t >>>= 0;
      var n = Jn(e >>> 0);
      e = ds(4 * n.features.size);
      var r = 0,
        s = 0;
      for (let t of n.features)
        0 <= (n = es[t]) &&
          (((M(), S)[((e + r) >>> 2) >>> 0] = n), (r += 4), s++);
      (((M(), P)[((t + 4) >>> 2) >>> 0] = e), ((M(), P)[(t >>> 2) >>> 0] = s));
    }
    function ns(e, t) {
      return (rr(Jn(e >>> 0).limits, t >>> 0), 1);
    }
    function rs(e, t) {
      Jn(e >>> 0).pushErrorScope(sr[t]);
    }
    function ss(e, t, n) {
      ((t >>>= 0),
        (n >>>= 0),
        (e = Jn(e >>> 0)),
        (t = Array.from(
          (M(), S).subarray((n >>> 2) >>> 0, ((n + 4 * t) >>> 2) >>> 0),
          e => Jn(e)
        )),
        e.submit(t));
    }
    function as(e, t, n, r, s) {
      ((n = de(n)),
        (r >>>= 0),
        (s >>>= 0),
        (e = Jn(e >>> 0)),
        (t = Jn(t >>> 0)),
        (r = (M(), A).subarray(r >>> 0, (r + s) >>> 0)),
        e.writeBuffer(t, n, r, 0, s));
    }
    (a ||
      (function () {
        for (var e = t.numThreads - 1; e--; ) oe();
        j.push(async () => {
          var e = (async function () {
            if (!a) return Promise.all(Z.map(ae));
          })();
          (W++, await e, 0 == --W && q && ((e = q), (q = null), e()));
        });
      })(),
      a ||
        ((ie = new WebAssembly.Memory({
          initial: 256,
          maximum: 65536,
          shared: !0,
        })),
        B()),
      t.wasmBinary && (d = t.wasmBinary),
      (t.stackSave = () => Vs()),
      (t.stackRestore = e => Us(e)),
      (t.stackAlloc = e => Gs(e)),
      (t.setValue = function (e, t, n = 'i8') {
        switch ((n.endsWith('*') && (n = '*'), n)) {
          case 'i1':
          case 'i8':
            (M(), E)[e >>> 0] = t;
            break;
          case 'i16':
            (M(), T)[(e >>> 1) >>> 0] = t;
            break;
          case 'i32':
            (M(), S)[(e >>> 2) >>> 0] = t;
            break;
          case 'i64':
            (M(), O)[(e >>> 3) >>> 0] = BigInt(t);
            break;
          case 'float':
            (M(), F)[(e >>> 2) >>> 0] = t;
            break;
          case 'double':
            (M(), I)[(e >>> 3) >>> 0] = t;
            break;
          case '*':
            (M(), P)[(e >>> 2) >>> 0] = t;
            break;
          default:
            D(`invalid type for setValue: ${n}`);
        }
      }),
      (t.getValue = function (e, t = 'i8') {
        switch ((t.endsWith('*') && (t = '*'), t)) {
          case 'i1':
          case 'i8':
            return (M(), E)[e >>> 0];
          case 'i16':
            return (M(), T)[(e >>> 1) >>> 0];
          case 'i32':
            return (M(), S)[(e >>> 2) >>> 0];
          case 'i64':
            return (M(), O)[(e >>> 3) >>> 0];
          case 'float':
            return (M(), F)[(e >>> 2) >>> 0];
          case 'double':
            return (M(), I)[(e >>> 3) >>> 0];
          case '*':
            return (M(), P)[(e >>> 2) >>> 0];
          default:
            D(`invalid type for getValue: ${t}`);
        }
      }),
      (t.UTF8ToString = Fe),
      (t.stringToUTF8 = ht),
      (t.lengthBytesUTF8 = ft));
    var os,
      is,
      ls,
      cs,
      us,
      ds,
      ps,
      hs,
      fs,
      _s,
      ms,
      gs,
      ws,
      ys,
      bs,
      vs,
      xs,
      Ms,
      ks,
      Es,
      As,
      Ts,
      Cs,
      Ss,
      Ps,
      Fs,
      Is,
      Os,
      Ls,
      zs,
      Ns,
      Bs,
      $s,
      Ds,
      Rs,
      Us,
      Gs,
      Vs,
      js,
      Ws,
      qs,
      Hs,
      Qs,
      Xs,
      Ys,
      Js,
      Ks,
      Zs,
      ea,
      ta,
      na,
      ra,
      sa,
      aa,
      oa,
      ia,
      la,
      ca,
      ua,
      da,
      pa,
      ha,
      fa,
      _a,
      ma,
      ga,
      wa,
      ya,
      ba,
      va,
      xa,
      Ma,
      ka,
      Ea,
      Aa,
      Ta,
      Ca,
      Sa,
      Pa,
      Fa,
      Ia,
      Oa,
      La,
      za,
      Na = [
        Y,
        J,
        Ee,
        Ie,
        Oe,
        Le,
        ze,
        Ne,
        Be,
        $e,
        De,
        Re,
        Ue,
        Ge,
        Ve,
        je,
        Mn,
        kn,
        Tn,
        Tr,
        Cr,
        Sr,
        Pr,
        Fr,
        Or,
      ],
      Ba = {
        923180: (e, n, r, s, a) => {
          if (void 0 === t || !t.Uc) return 1;
          if (
            ((e = Fe(Number(e >>> 0))).startsWith('./') && (e = e.substring(2)),
            !(e = t.Uc.get(e)))
          )
            return 2;
          if (
            ((n = Number(n >>> 0)),
            (r = Number(r >>> 0)),
            (s = Number(s >>> 0)),
            n + r > e.byteLength)
          )
            return 3;
          try {
            let o = e.subarray(n, n + r);
            switch (a) {
              case 0:
                (M(), A).set(o, s >>> 0);
                break;
              case 1:
                t.ad ? t.ad(s, o) : t.oe(s, o);
                break;
              default:
                return 4;
            }
            return 0;
          } catch {
            return 4;
          }
        },
        924004: (e, n, r) => {
          t.Sd(e, (M(), A).subarray(n >>> 0, (n + r) >>> 0));
        },
        924068: () => t.me(),
        924110: e => {
          t.jd(e);
        },
        924147: () => typeof wasmOffsetConverter < 'u',
      };
    function $a(e, t, n, r) {
      var s = Vs();
      try {
        return ra(e, t, n, r);
      } catch (e) {
        if ((Us(s), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Da(e, t, n) {
      var r = Vs();
      try {
        return ea(e, t, n);
      } catch (e) {
        if ((Us(r), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Ra(e, t, n) {
      var r = Vs();
      try {
        Qs(e, t, n);
      } catch (e) {
        if ((Us(r), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Ua(e, t) {
      var n = Vs();
      try {
        return Xs(e, t);
      } catch (e) {
        if ((Us(n), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Ga(e) {
      var t = Vs();
      try {
        Ys(e);
      } catch (e) {
        if ((Us(t), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Va(e, t, n, r, s, a, o) {
      var i = Vs();
      try {
        return Zs(e, t, n, r, s, a, o);
      } catch (e) {
        if ((Us(i), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function ja(e, t) {
      var n = Vs();
      try {
        sa(e, t);
      } catch (e) {
        if ((Us(n), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Wa(e, t, n, r, s, a) {
      var o = Vs();
      try {
        Js(e, t, n, r, s, a);
      } catch (e) {
        if ((Us(o), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function qa(e, t, n, r) {
      var s = Vs();
      try {
        na(e, t, n, r);
      } catch (e) {
        if ((Us(s), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Ha(e, t, n, r, s, a, o) {
      var i = Vs();
      try {
        oa(e, t, n, r, s, a, o);
      } catch (e) {
        if ((Us(i), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Qa(e, t, n, r, s, a, o) {
      var i = Vs();
      try {
        ia(e, t, n, r, s, a, o);
      } catch (e) {
        if ((Us(i), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Xa(e, t, n, r, s, a, o, i) {
      var l = Vs();
      try {
        ma(e, t, n, r, s, a, o, i);
      } catch (e) {
        if ((Us(l), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Ya(e, t, n, r, s, a, o, i, l, c, u, d) {
      var p = Vs();
      try {
        la(e, t, n, r, s, a, o, i, l, c, u, d);
      } catch (e) {
        if ((Us(p), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Ja(e, t, n, r, s) {
      var a = Vs();
      try {
        return aa(e, t, n, r, s);
      } catch (e) {
        if ((Us(a), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Ka(e, t, n, r, s) {
      var a = Vs();
      try {
        Ks(e, t, n, r, s);
      } catch (e) {
        if ((Us(a), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function Za(e, t, n, r, s, a, o, i) {
      var l = Vs();
      try {
        ta(e, t, n, r, s, a, o, i);
      } catch (e) {
        if ((Us(l), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function eo(e) {
      var t = Vs();
      try {
        return ga(e);
      } catch (e) {
        if ((Us(t), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function to(e, t, n) {
      var r = Vs();
      try {
        return wa(e, t, n);
      } catch (e) {
        if ((Us(r), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function no(e, t) {
      var n = Vs();
      try {
        return Pa(e, t);
      } catch (e) {
        if ((Us(n), e !== e + 0)) throw e;
        return ($s(1, 0), 0n);
      }
    }
    function ro(e, t, n, r, s) {
      var a = Vs();
      try {
        ya(e, t, n, r, s);
      } catch (e) {
        if ((Us(a), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function so(e) {
      var t = Vs();
      try {
        return ca(e);
      } catch (e) {
        if ((Us(t), e !== e + 0)) throw e;
        return ($s(1, 0), 0n);
      }
    }
    function ao(e, t, n, r, s, a) {
      var o = Vs();
      try {
        return fa(e, t, n, r, s, a);
      } catch (e) {
        if ((Us(o), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function oo(e, t, n, r, s, a) {
      var o = Vs();
      try {
        return ba(e, t, n, r, s, a);
      } catch (e) {
        if ((Us(o), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function io(e, t, n, r, s, a) {
      var o = Vs();
      try {
        return va(e, t, n, r, s, a);
      } catch (e) {
        if ((Us(o), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function lo(e, t, n, r, s, a, o, i) {
      var l = Vs();
      try {
        return _a(e, t, n, r, s, a, o, i);
      } catch (e) {
        if ((Us(l), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function co(e, t, n, r, s) {
      var a = Vs();
      try {
        return xa(e, t, n, r, s);
      } catch (e) {
        if ((Us(a), e !== e + 0)) throw e;
        return ($s(1, 0), 0n);
      }
    }
    function uo(e, t, n, r) {
      var s = Vs();
      try {
        return Ma(e, t, n, r);
      } catch (e) {
        if ((Us(s), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function po(e, t, n, r) {
      var s = Vs();
      try {
        return ka(e, t, n, r);
      } catch (e) {
        if ((Us(s), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function ho(e, t, n, r, s, a, o, i, l, c, u, d) {
      var p = Vs();
      try {
        return Ea(e, t, n, r, s, a, o, i, l, c, u, d);
      } catch (e) {
        if ((Us(p), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function fo(e, t, n, r, s, a, o, i, l, c, u) {
      var d = Vs();
      try {
        Aa(e, t, n, r, s, a, o, i, l, c, u);
      } catch (e) {
        if ((Us(d), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function _o(e, t, n, r, s, a, o, i, l, c, u, d, p, h, f, _) {
      var m = Vs();
      try {
        Ta(e, t, n, r, s, a, o, i, l, c, u, d, p, h, f, _);
      } catch (e) {
        if ((Us(m), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function mo(e, t, n, r) {
      var s = Vs();
      try {
        return Ca(e, t, n, r);
      } catch (e) {
        if ((Us(s), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function go(e, t, n, r, s) {
      var a = Vs();
      try {
        return Sa(e, t, n, r, s);
      } catch (e) {
        if ((Us(a), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function wo(e, t, n) {
      var r = Vs();
      try {
        return da(e, t, n);
      } catch (e) {
        if ((Us(r), e !== e + 0)) throw e;
        return ($s(1, 0), 0n);
      }
    }
    function yo(e, t, n) {
      var r = Vs();
      try {
        return ua(e, t, n);
      } catch (e) {
        if ((Us(r), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function bo(e, t, n) {
      var r = Vs();
      try {
        return pa(e, t, n);
      } catch (e) {
        if ((Us(r), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function vo(e, t, n, r) {
      var s = Vs();
      try {
        ha(e, t, n, r);
      } catch (e) {
        if ((Us(s), e !== e + 0)) throw e;
        $s(1, 0);
      }
    }
    function xo() {
      if (0 < W) q = xo;
      else if (a) (f?.(t), $());
      else {
        for (var e = j; 0 < e.length; ) e.shift()(t);
        0 < W ? (q = xo) : ((t.calledRun = !0), v || ($(), f?.(t)));
      }
    }
    return (
      a || ((za = await U()), xo()),
      (t.PTR_SIZE = 4),
      (t.webgpuInit = e => {
        let n,
          r,
          s = new WeakMap(),
          a = 1;
        t.webgpuRegisterDevice = e => {
          if (void 0 !== r)
            throw Error(
              'another WebGPU EP inference session is being created.'
            );
          if (e) {
            var t = s.get(e);
            if (!t) {
              let n = ((e, t = 0) => {
                var n = xs(t);
                return (
                  (t = vs(t, n)),
                  (qn[n >>> 0] = e.queue),
                  (qn[t >>> 0] = e),
                  t
                );
              })(e, (t = hs(0)));
              ((t = [a++, t, n]), s.set(e, t));
            }
            return ((n = e), (r = t[0]), t);
          }
          ((n = void 0), (r = 0));
        };
        let o = new Map();
        ((t.webgpuOnCreateSession = t => {
          if (void 0 !== r) {
            var s = r;
            if (((r = void 0), t)) {
              let r = ls(s);
              (o.set(t, r), 0 === s && e(n ?? Jn(r)));
            }
            n = void 0;
          }
        }),
          (t.webgpuOnReleaseSession = e => {
            o.delete(e);
          }));
        let i = Symbol('gpuBufferMetadata');
        ((t.webgpuRegisterBuffer = (e, t, n) => {
          if (n) return ((e[i] = [n, NaN]), n);
          if ((n = e[i])) return (n[1]++, n[0]);
          if (void 0 === (t = o.get(t)))
            throw Error(
              'Invalid session handle passed to webgpuRegisterBuffer'
            );
          return (
            (t = ((e, t = 0) => (
              'unmapped' === e.mapState || D(),
              (t = bs(t)),
              (qn[t >>> 0] = e),
              t
            ))(e, t)),
            (e[i] = [t, 1]),
            t
          );
        }),
          (t.webgpuUnregisterBuffer = e => {
            let t = e[i];
            if (!t) throw Error('Buffer is not registered');
            (t[1]--, 0 === t[1] && (ps(t[0]), delete e[i]));
          }),
          (t.webgpuGetBuffer = e => Jn(e)),
          (t.webgpuCreateDownloader = (e, t, n) => {
            if (void 0 === (n = o.get(n)))
              throw Error(
                'Invalid session handle passed to webgpuRegisterBuffer'
              );
            let r = Jn(n),
              s = 16 * Math.ceil(Number(t) / 16);
            return async () => {
              let n = r.createBuffer({ size: s, usage: 9 });
              try {
                let a = r.createCommandEncoder();
                return (
                  a.copyBufferToBuffer(e, 0, n, 0, s),
                  r.queue.submit([a.finish()]),
                  await n.mapAsync(GPUMapMode.READ),
                  n.getMappedRange().slice(0, t)
                );
              } finally {
                n.destroy();
              }
            };
          }),
          (t.ad = (e, t) => {
            var s = t.buffer;
            let a = t.byteOffset,
              o = t.byteLength;
            if (((t = 16 * Math.ceil(Number(o) / 16)), (e = Jn(e)), !n)) {
              var i = ls(r);
              n = Jn(i);
            }
            let l = (i = n.createBuffer({
              mappedAtCreation: !0,
              size: t,
              usage: 6,
            })).getMappedRange();
            (new Uint8Array(l).set(new Uint8Array(s, a, o)),
              i.unmap(),
              (s = n.createCommandEncoder()).copyBufferToBuffer(i, 0, e, 0, t),
              n.queue.submit([s.finish()]),
              i.destroy());
          }));
      }),
      (t.webnnInit = e => {
        let n = e[0];
        (([
          t.me,
          t.jd,
          t.webnnEnsureTensor,
          t.Sd,
          t.webnnDownloadTensor,
          t.le,
          t.webnnEnableTraceEvent,
        ] = e.slice(1)),
          (t.webnnReleaseTensorId = t.jd),
          (t.webnnUploadTensor = t.Sd),
          (t.webnnRegisterMLContext = t.le),
          (t.webnnOnRunStart = e => n.onRunStart(e)),
          (t.webnnOnRunEnd = n.onRunEnd.bind(n)),
          (t.webnnOnReleaseSession = e => {
            n.onReleaseSession(e);
          }),
          (t.webnnCreateMLTensorDownloader = (e, t) =>
            n.createMLTensorDownloader(e, t)),
          (t.webnnRegisterMLTensor = (e, t, r, s) =>
            n.registerMLTensor(e, t, r, s)),
          (t.webnnCreateMLContext = e => n.createMLContext(e)),
          (t.webnnRegisterMLConstant = (e, r, s, a, o, i) =>
            n.registerMLConstant(e, r, s, a, o, t.Uc, i)),
          (t.webnnRegisterGraphInput = n.registerGraphInput.bind(n)),
          (t.webnnIsGraphInput = n.isGraphInput.bind(n)),
          (t.webnnRegisterGraphOutput = n.registerGraphOutput.bind(n)),
          (t.webnnIsGraphOutput = n.isGraphOutput.bind(n)),
          (t.webnnCreateTemporaryTensor = n.createTemporaryTensor.bind(n)),
          (t.webnnIsGraphInputOutputTypeSupported =
            n.isGraphInputOutputTypeSupported.bind(n)));
      }),
      N
        ? t
        : new Promise((e, t) => {
            ((f = e), (_ = t));
          })
    );
  }
  j(we, { default: () => be });
  var be,
    ve,
    xe,
    Me,
    ke,
    Ee,
    Ae,
    Te,
    Ce,
    Se,
    Pe,
    Fe,
    Ie,
    Oe,
    Le,
    ze,
    Ne,
    Be,
    $e,
    De,
    Re,
    Ue,
    Ge,
    Ve,
    je,
    We,
    qe,
    He,
    Qe,
    Xe,
    Ye,
    Je,
    Ke,
    Ze,
    et,
    tt,
    nt,
    rt,
    st,
    at,
    ot,
    it,
    lt,
    ct,
    ut,
    dt,
    pt,
    ht,
    ft,
    _t,
    mt,
    gt,
    wt,
    yt,
    bt,
    vt,
    xt,
    Mt,
    kt,
    Et,
    At,
    Tt,
    Ct,
    St,
    Pt = V(() => {
      ((be = ye),
        (ve = globalThis.self?.name?.startsWith('em-pthread')),
        ve && ye());
    }),
    Ft = V(() => {
      (pe(),
        (xe = typeof location > 'u' ? void 0 : location.origin),
        (Me = !0),
        (ke = () => {
          if (Me) {
            let e = URL;
            return new URL(new e(n(191), n.b).href, xe).href;
          }
          return 'file:///Users/alexandernodeland/anodeland/projects/code/websites/alexnodeland/node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs';
        }),
        (Ee = ke()),
        (Ae = () => {
          if (Ee && !Ee.startsWith('blob:'))
            return Ee.substring(0, Ee.lastIndexOf('/') + 1);
        }),
        (Te = (e, t) => {
          try {
            let n = t ?? Ee;
            return (n ? new URL(e, n) : new URL(e)).origin === xe;
          } catch {
            return !1;
          }
        }),
        (Ce = (e, t) => {
          let n = t ?? Ee;
          try {
            return (n ? new URL(e, n) : new URL(e)).href;
          } catch {
            return;
          }
        }),
        (Se = (e, t) => `${t ?? './'}${e}`),
        (Pe = async e => {
          let t = await (await fetch(e, { credentials: 'same-origin' })).blob();
          return URL.createObjectURL(t);
        }),
        (Fe = async e => (await import(e)).default),
        (Ie = (ge(), W(he)).default),
        (Oe = async () => {
          if (!Ee)
            throw new Error(
              'Failed to load proxy worker: cannot determine the script source URL.'
            );
          if (Te(Ee)) return [void 0, Ie()];
          let e = await Pe(Ee);
          return [e, Ie(e)];
        }),
        (Le = (Pt(), W(we)).default),
        (ze = async (e, t, n, r) => {
          let s = Le && !(e || t);
          if (s)
            if (Ee) s = Te(Ee) || (r && !n);
            else {
              if (!r || n)
                throw new Error('cannot determine the script source URL.');
              s = !0;
            }
          if (s) return [void 0, Le];
          {
            let r = 'ort-wasm-simd-threaded.asyncify.mjs',
              s = e ?? Ce(r, t),
              a = n && s && !Te(s, t),
              o = a ? await Pe(s) : (s ?? Se(r, t));
            return [a ? o : void 0, await Fe(o)];
          }
        }));
    }),
    It = V(() => {
      (Ft(),
        (Be = !1),
        ($e = !1),
        (De = !1),
        (Re = () => {
          if (typeof SharedArrayBuffer > 'u') return !1;
          try {
            return (
              typeof MessageChannel < 'u' &&
                new MessageChannel().port1.postMessage(
                  new SharedArrayBuffer(1)
                ),
              WebAssembly.validate(
                new Uint8Array([
                  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5,
                  4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11,
                ])
              )
            );
          } catch {
            return !1;
          }
        }),
        (Ue = () => {
          try {
            return WebAssembly.validate(
              new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10,
                30, 1, 28, 0, 65, 0, 253, 15, 253, 12, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 253, 186, 1, 26, 11,
              ])
            );
          } catch {
            return !1;
          }
        }),
        (Ge = () => {
          try {
            return WebAssembly.validate(
              new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0,
                10, 19, 1, 17, 0, 65, 1, 253, 15, 65, 2, 253, 15, 65, 3, 253,
                15, 253, 147, 2, 11,
              ])
            );
          } catch {
            return !1;
          }
        }),
        (Ve = async e => {
          if (Be) return Promise.resolve();
          if ($e)
            throw new Error(
              "multiple calls to 'initializeWebAssembly()' detected."
            );
          if (De)
            throw new Error(
              "previous call to 'initializeWebAssembly()' failed."
            );
          $e = !0;
          let t = e.initTimeout,
            n = e.numThreads;
          if (!1 !== e.simd)
            if ('relaxed' === e.simd) {
              if (!Ge())
                throw new Error(
                  'Relaxed WebAssembly SIMD is not supported in the current environment.'
                );
            } else if (!Ue())
              throw new Error(
                'WebAssembly SIMD is not supported in the current environment.'
              );
          let r = Re();
          n > 1 &&
            !r &&
            (typeof self < 'u' &&
              !self.crossOriginIsolated &&
              console.warn(
                'env.wasm.numThreads is set to ' +
                  n +
                  ', but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info.'
              ),
            console.warn(
              'WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading.'
            ),
            (e.numThreads = n = 1));
          let s = e.wasmPaths,
            a = 'string' == typeof s ? s : void 0,
            o = s?.mjs,
            i = o?.href ?? o,
            l = s?.wasm,
            c = l?.href ?? l,
            u = e.wasmBinary,
            [d, p] = await ze(i, a, n > 1, !!u || !!c),
            h = !1,
            f = [];
          if (
            (t > 0 &&
              f.push(
                new Promise(e => {
                  setTimeout(() => {
                    ((h = !0), e());
                  }, t);
                })
              ),
            f.push(
              new Promise((e, t) => {
                let r = { numThreads: n };
                if (u) ((r.wasmBinary = u), (r.locateFile = e => e));
                else if (c || a) r.locateFile = e => c ?? a + e;
                else if (i && 0 !== i.indexOf('blob:'))
                  r.locateFile = e => new URL(e, i).href;
                else if (d) {
                  let e = Ae();
                  e && (r.locateFile = t => e + t);
                }
                p(r).then(
                  t => {
                    (($e = !1),
                      (Be = !0),
                      (Ne = t),
                      e(),
                      d && URL.revokeObjectURL(d));
                  },
                  e => {
                    (($e = !1), (De = !0), t(e));
                  }
                );
              })
            ),
            await Promise.race(f),
            h)
          )
            throw new Error(
              `WebAssembly backend initializing failed due to timeout: ${t}ms`
            );
        }),
        (je = () => {
          if (Be && Ne) return Ne;
          throw new Error('WebAssembly is not initialized yet.');
        }));
    }),
    Ot = V(() => {
      (It(),
        (We = (e, t) => {
          let n = je(),
            r = n.lengthBytesUTF8(e) + 1,
            s = n._malloc(r);
          return (n.stringToUTF8(e, s, r), t.push(s), s);
        }),
        (qe = (e, t, n, r) => {
          if ('object' == typeof e && null !== e) {
            if (n.has(e)) throw new Error('Circular reference in options');
            n.add(e);
          }
          Object.entries(e).forEach(([e, s]) => {
            let a = t ? t + e : e;
            if ('object' == typeof s) qe(s, a + '.', n, r);
            else if ('string' == typeof s || 'number' == typeof s)
              r(a, s.toString());
            else {
              if ('boolean' != typeof s)
                throw new Error("Can't handle extra config type: " + typeof s);
              r(a, s ? '1' : '0');
            }
          });
        }),
        (He = e => {
          let t = je(),
            n = t.stackSave();
          try {
            let n = t.PTR_SIZE,
              r = t.stackAlloc(2 * n);
            t._OrtGetLastError(r, r + n);
            let s = Number(t.getValue(r, 4 === n ? 'i32' : 'i64')),
              a = t.getValue(r + n, '*'),
              o = a ? t.UTF8ToString(a) : '';
            throw new Error(`${e} ERROR_CODE: ${s}, ERROR_MESSAGE: ${o}`);
          } finally {
            t.stackRestore(n);
          }
        }));
    }),
    Lt = V(() => {
      (It(),
        Ot(),
        (Qe = e => {
          let t = je(),
            n = 0,
            r = [],
            s = e || {};
          try {
            if (void 0 === e?.logSeverityLevel) s.logSeverityLevel = 2;
            else if (
              'number' != typeof e.logSeverityLevel ||
              !Number.isInteger(e.logSeverityLevel) ||
              e.logSeverityLevel < 0 ||
              e.logSeverityLevel > 4
            )
              throw new Error(
                `log severity level is not valid: ${e.logSeverityLevel}`
              );
            if (void 0 === e?.logVerbosityLevel) s.logVerbosityLevel = 0;
            else if (
              'number' != typeof e.logVerbosityLevel ||
              !Number.isInteger(e.logVerbosityLevel)
            )
              throw new Error(
                `log verbosity level is not valid: ${e.logVerbosityLevel}`
              );
            void 0 === e?.terminate && (s.terminate = !1);
            let a = 0;
            return (
              void 0 !== e?.tag && (a = We(e.tag, r)),
              (n = t._OrtCreateRunOptions(
                s.logSeverityLevel,
                s.logVerbosityLevel,
                !!s.terminate,
                a
              )),
              0 === n && He("Can't create run options."),
              void 0 !== e?.extra &&
                qe(e.extra, '', new WeakSet(), (e, s) => {
                  let a = We(e, r),
                    o = We(s, r);
                  0 !== t._OrtAddRunConfigEntry(n, a, o) &&
                    He(`Can't set a run config entry: ${e} - ${s}.`);
                }),
              [n, r]
            );
          } catch (e) {
            throw (
              0 !== n && t._OrtReleaseRunOptions(n),
              r.forEach(e => t._free(e)),
              e
            );
          }
        }));
    }),
    zt = V(() => {
      (It(),
        Ot(),
        (Xe = e => {
          switch (e) {
            case 'disabled':
              return 0;
            case 'basic':
              return 1;
            case 'extended':
              return 2;
            case 'layout':
              return 3;
            case 'all':
              return 99;
            default:
              throw new Error(`unsupported graph optimization level: ${e}`);
          }
        }),
        (Ye = e => {
          switch (e) {
            case 'sequential':
              return 0;
            case 'parallel':
              return 1;
            default:
              throw new Error(`unsupported execution mode: ${e}`);
          }
        }),
        (Je = e => {
          (e.extra || (e.extra = {}),
            e.extra.session || (e.extra.session = {}));
          let t = e.extra.session;
          (t.use_ort_model_bytes_directly ||
            (t.use_ort_model_bytes_directly = '1'),
            e.executionProviders &&
              e.executionProviders.some(
                e => 'webgpu' === ('string' == typeof e ? e : e.name)
              ) &&
              (e.enableMemPattern = !1));
        }),
        (Ke = (e, t, n, r) => {
          let s = We(t, r),
            a = We(n, r);
          0 !== je()._OrtAddSessionConfigEntry(e, s, a) &&
            He(`Can't set a session config entry: ${t} - ${n}.`);
        }),
        (Ze = (e, t, n, r) => {
          let s = We(t, r),
            a = We(n, r);
          e.push([s, a]);
        }),
        (et = async (e, t, n) => {
          let r = t.executionProviders;
          for (let s of r) {
            let r = 'string' == typeof s ? s : s.name,
              a = [];
            switch (r) {
              case 'webnn':
                if (((r = 'WEBNN'), 'string' != typeof s)) {
                  let t = s?.deviceType;
                  t && Ke(e, 'deviceType', t, n);
                }
                break;
              case 'webgpu':
                {
                  let e;
                  if (((r = 'WebGPU'), 'string' != typeof s)) {
                    let r = s;
                    if (r.device) {
                      if (
                        !(
                          typeof GPUDevice < 'u' &&
                          r.device instanceof GPUDevice
                        )
                      )
                        throw new Error(
                          'Invalid GPU device set in WebGPU EP options.'
                        );
                      e = r.device;
                    }
                    let { enableGraphCapture: o } = t;
                    if (
                      ('boolean' == typeof o &&
                        o &&
                        Ze(a, 'enableGraphCapture', '1', n),
                      'string' == typeof r.preferredLayout &&
                        Ze(a, 'preferredLayout', r.preferredLayout, n),
                      r.forceCpuNodeNames)
                    ) {
                      let e = Array.isArray(r.forceCpuNodeNames)
                        ? r.forceCpuNodeNames
                        : [r.forceCpuNodeNames];
                      Ze(a, 'forceCpuNodeNames', e.join('\n'), n);
                    }
                    r.validationMode &&
                      Ze(a, 'validationMode', r.validationMode, n);
                  }
                  let o = je().webgpuRegisterDevice(e);
                  if (o) {
                    let [e, t, r] = o;
                    (Ze(a, 'deviceId', e.toString(), n),
                      Ze(a, 'webgpuInstance', t.toString(), n),
                      Ze(a, 'webgpuDevice', r.toString(), n));
                  }
                }
                break;
              case 'wasm':
              case 'cpu':
                continue;
              default:
                throw new Error(`not supported execution provider: ${r}`);
            }
            let o = We(r, n),
              i = a.length,
              l = 0,
              c = 0;
            if (i > 0) {
              ((l = je()._malloc(i * je().PTR_SIZE)),
                n.push(l),
                (c = je()._malloc(i * je().PTR_SIZE)),
                n.push(c));
              for (let e = 0; e < i; e++)
                (je().setValue(l + e * je().PTR_SIZE, a[e][0], '*'),
                  je().setValue(c + e * je().PTR_SIZE, a[e][1], '*'));
            }
            0 !== (await je()._OrtAppendExecutionProvider(e, o, l, c, i)) &&
              He(`Can't append execution provider: ${r}.`);
          }
        }),
        (tt = async e => {
          let t = je(),
            n = 0,
            r = [],
            s = e || {};
          Je(s);
          try {
            let e = Xe(s.graphOptimizationLevel ?? 'all'),
              a = Ye(s.executionMode ?? 'sequential'),
              o = 'string' == typeof s.logId ? We(s.logId, r) : 0,
              i = s.logSeverityLevel ?? 2;
            if (!Number.isInteger(i) || i < 0 || i > 4)
              throw new Error(`log severity level is not valid: ${i}`);
            let l = s.logVerbosityLevel ?? 0;
            if (!Number.isInteger(l) || l < 0 || l > 4)
              throw new Error(`log verbosity level is not valid: ${l}`);
            let c =
              'string' == typeof s.optimizedModelFilePath
                ? We(s.optimizedModelFilePath, r)
                : 0;
            if (
              ((n = t._OrtCreateSessionOptions(
                e,
                !!s.enableCpuMemArena,
                !!s.enableMemPattern,
                a,
                !!s.enableProfiling,
                0,
                o,
                i,
                l,
                c
              )),
              0 === n && He("Can't create session options."),
              s.executionProviders && (await et(n, s, r)),
              void 0 !== s.enableGraphCapture)
            ) {
              if ('boolean' != typeof s.enableGraphCapture)
                throw new Error(
                  `enableGraphCapture must be a boolean value: ${s.enableGraphCapture}`
                );
              Ke(n, 'enableGraphCapture', s.enableGraphCapture.toString(), r);
            }
            if (s.freeDimensionOverrides)
              for (let [e, a] of Object.entries(s.freeDimensionOverrides)) {
                if ('string' != typeof e)
                  throw new Error(
                    `free dimension override name must be a string: ${e}`
                  );
                if ('number' != typeof a || !Number.isInteger(a) || a < 0)
                  throw new Error(
                    `free dimension override value must be a non-negative integer: ${a}`
                  );
                let s = We(e, r);
                0 !== t._OrtAddFreeDimensionOverride(n, s, a) &&
                  He(`Can't set a free dimension override: ${e} - ${a}.`);
              }
            return (
              void 0 !== s.extra &&
                qe(s.extra, '', new WeakSet(), (e, t) => {
                  Ke(n, e, t, r);
                }),
              [n, r]
            );
          } catch (e) {
            throw (
              0 !== n &&
                0 !== t._OrtReleaseSessionOptions(n) &&
                He("Can't release session options."),
              r.forEach(e => t._free(e)),
              e
            );
          }
        }));
    }),
    Nt = V(() => {
      ((nt = e => {
        switch (e) {
          case 'int8':
            return 3;
          case 'uint8':
            return 2;
          case 'bool':
            return 9;
          case 'int16':
            return 5;
          case 'uint16':
            return 4;
          case 'int32':
            return 6;
          case 'uint32':
            return 12;
          case 'float16':
            return 10;
          case 'float32':
            return 1;
          case 'float64':
            return 11;
          case 'string':
            return 8;
          case 'int64':
            return 7;
          case 'uint64':
            return 13;
          case 'int4':
            return 22;
          case 'uint4':
            return 21;
          default:
            throw new Error(`unsupported data type: ${e}`);
        }
      }),
        (rt = e => {
          switch (e) {
            case 3:
              return 'int8';
            case 2:
              return 'uint8';
            case 9:
              return 'bool';
            case 5:
              return 'int16';
            case 4:
              return 'uint16';
            case 6:
              return 'int32';
            case 12:
              return 'uint32';
            case 10:
              return 'float16';
            case 1:
              return 'float32';
            case 11:
              return 'float64';
            case 8:
              return 'string';
            case 7:
              return 'int64';
            case 13:
              return 'uint64';
            case 22:
              return 'int4';
            case 21:
              return 'uint4';
            default:
              throw new Error(`unsupported data type: ${e}`);
          }
        }),
        (st = (e, t) => {
          let n = [
              -1, 4, 1, 1, 2, 2, 4, 8, -1, 1, 2, 8, 4, 8, -1, -1, -1, -1, -1,
              -1, -1, 0.5, 0.5,
            ][e],
            r = 'number' == typeof t ? t : t.reduce((e, t) => e * t, 1);
          return n > 0 ? Math.ceil(r * n) : void 0;
        }),
        (at = e => {
          switch (e) {
            case 'float16':
              return typeof Float16Array < 'u' && Float16Array.from
                ? Float16Array
                : Uint16Array;
            case 'float32':
              return Float32Array;
            case 'uint8':
            case 'bool':
              return Uint8Array;
            case 'int8':
              return Int8Array;
            case 'uint16':
              return Uint16Array;
            case 'int16':
              return Int16Array;
            case 'int32':
              return Int32Array;
            case 'float64':
              return Float64Array;
            case 'uint32':
              return Uint32Array;
            case 'int64':
              return BigInt64Array;
            case 'uint64':
              return BigUint64Array;
            default:
              throw new Error(`unsupported type: ${e}`);
          }
        }),
        (ot = e => {
          switch (e) {
            case 'verbose':
              return 0;
            case 'info':
              return 1;
            case 'warning':
              return 2;
            case 'error':
              return 3;
            case 'fatal':
              return 4;
            default:
              throw new Error(`unsupported logging level: ${e}`);
          }
        }),
        (it = e =>
          'float32' === e ||
          'float16' === e ||
          'int32' === e ||
          'int64' === e ||
          'uint32' === e ||
          'uint8' === e ||
          'bool' === e ||
          'uint4' === e ||
          'int4' === e),
        (lt = e =>
          'float32' === e ||
          'float16' === e ||
          'int32' === e ||
          'int64' === e ||
          'uint32' === e ||
          'uint64' === e ||
          'int8' === e ||
          'uint8' === e ||
          'bool' === e ||
          'uint4' === e ||
          'int4' === e),
        (ct = e => {
          switch (e) {
            case 'none':
              return 0;
            case 'cpu':
              return 1;
            case 'cpu-pinned':
              return 2;
            case 'texture':
              return 3;
            case 'gpu-buffer':
              return 4;
            case 'ml-tensor':
              return 5;
            default:
              throw new Error(`unsupported data location: ${e}`);
          }
        }));
    }),
    Bt = V(() => {
      (pe(),
        (ut = async e => {
          if ('string' == typeof e) {
            let t = await fetch(e);
            if (!t.ok)
              throw new Error(`failed to load external data file: ${e}`);
            let n = t.headers.get('Content-Length'),
              r = n ? parseInt(n, 10) : 0;
            if (r < 1073741824) return new Uint8Array(await t.arrayBuffer());
            {
              if (!t.body)
                throw new Error(
                  `failed to load external data file: ${e}, no response body.`
                );
              let n,
                s = t.body.getReader();
              try {
                n = new ArrayBuffer(r);
              } catch (e) {
                if (!(e instanceof RangeError)) throw e;
                {
                  let e = Math.ceil(r / 65536);
                  n = new WebAssembly.Memory({ initial: e, maximum: e }).buffer;
                }
              }
              let a = 0;
              for (;;) {
                let { done: e, value: t } = await s.read();
                if (e) break;
                let r = t.byteLength;
                (new Uint8Array(n, a, r).set(t), (a += r));
              }
              return new Uint8Array(n, 0, r);
            }
          }
          return e instanceof Blob
            ? new Uint8Array(await e.arrayBuffer())
            : e instanceof Uint8Array
              ? e
              : new Uint8Array(e);
        }));
    }),
    $t = V(() => {
      (Nt(), (dt = (e, t) => new (at(t))(e)));
    }),
    Dt = V(() => {
      (Nt(),
        (pt = ['V', 'I', 'W', 'E', 'F']),
        (ht = (e, t) => {
          console.log(`[${pt[e]},${new Date().toISOString()}]${t}`);
        }),
        (mt = (e, t) => {
          ((ft = e), (_t = t));
        }),
        (gt = (e, t) => {
          let n = ot(e);
          n >= ot(ft) && ht(n, 'function' == typeof t ? t() : t);
        }),
        (wt = (...e) => {
          _t && gt(...e);
        }));
    }),
    Rt = V(() => {
      (Nt(),
        Dt(),
        (yt = new Map([
          ['float32', 32],
          ['float16', 16],
          ['int32', 32],
          ['uint32', 32],
          ['int64', 64],
          ['uint64', 64],
          ['int8', 8],
          ['uint8', 8],
          ['int4', 4],
          ['uint4', 4],
        ])),
        (bt = (e, t) => {
          if ('int32' === t) return e;
          let n = yt.get(t);
          if (!n)
            throw new Error(`WebNN backend does not support data type: ${t}`);
          let r = n / 8;
          if (e.byteLength % r !== 0)
            throw new Error(
              `Invalid Uint8Array length - must be a multiple of ${r}.`
            );
          let s = e.byteLength / r,
            a = new (at(t))(e.buffer, e.byteOffset, s);
          switch (t) {
            case 'int64':
            case 'uint64': {
              let e = new Int32Array(s);
              for (let t = 0; t < s; t++) {
                let n = a[t];
                if (n > 2147483647n || n < -2147483648n)
                  throw new Error(
                    'Can not convert int64 data to int32 - value out of range.'
                  );
                e[t] = Number(n);
              }
              return new Uint8Array(e.buffer);
            }
            case 'int8':
            case 'uint8':
            case 'uint32': {
              if ('uint32' === t && a.some(e => e > 2147483647))
                throw new Error(
                  'Can not convert uint32 data to int32 - value out of range.'
                );
              let e = Int32Array.from(a, Number);
              return new Uint8Array(e.buffer);
            }
            default:
              throw new Error(
                `Unsupported data conversion from ${t} to 'int32'`
              );
          }
        }),
        (vt = (e, t) => {
          if ('int32' === t) return e;
          if (e.byteLength % 4 != 0)
            throw new Error(
              'Invalid Uint8Array length - must be a multiple of 4 (int32).'
            );
          let n = e.byteLength / 4,
            r = new Int32Array(e.buffer, e.byteOffset, n);
          switch (t) {
            case 'int64': {
              let e = BigInt64Array.from(r, BigInt);
              return new Uint8Array(e.buffer);
            }
            case 'uint64': {
              if (r.some(e => e < 0))
                throw new Error(
                  'Can not convert int32 data to uin64 - negative value found.'
                );
              let e = BigUint64Array.from(r, BigInt);
              return new Uint8Array(e.buffer);
            }
            case 'int8': {
              if (r.some(e => e < -128 || e > 127))
                throw new Error(
                  'Can not convert int32 data to int8 - value out of range.'
                );
              let e = Int8Array.from(r, Number);
              return new Uint8Array(e.buffer);
            }
            case 'uint8':
              if (r.some(e => e < 0 || e > 255))
                throw new Error(
                  'Can not convert int32 data to uint8 - value out of range.'
                );
              return Uint8Array.from(r, Number);
            case 'uint32': {
              if (r.some(e => e < 0))
                throw new Error(
                  'Can not convert int32 data to uint32 - negative value found.'
                );
              let e = Uint32Array.from(r, Number);
              return new Uint8Array(e.buffer);
            }
            default:
              throw new Error(
                `Unsupported data conversion from 'int32' to ${t}`
              );
          }
        }),
        (xt = 1),
        (Mt = () => xt++),
        (kt = new Map([
          ['int8', 'int32'],
          ['uint8', 'int32'],
          ['uint32', 'int32'],
          ['int64', 'int32'],
        ])),
        (Et = (e, t) => {
          let n = yt.get(e);
          if (!n)
            throw new Error(`WebNN backend does not support data type: ${e}`);
          return t.length > 0
            ? Math.ceil((t.reduce((e, t) => e * t) * n) / 8)
            : 0;
        }),
        (At = class {
          constructor(e) {
            this.isDataConverted = !1;
            let {
              sessionId: t,
              context: n,
              tensor: r,
              dataType: s,
              shape: a,
              fallbackDataType: o,
            } = e;
            ((this.sessionId = t),
              (this.mlContext = n),
              (this.mlTensor = r),
              (this.dataType = s),
              (this.tensorShape = a),
              (this.fallbackDataType = o));
          }
          get tensor() {
            return this.mlTensor;
          }
          get type() {
            return this.dataType;
          }
          get fallbackType() {
            return this.fallbackDataType;
          }
          get shape() {
            return this.tensorShape;
          }
          get byteLength() {
            return Et(this.dataType, this.tensorShape);
          }
          destroy() {
            (wt('verbose', () => '[WebNN] TensorWrapper.destroy'),
              this.mlTensor.destroy());
          }
          write(e) {
            this.mlContext.writeTensor(this.mlTensor, e);
          }
          async read(e) {
            if (this.fallbackDataType) {
              let t = await this.mlContext.readTensor(this.mlTensor),
                n = vt(new Uint8Array(t), this.dataType);
              return e
                ? void (
                    e instanceof ArrayBuffer
                      ? new Uint8Array(e)
                      : new Uint8Array(e.buffer, e.byteOffset, e.byteLength)
                  ).set(n)
                : n.buffer;
            }
            return e
              ? this.mlContext.readTensor(this.mlTensor, e)
              : this.mlContext.readTensor(this.mlTensor);
          }
          canReuseTensor(e, t, n) {
            return (
              this.mlContext === e &&
              this.dataType === t &&
              this.tensorShape.length === n.length &&
              this.tensorShape.every((e, t) => e === n[t])
            );
          }
          setIsDataConverted(e) {
            this.isDataConverted = e;
          }
        }),
        (Tt = class {
          constructor(e, t) {
            ((this.tensorManager = e), (this.wrapper = t));
          }
          get tensorWrapper() {
            return this.wrapper;
          }
          releaseTensor() {
            this.tensorWrapper &&
              (this.tensorManager.releaseTensor(this.tensorWrapper),
              (this.wrapper = void 0));
          }
          async ensureTensor(e, t, n, r) {
            let s,
              a = this.tensorManager.getMLContext(e),
              o = this.tensorManager.getMLOpSupportLimits(e);
            if (!o?.input.dataTypes.includes(t)) {
              if (((s = kt.get(t)), !s || o?.input.dataTypes.includes(s)))
                throw new Error(
                  `WebNN backend does not support data type: ${t}`
                );
              wt(
                'verbose',
                () =>
                  `[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${t} to ${s}`
              );
            }
            if (this.wrapper) {
              if (this.wrapper.canReuseTensor(a, t, n))
                return this.wrapper.tensor;
              if (r) {
                if (this.wrapper.byteLength !== Et(t, n))
                  throw new Error(
                    'Unable to copy data to tensor with different size.'
                  );
                this.activeUpload = new Uint8Array(await this.wrapper.read());
              }
              this.tensorManager.releaseTensor(this.wrapper);
            }
            let i =
              typeof MLTensorUsage > 'u'
                ? void 0
                : MLTensorUsage.READ | MLTensorUsage.WRITE;
            return (
              (this.wrapper = await this.tensorManager.getCachedTensor(
                e,
                t,
                n,
                i,
                !0,
                !0,
                s
              )),
              r &&
                this.activeUpload &&
                (this.wrapper.write(this.activeUpload),
                (this.activeUpload = void 0)),
              this.wrapper.tensor
            );
          }
          upload(e) {
            let t = e;
            if (this.wrapper) {
              if (this.wrapper.fallbackType) {
                if ('int32' !== this.wrapper.fallbackType)
                  throw new Error(
                    `Unsupported fallback data type: ${this.wrapper.fallbackType}`
                  );
                ((t = bt(e, this.wrapper.type)),
                  this.wrapper.setIsDataConverted(!0));
              }
              if (e.byteLength === this.wrapper.byteLength)
                return void this.wrapper.write(t);
              (wt(
                'verbose',
                () => 'Data size does not match tensor size. Releasing tensor.'
              ),
                this.releaseTensor());
            }
            this.activeUpload
              ? this.activeUpload.set(t)
              : (this.activeUpload = new Uint8Array(t));
          }
          async download(e) {
            if (this.activeUpload) {
              let t = this.wrapper?.isDataConverted
                ? vt(this.activeUpload, this.wrapper?.type)
                : this.activeUpload;
              return e
                ? void (e instanceof ArrayBuffer
                    ? new Uint8Array(e).set(t)
                    : new Uint8Array(e.buffer, e.byteOffset, e.byteLength).set(
                        t
                      ))
                : t.buffer;
            }
            if (!this.wrapper) throw new Error('Tensor has not been created.');
            return e ? this.wrapper.read(e) : this.wrapper.read();
          }
        }),
        (Ct = class {
          constructor(e) {
            ((this.backend = e),
              (this.tensorTrackersById = new Map()),
              (this.freeTensors = []),
              (this.externalTensors = new Set()));
          }
          getMLContext(e) {
            let t = this.backend.getMLContext(e);
            if (!t) throw new Error('MLContext not found for session.');
            return t;
          }
          getMLOpSupportLimits(e) {
            return this.backend.getMLOpSupportLimits(e);
          }
          reserveTensorId() {
            let e = Mt();
            return (this.tensorTrackersById.set(e, new Tt(this)), e);
          }
          releaseTensorId(e) {
            let t = this.tensorTrackersById.get(e);
            t &&
              (this.tensorTrackersById.delete(e),
              t.tensorWrapper && this.releaseTensor(t.tensorWrapper));
          }
          async ensureTensor(e, t, n, r, s) {
            wt(
              'verbose',
              () =>
                `[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${n}, shape: ${r}, copyOld: ${s}}`
            );
            let a = this.tensorTrackersById.get(t);
            if (!a) throw new Error('Tensor not found.');
            return a.ensureTensor(e, n, r, s);
          }
          upload(e, t) {
            let n = this.tensorTrackersById.get(e);
            if (!n) throw new Error('Tensor not found.');
            n.upload(t);
          }
          async download(e, t) {
            wt(
              'verbose',
              () =>
                `[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t?.byteLength}}`
            );
            let n = this.tensorTrackersById.get(e);
            if (!n) throw new Error('Tensor not found.');
            return n.download(t);
          }
          releaseTensorsForSession(e) {
            for (let t of this.freeTensors) t.sessionId === e && t.destroy();
            this.freeTensors = this.freeTensors.filter(t => t.sessionId !== e);
          }
          registerTensor(e, t, n, r) {
            let s = this.getMLContext(e),
              a = Mt(),
              o = new At({
                sessionId: e,
                context: s,
                tensor: t,
                dataType: n,
                shape: r,
              });
            return (
              this.tensorTrackersById.set(a, new Tt(this, o)),
              this.externalTensors.add(o),
              a
            );
          }
          async getCachedTensor(e, t, n, r, s, a, o) {
            let i = this.getMLContext(e);
            for (let [r, s] of this.freeTensors.entries())
              if (s.canReuseTensor(i, t, n)) {
                wt(
                  'verbose',
                  () =>
                    `[WebNN] Reusing tensor {dataType: ${t}, ${o ? `fallbackDataType: ${o},` : ''} shape: ${n}`
                );
                let s = this.freeTensors.splice(r, 1)[0];
                return ((s.sessionId = e), s);
              }
            wt(
              'verbose',
              () =>
                `[WebNN] MLContext.createTensor {dataType: ${t}, ${o ? `fallbackDataType: ${o},` : ''} shape: ${n}}`
            );
            let l = await i.createTensor({
              dataType: o ?? t,
              shape: n,
              dimensions: n,
              usage: r,
              writable: s,
              readable: a,
            });
            return new At({
              sessionId: e,
              context: i,
              tensor: l,
              dataType: t,
              shape: n,
              fallbackDataType: o,
            });
          }
          releaseTensor(e) {
            (this.externalTensors.has(e) && this.externalTensors.delete(e),
              this.freeTensors.push(e));
          }
        }),
        (St = (...e) => new Ct(...e)));
    }),
    Ut = {};
  j(Ut, { WebNNBackend: () => jt });
  var Gt,
    Vt,
    jt,
    Wt,
    qt,
    Ht,
    Qt,
    Xt,
    Yt,
    Jt,
    Kt,
    Zt,
    en,
    tn,
    nn,
    rn,
    sn,
    an,
    on,
    ln,
    cn,
    un,
    dn,
    pn,
    hn,
    fn,
    _n,
    mn,
    gn,
    wn,
    yn,
    bn,
    vn,
    xn,
    Mn,
    kn,
    En,
    An = V(() => {
      (Nt(),
        It(),
        $t(),
        Rt(),
        Dt(),
        (Gt = new Map([
          [1, 'float32'],
          [10, 'float16'],
          [6, 'int32'],
          [12, 'uint32'],
          [7, 'int64'],
          [13, 'uint64'],
          [22, 'int4'],
          [21, 'uint4'],
          [3, 'int8'],
          [2, 'uint8'],
          [9, 'uint8'],
        ])),
        (Vt = (e, t) => {
          if (e === t) return !0;
          if (void 0 === e || void 0 === t) return !1;
          let n = Object.keys(e).sort(),
            r = Object.keys(t).sort();
          return (
            n.length === r.length &&
            n.every((n, s) => n === r[s] && e[n] === t[n])
          );
        }),
        (jt = class {
          constructor(e) {
            ((this.tensorManager = St(this)),
              (this.mlContextBySessionId = new Map()),
              (this.sessionIdsByMLContext = new Map()),
              (this.mlContextCache = []),
              (this.sessionGraphInputs = new Map()),
              (this.sessionGraphOutputs = new Map()),
              (this.temporaryGraphInputs = []),
              (this.temporaryGraphOutputs = []),
              (this.temporarySessionTensorIds = new Map()),
              (this.mlOpSupportLimitsBySessionId = new Map()),
              mt(e.logLevel, !!e.debug));
          }
          get currentSessionId() {
            if (void 0 === this.activeSessionId)
              throw new Error('No active session');
            return this.activeSessionId;
          }
          onRunStart(e) {
            (wt('verbose', () => `[WebNN] onRunStart {sessionId: ${e}}`),
              (this.activeSessionId = e));
          }
          onRunEnd(e) {
            wt('verbose', () => `[WebNN] onRunEnd {sessionId: ${e}}`);
            let t = this.temporarySessionTensorIds.get(e);
            if (t) {
              for (let e of t)
                (wt(
                  'verbose',
                  () => `[WebNN] releasing temporary tensor {tensorId: ${e}}`
                ),
                  this.tensorManager.releaseTensorId(e));
              (this.temporarySessionTensorIds.delete(e),
                (this.activeSessionId = void 0));
            }
          }
          async createMLContext(e) {
            if (e instanceof GPUDevice) {
              let t = this.mlContextCache.findIndex(t => t.gpuDevice === e);
              if (-1 !== t) return this.mlContextCache[t].mlContext;
              {
                let t = await navigator.ml.createContext(e);
                return (
                  this.mlContextCache.push({ gpuDevice: e, mlContext: t }),
                  t
                );
              }
            }
            if (void 0 === e) {
              let e = this.mlContextCache.findIndex(
                e => void 0 === e.options && void 0 === e.gpuDevice
              );
              if (-1 !== e) return this.mlContextCache[e].mlContext;
              {
                let e = await navigator.ml.createContext();
                return (this.mlContextCache.push({ mlContext: e }), e);
              }
            }
            let t = this.mlContextCache.findIndex(t => Vt(t.options, e));
            if (-1 !== t) return this.mlContextCache[t].mlContext;
            {
              let t = await navigator.ml.createContext(e);
              return (
                this.mlContextCache.push({ options: e, mlContext: t }),
                t
              );
            }
          }
          registerMLContext(e, t) {
            this.mlContextBySessionId.set(e, t);
            let n = this.sessionIdsByMLContext.get(t);
            (n || ((n = new Set()), this.sessionIdsByMLContext.set(t, n)),
              n.add(e),
              this.mlOpSupportLimitsBySessionId.has(e) ||
                this.mlOpSupportLimitsBySessionId.set(e, t.opSupportLimits()),
              this.temporaryGraphInputs.length > 0 &&
                (this.sessionGraphInputs.set(e, this.temporaryGraphInputs),
                (this.temporaryGraphInputs = [])),
              this.temporaryGraphOutputs.length > 0 &&
                (this.sessionGraphOutputs.set(e, this.temporaryGraphOutputs),
                (this.temporaryGraphOutputs = [])));
          }
          onReleaseSession(e) {
            (this.sessionGraphInputs.delete(e),
              this.sessionGraphOutputs.delete(e));
            let t = this.mlContextBySessionId.get(e);
            if (!t) return;
            (this.tensorManager.releaseTensorsForSession(e),
              this.mlContextBySessionId.delete(e),
              this.mlOpSupportLimitsBySessionId.delete(e));
            let n = this.sessionIdsByMLContext.get(t);
            if ((n.delete(e), 0 === n.size)) {
              this.sessionIdsByMLContext.delete(t);
              let e = this.mlContextCache.findIndex(e => e.mlContext === t);
              -1 !== e && this.mlContextCache.splice(e, 1);
            }
          }
          getMLContext(e) {
            return this.mlContextBySessionId.get(e);
          }
          getMLOpSupportLimits(e) {
            return this.mlOpSupportLimitsBySessionId.get(e);
          }
          reserveTensorId() {
            return this.tensorManager.reserveTensorId();
          }
          releaseTensorId(e) {
            (wt('verbose', () => `[WebNN] releaseTensorId {tensorId: ${e}}`),
              this.tensorManager.releaseTensorId(e));
          }
          async ensureTensor(e, t, n, r, s) {
            let a = Gt.get(n);
            if (!a) throw new Error(`Unsupported ONNX data type: ${n}`);
            return this.tensorManager.ensureTensor(
              e ?? this.currentSessionId,
              t,
              a,
              r,
              s
            );
          }
          async createTemporaryTensor(e, t, n) {
            wt(
              'verbose',
              () =>
                `[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${n}}`
            );
            let r = Gt.get(t);
            if (!r) throw new Error(`Unsupported ONNX data type: ${t}`);
            let s = this.tensorManager.reserveTensorId();
            await this.tensorManager.ensureTensor(e, s, r, n, !1);
            let a = this.temporarySessionTensorIds.get(e);
            return (
              a ? a.push(s) : this.temporarySessionTensorIds.set(e, [s]),
              s
            );
          }
          uploadTensor(e, t) {
            if (!je().shouldTransferToMLTensor)
              throw new Error(
                'Trying to upload to a MLTensor while shouldTransferToMLTensor is false'
              );
            (wt(
              'verbose',
              () =>
                `[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`
            ),
              this.tensorManager.upload(e, t));
          }
          async downloadTensor(e, t) {
            return this.tensorManager.download(e, t);
          }
          createMLTensorDownloader(e, t) {
            return async () => {
              let n = await this.tensorManager.download(e);
              return dt(n, t);
            };
          }
          registerMLTensor(e, t, n, r) {
            let s = Gt.get(n);
            if (!s) throw new Error(`Unsupported ONNX data type: ${n}`);
            let a = this.tensorManager.registerTensor(e, t, s, r);
            return (
              wt(
                'verbose',
                () =>
                  `[WebNN] registerMLTensor {tensor: ${t}, dataType: ${s}, dimensions: ${r}} -> {tensorId: ${a}}`
              ),
              a
            );
          }
          registerMLConstant(e, t, n, r, s, a, o = !1) {
            if (!a)
              throw new Error('External mounted files are not available.');
            let i = e;
            e.startsWith('./') && (i = e.substring(2));
            let l = a.get(i);
            if (!l)
              throw new Error(
                `File with name ${i} not found in preloaded files.`
              );
            if (t + n > l.byteLength)
              throw new Error(
                'Out of bounds: data offset and length exceed the external file data size.'
              );
            let c,
              u = l.slice(t, t + n).buffer;
            switch (s.dataType) {
              case 'float32':
                c = new Float32Array(u);
                break;
              case 'float16':
                c =
                  typeof Float16Array < 'u' && Float16Array.from
                    ? new Float16Array(u)
                    : new Uint16Array(u);
                break;
              case 'int32':
                c = new Int32Array(u);
                break;
              case 'uint32':
                c = new Uint32Array(u);
                break;
              case 'int64':
                if (o) {
                  let e = bt(new Uint8Array(u), 'int64');
                  ((c = new Int32Array(e.buffer)), (s.dataType = 'int32'));
                } else c = new BigInt64Array(u);
                break;
              case 'uint64':
                c = new BigUint64Array(u);
                break;
              case 'int8':
                c = new Int8Array(u);
                break;
              case 'int4':
              case 'uint4':
              case 'uint8':
                c = new Uint8Array(u);
                break;
              default:
                throw new Error(
                  `Unsupported data type: ${s.dataType} in creating WebNN Constant from external data.`
                );
            }
            return (
              wt(
                'verbose',
                () =>
                  `[WebNN] registerMLConstant {dataType: ${s.dataType}, shape: ${s.shape}}} ${o ? '(Note: it was int64 data type and registered to int32 as workaround)' : ''}`
              ),
              r.constant(s, c)
            );
          }
          registerGraphInput(e) {
            this.temporaryGraphInputs.push(e);
          }
          registerGraphOutput(e) {
            this.temporaryGraphOutputs.push(e);
          }
          isGraphInput(e, t) {
            let n = this.sessionGraphInputs.get(e);
            return !!n && n.includes(t);
          }
          isGraphOutput(e, t) {
            let n = this.sessionGraphOutputs.get(e);
            return !!n && n.includes(t);
          }
          isGraphInputOutputTypeSupported(e, t, n = !0) {
            let r = Gt.get(nt(t)),
              s = this.mlOpSupportLimitsBySessionId.get(e);
            return !(
              typeof r > 'u' ||
              (n
                ? !s?.input.dataTypes.includes(r)
                : !s?.output.dataTypes.includes(r))
            );
          }
          flush() {}
        }));
    }),
    Tn = V(() => {
      (de(),
        Lt(),
        zt(),
        Nt(),
        It(),
        Ot(),
        Bt(),
        (Wt = (e, t) => {
          0 !== je()._OrtInit(e, t) && He("Can't initialize onnxruntime.");
        }),
        (qt = async e => {
          Wt(e.wasm.numThreads, ot(e.logLevel));
        }),
        (Ht = async (e, t) => {
          je().asyncInit?.();
          let n = e.webgpu.adapter;
          if ('webgpu' === t) {
            if (typeof navigator > 'u' || !navigator.gpu)
              throw new Error('WebGPU is not supported in current environment');
            if (n) {
              if (
                'object' != typeof n.limits ||
                'object' != typeof n.features ||
                'function' != typeof n.requestDevice
              )
                throw new Error(
                  'Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.'
                );
            } else {
              let t = e.webgpu.powerPreference;
              if (void 0 !== t && 'low-power' !== t && 'high-performance' !== t)
                throw new Error(`Invalid powerPreference setting: "${t}"`);
              let r = e.webgpu.forceFallbackAdapter;
              if (void 0 !== r && 'boolean' != typeof r)
                throw new Error(`Invalid forceFallbackAdapter setting: "${r}"`);
              if (
                ((n = await navigator.gpu.requestAdapter({
                  powerPreference: t,
                  forceFallbackAdapter: r,
                })),
                !n)
              )
                throw new Error(
                  'Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.'
                );
            }
          }
          if ('webnn' === t && (typeof navigator > 'u' || !navigator.ml))
            throw new Error('WebNN is not supported in current environment');
          if (
            ('webgpu' === t &&
              je().webgpuInit(t => {
                e.webgpu.device = t;
              }),
            'webnn' === t)
          ) {
            let t = new (An(), W(Ut)).WebNNBackend(e);
            je().webnnInit([
              t,
              () => t.reserveTensorId(),
              e => t.releaseTensorId(e),
              async (e, n, r, s, a) => t.ensureTensor(e, n, r, s, a),
              (e, n) => {
                t.uploadTensor(e, n);
              },
              async (e, n) => t.downloadTensor(e, n),
              (e, n) => t.registerMLContext(e, n),
              !!e.trace,
            ]);
          }
        }),
        (Qt = new Map()),
        (Xt = e => {
          let t = je(),
            n = t.stackSave();
          try {
            let n = t.PTR_SIZE,
              r = t.stackAlloc(2 * n);
            0 !== t._OrtGetInputOutputCount(e, r, r + n) &&
              He("Can't get session input/output count.");
            let s = 4 === n ? 'i32' : 'i64';
            return [Number(t.getValue(r, s)), Number(t.getValue(r + n, s))];
          } finally {
            t.stackRestore(n);
          }
        }),
        (Yt = (e, t) => {
          let n = je(),
            r = n.stackSave(),
            s = 0;
          try {
            let r = n.PTR_SIZE,
              a = n.stackAlloc(2 * r);
            0 !== n._OrtGetInputOutputMetadata(e, t, a, a + r) &&
              He("Can't get session input/output metadata.");
            let o = Number(n.getValue(a, '*'));
            s = Number(n.getValue(a + r, '*'));
            let i = n.HEAP32[s / 4];
            if (0 === i) return [o, 0];
            let l = n.HEAPU32[s / 4 + 1],
              c = [];
            for (let e = 0; e < l; e++) {
              let t = Number(n.getValue(s + 8 + e * r, '*'));
              c.push(
                0 !== t
                  ? n.UTF8ToString(t)
                  : Number(n.getValue(s + 8 + (e + l) * r, '*'))
              );
            }
            return [o, i, c];
          } finally {
            (n.stackRestore(r), 0 !== s && n._OrtFree(s));
          }
        }),
        (Jt = e => {
          let t = je(),
            n = t._malloc(e.byteLength);
          if (0 === n)
            throw new Error(
              `Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`
            );
          return (t.HEAPU8.set(e, n), [n, e.byteLength]);
        }),
        (Kt = async (e, t) => {
          let n,
            r,
            s = je();
          Array.isArray(e)
            ? ([n, r] = e)
            : e.buffer === s.HEAPU8.buffer
              ? ([n, r] = [e.byteOffset, e.byteLength])
              : ([n, r] = Jt(e));
          let a = 0,
            o = 0,
            i = 0,
            l = [],
            c = [],
            u = [];
          try {
            if (
              (([o, l] = await tt(t)), t?.externalData && s.mountExternalData)
            ) {
              let e = [];
              for (let n of t.externalData) {
                let t = 'string' == typeof n ? n : n.path;
                e.push(
                  ut('string' == typeof n ? n : n.data).then(e => {
                    s.mountExternalData(t, e);
                  })
                );
              }
              await Promise.all(e);
            }
            for (let e of t?.executionProviders ?? [])
              if ('webnn' === ('string' == typeof e ? e : e.name)) {
                if (((s.shouldTransferToMLTensor = !1), 'string' != typeof e)) {
                  let t = e,
                    n = t?.context,
                    r = t?.gpuDevice,
                    a = t?.deviceType,
                    o = t?.powerPreference;
                  s.currentContext =
                    n ||
                    (r
                      ? await s.webnnCreateMLContext(r)
                      : await s.webnnCreateMLContext({
                          deviceType: a,
                          powerPreference: o,
                        }));
                } else s.currentContext = await s.webnnCreateMLContext();
                break;
              }
            ((a = await s._OrtCreateSession(n, r, o)),
              s.webgpuOnCreateSession?.(a),
              0 === a && He("Can't create a session."),
              s.jsepOnCreateSession?.(),
              s.currentContext &&
                (s.webnnRegisterMLContext(a, s.currentContext),
                (s.currentContext = void 0),
                (s.shouldTransferToMLTensor = !0)));
            let [e, d] = Xt(a),
              p = !!t?.enableGraphCapture,
              h = [],
              f = [],
              _ = [],
              m = [],
              g = [];
            for (let t = 0; t < e; t++) {
              let [e, n, r] = Yt(a, t);
              (0 === e && He("Can't get an input name."), c.push(e));
              let o = s.UTF8ToString(e);
              (h.push(o),
                _.push(
                  0 === n
                    ? { name: o, isTensor: !1 }
                    : { name: o, isTensor: !0, type: rt(n), shape: r }
                ));
            }
            for (let n = 0; n < d; n++) {
              let [r, o, i] = Yt(a, n + e);
              (0 === r && He("Can't get an output name."), u.push(r));
              let l = s.UTF8ToString(r);
              (f.push(l),
                m.push(
                  0 === o
                    ? { name: l, isTensor: !1 }
                    : { name: l, isTensor: !0, type: rt(o), shape: i }
                ));
              {
                if (p && void 0 === t?.preferredOutputLocation) {
                  g.push('gpu-buffer');
                  continue;
                }
                let e =
                    'string' == typeof t?.preferredOutputLocation
                      ? t.preferredOutputLocation
                      : (t?.preferredOutputLocation?.[l] ?? 'cpu'),
                  n = s.webnnIsGraphOutput;
                if ('cpu' === e && n && n(a, l)) {
                  g.push('ml-tensor-cpu-output');
                  continue;
                }
                if (
                  'cpu' !== e &&
                  'cpu-pinned' !== e &&
                  'gpu-buffer' !== e &&
                  'ml-tensor' !== e
                )
                  throw new Error(
                    `Not supported preferred output location: ${e}.`
                  );
                if (p && 'gpu-buffer' !== e)
                  throw new Error(
                    `Not supported preferred output location: ${e}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`
                  );
                g.push(e);
              }
            }
            let w = null;
            return (
              g.some(
                e =>
                  'gpu-buffer' === e ||
                  'ml-tensor' === e ||
                  'ml-tensor-cpu-output' === e
              ) &&
                ((i = s._OrtCreateBinding(a)),
                0 === i && He("Can't create IO binding."),
                (w = {
                  handle: i,
                  outputPreferredLocations: g,
                  outputPreferredLocationsEncoded: g
                    .map(e => ('ml-tensor-cpu-output' === e ? 'ml-tensor' : e))
                    .map(e => ct(e)),
                })),
              Qt.set(a, [a, c, u, w, p, !1]),
              [a, h, f, _, m]
            );
          } catch (e) {
            throw (
              c.forEach(e => s._OrtFree(e)),
              u.forEach(e => s._OrtFree(e)),
              0 !== i &&
                0 !== s._OrtReleaseBinding(i) &&
                He("Can't release IO binding."),
              0 !== a &&
                0 !== s._OrtReleaseSession(a) &&
                He("Can't release session."),
              e
            );
          } finally {
            (s._free(n),
              0 !== o &&
                0 !== s._OrtReleaseSessionOptions(o) &&
                He("Can't release session options."),
              l.forEach(e => s._free(e)),
              s.unmountExternalData?.());
          }
        }),
        (Zt = e => {
          let t = je(),
            n = Qt.get(e);
          if (!n)
            throw new Error(`cannot release session. invalid session id: ${e}`);
          let [r, s, a, o, i] = n;
          (o &&
            (i &&
              0 !== t._OrtClearBoundOutputs(o.handle) &&
              He("Can't clear bound outputs."),
            0 !== t._OrtReleaseBinding(o.handle) &&
              He("Can't release IO binding.")),
            t.jsepOnReleaseSession?.(e),
            t.webnnOnReleaseSession?.(e),
            t.webgpuOnReleaseSession?.(e),
            s.forEach(e => t._OrtFree(e)),
            a.forEach(e => t._OrtFree(e)),
            0 !== t._OrtReleaseSession(r) && He("Can't release session."),
            Qt.delete(e));
        }),
        (en = async (e, t, n, r, s, a, o = !1) => {
          if (!e) return void t.push(0);
          let i,
            l,
            c = je(),
            u = c.PTR_SIZE,
            d = e[0],
            p = e[1],
            h = e[3],
            f = h;
          if ('string' === d && ('gpu-buffer' === h || 'ml-tensor' === h))
            throw new Error('String tensor is not supported on GPU.');
          if (o && 'gpu-buffer' !== h)
            throw new Error(
              `External buffer must be provided for input/output index ${a} when enableGraphCapture is true.`
            );
          if ('gpu-buffer' === h) {
            let t = e[2].gpuBuffer;
            l = st(nt(d), p);
            {
              let e = c.webgpuRegisterBuffer;
              if (!e)
                throw new Error(
                  'Tensor location "gpu-buffer" is not supported without using WebGPU.'
                );
              i = e(t, r);
            }
          } else if ('ml-tensor' === h) {
            let t = e[2].mlTensor;
            l = st(nt(d), p);
            let n = c.webnnRegisterMLTensor;
            if (!n)
              throw new Error(
                'Tensor location "ml-tensor" is not supported without using WebNN.'
              );
            i = n(r, t, nt(d), p);
          } else {
            let t = e[2];
            if (Array.isArray(t)) {
              ((l = u * t.length), (i = c._malloc(l)), n.push(i));
              for (let e = 0; e < t.length; e++) {
                if ('string' != typeof t[e])
                  throw new TypeError(
                    `tensor data at index ${e} is not a string`
                  );
                c.setValue(i + e * u, We(t[e], n), '*');
              }
            } else {
              let e = c.webnnIsGraphInput,
                a = c.webnnIsGraphOutput;
              if ('string' !== d && e && a) {
                let o = c.UTF8ToString(s);
                if (e(r, o) || a(r, o)) {
                  let e = nt(d);
                  ((l = st(e, p)), (f = 'ml-tensor'));
                  let n = c.webnnCreateTemporaryTensor,
                    s = c.webnnUploadTensor;
                  if (!n || !s)
                    throw new Error(
                      'Tensor location "ml-tensor" is not supported without using WebNN.'
                    );
                  let a = await n(r, e, p);
                  (s(a, new Uint8Array(t.buffer, t.byteOffset, t.byteLength)),
                    (i = a));
                } else
                  ((l = t.byteLength),
                    (i = c._malloc(l)),
                    n.push(i),
                    c.HEAPU8.set(new Uint8Array(t.buffer, t.byteOffset, l), i));
              } else
                ((l = t.byteLength),
                  (i = c._malloc(l)),
                  n.push(i),
                  c.HEAPU8.set(new Uint8Array(t.buffer, t.byteOffset, l), i));
            }
          }
          let _ = c.stackSave(),
            m = c.stackAlloc(4 * p.length);
          try {
            p.forEach((e, t) =>
              c.setValue(m + t * u, e, 4 === u ? 'i32' : 'i64')
            );
            let e = c._OrtCreateTensor(nt(d), i, l, m, p.length, ct(f));
            (0 === e &&
              He(
                `Can't create tensor for input/output. session=${r}, index=${a}.`
              ),
              t.push(e));
          } finally {
            c.stackRestore(_);
          }
        }),
        (tn = async (e, t, n, r, s, a) => {
          let o = je(),
            i = o.PTR_SIZE,
            l = Qt.get(e);
          if (!l)
            throw new Error(`cannot run inference. invalid session id: ${e}`);
          let c = l[0],
            u = l[1],
            d = l[2],
            p = l[3],
            h = l[4],
            f = l[5],
            _ = t.length,
            m = r.length,
            g = 0,
            w = [],
            y = [],
            b = [],
            v = [],
            x = [],
            M = o.stackSave(),
            k = o.stackAlloc(_ * i),
            E = o.stackAlloc(_ * i),
            A = o.stackAlloc(m * i),
            T = o.stackAlloc(m * i);
          try {
            (([g, w] = Qe(a)), L('wasm prepareInputOutputTensor'));
            for (let r = 0; r < _; r++)
              await en(n[r], y, v, e, u[t[r]], t[r], h);
            for (let t = 0; t < m; t++)
              await en(s[t], b, v, e, d[r[t]], _ + r[t], h);
            z('wasm prepareInputOutputTensor');
            for (let e = 0; e < _; e++)
              (o.setValue(k + e * i, y[e], '*'),
                o.setValue(E + e * i, u[t[e]], '*'));
            for (let e = 0; e < m; e++)
              (o.setValue(A + e * i, b[e], '*'),
                o.setValue(T + e * i, d[r[e]], '*'));
            if (p && !f) {
              let {
                handle: n,
                outputPreferredLocations: a,
                outputPreferredLocationsEncoded: i,
              } = p;
              if (u.length !== _)
                throw new Error(
                  `input count from feeds (${_}) is expected to be always equal to model's input count (${u.length}).`
                );
              L('wasm bindInputsOutputs');
              for (let r = 0; r < _; r++) {
                let s = t[r];
                0 !== (await o._OrtBindInput(n, u[s], y[r])) &&
                  He(`Can't bind input[${r}] for session=${e}.`);
              }
              for (let t = 0; t < m; t++) {
                let l = r[t];
                s[t]?.[3]
                  ? (x.push(b[t]),
                    0 !== o._OrtBindOutput(n, d[l], b[t], 0) &&
                      He(
                        `Can't bind pre-allocated output[${t}] for session=${e}.`
                      ))
                  : 0 !== o._OrtBindOutput(n, d[l], 0, i[l]) &&
                    He(`Can't bind output[${t}] to ${a[t]} for session=${e}.`);
              }
              (z('wasm bindInputsOutputs'), Qt.set(e, [c, u, d, p, h, !0]));
            }
            let l;
            (o.jsepOnRunStart?.(c),
              o.webnnOnRunStart?.(c),
              (l = p
                ? await o._OrtRunWithBinding(c, p.handle, m, A, g)
                : await o._OrtRun(c, E, k, _, T, m, A, g)),
              0 !== l && He('failed to call OrtRun().'));
            let M = [],
              C = [];
            L('wasm ProcessOutputTensor');
            for (let t = 0; t < m; t++) {
              let n = Number(o.getValue(A + t * i, '*'));
              if (n === b[t] || x.includes(b[t])) {
                (M.push(s[t]),
                  n !== b[t] &&
                    0 !== o._OrtReleaseTensor(n) &&
                    He("Can't release tensor."));
                continue;
              }
              let a,
                l = o.stackSave(),
                c = o.stackAlloc(4 * i),
                u = !1,
                d = 0;
              try {
                0 !== o._OrtGetTensorData(n, c, c + i, c + 2 * i, c + 3 * i) &&
                  He(`Can't access output tensor data on index ${t}.`);
                let s = 4 === i ? 'i32' : 'i64',
                  l = Number(o.getValue(c, s));
                d = o.getValue(c + i, '*');
                let h = o.getValue(c + 2 * i, '*'),
                  f = Number(o.getValue(c + 3 * i, s)),
                  _ = [];
                for (let e = 0; e < f; e++)
                  _.push(Number(o.getValue(h + e * i, s)));
                0 !== o._OrtFree(h) && He("Can't free memory for tensor dims.");
                let m = _.reduce((e, t) => e * t, 1);
                a = rt(l);
                let g = p?.outputPreferredLocations[r[t]];
                if ('string' === a) {
                  if ('gpu-buffer' === g || 'ml-tensor' === g)
                    throw new Error('String tensor is not supported on GPU.');
                  let e = [];
                  for (let t = 0; t < m; t++) {
                    let n = o.getValue(d + t * i, '*'),
                      r = o.getValue(d + (t + 1) * i, '*'),
                      s = t === m - 1 ? void 0 : r - n;
                    e.push(o.UTF8ToString(n, s));
                  }
                  M.push([a, _, e, 'cpu']);
                } else if ('gpu-buffer' === g && m > 0) {
                  let t = o.webgpuGetBuffer;
                  if (!t)
                    throw new Error(
                      'preferredLocation "gpu-buffer" is not supported without using WebGPU.'
                    );
                  let r = t(d),
                    s = st(l, m);
                  if (void 0 === s || !it(a))
                    throw new Error(`Unsupported data type: ${a}`);
                  u = !0;
                  {
                    o.webgpuRegisterBuffer(r, e, d);
                    let t = o.webgpuCreateDownloader(r, s, e);
                    M.push([
                      a,
                      _,
                      {
                        gpuBuffer: r,
                        download: async () => {
                          let e = await t();
                          return new (at(a))(e);
                        },
                        dispose: () => {
                          0 !== o._OrtReleaseTensor(n) &&
                            He("Can't release tensor.");
                        },
                      },
                      'gpu-buffer',
                    ]);
                  }
                } else if ('ml-tensor' === g && m > 0) {
                  let t = o.webnnEnsureTensor,
                    r = o.webnnIsGraphInputOutputTypeSupported;
                  if (!t || !r)
                    throw new Error(
                      'preferredLocation "ml-tensor" is not supported without using WebNN.'
                    );
                  if (void 0 === st(l, m) || !lt(a))
                    throw new Error(`Unsupported data type: ${a}`);
                  if (!r(e, a, !1))
                    throw new Error(
                      `preferredLocation "ml-tensor" for ${a} output is not supported by current WebNN Context.`
                    );
                  let s = await t(e, d, l, _, !1);
                  ((u = !0),
                    M.push([
                      a,
                      _,
                      {
                        mlTensor: s,
                        download: o.webnnCreateMLTensorDownloader(d, a),
                        dispose: () => {
                          (o.webnnReleaseTensorId(d), o._OrtReleaseTensor(n));
                        },
                      },
                      'ml-tensor',
                    ]));
                } else if ('ml-tensor-cpu-output' === g && m > 0) {
                  let e = o.webnnCreateMLTensorDownloader(d, a)(),
                    t = M.length;
                  ((u = !0),
                    C.push(
                      (async () => {
                        let r = [t, await e];
                        return (
                          o.webnnReleaseTensorId(d),
                          o._OrtReleaseTensor(n),
                          r
                        );
                      })()
                    ),
                    M.push([a, _, [], 'cpu']));
                } else {
                  let e = new (at(a))(m);
                  (new Uint8Array(e.buffer, e.byteOffset, e.byteLength).set(
                    o.HEAPU8.subarray(d, d + e.byteLength)
                  ),
                    M.push([a, _, e, 'cpu']));
                }
              } finally {
                (o.stackRestore(l),
                  'string' === a && d && o._free(d),
                  u || o._OrtReleaseTensor(n));
              }
            }
            p &&
              !h &&
              (0 !== o._OrtClearBoundOutputs(p.handle) &&
                He("Can't clear bound outputs."),
              Qt.set(e, [c, u, d, p, h, !1]));
            for (let [e, t] of await Promise.all(C)) M[e][2] = t;
            return (z('wasm ProcessOutputTensor'), M);
          } finally {
            (o.webnnOnRunEnd?.(c),
              o.stackRestore(M),
              n.forEach(e => {
                e &&
                  'gpu-buffer' === e[3] &&
                  o.webgpuUnregisterBuffer(e[2].gpuBuffer);
              }),
              s.forEach(e => {
                e &&
                  'gpu-buffer' === e[3] &&
                  o.webgpuUnregisterBuffer(e[2].gpuBuffer);
              }),
              y.forEach(e => o._OrtReleaseTensor(e)),
              b.forEach(e => o._OrtReleaseTensor(e)),
              v.forEach(e => o._free(e)),
              0 !== g && o._OrtReleaseRunOptions(g),
              w.forEach(e => o._free(e)));
          }
        }),
        (nn = e => {
          let t = je(),
            n = Qt.get(e);
          if (!n) throw new Error('invalid session id');
          let r = n[0],
            s = t._OrtEndProfiling(r);
          (0 === s && He("Can't get an profile file name."), t._OrtFree(s));
        }),
        (rn = e => {
          let t = [];
          for (let n of e) {
            let e = n[2];
            !Array.isArray(e) && 'buffer' in e && t.push(e.buffer);
          }
          return t;
        }));
    }),
    Cn = V(() => {
      (de(),
        Tn(),
        It(),
        Ft(),
        (sn = () => !!h.wasm.proxy && typeof document < 'u'),
        (on = !1),
        (ln = !1),
        (cn = !1),
        (pn = new Map()),
        (hn = (e, t) => {
          let n = pn.get(e);
          n ? n.push(t) : pn.set(e, [t]);
        }),
        (fn = () => {
          if (on || !ln || cn || !an) throw new Error('worker not ready');
        }),
        (_n = e => {
          switch (e.data.type) {
            case 'init-wasm':
              ((on = !1),
                e.data.err
                  ? ((cn = !0), dn[1](e.data.err))
                  : ((ln = !0), dn[0]()),
                un && (URL.revokeObjectURL(un), (un = void 0)));
              break;
            case 'init-ep':
            case 'copy-from':
            case 'create':
            case 'release':
            case 'run':
            case 'end-profiling': {
              let t = pn.get(e.data.type);
              e.data.err ? t.shift()[1](e.data.err) : t.shift()[0](e.data.out);
              break;
            }
          }
        }),
        (mn = async () => {
          if (!ln) {
            if (on) throw new Error("multiple calls to 'initWasm()' detected.");
            if (cn) throw new Error("previous call to 'initWasm()' failed.");
            if (((on = !0), sn()))
              return new Promise((e, t) => {
                (an?.terminate(),
                  Oe().then(([r, s]) => {
                    try {
                      (((an = s).onerror = e => t(e)),
                        (an.onmessage = _n),
                        (dn = [e, t]));
                      let a = { type: 'init-wasm', in: h };
                      (!a.in.wasm.wasmPaths &&
                        (r || Me) &&
                        (a.in.wasm.wasmPaths = {
                          wasm: new URL(n(470), n.b).href,
                        }),
                        an.postMessage(a),
                        (un = r));
                    } catch (e) {
                      t(e);
                    }
                  }, t));
              });
            try {
              (await Ve(h.wasm), await qt(h), (ln = !0));
            } catch (e) {
              throw ((cn = !0), e);
            } finally {
              on = !1;
            }
          }
        }),
        (gn = async e => {
          if (sn())
            return (
              fn(),
              new Promise((t, n) => {
                hn('init-ep', [t, n]);
                let r = { type: 'init-ep', in: { epName: e, env: h } };
                an.postMessage(r);
              })
            );
          await Ht(h, e);
        }),
        (wn = async e =>
          sn()
            ? (fn(),
              new Promise((t, n) => {
                hn('copy-from', [t, n]);
                let r = { type: 'copy-from', in: { buffer: e } };
                an.postMessage(r, [e.buffer]);
              }))
            : Jt(e)),
        (yn = async (e, t) => {
          if (sn()) {
            if (t?.preferredOutputLocation)
              throw new Error(
                'session option "preferredOutputLocation" is not supported for proxy.'
              );
            return (
              fn(),
              new Promise((n, r) => {
                hn('create', [n, r]);
                let s = { type: 'create', in: { model: e, options: { ...t } } },
                  a = [];
                (e instanceof Uint8Array && a.push(e.buffer),
                  an.postMessage(s, a));
              })
            );
          }
          return Kt(e, t);
        }),
        (bn = async e => {
          if (sn())
            return (
              fn(),
              new Promise((t, n) => {
                hn('release', [t, n]);
                let r = { type: 'release', in: e };
                an.postMessage(r);
              })
            );
          Zt(e);
        }),
        (vn = async (e, t, n, r, s, a) => {
          if (sn()) {
            if (n.some(e => 'cpu' !== e[3]))
              throw new Error(
                'input tensor on GPU is not supported for proxy.'
              );
            if (s.some(e => e))
              throw new Error(
                'pre-allocated output tensor is not supported for proxy.'
              );
            return (
              fn(),
              new Promise((s, o) => {
                hn('run', [s, o]);
                let i = n,
                  l = {
                    type: 'run',
                    in: {
                      sessionId: e,
                      inputIndices: t,
                      inputs: i,
                      outputIndices: r,
                      options: a,
                    },
                  };
                an.postMessage(l, rn(i));
              })
            );
          }
          return tn(e, t, n, r, s, a);
        }),
        (xn = async e => {
          if (sn())
            return (
              fn(),
              new Promise((t, n) => {
                hn('end-profiling', [t, n]);
                let r = { type: 'end-profiling', in: e };
                an.postMessage(r);
              })
            );
          nn(e);
        }));
    }),
    Sn = V(() => {
      (de(),
        Cn(),
        Nt(),
        pe(),
        Bt(),
        (Mn = (e, t) => {
          switch (e.location) {
            case 'cpu':
              return [e.type, e.dims, e.data, 'cpu'];
            case 'gpu-buffer':
              return [e.type, e.dims, { gpuBuffer: e.gpuBuffer }, 'gpu-buffer'];
            case 'ml-tensor':
              return [e.type, e.dims, { mlTensor: e.mlTensor }, 'ml-tensor'];
            default:
              throw new Error(
                `invalid data location: ${e.location} for ${t()}`
              );
          }
        }),
        (kn = e => {
          switch (e[3]) {
            case 'cpu':
              return new S(e[0], e[2], e[1]);
            case 'gpu-buffer': {
              let t = e[0];
              if (!it(t))
                throw new Error(
                  `not supported data type: ${t} for deserializing GPU tensor`
                );
              let { gpuBuffer: n, download: r, dispose: s } = e[2];
              return S.fromGpuBuffer(n, {
                dataType: t,
                dims: e[1],
                download: r,
                dispose: s,
              });
            }
            case 'ml-tensor': {
              let t = e[0];
              if (!lt(t))
                throw new Error(
                  `not supported data type: ${t} for deserializing MLTensor tensor`
                );
              let { mlTensor: n, download: r, dispose: s } = e[2];
              return S.fromMLTensor(n, {
                dataType: t,
                dims: e[1],
                download: r,
                dispose: s,
              });
            }
            default:
              throw new Error(`invalid data location: ${e[3]}`);
          }
        }),
        (En = class {
          async fetchModelAndCopyToWasmMemory(e) {
            return wn(await ut(e));
          }
          async loadModel(e, t) {
            let n;
            (I(),
              (n =
                'string' == typeof e
                  ? await this.fetchModelAndCopyToWasmMemory(e)
                  : e),
              ([
                this.sessionId,
                this.inputNames,
                this.outputNames,
                this.inputMetadata,
                this.outputMetadata,
              ] = await yn(n, t)),
              O());
          }
          async dispose() {
            return bn(this.sessionId);
          }
          async run(e, t, n) {
            I();
            let r = [],
              s = [];
            Object.entries(e).forEach(e => {
              let t = e[0],
                n = e[1],
                a = this.inputNames.indexOf(t);
              if (-1 === a) throw new Error(`invalid input '${t}'`);
              (r.push(n), s.push(a));
            });
            let a = [],
              o = [];
            Object.entries(t).forEach(e => {
              let t = e[0],
                n = e[1],
                r = this.outputNames.indexOf(t);
              if (-1 === r) throw new Error(`invalid output '${t}'`);
              (a.push(n), o.push(r));
            });
            let i = r.map((e, t) =>
                Mn(e, () => `input "${this.inputNames[s[t]]}"`)
              ),
              l = a.map((e, t) =>
                e ? Mn(e, () => `output "${this.outputNames[o[t]]}"`) : null
              ),
              c = await vn(this.sessionId, s, i, o, l, n),
              u = {};
            for (let e = 0; e < c.length; e++)
              u[this.outputNames[o[e]]] = a[e] ?? kn(c[e]);
            return (O(), u);
          }
          startProfiling() {}
          endProfiling() {
            xn(this.sessionId);
          }
        }));
    }),
    Pn = {};
  j(Pn, {
    OnnxruntimeWebAssemblyBackend: () => In,
    initializeFlags: () => Fn,
    wasmBackend: () => On,
  });
  var Fn,
    In,
    On,
    Ln = V(() => {
      (de(),
        Cn(),
        Sn(),
        (Fn = () => {
          ('number' != typeof h.wasm.initTimeout || h.wasm.initTimeout < 0) &&
            (h.wasm.initTimeout = 0);
          let e = h.wasm.simd;
          if (
            ('boolean' != typeof e &&
              void 0 !== e &&
              'fixed' !== e &&
              'relaxed' !== e &&
              (console.warn(
                `Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`
              ),
              (h.wasm.simd = !1)),
            'boolean' != typeof h.wasm.proxy && (h.wasm.proxy = !1),
            'boolean' != typeof h.wasm.trace && (h.wasm.trace = !1),
            'number' != typeof h.wasm.numThreads ||
              !Number.isInteger(h.wasm.numThreads) ||
              h.wasm.numThreads <= 0)
          )
            if (typeof self < 'u' && !self.crossOriginIsolated)
              h.wasm.numThreads = 1;
            else {
              let e =
                typeof navigator > 'u'
                  ? G('node:os').cpus().length
                  : navigator.hardwareConcurrency;
              h.wasm.numThreads = Math.min(4, Math.ceil((e || 1) / 2));
            }
        }),
        (On = new (In = class {
          async init(e) {
            (Fn(), await mn(), await gn(e));
          }
          async createInferenceSessionHandler(e, t) {
            let n = new En();
            return (await n.loadModel(e, t), n);
          }
        })()));
    });
  (de(), de(), de());
  var zn = ue;
  {
    let e = (Ln(), W(Pn)).wasmBackend;
    (i('webgpu', e, 5), i('webnn', e, 5), i('cpu', e, 10), i('wasm', e, 10));
  }
  (Object.defineProperty(h.versions, 'web', {
    value: '1.25.0-dev.20260303-e7e64dc112',
    enumerable: !0,
  }),
    new Map());
  let Nn = 'warning';
  const Bn = {
    wasm: {},
    webgl: {},
    webgpu: {},
    versions: { common: '1.24.3' },
    set logLevel(e) {
      if (void 0 !== e) {
        if (
          'string' != typeof e ||
          -1 === ['verbose', 'info', 'warning', 'error', 'fatal'].indexOf(e)
        )
          throw new Error(`Unsupported logging level: ${e}`);
        Nn = e;
      }
    },
    get logLevel() {
      return Nn;
    },
  };
  Object.defineProperty(Bn, 'logLevel', { enumerable: !0 });
  const $n = (e, t) => {
      if (void 0 === e) throw new Error('Image buffer must be defined');
      if (void 0 === t.height || void 0 === t.width)
        throw new Error('Image height and width must be defined');
      if ('NHWC' === t.tensorLayout)
        throw new Error('NHWC Tensor layout is not supported yet');
      const { height: n, width: r } = t,
        s = t.norm ?? { mean: 255, bias: 0 };
      let a, o;
      ((a =
        'number' == typeof s.mean
          ? [s.mean, s.mean, s.mean, s.mean]
          : [s.mean[0], s.mean[1], s.mean[2], s.mean[3] ?? 255]),
        (o =
          'number' == typeof s.bias
            ? [s.bias, s.bias, s.bias, s.bias]
            : [s.bias[0], s.bias[1], s.bias[2], s.bias[3] ?? 0]));
      const i = void 0 !== t.format ? t.format : 'RGBA',
        l =
          void 0 !== t.tensorFormat && void 0 !== t.tensorFormat
            ? t.tensorFormat
            : 'RGB',
        c = n * r,
        u = 'RGBA' === l ? new Float32Array(4 * c) : new Float32Array(3 * c);
      let d = 4,
        p = 0,
        h = 1,
        f = 2,
        _ = 3,
        m = 0,
        g = c,
        w = 2 * c,
        y = -1;
      ('RGB' === i && ((d = 3), (p = 0), (h = 1), (f = 2), (_ = -1)),
        'RGBA' === l
          ? (y = 3 * c)
          : 'RBG' === l
            ? ((m = 0), (w = c), (g = 2 * c))
            : 'BGR' === l && ((w = 0), (g = c), (m = 2 * c)));
      for (let t = 0; t < c; t++, p += d, f += d, h += d, _ += d)
        ((u[m++] = (e[p] + o[0]) / a[0]),
          (u[g++] = (e[h] + o[1]) / a[1]),
          (u[w++] = (e[f] + o[2]) / a[2]),
          -1 !== y && -1 !== _ && (u[y++] = (e[_] + o[3]) / a[3]));
      return new Gn('float32', u, 'RGBA' === l ? [1, 4, n, r] : [1, 3, n, r]);
    },
    Dn = new Map([
      ['float32', Float32Array],
      ['uint8', Uint8Array],
      ['int8', Int8Array],
      ['uint16', Uint16Array],
      ['int16', Int16Array],
      ['int32', Int32Array],
      ['bool', Uint8Array],
      ['float64', Float64Array],
      ['uint32', Uint32Array],
      ['int4', Uint8Array],
      ['uint4', Uint8Array],
    ]),
    Rn = new Map([
      [Float32Array, 'float32'],
      [Uint8Array, 'uint8'],
      [Int8Array, 'int8'],
      [Uint16Array, 'uint16'],
      [Int16Array, 'int16'],
      [Int32Array, 'int32'],
      [Float64Array, 'float64'],
      [Uint32Array, 'uint32'],
    ]);
  let Un = !1;
  class Gn {
    constructor(e, t, n) {
      let r, s;
      if (
        ((() => {
          if (!Un) {
            Un = !0;
            const e = 'undefined' != typeof BigInt64Array && BigInt64Array.from,
              t = 'undefined' != typeof BigUint64Array && BigUint64Array.from,
              n = globalThis.Float16Array,
              r = void 0 !== n && n.from;
            (e &&
              (Dn.set('int64', BigInt64Array), Rn.set(BigInt64Array, 'int64')),
              t &&
                (Dn.set('uint64', BigUint64Array),
                Rn.set(BigUint64Array, 'uint64')),
              r
                ? (Dn.set('float16', n), Rn.set(n, 'float16'))
                : Dn.set('float16', Uint16Array));
          }
        })(),
        'object' == typeof e && 'location' in e)
      )
        switch (
          ((this.dataLocation = e.location),
          (r = e.type),
          (s = e.dims),
          e.location)
        ) {
          case 'cpu-pinned': {
            const t = Dn.get(r);
            if (!t)
              throw new TypeError(
                `unsupported type "${r}" to create tensor from pinned buffer`
              );
            if (!(e.data instanceof t))
              throw new TypeError(`buffer should be of type ${t.name}`);
            this.cpuData = e.data;
            break;
          }
          case 'texture':
            if ('float32' !== r)
              throw new TypeError(
                `unsupported type "${r}" to create tensor from texture`
              );
            ((this.gpuTextureData = e.texture),
              (this.downloader = e.download),
              (this.disposer = e.dispose));
            break;
          case 'gpu-buffer':
            if (
              'float32' !== r &&
              'float16' !== r &&
              'int32' !== r &&
              'int64' !== r &&
              'uint32' !== r &&
              'uint8' !== r &&
              'bool' !== r &&
              'uint4' !== r &&
              'int4' !== r
            )
              throw new TypeError(
                `unsupported type "${r}" to create tensor from gpu buffer`
              );
            ((this.gpuBufferData = e.gpuBuffer),
              (this.downloader = e.download),
              (this.disposer = e.dispose));
            break;
          case 'ml-tensor':
            if (
              'float32' !== r &&
              'float16' !== r &&
              'int32' !== r &&
              'int64' !== r &&
              'uint32' !== r &&
              'uint64' !== r &&
              'int8' !== r &&
              'uint8' !== r &&
              'bool' !== r &&
              'uint4' !== r &&
              'int4' !== r
            )
              throw new TypeError(
                `unsupported type "${r}" to create tensor from MLTensor`
              );
            ((this.mlTensorData = e.mlTensor),
              (this.downloader = e.download),
              (this.disposer = e.dispose));
            break;
          default:
            throw new Error(
              `Tensor constructor: unsupported location '${this.dataLocation}'`
            );
        }
      else {
        let a, o;
        if ('string' == typeof e)
          if (((r = e), (o = n), 'string' === e)) {
            if (!Array.isArray(t))
              throw new TypeError(
                "A string tensor's data must be a string array."
              );
            a = t;
          } else {
            const n = Dn.get(e);
            if (void 0 === n)
              throw new TypeError(`Unsupported tensor type: ${e}.`);
            if (Array.isArray(t)) {
              if (
                ('float16' === e && n === Uint16Array) ||
                'uint4' === e ||
                'int4' === e
              )
                throw new TypeError(
                  `Creating a ${e} tensor from number array is not supported. Please use ${n.name} as data.`
                );
              a =
                'uint64' === e || 'int64' === e ? n.from(t, BigInt) : n.from(t);
            } else if (t instanceof n) a = t;
            else if (t instanceof Uint8ClampedArray) {
              if ('uint8' !== e)
                throw new TypeError(
                  "A Uint8ClampedArray tensor's data must be type of uint8"
                );
              a = Uint8Array.from(t);
            } else {
              if (
                !(
                  'float16' === e &&
                  t instanceof Uint16Array &&
                  n !== Uint16Array
                )
              )
                throw new TypeError(
                  `A ${r} tensor's data must be type of ${n}`
                );
              a = new globalThis.Float16Array(t.buffer, t.byteOffset, t.length);
            }
          }
        else if (((o = t), Array.isArray(e))) {
          if (0 === e.length)
            throw new TypeError(
              'Tensor type cannot be inferred from an empty array.'
            );
          const t = typeof e[0];
          if ('string' === t) ((r = 'string'), (a = e));
          else {
            if ('boolean' !== t)
              throw new TypeError(`Invalid element type of data array: ${t}.`);
            ((r = 'bool'), (a = Uint8Array.from(e)));
          }
        } else if (e instanceof Uint8ClampedArray)
          ((r = 'uint8'), (a = Uint8Array.from(e)));
        else {
          const t = Rn.get(e.constructor);
          if (void 0 === t)
            throw new TypeError(
              `Unsupported type for tensor data: ${e.constructor}.`
            );
          ((r = t), (a = e));
        }
        if (void 0 === o) o = [a.length];
        else if (!Array.isArray(o))
          throw new TypeError("A tensor's dims must be a number array");
        ((s = o), (this.cpuData = a), (this.dataLocation = 'cpu'));
      }
      const a = (e => {
        let t = 1;
        for (let n = 0; n < e.length; n++) {
          const r = e[n];
          if ('number' != typeof r || !Number.isSafeInteger(r))
            throw new TypeError(`dims[${n}] must be an integer, got: ${r}`);
          if (r < 0)
            throw new RangeError(
              `dims[${n}] must be a non-negative integer, got: ${r}`
            );
          t *= r;
        }
        return t;
      })(s);
      if (
        this.cpuData &&
        a !== this.cpuData.length &&
        (('uint4' !== r && 'int4' !== r) ||
          Math.ceil(a / 2) !== this.cpuData.length)
      )
        throw new Error(
          `Tensor's size(${a}) does not match data length(${this.cpuData.length}).`
        );
      ((this.type = r), (this.dims = s), (this.size = a));
    }
    static async fromImage(e, t) {
      return (async (e, t) => {
        const n =
            'undefined' != typeof HTMLImageElement &&
            e instanceof HTMLImageElement,
          r = 'undefined' != typeof ImageData && e instanceof ImageData,
          s = 'undefined' != typeof ImageBitmap && e instanceof ImageBitmap,
          a = 'string' == typeof e;
        let o,
          i = t ?? {};
        const l = () => {
            if ('undefined' != typeof document)
              return document.createElement('canvas');
            if ('undefined' != typeof OffscreenCanvas)
              return new OffscreenCanvas(1, 1);
            throw new Error('Canvas is not supported');
          },
          c = e =>
            ('undefined' != typeof HTMLCanvasElement &&
              e instanceof HTMLCanvasElement) ||
            e instanceof OffscreenCanvas
              ? e.getContext('2d')
              : null;
        if (n) {
          const n = l();
          ((n.width = e.width), (n.height = e.height));
          const r = c(n);
          if (null == r) throw new Error('Can not access image data');
          {
            let n = e.height,
              s = e.width;
            if (
              (void 0 !== t &&
                void 0 !== t.resizedHeight &&
                void 0 !== t.resizedWidth &&
                ((n = t.resizedHeight), (s = t.resizedWidth)),
              void 0 !== t)
            ) {
              if (((i = t), void 0 !== t.tensorFormat))
                throw new Error(
                  'Image input config format must be RGBA for HTMLImageElement'
                );
              ((i.tensorFormat = 'RGBA'), (i.height = n), (i.width = s));
            } else ((i.tensorFormat = 'RGBA'), (i.height = n), (i.width = s));
            (r.drawImage(e, 0, 0), (o = r.getImageData(0, 0, s, n).data));
          }
        } else {
          if (!r) {
            if (s) {
              if (void 0 === t)
                throw new Error(
                  'Please provide image config with format for Imagebitmap'
                );
              const n = l();
              ((n.width = e.width), (n.height = e.height));
              const r = c(n);
              if (null != r) {
                const t = e.height,
                  n = e.width;
                return (
                  r.drawImage(e, 0, 0, n, t),
                  (o = r.getImageData(0, 0, n, t).data),
                  (i.height = t),
                  (i.width = n),
                  $n(o, i)
                );
              }
              throw new Error('Can not access image data');
            }
            if (a)
              return new Promise((t, n) => {
                const r = l(),
                  s = c(r);
                if (!e || !s) return n();
                const a = new Image();
                ((a.crossOrigin = 'Anonymous'),
                  (a.src = e),
                  (a.onload = () => {
                    ((r.width = a.width),
                      (r.height = a.height),
                      s.drawImage(a, 0, 0, r.width, r.height));
                    const e = s.getImageData(0, 0, r.width, r.height);
                    ((i.height = r.height),
                      (i.width = r.width),
                      t($n(e.data, i)));
                  }));
              });
            throw new Error(
              'Input data provided is not supported - aborted tensor creation'
            );
          }
          {
            let n, r;
            if (
              (void 0 !== t &&
              void 0 !== t.resizedWidth &&
              void 0 !== t.resizedHeight
                ? ((n = t.resizedHeight), (r = t.resizedWidth))
                : ((n = e.height), (r = e.width)),
              void 0 !== t && (i = t),
              (i.format = 'RGBA'),
              (i.height = n),
              (i.width = r),
              void 0 !== t)
            ) {
              const t = l();
              ((t.width = r), (t.height = n));
              const s = c(t);
              if (null == s) throw new Error('Can not access image data');
              (s.putImageData(e, 0, 0), (o = s.getImageData(0, 0, r, n).data));
            } else o = e.data;
          }
        }
        if (void 0 !== o) return $n(o, i);
        throw new Error(
          'Input data provided is not supported - aborted tensor creation'
        );
      })(e, t);
    }
    static fromTexture(e, t) {
      return ((e, t) => {
        const { width: n, height: r, download: s, dispose: a } = t;
        return new Gn({
          location: 'texture',
          type: 'float32',
          texture: e,
          dims: [1, r, n, 4],
          download: s,
          dispose: a,
        });
      })(e, t);
    }
    static fromGpuBuffer(e, t) {
      return ((e, t) => {
        const { dataType: n, dims: r, download: s, dispose: a } = t;
        return new Gn({
          location: 'gpu-buffer',
          type: n ?? 'float32',
          gpuBuffer: e,
          dims: r,
          download: s,
          dispose: a,
        });
      })(e, t);
    }
    static fromMLTensor(e, t) {
      return ((e, t) => {
        const { dataType: n, dims: r, download: s, dispose: a } = t;
        return new Gn({
          location: 'ml-tensor',
          type: n ?? 'float32',
          mlTensor: e,
          dims: r,
          download: s,
          dispose: a,
        });
      })(e, t);
    }
    static fromPinnedBuffer(e, t, n) {
      return ((e, t, n) =>
        new Gn({
          location: 'cpu-pinned',
          type: e,
          data: t,
          dims: n ?? [t.length],
        }))(e, t, n);
    }
    toDataURL(e) {
      return ((e, t) => {
        const n =
          'undefined' != typeof document
            ? document.createElement('canvas')
            : new OffscreenCanvas(1, 1);
        ((n.width = e.dims[3]), (n.height = e.dims[2]));
        const r = n.getContext('2d');
        if (null != r) {
          let s, a;
          void 0 !== t?.tensorLayout && 'NHWC' === t.tensorLayout
            ? ((s = e.dims[2]), (a = e.dims[3]))
            : ((s = e.dims[3]), (a = e.dims[2]));
          const o = void 0 !== t?.format ? t.format : 'RGB',
            i = t?.norm;
          let l, c;
          (void 0 === i || void 0 === i.mean
            ? (l = [255, 255, 255, 255])
            : 'number' == typeof i.mean
              ? (l = [i.mean, i.mean, i.mean, i.mean])
              : ((l = [i.mean[0], i.mean[1], i.mean[2], 0]),
                void 0 !== i.mean[3] && (l[3] = i.mean[3])),
            void 0 === i || void 0 === i.bias
              ? (c = [0, 0, 0, 0])
              : 'number' == typeof i.bias
                ? (c = [i.bias, i.bias, i.bias, i.bias])
                : ((c = [i.bias[0], i.bias[1], i.bias[2], 0]),
                  void 0 !== i.bias[3] && (c[3] = i.bias[3])));
          const u = a * s;
          let d = 0,
            p = u,
            h = 2 * u,
            f = -1;
          'RGBA' === o
            ? ((d = 0), (p = u), (h = 2 * u), (f = 3 * u))
            : 'RGB' === o
              ? ((d = 0), (p = u), (h = 2 * u))
              : 'RBG' === o && ((d = 0), (h = u), (p = 2 * u));
          for (let t = 0; t < a; t++)
            for (let n = 0; n < s; n++) {
              const s = (e.data[d++] - c[0]) * l[0],
                a = (e.data[p++] - c[1]) * l[1],
                o = (e.data[h++] - c[2]) * l[2],
                i = -1 === f ? 255 : (e.data[f++] - c[3]) * l[3];
              ((r.fillStyle = 'rgba(' + s + ',' + a + ',' + o + ',' + i + ')'),
                r.fillRect(n, t, 1, 1));
            }
          if ('toDataURL' in n) return n.toDataURL();
          throw new Error('toDataURL is not supported');
        }
        throw new Error('Can not access image data');
      })(this, e);
    }
    toImageData(e) {
      return ((e, t) => {
        const n =
          'undefined' != typeof document
            ? document.createElement('canvas').getContext('2d')
            : new OffscreenCanvas(1, 1).getContext('2d');
        let r;
        if (null == n) throw new Error('Can not access image data');
        {
          let s, a, o;
          void 0 !== t?.tensorLayout && 'NHWC' === t.tensorLayout
            ? ((s = e.dims[2]), (a = e.dims[1]), (o = e.dims[3]))
            : ((s = e.dims[3]), (a = e.dims[2]), (o = e.dims[1]));
          const i = void 0 !== t && void 0 !== t.format ? t.format : 'RGB',
            l = t?.norm;
          let c, u;
          (void 0 === l || void 0 === l.mean
            ? (c = [255, 255, 255, 255])
            : 'number' == typeof l.mean
              ? (c = [l.mean, l.mean, l.mean, l.mean])
              : ((c = [l.mean[0], l.mean[1], l.mean[2], 255]),
                void 0 !== l.mean[3] && (c[3] = l.mean[3])),
            void 0 === l || void 0 === l.bias
              ? (u = [0, 0, 0, 0])
              : 'number' == typeof l.bias
                ? (u = [l.bias, l.bias, l.bias, l.bias])
                : ((u = [l.bias[0], l.bias[1], l.bias[2], 0]),
                  void 0 !== l.bias[3] && (u[3] = l.bias[3])));
          const d = a * s;
          if (
            void 0 !== t &&
            ((void 0 !== t.format && 4 === o && 'RGBA' !== t.format) ||
              (3 === o && 'RGB' !== t.format && 'BGR' !== t.format))
          )
            throw new Error("Tensor format doesn't match input tensor dims");
          const p = 4;
          let h = 0,
            f = 1,
            _ = 2,
            m = 3,
            g = 0,
            w = d,
            y = 2 * d,
            b = -1;
          ('RGBA' === i
            ? ((g = 0), (w = d), (y = 2 * d), (b = 3 * d))
            : 'RGB' === i
              ? ((g = 0), (w = d), (y = 2 * d))
              : 'RBG' === i && ((g = 0), (y = d), (w = 2 * d)),
            (r = n.createImageData(s, a)));
          for (let t = 0; t < a * s; h += p, f += p, _ += p, m += p, t++)
            ((r.data[h] = (e.data[g++] - u[0]) * c[0]),
              (r.data[f] = (e.data[w++] - u[1]) * c[1]),
              (r.data[_] = (e.data[y++] - u[2]) * c[2]),
              (r.data[m] = -1 === b ? 255 : (e.data[b++] - u[3]) * c[3]));
        }
        return r;
      })(this, e);
    }
    get data() {
      if ((this.ensureValid(), !this.cpuData))
        throw new Error(
          'The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.'
        );
      return this.cpuData;
    }
    get location() {
      return this.dataLocation;
    }
    get texture() {
      if ((this.ensureValid(), !this.gpuTextureData))
        throw new Error('The data is not stored as a WebGL texture.');
      return this.gpuTextureData;
    }
    get gpuBuffer() {
      if ((this.ensureValid(), !this.gpuBufferData))
        throw new Error('The data is not stored as a WebGPU buffer.');
      return this.gpuBufferData;
    }
    get mlTensor() {
      if ((this.ensureValid(), !this.mlTensorData))
        throw new Error('The data is not stored as a WebNN MLTensor.');
      return this.mlTensorData;
    }
    async getData(e) {
      switch ((this.ensureValid(), this.dataLocation)) {
        case 'cpu':
        case 'cpu-pinned':
          return this.data;
        case 'texture':
        case 'gpu-buffer':
        case 'ml-tensor':
          if (!this.downloader)
            throw new Error(
              'The current tensor is not created with a specified data downloader.'
            );
          if (this.isDownloading)
            throw new Error('The current tensor is being downloaded.');
          try {
            this.isDownloading = !0;
            const t = await this.downloader();
            return (
              (this.downloader = void 0),
              (this.dataLocation = 'cpu'),
              (this.cpuData = t),
              e && this.disposer && (this.disposer(), (this.disposer = void 0)),
              t
            );
          } finally {
            this.isDownloading = !1;
          }
        default:
          throw new Error(
            `cannot get data from location: ${this.dataLocation}`
          );
      }
    }
    dispose() {
      if (this.isDownloading)
        throw new Error('The current tensor is being downloaded.');
      (this.disposer && (this.disposer(), (this.disposer = void 0)),
        (this.cpuData = void 0),
        (this.gpuTextureData = void 0),
        (this.gpuBufferData = void 0),
        (this.mlTensorData = void 0),
        (this.downloader = void 0),
        (this.isDownloading = void 0),
        (this.dataLocation = 'none'));
    }
    ensureValid() {
      if ('none' === this.dataLocation)
        throw new Error('The tensor is disposed.');
    }
    reshape(e) {
      if ((this.ensureValid(), this.downloader || this.disposer))
        throw new Error('Cannot reshape a tensor that owns GPU resource.');
      return ((e, t) => {
        switch (e.location) {
          case 'cpu':
            return new Gn(e.type, e.data, t);
          case 'cpu-pinned':
            return new Gn({
              location: 'cpu-pinned',
              data: e.data,
              type: e.type,
              dims: t,
            });
          case 'texture':
            return new Gn({
              location: 'texture',
              texture: e.texture,
              type: e.type,
              dims: t,
            });
          case 'gpu-buffer':
            return new Gn({
              location: 'gpu-buffer',
              gpuBuffer: e.gpuBuffer,
              type: e.type,
              dims: t,
            });
          case 'ml-tensor':
            return new Gn({
              location: 'ml-tensor',
              mlTensor: e.mlTensor,
              type: e.type,
              dims: t,
            });
          default:
            throw new Error(
              `tensorReshape: tensor location ${e.location} is not supported`
            );
        }
      })(this, e);
    }
  }
  const Vn = Gn;
  var jn = Object.defineProperty,
    Wn = (e, t) => {
      for (var n in t) jn(e, n, { get: t[n], enumerable: !0 });
    },
    qn = {},
    Hn = {},
    Qn = 'undefined' != typeof self,
    Xn = !vr(qn),
    Yn = !vr(Hn),
    Jn = Qn && 'caches' in self,
    Kn = void 0 !== globalThis.Deno,
    Zn = (globalThis.Bun, Kn && Jn && !Xn),
    er = 'undefined' != typeof process,
    tr = er && 'node' === process?.release?.name && !Zn,
    nr = 'undefined' != typeof window && void 0 !== window.document,
    rr =
      Qn &&
      [
        'DedicatedWorkerGlobalScope',
        'ServiceWorkerGlobalScope',
        'SharedWorkerGlobalScope',
      ].includes(self.constructor?.name),
    sr = nr || rr || Zn,
    ar = tr || ('undefined' != typeof navigator && 'gpu' in navigator),
    or = 'undefined' != typeof navigator && 'ml' in navigator,
    ir =
      'undefined' != typeof crypto &&
      'function' == typeof crypto.getRandomValues,
    lr =
      'undefined' != typeof chrome &&
      void 0 !== chrome.runtime &&
      'string' == typeof chrome.runtime.id,
    cr =
      'undefined' != typeof ServiceWorkerGlobalScope &&
      Qn &&
      self instanceof ServiceWorkerGlobalScope,
    ur = (() => {
      if ('undefined' == typeof navigator) return !1;
      const e = navigator.userAgent,
        t = (navigator.vendor || '').indexOf('Apple') > -1,
        n =
          !e.match(/CriOS|FxiOS|EdgiOS|OPiOS|mercury|brave/i) &&
          !e.includes('Chrome') &&
          !e.includes('Android');
      return t && n;
    })(),
    dr = Object.freeze({
      IS_BROWSER_ENV: nr,
      IS_WEBWORKER_ENV: rr,
      IS_WEB_ENV: sr,
      IS_SERVICE_WORKER_ENV: cr,
      IS_DENO_WEB_RUNTIME: Zn,
      IS_WEB_CACHE_AVAILABLE: Jn,
      IS_WEBGPU_AVAILABLE: ar,
      IS_WEBNN_AVAILABLE: or,
      IS_SAFARI: ur,
      IS_PROCESS_AVAILABLE: er,
      IS_NODE_ENV: tr,
      IS_FS_AVAILABLE: Xn,
      IS_PATH_AVAILABLE: Yn,
      IS_CRYPTO_AVAILABLE: ir,
      IS_CHROME_AVAILABLE: lr,
    }),
    pr = Xn && Yn,
    hr = './';
  if (pr) {
    const e = Object({}).url;
    e
      ? (hr = Hn.dirname(Hn.dirname({}.fileURLToPath(e))))
      : 'undefined' != typeof __dirname && (hr = Hn.dirname(__dirname));
  }
  var fr = pr ? Hn.join(hr, '/.cache/') : null,
    _r = '/models/',
    mr = pr ? Hn.join(hr, _r) : _r,
    gr =
      'function' == typeof globalThis.fetch
        ? globalThis.fetch.bind(globalThis)
        : void 0,
    wr = Object.freeze({
      DEBUG: 10,
      INFO: 20,
      WARNING: 30,
      ERROR: 40,
      NONE: 50,
    }),
    yr = wr.WARNING,
    br = {
      version: '4.0.0-next.6',
      backends: { onnx: {} },
      get logLevel() {
        return yr;
      },
      set logLevel(e) {
        ((yr = e), br.backends.onnx?.setLogLevel?.(e));
      },
      allowRemoteModels: !0,
      remoteHost: 'https://huggingface.co/',
      remotePathTemplate: '{model}/resolve/{revision}/',
      allowLocalModels: !(nr || rr || Zn),
      localModelPath: mr,
      useFS: Xn,
      useBrowserCache: Jn,
      useFSCache: Xn,
      cacheDir: fr,
      useCustomCache: !1,
      customCache: null,
      useWasmCache: Jn || Xn,
      cacheKey: 'transformers-cache',
      fetch: gr,
    };
  function vr(e) {
    return 0 === Object.keys(e).length;
  }
  function xr(e, t) {
    e && e(t);
  }
  function Mr(e) {
    return null == e || -1 === e;
  }
  function kr(e) {
    const t = [];
    let n = e;
    for (; Array.isArray(n); ) (t.push(n.length), (n = n[0]));
    return t;
  }
  function Er(...e) {
    return Array.prototype.concat.apply([], e);
  }
  function Ar(...e) {
    return e.reduce((e, t) => e.flatMap(e => t.map(t => [e, t])));
  }
  function Tr(e, t) {
    return Math.abs(((e + t) % (2 * t)) - t);
  }
  function Cr(e, t) {
    return Object.assign(
      {},
      ...t.map(t => {
        if (void 0 !== e[t]) return { [t]: e[t] };
      })
    );
  }
  function Sr(e, t) {
    let n = 0;
    for (const r of e) r === t && ++n;
    return n;
  }
  var Pr,
    Fr = {
      error(...e) {
        br.logLevel <= wr.ERROR && console.error(...e);
      },
      warn(...e) {
        br.logLevel <= wr.WARNING && console.warn(...e);
      },
      info(...e) {
        br.logLevel <= wr.INFO && console.log(...e);
      },
      debug(...e) {
        br.logLevel <= wr.DEBUG && console.log(...e);
      },
      log(...e) {
        this.info(...e);
      },
    },
    Ir = class {
      constructor(e) {
        this.trie = this._build_trie(e);
      }
      _build_trie(e) {
        const t = Object.create(null);
        for (const n of e) {
          let e = t;
          for (let t = 0; t < n.length; ++t) {
            const r = n[t];
            e = e[r] ??= Object.create(null);
          }
          e.end = n;
        }
        return t;
      }
      split(e) {
        const t = [],
          n = e.length;
        let r = 0,
          s = 0;
        for (; s < n; ) {
          let a = this.trie,
            o = null,
            i = s;
          for (; i < n && (a = a[e[i]]); ) (a.end && (o = a.end), ++i);
          o
            ? (s > r && t.push(e.slice(r, s)),
              t.push(o),
              (s += o.length),
              (r = s))
            : ++s;
        }
        return (r < n && t.push(e.slice(r)), t);
      }
    },
    Or = class {
      constructor(e) {
        ((this.content = e.content),
          (this.id = e.id),
          (this.single_word = e.single_word ?? !1),
          (this.lstrip = e.lstrip ?? !1),
          (this.rstrip = e.rstrip ?? !1),
          (this.special = e.special ?? !1),
          (this.normalized = e.normalized ?? !this.special));
      }
    },
    Lr = (() => {
      const e = [
          ...Array.from(
            { length: '~'.charCodeAt(0) - '!'.charCodeAt(0) + 1 },
            (e, t) => t + '!'.charCodeAt(0)
          ),
          ...Array.from(
            { length: '¬'.charCodeAt(0) - '¡'.charCodeAt(0) + 1 },
            (e, t) => t + '¡'.charCodeAt(0)
          ),
          ...Array.from(
            { length: 'ÿ'.charCodeAt(0) - '®'.charCodeAt(0) + 1 },
            (e, t) => t + '®'.charCodeAt(0)
          ),
        ],
        t = e.slice();
      let n = 0;
      for (let r = 0; r < 256; ++r)
        e.includes(r) || (e.push(r), t.push(256 + n), (n += 1));
      const r = t.map(e => String.fromCharCode(e));
      return Object.fromEntries(e.map((e, t) => [e, r[t]]));
    })(),
    zr =
      ((Pr = Lr),
      Object.fromEntries(Object.entries(Pr).map(([e, t]) => [t, e]))),
    Nr = '.,!?…。，、।۔،',
    Br = new Map([
      [
        "(?i:'s|'t|'re|'ve|'m|'ll|'d)",
        "(?:'([sS]|[tT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))",
      ],
      [
        '(?i:[sdmt]|ll|ve|re)',
        '(?:[sS]|[dD]|[mM]|[tT]|[lL][lL]|[vV][eE]|[rR][eE])',
      ],
      ['[^\\r\\n\\p{L}\\p{N}]?+', '[^\\r\\n\\p{L}\\p{N}]?'],
      ['[^\\s\\p{L}\\p{N}]++', '[^\\s\\p{L}\\p{N}]+'],
      ['(?>\\p{Nd}{510})', '(?:\\p{Nd}{510})'],
      ['\\p{Nd}{3}+', '(?:\\p{Nd}{3})+'],
      ['\\G', ''],
      [` ?[^(\\s|[${Nr}])]+`, ` ?[^\\s${Nr}]+`],
    ]),
    $r = '\\p{P}\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E',
    Dr = e =>
      e
        .replace(/ \./g, '.')
        .replace(/ \?/g, '?')
        .replace(/ \!/g, '!')
        .replace(/ ,/g, ',')
        .replace(/ \' /g, "'")
        .replace(/ n't/g, "n't")
        .replace(/ 'm/g, "'m")
        .replace(/ 's/g, "'s")
        .replace(/ 've/g, "'ve")
        .replace(/ 're/g, "'re"),
    Rr = (e, t = !0) => {
      if (void 0 === e.Regex) {
        if (void 0 !== e.String) {
          const n = Ur(e.String);
          return new RegExp(t ? n : `(${n})`, 'gu');
        }
        return (console.warn('Unknown pattern type:', e), null);
      }
      {
        let t = e.Regex.replace(/\\([#&~])/g, '$1');
        t = t
          .replace(/\\A/g, '^')
          .replace(/\\z/g, '$')
          .replace(/\\Z/g, '(?=\\r?\\n?$)');
        for (const [e, n] of Br) t = t.replaceAll(e, n);
        try {
          return new RegExp(t, 'gu');
        } catch (e) {
          if (
            !(
              e instanceof SyntaxError &&
              e.message.toLowerCase().includes('invalid property name')
            )
          )
            throw e;
          let n = !1;
          const r = t.replace(/(\\[pP])\{([^}=]+)\}/g, (e, t, r) => {
            try {
              return (new RegExp(`\\p{${r}}`, 'u'), `${t}{${r}}`);
            } catch {
              return ((n = !0), `${t}{Script=${r}}`);
            }
          });
          if (!n) throw e;
          try {
            return new RegExp(r, 'gu');
          } catch (t) {
            throw e;
          }
        }
      }
    },
    Ur = e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    Gr = e =>
      (e >= 19968 && e <= 40959) ||
      (e >= 13312 && e <= 19903) ||
      (e >= 131072 && e <= 173791) ||
      (e >= 173824 && e <= 177983) ||
      (e >= 177984 && e <= 178207) ||
      (e >= 178208 && e <= 183983) ||
      (e >= 63744 && e <= 64255) ||
      (e >= 194560 && e <= 195103),
    Vr = e => {
      let t = 0;
      for (const n of e) ++t;
      return t;
    },
    jr = (...e) => Array.prototype.concat.apply([], e),
    Wr = e => new Map(Object.entries(e)),
    qr = e => e.replace(/\p{M}/gu, ''),
    Hr = (e, t, n = []) => {
      if (!e || Array.isArray(e) || 'object' != typeof e)
        return `${t} must be a valid object`;
      for (const r of n)
        if (!(r in e)) return `${t} must contain a "${r}" property`;
      return null;
    },
    Qr = class {
      constructor() {
        const e = function (...t) {
          return e._call(...t);
        };
        return Object.setPrototypeOf(e, new.target.prototype);
      }
    },
    Xr = class extends Qr {
      constructor(e) {
        (super(), (this.config = e));
      }
      _call(e) {
        return this.normalize(e);
      }
    },
    Yr = class extends Xr {
      tokenize_chinese_chars(e) {
        const t = [];
        for (let n = 0; n < e.length; ++n) {
          const r = e[n],
            s = r.charCodeAt(0);
          Gr(s) ? (t.push(' '), t.push(r), t.push(' ')) : t.push(r);
        }
        return t.join('');
      }
      strip_accents(e) {
        return e.normalize('NFD').replace(/\p{Mn}/gu, '');
      }
      is_control(e) {
        switch (e) {
          case '\t':
          case '\n':
          case '\r':
            return !1;
          default:
            return /^\p{Cc}|\p{Cf}|\p{Co}|\p{Cs}$/u.test(e);
        }
      }
      clean_text(e) {
        const t = [];
        for (const n of e) {
          const e = n.charCodeAt(0);
          0 === e ||
            65533 === e ||
            this.is_control(n) ||
            (/^\s$/.test(n) ? t.push(' ') : t.push(n));
        }
        return t.join('');
      }
      normalize(e) {
        return (
          this.config.clean_text && (e = this.clean_text(e)),
          this.config.handle_chinese_chars &&
            (e = this.tokenize_chinese_chars(e)),
          this.config.lowercase
            ? ((e = e.toLowerCase()),
              !1 !== this.config.strip_accents && (e = this.strip_accents(e)))
            : this.config.strip_accents && (e = this.strip_accents(e)),
          e
        );
      }
    },
    Jr = class extends Xr {
      constructor(e) {
        (super(e), (this.charsmap = e.precompiled_charsmap ?? null));
      }
      normalize(e) {
        if (
          (e = (e = e.replace(
            /[\u0001-\u0008\u000B\u000E-\u001F\u007F\u008F\u009F]/gm,
            ''
          )).replace(
            /[\u0009\u000A\u000C\u000D\u00A0\u1680\u2000-\u200F\u2028\u2029\u202F\u205F\u2581\u3000\uFEFF\uFFFD]/gm,
            ' '
          )).includes('～')
        ) {
          const t = e.split('～');
          e = t.map(e => e.normalize('NFKC')).join('～');
        } else e = e.normalize('NFKC');
        return e;
      }
    },
    Kr = class extends Xr {
      constructor(e) {
        (super(e), (this.normalizers = (e.normalizers ?? []).map(e => cs(e))));
      }
      normalize(e) {
        return this.normalizers.reduce((e, t) => (t ? t.normalize(e) : e), e);
      }
    },
    Zr = class extends Xr {
      normalize(e) {
        const t = Rr(this.config.pattern ?? {});
        return null === t ? e : e.replaceAll(t, this.config.content ?? '');
      }
    },
    es = class extends Xr {
      constructor() {
        (super(...arguments), (this.form = 'NFC'));
      }
      normalize(e) {
        return e.normalize(this.form);
      }
    },
    ts = class extends es {
      constructor() {
        (super(...arguments), (this.form = 'NFC'));
      }
    },
    ns = class extends es {
      constructor() {
        (super(...arguments), (this.form = 'NFD'));
      }
    },
    rs = class extends es {
      constructor() {
        (super(...arguments), (this.form = 'NFKC'));
      }
    },
    ss = class extends es {
      constructor() {
        (super(...arguments), (this.form = 'NFKD'));
      }
    },
    as = class extends Xr {
      normalize(e) {
        return (
          this.config.strip_left && this.config.strip_right
            ? (e = e.trim())
            : (this.config.strip_left && (e = e.trimStart()),
              this.config.strip_right && (e = e.trimEnd())),
          e
        );
      }
    },
    os = class extends Xr {
      normalize(e) {
        return qr(e);
      }
    },
    is = class extends Xr {
      normalize(e) {
        return e.toLowerCase();
      }
    },
    ls = class extends Xr {
      normalize(e) {
        return this.config.prepend + e;
      }
    },
    cs = function (e) {
      if (null === e) return null;
      switch (e.type) {
        case 'BertNormalizer':
          return new Yr(e);
        case 'Precompiled':
          return new Jr(e);
        case 'Sequence':
          return new Kr(e);
        case 'Replace':
          return new Zr(e);
        case 'NFC':
          return new ts(e);
        case 'NFD':
          return new ns(e);
        case 'NFKC':
          return new rs(e);
        case 'NFKD':
          return new ss(e);
        case 'Strip':
          return new as(e);
        case 'StripAccents':
          return new os(e);
        case 'Lowercase':
          return new is(e);
        case 'Prepend':
          return new ls(e);
        default:
          throw new Error(`Unknown Normalizer type: ${e.type}`);
      }
    },
    us = class extends Qr {
      pre_tokenize(e, t) {
        return (
          Array.isArray(e)
            ? e.map(e => this.pre_tokenize_text(e, t))
            : this.pre_tokenize_text(e, t)
        ).flat();
      }
      _call(e, t) {
        return this.pre_tokenize(e, t);
      }
    },
    ds = class extends us {
      constructor(e) {
        (super(),
          (this.config = e),
          (this.add_prefix_space = this.config.add_prefix_space ?? !1),
          (this.trim_offsets = this.config.trim_offsets ?? !1),
          (this.use_regex = this.config.use_regex ?? !0),
          (this.pattern =
            /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu),
          (this.byte_encoder = Lr),
          (this.text_encoder = new TextEncoder()));
      }
      pre_tokenize_text(e, t) {
        return (
          this.add_prefix_space && !e.startsWith(' ') && (e = ' ' + e),
          (this.use_regex ? e.match(this.pattern) || [] : [e]).map(e =>
            Array.from(
              this.text_encoder.encode(e),
              e => this.byte_encoder[e]
            ).join('')
          )
        );
      }
    },
    ps = class extends us {
      pre_tokenize_text(e, t) {
        return e.match(/\w+|[^\w\s]+/g) || [];
      }
    },
    hs = class extends us {
      constructor(e) {
        (super(),
          (this.replacement = e.replacement ?? '▁'),
          (this.str_rep = e.str_rep || this.replacement),
          (this.prepend_scheme = e.prepend_scheme ?? 'always'));
      }
      pre_tokenize_text(e, t) {
        const { section_index: n } = t ?? {};
        let r = e.replaceAll(' ', this.str_rep);
        return (
          r.startsWith(this.replacement) ||
            ('always' !== this.prepend_scheme &&
              ('first' !== this.prepend_scheme || 0 !== n)) ||
            (r = this.str_rep + r),
          [r]
        );
      }
    },
    fs = class extends us {
      constructor(e) {
        (super(),
          (this.config = e),
          (this.pattern = Rr(
            this.config.pattern ?? {},
            this.config.invert ?? !0
          )));
      }
      pre_tokenize_text(e) {
        return null === this.pattern
          ? []
          : this.config.invert
            ? e.match(this.pattern) || []
            : 'removed' === this.config.behavior?.toLowerCase()
              ? e.split(this.pattern).filter(e => e)
              : ((e, t) => {
                  const n = [];
                  let r = 0;
                  for (const s of e.matchAll(t)) {
                    const t = s[0];
                    (r < s.index && n.push(e.slice(r, s.index)),
                      t.length > 0 && n.push(t),
                      (r = s.index + t.length));
                  }
                  return (r < e.length && n.push(e.slice(r)), n);
                })(e, this.pattern);
      }
    },
    _s = class extends us {
      constructor(e) {
        (super(),
          (this.config = e),
          (this.pattern = new RegExp(`[^${$r}]+|[${$r}]+`, 'gu')));
      }
      pre_tokenize_text(e) {
        return e.match(this.pattern) || [];
      }
    },
    ms = class extends us {
      constructor(e) {
        (super(), (this.config = e));
        const t = '[^\\d]+|\\d' + (this.config.individual_digits ? '' : '+');
        this.pattern = new RegExp(t, 'gu');
      }
      pre_tokenize_text(e) {
        return e.match(this.pattern) || [];
      }
    },
    gs = class extends us {
      constructor() {
        (super(), (this.pattern = new RegExp(`[^\\s${$r}]+|[${$r}]`, 'gu')));
      }
      pre_tokenize_text(e, t) {
        return e.trim().match(this.pattern) || [];
      }
    },
    ws = class extends us {
      constructor(e) {
        (super(),
          (this.config = e),
          (this.pattern = Rr(this.config.pattern ?? {})),
          (this.content = this.config.content ?? ''));
      }
      pre_tokenize_text(e) {
        return null === this.pattern
          ? [e]
          : [e.replaceAll(this.pattern, this.config.content ?? '')];
      }
    },
    ys = class extends us {
      constructor(e) {
        (super(), (this.tokenizers = (e.pretokenizers ?? []).map(e => xs(e))));
      }
      pre_tokenize_text(e, t) {
        return this.tokenizers.reduce(
          (e, n) => (n ? n.pre_tokenize(e, t) : e),
          [e]
        );
      }
    },
    bs = class extends us {
      pre_tokenize_text(e) {
        return (e => e.match(/\S+/g) || [])(e);
      }
    },
    vs = class extends us {
      constructor(e) {
        (super(), (this.config = e), (this._length = e.length));
      }
      pre_tokenize_text(e) {
        const t = [];
        for (let n = 0; n < e.length; n += this._length)
          t.push(e.slice(n, n + this._length));
        return t;
      }
    },
    xs = function (e) {
      if (null === e) return null;
      switch (e.type) {
        case 'BertPreTokenizer':
          return new gs();
        case 'Sequence':
          return new ys(e);
        case 'Whitespace':
          return new ps();
        case 'WhitespaceSplit':
          return new bs();
        case 'Metaspace':
          return new hs(e);
        case 'ByteLevel':
          return new ds(e);
        case 'Split':
          return new fs(e);
        case 'Punctuation':
          return new _s(e);
        case 'Digits':
          return new ms(e);
        case 'Replace':
          return new ws(e);
        case 'FixedLength':
          return new vs(e);
        default:
          throw new Error(`Unknown PreTokenizer type: ${e.type}`);
      }
    },
    Ms = class extends Qr {
      constructor(e) {
        (super(),
          (this.config = e),
          (this.vocab = []),
          (this.tokens_to_ids = new Map()),
          (this.unk_token_id = void 0),
          (this.unk_token = void 0),
          (this.end_of_word_suffix = void 0),
          (this.fuse_unk = this.config.fuse_unk ?? !1));
      }
      _call(e) {
        let t = this.encode(e);
        return (
          this.fuse_unk &&
            (t = ((e, t, n) => {
              const r = [];
              let s = 0;
              for (; s < e.length; )
                if ((r.push(e[s]), (t.get(e[s]) ?? n) === n))
                  for (; ++s < e.length && (t.get(e[s]) ?? n) === n; )
                    t.get(r.at(-1)) !== n && (r[r.length - 1] += e[s]);
                else ++s;
              return r;
            })(t, this.tokens_to_ids, this.unk_token_id)),
          t
        );
      }
    },
    ks = class extends Ms {
      constructor(e) {
        (super(e),
          (this.max_input_chars_per_word = 100),
          (this.tokens_to_ids = Wr(e.vocab)),
          (this.unk_token_id = this.tokens_to_ids.get(e.unk_token)),
          (this.unk_token = e.unk_token),
          (this.max_input_chars_per_word = e.max_input_chars_per_word ?? 100),
          (this.vocab = new Array(this.tokens_to_ids.size)));
        for (const [e, t] of this.tokens_to_ids) this.vocab[t] = e;
      }
      encode(e) {
        const t = [];
        for (const n of e) {
          const e = [...n];
          if (e.length > this.max_input_chars_per_word) {
            t.push(this.unk_token);
            continue;
          }
          let r = !1,
            s = 0;
          const a = [];
          for (; s < e.length; ) {
            let t = e.length,
              n = null;
            for (; s < t; ) {
              let r = e.slice(s, t).join('');
              if (
                (s > 0 && (r = this.config.continuing_subword_prefix + r),
                this.tokens_to_ids.has(r))
              ) {
                n = r;
                break;
              }
              --t;
            }
            if (null === n) {
              r = !0;
              break;
            }
            (a.push(n), (s = t));
          }
          r ? t.push(this.unk_token) : t.push(...a);
        }
        return t;
      }
    },
    Es = class e {
      constructor(e, t) {
        ((this.is_leaf = e), (this.children = t));
      }
      static default() {
        return new e(!1, new Map());
      }
    },
    As = class {
      constructor() {
        this.root = Es.default();
      }
      extend(e) {
        for (const t of e) this.push(t);
      }
      push(e) {
        let t = this.root;
        for (const n of e) {
          let e = t.children.get(n);
          (void 0 === e && ((e = Es.default()), t.children.set(n, e)), (t = e));
        }
        t.is_leaf = !0;
      }
      *common_prefix_search(e) {
        let t = this.root;
        if (void 0 === t) return;
        let n = '';
        for (const r of e) {
          if (((n += r), (t = t.children.get(r)), void 0 === t)) return;
          t.is_leaf && (yield n);
        }
      }
    },
    Ts = class e {
      constructor(e, t, n, r, s) {
        ((this.token_id = e),
          (this.node_id = t),
          (this.pos = n),
          (this.length = r),
          (this.score = s),
          (this.prev = null),
          (this.backtrace_score = 0));
      }
      clone() {
        const t = new e(
          this.token_id,
          this.node_id,
          this.pos,
          this.length,
          this.score
        );
        return (
          (t.prev = this.prev),
          (t.backtrace_score = this.backtrace_score),
          t
        );
      }
    },
    Cs = class {
      constructor(e, t, n) {
        ((this.chars = Array.from(e)),
          (this.len = this.chars.length),
          (this.bos_token_id = t),
          (this.eos_token_id = n),
          (this.nodes = []),
          (this.begin_nodes = Array.from({ length: this.len + 1 }, () => [])),
          (this.end_nodes = Array.from({ length: this.len + 1 }, () => [])));
        const r = new Ts(this.bos_token_id ?? 0, 0, 0, 0, 0),
          s = new Ts(this.eos_token_id ?? 0, 1, this.len, 0, 0);
        (this.nodes.push(r.clone()),
          this.nodes.push(s.clone()),
          this.begin_nodes[this.len].push(s),
          this.end_nodes[0].push(r));
      }
      insert(e, t, n, r) {
        const s = this.nodes.length,
          a = new Ts(r, s, e, t, n);
        (this.begin_nodes[e].push(a),
          this.end_nodes[e + t].push(a),
          this.nodes.push(a));
      }
      viterbi() {
        const e = this.len;
        let t = 0;
        for (; t <= e; ) {
          if (0 == this.begin_nodes[t].length) return [];
          for (let e of this.begin_nodes[t]) {
            e.prev = null;
            let n = 0,
              r = null;
            for (let s of this.end_nodes[t]) {
              const t = s.backtrace_score + e.score;
              (null === r || t > n) && ((r = s.clone()), (n = t));
            }
            if (null === r) return [];
            ((e.prev = r), (e.backtrace_score = n));
          }
          ++t;
        }
        const n = [],
          r = this.begin_nodes[e][0].prev;
        if (null === r) return [];
        let s = r.clone();
        for (; null !== s.prev; ) {
          n.push(s.clone());
          const e = s.clone();
          s = e.prev.clone();
        }
        return (n.reverse(), n);
      }
      piece(e) {
        return this.chars.slice(e.pos, e.pos + e.length).join('');
      }
      tokens() {
        return this.viterbi().map(e => this.piece(e));
      }
      token_ids() {
        return this.viterbi().map(e => e.token_id);
      }
    },
    Ss = class extends Ms {
      constructor(e, t) {
        super(e);
        const n = e.vocab.length;
        ((this.vocab = new Array(n)), (this.scores = new Array(n)));
        for (let t = 0; t < n; ++t)
          [this.vocab[t], this.scores[t]] = e.vocab[t];
        ((this.unk_token_id = e.unk_id),
          (this.unk_token = this.vocab[e.unk_id]),
          (this.tokens_to_ids = new Map(this.vocab.map((e, t) => [e, t]))),
          (this.bos_token = ' '),
          (this.bos_token_id = this.tokens_to_ids.get(this.bos_token)),
          (this.eos_token = t),
          (this.eos_token_id = this.tokens_to_ids.get(this.eos_token)),
          (this.unk_token = this.vocab[this.unk_token_id]),
          (this.min_score = (function (e) {
            if (0 === e.length) throw new Error('Array must not be empty');
            let t = e[0],
              n = 0;
            for (let r = 1; r < e.length; ++r)
              e[r] < t && ((t = e[r]), (n = r));
            return [t, n];
          })(this.scores)[0]),
          (this.unk_score = this.min_score - 10),
          (this.scores[this.unk_token_id] = this.unk_score),
          (this.trie = new As()),
          this.trie.extend(this.vocab),
          (this.fuse_unk = !0));
      }
      populate_nodes(e) {
        const t = e.chars;
        let n = 0;
        for (; n < t.length; ) {
          let r = !1;
          const s = [],
            a = t.slice(n).join(''),
            o = this.trie.common_prefix_search(a);
          for (const t of o) {
            s.push(t);
            const a = this.tokens_to_ids.get(t),
              o = this.scores[a],
              i = Vr(t);
            (e.insert(n, i, o, a), r || 1 !== i || (r = !0));
          }
          (r || e.insert(n, 1, this.unk_score, this.unk_token_id), (n += 1));
        }
      }
      tokenize(e) {
        const t = new Cs(e, this.bos_token_id, this.eos_token_id);
        return (this.populate_nodes(t), t.tokens());
      }
      encode(e) {
        const t = [];
        for (const n of e) {
          const e = this.tokenize(n);
          t.push(...e);
        }
        return t;
      }
    },
    Ps = class {
      constructor(e = (e, t) => e > t, t = 1 / 0) {
        ((this._heap = []), (this._comparator = e), (this._max_size = t));
      }
      get size() {
        return this._heap.length;
      }
      is_empty() {
        return 0 === this.size;
      }
      peek() {
        return this._heap[0];
      }
      push(...e) {
        return this.extend(e);
      }
      extend(e) {
        for (const t of e)
          if (this.size < this._max_size) (this._heap.push(t), this._sift_up());
          else {
            const e = this._smallest();
            this._comparator(t, this._heap[e]) &&
              ((this._heap[e] = t), this._sift_up_from(e));
          }
        return this.size;
      }
      pop() {
        const e = this.peek(),
          t = this.size - 1;
        return (
          t > 0 && this._swap(0, t),
          this._heap.pop(),
          this._sift_down(),
          e
        );
      }
      replace(e) {
        const t = this.peek();
        return ((this._heap[0] = e), this._sift_down(), t);
      }
      _parent(e) {
        return ((e + 1) >>> 1) - 1;
      }
      _left(e) {
        return 1 + (e << 1);
      }
      _right(e) {
        return (e + 1) << 1;
      }
      _greater(e, t) {
        return this._comparator(this._heap[e], this._heap[t]);
      }
      _swap(e, t) {
        const n = this._heap[e];
        ((this._heap[e] = this._heap[t]), (this._heap[t] = n));
      }
      _sift_up() {
        this._sift_up_from(this.size - 1);
      }
      _sift_up_from(e) {
        for (; e > 0 && this._greater(e, this._parent(e)); )
          (this._swap(e, this._parent(e)), (e = this._parent(e)));
      }
      _sift_down() {
        let e = 0;
        for (
          ;
          (this._left(e) < this.size && this._greater(this._left(e), e)) ||
          (this._right(e) < this.size && this._greater(this._right(e), e));

        ) {
          const t =
            this._right(e) < this.size &&
            this._greater(this._right(e), this._left(e))
              ? this._right(e)
              : this._left(e);
          (this._swap(e, t), (e = t));
        }
      }
      _smallest() {
        return 2 ** Math.floor(Math.log2(this.size)) - 1;
      }
    },
    Fs = class {
      constructor(e) {
        ((this.capacity = e), (this.cache = new Map()));
      }
      get(e) {
        if (!this.cache.has(e)) return;
        const t = this.cache.get(e);
        return (this.cache.delete(e), this.cache.set(e, t), t);
      }
      put(e, t) {
        (this.cache.has(e) && this.cache.delete(e),
          this.cache.set(e, t),
          this.cache.size > this.capacity &&
            this.cache.delete(this.cache.keys().next().value));
      }
      clear() {
        this.cache.clear();
      }
    },
    Is = class extends Ms {
      constructor(e) {
        (super(e),
          (this.tokens_to_ids = Wr(e.vocab)),
          (this.unk_token_id = this.tokens_to_ids.get(e.unk_token)),
          (this.unk_token = e.unk_token),
          (this.vocab = new Array(this.tokens_to_ids.size)));
        for (const [e, t] of this.tokens_to_ids) this.vocab[t] = e;
        const t = Array.isArray(e.merges[0]);
        ((this.merges = t ? e.merges : e.merges.map(e => e.split(' ', 2))),
          (this.bpe_ranks = new Map(
            this.merges.map((e, t) => [JSON.stringify(e), t])
          )),
          (this.end_of_word_suffix = e.end_of_word_suffix),
          (this.continuing_subword_suffix =
            e.continuing_subword_suffix ?? null),
          (this.byte_fallback = this.config.byte_fallback ?? !1),
          this.byte_fallback && (this.text_encoder = new TextEncoder()),
          (this.ignore_merges = this.config.ignore_merges ?? !1),
          (this.max_length_to_cache = 256),
          (this.cache_capacity = 1e4),
          (this.cache = new Fs(this.cache_capacity)));
      }
      clear_cache() {
        this.cache.clear();
      }
      bpe(e) {
        if (0 === e.length) return [];
        const t = this.cache.get(e);
        if (void 0 !== t) return t;
        const n = Array.from(e);
        this.end_of_word_suffix && (n[n.length - 1] += this.end_of_word_suffix);
        let r = [];
        if (n.length > 1) {
          const e = new Ps((e, t) => e.score < t.score);
          let t = { token: n[0], bias: 0, prev: null, next: null },
            s = t;
          for (let t = 1; t < n.length; ++t) {
            const r = { bias: t / n.length, token: n[t], prev: s, next: null };
            ((s.next = r), this.add_node(e, s), (s = r));
          }
          for (; !e.is_empty(); ) {
            const n = e.pop();
            if (n.deleted || !n.next || n.next.deleted) continue;
            if (((n.deleted = !0), (n.next.deleted = !0), n.prev)) {
              const e = { ...n.prev };
              ((n.prev.deleted = !0),
                (n.prev = e),
                e.prev ? (e.prev.next = e) : (t = e));
            }
            const r = {
              token: n.token + n.next.token,
              bias: n.bias,
              prev: n.prev,
              next: n.next.next,
            };
            (r.prev ? ((r.prev.next = r), this.add_node(e, r.prev)) : (t = r),
              r.next && ((r.next.prev = r), this.add_node(e, r)));
          }
          for (let e = t; null !== e; e = e.next) r.push(e.token);
        } else r = n;
        if (this.continuing_subword_suffix)
          for (let e = 0; e < r.length - 1; ++e)
            r[e] += this.continuing_subword_suffix;
        return (e.length < this.max_length_to_cache && this.cache.put(e, r), r);
      }
      add_node(e, t) {
        const n = this.bpe_ranks.get(JSON.stringify([t.token, t.next.token]));
        void 0 !== n && ((t.score = n + t.bias), e.push(t));
      }
      encode(e) {
        const t = [];
        for (const n of e) {
          if (this.ignore_merges && this.tokens_to_ids.has(n)) {
            t.push(n);
            continue;
          }
          const e = this.bpe(n);
          for (const n of e)
            if (this.tokens_to_ids.has(n)) t.push(n);
            else if (this.byte_fallback) {
              const e = Array.from(this.text_encoder.encode(n)).map(
                e => `<0x${e.toString(16).toUpperCase().padStart(2, '0')}>`
              );
              e.every(e => this.tokens_to_ids.has(e))
                ? t.push(...e)
                : t.push(this.unk_token);
            } else t.push(this.unk_token);
        }
        return t;
      }
    },
    Os = class extends Ms {
      constructor(e, t) {
        super(e);
        const n = e.vocab;
        ((this.tokens_to_ids = Wr(t.target_lang ? n[t.target_lang] : n)),
          (this.bos_token = t.bos_token),
          (this.bos_token_id = this.tokens_to_ids.get(this.bos_token)),
          (this.eos_token = t.eos_token),
          (this.eos_token_id = this.tokens_to_ids.get(this.eos_token)),
          (this.pad_token = t.pad_token),
          (this.pad_token_id = this.tokens_to_ids.get(this.pad_token)),
          (this.unk_token = t.unk_token),
          (this.unk_token_id = this.tokens_to_ids.get(this.unk_token)),
          (this.vocab = new Array(this.tokens_to_ids.size)));
        for (const [e, t] of this.tokens_to_ids) this.vocab[t] = e;
      }
      encode(e) {
        return e;
      }
    },
    Ls = class extends Qr {
      constructor(e) {
        (super(), (this.config = e));
      }
      _call(e, ...t) {
        return this.post_process(e, ...t);
      }
    },
    zs = class extends Ls {
      post_process(e, t = null, n = !0) {
        const r = null === t ? this.config.single : this.config.pair;
        let s = [],
          a = [];
        for (const o of r)
          'SpecialToken' in o
            ? n && (s.push(o.SpecialToken.id), a.push(o.SpecialToken.type_id))
            : 'Sequence' in o &&
              ('A' === o.Sequence.id
                ? ((s = jr(s, e)),
                  (a = jr(a, new Array(e.length).fill(o.Sequence.type_id))))
                : 'B' === o.Sequence.id &&
                  ((s = jr(s, t)),
                  (a = jr(a, new Array(t.length).fill(o.Sequence.type_id)))));
        return { tokens: s, token_type_ids: a };
      }
    },
    Ns = class extends Ls {
      post_process(e, t = null) {
        return { tokens: e, tokens_pair: t };
      }
    },
    Bs = class extends Ls {
      constructor(e) {
        (super(e), (this.sep = e.sep), (this.cls = e.cls));
      }
      post_process(e, t = null, n = !0) {
        n && (e = jr([this.cls[0]], e, [this.sep[0]]));
        let r = new Array(e.length).fill(0);
        if (t) {
          const s = [],
            a = n ? [this.sep[0]] : [];
          ((e = jr(e, s, t, a)),
            (r = jr(r, new Array(t.length + s.length + a.length).fill(1))));
        }
        return { tokens: e, token_type_ids: r };
      }
    },
    $s = class extends Ls {
      constructor(e) {
        (super(e), (this.sep = e.sep), (this.cls = e.cls));
      }
      post_process(e, t, n = !0) {
        n && (e = jr([this.cls[0]], e, [this.sep[0]]));
        let r = new Array(e.length).fill(0);
        if (t) {
          const s = n ? [this.sep[0]] : [],
            a = n ? [this.sep[0]] : [];
          ((e = jr(e, s, t, a)),
            (r = jr(r, new Array(t.length + s.length + a.length).fill(1))));
        }
        return { tokens: e, token_type_ids: r };
      }
    },
    Ds = class extends Ls {
      constructor(e) {
        (super(e), (this.processors = (e.processors ?? []).map(e => Rs(e))));
      }
      post_process(e, t = null, n = !0) {
        let r = { tokens: e, tokens_pair: t };
        for (const e of this.processors)
          r = e.post_process(r.tokens, r.tokens_pair, n);
        return r;
      }
    },
    Rs = function (e) {
      if (null === e) return null;
      switch (e.type) {
        case 'TemplateProcessing':
          return new zs(e);
        case 'ByteLevel':
          return new Ns(e);
        case 'BertProcessing':
          return new Bs(e);
        case 'RobertaProcessing':
          return new $s(e);
        case 'Sequence':
          return new Ds(e);
        default:
          throw new Error(`Unknown PostProcessor type: ${e.type}`);
      }
    },
    Us = class extends Qr {
      constructor(e) {
        (super(),
          (this.config = e),
          (this.added_tokens = []),
          (this.end_of_word_suffix = null),
          (this.trim_offsets = 'trim_offsets' in e && e.trim_offsets));
      }
      _call(e) {
        return this.decode(e);
      }
      decode(e) {
        return this.decode_chain(e).join('');
      }
    },
    Gs = class extends Us {
      constructor(e) {
        (super(e),
          (this.byte_decoder = zr),
          (this.text_decoder = new TextDecoder('utf-8', {
            fatal: !1,
            ignoreBOM: !0,
          })),
          (this.end_of_word_suffix = null));
      }
      convert_tokens_to_string(e) {
        const t = e.join(''),
          n = new Uint8Array([...t].map(e => this.byte_decoder[e]));
        return this.text_decoder.decode(n);
      }
      decode_chain(e) {
        const t = [];
        let n = [];
        for (const r of e)
          void 0 !== this.added_tokens.find(e => e.content === r)
            ? (n.length > 0 &&
                (t.push(this.convert_tokens_to_string(n)), (n = [])),
              t.push(r))
            : n.push(r);
        return (n.length > 0 && t.push(this.convert_tokens_to_string(n)), t);
      }
    },
    Vs = class extends Us {
      constructor(e) {
        (super(e), (this.cleanup = e.cleanup));
      }
      decode_chain(e) {
        return e.map((e, t) => {
          if (0 !== t) {
            const t = this.config.prefix;
            e = t && e.startsWith(t) ? e.replace(t, '') : ' ' + e;
          }
          return (this.cleanup && (e = Dr(e)), e);
        });
      }
    },
    js = class extends Us {
      constructor(e) {
        (super(e), (this.replacement = e.replacement ?? '▁'));
      }
      decode_chain(e) {
        const t = [];
        for (let n = 0; n < e.length; ++n) {
          let r = e[n].replaceAll(this.replacement, ' ');
          (0 == n && r.startsWith(' ') && (r = r.substring(1)), t.push(r));
        }
        return t;
      }
    },
    Ws = class extends Us {
      constructor(e) {
        (super(e), (this.suffix = e.suffix ?? ''));
      }
      decode_chain(e) {
        return e.map((t, n) =>
          t.replaceAll(this.suffix, n === e.length - 1 ? '' : ' ')
        );
      }
    },
    qs = class extends Us {
      constructor(e) {
        (super(e),
          (this.pad_token = e.pad_token ?? ''),
          (this.word_delimiter_token = e.word_delimiter_token ?? ''),
          (this.cleanup = e.cleanup));
      }
      convert_tokens_to_string(e) {
        if (0 === e.length) return '';
        const t = [e[0]];
        for (let n = 1; n < e.length; ++n) e[n] !== t.at(-1) && t.push(e[n]);
        let n = t.filter(e => e !== this.pad_token).join('');
        return (
          this.cleanup &&
            (n = Dr(n).replaceAll(this.word_delimiter_token, ' ').trim()),
          n
        );
      }
      decode_chain(e) {
        return [this.convert_tokens_to_string(e)];
      }
    },
    Hs = class extends Us {
      constructor(e) {
        (super(e), (this.decoders = (e.decoders ?? []).map(e => Ks(e))));
      }
      decode_chain(e) {
        return this.decoders.reduce((e, t) => t.decode_chain(e), e);
      }
    },
    Qs = class extends Us {
      decode_chain(e) {
        const t = Rr(this.config.pattern),
          n = this.config.content ?? '';
        return null === t ? e : e.map(e => e.replaceAll(t, n));
      }
    },
    Xs = class extends Us {
      decode_chain(e) {
        return [e.join('')];
      }
    },
    Ys = class extends Us {
      constructor(e) {
        (super(e),
          (this.content = e.content ?? ''),
          (this.start = e.start ?? 0),
          (this.stop = e.stop ?? 0));
      }
      decode_chain(e) {
        return e.map(e => {
          let t = 0;
          for (let n = 0; n < this.start && e[n] === this.content; ++n)
            t = n + 1;
          let n = e.length;
          for (let t = 0; t < this.stop; ++t) {
            const r = e.length - t - 1;
            if (e[r] !== this.content) break;
            n = r;
          }
          return e.slice(t, n);
        });
      }
    },
    Js = class extends Us {
      constructor(e) {
        (super(e), (this.text_decoder = new TextDecoder()));
      }
      decode_chain(e) {
        const t = [];
        let n = [];
        for (const r of e) {
          let e = null;
          if (6 === r.length && r.startsWith('<0x') && r.endsWith('>')) {
            const t = parseInt(r.slice(3, 5), 16);
            isNaN(t) || (e = t);
          }
          if (null !== e) n.push(e);
          else {
            if (n.length > 0) {
              const e = this.text_decoder.decode(Uint8Array.from(n));
              (t.push(e), (n = []));
            }
            t.push(r);
          }
        }
        if (n.length > 0) {
          const e = this.text_decoder.decode(Uint8Array.from(n));
          (t.push(e), (n = []));
        }
        return t;
      }
    },
    Ks = function (e) {
      if (null === e) return null;
      switch (e.type) {
        case 'ByteLevel':
          return new Gs(e);
        case 'WordPiece':
          return new Vs(e);
        case 'Metaspace':
          return new js(e);
        case 'BPEDecoder':
          return new Ws(e);
        case 'CTC':
          return new qs(e);
        case 'Sequence':
          return new Hs(e);
        case 'Replace':
          return new Qs(e);
        case 'Fuse':
          return new Xs(e);
        case 'Strip':
          return new Ys(e);
        case 'ByteFallback':
          return new Js(e);
        default:
          throw new Error(`Unknown Decoder type: ${e.type}`);
      }
    },
    Zs = class {
      constructor(e, t) {
        const n = Hr(e, 'Tokenizer', [
          'model',
          'decoder',
          'post_processor',
          'pre_tokenizer',
          'normalizer',
        ]);
        if (n) throw new Error(n);
        const r = Hr(t, 'Config');
        if (r) throw new Error(r);
        ((this.tokenizer = e),
          (this.config = t),
          (this.normalizer = cs(this.tokenizer.normalizer)),
          (this.pre_tokenizer = xs(this.tokenizer.pre_tokenizer)),
          (this.model = (function (e, t) {
            switch (e.type) {
              case 'WordPiece':
                return new ks(e);
              case 'Unigram':
                return new Ss(e, t.eos_token);
              case 'BPE':
                return new Is(e);
              default:
                if (e.vocab)
                  return Array.isArray(e.vocab)
                    ? new Ss(e, t.eos_token)
                    : Object.hasOwn(e, 'continuing_subword_prefix') &&
                        Object.hasOwn(e, 'unk_token')
                      ? Object.hasOwn(e, 'merges')
                        ? new Is(e)
                        : new ks(e)
                      : new Os(e, {
                          target_lang: t.target_lang,
                          bos_token: t.bos_token,
                          eos_token: t.eos_token,
                          pad_token: t.pad_token,
                          unk_token: t.unk_token,
                        });
                throw new Error(`Unknown TokenizerModel type: ${e?.type}`);
            }
          })(this.tokenizer.model, this.config)),
          (this.post_processor = Rs(this.tokenizer.post_processor)),
          (this.decoder = Ks(this.tokenizer.decoder)),
          (this.special_tokens = []),
          (this.all_special_ids = []),
          (this.added_tokens = []));
        const s = [],
          a = [];
        this.added_tokens_map = new Map();
        for (const e of this.tokenizer.added_tokens) {
          const t = new Or(e);
          if (
            (this.added_tokens.push(t),
            this.model.tokens_to_ids.set(t.content, t.id),
            (this.model.vocab[t.id] = t.content),
            t.special &&
              (this.special_tokens.push(t.content),
              this.all_special_ids.push(t.id)),
            this.added_tokens_map.set(t.content, t),
            t.normalized && null !== this.normalizer)
          ) {
            const e = this.normalizer(t.content);
            (a.push(e), this.added_tokens_map.set(e, t));
          } else s.push(t.content);
        }
        ((this.config.additional_special_tokens ?? []).forEach(e => {
          this.special_tokens.includes(e) || this.special_tokens.push(e);
        }),
          this.decoder &&
            ((this.decoder.added_tokens = this.added_tokens),
            (this.decoder.end_of_word_suffix = this.model.end_of_word_suffix)),
          (this.splitter_unnormalized = new Ir(s)),
          (this.splitter_normalized = new Ir(a)),
          (this.remove_space = this.config.remove_space),
          (this.clean_up_tokenization_spaces =
            this.config.clean_up_tokenization_spaces ?? !0),
          (this.do_lowercase_and_remove_accent =
            this.config.do_lowercase_and_remove_accent ?? !1));
      }
      encode(
        e,
        {
          text_pair: t = null,
          add_special_tokens: n = !0,
          return_token_type_ids: r = null,
        } = {}
      ) {
        const { tokens: s, token_type_ids: a } = this.tokenize_helper(e, {
            text_pair: t,
            add_special_tokens: n,
          }),
          o = s.map(
            e =>
              this.added_tokens_map.get(e)?.id ??
              this.model.tokens_to_ids.get(e) ??
              this.model.unk_token_id
          ),
          i = {
            ids: o,
            tokens: s,
            attention_mask: new Array(o.length).fill(1),
          };
        return (r && a && (i.token_type_ids = a), i);
      }
      decode(e, t = {}) {
        if (
          !Array.isArray(e) ||
          0 === e.length ||
          ((n = e[0]), !Number.isInteger(n) && 'bigint' != typeof n)
        )
          throw Error('token_ids must be a non-empty array of integers.');
        var n;
        let r = e.map(e => this.model.vocab[Number(e)] ?? this.model.unk_token);
        t.skip_special_tokens &&
          (r = r.filter(e => !this.special_tokens.includes(e)));
        let s = this.decoder ? this.decoder(r) : r.join(' ');
        return (
          this.decoder &&
            this.decoder.end_of_word_suffix &&
            ((s = s.replaceAll(this.decoder.end_of_word_suffix, ' ')),
            t.skip_special_tokens && (s = s.trim())),
          (t.clean_up_tokenization_spaces ??
            this.clean_up_tokenization_spaces) &&
            (s = Dr(s)),
          s
        );
      }
      tokenize(e, { text_pair: t = null, add_special_tokens: n = !1 } = {}) {
        return this.tokenize_helper(e, { text_pair: t, add_special_tokens: n })
          .tokens;
      }
      encode_text(e) {
        if (null === e) return null;
        const t = this.splitter_unnormalized.split(e);
        return (
          t.forEach((e, n) => {
            const r = this.added_tokens_map.get(e);
            r &&
              (r.lstrip && n > 0 && (t[n - 1] = t[n - 1].trimEnd()),
              r.rstrip &&
                n < t.length - 1 &&
                (t[n + 1] = t[n + 1].trimStart()));
          }),
          t.flatMap((e, t) => {
            if (0 === e.length) return [];
            if (this.added_tokens_map.has(e)) return [e];
            if (
              (!0 === this.remove_space &&
                (e = e.trim().split(/\s+/).join(' ')),
              this.do_lowercase_and_remove_accent &&
                (e = (e => qr(e.toLowerCase()))(e)),
              null !== this.normalizer && (e = this.normalizer(e)),
              0 === e.length)
            )
              return [];
            const n = this.splitter_normalized.split(e);
            return (
              n.forEach((e, t) => {
                const r = this.added_tokens_map.get(e);
                r &&
                  (r.lstrip && t > 0 && (n[t - 1] = n[t - 1].trimEnd()),
                  r.rstrip &&
                    t < n.length - 1 &&
                    (n[t + 1] = n[t + 1].trimStart()));
              }),
              n.flatMap(e => {
                if (0 === e.length) return [];
                if (this.added_tokens_map.has(e)) return [e];
                const n =
                  null !== this.pre_tokenizer
                    ? this.pre_tokenizer(e, { section_index: t })
                    : [e];
                return this.model(n);
              })
            );
          })
        );
      }
      tokenize_helper(e, { text_pair: t = null, add_special_tokens: n = !0 }) {
        const r = this.encode_text(e),
          s = this.encode_text(t || null);
        return this.post_processor
          ? this.post_processor(r, s, n)
          : { tokens: jr(r ?? [], s ?? []) };
      }
      token_to_id(e) {
        return this.model.tokens_to_ids.get(e);
      }
      id_to_token(e) {
        return this.model.vocab[e];
      }
      get_added_tokens_decoder() {
        const e = new Map();
        for (const t of this.added_tokens) e.set(t.id, t);
        return e;
      }
      get_vocab(e = !0) {
        const t = new Map();
        for (let n = 0; n < this.model.vocab.length; ++n) {
          const r = this.model.vocab[n];
          (!e && this.added_tokens_map.has(r)) || t.set(r, n);
        }
        return t;
      }
    },
    ea = Object.freeze({
      Text: 'Text',
      NumericLiteral: 'NumericLiteral',
      StringLiteral: 'StringLiteral',
      Identifier: 'Identifier',
      Equals: 'Equals',
      OpenParen: 'OpenParen',
      CloseParen: 'CloseParen',
      OpenStatement: 'OpenStatement',
      CloseStatement: 'CloseStatement',
      OpenExpression: 'OpenExpression',
      CloseExpression: 'CloseExpression',
      OpenSquareBracket: 'OpenSquareBracket',
      CloseSquareBracket: 'CloseSquareBracket',
      OpenCurlyBracket: 'OpenCurlyBracket',
      CloseCurlyBracket: 'CloseCurlyBracket',
      Comma: 'Comma',
      Dot: 'Dot',
      Colon: 'Colon',
      Pipe: 'Pipe',
      CallOperator: 'CallOperator',
      AdditiveBinaryOperator: 'AdditiveBinaryOperator',
      MultiplicativeBinaryOperator: 'MultiplicativeBinaryOperator',
      ComparisonBinaryOperator: 'ComparisonBinaryOperator',
      UnaryOperator: 'UnaryOperator',
      Comment: 'Comment',
    }),
    ta = class {
      constructor(e, t) {
        ((this.value = e), (this.type = t));
      }
    };
  function na(e) {
    return /\w/.test(e);
  }
  function ra(e) {
    return /[0-9]/.test(e);
  }
  function sa(e) {
    return /\s/.test(e);
  }
  var aa = [
      ['{%', ea.OpenStatement],
      ['%}', ea.CloseStatement],
      ['{{', ea.OpenExpression],
      ['}}', ea.CloseExpression],
      ['(', ea.OpenParen],
      [')', ea.CloseParen],
      ['{', ea.OpenCurlyBracket],
      ['}', ea.CloseCurlyBracket],
      ['[', ea.OpenSquareBracket],
      [']', ea.CloseSquareBracket],
      [',', ea.Comma],
      ['.', ea.Dot],
      [':', ea.Colon],
      ['|', ea.Pipe],
      ['<=', ea.ComparisonBinaryOperator],
      ['>=', ea.ComparisonBinaryOperator],
      ['==', ea.ComparisonBinaryOperator],
      ['!=', ea.ComparisonBinaryOperator],
      ['<', ea.ComparisonBinaryOperator],
      ['>', ea.ComparisonBinaryOperator],
      ['+', ea.AdditiveBinaryOperator],
      ['-', ea.AdditiveBinaryOperator],
      ['~', ea.AdditiveBinaryOperator],
      ['*', ea.MultiplicativeBinaryOperator],
      ['/', ea.MultiplicativeBinaryOperator],
      ['%', ea.MultiplicativeBinaryOperator],
      ['=', ea.Equals],
    ],
    oa = new Map([
      ['n', '\n'],
      ['t', '\t'],
      ['r', '\r'],
      ['b', '\b'],
      ['f', '\f'],
      ['v', '\v'],
      ["'", "'"],
      ['"', '"'],
      ['\\', '\\'],
    ]),
    ia = class {
      type = 'Statement';
    },
    la = class extends ia {
      constructor(e) {
        (super(), (this.body = e));
      }
      type = 'Program';
    },
    ca = class extends ia {
      constructor(e, t, n) {
        (super(), (this.test = e), (this.body = t), (this.alternate = n));
      }
      type = 'If';
    },
    ua = class extends ia {
      constructor(e, t, n, r) {
        (super(),
          (this.loopvar = e),
          (this.iterable = t),
          (this.body = n),
          (this.defaultBlock = r));
      }
      type = 'For';
    },
    da = class extends ia {
      type = 'Break';
    },
    pa = class extends ia {
      type = 'Continue';
    },
    ha = class extends ia {
      constructor(e, t, n) {
        (super(), (this.assignee = e), (this.value = t), (this.body = n));
      }
      type = 'Set';
    },
    fa = class extends ia {
      constructor(e, t, n) {
        (super(), (this.name = e), (this.args = t), (this.body = n));
      }
      type = 'Macro';
    },
    _a = class extends ia {
      constructor(e) {
        (super(), (this.value = e));
      }
      type = 'Comment';
    },
    ma = class extends ia {
      type = 'Expression';
    },
    ga = class extends ma {
      constructor(e, t, n) {
        (super(), (this.object = e), (this.property = t), (this.computed = n));
      }
      type = 'MemberExpression';
    },
    wa = class extends ma {
      constructor(e, t) {
        (super(), (this.callee = e), (this.args = t));
      }
      type = 'CallExpression';
    },
    ya = class extends ma {
      constructor(e) {
        (super(), (this.value = e));
      }
      type = 'Identifier';
    },
    ba = class extends ma {
      constructor(e) {
        (super(), (this.value = e));
      }
      type = 'Literal';
    },
    va = class extends ba {
      type = 'IntegerLiteral';
    },
    xa = class extends ba {
      type = 'FloatLiteral';
    },
    Ma = class extends ba {
      type = 'StringLiteral';
    },
    ka = class extends ba {
      type = 'ArrayLiteral';
    },
    Ea = class extends ba {
      type = 'TupleLiteral';
    },
    Aa = class extends ba {
      type = 'ObjectLiteral';
    },
    Ta = class extends ma {
      constructor(e, t, n) {
        (super(), (this.operator = e), (this.left = t), (this.right = n));
      }
      type = 'BinaryExpression';
    },
    Ca = class extends ma {
      constructor(e, t) {
        (super(), (this.operand = e), (this.filter = t));
      }
      type = 'FilterExpression';
    },
    Sa = class extends ia {
      constructor(e, t) {
        (super(), (this.filter = e), (this.body = t));
      }
      type = 'FilterStatement';
    },
    Pa = class extends ma {
      constructor(e, t) {
        (super(), (this.lhs = e), (this.test = t));
      }
      type = 'SelectExpression';
    },
    Fa = class extends ma {
      constructor(e, t, n) {
        (super(), (this.operand = e), (this.negate = t), (this.test = n));
      }
      type = 'TestExpression';
    },
    Ia = class extends ma {
      constructor(e, t) {
        (super(), (this.operator = e), (this.argument = t));
      }
      type = 'UnaryExpression';
    },
    Oa = class extends ma {
      constructor(e = void 0, t = void 0, n = void 0) {
        (super(), (this.start = e), (this.stop = t), (this.step = n));
      }
      type = 'SliceExpression';
    },
    La = class extends ma {
      constructor(e, t) {
        (super(), (this.key = e), (this.value = t));
      }
      type = 'KeywordArgumentExpression';
    },
    za = class extends ma {
      constructor(e) {
        (super(), (this.argument = e));
      }
      type = 'SpreadExpression';
    },
    Na = class extends ia {
      constructor(e, t, n) {
        (super(), (this.call = e), (this.callerArgs = t), (this.body = n));
      }
      type = 'CallStatement';
    },
    Ba = class extends ma {
      constructor(e, t, n) {
        (super(),
          (this.condition = e),
          (this.trueExpr = t),
          (this.falseExpr = n));
      }
      type = 'Ternary';
    };
  function $a(e) {
    const t = new la([]);
    let n = 0;
    function r(t, r) {
      const s = e[n++];
      if (!s || s.type !== t)
        throw new Error(`Parser Error: ${r}. ${s.type} !== ${t}.`);
      return s;
    }
    function s(e) {
      if (!l(e)) throw new SyntaxError(`Expected ${e}`);
      ++n;
    }
    function a() {
      switch (e[n].type) {
        case ea.Comment:
          return new _a(e[n++].value);
        case ea.Text:
          return new Ma(r(ea.Text, 'Expected text token').value);
        case ea.OpenStatement:
          return (function () {
            if (
              (r(ea.OpenStatement, 'Expected opening statement token'),
              e[n].type !== ea.Identifier)
            )
              throw new SyntaxError(`Unknown statement, got ${e[n].type}`);
            const t = e[n].value;
            let p;
            switch (t) {
              case 'set':
                (++n,
                  (p = (function () {
                    const e = u();
                    let t = null;
                    const l = [];
                    if (o(ea.Equals)) (++n, (t = u()));
                    else {
                      for (
                        r(ea.CloseStatement, 'Expected %} token');
                        !i('endset');

                      )
                        l.push(a());
                      (r(ea.OpenStatement, 'Expected {% token'), s('endset'));
                    }
                    return (
                      r(ea.CloseStatement, 'Expected closing statement token'),
                      new ha(e, t, l)
                    );
                  })()));
                break;
              case 'if':
                (++n,
                  (p = c()),
                  r(ea.OpenStatement, 'Expected {% token'),
                  s('endif'),
                  r(ea.CloseStatement, 'Expected %} token'));
                break;
              case 'macro':
                (++n,
                  (p = (function () {
                    const e = M();
                    if ('Identifier' !== e.type)
                      throw new SyntaxError(
                        'Expected identifier following macro statement'
                      );
                    const t = w();
                    r(ea.CloseStatement, 'Expected closing statement token');
                    const n = [];
                    for (; !i('endmacro'); ) n.push(a());
                    return new fa(e, t, n);
                  })()),
                  r(ea.OpenStatement, 'Expected {% token'),
                  s('endmacro'),
                  r(ea.CloseStatement, 'Expected %} token'));
                break;
              case 'for':
                (++n,
                  (p = (function () {
                    const e = u(!0);
                    if (!(e instanceof ya || e instanceof Ea))
                      throw new SyntaxError(
                        `Expected identifier/tuple for the loop variable, got ${e.type} instead`
                      );
                    if (!l('in'))
                      throw new SyntaxError(
                        'Expected `in` keyword following loop variable'
                      );
                    ++n;
                    const t = d();
                    r(ea.CloseStatement, 'Expected closing statement token');
                    const s = [];
                    for (; !i('endfor', 'else'); ) s.push(a());
                    const o = [];
                    if (i('else'))
                      for (
                        ++n,
                          ++n,
                          r(
                            ea.CloseStatement,
                            'Expected closing statement token'
                          );
                        !i('endfor');

                      )
                        o.push(a());
                    return new ua(e, t, s, o);
                  })()),
                  r(ea.OpenStatement, 'Expected {% token'),
                  s('endfor'),
                  r(ea.CloseStatement, 'Expected %} token'));
                break;
              case 'call': {
                ++n;
                let e = null;
                o(ea.OpenParen) && (e = w());
                const t = M();
                if ('Identifier' !== t.type)
                  throw new SyntaxError(
                    'Expected identifier following call statement'
                  );
                const l = w();
                r(ea.CloseStatement, 'Expected closing statement token');
                const c = [];
                for (; !i('endcall'); ) c.push(a());
                (r(ea.OpenStatement, "Expected '{%'"),
                  s('endcall'),
                  r(ea.CloseStatement, 'Expected closing statement token'));
                const u = new wa(t, l);
                p = new Na(u, e, c);
                break;
              }
              case 'break':
                (++n,
                  r(ea.CloseStatement, 'Expected closing statement token'),
                  (p = new da()));
                break;
              case 'continue':
                (++n,
                  r(ea.CloseStatement, 'Expected closing statement token'),
                  (p = new pa()));
                break;
              case 'filter': {
                ++n;
                let e = M();
                (e instanceof ya && o(ea.OpenParen) && (e = g(e)),
                  r(ea.CloseStatement, 'Expected closing statement token'));
                const t = [];
                for (; !i('endfilter'); ) t.push(a());
                (r(ea.OpenStatement, "Expected '{%'"),
                  s('endfilter'),
                  r(ea.CloseStatement, "Expected '%}'"),
                  (p = new Sa(e, t)));
                break;
              }
              default:
                throw new SyntaxError(`Unknown statement type: ${t}`);
            }
            return p;
          })();
        case ea.OpenExpression:
          return (function () {
            r(ea.OpenExpression, 'Expected opening expression token');
            const e = d();
            return (
              r(ea.CloseExpression, 'Expected closing expression token'),
              e
            );
          })();
        default:
          throw new SyntaxError(`Unexpected token type: ${e[n].type}`);
      }
    }
    function o(...t) {
      return n + t.length <= e.length && t.every((t, r) => t === e[n + r].type);
    }
    function i(...t) {
      return (
        e[n]?.type === ea.OpenStatement &&
        e[n + 1]?.type === ea.Identifier &&
        t.includes(e[n + 1]?.value)
      );
    }
    function l(...t) {
      return (
        n + t.length <= e.length &&
        t.every(
          (t, r) => 'Identifier' === e[n + r].type && t === e[n + r].value
        )
      );
    }
    function c() {
      const e = d();
      r(ea.CloseStatement, 'Expected closing statement token');
      const t = [],
        s = [];
      for (; !i('elif', 'else', 'endif'); ) t.push(a());
      if (i('elif')) {
        (++n, ++n);
        const e = c();
        s.push(e);
      } else if (i('else'))
        for (
          ++n, ++n, r(ea.CloseStatement, 'Expected closing statement token');
          !i('endif');

        )
          s.push(a());
      return new ca(e, t, s);
    }
    function u(e = !1) {
      const t = e ? M : d,
        r = [t()],
        s = o(ea.Comma);
      for (; s && (++n, r.push(t()), o(ea.Comma)); );
      return s ? new Ea(r) : r[0];
    }
    function d() {
      return p();
    }
    function p() {
      const e = h();
      if (l('if')) {
        ++n;
        const t = h();
        if (l('else')) {
          ++n;
          const r = p();
          return new Ba(t, e, r);
        }
        return new Pa(e, t);
      }
      return e;
    }
    function h() {
      let t = f();
      for (; l('or'); ) {
        const r = e[n];
        ++n;
        const s = f();
        t = new Ta(r, t, s);
      }
      return t;
    }
    function f() {
      let t = _();
      for (; l('and'); ) {
        const r = e[n];
        ++n;
        const s = _();
        t = new Ta(r, t, s);
      }
      return t;
    }
    function _() {
      let t;
      for (; l('not'); ) {
        const r = e[n];
        ++n;
        const s = _();
        t = new Ia(r, s);
      }
      return (
        t ??
        (function () {
          let t = m();
          for (;;) {
            let r;
            if (l('not', 'in'))
              ((r = new ta('not in', ea.Identifier)), (n += 2));
            else if (l('in')) r = e[n++];
            else {
              if (!o(ea.ComparisonBinaryOperator)) break;
              r = e[n++];
            }
            const s = m();
            t = new Ta(r, t, s);
          }
          return t;
        })()
      );
    }
    function m() {
      let t = v();
      for (; o(ea.AdditiveBinaryOperator); ) {
        const r = e[n];
        ++n;
        const s = v();
        t = new Ta(r, t, s);
      }
      return t;
    }
    function g(e) {
      let t = new wa(e, w());
      return ((t = b(t)), o(ea.OpenParen) && (t = g(t)), t);
    }
    function w() {
      r(ea.OpenParen, 'Expected opening parenthesis for arguments list');
      const t = (function () {
        const t = [];
        for (; !o(ea.CloseParen); ) {
          let r;
          if (
            e[n].type === ea.MultiplicativeBinaryOperator &&
            '*' === e[n].value
          ) {
            ++n;
            const e = d();
            r = new za(e);
          } else if (((r = d()), o(ea.Equals))) {
            if ((++n, !(r instanceof ya)))
              throw new SyntaxError('Expected identifier for keyword argument');
            const e = d();
            r = new La(r, e);
          }
          (t.push(r), o(ea.Comma) && ++n);
        }
        return t;
      })();
      return (
        r(ea.CloseParen, 'Expected closing parenthesis for arguments list'),
        t
      );
    }
    function y() {
      const e = [];
      let t = !1;
      for (; !o(ea.CloseSquareBracket); )
        o(ea.Colon)
          ? (e.push(void 0), ++n, (t = !0))
          : (e.push(d()), o(ea.Colon) && (++n, (t = !0)));
      if (0 === e.length)
        throw new SyntaxError(
          'Expected at least one argument for member/slice expression'
        );
      if (t) {
        if (e.length > 3)
          throw new SyntaxError('Expected 0-3 arguments for slice expression');
        return new Oa(...e);
      }
      return e[0];
    }
    function b(t) {
      for (; o(ea.Dot) || o(ea.OpenSquareBracket); ) {
        const s = e[n];
        let a;
        ++n;
        const o = s.type === ea.OpenSquareBracket;
        if (o)
          ((a = y()),
            r(ea.CloseSquareBracket, 'Expected closing square bracket'));
        else if (((a = M()), 'Identifier' !== a.type))
          throw new SyntaxError('Expected identifier following dot operator');
        t = new ga(t, a, o);
      }
      return t;
    }
    function v() {
      let t = x();
      for (; o(ea.MultiplicativeBinaryOperator); ) {
        const r = e[n++],
          s = x();
        t = new Ta(r, t, s);
      }
      return t;
    }
    function x() {
      let e = (function () {
        let e = (function () {
          const e = b(M());
          return o(ea.OpenParen) ? g(e) : e;
        })();
        for (; o(ea.Pipe); ) {
          ++n;
          let t = M();
          if (!(t instanceof ya))
            throw new SyntaxError('Expected identifier for the filter');
          (o(ea.OpenParen) && (t = g(t)), (e = new Ca(e, t)));
        }
        return e;
      })();
      for (; l('is'); ) {
        ++n;
        const t = l('not');
        t && ++n;
        const r = M();
        if (!(r instanceof ya))
          throw new SyntaxError('Expected identifier for the test');
        e = new Fa(e, t, r);
      }
      return e;
    }
    function M() {
      const t = e[n++];
      switch (t.type) {
        case ea.NumericLiteral: {
          const e = t.value;
          return e.includes('.') ? new xa(Number(e)) : new va(Number(e));
        }
        case ea.StringLiteral: {
          let r = t.value;
          for (; o(ea.StringLiteral); ) r += e[n++].value;
          return new Ma(r);
        }
        case ea.Identifier:
          return new ya(t.value);
        case ea.OpenParen: {
          const e = u();
          return (
            r(
              ea.CloseParen,
              'Expected closing parenthesis, got ${tokens[current].type} instead.'
            ),
            e
          );
        }
        case ea.OpenSquareBracket: {
          const e = [];
          for (; !o(ea.CloseSquareBracket); ) (e.push(d()), o(ea.Comma) && ++n);
          return (++n, new ka(e));
        }
        case ea.OpenCurlyBracket: {
          const e = new Map();
          for (; !o(ea.CloseCurlyBracket); ) {
            const t = d();
            r(
              ea.Colon,
              'Expected colon between key and value in object literal'
            );
            const s = d();
            (e.set(t, s), o(ea.Comma) && ++n);
          }
          return (++n, new Aa(e));
        }
        default:
          throw new SyntaxError(`Unexpected token: ${t.type}`);
      }
    }
    for (; n < e.length; ) t.body.push(a());
    return t;
  }
  function Da(e, t, n = 1) {
    if ((void 0 === t && ((t = e), (e = 0)), 0 === n))
      throw new Error('range() step must not be zero');
    const r = [];
    if (n > 0) for (let s = e; s < t; s += n) r.push(s);
    else for (let s = e; s > t; s += n) r.push(s);
    return r;
  }
  function Ra(e, t, n, r = 1) {
    const s = Math.sign(r);
    s >= 0
      ? ((t =
          (t ??= 0) < 0 ? Math.max(e.length + t, 0) : Math.min(t, e.length)),
        (n =
          (n ??= e.length) < 0
            ? Math.max(e.length + n, 0)
            : Math.min(n, e.length)))
      : ((t =
          (t ??= e.length - 1) < 0
            ? Math.max(e.length + t, -1)
            : Math.min(t, e.length - 1)),
        (n =
          (n ??= -1) < -1
            ? Math.max(e.length + n, -1)
            : Math.min(n, e.length - 1)));
    const a = [];
    for (let o = t; s * o < s * n; o += r) a.push(e[o]);
    return a;
  }
  function Ua(e) {
    return (function (e, t) {
      const n = new Intl.DateTimeFormat(void 0, { month: 'long' }),
        r = new Intl.DateTimeFormat(void 0, { month: 'short' }),
        s = e => (e < 10 ? '0' + e : e.toString());
      return t.replace(/%[YmdbBHM%]/g, t => {
        switch (t) {
          case '%Y':
            return e.getFullYear().toString();
          case '%m':
            return s(e.getMonth() + 1);
          case '%d':
            return s(e.getDate());
          case '%b':
            return r.format(e);
          case '%B':
            return n.format(e);
          case '%H':
            return s(e.getHours());
          case '%M':
            return s(e.getMinutes());
          case '%%':
            return '%';
          default:
            return t;
        }
      });
    })(new Date(), e);
  }
  var Ga = class extends Error {},
    Va = class extends Error {},
    ja = class {
      type = 'RuntimeValue';
      value;
      builtins = new Map();
      constructor(e = void 0) {
        this.value = e;
      }
      __bool__() {
        return new Qa(!!this.value);
      }
      toString() {
        return String(this.value);
      }
    },
    Wa = class extends ja {
      type = 'IntegerValue';
    },
    qa = class extends ja {
      type = 'FloatValue';
      toString() {
        return this.value % 1 == 0
          ? this.value.toFixed(1)
          : this.value.toString();
      }
    },
    Ha = class extends ja {
      type = 'StringValue';
      builtins = new Map([
        ['upper', new no(() => new Ha(this.value.toUpperCase()))],
        ['lower', new no(() => new Ha(this.value.toLowerCase()))],
        ['strip', new no(() => new Ha(this.value.trim()))],
        [
          'title',
          new no(
            () => new Ha(this.value.replace(/\b\w/g, e => e.toUpperCase()))
          ),
        ],
        [
          'capitalize',
          new no(
            () =>
              new Ha(this.value.charAt(0).toUpperCase() + this.value.slice(1))
          ),
        ],
        ['length', new Wa(this.value.length)],
        ['rstrip', new no(() => new Ha(this.value.trimEnd()))],
        ['lstrip', new no(() => new Ha(this.value.trimStart()))],
        [
          'startswith',
          new no(e => {
            if (0 === e.length)
              throw new Error('startswith() requires at least one argument');
            const t = e[0];
            if (t instanceof Ha) return new Qa(this.value.startsWith(t.value));
            if (t instanceof eo) {
              for (const e of t.value) {
                if (!(e instanceof Ha))
                  throw new Error(
                    'startswith() tuple elements must be strings'
                  );
                if (this.value.startsWith(e.value)) return new Qa(!0);
              }
              return new Qa(!1);
            }
            throw new Error(
              'startswith() argument must be a string or tuple of strings'
            );
          }),
        ],
        [
          'endswith',
          new no(e => {
            if (0 === e.length)
              throw new Error('endswith() requires at least one argument');
            const t = e[0];
            if (t instanceof Ha) return new Qa(this.value.endsWith(t.value));
            if (t instanceof eo) {
              for (const e of t.value) {
                if (!(e instanceof Ha))
                  throw new Error('endswith() tuple elements must be strings');
                if (this.value.endsWith(e.value)) return new Qa(!0);
              }
              return new Qa(!1);
            }
            throw new Error(
              'endswith() argument must be a string or tuple of strings'
            );
          }),
        ],
        [
          'split',
          new no(e => {
            const t = e[0] ?? new ro();
            if (!(t instanceof Ha || t instanceof ro))
              throw new Error('sep argument must be a string or null');
            const n = e[1] ?? new Wa(-1);
            if (!(n instanceof Wa))
              throw new Error('maxsplit argument must be a number');
            let r = [];
            if (t instanceof ro) {
              const e = this.value.trimStart();
              for (const { 0: t, index: s } of e.matchAll(/\S+/g)) {
                if (-1 !== n.value && r.length >= n.value && void 0 !== s) {
                  r.push(t + e.slice(s + t.length));
                  break;
                }
                r.push(t);
              }
            } else {
              if ('' === t.value) throw new Error('empty separator');
              ((r = this.value.split(t.value)),
                -1 !== n.value &&
                  r.length > n.value &&
                  r.push(r.splice(n.value).join(t.value)));
            }
            return new eo(r.map(e => new Ha(e)));
          }),
        ],
        [
          'replace',
          new no(e => {
            if (e.length < 2)
              throw new Error('replace() requires at least two arguments');
            const t = e[0],
              n = e[1];
            if (!(t instanceof Ha && n instanceof Ha))
              throw new Error('replace() arguments must be strings');
            let r;
            if (
              ((r =
                e.length > 2
                  ? 'KeywordArgumentsValue' === e[2].type
                    ? (e[2].value.get('count') ?? new ro())
                    : e[2]
                  : new ro()),
              !(r instanceof Wa || r instanceof ro))
            )
              throw new Error(
                'replace() count argument must be a number or null'
              );
            return new Ha(
              (function (e, t, n, r) {
                if (0 === r) return e;
                let s = null == r || r < 0 ? 1 / 0 : r;
                const a =
                  0 === t.length
                    ? new RegExp('(?=)', 'gu')
                    : new RegExp(
                        t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                        'gu'
                      );
                return e.replaceAll(a, e => (s > 0 ? (--s, n) : e));
              })(this.value, t.value, n.value, r.value)
            );
          }),
        ],
      ]);
    },
    Qa = class extends ja {
      type = 'BooleanValue';
    },
    Xa = /[\x7f-\uffff]/g;
  function Ya(e) {
    return e.replace(
      Xa,
      e => '\\u' + e.charCodeAt(0).toString(16).padStart(4, '0')
    );
  }
  function Ja(e, t = {}, n = 0, r = !0) {
    const {
      indent: s = null,
      ensureAscii: a = !1,
      separators: o = null,
      sortKeys: i = !1,
    } = t;
    let l, c;
    switch (
      (o
        ? ([l, c] = o)
        : s
          ? ((l = ','), (c = ': '))
          : ((l = ', '), (c = ': ')),
      e.type)
    ) {
      case 'NullValue':
        return 'null';
      case 'UndefinedValue':
        return r ? 'null' : 'undefined';
      case 'IntegerValue':
      case 'FloatValue':
      case 'BooleanValue':
        return JSON.stringify(e.value);
      case 'StringValue': {
        let t = JSON.stringify(e.value);
        return (a && (t = Ya(t)), t);
      }
      case 'ArrayValue':
      case 'ObjectValue': {
        const o = s ? ' '.repeat(s) : '',
          u = '\n' + o.repeat(n),
          d = u + o;
        if ('ArrayValue' === e.type) {
          const a = e.value.map(e => Ja(e, t, n + 1, r));
          return s ? `[${d}${a.join(`${l}${d}`)}${u}]` : `[${a.join(l)}]`;
        }
        {
          let o = Array.from(e.value.entries());
          i && (o = o.sort(([e], [t]) => e.localeCompare(t)));
          const p = o.map(([e, o]) => {
            let i = JSON.stringify(e);
            a && (i = Ya(i));
            const l = `${i}${c}${Ja(o, t, n + 1, r)}`;
            return s ? `${d}${l}` : l;
          });
          return s ? `{${p.join(l)}${u}}` : `{${p.join(l)}}`;
        }
      }
      default:
        throw new Error(`Cannot convert to JSON: ${e.type}`);
    }
  }
  var Ka = class extends ja {
      type = 'ObjectValue';
      __bool__() {
        return new Qa(this.value.size > 0);
      }
      builtins = new Map([
        [
          'get',
          new no(([e, t]) => {
            if (!(e instanceof Ha))
              throw new Error(`Object key must be a string: got ${e.type}`);
            return this.value.get(e.value) ?? t ?? new ro();
          }),
        ],
        ['items', new no(() => this.items())],
        ['keys', new no(() => this.keys())],
        ['values', new no(() => this.values())],
        [
          'dictsort',
          new no(e => {
            let t = new Map();
            const n = e.filter(e => !(e instanceof Za && ((t = e.value), 1))),
              r = n.at(0) ?? t.get('case_sensitive') ?? new Qa(!1);
            if (!(r instanceof Qa))
              throw new Error('case_sensitive must be a boolean');
            const s = n.at(1) ?? t.get('by') ?? new Ha('key');
            if (!(s instanceof Ha)) throw new Error('by must be a string');
            if (!['key', 'value'].includes(s.value))
              throw new Error("by must be either 'key' or 'value'");
            const a = n.at(2) ?? t.get('reverse') ?? new Qa(!1);
            if (!(a instanceof Qa))
              throw new Error('reverse must be a boolean');
            const o = Array.from(this.value.entries())
              .map(([e, t]) => new eo([new Ha(e), t]))
              .sort((e, t) => {
                const n = 'key' === s.value ? 0 : 1,
                  o = io(e.value[n], t.value[n], r.value);
                return a.value ? -o : o;
              });
            return new eo(o);
          }),
        ],
      ]);
      items() {
        return new eo(
          Array.from(this.value.entries()).map(
            ([e, t]) => new eo([new Ha(e), t])
          )
        );
      }
      keys() {
        return new eo(Array.from(this.value.keys()).map(e => new Ha(e)));
      }
      values() {
        return new eo(Array.from(this.value.values()));
      }
      toString() {
        return Ja(this, {}, 0, !1);
      }
    },
    Za = class extends Ka {
      type = 'KeywordArgumentsValue';
    },
    eo = class extends ja {
      type = 'ArrayValue';
      builtins = new Map([['length', new Wa(this.value.length)]]);
      __bool__() {
        return new Qa(this.value.length > 0);
      }
      toString() {
        return Ja(this, {}, 0, !1);
      }
    },
    to = class extends eo {
      type = 'TupleValue';
    },
    no = class extends ja {
      type = 'FunctionValue';
    },
    ro = class extends ja {
      type = 'NullValue';
    },
    so = class extends ja {
      type = 'UndefinedValue';
    },
    ao = class {
      constructor(e) {
        this.parent = e;
      }
      variables = new Map([
        [
          'namespace',
          new no(e => {
            if (0 === e.length) return new Ka(new Map());
            if (1 !== e.length || !(e[0] instanceof Ka))
              throw new Error(
                '`namespace` expects either zero arguments or a single object argument'
              );
            return e[0];
          }),
        ],
      ]);
      tests = new Map([
        ['boolean', e => 'BooleanValue' === e.type],
        ['callable', e => e instanceof no],
        [
          'odd',
          e => {
            if (!(e instanceof Wa)) throw new Error(`cannot odd on ${e.type}`);
            return e.value % 2 != 0;
          },
        ],
        [
          'even',
          e => {
            if (!(e instanceof Wa)) throw new Error(`cannot even on ${e.type}`);
            return e.value % 2 == 0;
          },
        ],
        ['false', e => 'BooleanValue' === e.type && !e.value],
        ['true', e => 'BooleanValue' === e.type && e.value],
        ['none', e => 'NullValue' === e.type],
        ['string', e => 'StringValue' === e.type],
        ['number', e => e instanceof Wa || e instanceof qa],
        ['integer', e => e instanceof Wa],
        ['iterable', e => 'ArrayValue' === e.type || 'StringValue' === e.type],
        ['mapping', e => 'ObjectValue' === e.type],
        [
          'lower',
          e => {
            const t = e.value;
            return 'StringValue' === e.type && t === t.toLowerCase();
          },
        ],
        [
          'upper',
          e => {
            const t = e.value;
            return 'StringValue' === e.type && t === t.toUpperCase();
          },
        ],
        ['none', e => 'NullValue' === e.type],
        ['defined', e => 'UndefinedValue' !== e.type],
        ['undefined', e => 'UndefinedValue' === e.type],
        ['equalto', (e, t) => e.value === t.value],
        ['eq', (e, t) => e.value === t.value],
      ]);
      set(e, t) {
        return this.declareVariable(e, co(t));
      }
      declareVariable(e, t) {
        if (this.variables.has(e))
          throw new SyntaxError(`Variable already declared: ${e}`);
        return (this.variables.set(e, t), t);
      }
      setVariable(e, t) {
        return (this.variables.set(e, t), t);
      }
      resolve(e) {
        if (this.variables.has(e)) return this;
        if (this.parent) return this.parent.resolve(e);
        throw new Error(`Unknown variable: ${e}`);
      }
      lookupVariable(e) {
        try {
          return this.resolve(e).variables.get(e) ?? new so();
        } catch {
          return new so();
        }
      }
    };
  function oo(e, t) {
    const n = t.split('.');
    let r = e;
    for (const e of n)
      if (r instanceof Ka) r = r.value.get(e) ?? new so();
      else {
        if (!(r instanceof eo)) return new so();
        {
          const t = parseInt(e, 10);
          if (!(!isNaN(t) && t >= 0 && t < r.value.length)) return new so();
          r = r.value[t];
        }
      }
    return r;
  }
  function io(e, t, n = !1) {
    if (e instanceof ro && t instanceof ro) return 0;
    if (e instanceof ro || t instanceof ro)
      throw new Error(`Cannot compare ${e.type} with ${t.type}`);
    if (e instanceof so && t instanceof so) return 0;
    if (e instanceof so || t instanceof so)
      throw new Error(`Cannot compare ${e.type} with ${t.type}`);
    const r = e => e instanceof Wa || e instanceof qa || e instanceof Qa,
      s = e => (e instanceof Qa ? (e.value ? 1 : 0) : e.value);
    if (r(e) && r(t)) {
      const n = s(e),
        r = s(t);
      return n < r ? -1 : n > r ? 1 : 0;
    }
    if (e.type !== t.type)
      throw new Error(
        `Cannot compare different types: ${e.type} and ${t.type}`
      );
    if ('StringValue' === e.type) {
      let r = e.value,
        s = t.value;
      return (
        n || ((r = r.toLowerCase()), (s = s.toLowerCase())),
        r < s ? -1 : r > s ? 1 : 0
      );
    }
    throw new Error(`Cannot compare type: ${e.type}`);
  }
  var lo = class {
    global;
    constructor(e) {
      this.global = e ?? new ao();
    }
    run(e) {
      return this.evaluate(e, this.global);
    }
    evaluateBinaryExpression(e, t) {
      const n = this.evaluate(e.left, t);
      switch (e.operator.value) {
        case 'and':
          return n.__bool__().value ? this.evaluate(e.right, t) : n;
        case 'or':
          return n.__bool__().value ? n : this.evaluate(e.right, t);
      }
      const r = this.evaluate(e.right, t);
      switch (e.operator.value) {
        case '==':
          return new Qa(n.value == r.value);
        case '!=':
          return new Qa(n.value != r.value);
      }
      if (n instanceof so || r instanceof so) {
        if (r instanceof so && ['in', 'not in'].includes(e.operator.value))
          return new Qa('not in' === e.operator.value);
        throw new Error(
          `Cannot perform operation ${e.operator.value} on undefined values`
        );
      }
      if (n instanceof ro || r instanceof ro)
        throw new Error('Cannot perform operation on null values');
      if ('~' === e.operator.value)
        return new Ha(n.value.toString() + r.value.toString());
      if (
        (n instanceof Wa || n instanceof qa) &&
        (r instanceof Wa || r instanceof qa)
      ) {
        const t = n.value,
          s = r.value;
        switch (e.operator.value) {
          case '+':
          case '-':
          case '*': {
            const a =
              '+' === e.operator.value
                ? t + s
                : '-' === e.operator.value
                  ? t - s
                  : t * s;
            return n instanceof qa || r instanceof qa ? new qa(a) : new Wa(a);
          }
          case '/':
            return new qa(t / s);
          case '%': {
            const e = t % s;
            return n instanceof qa || r instanceof qa ? new qa(e) : new Wa(e);
          }
          case '<':
            return new Qa(t < s);
          case '>':
            return new Qa(t > s);
          case '>=':
            return new Qa(t >= s);
          case '<=':
            return new Qa(t <= s);
        }
      } else if (n instanceof eo && r instanceof eo) {
        if ('+' === e.operator.value) return new eo(n.value.concat(r.value));
      } else if (r instanceof eo) {
        const t = void 0 !== r.value.find(e => e.value === n.value);
        switch (e.operator.value) {
          case 'in':
            return new Qa(t);
          case 'not in':
            return new Qa(!t);
        }
      }
      if ((n instanceof Ha || r instanceof Ha) && '+' === e.operator.value)
        return new Ha(n.value.toString() + r.value.toString());
      if (n instanceof Ha && r instanceof Ha)
        switch (e.operator.value) {
          case 'in':
            return new Qa(r.value.includes(n.value));
          case 'not in':
            return new Qa(!r.value.includes(n.value));
        }
      if (n instanceof Ha && r instanceof Ka)
        switch (e.operator.value) {
          case 'in':
            return new Qa(r.value.has(n.value));
          case 'not in':
            return new Qa(!r.value.has(n.value));
        }
      throw new SyntaxError(
        `Unknown operator "${e.operator.value}" between ${n.type} and ${r.type}`
      );
    }
    evaluateArguments(e, t) {
      const n = [],
        r = new Map();
      for (const s of e)
        if ('SpreadExpression' === s.type) {
          const e = s,
            r = this.evaluate(e.argument, t);
          if (!(r instanceof eo))
            throw new Error(`Cannot unpack non-iterable type: ${r.type}`);
          for (const e of r.value) n.push(e);
        } else if ('KeywordArgumentExpression' === s.type) {
          const e = s;
          r.set(e.key.value, this.evaluate(e.value, t));
        } else {
          if (r.size > 0)
            throw new Error(
              'Positional arguments must come before keyword arguments'
            );
          n.push(this.evaluate(s, t));
        }
      return [n, r];
    }
    applyFilter(e, t, n) {
      if ('Identifier' === t.type) {
        const r = t;
        if ('tojson' === r.value) return new Ha(Ja(e, {}));
        if (e instanceof eo)
          switch (r.value) {
            case 'list':
              return e;
            case 'first':
              return e.value[0];
            case 'last':
              return e.value[e.value.length - 1];
            case 'length':
              return new Wa(e.value.length);
            case 'reverse':
              return new eo(e.value.slice().reverse());
            case 'sort':
              return new eo(e.value.slice().sort((e, t) => io(e, t, !1)));
            case 'join':
              return new Ha(e.value.map(e => e.value).join(''));
            case 'string':
              return new Ha(Ja(e, {}, 0, !1));
            case 'unique': {
              const t = new Set(),
                n = [];
              for (const r of e.value)
                t.has(r.value) || (t.add(r.value), n.push(r));
              return new eo(n);
            }
            default:
              throw new Error(`Unknown ArrayValue filter: ${r.value}`);
          }
        else if (e instanceof Ha)
          switch (r.value) {
            case 'length':
            case 'upper':
            case 'lower':
            case 'title':
            case 'capitalize': {
              const t = e.builtins.get(r.value);
              if (t instanceof no) return t.value([], n);
              if (t instanceof Wa) return t;
              throw new Error(`Unknown StringValue filter: ${r.value}`);
            }
            case 'trim':
              return new Ha(e.value.trim());
            case 'indent':
              return new Ha(
                e.value
                  .split('\n')
                  .map((e, t) => (0 === t || 0 === e.length ? e : '    ' + e))
                  .join('\n')
              );
            case 'join':
            case 'string':
              return e;
            case 'int': {
              const t = parseInt(e.value, 10);
              return new Wa(isNaN(t) ? 0 : t);
            }
            case 'float': {
              const t = parseFloat(e.value);
              return new qa(isNaN(t) ? 0 : t);
            }
            default:
              throw new Error(`Unknown StringValue filter: ${r.value}`);
          }
        else if (e instanceof Wa || e instanceof qa)
          switch (r.value) {
            case 'abs':
              return e instanceof Wa
                ? new Wa(Math.abs(e.value))
                : new qa(Math.abs(e.value));
            case 'int':
              return new Wa(Math.floor(e.value));
            case 'float':
              return new qa(e.value);
            default:
              throw new Error(`Unknown NumericValue filter: ${r.value}`);
          }
        else if (e instanceof Ka)
          switch (r.value) {
            case 'items':
              return new eo(
                Array.from(e.value.entries()).map(
                  ([e, t]) => new eo([new Ha(e), t])
                )
              );
            case 'length':
              return new Wa(e.value.size);
            default: {
              const t = e.builtins.get(r.value);
              if (t) return t instanceof no ? t.value([], n) : t;
              throw new Error(`Unknown ObjectValue filter: ${r.value}`);
            }
          }
        else if (e instanceof Qa)
          switch (r.value) {
            case 'bool':
              return new Qa(e.value);
            case 'int':
              return new Wa(e.value ? 1 : 0);
            case 'float':
              return new qa(e.value ? 1 : 0);
            case 'string':
              return new Ha(e.value ? 'true' : 'false');
            default:
              throw new Error(`Unknown BooleanValue filter: ${r.value}`);
          }
        throw new Error(`Cannot apply filter "${r.value}" to type: ${e.type}`);
      }
      if ('CallExpression' === t.type) {
        const r = t;
        if ('Identifier' !== r.callee.type)
          throw new Error(`Unknown filter: ${r.callee.type}`);
        const s = r.callee.value;
        if ('tojson' === s) {
          const [, t] = this.evaluateArguments(r.args, n),
            s = t.get('indent') ?? new ro();
          if (!(s instanceof Wa || s instanceof ro))
            throw new Error('If set, indent must be a number');
          const a = t.get('ensure_ascii') ?? new Qa(!1);
          if (!(a instanceof Qa))
            throw new Error('If set, ensure_ascii must be a boolean');
          const o = t.get('sort_keys') ?? new Qa(!1);
          if (!(o instanceof Qa))
            throw new Error('If set, sort_keys must be a boolean');
          const i = t.get('separators') ?? new ro();
          let l = null;
          if (i instanceof eo || i instanceof to) {
            if (2 !== i.value.length)
              throw new Error('separators must be a tuple of two strings');
            const [e, t] = i.value;
            if (!(e instanceof Ha && t instanceof Ha))
              throw new Error('separators must be a tuple of two strings');
            l = [e.value, t.value];
          } else if (!(i instanceof ro))
            throw new Error(
              'If set, separators must be a tuple of two strings'
            );
          return new Ha(
            Ja(e, {
              indent: s.value,
              ensureAscii: a.value,
              sortKeys: o.value,
              separators: l,
            })
          );
        }
        if ('join' === s) {
          let t;
          if (e instanceof Ha) t = Array.from(e.value);
          else {
            if (!(e instanceof eo))
              throw new Error(`Cannot apply filter "${s}" to type: ${e.type}`);
            t = e.value.map(e => e.value);
          }
          const [a, o] = this.evaluateArguments(r.args, n),
            i = a.at(0) ?? o.get('separator') ?? new Ha('');
          if (!(i instanceof Ha)) throw new Error('separator must be a string');
          return new Ha(t.join(i.value));
        }
        if ('int' === s || 'float' === s) {
          const [t, a] = this.evaluateArguments(r.args, n),
            o =
              t.at(0) ??
              a.get('default') ??
              ('int' === s ? new Wa(0) : new qa(0));
          if (e instanceof Ha) {
            const t = 'int' === s ? parseInt(e.value, 10) : parseFloat(e.value);
            return isNaN(t) ? o : 'int' === s ? new Wa(t) : new qa(t);
          }
          if (e instanceof Wa || e instanceof qa) return e;
          if (e instanceof Qa)
            return 'int' === s
              ? new Wa(e.value ? 1 : 0)
              : new qa(e.value ? 1 : 0);
          throw new Error(`Cannot apply filter "${s}" to type: ${e.type}`);
        }
        if ('default' === s) {
          const [t, s] = this.evaluateArguments(r.args, n),
            a = t[0] ?? new Ha(''),
            o = t[1] ?? s.get('boolean') ?? new Qa(!1);
          if (!(o instanceof Qa))
            throw new Error('`default` filter flag must be a boolean');
          return e instanceof so || (o.value && !e.__bool__().value) ? a : e;
        }
        if (e instanceof eo) {
          switch (s) {
            case 'sort': {
              const [t, s] = this.evaluateArguments(r.args, n),
                a = t.at(0) ?? s.get('reverse') ?? new Qa(!1);
              if (!(a instanceof Qa))
                throw new Error('reverse must be a boolean');
              const o = t.at(1) ?? s.get('case_sensitive') ?? new Qa(!1);
              if (!(o instanceof Qa))
                throw new Error('case_sensitive must be a boolean');
              const i = t.at(2) ?? s.get('attribute') ?? new ro();
              if (!(i instanceof Ha || i instanceof Wa || i instanceof ro))
                throw new Error('attribute must be a string, integer, or null');
              const l = e =>
                i instanceof ro
                  ? e
                  : oo(e, i instanceof Wa ? String(i.value) : i.value);
              return new eo(
                e.value.slice().sort((e, t) => {
                  const n = io(l(e), l(t), o.value);
                  return a.value ? -n : n;
                })
              );
            }
            case 'selectattr':
            case 'rejectattr': {
              const t = 'selectattr' === s;
              if (e.value.some(e => !(e instanceof Ka)))
                throw new Error(
                  `\`${s}\` can only be applied to array of objects`
                );
              if (r.args.some(e => 'StringLiteral' !== e.type))
                throw new Error(`arguments of \`${s}\` must be strings`);
              const [a, o, i] = r.args.map(e => this.evaluate(e, n));
              let l;
              if (o) {
                const e = n.tests.get(o.value);
                if (!e) throw new Error(`Unknown test: ${o.value}`);
                l = e;
              } else l = (...e) => e[0].__bool__().value;
              const c = e.value.filter(e => {
                const n = e.value.get(a.value),
                  r = !!n && l(n, i);
                return t ? r : !r;
              });
              return new eo(c);
            }
            case 'map': {
              const [, t] = this.evaluateArguments(r.args, n);
              if (t.has('attribute')) {
                const n = t.get('attribute');
                if (!(n instanceof Ha))
                  throw new Error('attribute must be a string');
                const r = t.get('default'),
                  s = e.value.map(e => {
                    if (!(e instanceof Ka))
                      throw new Error('items in map must be an object');
                    const t = oo(e, n.value);
                    return t instanceof so ? (r ?? new so()) : t;
                  });
                return new eo(s);
              }
              throw new Error(
                '`map` expressions without `attribute` set are not currently supported.'
              );
            }
          }
          throw new Error(`Unknown ArrayValue filter: ${s}`);
        }
        if (e instanceof Ha) {
          switch (s) {
            case 'indent': {
              const [t, s] = this.evaluateArguments(r.args, n),
                a = t.at(0) ?? s.get('width') ?? new Wa(4);
              if (!(a instanceof Wa)) throw new Error('width must be a number');
              const o = t.at(1) ?? s.get('first') ?? new Qa(!1),
                i = t.at(2) ?? s.get('blank') ?? new Qa(!1),
                l = e.value.split('\n'),
                c = ' '.repeat(a.value),
                u = l.map((e, t) =>
                  (!o.value && 0 === t) || (!i.value && 0 === e.length)
                    ? e
                    : c + e
                );
              return new Ha(u.join('\n'));
            }
            case 'replace': {
              const t = e.builtins.get('replace');
              if (!(t instanceof no))
                throw new Error('replace filter not available');
              const [s, a] = this.evaluateArguments(r.args, n);
              return t.value([...s, new Za(a)], n);
            }
          }
          throw new Error(`Unknown StringValue filter: ${s}`);
        }
        if (e instanceof Ka) {
          const t = e.builtins.get(s);
          if (t && t instanceof no) {
            const [e, s] = this.evaluateArguments(r.args, n);
            return (s.size > 0 && e.push(new Za(s)), t.value(e, n));
          }
          throw new Error(`Unknown ObjectValue filter: ${s}`);
        }
        throw new Error(`Cannot apply filter "${s}" to type: ${e.type}`);
      }
      throw new Error(`Unknown filter: ${t.type}`);
    }
    evaluateFilterExpression(e, t) {
      const n = this.evaluate(e.operand, t);
      return this.applyFilter(n, e.filter, t);
    }
    evaluateTestExpression(e, t) {
      const n = this.evaluate(e.operand, t),
        r = t.tests.get(e.test.value);
      if (!r) throw new Error(`Unknown test: ${e.test.value}`);
      const s = r(n);
      return new Qa(e.negate ? !s : s);
    }
    evaluateSelectExpression(e, t) {
      return this.evaluate(e.test, t).__bool__().value
        ? this.evaluate(e.lhs, t)
        : new so();
    }
    evaluateUnaryExpression(e, t) {
      const n = this.evaluate(e.argument, t);
      if ('not' === e.operator.value) return new Qa(!n.value);
      throw new SyntaxError(`Unknown operator: ${e.operator.value}`);
    }
    evaluateTernaryExpression(e, t) {
      return this.evaluate(e.condition, t).__bool__().value
        ? this.evaluate(e.trueExpr, t)
        : this.evaluate(e.falseExpr, t);
    }
    evalProgram(e, t) {
      return this.evaluateBlock(e.body, t);
    }
    evaluateBlock(e, t) {
      let n = '';
      for (const r of e) {
        const e = this.evaluate(r, t);
        'NullValue' !== e.type &&
          'UndefinedValue' !== e.type &&
          (n += e.toString());
      }
      return new Ha(n);
    }
    evaluateIdentifier(e, t) {
      return t.lookupVariable(e.value);
    }
    evaluateCallExpression(e, t) {
      const [n, r] = this.evaluateArguments(e.args, t);
      r.size > 0 && n.push(new Za(r));
      const s = this.evaluate(e.callee, t);
      if ('FunctionValue' !== s.type)
        throw new Error(
          `Cannot call something that is not a function: got ${s.type}`
        );
      return s.value(n, t);
    }
    evaluateSliceExpression(e, t, n) {
      if (!(e instanceof eo || e instanceof Ha))
        throw new Error('Slice object must be an array or string');
      const r = this.evaluate(t.start, n),
        s = this.evaluate(t.stop, n),
        a = this.evaluate(t.step, n);
      if (!(r instanceof Wa || r instanceof so))
        throw new Error('Slice start must be numeric or undefined');
      if (!(s instanceof Wa || s instanceof so))
        throw new Error('Slice stop must be numeric or undefined');
      if (!(a instanceof Wa || a instanceof so))
        throw new Error('Slice step must be numeric or undefined');
      return e instanceof eo
        ? new eo(Ra(e.value, r.value, s.value, a.value))
        : new Ha(Ra(Array.from(e.value), r.value, s.value, a.value).join(''));
    }
    evaluateMemberExpression(e, t) {
      const n = this.evaluate(e.object, t);
      let r, s;
      if (e.computed) {
        if ('SliceExpression' === e.property.type)
          return this.evaluateSliceExpression(n, e.property, t);
        r = this.evaluate(e.property, t);
      } else r = new Ha(e.property.value);
      if (n instanceof Ka) {
        if (!(r instanceof Ha))
          throw new Error(
            `Cannot access property with non-string: got ${r.type}`
          );
        s = n.value.get(r.value) ?? n.builtins.get(r.value);
      } else if (n instanceof eo || n instanceof Ha)
        if (r instanceof Wa)
          ((s = n.value.at(r.value)),
            n instanceof Ha && (s = new Ha(n.value.at(r.value))));
        else {
          if (!(r instanceof Ha))
            throw new Error(
              `Cannot access property with non-string/non-number: got ${r.type}`
            );
          s = n.builtins.get(r.value);
        }
      else {
        if (!(r instanceof Ha))
          throw new Error(
            `Cannot access property with non-string: got ${r.type}`
          );
        s = n.builtins.get(r.value);
      }
      return s instanceof ja ? s : new so();
    }
    evaluateSet(e, t) {
      const n = e.value
        ? this.evaluate(e.value, t)
        : this.evaluateBlock(e.body, t);
      if ('Identifier' === e.assignee.type) {
        const r = e.assignee.value;
        t.setVariable(r, n);
      } else if ('TupleLiteral' === e.assignee.type) {
        const r = e.assignee;
        if (!(n instanceof eo))
          throw new Error(`Cannot unpack non-iterable type in set: ${n.type}`);
        const s = n.value;
        if (s.length !== r.value.length)
          throw new Error(
            `Too ${r.value.length > s.length ? 'few' : 'many'} items to unpack in set`
          );
        for (let e = 0; e < r.value.length; ++e) {
          const n = r.value[e];
          if ('Identifier' !== n.type)
            throw new Error(
              `Cannot unpack to non-identifier in set: ${n.type}`
            );
          t.setVariable(n.value, s[e]);
        }
      } else {
        if ('MemberExpression' !== e.assignee.type)
          throw new Error(
            `Invalid LHS inside assignment expression: ${JSON.stringify(e.assignee)}`
          );
        {
          const r = e.assignee,
            s = this.evaluate(r.object, t);
          if (!(s instanceof Ka))
            throw new Error('Cannot assign to member of non-object');
          if ('Identifier' !== r.property.type)
            throw new Error(
              'Cannot assign to member with non-identifier property'
            );
          s.value.set(r.property.value, n);
        }
      }
      return new ro();
    }
    evaluateIf(e, t) {
      const n = this.evaluate(e.test, t);
      return this.evaluateBlock(n.__bool__().value ? e.body : e.alternate, t);
    }
    evaluateFor(e, t) {
      const n = new ao(t);
      let r, s;
      if ('SelectExpression' === e.iterable.type) {
        const t = e.iterable;
        ((s = this.evaluate(t.lhs, n)), (r = t.test));
      } else s = this.evaluate(e.iterable, n);
      if (!(s instanceof eo || s instanceof Ka))
        throw new Error(
          `Expected iterable or object type in for loop: got ${s.type}`
        );
      s instanceof Ka && (s = s.keys());
      const a = [],
        o = [];
      for (let t = 0; t < s.value.length; ++t) {
        const i = new ao(n),
          l = s.value[t];
        let c;
        if ('Identifier' === e.loopvar.type)
          c = t => t.setVariable(e.loopvar.value, l);
        else {
          if ('TupleLiteral' !== e.loopvar.type)
            throw new Error(`Invalid loop variable(s): ${e.loopvar.type}`);
          {
            const t = e.loopvar;
            if ('ArrayValue' !== l.type)
              throw new Error(`Cannot unpack non-iterable type: ${l.type}`);
            const n = l;
            if (t.value.length !== n.value.length)
              throw new Error(
                `Too ${t.value.length > n.value.length ? 'few' : 'many'} items to unpack`
              );
            c = e => {
              for (let r = 0; r < t.value.length; ++r) {
                if ('Identifier' !== t.value[r].type)
                  throw new Error(
                    `Cannot unpack non-identifier type: ${t.value[r].type}`
                  );
                e.setVariable(t.value[r].value, n.value[r]);
              }
            };
          }
        }
        (r && (c(i), !this.evaluate(r, i).__bool__().value)) ||
          (a.push(l), o.push(c));
      }
      let i = '',
        l = !0;
      for (let t = 0; t < a.length; ++t) {
        const r = new Map([
          ['index', new Wa(t + 1)],
          ['index0', new Wa(t)],
          ['revindex', new Wa(a.length - t)],
          ['revindex0', new Wa(a.length - t - 1)],
          ['first', new Qa(0 === t)],
          ['last', new Qa(t === a.length - 1)],
          ['length', new Wa(a.length)],
          ['previtem', t > 0 ? a[t - 1] : new so()],
          ['nextitem', t < a.length - 1 ? a[t + 1] : new so()],
        ]);
        (n.setVariable('loop', new Ka(r)), o[t](n));
        try {
          i += this.evaluateBlock(e.body, n).value;
        } catch (e) {
          if (e instanceof Va) continue;
          if (e instanceof Ga) break;
          throw e;
        }
        l = !1;
      }
      return (
        l && (i += this.evaluateBlock(e.defaultBlock, n).value),
        new Ha(i)
      );
    }
    evaluateMacro(e, t) {
      return (
        t.setVariable(
          e.name.value,
          new no((t, n) => {
            const r = new ao(n);
            let s;
            ((t = t.slice()),
              'KeywordArgumentsValue' === t.at(-1)?.type && (s = t.pop()));
            for (let n = 0; n < e.args.length; ++n) {
              const a = e.args[n],
                o = t[n];
              if ('Identifier' === a.type) {
                const e = a;
                if (!o)
                  throw new Error(`Missing positional argument: ${e.value}`);
                r.setVariable(e.value, o);
              } else {
                if ('KeywordArgumentExpression' !== a.type)
                  throw new Error(`Unknown argument type: ${a.type}`);
                {
                  const e = a,
                    t =
                      o ??
                      s?.value.get(e.key.value) ??
                      this.evaluate(e.value, r);
                  r.setVariable(e.key.value, t);
                }
              }
            }
            return this.evaluateBlock(e.body, r);
          })
        ),
        new ro()
      );
    }
    evaluateCallStatement(e, t) {
      const n = new no((t, n) => {
          const r = new ao(n);
          if (e.callerArgs)
            for (let n = 0; n < e.callerArgs.length; ++n) {
              const s = e.callerArgs[n];
              if ('Identifier' !== s.type)
                throw new Error(
                  `Caller parameter must be an identifier, got ${s.type}`
                );
              r.setVariable(s.value, t[n] ?? new so());
            }
          return this.evaluateBlock(e.body, r);
        }),
        [r, s] = this.evaluateArguments(e.call.args, t);
      r.push(new Za(s));
      const a = this.evaluate(e.call.callee, t);
      if ('FunctionValue' !== a.type)
        throw new Error(
          `Cannot call something that is not a function: got ${a.type}`
        );
      const o = new ao(t);
      return (o.setVariable('caller', n), a.value(r, o));
    }
    evaluateFilterStatement(e, t) {
      const n = this.evaluateBlock(e.body, t);
      return this.applyFilter(n, e.filter, t);
    }
    evaluate(e, t) {
      if (!e) return new so();
      switch (e.type) {
        case 'Program':
          return this.evalProgram(e, t);
        case 'Set':
          return this.evaluateSet(e, t);
        case 'If':
          return this.evaluateIf(e, t);
        case 'For':
          return this.evaluateFor(e, t);
        case 'Macro':
          return this.evaluateMacro(e, t);
        case 'CallStatement':
          return this.evaluateCallStatement(e, t);
        case 'Break':
          throw new Ga();
        case 'Continue':
          throw new Va();
        case 'IntegerLiteral':
          return new Wa(e.value);
        case 'FloatLiteral':
          return new qa(e.value);
        case 'StringLiteral':
          return new Ha(e.value);
        case 'ArrayLiteral':
          return new eo(e.value.map(e => this.evaluate(e, t)));
        case 'TupleLiteral':
          return new to(e.value.map(e => this.evaluate(e, t)));
        case 'ObjectLiteral': {
          const n = new Map();
          for (const [r, s] of e.value) {
            const e = this.evaluate(r, t);
            if (!(e instanceof Ha))
              throw new Error(`Object keys must be strings: got ${e.type}`);
            n.set(e.value, this.evaluate(s, t));
          }
          return new Ka(n);
        }
        case 'Identifier':
          return this.evaluateIdentifier(e, t);
        case 'CallExpression':
          return this.evaluateCallExpression(e, t);
        case 'MemberExpression':
          return this.evaluateMemberExpression(e, t);
        case 'UnaryExpression':
          return this.evaluateUnaryExpression(e, t);
        case 'BinaryExpression':
          return this.evaluateBinaryExpression(e, t);
        case 'FilterExpression':
          return this.evaluateFilterExpression(e, t);
        case 'FilterStatement':
          return this.evaluateFilterStatement(e, t);
        case 'TestExpression':
          return this.evaluateTestExpression(e, t);
        case 'SelectExpression':
          return this.evaluateSelectExpression(e, t);
        case 'Ternary':
          return this.evaluateTernaryExpression(e, t);
        case 'Comment':
          return new ro();
        default:
          throw new SyntaxError(`Unknown node type: ${e.type}`);
      }
    }
  };
  function co(e) {
    switch (typeof e) {
      case 'number':
        return Number.isInteger(e) ? new Wa(e) : new qa(e);
      case 'string':
        return new Ha(e);
      case 'boolean':
        return new Qa(e);
      case 'undefined':
        return new so();
      case 'object':
        return null === e
          ? new ro()
          : Array.isArray(e)
            ? new eo(e.map(co))
            : new Ka(new Map(Object.entries(e).map(([e, t]) => [e, co(t)])));
      case 'function':
        return new no((t, n) => co(e(...t.map(e => e.value)) ?? null));
      default:
        throw new Error(`Cannot convert to runtime value: ${e}`);
    }
  }
  var uo = '\n';
  function po(...e) {
    return '{%- ' + e.join(' ') + ' -%}';
  }
  function ho(e, t, n) {
    return e
      .map(e =>
        (function (e, t, n) {
          const r = n.repeat(t);
          switch (e.type) {
            case 'Program':
              return ho(e.body, t, n);
            case 'If':
              return (function (e, t, n) {
                const r = n.repeat(t),
                  s = [];
                let a = e;
                for (
                  ;
                  a &&
                  (s.push({ test: a.test, body: a.body }),
                  1 === a.alternate.length && 'If' === a.alternate[0].type);

                )
                  a = a.alternate[0];
                let o =
                  r + po('if', fo(s[0].test)) + uo + ho(s[0].body, t + 1, n);
                for (let e = 1; e < s.length; ++e)
                  o +=
                    uo +
                    r +
                    po('elif', fo(s[e].test)) +
                    uo +
                    ho(s[e].body, t + 1, n);
                return (
                  a &&
                    a.alternate.length > 0 &&
                    (o += uo + r + po('else') + uo + ho(a.alternate, t + 1, n)),
                  (o += uo + r + po('endif')),
                  o
                );
              })(e, t, n);
            case 'For':
              return (function (e, t, n) {
                const r = n.repeat(t);
                let s = '';
                if ('SelectExpression' === e.iterable.type) {
                  const t = e.iterable;
                  s = `${fo(t.lhs)} if ${fo(t.test)}`;
                } else s = fo(e.iterable);
                let a =
                  r +
                  po('for', fo(e.loopvar), 'in', s) +
                  uo +
                  ho(e.body, t + 1, n);
                return (
                  e.defaultBlock.length > 0 &&
                    (a +=
                      uo + r + po('else') + uo + ho(e.defaultBlock, t + 1, n)),
                  (a += uo + r + po('endfor')),
                  a
                );
              })(e, t, n);
            case 'Set':
              return (function (e, t, n) {
                const r = n.repeat(t),
                  s = fo(e.assignee),
                  a = e.value ? fo(e.value) : '',
                  o = r + po('set', `${s}${e.value ? ' = ' + a : ''}`);
                return 0 === e.body.length
                  ? o
                  : o + uo + ho(e.body, t + 1, n) + uo + r + po('endset');
              })(e, t, n);
            case 'Macro':
              return (function (e, t, n) {
                const r = n.repeat(t),
                  s = e.args.map(fo).join(', ');
                return (
                  r +
                  po('macro', `${e.name.value}(${s})`) +
                  uo +
                  ho(e.body, t + 1, n) +
                  uo +
                  r +
                  po('endmacro')
                );
              })(e, t, n);
            case 'Break':
              return r + po('break');
            case 'Continue':
              return r + po('continue');
            case 'CallStatement':
              return (function (e, t, n) {
                const r = n.repeat(t);
                let s =
                  r +
                  po(
                    `call${e.callerArgs && e.callerArgs.length > 0 ? `(${e.callerArgs.map(fo).join(', ')})` : ''}`,
                    fo(e.call)
                  ) +
                  uo;
                return (
                  (s += ho(e.body, t + 1, n) + uo),
                  (s += r + po('endcall')),
                  s
                );
              })(e, t, n);
            case 'FilterStatement':
              return (function (e, t, n) {
                const r = n.repeat(t);
                let s =
                  r +
                  po(
                    'filter',
                    'Identifier' === e.filter.type
                      ? e.filter.value
                      : fo(e.filter)
                  ) +
                  uo;
                return (
                  (s += ho(e.body, t + 1, n) + uo),
                  (s += r + po('endfilter')),
                  s
                );
              })(e, t, n);
            case 'Comment':
              return r + '{# ' + e.value + ' #}';
            default:
              return r + '{{- ' + fo(e) + ' -}}';
          }
        })(e, t, n)
      )
      .join(uo);
  }
  function fo(e, t = -1) {
    switch (e.type) {
      case 'SpreadExpression':
        return `*${fo(e.argument)}`;
      case 'Identifier':
        return e.value;
      case 'IntegerLiteral':
      case 'FloatLiteral':
        return `${e.value}`;
      case 'StringLiteral':
        return JSON.stringify(e.value);
      case 'BinaryExpression': {
        const n = e,
          r = (function (e) {
            switch (e.operator.type) {
              case 'MultiplicativeBinaryOperator':
                return 4;
              case 'AdditiveBinaryOperator':
                return 3;
              case 'ComparisonBinaryOperator':
                return 2;
              case 'Identifier':
                return 'and' === e.operator.value
                  ? 1
                  : 'in' === e.operator.value || 'not in' === e.operator.value
                    ? 2
                    : 0;
            }
            return 0;
          })(n),
          s = fo(n.left, r),
          a = fo(n.right, r + 1),
          o = `${s} ${n.operator.value} ${a}`;
        return r < t ? `(${o})` : o;
      }
      case 'UnaryExpression': {
        const t = e;
        return (
          t.operator.value +
          ('not' === t.operator.value ? ' ' : '') +
          fo(t.argument, 1 / 0)
        );
      }
      case 'CallExpression': {
        const t = e,
          n = t.args.map(fo).join(', ');
        return `${fo(t.callee)}(${n})`;
      }
      case 'MemberExpression': {
        const t = e;
        let n = fo(t.object);
        [
          'Identifier',
          'MemberExpression',
          'CallExpression',
          'StringLiteral',
          'IntegerLiteral',
          'FloatLiteral',
          'ArrayLiteral',
          'TupleLiteral',
          'ObjectLiteral',
        ].includes(t.object.type) || (n = `(${n})`);
        let r = fo(t.property);
        return (
          t.computed || 'Identifier' === t.property.type || (r = `(${r})`),
          t.computed ? `${n}[${r}]` : `${n}.${r}`
        );
      }
      case 'FilterExpression': {
        const t = e,
          n = fo(t.operand, 1 / 0);
        return 'CallExpression' === t.filter.type
          ? `${n} | ${fo(t.filter)}`
          : `${n} | ${t.filter.value}`;
      }
      case 'SelectExpression': {
        const t = e;
        return `${fo(t.lhs)} if ${fo(t.test)}`;
      }
      case 'TestExpression': {
        const t = e;
        return `${fo(t.operand)} is${t.negate ? ' not' : ''} ${t.test.value}`;
      }
      case 'ArrayLiteral':
      case 'TupleLiteral': {
        const t = e.value.map(fo),
          n = 'ArrayLiteral' === e.type ? '[]' : '()';
        return `${n[0]}${t.join(', ')}${n[1]}`;
      }
      case 'ObjectLiteral': {
        const t = Array.from(e.value.entries()).map(
          ([e, t]) => `${fo(e)}: ${fo(t)}`
        );
        return `{${t.join(', ')}}`;
      }
      case 'SliceExpression': {
        const t = e;
        return `${t.start ? fo(t.start) : ''}:${t.stop ? fo(t.stop) : ''}${t.step ? `:${fo(t.step)}` : ''}`;
      }
      case 'KeywordArgumentExpression': {
        const t = e;
        return `${t.key.value}=${fo(t.value)}`;
      }
      case 'Ternary': {
        const n = e,
          r = `${fo(n.trueExpr)} if ${fo(n.condition, 0)} else ${fo(n.falseExpr)}`;
        return t > -1 ? `(${r})` : r;
      }
      default:
        throw new Error(`Unknown expression type: ${e.type}`);
    }
  }
  var _o = class {
      parsed;
      constructor(e) {
        const t = (function (e, t = {}) {
          const n = [],
            r = (function (e, t = {}) {
              return (
                e.endsWith('\n') && (e = e.slice(0, -1)),
                t.lstrip_blocks && (e = e.replace(/^[ \t]*({[#%-])/gm, '$1')),
                t.trim_blocks && (e = e.replace(/([#%-]})\n/g, '$1')),
                e.replace(/{%\s*(end)?generation\s*%}/gs, '')
              );
            })(e, t);
          let s = 0,
            a = 0;
          const o = e => {
              let t = '';
              for (; e(r[s]); ) {
                if ('\\' === r[s]) {
                  if ((++s, s >= r.length))
                    throw new SyntaxError('Unexpected end of input');
                  const e = r[s++],
                    n = oa.get(e);
                  if (void 0 === n)
                    throw new SyntaxError(`Unexpected escaped character: ${e}`);
                  t += n;
                  continue;
                }
                if (((t += r[s++]), s >= r.length))
                  throw new SyntaxError('Unexpected end of input');
              }
              return t;
            },
            i = () => {
              const e = n.at(-1);
              e &&
                e.type === ea.Text &&
                ((e.value = e.value.trimEnd()), '' === e.value && n.pop());
            },
            l = () => {
              for (; s < r.length && sa(r[s]); ) ++s;
            };
          e: for (; s < r.length; ) {
            const e = n.at(-1)?.type;
            if (
              void 0 === e ||
              e === ea.CloseStatement ||
              e === ea.CloseExpression ||
              e === ea.Comment
            ) {
              let e = '';
              for (
                ;
                s < r.length &&
                ('{' !== r[s] ||
                  ('%' !== r[s + 1] && '{' !== r[s + 1] && '#' !== r[s + 1]));

              )
                e += r[s++];
              if (e.length > 0) {
                n.push(new ta(e, ea.Text));
                continue;
              }
            }
            if ('{' === r[s] && '#' === r[s + 1]) {
              s += 2;
              const e = '-' === r[s];
              e && ++s;
              let t = '';
              for (; '#' !== r[s] || '}' !== r[s + 1]; ) {
                if (s + 2 >= r.length)
                  throw new SyntaxError('Missing end of comment tag');
                t += r[s++];
              }
              const a = t.endsWith('-');
              (a && (t = t.slice(0, -1)),
                e && i(),
                n.push(new ta(t, ea.Comment)),
                (s += 2),
                a && l());
              continue;
            }
            if ('{%-' === r.slice(s, s + 3)) {
              (i(), n.push(new ta('{%', ea.OpenStatement)), (s += 3));
              continue;
            }
            if ('{{-' === r.slice(s, s + 3)) {
              (i(), n.push(new ta('{{', ea.OpenExpression)), (a = 0), (s += 3));
              continue;
            }
            if ((o(sa), '-%}' === r.slice(s, s + 3))) {
              (n.push(new ta('%}', ea.CloseStatement)), (s += 3), l());
              continue;
            }
            if ('-}}' === r.slice(s, s + 3)) {
              (n.push(new ta('}}', ea.CloseExpression)), (s += 3), l());
              continue;
            }
            const t = r[s];
            if ('-' === t || '+' === t) {
              const e = n.at(-1)?.type;
              if (e === ea.Text || void 0 === e)
                throw new SyntaxError(`Unexpected character: ${t}`);
              switch (e) {
                case ea.Identifier:
                case ea.NumericLiteral:
                case ea.StringLiteral:
                case ea.CloseParen:
                case ea.CloseSquareBracket:
                  break;
                default: {
                  ++s;
                  const e = o(ra);
                  n.push(
                    new ta(
                      `${t}${e}`,
                      e.length > 0 ? ea.NumericLiteral : ea.UnaryOperator
                    )
                  );
                  continue;
                }
              }
            }
            for (const [e, t] of aa)
              if (!('}}' === e && a > 0) && r.slice(s, s + e.length) === e) {
                (n.push(new ta(e, t)),
                  t === ea.OpenExpression
                    ? (a = 0)
                    : t === ea.OpenCurlyBracket
                      ? ++a
                      : t === ea.CloseCurlyBracket && --a,
                  (s += e.length));
                continue e;
              }
            if ("'" === t || '"' === t) {
              ++s;
              const e = o(e => e !== t);
              (n.push(new ta(e, ea.StringLiteral)), ++s);
              continue;
            }
            if (ra(t)) {
              let e = o(ra);
              ('.' === r[s] && ra(r[s + 1]) && (++s, (e = `${e}.${o(ra)}`)),
                n.push(new ta(e, ea.NumericLiteral)));
              continue;
            }
            if (na(t)) {
              const e = o(na);
              n.push(new ta(e, ea.Identifier));
              continue;
            }
            throw new SyntaxError(`Unexpected character: ${t}`);
          }
          return n;
        })(e, { lstrip_blocks: !0, trim_blocks: !0 });
        this.parsed = $a(t);
      }
      render(e) {
        const t = new ao();
        if (
          ((function (e) {
            (e.set('false', !1),
              e.set('true', !0),
              e.set('none', null),
              e.set('raise_exception', e => {
                throw new Error(e);
              }),
              e.set('range', Da),
              e.set('strftime_now', Ua),
              e.set('True', !0),
              e.set('False', !1),
              e.set('None', null));
          })(t),
          e)
        )
          for (const [n, r] of Object.entries(e)) t.set(n, r);
        return new lo(t).run(this.parsed).value;
      }
      format(e) {
        return (function (e, t = '\t') {
          const n = 'number' == typeof t ? ' '.repeat(t) : t;
          return ho(e.body, 0, n).replace(/\n$/, '');
        })(this.parsed, e?.indent || '\t');
      }
    },
    mo = class {
      constructor() {
        let e = function (...t) {
          return e._call(...t);
        };
        return Object.setPrototypeOf(e, new.target.prototype);
      }
      _call(...e) {
        throw Error('Must implement _call method in subclass');
      }
    },
    go = {
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
    },
    wo = class e {
      constructor(e) {
        if (
          ((this.filePath = e),
          (this.headers = new Headers()),
          (this.exists = qn.existsSync(e)),
          this.exists)
        ) {
          ((this.status = 200), (this.statusText = 'OK'));
          let t = qn.statSync(e);
          (this.headers.set('content-length', t.size.toString()),
            this.updateContentType());
          const n = qn.createReadStream(e);
          this.body = new ReadableStream({
            start(e) {
              (n.on('data', t => e.enqueue(t)),
                n.on('end', () => e.close()),
                n.on('error', t => e.error(t)));
            },
            cancel() {
              n.destroy();
            },
          });
        } else
          ((this.status = 404),
            (this.statusText = 'Not Found'),
            (this.body = null));
      }
      updateContentType() {
        const e = this.filePath.toString().split('.').pop().toLowerCase();
        this.headers.set('content-type', go[e] ?? 'application/octet-stream');
      }
      clone() {
        let t = new e(this.filePath);
        return (
          (t.exists = this.exists),
          (t.status = this.status),
          (t.statusText = this.statusText),
          (t.headers = new Headers(this.headers)),
          t
        );
      }
      async arrayBuffer() {
        return (await qn.promises.readFile(this.filePath)).buffer;
      }
      async blob() {
        const e = await qn.promises.readFile(this.filePath);
        return new Blob([e], { type: this.headers.get('content-type') });
      }
      async text() {
        return await qn.promises.readFile(this.filePath, 'utf8');
      }
      async json() {
        return JSON.parse(await this.text());
      }
    },
    yo = class {
      constructor(e) {
        ((this._mt = new Uint32Array(624)),
          (this._idx = 625),
          (this._gauss_next = null),
          (this._random_fn = this.random.bind(this)),
          this.seed(e));
      }
      seed(e) {
        if (null == e)
          if (dr.IS_CRYPTO_AVAILABLE) {
            const t = new Uint32Array(1);
            (crypto.getRandomValues(t), (e = t[0]));
          } else e = Date.now() >>> 0;
        const t = this._mt,
          n = (e, t) => Math.imul(e, t) >>> 0,
          r = [];
        for (let t = e || 0; t > 0; t = Math.floor(t / 4294967296))
          r.push(4294967295 & t);
        (r.length || r.push(0), (t[0] = 19650218));
        for (let e = 1; e < 624; ++e)
          t[e] = (n(1812433253, t[e - 1] ^ (t[e - 1] >>> 30)) + e) >>> 0;
        let s = 1,
          a = 0;
        for (let e = Math.max(624, r.length); e > 0; --e, ++s, ++a)
          (s >= 624 && ((t[0] = t[623]), (s = 1)),
            a >= r.length && (a = 0),
            (t[s] =
              ((t[s] ^ n(t[s - 1] ^ (t[s - 1] >>> 30), 1664525)) + r[a] + a) >>>
              0));
        for (let e = 623; e > 0; --e, ++s)
          (s >= 624 && ((t[0] = t[623]), (s = 1)),
            (t[s] =
              ((t[s] ^ n(t[s - 1] ^ (t[s - 1] >>> 30), 1566083941)) - s) >>>
              0));
        ((t[0] = 2147483648), (this._idx = 624), (this._gauss_next = null));
      }
      _int32() {
        const e = this._mt;
        if (this._idx >= 624) {
          for (let t = 0; t < 624; ++t) {
            const n = (2147483648 & e[t]) | (2147483647 & e[(t + 1) % 624]);
            e[t] =
              (e[(t + 397) % 624] ^ (n >>> 1) ^ (1 & n ? 2567483615 : 0)) >>> 0;
          }
          this._idx = 0;
        }
        let t = e[this._idx++];
        return (
          (t ^= t >>> 11),
          (t ^= (t << 7) & 2636928640),
          (t ^= (t << 15) & 4022730752),
          (t ^= t >>> 18),
          t >>> 0
        );
      }
      random() {
        return (
          (67108864 * (this._int32() >>> 5) + (this._int32() >>> 6)) /
          9007199254740992
        );
      }
      gauss(e = 0, t = 1) {
        let n = this._gauss_next;
        if (((this._gauss_next = null), null === n)) {
          const e = 2 * this.random() * Math.PI,
            t = Math.sqrt(-2 * Math.log(1 - this.random()));
          ((n = Math.cos(e) * t), (this._gauss_next = Math.sin(e) * t));
        }
        return e + n * t;
      }
      shuffle(e) {
        for (let t = e.length - 1; t > 0; --t) {
          const n = 32 - Math.clz32(t + 1);
          let r = this._int32() >>> (32 - n);
          for (; r > t; ) r = this._int32() >>> (32 - n);
          const s = e[t];
          ((e[t] = e[r]), (e[r] = s));
        }
      }
      choices(e, t) {
        return e[bo(this._random_fn, t)];
      }
    };
  function bo(e, t) {
    let n = 0;
    for (let e = 0; e < t.length; ++e) n += t[e];
    let r = e() * n;
    for (let e = 0; e < t.length; ++e) if (((r -= t[e]), r < 0)) return e;
    return t.length - 1;
  }
  var vo = new yo(),
    xo = Object.freeze({
      Random: yo,
      seed: vo.seed.bind(vo),
      random: vo.random.bind(vo),
      gauss: vo.gauss.bind(vo),
      shuffle: vo.shuffle.bind(vo),
      choices: vo.choices.bind(vo),
    }),
    Mo = new yo(),
    ko = class {
      constructor(e) {
        this.path = e;
      }
      async match(e) {
        let t = Hn.join(this.path, e),
          n = new wo(t);
        return n.exists ? n : void 0;
      }
      async put(e, t, n = void 0) {
        const r = Hn.join(this.path, e),
          s =
            r +
            `.tmp.${dr.IS_PROCESS_AVAILABLE ? process.pid : Date.now()}.${Mo._int32().toString(36)}`;
        try {
          const e = t.headers.get('Content-Length'),
            a = parseInt(e ?? '0');
          let o = 0;
          await qn.promises.mkdir(Hn.dirname(r), { recursive: !0 });
          const i = qn.createWriteStream(s),
            l = t.body.getReader();
          for (;;) {
            const { done: e, value: t } = await l.read();
            if (e) break;
            (await new Promise((e, n) => {
              i.write(t, t => {
                t ? n(t) : e();
              });
            }),
              (o += t.length));
            const r = a ? (o / a) * 100 : 0;
            n?.({ progress: r, loaded: o, total: a });
          }
          (await new Promise((e, t) => {
            i.close(n => (n ? t(n) : e()));
          }),
            await qn.promises.rename(s, r));
        } catch (e) {
          try {
            await qn.promises.unlink(s);
          } catch {}
          throw e;
        }
      }
      async delete(e) {
        let t = Hn.join(this.path, e);
        try {
          return (await qn.promises.unlink(t), !0);
        } catch (e) {
          return !1;
        }
      }
    },
    Eo = {
      400: 'Bad request error occurred while trying to load file',
      401: 'Unauthorized access to file',
      403: 'Forbidden access to file',
      404: 'Could not locate file',
      408: 'Request timeout error occurred while trying to load file',
      500: 'Internal server error error occurred while trying to load file',
      502: 'Bad gateway error occurred while trying to load file',
      503: 'Service unavailable error occurred while trying to load file',
      504: 'Gateway timeout error occurred while trying to load file',
    },
    Ao = /^(\b[\w\-.]+\b\/)?\b[\w\-.]{1,96}\b$/;
  function To(...e) {
    return (e = e.map(
      (t, n) => (
        n && (t = t.replace(new RegExp('^/'), '')),
        n !== e.length - 1 && (t = t.replace(new RegExp('/$'), '')),
        t
      )
    )).join('/');
  }
  function Co(e, t = null, n = null) {
    let r;
    try {
      r = new URL(e);
    } catch (e) {
      return !1;
    }
    return !((t && !t.includes(r.protocol)) || (n && !n.includes(r.hostname)));
  }
  function So(e) {
    return Co(e, ['blob:']);
  }
  function Po(e) {
    let t;
    return (
      (t =
        'undefined' != typeof location && location.href
          ? location.href
          : 'file:///Users/alexandernodeland/anodeland/projects/code/websites/alexnodeland/node_modules/@huggingface/transformers/dist/transformers.web.js'),
      new URL(e, t).href
    );
  }
  async function Fo(e = null) {
    let t = null;
    if (br.useCustomCache) {
      if (!br.customCache)
        throw Error(
          '`env.useCustomCache=true`, but `env.customCache` is not defined.'
        );
      if (!br.customCache.match || !br.customCache.put)
        throw new Error(
          '`env.customCache` must be an object which implements the `match` and `put` functions of the Web Cache API. For more information, see https://developer.mozilla.org/en-US/docs/Web/API/Cache'
        );
      t = br.customCache;
    }
    if (!t && br.useBrowserCache) {
      if ('undefined' == typeof caches)
        throw Error('Browser cache is not available in this environment.');
      try {
        t = await caches.open(br.cacheKey);
      } catch (e) {
        Fr.warn('An error occurred while opening the browser cache:', e);
      }
    }
    if (!t && br.useFSCache) {
      if (!dr.IS_FS_AVAILABLE)
        throw Error('File System Cache is not available in this environment.');
      t = new ko(e ?? br.cacheDir);
    }
    return t;
  }
  async function Io(e, t, n = {}) {
    const r = await Fo(n?.cache_dir),
      {
        localPath: s,
        remoteURL: a,
        proposedCacheKey: o,
        validModelId: i,
      } = zo(e, t, n, r),
      l = await No(r, s, o);
    if (void 0 !== l && 'string' != typeof l) {
      const e = l.headers.get('content-length'),
        t = l.headers.get('content-type');
      return {
        exists: !0,
        size: e ? parseInt(e, 10) : void 0,
        contentType: t || void 0,
        fromCache: !0,
      };
    }
    if (br.allowLocalModels && !Co(s, ['http:', 'https:']))
      try {
        const e = await Oo(s);
        if ('string' != typeof e && 404 !== e.status) {
          const t = e.headers.get('content-length'),
            n = e.headers.get('content-type');
          return {
            exists: !0,
            size: t ? parseInt(t, 10) : void 0,
            contentType: n || void 0,
            fromCache: !1,
          };
        }
      } catch (e) {}
    if (br.allowRemoteModels && !n.local_files_only && i)
      try {
        const e = await (async function (e) {
          if (!Co(e, ['http:', 'https:'])) return null;
          const t = Lo(e);
          return (
            t.set('Range', 'bytes=0-0'),
            br.fetch(e, { method: 'GET', headers: t })
          );
        })(a);
        if (e && e.status >= 200 && e.status < 300) {
          let t;
          const n = e.headers.get('content-type');
          if (206 === e.status) {
            const n = e.headers.get('content-range');
            if (n) {
              const e = n.match(/bytes \d+-\d+\/(\d+)/);
              e && (t = parseInt(e[1], 10));
            }
          } else if (200 === e.status)
            try {
              await e.body?.cancel();
            } catch (e) {}
          if (void 0 === t) {
            const n = e.headers.get('content-length');
            t = n ? parseInt(n, 10) : void 0;
          }
          return {
            exists: !0,
            size: t,
            contentType: n || void 0,
            fromCache: !1,
          };
        }
      } catch (e) {
        Fr.warn(`Unable to fetch file metadata for "${a}": ${e}`);
      }
    return { exists: !1, fromCache: !1 };
  }
  async function Oo(e) {
    return br.useFS && !Co(e, ['http:', 'https:', 'blob:'])
      ? new wo(
          e instanceof URL
            ? 'file:' === e.protocol
              ? e.pathname
              : e.toString()
            : e
        )
      : br.fetch(e, { headers: Lo(e) });
  }
  function Lo(e) {
    const t =
        'undefined' != typeof process && 'node' === process?.release?.name,
      n = new Headers();
    if (t) {
      const t = !!process.env?.TESTING_REMOTELY,
        r = br.version;
      if (
        (n.set('User-Agent', `transformers.js/${r}; is_ci/${t};`),
        Co(e, ['http:', 'https:'], ['huggingface.co', 'hf.co']))
      ) {
        const e = process.env?.HF_TOKEN ?? process.env?.HF_ACCESS_TOKEN;
        e && n.set('Authorization', `Bearer ${e}`);
      }
    }
    return n;
  }
  function zo(e, t, n = {}, r = null) {
    const s = n.revision ?? 'main',
      a = To(e, t),
      o =
        ((i = e),
        !(
          !Ao.test(i) ||
          i.includes('..') ||
          i.includes('--') ||
          i.endsWith('.git') ||
          i.endsWith('.ipynb')
        ));
    var i;
    const l = o ? To(br.localModelPath, a) : a,
      c = To(
        br.remoteHost,
        br.remotePathTemplate
          .replaceAll('{model}', e)
          .replaceAll('{revision}', encodeURIComponent(s)),
        t
      );
    return {
      requestURL: a,
      localPath: l,
      remoteURL: c,
      proposedCacheKey: r instanceof ko ? ('main' === s ? a : To(e, s, t)) : c,
      validModelId: o,
    };
  }
  async function No(e, t, n) {
    if (e)
      return await (async function (e, ...t) {
        for (let n of t)
          try {
            let t = await e.match(n);
            if (t) return t;
          } catch (e) {
            continue;
          }
      })(e, t, n);
  }
  async function Bo(e, t, n = !0, r = {}, s = !1, a = null) {
    const {
      requestURL: o,
      localPath: i,
      remoteURL: l,
      proposedCacheKey: c,
      validModelId: u,
    } = zo(e, t, r, a);
    let d,
      p,
      h = !1;
    p = await No(a, i, c);
    const f = void 0 !== p;
    if (!f) {
      if (br.allowLocalModels)
        if (Co(o, ['http:', 'https:'])) {
          if (r.local_files_only)
            throw new Error(
              `\`local_files_only=true\`, but attempted to load a remote file from: ${o}.`
            );
          if (!br.allowRemoteModels)
            throw new Error(
              `\`env.allowRemoteModels=false\`, but attempted to load a remote file from: ${o}.`
            );
        } else
          try {
            ((p = await Oo(i)), (d = i));
          } catch (e) {
            Fr.warn(`Unable to load from local path "${i}": "${e}"`);
          }
      if (void 0 === p || ('string' != typeof p && 404 === p.status)) {
        if (r.local_files_only || !br.allowRemoteModels) {
          if (n)
            throw Error(
              `\`local_files_only=true\` or \`env.allowRemoteModels=false\` and file was not found locally at "${i}".`
            );
          return null;
        }
        if (!u)
          throw Error(
            `Local file missing at "${i}" and download aborted due to invalid model ID "${e}".`
          );
        if (((p = await Oo(l)), 200 !== p.status))
          return (function (e, t, n) {
            if (!n) return null;
            throw Error(
              `${Eo[e] ?? `Error (${e}) occurred while trying to load file`}: "${t}".`
            );
          })(p.status, l, n);
        d = c;
      }
      h =
        a &&
        'undefined' != typeof Response &&
        p instanceof Response &&
        200 === p.status;
    }
    let _;
    if (
      (xr(r.progress_callback, { status: 'download', name: e, file: t }),
      !dr.IS_NODE_ENV || !s)
    ) {
      let n;
      if ('string' != typeof p)
        if (r.progress_callback)
          if (
            f &&
            'undefined' != typeof navigator &&
            /firefox/i.test(navigator.userAgent)
          )
            ((n = new Uint8Array(await p.arrayBuffer())),
              xr(r.progress_callback, {
                status: 'progress',
                name: e,
                file: t,
                progress: 100,
                loaded: n.length,
                total: n.length,
              }));
          else {
            let s;
            const a = p.headers.get('content-length');
            if (a) s = parseInt(a, 10);
            else
              try {
                const n = await Io(e, t, r);
                n.size && (s = n.size);
              } catch (e) {}
            n = await (async function (n, s, a) {
              const o = n.headers.get('Content-Length');
              let i = o ? parseInt(o, 10) : (a ?? 0);
              null !== o ||
                a ||
                Fr.warn(
                  'Unable to determine content-length from response headers. Will expand buffer when needed.'
                );
              let l = new Uint8Array(i),
                c = 0;
              const u = n.body.getReader();
              return (
                await (async function n() {
                  const { done: s, value: a } = await u.read();
                  if (s) return;
                  const o = c + a.length;
                  if (o > i) {
                    i = o;
                    const e = new Uint8Array(i);
                    (e.set(l), (l = e));
                  }
                  return (
                    l.set(a, c),
                    (c = o),
                    (n => {
                      xr(r.progress_callback, {
                        status: 'progress',
                        name: e,
                        file: t,
                        ...n,
                      });
                    })({ progress: (c / i) * 100, loaded: c, total: i }),
                    n()
                  );
                })(),
                l
              );
            })(p, 0, s);
          }
        else n = new Uint8Array(await p.arrayBuffer());
      _ = n;
    }
    if (
      (h &&
        d &&
        'string' != typeof p &&
        (await (async function (e, t, n, r, s, a, o = {}) {
          if (void 0 === (await n.match(r)))
            if (a)
              'string' != typeof s &&
                (await n
                  .put(r, new Response(a, { headers: s.headers }))
                  .catch(e => {
                    Fr.warn(`Unable to add response to browser cache: ${e}.`);
                  }));
            else {
              const a = o.progress_callback
                ? n =>
                    xr(o.progress_callback, {
                      status: 'progress',
                      name: e,
                      file: t,
                      ...n,
                    })
                : void 0;
              await n.put(r, s, a);
            }
        })(e, t, a, d, p, _, r)),
      xr(r.progress_callback, { status: 'done', name: e, file: t }),
      _)
    ) {
      if (!dr.IS_NODE_ENV && s)
        throw new Error('Cannot return path in a browser environment.');
      return _;
    }
    if (p instanceof wo) return p.filePath;
    const m = await a?.match(d);
    if (m instanceof wo) return m.filePath;
    if (m instanceof Response) return new Uint8Array(await m.arrayBuffer());
    if ('string' == typeof m) return m;
    throw new Error('Unable to get model file path or buffer.');
  }
  async function $o(e, t, n = !0, r = {}, s = !1) {
    if (!br.allowLocalModels) {
      if (r.local_files_only)
        throw Error(
          'Invalid configuration detected: local models are disabled (`env.allowLocalModels=false`) but you have requested to only use local models (`local_files_only=true`).'
        );
      if (!br.allowRemoteModels)
        throw Error(
          'Invalid configuration detected: both local and remote models are disabled. Fix by setting `env.allowLocalModels` or `env.allowRemoteModels` to `true`.'
        );
    }
    xr(r.progress_callback, { status: 'initiate', name: e, file: t });
    const a = await Fo(r?.cache_dir);
    return await Bo(e, t, n, r, s, a);
  }
  async function Do(e, t, n = !0, r = {}) {
    const s = await $o(e, t, n, r, !1);
    return null === s ? null : new TextDecoder('utf-8').decode(s);
  }
  async function Ro(e, t, n = !0, r = {}) {
    const s = await Do(e, t, n, r);
    return null === s ? {} : JSON.parse(s);
  }
  function Uo(e) {
    const t = jo(e)[0],
      n = e.map(e => Math.exp(e - t)),
      r = n.reduce((e, t) => e + t, 0);
    return n.map(e => e / r);
  }
  function Go(e) {
    const t = jo(e)[0];
    let n = 0;
    for (let r = 0; r < e.length; ++r) n += Math.exp(e[r] - t);
    const r = Math.log(n);
    return e.map(e => e - t - r);
  }
  function Vo(e) {
    if (0 === e.length) throw Error('Array must not be empty');
    let t = e[0],
      n = 0;
    for (let r = 1; r < e.length; ++r) e[r] < t && ((t = e[r]), (n = r));
    return [t, n];
  }
  function jo(e) {
    if (0 === e.length) throw Error('Array must not be empty');
    let t = e[0],
      n = 0;
    for (let r = 1; r < e.length; ++r) e[r] > t && ((t = e[r]), (n = r));
    return [t, n];
  }
  function Wo(e) {
    return e > 0 && !(e & (e - 1));
  }
  var qo = class {
      constructor(e) {
        if (((this.size = 0 | e), this.size <= 1 || !Wo(this.size)))
          throw new Error('FFT size must be a power of two larger than 1');
        ((this._csize = e << 1),
          (this.table = new Float64Array(2 * this.size)));
        for (let e = 0; e < this.table.length; e += 2) {
          const t = (Math.PI * e) / this.size;
          ((this.table[e] = Math.cos(t)), (this.table[e + 1] = -Math.sin(t)));
        }
        let t = 0;
        for (let e = 1; this.size > e; e <<= 1) ++t;
        ((this._width = t % 2 == 0 ? t - 1 : t),
          (this._bitrev = new Int32Array(1 << this._width)));
        for (let e = 0; e < this._bitrev.length; ++e) {
          this._bitrev[e] = 0;
          for (let t = 0; t < this._width; t += 2) {
            const n = this._width - t - 2;
            this._bitrev[e] |= ((e >>> t) & 3) << n;
          }
        }
      }
      createComplexArray() {
        return new Float64Array(this._csize);
      }
      fromComplexArray(e, t) {
        const n = t || new Array(e.length >>> 1);
        for (let t = 0; t < e.length; t += 2) n[t >>> 1] = e[t];
        return n;
      }
      toComplexArray(e, t) {
        const n = t || this.createComplexArray();
        for (let t = 0; t < n.length; t += 2)
          ((n[t] = e[t >>> 1]), (n[t + 1] = 0));
        return n;
      }
      transform(e, t) {
        if (e === t)
          throw new Error('Input and output buffers must be different');
        this._transform4(e, t, 1);
      }
      realTransform(e, t) {
        if (e === t)
          throw new Error('Input and output buffers must be different');
        this._realTransform4(e, t, 1);
      }
      inverseTransform(e, t) {
        if (e === t)
          throw new Error('Input and output buffers must be different');
        this._transform4(e, t, -1);
        for (let t = 0; t < e.length; ++t) e[t] /= this.size;
      }
      _transform4(e, t, n) {
        const r = this._csize;
        let s,
          a,
          o = 1 << this._width,
          i = (r / o) << 1;
        const l = this._bitrev;
        if (4 === i)
          for (s = 0, a = 0; s < r; s += i, ++a) {
            const n = l[a];
            this._singleTransform2(t, e, s, n, o);
          }
        else
          for (s = 0, a = 0; s < r; s += i, ++a) {
            const r = l[a];
            this._singleTransform4(t, e, s, r, o, n);
          }
        const c = this.table;
        for (o >>= 2; o >= 2; o >>= 2) {
          i = (r / o) << 1;
          const t = i >>> 2;
          for (s = 0; s < r; s += i) {
            const r = s + t - 1;
            for (let a = s, i = 0; a < r; a += 2, i += o) {
              const r = a,
                s = r + t,
                o = s + t,
                l = o + t,
                u = e[r],
                d = e[r + 1],
                p = e[s],
                h = e[s + 1],
                f = e[o],
                _ = e[o + 1],
                m = e[l],
                g = e[l + 1],
                w = c[i],
                y = n * c[i + 1],
                b = p * w - h * y,
                v = p * y + h * w,
                x = c[2 * i],
                M = n * c[2 * i + 1],
                k = f * x - _ * M,
                E = f * M + _ * x,
                A = c[3 * i],
                T = n * c[3 * i + 1],
                C = m * A - g * T,
                S = m * T + g * A,
                P = u + k,
                F = d + E,
                I = u - k,
                O = d - E,
                L = b + C,
                z = v + S,
                N = n * (b - C),
                B = n * (v - S);
              ((e[r] = P + L),
                (e[r + 1] = F + z),
                (e[s] = I + B),
                (e[s + 1] = O - N),
                (e[o] = P - L),
                (e[o + 1] = F - z),
                (e[l] = I - B),
                (e[l + 1] = O + N));
            }
          }
        }
      }
      _singleTransform2(e, t, n, r, s) {
        const a = e[r],
          o = e[r + 1],
          i = e[r + s],
          l = e[r + s + 1];
        ((t[n] = a + i),
          (t[n + 1] = o + l),
          (t[n + 2] = a - i),
          (t[n + 3] = o - l));
      }
      _singleTransform4(e, t, n, r, s, a) {
        const o = 2 * s,
          i = 3 * s,
          l = e[r],
          c = e[r + 1],
          u = e[r + s],
          d = e[r + s + 1],
          p = e[r + o],
          h = e[r + o + 1],
          f = e[r + i],
          _ = e[r + i + 1],
          m = l + p,
          g = c + h,
          w = l - p,
          y = c - h,
          b = u + f,
          v = d + _,
          x = a * (u - f),
          M = a * (d - _);
        ((t[n] = m + b),
          (t[n + 1] = g + v),
          (t[n + 2] = w + M),
          (t[n + 3] = y - x),
          (t[n + 4] = m - b),
          (t[n + 5] = g - v),
          (t[n + 6] = w - M),
          (t[n + 7] = y + x));
      }
      _realTransform4(e, t, n) {
        const r = this._csize;
        let s,
          a,
          o = 1 << this._width,
          i = (r / o) << 1;
        const l = this._bitrev;
        if (4 === i)
          for (s = 0, a = 0; s < r; s += i, ++a) {
            const n = l[a];
            this._singleRealTransform2(t, e, s, n >>> 1, o >>> 1);
          }
        else
          for (s = 0, a = 0; s < r; s += i, ++a) {
            const r = l[a];
            this._singleRealTransform4(t, e, s, r >>> 1, o >>> 1, n);
          }
        const c = this.table;
        for (o >>= 2; o >= 2; o >>= 2) {
          i = (r / o) << 1;
          const t = i >>> 1,
            a = t >>> 1,
            l = a >>> 1;
          for (s = 0; s < r; s += i)
            for (let r = 0, i = 0; r <= l; r += 2, i += o) {
              const o = s + r,
                u = o + a,
                d = u + a,
                p = d + a,
                h = e[o],
                f = e[o + 1],
                _ = e[u],
                m = e[u + 1],
                g = e[d],
                w = e[d + 1],
                y = e[p],
                b = e[p + 1],
                v = h,
                x = f,
                M = c[i],
                k = n * c[i + 1],
                E = _ * M - m * k,
                A = _ * k + m * M,
                T = c[2 * i],
                C = n * c[2 * i + 1],
                S = g * T - w * C,
                P = g * C + w * T,
                F = c[3 * i],
                I = n * c[3 * i + 1],
                O = y * F - b * I,
                L = y * I + b * F,
                z = v + S,
                N = x + P,
                B = v - S,
                $ = x - P,
                D = E + O,
                R = A + L,
                U = n * (E - O),
                G = n * (A - L);
              if (
                ((e[o] = z + D),
                (e[o + 1] = N + R),
                (e[u] = B + G),
                (e[u + 1] = $ - U),
                0 === r)
              ) {
                ((e[d] = z - D), (e[d + 1] = N - R));
                continue;
              }
              if (r === l) continue;
              const V = s + a - r,
                j = s + t - r;
              ((e[V] = B - n * G),
                (e[V + 1] = -$ - n * U),
                (e[j] = z - n * D),
                (e[j + 1] = n * R - N));
            }
        }
        const u = r >>> 1;
        for (let t = 2; t < u; t += 2)
          ((e[r - t] = e[t]), (e[r - t + 1] = -e[t + 1]));
      }
      _singleRealTransform2(e, t, n, r, s) {
        const a = e[r],
          o = e[r + s];
        ((t[n] = a + o), (t[n + 1] = 0), (t[n + 2] = a - o), (t[n + 3] = 0));
      }
      _singleRealTransform4(e, t, n, r, s, a) {
        const o = 2 * s,
          i = 3 * s,
          l = e[r],
          c = e[r + s],
          u = e[r + o],
          d = e[r + i],
          p = l + u,
          h = l - u,
          f = c + d,
          _ = a * (c - d);
        ((t[n] = p + f),
          (t[n + 1] = 0),
          (t[n + 2] = h),
          (t[n + 3] = -_),
          (t[n + 4] = p - f),
          (t[n + 5] = 0),
          (t[n + 6] = h),
          (t[n + 7] = _));
      }
    },
    Ho = class {
      constructor(e) {
        const t = 2 * (e - 1),
          n = 2 * (2 * e - 1),
          r = 2 ** Math.ceil(Math.log2(n));
        ((this.bufferSize = r), (this._a = t));
        const s = new Float64Array(n),
          a = new Float64Array(r);
        ((this._chirpBuffer = new Float64Array(r)),
          (this._buffer1 = new Float64Array(r)),
          (this._buffer2 = new Float64Array(r)),
          (this._outBuffer1 = new Float64Array(r)),
          (this._outBuffer2 = new Float64Array(r)));
        const o = (-2 * Math.PI) / e,
          i = Math.cos(o),
          l = Math.sin(o);
        for (let t = 0; t < n >> 1; ++t) {
          const n = (t + 1 - e) ** 2 / 2,
            r = Math.sqrt(i ** 2 + l ** 2) ** n,
            o = n * Math.atan2(l, i),
            c = 2 * t;
          ((s[c] = r * Math.cos(o)),
            (s[c + 1] = r * Math.sin(o)),
            (a[c] = s[c]),
            (a[c + 1] = -s[c + 1]));
        }
        ((this._slicedChirpBuffer = s.subarray(t, n)),
          (this._f = new qo(r >> 1)),
          this._f.transform(this._chirpBuffer, a));
      }
      _transform(e, t, n) {
        const r = this._buffer1,
          s = this._buffer2,
          a = this._outBuffer1,
          o = this._outBuffer2,
          i = this._chirpBuffer,
          l = this._slicedChirpBuffer,
          c = this._a;
        if (n)
          for (let e = 0; e < l.length; e += 2) {
            const n = e + 1,
              s = t[e >> 1];
            ((r[e] = s * l[e]), (r[n] = s * l[n]));
          }
        else
          for (let e = 0; e < l.length; e += 2) {
            const n = e + 1;
            ((r[e] = t[e] * l[e] - t[n] * l[n]),
              (r[n] = t[e] * l[n] + t[n] * l[e]));
          }
        this._f.transform(a, r);
        for (let e = 0; e < i.length; e += 2) {
          const t = e + 1;
          ((s[e] = a[e] * i[e] - a[t] * i[t]),
            (s[t] = a[e] * i[t] + a[t] * i[e]));
        }
        this._f.inverseTransform(o, s);
        for (let t = 0; t < o.length; t += 2) {
          const n = o[t + c],
            r = o[t + c + 1],
            s = l[t],
            a = l[t + 1];
          ((e[t] = n * s - r * a), (e[t + 1] = n * a + r * s));
        }
      }
      transform(e, t) {
        this._transform(e, t, !1);
      }
      realTransform(e, t) {
        this._transform(e, t, !0);
      }
    },
    Qo = class {
      constructor(e) {
        ((this.fft_length = e),
          (this.isPowerOfTwo = Wo(e)),
          this.isPowerOfTwo
            ? ((this.fft = new qo(e)), (this.outputBufferSize = 2 * e))
            : ((this.fft = new Ho(e)),
              (this.outputBufferSize = this.fft.bufferSize)));
      }
      realTransform(e, t) {
        this.fft.realTransform(e, t);
      }
      transform(e, t) {
        this.fft.transform(e, t);
      }
    };
  function Xo(e, t) {
    if (t % 2 == 0 || t <= 0)
      throw new Error('Window size must be a positive odd number');
    const n = new e.constructor(e.length),
      r = new e.constructor(t),
      s = Math.floor(t / 2);
    for (let t = 0; t < e.length; ++t) {
      let a = 0;
      for (let n = -s; n <= s; ++n) {
        let s = t + n;
        (s < 0
          ? (s = Math.abs(s))
          : s >= e.length && (s = 2 * (e.length - 1) - s),
          (r[a++] = e[s]));
      }
      (r.sort(), (n[t] = r[s]));
    }
    return n;
  }
  function Yo(e, t) {
    const n = Math.pow(10, t);
    return Math.round(e * n) / n;
  }
  function Jo(e) {
    const t = e.length,
      n = e[0].length,
      r = [t + 1, n + 1],
      s = Array.from({ length: r[0] }, () => Array(r[1]).fill(1 / 0));
    s[0][0] = 0;
    const a = Array.from({ length: r[0] }, () => Array(r[1]).fill(-1));
    for (let t = 1; t < r[1]; ++t)
      for (let n = 1; n < r[0]; ++n) {
        const r = s[n - 1][t - 1],
          o = s[n - 1][t],
          i = s[n][t - 1];
        let l, c;
        (r < o && r < i
          ? ((l = r), (c = 0))
          : o < r && o < i
            ? ((l = o), (c = 1))
            : ((l = i), (c = 2)),
          (s[n][t] = e[n - 1][t - 1] + l),
          (a[n][t] = c));
      }
    for (let e = 0; e < r[1]; ++e) a[0][e] = 2;
    for (let e = 0; e < r[0]; ++e) a[e][0] = 1;
    let o = t,
      i = n,
      l = [],
      c = [];
    for (; o > 0 || i > 0; )
      switch ((l.push(o - 1), c.push(i - 1), a[o][i])) {
        case 0:
          (--o, --i);
          break;
        case 1:
          --o;
          break;
        case 2:
          --i;
          break;
        default:
          throw new Error(
            `Internal error in dynamic time warping. Unexpected trace[${o}, ${i}]. Please file a bug report.`
          );
      }
    return (l.reverse(), c.reverse(), [l, c]);
  }
  var Ko = (function () {
      let e = null;
      return function (t) {
        if (!e) {
          e = new Float32Array(65536);
          const t = new ArrayBuffer(4),
            n = new Uint32Array(t),
            r = new Float32Array(t);
          for (let t = 0; t < e.length; ++t) {
            let s = 0;
            const a = (32768 & t) << 16,
              o = (31744 & t) >> 10;
            let i = 1023 & t;
            if (31 === o) s = 2139095040 | a | (i << 13);
            else if (0 === o)
              if (0 === i) s = a;
              else {
                let e = 113;
                for (; !(1024 & i); ) ((i <<= 1), --e);
                ((i &= -1025), (s = a | (e << 23) | (i << 13)));
              }
            else s = a | ((o + 112) << 23) | (i << 13);
            ((n[0] = s), (e[t] = r[0]));
          }
        }
        const n = t.length,
          r = e,
          s = new Float32Array(n);
        for (let e = 0; e < n; ++e) s[e] = r[t[e]];
        return s;
      };
    })(),
    Zo = {};
  Wn(Zo, { default: () => ei });
  var ei = {};
  async function ti(e) {
    const t = e.split('/').pop();
    let n;
    try {
      if (((n = await Fo()), n)) {
        const t = await n.match(e);
        if (t) return t;
      }
    } catch (e) {
      Fr.warn(`Failed to load ${t} from cache:`, e);
    }
    const r = await br.fetch(e);
    if (!r.ok)
      throw new Error(`Failed to fetch ${t}: ${r.status} ${r.statusText}`);
    if (n)
      try {
        await n.put(e, r.clone());
      } catch (e) {
        Fr.warn(`Failed to cache ${t}:`, e);
      }
    return r;
  }
  var ni = Object.freeze({
    auto: null,
    gpu: null,
    cpu: 'cpu',
    wasm: 'wasm',
    webgpu: 'webgpu',
    cuda: 'cuda',
    dml: 'dml',
    coreml: 'coreml',
    webnn: { name: 'webnn', deviceType: 'cpu' },
    'webnn-npu': { name: 'webnn', deviceType: 'npu' },
    'webnn-gpu': { name: 'webnn', deviceType: 'gpu' },
    'webnn-cpu': { name: 'webnn', deviceType: 'cpu' },
  });
  function ri(e) {
    return e <= wr.DEBUG
      ? 0
      : e <= wr.INFO
        ? 2
        : e <= wr.WARNING || e <= wr.ERROR
          ? 3
          : 4;
  }
  var si,
    ai,
    oi = { 0: 'verbose', 1: 'info', 2: 'warning', 3: 'error', 4: 'fatal' },
    ii = [],
    li = Symbol.for('onnxruntime');
  if (li in globalThis) ai = globalThis[li];
  else if (dr.IS_NODE_ENV) {
    switch (((ai = Zo), process.platform)) {
      case 'win32':
        ii.push('dml');
        break;
      case 'linux':
        'x64' === process.arch && ii.push('cuda');
        break;
      case 'darwin':
        ii.push('coreml');
    }
    (ii.push('webgpu'), ii.push('cpu'), (si = ['cpu']));
  } else
    ((ai = r),
      dr.IS_WEBNN_AVAILABLE &&
        ii.push('webnn-npu', 'webnn-gpu', 'webnn-cpu', 'webnn'),
      dr.IS_WEBGPU_AVAILABLE && ii.push('webgpu'),
      ii.push('wasm'),
      (si = ['wasm']));
  var ci = ai.InferenceSession,
    ui = Promise.resolve(),
    di = null;
  async function pi(e, t, n) {
    await (async function () {
      if (di) return di;
      if (
        !(
          br.useWasmCache &&
          'object' == typeof mi?.wasm?.wasmPaths &&
          mi?.wasm?.wasmPaths?.wasm &&
          mi?.wasm?.wasmPaths?.mjs
        )
      ) {
        if (dr.IS_DENO_WEB_RUNTIME)
          throw new Error(
            "env.useWasmCache=false is not supported in Deno's web runtime. Remove the useWasmCache override."
          );
        return (di = Promise.resolve());
      }
      return (di = (async () => {
        const e = mi.wasm.wasmPaths;
        let t = !1;
        (await Promise.all([
          e.wasm && !So(e.wasm)
            ? (async () => {
                try {
                  const n = await (async function (e) {
                    const t = await ti(e);
                    if (!t || 'string' == typeof t) return null;
                    try {
                      return await t.arrayBuffer();
                    } catch (e) {
                      return (Fr.warn('Failed to read WASM binary:', e), null);
                    }
                  })(Po(e.wasm));
                  n && ((mi.wasm.wasmBinary = n), (t = !0));
                } catch (e) {
                  Fr.warn('Failed to pre-load WASM binary:', e);
                }
              })()
            : Promise.resolve(),
          e.mjs && !So(e.mjs)
            ? (async () => {
                try {
                  const t = await (async function (e) {
                    if (dr.IS_SERVICE_WORKER_ENV || dr.IS_CHROME_AVAILABLE)
                      return e;
                    const t = await ti(e);
                    if (!t || 'string' == typeof t) return null;
                    try {
                      let e = await t.text();
                      e = e.replaceAll(
                        'globalThis.process?.versions?.node',
                        'false'
                      );
                      const n = new Blob([e], { type: 'text/javascript' });
                      return URL.createObjectURL(n);
                    } catch (e) {
                      return (Fr.warn('Failed to read WASM factory:', e), null);
                    }
                  })(Po(e.mjs));
                  t && (mi.wasm.wasmPaths.mjs = t);
                } catch (e) {
                  Fr.warn('Failed to pre-load WASM factory:', e);
                }
              })()
            : Promise.resolve(),
        ]),
          t || (mi.wasm.wasmPaths.mjs = e.mjs));
      })());
    })();
    const r = ri(br.logLevel ?? wr.WARNING),
      s = () => ci.create(e, { logSeverityLevel: r, ...t }),
      a = await (dr.IS_WEB_ENV ? (ui = ui.then(s)) : s());
    return ((a.config = n), a);
  }
  var hi = Promise.resolve();
  async function fi(e, t) {
    const n = () => e.run(t);
    return dr.IS_WEB_ENV ? (hi = hi.then(n)) : n();
  }
  function _i(e) {
    return e instanceof ai.Tensor;
  }
  var mi = ai?.env;
  function gi() {
    return mi?.wasm?.proxy;
  }
  if (mi) {
    let e = function (e) {
      const t = ri(e);
      mi.logLevel = oi[t];
    };
    if (mi.wasm) {
      if (
        !(
          'undefined' != typeof ServiceWorkerGlobalScope &&
          self instanceof ServiceWorkerGlobalScope
        ) &&
        mi.versions?.web &&
        !mi.wasm.wasmPaths
      ) {
        const e = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${mi.versions.web}/dist/`;
        mi.wasm.wasmPaths = dr.IS_SAFARI
          ? {
              mjs: `${e}ort-wasm-simd-threaded.mjs`,
              wasm: `${e}ort-wasm-simd-threaded.wasm`,
            }
          : {
              mjs: `${e}ort-wasm-simd-threaded.asyncify.mjs`,
              wasm: `${e}ort-wasm-simd-threaded.asyncify.wasm`,
            };
      }
      mi.wasm.proxy = !1;
    }
    (mi.webgpu && (mi.webgpu.powerPreference = 'high-performance'),
      e(br.logLevel ?? wr.WARNING),
      (br.backends.onnx = { ...mi, setLogLevel: e }));
  }
  var wi = async (e, t, n) => {
      const r = await pi(new Uint8Array(e), t);
      return async e => {
        const t = gi(),
          s = Object.fromEntries(
            Object.entries(e).map(([e, n]) => [
              e,
              (t ? n.clone() : n).ort_tensor,
            ])
          ),
          a = await fi(r, s);
        return Array.isArray(n) ? n.map(e => new Ci(a[e])) : new Ci(a[n]);
      };
    },
    yi = class {
      static session_options = {};
      static get nearest_interpolate_4d() {
        return (
          this._nearest_interpolate_4d ||
            (this._nearest_interpolate_4d = wi(
              [
                8, 10, 18, 0, 58, 129, 1, 10, 41, 10, 1, 120, 10, 0, 10, 0, 10,
                1, 115, 18, 1, 121, 34, 6, 82, 101, 115, 105, 122, 101, 42, 18,
                10, 4, 109, 111, 100, 101, 34, 7, 110, 101, 97, 114, 101, 115,
                116, 160, 1, 3, 18, 1, 114, 90, 31, 10, 1, 120, 18, 26, 10, 24,
                8, 1, 18, 20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1,
                104, 10, 3, 18, 1, 119, 90, 15, 10, 1, 115, 18, 10, 10, 8, 8, 7,
                18, 4, 10, 2, 8, 4, 98, 31, 10, 1, 121, 18, 26, 10, 24, 8, 1,
                18, 20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104,
                10, 3, 18, 1, 119, 66, 2, 16, 21,
              ],
              this.session_options,
              'y'
            )),
          this._nearest_interpolate_4d
        );
      }
      static get bilinear_interpolate_4d() {
        return (
          this._bilinear_interpolate_4d ||
            (this._bilinear_interpolate_4d = wi(
              [
                8, 9, 18, 0, 58, 128, 1, 10, 40, 10, 1, 120, 10, 0, 10, 0, 10,
                1, 115, 18, 1, 121, 34, 6, 82, 101, 115, 105, 122, 101, 42, 17,
                10, 4, 109, 111, 100, 101, 34, 6, 108, 105, 110, 101, 97, 114,
                160, 1, 3, 18, 1, 114, 90, 31, 10, 1, 120, 18, 26, 10, 24, 8, 1,
                18, 20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104,
                10, 3, 18, 1, 119, 90, 15, 10, 1, 115, 18, 10, 10, 8, 8, 7, 18,
                4, 10, 2, 8, 4, 98, 31, 10, 1, 121, 18, 26, 10, 24, 8, 1, 18,
                20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104, 10,
                3, 18, 1, 119, 66, 2, 16, 20,
              ],
              this.session_options,
              'y'
            )),
          this._bilinear_interpolate_4d
        );
      }
      static get bicubic_interpolate_4d() {
        return (
          this._bicubic_interpolate_4d ||
            (this._bicubic_interpolate_4d = wi(
              [
                8, 9, 18, 0, 58, 127, 10, 39, 10, 1, 120, 10, 0, 10, 0, 10, 1,
                115, 18, 1, 121, 34, 6, 82, 101, 115, 105, 122, 101, 42, 16, 10,
                4, 109, 111, 100, 101, 34, 5, 99, 117, 98, 105, 99, 160, 1, 3,
                18, 1, 114, 90, 31, 10, 1, 120, 18, 26, 10, 24, 8, 1, 18, 20,
                10, 3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104, 10, 3,
                18, 1, 119, 90, 15, 10, 1, 115, 18, 10, 10, 8, 8, 7, 18, 4, 10,
                2, 8, 4, 98, 31, 10, 1, 121, 18, 26, 10, 24, 8, 1, 18, 20, 10,
                3, 18, 1, 98, 10, 3, 18, 1, 99, 10, 3, 18, 1, 104, 10, 3, 18, 1,
                119, 66, 2, 16, 20,
              ],
              this.session_options,
              'y'
            )),
          this._bicubic_interpolate_4d
        );
      }
      static get matmul() {
        return (
          this._matmul ||
            (this._matmul = wi(
              [
                8, 9, 18, 0, 58, 55, 10, 17, 10, 1, 97, 10, 1, 98, 18, 1, 99,
                34, 6, 77, 97, 116, 77, 117, 108, 18, 1, 114, 90, 9, 10, 1, 97,
                18, 4, 10, 2, 8, 1, 90, 9, 10, 1, 98, 18, 4, 10, 2, 8, 1, 98, 9,
                10, 1, 99, 18, 4, 10, 2, 8, 1, 66, 2, 16, 20,
              ],
              this.session_options,
              'c'
            )),
          this._matmul
        );
      }
      static get stft() {
        return (
          this._stft ||
            (this._stft = wi(
              [
                8, 7, 18, 0, 58, 148, 1, 10, 38, 10, 1, 115, 10, 1, 106, 10, 1,
                119, 10, 1, 108, 18, 1, 111, 34, 4, 83, 84, 70, 84, 42, 15, 10,
                8, 111, 110, 101, 115, 105, 100, 101, 100, 24, 1, 160, 1, 2, 18,
                1, 115, 90, 26, 10, 1, 115, 18, 21, 10, 19, 8, 1, 18, 15, 10, 3,
                18, 1, 98, 10, 3, 18, 1, 115, 10, 3, 18, 1, 99, 90, 11, 10, 1,
                106, 18, 6, 10, 4, 8, 7, 18, 0, 90, 16, 10, 1, 119, 18, 11, 10,
                9, 8, 1, 18, 5, 10, 3, 18, 1, 119, 90, 11, 10, 1, 108, 18, 6,
                10, 4, 8, 7, 18, 0, 98, 31, 10, 1, 111, 18, 26, 10, 24, 8, 1,
                18, 20, 10, 3, 18, 1, 98, 10, 3, 18, 1, 102, 10, 3, 18, 1, 100,
                10, 3, 18, 1, 99, 66, 2, 16, 17,
              ],
              this.session_options,
              'o'
            )),
          this._stft
        );
      }
      static get rfft() {
        return (
          this._rfft ||
            (this._rfft = wi(
              [
                8, 9, 18, 0, 58, 97, 10, 33, 10, 1, 120, 10, 0, 10, 1, 97, 18,
                1, 121, 34, 3, 68, 70, 84, 42, 15, 10, 8, 111, 110, 101, 115,
                105, 100, 101, 100, 24, 1, 160, 1, 2, 18, 1, 100, 90, 21, 10, 1,
                120, 18, 16, 10, 14, 8, 1, 18, 10, 10, 3, 18, 1, 115, 10, 3, 18,
                1, 99, 90, 11, 10, 1, 97, 18, 6, 10, 4, 8, 7, 18, 0, 98, 21, 10,
                1, 121, 18, 16, 10, 14, 8, 1, 18, 10, 10, 3, 18, 1, 115, 10, 3,
                18, 1, 99, 66, 2, 16, 20,
              ],
              this.session_options,
              'y'
            )),
          this._rfft
        );
      }
      static get top_k() {
        return (
          this._top_k ||
            (this._top_k = wi(
              [
                8, 10, 18, 0, 58, 73, 10, 18, 10, 1, 120, 10, 1, 107, 18, 1,
                118, 18, 1, 105, 34, 4, 84, 111, 112, 75, 18, 1, 116, 90, 9, 10,
                1, 120, 18, 4, 10, 2, 8, 1, 90, 15, 10, 1, 107, 18, 10, 10, 8,
                8, 7, 18, 4, 10, 2, 8, 1, 98, 9, 10, 1, 118, 18, 4, 10, 2, 8, 1,
                98, 9, 10, 1, 105, 18, 4, 10, 2, 8, 7, 66, 2, 16, 21,
              ],
              this.session_options,
              ['v', 'i']
            )),
          this._top_k
        );
      }
      static get slice() {
        return (
          this._slice ||
            (this._slice = wi(
              [
                8, 7, 18, 0, 58, 96, 10, 25, 10, 1, 120, 10, 1, 115, 10, 1, 101,
                10, 1, 97, 10, 1, 116, 18, 1, 121, 34, 5, 83, 108, 105, 99, 101,
                18, 1, 114, 90, 9, 10, 1, 120, 18, 4, 10, 2, 8, 1, 90, 9, 10, 1,
                115, 18, 4, 10, 2, 8, 7, 90, 9, 10, 1, 101, 18, 4, 10, 2, 8, 7,
                90, 9, 10, 1, 97, 18, 4, 10, 2, 8, 7, 90, 9, 10, 1, 116, 18, 4,
                10, 2, 8, 7, 98, 9, 10, 1, 121, 18, 4, 10, 2, 8, 1, 66, 2, 16,
                13,
              ],
              this.session_options,
              'y'
            )),
          this._slice
        );
      }
    },
    bi = Object.freeze({
      auto: 'auto',
      gpu: 'gpu',
      cpu: 'cpu',
      wasm: 'wasm',
      webgpu: 'webgpu',
      cuda: 'cuda',
      dml: 'dml',
      coreml: 'coreml',
      webnn: 'webnn',
      'webnn-npu': 'webnn-npu',
      'webnn-gpu': 'webnn-gpu',
      'webnn-cpu': 'webnn-cpu',
    }),
    vi = dr.IS_NODE_ENV ? 'cpu' : 'wasm';
  var xi = (function () {
      let e;
      return async function () {
        if (void 0 === e)
          if (dr.IS_WEBGPU_AVAILABLE)
            try {
              const t = await navigator.gpu.requestAdapter();
              e = t.features.has('shader-f16');
            } catch (t) {
              e = !1;
            }
          else e = !1;
        return e;
      };
    })(),
    Mi = Object.freeze({
      auto: 'auto',
      fp32: 'fp32',
      fp16: 'fp16',
      q8: 'q8',
      int8: 'int8',
      uint8: 'uint8',
      q4: 'q4',
      bnb4: 'bnb4',
      q4f16: 'q4f16',
    }),
    ki = Mi.fp32,
    Ei = Object.freeze({ [bi.wasm]: Mi.q8 }),
    Ai = Object.freeze({
      [Mi.fp32]: '',
      [Mi.fp16]: '_fp16',
      [Mi.int8]: '_int8',
      [Mi.uint8]: '_uint8',
      [Mi.q8]: '_quantized',
      [Mi.q4]: '_q4',
      [Mi.q4f16]: '_q4f16',
      [Mi.bnb4]: '_bnb4',
    });
  var Ti = Object.freeze({
      float32: Float32Array,
      float16: 'undefined' != typeof Float16Array ? Float16Array : Uint16Array,
      float64: Float64Array,
      string: Array,
      int8: Int8Array,
      uint8: Uint8Array,
      int16: Int16Array,
      uint16: Uint16Array,
      int32: Int32Array,
      uint32: Uint32Array,
      int64: BigInt64Array,
      uint64: BigUint64Array,
      bool: Uint8Array,
      uint4: Uint8Array,
      int4: Int8Array,
    }),
    Ci = class e {
      get dims() {
        return this.ort_tensor.dims;
      }
      set dims(e) {
        this.ort_tensor.dims = e;
      }
      get type() {
        return this.ort_tensor.type;
      }
      get data() {
        return this.ort_tensor.data;
      }
      get size() {
        return this.ort_tensor.size;
      }
      get location() {
        return this.ort_tensor.location;
      }
      ort_tensor;
      constructor(...e) {
        return (
          _i(e[0])
            ? (this.ort_tensor = e[0])
            : (this.ort_tensor = new Vn(e[0], e[1], e[2])),
          new Proxy(this, {
            get: (e, t) => {
              if ('string' == typeof t) {
                let n = Number(t);
                if (Number.isInteger(n)) return e._getitem(n);
              }
              return e[t];
            },
            set: (e, t, n) => (e[t] = n),
          })
        );
      }
      dispose() {
        this.ort_tensor.dispose();
      }
      *[Symbol.iterator]() {
        const [e, ...t] = this.dims;
        if (t.length > 0) {
          const n = t.reduce((e, t) => e * t);
          for (let r = 0; r < e; ++r) yield this._subarray(r, n, t);
        } else yield* this.data;
      }
      _getitem(t) {
        const [n, ...r] = this.dims;
        if (((t = Ni(t, n)), r.length > 0)) {
          const e = r.reduce((e, t) => e * t);
          return this._subarray(t, e, r);
        }
        return new e(this.type, [this.data[t]], r);
      }
      indexOf(e) {
        const t = this.data;
        for (let n = 0; n < t.length; ++n) if (t[n] == e) return n;
        return -1;
      }
      _subarray(t, n, r) {
        const s = t * n,
          a = (t + 1) * n,
          o =
            'subarray' in this.data
              ? this.data.subarray(s, a)
              : this.data.slice(s, a);
        return new e(this.type, o, r);
      }
      item() {
        const e = this.data;
        if (1 !== e.length)
          throw new Error(
            `a Tensor with ${e.length} elements cannot be converted to Scalar`
          );
        return e[0];
      }
      tolist() {
        return (function (e, t) {
          const n = e.length,
            r = t.reduce((e, t) => e * t);
          if (n !== r)
            throw Error(`cannot reshape array of size ${n} into shape (${t})`);
          let s = e;
          for (let e = t.length - 1; e >= 0; e--)
            s = s.reduce(
              (n, r) => {
                let s = n[n.length - 1];
                return (s.length < t[e] ? s.push(r) : n.push([r]), n);
              },
              [[]]
            );
          return s[0];
        })(this.data, this.dims);
      }
      sigmoid() {
        return this.clone().sigmoid_();
      }
      sigmoid_() {
        const e = this.data;
        for (let t = 0; t < e.length; ++t) e[t] = 1 / (1 + Math.exp(-e[t]));
        return this;
      }
      map(e) {
        return this.clone().map_(e);
      }
      map_(e) {
        const t = this.data;
        for (let n = 0; n < t.length; ++n) t[n] = e(t[n], n, t);
        return this;
      }
      mul(e) {
        return this.clone().mul_(e);
      }
      mul_(e) {
        const t = this.data;
        for (let n = 0; n < t.length; ++n) t[n] *= e;
        return this;
      }
      div(e) {
        return this.clone().div_(e);
      }
      div_(e) {
        const t = this.data;
        for (let n = 0; n < t.length; ++n) t[n] /= e;
        return this;
      }
      add(e) {
        return this.clone().add_(e);
      }
      add_(e) {
        const t = this.data;
        for (let n = 0; n < t.length; ++n) t[n] += e;
        return this;
      }
      sub(e) {
        return this.clone().sub_(e);
      }
      sub_(e) {
        const t = this.data;
        for (let n = 0; n < t.length; ++n) t[n] -= e;
        return this;
      }
      clone() {
        return new e(this.type, this.data.slice(), this.dims.slice());
      }
      slice(...t) {
        const n = [],
          r = [];
        for (let e = 0; e < this.dims.length; ++e) {
          let s = t[e];
          if (null == s) (r.push([0, this.dims[e]]), n.push(this.dims[e]));
          else if ('number' == typeof s)
            ((s = Ni(s, this.dims[e], e)), r.push([s, s + 1]));
          else {
            if (!Array.isArray(s) || 2 !== s.length)
              throw new Error(`Invalid slice: ${s}`);
            {
              let [t, a] = s;
              if (
                ((t = null === t ? 0 : Ni(t, this.dims[e], e, !1)),
                (a = null === a ? this.dims[e] : Ni(a, this.dims[e], e, !1)),
                t > a)
              )
                throw new Error(`Invalid slice: ${s}`);
              const o = [Math.max(t, 0), Math.min(a, this.dims[e])];
              (r.push(o), n.push(o[1] - o[0]));
            }
          }
        }
        const s = r.map(([e, t]) => t - e),
          a = s.reduce((e, t) => e * t),
          o = this.data,
          i = new o.constructor(a),
          l = this.stride();
        let c = !0;
        for (let e = 1; e < s.length; ++e)
          if (0 !== r[e][0] || r[e][1] !== this.dims[e]) {
            c = !1;
            break;
          }
        if (c) {
          const e = r[0][0] * l[0],
            t = r[0][1] * l[0];
          if (ArrayBuffer.isView(o)) i.set(o.subarray(e, t));
          else {
            if (!Array.isArray(o))
              throw new Error('Unsupported data type for slicing');
            {
              const n = o.slice(e, t);
              for (let e = 0; e < n.length; ++e) i[e] = n[e];
            }
          }
        } else
          for (let e = 0; e < a; ++e) {
            let t = 0;
            for (let n = s.length - 1, a = e; n >= 0; --n) {
              const e = s[n];
              ((t += ((a % e) + r[n][0]) * l[n]), (a = Math.floor(a / e)));
            }
            i[e] = o[t];
          }
        return new e(this.type, i, n);
      }
      permute(...e) {
        return (function (e, t) {
          const [n, r] = (function (e, t, n) {
            const r = new Array(n.length),
              s = new Array(n.length);
            for (let e = n.length - 1, a = 1; e >= 0; --e)
              ((s[e] = a), (r[e] = t[n[e]]), (a *= r[e]));
            const a = n.map((e, t) => s[n.indexOf(t)]),
              o = new e.constructor(e.length);
            for (let n = 0; n < e.length; ++n) {
              let r = 0;
              for (let e = t.length - 1, s = n; e >= 0; --e)
                ((r += (s % t[e]) * a[e]), (s = Math.floor(s / t[e])));
              o[r] = e[n];
            }
            return [o, r];
          })(e.data, e.dims, t);
          return new Ci(e.type, n, r);
        })(this, e);
      }
      transpose(...e) {
        return this.permute(...e);
      }
      sum(e = null, t = !1) {
        return this.norm(1, e, t);
      }
      norm(t = 'fro', n = null, r = !1) {
        if ('fro' === t) t = 2;
        else if ('string' == typeof t) throw Error(`Unsupported norm: ${t}`);
        const s = this.data,
          a = (e, n) => e + n ** t;
        if (null === n) {
          const n = s.reduce(a, 0) ** (1 / t);
          return new e(this.type, [n], []);
        }
        const [o, i, l] = Di(a, this, n, r);
        if (1 !== t) for (let e = 0; e < i.length; ++e) i[e] = i[e] ** (1 / t);
        return new e(o, i, l);
      }
      normalize_(e = 2, t = 1) {
        t = Ni(t, this.dims.length);
        const n = this.norm(e, t, !0),
          r = this.data,
          s = n.data;
        for (let e = 0; e < r.length; ++e) {
          let n = 0;
          for (let r = this.dims.length - 1, s = e, a = 1; r >= 0; --r) {
            const e = this.dims[r];
            (r !== t && ((n += (s % e) * a), (a *= this.dims[r])),
              (s = Math.floor(s / e)));
          }
          r[e] /= s[n];
        }
        return this;
      }
      normalize(e = 2, t = 1) {
        return this.clone().normalize_(e, t);
      }
      stride() {
        return Ui(this.dims);
      }
      squeeze(t = null) {
        return new e(this.type, this.data, Li(this.dims, t));
      }
      squeeze_(e = null) {
        return ((this.dims = Li(this.dims, e)), this);
      }
      unsqueeze(t) {
        return new e(this.type, this.data, zi(this.dims, t));
      }
      unsqueeze_(e) {
        return ((this.dims = zi(this.dims, e)), this);
      }
      flatten_(e = 0, t = -1) {
        t = (t + this.dims.length) % this.dims.length;
        let n = this.dims.slice(0, e),
          r = this.dims.slice(e, t + 1),
          s = this.dims.slice(t + 1);
        return ((this.dims = [...n, r.reduce((e, t) => e * t, 1), ...s]), this);
      }
      flatten(e = 0, t = -1) {
        return this.clone().flatten_(e, t);
      }
      view(...t) {
        let n = -1;
        for (let e = 0; e < t.length; ++e)
          if (-1 === t[e]) {
            if (-1 !== n) throw new Error('Only one dimension can be inferred');
            n = e;
          }
        const r = this.data;
        if (-1 !== n) {
          const e = t.reduce((e, t, r) => (r !== n ? e * t : e), 1);
          t[n] = r.length / e;
        }
        return new e(this.type, r, t);
      }
      neg_() {
        const e = this.data;
        for (let t = 0; t < e.length; ++t) e[t] = -e[t];
        return this;
      }
      neg() {
        return this.clone().neg_();
      }
      gt(t) {
        const n = new Uint8Array(this.data.length),
          r = this.data;
        for (let e = 0; e < r.length; ++e) n[e] = r[e] > t ? 1 : 0;
        return new e('bool', n, this.dims);
      }
      lt(t) {
        const n = new Uint8Array(this.data.length),
          r = this.data;
        for (let e = 0; e < r.length; ++e) n[e] = r[e] < t ? 1 : 0;
        return new e('bool', n, this.dims);
      }
      clamp_(e, t) {
        const n = this.data;
        for (let r = 0; r < n.length; ++r)
          n[r] = Math.min(Math.max(n[r], e), t);
        return this;
      }
      clamp(e, t) {
        return this.clone().clamp_(e, t);
      }
      round_() {
        const e = this.data;
        for (let t = 0; t < e.length; ++t) e[t] = Math.round(e[t]);
        return this;
      }
      round() {
        return this.clone().round_();
      }
      mean(e = null, t = !1) {
        return Ri(this, e, t);
      }
      min(t = null, n = !1) {
        if (null === t) {
          const t = Vo(this.data)[0];
          return new e(this.type, [t], []);
        }
        const [r, s, a] = Di((e, t) => Math.min(e, t), this, t, n, 1 / 0);
        return new e(r, s, a);
      }
      max(t = null, n = !1) {
        if (null === t) {
          const t = jo(this.data)[0];
          return new e(this.type, [t], []);
        }
        const [r, s, a] = Di((e, t) => Math.max(e, t), this, t, n, -1 / 0);
        return new e(r, s, a);
      }
      argmin(t = null, n = !1) {
        if (null !== t) throw new Error('`dim !== null` not yet implemented.');
        const r = Vo(this.data)[1];
        return new e('int64', [BigInt(r)], []);
      }
      argmax(t = null, n = !1) {
        if (null !== t) throw new Error('`dim !== null` not yet implemented.');
        const r = jo(this.data)[1];
        return new e('int64', [BigInt(r)], []);
      }
      repeat(...t) {
        if (t.length < this.dims.length)
          throw new Error(
            `Number of dimensions of repeat dims (${t.length}) cannot be smaller than number of dimensions of tensor (${this.dims.length})`
          );
        if (t.every(e => 1 === e)) {
          if (t.length === this.dims.length) return this.clone();
          const n = t.length - this.dims.length,
            r = Array(n).fill(1).concat(this.dims);
          return new e(this.type, this.data.slice(), r);
        }
        const n = t.length - this.dims.length,
          r = Array(n).fill(1).concat(this.dims),
          s = r.map((e, n) => e * t[n]),
          a = s.reduce((e, t) => e * t, 1),
          o = this.data,
          i = new o.constructor(a),
          l = Ui(r),
          c = Ui(s);
        for (let e = 0; e < a; ++e) {
          let t = e,
            n = 0;
          for (let e = 0; e < s.length; ++e) {
            const s = Math.floor(t / c[e]);
            ((t %= c[e]), (n += (s % r[e]) * l[e]));
          }
          i[e] = o[n];
        }
        return new e(this.type, i, s);
      }
      tile(...e) {
        if (e.length < this.dims.length) {
          const t = this.dims.length - e.length;
          e = Array(t).fill(1).concat(e);
        }
        return this.repeat(...e);
      }
      to(t) {
        if (this.type === t) return this;
        if (!Ti.hasOwnProperty(t)) throw new Error(`Unsupported type: ${t}`);
        let n;
        const r = ['int64', 'uint64'].includes(this.type),
          s = ['int64', 'uint64'].includes(t);
        if (r && !s) n = Number;
        else if (!r && s)
          n = ['float16', 'float32', 'float64'].includes(this.type)
            ? e => BigInt(Math.floor(e))
            : BigInt;
        else if (
          'float16' === this.type &&
          'float32' == t &&
          this.data instanceof Uint16Array
        )
          return new e(t, Ko(this.data), this.dims);
        return new e(t, Ti[t].from(this.data, n), this.dims);
      }
    };
  function Si(e, [t, n], r = 'bilinear', s = !1) {
    const a = e.dims.at(-3) ?? 1,
      o = e.dims.at(-2),
      i = e.dims.at(-1),
      l = (function (e, [t, n, r], [s, a]) {
        const o = a / r,
          i = s / n,
          l = new e.constructor(s * a * t),
          c = n * r,
          u = s * a;
        for (let d = 0; d < s; ++d)
          for (let s = 0; s < a; ++s) {
            const p = d * a + s,
              h = (s + 0.5) / o - 0.5,
              f = (d + 0.5) / i - 0.5;
            let _ = Math.floor(h),
              m = Math.floor(f);
            const g = Math.min(_ + 1, r - 1),
              w = Math.min(m + 1, n - 1);
            ((_ = Math.max(_, 0)), (m = Math.max(m, 0)));
            const y = h - _,
              b = f - m,
              v = (1 - y) * (1 - b),
              x = y * (1 - b),
              M = (1 - y) * b,
              k = y * b,
              E = m * r,
              A = w * r,
              T = E + _,
              C = E + g,
              S = A + _,
              P = A + g;
            for (let n = 0; n < t; ++n) {
              const t = n * c;
              l[n * u + p] =
                v * e[t + T] + x * e[t + C] + M * e[t + S] + k * e[t + P];
            }
          }
        return l;
      })(e.data, [a, o, i], [t, n]);
    return new Ci(e.type, l, [a, t, n]);
  }
  async function Pi(e, { size: t = null, mode: n = 'bilinear' } = {}) {
    if (4 !== e.dims.length)
      throw new Error('`interpolate_4d` currently only supports 4D input.');
    if (!t) throw new Error('`interpolate_4d` requires a `size` argument.');
    let r, s;
    if (2 === t.length) r = [...e.dims.slice(0, 2), ...t];
    else if (3 === t.length) r = [e.dims[0], ...t];
    else {
      if (4 !== t.length)
        throw new Error('`size` must be of length 2, 3, or 4.');
      r = t;
    }
    if ('nearest' === n) s = await yi.nearest_interpolate_4d;
    else if ('bilinear' === n) s = await yi.bilinear_interpolate_4d;
    else {
      if ('bicubic' !== n) throw new Error(`Unsupported mode: ${n}`);
      s = await yi.bicubic_interpolate_4d;
    }
    const a = new Ci('int64', new BigInt64Array(r.map(BigInt)), [r.length]);
    return await s({ x: e, s: a });
  }
  async function Fi(e, t) {
    const n = await yi.top_k;
    return (
      (t = null == t ? e.dims.at(-1) : Math.min(t, e.dims.at(-1))),
      await n({ x: e, k: new Ci('int64', [BigInt(t)], [1]) })
    );
  }
  var Ii = e => new Ci('int64', e, [e.length]);
  async function Oi(e, t, n, r, s) {
    const a = await yi.slice;
    return await a({
      x: e,
      s: Ii(t),
      e: Ii(n),
      a: Ii(r),
      t: Ii(s ?? new Array(r.length).fill(1)),
    });
  }
  function Li(e, t) {
    return (
      (e = e.slice()),
      null === t
        ? (e = e.filter(e => 1 !== e))
        : 'number' == typeof t
          ? 1 === e[t] && e.splice(t, 1)
          : Array.isArray(t) &&
            (e = e.filter((e, n) => 1 !== e || !t.includes(n))),
      e
    );
  }
  function zi(e, t) {
    return ((t = Ni(t, e.length + 1)), (e = e.slice()).splice(t, 0, 1), e);
  }
  function Ni(e, t, n = null, r = !0) {
    if (e < -t || e >= t) {
      if (r)
        throw new Error(
          `IndexError: index ${e} is out of bounds for dimension${null === n ? '' : ' ' + n} with size ${t}`
        );
      return e < -t ? 0 : t;
    }
    return (e < 0 && (e = ((e % t) + t) % t), e);
  }
  function Bi(e, t = 0) {
    t = Ni(t, e[0].dims.length);
    const n = e[0].dims.slice();
    n[t] = e.reduce((e, n) => e + n.dims[t], 0);
    const r = n.reduce((e, t) => e * t, 1),
      s = new e[0].data.constructor(r),
      a = e[0].type;
    if (0 === t) {
      let t = 0;
      for (const n of e) {
        const e = n.data;
        (s.set(e, t), (t += e.length));
      }
    } else {
      let r = 0;
      for (let a = 0; a < e.length; ++a) {
        const { data: o, dims: i } = e[a];
        for (let e = 0; e < o.length; ++e) {
          let a = 0;
          for (let s = i.length - 1, o = e, l = 1; s >= 0; --s) {
            const e = i[s];
            let c = o % e;
            (s === t && (c += r),
              (a += c * l),
              (l *= n[s]),
              (o = Math.floor(o / e)));
          }
          s[a] = o[e];
        }
        r += i[t];
      }
    }
    return new Ci(a, s, n);
  }
  function $i(e, t = 0) {
    return Bi(
      e.map(e => e.unsqueeze(t)),
      t
    );
  }
  function Di(e, t, n, r = !1, s = null) {
    const a = t.data,
      o = t.dims;
    n = Ni(n, o.length);
    const i = o.slice();
    i[n] = 1;
    const l = new a.constructor(a.length / o[n]);
    null !== s && l.fill(s);
    for (let t = 0; t < a.length; ++t) {
      let r = 0;
      for (let e = o.length - 1, s = t, a = 1; e >= 0; --e) {
        const t = o[e];
        (e !== n && ((r += (s % t) * a), (a *= i[e])), (s = Math.floor(s / t)));
      }
      l[r] = e(l[r], a[t], t, r);
    }
    return (r || i.splice(n, 1), [t.type, l, i]);
  }
  function Ri(e, t = null, n = !1) {
    const r = e.dims,
      s = e.data;
    if (null === t) {
      const t = s.reduce((e, t) => e + t, 0);
      return new Ci(e.type, [t / s.length], []);
    }
    t = Ni(t, r.length);
    const [a, o, i] = Di((e, t) => e + t, e, t, n);
    if (1 !== r[t]) for (let e = 0; e < o.length; ++e) o[e] /= r[t];
    return new Ci(a, o, i);
  }
  function Ui(e) {
    const t = new Array(e.length);
    for (let n = e.length - 1, r = 1; n >= 0; --n) ((t[n] = r), (r *= e[n]));
    return t;
  }
  function Gi(e, t, n, r) {
    const s = e.reduce((e, t) => e * t, 1);
    return new Ci(n, new r(s).fill(t), e);
  }
  function Vi(e, t) {
    let n, r;
    if ('number' == typeof t) ((n = 'float32'), (r = Float32Array));
    else if ('bigint' == typeof t) ((n = 'int64'), (r = BigInt64Array));
    else {
      if ('boolean' != typeof t)
        throw new Error('Unsupported data type: ' + typeof t);
      ((n = 'bool'), (r = Uint8Array));
    }
    return Gi(e, t, n, r);
  }
  function ji(e, t) {
    return Vi(e.dims, t);
  }
  function Wi(e) {
    return Gi(e, 1n, 'int64', BigInt64Array);
  }
  function qi(e) {
    return Wi(e.dims);
  }
  function Hi(e) {
    return Gi(e, 0n, 'int64', BigInt64Array);
  }
  function Qi(e) {
    return Hi(e.dims);
  }
  async function Xi(e, t) {
    const n = await (async function (e) {
      if (!e) throw new Error('modelId is required for get_tokenizer_files');
      return (await Io(e, 'tokenizer_config.json', {})).exists
        ? ['tokenizer.json', 'tokenizer_config.json']
        : [];
    })(e);
    return await Promise.all(n.map(n => Ro(e, n, !0, t)));
  }
  function Yi(e) {
    const t = e.dims;
    switch (t.length) {
      case 1:
        return e.tolist();
      case 2:
        if (1 !== t[0])
          throw new Error(
            'Unable to decode tensor with `batch size !== 1`. Use `tokenizer.batch_decode(...)` for batched inputs.'
          );
        return e.tolist()[0];
      default:
        throw new Error(
          `Expected tensor to have 1-2 dimensions, got ${t.length}.`
        );
    }
  }
  var Ji = [
    'bos_token',
    'eos_token',
    'unk_token',
    'sep_token',
    'pad_token',
    'cls_token',
    'mask_token',
  ];
  function Ki(e, t, n, r) {
    for (const s of Object.keys(e)) {
      const a = t - e[s].length,
        o = n(s),
        i = new Array(a).fill(o);
      e[s] = 'right' === r ? Er(e[s], i) : Er(i, e[s]);
    }
  }
  function Zi(e, t) {
    for (const n of Object.keys(e)) e[n].length = t;
  }
  function el(e, ...t) {
    for (const n of t) {
      if (!Object.hasOwn(e, n)) continue;
      const t = e[n];
      if (t) {
        if ('object' == typeof t) {
          if ('AddedToken' === t.__type) return t.content;
          throw Error(`Unknown token: ${t}`);
        }
        return t;
      }
    }
    return null;
  }
  var tl = class extends mo {
    return_token_type_ids = !1;
    padding_side = 'right';
    constructor(e, t) {
      if (
        (super(),
        (this._tokenizerJSON = e),
        (this._tokenizerConfig = t),
        (this._tokenizer = new Zs(e, t)),
        (this.config = t),
        (this.padding_side = t.padding_side ?? this.padding_side),
        (this.mask_token = el(t, 'mask_token')),
        (this.mask_token_id = this._tokenizer.token_to_id(this.mask_token)),
        (this.pad_token = el(t, 'pad_token', 'eos_token')),
        (this.pad_token_id = this._tokenizer.token_to_id(this.pad_token)),
        (this.sep_token = el(t, 'sep_token')),
        (this.sep_token_id = this._tokenizer.token_to_id(this.sep_token)),
        (this.unk_token = el(t, 'unk_token')),
        (this.unk_token_id = this._tokenizer.token_to_id(this.unk_token)),
        (this.bos_token = el(t, 'bos_token')),
        (this.bos_token_id = this._tokenizer.token_to_id(this.bos_token)),
        (this.eos_token = el(t, 'eos_token')),
        (this.eos_token_id = this._tokenizer.token_to_id(this.eos_token)),
        (this.chat_template = t.chat_template ?? null),
        Array.isArray(this.chat_template))
      ) {
        const e = Object.create(null);
        for (const { name: t, template: n } of this.chat_template) {
          if ('string' != typeof t || 'string' != typeof n)
            throw new Error(
              'Chat template must be a list of objects with "name" and "template" properties'
            );
          e[t] = n;
        }
        this.chat_template = e;
      }
      this._compiled_template_cache = new Map();
      const n = (function (e) {
        const t = [];
        for (const n of e.get_added_tokens_decoder().values())
          n.special && t.push(n);
        return t;
      })(this._tokenizer);
      ((this.all_special_ids = n.map(e => e.id)),
        (this.all_special_tokens = n.map(e => e.content)));
    }
    static async from_pretrained(
      e,
      {
        progress_callback: t = null,
        config: n = null,
        cache_dir: r = null,
        local_files_only: s = !1,
        revision: a = 'main',
      } = {}
    ) {
      return new this(
        ...(await Xi(e, {
          progress_callback: t,
          config: n,
          cache_dir: r,
          local_files_only: s,
          revision: a,
        }))
      );
    }
    get_vocab() {
      return this._tokenizer.get_vocab();
    }
    get model_max_length() {
      return this._tokenizerConfig.model_max_length ?? 1 / 0;
    }
    get add_eos_token() {
      return this._tokenizerConfig.add_eos_token;
    }
    get add_bos_token() {
      return this._tokenizerConfig.add_bos_token;
    }
    convert_tokens_to_ids(e) {
      return 'string' == typeof e
        ? this._tokenizer.token_to_id(e)
        : e.map(e => this._tokenizer.token_to_id(e));
    }
    _call(
      e,
      {
        text_pair: t = null,
        add_special_tokens: n = !0,
        padding: r = !1,
        truncation: s = null,
        max_length: a = null,
        return_tensor: o = !0,
        return_token_type_ids: i = null,
      } = {}
    ) {
      const l = Array.isArray(e);
      let c;
      if (l) {
        if (0 === e.length) throw Error('text array must be non-empty');
        if (null !== t) {
          if (!Array.isArray(t)) throw Error('text_pair must also be an array');
          if (e.length !== t.length)
            throw Error('text and text_pair must have the same length');
          c = e.map((e, r) =>
            this._encode_plus(e, {
              text_pair: t[r],
              add_special_tokens: n,
              return_token_type_ids: i,
            })
          );
        } else
          c = e.map(e =>
            this._encode_plus(e, {
              add_special_tokens: n,
              return_token_type_ids: i,
            })
          );
      } else {
        if (null == e) throw Error('text may not be null or undefined');
        if (Array.isArray(t))
          throw Error(
            'When specifying `text_pair`, since `text` is a string, `text_pair` must also be a string (i.e., not an array).'
          );
        c = [
          this._encode_plus(e, {
            text_pair: t,
            add_special_tokens: n,
            return_token_type_ids: i,
          }),
        ];
      }
      if (
        (null === a
          ? (a = this.model_max_length)
          : null === s &&
            (!0 === r
              ? (Fr.warn(
                  "`max_length` is ignored when `padding: true` and there is no truncation strategy. To pad to max length, use `padding: 'max_length'`."
                ),
                (a = this.model_max_length))
              : !1 === r &&
                (Fr.warn(
                  'Truncation was not explicitly activated but `max_length` is provided a specific value, please use `truncation: true` to explicitly truncate examples to max length.'
                ),
                (s = !0))),
        !0 === r &&
          (a = Math.min(jo(c.map(e => e.input_ids.length))[0], a ?? 1 / 0)),
        (a = Math.min(a, this.model_max_length ?? 1 / 0)),
        r || s)
      )
        for (let e = 0; e < c.length; ++e)
          c[e].input_ids.length !== a &&
            (c[e].input_ids.length > a
              ? s && Zi(c[e], a)
              : r &&
                Ki(
                  c[e],
                  a,
                  e => ('input_ids' === e ? this.pad_token_id : 0),
                  this.padding_side
                ));
      const u = {};
      if (o) {
        if (
          (!r || !s) &&
          c.some(e => {
            for (const t of Object.keys(e))
              if (e[t].length !== c[0][t]?.length) return !0;
            return !1;
          })
        )
          throw Error(
            "Unable to create tensor, you should probably activate truncation and/or padding with 'padding=true' and 'truncation=true' to have batched tensors with the same length."
          );
        const e = [c.length, c[0].input_ids.length];
        for (const t of Object.keys(c[0]))
          u[t] = new Ci(
            'int64',
            BigInt64Array.from(c.flatMap(e => e[t]).map(BigInt)),
            e
          );
      } else {
        for (const e of Object.keys(c[0])) u[e] = c.map(t => t[e]);
        if (!l) for (const e of Object.keys(u)) u[e] = u[e][0];
      }
      return u;
    }
    _encode_text(e) {
      return null === e ? null : this._tokenizer.encode(e).tokens;
    }
    _encode_plus(
      e,
      {
        text_pair: t = null,
        add_special_tokens: n = !0,
        return_token_type_ids: r = null,
      } = {}
    ) {
      const {
        ids: s,
        attention_mask: a,
        token_type_ids: o,
      } = this._tokenizer.encode(e, {
        text_pair: t,
        add_special_tokens: n,
        return_token_type_ids: r ?? this.return_token_type_ids,
      });
      return {
        input_ids: s,
        attention_mask: a,
        ...(o ? { token_type_ids: o } : {}),
      };
    }
    tokenize(e, { pair: t = null, add_special_tokens: n = !1 } = {}) {
      return this._tokenizer.tokenize(e, {
        text_pair: t,
        add_special_tokens: n,
      });
    }
    encode(
      e,
      {
        text_pair: t = null,
        add_special_tokens: n = !0,
        return_token_type_ids: r = null,
      } = {}
    ) {
      return this._tokenizer.encode(e, {
        text_pair: t,
        add_special_tokens: n,
        return_token_type_ids: r,
      }).ids;
    }
    batch_decode(e, t = {}) {
      return (
        e instanceof Ci && (e = e.tolist()),
        e.map(e => this.decode(e, t))
      );
    }
    decode(e, t = {}) {
      if (
        (e instanceof Ci && (e = Yi(e)),
        !Array.isArray(e) ||
          0 === e.length ||
          ((n = e[0]), !Number.isInteger(n) && 'bigint' != typeof n))
      )
        throw Error('token_ids must be a non-empty array of integers.');
      var n;
      return this.decode_single(e, t);
    }
    decode_single(
      e,
      { skip_special_tokens: t = !1, clean_up_tokenization_spaces: n = null }
    ) {
      return this._tokenizer.decode(e, {
        skip_special_tokens: t,
        clean_up_tokenization_spaces: n,
      });
    }
    get_chat_template({ chat_template: e = null, tools: t = null } = {}) {
      if (this.chat_template && 'object' == typeof this.chat_template) {
        const n = this.chat_template;
        if (null !== e && Object.hasOwn(n, e)) e = n[e];
        else if (null === e)
          if (null !== t && 'tool_use' in n) e = n.tool_use;
          else {
            if (!('default' in n))
              throw Error(
                `This model has multiple chat templates with no default specified! Please either pass a chat template or the name of the template you wish to use to the 'chat_template' argument. Available template names are ${Object.keys(n).sort()}.`
              );
            e = n.default;
          }
      } else if (null === e) {
        if (!this.chat_template)
          throw Error(
            'Cannot use apply_chat_template() because tokenizer.chat_template is not set and no template argument was passed! For information about writing templates and setting the tokenizer.chat_template attribute, please see the documentation at https://huggingface.co/docs/transformers/main/en/chat_templating'
          );
        e = this.chat_template;
      }
      return e;
    }
    apply_chat_template(
      e,
      {
        tools: t = null,
        documents: n = null,
        chat_template: r = null,
        add_generation_prompt: s = !1,
        tokenize: a = !0,
        padding: o = !1,
        truncation: i = !1,
        max_length: l = null,
        return_tensor: c = !0,
        return_dict: u = !0,
        tokenizer_kwargs: d = {},
        ...p
      } = {}
    ) {
      if (
        'string' !=
        typeof (r = this.get_chat_template({ chat_template: r, tools: t }))
      )
        throw Error('chat_template must be a string, but got ' + typeof r);
      let h = this._compiled_template_cache.get(r);
      void 0 === h &&
        ((h = new _o(r)), this._compiled_template_cache.set(r, h));
      const f = Object.create(null);
      for (const e of Ji) {
        const t = el(this.config, e);
        t && (f[e] = t);
      }
      const _ = h.render({
        messages: e,
        add_generation_prompt: s,
        tools: t,
        documents: n,
        ...f,
        ...p,
      });
      if (a) {
        const e = this._call(_, {
          add_special_tokens: !1,
          padding: o,
          truncation: i,
          max_length: l,
          return_tensor: c,
          ...d,
        });
        return u ? e : e.input_ids;
      }
      return _;
    }
  };
  function nl(e, t, n, r) {
    if (!('language_codes' in e) || !Array.isArray(e.language_codes))
      throw new Error(
        'Tokenizer must have `language_codes` attribute set and it should be an array of language ids.'
      );
    if (!('languageRegex' in e && e.languageRegex instanceof RegExp))
      throw new Error(
        'Tokenizer must have `languageRegex` attribute set and it should be a regular expression.'
      );
    if (!('lang_to_token' in e) || 'function' != typeof e.lang_to_token)
      throw new Error(
        'Tokenizer must have `lang_to_token` attribute set and it should be a function.'
      );
    const s = r.src_lang,
      a = r.tgt_lang;
    if (!e.language_codes.includes(a))
      throw new Error(
        `Target language code "${a}" is not valid. Must be one of: {${e.language_codes.join(', ')}}`
      );
    if (void 0 !== s) {
      if (!e.language_codes.includes(s))
        throw new Error(
          `Source language code "${s}" is not valid. Must be one of: {${e.language_codes.join(', ')}}`
        );
      for (const t of e._tokenizer.post_processor.config.single)
        if ('SpecialToken' in t && e.languageRegex.test(t.SpecialToken.id)) {
          t.SpecialToken.id = e.lang_to_token(s);
          break;
        }
    }
    return (
      (r.forced_bos_token_id = e._tokenizer.token_to_id(e.lang_to_token(a))),
      e._call(t, n)
    );
  }
  var rl = {};
  Wn(rl, {
    AlbertTokenizer: () => sl,
    AutoTokenizer: () => Zl,
    BartTokenizer: () => al,
    BertTokenizer: () => ol,
    BlenderbotSmallTokenizer: () => il,
    BlenderbotTokenizer: () => ll,
    BloomTokenizer: () => cl,
    CLIPTokenizer: () => dl,
    CamembertTokenizer: () => ul,
    CodeGenTokenizer: () => hl,
    CodeLlamaTokenizer: () => pl,
    CohereTokenizer: () => fl,
    ConvBertTokenizer: () => _l,
    DebertaTokenizer: () => gl,
    DebertaV2Tokenizer: () => ml,
    DistilBertTokenizer: () => wl,
    ElectraTokenizer: () => yl,
    EsmTokenizer: () => bl,
    FalconTokenizer: () => vl,
    GPT2Tokenizer: () => kl,
    GPTNeoXTokenizer: () => Ml,
    GemmaTokenizer: () => xl,
    HerbertTokenizer: () => El,
    LlamaTokenizer: () => Al,
    M2M100Tokenizer: () => Tl,
    MBart50Tokenizer: () => Pl,
    MBartTokenizer: () => Sl,
    MPNetTokenizer: () => Ol,
    MarianTokenizer: () => Cl,
    MgpstrTokenizer: () => Fl,
    MobileBertTokenizer: () => Il,
    NllbTokenizer: () => Ll,
    NougatTokenizer: () => zl,
    PreTrainedTokenizer: () => tl,
    Qwen2Tokenizer: () => Nl,
    RoFormerTokenizer: () => $l,
    RobertaTokenizer: () => Bl,
    SiglipTokenizer: () => Dl,
    SpeechT5Tokenizer: () => Rl,
    SqueezeBertTokenizer: () => Ul,
    T5Tokenizer: () => Gl,
    TokenizersBackend: () => tl,
    VitsTokenizer: () => jl,
    Wav2Vec2CTCTokenizer: () => Wl,
    WhisperTokenizer: () => Yl,
    XLMRobertaTokenizer: () => Jl,
    XLMTokenizer: () => Kl,
  });
  var sl = class extends tl {
      return_token_type_ids = !0;
    },
    al = class extends tl {},
    ol = class extends tl {
      return_token_type_ids = !0;
    },
    il = class extends tl {},
    ll = class extends tl {},
    cl = class extends tl {},
    ul = class extends tl {},
    dl = class extends tl {},
    pl = class extends tl {},
    hl = class extends tl {},
    fl = class extends tl {},
    _l = class extends tl {
      return_token_type_ids = !0;
    },
    ml = class extends tl {
      return_token_type_ids = !0;
    },
    gl = class extends tl {
      return_token_type_ids = !0;
    },
    wl = class extends tl {},
    yl = class extends tl {
      return_token_type_ids = !0;
    },
    bl = class extends tl {},
    vl = class extends tl {},
    xl = class extends tl {},
    Ml = class extends tl {},
    kl = class extends tl {},
    El = class extends tl {
      return_token_type_ids = !0;
    },
    Al = class extends tl {
      padding_side = 'left';
    },
    Tl = class extends tl {
      constructor(e, t) {
        (super(e, t),
          (this.languageRegex = /^__[a-z]{2,3}__$/),
          (this.language_codes = this.all_special_tokens
            .filter(e => this.languageRegex.test(e))
            .map(e => e.slice(2, -2))),
          (this.lang_to_token = e => `__${e}__`));
      }
      _build_translation_inputs(e, t, n) {
        return nl(this, e, t, n);
      }
    },
    Cl = class extends tl {
      constructor(e, t) {
        (super(e, t),
          (this.languageRegex = /^(>>\w+<<)\s*/g),
          (this.supported_language_codes = Array.from(
            this.get_vocab().keys()
          ).filter(e => this.languageRegex.test(e))),
          Fr.warn(
            'WARNING: `MarianTokenizer` is not yet supported by Hugging Face\'s "fast" tokenizers library. Therefore, you may experience slightly inaccurate results.'
          ));
      }
      _encode_text(e) {
        if (null === e) return null;
        const [t, ...n] = e.trim().split(this.languageRegex);
        if (0 === n.length) return super._encode_text(t);
        if (2 === n.length) {
          const [e, t] = n;
          return (
            this.supported_language_codes.includes(e) ||
              Fr.warn(
                `Unsupported language code "${e}" detected, which may lead to unexpected behavior. Should be one of: ${JSON.stringify(this.supported_language_codes)}`
              ),
            Er([e], super._encode_text(t))
          );
        }
      }
    },
    Sl = class extends tl {
      constructor(e, t) {
        (super(e, t),
          (this.languageRegex = /^[a-z]{2}_[A-Z]{2}$/),
          (this.language_codes = this.all_special_tokens
            .filter(e => this.languageRegex.test(e))
            .map(e => e)),
          (this.lang_to_token = e => e));
      }
      _build_translation_inputs(e, t, n) {
        return nl(this, e, t, n);
      }
    },
    Pl = class extends Sl {},
    Fl = class extends tl {},
    Il = class extends tl {
      return_token_type_ids = !0;
    },
    Ol = class extends tl {},
    Ll = class extends tl {
      constructor(e, t) {
        (super(e, t),
          (this.languageRegex = /^[a-z]{3}_[A-Z][a-z]{3}$/),
          (this.language_codes = this.all_special_tokens.filter(e =>
            this.languageRegex.test(e)
          )),
          (this.lang_to_token = e => e));
      }
      _build_translation_inputs(e, t, n) {
        return nl(this, e, t, n);
      }
    },
    zl = class extends tl {},
    Nl = class extends tl {},
    Bl = class extends tl {},
    $l = class extends tl {
      return_token_type_ids = !0;
    },
    Dl = class extends tl {},
    Rl = class extends tl {},
    Ul = class extends tl {
      return_token_type_ids = !0;
    },
    Gl = class extends tl {},
    Vl = class extends Us {
      decode_chain(e) {
        let t = '';
        for (let n = 1; n < e.length; n += 2) t += e[n];
        return [t];
      }
    },
    jl = class extends tl {
      constructor(e, t) {
        (super(e, t),
          (this._tokenizer.decoder = new Vl({ type: 'VitsDecoder' })));
      }
    },
    Wl = class extends tl {},
    ql = [
      ['en', 'english'],
      ['zh', 'chinese'],
      ['de', 'german'],
      ['es', 'spanish'],
      ['ru', 'russian'],
      ['ko', 'korean'],
      ['fr', 'french'],
      ['ja', 'japanese'],
      ['pt', 'portuguese'],
      ['tr', 'turkish'],
      ['pl', 'polish'],
      ['ca', 'catalan'],
      ['nl', 'dutch'],
      ['ar', 'arabic'],
      ['sv', 'swedish'],
      ['it', 'italian'],
      ['id', 'indonesian'],
      ['hi', 'hindi'],
      ['fi', 'finnish'],
      ['vi', 'vietnamese'],
      ['he', 'hebrew'],
      ['uk', 'ukrainian'],
      ['el', 'greek'],
      ['ms', 'malay'],
      ['cs', 'czech'],
      ['ro', 'romanian'],
      ['da', 'danish'],
      ['hu', 'hungarian'],
      ['ta', 'tamil'],
      ['no', 'norwegian'],
      ['th', 'thai'],
      ['ur', 'urdu'],
      ['hr', 'croatian'],
      ['bg', 'bulgarian'],
      ['lt', 'lithuanian'],
      ['la', 'latin'],
      ['mi', 'maori'],
      ['ml', 'malayalam'],
      ['cy', 'welsh'],
      ['sk', 'slovak'],
      ['te', 'telugu'],
      ['fa', 'persian'],
      ['lv', 'latvian'],
      ['bn', 'bengali'],
      ['sr', 'serbian'],
      ['az', 'azerbaijani'],
      ['sl', 'slovenian'],
      ['kn', 'kannada'],
      ['et', 'estonian'],
      ['mk', 'macedonian'],
      ['br', 'breton'],
      ['eu', 'basque'],
      ['is', 'icelandic'],
      ['hy', 'armenian'],
      ['ne', 'nepali'],
      ['mn', 'mongolian'],
      ['bs', 'bosnian'],
      ['kk', 'kazakh'],
      ['sq', 'albanian'],
      ['sw', 'swahili'],
      ['gl', 'galician'],
      ['mr', 'marathi'],
      ['pa', 'punjabi'],
      ['si', 'sinhala'],
      ['km', 'khmer'],
      ['sn', 'shona'],
      ['yo', 'yoruba'],
      ['so', 'somali'],
      ['af', 'afrikaans'],
      ['oc', 'occitan'],
      ['ka', 'georgian'],
      ['be', 'belarusian'],
      ['tg', 'tajik'],
      ['sd', 'sindhi'],
      ['gu', 'gujarati'],
      ['am', 'amharic'],
      ['yi', 'yiddish'],
      ['lo', 'lao'],
      ['uz', 'uzbek'],
      ['fo', 'faroese'],
      ['ht', 'haitian creole'],
      ['ps', 'pashto'],
      ['tk', 'turkmen'],
      ['nn', 'nynorsk'],
      ['mt', 'maltese'],
      ['sa', 'sanskrit'],
      ['lb', 'luxembourgish'],
      ['my', 'myanmar'],
      ['bo', 'tibetan'],
      ['tl', 'tagalog'],
      ['mg', 'malagasy'],
      ['as', 'assamese'],
      ['tt', 'tatar'],
      ['haw', 'hawaiian'],
      ['ln', 'lingala'],
      ['ha', 'hausa'],
      ['ba', 'bashkir'],
      ['jw', 'javanese'],
      ['su', 'sundanese'],
    ],
    Hl = new Map(ql),
    Ql = new Map([
      ...ql.map(([e, t]) => [t, e]),
      ['burmese', 'my'],
      ['valencian', 'ca'],
      ['flemish', 'nl'],
      ['haitian', 'ht'],
      ['letzeburgesch', 'lb'],
      ['pushto', 'ps'],
      ['panjabi', 'pa'],
      ['moldavian', 'ro'],
      ['moldovan', 'ro'],
      ['sinhalese', 'si'],
      ['castilian', 'es'],
    ]),
    Xl = new RegExp(
      '^[\\p{P}\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E]+$',
      'gu'
    ),
    Yl = class extends tl {
      get timestamp_begin() {
        return this._tokenizer.token_to_id('<|notimestamps|>') + 1;
      }
      _decode_asr(
        e,
        {
          return_timestamps: t = !1,
          return_language: n = !1,
          time_precision: r = null,
          force_full_sequences: s = !0,
        } = {}
      ) {
        if (null === r) throw Error('Must specify time_precision');
        let a = null;
        const o = 'word' === t;
        function i() {
          return { language: a, timestamp: [null, null], text: '' };
        }
        const l = [];
        let c = i(),
          u = 0;
        const d = this.timestamp_begin,
          p = d + 1500;
        let h = [],
          f = [],
          _ = !1,
          m = null;
        const g = new Set(this.all_special_ids);
        for (const n of e) {
          const e = n.tokens,
            s = o ? n.token_timestamps : null;
          let w = null,
            y = d;
          if ('stride' in n) {
            const [t, s, a] = n.stride;
            if (((u -= s), (m = t - a), s && (y = s / r + d), a))
              for (let t = e.length - 1; t >= 0; --t) {
                const n = Number(e[t]);
                if (n >= d) {
                  if (null !== w && (n - d) * r < m) break;
                  w = n;
                }
              }
          }
          let b = [],
            v = [];
          for (let n = 0; n < e.length; ++n) {
            const m = Number(e[n]);
            if (g.has(m)) {
              const e = this.decode([m]),
                n = Hl.get(e.slice(2, -2));
              if (void 0 !== n) {
                if (null !== a && n !== a && !t) {
                  h.push(b);
                  const e = this.findLongestCommonSequence(h)[0],
                    t = this.decode(e);
                  ((c.text = t), l.push(c), (h = []), (b = []), (c = i()));
                }
                a = c.language = n;
              }
            } else if (m >= d && m <= p) {
              const e = Yo((m - d) * r + u, 2);
              if (null !== w && m >= w) _ = !0;
              else if (_ || (h.length > 0 && m < y)) _ = !1;
              else if (null === c.timestamp[0]) c.timestamp[0] = e;
              else if (e === c.timestamp[0]);
              else {
                ((c.timestamp[1] = e), h.push(b), o && f.push(v));
                const [t, n] = this.findLongestCommonSequence(h, f),
                  r = this.decode(t);
                ((c.text = r),
                  o && (c.words = this.collateWordTimestamps(t, n, a)),
                  l.push(c),
                  (h = []),
                  (b = []),
                  (f = []),
                  (v = []),
                  (c = i()));
              }
            } else if ((b.push(m), o)) {
              let e,
                t = Yo(s[n] + u, 2);
              if (n + 1 < s.length) {
                e = Yo(s[n + 1] + u, 2);
                const a = this.decode([m]);
                Xl.test(a) && (e = Yo(Math.min(t + r, e), 2));
              } else e = null;
              v.push([t, e]);
            }
          }
          if ('stride' in n) {
            const [e, t, r] = n.stride;
            u += e - r;
          }
          b.length > 0
            ? (h.push(b), o && f.push(v))
            : h.every(e => 0 === e.length) &&
              ((c = i()), (h = []), (b = []), (f = []), (v = []));
        }
        if (h.length > 0) {
          if (s && t)
            throw new Error(
              'Whisper did not predict an ending timestamp, which can happen if audio is cut off in the middle of a word. Also make sure WhisperTimeStampLogitsProcessor was used during generation.'
            );
          const [e, n] = this.findLongestCommonSequence(h, f),
            r = this.decode(e);
          ((c.text = r),
            o && (c.words = this.collateWordTimestamps(e, n, a)),
            l.push(c));
        }
        let w = Object.create(null);
        const y = l.map(e => e.text).join('');
        if (t || n) {
          for (let e = 0; e < l.length; ++e) {
            const r = l[e];
            (t || delete r.timestamp, n || delete r.language);
          }
          if (o) {
            const e = [];
            for (const t of l) for (const n of t.words) e.push(n);
            w = { chunks: e };
          } else w = { chunks: l };
        }
        return [y, w];
      }
      findLongestCommonSequence(e, t = null) {
        let n = e[0],
          r = n.length,
          s = [];
        const a = Array.isArray(t) && t.length > 0;
        let o = a ? [] : null,
          i = a ? t[0] : null;
        for (let l = 1; l < e.length; ++l) {
          const c = e[l];
          let u = 0,
            d = [r, r, 0, 0];
          const p = c.length;
          for (let e = 1; e < r + p; ++e) {
            const s = Math.max(0, r - e),
              o = Math.min(r, r + p - e),
              h = n.slice(s, o),
              f = Math.max(0, e - r),
              _ = Math.min(p, e),
              m = c.slice(f, _);
            if (h.length !== m.length)
              throw new Error(
                'There is a bug within whisper `decode_asr` function, please report it. Dropping to prevent bad inference.'
              );
            let g;
            g = a
              ? h.filter((e, n) => e === m[n] && i[s + n] <= t[l][f + n]).length
              : h.filter((e, t) => e === m[t]).length;
            const w = g / e + e / 1e4;
            g > 1 && w > u && ((u = w), (d = [s, o, f, _]));
          }
          const [h, f, _, m] = d,
            g = Math.floor((f + h) / 2),
            w = Math.floor((m + _) / 2);
          (s.push(...n.slice(0, g)),
            (n = c.slice(w)),
            (r = n.length),
            a && (o.push(...i.slice(0, g)), (i = t[l].slice(w))));
        }
        return (s.push(...n), a ? (o.push(...i), [s, o]) : [s, []]);
      }
      collateWordTimestamps(e, t, n) {
        const [r, s, a] = this.combineTokensIntoWords(e, n),
          o = [];
        for (let e = 0; e < r.length; ++e) {
          const n = a[e];
          o.push({ text: r[e], timestamp: [t[n.at(0)][0], t[n.at(-1)][1]] });
        }
        return o;
      }
      combineTokensIntoWords(
        e,
        t,
        n = '"\'“¡¿([{-',
        r = '"\'.。,，!！?？:：”)]}、'
      ) {
        let s, a, o;
        return (
          ['chinese', 'japanese', 'thai', 'lao', 'myanmar'].includes(
            (t = t ?? 'english')
          )
            ? ([s, a, o] = this.splitTokensOnUnicode(e))
            : ([s, a, o] = this.splitTokensOnSpaces(e)),
          this.mergePunctuations(s, a, o, n, r)
        );
      }
      decode(e, t) {
        let n;
        return (
          t?.decode_with_timestamps
            ? (e instanceof Ci && (e = Yi(e)),
              (n = this.decodeWithTimestamps(e, t)))
            : (n = super.decode(e, t)),
          n
        );
      }
      decodeWithTimestamps(e, t) {
        const n = t?.time_precision ?? 0.02,
          r = this.all_special_ids.at(-1) + 1;
        let s = [[]];
        for (let t of e)
          if (((t = Number(t)), t >= r)) {
            const e = ((t - r) * n).toFixed(2);
            (s.push(`<|${e}|>`), s.push([]));
          } else s[s.length - 1].push(t);
        return (
          (s = s.map(e => ('string' == typeof e ? e : super.decode(e, t)))),
          s.join('')
        );
      }
      splitTokensOnUnicode(e) {
        const t = this.decode(e, { decode_with_timestamps: !0 }),
          n = [],
          r = [],
          s = [];
        let a = [],
          o = [],
          i = 0;
        for (let l = 0; l < e.length; ++l) {
          const c = e[l];
          (a.push(c), o.push(l));
          const u = this.decode(a, { decode_with_timestamps: !0 });
          (u.includes('�') && '�' !== t[i + u.indexOf('�')]) ||
            (n.push(u),
            r.push(a),
            s.push(o),
            (a = []),
            (o = []),
            (i += u.length));
        }
        return [n, r, s];
      }
      splitTokensOnSpaces(e) {
        const [t, n, r] = this.splitTokensOnUnicode(e),
          s = [],
          a = [],
          o = [];
        for (let e = 0; e < t.length; ++e) {
          const i = t[e],
            l = n[e],
            c = r[e],
            u = l[0] >= this._tokenizer.token_to_id('<|endoftext|>'),
            d = i.startsWith(' '),
            p = i.trim(),
            h = Xl.test(p);
          if (u || d || h || 0 === s.length) (s.push(i), a.push(l), o.push(c));
          else {
            const e = s.length - 1;
            ((s[e] += i), a[e].push(...l), o[e].push(...c));
          }
        }
        return [s, a, o];
      }
      mergePunctuations(e, t, n, r, s) {
        const a = structuredClone(e),
          o = structuredClone(t),
          i = structuredClone(n);
        let l = a.length - 2,
          c = a.length - 1;
        for (; l >= 0; )
          (a[l].startsWith(' ') && r.includes(a[l].trim())
            ? ((a[c] = a[l] + a[c]),
              (o[c] = Er(o[l], o[c])),
              (i[c] = Er(i[l], i[c])),
              (a[l] = ''),
              (o[l] = []),
              (i[l] = []))
            : (c = l),
            --l);
        for (l = 0, c = 1; c < a.length; )
          (!a[l].endsWith(' ') && s.includes(a[c])
            ? ((a[l] += a[c]),
              (o[l] = Er(o[l], o[c])),
              (i[l] = Er(i[l], i[c])),
              (a[c] = ''),
              (o[c] = []),
              (i[c] = []))
            : (l = c),
            ++c);
        return [
          a.filter(e => e),
          o.filter(e => e.length > 0),
          i.filter(e => e.length > 0),
        ];
      }
    },
    Jl = class extends tl {},
    Kl = class extends tl {
      return_token_type_ids = !0;
      constructor(e, t) {
        (super(e, t),
          Fr.warn(
            'WARNING: `XLMTokenizer` is not yet supported by Hugging Face\'s "fast" tokenizers library. Therefore, you may experience slightly inaccurate results.'
          ));
      }
    },
    Zl = class {
      static async from_pretrained(
        e,
        {
          progress_callback: t = null,
          config: n = null,
          cache_dir: r = null,
          local_files_only: s = !1,
          revision: a = 'main',
        } = {}
      ) {
        const [o, i] = await Xi(e, {
            progress_callback: t,
            config: n,
            cache_dir: r,
            local_files_only: s,
            revision: a,
          }),
          l = i.tokenizer_class?.replace(/Fast$/, '') ?? 'PreTrainedTokenizer';
        let c = rl[l];
        return (
          c ||
            (Fr.warn(
              `Unknown tokenizer class "${l}", attempting to construct from base class.`
            ),
            (c = tl)),
          new c(o, i)
        );
      }
    },
    ec = 'https://github.com/huggingface/transformers.js/issues/new/choose',
    tc = 'preprocessor_config.json',
    nc = tc,
    rc = class extends mo {
      static classes = [
        'image_processor_class',
        'tokenizer_class',
        'feature_extractor_class',
      ];
      static uses_processor_config = !1;
      static uses_chat_template_file = !1;
      constructor(e, t, n) {
        (super(),
          (this.config = e),
          (this.components = t),
          (this.chat_template = n));
      }
      get image_processor() {
        return this.components.image_processor;
      }
      get tokenizer() {
        return this.components.tokenizer;
      }
      get feature_extractor() {
        return this.components.feature_extractor;
      }
      apply_chat_template(e, t = {}) {
        if (!this.tokenizer)
          throw new Error('Unable to apply chat template without a tokenizer.');
        return this.tokenizer.apply_chat_template(e, {
          tokenize: !1,
          chat_template: this.chat_template ?? void 0,
          ...t,
        });
      }
      batch_decode(...e) {
        if (!this.tokenizer)
          throw new Error('Unable to decode without a tokenizer.');
        return this.tokenizer.batch_decode(...e);
      }
      decode(...e) {
        if (!this.tokenizer)
          throw new Error('Unable to decode without a tokenizer.');
        return this.tokenizer.decode(...e);
      }
      async _call(e, ...t) {
        for (const n of [
          this.image_processor,
          this.feature_extractor,
          this.tokenizer,
        ])
          if (n) return n(e, ...t);
        throw new Error(
          'No image processor, feature extractor, or tokenizer found.'
        );
      }
      static async from_pretrained(e, t = {}) {
        const [n, r, s] = await Promise.all([
          this.uses_processor_config
            ? Ro(e, 'processor_config.json', !0, t)
            : {},
          Promise.all(
            this.classes
              .filter(e => e in this)
              .map(async n => {
                const r = await this[n].from_pretrained(e, t);
                return [n.replace(/_class$/, ''), r];
              })
          ).then(Object.fromEntries),
          this.uses_chat_template_file
            ? Do(e, 'chat_template.jinja', !0, t)
            : null,
        ]);
        return new this(n, r, s);
      }
    };
  Wn(
    {},
    {
      ChatterboxProcessor: () => Dc,
      Florence2Processor: () => pd,
      Gemma3nProcessor: () => hd,
      GroundingDinoProcessor: () => _d,
      Idefics3Processor: () => gd,
      JinaCLIPProcessor: () => yd,
      LlavaProcessor: () => bd,
      MgpstrProcessor: () => xd,
      MoonshineProcessor: () => Md,
      OwlViTProcessor: () => kd,
      PaliGemmaProcessor: () => Ad,
      Phi3VProcessor: () => Sd,
      PixtralProcessor: () => Pd,
      Processor: () => rc,
      PyAnnoteProcessor: () => Fd,
      Qwen2VLProcessor: () => Id,
      Qwen2_5_VLProcessor: () => Od,
      Qwen3VLProcessor: () => Ld,
      Sam2Processor: () => Nd,
      Sam2VideoProcessor: () => Bd,
      SamProcessor: () => zd,
      SmolVLMProcessor: () => gd,
      SpeechT5Processor: () => $d,
      UltravoxProcessor: () => Dd,
      VLChatProcessor: () => wd,
      VoxtralProcessor: () => Ud,
      Wav2Vec2Processor: () => Gd,
      Wav2Vec2ProcessorWithLM: () => Vd,
      WhisperProcessor: () => jd,
    }
  );
  var sc = class extends mo {
    constructor(e) {
      (super(), (this.config = e));
    }
    static async from_pretrained(e, t = {}) {
      return new this(await Ro(e, tc, !0, t));
    }
  };
  function ac(e, t) {
    if (!(e instanceof Float32Array || e instanceof Float64Array))
      throw new Error(
        `${t} expects input to be a Float32Array or a Float64Array, but got ${e?.constructor?.name ?? typeof e} instead. If using the feature extractor directly, remember to use \`read_audio(url, sampling_rate)\` to obtain the raw audio data of the file/url.`
      );
  }
  var oc = {};
  Wn(oc, {
    ASTFeatureExtractor: () => Mc,
    ChatterboxFeatureExtractor: () => Ec,
    ClapFeatureExtractor: () => Ac,
    DacFeatureExtractor: () => Tc,
    EncodecFeatureExtractor: () => kc,
    FeatureExtractor: () => sc,
    Gemma3nAudioFeatureExtractor: () => Cc,
    MoonshineFeatureExtractor: () => Sc,
    ParakeetFeatureExtractor: () => Pc,
    PyAnnoteFeatureExtractor: () => Fc,
    SeamlessM4TFeatureExtractor: () => Ic,
    SnacFeatureExtractor: () => Oc,
    SpeechT5FeatureExtractor: () => Lc,
    Wav2Vec2FeatureExtractor: () => zc,
    WeSpeakerFeatureExtractor: () => Nc,
    WhisperFeatureExtractor: () => Bc,
  });
  async function ic(e, t) {
    if (dr.IS_BROWSER_ENV) {
      if (dr.IS_WEBWORKER_ENV)
        throw new Error('Unable to save a file from a Web Worker.');
      const n = URL.createObjectURL(t),
        r = document.createElement('a');
      ((r.href = n),
        (r.download = e),
        r.click(),
        r.remove(),
        URL.revokeObjectURL(n));
    } else {
      if (!dr.IS_FS_AVAILABLE)
        throw new Error(
          'Unable to save because filesystem is disabled in this environment.'
        );
      (t.stream(), qn.createWriteStream(e));
      await void 0;
    }
  }
  function lc(e, t) {
    if (e < 1) return new Float64Array();
    if (1 === e) return new Float64Array([1]);
    const n = 1 - t,
      r = (2 * Math.PI) / (e - 1),
      s = new Float64Array(e);
    for (let a = 0; a < e; ++a) s[a] = t - n * Math.cos(a * r);
    return s;
  }
  function cc(e) {
    return lc(e, 0.5);
  }
  var uc = {
    htk: e => 2595 * Math.log10(1 + e / 700),
    kaldi: e => 1127 * Math.log(1 + e / 700),
    slaney: (e, t = 1e3, n = 15, r = 27 / Math.log(6.4)) =>
      e >= t ? n + Math.log(e / t) * r : (3 * e) / 200,
  };
  function dc(e, t = 'htk') {
    const n = uc[t];
    if (!n)
      throw new Error('mel_scale should be one of "htk", "slaney" or "kaldi".');
    return 'number' == typeof e ? n(e) : e.map(e => n(e));
  }
  var pc = {
    htk: e => 700 * (10 ** (e / 2595) - 1),
    kaldi: e => 700 * (Math.exp(e / 1127) - 1),
    slaney: (e, t = 1e3, n = 15, r = Math.log(6.4) / 27) =>
      e >= n ? t * Math.exp(r * (e - n)) : (200 * e) / 3,
  };
  function hc(e, t, n) {
    const r = (t - e) / (n - 1);
    return Float64Array.from({ length: n }, (t, n) => e + r * n);
  }
  function fc(e, t, n, r, s, a = null, o = 'htk', i = !1) {
    if (null !== a && 'slaney' !== a)
      throw new Error('norm must be one of null or "slaney"');
    if (e < 2) throw new Error(`Require num_frequency_bins: ${e} >= 2`);
    if (n > r)
      throw new Error(`Require min_frequency: ${n} <= max_frequency: ${r}`);
    const l = hc(dc(n, o), dc(r, o), t + 2);
    let c,
      u = (function (e, t = 'htk') {
        const n = pc[t];
        if (!n)
          throw new Error(
            'mel_scale should be one of "htk", "slaney" or "kaldi".'
          );
        return 'number' == typeof e ? n(e) : e.map(e => n(e));
      })(l, o);
    if (i) {
      const t = s / (2 * (e - 1));
      ((c = dc(
        Float64Array.from({ length: e }, (e, n) => n * t),
        o
      )),
        (u = l));
    } else c = hc(0, Math.floor(s / 2), e);
    const d = (function (e, t) {
      const n = Float64Array.from(
          { length: t.length - 1 },
          (e, n) => t[n + 1] - t[n]
        ),
        r = Array.from({ length: e.length }, () => new Array(t.length));
      for (let n = 0; n < e.length; ++n) {
        const s = r[n];
        for (let r = 0; r < t.length; ++r) s[r] = t[r] - e[n];
      }
      const s = t.length - 2,
        a = Array.from({ length: s }, () => new Array(e.length));
      for (let t = 0; t < e.length; ++t) {
        const e = r[t];
        for (let r = 0; r < s; ++r) {
          const s = -e[r] / n[r],
            o = e[r + 2] / n[r + 1];
          a[r][t] = Math.max(0, Math.min(s, o));
        }
      }
      return a;
    })(c, u);
    if (null !== a && 'slaney' === a)
      for (let n = 0; n < t; ++n) {
        const t = d[n],
          r = 2 / (u[n + 2] - u[n]);
        for (let n = 0; n < e; ++n) t[n] *= r;
      }
    return d;
  }
  function _c(e, t, n, r, s) {
    if (n <= 0) throw new Error('reference must be greater than zero');
    if (r <= 0) throw new Error('min_value must be greater than zero');
    n = Math.max(r, n);
    const a = Math.log10(n);
    for (let n = 0; n < e.length; ++n)
      e[n] = t * Math.log10(Math.max(r, e[n]) - a);
    if (null !== s) {
      if (s <= 0) throw new Error('db_range must be greater than zero');
      const t = jo(e)[0] - s;
      for (let n = 0; n < e.length; ++n) e[n] = Math.max(e[n], t);
    }
    return e;
  }
  async function mc(
    e,
    t,
    n,
    r,
    {
      fft_length: s = null,
      power: a = 1,
      center: o = !0,
      pad_mode: i = 'reflect',
      onesided: l = !0,
      preemphasis: c = null,
      preemphasis_htk_flavor: u = !0,
      mel_filters: d = null,
      mel_floor: p = 1e-10,
      log_mel: h = null,
      reference: f = 1,
      min_value: _ = 1e-10,
      db_range: m = null,
      remove_dc_offset: g = null,
      min_num_frames: w = null,
      max_num_frames: y = null,
      do_pad: b = !0,
      transpose: v = !1,
      mel_offset: x = 0,
    } = {}
  ) {
    const M = t.length;
    if ((null === s && (s = n), n > s))
      throw Error(
        `frame_length (${n}) may not be larger than fft_length (${s})`
      );
    if (M !== n)
      throw new Error(
        `Length of the window (${M}) must equal frame_length (${n})`
      );
    if (r <= 0) throw new Error('hop_length must be greater than zero');
    if (null === a && null !== d)
      throw new Error(
        'You have provided `mel_filters` but `power` is `None`. Mel spectrogram computation is not yet supported for complex-valued spectrogram. Specify `power` to fix this issue.'
      );
    if (!u)
      throw new Error(
        '`preemphasis_htk_flavor=false` is not currently supported.'
      );
    if (o)
      switch (i) {
        case 'reflect': {
          const t = Math.floor((s - 1) / 2) + 1;
          e = (function (e, t, n) {
            const r = new e.constructor(e.length + t + n),
              s = e.length - 1;
            for (let n = 0; n < e.length; ++n) r[t + n] = e[n];
            for (let n = 1; n <= t; ++n) r[t - n] = e[Tr(n, s)];
            for (let a = 1; a <= n; ++a) r[s + t + a] = e[Tr(s - a, s)];
            return r;
          })(e, t, t);
          break;
        }
        case 'constant': {
          const t = Math.floor(s / 2),
            n = new e.constructor(e.length + 2 * t);
          (n.set(e, t), (e = n));
          break;
        }
        default:
          throw new Error(`pad_mode="${i}" not implemented yet.`);
      }
    let k = Math.floor(1 + Math.floor((e.length - n) / r));
    null !== w && k < w && (k = w);
    const E = l ? Math.floor(s / 2) + 1 : s;
    let A = k,
      T = k;
    null !== y && (y > k ? b && (T = y) : (T = A = y));
    const C = new Qo(s),
      S = new Float64Array(s),
      P = new Float64Array(C.outputBufferSize),
      F = new Float32Array(E * T);
    for (let s = 0; s < A; ++s) {
      const a = s * r,
        o = Math.min(e.length - a, n);
      o !== n && S.fill(0, 0, n);
      for (let t = 0; t < o; ++t) S[t] = e[a + t];
      if (g) {
        let e = 0;
        for (let t = 0; t < o; ++t) e += S[t];
        const t = e / o;
        for (let e = 0; e < o; ++e) S[e] -= t;
      }
      if (null !== c) {
        for (let e = o - 1; e >= 1; --e) S[e] -= c * S[e - 1];
        S[0] *= 1 - c;
      }
      for (let e = 0; e < t.length; ++e) S[e] *= t[e];
      C.realTransform(P, S);
      for (let e = 0; e < E; ++e) {
        const t = e << 1;
        F[e * T + s] = P[t] ** 2 + P[t + 1] ** 2;
      }
    }
    if (null !== a && 2 !== a) {
      const e = a / 2;
      for (let t = 0; t < F.length; ++t) F[t] **= e;
    }
    const I = d.length;
    let O = await (async function (e, t) {
      const n = await yi.matmul;
      return await n({ a: e, b: t });
    })(new Ci('float32', d.flat(), [I, E]), new Ci('float32', F, [E, T]));
    v && (O = O.transpose(1, 0));
    const L = O.data;
    for (let e = 0; e < L.length; ++e) L[e] = x + Math.max(p, L[e]);
    if (null !== a && null !== h) {
      const e = Math.min(L.length, A * I);
      switch (h) {
        case 'log':
          for (let t = 0; t < e; ++t) L[t] = Math.log(L[t]);
          break;
        case 'log10':
          for (let t = 0; t < e; ++t) L[t] = Math.log10(L[t]);
          break;
        case 'dB':
          if (1 === a)
            !(function (e, t = 1, n = 1e-5, r = null) {
              _c(e, 20, t, n, r);
            })(L, f, _, m);
          else {
            if (2 !== a)
              throw new Error(
                `Cannot use log_mel option '${h}' with power ${a}`
              );
            !(function (e, t = 1, n = 1e-10, r = null) {
              _c(e, 10, t, n, r);
            })(L, f, _, m);
          }
          break;
        default:
          throw new Error(
            `log_mel must be one of null, 'log', 'log10' or 'dB'. Got '${h}'`
          );
      }
    }
    return O;
  }
  function gc(
    e,
    t,
    { periodic: n = !0, frame_length: r = null, center: s = !0 } = {}
  ) {
    const a = n ? e + 1 : e;
    let o;
    switch (t) {
      case 'boxcar':
        o = new Float64Array(a).fill(1);
        break;
      case 'hann':
      case 'hann_window':
        o = cc(a);
        break;
      case 'hamming':
        o = lc(a, 0.54);
        break;
      case 'povey':
        o = cc(a).map(e => Math.pow(e, 0.85));
        break;
      default:
        throw new Error(`Unknown window type ${t}.`);
    }
    if ((n && (o = o.subarray(0, e)), null === r)) return o;
    if (e > r)
      throw new Error(
        `Length of the window (${e}) may not be larger than frame_length (${r})`
      );
    return o;
  }
  function wc(e, t, n) {
    for (let r = 0; r < n.length; ++r) e.setUint8(t + r, n.charCodeAt(r));
  }
  var yc,
    bc,
    vc,
    xc = class {
      constructor(e, t) {
        ((this.audio = e), (this.sampling_rate = t));
      }
      get data() {
        if (Array.isArray(this.audio)) {
          if (0 === this.audio.length) return new Float32Array(0);
          if (1 === this.audio.length) return this.audio[0];
          const e = this.audio.reduce((e, t) => e + t.length, 0),
            t = new Float32Array(e);
          let n = 0;
          for (const e of this.audio) (t.set(e, n), (n += e.length));
          return t;
        }
        return this.audio;
      }
      toBlob() {
        let e = this.audio;
        return (
          e instanceof Float32Array && (e = [e]),
          (function (e, t) {
            const n = e.reduce((e, t) => e + t.length, 0),
              r = new ArrayBuffer(44),
              s = new DataView(r);
            return (
              wc(s, 0, 'RIFF'),
              s.setUint32(4, 36 + 4 * n, !0),
              wc(s, 8, 'WAVE'),
              wc(s, 12, 'fmt '),
              s.setUint32(16, 16, !0),
              s.setUint16(20, 3, !0),
              s.setUint16(22, 1, !0),
              s.setUint32(24, t, !0),
              s.setUint32(28, 4 * t, !0),
              s.setUint16(32, 4, !0),
              s.setUint16(34, 32, !0),
              wc(s, 36, 'data'),
              s.setUint32(40, 4 * n, !0),
              new Blob([r, ...e.map(e => e.buffer)], { type: 'audio/wav' })
            );
          })(e, this.sampling_rate)
        );
      }
      async save(e) {
        return ic(e, this.toBlob());
      }
    },
    Mc = class extends sc {
      constructor(e) {
        super(e);
        const t = this.config.sampling_rate,
          n = fc(
            257,
            this.config.num_mel_bins,
            20,
            Math.floor(t / 2),
            t,
            null,
            'kaldi',
            !0
          );
        ((this.mel_filters = n),
          (this.window = gc(400, 'hann', { periodic: !1 })),
          (this.mean = this.config.mean),
          (this.std = this.config.std));
      }
      async _extract_fbank_features(e, t) {
        return mc(e, this.window, 400, 160, {
          fft_length: 512,
          power: 2,
          center: !1,
          preemphasis: 0.97,
          mel_filters: this.mel_filters,
          log_mel: 'log',
          mel_floor: 1.192092955078125e-7,
          remove_dc_offset: !0,
          max_num_frames: t,
          transpose: !0,
        });
      }
      async _call(e) {
        ac(e, 'ASTFeatureExtractor');
        const t = await this._extract_fbank_features(e, this.config.max_length);
        if (this.config.do_normalize) {
          const e = 2 * this.std,
            n = t.data;
          for (let t = 0; t < n.length; ++t) n[t] = (n[t] - this.mean) / e;
        }
        return { input_values: t.unsqueeze_(0) };
      }
    },
    kc = class extends sc {
      async _call(e) {
        (ac(e, 'EncodecFeatureExtractor'),
          e instanceof Float64Array && (e = new Float32Array(e)));
        const t = this.config.feature_size;
        if (e.length % t !== 0)
          throw new Error(
            `The length of the audio data must be a multiple of the number of channels (${t}).`
          );
        const n = [1, t, e.length / t];
        return { input_values: new Ci('float32', e, n) };
      }
    },
    Ec = class extends sc {
      async _call(e) {
        (ac(e, 'ChatterboxFeatureExtractor'),
          e instanceof Float64Array && (e = new Float32Array(e)));
        const t = [1, e.length];
        return { input_values: new Ci('float32', e, t) };
      }
    },
    Ac = class extends sc {
      constructor(e) {
        (super(e),
          (this.mel_filters = fc(
            this.config.nb_frequency_bins,
            this.config.feature_size,
            this.config.frequency_min,
            this.config.frequency_max,
            this.config.sampling_rate,
            null,
            'htk'
          )),
          (this.mel_filters_slaney = fc(
            this.config.nb_frequency_bins,
            this.config.feature_size,
            this.config.frequency_min,
            this.config.frequency_max,
            this.config.sampling_rate,
            'slaney',
            'slaney'
          )),
          (this.window = gc(this.config.fft_window_size, 'hann')));
      }
      async _get_input_mel(e, t, n, r) {
        let s,
          a = !1;
        const o = e.length - t;
        if (o > 0) {
          if ('rand_trunc' !== n)
            throw new Error(`Truncation strategy "${n}" not implemented`);
          {
            a = !0;
            const n = Math.floor(xo.random() * (o + 1));
            ((e = e.subarray(n, n + t)),
              (s = await this._extract_fbank_features(
                e,
                this.mel_filters_slaney,
                this.config.nb_max_samples
              )));
          }
        } else {
          if (o < 0) {
            let n = new Float64Array(t);
            if ((n.set(e), 'repeat' === r))
              for (let r = e.length; r < t; r += e.length)
                n.set(e.subarray(0, Math.min(e.length, t - r)), r);
            else if ('repeatpad' === r)
              for (let t = e.length; t < -o; t += e.length) n.set(e, t);
            e = n;
          }
          if ('fusion' === n)
            throw new Error(`Truncation strategy "${n}" not implemented`);
          s = await this._extract_fbank_features(
            e,
            this.mel_filters_slaney,
            this.config.nb_max_samples
          );
        }
        return s.unsqueeze_(0);
      }
      async _extract_fbank_features(e, t, n = null) {
        return mc(
          e,
          this.window,
          this.config.fft_window_size,
          this.config.hop_length,
          {
            power: 2,
            mel_filters: t,
            log_mel: 'dB',
            max_num_frames: n,
            do_pad: !1,
            transpose: !0,
          }
        );
      }
      async _call(e, { max_length: t = null } = {}) {
        return (
          ac(e, 'ClapFeatureExtractor'),
          {
            input_features: (
              await this._get_input_mel(
                e,
                t ?? this.config.nb_max_samples,
                this.config.truncation,
                this.config.padding
              )
            ).unsqueeze_(0),
          }
        );
      }
    },
    Tc = class extends kc {},
    Cc = class extends sc {
      constructor(e) {
        super(e);
        const {
            fft_length: t,
            feature_size: n,
            min_frequency: r,
            max_frequency: s,
            sampling_rate: a,
            frame_length: o,
          } = this.config,
          i = fc(Math.floor(1 + t / 2), n, r, s, a, null, 'htk', !1);
        ((this.mel_filters = i), (this.window = gc(o, 'hann')));
      }
      async _extract_fbank_features(e, t) {
        return mc(
          e,
          this.window,
          this.config.frame_length,
          this.config.hop_length,
          {
            fft_length: this.config.fft_length,
            center: !1,
            onesided: !0,
            preemphasis: this.config.preemphasis,
            preemphasis_htk_flavor: this.config.preemphasis_htk_flavor,
            mel_filters: this.mel_filters,
            log_mel: 'log',
            mel_floor: this.config.mel_floor,
            remove_dc_offset: !1,
            transpose: !0,
          }
        );
      }
      async _call(
        e,
        {
          max_length: t = 48e4,
          truncation: n = !0,
          padding: r = !0,
          pad_to_multiple_of: s = 128,
        } = {}
      ) {
        if (
          (ac(e, 'Gemma3nAudioFeatureExtractor'),
          n && e.length > t && (e = e.slice(0, t)),
          r && e.length % s !== 0)
        ) {
          const t = s - (e.length % s),
            n = new Float64Array(e.length + t);
          (n.set(e),
            0 !== this.config.padding_value &&
              n.fill(this.config.padding_value, e.length),
            (e = n));
        }
        const a = await this._extract_fbank_features(e, this.config.max_length),
          o = Vi([1, a.dims[0]], !0);
        return { input_features: a.unsqueeze_(0), input_features_mask: o };
      }
    },
    Sc = class extends sc {
      async _call(e) {
        (ac(e, 'MoonshineFeatureExtractor'),
          e instanceof Float64Array && (e = new Float32Array(e)));
        const t = [1, e.length];
        return { input_values: new Ci('float32', e, t) };
      }
    },
    Pc = class extends sc {
      constructor(e) {
        (super(e),
          (this.config.mel_filters ??= fc(
            Math.floor(1 + this.config.n_fft / 2),
            this.config.feature_size,
            0,
            this.config.sampling_rate / 2,
            this.config.sampling_rate,
            'slaney',
            'slaney'
          )));
        const t = gc(this.config.win_length, 'hann', { periodic: !1 });
        this.window = new Float64Array(this.config.n_fft);
        const n = Math.floor((this.config.n_fft - this.config.win_length) / 2);
        this.window.set(t, n);
      }
      async _extract_fbank_features(e) {
        const t = this.config.preemphasis;
        for (let n = (e = new Float64Array(e)).length - 1; n >= 1; --n)
          e[n] -= t * e[n - 1];
        return await mc(
          e,
          this.window,
          this.window.length,
          this.config.hop_length,
          {
            fft_length: this.config.n_fft,
            power: 2,
            mel_filters: this.config.mel_filters,
            log_mel: 'log',
            mel_floor: -1 / 0,
            pad_mode: 'constant',
            center: !0,
            transpose: !0,
            mel_offset: 2 ** -24,
          }
        );
      }
      async _call(e) {
        ac(e, 'ParakeetFeatureExtractor');
        const t = await this._extract_fbank_features(e),
          n = Math.floor(
            (e.length +
              2 * Math.floor(this.config.n_fft / 2) -
              this.config.n_fft) /
              this.config.hop_length
          ),
          r = t.data;
        r.fill(0, n * t.dims[1]);
        const [s, a] = t.dims,
          o = new Float64Array(a),
          i = new Float64Array(a);
        for (let e = 0; e < n; ++e) {
          const t = e * a;
          for (let e = 0; e < a; ++e) {
            const n = r[t + e];
            ((o[e] += n), (i[e] += n * n));
          }
        }
        const l = n > 1 ? n - 1 : 1;
        for (let e = 0; e < a; ++e) {
          const t = o[e] / n,
            s = (i[e] - n * t * t) / l,
            c = 1 / (Math.sqrt(s) + 1e-5);
          for (let s = 0; s < n; ++s) {
            const n = s * a + e;
            r[n] = (r[n] - t) * c;
          }
        }
        const c = new BigInt64Array(s);
        return (
          c.fill(1n, 0, n),
          {
            input_features: t.unsqueeze_(0),
            attention_mask: new Ci('int64', c, [1, s]),
          }
        );
      }
    },
    Fc = class extends sc {
      async _call(e) {
        (ac(e, 'PyAnnoteFeatureExtractor'),
          e instanceof Float64Array && (e = new Float32Array(e)));
        const t = [1, 1, e.length];
        return { input_values: new Ci('float32', e, t) };
      }
      samples_to_frames(e) {
        return (e - this.config.offset) / this.config.step;
      }
      post_process_speaker_diarization(e, t) {
        const n = t / this.samples_to_frames(t) / this.config.sampling_rate,
          r = [];
        for (const t of e.tolist()) {
          const e = [];
          let s = -1;
          for (let n = 0; n < t.length; ++n) {
            const r = Uo(t[n]),
              [a, o] = jo(r),
              [i, l] = [n, n + 1];
            o !== s
              ? ((s = o), e.push({ id: o, start: i, end: l, score: a }))
              : ((e.at(-1).end = l), (e.at(-1).score += a));
          }
          r.push(
            e.map(({ id: e, start: t, end: r, score: s }) => ({
              id: e,
              start: t * n,
              end: r * n,
              confidence: s / (r - t),
            }))
          );
        }
        return r;
      }
    },
    Ic = class extends sc {
      constructor(e) {
        super(e);
        const t = this.config.sampling_rate,
          n = fc(
            257,
            this.config.num_mel_bins,
            20,
            Math.floor(t / 2),
            t,
            null,
            'kaldi',
            !0
          );
        ((this.mel_filters = n),
          (this.window = gc(400, 'povey', { periodic: !1 })));
      }
      async _extract_fbank_features(e, t) {
        return mc((e = e.map(e => 32768 * e)), this.window, 400, 160, {
          fft_length: 512,
          power: 2,
          center: !1,
          preemphasis: 0.97,
          mel_filters: this.mel_filters,
          log_mel: 'log',
          mel_floor: 1.192092955078125e-7,
          remove_dc_offset: !0,
          max_num_frames: t,
          transpose: !0,
        });
      }
      async _call(
        e,
        {
          padding: t = !0,
          pad_to_multiple_of: n = 2,
          do_normalize_per_mel_bins: r = !0,
          return_attention_mask: s = !0,
        } = {}
      ) {
        ac(e, 'SeamlessM4TFeatureExtractor');
        let a,
          o = await this._extract_fbank_features(e, this.config.max_length);
        if (r) {
          const [e, t] = o.dims,
            n = o.data;
          for (let r = 0; r < t; ++r) {
            let s = 0;
            for (let a = 0; a < e; ++a) s += n[a * t + r];
            const a = s / e;
            let o = 0;
            for (let s = 0; s < e; ++s) o += (n[s * t + r] - a) ** 2;
            o /= e - 1;
            const i = Math.sqrt(o + 1e-7);
            for (let s = 0; s < e; ++s) {
              const e = s * t + r;
              n[e] = (n[e] - a) / i;
            }
          }
        }
        if (t) {
          const [e, t] = o.dims,
            r = o.data,
            i = e % n;
          if (i > 0) {
            const n = new Float32Array(t * (e + i));
            (n.set(r), n.fill(this.config.padding_value, r.length));
            const l = e + i;
            ((o = new Ci(o.type, n, [l, t])),
              s &&
                ((a = new Ci('int64', new BigInt64Array(l), [1, l])),
                a.data.fill(1n, 0, e)));
          }
        }
        const [i, l] = o.dims,
          c = this.config.stride;
        if (0 !== i % c)
          throw new Error(
            `The number of frames (${i}) must be a multiple of the stride (${c}).`
          );
        const u = o.view(1, Math.floor(i / c), l * c),
          d = { input_features: u };
        if (s) {
          const e = u.dims[1],
            t = new BigInt64Array(e);
          if (a) {
            const e = a.data;
            for (let n = 1, r = 0; n < i; n += c, ++r) t[r] = e[n];
          } else t.fill(1n);
          d.attention_mask = new Ci('int64', t, [1, e]);
        }
        return d;
      }
    },
    Oc = class extends Tc {},
    Lc = class extends sc {},
    zc = class extends sc {
      _zero_mean_unit_var_norm(e) {
        const t = e.reduce((e, t) => e + t, 0),
          n = t / e.length,
          r = e.reduce((e, t) => e + (t - n) ** 2, 0) / e.length;
        return e.map(e => (e - n) / Math.sqrt(r + 1e-7));
      }
      async _call(e) {
        (ac(e, 'Wav2Vec2FeatureExtractor'),
          e instanceof Float64Array && (e = new Float32Array(e)));
        let t = e;
        this.config.do_normalize && (t = this._zero_mean_unit_var_norm(t));
        const n = [1, t.length];
        return {
          input_values: new Ci('float32', t, n),
          attention_mask: new Ci(
            'int64',
            new BigInt64Array(t.length).fill(1n),
            n
          ),
        };
      }
    },
    Nc = class extends sc {
      constructor(e) {
        super(e);
        const t = this.config.sampling_rate,
          n = fc(
            257,
            this.config.num_mel_bins,
            20,
            Math.floor(t / 2),
            t,
            null,
            'kaldi',
            !0
          );
        ((this.mel_filters = n),
          (this.window = gc(400, 'hamming', { periodic: !1 })),
          (this.min_num_frames = this.config.min_num_frames));
      }
      async _extract_fbank_features(e) {
        return mc((e = e.map(e => 32768 * e)), this.window, 400, 160, {
          fft_length: 512,
          power: 2,
          center: !1,
          preemphasis: 0.97,
          mel_filters: this.mel_filters,
          log_mel: 'log',
          mel_floor: 1.192092955078125e-7,
          remove_dc_offset: !0,
          transpose: !0,
          min_num_frames: this.min_num_frames,
        });
      }
      async _call(e) {
        ac(e, 'WeSpeakerFeatureExtractor');
        const t = (await this._extract_fbank_features(e)).unsqueeze_(0);
        if (null === this.config.fbank_centering_span) {
          const e = t.mean(1).data,
            n = t.data,
            [r, s, a] = t.dims;
          for (let t = 0; t < r; ++t) {
            const r = t * s * a,
              o = t * a;
            for (let t = 0; t < s; ++t) {
              const s = r + t * a;
              for (let t = 0; t < a; ++t) n[s + t] -= e[o + t];
            }
          }
        }
        return { input_features: t };
      }
    },
    Bc = class extends sc {
      constructor(e) {
        (super(e),
          (this.config.mel_filters ??= fc(
            Math.floor(1 + this.config.n_fft / 2),
            this.config.feature_size,
            0,
            8e3,
            this.config.sampling_rate,
            'slaney',
            'slaney'
          )),
          (this.window = gc(this.config.n_fft, 'hann')));
      }
      async _extract_fbank_features(e) {
        const t = await mc(
            e,
            this.window,
            this.config.n_fft,
            this.config.hop_length,
            {
              power: 2,
              mel_filters: this.config.mel_filters,
              log_mel: 'log10',
              max_num_frames: Math.min(
                Math.floor(e.length / this.config.hop_length),
                this.config.nb_max_frames
              ),
            }
          ),
          n = t.data,
          r = jo(n)[0];
        for (let e = 0; e < n.length; ++e)
          n[e] = (Math.max(n[e], r - 8) + 4) / 4;
        return t;
      }
      async _call(e, { max_length: t = null } = {}) {
        let n;
        ac(e, 'WhisperFeatureExtractor');
        const r = t ?? this.config.n_samples;
        return (
          e.length > r
            ? (e.length > this.config.n_samples &&
                Fr.warn(
                  'Attempting to extract features for audio longer than 30 seconds. If using a pipeline to extract transcript from a long audio clip, remember to specify `chunk_length_s` and/or `stride_length_s`.'
                ),
              (n = e.slice(0, r)))
            : ((n = new Float32Array(r)), n.set(e)),
          {
            input_features: (await this._extract_fbank_features(n)).unsqueeze_(
              0
            ),
          }
        );
      }
    },
    $c = class {
      static async from_pretrained(e, t = {}) {
        const n = await Ro(e, tc, !0, t),
          r = n.feature_extractor_type,
          s = oc[r];
        if (!s)
          throw new Error(
            `Unknown feature_extractor_type: '${r}'. Please report this at ${ec}.`
          );
        return new s(n);
      }
    },
    Dc = class extends rc {
      static tokenizer_class = Zl;
      static feature_extractor_class = $c;
      async _call(e, t = null) {
        return {
          ...this.tokenizer(e),
          ...(t ? await this.feature_extractor(t) : {}),
        };
      }
    },
    Rc = {};
  if (dr.IS_WEB_ENV)
    ((yc = (e, t) => {
      if (!self.OffscreenCanvas)
        throw new Error('OffscreenCanvas not supported by this environment.');
      return new self.OffscreenCanvas(e, t);
    }),
      (vc = self.createImageBitmap),
      (bc = self.ImageData));
  else {
    if (!Rc) throw new Error('Unable to load image processing library.');
    vc = async e => {
      const t = (await e.metadata()).channels,
        { data: n, info: r } = await e
          .rotate()
          .raw()
          .toBuffer({ resolveWithObject: !0 }),
        s = new Vc(new Uint8ClampedArray(n), r.width, r.height, r.channels);
      return (void 0 !== t && t !== r.channels && s.convert(t), s);
    };
  }
  var Uc = {
      0: 'nearest',
      1: 'lanczos',
      2: 'bilinear',
      3: 'bicubic',
      4: 'box',
      5: 'hamming',
    },
    Gc = new Map([
      ['png', 'image/png'],
      ['jpg', 'image/jpeg'],
      ['jpeg', 'image/jpeg'],
      ['gif', 'image/gif'],
    ]),
    Vc = class e {
      constructor(e, t, n, r) {
        ((this.data = e),
          (this.width = t),
          (this.height = n),
          (this.channels = r));
      }
      get size() {
        return [this.width, this.height];
      }
      static async read(t) {
        if (t instanceof e) return t;
        if ('string' == typeof t || t instanceof URL)
          return await this.fromURL(t);
        if (t instanceof Blob) return await this.fromBlob(t);
        if (
          ('undefined' != typeof HTMLCanvasElement &&
            t instanceof HTMLCanvasElement) ||
          ('undefined' != typeof OffscreenCanvas &&
            t instanceof OffscreenCanvas)
        )
          return this.fromCanvas(t);
        throw new Error('Unsupported input type: ' + typeof t);
      }
      static fromCanvas(t) {
        if (!dr.IS_WEB_ENV)
          throw new Error(
            'fromCanvas() is only supported in browser environments.'
          );
        const n = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
        return new e(n, t.width, t.height, 4);
      }
      static async fromURL(e) {
        const t = await Oo(e);
        if (200 !== t.status)
          throw new Error(
            `Unable to read image from "${e}" (${t.status} ${t.statusText})`
          );
        const n = await t.blob();
        return this.fromBlob(n);
      }
      static async fromBlob(e) {
        if (dr.IS_WEB_ENV) {
          const t = await vc(e),
            n = yc(t.width, t.height).getContext('2d');
          return (
            n.drawImage(t, 0, 0),
            new this(
              n.getImageData(0, 0, t.width, t.height).data,
              t.width,
              t.height,
              4
            )
          );
        }
        {
          const t = Rc(await e.arrayBuffer());
          return await vc(t);
        }
      }
      static fromTensor(t, n = 'CHW') {
        if (3 !== t.dims.length)
          throw new Error(
            `Tensor should have 3 dimensions, but has ${t.dims.length} dimensions.`
          );
        if ('CHW' === n) t = t.transpose(1, 2, 0);
        else if ('HWC' !== n)
          throw new Error(`Unsupported channel format: ${n}`);
        if (
          !(t.data instanceof Uint8ClampedArray || t.data instanceof Uint8Array)
        )
          throw new Error(`Unsupported tensor type: ${t.type}`);
        switch (t.dims[2]) {
          case 1:
          case 2:
          case 3:
          case 4:
            return new e(t.data, t.dims[1], t.dims[0], t.dims[2]);
          default:
            throw new Error(`Unsupported number of channels: ${t.dims[2]}`);
        }
      }
      grayscale() {
        if (1 === this.channels) return this;
        const e = new Uint8ClampedArray(this.width * this.height * 1);
        switch (this.channels) {
          case 3:
          case 4:
            for (let t = 0, n = 0; t < this.data.length; t += this.channels) {
              const r = this.data[t],
                s = this.data[t + 1],
                a = this.data[t + 2];
              e[n++] = Math.round(0.2989 * r + 0.587 * s + 0.114 * a);
            }
            break;
          default:
            throw new Error(
              `Conversion failed due to unsupported number of channels: ${this.channels}`
            );
        }
        return this._update(e, this.width, this.height, 1);
      }
      rgb() {
        if (3 === this.channels) return this;
        const e = new Uint8ClampedArray(this.width * this.height * 3);
        switch (this.channels) {
          case 1:
            for (let t = 0, n = 0; t < this.data.length; ++t)
              ((e[n++] = this.data[t]),
                (e[n++] = this.data[t]),
                (e[n++] = this.data[t]));
            break;
          case 4:
            for (let t = 0, n = 0; t < this.data.length; t += 4)
              ((e[n++] = this.data[t]),
                (e[n++] = this.data[t + 1]),
                (e[n++] = this.data[t + 2]));
            break;
          default:
            throw new Error(
              `Conversion failed due to unsupported number of channels: ${this.channels}`
            );
        }
        return this._update(e, this.width, this.height, 3);
      }
      rgba() {
        if (4 === this.channels) return this;
        const e = new Uint8ClampedArray(this.width * this.height * 4);
        switch (this.channels) {
          case 1:
            for (let t = 0, n = 0; t < this.data.length; ++t)
              ((e[n++] = this.data[t]),
                (e[n++] = this.data[t]),
                (e[n++] = this.data[t]),
                (e[n++] = 255));
            break;
          case 3:
            for (let t = 0, n = 0; t < this.data.length; t += 3)
              ((e[n++] = this.data[t]),
                (e[n++] = this.data[t + 1]),
                (e[n++] = this.data[t + 2]),
                (e[n++] = 255));
            break;
          default:
            throw new Error(
              `Conversion failed due to unsupported number of channels: ${this.channels}`
            );
        }
        return this._update(e, this.width, this.height, 4);
      }
      putAlpha(e) {
        if (e.width !== this.width || e.height !== this.height)
          throw new Error(
            `Expected mask size to be ${this.width}x${this.height}, but got ${e.width}x${e.height}`
          );
        if (1 !== e.channels)
          throw new Error(
            `Expected mask to have 1 channel, but got ${e.channels}`
          );
        const t = this.data,
          n = e.data,
          r = this.width * this.height;
        if (3 === this.channels) {
          const e = new Uint8ClampedArray(4 * r);
          for (let s = 0, a = 0, o = 0; s < r; ++s)
            ((e[o++] = t[a++]),
              (e[o++] = t[a++]),
              (e[o++] = t[a++]),
              (e[o++] = n[s]));
          return this._update(e, this.width, this.height, 4);
        }
        if (4 === this.channels) {
          for (let e = 0; e < r; ++e) t[4 * e + 3] = n[e];
          return this;
        }
        throw new Error(
          `Expected image to have 3 or 4 channels, but got ${this.channels}`
        );
      }
      async resize(t, n, { resample: r = 2 } = {}) {
        if (this.width === t && this.height === n) return this;
        let s = Uc[r] ?? r;
        const a = Mr(t),
          o = Mr(n);
        if (a && o) return this;
        if (
          (a
            ? (t = (n / this.height) * this.width)
            : o && (n = (t / this.width) * this.height),
          dr.IS_WEB_ENV)
        ) {
          const r = this.channels,
            s = this.toCanvas(),
            a = yc(t, n).getContext('2d');
          return (
            a.drawImage(s, 0, 0, t, n),
            new e(a.getImageData(0, 0, t, n).data, t, n, 4).convert(r)
          );
        }
        {
          let e = this.toSharp();
          switch (s) {
            case 'box':
            case 'hamming':
              ('box' !== s && 'hamming' !== s) ||
                (Fr.warn(
                  `Resampling method ${s} is not yet supported. Using bilinear instead.`
                ),
                (s = 'bilinear'));
            case 'nearest':
            case 'bilinear':
            case 'bicubic':
              e = e.affine([t / this.width, 0, 0, n / this.height], {
                interpolator: s,
              });
              break;
            case 'lanczos':
              e = e.resize({
                width: t,
                height: n,
                fit: 'fill',
                kernel: 'lanczos3',
              });
              break;
            default:
              throw new Error(`Resampling method ${s} is not supported.`);
          }
          return await vc(e);
        }
      }
      async pad([t, n, r, s]) {
        if (
          ((t = Math.max(t, 0)),
          (n = Math.max(n, 0)),
          (r = Math.max(r, 0)),
          (s = Math.max(s, 0)),
          0 === t && 0 === n && 0 === r && 0 === s)
        )
          return this;
        if (dr.IS_WEB_ENV) {
          const a = this.channels,
            o = this.toCanvas(),
            i = this.width + t + n,
            l = this.height + r + s,
            c = yc(i, l).getContext('2d');
          return (
            c.drawImage(
              o,
              0,
              0,
              this.width,
              this.height,
              t,
              r,
              this.width,
              this.height
            ),
            new e(c.getImageData(0, 0, i, l).data, i, l, 4).convert(a)
          );
        }
        {
          const e = this.toSharp().extend({
            left: t,
            right: n,
            top: r,
            bottom: s,
          });
          return await vc(e);
        }
      }
      async crop([t, n, r, s]) {
        if (
          ((t = Math.max(t, 0)),
          (n = Math.max(n, 0)),
          (r = Math.min(r, this.width - 1)),
          (s = Math.min(s, this.height - 1)),
          0 === t && 0 === n && r === this.width - 1 && s === this.height - 1)
        )
          return this;
        const a = r - t + 1,
          o = s - n + 1;
        if (dr.IS_WEB_ENV) {
          const r = this.channels,
            s = this.toCanvas(),
            i = yc(a, o).getContext('2d');
          return (
            i.drawImage(s, t, n, a, o, 0, 0, a, o),
            new e(i.getImageData(0, 0, a, o).data, a, o, 4).convert(r)
          );
        }
        {
          const e = this.toSharp().extract({
            left: t,
            top: n,
            width: a,
            height: o,
          });
          return await vc(e);
        }
      }
      async center_crop(t, n) {
        if (this.width === t && this.height === n) return this;
        const r = (this.width - t) / 2,
          s = (this.height - n) / 2;
        if (dr.IS_WEB_ENV) {
          const a = this.channels,
            o = this.toCanvas(),
            i = yc(t, n).getContext('2d');
          let l = 0,
            c = 0,
            u = 0,
            d = 0;
          return (
            r >= 0 ? (l = r) : (u = -r),
            s >= 0 ? (c = s) : (d = -s),
            i.drawImage(o, l, c, t, n, u, d, t, n),
            new e(i.getImageData(0, 0, t, n).data, t, n, 4).convert(a)
          );
        }
        {
          let e = this.toSharp();
          if (r >= 0 && s >= 0)
            e = e.extract({
              left: Math.floor(r),
              top: Math.floor(s),
              width: t,
              height: n,
            });
          else if (r <= 0 && s <= 0) {
            const a = Math.floor(-s),
              o = Math.floor(-r);
            e = e.extend({
              top: a,
              left: o,
              right: t - this.width - o,
              bottom: n - this.height - a,
            });
          } else {
            let a = [0, 0],
              o = 0;
            s < 0
              ? ((a[0] = Math.floor(-s)), (a[1] = n - this.height - a[0]))
              : (o = Math.floor(s));
            let i = [0, 0],
              l = 0;
            (r < 0
              ? ((i[0] = Math.floor(-r)), (i[1] = t - this.width - i[0]))
              : (l = Math.floor(r)),
              (e = e
                .extend({ top: a[0], bottom: a[1], left: i[0], right: i[1] })
                .extract({ left: l, top: o, width: t, height: n })));
          }
          return await vc(e);
        }
      }
      async toBlob(e = 'image/png', t = 1) {
        if (!dr.IS_WEB_ENV)
          throw new Error(
            'toBlob() is only supported in browser environments.'
          );
        const n = this.toCanvas();
        return await n.convertToBlob({ type: e, quality: t });
      }
      toTensor(e = 'CHW') {
        let t = new Ci('uint8', new Uint8Array(this.data), [
          this.height,
          this.width,
          this.channels,
        ]);
        if ('HWC' === e);
        else {
          if ('CHW' !== e) throw new Error(`Unsupported channel format: ${e}`);
          t = t.permute(2, 0, 1);
        }
        return t;
      }
      toCanvas() {
        if (!dr.IS_WEB_ENV)
          throw new Error(
            'toCanvas() is only supported in browser environments.'
          );
        const e = this.clone().rgba(),
          t = yc(e.width, e.height),
          n = new bc(e.data, e.width, e.height);
        return (t.getContext('2d').putImageData(n, 0, 0), t);
      }
      split() {
        const { data: t, width: n, height: r, channels: s } = this,
          a = t.constructor,
          o = t.length / s,
          i = Array.from({ length: s }, () => new a(o));
        for (let e = 0; e < o; ++e) {
          const n = s * e;
          for (let r = 0; r < s; ++r) i[r][e] = t[n + r];
        }
        return i.map(t => new e(t, n, r, 1));
      }
      _update(e, t, n, r = null) {
        return (
          (this.data = e),
          (this.width = t),
          (this.height = n),
          null !== r && (this.channels = r),
          this
        );
      }
      clone() {
        return new e(this.data.slice(), this.width, this.height, this.channels);
      }
      convert(e) {
        if (this.channels === e) return this;
        switch (e) {
          case 1:
            this.grayscale();
            break;
          case 3:
            this.rgb();
            break;
          case 4:
            this.rgba();
            break;
          default:
            throw new Error(
              `Conversion failed due to unsupported number of channels: ${this.channels}`
            );
        }
        return this;
      }
      async save(e) {
        if (dr.IS_WEB_ENV) {
          if (dr.IS_WEBWORKER_ENV)
            throw new Error('Unable to save an image from a Web Worker.');
          const t = e.split('.').pop().toLowerCase(),
            n = Gc.get(t) ?? 'image/png';
          return ic(e, await this.toBlob(n));
        }
        if (!dr.IS_FS_AVAILABLE)
          throw new Error(
            'Unable to save the image because filesystem is disabled in this environment.'
          );
        {
          const t = this.toSharp();
          await t.toFile(e);
        }
      }
      toSharp() {
        if (dr.IS_WEB_ENV)
          throw new Error(
            'toSharp() is only supported in server-side environments.'
          );
        return Rc(this.data, {
          raw: {
            width: this.width,
            height: this.height,
            channels: this.channels,
          },
        });
      }
    };
  function jc(e, t, n = 0, r = null) {
    const s = e / t;
    let a =
      (function (e) {
        const t = Math.round(e);
        return Math.abs(e) % 1 == 0.5 ? (t % 2 == 0 ? t : t - 1) : t;
      })(s) * t;
    return (
      null !== r && a > r && (a = Math.floor(s) * t),
      a < n && (a = Math.ceil(s) * t),
      a
    );
  }
  function Wc([e, t], n) {
    return [
      Math.max(Math.floor(e / n), 1) * n,
      Math.max(Math.floor(t / n), 1) * n,
    ];
  }
  function qc([e, t, n, r]) {
    return [e - n / 2, t - r / 2, e + n / 2, t + r / 2];
  }
  function Hc(e, t = 0.5, n = null, r = !1) {
    const s = e.logits,
      a = e.pred_boxes,
      [o, i, l] = s.dims;
    if (null !== n && n.length !== o)
      throw Error(
        'Make sure that you pass in as many target sizes as the batch dimension of the logits'
      );
    let c = [];
    for (let e = 0; e < o; ++e) {
      let o = null !== n ? n[e] : null,
        u = { boxes: [], classes: [], scores: [] },
        d = s[e],
        p = a[e];
      for (let e = 0; e < i; ++e) {
        let n,
          s = d[e],
          a = [];
        if (r) {
          n = s.sigmoid().data;
          for (let e = 0; e < n.length; ++e) n[e] > t && a.push(e);
        } else {
          let e = jo(s.data)[1];
          if (e === l - 1) continue;
          if (((n = Uo(s.data)), n[e] < t)) continue;
          a.push(e);
        }
        for (const t of a) {
          let r = p[e].data;
          ((r = qc(r)),
            null !== o && (r = r.map((e, t) => e * o[(t + 1) % 2])),
            u.boxes.push(r),
            u.classes.push(t),
            u.scores.push(n[t]));
        }
      }
      c.push(u);
    }
    return c;
  }
  function Qc(e, t = null) {
    const n = e.logits,
      r = n.dims[0];
    if (null !== t && t.length !== r)
      throw Error(
        'Make sure that you pass in as many target sizes as the batch dimension of the logits'
      );
    const s = [];
    for (let e = 0; e < r; ++e) {
      const r = null !== t ? t[e] : null;
      let a = n[e];
      null !== r && (a = Si(a, r, 'bilinear', !1));
      const [o, i] = r ?? a.dims.slice(-2),
        l = new Ci('int32', new Int32Array(o * i), [o, i]),
        c = a[0].data,
        u = l.data;
      for (let e = 1; e < a.dims[0]; ++e) {
        const t = a[e].data;
        for (let n = 0; n < t.length; ++n)
          t[n] > c[n] && ((c[n] = t[n]), (u[n] = e));
      }
      const d = new Array(a.dims[0]);
      for (let e = 0; e < u.length; ++e) {
        const t = u[e];
        d[t] = t;
      }
      const p = d.filter(e => void 0 !== e);
      s.push({ segmentation: l, labels: p });
    }
    return s;
  }
  function Xc(e, t, n, r) {
    const s = [],
      a = [],
      o = [];
    for (let i = 0; i < e.dims[0]; ++i) {
      const l = e[i],
        c = t[i],
        u = jo(l.data)[1];
      if (u === r) continue;
      const d = Uo(l.data)[u];
      d > n && (s.push(c), a.push(d), o.push(u));
    }
    return [s, a, o];
  }
  function Yc(e, t, n, r = 0.5, s = 0.8) {
    const a = [];
    let o = 0,
      i = 0;
    const l = t[n].data;
    for (let t = 0; t < e.length; ++t)
      (e[t] === n && (a.push(t), ++o), l[t] >= r && ++i);
    let c = o > 0 && i > 0;
    return (c && (c = o / i > s), [c, a]);
  }
  function Jc(e, t, n, r, s, a = null, o = null) {
    const [i, l] = o ?? e[0].dims,
      c = new Ci('int32', new Int32Array(i * l), [i, l]),
      u = [];
    if (null !== o)
      for (let t = 0; t < e.length; ++t) e[t] = Si(e[t], o, 'bilinear', !1);
    const d = new Int32Array(e[0].data.length),
      p = new Float32Array(e[0].data.length);
    for (let n = 0; n < e.length; ++n) {
      let r = t[n];
      const s = e[n].data;
      for (let e = 0; e < s.length; ++e)
        ((s[e] *= r), s[e] > p[e] && ((d[e] = n), (p[e] = s[e])));
    }
    let h = 0;
    const f = c.data;
    for (let a = 0; a < n.length; ++a) {
      const o = n[a],
        [i, l] = Yc(d, e, a, r, s);
      if (i) {
        ++h;
        for (const e of l) f[e] = h;
        u.push({ id: h, label_id: o, score: t[a] });
      }
    }
    return [c, u];
  }
  function Kc(e, t = 0.5, n = 0.5, r = 0.8, s = null, a = null) {
    null === s &&
      (Fr.warn('`label_ids_to_fuse` unset. No instance will be fused.'),
      (s = new Set()));
    const o = e.class_queries_logits ?? e.logits,
      i = (e.masks_queries_logits ?? e.pred_masks).sigmoid();
    let [l, c, u] = o.dims;
    if (((u -= 1), null !== a && a.length !== l))
      throw Error(
        'Make sure that you pass in as many target sizes as the batch dimension of the logits'
      );
    let d = [];
    for (let e = 0; e < l; ++e) {
      let l = null !== a ? a[e] : null,
        c = o[e],
        p = i[e],
        [h, f, _] = Xc(c, p, t, u);
      if (0 === _.length) {
        let [e, t] = l ?? p.dims.slice(-2),
          n = new Ci('int32', new Int32Array(e * t).fill(-1), [e, t]);
        d.push({ segmentation: n, segments_info: [] });
        continue;
      }
      let [m, g] = Jc(h, f, _, n, r, s, l);
      d.push({ segmentation: m, segments_info: g });
    }
    return d;
  }
  function Zc(e, t = 0.5, n = null) {
    throw new Error(
      '`post_process_instance_segmentation` is not yet implemented.'
    );
  }
  Vc.read.bind(Vc);
  var eu = class extends mo {
      constructor(e) {
        (super(),
          (this.image_mean = e.image_mean ?? e.mean),
          (this.image_std = e.image_std ?? e.std),
          (this.resample = e.resample ?? 2),
          (this.do_rescale = e.do_rescale ?? !0),
          (this.rescale_factor = e.rescale_factor ?? 1 / 255),
          (this.do_normalize = e.do_normalize),
          (this.do_thumbnail = e.do_thumbnail),
          (this.size = e.size ?? e.image_size),
          (this.do_resize = e.do_resize ?? void 0 !== this.size),
          (this.size_divisibility = e.size_divisibility ?? e.size_divisor),
          (this.do_center_crop = e.do_center_crop),
          (this.crop_size = e.crop_size),
          (this.do_convert_rgb = e.do_convert_rgb ?? !0),
          (this.do_crop_margin = e.do_crop_margin),
          (this.pad_size = e.pad_size),
          (this.do_pad = e.do_pad),
          (this.min_pixels = e.min_pixels),
          (this.max_pixels = e.max_pixels),
          this.do_pad &&
            !this.pad_size &&
            this.size &&
            void 0 !== this.size.width &&
            void 0 !== this.size.height &&
            (this.pad_size = this.size),
          (this.do_flip_channel_order = e.do_flip_channel_order ?? !1),
          (this.config = e));
      }
      async thumbnail(e, t, n = 2) {
        const r = e.height,
          s = e.width,
          a = t.height,
          o = t.width;
        let i = Math.min(r, a),
          l = Math.min(s, o);
        return i === r && l === s
          ? e
          : (r > s
              ? (l = Math.floor((s * i) / r))
              : s > r && (i = Math.floor((r * l) / s)),
            await e.resize(l, i, { resample: n }));
      }
      async crop_margin(e, t = 200) {
        const n = e.clone().grayscale(),
          r = Vo(n.data)[0],
          s = jo(n.data)[0] - r;
        if (0 === s) return e;
        const a = t / 255;
        let o = n.width,
          i = n.height,
          l = 0,
          c = 0;
        const u = n.data;
        for (let e = 0; e < n.height; ++e) {
          const t = e * n.width;
          for (let d = 0; d < n.width; ++d)
            (u[t + d] - r) / s < a &&
              ((o = Math.min(o, d)),
              (i = Math.min(i, e)),
              (l = Math.max(l, d)),
              (c = Math.max(c, e)));
        }
        return await e.crop([o, i, l, c]);
      }
      pad_image(
        e,
        t,
        n,
        { mode: r = 'constant', center: s = !1, constant_values: a = 0 } = {}
      ) {
        const [o, i, l] = t;
        let c, u;
        if (
          ('number' == typeof n
            ? ((c = n), (u = n))
            : 'square' === n
              ? (c = u = Math.max(o, i))
              : ((c = n.width), (u = n.height)),
          c !== i || u !== o)
        ) {
          const n = new Float32Array(c * u * l);
          if (Array.isArray(a))
            for (let e = 0; e < n.length; ++e) n[e] = a[e % l];
          else 0 !== a && n.fill(a);
          const [d, p] = s
            ? [Math.floor((c - i) / 2), Math.floor((u - o) / 2)]
            : [0, 0];
          for (let t = 0; t < o; ++t) {
            const r = (t + p) * c,
              s = t * i;
            for (let t = 0; t < i; ++t) {
              const a = (r + t + d) * l,
                o = (s + t) * l;
              for (let t = 0; t < l; ++t) n[a + t] = e[o + t];
            }
          }
          if ('symmetric' === r) {
            if (s)
              throw new Error(
                '`center` padding is not supported when `mode` is set to `symmetric`.'
              );
            const t = o - 1,
              r = i - 1;
            for (let s = 0; s < u; ++s) {
              const a = s * c,
                u = Tr(s, t) * i;
              for (let t = 0; t < c; ++t) {
                if (s < o && t < i) continue;
                const c = (a + t) * l,
                  d = (u + Tr(t, r)) * l;
                for (let t = 0; t < l; ++t) n[c + t] = e[d + t];
              }
            }
          }
          ((e = n), (t = [u, c, l]));
        }
        return [e, t];
      }
      rescale(e) {
        for (let t = 0; t < e.length; ++t) e[t] = this.rescale_factor * e[t];
      }
      get_resize_output_image_size(e, t) {
        const [n, r] = e.size;
        let s, a;
        if (this.do_thumbnail) {
          const { height: e, width: n } = t;
          s = Math.min(e, n);
        } else
          Number.isInteger(t)
            ? ((s = t), (a = this.config.max_size ?? s))
            : void 0 !== t && ((s = t.shortest_edge), (a = t.longest_edge));
        if (void 0 !== s || void 0 !== a) {
          const e = void 0 === s ? 1 : Math.max(s / n, s / r),
            t = n * e,
            o = r * e,
            i = void 0 === a ? 1 : Math.min(a / t, a / o);
          let l = Math.floor(Number((t * i).toFixed(2))),
            c = Math.floor(Number((o * i).toFixed(2)));
          return (
            void 0 !== this.size_divisibility &&
              ([l, c] = Wc([l, c], this.size_divisibility)),
            [l, c]
          );
        }
        if (void 0 !== t && void 0 !== t.width && void 0 !== t.height) {
          let e = t.width,
            s = t.height;
          if (this.config.keep_aspect_ratio && this.config.ensure_multiple_of) {
            let t = s / r,
              a = e / n;
            (Math.abs(1 - a) < Math.abs(1 - t) ? (t = a) : (a = t),
              (s = jc(t * r, this.config.ensure_multiple_of)),
              (e = jc(a * n, this.config.ensure_multiple_of)));
          }
          return [e, s];
        }
        if (void 0 !== this.size_divisibility)
          return Wc([n, r], this.size_divisibility);
        throw new Error(
          `Could not resize image due to unsupported \`this.size\` option in config: ${JSON.stringify(t)}`
        );
      }
      async resize(e) {
        const [t, n] = this.get_resize_output_image_size(e, this.size);
        return await e.resize(t, n, { resample: this.resample });
      }
      async preprocess(
        e,
        {
          do_normalize: t = null,
          do_pad: n = null,
          do_convert_rgb: r = null,
          do_convert_grayscale: s = null,
          do_flip_channel_order: a = null,
        } = {}
      ) {
        this.do_crop_margin && (e = await this.crop_margin(e));
        const [o, i] = e.size;
        if (
          ((r ?? this.do_convert_rgb)
            ? (e = e.rgb())
            : s && (e = e.grayscale()),
          this.do_resize && (e = await this.resize(e)),
          this.do_thumbnail &&
            (e = await this.thumbnail(e, this.size, this.resample)),
          this.do_center_crop)
        ) {
          let t, n;
          (Number.isInteger(this.crop_size)
            ? ((t = this.crop_size), (n = this.crop_size))
            : ((t = this.crop_size.width), (n = this.crop_size.height)),
            (e = await e.center_crop(t, n)));
        }
        const l = [e.height, e.width];
        let c = Float32Array.from(e.data),
          u = [e.height, e.width, e.channels];
        if ((this.do_rescale && this.rescale(c), t ?? this.do_normalize)) {
          let t = this.image_mean;
          Array.isArray(this.image_mean) || (t = new Array(e.channels).fill(t));
          let n = this.image_std;
          if (
            (Array.isArray(this.image_std) ||
              (n = new Array(e.channels).fill(n)),
            t.length !== e.channels || n.length !== e.channels)
          )
            throw new Error(
              `When set to arrays, the length of \`image_mean\` (${t.length}) and \`image_std\` (${n.length}) must match the number of channels in the image (${e.channels}).`
            );
          for (let r = 0; r < c.length; r += e.channels)
            for (let s = 0; s < e.channels; ++s)
              c[r + s] = (c[r + s] - t[s]) / n[s];
        }
        if (n ?? this.do_pad)
          if (this.pad_size) {
            const t = this.pad_image(
              c,
              [e.height, e.width, e.channels],
              this.pad_size
            );
            [c, u] = t;
          } else if (this.size_divisibility) {
            const [e, t] = Wc([u[1], u[0]], this.size_divisibility);
            [c, u] = this.pad_image(c, u, { width: e, height: t });
          }
        if (a ?? this.do_flip_channel_order) {
          if (3 !== u[2])
            throw new Error(
              'Flipping channel order is only supported for RGB images.'
            );
          for (let e = 0; e < c.length; e += 3) {
            const t = c[e];
            ((c[e] = c[e + 2]), (c[e + 2] = t));
          }
        }
        return {
          original_size: [i, o],
          reshaped_input_size: l,
          pixel_values: new Ci('float32', c, u).permute(2, 0, 1),
        };
      }
      async _call(e, ...t) {
        Array.isArray(e) || (e = [e]);
        const n = await Promise.all(e.map(e => this.preprocess(e)));
        return {
          pixel_values: $i(
            n.map(e => e.pixel_values),
            0
          ),
          original_sizes: n.map(e => e.original_size),
          reshaped_input_sizes: n.map(e => e.reshaped_input_size),
        };
      }
      static async from_pretrained(e, t = {}) {
        return new this(await Ro(e, nc, !0, t));
      }
    },
    tu = {};
  Wn(tu, {
    BeitFeatureExtractor: () => nu,
    BitImageProcessor: () => ru,
    CLIPFeatureExtractor: () => ou,
    CLIPImageProcessor: () => au,
    ChineseCLIPFeatureExtractor: () => su,
    ConvNextFeatureExtractor: () => lu,
    ConvNextImageProcessor: () => iu,
    DINOv3ViTImageProcessor: () => hu,
    DPTFeatureExtractor: () => gu,
    DPTImageProcessor: () => mu,
    DeiTFeatureExtractor: () => uu,
    DeiTImageProcessor: () => cu,
    DetrFeatureExtractor: () => pu,
    DetrImageProcessor: () => du,
    DonutFeatureExtractor: () => _u,
    DonutImageProcessor: () => fu,
    EfficientNetImageProcessor: () => wu,
    GLPNFeatureExtractor: () => yu,
    GroundingDinoImageProcessor: () => bu,
    Idefics3ImageProcessor: () => vu,
    ImageFeatureExtractor: () => eu,
    ImageProcessor: () => eu,
    JinaCLIPImageProcessor: () => Mu,
    LlavaOnevisionImageProcessor: () => ku,
    Mask2FormerImageProcessor: () => Tu,
    MaskFormerFeatureExtractor: () => Au,
    MaskFormerImageProcessor: () => Eu,
    MobileNetV1FeatureExtractor: () => Su,
    MobileNetV1ImageProcessor: () => Cu,
    MobileNetV2FeatureExtractor: () => Fu,
    MobileNetV2ImageProcessor: () => Pu,
    MobileNetV3FeatureExtractor: () => Ou,
    MobileNetV3ImageProcessor: () => Iu,
    MobileNetV4FeatureExtractor: () => zu,
    MobileNetV4ImageProcessor: () => Lu,
    MobileViTFeatureExtractor: () => Bu,
    MobileViTImageProcessor: () => Nu,
    NougatImageProcessor: () => $u,
    OwlViTFeatureExtractor: () => Ru,
    OwlViTImageProcessor: () => Du,
    Owlv2ImageProcessor: () => Uu,
    Phi3VImageProcessor: () => Hu,
    PixtralImageProcessor: () => Qu,
    PvtImageProcessor: () => Xu,
    Qwen2VLImageProcessor: () => Yu,
    RTDetrImageProcessor: () => Ju,
    Sam2ImageProcessor: () => Ku,
    Sam3ImageProcessor: () => Ku,
    SamImageProcessor: () => Ku,
    SapiensFeatureExtractor: () => ed,
    SapiensImageProcessor: () => Zu,
    SegformerFeatureExtractor: () => nd,
    SegformerImageProcessor: () => td,
    SiglipImageProcessor: () => rd,
    SmolVLMImageProcessor: () => vu,
    Swin2SRImageProcessor: () => sd,
    VLMImageProcessor: () => xu,
    ViTFeatureExtractor: () => od,
    ViTImageProcessor: () => ad,
    VitMatteImageProcessor: () => id,
    VitPoseImageProcessor: () => ld,
    YolosFeatureExtractor: () => ud,
    YolosImageProcessor: () => cd,
  });
  var nu = class extends eu {},
    ru = class extends eu {},
    su = class extends eu {},
    au = class extends eu {},
    ou = class extends au {},
    iu = class extends eu {
      constructor(e) {
        (super(e), (this.crop_pct = this.config.crop_pct ?? 0.875));
      }
      async resize(e) {
        const t = this.size?.shortest_edge;
        if (void 0 === t)
          throw new Error("Size dictionary must contain 'shortest_edge' key.");
        if (t < 384) {
          const n = Math.floor(t / this.crop_pct),
            [r, s] = this.get_resize_output_image_size(e, { shortest_edge: n });
          ((e = await e.resize(r, s, { resample: this.resample })),
            (e = await e.center_crop(t, t)));
        } else e = await e.resize(t, t, { resample: this.resample });
        return e;
      }
    },
    lu = class extends iu {},
    cu = class extends eu {},
    uu = class extends cu {},
    du = class extends eu {
      async _call(e) {
        const t = await super._call(e),
          n = Vi([t.pixel_values.dims[0], 64, 64], 1n);
        return { ...t, pixel_mask: n };
      }
      post_process_object_detection(...e) {
        return Hc(...e);
      }
      post_process_panoptic_segmentation(...e) {
        return Kc(...e);
      }
      post_process_instance_segmentation(...e) {
        return Zc(...e);
      }
    },
    pu = class extends du {},
    hu = class extends eu {},
    fu = class extends eu {
      pad_image(e, t, n, r = {}) {
        const [s, a, o] = t;
        let i = this.image_mean;
        Array.isArray(this.image_mean) || (i = new Array(o).fill(i));
        let l = this.image_std;
        Array.isArray(l) || (l = new Array(o).fill(i));
        const c = i.map((e, t) => -e / l[t]);
        return super.pad_image(e, t, n, {
          center: !0,
          constant_values: c,
          ...r,
        });
      }
    },
    _u = class extends fu {},
    mu = class extends eu {},
    gu = class extends mu {},
    wu = class extends eu {
      constructor(e) {
        (super(e),
          (this.include_top = this.config.include_top ?? !0),
          this.include_top &&
            (this.image_std = this.image_std.map(e => e * e)));
      }
    },
    yu = class extends eu {},
    bu = class extends eu {
      async _call(e) {
        const t = await super._call(e),
          n = t.pixel_values.dims,
          r = Wi([n[0], n[2], n[3]]);
        return { ...t, pixel_mask: r };
      }
    },
    vu = class extends eu {
      constructor(e) {
        (super(e),
          (this.do_image_splitting = e.do_image_splitting ?? !0),
          (this.max_image_size = e.max_image_size));
      }
      get_resize_for_vision_encoder(e, t) {
        let [n, r] = e.dims.slice(-2);
        const s = r / n;
        return (
          r >= n
            ? ((r = Math.ceil(r / t) * t),
              (n = Math.floor(r / s)),
              (n = Math.ceil(n / t) * t))
            : ((n = Math.ceil(n / t) * t),
              (r = Math.floor(n * s)),
              (r = Math.ceil(r / t) * t)),
          { height: n, width: r }
        );
      }
      async _call(
        e,
        { do_image_splitting: t = null, return_row_col_info: n = !1 } = {}
      ) {
        let r;
        if (Array.isArray(e)) {
          if (0 === e.length || !e[0]) throw new Error('No images provided.');
          r = Array.isArray(e[0]) ? e : [e];
        } else r = [[e]];
        let s = [],
          a = [],
          o = [];
        const i = [],
          l = [];
        for (const e of r) {
          let n = await Promise.all(e.map(e => this.preprocess(e)));
          (i.push(...n.map(e => e.original_size)),
            l.push(...n.map(e => e.reshaped_input_size)),
            n.forEach(e => e.pixel_values.unsqueeze_(0)));
          const { longest_edge: r } = this.max_image_size;
          let c;
          if (t ?? this.do_image_splitting) {
            let e = new Array(n.length),
              t = new Array(n.length);
            ((c = await Promise.all(
              n.map(async (n, s) => {
                const a = this.get_resize_for_vision_encoder(n.pixel_values, r),
                  o = await Pi(n.pixel_values, { size: [a.height, a.width] }),
                  {
                    frames: i,
                    num_splits_h: l,
                    num_splits_w: c,
                  } = await this.split_image(o, this.max_image_size);
                return ((e[s] = l), (t[s] = c), Bi(i, 0));
              })
            )),
              a.push(e),
              o.push(t));
          } else {
            const e = [r, r];
            ((c = await Promise.all(
              n.map(t => Pi(t.pixel_values, { size: e }))
            )),
              a.push(new Array(n.length).fill(0)),
              o.push(new Array(n.length).fill(0)));
          }
          s.push(Bi(c, 0));
        }
        const c = s.length,
          [u, d, p, h] = s[0].dims;
        let f, _;
        if (1 === c) ((f = s[0].unsqueeze_(0)), (_ = Vi([c, u, p, h], !0)));
        else {
          const e = Math.max(...s.map(e => e.dims.at(0)));
          _ = Vi([c, e, p, h], !0);
          const t = _.data,
            n = e * p * h;
          for (let r = 0; r < c; ++r) {
            const a = s[r].dims[0];
            if (a < e) {
              s[r] = Bi([s[r], Vi([e - a, d, p, h], 0)], 0);
              const o = r * n + a * p * h,
                i = (r + 1) * n;
              t.fill(!1, o, i);
            }
          }
          f = $i(s, 0);
        }
        return {
          pixel_values: f,
          pixel_attention_mask: _,
          original_sizes: i,
          reshaped_input_sizes: l,
          ...(n ? { rows: a, cols: o } : {}),
        };
      }
      async split_image(e, { longest_edge: t }) {
        const n = t,
          r = t,
          s = [],
          [a, o] = e.dims.slice(-2);
        let i = 0,
          l = 0;
        if (a > n || o > r) {
          ((i = Math.ceil(a / n)), (l = Math.ceil(o / r)));
          const t = Math.ceil(a / i),
            c = Math.ceil(o / l);
          for (let n = 0; n < i; ++n)
            for (let r = 0; r < l; ++r) {
              let u, d, p, h;
              (n === i - 1
                ? ((d = a - t), (h = a))
                : ((d = n * t), (h = (n + 1) * t)),
                r === l - 1
                  ? ((u = o - c), (p = o))
                  : ((u = r * c), (p = (r + 1) * c)));
              const f = [d, u],
                _ = [h, p],
                m = await Oi(e, f, _, [2, 3]);
              s.push(m);
            }
          const u = n,
            d = r;
          (a === u && o === d) || (e = await Pi(e, { size: [u, d] }));
        }
        return (s.push(e), { frames: s, num_splits_h: i, num_splits_w: l });
      }
    },
    xu = class extends eu {
      constructor(e) {
        (super({
          do_pad: !0,
          pad_size: { width: e.image_size, height: e.image_size },
          ...e,
        }),
          (this.constant_values = this.config.background_color.map(
            e => e * this.rescale_factor
          )));
      }
      pad_image(e, t, n, r) {
        return super.pad_image(e, t, n, {
          constant_values: this.constant_values,
          center: !0,
          ...r,
        });
      }
    },
    Mu = class extends eu {
      constructor(e) {
        const {
          resize_mode: t,
          fill_color: n,
          interpolation: r,
          size: s,
          ...a
        } = e;
        super({
          ...a,
          size:
            'squash' === t
              ? { width: s, height: s }
              : 'shortest' === t
                ? { shortest_edge: s }
                : { longest_edge: s },
          resample: 'bicubic' === r ? 3 : 2,
          do_center_crop: !0,
          crop_size: s,
          do_normalize: !0,
        });
      }
    },
    ku = class extends eu {},
    Eu = class extends eu {
      post_process_panoptic_segmentation(...e) {
        return Kc(...e);
      }
      post_process_instance_segmentation(...e) {
        return Zc(...e);
      }
    },
    Au = class extends Eu {},
    Tu = class extends Eu {},
    Cu = class extends eu {},
    Su = class extends Cu {},
    Pu = class extends eu {},
    Fu = class extends Pu {},
    Iu = class extends eu {},
    Ou = class extends Iu {},
    Lu = class extends eu {},
    zu = class extends Lu {},
    Nu = class extends eu {},
    Bu = class extends Nu {},
    $u = class extends fu {},
    Du = class extends eu {
      post_process_object_detection(...e) {
        return Hc(...e);
      }
    },
    Ru = class extends Du {},
    Uu = class extends Du {},
    Gu = 336,
    Vu = [2, 3],
    { ceil: ju, floor: Wu, sqrt: qu } = Math,
    Hu = class extends eu {
      constructor(e) {
        (super({
          ...e,
          do_normalize: !0,
          do_pad: !0,
          pad_size: 'custom',
          do_convert_rgb: !0,
          do_resize: !0,
        }),
          (this._num_crops = e.num_crops));
      }
      calc_num_image_tokens_from_image_size(e, t) {
        const { num_img_tokens: n } = this.config;
        return Wu(
          (Wu(t / Gu) * Wu(e / Gu) + 1) * n + 1 + (Wu(t / Gu) + 1) * qu(n)
        );
      }
      get_resize_output_image_size(e, t) {
        const n = this._num_crops,
          [r, s] = e.size;
        let a = r / s,
          o = 1;
        for (; o * Math.ceil(o / a) <= n; ) o += 1;
        o -= 1;
        const i = Math.floor(336 * o);
        return [i, Math.floor(i / a)];
      }
      pad_image(e, t, n, r = {}) {
        const [s, a] = t,
          o = Gu * ju(s / Gu),
          i = Gu * ju(a / Gu),
          l = [1, 1, 1].map(
            (e, t) => (e - this.image_mean[t]) / this.image_std[t]
          );
        return super.pad_image(
          e,
          t,
          { width: i, height: o },
          { center: !0, constant_values: l, ...r }
        );
      }
      async _call(e, { num_crops: t = null } = {}) {
        if (
          ((this._num_crops = t ??= this.config.num_crops),
          t < 4 || qu(t) % 1 != 0)
        )
          throw new Error('num_crops must be a square number >= 4');
        Array.isArray(e) || (e = [e]);
        const n = e.length,
          r = await Promise.all(e.map(e => this.preprocess(e))),
          s = r.map(e => e.original_size),
          a = r.map(e => e.reshaped_input_size),
          o = [];
        for (const { pixel_values: e } of r) {
          e.unsqueeze_(0);
          const [n, r] = e.dims.slice(-2),
            s = await Pi(e, { size: [Gu, Gu], mode: 'bicubic' });
          if (t > 0) {
            const a = [],
              i = qu(t),
              l = Wu(r / i),
              c = Wu(n / i);
            for (let t = 0; t < i; ++t)
              for (let s = 0; s < i; ++s) {
                let o, u, d, p;
                (t === i - 1
                  ? ((u = n - c), (p = n))
                  : ((u = t * c), (p = (t + 1) * c)),
                  s === i - 1
                    ? ((o = r - l), (d = r))
                    : ((o = s * l), (d = (s + 1) * l)));
                const h = [u, o],
                  f = [p, d],
                  _ = await Oi(e, h, f, Vu);
                a.push(_);
              }
            const u = await Pi(Bi(a, 0), { size: [Gu, Gu], mode: 'bicubic' });
            o.push(Bi([s, u], 0));
          } else o.push(s);
        }
        const i = $i(o, 0),
          l = a.map(e => e.map(e => Gu * ju(e / Gu)));
        return {
          pixel_values: i,
          original_sizes: s,
          reshaped_input_sizes: a,
          image_sizes: new Ci('int64', l.flat(), [n, 2]),
          num_img_tokens: l.map(([e, t]) =>
            this.calc_num_image_tokens_from_image_size(t, e)
          ),
        };
      }
    },
    Qu = class extends eu {
      get_resize_output_image_size(e, t) {
        const { longest_edge: n } = t;
        if (void 0 === n) throw new Error("size must contain 'longest_edge'");
        const [r, s] = e.size,
          a = Math.max(r, s) / n;
        let o = r,
          i = s;
        a > 1 && ((o = Math.floor(r / a)), (i = Math.floor(s / a)));
        const { patch_size: l, spatial_merge_size: c } = this.config;
        if (!c) throw new Error("config must contain 'spatial_merge_size'");
        const u = l * c;
        return [
          (Math.floor((o - 1) / u) + 1) * u,
          (Math.floor((i - 1) / u) + 1) * u,
        ];
      }
    },
    Xu = class extends eu {},
    Yu = class extends eu {
      constructor(e) {
        (super(e),
          (this.min_pixels = e.min_pixels ?? e.size?.shortest_edge),
          (this.max_pixels = e.max_pixels ?? e.size?.longest_edge),
          (this.patch_size = e.patch_size),
          (this.merge_size = e.merge_size));
      }
      get_resize_output_image_size(e, t) {
        const n = this.patch_size * this.merge_size;
        return (function (e, t, n = 28, r = 3136, s = 1003520) {
          if (e < n || t < n)
            throw new Error(
              `height:${e} or width:${t} must be larger than factor:${n}`
            );
          if (Math.max(e, t) / Math.min(e, t) > 200)
            throw new Error(
              'absolute aspect ratio must be smaller than 200, got ' +
                Math.max(e, t) / Math.min(e, t)
            );
          let a = Math.round(e / n) * n,
            o = Math.round(t / n) * n;
          if (a * o > s) {
            const r = Math.sqrt((e * t) / s);
            ((a = Math.floor(e / r / n) * n), (o = Math.floor(t / r / n) * n));
          } else if (a * o < r) {
            const s = Math.sqrt(r / (e * t));
            ((a = Math.ceil((e * s) / n) * n),
              (o = Math.ceil((t * s) / n) * n));
          }
          return [a, o];
        })(e.height, e.width, n, this.min_pixels, this.max_pixels);
      }
      async _call(e, ...t) {
        const {
          pixel_values: n,
          original_sizes: r,
          reshaped_input_sizes: s,
        } = await super._call(e, ...t);
        let a = n;
        const {
          temporal_patch_size: o,
          merge_size: i,
          patch_size: l,
        } = this.config;
        1 === a.dims[0] &&
          (a = Bi(
            Array.from({ length: o }, () => a),
            0
          ));
        const c = a.dims[0] / o,
          u = a.dims[1],
          d = Math.floor(a.dims[2] / l),
          p = Math.floor(a.dims[3] / l);
        return {
          pixel_values: a
            .view(c, o, u, Math.floor(d / i), i, l, Math.floor(p / i), i, l)
            .permute(0, 3, 6, 4, 7, 2, 1, 5, 8)
            .view(c * d * p, u * o * l * l),
          image_grid_thw: new Ci('int64', [c, d, p], [1, 3]),
          original_sizes: r,
          reshaped_input_sizes: s,
        };
      }
    },
    Ju = class extends eu {
      post_process_object_detection(...e) {
        return Hc(...e);
      }
    },
    Ku = class extends eu {
      reshape_input_points(e, t, n, r = !1) {
        let s = kr((e = structuredClone(e)));
        if (3 === s.length) (r || (s = [1, ...s]), (e = [e]));
        else if (4 !== s.length)
          throw Error(
            'The input_points must be a 4D tensor of shape `batch_size`, `point_batch_size`, `nb_points_per_image`, `2`.'
          );
        for (let r = 0; r < e.length; ++r) {
          const [s, a] = t[r],
            [o, i] = n[r],
            l = [i / a, o / s];
          for (let t = 0; t < e[r].length; ++t)
            for (let n = 0; n < e[r][t].length; ++n)
              for (let s = 0; s < e[r][t][n].length; ++s)
                e[r][t][n][s] *= l[s % 2];
        }
        return new Ci('float32', Float32Array.from(e.flat(1 / 0)), s);
      }
      add_input_labels(e, t) {
        let n = kr(e);
        if (2 === n.length) ((n = [1, ...n]), (e = [e]));
        else if (3 !== n.length)
          throw Error(
            'The input_points must be a 4D tensor of shape `batch_size`, `point_batch_size`, `nb_points_per_image`, `2`.'
          );
        if (n.some((e, n) => e !== t.dims[n]))
          throw Error(
            `The first ${n.length} dimensions of 'input_points' and 'input_labels' must be the same.`
          );
        return new Ci('int64', e.flat(1 / 0).map(BigInt), n);
      }
      async _call(
        e,
        {
          input_points: t = null,
          input_labels: n = null,
          input_boxes: r = null,
        } = {}
      ) {
        const s = await super._call(e);
        if (
          (t &&
            (s.input_points = this.reshape_input_points(
              t,
              s.original_sizes,
              s.reshaped_input_sizes
            )),
          n)
        ) {
          if (!s.input_points)
            throw Error(
              '`input_points` must be provided if `input_labels` are provided.'
            );
          s.input_labels = this.add_input_labels(n, s.input_points);
        }
        return (
          r &&
            (s.input_boxes = this.reshape_input_points(
              r,
              s.original_sizes,
              s.reshaped_input_sizes,
              !0
            )),
          s
        );
      }
      async post_process_masks(
        e,
        t,
        n,
        { mask_threshold: r = 0, binarize: s = !0, pad_size: a = null } = {}
      ) {
        const o = [],
          i = [(a = a ?? this.pad_size ?? this.size).height, a.width];
        for (let a = 0; a < t.length; ++a) {
          const l = t[a],
            c = n[a];
          let u = await Pi(e[a], { mode: 'bilinear', size: i });
          if (
            ((u = u.slice(null, null, [0, c[0]], [0, c[1]])),
            (u = await Pi(u, { mode: 'bilinear', size: l })),
            s)
          ) {
            const e = u.data,
              t = new Uint8Array(e.length);
            for (let n = 0; n < e.length; ++n) e[n] > r && (t[n] = 1);
            u = new Ci('bool', t, u.dims);
          }
          o.push(u);
        }
        return o;
      }
      generate_crop_boxes(
        e,
        t,
        {
          crop_n_layers: n = 0,
          overlap_ratio: r = 512 / 1500,
          points_per_crop: s = 32,
          crop_n_points_downscale_factor: a = 1,
        } = {}
      ) {}
    },
    Zu = class extends eu {
      post_process_semantic_segmentation(...e) {
        return Qc(...e);
      }
    },
    ed = class extends Zu {},
    td = class extends eu {
      post_process_semantic_segmentation(...e) {
        return Qc(...e);
      }
    },
    nd = class extends td {},
    rd = class extends eu {},
    sd = class extends eu {
      pad_image(e, t, n, r = {}) {
        const [s, a, o] = t;
        return super.pad_image(
          e,
          t,
          { width: a + ((n - (a % n)) % n), height: s + ((n - (s % n)) % n) },
          { mode: 'symmetric', center: !1, constant_values: -1, ...r }
        );
      }
    },
    ad = class extends eu {},
    od = class extends ad {},
    id = class extends eu {
      async _call(e, t) {
        (Array.isArray(e) || (e = [e]), Array.isArray(t) || (t = [t]));
        const n = await Promise.all(e.map(e => this.preprocess(e))),
          r = await Promise.all(
            t.map(e =>
              this.preprocess(e, {
                do_normalize: !1,
                do_convert_rgb: !1,
                do_convert_grayscale: !0,
              })
            )
          );
        return {
          pixel_values: $i(
            n.map((e, t) => Bi([e.pixel_values, r[t].pixel_values], 0)),
            0
          ),
          original_sizes: n.map(e => e.original_size),
          reshaped_input_sizes: n.map(e => e.reshaped_input_size),
        };
      }
    },
    ld = class extends eu {
      post_process_pose_estimation(e, t, { threshold: n = null } = {}) {
        const r = e.tolist(),
          [s, a, o, i] = e.dims,
          l = [];
        for (let e = 0; e < s; ++e) {
          const s = r[e],
            a = t[e],
            c = [];
          for (let e = 0; e < a.length; ++e) {
            const t = a[e],
              r = [],
              l = [],
              u = [],
              d = t.at(-2) / i,
              p = t.at(-1) / o;
            for (let e = 0; e < s.length; ++e) {
              let [t, a] = [0, 0],
                o = 0,
                i = -1 / 0;
              const c = s[e];
              for (let e = 0; e < c.length; ++e) {
                const n = c[e];
                for (let r = 0; r < n.length; ++r) {
                  const s = n[r];
                  ((o += s),
                    (i = Math.max(i, s)),
                    (t += (r + 0.5) * s),
                    (a += e * s));
                }
              }
              if (null != n && i < n) continue;
              const h = [(d * t) / o, (p * a) / o];
              (r.push(h), u.push(e), l.push(i));
            }
            c.push({ bbox: t, scores: l, labels: u, keypoints: r });
          }
          l.push(c);
        }
        return l;
      }
    },
    cd = class extends eu {
      post_process_object_detection(...e) {
        return Hc(...e);
      }
    },
    ud = class extends cd {},
    dd = class {
      static async from_pretrained(e, t = {}) {
        const n = await Ro(e, nc, !0, t),
          r = n.image_processor_type ?? n.feature_extractor_type;
        let s = tu[r?.replace(/Fast$/, '')];
        return (
          s ||
            (void 0 !== r &&
              Fr.warn(
                `Image processor type '${r}' not found, assuming base ImageProcessor. Please report this at ${ec}.`
              ),
            (s = eu)),
          new s(n)
        );
      }
    },
    pd = class extends rc {
      static tokenizer_class = Zl;
      static image_processor_class = dd;
      constructor(e, t, n) {
        super(e, t, n);
        const {
          tasks_answer_post_processing_type: r,
          task_prompts_without_inputs: s,
          task_prompts_with_input: a,
        } = this.image_processor.config;
        ((this.tasks_answer_post_processing_type = new Map(
          Object.entries(r ?? {})
        )),
          (this.task_prompts_without_inputs = new Map(Object.entries(s ?? {}))),
          (this.task_prompts_with_input = new Map(Object.entries(a ?? {}))),
          (this.regexes = {
            quad_boxes:
              /(.+?)<loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)>/gm,
            bboxes: /([^<]+)?<loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)>/gm,
          }),
          (this.size_per_bin = 1e3));
      }
      construct_prompts(e) {
        'string' == typeof e && (e = [e]);
        const t = [];
        for (const n of e)
          if (this.task_prompts_without_inputs.has(n))
            t.push(this.task_prompts_without_inputs.get(n));
          else {
            for (const [e, r] of this.task_prompts_with_input)
              if (n.includes(e)) {
                t.push(r.replaceAll('{input}', n).replaceAll(e, ''));
                break;
              }
            t.length !== e.length && t.push(n);
          }
        return t;
      }
      post_process_generation(e, t, n) {
        const r = this.tasks_answer_post_processing_type.get(t) ?? 'pure_text';
        let s;
        switch (((e = e.replaceAll('<s>', '').replaceAll('</s>', '')), r)) {
          case 'pure_text':
            s = e;
            break;
          case 'description_with_bboxes':
          case 'bboxes':
          case 'phrase_grounding':
          case 'ocr':
            const a = 'ocr' === r ? 'quad_boxes' : 'bboxes',
              o = e.matchAll(this.regexes[a]),
              i = [],
              l = [];
            for (const [e, t, ...r] of o)
              (i.push(t ? t.trim() : (i.at(-1) ?? '')),
                l.push(
                  r.map(
                    (e, t) => ((Number(e) + 0.5) / this.size_per_bin) * n[t % 2]
                  )
                ));
            s = { labels: i, [a]: l };
            break;
          default:
            throw new Error(
              `Task "${t}" (of type "${r}") not yet implemented.`
            );
        }
        return { [t]: s };
      }
      async _call(e, t = null, n = {}) {
        if (!e && !t) throw new Error('Either text or images must be provided');
        return {
          ...(await this.image_processor(e, n)),
          ...(t ? this.tokenizer(this.construct_prompts(t), n) : {}),
        };
      }
    },
    hd = class extends rc {
      static image_processor_class = dd;
      static feature_extractor_class = $c;
      static tokenizer_class = Zl;
      static uses_processor_config = !0;
      static uses_chat_template_file = !0;
      constructor(e, t, n) {
        (super(e, t, n),
          (this.audio_seq_length = this.config.audio_seq_length),
          (this.image_seq_length = this.config.image_seq_length));
        const {
          audio_token_id: r,
          boa_token: s,
          audio_token: a,
          eoa_token: o,
          image_token_id: i,
          boi_token: l,
          image_token: c,
          eoi_token: u,
        } = this.tokenizer.config;
        ((this.audio_token_id = r),
          (this.boa_token = s),
          (this.audio_token = a));
        const d = a.repeat(this.audio_seq_length);
        ((this.full_audio_sequence = `\n\n${s}${d}${o}\n\n`),
          (this.image_token_id = i),
          (this.boi_token = l),
          (this.image_token = c));
        const p = c.repeat(this.image_seq_length);
        this.full_image_sequence = `\n\n${l}${p}${u}\n\n`;
      }
      async _call(e, t = null, n = null, r = {}) {
        let s, a;
        return (
          'string' == typeof e && (e = [e]),
          n &&
            ((s = await this.feature_extractor(n, r)),
            (e = e.map(e =>
              e.replaceAll(this.audio_token, this.full_audio_sequence)
            ))),
          t &&
            ((a = await this.image_processor(t, r)),
            (e = e.map(e =>
              e.replaceAll(this.image_token, this.full_image_sequence)
            ))),
          { ...this.tokenizer(e, r), ...a, ...s }
        );
      }
    };
  function fd(e, t) {
    const n = e.dims.at(-1) - 1,
      r = e.tolist();
    (r.fill(!1, 0, 1), r.fill(!1, n));
    const s = t.tolist();
    return r
      .map((e, t) => (e ? t : null))
      .filter(e => null !== e)
      .map(e => s[e]);
  }
  var _d = class extends rc {
    static tokenizer_class = Zl;
    static image_processor_class = dd;
    async _call(e, t, n = {}) {
      const r = e ? await this.image_processor(e, n) : {};
      return { ...(t ? this.tokenizer(t, n) : {}), ...r };
    }
    post_process_grounded_object_detection(
      e,
      t,
      {
        box_threshold: n = 0.25,
        text_threshold: r = 0.25,
        target_sizes: s = null,
      } = {}
    ) {
      const { logits: a, pred_boxes: o } = e,
        i = a.dims[0];
      if (null !== s && s.length !== i)
        throw Error(
          'Make sure that you pass in as many target sizes as the batch dimension of the logits'
        );
      const l = a.dims.at(1),
        c = a.sigmoid(),
        u = c.max(-1).tolist(),
        d = o.tolist().map(e => e.map(e => qc(e))),
        p = [];
      for (let e = 0; e < i; ++e) {
        const a = null !== s ? s[e] : null;
        null !== a &&
          (d[e] = d[e].map(e => e.map((e, t) => e * a[(t + 1) % 2])));
        const o = u[e],
          i = [],
          h = [],
          f = [];
        for (let s = 0; s < l; ++s) {
          const a = o[s];
          if (a <= n) continue;
          const l = d[e][s],
            u = c[e][s];
          (i.push(a), f.push(l));
          const p = fd(u.gt(r), t[e]);
          h.push(p);
        }
        p.push({ scores: i, boxes: f, labels: this.batch_decode(h) });
      }
      return p;
    }
  };
  function md(e, t, n, r, s, a) {
    return 0 === e && 0 === t
      ? (function (e, t, n, r) {
          return `${t}${r}` + n.repeat(e) + `${t}`;
        })(n, r, s, a)
      : (function (e, t, n, r, s, a) {
          let o = '';
          for (let a = 0; a < t; ++a) {
            for (let t = 0; t < n; ++t)
              o += r + `<row_${a + 1}_col_${t + 1}>` + s.repeat(e);
            o += '\n';
          }
          return ((o += `\n${r}${a}` + s.repeat(e) + `${r}`), o);
        })(n, e, t, r, s, a);
  }
  var gd = class extends rc {
      static image_processor_class = dd;
      static tokenizer_class = Zl;
      static uses_processor_config = !0;
      fake_image_token = '<fake_token_around_image>';
      image_token = '<image>';
      global_img_token = '<global-img>';
      async _call(e, t = null, n = {}) {
        let r;
        ((n.return_row_col_info ??= !0),
          t && (r = await this.image_processor(t, n)),
          Array.isArray(e) || (e = [e]));
        const s = r.rows ?? [new Array(e.length).fill(0)],
          a = r.cols ?? [new Array(e.length).fill(0)],
          o = this.config.image_seq_len,
          i = [],
          l = [];
        for (let t = 0; t < e.length; ++t) {
          const n = e[t],
            r = s[t],
            c = a[t];
          i.push(Sr(n, this.image_token));
          const u = r.map((e, t) =>
              md(
                e,
                c[t],
                o,
                this.fake_image_token,
                this.image_token,
                this.global_img_token
              )
            ),
            d = n.split(this.image_token);
          if (0 === d.length)
            throw new Error('The image token should be present in the text.');
          let p = d[0];
          for (let e = 0; e < u.length; ++e) p += u[e] + d[e + 1];
          l.push(p);
        }
        return { ...this.tokenizer(l), ...r };
      }
    },
    wd = class extends rc {
      static image_processor_class = dd;
      static tokenizer_class = Zl;
      static uses_processor_config = !0;
      constructor(e, t, n) {
        (super(e, t, n),
          (this.image_tag = this.config.image_tag),
          (this.image_start_tag = this.config.image_start_tag),
          (this.image_end_tag = this.config.image_end_tag),
          (this.num_image_tokens = this.config.num_image_tokens));
      }
      async _call(e, { images: t = null, chat_template: n = 'default' } = {}) {
        t
          ? Array.isArray(t) || (t = [t])
          : (t = await Promise.all(
              e
                .filter(e => e.images)
                .flatMap(e => e.images)
                .map(e => Vc.read(e))
            ));
        const r = this.tokenizer,
          s = e => r.encode(e, { add_special_tokens: !1 }),
          a = r
            .apply_chat_template(e, {
              tokenize: !1,
              add_generation_prompt: !0,
              chat_template: n,
            })
            .split(this.image_tag),
          o = a.length - 1;
        if (t.length !== o)
          throw new Error(
            `Number of images provided (${t.length}) does not match number of "${this.image_tag}" image tags (${o})`
          );
        const [i, l, c] = r.convert_tokens_to_ids([
          this.image_tag,
          this.image_start_tag,
          this.image_end_tag,
        ]);
        let u = s(a[0]),
          d = new Array(u.length).fill(!1);
        for (let e = 1; e < a.length; ++e) {
          const t = new Array(this.num_image_tokens).fill(i),
            n = s(a[e]);
          ((u = Er(u, [l], t, [c], n)),
            (d = Er(
              d,
              [!1],
              new Array(this.num_image_tokens).fill(!0),
              [!1],
              new Array(n.length).fill(!1)
            )));
        }
        const p = [1, u.length],
          h = {
            input_ids: new Ci('int64', u, p),
            attention_mask: new Ci('int64', new Array(u.length).fill(1), p),
            images_seq_mask: new Ci('bool', d, p),
            images_emb_mask: new Ci(
              'bool',
              new Array(o * this.num_image_tokens).fill(!0),
              [1, o, this.num_image_tokens]
            ),
          };
        if (t && t.length > 0) {
          const e = await this.image_processor(t);
          return (e.pixel_values.unsqueeze_(0), { ...h, ...e });
        }
        return h;
      }
    },
    yd = class extends rc {
      static tokenizer_class = Zl;
      static image_processor_class = dd;
      async _call(e = null, t = null, n = {}) {
        if (!e && !t) throw new Error('Either text or images must be provided');
        return {
          ...(e ? this.tokenizer(e, n) : {}),
          ...(t ? await this.image_processor(t, n) : {}),
        };
      }
    },
    bd = class extends rc {
      static tokenizer_class = Zl;
      static image_processor_class = dd;
      static uses_processor_config = !0;
      async _call(e, t = null, n = {}) {
        const r = await this.image_processor(e, n);
        if (t) {
          const [e, n] = r.pixel_values.dims.slice(-2),
            {
              image_token: s,
              patch_size: a,
              num_additional_image_tokens: o,
            } = this.config,
            i = Math.floor(e / a) * Math.floor(n / a) + o;
          ((t = structuredClone(t)), Array.isArray(t) || (t = [t]));
          for (let e = 0; e < t.length; ++e)
            t[e] = t[e].replace(s, s.repeat(i));
        }
        const s = t ? this.tokenizer(t, n) : {};
        return { ...r, ...s };
      }
    },
    vd = {
      char: ['char_decode', 1],
      bpe: ['bpe_decode', 2],
      wp: ['wp_decode', 102],
    },
    xd = class extends rc {
      static tokenizer_class = Zl;
      static image_processor_class = dd;
      get char_tokenizer() {
        return this.components.char_tokenizer;
      }
      get bpe_tokenizer() {
        return this.components.bpe_tokenizer;
      }
      get wp_tokenizer() {
        return this.components.wp_tokenizer;
      }
      _decode_helper(e, t) {
        if (!vd.hasOwnProperty(t))
          throw new Error(`Format ${t} is not supported.`);
        const [n, r] = vd[t],
          s = this[n].bind(this),
          [a, o] = e.dims,
          i = [],
          l = [],
          c = e.tolist();
        for (let e = 0; e < a; ++e) {
          const t = c[e],
            n = [],
            s = [];
          for (let e = 1; e < o; ++e) {
            const [a, o] = jo(Uo(t[e]));
            if ((s.push(a), o == r)) break;
            n.push(o);
          }
          const a = s.length > 0 ? s.reduce((e, t) => e * t, 1) : 0;
          (l.push(n), i.push(a));
        }
        return [s(l), i];
      }
      char_decode(e) {
        return this.char_tokenizer
          .batch_decode(e)
          .map(e => e.replaceAll(' ', ''));
      }
      bpe_decode(e) {
        return this.bpe_tokenizer.batch_decode(e);
      }
      wp_decode(e) {
        return this.wp_tokenizer
          .batch_decode(e)
          .map(e => e.replaceAll(' ', ''));
      }
      batch_decode([e, t, n]) {
        const [r, s] = this._decode_helper(e, 'char'),
          [a, o] = this._decode_helper(t, 'bpe'),
          [i, l] = this._decode_helper(n, 'wp'),
          c = [],
          u = [];
        for (let e = 0; e < r.length; ++e) {
          const [t, n] = jo([s[e], o[e], l[e]]);
          (c.push([r[e], a[e], i[e]][n]), u.push(t));
        }
        return {
          generated_text: c,
          scores: u,
          char_preds: r,
          bpe_preds: a,
          wp_preds: i,
        };
      }
      static async from_pretrained(...e) {
        const t = await super.from_pretrained(...e),
          n = await Zl.from_pretrained('Xenova/gpt2'),
          r = await Zl.from_pretrained('Xenova/bert-base-uncased');
        return (
          (t.components = {
            image_processor: t.image_processor,
            char_tokenizer: t.tokenizer,
            bpe_tokenizer: n,
            wp_tokenizer: r,
          }),
          t
        );
      }
      async _call(e, t = null) {
        const n = await this.image_processor(e);
        return (t && (n.labels = this.tokenizer(t).input_ids), n);
      }
    },
    Md = class extends rc {
      static tokenizer_class = Zl;
      static feature_extractor_class = $c;
      async _call(e) {
        return await this.feature_extractor(e);
      }
    },
    kd = class extends rc {
      static tokenizer_class = Zl;
      static image_processor_class = dd;
    },
    Ed = '<image>',
    Ad = class extends rc {
      static tokenizer_class = Zl;
      static image_processor_class = dd;
      static uses_processor_config = !1;
      async _call(e, t = null, n = {}) {
        (t ||
          (Fr.warn(
            'You are using PaliGemma without a text prefix. It will perform as a picture-captioning model.'
          ),
          (t = '')),
          Array.isArray(e) || (e = [e]),
          Array.isArray(t) || (t = [t]));
        const r = this.tokenizer.bos_token,
          s = this.image_processor.config.image_seq_length;
        let a;
        t.some(e => e.includes(Ed))
          ? (a = t.map(e => {
              const t = e.replaceAll(Ed, Ed.repeat(s)),
                n = t.lastIndexOf(Ed),
                a = -1 === n ? 0 : n + 7;
              return t.slice(0, a) + r + t.slice(a) + '\n';
            }))
          : (Fr.warn(
              'You are passing both `text` and `images` to `PaliGemmaProcessor`. The processor expects special image tokens in the text, as many tokens as there are images per each text. It is recommended to add `<image>` tokens in the very beginning of your text. For this call, we will infer how many images each text has and add special tokens.'
            ),
            (a = t.map(t =>
              (function (e, t, n, r, s) {
                return `${r.repeat(n * s)}${t}${e}\n`;
              })(t, r, s, Ed, e.length)
            )));
        const o = this.tokenizer(a, n);
        return { ...(await this.image_processor(e, n)), ...o };
      }
    },
    Td = '<|image|>',
    Cd = /<\|image_\d+\|>/g,
    Sd = class extends rc {
      static image_processor_class = dd;
      static tokenizer_class = Zl;
      async _call(
        e,
        t = null,
        { padding: n = !0, truncation: r = !0, num_crops: s = null } = {}
      ) {
        let a, o;
        if ((Array.isArray(e) || (e = [e]), t)) {
          o = await this.image_processor(t, { num_crops: s });
          const { num_img_tokens: i } = o,
            l = e.map((e, t) => e.split(Cd).join(Td.repeat(i[t])));
          a = this.tokenizer(l, { padding: n, truncation: r });
          const c = this.tokenizer._tokenizer.token_to_id(Td);
          a.input_ids.map_(e => (e == c ? -e : e));
        } else a = this.tokenizer(e);
        return { ...a, ...o };
      }
    },
    Pd = class extends rc {
      static tokenizer_class = Zl;
      static image_processor_class = dd;
      static uses_processor_config = !0;
      async _call(e, t = null, n = {}) {
        const r = await this.image_processor(e, n);
        if (t) {
          const [e, n] = r.pixel_values.dims.slice(-2),
            {
              image_token: s,
              image_break_token: a,
              image_end_token: o,
              patch_size: i,
              spatial_merge_size: l,
            } = this.config,
            c = i * l,
            u = Math.floor(e / c),
            d = Math.floor(n / c);
          ((t = structuredClone(t)), Array.isArray(t) || (t = [t]));
          for (let e = 0; e < t.length; ++e) {
            const n = s.repeat(d),
              r = n + o,
              i = (n + a).repeat(u - 1) + r;
            t[e] = t[e].replace(s, i);
          }
        }
        const s = t ? this.tokenizer(t, n) : {};
        return { ...r, ...s };
      }
    },
    Fd = class extends rc {
      static feature_extractor_class = Fc;
      async _call(e) {
        return await this.feature_extractor(e);
      }
      post_process_speaker_diarization(...e) {
        return this.feature_extractor.post_process_speaker_diarization(...e);
      }
      get sampling_rate() {
        return this.feature_extractor.config.sampling_rate;
      }
    },
    Id = class extends rc {
      static image_processor_class = dd;
      static tokenizer_class = Zl;
      async _call(e, t = null, ...n) {
        let r, s;
        if (
          (Array.isArray(e) || (e = [e]),
          t && ((r = await this.image_processor(t)), (s = r.image_grid_thw)),
          s)
        ) {
          let t = this.image_processor.config.merge_size ** 2,
            n = 0;
          const r = s.tolist();
          e = e.map(e => {
            for (; e.includes('<|image_pad|>'); ) {
              const s = Number(r[n++].reduce((e, t) => e * t, 1n));
              e = e.replace(
                '<|image_pad|>',
                '<|placeholder|>'.repeat(Math.floor(s / t))
              );
            }
            return e.replaceAll('<|placeholder|>', '<|image_pad|>');
          });
        }
        return { ...this.tokenizer(e), ...r };
      }
    },
    Od = class extends Id {},
    Ld = class extends Od {},
    zd = class extends rc {
      static image_processor_class = dd;
      async _call(...e) {
        return await this.image_processor(...e);
      }
      post_process_masks(...e) {
        return this.image_processor.post_process_masks(...e);
      }
      reshape_input_points(...e) {
        return this.image_processor.reshape_input_points(...e);
      }
    },
    Nd = class extends zd {},
    Bd = class extends Nd {},
    $d = class extends rc {
      static tokenizer_class = Zl;
      static feature_extractor_class = $c;
      async _call(e) {
        return await this.feature_extractor(e);
      }
    },
    Dd = class extends rc {
      static tokenizer_class = Zl;
      static feature_extractor_class = $c;
      static uses_processor_config = !0;
      async _call(e, t = null, n = {}) {
        if (Array.isArray(e))
          throw new Error('Batched inputs are not supported yet.');
        let r = {};
        if (t) {
          const s = t.length,
            { input_features: a } = await this.feature_extractor(t, {
              ...n,
              max_length: s,
            }),
            o = Math.round(s / this.config.encoder_ds_factor + 1e-4),
            i = 1 + Math.ceil(o / this.config.stack_factor);
          ((r.audio_token_len = [i]), (r.audio_values = a));
          const l = this.config.audio_placeholder;
          if (!e.includes(l))
            throw new Error(
              `The input text does not contain the image token ${l}.`
            );
          e = e.replaceAll(l, l.repeat(i));
        }
        return { ...this.tokenizer(e, { add_special_tokens: !1, ...n }), ...r };
      }
    },
    Rd = '[AUDIO]',
    Ud = class extends rc {
      static tokenizer_class = Zl;
      static feature_extractor_class = $c;
      static uses_processor_config = !1;
      async _call(e, t = null, n = {}) {
        if (Array.isArray(e))
          throw new Error('Batched inputs are not supported yet.');
        const r = {};
        if (t) {
          if (!e.includes(Rd))
            throw new Error(
              `The input text does not contain the audio token ${Rd}.`
            );
          Array.isArray(t) || (t = [t]);
          const s = e.split(Rd),
            a = s.length - 1;
          if (a !== t.length)
            throw new Error(
              `The number of audio inputs (${t.length}) does not match the number of audio tokens in the text (${a}).`
            );
          const o = this.feature_extractor.config.n_samples,
            i = t.map(e =>
              (function (e, t) {
                const n = [];
                for (let r = 0; r < e.length; r += t)
                  n.push(e.subarray(r, Math.min(r + t, e.length)));
                return n;
              })(e, o)
            ),
            l = i.map(e => e.length),
            c = i.flat(),
            u = (
              await Promise.all(c.map(e => this.feature_extractor(e, n)))
            ).map(e => e.input_features);
          r.audio_values = u.length > 1 ? Bi(u, 0) : u[0];
          let d = s[0];
          for (let e = 0; e < l.length; ++e) {
            d += '[BEGIN_AUDIO]';
            for (let t = 0; t < l[e]; ++t) d += Rd.repeat(375);
            d += s[e + 1];
          }
          e = d;
        }
        return { ...this.tokenizer(e, { add_special_tokens: !1, ...n }), ...r };
      }
    },
    Gd = class extends rc {
      static tokenizer_class = Zl;
      static feature_extractor_class = $c;
      async _call(e) {
        return await this.feature_extractor(e);
      }
    },
    Vd = class extends rc {
      static tokenizer_class = Zl;
      static feature_extractor_class = $c;
      async _call(e) {
        return await this.feature_extractor(e);
      }
    },
    jd = class extends rc {
      static tokenizer_class = Zl;
      static feature_extractor_class = $c;
      async _call(e) {
        return await this.feature_extractor(e);
      }
    };
  function Wd(e) {
    const t = {};
    let n = {};
    switch (e.model_type) {
      case 'llava':
      case 'paligemma':
      case 'gemma3':
      case 'florence2':
      case 'llava_onevision':
      case 'idefics3':
      case 'ultravox':
      case 'voxtral':
      case 'smolvlm':
      case 'gemma3n':
      case 'chatterbox':
      case 'mistral3':
      case 'qwen2_5_vl':
      case 'qwen3_vl':
      case 'qwen3_vl_moe':
        n = Wd(e.text_config);
        break;
      case 'moondream1':
        n = Wd(e.phi_config);
        break;
      case 'musicgen':
        n = Wd(e.decoder);
        break;
      case 'multi_modality':
        n = Wd(e.language_config);
        break;
      case 'gpt2':
      case 'gptj':
      case 'jais':
      case 'codegen':
      case 'gpt_bigcode':
        ((t.num_heads = 'n_head'),
          (t.num_layers = 'n_layer'),
          (t.hidden_size = 'n_embd'));
        break;
      case 'gpt_neox':
      case 'stablelm':
      case 'opt':
      case 'falcon':
      case 'modernbert-decoder':
        ((t.num_heads = 'num_attention_heads'),
          (t.num_layers = 'num_hidden_layers'),
          (t.hidden_size = 'hidden_size'));
        break;
      case 'gpt_oss':
      case 'llama':
      case 'llama4_text':
      case 'nanochat':
      case 'apertus':
      case 'arcee':
      case 'afmoe':
      case 'lfm2':
      case 'lfm2_moe':
      case 'smollm3':
      case 'olmo':
      case 'olmo2':
      case 'olmo3':
      case 'mobilellm':
      case 'granite':
      case 'granitemoehybrid':
      case 'cohere':
      case 'cohere2':
      case 'mistral':
      case 'starcoder2':
      case 'qwen2':
      case 'qwen2_moe':
      case 'qwen2_vl':
      case 'qwen2_5_vl_text':
      case 'qwen3_moe':
      case 'qwen3_vl_text':
      case 'qwen3_vl_moe_text':
      case 'phi':
      case 'phi3':
      case 'phi3_v':
      case 'llava_qwen2':
        ((t.num_heads = 'num_key_value_heads'),
          (t.num_layers = 'num_hidden_layers'),
          (t.hidden_size = 'hidden_size'),
          (t.num_attention_heads = 'num_attention_heads'),
          (t.dim_kv = 'head_dim'));
        break;
      case 'qwen3':
      case 'gemma':
      case 'gemma2':
      case 'vaultgemma':
      case 'gemma3_text':
      case 'gemma3n_text':
      case 'glm':
      case 'helium':
      case 'ernie4_5':
      case 'hunyuan_v1_dense':
      case 'falcon_h1':
      case 'ministral':
      case 'ministral3':
        ((t.num_heads = 'num_key_value_heads'),
          (t.num_layers = 'num_hidden_layers'),
          (t.dim_kv = 'head_dim'));
        break;
      case 'openelm':
        ((t.num_heads = 'num_kv_heads'),
          (t.num_layers = 'num_transformer_layers'),
          (t.dim_kv = 'head_dim'));
        break;
      case 'gpt_neo':
      case 'donut-swin':
        ((t.num_heads = 'num_heads'),
          (t.num_layers = 'num_layers'),
          (t.hidden_size = 'hidden_size'));
        break;
      case 'bloom':
        ((t.num_heads = 'n_head'),
          (t.num_layers = 'n_layer'),
          (t.hidden_size = 'hidden_size'));
        break;
      case 'mpt':
        ((t.num_heads = 'n_heads'),
          (t.num_layers = 'n_layers'),
          (t.hidden_size = 'd_model'));
        break;
      case 'exaone':
        ((t.num_heads = 'num_key_value_heads'),
          (t.num_layers = 'num_layers'),
          (t.dim_kv = 'head_dim'),
          (t.num_attention_heads = 'num_attention_heads'));
        break;
      case 'youtu':
        ((t.num_heads = 'num_key_value_heads'),
          (t.num_layers = 'num_hidden_layers'),
          (t.dim_kv = 'qk_head_dim'),
          (t.num_attention_heads = 'num_attention_heads'));
        break;
      case 't5':
      case 'mt5':
      case 'longt5':
        ((t.num_decoder_layers = 'num_decoder_layers'),
          (t.num_decoder_heads = 'num_heads'),
          (t.decoder_dim_kv = 'd_kv'),
          (t.num_encoder_layers = 'num_layers'),
          (t.num_encoder_heads = 'num_heads'),
          (t.encoder_dim_kv = 'd_kv'));
        break;
      case 'bart':
      case 'mbart':
      case 'marian':
      case 'whisper':
      case 'lite-whisper':
      case 'm2m_100':
      case 'blenderbot':
      case 'blenderbot-small':
      case 'florence2_language':
        ((t.num_decoder_layers = 'decoder_layers'),
          (t.num_decoder_heads = 'decoder_attention_heads'),
          (t.decoder_hidden_size = 'd_model'),
          (t.num_encoder_layers = 'encoder_layers'),
          (t.num_encoder_heads = 'encoder_attention_heads'),
          (t.encoder_hidden_size = 'd_model'));
        break;
      case 'speecht5':
        ((t.num_decoder_layers = 'decoder_layers'),
          (t.num_decoder_heads = 'decoder_attention_heads'),
          (t.decoder_hidden_size = 'hidden_size'),
          (t.num_encoder_layers = 'encoder_layers'),
          (t.num_encoder_heads = 'encoder_attention_heads'),
          (t.encoder_hidden_size = 'hidden_size'));
        break;
      case 'trocr':
        ((t.num_encoder_layers = t.num_decoder_layers = 'decoder_layers'),
          (t.num_encoder_heads = t.num_decoder_heads =
            'decoder_attention_heads'),
          (t.encoder_hidden_size = t.decoder_hidden_size = 'd_model'));
        break;
      case 'musicgen_decoder':
        ((t.num_encoder_layers = t.num_decoder_layers = 'num_hidden_layers'),
          (t.num_encoder_heads = t.num_decoder_heads = 'num_attention_heads'),
          (t.encoder_hidden_size = t.decoder_hidden_size = 'hidden_size'));
        break;
      case 'moonshine':
        ((t.num_decoder_layers = 'decoder_num_hidden_layers'),
          (t.num_decoder_heads = 'decoder_num_key_value_heads'),
          (t.num_encoder_layers = 'encoder_num_hidden_layers'),
          (t.num_encoder_heads = 'encoder_num_key_value_heads'),
          (t.encoder_hidden_size = t.decoder_hidden_size = 'hidden_size'));
        break;
      case 'vision-encoder-decoder':
        const r = Wd(e.decoder),
          s = 'num_decoder_layers' in r,
          a = Cr(e, ['model_type', 'is_encoder_decoder']);
        return (
          s
            ? ((a.num_decoder_layers = r.num_decoder_layers),
              (a.num_decoder_heads = r.num_decoder_heads),
              (a.decoder_hidden_size = r.decoder_hidden_size),
              (a.num_encoder_layers = r.num_encoder_layers),
              (a.num_encoder_heads = r.num_encoder_heads),
              (a.encoder_hidden_size = r.encoder_hidden_size))
            : ((a.num_layers = r.num_layers),
              (a.num_heads = r.num_heads),
              (a.hidden_size = r.hidden_size)),
          a
        );
    }
    const r = {
      ...n,
      ...Cr(e, ['model_type', 'multi_query', 'is_encoder_decoder']),
    };
    for (const n in t) r[n] = e[t[n]];
    return r;
  }
  function qd(e, t) {
    if (['lfm2', 'lfm2_moe'].includes(e.model_type)) {
      const n = t?.prefix ?? 'past_key_values',
        r = 'present' === n ? 'present' : 'past',
        s = {},
        {
          layer_types: a,
          num_attention_heads: o,
          num_key_value_heads: i,
          hidden_size: l,
          conv_L_cache: c,
        } = e,
        u = l / o,
        d = t?.batch_size ?? 1;
      for (let e = 0; e < a.length; ++e)
        if ('full_attention' === a[e])
          for (const t of ['key', 'value']) s[`${n}.${e}.${t}`] = [d, i, 0, u];
        else {
          if ('conv' !== a[e])
            throw new Error(`Unsupported layer type: ${a[e]}`);
          s[`${r}_conv.${e}`] = [d, l, c];
        }
      return s;
    }
    if (['granitemoehybrid', 'falcon_h1'].includes(e.model_type)) {
      const n = t?.prefix ?? 'past_key_values',
        r = 'present' === n ? 'present' : 'past',
        s = {},
        {
          layer_types: a,
          num_hidden_layers: o,
          num_attention_heads: i,
          num_key_value_heads: l,
          hidden_size: c,
          mamba_d_conv: u,
          mamba_n_heads: d,
          mamba_d_head: p,
          mamba_d_state: h,
          mamba_n_groups: f,
          mamba_expand: _,
          mamba_d_ssm: m,
        } = e,
        g = c / i,
        w = t?.batch_size ?? 1,
        y = (m ?? _ * c) + 2 * f * h;
      for (let e = 0; e < o; ++e)
        if (
          ((a && 'mamba' !== a[e]) ||
            ((s[`${r}_conv.${e}`] = [w, y, u]),
            (s[`${r}_ssm.${e}`] = [w, d, p, h])),
          !a || 'attention' === a[e])
        )
          for (const t of ['key', 'value']) s[`${n}.${e}.${t}`] = [w, l, 0, g];
      return s;
    }
    if (
      [
        'qwen3_next',
        'qwen3_5_text',
        'qwen3_5_moe_text',
        'olmo_hybrid',
      ].includes(e.model_type)
    ) {
      const n = t?.prefix ?? 'past_key_values',
        r = 'present' === n ? 'present' : 'past',
        s = {},
        {
          head_dim: a,
          layer_types: o,
          num_attention_heads: i,
          num_key_value_heads: l,
          hidden_size: c,
          linear_num_value_heads: u,
          linear_num_key_heads: d,
          linear_key_head_dim: p,
          linear_value_head_dim: h,
          linear_conv_kernel_dim: f,
        } = e,
        _ = p * d,
        m = h * u,
        g = a ?? c / i,
        w = t?.batch_size ?? 1;
      for (let t = 0; t < o.length; ++t)
        if ('full_attention' === o[t])
          for (const e of ['key', 'value']) s[`${n}.${t}.${e}`] = [w, l, 0, g];
        else {
          if ('linear_attention' !== o[t])
            throw new Error(`Unsupported layer type: ${o[t]}`);
          if ('olmo_hybrid' === e.model_type)
            ((s[`${r}_conv.${t}.key`] = [w, _, f]),
              (s[`${r}_conv.${t}.value`] = [w, m, f]),
              (s[`${r}_conv.${t}.query`] = [w, _, f]));
          else {
            const e = 2 * _ + m;
            s[`${r}_conv.${t}`] = [w, e, f];
          }
          s[`${r}_recurrent.${t}`] = [w, u, p, h];
        }
      return s;
    }
    return ['qwen3_5', 'qwen3_5_moe'].includes(e.model_type)
      ? qd(e.text_config, t)
      : (function (
          e,
          { prefix: t = 'past_key_values', batch_size: n = 1 } = {}
        ) {
          const r = {},
            s = e.normalized_config;
          if (
            s.is_encoder_decoder &&
            'num_encoder_heads' in s &&
            'num_decoder_heads' in s
          ) {
            const e =
                s.encoder_dim_kv ?? s.encoder_hidden_size / s.num_encoder_heads,
              a =
                s.decoder_dim_kv ?? s.decoder_hidden_size / s.num_decoder_heads,
              o = [n, s.num_encoder_heads, 0, e],
              i = [n, s.num_decoder_heads, 0, a];
            for (let e = 0; e < s.num_decoder_layers; ++e)
              ((r[`${t}.${e}.encoder.key`] = o),
                (r[`${t}.${e}.encoder.value`] = o),
                (r[`${t}.${e}.decoder.key`] = i),
                (r[`${t}.${e}.decoder.value`] = i));
          } else {
            const e = s.num_heads,
              a = s.num_layers,
              o = s.dim_kv ?? s.hidden_size / (s.num_attention_heads ?? e);
            if ('falcon' === s.model_type) {
              const s = [n * e, 0, o];
              for (let e = 0; e < a; ++e)
                ((r[`${t}.${e}.key`] = s), (r[`${t}.${e}.value`] = s));
            } else if (s.multi_query) {
              const s = [n * e, 0, 2 * o];
              for (let e = 0; e < a; ++e) r[`${t}.${e}.key_value`] = s;
            } else if ('bloom' === s.model_type) {
              const s = [n * e, o, 0],
                i = [n * e, 0, o];
              for (let e = 0; e < a; ++e)
                ((r[`${t}.${e}.key`] = s), (r[`${t}.${e}.value`] = i));
            } else if ('openelm' === s.model_type)
              for (let s = 0; s < a; ++s) {
                const a = [n, e[s], 0, o];
                ((r[`${t}.${s}.key`] = a), (r[`${t}.${s}.value`] = a));
              }
            else {
              const s = [n, e, 0, o];
              for (let e = 0; e < a; ++e)
                ((r[`${t}.${e}.key`] = s), (r[`${t}.${e}.value`] = s));
            }
          }
          return r;
        })(e, t);
  }
  var Hd = class e {
      model_type = null;
      is_encoder_decoder = !1;
      max_position_embeddings;
      'transformers.js_config';
      constructor(e) {
        (Object.assign(this, e), (this.normalized_config = Wd(this)));
      }
      static async from_pretrained(
        t,
        {
          progress_callback: n = null,
          config: r = null,
          cache_dir: s = null,
          local_files_only: a = !1,
          revision: o = 'main',
        } = {}
      ) {
        !r || r instanceof e || (r = new e(r));
        const i =
          r ??
          (await (async function (e, t) {
            return await Ro(e, 'config.json', !0, t);
          })(t, {
            progress_callback: n,
            config: r,
            cache_dir: s,
            local_files_only: a,
            revision: o,
          }));
        return new this(i);
      }
    },
    Qd = class {
      static async from_pretrained(...e) {
        return Hd.from_pretrained(...e);
      }
    };
  async function Xd(e, t, n, r = !1) {
    let s = n.config?.['transformers.js_config'] ?? {};
    const a = (function (e, t, { warn: n } = {}) {
        return e
          ? 'string' == typeof e
            ? e
            : e.hasOwnProperty(t)
              ? e[t]
              : (n &&
                  n(
                    `device not specified for "${t}". Using the default device (${vi}).`
                  ),
                vi)
          : vi;
      })(n.device ?? s.device, t, { warn: e => Fr.info(e) }),
      o = (function (e = null) {
        if (!e) return si;
        switch (e) {
          case 'auto':
            return ii;
          case 'gpu':
            return ii.filter(e =>
              ['webgpu', 'cuda', 'dml', 'webnn-gpu'].includes(e)
            );
        }
        if (ii.includes(e)) return [ni[e] ?? e];
        throw new Error(
          `Unsupported device: "${e}". Should be one of: ${ii.join(', ')}.`
        );
      })(a),
      i = s.device_config ?? {};
    i.hasOwnProperty(a) && (s = { ...s, ...i[a] });
    const l = (function (e, t, n, { configDtype: r = null, warn: s } = {}) {
      let a,
        o,
        i = !1;
      if (
        (e && 'string' != typeof e
          ? e.hasOwnProperty(t)
            ? (a = e[t])
            : ((a = null), (i = !0))
          : (a = e),
        a === Mi.auto)
      ) {
        if (r) {
          const e = 'string' == typeof r ? r : r?.[t];
          if (e && e !== Mi.auto && Mi.hasOwnProperty(e)) return e;
        }
        o = Ei[n] ?? ki;
      } else o = a && Mi.hasOwnProperty(a) ? a : (Ei[n] ?? ki);
      return (
        i &&
          s &&
          s(
            `dtype not specified for "${t}". Using the default dtype (${o}) for this device (${n}).`
          ),
        o
      );
    })(n.dtype ?? s.dtype, t, a, {
      configDtype: s.dtype,
      warn: e => Fr.info(e),
    });
    if (!Ai.hasOwnProperty(l))
      throw new Error(
        `Invalid dtype: ${l}. Should be one of: ${Object.keys(Mi).join(', ')}`
      );
    if ('webgpu' === a && !dr.IS_NODE_ENV && l === Mi.fp16 && !(await xi()))
      throw new Error(`The device (${a}) does not support fp16.`);
    const c = s.kv_cache_dtype,
      u = c ? ('string' == typeof c ? c : (c[l] ?? 'float32')) : void 0;
    if (u && !['float32', 'float16'].includes(u))
      throw new Error(
        `Invalid kv_cache_dtype: ${u}. Should be one of: float32, float16`
      );
    const d = Ai[l],
      p = { ...n.session_options };
    p.executionProviders ??= o;
    const h = s.free_dimension_overrides;
    h
      ? (p.freeDimensionOverrides ??= h)
      : a.startsWith('webnn') &&
        !p.freeDimensionOverrides &&
        Fr.warn(
          `WebNN does not currently support dynamic shapes and requires 'free_dimension_overrides' to be set in config.json, preferably as a field within config["transformers.js_config"]["device_config"]["${a}"]. When 'free_dimension_overrides' is not set, you may experience significant performance degradation.`
        );
    const f = (async function (e, t, n, r) {
        const s = `${t}${r}.onnx`,
          a = `${n.subfolder ?? ''}/${s}`;
        return await $o(e, a, !0, n, dr.IS_NODE_ENV);
      })(e, t, n, d),
      _ = n.use_external_data_format ?? s.use_external_data_format,
      m = await (async function (e, t, n, r, s, a = {}) {
        const o = `${t}${n}.onnx`,
          i = dr.IS_NODE_ENV;
        let l = [];
        const c = (function (e, t, n) {
          return e
            ? 'object' == typeof e && null !== e
              ? e.hasOwnProperty(t)
                ? +e[t]
                : e.hasOwnProperty(n)
                  ? +e[n]
                  : 0
              : +e
            : 0;
        })(s, o, t);
        if (c > 0) {
          if (c > 100)
            throw new Error(
              `The number of external data chunks (${c}) exceeds the maximum allowed value (100).`
            );
          const t = (function (e, t) {
            const n = [];
            for (let r = 0; r < t; ++r)
              n.push(`${e}_data${0 === r ? '' : '_' + r}`);
            return n;
          })(o, c);
          for (const n of t) {
            const t = `${r.subfolder ?? ''}/${n}`;
            l.push(
              new Promise(async (s, a) => {
                const o = await $o(e, t, !0, r, i);
                s(o instanceof Uint8Array ? { path: n, data: o } : n);
              })
            );
          }
        } else
          void 0 !== a.externalData &&
            (l = a.externalData.map(async t => {
              if ('string' == typeof t.data) {
                const n = await $o(e, t.data, !0, r);
                return { ...t, data: n };
              }
              return t;
            }));
        return Promise.all(l);
      })(e, t, d, n, _, p);
    if (
      (m.length > 0 && !dr.IS_NODE_ENV && (p.externalData = m),
      r && 'webgpu' === a && !1 !== c)
    ) {
      const e = qd(n.config, { prefix: 'present' });
      if (Object.keys(e).length > 0 && !gi()) {
        const t = {};
        for (const n in e) t[n] = 'gpu-buffer';
        p.preferredOutputLocation = t;
      }
    }
    return {
      buffer_or_path: await f,
      session_options: p,
      session_config: { dtype: l, kv_cache_dtype: u, device: a },
    };
  }
  async function Yd(e, t, n, r = void 0) {
    return Object.fromEntries(
      await Promise.all(
        Object.keys(t).map(async s => {
          const {
            buffer_or_path: a,
            session_options: o,
            session_config: i,
          } = await Xd(e, t[s], n, s === r);
          return [s, await pi(a, o, i)];
        })
      )
    );
  }
  function Jd(e) {
    for (let t in e)
      _i(e[t]) ? (e[t] = new Ci(e[t])) : 'object' == typeof e[t] && Jd(e[t]);
    return e;
  }
  async function Kd(e, t) {
    const n = (function (e, t) {
      const n = Object.create(null),
        r = [];
      for (const s of e.inputNames) {
        const e = t[s];
        e instanceof Ci ? (n[s] = gi() ? e.clone() : e) : r.push(s);
      }
      if (r.length > 0)
        throw new Error(
          `An error occurred during model execution: "Missing the following inputs: ${r.join(', ')}.`
        );
      const s = Object.keys(t).length,
        a = e.inputNames.length;
      if (s > a) {
        let n = Object.keys(t).filter(t => !e.inputNames.includes(t));
        Fr.warn(
          `WARNING: Too many inputs were provided (${s} > ${a}). The following inputs will be ignored: "${n.join(', ')}".`
        );
      }
      return n;
    })(e, t);
    try {
      const t = Object.fromEntries(
        Object.entries(n).map(([e, t]) => {
          const n = t.ort_tensor;
          return (
            dr.IS_NODE_ENV &&
              'undefined' != typeof Float16Array &&
              n.cpuData instanceof Float16Array &&
              (n.cpuData = new Uint16Array(n.cpuData.buffer)),
            [e, n]
          );
        })
      );
      return Jd(await fi(e, t));
    } catch (e) {
      const t = Object.fromEntries(
        Object.entries(n).map(([e, t]) => {
          const n = { type: t.type, dims: t.dims, location: t.location };
          return ('gpu-buffer' !== n.location && (n.data = t.data), [e, n]);
        })
      );
      throw (
        Fr.error(`An error occurred during model execution: "${e}".`),
        Fr.error('Inputs given to model:', t),
        e
      );
    }
  }
  var Zd = class {},
    ep = class extends Zd {
      constructor({ logits: e, ...t }) {
        (super(), (this.logits = e));
        const n = Object.values(t);
        n.length > 0 && (this.attentions = n);
      }
    },
    tp = class extends Zd {
      constructor({ logits: e }) {
        (super(), (this.logits = e));
      }
    },
    np = class extends Zd {
      constructor({ logits: e }) {
        (super(), (this.logits = e));
      }
    },
    rp = class extends Zd {
      constructor({ start_logits: e, end_logits: t }) {
        (super(), (this.start_logits = e), (this.end_logits = t));
      }
    },
    sp = class extends Zd {
      constructor({ logits: e }) {
        (super(), (this.logits = e));
      }
    },
    ap = class extends Zd {
      constructor({ alphas: e }) {
        (super(), (this.alphas = e));
      }
    },
    op = class extends mo {
      _call(e, t) {
        throw Error('`_call` should be implemented in a subclass');
      }
    },
    ip = class extends mo {
      _call(e, t) {
        throw Error('`_call` should be implemented in a subclass');
      }
    },
    lp = class extends mo {
      constructor() {
        (super(), (this.processors = []));
      }
      push(e) {
        this.processors.push(e);
      }
      extend(e) {
        this.processors.push(...e);
      }
      _call(e, t) {
        let n = t;
        for (const t of this.processors) n = t(e, n);
        return n;
      }
      [Symbol.iterator]() {
        return this.processors.values();
      }
    },
    cp = class extends op {
      constructor(e) {
        (super(), (this.bos_token_id = e));
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n)
          if (1 === e[n].length) {
            const e = t[n].data;
            (e.fill(-1 / 0), (e[this.bos_token_id] = 0));
          }
        return t;
      }
    },
    up = class extends op {
      constructor(e, t) {
        (super(),
          (this.max_length = e),
          (this.eos_token_id = Array.isArray(t) ? t : [t]));
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n)
          if (e[n].length === this.max_length - 1) {
            const e = t[n].data;
            e.fill(-1 / 0);
            for (const t of this.eos_token_id) e[t] = 0;
          }
        return t;
      }
    },
    dp = class extends op {
      constructor(e, t) {
        (super(), (this.begin_suppress_tokens = e), (this.begin_index = t));
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n)
          if (e[n].length === this.begin_index) {
            const e = t[n].data;
            for (const t of this.begin_suppress_tokens) e[t] = -1 / 0;
          }
        return t;
      }
    },
    pp = class extends op {
      constructor(e, t) {
        (super(),
          (this.eos_token_id = Array.isArray(e.eos_token_id)
            ? e.eos_token_id[0]
            : e.eos_token_id),
          (this.no_timestamps_token_id = e.no_timestamps_token_id),
          (this.timestamp_begin = this.no_timestamps_token_id + 1),
          (this.begin_index = t.length),
          t.at(-1) === this.no_timestamps_token_id && (this.begin_index -= 1),
          (this.max_initial_timestamp_index = e.max_initial_timestamp_index));
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n) {
          const r = t[n].data;
          if (
            ((r[this.no_timestamps_token_id] = -1 / 0),
            e[n].length === this.begin_index - 1)
          ) {
            (r.fill(-1 / 0), (r[this.timestamp_begin] = 0));
            continue;
          }
          const s = e[n].slice(this.begin_index),
            a = s.length >= 1 && s[s.length - 1] >= this.timestamp_begin,
            o = s.length < 2 || s[s.length - 2] >= this.timestamp_begin;
          if (
            (a &&
              (o
                ? r.subarray(this.timestamp_begin).fill(-1 / 0)
                : r.subarray(0, this.eos_token_id).fill(-1 / 0)),
            e[n].length === this.begin_index &&
              null !== this.max_initial_timestamp_index)
          ) {
            const e = this.timestamp_begin + this.max_initial_timestamp_index;
            r.subarray(e + 1).fill(-1 / 0);
          }
          const i = Go(r),
            l = Math.log(
              i
                .subarray(this.timestamp_begin)
                .map(Math.exp)
                .reduce((e, t) => e + t)
            );
          l > jo(i.subarray(0, this.timestamp_begin))[0] &&
            r.subarray(0, this.timestamp_begin).fill(-1 / 0);
        }
        return t;
      }
    },
    hp = class extends op {
      constructor(e) {
        (super(), (this.no_repeat_ngram_size = e));
      }
      getNgrams(e) {
        const t = e.length,
          n = [];
        for (let r = 0; r < t + 1 - this.no_repeat_ngram_size; ++r) {
          const t = [];
          for (let n = 0; n < this.no_repeat_ngram_size; ++n) t.push(e[r + n]);
          n.push(t.map(Number));
        }
        const r = new Map();
        for (const e of n) {
          const t = e.slice(0, e.length - 1),
            n = JSON.stringify(t),
            s = r.get(n) ?? [];
          (s.push(e[e.length - 1]), r.set(n, s));
        }
        return r;
      }
      getGeneratedNgrams(e, t) {
        const n = t.slice(t.length + 1 - this.no_repeat_ngram_size, t.length);
        return e.get(JSON.stringify(n.map(Number))) ?? [];
      }
      calcBannedNgramTokens(e) {
        if (e.length + 1 < this.no_repeat_ngram_size) return [];
        {
          const t = this.getNgrams(e);
          return this.getGeneratedNgrams(t, e);
        }
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n) {
          const r = t[n].data,
            s = this.calcBannedNgramTokens(e[n]);
          for (const e of s) r[e] = -1 / 0;
        }
        return t;
      }
    },
    fp = class extends op {
      constructor(e) {
        (super(), (this.penalty = e));
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n) {
          const r = t[n].data;
          for (const t of new Set(e[n])) {
            const e = Number(t);
            r[e] < 0 ? (r[e] *= this.penalty) : (r[e] /= this.penalty);
          }
        }
        return t;
      }
    },
    _p = class extends op {
      constructor(e, t) {
        (super(),
          (this.min_length = e),
          (this.eos_token_id = Array.isArray(t) ? t : [t]));
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n)
          if (e[n].length < this.min_length) {
            const e = t[n].data;
            for (const t of this.eos_token_id) e[t] = -1 / 0;
          }
        return t;
      }
    },
    mp = class extends op {
      constructor(e, t, n) {
        (super(),
          (this.prompt_length_to_skip = e),
          (this.min_new_tokens = t),
          (this.eos_token_id = Array.isArray(n) ? n : [n]));
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n)
          if (e[n].length - this.prompt_length_to_skip < this.min_new_tokens) {
            const e = t[n].data;
            for (const t of this.eos_token_id) e[t] = -1 / 0;
          }
        return t;
      }
    },
    gp = class extends op {
      constructor(e, t) {
        (super(),
          (this.bad_words_ids = e),
          (this.eos_token_id = Array.isArray(t) ? t : [t]));
      }
      _call(e, t) {
        for (let n = 0; n < e.length; ++n) {
          const r = t[n].data,
            s = e[n];
          for (const e of this.bad_words_ids) {
            if (s.length < e.length - 1) continue;
            let t = !0;
            for (let n = 1; n <= e.length - 1; ++n)
              if (e.at(-n - 1) != s.at(-n)) {
                t = !1;
                break;
              }
            t && (r[e.at(-1)] = -1 / 0);
          }
        }
        return t;
      }
    },
    wp = class extends op {
      constructor(e) {
        if ((super(), e <= 1))
          throw new Error(
            `Require guidance scale >1 to use the classifier free guidance processor, got guidance scale ${e}.`
          );
        this.guidance_scale = e;
      }
      _call(e, t) {
        if (t.dims[0] !== 2 * e.length)
          throw new Error(
            `Logits should have twice the batch size of the input ids, the first half of batches corresponding to the conditional inputs, and the second half of batches corresponding to the unconditional inputs. Got batch size ${t.dims[0]} for the logits and ${e.length} for the input ids.`
          );
        const n = e.length,
          r = t.slice([0, n], null),
          s = t.slice([n, t.dims[0]], null);
        for (let e = 0; e < s.data.length; ++e)
          s.data[e] += (r.data[e] - s.data[e]) * this.guidance_scale;
        return s;
      }
    },
    yp = class extends ip {
      constructor(e) {
        if ((super(), 'number' != typeof e || e <= 0)) {
          let t = `\`temperature\` (=${e}) must be a strictly positive float, otherwise your next token scores will be invalid.`;
          0 === e &&
            (t +=
              " If you're looking for greedy decoding strategies, set `do_sample=false`.");
        }
        this.temperature = e;
      }
      _call(e, t) {
        const n = t.data;
        for (let e = 0; e < n.length; ++e) n[e] /= this.temperature;
        return t;
      }
    },
    bp = class {
      max_length = 20;
      max_new_tokens = null;
      min_length = 0;
      min_new_tokens = null;
      early_stopping = !1;
      max_time = null;
      do_sample = !1;
      num_beams = 1;
      num_beam_groups = 1;
      penalty_alpha = null;
      use_cache = !0;
      temperature = 1;
      top_k = 50;
      top_p = 1;
      typical_p = 1;
      epsilon_cutoff = 0;
      eta_cutoff = 0;
      diversity_penalty = 0;
      repetition_penalty = 1;
      encoder_repetition_penalty = 1;
      length_penalty = 1;
      no_repeat_ngram_size = 0;
      bad_words_ids = null;
      force_words_ids = null;
      renormalize_logits = !1;
      constraints = null;
      forced_bos_token_id = null;
      forced_eos_token_id = null;
      remove_invalid_values = !1;
      exponential_decay_length_penalty = null;
      suppress_tokens = null;
      streamer = null;
      begin_suppress_tokens = null;
      forced_decoder_ids = null;
      guidance_scale = null;
      num_return_sequences = 1;
      output_attentions = !1;
      output_hidden_states = !1;
      output_scores = !1;
      return_dict_in_generate = !1;
      pad_token_id = null;
      bos_token_id = null;
      eos_token_id = null;
      encoder_no_repeat_ngram_size = 0;
      decoder_start_token_id = null;
      generation_kwargs = {};
      constructor(e) {
        Object.assign(this, Cr(e, Object.getOwnPropertyNames(this)));
      }
    },
    vp = class extends mo {
      _call(e, t) {
        throw Error('StoppingCriteria needs to be subclassed');
      }
    },
    xp = class e extends mo {
      constructor() {
        (super(), (this.criteria = []));
      }
      push(e) {
        this.criteria.push(e);
      }
      extend(t) {
        (t instanceof e ? (t = t.criteria) : t instanceof vp && (t = [t]),
          this.criteria.push(...t));
      }
      _call(e, t) {
        const n = new Array(e.length).fill(!1);
        for (const r of this.criteria) {
          const s = r(e, t);
          for (let e = 0; e < n.length; ++e) n[e] ||= s[e];
        }
        return n;
      }
      [Symbol.iterator]() {
        return this.criteria.values();
      }
    },
    Mp = class extends vp {
      constructor(e, t = null) {
        (super(), (this.max_length = e), (this.max_position_embeddings = t));
      }
      _call(e) {
        return e.map(e => e.length >= this.max_length);
      }
    },
    kp = class extends vp {
      constructor(e) {
        (super(), Array.isArray(e) || (e = [e]), (this.eos_token_id = e));
      }
      _call(e, t) {
        return e.map(e => {
          const t = e.at(-1);
          return this.eos_token_id.some(e => t == e);
        });
      }
    },
    Ep = class extends mo {
      constructor(e) {
        (super(), (this.generation_config = e));
      }
      async _call(e) {
        return this.sample(e);
      }
      async sample(e) {
        throw Error('sample should be implemented in subclasses.');
      }
      getLogits(e, t) {
        let n = e.dims.at(-1),
          r = e.data;
        if (-1 === t) r = r.slice(-n);
        else {
          let e = t * n;
          r = r.slice(e, e + n);
        }
        return r;
      }
      randomSelect(e) {
        return ((t = e), bo(xo.random, t));
        var t;
      }
      static getSampler(e) {
        if (e.do_sample) return new Tp(e);
        if (e.num_beams > 1) return new Cp(e);
        if (e.num_return_sequences > 1)
          throw Error(
            `num_return_sequences has to be 1 when doing greedy search, but is ${e.num_return_sequences}.`
          );
        return new Ap(e);
      }
    },
    Ap = class extends Ep {
      async sample(e) {
        const t = jo(e.data)[1];
        return [[BigInt(t), 0]];
      }
    },
    Tp = class extends Ep {
      async sample(e) {
        let t = e.dims.at(-1);
        this.generation_config.top_k > 0 &&
          (t = Math.min(this.generation_config.top_k, t));
        const [n, r] = await Fi(e, t),
          s = Uo(n.data);
        return Array.from({ length: this.generation_config.num_beams }, () => {
          const e = this.randomSelect(s);
          return [r.data[e], Math.log(s[e])];
        });
      }
    },
    Cp = class extends Ep {
      async sample(e) {
        let t = e.dims.at(-1);
        this.generation_config.top_k > 0 &&
          (t = Math.min(this.generation_config.top_k, t));
        const [n, r] = await Fi(e, t),
          s = Uo(n.data);
        return Array.from(
          { length: this.generation_config.num_beams },
          (e, t) => [r.data[t], Math.log(s[t])]
        );
      }
    },
    Sp = null;
  function Pp(e) {
    for (const t in e)
      if (t.startsWith('past_key_values.')) return e[t].dims.at(-2);
    return Object.values(e)[0].dims.at(-2);
  }
  function Fp(e) {
    if (e instanceof Ci) return e;
    if (0 === e.length) throw Error('items must be non-empty');
    if (Array.isArray(e[0])) {
      if (e.some(t => t.length !== e[0].length))
        throw Error(
          "Unable to create tensor, you should probably activate truncation and/or padding with 'padding=True' and/or 'truncation=True' to have batched tensors with the same length."
        );
      return new Ci('int64', BigInt64Array.from(e.flat().map(e => BigInt(e))), [
        e.length,
        e[0].length,
      ]);
    }
    return new Ci('int64', BigInt64Array.from(e.map(e => BigInt(e))), [
      1,
      e.length,
    ]);
  }
  function Ip(e) {
    return new Ci('bool', [e], [1]);
  }
  var Op = 1,
    Lp = 2,
    zp = 3,
    Np = 4,
    Bp = 5,
    $p = 7,
    Dp = 8,
    Rp = 9,
    Up = 10,
    Gp = 11,
    Vp = 12,
    jp = 13,
    Wp = 15,
    qp = {
      [Np]: { can_generate: !0, forward: Zp, prepare_inputs: nh },
      [Bp]: { can_generate: !1, forward: Zp, prepare_inputs: nh },
      [Lp]: { can_generate: !0, forward: Jp, prepare_inputs: rh },
      [zp]: { can_generate: !0, forward: Jp, prepare_inputs: rh },
      [Dp]: { can_generate: !0, forward: Jp },
      [Op]: { can_generate: !1, forward: Jp },
      [$p]: {
        can_generate: !0,
        forward: async function (e, t) {
          return await eh(e, {
            ...t,
            modality_input_name: 'pixel_values',
            modality_output_name: 'image_features',
            encode_function: e.encode_image.bind(e),
            merge_function: e._merge_input_ids_with_image_features.bind(e),
          });
        },
        prepare_inputs: sh,
      },
      [Gp]: {
        can_generate: !0,
        forward: async function (e, t) {
          return await eh(e, {
            ...t,
            modality_input_name: 'audio_values',
            modality_output_name: 'audio_features',
            encode_function: e.encode_audio.bind(e),
            merge_function: e._merge_input_ids_with_audio_features.bind(e),
          });
        },
        prepare_inputs: sh,
      },
      [Up]: { can_generate: !0, prepare_inputs: sh },
      [jp]: { can_generate: !0, prepare_inputs: sh },
      [Rp]: { can_generate: !0 },
      [Vp]: {
        can_generate: !1,
        forward: async function (e, t) {
          const n = await e.encode(t);
          return await e.decode(n);
        },
      },
      [Wp]: { can_generate: !0, forward: Kp },
      default: { can_generate: !1, forward: Kp },
    },
    Hp = new Map(),
    Qp = new Map(),
    Xp = new Map(),
    Yp = class extends mo {
      main_input_name = 'input_ids';
      forward_params = ['input_ids', 'attention_mask'];
      _return_dict_in_generate_keys = null;
      constructor(e, t, n) {
        (super(), (this.config = e), (this.sessions = t), (this.configs = n));
        const r = Xp.get(this.constructor),
          s = Hp.get(r),
          a = qp[s] ?? qp.default;
        ((this.can_generate = a.can_generate),
          (this._forward = a.forward),
          (this._prepare_inputs_for_generation = a.prepare_inputs),
          this.can_generate && this.forward_params.push('past_key_values'),
          (this.custom_config = this.config['transformers.js_config'] ?? {}));
      }
      async dispose() {
        const e = [];
        for (const t of Object.values(this.sessions)) e.push(t.release?.());
        return await Promise.all(e);
      }
      static async from_pretrained(
        e,
        {
          progress_callback: t = null,
          config: n = null,
          cache_dir: r = null,
          local_files_only: s = !1,
          revision: a = 'main',
          model_file_name: o = null,
          subfolder: i = 'onnx',
          device: l = null,
          dtype: c = null,
          use_external_data_format: u = null,
          session_options: d = {},
        } = {}
      ) {
        const p = {
            progress_callback: t,
            config: n,
            cache_dir: r,
            local_files_only: s,
            revision: a,
            model_file_name: o,
            subfolder: i,
            device: l,
            dtype: c,
            use_external_data_format: u,
            session_options: d,
          },
          h = Xp.get(this),
          f = Hp.get(h);
        let _;
        if (((n = p.config = await Qd.from_pretrained(e, p)), 4 === f))
          _ = await Promise.all([
            Yd(e, { model: p.model_file_name ?? 'model' }, p, 'model'),
            lh(e, { generation_config: 'generation_config.json' }, p),
          ]);
        else if (2 === f || 3 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                model: 'encoder_model',
                decoder_model_merged: 'decoder_model_merged',
              },
              p,
              'decoder_model_merged'
            ),
            lh(e, { generation_config: 'generation_config.json' }, p),
          ]);
        else if (6 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                model: 'vision_encoder',
                prompt_encoder_mask_decoder: 'prompt_encoder_mask_decoder',
              },
              p
            ),
          ]);
        else if (1 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                model: 'encoder_model',
                decoder_model_merged: 'decoder_model_merged',
              },
              p,
              'decoder_model_merged'
            ),
          ]);
        else if (7 === f) {
          const t = {
            embed_tokens: 'embed_tokens',
            vision_encoder: 'vision_encoder',
            decoder_model_merged: 'decoder_model_merged',
          };
          (n.is_encoder_decoder && (t.model = 'encoder_model'),
            (_ = await Promise.all([
              Yd(e, t, p, 'decoder_model_merged'),
              lh(e, { generation_config: 'generation_config.json' }, p),
            ])));
        } else if (11 === f) {
          const t = {
            embed_tokens: 'embed_tokens',
            audio_encoder: 'audio_encoder',
            decoder_model_merged: 'decoder_model_merged',
          };
          _ = await Promise.all([
            Yd(e, t, p, 'decoder_model_merged'),
            lh(e, { generation_config: 'generation_config.json' }, p),
          ]);
        } else if (13 === f) {
          const t = {
            embed_tokens: 'embed_tokens',
            audio_encoder: 'audio_encoder',
            vision_encoder: 'vision_encoder',
            decoder_model_merged: 'decoder_model_merged',
          };
          _ = await Promise.all([
            Yd(e, t, p),
            lh(e, { generation_config: 'generation_config.json' }, p),
          ]);
        } else if (8 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                model: 'text_encoder',
                decoder_model_merged: 'decoder_model_merged',
                encodec_decode: 'encodec_decode',
              },
              p,
              'decoder_model_merged'
            ),
            lh(e, { generation_config: 'generation_config.json' }, p),
          ]);
        else if (9 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                prepare_inputs_embeds: 'prepare_inputs_embeds',
                model: 'language_model',
                lm_head: 'lm_head',
                gen_head: 'gen_head',
                gen_img_embeds: 'gen_img_embeds',
                image_decode: 'image_decode',
              },
              p,
              'model'
            ),
            lh(e, { generation_config: 'generation_config.json' }, p),
          ]);
        else if (10 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                prepare_inputs_embeds: 'prepare_inputs_embeds',
                model: 'model',
                vision_encoder: 'vision_encoder',
              },
              p,
              'model'
            ),
            lh(e, { generation_config: 'generation_config.json' }, p),
          ]);
        else if (15 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                embed_tokens: 'embed_tokens',
                speech_encoder: 'speech_encoder',
                model: 'language_model',
                conditional_decoder: 'conditional_decoder',
              },
              p,
              'model'
            ),
            lh(e, { generation_config: 'generation_config.json' }, p),
          ]);
        else if (12 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                encoder_model: 'encoder_model',
                decoder_model: 'decoder_model',
              },
              p
            ),
          ]);
        else if (14 === f)
          _ = await Promise.all([
            Yd(
              e,
              {
                text_encoder: 'text_encoder',
                latent_denoiser: 'latent_denoiser',
                voice_decoder: 'voice_decoder',
              },
              p
            ),
          ]);
        else {
          if (void 0 === f) {
            const e = h ?? n?.model_type;
            'custom' !== e &&
              Fr.warn(
                `Model type for '${e}' not found, assuming encoder-only architecture. Please report this at ${ec}.`
              );
          }
          _ = await Promise.all([
            Yd(e, { model: p.model_file_name ?? 'model' }, p),
          ]);
        }
        return new this(n, ..._);
      }
      async _call(e) {
        return await this.forward(e);
      }
      async forward(e) {
        return await this._forward(this, e);
      }
      get generation_config() {
        return this.configs?.generation_config ?? null;
      }
      _get_logits_processor(e, t, n = null) {
        const r = new lp();
        if (
          (null !== e.repetition_penalty &&
            1 !== e.repetition_penalty &&
            r.push(new fp(e.repetition_penalty)),
          null !== e.no_repeat_ngram_size &&
            e.no_repeat_ngram_size > 0 &&
            r.push(new hp(e.no_repeat_ngram_size)),
          null !== e.bad_words_ids &&
            r.push(new gp(e.bad_words_ids, e.eos_token_id)),
          null !== e.min_length &&
            null !== e.eos_token_id &&
            e.min_length > 0 &&
            r.push(new _p(e.min_length, e.eos_token_id)),
          null !== e.min_new_tokens &&
            null !== e.eos_token_id &&
            e.min_new_tokens > 0 &&
            r.push(new mp(t, e.min_new_tokens, e.eos_token_id)),
          null !== e.forced_bos_token_id &&
            r.push(new cp(e.forced_bos_token_id)),
          null !== e.forced_eos_token_id &&
            r.push(new up(e.max_length, e.forced_eos_token_id)),
          null !== e.begin_suppress_tokens)
        ) {
          const n = t > 1 || null === e.forced_bos_token_id ? t : t + 1;
          r.push(new dp(e.begin_suppress_tokens, n));
        }
        return (
          null !== e.guidance_scale &&
            e.guidance_scale > 1 &&
            r.push(new wp(e.guidance_scale)),
          0 === e.temperature &&
            e.do_sample &&
            (Fr.warn(
              '`do_sample` changed to false because `temperature: 0` implies greedy sampling (always selecting the most likely token), which is incompatible with `do_sample: true`.'
            ),
            (e.do_sample = !1)),
          e.do_sample &&
            null !== e.temperature &&
            1 !== e.temperature &&
            r.push(new yp(e.temperature)),
          null !== n && r.extend(n),
          r
        );
      }
      _prepare_generation_config(e, t, n = bp) {
        const r = { ...this.config };
        for (const e of ['decoder', 'generator', 'text_config'])
          e in r && Object.assign(r, r[e]);
        const s = new n(r);
        return (
          Object.assign(s, this.generation_config ?? {}),
          e && Object.assign(s, e),
          t && Object.assign(s, Cr(t, Object.getOwnPropertyNames(s))),
          s
        );
      }
      _get_stopping_criteria(e, t = null) {
        const n = new xp();
        return (
          null !== e.max_length &&
            n.push(
              new Mp(e.max_length, this.config.max_position_embeddings ?? null)
            ),
          null !== e.eos_token_id && n.push(new kp(e.eos_token_id)),
          t && n.extend(t),
          n
        );
      }
      _validate_model_class() {
        if (!this.can_generate) {
          const e = [
              Sp.MODEL_FOR_CAUSAL_LM_MAPPING_NAMES,
              Sp.MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES,
              Sp.MODEL_FOR_SEQ_TO_SEQ_CAUSAL_LM_MAPPING_NAMES,
              Sp.MODEL_FOR_SPEECH_SEQ_2_SEQ_MAPPING_NAMES,
            ].filter(Boolean),
            t = Xp.get(this.constructor),
            n = new Set(),
            r = this.config.model_type;
          for (const t of e) {
            const e = t?.get(r);
            e && n.add(e);
          }
          let s = `The current model class (${t}) is not compatible with \`.generate()\`, as it doesn't have a language model head.`;
          throw (
            n.size > 0 &&
              (s += ` Please use the following class instead: ${[...n].join(', ')}`),
            Error(s)
          );
        }
      }
      prepare_inputs_for_generation(...e) {
        if (!this._prepare_inputs_for_generation)
          throw new Error(
            'prepare_inputs_for_generation is not implemented for this model.'
          );
        return this._prepare_inputs_for_generation(this, ...e);
      }
      _update_model_kwargs_for_generation({
        generated_input_ids: e,
        outputs: t,
        model_inputs: n,
        is_encoder_decoder: r,
      }) {
        return (
          (n.past_key_values = this.getPastKeyValues(t, n.past_key_values)),
          (n.input_ids = new Ci('int64', e.flat(), [e.length, 1])),
          r ||
            (n.attention_mask = Bi(
              [n.attention_mask, Wi([n.attention_mask.dims[0], 1])],
              1
            )),
          (n.position_ids = null),
          n
        );
      }
      _prepare_model_inputs({ inputs: e, bos_token_id: t, model_kwargs: n }) {
        const r = Cr(n, this.forward_params),
          s = this.main_input_name;
        if (s in r) {
          if (e)
            throw new Error(
              '`inputs`: {inputs}` were passed alongside {input_name} which is not allowed. Make sure to either pass {inputs} or {input_name}=...'
            );
        } else r[s] = e;
        return { inputs_tensor: r[s], model_inputs: r, model_input_name: s };
      }
      async _prepare_encoder_decoder_kwargs_for_generation({
        inputs_tensor: e,
        model_inputs: t,
        model_input_name: n,
        generation_config: r,
      }) {
        if (
          this.sessions.model.inputNames.includes('inputs_embeds') &&
          !t.inputs_embeds &&
          '_prepare_inputs_embeds' in this
        ) {
          const { input_ids: e, pixel_values: n, attention_mask: r, ...s } = t;
          t = {
            ...s,
            ...Cr(await this._prepare_inputs_embeds(t), [
              'inputs_embeds',
              'attention_mask',
            ]),
          };
        }
        let { last_hidden_state: s } = await Kp(this, t);
        if (null !== r.guidance_scale && r.guidance_scale > 1)
          ((s = Bi([s, ji(s, 0)], 0)),
            'attention_mask' in t &&
              (t.attention_mask = Bi(
                [t.attention_mask, Qi(t.attention_mask)],
                0
              )));
        else if (t.decoder_input_ids) {
          const e = Fp(t.decoder_input_ids).dims[0];
          if (e !== s.dims[0]) {
            if (1 !== s.dims[0])
              throw new Error(
                `The encoder outputs have a different batch size (${s.dims[0]}) than the decoder inputs (${e}).`
              );
            s = Bi(
              Array.from({ length: e }, () => s),
              0
            );
          }
        }
        return ((t.encoder_outputs = s), t);
      }
      _prepare_decoder_input_ids_for_generation({
        batch_size: e,
        model_input_name: t,
        model_kwargs: n,
        decoder_start_token_id: r,
        bos_token_id: s,
        generation_config: a,
      }) {
        let { decoder_input_ids: o, ...i } = n;
        if (!(o instanceof Ci)) {
          if (o)
            Array.isArray(o[0]) || (o = Array.from({ length: e }, () => o));
          else if (((r ??= s), 'musicgen' === this.config.model_type))
            o = Array.from(
              { length: e * this.config.decoder.num_codebooks },
              () => [r]
            );
          else if (Array.isArray(r)) {
            if (r.length !== e)
              throw new Error(
                `\`decoder_start_token_id\` expcted to have length ${e} but got ${r.length}`
              );
            o = r;
          } else o = Array.from({ length: e }, () => [r]);
          o = Fp(o);
        }
        return (
          (n.decoder_attention_mask = qi(o)),
          { input_ids: o, model_inputs: i }
        );
      }
      async generate({
        inputs: e = null,
        generation_config: t = null,
        logits_processor: n = null,
        stopping_criteria: r = null,
        streamer: s = null,
        ...a
      }) {
        (this._validate_model_class(),
          (t = this._prepare_generation_config(t, a)));
        let {
          inputs_tensor: o,
          model_inputs: i,
          model_input_name: l,
        } = this._prepare_model_inputs({ inputs: e, model_kwargs: a });
        const c = this.config.is_encoder_decoder;
        let u;
        (c &&
          ('encoder_outputs' in i ||
            (i = await this._prepare_encoder_decoder_kwargs_for_generation({
              inputs_tensor: o,
              model_inputs: i,
              model_input_name: l,
              generation_config: t,
            }))),
          c
            ? ({ input_ids: u, model_inputs: i } =
                this._prepare_decoder_input_ids_for_generation({
                  batch_size: i[l].dims.at(0),
                  model_input_name: l,
                  model_kwargs: i,
                  decoder_start_token_id: t.decoder_start_token_id,
                  bos_token_id: t.bos_token_id,
                  generation_config: t,
                }))
            : (u = i[l]));
        let d = u.dims.at(-1);
        null !== t.max_new_tokens && (t.max_length = d + t.max_new_tokens);
        const p = this._get_logits_processor(t, d, n),
          h = this._get_stopping_criteria(t, r),
          f = i[l].dims.at(0),
          _ = Ep.getSampler(t),
          m = new Array(f).fill(0),
          g = u.tolist();
        let w;
        s && s.put(g);
        let y = {},
          b = {};
        for (;;) {
          if (
            ((i = this.prepare_inputs_for_generation(g, i, t)),
            (w = await this.forward(i)),
            t.return_dict_in_generate)
          )
            if (t.output_attentions) {
              const e = this.getAttentions(w);
              for (const t in e) (t in y || (y[t] = []), y[t].push(e[t]));
            } else
              this._return_dict_in_generate_keys &&
                Object.assign(b, Cr(w, this._return_dict_in_generate_keys));
          const e = p(g, w.logits.slice(null, -1, null).to('float32')),
            n = [];
          for (let t = 0; t < e.dims.at(0); ++t) {
            const r = e[t],
              s = await _(r);
            for (const [e, r] of s) {
              const s = BigInt(e);
              ((m[t] += r), g[t].push(s), n.push([s]));
              break;
            }
          }
          if ((s && s.put(n), h(g).every(e => e))) break;
          i = this._update_model_kwargs_for_generation({
            generated_input_ids: n,
            outputs: w,
            model_inputs: i,
            is_encoder_decoder: c,
          });
        }
        s && s.end();
        const v = this.getPastKeyValues(w, i.past_key_values, !0),
          x = new Ci('int64', g.flat(), [g.length, g[0].length]);
        if (t.return_dict_in_generate)
          return { sequences: x, past_key_values: v, ...y, ...b };
        for (const e of Object.values(w))
          'gpu-buffer' === e.location && e.dispose();
        return x;
      }
      getPastKeyValues(e, t, n = !1) {
        const r = Object.create(null);
        for (const s in e)
          if (s.startsWith('present')) {
            const a = s
                .replace('present_ssm', 'past_ssm')
                .replace('present_conv', 'past_conv')
                .replace('present_recurrent', 'past_recurrent')
                .replace('present', 'past_key_values'),
              o = s.includes('encoder');
            if (((r[a] = o && t ? t[a] : e[s]), t && (!o || n))) {
              const e = t[a];
              'gpu-buffer' === e.location && e.dispose();
            }
          }
        return r;
      }
      getAttentions(e) {
        const t = {};
        for (const n of [
          'cross_attentions',
          'encoder_attentions',
          'decoder_attentions',
        ])
          for (const r in e)
            r.startsWith(n) && (n in t || (t[n] = []), t[n].push(e[r]));
        return t;
      }
      addPastKeyValues(e, t) {
        if (t) Object.assign(e, t);
        else {
          const t = this.sessions.decoder_model_merged ?? this.sessions.model,
            n = (e[this.main_input_name] ?? e.attention_mask)?.dims?.[0] ?? 1,
            r = t?.config?.kv_cache_dtype ?? 'float32',
            s = 'float16' === r ? Ti.float16 : Ti.float32,
            a = qd(this.config, { batch_size: n });
          for (const t in a) {
            const n = a[t].reduce((e, t) => e * t, 1);
            e[t] = new Ci(r, new s(n), a[t]);
          }
        }
      }
      async encode_image({ pixel_values: e }) {
        return (await Kd(this.sessions.vision_encoder, { pixel_values: e }))
          .image_features;
      }
      async encode_text({ input_ids: e }) {
        return (await Kd(this.sessions.embed_tokens, { input_ids: e }))
          .inputs_embeds;
      }
      async encode_audio({ audio_values: e }) {
        return (await Kd(this.sessions.audio_encoder, { audio_values: e }))
          .audio_features;
      }
    };
  async function Jp(e, t) {
    let { encoder_outputs: n, input_ids: r, decoder_input_ids: s, ...a } = t;
    if (!n) {
      const r = Cr(t, e.sessions.model.inputNames);
      n = (await Kp(e, r)).last_hidden_state;
    }
    return (
      (a.input_ids = s),
      (a.encoder_hidden_states = n),
      e.sessions.decoder_model_merged.inputNames.includes(
        'encoder_attention_mask'
      ) && (a.encoder_attention_mask = t.attention_mask),
      await Zp(e, a, !0)
    );
  }
  async function Kp(e, t) {
    const n = e.sessions.model,
      r = Cr(t, n.inputNames);
    if (n.inputNames.includes('inputs_embeds') && !r.inputs_embeds) {
      if (!t.input_ids)
        throw new Error(
          'Both `input_ids` and `inputs_embeds` are missing in the model inputs.'
        );
      r.inputs_embeds = await e.encode_text({ input_ids: t.input_ids });
    }
    if (n.inputNames.includes('token_type_ids') && !r.token_type_ids) {
      if (!r.input_ids)
        throw new Error(
          'Both `input_ids` and `token_type_ids` are missing in the model inputs.'
        );
      r.token_type_ids = Qi(r.input_ids);
    }
    if (n.inputNames.includes('pixel_mask') && !r.pixel_mask) {
      if (!r.pixel_values)
        throw new Error(
          'Both `pixel_values` and `pixel_mask` are missing in the model inputs.'
        );
      const e = r.pixel_values.dims;
      r.pixel_mask = Wi([e[0], e[2], e[3]]);
    }
    return await Kd(n, r);
  }
  async function Zp(e, t, n = !1) {
    const r = e.sessions[n ? 'decoder_model_merged' : 'model'],
      { past_key_values: s, ...a } = t;
    if (
      (r.inputNames.includes('use_cache_branch') &&
        (a.use_cache_branch = Ip(!!s)),
      r.inputNames.includes('position_ids') &&
        a.attention_mask &&
        !a.position_ids)
    ) {
      const t = ['paligemma', 'gemma3_text', 'gemma3'].includes(
        e.config.model_type
      )
        ? 1
        : 0;
      a.position_ids = (function (e, t = null, n = 0) {
        const { input_ids: r, inputs_embeds: s, attention_mask: a } = e,
          { data: o, dims: i } = th(a, n);
        let l = new Ci('int64', o, i);
        if (t) {
          const e = -(r ?? s).dims.at(1);
          l = l.slice(null, [e, null]);
        }
        return l;
      })(a, s, t);
    }
    e.addPastKeyValues(a, s);
    const o = Cr(a, r.inputNames);
    return await Kd(r, o);
  }
  async function eh(
    e,
    {
      encode_function: t,
      merge_function: n,
      modality_input_name: r,
      modality_output_name: s,
      input_ids: a = null,
      attention_mask: o = null,
      position_ids: i = null,
      inputs_embeds: l = null,
      past_key_values: c = null,
      generation_config: u = null,
      logits_processor: d = null,
      ...p
    }
  ) {
    const h = p[r];
    if (!l)
      if (
        ((l = await e.encode_text({ input_ids: a, ...p })),
        h && 1 !== a.dims[1])
      ) {
        const e = await t({ [r]: h, ...p });
        ({ inputs_embeds: l, attention_mask: o } = n({
          [s]: e,
          inputs_embeds: l,
          input_ids: a,
          attention_mask: o,
        }));
      } else if (c && h && 1 === a.dims[1]) {
        const e = a.dims[1],
          t = Pp(c);
        o = Bi(
          [Wi([a.dims[0], t]), o.slice(null, [o.dims[1] - e, o.dims[1]])],
          1
        );
      }
    if (
      !i &&
      [
        'qwen2_vl',
        'qwen2_5_vl',
        'qwen2_5_vl_text',
        'qwen3_vl',
        'qwen3_vl_text',
        'qwen3_5',
        'qwen3_5_text',
        'qwen3_5_moe',
        'qwen3_5_moe_text',
      ].includes(e.config.model_type)
    ) {
      const { image_grid_thw: t, video_grid_thw: n } = p;
      [i] = e.get_rope_index(a, t, n, o);
    }
    return await Zp(
      e,
      {
        inputs_embeds: l,
        past_key_values: c,
        attention_mask: o,
        position_ids: i,
        generation_config: u,
        logits_processor: d,
      },
      !0
    );
  }
  function th(e, t = 0) {
    const [n, r] = e.dims,
      s = e.data,
      a = new BigInt64Array(s.length);
    for (let e = 0; e < n; ++e) {
      const n = e * r;
      let o = BigInt(t);
      for (let e = 0; e < r; ++e) {
        const t = n + e;
        0n === s[t] ? (a[t] = BigInt(1)) : ((a[t] = o), (o += s[t]));
      }
    }
    return { data: a, dims: e.dims };
  }
  function nh(e, t, n, r) {
    const s = n.past_key_values ? Pp(n.past_key_values) : 0;
    if (!n.attention_mask) {
      let e;
      for (const t of ['input_ids', 'inputs_embeds', 'position_ids'])
        if (n[t]) {
          e = n[t].dims;
          break;
        }
      if (!e)
        throw new Error(
          'attention_mask is not provided, and unable to infer its shape from model inputs.'
        );
      n.attention_mask = Wi([e[0], s + e[1]]);
    }
    if (n.past_key_values) {
      const { input_ids: e, attention_mask: t } = n;
      (t && t.dims[1] > e.dims[1]) ||
        (s < e.dims[1] && (n.input_ids = e.slice(null, [s, null])));
    }
    return n;
  }
  function rh(e, t, n, r) {
    return (
      n.past_key_values && (t = t.map(e => [e.at(-1)])),
      { ...n, decoder_input_ids: Fp(t) }
    );
  }
  function sh(e, ...t) {
    return e.config.is_encoder_decoder ? rh(e, ...t) : nh(e, ...t);
  }
  function ah({
    modality_token_id: e,
    inputs_embeds: t,
    modality_features: n,
    input_ids: r,
    attention_mask: s,
  }) {
    const a = r
        .tolist()
        .map(t => t.reduce((t, n, r) => (n == e && t.push(r), t), [])),
      o = a.reduce((e, t) => e + t.length, 0),
      i = n.dims[0];
    if (o !== i)
      throw new Error(
        `Number of tokens and features do not match: tokens: ${o}, features ${i}`
      );
    let l = 0;
    for (let e = 0; e < a.length; ++e) {
      const r = a[e],
        s = t[e];
      for (let e = 0; e < r.length; ++e) s[r[e]].data.set(n[l++].data);
    }
    return { inputs_embeds: t, attention_mask: s };
  }
  function oh({
    image_token_id: e,
    inputs_embeds: t,
    image_features: n,
    input_ids: r,
    attention_mask: s,
  }) {
    return ah({
      modality_token_id: e,
      inputs_embeds: t,
      modality_features: n,
      input_ids: r,
      attention_mask: s,
    });
  }
  function ih({
    audio_token_id: e,
    inputs_embeds: t,
    audio_features: n,
    input_ids: r,
    attention_mask: s,
  }) {
    return ah({
      modality_token_id: e,
      inputs_embeds: t,
      modality_features: n,
      input_ids: r,
      attention_mask: s,
    });
  }
  async function lh(e, t, n) {
    return Object.fromEntries(
      await Promise.all(
        Object.keys(t).map(async r => [r, await Ro(e, t[r], !1, n)])
      )
    );
  }
  var ch = {};
  Wn(ch, {
    ASTForAudioClassification: () => Ah,
    ASTModel: () => Eh,
    ASTPreTrainedModel: () => kh,
    AfmoeForCausalLM: () => bh,
    AfmoeModel: () => yh,
    AfmoePreTrainedModel: () => wh,
    AlbertForMaskedLM: () => fh,
    AlbertForQuestionAnswering: () => hh,
    AlbertForSequenceClassification: () => ph,
    AlbertModel: () => dh,
    AlbertPreTrainedModel: () => uh,
    ApertusForCausalLM: () => gh,
    ApertusModel: () => mh,
    ApertusPreTrainedModel: () => _h,
    ArceeForCausalLM: () => Mh,
    ArceeModel: () => xh,
    ArceePreTrainedModel: () => vh,
    BartForConditionalGeneration: () => Sh,
    BartForSequenceClassification: () => Ph,
    BartModel: () => Ch,
    BartPretrainedModel: () => Th,
    BeitForImageClassification: () => Oh,
    BeitModel: () => Ih,
    BeitPreTrainedModel: () => Fh,
    BertForMaskedLM: () => Nh,
    BertForQuestionAnswering: () => Dh,
    BertForSequenceClassification: () => Bh,
    BertForTokenClassification: () => $h,
    BertModel: () => zh,
    BertPreTrainedModel: () => Lh,
    BlenderbotForConditionalGeneration: () => Gh,
    BlenderbotModel: () => Uh,
    BlenderbotPreTrainedModel: () => Rh,
    BlenderbotSmallForConditionalGeneration: () => Wh,
    BlenderbotSmallModel: () => jh,
    BlenderbotSmallPreTrainedModel: () => Vh,
    BloomForCausalLM: () => Qh,
    BloomModel: () => Hh,
    BloomPreTrainedModel: () => qh,
    CLIPModel: () => df,
    CLIPPreTrainedModel: () => uf,
    CLIPSegForImageSegmentation: () => wf,
    CLIPSegModel: () => gf,
    CLIPSegPreTrainedModel: () => mf,
    CLIPTextModel: () => pf,
    CLIPTextModelWithProjection: () => hf,
    CLIPVisionModel: () => ff,
    CLIPVisionModelWithProjection: () => _f,
    CamembertForMaskedLM: () => Jh,
    CamembertForQuestionAnswering: () => ef,
    CamembertForSequenceClassification: () => Kh,
    CamembertForTokenClassification: () => Zh,
    CamembertModel: () => Yh,
    CamembertPreTrainedModel: () => Xh,
    ChatterboxModel: () => nf,
    ChatterboxPreTrainedModel: () => tf,
    ChineseCLIPModel: () => sf,
    ChineseCLIPPreTrainedModel: () => rf,
    ClapAudioModelWithProjection: () => cf,
    ClapModel: () => of,
    ClapPreTrainedModel: () => af,
    ClapTextModelWithProjection: () => lf,
    CodeGenForCausalLM: () => vf,
    CodeGenModel: () => bf,
    CodeGenPreTrainedModel: () => yf,
    Cohere2ForCausalLM: () => Tf,
    Cohere2Model: () => Af,
    Cohere2PreTrainedModel: () => Ef,
    CohereForCausalLM: () => kf,
    CohereModel: () => Mf,
    CoherePreTrainedModel: () => xf,
    ConvBertForMaskedLM: () => Pf,
    ConvBertForQuestionAnswering: () => Of,
    ConvBertForSequenceClassification: () => Ff,
    ConvBertForTokenClassification: () => If,
    ConvBertModel: () => Sf,
    ConvBertPreTrainedModel: () => Cf,
    ConvNextForImageClassification: () => Nf,
    ConvNextModel: () => zf,
    ConvNextPreTrainedModel: () => Lf,
    ConvNextV2ForImageClassification: () => Df,
    ConvNextV2Model: () => $f,
    ConvNextV2PreTrainedModel: () => Bf,
    DFineForObjectDetection: () => qf,
    DFineModel: () => Wf,
    DFinePreTrainedModel: () => jf,
    DINOv3ConvNextModel: () => O_,
    DINOv3ConvNextPreTrainedModel: () => I_,
    DINOv3ViTModel: () => z_,
    DINOv3ViTPreTrainedModel: () => L_,
    DPTForDepthEstimation: () => q_,
    DPTModel: () => W_,
    DPTPreTrainedModel: () => j_,
    DacDecoderModel: () => Kf,
    DacDecoderOutput: () => Qf,
    DacEncoderModel: () => Jf,
    DacEncoderOutput: () => Hf,
    DacModel: () => Yf,
    DacPreTrainedModel: () => Xf,
    DebertaForMaskedLM: () => t_,
    DebertaForQuestionAnswering: () => s_,
    DebertaForSequenceClassification: () => n_,
    DebertaForTokenClassification: () => r_,
    DebertaModel: () => e_,
    DebertaPreTrainedModel: () => Zf,
    DebertaV2ForMaskedLM: () => i_,
    DebertaV2ForQuestionAnswering: () => u_,
    DebertaV2ForSequenceClassification: () => l_,
    DebertaV2ForTokenClassification: () => c_,
    DebertaV2Model: () => o_,
    DebertaV2PreTrainedModel: () => a_,
    DecisionTransformerModel: () => p_,
    DecisionTransformerPreTrainedModel: () => d_,
    DeiTForImageClassification: () => __,
    DeiTModel: () => f_,
    DeiTPreTrainedModel: () => h_,
    DepthAnythingForDepthEstimation: () => g_,
    DepthAnythingPreTrainedModel: () => m_,
    DepthProForDepthEstimation: () => y_,
    DepthProPreTrainedModel: () => w_,
    DetrForObjectDetection: () => x_,
    DetrForSegmentation: () => M_,
    DetrModel: () => v_,
    DetrObjectDetectionOutput: () => k_,
    DetrPreTrainedModel: () => b_,
    DetrSegmentationOutput: () => E_,
    Dinov2ForImageClassification: () => C_,
    Dinov2Model: () => T_,
    Dinov2PreTrainedModel: () => A_,
    Dinov2WithRegistersForImageClassification: () => F_,
    Dinov2WithRegistersModel: () => P_,
    Dinov2WithRegistersPreTrainedModel: () => S_,
    DistilBertForMaskedLM: () => U_,
    DistilBertForQuestionAnswering: () => R_,
    DistilBertForSequenceClassification: () => $_,
    DistilBertForTokenClassification: () => D_,
    DistilBertModel: () => B_,
    DistilBertPreTrainedModel: () => N_,
    DonutSwinModel: () => V_,
    DonutSwinPreTrainedModel: () => G_,
    EdgeTamModel: () => Hv,
    EfficientNetForImageClassification: () => X_,
    EfficientNetModel: () => Q_,
    EfficientNetPreTrainedModel: () => H_,
    ElectraForMaskedLM: () => K_,
    ElectraForQuestionAnswering: () => tm,
    ElectraForSequenceClassification: () => Z_,
    ElectraForTokenClassification: () => em,
    ElectraModel: () => J_,
    ElectraPreTrainedModel: () => Y_,
    Ernie4_5ForCausalLM: () => sm,
    Ernie4_5Model: () => rm,
    Ernie4_5PretrainedModel: () => nm,
    EsmForMaskedLM: () => im,
    EsmForSequenceClassification: () => lm,
    EsmForTokenClassification: () => cm,
    EsmModel: () => om,
    EsmPreTrainedModel: () => am,
    ExaoneForCausalLM: () => pm,
    ExaoneModel: () => dm,
    ExaonePreTrainedModel: () => um,
    FalconForCausalLM: () => _m,
    FalconH1ForCausalLM: () => wm,
    FalconH1Model: () => gm,
    FalconH1PreTrainedModel: () => mm,
    FalconModel: () => fm,
    FalconPreTrainedModel: () => hm,
    FastViTForImageClassification: () => vm,
    FastViTModel: () => bm,
    FastViTPreTrainedModel: () => ym,
    Florence2ForConditionalGeneration: () => Mm,
    Florence2PreTrainedModel: () => xm,
    GLPNForDepthEstimation: () => Rm,
    GLPNModel: () => Dm,
    GLPNPreTrainedModel: () => $m,
    GPT2LMHeadModel: () => tg,
    GPT2Model: () => eg,
    GPT2PreTrainedModel: () => Zm,
    GPTBigCodeForCausalLM: () => Vm,
    GPTBigCodeModel: () => Gm,
    GPTBigCodePreTrainedModel: () => Um,
    GPTJForCausalLM: () => sg,
    GPTJModel: () => rg,
    GPTJPreTrainedModel: () => ng,
    GPTNeoForCausalLM: () => qm,
    GPTNeoModel: () => Wm,
    GPTNeoPreTrainedModel: () => jm,
    GPTNeoXForCausalLM: () => Xm,
    GPTNeoXModel: () => Qm,
    GPTNeoXPreTrainedModel: () => Hm,
    Gemma2ForCausalLM: () => Sm,
    Gemma2Model: () => Cm,
    Gemma2PreTrainedModel: () => Tm,
    Gemma3ForCausalLM: () => Im,
    Gemma3Model: () => Fm,
    Gemma3PreTrainedModel: () => Pm,
    Gemma3nForConditionalGeneration: () => Lm,
    Gemma3nPreTrainedModel: () => Om,
    GemmaForCausalLM: () => Am,
    GemmaModel: () => Em,
    GemmaPreTrainedModel: () => km,
    GlmForCausalLM: () => Bm,
    GlmModel: () => Nm,
    GlmPreTrainedModel: () => zm,
    GptOssForCausalLM: () => Km,
    GptOssModel: () => Jm,
    GptOssPreTrainedModel: () => Ym,
    GraniteForCausalLM: () => ig,
    GraniteModel: () => og,
    GraniteMoeHybridForCausalLM: () => ug,
    GraniteMoeHybridModel: () => cg,
    GraniteMoeHybridPreTrainedModel: () => lg,
    GranitePreTrainedModel: () => ag,
    GroundingDinoForObjectDetection: () => pg,
    GroundingDinoPreTrainedModel: () => dg,
    GroupViTModel: () => fg,
    GroupViTPreTrainedModel: () => hg,
    HeliumForCausalLM: () => gg,
    HeliumModel: () => mg,
    HeliumPreTrainedModel: () => _g,
    HieraForImageClassification: () => bg,
    HieraModel: () => yg,
    HieraPreTrainedModel: () => wg,
    HubertForCTC: () => Cg,
    HubertForSequenceClassification: () => Sg,
    HubertModel: () => Tg,
    HubertPreTrainedModel: () => Ag,
    HunYuanDenseV1ForCausalLM: () => Ig,
    HunYuanDenseV1Model: () => Fg,
    HunYuanDenseV1PreTrainedModel: () => Pg,
    IJepaForImageClassification: () => $g,
    IJepaModel: () => Bg,
    IJepaPreTrainedModel: () => Ng,
    Idefics3ForConditionalGeneration: () => Lg,
    Idefics3PreTrainedModel: () => Og,
    JAISLMHeadModel: () => Ug,
    JAISModel: () => Rg,
    JAISPreTrainedModel: () => Dg,
    JinaCLIPModel: () => Vg,
    JinaCLIPPreTrainedModel: () => Gg,
    JinaCLIPTextModel: () => jg,
    JinaCLIPVisionModel: () => Wg,
    Lfm2ForCausalLM: () => Qg,
    Lfm2Model: () => Hg,
    Lfm2MoeForCausalLM: () => Jg,
    Lfm2MoeModel: () => Yg,
    Lfm2MoePreTrainedModel: () => Xg,
    Lfm2PreTrainedModel: () => qg,
    LiteWhisperForConditionalGeneration: () => jM,
    Llama4ForCausalLM: () => nw,
    Llama4PreTrainedModel: () => tw,
    LlamaForCausalLM: () => ew,
    LlamaModel: () => Zg,
    LlamaPreTrainedModel: () => Kg,
    LlavaForConditionalGeneration: () => sw,
    LlavaOnevisionForConditionalGeneration: () => sw,
    LlavaPreTrainedModel: () => rw,
    LlavaQwen2ForCausalLM: () => ow,
    LongT5ForConditionalGeneration: () => cw,
    LongT5Model: () => lw,
    LongT5PreTrainedModel: () => iw,
    M2M100ForConditionalGeneration: () => pw,
    M2M100Model: () => dw,
    M2M100PreTrainedModel: () => uw,
    MBartForCausalLM: () => Mw,
    MBartForConditionalGeneration: () => vw,
    MBartForSequenceClassification: () => xw,
    MBartModel: () => bw,
    MBartPreTrainedModel: () => yw,
    MPNetForMaskedLM: () => Sy,
    MPNetForQuestionAnswering: () => Iy,
    MPNetForSequenceClassification: () => Py,
    MPNetForTokenClassification: () => Fy,
    MPNetModel: () => Cy,
    MPNetPreTrainedModel: () => Ty,
    MT5ForConditionalGeneration: () => $y,
    MT5Model: () => By,
    MT5PreTrainedModel: () => Ny,
    MarianMTModel: () => _w,
    MarianModel: () => fw,
    MarianPreTrainedModel: () => hw,
    MaskFormerForInstanceSegmentation: () => ww,
    MaskFormerModel: () => gw,
    MaskFormerPreTrainedModel: () => mw,
    Metric3DForDepthEstimation: () => Ew,
    Metric3DPreTrainedModel: () => kw,
    Metric3Dv2ForDepthEstimation: () => Tw,
    Metric3Dv2PreTrainedModel: () => Aw,
    MgpstrForSceneTextRecognition: () => Pw,
    MgpstrModelOutput: () => Cw,
    MgpstrPreTrainedModel: () => Sw,
    MimiDecoderModel: () => Nw,
    MimiDecoderOutput: () => Iw,
    MimiEncoderModel: () => zw,
    MimiEncoderOutput: () => Fw,
    MimiModel: () => Lw,
    MimiPreTrainedModel: () => Ow,
    MistralForCausalLM: () => Dw,
    MistralModel: () => $w,
    MistralPreTrainedModel: () => Bw,
    MobileBertForMaskedLM: () => Gw,
    MobileBertForQuestionAnswering: () => jw,
    MobileBertForSequenceClassification: () => Vw,
    MobileBertModel: () => Uw,
    MobileBertPreTrainedModel: () => Rw,
    MobileLLMForCausalLM: () => Hw,
    MobileLLMModel: () => qw,
    MobileLLMPreTrainedModel: () => Ww,
    MobileNetV1ForImageClassification: () => Yw,
    MobileNetV1ForSemanticSegmentation: () => Jw,
    MobileNetV1Model: () => Xw,
    MobileNetV1PreTrainedModel: () => Qw,
    MobileNetV2ForImageClassification: () => ey,
    MobileNetV2ForSemanticSegmentation: () => ty,
    MobileNetV2Model: () => Zw,
    MobileNetV2PreTrainedModel: () => Kw,
    MobileNetV3ForImageClassification: () => sy,
    MobileNetV3ForSemanticSegmentation: () => ay,
    MobileNetV3Model: () => ry,
    MobileNetV3PreTrainedModel: () => ny,
    MobileNetV4ForImageClassification: () => ly,
    MobileNetV4ForSemanticSegmentation: () => cy,
    MobileNetV4Model: () => iy,
    MobileNetV4PreTrainedModel: () => oy,
    MobileViTForImageClassification: () => py,
    MobileViTModel: () => dy,
    MobileViTPreTrainedModel: () => uy,
    MobileViTV2ForImageClassification: () => _y,
    MobileViTV2Model: () => fy,
    MobileViTV2PreTrainedModel: () => hy,
    ModernBertDecoderForCausalLM: () => My,
    ModernBertDecoderModel: () => xy,
    ModernBertDecoderPreTrainedModel: () => vy,
    ModernBertForMaskedLM: () => wy,
    ModernBertForSequenceClassification: () => yy,
    ModernBertForTokenClassification: () => by,
    ModernBertModel: () => gy,
    ModernBertPreTrainedModel: () => my,
    Moondream1ForConditionalGeneration: () => aw,
    MoonshineForConditionalGeneration: () => Ay,
    MoonshineModel: () => Ey,
    MoonshinePreTrainedModel: () => ky,
    MptForCausalLM: () => zy,
    MptModel: () => Ly,
    MptPreTrainedModel: () => Oy,
    MultiModalityCausalLM: () => Ry,
    MultiModalityPreTrainedModel: () => Dy,
    MusicgenForCausalLM: () => Vy,
    MusicgenForConditionalGeneration: () => jy,
    MusicgenModel: () => Gy,
    MusicgenPreTrainedModel: () => Uy,
    NanoChatForCausalLM: () => Hy,
    NanoChatModel: () => qy,
    NanoChatPreTrainedModel: () => Wy,
    NeoBertForMaskedLM: () => Yy,
    NeoBertForQuestionAnswering: () => Zy,
    NeoBertForSequenceClassification: () => Jy,
    NeoBertForTokenClassification: () => Ky,
    NeoBertModel: () => Xy,
    NeoBertPreTrainedModel: () => Qy,
    NomicBertModel: () => tb,
    NomicBertPreTrainedModel: () => eb,
    OPTForCausalLM: () => yb,
    OPTModel: () => wb,
    OPTPreTrainedModel: () => gb,
    Olmo2ForCausalLM: () => ib,
    Olmo2Model: () => ob,
    Olmo2PreTrainedModel: () => ab,
    Olmo3ForCausalLM: () => ub,
    Olmo3Model: () => cb,
    Olmo3PreTrainedModel: () => lb,
    OlmoForCausalLM: () => sb,
    OlmoHybridForCausalLM: () => hb,
    OlmoHybridModel: () => pb,
    OlmoHybridPreTrainedModel: () => db,
    OlmoModel: () => rb,
    OlmoPreTrainedModel: () => nb,
    OpenELMForCausalLM: () => mb,
    OpenELMModel: () => _b,
    OpenELMPreTrainedModel: () => fb,
    OwlViTForObjectDetection: () => Eb,
    OwlViTModel: () => kb,
    OwlViTPreTrainedModel: () => Mb,
    Owlv2ForObjectDetection: () => xb,
    Owlv2Model: () => vb,
    Owlv2PreTrainedModel: () => bb,
    PaliGemmaForConditionalGeneration: () => Tb,
    PaliGemmaPreTrainedModel: () => Ab,
    ParakeetForCTC: () => Sb,
    ParakeetPreTrainedModel: () => Cb,
    PatchTSMixerForPrediction: () => Ib,
    PatchTSMixerModel: () => Fb,
    PatchTSMixerPreTrainedModel: () => Pb,
    PatchTSTForPrediction: () => zb,
    PatchTSTModel: () => Lb,
    PatchTSTPreTrainedModel: () => Ob,
    Phi3ForCausalLM: () => Ub,
    Phi3Model: () => Rb,
    Phi3PreTrainedModel: () => Db,
    Phi3VForCausalLM: () => Vb,
    Phi3VPreTrainedModel: () => Gb,
    PhiForCausalLM: () => $b,
    PhiModel: () => Bb,
    PhiPreTrainedModel: () => Nb,
    PreTrainedModel: () => Yp,
    PvtForImageClassification: () => qb,
    PvtModel: () => Wb,
    PvtPreTrainedModel: () => jb,
    PyAnnoteForAudioFrameClassification: () => Xb,
    PyAnnoteModel: () => Qb,
    PyAnnotePreTrainedModel: () => Hb,
    Qwen2ForCausalLM: () => Kb,
    Qwen2Model: () => Jb,
    Qwen2MoeForCausalLM: () => tv,
    Qwen2MoeModel: () => ev,
    Qwen2MoePreTrainedModel: () => Zb,
    Qwen2PreTrainedModel: () => Yb,
    Qwen2VLForConditionalGeneration: () => rv,
    Qwen2VLPreTrainedModel: () => nv,
    Qwen2_5_VLForConditionalGeneration: () => sv,
    Qwen3ForCausalLM: () => iv,
    Qwen3Model: () => ov,
    Qwen3MoeForCausalLM: () => uv,
    Qwen3MoeModel: () => cv,
    Qwen3MoePreTrainedModel: () => lv,
    Qwen3NextForCausalLM: () => hv,
    Qwen3NextModel: () => pv,
    Qwen3NextPreTrainedModel: () => dv,
    Qwen3PreTrainedModel: () => av,
    Qwen3VLForConditionalGeneration: () => fv,
    Qwen3VLMoeForConditionalGeneration: () => _v,
    Qwen3_5ForConditionalGeneration: () => mv,
    Qwen3_5MoeForConditionalGeneration: () => gv,
    RFDetrForObjectDetection: () => Mv,
    RFDetrModel: () => xv,
    RFDetrObjectDetectionOutput: () => kv,
    RFDetrPreTrainedModel: () => vv,
    RTDetrForObjectDetection: () => Gf,
    RTDetrModel: () => Uf,
    RTDetrObjectDetectionOutput: () => Vf,
    RTDetrPreTrainedModel: () => Rf,
    RTDetrV2ForObjectDetection: () => Dv,
    RTDetrV2Model: () => $v,
    RTDetrV2ObjectDetectionOutput: () => Rv,
    RTDetrV2PreTrainedModel: () => Bv,
    ResNetForImageClassification: () => bv,
    ResNetModel: () => yv,
    ResNetPreTrainedModel: () => wv,
    RoFormerForMaskedLM: () => Ov,
    RoFormerForQuestionAnswering: () => Nv,
    RoFormerForSequenceClassification: () => Lv,
    RoFormerForTokenClassification: () => zv,
    RoFormerModel: () => Iv,
    RoFormerPreTrainedModel: () => Fv,
    RobertaForMaskedLM: () => Tv,
    RobertaForQuestionAnswering: () => Pv,
    RobertaForSequenceClassification: () => Cv,
    RobertaForTokenClassification: () => Sv,
    RobertaModel: () => Av,
    RobertaPreTrainedModel: () => Ev,
    Sam2ImageSegmentationOutput: () => jv,
    Sam2Model: () => qv,
    Sam2PreTrainedModel: () => Wv,
    Sam3TrackerModel: () => Qv,
    SamImageSegmentationOutput: () => Uv,
    SamModel: () => Vv,
    SamPreTrainedModel: () => Gv,
    SapiensForDepthEstimation: () => Jv,
    SapiensForNormalEstimation: () => Kv,
    SapiensForSemanticSegmentation: () => Yv,
    SapiensPreTrainedModel: () => Xv,
    SegformerForImageClassification: () => tx,
    SegformerForSemanticSegmentation: () => nx,
    SegformerModel: () => ex,
    SegformerPreTrainedModel: () => Zv,
    SiglipModel: () => sx,
    SiglipPreTrainedModel: () => rx,
    SiglipTextModel: () => ax,
    SiglipVisionModel: () => ox,
    SmolLM3ForCausalLM: () => cx,
    SmolLM3Model: () => lx,
    SmolLM3PreTrainedModel: () => ix,
    SmolVLMForConditionalGeneration: () => zg,
    SnacDecoderModel: () => hx,
    SnacEncoderModel: () => px,
    SnacModel: () => dx,
    SnacPreTrainedModel: () => ux,
    SpeechT5ForSpeechToText: () => mx,
    SpeechT5ForTextToSpeech: () => gx,
    SpeechT5HifiGan: () => wx,
    SpeechT5Model: () => _x,
    SpeechT5PreTrainedModel: () => fx,
    SqueezeBertForMaskedLM: () => vx,
    SqueezeBertForQuestionAnswering: () => Mx,
    SqueezeBertForSequenceClassification: () => xx,
    SqueezeBertModel: () => bx,
    SqueezeBertPreTrainedModel: () => yx,
    StableLmForCausalLM: () => Ax,
    StableLmModel: () => Ex,
    StableLmPreTrainedModel: () => kx,
    Starcoder2ForCausalLM: () => Sx,
    Starcoder2Model: () => Cx,
    Starcoder2PreTrainedModel: () => Tx,
    StyleTextToSpeech2Model: () => Fx,
    StyleTextToSpeech2PreTrainedModel: () => Px,
    SupertonicForConditionalGeneration: () => Ox,
    SupertonicPreTrainedModel: () => Ix,
    Swin2SRForImageSuperResolution: () => Rx,
    Swin2SRModel: () => Dx,
    Swin2SRPreTrainedModel: () => $x,
    SwinForImageClassification: () => Nx,
    SwinForSemanticSegmentation: () => Bx,
    SwinModel: () => zx,
    SwinPreTrainedModel: () => Lx,
    T5ForConditionalGeneration: () => Vx,
    T5Model: () => Gx,
    T5PreTrainedModel: () => Ux,
    TableTransformerForObjectDetection: () => qx,
    TableTransformerModel: () => Wx,
    TableTransformerObjectDetectionOutput: () => Hx,
    TableTransformerPreTrainedModel: () => jx,
    TrOCRForCausalLM: () => Xx,
    TrOCRPreTrainedModel: () => Qx,
    UltravoxModel: () => Jx,
    UltravoxPreTrainedModel: () => Yx,
    UniSpeechForCTC: () => tM,
    UniSpeechForSequenceClassification: () => nM,
    UniSpeechModel: () => eM,
    UniSpeechPreTrainedModel: () => Zx,
    UniSpeechSatForAudioFrameClassification: () => iM,
    UniSpeechSatForCTC: () => aM,
    UniSpeechSatForSequenceClassification: () => oM,
    UniSpeechSatModel: () => sM,
    UniSpeechSatPreTrainedModel: () => rM,
    VaultGemmaForCausalLM: () => uM,
    VaultGemmaModel: () => cM,
    VaultGemmaPreTrainedModel: () => lM,
    ViTForImageClassification: () => fM,
    ViTMAEModel: () => mM,
    ViTMAEPreTrainedModel: () => _M,
    ViTMSNForImageClassification: () => yM,
    ViTMSNModel: () => wM,
    ViTMSNPreTrainedModel: () => gM,
    ViTModel: () => hM,
    ViTPreTrainedModel: () => pM,
    VisionEncoderDecoderModel: () => dM,
    VitMatteForImageMatting: () => vM,
    VitMattePreTrainedModel: () => bM,
    VitPoseForPoseEstimation: () => MM,
    VitPosePreTrainedModel: () => xM,
    VitsModel: () => AM,
    VitsModelOutput: () => kM,
    VitsPreTrainedModel: () => EM,
    VoxtralForConditionalGeneration: () => Kx,
    Wav2Vec2BertForCTC: () => SM,
    Wav2Vec2BertForSequenceClassification: () => PM,
    Wav2Vec2BertModel: () => CM,
    Wav2Vec2BertPreTrainedModel: () => TM,
    Wav2Vec2ForAudioFrameClassification: () => Eg,
    Wav2Vec2ForCTC: () => Mg,
    Wav2Vec2ForSequenceClassification: () => kg,
    Wav2Vec2Model: () => xg,
    Wav2Vec2PreTrainedModel: () => vg,
    WavLMForAudioFrameClassification: () => BM,
    WavLMForCTC: () => LM,
    WavLMForSequenceClassification: () => zM,
    WavLMForXVector: () => NM,
    WavLMModel: () => OM,
    WavLMPreTrainedModel: () => IM,
    WeSpeakerResNetModel: () => DM,
    WeSpeakerResNetPreTrainedModel: () => $M,
    WhisperForConditionalGeneration: () => VM,
    WhisperModel: () => GM,
    WhisperPreTrainedModel: () => UM,
    XLMForQuestionAnswering: () => YM,
    XLMForSequenceClassification: () => QM,
    XLMForTokenClassification: () => XM,
    XLMModel: () => qM,
    XLMPreTrainedModel: () => WM,
    XLMRobertaForMaskedLM: () => ZM,
    XLMRobertaForQuestionAnswering: () => nk,
    XLMRobertaForSequenceClassification: () => ek,
    XLMRobertaForTokenClassification: () => tk,
    XLMRobertaModel: () => KM,
    XLMRobertaPreTrainedModel: () => JM,
    XLMWithLMHeadModel: () => HM,
    XVectorOutput: () => FM,
    YolosForObjectDetection: () => ak,
    YolosModel: () => sk,
    YolosObjectDetectionOutput: () => ok,
    YolosPreTrainedModel: () => rk,
    YoutuForCausalLM: () => ck,
    YoutuModel: () => lk,
    YoutuPreTrainedModel: () => ik,
  });
  var uh = class extends Yp {},
    dh = class extends uh {},
    ph = class extends uh {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    hh = class extends uh {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    fh = class extends uh {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    _h = class extends Yp {},
    mh = class extends _h {},
    gh = class extends _h {},
    wh = class extends Yp {},
    yh = class extends wh {},
    bh = class extends wh {},
    vh = class extends Yp {},
    xh = class extends vh {},
    Mh = class extends vh {},
    kh = class extends Yp {},
    Eh = class extends kh {},
    Ah = class extends kh {},
    Th = class extends Yp {},
    Ch = class extends Th {},
    Sh = class extends Th {},
    Ph = class extends Th {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Fh = class extends Yp {},
    Ih = class extends Fh {},
    Oh = class extends Fh {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Lh = class extends Yp {},
    zh = class extends Lh {},
    Nh = class extends Lh {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Bh = class extends Lh {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    $h = class extends Lh {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    Dh = class extends Lh {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    Rh = class extends Yp {},
    Uh = class extends Rh {},
    Gh = class extends Rh {},
    Vh = class extends Yp {},
    jh = class extends Vh {},
    Wh = class extends Vh {},
    qh = class extends Yp {},
    Hh = class extends qh {},
    Qh = class extends qh {},
    Xh = class extends Yp {},
    Yh = class extends Xh {},
    Jh = class extends Xh {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Kh = class extends Xh {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Zh = class extends Xh {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    ef = class extends Xh {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    tf = class extends Yp {
      forward_params = [
        'input_ids',
        'inputs_embeds',
        'attention_mask',
        'position_ids',
        'audio_values',
        'exaggeration',
        'audio_features',
        'audio_tokens',
        'speaker_embeddings',
        'speaker_features',
        'past_key_values',
      ];
      main_input_name = 'input_ids';
      _return_dict_in_generate_keys = [
        'audio_tokens',
        'speaker_embeddings',
        'speaker_features',
      ];
    },
    nf = class extends tf {
      async encode_speech(e) {
        return Kd(this.sessions.speech_encoder, { audio_values: e });
      }
      async forward({
        input_ids: e = null,
        attention_mask: t = null,
        audio_values: n = null,
        exaggeration: r = null,
        position_ids: s = null,
        inputs_embeds: a = null,
        past_key_values: o = null,
        generation_config: i = null,
        logits_processor: l = null,
        audio_features: c = null,
        audio_tokens: u = null,
        speaker_embeddings: d = null,
        speaker_features: p = null,
        ...h
      }) {
        let f;
        if (!a) {
          const i = this.sessions.embed_tokens.inputNames,
            l = { input_ids: e };
          if (i.includes('exaggeration')) {
            if (!(r instanceof Ci)) {
              const t = e.dims[0];
              if (null == r) r = Vi([t], 0.5);
              else if ('number' == typeof r) r = Vi([t], r);
              else {
                if (!Array.isArray(r))
                  throw new Error('Unsupported type for `exaggeration` input');
                r = new Ci('float32', r, [t]);
              }
            }
            l.exaggeration = r;
          }
          if (
            (i.includes('position_ids') && (l.position_ids = s),
            ({ inputs_embeds: a } = await Kd(this.sessions.embed_tokens, l)),
            c &&
              u &&
              d &&
              p &&
              (f = {
                audio_features: c,
                audio_tokens: u,
                speaker_embeddings: d,
                speaker_features: p,
              }),
            f || n)
          )
            ((f ??= await this.encode_speech(n)),
              (t = Wi([
                (a = Bi([f.audio_features, a], 1)).dims[0],
                a.dims[1],
              ])));
          else {
            const e = a.dims[1];
            if (!o || 1 !== e)
              throw new Error('Incorrect state encountered during generation.');
            const n = Object.values(o)[0].dims.at(-2);
            t = Wi([a.dims[0], n + e]);
          }
        }
        return {
          ...(await Zp(
            this,
            {
              inputs_embeds: a,
              past_key_values: o,
              attention_mask: t,
              generation_config: i,
              logits_processor: l,
            },
            !1
          )),
          ...f,
        };
      }
      prepare_inputs_for_generation(e, t, n) {
        if (
          !t.position_ids &&
          this.sessions.embed_tokens.inputNames.includes('position_ids')
        )
          if (1 === t.input_ids.dims[1]) {
            const n = Array.from(
              { length: e.length },
              (t, n) => e[n].length - e[n].findLastIndex(e => 6561n == e) - 1
            );
            t.position_ids = new Ci('int64', n, [e.length, 1]);
          } else {
            const e = t.input_ids.tolist().map(e => {
              let t = 0;
              return e.map(e => (e >= 6561n ? 0 : t++));
            });
            t.position_ids = new Ci('int64', e.flat(), t.input_ids.dims);
          }
        return (
          1 === t.input_ids.dims[1] &&
            (delete t.audio_values,
            delete t.audio_features,
            delete t.audio_tokens,
            delete t.speaker_embeddings,
            delete t.speaker_features),
          nh(0, 0, t)
        );
      }
      async generate(e) {
        const {
            sequences: t,
            audio_tokens: n,
            speaker_embeddings: r,
            speaker_features: s,
          } = await super.generate({ ...e, return_dict_in_generate: !0 }),
          a = t.slice(null, [e.input_ids.dims[1], -1]),
          o = Bi([n, a, Vi([a.dims[0], 3], 4299n)], 1),
          { waveform: i } = await Kd(this.sessions.conditional_decoder, {
            speech_tokens: o,
            speaker_features: s,
            speaker_embeddings: r,
          });
        return i;
      }
    },
    rf = class extends Yp {},
    sf = class extends rf {},
    af = class extends Yp {},
    of = class extends af {},
    lf = class extends af {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'text_model',
        });
      }
    },
    cf = class extends af {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'audio_model',
        });
      }
    },
    uf = class extends Yp {},
    df = class extends uf {},
    pf = class extends uf {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'text_model',
        });
      }
    },
    hf = class extends uf {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'text_model',
        });
      }
    },
    ff = class extends uf {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'vision_model',
        });
      }
    },
    _f = class extends uf {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'vision_model',
        });
      }
    },
    mf = class extends Yp {},
    gf = class extends mf {},
    wf = class extends mf {},
    yf = class extends Yp {},
    bf = class extends yf {},
    vf = class extends yf {},
    xf = class extends Yp {},
    Mf = class extends xf {},
    kf = class extends xf {},
    Ef = class extends Yp {},
    Af = class extends Ef {},
    Tf = class extends Ef {},
    Cf = class extends Yp {},
    Sf = class extends Cf {},
    Pf = class extends Cf {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Ff = class extends Cf {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    If = class extends Cf {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    Of = class extends Cf {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    Lf = class extends Yp {},
    zf = class extends Lf {},
    Nf = class extends Lf {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Bf = class extends Yp {},
    $f = class extends Bf {},
    Df = class extends Bf {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Rf = class extends Yp {},
    Uf = class extends Rf {},
    Gf = class extends Rf {
      async _call(e) {
        return new Vf(await super._call(e));
      }
    },
    Vf = class extends Zd {
      constructor({ logits: e, pred_boxes: t }) {
        (super(), (this.logits = e), (this.pred_boxes = t));
      }
    },
    jf = class extends Yp {},
    Wf = class extends jf {},
    qf = class extends jf {
      async _call(e) {
        return new Vf(await super._call(e));
      }
    },
    Hf = class extends Zd {
      constructor({ audio_codes: e }) {
        (super(), (this.audio_codes = e));
      }
    },
    Qf = class extends Zd {
      constructor({ audio_values: e }) {
        (super(), (this.audio_values = e));
      }
    },
    Xf = class extends Yp {
      main_input_name = 'input_values';
      forward_params = ['input_values'];
    },
    Yf = class extends Xf {
      async encode(e) {
        return new Hf(await Kd(this.sessions.encoder_model, e));
      }
      async decode(e) {
        return new Qf(await Kd(this.sessions.decoder_model, e));
      }
    },
    Jf = class extends Xf {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'encoder_model',
        });
      }
    },
    Kf = class extends Xf {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'decoder_model',
        });
      }
    },
    Zf = class extends Yp {},
    e_ = class extends Zf {},
    t_ = class extends Zf {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    n_ = class extends Zf {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    r_ = class extends Zf {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    s_ = class extends Zf {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    a_ = class extends Yp {},
    o_ = class extends a_ {},
    i_ = class extends a_ {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    l_ = class extends a_ {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    c_ = class extends a_ {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    u_ = class extends a_ {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    d_ = class extends Yp {},
    p_ = class extends d_ {},
    h_ = class extends Yp {},
    f_ = class extends h_ {},
    __ = class extends h_ {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    m_ = class extends Yp {},
    g_ = class extends m_ {},
    w_ = class extends Yp {},
    y_ = class extends w_ {},
    b_ = class extends Yp {},
    v_ = class extends b_ {},
    x_ = class extends b_ {
      async _call(e) {
        return new k_(await super._call(e));
      }
    },
    M_ = class extends b_ {
      async _call(e) {
        return new E_(await super._call(e));
      }
    },
    k_ = class extends Zd {
      constructor({ logits: e, pred_boxes: t }) {
        (super(), (this.logits = e), (this.pred_boxes = t));
      }
    },
    E_ = class extends Zd {
      constructor({ logits: e, pred_boxes: t, pred_masks: n }) {
        (super(),
          (this.logits = e),
          (this.pred_boxes = t),
          (this.pred_masks = n));
      }
    },
    A_ = class extends Yp {},
    T_ = class extends A_ {},
    C_ = class extends A_ {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    S_ = class extends Yp {},
    P_ = class extends S_ {},
    F_ = class extends S_ {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    I_ = class extends Yp {},
    O_ = class extends I_ {},
    L_ = class extends Yp {},
    z_ = class extends L_ {},
    N_ = class extends Yp {},
    B_ = class extends N_ {},
    $_ = class extends N_ {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    D_ = class extends N_ {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    R_ = class extends N_ {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    U_ = class extends N_ {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    G_ = class extends Yp {},
    V_ = class extends G_ {},
    j_ = class extends Yp {},
    W_ = class extends j_ {},
    q_ = class extends j_ {},
    H_ = class extends Yp {},
    Q_ = class extends H_ {},
    X_ = class extends H_ {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Y_ = class extends Yp {},
    J_ = class extends Y_ {},
    K_ = class extends Y_ {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Z_ = class extends Y_ {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    em = class extends Y_ {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    tm = class extends Y_ {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    nm = class extends Yp {},
    rm = class extends nm {},
    sm = class extends nm {},
    am = class extends Yp {},
    om = class extends am {},
    im = class extends am {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    lm = class extends am {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    cm = class extends am {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    um = class extends Yp {},
    dm = class extends um {},
    pm = class extends um {},
    hm = class extends Yp {},
    fm = class extends hm {},
    _m = class extends hm {},
    mm = class extends Yp {},
    gm = class extends mm {},
    wm = class extends mm {},
    ym = class extends Yp {},
    bm = class extends ym {},
    vm = class extends ym {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    xm = class extends Yp {
      forward_params = [
        'input_ids',
        'inputs_embeds',
        'attention_mask',
        'pixel_values',
        'encoder_outputs',
        'decoder_input_ids',
        'decoder_inputs_embeds',
        'decoder_attention_mask',
        'past_key_values',
      ];
      main_input_name = 'inputs_embeds';
    },
    Mm = class extends xm {
      _merge_input_ids_with_image_features({
        inputs_embeds: e,
        image_features: t,
        input_ids: n,
        attention_mask: r,
      }) {
        return {
          inputs_embeds: Bi([t, e], 1),
          attention_mask: Bi([Wi(t.dims.slice(0, 2)), r], 1),
        };
      }
      async _prepare_inputs_embeds({
        input_ids: e,
        pixel_values: t,
        inputs_embeds: n,
        attention_mask: r,
      }) {
        if (!e && !t)
          throw new Error(
            'Either `input_ids` or `pixel_values` should be provided.'
          );
        let s, a;
        return (
          e && (s = await this.encode_text({ input_ids: e })),
          t && (a = await this.encode_image({ pixel_values: t })),
          s && a
            ? ({ inputs_embeds: n, attention_mask: r } =
                this._merge_input_ids_with_image_features({
                  inputs_embeds: s,
                  image_features: a,
                  input_ids: e,
                  attention_mask: r,
                }))
            : (n = s || a),
          { inputs_embeds: n, attention_mask: r }
        );
      }
      async forward({
        input_ids: e,
        pixel_values: t,
        attention_mask: n,
        decoder_input_ids: r,
        decoder_attention_mask: s,
        encoder_outputs: a,
        past_key_values: o,
        inputs_embeds: i,
        decoder_inputs_embeds: l,
      }) {
        if (
          (i ||
            ({ inputs_embeds: i, attention_mask: n } =
              await this._prepare_inputs_embeds({
                input_ids: e,
                pixel_values: t,
                inputs_embeds: i,
                attention_mask: n,
              })),
          !a)
        ) {
          let { last_hidden_state: e } = await Kp(this, {
            inputs_embeds: i,
            attention_mask: n,
          });
          a = e;
        }
        if (!l) {
          if (!r)
            throw new Error(
              'Either `decoder_input_ids` or `decoder_inputs_embeds` should be provided.'
            );
          l = await this.encode_text({ input_ids: r });
        }
        const c = {
          inputs_embeds: l,
          attention_mask: s,
          encoder_attention_mask: n,
          encoder_hidden_states: a,
          past_key_values: o,
        };
        return await Zp(this, c, !0);
      }
    },
    km = class extends Yp {},
    Em = class extends km {},
    Am = class extends km {},
    Tm = class extends Yp {},
    Cm = class extends Tm {},
    Sm = class extends Tm {},
    Pm = class extends Yp {},
    Fm = class extends Pm {},
    Im = class extends Pm {},
    Om = class extends Yp {
      forward_params = [
        'input_ids',
        'attention_mask',
        'inputs_embeds',
        'per_layer_inputs',
        'position_ids',
        'pixel_values',
        'input_features',
        'input_features_mask',
        'past_key_values',
      ];
    },
    Lm = class extends Om {
      async forward({
        input_ids: e = null,
        attention_mask: t = null,
        pixel_values: n = null,
        input_features: r = null,
        input_features_mask: s = null,
        position_ids: a = null,
        inputs_embeds: o = null,
        per_layer_inputs: i = null,
        past_key_values: l = null,
        generation_config: c = null,
        logits_processor: u = null,
        ...d
      }) {
        if (
          !(
            (o && i) ||
            (({ inputs_embeds: o, per_layer_inputs: i } = await Kd(
              this.sessions.embed_tokens,
              { input_ids: e }
            )),
            1 === e.dims[1])
          )
        ) {
          if (n) {
            const { image_features: r } = await Kd(
              this.sessions.vision_encoder,
              { pixel_values: n }
            );
            ({ inputs_embeds: o, attention_mask: t } =
              this._merge_input_ids_with_image_features({
                image_features: r,
                inputs_embeds: o,
                input_ids: e,
                attention_mask: t,
              }));
          }
          if (r) {
            const { audio_features: n } = await Kd(
              this.sessions.audio_encoder,
              { input_features: r, input_features_mask: s }
            );
            ({ inputs_embeds: o, attention_mask: t } =
              this._merge_input_ids_with_audio_features({
                audio_features: n,
                inputs_embeds: o,
                input_ids: e,
                attention_mask: t,
              }));
          }
        }
        return await Zp(
          this,
          {
            inputs_embeds: o,
            per_layer_inputs: i,
            past_key_values: l,
            attention_mask: t,
            position_ids: a,
            generation_config: c,
            logits_processor: u,
          },
          !0
        );
      }
      _merge_input_ids_with_image_features(e) {
        const t = e.image_features.dims.at(-1),
          n = e.image_features.view(-1, t);
        return oh({
          image_token_id: this.config.image_token_id,
          ...e,
          image_features: n,
        });
      }
      _merge_input_ids_with_audio_features(e) {
        const t = e.audio_features.dims.at(-1),
          n = e.audio_features.view(-1, t);
        return ih({
          audio_token_id: this.config.audio_token_id,
          ...e,
          audio_features: n,
        });
      }
    },
    zm = class extends Yp {},
    Nm = class extends zm {},
    Bm = class extends zm {},
    $m = class extends Yp {},
    Dm = class extends $m {},
    Rm = class extends $m {},
    Um = class extends Yp {},
    Gm = class extends Um {},
    Vm = class extends Um {},
    jm = class extends Yp {},
    Wm = class extends jm {},
    qm = class extends jm {},
    Hm = class extends Yp {},
    Qm = class extends Hm {},
    Xm = class extends Hm {},
    Ym = class extends Yp {},
    Jm = class extends Ym {},
    Km = class extends Ym {},
    Zm = class extends Yp {},
    eg = class extends Zm {},
    tg = class extends Zm {},
    ng = class extends Yp {},
    rg = class extends ng {},
    sg = class extends ng {},
    ag = class extends Yp {},
    og = class extends ag {},
    ig = class extends ag {},
    lg = class extends Yp {},
    cg = class extends lg {},
    ug = class extends lg {},
    dg = class extends Yp {},
    pg = class extends dg {},
    hg = class extends Yp {},
    fg = class extends hg {},
    _g = class extends Yp {},
    mg = class extends _g {},
    gg = class extends _g {},
    wg = class extends Yp {},
    yg = class extends wg {},
    bg = class extends wg {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    vg = class extends Yp {},
    xg = class extends vg {},
    Mg = class extends vg {
      async _call(e) {
        return new sp(await super._call(e));
      }
    },
    kg = class extends vg {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Eg = class extends vg {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    Ag = class extends Yp {},
    Tg = class extends vg {},
    Cg = class extends vg {
      async _call(e) {
        return new sp(await super._call(e));
      }
    },
    Sg = class extends vg {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Pg = class extends Yp {},
    Fg = class extends Pg {},
    Ig = class extends Pg {},
    Og = class extends Yp {
      forward_params = [
        'input_ids',
        'attention_mask',
        'pixel_values',
        'pixel_attention_mask',
        'position_ids',
        'past_key_values',
      ];
    },
    Lg = class extends Og {
      async encode_image({ pixel_values: e, pixel_attention_mask: t }) {
        return (
          await Kd(this.sessions.vision_encoder, {
            pixel_values: e,
            pixel_attention_mask: t,
          })
        ).image_features;
      }
      _merge_input_ids_with_image_features(e) {
        const t = e.image_features.dims.at(-1),
          n = e.image_features.view(-1, t);
        return oh({
          image_token_id: this.config.image_token_id,
          ...e,
          image_features: n,
        });
      }
    },
    zg = class extends Lg {},
    Ng = class extends Yp {},
    Bg = class extends Ng {},
    $g = class extends Ng {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Dg = class extends Yp {},
    Rg = class extends Dg {},
    Ug = class extends Dg {},
    Gg = class extends Yp {},
    Vg = class extends Gg {
      async forward(e) {
        const t = !e.input_ids,
          n = !e.pixel_values;
        if (t && n)
          throw new Error(
            'Either `input_ids` or `pixel_values` should be provided.'
          );
        if ((t && (e.input_ids = Wi([e.pixel_values.dims[0], 1])), n)) {
          const { image_size: t } = this.config.vision_config;
          e.pixel_values = Vi([0, 3, t, t], 0);
        }
        const {
            text_embeddings: r,
            image_embeddings: s,
            l2norm_text_embeddings: a,
            l2norm_image_embeddings: o,
          } = await super.forward(e),
          i = {};
        return (
          t || ((i.text_embeddings = r), (i.l2norm_text_embeddings = a)),
          n || ((i.image_embeddings = s), (i.l2norm_image_embeddings = o)),
          i
        );
      }
    },
    jg = class extends Gg {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'text_model',
        });
      }
    },
    Wg = class extends Gg {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'vision_model',
        });
      }
    },
    qg = class extends Yp {},
    Hg = class extends qg {},
    Qg = class extends qg {},
    Xg = class extends Yp {},
    Yg = class extends Xg {},
    Jg = class extends Xg {},
    Kg = class extends Yp {},
    Zg = class extends Kg {},
    ew = class extends Kg {},
    tw = class extends Yp {},
    nw = class extends tw {},
    rw = class extends Yp {
      forward_params = [
        'input_ids',
        'attention_mask',
        'pixel_values',
        'position_ids',
        'past_key_values',
      ];
    },
    sw = class extends rw {
      _merge_input_ids_with_image_features(e) {
        const t = e.image_features.dims.at(-1),
          n = e.image_features.view(-1, t);
        return oh({
          image_token_id: this.config.image_token_index,
          ...e,
          image_features: n,
        });
      }
    },
    aw = class extends sw {},
    ow = class extends sw {},
    iw = class extends Yp {},
    lw = class extends iw {},
    cw = class extends iw {},
    uw = class extends Yp {},
    dw = class extends uw {},
    pw = class extends uw {},
    hw = class extends Yp {},
    fw = class extends hw {},
    _w = class extends hw {},
    mw = class extends Yp {},
    gw = class extends mw {},
    ww = class extends mw {},
    yw = class extends Yp {},
    bw = class extends yw {},
    vw = class extends yw {},
    xw = class extends yw {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Mw = class extends yw {},
    kw = class extends Yp {},
    Ew = class extends kw {},
    Aw = class extends Yp {},
    Tw = class extends Aw {},
    Cw = class extends Zd {
      constructor({ char_logits: e, bpe_logits: t, wp_logits: n }) {
        (super(),
          (this.char_logits = e),
          (this.bpe_logits = t),
          (this.wp_logits = n));
      }
      get logits() {
        return [this.char_logits, this.bpe_logits, this.wp_logits];
      }
    },
    Sw = class extends Yp {},
    Pw = class extends Sw {
      async _call(e) {
        return new Cw(await super._call(e));
      }
    },
    Fw = class extends Zd {
      constructor({ audio_codes: e }) {
        (super(), (this.audio_codes = e));
      }
    },
    Iw = class extends Zd {
      constructor({ audio_values: e }) {
        (super(), (this.audio_values = e));
      }
    },
    Ow = class extends Yp {
      main_input_name = 'input_values';
      forward_params = ['input_values'];
    },
    Lw = class extends Ow {
      async encode(e) {
        return new Fw(await Kd(this.sessions.encoder_model, e));
      }
      async decode(e) {
        return new Iw(await Kd(this.sessions.decoder_model, e));
      }
    },
    zw = class extends Ow {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'encoder_model',
        });
      }
    },
    Nw = class extends Ow {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'decoder_model',
        });
      }
    },
    Bw = class extends Yp {},
    $w = class extends Bw {},
    Dw = class extends Bw {},
    Rw = class extends Yp {},
    Uw = class extends Rw {},
    Gw = class extends Rw {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Vw = class extends Rw {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    jw = class extends Rw {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    Ww = class extends Yp {},
    qw = class extends Ww {},
    Hw = class extends Ww {},
    Qw = class extends Yp {},
    Xw = class extends Qw {},
    Yw = class extends Qw {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Jw = class extends Qw {},
    Kw = class extends Yp {},
    Zw = class extends Kw {},
    ey = class extends Kw {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    ty = class extends Kw {},
    ny = class extends Yp {},
    ry = class extends ny {},
    sy = class extends ny {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    ay = class extends ny {},
    oy = class extends Yp {},
    iy = class extends oy {},
    ly = class extends oy {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    cy = class extends oy {},
    uy = class extends Yp {},
    dy = class extends uy {},
    py = class extends uy {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    hy = class extends Yp {},
    fy = class extends hy {},
    _y = class extends hy {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    my = class extends Yp {},
    gy = class extends my {},
    wy = class extends my {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    yy = class extends my {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    by = class extends my {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    vy = class extends Yp {},
    xy = class extends vy {},
    My = class extends vy {},
    ky = class extends Yp {
      requires_attention_mask = !1;
      main_input_name = 'input_values';
      forward_params = ['input_values', 'decoder_input_ids', 'past_key_values'];
    },
    Ey = class extends ky {},
    Ay = class extends ky {},
    Ty = class extends Yp {},
    Cy = class extends Ty {},
    Sy = class extends Ty {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Py = class extends Ty {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Fy = class extends Ty {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    Iy = class extends Ty {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    Oy = class extends Yp {},
    Ly = class extends Oy {},
    zy = class extends Oy {},
    Ny = class extends Yp {},
    By = class extends Ny {},
    $y = class extends Ny {},
    Dy = class extends Yp {},
    Ry = class extends Dy {
      forward_params = [
        'input_ids',
        'pixel_values',
        'images_seq_mask',
        'images_emb_mask',
        'attention_mask',
        'position_ids',
        'past_key_values',
      ];
      constructor(...e) {
        (super(...e), (this._generation_mode = 'text'));
      }
      async forward(e) {
        const t = this._generation_mode ?? 'text';
        let n;
        if ('text' !== t && e.past_key_values) {
          const t = this.sessions.gen_img_embeds,
            r = Cr({ image_ids: e.input_ids }, t.inputNames);
          n = await Kd(t, r);
        } else {
          const t = this.sessions.prepare_inputs_embeds,
            r = Cr(e, t.inputNames);
          n = await Kd(t, r);
        }
        const r = { ...e, ...n },
          s = await Zp(this, r),
          a = this.sessions['text' === t ? 'lm_head' : 'gen_head'];
        if (!a) throw new Error(`Unable to find "${a}" generation head`);
        const o = await Kd(a, Cr(s, a.inputNames));
        return { ...n, ...s, ...o };
      }
      prepare_inputs_for_generation(e, t, n) {
        const r = !!t.past_key_values;
        if (
          (null !== n.guidance_scale &&
            n.guidance_scale > 1 &&
            (r
              ? (t.input_ids = Bi([t.input_ids, t.input_ids], 0))
              : ((t.input_ids = Bi(
                  [t.input_ids, ji(t.input_ids, BigInt(n.pad_token_id))],
                  0
                )),
                (t.attention_mask = Bi(
                  [t.attention_mask, ji(t.attention_mask, 0n)],
                  0
                )))),
          (!r && t.pixel_values) ||
            (t.pixel_values = Vi([0, 0, 3, 384, 384], 1)),
          r)
        ) {
          const e = 0,
            n = 1,
            r = e > 0 ? 1 : 0,
            s = 1;
          ((t.images_seq_mask = new Ci(
            'bool',
            new Array(e + n).fill(!0).fill(!1, 0, n),
            [s, e + n]
          )),
            (t.images_emb_mask = new Ci('bool', new Array(e).fill(!!r), [
              s,
              1,
              e,
            ])));
        }
        return t;
      }
      async generate(e) {
        return ((this._generation_mode = 'text'), super.generate(e));
      }
      async generate_images(e) {
        this._generation_mode = 'image';
        const t = (e.inputs ?? e[this.main_input_name]).dims[1],
          n = (await super.generate(e)).slice(null, [t, null]),
          r = this.sessions.image_decode,
          { decoded_image: s } = await Kd(r, { generated_tokens: n }),
          a = s.add_(1).mul_(127.5).clamp_(0, 255).to('uint8'),
          o = [];
        for (const e of a) {
          const t = Vc.fromTensor(e);
          o.push(t);
        }
        return o;
      }
    },
    Uy = class extends Yp {},
    Gy = class extends Uy {},
    Vy = class extends Uy {},
    jy = class extends Yp {
      forward_params = [
        'input_ids',
        'attention_mask',
        'encoder_outputs',
        'decoder_input_ids',
        'decoder_attention_mask',
        'past_key_values',
      ];
      _apply_and_filter_by_delay_pattern_mask(e) {
        const [t, n] = e.dims,
          r = this.config.decoder.num_codebooks,
          s = n - r;
        let a = 0;
        for (let t = 0; t < e.size; ++t) {
          if (e.data[t] == this.config.decoder.pad_token_id) continue;
          const o = (t % n) - (Math.floor(t / n) % r);
          o > 0 && o <= s && (e.data[a++] = e.data[t]);
        }
        const o = Math.floor(t / r),
          i = a / (o * r);
        return new Ci(e.type, e.data.slice(0, a), [o, r, i]);
      }
      prepare_inputs_for_generation(e, t, n) {
        const r = BigInt(this.config.decoder.pad_token_id);
        let s = structuredClone(e);
        for (let e = 0; e < s.length; ++e)
          for (let t = 0; t < s[e].length; ++t)
            e % this.config.decoder.num_codebooks >= t && (s[e][t] = r);
        return (
          null !== n.guidance_scale &&
            n.guidance_scale > 1 &&
            (s = s.concat(s)),
          rh(0, s, t)
        );
      }
      async generate(e) {
        const t = await super.generate(e),
          n = this._apply_and_filter_by_delay_pattern_mask(t).unsqueeze_(0),
          { audio_values: r } = await Kd(this.sessions.encodec_decode, {
            audio_codes: n,
          });
        return r;
      }
    },
    Wy = class extends Yp {},
    qy = class extends Wy {},
    Hy = class extends Wy {},
    Qy = class extends Yp {},
    Xy = class extends Qy {},
    Yy = class extends Qy {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Jy = class extends Qy {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Ky = class extends Qy {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    Zy = class extends Qy {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    eb = class extends Yp {},
    tb = class extends eb {},
    nb = class extends Yp {},
    rb = class extends nb {},
    sb = class extends nb {},
    ab = class extends Yp {},
    ob = class extends ab {},
    ib = class extends ab {},
    lb = class extends Yp {},
    cb = class extends lb {},
    ub = class extends lb {},
    db = class extends Yp {},
    pb = class extends db {},
    hb = class extends db {},
    fb = class extends Yp {},
    _b = class extends fb {},
    mb = class extends fb {},
    gb = class extends Yp {},
    wb = class extends gb {},
    yb = class extends gb {},
    bb = class extends Yp {},
    vb = class extends bb {},
    xb = class extends bb {},
    Mb = class extends Yp {},
    kb = class extends Mb {},
    Eb = class extends Mb {},
    Ab = class extends Yp {
      forward_params = [
        'input_ids',
        'attention_mask',
        'pixel_values',
        'position_ids',
        'past_key_values',
      ];
    },
    Tb = class extends Ab {
      _merge_input_ids_with_image_features(e) {
        const t = e.image_features.dims.at(-1),
          n = e.image_features.view(-1, t);
        return oh({
          image_token_id: this.config.image_token_index,
          ...e,
          image_features: n,
        });
      }
    },
    Cb = class extends Yp {},
    Sb = class extends Cb {
      async _call(e) {
        return new sp(await super._call(e));
      }
    },
    Pb = class extends Yp {},
    Fb = class extends Pb {},
    Ib = class extends Pb {},
    Ob = class extends Yp {},
    Lb = class extends Ob {},
    zb = class extends Ob {},
    Nb = class extends Yp {},
    Bb = class extends Nb {},
    $b = class extends Nb {},
    Db = class extends Yp {},
    Rb = class extends Db {},
    Ub = class extends Db {},
    Gb = class extends Yp {
      forward_params = [
        'input_ids',
        'inputs_embeds',
        'attention_mask',
        'position_ids',
        'pixel_values',
        'image_sizes',
        'past_key_values',
      ];
    },
    Vb = class extends Gb {
      async forward({
        input_ids: e = null,
        attention_mask: t = null,
        pixel_values: n = null,
        image_sizes: r = null,
        position_ids: s = null,
        inputs_embeds: a = null,
        past_key_values: o = null,
        generation_config: i = null,
        logits_processor: l = null,
        ...c
      }) {
        if (!a) {
          let t;
          if (n && 1 !== e.dims[1]) {
            if (!r)
              throw new Error(
                '`image_sizes` must be provided when `pixel_values` is provided.'
              );
            ({ image_features: t } = await Kd(this.sessions.vision_encoder, {
              pixel_values: n,
              image_sizes: r,
            }));
          } else {
            const e = this.config.normalized_config.hidden_size;
            t = new Ci('float32', [], [0, e]);
          }
          ({ inputs_embeds: a } = await Kd(
            this.sessions.prepare_inputs_embeds,
            { input_ids: e, image_features: t }
          ));
        }
        return await Zp(
          this,
          {
            inputs_embeds: a,
            past_key_values: o,
            attention_mask: t,
            position_ids: s,
            generation_config: i,
            logits_processor: l,
          },
          !1
        );
      }
    },
    jb = class extends Yp {},
    Wb = class extends jb {},
    qb = class extends jb {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Hb = class extends Yp {},
    Qb = class extends Hb {},
    Xb = class extends Hb {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    Yb = class extends Yp {},
    Jb = class extends Yb {},
    Kb = class extends Yb {},
    Zb = class extends Yp {},
    ev = class extends Zb {},
    tv = class extends Zb {},
    nv = class extends Yp {
      forward_params = [
        'input_ids',
        'attention_mask',
        'position_ids',
        'past_key_values',
        'pixel_values',
        'image_grid_thw',
      ];
    },
    rv = class extends nv {
      image_grid_thw_name = 'grid_thw';
      get_rope_index(e, t, n, r) {
        const {
            vision_config: s,
            image_token_id: a,
            video_token_id: o,
            vision_start_token_id: i,
          } = this.config,
          l = s.spatial_merge_size ?? 2,
          c = [];
        if (t || n) {
          let s = e.tolist();
          r || (r = qi(e));
          const u = r.tolist(),
            d = Array.from({ length: 3 }, t =>
              Array.from({ length: e.dims[0] }, t =>
                Array.from({ length: e.dims[1] }, e => 1)
              )
            ),
            p = t ? t.tolist() : [],
            h = n ? n.tolist() : [];
          let f = 0,
            _ = 0;
          for (let e = 0; e < s.length; ++e) {
            const t = s[e].filter((t, n) => 1 == u[e][n]),
              n = t
                .reduce((e, t, n) => (t == i && e.push(n), e), [])
                .map(e => t[e + 1]),
              r = n.filter(e => e == a).length,
              m = n.filter(e => e == o).length;
            let g = [],
              w = 0,
              y = r,
              b = m;
            for (let e = 0; e < n.length; ++e) {
              const e = t.findIndex((e, t) => t > w && e == a),
                n = t.findIndex((e, t) => t > w && e == o),
                r = y > 0 && -1 !== e ? e : t.length + 1,
                s = b > 0 && -1 !== n ? n : t.length + 1;
              let i, c, u, d;
              r < s
                ? (([c, u, d] = p[f]), ++f, --y, (i = r))
                : (([c, u, d] = h[_]), ++_, --b, (i = s));
              const [m, v, x] = [
                  Number(c),
                  Math.floor(Number(u) / l),
                  Math.floor(Number(d) / l),
                ],
                M = i - w,
                k = g.length > 0 ? jo(g.at(-1))[0] + 1 : 0;
              g.push(Array.from({ length: 3 * M }, (e, t) => k + (t % M)));
              const E = M + k,
                A = m * v * x,
                T = Array.from(
                  { length: A },
                  (e, t) => E + Math.floor(t / (v * x))
                ),
                C = Array.from(
                  { length: A },
                  (e, t) => E + (Math.floor(t / x) % v)
                ),
                S = Array.from({ length: A }, (e, t) => E + (t % x));
              (g.push([T, C, S].flat()), (w = i + A));
            }
            if (w < t.length) {
              const e = g.length > 0 ? jo(g.at(-1))[0] + 1 : 0,
                n = t.length - w;
              g.push(Array.from({ length: 3 * n }, (t, r) => e + (r % n)));
            }
            const v = g.reduce((e, t) => e + t.length, 0),
              x = new Array(v);
            let M = 0;
            for (let e = 0; e < 3; ++e)
              for (let t = 0; t < g.length; ++t) {
                const n = g[t],
                  r = n.length / 3;
                for (let t = e * r; t < (e + 1) * r; ++t) x[M++] = n[t];
              }
            let k = 0;
            const E = u[e];
            for (let t = 0; t < E.length; ++t)
              if (1 == E[t]) {
                for (let n = 0; n < 3; ++n) d[n][e][t] = x[(n * v) / 3 + k];
                ++k;
              }
            const A = jo(x)[0];
            c.push(A + 1 - s[e].length);
          }
          return [
            new Ci('int64', d.flat(1 / 0), [3, e.dims[0], e.dims[1]]),
            new Ci('int64', c, [c.length, 1]),
          ];
        }
        if (r) {
          const { data: e, dims: t } = th(r),
            n = BigInt64Array.from(
              { length: 3 * e.length },
              (t, n) => e[n % e.length]
            ),
            s = Array.from(
              { length: t[0] },
              (n, r) =>
                jo(e.subarray(t[1] * r, t[1] * (r + 1)))[0] + 1n + BigInt(t[1])
            );
          return [
            new Ci('int64', n, [3, ...t]),
            new Ci('int64', s, [s.length, 1]),
          ];
        }
        {
          const [t, n] = e.dims,
            r = BigInt64Array.from({ length: 3 * t * n }, (e, r) =>
              BigInt(Math.floor((r % n) / t))
            );
          return [new Ci('int64', r, [3, ...e.dims]), Hi([t, 1])];
        }
      }
      async encode_image({ pixel_values: e, image_grid_thw: t }) {
        return (
          await Kd(this.sessions.vision_encoder, {
            pixel_values: e,
            [this.image_grid_thw_name]: t,
          })
        ).image_features;
      }
      _merge_input_ids_with_image_features(e) {
        return oh({ image_token_id: this.config.image_token_id, ...e });
      }
      prepare_inputs_for_generation(e, t, n) {
        if (t.attention_mask && !t.position_ids)
          if (t.past_key_values) {
            t.pixel_values = null;
            const e = Pp(t.past_key_values);
            if (e < t.input_ids.dims[1]) {
              const [n, r] = this.get_rope_index(
                t.input_ids,
                t.image_grid_thw,
                t.video_grid_thw,
                t.attention_mask
              );
              ((t.rope_deltas = r),
                (t.position_ids = n.slice(null, null, [e, null])),
                (t.input_ids = t.input_ids.slice(null, [e, null])));
            } else {
              t.rope_deltas ||
                ([, t.rope_deltas] = this.get_rope_index(
                  t.input_ids,
                  t.image_grid_thw,
                  t.video_grid_thw,
                  t.attention_mask
                ));
              const n = BigInt(e),
                r = t.rope_deltas.map(e => n + e);
              t.position_ids = $i([r, r, r], 0);
            }
          } else
            [t.position_ids, t.rope_deltas] = this.get_rope_index(
              t.input_ids,
              t.image_grid_thw,
              t.video_grid_thw,
              t.attention_mask
            );
        return t;
      }
    },
    sv = class extends rv {
      image_grid_thw_name = 'image_grid_thw';
    },
    av = class extends Yp {},
    ov = class extends av {},
    iv = class extends av {},
    lv = class extends Yp {},
    cv = class extends lv {},
    uv = class extends lv {},
    dv = class extends Yp {},
    pv = class extends dv {},
    hv = class extends dv {},
    fv = class extends sv {},
    _v = class extends fv {},
    mv = class extends fv {},
    gv = class extends mv {},
    wv = class extends Yp {},
    yv = class extends wv {},
    bv = class extends wv {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    vv = class extends Yp {},
    xv = class extends vv {},
    Mv = class extends vv {
      async _call(e) {
        return new kv(await super._call(e));
      }
    },
    kv = class extends Vf {},
    Ev = class extends Yp {},
    Av = class extends Ev {},
    Tv = class extends Ev {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Cv = class extends Ev {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Sv = class extends Ev {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    Pv = class extends Ev {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    Fv = class extends Yp {},
    Iv = class extends Fv {},
    Ov = class extends Fv {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    Lv = class extends Fv {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    zv = class extends Fv {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    Nv = class extends Fv {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    Bv = class extends Yp {},
    $v = class extends Bv {},
    Dv = class extends Bv {
      async _call(e) {
        return new Rv(await super._call(e));
      }
    },
    Rv = class extends Vf {},
    Uv = class extends Zd {
      constructor({ iou_scores: e, pred_masks: t }) {
        (super(), (this.iou_scores = e), (this.pred_masks = t));
      }
    },
    Gv = class extends Yp {},
    Vv = class extends Gv {
      async get_image_embeddings({ pixel_values: e }) {
        return await Kp(this, { pixel_values: e });
      }
      async forward(e) {
        ((e =
          e.image_embeddings && e.image_positional_embeddings
            ? { ...e }
            : { ...e, ...(await this.get_image_embeddings(e)) }),
          (e.input_labels ??= Wi(e.input_points.dims.slice(0, -1))));
        const t = {
          image_embeddings: e.image_embeddings,
          image_positional_embeddings: e.image_positional_embeddings,
        };
        return (
          e.input_points && (t.input_points = e.input_points),
          e.input_labels && (t.input_labels = e.input_labels),
          e.input_boxes && (t.input_boxes = e.input_boxes),
          await Kd(this.sessions.prompt_encoder_mask_decoder, t)
        );
      }
      async _call(e) {
        return new Uv(await super._call(e));
      }
    },
    jv = class extends Zd {
      constructor({ iou_scores: e, pred_masks: t, object_score_logits: n }) {
        (super(),
          (this.iou_scores = e),
          (this.pred_masks = t),
          (this.object_score_logits = n));
      }
    },
    Wv = class extends Yp {},
    qv = class extends Wv {
      async get_image_embeddings({ pixel_values: e }) {
        return await Kp(this, { pixel_values: e });
      }
      async forward(e) {
        const { num_feature_levels: t } = this.config.vision_config,
          n = Array.from({ length: t }, (e, t) => `image_embeddings.${t}`);
        if (
          (e = n.some(t => !e[t])
            ? { ...e, ...(await this.get_image_embeddings(e)) }
            : { ...e }).input_points
        ) {
          if (e.input_boxes && 1 !== e.input_boxes.dims[1])
            throw new Error(
              'When both `input_points` and `input_boxes` are provided, the number of boxes per image must be 1.'
            );
          const t = e.input_points.dims;
          ((e.input_labels ??= Wi(t.slice(0, -1))),
            (e.input_boxes ??= Vi([t[0], 0, 4], 0)));
        } else {
          if (!e.input_boxes)
            throw new Error(
              'At least one of `input_points` or `input_boxes` must be provided.'
            );
          {
            const t = e.input_boxes.dims;
            ((e.input_labels = Vi([t[0], t[1], 0], -1n)),
              (e.input_points = Vi([t[0], 1, 0, 2], 0)));
          }
        }
        const r = this.sessions.prompt_encoder_mask_decoder,
          s = Cr(e, r.inputNames);
        return await Kd(r, s);
      }
      async _call(e) {
        return new jv(await super._call(e));
      }
    },
    Hv = class extends qv {},
    Qv = class extends qv {},
    Xv = class extends Yp {},
    Yv = class extends Xv {},
    Jv = class extends Xv {},
    Kv = class extends Xv {},
    Zv = class extends Yp {},
    ex = class extends Zv {},
    tx = class extends Zv {},
    nx = class extends Zv {},
    rx = class extends Yp {},
    sx = class extends rx {},
    ax = class extends rx {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'text_model',
        });
      }
    },
    ox = class extends uf {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'vision_model',
        });
      }
    },
    ix = class extends Yp {},
    lx = class extends ix {},
    cx = class extends ix {},
    ux = class extends Yp {
      main_input_name = 'input_values';
      forward_params = ['input_values'];
    },
    dx = class extends ux {
      async encode(e) {
        return await Kd(this.sessions.encoder_model, e);
      }
      async decode(e) {
        return await Kd(this.sessions.decoder_model, e);
      }
    },
    px = class extends ux {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'encoder_model',
        });
      }
    },
    hx = class extends ux {
      static async from_pretrained(e, t = {}) {
        return super.from_pretrained(e, {
          ...t,
          model_file_name: t.model_file_name ?? 'decoder_model',
        });
      }
    },
    fx = class extends Yp {},
    _x = class extends fx {},
    mx = class extends fx {},
    gx = class extends fx {
      async generate_speech(
        e,
        t,
        {
          threshold: n = 0.5,
          minlenratio: r = 0,
          maxlenratio: s = 20,
          vocoder: a = null,
        } = {}
      ) {
        const o = { input_ids: e },
          { encoder_outputs: i, encoder_attention_mask: l } = await Kp(this, o),
          c = i.dims[1] / this.config.reduction_factor,
          u = Math.floor(c * s),
          d = Math.floor(c * r),
          p = this.config.num_mel_bins;
        let h = [],
          f = null,
          _ = null,
          m = 0;
        for (;;) {
          ++m;
          const e = Ip(!!_);
          let r;
          r = _
            ? _.output_sequence_out
            : new Ci('float32', new Float32Array(p), [1, 1, p]);
          let s = {
            use_cache_branch: e,
            output_sequence: r,
            encoder_attention_mask: l,
            speaker_embeddings: t,
            encoder_hidden_states: i,
          };
          (this.addPastKeyValues(s, f),
            (_ = await Kd(this.sessions.decoder_model_merged, s)),
            (f = this.getPastKeyValues(_, f)));
          const { prob: a, spectrum: o } = _;
          if (
            (h.push(o),
            m >= d &&
              (Array.from(a.data).filter(e => e >= n).length > 0 || m >= u))
          )
            break;
        }
        const g = Bi(h),
          { waveform: w } = await Kd(a.sessions.model, { spectrogram: g });
        return { spectrogram: g, waveform: w };
      }
    },
    wx = class extends Yp {
      main_input_name = 'spectrogram';
    },
    yx = class extends Yp {},
    bx = class extends yx {},
    vx = class extends yx {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    xx = class extends yx {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Mx = class extends yx {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    kx = class extends Yp {},
    Ex = class extends kx {},
    Ax = class extends kx {},
    Tx = class extends Yp {},
    Cx = class extends Tx {},
    Sx = class extends Tx {},
    Px = class extends Yp {},
    Fx = class extends Px {},
    Ix = class extends Yp {},
    Ox = class extends Ix {
      async generate_speech({
        input_ids: e,
        attention_mask: t,
        style: n,
        num_inference_steps: r = 5,
        speed: s = 1.05,
      }) {
        const {
            sampling_rate: a,
            chunk_compress_factor: o,
            base_chunk_size: i,
            latent_dim: l,
          } = this.config,
          { last_hidden_state: c, durations: u } = await Kd(
            this.sessions.text_encoder,
            { input_ids: e, attention_mask: t, style: n }
          ),
          d = u.div(s).mul_(a),
          p = i * o,
          h = d.data,
          f = Int32Array.from(h, e => Math.ceil(e / p)),
          _ = Math.max(...f),
          m = e.dims[0],
          g = new BigInt64Array(m * _);
        for (let e = 0; e < m; ++e) g.fill(1n, e * _, e * _ + f[e]);
        const w = new Ci('int64', g, [m, _]),
          y = l * o,
          b = y * _;
        let v = (function (e) {
          const t = e.reduce((e, t) => e * t, 1);
          return new Ci(
            'float32',
            Float32Array.from({ length: t }, () => xo.gauss()),
            e
          );
        })([m, y, _]);
        const x = v.data;
        for (let e = 0; e < m; ++e)
          if (f[e] !== _)
            for (let t = 0; t < y; ++t)
              x.fill(0, e * b + t * _ + f[e], e * b + (t + 1) * _);
        const M = Vi([m], r);
        for (let e = 0; e < r; ++e) {
          const r = Vi([m], e);
          ({ denoised_latents: v } = await Kd(this.sessions.latent_denoiser, {
            style: n,
            noisy_latents: v,
            latent_mask: w,
            encoder_outputs: c,
            attention_mask: t,
            timestep: r,
            num_inference_steps: M,
          }));
        }
        const { waveform: k } = await Kd(this.sessions.voice_decoder, {
          latents: v,
        });
        return { waveform: k, durations: d };
      }
    },
    Lx = class extends Yp {},
    zx = class extends Lx {},
    Nx = class extends Lx {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    Bx = class extends Lx {},
    $x = class extends Yp {},
    Dx = class extends $x {},
    Rx = class extends $x {},
    Ux = class extends Yp {
      forward_params = [
        'input_ids',
        'attention_mask',
        'encoder_outputs',
        'decoder_input_ids',
        'decoder_attention_mask',
        'past_key_values',
      ];
    },
    Gx = class extends Ux {},
    Vx = class extends Ux {},
    jx = class extends Yp {},
    Wx = class extends jx {},
    qx = class extends jx {
      async _call(e) {
        return new Hx(await super._call(e));
      }
    },
    Hx = class extends k_ {},
    Qx = class extends Yp {},
    Xx = class extends Qx {},
    Yx = class extends Yp {
      forward_params = [
        'input_ids',
        'attention_mask',
        'position_ids',
        'audio_values',
        'past_key_values',
      ];
    },
    Jx = class extends Yx {
      _merge_input_ids_with_audio_features(e) {
        const t = e.audio_features.dims.at(-1),
          n = e.audio_features.view(-1, t);
        return ih({
          audio_token_id:
            this.config.ignore_index ?? this.config.audio_token_id,
          ...e,
          audio_features: n,
        });
      }
    },
    Kx = class extends Jx {},
    Zx = class extends Yp {},
    eM = class extends Zx {},
    tM = class extends Zx {
      async _call(e) {
        return new sp(await super._call(e));
      }
    },
    nM = class extends Zx {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    rM = class extends Yp {},
    sM = class extends rM {},
    aM = class extends rM {
      async _call(e) {
        return new sp(await super._call(e));
      }
    },
    oM = class extends rM {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    iM = class extends rM {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    lM = class extends Yp {},
    cM = class extends lM {},
    uM = class extends lM {},
    dM = class extends Yp {
      main_input_name = 'pixel_values';
      forward_params = [
        'pixel_values',
        'decoder_input_ids',
        'encoder_hidden_states',
        'past_key_values',
      ];
    },
    pM = class extends Yp {},
    hM = class extends pM {},
    fM = class extends pM {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    _M = class extends Yp {},
    mM = class extends _M {},
    gM = class extends Yp {},
    wM = class extends gM {},
    yM = class extends gM {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    bM = class extends Yp {},
    vM = class extends bM {
      async _call(e) {
        return new ap(await super._call(e));
      }
    },
    xM = class extends Yp {},
    MM = class extends xM {},
    kM = class extends Zd {
      constructor({ waveform: e, spectrogram: t }) {
        (super(), (this.waveform = e), (this.spectrogram = t));
      }
    },
    EM = class extends Yp {},
    AM = class extends EM {
      async _call(e) {
        return new kM(await super._call(e));
      }
    },
    TM = class extends Yp {},
    CM = class extends TM {},
    SM = class extends TM {
      async _call(e) {
        return new sp(await super._call(e));
      }
    },
    PM = class extends TM {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    FM = class extends Zd {
      constructor({ logits: e, embeddings: t }) {
        (super(), (this.logits = e), (this.embeddings = t));
      }
    },
    IM = class extends Yp {},
    OM = class extends IM {},
    LM = class extends IM {
      async _call(e) {
        return new sp(await super._call(e));
      }
    },
    zM = class extends IM {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    NM = class extends IM {
      async _call(e) {
        return new FM(await super._call(e));
      }
    },
    BM = class extends IM {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    $M = class extends Yp {},
    DM = class extends $M {},
    RM = class extends bp {
      return_timestamps = null;
      return_token_timestamps = null;
      num_frames = null;
      alignment_heads = null;
      task = null;
      language = null;
      no_timestamps_token_id = null;
      prompt_ids = null;
      is_multilingual = null;
      lang_to_id = null;
      task_to_id = null;
      max_initial_timestamp_index = 1;
    },
    UM = class extends Yp {
      requires_attention_mask = !1;
      main_input_name = 'input_features';
      forward_params = [
        'input_features',
        'attention_mask',
        'decoder_input_ids',
        'decoder_attention_mask',
        'past_key_values',
      ];
    },
    GM = class extends UM {},
    VM = class extends UM {
      _prepare_generation_config(e, t) {
        return super._prepare_generation_config(e, t, RM);
      }
      _retrieve_init_tokens(e) {
        const t = [e.decoder_start_token_id];
        let n = e.language;
        const r = e.task;
        if (e.is_multilingual) {
          n ||
            (Fr.warn('No language specified - defaulting to English (en).'),
            (n = 'en'));
          const s = (function (e) {
              e = e.toLowerCase();
              let t = Ql.get(e);
              if (void 0 === t) {
                const n = e.match(/^<\|([a-z]{2})\|>$/);
                if ((n && (e = n[1]), !Hl.has(e))) {
                  const t = 2 === e.length ? Hl.keys() : Hl.values();
                  throw new Error(
                    `Language "${e}" is not supported. Must be one of: ${JSON.stringify(Array.from(t))}`
                  );
                }
                t = e;
              }
              return t;
            })(n),
            a = `<|${s}|>`;
          (t.push(e.lang_to_id[a]), t.push(e.task_to_id[r ?? 'transcribe']));
        } else if (n || r)
          throw new Error(
            'Cannot specify `task` or `language` for an English-only model. If the model is intended to be multilingual, pass `is_multilingual=true` to generate, or update the generation config.'
          );
        return (
          !e.return_timestamps &&
          e.no_timestamps_token_id &&
          t.at(-1) !== e.no_timestamps_token_id
            ? t.push(e.no_timestamps_token_id)
            : e.return_timestamps &&
              t.at(-1) === e.no_timestamps_token_id &&
              (Fr.warn(
                '<|notimestamps|> prompt token is removed from generation_config since `return_timestamps` is set to `true`.'
              ),
              t.pop()),
          t.filter(e => null != e)
        );
      }
      async generate({
        inputs: e = null,
        generation_config: t = null,
        logits_processor: n = null,
        stopping_criteria: r = null,
        ...s
      }) {
        t = this._prepare_generation_config(t, s);
        const a = s.decoder_input_ids ?? this._retrieve_init_tokens(t);
        if (
          (t.return_timestamps && ((n ??= new lp()), n.push(new pp(t, a))),
          t.begin_suppress_tokens &&
            ((n ??= new lp()),
            n.push(new dp(t.begin_suppress_tokens, a.length))),
          t.return_token_timestamps)
        ) {
          if (!t.alignment_heads)
            throw new Error(
              'Model generation config has no `alignment_heads`, token-level timestamps not available. See https://gist.github.com/hollance/42e32852f24243b748ae6bc1f985b13a on how to add this property to the generation config.'
            );
          ('translate' === t.task &&
            Fr.warn(
              "Token-level timestamps may not be reliable for task 'translate'."
            ),
            (t.output_attentions = !0),
            (t.return_dict_in_generate = !0));
        }
        const o = await super.generate({
          inputs: e,
          generation_config: t,
          logits_processor: n,
          decoder_input_ids: a,
          ...s,
        });
        return (
          t.return_token_timestamps &&
            (o.token_timestamps = this._extract_token_timestamps(
              o,
              t.alignment_heads,
              t.num_frames
            )),
          o
        );
      }
      _extract_token_timestamps(e, t, n = null, r = 0.02) {
        if (!e.cross_attentions)
          throw new Error(
            'Model outputs must contain cross attentions to extract timestamps. This is most likely because the model was not exported with `output_attentions=True`.'
          );
        null == n &&
          Fr.warn(
            '`num_frames` has not been set, meaning the entire audio will be analyzed. This may lead to inaccurate token-level timestamps for short audios (< 30 seconds).'
          );
        let s = this.config.median_filter_width;
        void 0 === s &&
          (Fr.warn(
            'Model config has no `median_filter_width`, using default value of 7.'
          ),
          (s = 7));
        const a = e.cross_attentions,
          o = Array.from({ length: this.config.decoder_layers }, (e, t) =>
            Bi(
              a.map(e => e[t]),
              2
            )
          ),
          i = $i(
            t.map(([e, t]) => {
              if (e >= o.length)
                throw new Error(
                  `Layer index ${e} is out of bounds for cross attentions (length ${o.length}).`
                );
              return n
                ? o[e].slice(null, t, null, [0, n])
                : o[e].slice(null, t);
            })
          ).transpose(1, 0, 2, 3),
          [l, c] = (function (e, t = null, n = 1, r = !1) {
            const s = e.data,
              a = e.dims;
            if (null === t) {
              const t = s.reduce((e, t) => e + t, 0),
                r = t / s.length,
                a = Math.sqrt(
                  s.reduce((e, t) => e + (t - r) ** 2, 0) / (s.length - n)
                ),
                o = new Ci(e.type, [r], []);
              return [new Ci(e.type, [a], []), o];
            }
            const o = Ri(e, (t = Ni(t, a.length)), r),
              i = o.data,
              [l, c, u] = Di((e, t, n, r) => e + (t - i[r]) ** 2, e, t, r);
            for (let e = 0; e < c.length; ++e)
              c[e] = Math.sqrt(c[e] / (a[t] - n));
            return [new Ci(l, c, u), o];
          })(i, -2, 0, !0),
          u = i.clone();
        for (let e = 0; e < u.dims[0]; ++e) {
          const t = u[e];
          for (let n = 0; n < t.dims[0]; ++n) {
            const r = t[n],
              a = l[e][n][0].data,
              o = c[e][n][0].data;
            for (let e = 0; e < r.dims[0]; ++e) {
              let t = r[e].data;
              for (let e = 0; e < t.length; ++e) t[e] = (t[e] - o[e]) / a[e];
              t.set(Xo(t, s));
            }
          }
        }
        const d = [Ri(u, 1)],
          p = e.sequences.dims,
          h = new Ci('float32', new Float32Array(p[0] * p[1]), p);
        for (let e = 0; e < p[0]; ++e) {
          const t = d[e].neg().squeeze_(0),
            [n, s] = Jo(t.tolist()),
            a = Er(
              [1],
              Array.from({ length: n.length - 1 }, (e, t) => n[t + 1] - n[t])
            ).map(e => !!e),
            o = [];
          for (let e = 0; e < a.length; ++e) a[e] && o.push(s[e] * r);
          h[e].data.set(o, 1);
        }
        return h;
      }
    },
    jM = class extends VM {},
    WM = class extends Yp {},
    qM = class extends WM {},
    HM = class extends WM {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    QM = class extends WM {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    XM = class extends WM {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    YM = class extends WM {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    JM = class extends Yp {},
    KM = class extends JM {},
    ZM = class extends JM {
      async _call(e) {
        return new np(await super._call(e));
      }
    },
    ek = class extends JM {
      async _call(e) {
        return new ep(await super._call(e));
      }
    },
    tk = class extends JM {
      async _call(e) {
        return new tp(await super._call(e));
      }
    },
    nk = class extends JM {
      async _call(e) {
        return new rp(await super._call(e));
      }
    },
    rk = class extends Yp {},
    sk = class extends rk {},
    ak = class extends rk {
      async _call(e) {
        return new ok(await super._call(e));
      }
    },
    ok = class extends Zd {
      constructor({ logits: e, pred_boxes: t }) {
        (super(), (this.logits = e), (this.pred_boxes = t));
      }
    },
    ik = class extends Yp {},
    lk = class extends ik {},
    ck = class extends ik {},
    uk = new Map([
      ['bert', 'BertModel'],
      ['neobert', 'NeoBertModel'],
      ['modernbert', 'ModernBertModel'],
      ['nomic_bert', 'NomicBertModel'],
      ['roformer', 'RoFormerModel'],
      ['electra', 'ElectraModel'],
      ['esm', 'EsmModel'],
      ['convbert', 'ConvBertModel'],
      ['camembert', 'CamembertModel'],
      ['deberta', 'DebertaModel'],
      ['deberta-v2', 'DebertaV2Model'],
      ['mpnet', 'MPNetModel'],
      ['albert', 'AlbertModel'],
      ['distilbert', 'DistilBertModel'],
      ['roberta', 'RobertaModel'],
      ['xlm', 'XLMModel'],
      ['xlm-roberta', 'XLMRobertaModel'],
      ['clap', 'ClapModel'],
      ['clip', 'CLIPModel'],
      ['clipseg', 'CLIPSegModel'],
      ['chinese_clip', 'ChineseCLIPModel'],
      ['siglip', 'SiglipModel'],
      ['jina_clip', 'JinaCLIPModel'],
      ['mobilebert', 'MobileBertModel'],
      ['squeezebert', 'SqueezeBertModel'],
      ['wav2vec2', 'Wav2Vec2Model'],
      ['wav2vec2-bert', 'Wav2Vec2BertModel'],
      ['unispeech', 'UniSpeechModel'],
      ['unispeech-sat', 'UniSpeechSatModel'],
      ['hubert', 'HubertModel'],
      ['wavlm', 'WavLMModel'],
      ['audio-spectrogram-transformer', 'ASTModel'],
      ['vits', 'VitsModel'],
      ['pyannote', 'PyAnnoteModel'],
      ['wespeaker-resnet', 'WeSpeakerResNetModel'],
      ['detr', 'DetrModel'],
      ['rt_detr', 'RTDetrModel'],
      ['rt_detr_v2', 'RTDetrV2Model'],
      ['rf_detr', 'RFDetrModel'],
      ['d_fine', 'DFineModel'],
      ['table-transformer', 'TableTransformerModel'],
      ['vit', 'ViTModel'],
      ['ijepa', 'IJepaModel'],
      ['pvt', 'PvtModel'],
      ['vit_msn', 'ViTMSNModel'],
      ['vit_mae', 'ViTMAEModel'],
      ['groupvit', 'GroupViTModel'],
      ['fastvit', 'FastViTModel'],
      ['mobilevit', 'MobileViTModel'],
      ['mobilevitv2', 'MobileViTV2Model'],
      ['owlvit', 'OwlViTModel'],
      ['owlv2', 'Owlv2Model'],
      ['beit', 'BeitModel'],
      ['deit', 'DeiTModel'],
      ['hiera', 'HieraModel'],
      ['convnext', 'ConvNextModel'],
      ['convnextv2', 'ConvNextV2Model'],
      ['dinov2', 'Dinov2Model'],
      ['dinov2_with_registers', 'Dinov2WithRegistersModel'],
      ['dinov3_vit', 'DINOv3ViTModel'],
      ['dinov3_convnext', 'DINOv3ConvNextModel'],
      ['resnet', 'ResNetModel'],
      ['swin', 'SwinModel'],
      ['swin2sr', 'Swin2SRModel'],
      ['donut-swin', 'DonutSwinModel'],
      ['yolos', 'YolosModel'],
      ['dpt', 'DPTModel'],
      ['glpn', 'GLPNModel'],
      ['hifigan', 'SpeechT5HifiGan'],
      ['efficientnet', 'EfficientNetModel'],
      ['decision_transformer', 'DecisionTransformerModel'],
      ['patchtst', 'PatchTSTModel'],
      ['patchtsmixer', 'PatchTSMixerModel'],
      ['mobilenet_v1', 'MobileNetV1Model'],
      ['mobilenet_v2', 'MobileNetV2Model'],
      ['mobilenet_v3', 'MobileNetV3Model'],
      ['mobilenet_v4', 'MobileNetV4Model'],
      ['maskformer', 'MaskFormerModel'],
      ['mgp-str', 'MgpstrForSceneTextRecognition'],
      ['style_text_to_speech_2', 'StyleTextToSpeech2Model'],
    ]),
    dk = new Map([
      ['t5', 'T5Model'],
      ['longt5', 'LongT5Model'],
      ['mt5', 'MT5Model'],
      ['bart', 'BartModel'],
      ['mbart', 'MBartModel'],
      ['marian', 'MarianModel'],
      ['whisper', 'WhisperModel'],
      ['m2m_100', 'M2M100Model'],
      ['blenderbot', 'BlenderbotModel'],
      ['blenderbot-small', 'BlenderbotSmallModel'],
    ]),
    pk = new Map([
      ['mimi', 'MimiModel'],
      ['dac', 'DacModel'],
      ['snac', 'SnacModel'],
    ]),
    hk = new Map([
      ['bloom', 'BloomModel'],
      ['jais', 'JAISModel'],
      ['gpt2', 'GPT2Model'],
      ['gpt_oss', 'GptOssModel'],
      ['gptj', 'GPTJModel'],
      ['gpt_bigcode', 'GPTBigCodeModel'],
      ['gpt_neo', 'GPTNeoModel'],
      ['gpt_neox', 'GPTNeoXModel'],
      ['codegen', 'CodeGenModel'],
      ['llama', 'LlamaModel'],
      ['apertus', 'ApertusModel'],
      ['nanochat', 'NanoChatModel'],
      ['arcee', 'ArceeModel'],
      ['afmoe', 'AfmoeModel'],
      ['lfm2', 'Lfm2Model'],
      ['lfm2_moe', 'Lfm2MoeModel'],
      ['smollm3', 'SmolLM3Model'],
      ['exaone', 'ExaoneModel'],
      ['olmo', 'OlmoModel'],
      ['olmo2', 'Olmo2Model'],
      ['olmo3', 'Olmo3Model'],
      ['olmo_hybrid', 'OlmoHybridModel'],
      ['mobilellm', 'MobileLLMModel'],
      ['granite', 'GraniteModel'],
      ['granitemoehybrid', 'GraniteMoeHybridModel'],
      ['cohere', 'CohereModel'],
      ['cohere2', 'Cohere2Model'],
      ['gemma', 'GemmaModel'],
      ['gemma2', 'Gemma2Model'],
      ['vaultgemma', 'VaultGemmaModel'],
      ['gemma3_text', 'Gemma3Model'],
      ['helium', 'HeliumModel'],
      ['glm', 'GlmModel'],
      ['openelm', 'OpenELMModel'],
      ['qwen2', 'Qwen2Model'],
      ['qwen2_moe', 'Qwen2MoeModel'],
      ['qwen3', 'Qwen3Model'],
      ['qwen3_moe', 'Qwen3MoeModel'],
      ['qwen3_next', 'Qwen3NextModel'],
      ['phi', 'PhiModel'],
      ['phi3', 'Phi3Model'],
      ['mpt', 'MptModel'],
      ['opt', 'OPTModel'],
      ['mistral', 'MistralModel'],
      ['ministral', 'MinistralModel'],
      ['ministral3', 'Ministral3Model'],
      ['ernie4_5', 'Ernie4_5ForCausalLM'],
      ['starcoder2', 'Starcoder2Model'],
      ['falcon', 'FalconModel'],
      ['falcon_h1', 'FalconH1Model'],
      ['stablelm', 'StableLmModel'],
      ['modernbert-decoder', 'ModernBertDecoderModel'],
      ['hunyuan_v1_dense', 'HunYuanDenseV1Model'],
      ['youtu', 'YoutuModel'],
    ]),
    fk = new Map([
      ['speecht5', 'SpeechT5ForSpeechToText'],
      ['whisper', 'WhisperForConditionalGeneration'],
      ['lite-whisper', 'LiteWhisperForConditionalGeneration'],
      ['moonshine', 'MoonshineForConditionalGeneration'],
    ]),
    _k = new Map([['speecht5', 'SpeechT5ForTextToSpeech']]),
    mk = new Map([
      ['vits', 'VitsModel'],
      ['musicgen', 'MusicgenForConditionalGeneration'],
      ['supertonic', 'SupertonicForConditionalGeneration'],
    ]),
    gk = new Map([
      ['bert', 'BertForSequenceClassification'],
      ['neobert', 'NeoBertForSequenceClassification'],
      ['modernbert', 'ModernBertForSequenceClassification'],
      ['roformer', 'RoFormerForSequenceClassification'],
      ['electra', 'ElectraForSequenceClassification'],
      ['esm', 'EsmForSequenceClassification'],
      ['convbert', 'ConvBertForSequenceClassification'],
      ['camembert', 'CamembertForSequenceClassification'],
      ['deberta', 'DebertaForSequenceClassification'],
      ['deberta-v2', 'DebertaV2ForSequenceClassification'],
      ['mpnet', 'MPNetForSequenceClassification'],
      ['albert', 'AlbertForSequenceClassification'],
      ['distilbert', 'DistilBertForSequenceClassification'],
      ['roberta', 'RobertaForSequenceClassification'],
      ['xlm', 'XLMForSequenceClassification'],
      ['xlm-roberta', 'XLMRobertaForSequenceClassification'],
      ['bart', 'BartForSequenceClassification'],
      ['mbart', 'MBartForSequenceClassification'],
      ['mobilebert', 'MobileBertForSequenceClassification'],
      ['squeezebert', 'SqueezeBertForSequenceClassification'],
    ]),
    wk = new Map([
      ['bert', 'BertForTokenClassification'],
      ['neobert', 'NeoBertForTokenClassification'],
      ['modernbert', 'ModernBertForTokenClassification'],
      ['roformer', 'RoFormerForTokenClassification'],
      ['electra', 'ElectraForTokenClassification'],
      ['esm', 'EsmForTokenClassification'],
      ['convbert', 'ConvBertForTokenClassification'],
      ['camembert', 'CamembertForTokenClassification'],
      ['deberta', 'DebertaForTokenClassification'],
      ['deberta-v2', 'DebertaV2ForTokenClassification'],
      ['mpnet', 'MPNetForTokenClassification'],
      ['distilbert', 'DistilBertForTokenClassification'],
      ['roberta', 'RobertaForTokenClassification'],
      ['xlm', 'XLMForTokenClassification'],
      ['xlm-roberta', 'XLMRobertaForTokenClassification'],
    ]),
    yk = new Map([
      ['t5', 'T5ForConditionalGeneration'],
      ['longt5', 'LongT5ForConditionalGeneration'],
      ['mt5', 'MT5ForConditionalGeneration'],
      ['bart', 'BartForConditionalGeneration'],
      ['mbart', 'MBartForConditionalGeneration'],
      ['marian', 'MarianMTModel'],
      ['m2m_100', 'M2M100ForConditionalGeneration'],
      ['blenderbot', 'BlenderbotForConditionalGeneration'],
      ['blenderbot-small', 'BlenderbotSmallForConditionalGeneration'],
    ]),
    bk = new Map([
      ['bloom', 'BloomForCausalLM'],
      ['gpt2', 'GPT2LMHeadModel'],
      ['gpt_oss', 'GptOssForCausalLM'],
      ['jais', 'JAISLMHeadModel'],
      ['gptj', 'GPTJForCausalLM'],
      ['gpt_bigcode', 'GPTBigCodeForCausalLM'],
      ['gpt_neo', 'GPTNeoForCausalLM'],
      ['gpt_neox', 'GPTNeoXForCausalLM'],
      ['codegen', 'CodeGenForCausalLM'],
      ['llama', 'LlamaForCausalLM'],
      ['nanochat', 'NanoChatForCausalLM'],
      ['apertus', 'ApertusForCausalLM'],
      ['llama4_text', 'Llama4ForCausalLM'],
      ['arcee', 'ArceeForCausalLM'],
      ['afmoe', 'AfmoeForCausalLM'],
      ['lfm2', 'Lfm2ForCausalLM'],
      ['lfm2_moe', 'Lfm2MoeForCausalLM'],
      ['smollm3', 'SmolLM3ForCausalLM'],
      ['exaone', 'ExaoneForCausalLM'],
      ['olmo', 'OlmoForCausalLM'],
      ['olmo2', 'Olmo2ForCausalLM'],
      ['olmo3', 'Olmo3ForCausalLM'],
      ['olmo_hybrid', 'OlmoHybridForCausalLM'],
      ['mobilellm', 'MobileLLMForCausalLM'],
      ['granite', 'GraniteForCausalLM'],
      ['granitemoehybrid', 'GraniteMoeHybridForCausalLM'],
      ['cohere', 'CohereForCausalLM'],
      ['cohere2', 'Cohere2ForCausalLM'],
      ['gemma', 'GemmaForCausalLM'],
      ['gemma2', 'Gemma2ForCausalLM'],
      ['vaultgemma', 'VaultGemmaForCausalLM'],
      ['gemma3_text', 'Gemma3ForCausalLM'],
      ['helium', 'HeliumForCausalLM'],
      ['glm', 'GlmForCausalLM'],
      ['openelm', 'OpenELMForCausalLM'],
      ['qwen2', 'Qwen2ForCausalLM'],
      ['qwen2_moe', 'Qwen2MoeForCausalLM'],
      ['qwen3', 'Qwen3ForCausalLM'],
      ['qwen3_moe', 'Qwen3MoeForCausalLM'],
      ['qwen3_next', 'Qwen3NextForCausalLM'],
      ['phi', 'PhiForCausalLM'],
      ['phi3', 'Phi3ForCausalLM'],
      ['mpt', 'MptForCausalLM'],
      ['opt', 'OPTForCausalLM'],
      ['mbart', 'MBartForCausalLM'],
      ['mistral', 'MistralForCausalLM'],
      ['ministral', 'MinistralForCausalLM'],
      ['ministral3', 'Ministral3ForCausalLM'],
      ['ernie4_5', 'Ernie4_5ForCausalLM'],
      ['starcoder2', 'Starcoder2ForCausalLM'],
      ['falcon', 'FalconForCausalLM'],
      ['falcon_h1', 'FalconH1ForCausalLM'],
      ['trocr', 'TrOCRForCausalLM'],
      ['stablelm', 'StableLmForCausalLM'],
      ['modernbert-decoder', 'ModernBertDecoderForCausalLM'],
      ['hunyuan_v1_dense', 'HunYuanDenseV1ForCausalLM'],
      ['youtu', 'YoutuForCausalLM'],
      ['phi3_v', 'Phi3VForCausalLM'],
    ]),
    vk = new Map([['multi_modality', 'MultiModalityCausalLM']]),
    xk = new Map([
      ['bert', 'BertForMaskedLM'],
      ['neobert', 'NeoBertForMaskedLM'],
      ['modernbert', 'ModernBertForMaskedLM'],
      ['roformer', 'RoFormerForMaskedLM'],
      ['electra', 'ElectraForMaskedLM'],
      ['esm', 'EsmForMaskedLM'],
      ['convbert', 'ConvBertForMaskedLM'],
      ['camembert', 'CamembertForMaskedLM'],
      ['deberta', 'DebertaForMaskedLM'],
      ['deberta-v2', 'DebertaV2ForMaskedLM'],
      ['mpnet', 'MPNetForMaskedLM'],
      ['albert', 'AlbertForMaskedLM'],
      ['distilbert', 'DistilBertForMaskedLM'],
      ['roberta', 'RobertaForMaskedLM'],
      ['xlm', 'XLMWithLMHeadModel'],
      ['xlm-roberta', 'XLMRobertaForMaskedLM'],
      ['mobilebert', 'MobileBertForMaskedLM'],
      ['squeezebert', 'SqueezeBertForMaskedLM'],
    ]),
    Mk = new Map([
      ['bert', 'BertForQuestionAnswering'],
      ['neobert', 'NeoBertForQuestionAnswering'],
      ['roformer', 'RoFormerForQuestionAnswering'],
      ['electra', 'ElectraForQuestionAnswering'],
      ['convbert', 'ConvBertForQuestionAnswering'],
      ['camembert', 'CamembertForQuestionAnswering'],
      ['deberta', 'DebertaForQuestionAnswering'],
      ['deberta-v2', 'DebertaV2ForQuestionAnswering'],
      ['mpnet', 'MPNetForQuestionAnswering'],
      ['albert', 'AlbertForQuestionAnswering'],
      ['distilbert', 'DistilBertForQuestionAnswering'],
      ['roberta', 'RobertaForQuestionAnswering'],
      ['xlm', 'XLMForQuestionAnswering'],
      ['xlm-roberta', 'XLMRobertaForQuestionAnswering'],
      ['mobilebert', 'MobileBertForQuestionAnswering'],
      ['squeezebert', 'SqueezeBertForQuestionAnswering'],
    ]),
    kk = new Map([
      ['vision-encoder-decoder', 'VisionEncoderDecoderModel'],
      ['idefics3', 'Idefics3ForConditionalGeneration'],
      ['smolvlm', 'SmolVLMForConditionalGeneration'],
    ]),
    Ek = new Map([
      ['llava', 'LlavaForConditionalGeneration'],
      ['llava_onevision', 'LlavaOnevisionForConditionalGeneration'],
      ['moondream1', 'Moondream1ForConditionalGeneration'],
      ['florence2', 'Florence2ForConditionalGeneration'],
      ['qwen2_vl', 'Qwen2VLForConditionalGeneration'],
      ['qwen2_5_vl', 'Qwen2_5_VLForConditionalGeneration'],
      ['qwen3_vl', 'Qwen3VLForConditionalGeneration'],
      ['qwen3_vl_moe', 'Qwen3VLMoeForConditionalGeneration'],
      ['qwen3_5', 'Qwen3_5ForConditionalGeneration'],
      ['qwen3_5_moe', 'Qwen3_5MoeForConditionalGeneration'],
      ['idefics3', 'Idefics3ForConditionalGeneration'],
      ['smolvlm', 'SmolVLMForConditionalGeneration'],
      ['paligemma', 'PaliGemmaForConditionalGeneration'],
      ['llava_qwen2', 'LlavaQwen2ForCausalLM'],
      ['gemma3n', 'Gemma3nForConditionalGeneration'],
      ['mistral3', 'Mistral3ForConditionalGeneration'],
    ]),
    Ak = new Map([
      ['ultravox', 'UltravoxModel'],
      ['voxtral', 'VoxtralForConditionalGeneration'],
    ]),
    Tk = new Map([['vision-encoder-decoder', 'VisionEncoderDecoderModel']]),
    Ck = new Map([
      ['vit', 'ViTForImageClassification'],
      ['ijepa', 'IJepaForImageClassification'],
      ['pvt', 'PvtForImageClassification'],
      ['vit_msn', 'ViTMSNForImageClassification'],
      ['fastvit', 'FastViTForImageClassification'],
      ['mobilevit', 'MobileViTForImageClassification'],
      ['mobilevitv2', 'MobileViTV2ForImageClassification'],
      ['beit', 'BeitForImageClassification'],
      ['deit', 'DeiTForImageClassification'],
      ['hiera', 'HieraForImageClassification'],
      ['convnext', 'ConvNextForImageClassification'],
      ['convnextv2', 'ConvNextV2ForImageClassification'],
      ['dinov2', 'Dinov2ForImageClassification'],
      ['dinov2_with_registers', 'Dinov2WithRegistersForImageClassification'],
      ['resnet', 'ResNetForImageClassification'],
      ['swin', 'SwinForImageClassification'],
      ['segformer', 'SegformerForImageClassification'],
      ['efficientnet', 'EfficientNetForImageClassification'],
      ['mobilenet_v1', 'MobileNetV1ForImageClassification'],
      ['mobilenet_v2', 'MobileNetV2ForImageClassification'],
      ['mobilenet_v3', 'MobileNetV3ForImageClassification'],
      ['mobilenet_v4', 'MobileNetV4ForImageClassification'],
    ]),
    Sk = new Map([
      ['detr', 'DetrForObjectDetection'],
      ['rt_detr', 'RTDetrForObjectDetection'],
      ['rt_detr_v2', 'RTDetrV2ForObjectDetection'],
      ['rf_detr', 'RFDetrForObjectDetection'],
      ['d_fine', 'DFineForObjectDetection'],
      ['table-transformer', 'TableTransformerForObjectDetection'],
      ['yolos', 'YolosForObjectDetection'],
    ]),
    Pk = new Map([
      ['owlvit', 'OwlViTForObjectDetection'],
      ['owlv2', 'Owlv2ForObjectDetection'],
      ['grounding-dino', 'GroundingDinoForObjectDetection'],
    ]),
    Fk = new Map([
      ['detr', 'DetrForSegmentation'],
      ['clipseg', 'CLIPSegForImageSegmentation'],
    ]),
    Ik = new Map([
      ['segformer', 'SegformerForSemanticSegmentation'],
      ['sapiens', 'SapiensForSemanticSegmentation'],
      ['swin', 'SwinForSemanticSegmentation'],
      ['mobilenet_v1', 'MobileNetV1ForSemanticSegmentation'],
      ['mobilenet_v2', 'MobileNetV2ForSemanticSegmentation'],
      ['mobilenet_v3', 'MobileNetV3ForSemanticSegmentation'],
      ['mobilenet_v4', 'MobileNetV4ForSemanticSegmentation'],
    ]),
    Ok = new Map([
      ['detr', 'DetrForSegmentation'],
      ['maskformer', 'MaskFormerForInstanceSegmentation'],
    ]),
    Lk = new Map([
      ['sam', 'SamModel'],
      ['sam2', 'Sam2Model'],
      ['edgetam', 'EdgeTamModel'],
      ['sam3_tracker', 'Sam3TrackerModel'],
    ]),
    zk = new Map([
      ['wav2vec2', 'Wav2Vec2ForCTC'],
      ['wav2vec2-bert', 'Wav2Vec2BertForCTC'],
      ['unispeech', 'UniSpeechForCTC'],
      ['unispeech-sat', 'UniSpeechSatForCTC'],
      ['wavlm', 'WavLMForCTC'],
      ['hubert', 'HubertForCTC'],
      ['parakeet_ctc', 'ParakeetForCTC'],
    ]),
    Nk = new Map([
      ['wav2vec2', 'Wav2Vec2ForSequenceClassification'],
      ['wav2vec2-bert', 'Wav2Vec2BertForSequenceClassification'],
      ['unispeech', 'UniSpeechForSequenceClassification'],
      ['unispeech-sat', 'UniSpeechSatForSequenceClassification'],
      ['wavlm', 'WavLMForSequenceClassification'],
      ['hubert', 'HubertForSequenceClassification'],
      ['audio-spectrogram-transformer', 'ASTForAudioClassification'],
    ]),
    Bk = new Map([['wavlm', 'WavLMForXVector']]),
    $k = new Map([
      ['unispeech-sat', 'UniSpeechSatForAudioFrameClassification'],
      ['wavlm', 'WavLMForAudioFrameClassification'],
      ['wav2vec2', 'Wav2Vec2ForAudioFrameClassification'],
      ['pyannote', 'PyAnnoteForAudioFrameClassification'],
    ]),
    Dk = new Map([['vitmatte', 'VitMatteForImageMatting']]),
    Rk = new Map([
      ['patchtst', 'PatchTSTForPrediction'],
      ['patchtsmixer', 'PatchTSMixerForPrediction'],
    ]),
    Uk = new Map([['swin2sr', 'Swin2SRForImageSuperResolution']]),
    Gk = new Map([
      ['dpt', 'DPTForDepthEstimation'],
      ['depth_anything', 'DepthAnythingForDepthEstimation'],
      ['glpn', 'GLPNForDepthEstimation'],
      ['sapiens', 'SapiensForDepthEstimation'],
      ['depth_pro', 'DepthProForDepthEstimation'],
      ['metric3d', 'Metric3DForDepthEstimation'],
      ['metric3dv2', 'Metric3Dv2ForDepthEstimation'],
    ]),
    Vk = new Map([['sapiens', 'SapiensForNormalEstimation']]),
    jk = new Map([['vitpose', 'VitPoseForPoseEstimation']]),
    Wk = new Map([
      ['clip', 'CLIPVisionModelWithProjection'],
      ['siglip', 'SiglipVisionModel'],
      ['jina_clip', 'JinaCLIPVisionModel'],
    ]),
    qk = [
      [uk, 0],
      [dk, 1],
      [hk, 5],
      [pk, 12],
      [gk, 0],
      [wk, 0],
      [yk, 2],
      [fk, 2],
      [bk, 4],
      [vk, 9],
      [xk, 0],
      [Mk, 0],
      [kk, 3],
      [Ek, 7],
      [Ak, 11],
      [Ck, 0],
      [Fk, 0],
      [Ok, 0],
      [Ik, 0],
      [Dk, 0],
      [Rk, 0],
      [Uk, 0],
      [Gk, 0],
      [Vk, 0],
      [jk, 0],
      [Sk, 0],
      [Pk, 0],
      [Lk, 6],
      [zk, 0],
      [Nk, 0],
      [_k, 2],
      [mk, 0],
      [Bk, 0],
      [$k, 0],
      [Wk, 0],
    ];
  for (const [e, t] of qk)
    for (const n of e.values()) {
      Hp.set(n, t);
      const e = ch[n];
      (Xp.set(e, n), Qp.set(n, e));
    }
  var Hk = [
    ['MusicgenForConditionalGeneration', jy, 8],
    ['Phi3VForCausalLM', Vb, 10],
    ['CLIPTextModelWithProjection', hf, 0],
    ['SiglipTextModel', ax, 0],
    ['JinaCLIPTextModel', jg, 0],
    ['ClapTextModelWithProjection', lf, 0],
    ['ClapAudioModelWithProjection', cf, 0],
    ['DacEncoderModel', Jf, 0],
    ['DacDecoderModel', Kf, 0],
    ['MimiEncoderModel', zw, 0],
    ['MimiDecoderModel', Nw, 0],
    ['SnacEncoderModel', px, 0],
    ['SnacDecoderModel', hx, 0],
    ['Gemma3nForConditionalGeneration', Lm, 13],
    ['SupertonicForConditionalGeneration', Ox, 14],
    ['ChatterboxModel', nf, 15],
  ];
  for (const [e, t, n] of Hk) (Hp.set(e, n), Xp.set(t, e), Qp.set(e, t));
  var Qk = new Map([
    ['modnet', Fk],
    ['birefnet', Fk],
    ['isnet', Fk],
    ['ben', Fk],
  ]);
  for (const [e, t] of Qk.entries())
    (t.set(e, 'PreTrainedModel'), Hp.set(e, 0), Qp.set(e, Yp));
  var Xk = new Set(Qk.keys());
  (Hp.set('PreTrainedModel', 0), Xp.set(Yp, 'PreTrainedModel'));
  var Yk = {
    MODEL_FOR_SEQUENCE_CLASSIFICATION_MAPPING_NAMES: gk,
    MODEL_FOR_TOKEN_CLASSIFICATION_MAPPING_NAMES: wk,
    MODEL_FOR_TEXT_TO_SPECTROGRAM_MAPPING_NAMES: _k,
    MODEL_FOR_TEXT_TO_WAVEFORM_MAPPING_NAMES: mk,
    MODEL_FOR_MASKED_LM_MAPPING_NAMES: xk,
    MODEL_FOR_QUESTION_ANSWERING_MAPPING_NAMES: Mk,
    MODEL_FOR_IMAGE_CLASSIFICATION_MAPPING_NAMES: Ck,
    MODEL_FOR_IMAGE_SEGMENTATION_MAPPING_NAMES: Fk,
    MODEL_FOR_SEMANTIC_SEGMENTATION_MAPPING_NAMES: Ik,
    MODEL_FOR_UNIVERSAL_SEGMENTATION_MAPPING_NAMES: Ok,
    MODEL_FOR_OBJECT_DETECTION_MAPPING_NAMES: Sk,
    MODEL_FOR_ZERO_SHOT_OBJECT_DETECTION_MAPPING_NAMES: Pk,
    MODEL_FOR_MASK_GENERATION_MAPPING_NAMES: Lk,
    MODEL_FOR_CTC_MAPPING_NAMES: zk,
    MODEL_FOR_AUDIO_CLASSIFICATION_MAPPING_NAMES: Nk,
    MODEL_FOR_AUDIO_XVECTOR_MAPPING_NAMES: Bk,
    MODEL_FOR_AUDIO_FRAME_CLASSIFICATION_MAPPING_NAMES: $k,
    MODEL_FOR_DOCUMENT_QUESTION_ANSWERING_MAPPING_NAMES: Tk,
    MODEL_FOR_IMAGE_MATTING_MAPPING_NAMES: Dk,
    MODEL_FOR_IMAGE_TO_IMAGE_MAPPING_NAMES: Uk,
    MODEL_FOR_DEPTH_ESTIMATION_MAPPING_NAMES: Gk,
    MODEL_FOR_NORMAL_ESTIMATION_MAPPING_NAMES: Vk,
    MODEL_FOR_POSE_ESTIMATION_MAPPING_NAMES: jk,
    MODEL_FOR_IMAGE_FEATURE_EXTRACTION_MAPPING_NAMES: Wk,
    MODEL_FOR_IMAGE_TEXT_TO_TEXT_MAPPING_NAMES: Ek,
    MODEL_FOR_AUDIO_TEXT_TO_TEXT_MAPPING_NAMES: Ak,
    MODEL_FOR_SEQ_TO_SEQ_CAUSAL_LM_MAPPING_NAMES: yk,
    MODEL_FOR_SPEECH_SEQ_2_SEQ_MAPPING_NAMES: fk,
    MODEL_FOR_CAUSAL_LM_MAPPING_NAMES: bk,
    MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES: kk,
  };
  Sp = Yk;
  var Jk = class {
      static MODEL_CLASS_MAPPINGS = null;
      static BASE_IF_FAIL = !1;
      static supports(e) {
        if (!this.MODEL_CLASS_MAPPINGS) return !1;
        for (const t of this.MODEL_CLASS_MAPPINGS) if (t.has(e)) return !0;
        return this.BASE_IF_FAIL;
      }
      static async from_pretrained(
        e,
        {
          progress_callback: t = null,
          config: n = null,
          cache_dir: r = null,
          local_files_only: s = !1,
          revision: a = 'main',
          model_file_name: o = null,
          subfolder: i = 'onnx',
          device: l = null,
          dtype: c = null,
          use_external_data_format: u = null,
          session_options: d = {},
        } = {}
      ) {
        const p = {
          progress_callback: t,
          config: n,
          cache_dir: r,
          local_files_only: s,
          revision: a,
          model_file_name: o,
          subfolder: i,
          device: l,
          dtype: c,
          use_external_data_format: u,
          session_options: d,
        };
        if (
          ((p.config = await Qd.from_pretrained(e, p)),
          !this.MODEL_CLASS_MAPPINGS)
        )
          throw new Error(
            '`MODEL_CLASS_MAPPINGS` not implemented for this type of `AutoClass`: ' +
              this.name
          );
        const { model_type: h } = p.config;
        for (const t of this.MODEL_CLASS_MAPPINGS) {
          let n = t.get(h);
          if (!n) {
            for (const e of t.values())
              if (e[0] === h) {
                n = e;
                break;
              }
            if (!n) continue;
          }
          return await ch[n].from_pretrained(e, p);
        }
        if (this.BASE_IF_FAIL)
          return (
            Xk.has(h) ||
              Fr.warn(
                `Unknown model class "${h}", attempting to construct from base class.`
              ),
            await Yp.from_pretrained(e, p)
          );
        throw Error(`Unsupported model type: ${h}`);
      }
    },
    Kk = class extends Jk {
      static MODEL_CLASS_MAPPINGS = qk.map(e => e[0]);
      static BASE_IF_FAIL = !0;
    },
    Zk = class extends Jk {
      static MODEL_CLASS_MAPPINGS = [
        Yk.MODEL_FOR_SEQUENCE_CLASSIFICATION_MAPPING_NAMES,
      ];
    },
    eE = class extends Jk {
      static MODEL_CLASS_MAPPINGS = [
        Yk.MODEL_FOR_SEQ_TO_SEQ_CAUSAL_LM_MAPPING_NAMES,
      ];
    },
    tE = class extends Jk {
      static MODEL_CLASS_MAPPINGS = [Yk.MODEL_FOR_CAUSAL_LM_MAPPING_NAMES];
    },
    nE = class extends Jk {
      static MODEL_CLASS_MAPPINGS = [
        Yk.MODEL_FOR_IMAGE_SEGMENTATION_MAPPING_NAMES,
      ];
    },
    rE = class extends Jk {
      static MODEL_CLASS_MAPPINGS = [
        Yk.MODEL_FOR_SEMANTIC_SEGMENTATION_MAPPING_NAMES,
      ];
    },
    sE = class extends Jk {
      static MODEL_CLASS_MAPPINGS = [
        Yk.MODEL_FOR_UNIVERSAL_SEGMENTATION_MAPPING_NAMES,
      ];
    };
  async function aE(e) {
    return (
      Array.isArray(e) || (e = [e]),
      await Promise.all(e.map(e => Vc.read(e)))
    );
  }
  async function oE(e, t) {
    return (
      Array.isArray(e) || (e = [e]),
      await Promise.all(
        e.map(e =>
          'string' == typeof e || e instanceof URL
            ? (async function (e, t) {
                if ('undefined' == typeof AudioContext)
                  throw Error(
                    'Unable to load audio from path/URL since `AudioContext` is not available in your environment. Instead, audio data should be passed directly to the pipeline/processor. For more information and some example code, see https://huggingface.co/docs/transformers.js/guides/node-audio-processing.'
                  );
                const n = await (await Oo(e)).arrayBuffer(),
                  r = new AudioContext({ sampleRate: t });
                void 0 === t &&
                  Fr.warn(
                    `No sampling rate provided, using default of ${r.sampleRate}Hz.`
                  );
                const s = await r.decodeAudioData(n);
                let a;
                if (2 === s.numberOfChannels) {
                  const e = Math.sqrt(2),
                    t = s.getChannelData(0),
                    n = s.getChannelData(1);
                  a = new Float32Array(t.length);
                  for (let r = 0; r < s.length; ++r)
                    a[r] = (e * (t[r] + n[r])) / 2;
                } else a = s.getChannelData(0);
                return a;
              })(e, t)
            : e instanceof Float64Array
              ? new Float32Array(e)
              : e
        )
      )
    );
  }
  function iE(e, t) {
    t && (e = e.map(e => 0 | e));
    const [n, r, s, a] = e;
    return { xmin: n, ymin: r, xmax: s, ymax: a };
  }
  var lE = class extends mo {
      constructor({
        task: e,
        model: t,
        tokenizer: n = null,
        processor: r = null,
      }) {
        (super(),
          (this.task = e),
          (this.model = t),
          (this.tokenizer = n),
          (this.processor = r));
      }
      async dispose() {
        await this.model.dispose();
      }
    },
    cE = class extends lE {
      _key = 'generated_text';
      async _call(e, t = {}) {
        (Array.isArray(e) || (e = [e]),
          this.model.config.prefix &&
            (e = e.map(e => this.model.config.prefix + e)));
        const n = this.model.config.task_specific_params;
        n &&
          n[this.task] &&
          n[this.task].prefix &&
          (e = e.map(e => n[this.task].prefix + e));
        const r = this.tokenizer,
          s = { padding: !0, truncation: !0 };
        let a;
        a =
          'translation' === this.task && '_build_translation_inputs' in r
            ? r._build_translation_inputs(e, s, t)
            : r(e, s);
        const o = await this.model.generate({ ...a, ...t });
        return r
          .batch_decode(o, { skip_special_tokens: !0 })
          .map(e => ({ [this._key]: e }));
      }
    };
  function uE(e) {
    return Array.isArray(e) && e.every(e => 'role' in e && 'content' in e);
  }
  var dE = {
      panoptic: 'post_process_panoptic_segmentation',
      instance: 'post_process_instance_segmentation',
      semantic: 'post_process_semantic_segmentation',
    },
    pE = class extends lE {
      async _call(
        e,
        {
          threshold: t = 0.5,
          mask_threshold: n = 0.5,
          overlap_mask_area_threshold: r = 0.8,
          label_ids_to_fuse: s = null,
          target_sizes: a = null,
          subtask: o = null,
        } = {}
      ) {
        if (Array.isArray(e) && 1 !== e.length)
          throw Error(
            'Image segmentation pipeline currently only supports a batch size of 1.'
          );
        const i = await aE(e),
          l = i.map(e => [e.height, e.width]),
          c = await this.processor(i),
          { inputNames: u, outputNames: d } = this.model.sessions.model;
        if (!u.includes('pixel_values')) {
          if (1 !== u.length)
            throw Error(
              `Expected a single input name, but got ${u.length} inputs: ${u}.`
            );
          const e = u[0];
          if (e in c)
            throw Error(`Input name ${e} already exists in the inputs.`);
          c[e] = c.pixel_values;
        }
        const p = await this.model(c);
        let h = null;
        if (null !== o) h = dE[o];
        else if (this.processor.image_processor)
          for (const [e, t] of Object.entries(dE))
            if (t in this.processor.image_processor) {
              ((h = this.processor.image_processor[t].bind(
                this.processor.image_processor
              )),
                (o = e));
              break;
            }
        const f = this.model.config.id2label,
          _ = [];
        if (o)
          if ('panoptic' === o || 'instance' === o) {
            const e = h(p, t, n, r, s, a ?? l)[0],
              o = e.segmentation;
            for (const t of e.segments_info) {
              const e = new Uint8ClampedArray(o.data.length);
              for (let n = 0; n < o.data.length; ++n)
                o.data[n] === t.id && (e[n] = 255);
              const n = new Vc(e, o.dims[1], o.dims[0], 1);
              _.push({ score: t.score, label: f[t.label_id], mask: n });
            }
          } else {
            if ('semantic' !== o) throw Error(`Subtask ${o} not supported.`);
            {
              const { segmentation: e, labels: t } = h(p, a ?? l)[0];
              for (const n of t) {
                const t = new Uint8ClampedArray(e.data.length);
                for (let r = 0; r < e.data.length; ++r)
                  e.data[r] === n && (t[r] = 255);
                const r = new Vc(t, e.dims[1], e.dims[0], 1);
                _.push({ score: null, label: f[n], mask: r });
              }
            }
          }
        else {
          const e = 1e-5,
            t = p[d[0]];
          for (let n = 0; n < l.length; ++n) {
            const r = l[n],
              s = t[n];
            s.data.some(t => t < -e || t > 1 + e) && s.sigmoid_();
            const a = await Vc.fromTensor(s.mul_(255).to('uint8')).resize(
              r[1],
              r[0]
            );
            _.push({ label: null, score: null, mask: a });
          }
        }
        return _;
      }
    };
  (Object.freeze({
    'text-classification': {
      pipeline: class extends lE {
        async _call(e, { top_k: t = 1 } = {}) {
          const n = this.tokenizer(e, { padding: !0, truncation: !0 }),
            r = await this.model(n),
            { problem_type: s, id2label: a } = this.model.config,
            o =
              'multi_label_classification' === s
                ? e => e.sigmoid()
                : e => new Ci('float32', Uo(e.data), e.dims),
            i = [];
          for (const e of r.logits) {
            const n = o(e),
              r = await Fi(n, t),
              s = r[0].tolist(),
              l = r[1]
                .tolist()
                .map((e, t) => ({
                  label: a ? a[e] : `LABEL_${e}`,
                  score: s[t],
                }));
            1 === t ? i.push(...l) : i.push(l);
          }
          return Array.isArray(e) || 1 === t ? i : i[0];
        }
      },
      model: Zk,
      default: {
        model: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      },
      type: 'text',
    },
    'token-classification': {
      pipeline: class extends lE {
        async _call(e, { ignore_labels: t = ['O'] } = {}) {
          const n = Array.isArray(e),
            r = this.tokenizer(n ? e : [e], { padding: !0, truncation: !0 }),
            s = (await this.model(r)).logits,
            a = this.model.config.id2label,
            o = [];
          for (let e = 0; e < s.dims[0]; ++e) {
            const n = r.input_ids[e],
              i = s[e],
              l = [];
            for (let e = 0; e < i.dims[0]; ++e) {
              const r = i[e],
                s = jo(r.data)[1],
                o = a ? a[s] : `LABEL_${s}`;
              if (t.includes(o)) continue;
              const c = this.tokenizer.decode([n[e].item()], {
                skip_special_tokens: !0,
              });
              if ('' === c) continue;
              const u = Uo(r.data);
              l.push({ entity: o, score: u[s], index: e, word: c });
            }
            o.push(l);
          }
          return n ? o : o[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_TOKEN_CLASSIFICATION_MAPPING_NAMES,
        ];
      },
      default: { model: 'Xenova/bert-base-multilingual-cased-ner-hrl' },
      type: 'text',
    },
    'question-answering': {
      pipeline: class extends lE {
        async _call(e, t, { top_k: n = 1 } = {}) {
          const r = this.tokenizer(e, {
              text_pair: t,
              padding: !0,
              truncation: !0,
            }),
            s = Array.isArray(e),
            { start_logits: a, end_logits: o } = await this.model(r),
            i = r.input_ids.tolist(),
            l = r.attention_mask.tolist(),
            { all_special_ids: c, sep_token_id: u } = this.tokenizer,
            d = [];
          for (let e = 0; e < a.dims[0]; ++e) {
            const t = i[e],
              r = t.findIndex(e => e == u),
              s = a[e].tolist(),
              p = o[e].tolist();
            for (let n = 1; n < s.length; ++n)
              (0 == l[e] || n <= r || -1 !== c.findIndex(e => e == t[n])) &&
                ((s[n] = -1 / 0), (p[n] = -1 / 0));
            const h = Uo(s).map((e, t) => [e, t]),
              f = Uo(p).map((e, t) => [e, t]);
            ((h[0][0] = 0), (f[0][0] = 0));
            const _ = Ar(h, f)
                .filter(e => e[0][1] <= e[1][1])
                .map(e => [e[0][1], e[1][1], e[0][0] * e[1][0]])
                .sort((e, t) => t[2] - e[2]),
              m = [];
            for (let e = 0; e < Math.min(_.length, n); ++e) {
              const [n, r, s] = _[e],
                a = t.slice(n, r + 1),
                o = this.tokenizer.decode(a, { skip_special_tokens: !0 });
              m.push({ answer: o, score: s });
            }
            1 === n ? d.push(...m) : d.push(m);
          }
          return s ? d : d[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_QUESTION_ANSWERING_MAPPING_NAMES,
        ];
      },
      default: { model: 'Xenova/distilbert-base-cased-distilled-squad' },
      type: 'text',
    },
    'fill-mask': {
      pipeline: class extends lE {
        async _call(e, { top_k: t = 5 } = {}) {
          const { mask_token_id: n, mask_token: r } = this.tokenizer,
            s = this.tokenizer(e, { padding: !0, truncation: !0 }),
            { logits: a } = await this.model(s),
            o = [],
            i = s.input_ids.tolist();
          for (let e = 0; e < i.length; ++e) {
            const s = i[e],
              l = s.findIndex(e => e == n);
            if (-1 === l) throw Error(`Mask token (${r}) not found in text.`);
            const c = a[e][l],
              u = await Fi(new Ci('float32', Uo(c.data), c.dims), t),
              d = u[0].tolist(),
              p = u[1].tolist();
            o.push(
              p.map((e, t) => {
                const n = s.slice();
                return (
                  (n[l] = e),
                  {
                    score: d[t],
                    token: Number(e),
                    token_str: this.tokenizer.decode([e]),
                    sequence: this.tokenizer.decode(n, {
                      skip_special_tokens: !0,
                    }),
                  }
                );
              })
            );
          }
          return Array.isArray(e) ? o : o[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [Yk.MODEL_FOR_MASKED_LM_MAPPING_NAMES];
      },
      default: {
        model: 'onnx-community/ettin-encoder-32m-ONNX',
        dtype: 'fp32',
      },
      type: 'text',
    },
    summarization: {
      pipeline: class extends cE {
        _key = 'summary_text';
      },
      model: eE,
      default: { model: 'Xenova/distilbart-cnn-6-6' },
      type: 'text',
    },
    translation: {
      pipeline: class extends cE {
        _key = 'translation_text';
      },
      model: eE,
      default: { model: 'Xenova/t5-small' },
      type: 'text',
    },
    'text2text-generation': {
      pipeline: cE,
      model: eE,
      default: { model: 'Xenova/flan-t5-small' },
      type: 'text',
    },
    'text-generation': {
      pipeline: class extends lE {
        async _call(e, t = {}) {
          let n,
            r = !1,
            s = !1,
            a =
              t.add_special_tokens ??
              (this.tokenizer.add_bos_token || this.tokenizer.add_eos_token) ??
              !1,
            o = t.tokenizer_encode_kwargs;
          if ('string' == typeof e) n = e = [e];
          else if (Array.isArray(e) && e.every(e => 'string' == typeof e))
            ((r = !0), (n = e));
          else {
            if (uE(e)) e = [e];
            else {
              if (!Array.isArray(e) || !e.every(uE))
                throw new Error(
                  'Input must be a string, an array of strings, a Chat, or an array of Chats'
                );
              r = !0;
            }
            ((s = !0),
              (n = e.map(e =>
                this.tokenizer.apply_chat_template(e, {
                  tokenize: !1,
                  add_generation_prompt: !0,
                  ...o,
                })
              )),
              (a = !1),
              (o = void 0));
          }
          const i = !s && (t.return_full_text ?? !0);
          this.tokenizer.padding_side = 'left';
          const l = this.tokenizer(n, {
              add_special_tokens: a,
              padding: !0,
              truncation: !0,
              ...o,
            }),
            c = await this.model.generate({ ...l, ...t }),
            u = this.tokenizer.batch_decode(c, { skip_special_tokens: !0 });
          let d;
          !i &&
            l.input_ids.dims.at(-1) > 0 &&
            (d = this.tokenizer
              .batch_decode(l.input_ids, { skip_special_tokens: !0 })
              .map(e => e.length));
          const p = Array.from({ length: e.length }, e => []);
          for (let t = 0; t < u.length; ++t) {
            const n = Math.floor((t / c.dims[0]) * e.length);
            (d && (u[t] = u[t].slice(d[n])),
              p[n].push({
                generated_text: s
                  ? [...e[n], { role: 'assistant', content: u[t] }]
                  : u[t],
              }));
          }
          return r || 1 !== p.length ? p : p[0];
        }
      },
      model: tE,
      default: { model: 'onnx-community/Qwen3-0.6B-ONNX', dtype: 'q4' },
      type: 'text',
    },
    'zero-shot-classification': {
      pipeline: class extends lE {
        constructor(e) {
          (super(e),
            (this.label2id = Object.fromEntries(
              Object.entries(this.model.config.label2id).map(([e, t]) => [
                e.toLowerCase(),
                t,
              ])
            )),
            (this.entailment_id = this.label2id.entailment),
            void 0 === this.entailment_id &&
              (Fr.warn(
                "Could not find 'entailment' in label2id mapping. Using 2 as entailment_id."
              ),
              (this.entailment_id = 2)),
            (this.contradiction_id =
              this.label2id.contradiction ?? this.label2id.not_entailment),
            void 0 === this.contradiction_id &&
              (Fr.warn(
                "Could not find 'contradiction' in label2id mapping. Using 0 as contradiction_id."
              ),
              (this.contradiction_id = 0)));
        }
        async _call(
          e,
          t,
          {
            hypothesis_template: n = 'This example is {}.',
            multi_label: r = !1,
          } = {}
        ) {
          const s = Array.isArray(e);
          (s || (e = [e]), Array.isArray(t) || (t = [t]));
          const a = t.map(e => n.replace('{}', e)),
            o = r || 1 === t.length,
            i = [];
          for (const n of e) {
            const e = [];
            for (const t of a) {
              const r = this.tokenizer(n, {
                  text_pair: t,
                  padding: !0,
                  truncation: !0,
                }),
                s = await this.model(r);
              o
                ? e.push([
                    s.logits.data[this.contradiction_id],
                    s.logits.data[this.entailment_id],
                  ])
                : e.push(s.logits.data[this.entailment_id]);
            }
            const r = (o ? e.map(e => Uo(e)[1]) : Uo(e))
              .map((e, t) => [e, t])
              .sort((e, t) => t[0] - e[0]);
            i.push({
              sequence: n,
              labels: r.map(e => t[e[1]]),
              scores: r.map(e => e[0]),
            });
          }
          return s ? i : i[0];
        }
      },
      model: Zk,
      default: { model: 'Xenova/distilbert-base-uncased-mnli' },
      type: 'text',
    },
    'audio-classification': {
      pipeline: class extends lE {
        async _call(e, { top_k: t = 5 } = {}) {
          const n = this.processor.feature_extractor.config.sampling_rate,
            r = await oE(e, n),
            s = this.model.config.id2label,
            a = [];
          for (const e of r) {
            const n = await this.processor(e),
              r = (await this.model(n)).logits[0],
              o = await Fi(new Ci('float32', Uo(r.data), r.dims), t),
              i = o[0].tolist(),
              l = o[1]
                .tolist()
                .map((e, t) => ({
                  label: s ? s[e] : `LABEL_${e}`,
                  score: i[t],
                }));
            a.push(l);
          }
          return Array.isArray(e) ? a : a[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_AUDIO_CLASSIFICATION_MAPPING_NAMES,
        ];
      },
      default: { model: 'Xenova/wav2vec2-base-superb-ks' },
      type: 'audio',
    },
    'zero-shot-audio-classification': {
      pipeline: class extends lE {
        async _call(
          e,
          t,
          { hypothesis_template: n = 'This is a sound of {}.' } = {}
        ) {
          const r = !Array.isArray(e);
          r && (e = [e]);
          const s = t.map(e => n.replace('{}', e)),
            a = this.tokenizer(s, { padding: !0, truncation: !0 }),
            o = this.processor.feature_extractor.config.sampling_rate,
            i = await oE(e, o),
            l = [];
          for (const e of i) {
            const n = await this.processor(e),
              r = Uo((await this.model({ ...a, ...n })).logits_per_audio.data);
            l.push([...r].map((e, n) => ({ score: e, label: t[n] })));
          }
          return r ? l[0] : l;
        }
      },
      model: Kk,
      default: { model: 'Xenova/clap-htsat-unfused' },
      type: 'multimodal',
    },
    'automatic-speech-recognition': {
      pipeline: class extends lE {
        async _call(e, t = {}) {
          switch (this.model.config.model_type) {
            case 'whisper':
            case 'lite-whisper':
              return this._call_whisper(e, t);
            case 'wav2vec2':
            case 'wav2vec2-bert':
            case 'unispeech':
            case 'unispeech-sat':
            case 'hubert':
            case 'parakeet_ctc':
              return this._call_wav2vec2(e, t);
            case 'moonshine':
              return this._call_moonshine(e, t);
            default:
              throw new Error(
                `AutomaticSpeechRecognitionPipeline does not support model type '${this.model.config.model_type}'.`
              );
          }
        }
        async _call_wav2vec2(e, t) {
          (t.language &&
            Fr.warn(
              '`language` parameter is not yet supported for `wav2vec2` models, defaulting to "English".'
            ),
            t.task &&
              Fr.warn(
                '`task` parameter is not yet supported for `wav2vec2` models, defaulting to "transcribe".'
              ));
          const n = !Array.isArray(e),
            r = n ? [e] : e,
            s = this.processor.feature_extractor.config.sampling_rate,
            a = await oE(r, s),
            o = [];
          for (const e of a) {
            const t = await this.processor(e),
              n = (await this.model(t)).logits[0],
              r = [];
            for (const e of n) r.push(jo(e.data)[1]);
            const s = this.tokenizer
              .decode(r, { skip_special_tokens: !0 })
              .trim();
            o.push({ text: s });
          }
          return n ? o[0] : o;
        }
        async _call_whisper(e, t) {
          const n = t.return_timestamps ?? !1,
            r = t.chunk_length_s ?? 0,
            s = t.force_full_sequences ?? !1;
          let a = t.stride_length_s ?? null;
          const o = { ...t };
          'word' === n &&
            ((o.return_token_timestamps = !0), (o.return_timestamps = !1));
          const i = !Array.isArray(e),
            l = i ? [e] : e,
            c = this.processor.feature_extractor.config,
            u = c.chunk_length / this.model.config.max_source_positions,
            d = c.hop_length,
            p = c.sampling_rate,
            h = await oE(l, p),
            f = [];
          for (const e of h) {
            let t = [];
            if (r > 0) {
              if (null === a) a = r / 6;
              else if (r <= a)
                throw Error(
                  '`chunk_length_s` must be larger than `stride_length_s`.'
                );
              const n = p * r,
                s = p * a,
                o = n - 2 * s;
              let i = 0;
              for (;;) {
                const r = i + n,
                  a = e.subarray(i, r),
                  l = await this.processor(a),
                  c = 0 === i,
                  u = r >= e.length;
                if (
                  (t.push({
                    stride: [a.length, c ? 0 : s, u ? 0 : s],
                    input_features: l.input_features,
                    is_last: u,
                  }),
                  u)
                )
                  break;
                i += o;
              }
            } else
              t = [
                {
                  stride: [e.length, 0, 0],
                  input_features: (await this.processor(e)).input_features,
                  is_last: !0,
                },
              ];
            for (const e of t) {
              o.num_frames = Math.floor(e.stride[0] / d);
              const t = await this.model.generate({
                inputs: e.input_features,
                ...o,
              });
              ('word' === n
                ? ((e.tokens = t.sequences.tolist()[0]),
                  (e.token_timestamps = t.token_timestamps
                    .tolist()[0]
                    .map(e => Yo(e, 2))))
                : (e.tokens = t[0].tolist()),
                (e.stride = e.stride.map(e => e / p)));
            }
            const [i, l] = this.tokenizer._decode_asr(t, {
              time_precision: u,
              return_timestamps: n,
              force_full_sequences: s,
            });
            f.push({ text: i, ...l });
          }
          return i ? f[0] : f;
        }
        async _call_moonshine(e, t) {
          const n = !Array.isArray(e),
            r = n ? [e] : e,
            s = this.processor.feature_extractor.config.sampling_rate,
            a = await oE(r, s),
            o = [];
          for (const e of a) {
            const n = await this.processor(e),
              r = 6 * Math.floor(e.length / s),
              a = await this.model.generate({ max_new_tokens: r, ...t, ...n }),
              i = this.processor.batch_decode(a, {
                skip_special_tokens: !0,
              })[0];
            o.push({ text: i });
          }
          return n ? o[0] : o;
        }
      },
      model: [
        class extends Jk {
          static MODEL_CLASS_MAPPINGS = [
            Yk.MODEL_FOR_SPEECH_SEQ_2_SEQ_MAPPING_NAMES,
          ];
        },
        class extends Jk {
          static MODEL_CLASS_MAPPINGS = [Yk.MODEL_FOR_CTC_MAPPING_NAMES];
        },
      ],
      default: { model: 'Xenova/whisper-tiny.en' },
      type: 'multimodal',
    },
    'text-to-audio': {
      pipeline: class extends lE {
        DEFAULT_VOCODER_ID = 'Xenova/speecht5_hifigan';
        constructor(e) {
          (super(e), (this.vocoder = e.vocoder ?? null));
        }
        async _prepare_speaker_embeddings(e, t) {
          if (
            (('string' == typeof e || e instanceof URL) &&
              (e = new Float32Array(await (await br.fetch(e)).arrayBuffer())),
            e instanceof Float32Array)
          )
            e = new Ci('float32', e, [e.length]);
          else if (!(e instanceof Ci))
            throw new Error(
              'Speaker embeddings must be a `Tensor`, `Float32Array`, `string`, or `URL`.'
            );
          if (t > 1)
            if (1 === e.dims[0]) e = e.repeat(t, 1);
            else if (e.dims[0] !== t)
              throw new Error(
                `Expected speaker embeddings batch size to be 1 or ${t}, but got ${e.dims[0]}.`
              );
          return e;
        }
        _postprocess_waveform(e, t, n, r = null) {
          const s = t.data,
            [a, o] = t.dims,
            i = r ? r.data : null,
            l = [];
          for (let e = 0; e < a; ++e) {
            const t = i ? Math.min(Math.ceil(i[e]), o) : o,
              r = e * o;
            l.push(new xc(s.slice(r, r + t), n));
          }
          return Array.isArray(e) ? l : l[0];
        }
        async _call(e, t) {
          return this.processor
            ? this._call_text_to_spectrogram(e, t)
            : 'supertonic' === this.model.config.model_type
              ? this._call_supertonic(e, t)
              : this._call_text_to_waveform(e);
        }
        async _call_supertonic(
          e,
          { speaker_embeddings: t, num_inference_steps: n, speed: r }
        ) {
          if (!t)
            throw new Error(
              'Speaker embeddings must be provided for Supertonic models.'
            );
          const { sampling_rate: s, style_dim: a } = this.model.config,
            o = this.tokenizer(e, { padding: !0, truncation: !0 }),
            i = o.input_ids.dims[0];
          t = (t = await this._prepare_speaker_embeddings(t, i)).view(i, -1, a);
          const { waveform: l, durations: c } =
            await this.model.generate_speech({
              ...o,
              style: t,
              num_inference_steps: n,
              speed: r,
            });
          return this._postprocess_waveform(e, l, s, c);
        }
        async _call_text_to_waveform(e) {
          const t = this.tokenizer(e, { padding: !0, truncation: !0 }),
            { waveform: n } = await this.model(t),
            r = this.model.config.sampling_rate;
          return this._postprocess_waveform(e, n, r);
        }
        async _call_text_to_spectrogram(e, { speaker_embeddings: t }) {
          this.vocoder ||
            (Fr.info('No vocoder specified, using default HifiGan vocoder.'),
            (this.vocoder = await Kk.from_pretrained(this.DEFAULT_VOCODER_ID, {
              dtype: 'fp32',
            })));
          const { input_ids: n } = this.tokenizer(e, {
              padding: !0,
              truncation: !0,
            }),
            r = n.dims[0];
          t = (t = await this._prepare_speaker_embeddings(t, r)).view(r, -1);
          const { waveform: s } = await this.model.generate_speech(n, t, {
              vocoder: this.vocoder,
            }),
            a = this.processor.feature_extractor.config.sampling_rate;
          return this._postprocess_waveform(e, s, a);
        }
      },
      model: [
        class extends Jk {
          static MODEL_CLASS_MAPPINGS = [
            Yk.MODEL_FOR_TEXT_TO_WAVEFORM_MAPPING_NAMES,
          ];
        },
        class extends Jk {
          static MODEL_CLASS_MAPPINGS = [
            Yk.MODEL_FOR_TEXT_TO_SPECTROGRAM_MAPPING_NAMES,
          ];
        },
      ],
      default: { model: 'onnx-community/Supertonic-TTS-ONNX', dtype: 'fp32' },
      type: 'text',
    },
    'image-to-text': {
      pipeline: class extends lE {
        async _call(e, t = {}) {
          const n = Array.isArray(e),
            r = await aE(e),
            { pixel_values: s } = await this.processor(r),
            a = [];
          for (const e of s) {
            e.dims = [1, ...e.dims];
            const n = await this.model.generate({ inputs: e, ...t }),
              r = this.tokenizer
                .batch_decode(n, { skip_special_tokens: !0 })
                .map(e => ({ generated_text: e.trim() }));
            a.push(r);
          }
          return n ? a : a[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [Yk.MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES];
      },
      default: { model: 'Xenova/vit-gpt2-image-captioning' },
      type: 'multimodal',
    },
    'image-classification': {
      pipeline: class extends lE {
        async _call(e, { top_k: t = 5 } = {}) {
          const n = await aE(e),
            { pixel_values: r } = await this.processor(n),
            s = await this.model({ pixel_values: r }),
            { id2label: a } = this.model.config,
            o = [];
          for (const e of s.logits) {
            const n = await Fi(new Ci('float32', Uo(e.data), e.dims), t),
              r = n[0].tolist(),
              s = n[1]
                .tolist()
                .map((e, t) => ({
                  label: a ? a[e] : `LABEL_${e}`,
                  score: r[t],
                }));
            o.push(s);
          }
          return Array.isArray(e) ? o : o[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_IMAGE_CLASSIFICATION_MAPPING_NAMES,
        ];
      },
      default: { model: 'Xenova/vit-base-patch16-224' },
      type: 'multimodal',
    },
    'image-segmentation': {
      pipeline: pE,
      model: [nE, rE, sE],
      default: { model: 'Xenova/detr-resnet-50-panoptic' },
      type: 'multimodal',
    },
    'background-removal': {
      pipeline: class extends pE {
        async _call(e, t = {}) {
          const n = await aE(e),
            r = await super._call(e, t),
            s = n.map((e, t) => {
              const n = e.clone();
              return (n.putAlpha(r[t].mask), n);
            });
          return Array.isArray(e) ? s : s[0];
        }
      },
      model: [nE, rE, sE],
      default: { model: 'Xenova/modnet' },
      type: 'image',
    },
    'zero-shot-image-classification': {
      pipeline: class extends lE {
        async _call(
          e,
          t,
          { hypothesis_template: n = 'This is a photo of {}' } = {}
        ) {
          const r = Array.isArray(e),
            s = await aE(e),
            a = t.map(e => n.replace('{}', e)),
            o = this.tokenizer(a, {
              padding:
                'siglip' !== this.model.config.model_type || 'max_length',
              truncation: !0,
            }),
            { pixel_values: i } = await this.processor(s),
            l = await this.model({ ...o, pixel_values: i }),
            c =
              'siglip' === this.model.config.model_type
                ? e => e.sigmoid().data
                : e => Uo(e.data),
            u = [];
          for (const e of l.logits_per_image) {
            const n = [...c(e)].map((e, n) => ({ score: e, label: t[n] }));
            (n.sort((e, t) => t.score - e.score), u.push(n));
          }
          return r ? u : u[0];
        }
      },
      model: Kk,
      default: { model: 'Xenova/clip-vit-base-patch32' },
      type: 'multimodal',
    },
    'object-detection': {
      pipeline: class extends lE {
        async _call(e, { threshold: t = 0.9, percentage: n = !1 } = {}) {
          const r = Array.isArray(e);
          if (r && 1 !== e.length)
            throw Error(
              'Object detection pipeline currently only supports a batch size of 1.'
            );
          const s = await aE(e),
            a = n ? null : s.map(e => [e.height, e.width]),
            { pixel_values: o, pixel_mask: i } = await this.processor(s),
            l = await this.model({ pixel_values: o, pixel_mask: i }),
            c = this.processor.image_processor.post_process_object_detection(
              l,
              t,
              a
            ),
            { id2label: u } = this.model.config,
            d = c.map(e =>
              e.boxes.map((t, r) => ({
                score: e.scores[r],
                label: u[e.classes[r]],
                box: iE(t, !n),
              }))
            );
          return r ? d : d[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_OBJECT_DETECTION_MAPPING_NAMES,
        ];
      },
      default: { model: 'Xenova/detr-resnet-50' },
      type: 'multimodal',
    },
    'zero-shot-object-detection': {
      pipeline: class extends lE {
        async _call(
          e,
          t,
          { threshold: n = 0.1, top_k: r = null, percentage: s = !1 } = {}
        ) {
          const a = Array.isArray(e),
            o = await aE(e),
            i = this.tokenizer(t, { padding: !0, truncation: !0 }),
            l = await this.processor(o),
            c = [];
          for (let e = 0; e < o.length; ++e) {
            const a = o[e],
              u = s ? null : [[a.height, a.width]],
              d = l.pixel_values[e].unsqueeze_(0),
              p = await this.model({ ...i, pixel_values: d });
            let h;
            if ('post_process_grounded_object_detection' in this.processor) {
              const e = this.processor.post_process_grounded_object_detection(
                p,
                i.input_ids,
                { box_threshold: n, text_threshold: n, target_sizes: u }
              )[0];
              h = e.boxes.map((t, n) => ({
                score: e.scores[n],
                label: e.labels[n],
                box: iE(t, !s),
              }));
            } else {
              const e =
                this.processor.image_processor.post_process_object_detection(
                  p,
                  n,
                  u,
                  !0
                )[0];
              h = e.boxes.map((n, r) => ({
                score: e.scores[r],
                label: t[e.classes[r]],
                box: iE(n, !s),
              }));
            }
            (h.sort((e, t) => t.score - e.score),
              null !== r && (h = h.slice(0, r)),
              c.push(h));
          }
          return a ? c : c[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_ZERO_SHOT_OBJECT_DETECTION_MAPPING_NAMES,
        ];
      },
      default: { model: 'Xenova/owlvit-base-patch32' },
      type: 'multimodal',
    },
    'document-question-answering': {
      pipeline: class extends lE {
        async _call(e, t, n = {}) {
          if (Array.isArray(e)) {
            if (1 !== e.length)
              throw Error(
                'Document Question Answering pipeline currently only supports a batch size of 1.'
              );
            e = e[0];
          }
          const r = (await aE(e))[0],
            { pixel_values: s } = await this.processor(r),
            a = `<s_docvqa><s_question>${t}</s_question><s_answer>`,
            o = this.tokenizer(a, {
              add_special_tokens: !1,
              padding: !0,
              truncation: !0,
            }).input_ids,
            i = await this.model.generate({
              inputs: s,
              max_length: this.model.config.decoder.max_position_embeddings,
              decoder_input_ids: o,
              ...n,
            }),
            l = this.tokenizer
              .batch_decode(i)[0]
              .match(/<s_answer>(.*?)<\/s_answer>/);
          let c = null;
          return (l && l.length >= 2 && (c = l[1].trim()), [{ answer: c }]);
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_DOCUMENT_QUESTION_ANSWERING_MAPPING_NAMES,
        ];
      },
      default: { model: 'Xenova/donut-base-finetuned-docvqa' },
      type: 'multimodal',
    },
    'image-to-image': {
      pipeline: class extends lE {
        async _call(e) {
          const t = await aE(e),
            n = await this.processor(t),
            r = await this.model(n),
            s = [];
          for (const e of r.reconstruction) {
            const t = e.squeeze().clamp_(0, 1).mul_(255).round_().to('uint8');
            s.push(Vc.fromTensor(t));
          }
          return Array.isArray(e) ? s : s[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_IMAGE_TO_IMAGE_MAPPING_NAMES,
        ];
      },
      default: { model: 'Xenova/swin2SR-classical-sr-x2-64' },
      type: 'image',
    },
    'depth-estimation': {
      pipeline: class extends lE {
        async _call(e) {
          const t = await aE(e),
            n = await this.processor(t),
            { predicted_depth: r } = await this.model(n),
            s = [];
          for (let e = 0; e < t.length; ++e) {
            const n = r[e],
              [a, o] = n.dims.slice(-2),
              [i, l] = t[e].size,
              c = (
                await Pi(n.view(1, 1, a, o), { size: [l, i], mode: 'bilinear' })
              ).view(l, i),
              u = c.min().item(),
              d = c.max().item(),
              p = c
                .sub(u)
                .div_(d - u)
                .mul_(255)
                .to('uint8')
                .unsqueeze(0),
              h = Vc.fromTensor(p);
            s.push({ predicted_depth: c, depth: h });
          }
          return Array.isArray(e) ? s : s[0];
        }
      },
      model: class extends Jk {
        static MODEL_CLASS_MAPPINGS = [
          Yk.MODEL_FOR_DEPTH_ESTIMATION_MAPPING_NAMES,
        ];
      },
      default: { model: 'onnx-community/depth-anything-v2-small' },
      type: 'image',
    },
    'feature-extraction': {
      pipeline: class extends lE {
        async _call(
          e,
          {
            pooling: t = 'none',
            normalize: n = !1,
            quantize: r = !1,
            precision: s = 'binary',
          } = {}
        ) {
          const a = this.tokenizer(e, { padding: !0, truncation: !0 }),
            o = await this.model(a);
          let i = o.last_hidden_state ?? o.logits ?? o.token_embeddings;
          switch (t) {
            case 'none':
              break;
            case 'mean':
              i = (function (e, t) {
                const n = e.data,
                  r = t.data,
                  s = [e.dims[0], e.dims[2]],
                  a = new n.constructor(s[0] * s[1]),
                  [o, i, l] = e.dims;
                let c = 0;
                for (let e = 0; e < o; ++e) {
                  const t = e * l * i;
                  for (let s = 0; s < l; ++s) {
                    let o = 0,
                      u = 0;
                    const d = e * i,
                      p = t + s;
                    for (let e = 0; e < i; ++e) {
                      const t = Number(r[d + e]);
                      ((u += t), (o += n[p + e * l] * t));
                    }
                    const h = o / u;
                    a[c++] = h;
                  }
                }
                return new Ci(e.type, a, s);
              })(i, a.attention_mask);
              break;
            case 'first_token':
            case 'cls':
              i = i.slice(null, 0);
              break;
            case 'last_token':
            case 'eos':
              i = i.slice(null, -1);
              break;
            default:
              throw Error(`Pooling method '${t}' not supported.`);
          }
          return (
            n && (i = i.normalize(2, -1)),
            r &&
              (i = (function (e, t) {
                if (2 !== e.dims.length)
                  throw new Error('The tensor must have 2 dimensions');
                if (e.dims.at(-1) % 8 != 0)
                  throw new Error(
                    'The last dimension of the tensor must be a multiple of 8'
                  );
                if (!['binary', 'ubinary'].includes(t))
                  throw new Error(
                    "The precision must be either 'binary' or 'ubinary'"
                  );
                const n = 'binary' === t,
                  r = n ? 'int8' : 'uint8',
                  s = n ? Int8Array : Uint8Array,
                  a = e.data,
                  o = new s(a.length / 8);
                for (let e = 0; e < a.length; ++e) {
                  const t = a[e] > 0 ? 1 : 0,
                    r = Math.floor(e / 8),
                    s = e % 8;
                  ((o[r] |= t << (7 - s)), n && 0 === s && (o[r] -= 128));
                }
                return new Ci(r, o, [e.dims[0], e.dims[1] / 8]);
              })(i, s)),
            i
          );
        }
      },
      model: Kk,
      default: { model: 'onnx-community/all-MiniLM-L6-v2-ONNX', dtype: 'fp32' },
      type: 'text',
    },
    'image-feature-extraction': {
      pipeline: class extends lE {
        async _call(e, { pool: t = null } = {}) {
          const n = await aE(e),
            { pixel_values: r } = await this.processor(n),
            s = await this.model({ pixel_values: r });
          let a;
          if (t) {
            if (!('pooler_output' in s))
              throw Error(
                "No pooled output was returned. Make sure the model has a 'pooler' layer when using the 'pool' option."
              );
            a = s.pooler_output;
          } else a = s.last_hidden_state ?? s.logits ?? s.image_embeds;
          return a;
        }
      },
      model: [
        class extends Jk {
          static MODEL_CLASS_MAPPINGS = [
            Yk.MODEL_FOR_IMAGE_FEATURE_EXTRACTION_MAPPING_NAMES,
          ];
        },
        Kk,
      ],
      default: {
        model: 'onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX',
        dtype: 'fp32',
      },
      type: 'image',
    },
  }),
    Object.freeze({
      'sentiment-analysis': 'text-classification',
      ner: 'token-classification',
      asr: 'automatic-speech-recognition',
      'text-to-speech': 'text-to-audio',
      embeddings: 'feature-extraction',
    }));
  var hE = class {
      put(e) {
        throw Error('Not implemented');
      }
      end() {
        throw Error('Not implemented');
      }
    },
    fE = dr.IS_PROCESS_AVAILABLE
      ? e => process.stdout.write(e)
      : e => console.log(e),
    _E = class extends hE {
      constructor(
        e,
        {
          skip_prompt: t = !1,
          callback_function: n = null,
          token_callback_function: r = null,
          skip_special_tokens: s = !0,
          decode_kwargs: a = {},
          ...o
        } = {}
      ) {
        (super(),
          (this.tokenizer = e),
          (this.skip_prompt = t),
          (this.callback_function = n ?? fE),
          (this.token_callback_function = r),
          (this.decode_kwargs = { skip_special_tokens: s, ...a, ...o }),
          (this.token_cache = []),
          (this.print_len = 0),
          (this.next_tokens_are_prompt = !0),
          (this.special_ids = new Set(
            this.tokenizer.all_special_ids.map(BigInt)
          )));
      }
      put(e) {
        if (e.length > 1)
          throw Error('TextStreamer only supports batch size of 1');
        const t = this.next_tokens_are_prompt;
        if (t && ((this.next_tokens_are_prompt = !1), this.skip_prompt)) return;
        const n = e[0];
        if (
          (this.token_callback_function?.(n),
          1 === n.length && this.special_ids.has(n[0]))
        ) {
          if (this.decode_kwargs.skip_special_tokens) return;
          if (this.token_cache.length > 0) {
            const e = this.tokenizer
              .decode(this.token_cache, this.decode_kwargs)
              .slice(this.print_len);
            (this.on_finalized_text(e, !1),
              (this.token_cache = []),
              (this.print_len = 0));
          }
          const e = this.tokenizer.decode(n, this.decode_kwargs);
          return void this.on_finalized_text(e, !1);
        }
        this.token_cache = Er(this.token_cache, n);
        const r = this.tokenizer.decode(this.token_cache, this.decode_kwargs);
        let s;
        var a;
        (t || r.endsWith('\n')
          ? ((s = r.slice(this.print_len)),
            (this.token_cache = []),
            (this.print_len = 0))
          : r.length > 0 &&
              (((a = r.charCodeAt(r.length - 1)) >= 19968 && a <= 40959) ||
                (a >= 13312 && a <= 19903) ||
                (a >= 131072 && a <= 173791) ||
                (a >= 173824 && a <= 177983) ||
                (a >= 177984 && a <= 178207) ||
                (a >= 178208 && a <= 183983) ||
                (a >= 63744 && a <= 64255) ||
                (a >= 194560 && a <= 195103))
            ? ((s = r.slice(this.print_len)), (this.print_len += s.length))
            : ((s = r.slice(this.print_len, r.lastIndexOf(' ') + 1)),
              (this.print_len += s.length)),
          this.on_finalized_text(s, !1));
      }
      end() {
        let e;
        (this.token_cache.length > 0
          ? ((e = this.tokenizer
              .decode(this.token_cache, this.decode_kwargs)
              .slice(this.print_len)),
            (this.token_cache = []),
            (this.print_len = 0))
          : (e = ''),
          (this.next_tokens_are_prompt = !0),
          this.on_finalized_text(e, !0));
      }
      on_finalized_text(e, t) {
        (e.length > 0 && this.callback_function?.(e),
          t &&
            this.callback_function === fE &&
            dr.IS_PROCESS_AVAILABLE &&
            this.callback_function?.('\n'));
      }
    };
  function mE(e) {
    return (
      (mE =
        'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
          ? function (e) {
              return typeof e;
            }
          : function (e) {
              return e &&
                'function' == typeof Symbol &&
                e.constructor === Symbol &&
                e !== Symbol.prototype
                ? 'symbol'
                : typeof e;
            }),
      mE(e)
    );
  }
  function gE(e, t) {
    var n = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var r = Object.getOwnPropertySymbols(e);
      (t &&
        (r = r.filter(function (t) {
          return Object.getOwnPropertyDescriptor(e, t).enumerable;
        })),
        n.push.apply(n, r));
    }
    return n;
  }
  function wE(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = null != arguments[t] ? arguments[t] : {};
      t % 2
        ? gE(Object(n), !0).forEach(function (t) {
            AE(e, t, n[t]);
          })
        : Object.getOwnPropertyDescriptors
          ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
          : gE(Object(n)).forEach(function (t) {
              Object.defineProperty(
                e,
                t,
                Object.getOwnPropertyDescriptor(n, t)
              );
            });
    }
    return e;
  }
  function yE(e) {
    return (
      (function (e) {
        if (Array.isArray(e)) return xE(e);
      })(e) ||
      (function (e) {
        if (
          ('undefined' != typeof Symbol && null != e[Symbol.iterator]) ||
          null != e['@@iterator']
        )
          return Array.from(e);
      })(e) ||
      vE(e) ||
      (function () {
        throw new TypeError(
          'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
        );
      })()
    );
  }
  function bE(e, t) {
    return (
      (function (e) {
        if (Array.isArray(e)) return e;
      })(e) ||
      (function (e, t) {
        var n =
          null == e
            ? null
            : ('undefined' != typeof Symbol && e[Symbol.iterator]) ||
              e['@@iterator'];
        if (null != n) {
          var r,
            s,
            a,
            o,
            i = [],
            l = !0,
            c = !1;
          try {
            if (((a = (n = n.call(e)).next), 0 === t)) {
              if (Object(n) !== n) return;
              l = !1;
            } else
              for (
                ;
                !(l = (r = a.call(n)).done) &&
                (i.push(r.value), i.length !== t);
                l = !0
              );
          } catch (e) {
            ((c = !0), (s = e));
          } finally {
            try {
              if (!l && null != n.return && ((o = n.return()), Object(o) !== o))
                return;
            } finally {
              if (c) throw s;
            }
          }
          return i;
        }
      })(e, t) ||
      vE(e, t) ||
      (function () {
        throw new TypeError(
          'Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
        );
      })()
    );
  }
  function vE(e, t) {
    if (e) {
      if ('string' == typeof e) return xE(e, t);
      var n = {}.toString.call(e).slice(8, -1);
      return (
        'Object' === n && e.constructor && (n = e.constructor.name),
        'Map' === n || 'Set' === n
          ? Array.from(e)
          : 'Arguments' === n ||
              /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
            ? xE(e, t)
            : void 0
      );
    }
  }
  function xE(e, t) {
    (null == t || t > e.length) && (t = e.length);
    for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
    return r;
  }
  function ME() {
    var e,
      t,
      n = 'function' == typeof Symbol ? Symbol : {},
      r = n.iterator || '@@iterator',
      s = n.toStringTag || '@@toStringTag';
    function a(n, r, s, a) {
      var l = r && r.prototype instanceof i ? r : i,
        c = Object.create(l.prototype);
      return (
        kE(
          c,
          '_invoke',
          (function (n, r, s) {
            var a,
              i,
              l,
              c = 0,
              u = s || [],
              d = !1,
              p = {
                p: 0,
                n: 0,
                v: e,
                a: h,
                f: h.bind(e, 4),
                d: function (t, n) {
                  return ((a = t), (i = 0), (l = e), (p.n = n), o);
                },
              };
            function h(n, r) {
              for (i = n, l = r, t = 0; !d && c && !s && t < u.length; t++) {
                var s,
                  a = u[t],
                  h = p.p,
                  f = a[2];
                n > 3
                  ? (s = f === r) &&
                    ((l = a[(i = a[4]) ? 5 : ((i = 3), 3)]), (a[4] = a[5] = e))
                  : a[0] <= h &&
                    ((s = n < 2 && h < a[1])
                      ? ((i = 0), (p.v = r), (p.n = a[1]))
                      : h < f &&
                        (s = n < 3 || a[0] > r || r > f) &&
                        ((a[4] = n), (a[5] = r), (p.n = f), (i = 0)));
              }
              if (s || n > 1) return o;
              throw ((d = !0), r);
            }
            return function (s, u, f) {
              if (c > 1) throw TypeError('Generator is already running');
              for (
                d && 1 === u && h(u, f), i = u, l = f;
                (t = i < 2 ? e : l) || !d;

              ) {
                a ||
                  (i
                    ? i < 3
                      ? (i > 1 && (p.n = -1), h(i, l))
                      : (p.n = l)
                    : (p.v = l));
                try {
                  if (((c = 2), a)) {
                    if ((i || (s = 'next'), (t = a[s]))) {
                      if (!(t = t.call(a, l)))
                        throw TypeError('iterator result is not an object');
                      if (!t.done) return t;
                      ((l = t.value), i < 2 && (i = 0));
                    } else
                      (1 === i && (t = a.return) && t.call(a),
                        i < 2 &&
                          ((l = TypeError(
                            "The iterator does not provide a '" + s + "' method"
                          )),
                          (i = 1)));
                    a = e;
                  } else if ((t = (d = p.n < 0) ? l : n.call(r, p)) !== o)
                    break;
                } catch (t) {
                  ((a = e), (i = 1), (l = t));
                } finally {
                  c = 1;
                }
              }
              return { value: t, done: d };
            };
          })(n, s, a),
          !0
        ),
        c
      );
    }
    var o = {};
    function i() {}
    function l() {}
    function c() {}
    t = Object.getPrototypeOf;
    var u = [][r]
        ? t(t([][r]()))
        : (kE((t = {}), r, function () {
            return this;
          }),
          t),
      d = (c.prototype = i.prototype = Object.create(u));
    function p(e) {
      return (
        Object.setPrototypeOf
          ? Object.setPrototypeOf(e, c)
          : ((e.__proto__ = c), kE(e, s, 'GeneratorFunction')),
        (e.prototype = Object.create(d)),
        e
      );
    }
    return (
      (l.prototype = c),
      kE(d, 'constructor', c),
      kE(c, 'constructor', l),
      (l.displayName = 'GeneratorFunction'),
      kE(c, s, 'GeneratorFunction'),
      kE(d),
      kE(d, s, 'Generator'),
      kE(d, r, function () {
        return this;
      }),
      kE(d, 'toString', function () {
        return '[object Generator]';
      }),
      (ME = function () {
        return { w: a, m: p };
      })()
    );
  }
  function kE(e, t, n, r) {
    var s = Object.defineProperty;
    try {
      s({}, '', {});
    } catch (e) {
      s = 0;
    }
    ((kE = function (e, t, n, r) {
      function a(t, n) {
        kE(e, t, function (e) {
          return this._invoke(t, n, e);
        });
      }
      t
        ? s
          ? s(e, t, {
              value: n,
              enumerable: !r,
              configurable: !r,
              writable: !r,
            })
          : (e[t] = n)
        : (a('next', 0), a('throw', 1), a('return', 2));
    }),
      kE(e, t, n, r));
  }
  function EE(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];
      ((r.enumerable = r.enumerable || !1),
        (r.configurable = !0),
        'value' in r && (r.writable = !0),
        Object.defineProperty(e, TE(r.key), r));
    }
  }
  function AE(e, t, n) {
    return (
      (t = TE(t)) in e
        ? Object.defineProperty(e, t, {
            value: n,
            enumerable: !0,
            configurable: !0,
            writable: !0,
          })
        : (e[t] = n),
      e
    );
  }
  function TE(e) {
    var t = (function (e) {
      if ('object' != mE(e) || !e) return e;
      var t = e[Symbol.toPrimitive];
      if (void 0 !== t) {
        var n = t.call(e, 'string');
        if ('object' != mE(n)) return n;
        throw new TypeError('@@toPrimitive must return a primitive value.');
      }
      return String(e);
    })(e);
    return 'symbol' == mE(t) ? t : t + '';
  }
  function CE(e, t, n, r, s, a, o) {
    try {
      var i = e[a](o),
        l = i.value;
    } catch (e) {
      return void n(e);
    }
    i.done ? t(l) : Promise.resolve(l).then(r, s);
  }
  function SE(e) {
    return function () {
      var t = this,
        n = arguments;
      return new Promise(function (r, s) {
        var a = e.apply(t, n);
        function o(e) {
          CE(a, r, s, o, i, 'next', e);
        }
        function i(e) {
          CE(a, r, s, o, i, 'throw', e);
        }
        o(void 0);
      });
    };
  }
  br.useBrowserCache = !1;
  try {
    var PE =
      'undefined' != typeof self && !(!self || !self.crossOriginIsolated);
    ((br.backends = br.backends || {}),
      (br.backends.onnx = br.backends.onnx || {}),
      (br.backends.onnx.wasm = br.backends.onnx.wasm || {}),
      br.backends.onnx.wasm.wasmPaths ||
        (br.backends.onnx.wasm.wasmPaths =
          'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'),
      (br.backends.onnx.wasm.simd = !0),
      PE ||
        ((br.backends.onnx.wasm.numThreads = 1),
        (br.backends.onnx.wasm.proxy = !1)));
  } catch (e) {}
  function FE() {
    return IE.apply(this, arguments);
  }
  function IE() {
    return (IE = SE(
      ME().m(function e() {
        var t;
        return ME().w(
          function (e) {
            for (;;)
              switch ((e.p = e.n)) {
                case 0:
                  if (((e.p = 0), navigator.gpu)) {
                    e.n = 1;
                    break;
                  }
                  return e.a(2, !1);
                case 1:
                  return ((e.n = 2), navigator.gpu.requestAdapter());
                case 2:
                  return ((t = e.v), e.a(2, null !== t));
                case 3:
                  return ((e.p = 3), e.v, e.a(2, !1));
              }
          },
          e,
          null,
          [[0, 3]]
        );
      })
    )).apply(this, arguments);
  }
  var OE = (function () {
    return (
      (e = function e() {
        !(function (e, t) {
          if (!(e instanceof t))
            throw new TypeError('Cannot call a class as a function');
        })(this, e);
      }),
      (t = [
        {
          key: 'getInstance',
          value:
            ((n = SE(
              ME().m(function e(t) {
                var n,
                  r,
                  s,
                  a,
                  o,
                  i,
                  l,
                  c,
                  u,
                  d,
                  p = arguments;
                return ME().w(
                  function (e) {
                    for (;;)
                      switch ((e.p = e.n)) {
                        case 0:
                          if (
                            ((n =
                              p.length > 1 && void 0 !== p[1] ? p[1] : null),
                            (r = p.length > 2 && void 0 !== p[2] ? p[2] : null),
                            !(s = this.modelCache.get(t)))
                          ) {
                            e.n = 1;
                            break;
                          }
                          return (
                            (this.currentModelId = t),
                            e.a(2, [s.tokenizer, s.model])
                          );
                        case 1:
                          if (
                            ((a = Zl.from_pretrained(t, {
                              progress_callback: n,
                            })),
                            !r)
                          ) {
                            e.n = 2;
                            break;
                          }
                          ((d = 'webgpu' === r), (e.n = 4));
                          break;
                        case 2:
                          return ((e.n = 3), FE());
                        case 3:
                          d = e.v;
                        case 4:
                          return (
                            (o = d),
                            (e.p = 5),
                            (e.n = 6),
                            tE.from_pretrained(t, {
                              dtype: o ? 'q4f16' : 'auto',
                              device: o ? 'webgpu' : 'wasm',
                              progress_callback: n,
                            })
                          );
                        case 6:
                          ((i = e.v), (l = o ? 'webgpu' : 'wasm'), (e.n = 9));
                          break;
                        case 7:
                          return (
                            (e.p = 7),
                            e.v,
                            (e.n = 8),
                            tE.from_pretrained(t, {
                              dtype: 'auto',
                              device: 'wasm',
                              progress_callback: n,
                            })
                          );
                        case 8:
                          ((i = e.v), (l = 'wasm'));
                        case 9:
                          return ((e.n = 10), a);
                        case 10:
                          return ((c = e.v), (e.n = 11), i);
                        case 11:
                          return (
                            (u = e.v),
                            this.modelCache.set(t, {
                              tokenizer: c,
                              model: u,
                              device: l,
                            }),
                            (this.currentModelId = t),
                            e.a(2, [c, u])
                          );
                      }
                  },
                  e,
                  this,
                  [[5, 7]]
                );
              })
            )),
            function (e) {
              return n.apply(this, arguments);
            }),
        },
        {
          key: 'reset',
          value: function () {
            var e =
              arguments.length > 0 && void 0 !== arguments[0]
                ? arguments[0]
                : null;
            e
              ? (this.modelCache.delete(e),
                this.currentModelId === e && (this.currentModelId = null))
              : (this.modelCache.clear(), (this.currentModelId = null));
          },
        },
        {
          key: 'getCachedModels',
          value: function () {
            return Array.from(this.modelCache.keys());
          },
        },
        {
          key: 'isModelCached',
          value: function (e) {
            return this.modelCache.has(e);
          },
        },
      ]),
      t && EE(e, t),
      Object.defineProperty(e, 'prototype', { writable: !1 }),
      e
    );
    var e, t, n;
  })();
  (AE(OE, 'modelCache', new Map()), AE(OE, 'currentModelId', null));
  var LE = new (class extends vp {
      constructor() {
        (super(), (this.interrupted = !1));
      }
      interrupt() {
        this.interrupted = !0;
      }
      reset() {
        this.interrupted = !1;
      }
      _call(e, t) {
        return new Array(e.length).fill(this.interrupted);
      }
    })(),
    zE = null;
  function NE(e) {
    return BE.apply(this, arguments);
  }
  function BE() {
    return (BE = SE(
      ME().m(function e(t) {
        var n,
          r,
          s,
          a,
          o,
          i,
          l,
          c,
          u,
          d,
          p,
          h,
          f,
          _,
          m,
          g,
          w,
          y,
          b,
          v,
          x,
          M,
          k,
          E,
          A,
          T,
          C,
          S,
          P,
          F,
          I,
          O,
          L,
          z,
          N,
          B,
          $,
          D,
          R,
          U,
          G,
          V,
          j,
          W,
          q,
          H,
          Q,
          X;
        return ME().w(
          function (e) {
            for (;;)
              switch ((e.p = e.n)) {
                case 0:
                  return (
                    (n = t.messages),
                    (r = t.reasonEnabled),
                    (s = void 0 !== r && r),
                    (a = t.systemPrompt),
                    (o = void 0 === a ? null : a),
                    (i = t.generationConfig),
                    (l = void 0 === i ? {} : i),
                    (e.p = 1),
                    'undefined' != typeof self &&
                      self.CHAT_DEBUG &&
                      console.log(
                        '[worker] Generate with thinking enabled:',
                        s
                      ),
                    (c =
                      OE.currentModelId ||
                      'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'),
                    (e.n = 2),
                    OE.getInstance(c)
                  );
                case 2:
                  ((u = e.v),
                    (d = bE(u, 2)),
                    (p = d[0]),
                    (h = d[1]),
                    (f = yE(n)),
                    o &&
                      (f = f.filter(function (e) {
                        return 'system' !== e.role;
                      })).unshift({ role: 'system', content: o }),
                    (f = f.filter(function (e) {
                      return (
                        e &&
                        'string' == typeof e.content &&
                        e.content.trim().length > 0 &&
                        ['system', 'user', 'assistant'].includes(e.role)
                      );
                    })),
                    'undefined' != typeof self &&
                      self.CHAT_DEBUG &&
                      (console.log(
                        '[worker] Processed messages for chat template:',
                        f
                      ),
                      console.log('[worker] System prompt present:', !!o),
                      console.log('[worker] Thinking enabled:', s)),
                    (e.p = 3),
                    (_ = p.apply_chat_template(f, {
                      add_generation_prompt: !0,
                      return_dict: !0,
                      enable_thinking: s,
                      add_special_tokens: !1,
                    })),
                    'undefined' != typeof self &&
                      self.CHAT_DEBUG &&
                      console.log(
                        '[worker] Chat template applied successfully'
                      ),
                    (e.n = 7));
                  break;
                case 4:
                  ((e.p = 4),
                    e.v,
                    (e.p = 5),
                    (_ = p.apply_chat_template(f, {
                      add_generation_prompt: !0,
                      return_dict: !0,
                      add_special_tokens: !1,
                    })),
                    (e.n = 7));
                  break;
                case 6:
                  throw (
                    (e.p = 6),
                    (H = e.v),
                    new Error('Failed to apply chat template: ' + H.message)
                  );
                case 7:
                  if (((m = null), (g = null), s))
                    try {
                      ((w = p.encode('<think></think>', {
                        add_special_tokens: !1,
                      })),
                        (m = w[0]),
                        (g = w[1]));
                    } catch (e) {}
                  return (
                    (b = 0),
                    (v = 0),
                    (x = 'answering'),
                    (M = function (e) {
                      if (
                        (null != y || (y = performance.now()),
                        b++ > 0 && (v = (b / (performance.now() - y)) * 1e3),
                        s && e && e.length > 0)
                      ) {
                        var t = Number(e[0]);
                        t === m
                          ? ((x = 'thinking'),
                            'undefined' != typeof self &&
                              self.CHAT_DEBUG &&
                              console.log(
                                '[worker] Switched to thinking state'
                              ))
                          : t === g &&
                            ((x = 'answering'),
                            'undefined' != typeof self &&
                              self.CHAT_DEBUG &&
                              console.log(
                                '[worker] Switched to answering state'
                              ));
                      }
                    }),
                    (k = new _E(p, {
                      skip_prompt: !0,
                      skip_special_tokens: !0,
                      callback_function: function (e) {
                        self.postMessage({
                          status: 'update',
                          output: e,
                          tps: v,
                          numTokens: b,
                          state: s ? x : 'answering',
                        });
                      },
                      token_callback_function: M,
                    })),
                    self.postMessage({ status: 'start' }),
                    (e.p = 8),
                    (e.n = 9),
                    h.generate(
                      wE(
                        wE({}, _),
                        {},
                        {
                          past_key_values: zE,
                          do_sample: 'wasm' !== OE.device,
                          top_k:
                            'wasm' === OE.device
                              ? (null === (T = l.topK) || void 0 === T
                                  ? void 0
                                  : T.wasm) || 20
                              : s
                                ? (null === (C = l.topK) || void 0 === C
                                    ? void 0
                                    : C.thinking) || 20
                                : (null === (S = l.topK) || void 0 === S
                                    ? void 0
                                    : S.default) || 40,
                          temperature:
                            'wasm' === OE.device
                              ? (null === (P = l.temperature) || void 0 === P
                                  ? void 0
                                  : P.wasm) || 0
                              : s
                                ? (null === (F = l.temperature) || void 0 === F
                                    ? void 0
                                    : F.thinking) || 0.6
                                : (null === (I = l.temperature) || void 0 === I
                                    ? void 0
                                    : I.default) || 0.7,
                          repetition_penalty: l.repetitionPenalty || 1.05,
                          max_new_tokens:
                            'wasm' === OE.device
                              ? s
                                ? (null === (O = l.maxTokens) || void 0 === O
                                    ? void 0
                                    : O.wasmThinking) || 192
                                : (null === (L = l.maxTokens) || void 0 === L
                                    ? void 0
                                    : L.wasm) || 96
                              : s
                                ? (null === (z = l.maxTokens) || void 0 === z
                                    ? void 0
                                    : z.thinking) || 1024
                                : (null === (N = l.maxTokens) || void 0 === N
                                    ? void 0
                                    : N.default) || 512,
                          streamer: k,
                          stopping_criteria: LE,
                          return_dict_in_generate: !0,
                        }
                      )
                    )
                  );
                case 9:
                  ((B = e.v),
                    (E = B.past_key_values),
                    (A = B.sequences),
                    (e.n = 14));
                  break;
                case 10:
                  if (((e.p = 10), (Q = e.v), 'webgpu' !== OE.device)) {
                    e.n = 13;
                    break;
                  }
                  return (
                    self.postMessage({
                      status: 'loading',
                      data: 'WebGPU failed during generation. Falling back to WASM...',
                    }),
                    OE.reset(),
                    (e.n = 11),
                    OE.getInstance(null, 'wasm')
                  );
                case 11:
                  return (
                    (G = e.v),
                    (V = bE(G, 2)),
                    (j = V[1]),
                    (e.n = 12),
                    j.generate(
                      wE(
                        wE({}, _),
                        {},
                        {
                          past_key_values: null,
                          do_sample: !1,
                          top_k:
                            (null === ($ = l.topK) || void 0 === $
                              ? void 0
                              : $.wasm) || 20,
                          temperature:
                            (null === (D = l.temperature) || void 0 === D
                              ? void 0
                              : D.wasm) || 0,
                          repetition_penalty: l.repetitionPenalty || 1.05,
                          max_new_tokens: s
                            ? (null === (R = l.maxTokens) || void 0 === R
                                ? void 0
                                : R.wasmThinking) || 192
                            : (null === (U = l.maxTokens) || void 0 === U
                                ? void 0
                                : U.wasm) || 96,
                          streamer: k,
                          stopping_criteria: LE,
                          return_dict_in_generate: !0,
                        }
                      )
                    )
                  );
                case 12:
                  ((W = e.v),
                    (E = W.past_key_values),
                    (A = W.sequences),
                    (e.n = 14));
                  break;
                case 13:
                  throw Q;
                case 14:
                  ((zE = E),
                    (q = p.batch_decode(A, { skip_special_tokens: !0 })),
                    self.postMessage({
                      status: 'complete',
                      output: q,
                      state: s ? x : 'answering',
                    }),
                    (e.n = 16));
                  break;
                case 15:
                  ((e.p = 15),
                    (X = e.v),
                    self.postMessage({
                      status: 'error',
                      data: X.message || 'Generation failed',
                    }));
                case 16:
                  return e.a(2);
              }
          },
          e,
          null,
          [
            [8, 10],
            [5, 6],
            [3, 4],
            [1, 15],
          ]
        );
      })
    )).apply(this, arguments);
  }
  function $E() {
    return DE.apply(this, arguments);
  }
  function DE() {
    return (DE = SE(
      ME().m(function e() {
        var t, n, r, s, a, o, i, l, c, u;
        return ME().w(
          function (e) {
            for (;;)
              switch ((e.p = e.n)) {
                case 0:
                  return ((e.p = 0), (e.n = 1), FE());
                case 1:
                  return (
                    (t = e.v),
                    self.postMessage({
                      status: 'loading',
                      data: t
                        ? 'Loading model on WebGPU...'
                        : 'WebGPU not available. Loading WASM backend...',
                    }),
                    self.postMessage({
                      status: 'initiate',
                      file: 'tokenizer.json',
                      loaded: 0,
                      total: 1,
                    }),
                    self.postMessage({
                      status: 'initiate',
                      file: 'model.onnx',
                      loaded: 0,
                      total: 1,
                    }),
                    (e.n = 2),
                    OE.getInstance(
                      'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
                      function (e) {
                        if (
                          e &&
                          'number' == typeof e.loaded &&
                          'number' == typeof e.total
                        ) {
                          var t = e.file || 'model',
                            n = 'progress';
                          ('initiate' === e.status
                            ? (n = 'initiate')
                            : e.loaded === e.total && (n = 'done'),
                            self.postMessage({
                              status: n,
                              file: t,
                              loaded: e.loaded,
                              total: e.total,
                              progress:
                                'number' == typeof e.progress
                                  ? e.progress
                                  : void 0,
                            }));
                        }
                      }
                    )
                  );
                case 2:
                  return (
                    (n = e.v),
                    (r = bE(n, 2)),
                    (s = r[0]),
                    (a = r[1]),
                    self.postMessage({
                      status: 'loading',
                      data:
                        'webgpu' === OE.device
                          ? 'Compiling shaders and warming up model...'
                          : 'Warming up WASM backend for generation...',
                    }),
                    (o = s('Hello')),
                    (e.p = 3),
                    (e.n = 4),
                    a.generate(
                      wE(wE({}, o), {}, { max_new_tokens: 1, do_sample: !1 })
                    )
                  );
                case 4:
                  e.n = 7;
                  break;
                case 5:
                  return (
                    (e.p = 5),
                    e.v,
                    self.postMessage({
                      status: 'loading',
                      data: 'WebGPU warmup failed. Falling back to WASM...',
                    }),
                    OE.reset(),
                    (e.n = 6),
                    OE.getInstance(null, 'wasm')
                  );
                case 6:
                  return (
                    (i = e.v),
                    (l = bE(i, 2)),
                    (c = l[1]),
                    (e.n = 7),
                    c.generate(
                      wE(wE({}, o), {}, { max_new_tokens: 1, do_sample: !1 })
                    )
                  );
                case 7:
                  (self.postMessage({ status: 'ready' }), (e.n = 9));
                  break;
                case 8:
                  ((e.p = 8),
                    (u = e.v),
                    console.error('[chat-worker] Model loading error:', u),
                    self.postMessage({
                      status: 'error',
                      data: u.message || u.toString() || 'Failed to load model',
                    }));
                case 9:
                  return e.a(2);
              }
          },
          e,
          null,
          [
            [3, 5],
            [0, 8],
          ]
        );
      })
    )).apply(this, arguments);
  }
  function RE() {
    ((zE = null), LE.reset(), self.postMessage({ status: 'reset_complete' }));
  }
  (self.addEventListener(
    'message',
    (function () {
      var e = SE(
        ME().m(function e(t) {
          var n, r, s, a, o, i, l;
          return ME().w(
            function (e) {
              for (;;)
                switch ((e.p = e.n)) {
                  case 0:
                    ((n = t.data), (r = n.type), (s = n.data));
                    try {
                      self &&
                        (self.CHAT_DEBUG ||
                          ('undefined' != typeof window &&
                            window.CHAT_DEBUG)) &&
                        console.log('[chat-worker] message', r);
                    } catch (e) {}
                    ((e.p = 1),
                      (i = r),
                      (e.n =
                        'check' === i
                          ? 2
                          : 'load' === i
                            ? 4
                            : 'generate' === i
                              ? 6
                              : 'interrupt' === i
                                ? 8
                                : 'reset' === i
                                  ? 9
                                  : 10));
                    break;
                  case 2:
                    return ((e.n = 3), FE());
                  case 3:
                    return (
                      (a = e.v),
                      self.postMessage({
                        status: 'check_complete',
                        webGPUSupported: a,
                      }),
                      e.a(3, 11)
                    );
                  case 4:
                    return (
                      (o =
                        (null == s ? void 0 : s.modelId) ||
                        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'),
                      (e.n = 5),
                      $E(o)
                    );
                  case 5:
                    return e.a(3, 11);
                  case 6:
                    return (LE.reset(), (e.n = 7), NE(s));
                  case 7:
                    return e.a(3, 11);
                  case 8:
                    return (
                      LE.interrupt(),
                      self.postMessage({ status: 'interrupted' }),
                      e.a(3, 11)
                    );
                  case 9:
                    return (RE(), e.a(3, 11));
                  case 10:
                    self.postMessage({
                      status: 'error',
                      data: 'Unknown message type: '.concat(r),
                    });
                  case 11:
                    e.n = 13;
                    break;
                  case 12:
                    ((e.p = 12),
                      (l = e.v),
                      self.postMessage({
                        status: 'error',
                        data: l.message || 'Worker operation failed',
                      }));
                  case 13:
                    return e.a(2);
                }
            },
            e,
            null,
            [[1, 12]]
          );
        })
      );
      return function (t) {
        return e.apply(this, arguments);
      };
    })()
  ),
    self.addEventListener('error', function (e) {
      var t;
      self.postMessage({
        status: 'error',
        data:
          (null === (t = e.error) || void 0 === t ? void 0 : t.message) ||
          'Worker encountered an error',
      });
    }),
    self.addEventListener('unhandledrejection', function (e) {
      var t;
      (self.postMessage({
        status: 'error',
        data:
          (null === (t = e.reason) || void 0 === t ? void 0 : t.message) ||
          'Worker promise rejection',
      }),
        e.preventDefault());
    }));
})();
