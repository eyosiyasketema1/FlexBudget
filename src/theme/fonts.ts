// General Sans font wiring.
//
// Place the General Sans font file at: assets/fonts/GeneralSans-Variable.ttf
// (download free from https://www.fontshare.com/fonts/general-sans).
// A placeholder file ships so the bundle builds; replace it with the real
// font and reload. If the font can't load, the app falls back to the system
// font automatically.

export const FONT_FAMILY = 'GeneralSans';

// expo-font asset map consumed by useFonts() in App.tsx.
export const fontAssets = {
  GeneralSans: require('../../assets/fonts/GeneralSans-Variable.ttf'),
};
