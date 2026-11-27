/* Local appearance analysis only. No image is uploaded and no DOM is required. */
import {getThemePreset} from './theme-presets.js';
import {buildLumiPalette} from './lumi-palette.js';
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const byte = value => Math.round(clamp(value, 0, 255));
const mix = (foreground, background, alpha) => foreground.map((channel, index) => byte(channel * alpha + background[index] * (1 - alpha)));
const hex = color => `#${color.map(channel => byte(channel).toString(16).padStart(2, '0')).join('')}`;
const rgb = value => value.slice(1).match(/../g).map(channel => parseInt(channel, 16));
const rgba = (color, alpha) => `rgba(${color.map(byte).join(',')},${alpha})`;
const luminance = color => color.map(channel => {
  const value = channel / 255;
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}).reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};
function hsl(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360 / 360;
  const s = clamp(saturation), l = clamp(lightness);
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map(offset => {
    const k = (offset + h * 12) % 12;
    return byte(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  });
}
function toHsl([red, green, blue]) {
  const channels = [red, green, blue].map(channel => channel / 255);
  const maximum = Math.max(...channels), minimum = Math.min(...channels), delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  if (delta < .001) return { hue: 220, saturation: 0, lightness };
  const hue = maximum === channels[0] ? ((channels[1] - channels[2]) / delta + (channels[1] < channels[2] ? 6 : 0)) * 60
    : maximum === channels[1] ? ((channels[2] - channels[0]) / delta + 2) * 60
      : ((channels[0] - channels[1]) / delta + 4) * 60;
  return { hue, saturation: delta / (1 - Math.abs(2 * lightness - 1)), lightness };
}
function ensureContrast(foreground, backgrounds, minimum, towardLight) {
  if (backgrounds.every(background => contrast(foreground, background) >= minimum)) return foreground;
  const target = towardLight ? [255, 255, 255] : [0, 0, 0];
  let low = 0, high = 1;
  for (let step = 0; step < 18; step++) {
    const middle = (low + high) / 2;
    if (backgrounds.every(background => contrast(mix(target, foreground, middle), background) >= minimum)) high = middle;
    else low = middle;
  }
  return mix(target, foreground, high);
}

/** Sample the palette, but scan every pixel for small high-contrast highlights. */
export function analyzeWallpaper(imageData) {
  if (!imageData?.data?.length || !imageData.width || !imageData.height) return null;
  const pixels = imageData.data, count = Math.min(imageData.width * imageData.height, Math.floor(pixels.length / 4));
  const stride = Math.max(1, Math.ceil(count / 8192)), luminances = [], bins = Array.from({ length: 24 }, () => ({ weight: 0, x: 0, y: 0, saturation: 0 }));
  const channelMin = [255, 255, 255], channelMax = [0, 0, 0], matte = [248, 248, 246];
  let bright = 0, dark = 0;
  for (let pixel = 0; pixel < count; pixel++) {
    const offset = pixel * 4, alpha = pixels[offset + 3] / 255;
    if (alpha < .1) continue;
    for (let channel = 0; channel < 3; channel++) {
      const value = byte(pixels[offset + channel] * alpha + matte[channel] * (1 - alpha));
      channelMin[channel] = Math.min(channelMin[channel], value);
      channelMax[channel] = Math.max(channelMax[channel], value);
    }
  }
  for (let pixel = 0; pixel < count; pixel += stride) {
    const offset = pixel * 4, alpha = pixels[offset + 3] / 255;
    if (alpha < .1) continue;
    // Transparencies are treated as a neutral canvas; upload encoding may flatten them.
    const color = mix([pixels[offset], pixels[offset + 1], pixels[offset + 2]], matte, alpha);
    const light = luminance(color), sample = toHsl(color);
    luminances.push(light);
    if (light > .42) bright++;
    if (light < .16) dark++;
    // Ignore nearly neutral highlights/shadows when choosing a hue, not when analysing contrast.
    if (sample.saturation < .12 || sample.lightness < .08 || sample.lightness > .94) continue;
    const bin = bins[Math.floor(sample.hue / 15) % bins.length];
    const weight = sample.saturation * (.35 + .65 * Math.sin(sample.lightness * Math.PI));
    bin.weight += weight;
    bin.x += Math.cos(sample.hue * Math.PI / 180) * weight;
    bin.y += Math.sin(sample.hue * Math.PI / 180) * weight;
    bin.saturation += sample.saturation * weight;
  }
  if (!luminances.length) return null;
  luminances.sort((a, b) => a - b);
  const percentile = amount => luminances[Math.min(luminances.length - 1, Math.floor((luminances.length - 1) * amount))];
  const dominant = bins.reduce((best, bin) => bin.weight > best.weight ? bin : best, bins[0]);
  const p10 = percentile(.1), p50 = percentile(.5), p90 = percentile(.9);
  const hue = dominant.weight > luminances.length * .008 ? (Math.atan2(dominant.y, dominant.x) * 180 / Math.PI + 360) % 360 : 220;
  const saturation = dominant.weight ? clamp(dominant.saturation / dominant.weight, 0, .72) : .06;
  return {
    version: 1, hue: Math.round(hue), saturation: +saturation.toFixed(3), brightness: +p50.toFixed(4),
    p10: +p10.toFixed(4), p50: +p50.toFixed(4), p90: +p90.toFixed(4), mixed: p90 - p10 > .38,
    recommendedTheme: p50 > .3 && bright / luminances.length >= .46 ? 'light' : 'dark',
    channelMin, channelMax, sampleCount: luminances.length,
    brightShare: +(bright / luminances.length).toFixed(3), darkShare: +(dark / luminances.length).toFixed(3)
  };
}

/** Explicit light/dark keeps the user's choice; auto follows the selected image. */
export function resolveAppearance(appearance = {}, systemDark = false) {
  const custom = appearance.background === 'custom' && Boolean(appearance.wallpaper);
  const analysis = custom && appearance.wallpaperAnalysis?.version === 1 ? appearance.wallpaperAnalysis : null;
  const mode = ['light', 'dark', 'system', 'auto'].includes(appearance.theme) ? appearance.theme : 'auto';
  const dark = mode === 'dark' || (mode === 'system' && systemDark)
    || (mode === 'auto' && (analysis ? analysis.recommendedTheme === 'dark' : systemDark));
  const builtin = appearance.background === 'dusk' ? { hue: 32, saturation: .18 }
    : appearance.background === 'sky' ? { hue: 210, saturation: .18 } : { hue: 218, saturation: .1 };
  const preset=getThemePreset(appearance.styleTheme);
  return { dark, custom, seed: analysis || builtin, mode, preset:custom?null:preset, background:appearance.background,
    styleTheme:preset.id, source:analysis?'wallpaper':custom?'wallpaper-fallback':preset.id==='classic'?'builtin':`preset:${preset.id}` };
}

/** One semantic palette is shared by CSS and Ant; status hues retain their meaning. */
export function buildPalette({ dark = false, seed = null, custom = false, preset = null, background = 'theme' } = {}) {
  if(!custom&&preset?.family==='lumi')return buildLumiPalette(preset,dark,background);
  const named = !custom && preset?.id !== 'classic' && preset?.[dark?'dark':'light'];
  const variant = named || null;
  const hue = variant ? preset.hue : Number.isFinite(seed?.hue) ? ((seed.hue % 360) + 360) % 360 : 218;
  const seedSaturation = clamp(seed?.saturation ?? .1);
  const neutralSaturation = variant ? .15 : custom ? clamp(seedSaturation * .13, .025, .075) : .045;
  const accentHue = custom || variant ? hue : 207;
  const surface = variant ? rgb(variant.surface) : hsl(hue, neutralSaturation, dark ? .135 : .978);
  const surfaceSoft = variant ? rgb(variant.soft) : hsl(hue, neutralSaturation, dark ? .105 : .943);
  const page = variant ? rgb(variant.page) : hsl(hue, neutralSaturation, dark ? .09 : .94);
  const scene = variant ? variant.scene.map(rgb) : [page];
  // Every animation frame is a blend inside these conservative per-channel bounds.
  const sceneBounds = variant ? [0,1].map(edge=>mix(edge?[255,255,255]:[0,0,0],
    [0,1,2].map(channel=>Math[edge?'max':'min'](...scene.map(color=>color[channel]),page[channel])),.2)) : [page];
  const text = hsl(hue, .035, dark ? .95 : .12);
  let secondary = hsl(hue, .04, dark ? custom ? .9 : .82 : custom ? .235 : .27);
  let muted = hsl(hue, .045, dark ? custom ? .86 : .7 : custom ? .265 : .355);
  const floatingAlpha = custom ? .96 : .97, panelAlpha = custom ? .93 : .94, bubbleAlpha = custom ? .94 : .96;
  const glassWorst = alpha => [[0, 0, 0], [255, 255, 255]].map(background => mix(surface, background, alpha));
  muted = ensureContrast(muted, [surface, surfaceSoft, ...glassWorst(panelAlpha),...(variant?sceneBounds:[])], 4.8, dark);
  if(variant)secondary=ensureContrast(secondary,[surface,surfaceSoft,...sceneBounds],4.8,dark);
  const wash = hsl(hue, neutralSaturation, dark ? .06 : .985);
  const bound = custom && Array.isArray(seed?.[dark ? 'channelMax' : 'channelMin']) ? seed[dark ? 'channelMax' : 'channelMin'].map(byte)
    : dark ? [255, 255, 255] : [0, 0, 0];
  let washAlpha = custom ? .16 : 0;
  if (custom) {
    let low = .16, high = .78;
    for (let step = 0; step < 18; step++) {
      const middle = (low + high) / 2, background = mix(wash, bound, middle);
      if ([text, secondary, muted].every(foreground => contrast(foreground, background) >= 4.8)) high = middle;
      else low = middle;
    }
    washAlpha = +Math.min(.78, high + .025).toFixed(3);
  }
  const pageWorst = custom ? mix(wash, bound, washAlpha) : page;
  const accentSoft = variant ? rgb(variant.soft) : hsl(accentHue, dark ? .105 : .15, dark ? .205 : .91);
  const accent = ensureContrast(variant?rgb(variant.accent):hsl(accentHue, custom ? .23 : .25, dark ? .79 : .34), [accentSoft, surface, pageWorst,...(variant?sceneBounds:[])], 4.8, dark);
  const userSurface = variant ? rgb(variant.user) : hsl(hue, custom ? neutralSaturation + .025 : .07, dark ? .205 : .887);
  const primary = variant ? accent : dark ? hsl(hue, .045, .9) : hsl(accentHue, .22, .275);
  const primaryText = ensureContrast(dark ? hsl(hue, .08, .13) : [255, 255, 255], [primary], 7, !dark);
  const navSelected = dark ? hsl(hue, .055, .84) : [255, 255, 255];
  const navSelectedText = ensureContrast(hsl(hue, .09, .15), [navSelected], 7, false);
  const infoSurface = dark ? [35, 48, 62] : [229, 237, 245];
  const infoText = dark ? [170, 201, 235] : [49, 84, 119];
  const status = dark ? {
    success: { text: '#a8d7bb', surface: '#21372c' },
    warning: { text: '#e8cc94', surface: '#3c3220' },
    error: { text: '#f0adb1', surface: '#40272c' }
  } : {
    success: { text: '#28613e', surface: '#e9f2ec' },
    warning: { text: '#73551f', surface: '#f5eedf' },
    error: { text: '#963f47', surface: '#f8e9eb' }
  };
  const border = ensureContrast(hsl(hue, neutralSaturation, dark ? .43 : .59), [surface, surfaceSoft], 3.1, dark);
  const colors = Object.fromEntries(Object.entries({ surface, surfaceSoft, page, text, secondary, muted, accent, accentSoft, userSurface, primary, primaryText, navSelected, navSelectedText, infoSurface, infoText, border }).map(([key, value]) => [key, hex(value)]));
  colors.buttonPrimary = colors.primary;
  colors.buttonPrimaryText = colors.primaryText;
  const vars = {
    '--surface': colors.surface, '--surface-soft': colors.surfaceSoft, '--surface-floating': rgba(surface, floatingAlpha), '--surface-panel': rgba(surface, panelAlpha),
    '--nav-track': rgba(surfaceSoft, custom ? .91 : .87), '--nav-selected': colors.navSelected, '--nav-selected-text': colors.navSelectedText,
    '--text': colors.text, '--secondary': colors.secondary, '--muted': colors.muted,
    '--line': rgba(text, dark ? .12 : .13), '--control-border': colors.border,
    '--accent': colors.accent, '--accent-soft': colors.accentSoft, '--on-accent': hex(ensureContrast(dark ? hsl(hue, .08, .13) : [255, 255, 255], [accent], 4.5, !dark)), '--segmented-selected': dark ? hex(hsl(hue, neutralSaturation, .26)) : '#ffffff',
    '--accent-ink': colors.navSelectedText,
    '--bubble': rgba(surface, bubbleAlpha), '--bubble-user': rgba(userSurface, .97),
    '--primary-bg': colors.primary, '--primary-text': colors.primaryText,
    '--primary-fill': colors.primary, '--primary-ink': colors.primaryText,
    '--info-text': colors.infoText, '--info-surface': colors.infoSurface,
    ...Object.fromEntries(Object.entries(status).flatMap(([name, pair]) => [[`--status-${name}-text`, pair.text], [`--status-${name}-surface`, pair.surface]])),
    '--wallpaper-wash': rgba(wash, washAlpha), '--wallpaper-wash-alpha': String(washAlpha),
    '--ambient': `radial-gradient(ellipse at 50% 0%,${rgba(hsl(accentHue, .12, dark ? .47 : .68), dark ? .09 : .065)},transparent 62%),linear-gradient(145deg,${hex(page)},${hex(mix(surfaceSoft, page, .46))})`,
    '--panel-shadow': dark ? '0 1px 2px #00000012,0 12px 32px -22px #00000064' : '0 1px 2px #20273004,0 14px 36px -22px #27313e30',
    '--panel-shadow-hover': dark ? '0 2px 5px #00000024,0 18px 42px -20px #00000080' : '0 2px 5px #20273009,0 18px 42px -20px #27313e48',
    '--canvas-color': colors.page,
    '--scene-a': hex(scene[1]||page), '--scene-b': hex(scene[2]||page)
  };
  if(variant){
    const atmosphere=background==='dusk'?rgba(hsl(32,.2,dark ? .28 : .82),.1):background==='sky'?rgba(hsl(210,.2,dark ? .28 : .82),.1):'transparent';
    vars['--ambient']=`linear-gradient(145deg,${atmosphere},transparent 65%),linear-gradient(145deg,${hex(page)},${hex(scene[0])})`;
  }
  const antd = {
    colorPrimary: colors.accent, colorPrimaryBg: colors.accentSoft, colorLink: colors.accent,
    colorLinkHover: colors.accent, colorLinkActive: colors.accent,
    colorText: colors.text, colorTextSecondary: colors.secondary, colorTextTertiary: colors.muted, colorTextPlaceholder: colors.muted,
    colorTextLightSolid: dark ? colors.primaryText : '#ffffff',
    colorBgLayout: colors.page, colorBgElevated: colors.surface, colorBgContainer: colors.surface,
    colorBorder: colors.border, colorBorderSecondary: rgba(text, .13),
    colorFillSecondary: colors.surfaceSoft, colorFillTertiary: colors.surfaceSoft,
    colorInfo: colors.infoText, colorInfoBg: colors.infoSurface,
    ...Object.fromEntries(Object.entries(status).flatMap(([name, pair]) => {
      const role = name[0].toUpperCase() + name.slice(1);
      return [[`color${role}`, pair.text], [`color${role}Bg`, pair.surface], [`color${role}Border`, hex(mix(rgb(pair.text), rgb(pair.surface), .4))]];
    }))
  };
  const components = {
    Button: { primaryShadow: 'none', defaultShadow: 'none', colorPrimary: colors.primary, colorPrimaryHover: hex(mix(dark ? [255, 255, 255] : [0, 0, 0], primary, .08)), colorPrimaryActive: hex(mix(dark ? [0, 0, 0] : [255, 255, 255], primary, .08)), primaryColor: colors.primaryText },
    Select: { optionSelectedBg: colors.accentSoft },
    Segmented: { trackBg: colors.surfaceSoft, itemSelectedBg: dark ? hex(hsl(hue, neutralSaturation, .26)) : '#ffffff' },
    Tooltip: { colorBgSpotlight: dark ? '#edf0f3' : '#24282e', colorTextLightSolid: dark ? '#24282e' : '#ffffff' }
  };
  const pairs = [
    ['body / surface', text, surface], ['secondary / surface', secondary, surface], ['muted / surface', muted, surface],
    ['accent / selected', accent, accentSoft], ['primary action', primaryText, primary], ['selected navigation', navSelectedText, navSelected],
    ['information label', infoText, infoSurface], ['message / user', text, mix(userSurface, dark ? [255, 255, 255] : [0, 0, 0], .97)],
    ['muted / panel extreme', muted, mix(surface, dark ? [255, 255, 255] : [0, 0, 0], panelAlpha)],
    ['muted / page bound', muted, pageWorst],
    ...(variant?sceneBounds.flatMap((bound,index)=>[['body / motion bound '+index,text,bound],['secondary / motion bound '+index,secondary,bound],['muted / motion bound '+index,muted,bound],['accent / motion bound '+index,accent,bound]]):[]),
    ...Object.entries(status).map(([name, pair]) => [`${name} status`, rgb(pair.text), rgb(pair.surface)])
  ];
  const diagnostics = {
    dark, custom, hue: Math.round(hue), washAlpha, sourceSampleCount: seed?.sampleCount || 0,
    note: 'Panel extremes use pure black/white; the custom canvas uses all decoded source-pixel channel bounds plus an overlay margin. Browser crop and screenshots must also be checked.',
    pairs: pairs.map(([role, foreground, background]) => ({ role, foreground: hex(foreground), background: hex(background), contrast: +contrast(foreground, background).toFixed(3), minimum: 4.5 }))
  };
  return { vars, antd, components, colors, diagnostics };
}
