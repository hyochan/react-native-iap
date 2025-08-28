#include <jni.h>
#include "RnIAPOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::iap::initialize(vm);
}
