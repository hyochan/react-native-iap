#include <jni.h>
#include "NitroIapOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::iap::initialize(vm);
}
