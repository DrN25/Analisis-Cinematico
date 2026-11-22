# Requerimientos para ejecutar la App Móvil (Android)

Lista de requerimientos necesarios para abrir, compilar y probar la aplicación móvil Android en **Android Studio**.

## 1. Software y SDK en la PC
- **Android Studio** (versión reciente estable; incluye el IDE, **Java JDK 17** integrado y soporte para **Jetpack Compose**).
- **Android SDK** (instalable desde *SDK Manager* dentro de Android Studio):
  - **SDK Platform** (Android 8.0 / API 26 o superior como mínimo; se recomienda tener instalada la API objetivo del proyecto, p. ej. API 34/35).
  - **Android SDK Build-Tools**.
  - **Android SDK Platform-Tools** (incluye **ADB** para depuración e instalación en dispositivo/emulador).
- **Gradle** (se descarga automáticamente mediante el *Gradle Wrapper* del proyecto al sincronizar en Android Studio; requiere conexión a Internet la primera vez).

## 2. Para probar en Emulador (AVD)
- **Android Emulator** (instalable desde *SDK Tools* en el *SDK Manager*).
- **Imagen del sistema Android** (System Image, por ejemplo *Google APIs* o *Google Play*) descargada desde *Device Manager* dentro de Android Studio.
- **Virtualización habilitada en la BIOS** (Intel VT-x / AMD-V) y acelerador de emulador (AEHD / HAXM en Windows, o KVM en Linux).
- **RAM recomendada:** 8 GB mínimo (16 GB recomendado para ejecutar Android Studio + Emulador + Compose Preview con fluidez).

## 3. Para probar en Teléfono Físico (opcional en lugar del emulador)
- **Teléfono Android** con versión compatible (Android 8.0 / API 26 o superior).
- **Opciones de desarrollador** y **Depuración USB** activadas en el teléfono.
- **Cable USB** conectado a la PC (o *Depuración inalámbrica* en Android 11+).

## 4. Red / Backend
- **Conexión a Internet** para que la app se comunique con la API del backend y la base de datos (y para la primera sincronización de dependencias Gradle).
