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
void *ph_vst3_load(const char *bundlePath, const char *className, char *err, int errLen);
int ph_vst3_size(void *handle, int *width, int *height);
int ph_vst3_attach(void *handle, void *nsview, char *err, int errLen);

// VST2: loads the bundle and opens the plugin. Shell plugins are not supported.
void *ph_vst2_load(const char *bundlePath, char *err, int errLen);
int ph_vst2_size(void *handle, int *width, int *height);
int ph_vst2_attach(void *handle, void *nsview, char *err, int errLen);
void ph_vst2_idle(void *handle);

#ifdef __cplusplus
}
#endif

#endif
