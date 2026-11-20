// Minimal VST3 editor host, written against the published VST3 ABI (C++ vtables,
// non-COM UID byte order on macOS). Only what is needed to show a plugin's editor.

#include "plughost.h"

#include <CoreFoundation/CoreFoundation.h>
#include <signal.h>
#include <stdint.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef int32_t tresult;
enum { kResultOk = 0, kResultFalse = 1, kInvalidArgument = 2, kNotImplemented = 3, kNoInterface = -1 };

#define UIDB(x) (uint8_t)(((uint32_t)(x)) >> 24), (uint8_t)(((uint32_t)(x)) >> 16), (uint8_t)(((uint32_t)(x)) >> 8), (uint8_t)(x)
#define UID(a, b, c, d) { UIDB(a), UIDB(b), UIDB(c), UIDB(d) }

static const uint8_t IID_FUnknown[16] = UID(0x00000000, 0x00000000, 0xC0000000, 0x00000046);
static const uint8_t IID_IComponent[16] = UID(0xE831FF31, 0xF2D54301, 0x928EBBEE, 0x25697802);
static const uint8_t IID_IEditController[16] = UID(0xDCD7BBE3, 0x7742448D, 0xA874AACC, 0x979C759E);
static const uint8_t IID_IPlugFrame[16] = UID(0x367FAF01, 0xAFA94693, 0x8D4DA2A0, 0xED0882A3);
static const uint8_t IID_IHostApplication[16] = UID(0x58E595CC, 0xDB2D4969, 0x8B6AAF8C, 0x36A664E5);
static const uint8_t IID_IComponentHandler[16] = UID(0x93A0BEA3, 0x0BD045DB, 0x8E890B0C, 0xC1E46AC6);
static const uint8_t IID_IConnectionPoint[16] = UID(0x70A4156F, 0x6E6E4026, 0x989148BF, 0xAA60D8D1);
static const uint8_t IID_IBStream[16] = UID(0xC3BF6EA2, 0x30994752, 0x9B6BF990, 0x1EE33E9B);
static const uint8_t IID_IMessage[16] = UID(0x936F033B, 0xC6C047DB, 0xBB0882F8, 0x13C1E613);
static const uint8_t IID_IAttributeList[16] = UID(0x1E5F0AEB, 0xCC7F4533, 0xA2544011, 0x38AD5EE4);

static int same(const uint8_t *a, const uint8_t *b) { return memcmp(a, b, 16) == 0; }

#define VT(o) (*(void ***)(o))
typedef tresult (*f_qi)(void *, const uint8_t *, void **);
typedef uint32_t (*f_ref)(void *);
static tresult QI(void *o, const uint8_t *iid, void **out) { *out = NULL; return ((f_qi)VT(o)[0])(o, iid, out); }

typedef struct { uint8_t cid[16]; int32_t cardinality; char category[32]; char name[64]; } PClassInfo;
typedef struct { int32_t left, top, right, bottom; } ViewRect;

static ph_resize_fn g_resize = NULL;
void ph_set_resize_callback(ph_resize_fn fn) { g_resize = fn; }
ph_resize_fn ph_get_resize(void) { return g_resize; }

static void seterr(char *err, int len, const char *msg) {
    if (err && len > 0) { strncpy(err, msg, (size_t)len - 1); err[len - 1] = 0; }
}

/* ---------------------------------------------------------------- host objects */

// Every host object starts with its vtable pointer, like a C++ object.
typedef struct { void **vt; } HostObj;

static uint32_t h_addref(void *s) { (void)s; return 1; }
static uint32_t h_release(void *s) { (void)s; return 1; }

// IAttributeList: a small key/value store, so plugins can pass data between their two halves
// (some send pointers or state this way and rely on getting it back).
typedef struct {
    char key[128];
    int type;                  // 1 int, 2 float, 3 string, 4 binary
    int64_t i;
    double f;
    void *data;                // string (UTF-16, 0-terminated) or binary
    uint32_t size;             // bytes
} AttrEntry;
typedef struct { void **vt; int32_t refs; AttrEntry *e; int count, cap; } AttrList;

static AttrEntry *al_slot(AttrList *l, const char *id, int create) {
    if (!id) return NULL;
    for (int k = 0; k < l->count; k++) if (strncmp(l->e[k].key, id, sizeof l->e[k].key) == 0) return &l->e[k];
    if (!create) return NULL;
    if (l->count == l->cap) {
        int cap = l->cap ? l->cap * 2 : 8;
        AttrEntry *n = realloc(l->e, (size_t)cap * sizeof(AttrEntry));
        if (!n) return NULL;
        l->e = n; l->cap = cap;
    }
    AttrEntry *a = &l->e[l->count++];
    memset(a, 0, sizeof *a);
    strncpy(a->key, id, sizeof a->key - 1);
    return a;
}
static void al_clear(AttrEntry *a) { free(a->data); a->data = NULL; a->size = 0; }

static tresult al_qi(void *s, const uint8_t *iid, void **o) {
    if (same(iid, IID_FUnknown) || same(iid, IID_IAttributeList)) { ((AttrList *)s)->refs++; *o = s; return kResultOk; }
    *o = NULL; return kNoInterface;
}
static uint32_t al_addref(void *s) { return (uint32_t)++((AttrList *)s)->refs; }
static uint32_t al_release(void *s) {
    AttrList *l = (AttrList *)s;
    if (--l->refs > 0) return (uint32_t)l->refs;
    for (int k = 0; k < l->count; k++) free(l->e[k].data);
    free(l->e); free(l);
    return 0;
}
static tresult al_setInt(void *s, const char *id, int64_t v) {
    AttrEntry *a = al_slot((AttrList *)s, id, 1); if (!a) return kResultFalse;
    al_clear(a); a->type = 1; a->i = v; return kResultOk;
}
static tresult al_getInt(void *s, const char *id, int64_t *v) {
    AttrEntry *a = al_slot((AttrList *)s, id, 0);
    if (!a || a->type != 1 || !v) return kResultFalse;
    *v = a->i; return kResultOk;
}
static tresult al_setFloat(void *s, const char *id, double v) {
    AttrEntry *a = al_slot((AttrList *)s, id, 1); if (!a) return kResultFalse;
    al_clear(a); a->type = 2; a->f = v; return kResultOk;
}
static tresult al_getFloat(void *s, const char *id, double *v) {
    AttrEntry *a = al_slot((AttrList *)s, id, 0);
    if (!a || a->type != 2 || !v) return kResultFalse;
    *v = a->f; return kResultOk;
}
static tresult al_setString(void *s, const char *id, const uint16_t *v) {
    AttrEntry *a = al_slot((AttrList *)s, id, 1); if (!a) return kResultFalse;
    al_clear(a); a->type = 3;
    uint32_t n = 0; if (v) while (v[n]) n++;
    a->size = (n + 1) * 2; a->data = calloc(n + 1, 2);
    if (v && a->data) memcpy(a->data, v, (size_t)n * 2);
    return kResultOk;
}
static tresult al_getString(void *s, const char *id, uint16_t *v, uint32_t bytes) {
    AttrEntry *a = al_slot((AttrList *)s, id, 0);
    if (!a || a->type != 3 || !v || bytes < 2) return kResultFalse;
    uint32_t n = a->size < bytes ? a->size : bytes;
    memcpy(v, a->data, n);
    v[n / 2 - 1] = 0;
    return kResultOk;
}
static tresult al_setBinary(void *s, const char *id, const void *d, uint32_t n) {
    AttrEntry *a = al_slot((AttrList *)s, id, 1); if (!a) return kResultFalse;
    al_clear(a); a->type = 4;
    a->data = malloc(n ? n : 1); a->size = n;
    if (d && n && a->data) memcpy(a->data, d, n);
    return kResultOk;
}
static tresult al_getBinary(void *s, const char *id, const void **d, uint32_t *n) {
    AttrEntry *a = al_slot((AttrList *)s, id, 0);
    if (!a || a->type != 4 || !d || !n) return kResultFalse;
    *d = a->data; *n = a->size; return kResultOk;
}
static void *al_vt[] = { al_qi, al_addref, al_release, al_setInt, al_getInt, al_setFloat, al_getFloat, al_setString, al_getString, al_setBinary, al_getBinary };
static AttrList *al_new(void) {
    AttrList *l = calloc(1, sizeof(AttrList));
    l->vt = al_vt; l->refs = 1;
    return l;
}

// IMessage, for plugins that ask the host for one to talk between their halves.
// Laid out like the VST3 SDK's HostMessage (vtable, ref count, char* id, attribute list):
// some plugins read those fields directly instead of going through the interface.
typedef struct { void **vt; int32_t refs; char *id; void *attrs; } Message;
static tresult msg_qi(void *s, const uint8_t *iid, void **o) {
    if (same(iid, IID_FUnknown) || same(iid, IID_IMessage)) { ((Message *)s)->refs++; *o = s; return kResultOk; }
    *o = NULL; return kNoInterface;
}
static uint32_t msg_addref(void *s) { return (uint32_t)++((Message *)s)->refs; }
static uint32_t msg_release(void *s) {
    Message *m = (Message *)s;
    if (--m->refs == 0) { free(m->id); if (m->attrs) al_release(m->attrs); free(m); return 0; }
    return (uint32_t)m->refs;
}
static const char *msg_getId(void *s) { return ((Message *)s)->id; }
static void msg_setId(void *s, const char *id) {
    Message *m = (Message *)s;
    free(m->id);
    m->id = id ? strdup(id) : NULL;
}
static void *msg_attrs(void *s) { return ((Message *)s)->attrs; }   // borrowed, like the SDK's
static void *msg_vt[] = { msg_qi, msg_addref, msg_release, msg_getId, msg_setId, msg_attrs };

// IHostApplication
static tresult host_qi(void *s, const uint8_t *iid, void **o) {
    if (same(iid, IID_FUnknown) || same(iid, IID_IHostApplication)) { *o = s; return kResultOk; }
    *o = NULL; return kNoInterface;
}
static tresult host_getName(void *s, uint16_t *name) {
    (void)s;
    const char *n = "PlugShelf";
    int i = 0;
    for (; n[i] && i < 127; i++) name[i] = (uint16_t)n[i];
    name[i] = 0;
    return kResultOk;
}
static tresult host_create(void *s, const uint8_t *cid, const uint8_t *iid, void **o) {
    (void)s;
    if (same(cid, IID_IMessage) && same(iid, IID_IMessage)) {
        Message *m = calloc(1, sizeof(Message));
        m->vt = msg_vt; m->refs = 1; m->attrs = al_new();
        *o = m; return kResultOk;
    }
    if (same(cid, IID_IAttributeList) && same(iid, IID_IAttributeList)) { *o = al_new(); return kResultOk; }
    *o = NULL; return kNotImplemented;
}
static void *host_vt[] = { host_qi, h_addref, h_release, host_getName, host_create };
static HostObj g_host = { host_vt };

// IComponentHandler: parameter edits from the editor go nowhere.
static tresult hd_qi(void *s, const uint8_t *iid, void **o) {
    if (same(iid, IID_FUnknown) || same(iid, IID_IComponentHandler)) { *o = s; return kResultOk; }
    *o = NULL; return kNoInterface;
}
static tresult hd_begin(void *s, uint32_t id) { (void)s; (void)id; return kResultOk; }
static tresult hd_perform(void *s, uint32_t id, double v) { (void)s; (void)id; (void)v; return kResultOk; }
static tresult hd_end(void *s, uint32_t id) { (void)s; (void)id; return kResultOk; }
static tresult hd_restart(void *s, int32_t flags) { (void)s; (void)flags; return kResultOk; }
static void *hd_vt[] = { hd_qi, h_addref, h_release, hd_begin, hd_perform, hd_end, hd_restart };
static HostObj g_handler = { hd_vt };

// IPlugFrame: the editor asks for a new size.
static tresult fr_qi(void *s, const uint8_t *iid, void **o) {
    if (same(iid, IID_FUnknown) || same(iid, IID_IPlugFrame)) { *o = s; return kResultOk; }
    *o = NULL; return kNoInterface;
}
static tresult fr_resize(void *s, void *view, ViewRect *r) {
    (void)s;
    if (!r) return kInvalidArgument;
    if (g_resize) g_resize(r->right - r->left, r->bottom - r->top);
    if (view) ((tresult (*)(void *, ViewRect *))VT(view)[10])(view, r);   // IPlugView::onSize
    return kResultOk;
}
static void *fr_vt[] = { fr_qi, h_addref, h_release, fr_resize };
static HostObj g_frame = { fr_vt };

// IBStream over a growing memory buffer, to hand the component's state to its controller.
typedef struct { void **vt; uint8_t *data; int64_t size, cap, pos; } Stream;
static tresult st_qi(void *s, const uint8_t *iid, void **o) {
    if (same(iid, IID_FUnknown) || same(iid, IID_IBStream)) { *o = s; return kResultOk; }
    *o = NULL; return kNoInterface;
}
static tresult st_read(void *s, void *buf, int32_t n, int32_t *got) {
    Stream *st = (Stream *)s;
    int64_t left = st->size - st->pos;
    int32_t k = (int32_t)(n < left ? n : (left > 0 ? left : 0));
    if (k > 0) memcpy(buf, st->data + st->pos, (size_t)k);
    st->pos += k;
    if (got) *got = k;
    return kResultOk;
}
static tresult st_write(void *s, void *buf, int32_t n, int32_t *put) {
    Stream *st = (Stream *)s;
    if (n < 0) return kInvalidArgument;
    if (st->pos + n > st->cap) {
        int64_t cap = st->cap ? st->cap : 4096;
        while (cap < st->pos + n) cap *= 2;
        uint8_t *d = realloc(st->data, (size_t)cap);
        if (!d) return kResultFalse;
        st->data = d; st->cap = cap;
    }
    memcpy(st->data + st->pos, buf, (size_t)n);
    st->pos += n;
    if (st->pos > st->size) st->size = st->pos;
    if (put) *put = n;
    return kResultOk;
}
static tresult st_seek(void *s, int64_t pos, int32_t mode, int64_t *res) {
    Stream *st = (Stream *)s;
    int64_t p = mode == 0 ? pos : mode == 1 ? st->pos + pos : st->size + pos;
    if (p < 0) p = 0;
    if (p > st->size) p = st->size;
    st->pos = p;
    if (res) *res = p;
    return kResultOk;
}
static tresult st_tell(void *s, int64_t *pos) { if (pos) *pos = ((Stream *)s)->pos; return kResultOk; }
static void *st_vt[] = { st_qi, h_addref, h_release, st_read, st_write, st_seek, st_tell };

/* ---------------------------------------------------------------- the plugin */

typedef struct {
    CFBundleRef bundle;
    void *factory, *component, *controller, *view;
    Stream *state;          // the component's state, as read at load time
    PClassInfo info;        // the class that was created
} V3;

typedef tresult (*f_init)(void *, void *);

void *ph_vst3_load(const char *path, const char *className, int wantView, char *err, int errLen) {
    CFURLRef url = CFURLCreateFromFileSystemRepresentation(NULL, (const UInt8 *)path, (CFIndex)strlen(path), true);
    CFBundleRef bundle = url ? CFBundleCreate(NULL, url) : NULL;
    if (url) CFRelease(url);
    if (!bundle) { seterr(err, errLen, "Cannot read the bundle"); return NULL; }
    CFErrorRef cferr = NULL;
    if (!CFBundleLoadExecutableAndReturnError(bundle, &cferr)) {
        char msg[300] = "Cannot load the binary";
        if (cferr) {
            CFStringRef d = CFErrorCopyDescription(cferr);
            if (d) { CFStringGetCString(d, msg, sizeof msg, kCFStringEncodingUTF8); CFRelease(d); }
            CFRelease(cferr);
        }
        seterr(err, errLen, msg);
        return NULL;
    }
    typedef unsigned char (*Entry)(CFBundleRef);
    Entry entry = (Entry)CFBundleGetFunctionPointerForName(bundle, CFSTR("bundleEntry"));
    if (!entry) entry = (Entry)CFBundleGetFunctionPointerForName(bundle, CFSTR("BundleEntry"));
    if (entry && !entry(bundle)) { seterr(err, errLen, "bundleEntry failed"); return NULL; }
    typedef void *(*GetFactory)(void);
    GetFactory gf = (GetFactory)CFBundleGetFunctionPointerForName(bundle, CFSTR("GetPluginFactory"));
    if (!gf) { seterr(err, errLen, "No VST3 entry point"); return NULL; }
    void *factory = gf();
    if (!factory) { seterr(err, errLen, "The plugin returns no factory"); return NULL; }

    int32_t n = ((int32_t (*)(void *))VT(factory)[4])(factory);
    PClassInfo info, pick;
    int found = 0;
    for (int32_t i = 0; i < n; i++) {
        memset(&info, 0, sizeof info);
        if (((tresult (*)(void *, int32_t, PClassInfo *))VT(factory)[5])(factory, i, &info) != kResultOk) continue;
        if (strncmp(info.category, "Audio Module Class", 32) != 0) continue;
        if (!found) { pick = info; found = 1; }
        if (className && *className && strncmp(info.name, className, 64) == 0) { pick = info; found = 2; break; }
    }
    if (!found) { seterr(err, errLen, "No audio class in the plugin"); return NULL; }

    typedef tresult (*f_create)(void *, const uint8_t *, const uint8_t *, void **);
    f_create create = (f_create)VT(factory)[6];
    void *comp = NULL;
    if (create(factory, pick.cid, IID_IComponent, &comp) != kResultOk || !comp) {
        seterr(err, errLen, "Cannot create the plugin");
        return NULL;
    }
    if (((f_init)VT(comp)[3])(comp, &g_host) != kResultOk) {
        seterr(err, errLen, "The plugin does not start (initialize)");
        return NULL;
    }

    void *ctrl = NULL;
    int single = QI(comp, IID_IEditController, &ctrl) == kResultOk && ctrl;
    if (!single) {
        uint8_t ccid[16];
        if (((tresult (*)(void *, uint8_t *))VT(comp)[5])(comp, ccid) == kResultOk) {
            if (create(factory, ccid, IID_IEditController, &ctrl) == kResultOk && ctrl)
                ((f_init)VT(ctrl)[3])(ctrl, &g_host);
            else ctrl = NULL;
        }
    }
    if (!ctrl) { seterr(err, errLen, "The plugin has no controller"); return NULL; }

    // Link the two halves (some plugins only list their parameters, or draw their editor, once linked).
    if (!single) {
        void *a = NULL, *b = NULL;
        QI(comp, IID_IConnectionPoint, &a);
        QI(ctrl, IID_IConnectionPoint, &b);
        if (a && b) {
            ((tresult (*)(void *, void *))VT(a)[3])(a, b);
            ((tresult (*)(void *, void *))VT(b)[3])(b, a);
        }
    }

    Stream *st = calloc(1, sizeof(Stream));
    st->vt = st_vt;
    if (((tresult (*)(void *, void *))VT(comp)[13])(comp, st) == kResultOk) {   // IComponent::getState
        st->pos = 0;
        ((tresult (*)(void *, void *))VT(ctrl)[5])(ctrl, st);                    // IEditController::setComponentState
    }
    ((tresult (*)(void *, void *))VT(ctrl)[16])(ctrl, &g_handler);                // setComponentHandler

    void *view = NULL;
    if (wantView) {
        view = ((void *(*)(void *, const char *))VT(ctrl)[17])(ctrl, "editor");     // createView
        if (!view) { seterr(err, errLen, "The plugin has no editor window"); return NULL; }
        if (((tresult (*)(void *, const char *))VT(view)[3])(view, "NSView") != kResultOk) {
            seterr(err, errLen, "The editor is not a Mac view (NSView)");
            return NULL;
        }
        ((tresult (*)(void *, void *))VT(view)[12])(view, &g_frame);               // setFrame
    }

    V3 *h = calloc(1, sizeof(V3));
    h->bundle = bundle; h->factory = factory; h->component = comp; h->controller = ctrl; h->view = view;
    h->state = st; h->info = pick;
    return h;
}

int ph_vst3_size(void *handle, int *w, int *hgt) {
    V3 *h = (V3 *)handle;
    ViewRect r = { 0, 0, 0, 0 };
    if (((tresult (*)(void *, ViewRect *))VT(h->view)[9])(h->view, &r) != kResultOk) return 0;
    *w = r.right - r.left;
    *hgt = r.bottom - r.top;
    return *w > 0 && *hgt > 0;
}

int ph_vst3_attach(void *handle, void *nsview, char *err, int errLen) {
    V3 *h = (V3 *)handle;
    if (((tresult (*)(void *, void *, const char *))VT(h->view)[4])(h->view, nsview, "NSView") != kResultOk) {
        seterr(err, errLen, "Cannot open the editor (attached)");
        return 0;
    }
    return 1;
}

/* ---------------------------------------------------------------- parameters */

typedef struct {
    uint32_t id;
    uint16_t title[128], shortTitle[128], units[128];
    int32_t stepCount;
    double defaultNormalizedValue;
    int32_t unitId;
    int32_t flags;
} ParameterInfo;

// UTF-16 (with surrogate pairs) to UTF-8.
static void utf8(const uint16_t *in, int maxIn, char *out, int outLen) {
    int o = 0;
    for (int i = 0; i < maxIn && in[i] && o < outLen - 4; i++) {
        uint32_t c = in[i];
        if (c >= 0xD800 && c < 0xDC00 && i + 1 < maxIn && in[i + 1] >= 0xDC00 && in[i + 1] < 0xE000) {
            c = 0x10000 + ((c - 0xD800) << 10) + (in[i + 1] - 0xDC00); i++;
        }
        if (c < 0x80) out[o++] = (char)c;
        else if (c < 0x800) { out[o++] = (char)(0xC0 | (c >> 6)); out[o++] = (char)(0x80 | (c & 63)); }
        else if (c < 0x10000) { out[o++] = (char)(0xE0 | (c >> 12)); out[o++] = (char)(0x80 | ((c >> 6) & 63)); out[o++] = (char)(0x80 | (c & 63)); }
        else { out[o++] = (char)(0xF0 | (c >> 18)); out[o++] = (char)(0x80 | ((c >> 12) & 63)); out[o++] = (char)(0x80 | ((c >> 6) & 63)); out[o++] = (char)(0x80 | (c & 63)); }
    }
    out[o] = 0;
}

int ph_vst3_param_count(void *handle) {
    V3 *h = (V3 *)handle;
    return ((int32_t (*)(void *))VT(h->controller)[8])(h->controller);
}

int ph_vst3_param_info(void *handle, int index, unsigned int *id, char *title, int titleLen, char *units, int unitsLen,
                       double *defaultNorm, int *stepCount, int *flags) {
    V3 *h = (V3 *)handle;
    ParameterInfo pi;
    memset(&pi, 0, sizeof pi);
    if (((tresult (*)(void *, int32_t, ParameterInfo *))VT(h->controller)[9])(h->controller, index, &pi) != kResultOk) return 0;
    *id = pi.id;
    utf8(pi.title, 128, title, titleLen);
    utf8(pi.units, 128, units, unitsLen);
    *defaultNorm = pi.defaultNormalizedValue;
    *stepCount = pi.stepCount;
    *flags = pi.flags;
    return 1;
}

double ph_vst3_param_value(void *handle, unsigned int id) {
    V3 *h = (V3 *)handle;
    return ((double (*)(void *, uint32_t))VT(h->controller)[14])(h->controller, id);   // getParamNormalized
}

double ph_vst3_to_plain(void *handle, unsigned int id, double norm) {
    V3 *h = (V3 *)handle;
    return ((double (*)(void *, uint32_t, double))VT(h->controller)[12])(h->controller, id, norm);   // normalizedParamToPlain
}

void ph_vst3_param_set(void *handle, unsigned int id, double norm) {
    V3 *h = (V3 *)handle;
    ((tresult (*)(void *, uint32_t, double))VT(h->controller)[15])(h->controller, id, norm);    // setParamNormalized
}

int ph_vst3_param_text(void *handle, unsigned int id, double norm, char *out, int outLen) {
    V3 *h = (V3 *)handle;
    uint16_t s[128];
    memset(s, 0, sizeof s);
    if (((tresult (*)(void *, uint32_t, double, uint16_t *))VT(h->controller)[10])(h->controller, id, norm, s) != kResultOk) {
        if (outLen > 0) out[0] = 0;
        return 0;
    }
    utf8(s, 128, out, outLen);
    return 1;
}

void ph_vst3_class(void *handle, unsigned char *cid16, char *name, int nameLen) {
    V3 *h = (V3 *)handle;
    memcpy(cid16, h->info.cid, 16);
    strncpy(name, h->info.name, (size_t)nameLen - 1);
    name[nameLen - 1] = 0;
}

int ph_vst3_states(void *handle, unsigned char **proc, int *procLen, unsigned char **ctrl, int *ctrlLen) {
    V3 *h = (V3 *)handle;
    *proc = NULL; *procLen = 0; *ctrl = NULL; *ctrlLen = 0;
    if (h->state && h->state->size > 0) {
        *proc = malloc((size_t)h->state->size);
        memcpy(*proc, h->state->data, (size_t)h->state->size);
        *procLen = (int)h->state->size;
    }
    Stream *cs = calloc(1, sizeof(Stream));
    cs->vt = st_vt;
    if (((tresult (*)(void *, void *))VT(h->controller)[7])(h->controller, cs) == kResultOk && cs->size > 0) {  // IEditController::getState
        *ctrl = cs->data;
        *ctrlLen = (int)cs->size;
    } else {
        free(cs->data);
    }
    free(cs);
    return 1;
}

/* ---------------------------------------------------------------- crash guard */

static void on_crash(int sig) {
    (void)sig;
    static const char msg[] = "\nPLUGSHELF-ERR The plugin crashed while loading\n";
    write(1, msg, sizeof msg - 1);
    _exit(3);
}

void ph_install_crash_guard(void) {
    static char altstack[64 * 1024];
    stack_t ss = { .ss_sp = altstack, .ss_size = sizeof altstack, .ss_flags = 0 };
    sigaltstack(&ss, NULL);
    struct sigaction sa;
    memset(&sa, 0, sizeof sa);
    sa.sa_handler = on_crash;
    sa.sa_flags = SA_ONSTACK;
    sigemptyset(&sa.sa_mask);
    int sigs[] = { SIGSEGV, SIGBUS, SIGILL, SIGFPE, SIGABRT, SIGTRAP };
    for (unsigned i = 0; i < sizeof sigs / sizeof sigs[0]; i++) sigaction(sigs[i], &sa, NULL);
}
