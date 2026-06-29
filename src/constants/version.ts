// Single source for the displayed app version. Read from app.json so the
// Settings "Version" line always matches the build.
import app from '../../app.json';

export const APP_VERSION: string = app.expo.version;
export const BUILD_NUMBER: number = app.expo.android.versionCode;
export const VERSION_LABEL = `v${APP_VERSION} (${BUILD_NUMBER})`;
