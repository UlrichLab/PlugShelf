// Minimal VST2 editor host, written against the long-published VST 2.4 C ABI.
// Opens a plugin and its editor; no audio processing, no shell plugins.

#include "plughost.h"

#include <CoreFoundation/CoreFoundation.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

typedef struct AEffect AEffect;
typedef intptr_t (*Dispatcher)(AEffect *, int32_t, int32_t, intptr_t, void *, float);
typedef intptr_t (*AudioMaster)(AEffect *, int32_t, int32_t, intptr_t, void *, float);

struct AEffect {
    int32_t magic;
    Dispatcher dispatcher;
    void *process, *setParameter, *getParameter;
    int32_t numPrograms, numParams, numInputs, numOutputs, flags;
    intptr_t resvd1, resvd2;
    int32_t initialDelay, realQualities, offQualities;
    float ioRatio;
    void *object, *user;
    int32_t uniqueID, version;
    void *processReplacing, *processDoubleReplacing;
    char future[56];
};

typedef struct { int16_t top, left, bottom, right; } ERect;

enum {
    effOpen = 0, effClose = 1, effSetSampleRate = 10, effSetBlockSize = 11, effMainsChanged = 12,
    effEditGetRect = 13, effEditOpen = 14, effEditClose = 15, effEditIdle = 19,
    effFlagsHasEditor = 1,
    kMagic = 0x56737450,   // 'VstP'
};

ph_resize_fn ph_get_resize(void);   // vst3host.c

static void seterr2(char *err, int len, const char *msg) {
    if (err && len > 0) { strncpy(err, msg, (size_t)len - 1); err[len - 1] = 0; }
}

static ph_resize_fn g_resize2 = NULL;

static intptr_t host_cb(AEffect *e, int32_t op, int32_t index, intptr_t value, void *ptr, float opt) {
    (void)e; (void)index; (void)opt;
    switch (op) {
    case 1: return 2400;                                  // audioMasterVersion
    case 2: return 0;                                     // audioMasterCurrentId
    case 6: return 0;                                     // audioMasterWantMidi
    case 7: return 0;                                     // audioMasterGetTime
    case 15:                                              // audioMasterSizeWindow
        if (g_resize2) g_resize2(index, (int)value);
        return 1;
    case 16: return 44100;                                // audioMasterGetSampleRate
    case 17: return 512;                                  // audioMasterGetBlockSize
    case 23: return 1;                                    // audioMasterGetCurrentProcessLevel: user thread
    case 24: return 1;                                    // audioMasterGetAutomationState: off
    case 32: if (ptr) strcpy((char *)ptr, "PlugShelf"); return 1;   // audioMasterGetVendorString
    case 33: if (ptr) strcpy((char *)ptr, "PlugShelf"); return 1;   // audioMasterGetProductString
    case 34: return 1;                                    // audioMasterGetVendorVersion
    case 37: return 0;                                    // audioMasterCanDo
    case 38: return 0;                                    // audioMasterGetLanguage
    case 42: return 1;                                    // audioMasterUpdateDisplay
    default: return 0;
    }
}

typedef struct { CFBundleRef bundle; AEffect *e; } V2;

void *ph_vst2_load(const char *path, char *err, int errLen) {
    CFURLRef url = CFURLCreateFromFileSystemRepresentation(NULL, (const UInt8 *)path, (CFIndex)strlen(path), true);
    CFBundleRef bundle = url ? CFBundleCreate(NULL, url) : NULL;
    if (url) CFRelease(url);
    if (!bundle) { seterr2(err, errLen, "Cannot read the bundle"); return NULL; }
    if (!CFBundleLoadExecutable(bundle)) { seterr2(err, errLen, "Cannot load the binary"); return NULL; }
    typedef AEffect *(*Main)(AudioMaster);
    Main entry = (Main)CFBundleGetFunctionPointerForName(bundle, CFSTR("VSTPluginMain"));
    if (!entry) entry = (Main)CFBundleGetFunctionPointerForName(bundle, CFSTR("main_macho"));
    if (!entry) entry = (Main)CFBundleGetFunctionPointerForName(bundle, CFSTR("main"));
    if (!entry) { seterr2(err, errLen, "No VST2 entry point"); return NULL; }
    AEffect *e = entry(host_cb);
    if (!e || e->magic != kMagic) { seterr2(err, errLen, "The plugin does not start"); return NULL; }
    e->dispatcher(e, effOpen, 0, 0, NULL, 0);
    e->dispatcher(e, effSetSampleRate, 0, 0, NULL, 44100.0f);
    e->dispatcher(e, effSetBlockSize, 0, 512, NULL, 0);
    e->dispatcher(e, effMainsChanged, 0, 1, NULL, 0);
    if (!(e->flags & effFlagsHasEditor)) { seterr2(err, errLen, "The plugin has no editor window"); return NULL; }
    V2 *h = calloc(1, sizeof(V2));
    h->bundle = bundle; h->e = e;
    return h;
}

int ph_vst2_size(void *handle, int *w, int *hgt) {
    V2 *h = (V2 *)handle;
    ERect *r = NULL;
    h->e->dispatcher(h->e, effEditGetRect, 0, 0, &r, 0);
    if (!r) return 0;
    *w = r->right - r->left;
    *hgt = r->bottom - r->top;
    return *w > 0 && *hgt > 0;
}

int ph_vst2_attach(void *handle, void *nsview, char *err, int errLen) {
    V2 *h = (V2 *)handle;
    g_resize2 = ph_get_resize();
    if (!h->e->dispatcher(h->e, effEditOpen, 0, 0, nsview, 0)) {
        // Many plugins return 0 even when the editor opened; only a missing subview is a failure,
        // which the caller sees as an empty picture.
        (void)err; (void)errLen;
    }
    return 1;
}

void ph_vst2_idle(void *handle) {
    V2 *h = (V2 *)handle;
    h->e->dispatcher(h->e, effEditIdle, 0, 0, NULL, 0);
}
