#ifndef PLUGHOST_H
#define PLUGHOST_H

// A minimal plugin host: just enough of VST3 and VST2 to open a plugin's editor
// inside an NSView, so PlugShelf can take a picture of it. No audio processing.
// Everything runs on the main thread of a short-lived helper process.

#ifdef __cplusplus
extern "C" {
#endif

// Called when a plugin asks the host to resize its editor.
typedef void (*ph_resize_fn)(int width, int height);
void ph_set_resize_callback(ph_resize_fn fn);

// VST3: loads the bundle, creates the audio class named `className` (or the first one
// when it is empty or not found), its controller and its editor view.
// Returns an opaque handle, or NULL with a message in `err`.
void *ph_vst3_load(const char *bundlePath, const char *className, int wantView, char *err, int errLen);

// Helper processes only: a plugin that crashes ends the process quietly with
// "PLUGSHELF-ERR <message>" on stdout (exit code 3) instead of a macOS crash report.
void ph_install_crash_guard(void);
int ph_vst3_size(void *handle, int *width, int *height);
int ph_vst3_attach(void *handle, void *nsview, char *err, int errLen);

// Parameters and state, for building Ableton racks with macros.
int ph_vst3_param_count(void *handle);
// UTF-8 title/units; returns 0 when the index is out of range.
int ph_vst3_param_info(void *handle, int index, unsigned int *id, char *title, int titleLen, char *units, int unitsLen,
                       double *defaultNorm, int *stepCount, int *flags);
double ph_vst3_param_value(void *handle, unsigned int id);
void ph_vst3_param_set(void *handle, unsigned int id, double norm);
// The parameter's value in its own units (dB, ms …) – Live keeps macro ranges in these.
double ph_vst3_to_plain(void *handle, unsigned int id, double norm);
int ph_vst3_param_text(void *handle, unsigned int id, double norm, char *out, int outLen);
// The chosen class: 16-byte CID and its name.
void ph_vst3_class(void *handle, unsigned char *cid16, char *name, int nameLen);
// Component (processor) and controller state as Live stores them. Caller frees with free().
int ph_vst3_states(void *handle, unsigned char **proc, int *procLen, unsigned char **ctrl, int *ctrlLen);
int ph_vst3_set_state(void *handle, const unsigned char *data, int len);
int ph_vst3_get_state(void *handle, unsigned char **out, int *outLen);

// VST2: loads the bundle and opens the plugin. Shell plugins are not supported.
void *ph_vst2_load(const char *bundlePath, char *err, int errLen);
int ph_vst2_size(void *handle, int *width, int *height);
int ph_vst2_attach(void *handle, void *nsview, char *err, int errLen);
void ph_vst2_idle(void *handle);

#ifdef __cplusplus
}
#endif

#endif
