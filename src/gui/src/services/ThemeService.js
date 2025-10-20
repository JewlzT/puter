/**
 * Copyright (C) 2024 Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import UIAlert from "../UI/UIAlert.js";
import { Service } from "../definitions.js";

const PUTER_THEME_DATA_FILENAME = '~/.__puter_gui.json';

const SAVE_COOLDOWN_TIME = 1000;

const default_values = {
    sat: 41.18,
    hue: 210,
    lig: 93.33,
    alpha: 0.8,
    light_text: false,
};

export class ThemeService extends Service {
    #broadcastService;
    #lastContrastWarningShown = 0;
    #contrastWarningTimeout = null; // Add timeout for debouncing

    /**
     * Calculate relative luminance of a color according to WCAG guidelines
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255) 
     * @param {number} b - Blue component (0-255)
     * @returns {number} Relative luminance (0-1)
     */
    #calculateLuminance(r, g, b) {
        // Convert to 0-1 range
        r = r / 255;
        g = g / 255;
        b = b / 255;

        // Apply gamma correction
        const gammaCorrect = (c) => {
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };

        r = gammaCorrect(r);
        g = gammaCorrect(g);
        b = gammaCorrect(b);

        // Calculate luminance using WCAG formula
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * Convert HSL color to RGB
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {Object} RGB values {r, g, b}
     */
    #hslToRgb(h, s, l) {
        h = h / 360;
        s = s / 100;
        l = l / 100;

        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        let r, g, b;

        // If saturation == 0
        if (s === 0) {
            r = g = b = l; 
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * Calculate contrast ratio between two colors according to WCAG guidelines
     * @param {number} luminance1 - Luminance of first color
     * @param {number} luminance2 - Luminance of second color
     * @returns {number} Contrast ratio (1-21)
     */
    #calculateContrastRatio(luminance1, luminance2) {
        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Get the best accessible text color (white or dark) for a given background
     * @param {number} hue - Background hue (0-360)
     * @param {number} saturation - Background saturation (0-100)
     * @param {number} lightness - Background lightness (0-100)
     * @returns {Object} {color: '#ffffff' | '#373e44', contrastRatio: number, isAccessible: boolean}
     */
    #getAccessibleTextColor(hue, saturation, lightness) {
        // Convert background to RGB then luminance
        const bgRgb = this.#hslToRgb(hue, saturation, lightness);
        const bgLuminance = this.#calculateLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

        // Test white text
        const whiteLuminance = this.#calculateLuminance(255, 255, 255);
        const whiteContrast = this.#calculateContrastRatio(bgLuminance, whiteLuminance);

        // Test dark text
        const darkRgb = { r: 0x37, g: 0x3e, b: 0x44 }; // #373e44
        const darkLuminance = this.#calculateLuminance(darkRgb.r, darkRgb.g, darkRgb.b);
        const darkContrast = this.#calculateContrastRatio(bgLuminance, darkLuminance);

        const minContrast = 4.5;
        const bestContrast = Math.max(whiteContrast, darkContrast);
        const roundedContrast = Math.round(bestContrast * 10) / 10; // Round to 1 decimal place

        // Use rounded contrast for comparison to avoid warnings for 4.45-4.49 range
        if (roundedContrast < minContrast) {
            // Clear any existing timeout
            if (this.#contrastWarningTimeout) {
                clearTimeout(this.#contrastWarningTimeout);
            }
            
            // Set new timeout - warning will show 1/2 second after last change
            this.#contrastWarningTimeout = setTimeout(() => {
                const now = Date.now();
                if (now - this.#lastContrastWarningShown > 5000) {
                    this.#lastContrastWarningShown = now;
                    this.#showContrastWarning(roundedContrast);
                }
            }, 500);
        } else {
            // Good contrast - clear any pending warning
            if (this.#contrastWarningTimeout) {
                clearTimeout(this.#contrastWarningTimeout);
                this.#contrastWarningTimeout = null;
            }
        }

        if (whiteContrast >= darkContrast) {
            return {
                color: '#ffffff',
            };
        } else {
            return {
                color: '#373e44', 
            };
        }
    }

    async _init () {
        this.#broadcastService = globalThis.services.get('broadcast');

        this.state = {
            sat: 41.18,
            hue: 210,
            lig: 93.33,
            alpha: 0.8,
            light_text: false,
        };
        this.root = document.querySelector(':root');
        // this.ss = new CSSStyleSheet();
        // document.adoptedStyleSheets.push(this.ss);

        this.save_cooldown_ = undefined;

        let data = undefined;
        try {
            data = await puter.fs.read(PUTER_THEME_DATA_FILENAME);
            if ( typeof data === 'object' ) {
                data = await data.text();
            }
        } catch (e) {
            if ( e.code !== 'subject_does_not_exist' ) {
                // TODO: once we have an event log,
                //       log this error to the event log
                console.error(e);

                // We don't show an alert because it's likely
                // other things also aren't working.
            }
        }

        if ( data ) try {
            data = JSON.parse(data.toString());
        } catch (e) {
            data = undefined;
            console.error(e);

            UIAlert({
                title: 'Error loading theme data',
                message: `Could not parse "${PUTER_THEME_DATA_FILENAME}": ` +
                    e.message,
            });
        }

        if ( data && data.colors ) {
            this.state = {
                ...this.state,
                ...data.colors,
            };
            this.reload_();
        }
    }

    reset () {
        this.state = default_values;
        this.reload_();
        puter.fs.delete(PUTER_THEME_DATA_FILENAME);
    }

    apply (values) {
        this.state = {
            ...this.state,
            ...values,
        };
        this.reload_();
        this.save_();
    }

    get (key) { return this.state[key]; }

    reload_() {
        // debugger;
        const s = this.state;
        // this.ss.replace(`
        //     .taskbar, .window-head, .window-sidebar {
        //         background-color: hsla(${s.hue}, ${s.sat}%, ${s.lig}%, ${s.alpha});
        //     }
        // `)
        // this.root.style.setProperty('--puter-window-background', `hsla(${s.hue}, ${s.sat}%, ${s.lig}%, ${s.alpha})`);

        // Use WCAG calculations to determine the best text color
        const accessibleText = this.#getAccessibleTextColor(s.hue, s.sat, s.lig);
        const shouldUseLightText = accessibleText.color === '#ffffff';
        
        // Update light_text based on WCAG calculations
        s.light_text = shouldUseLightText;

        this.root.style.setProperty('--primary-hue', s.hue);
        this.root.style.setProperty('--primary-saturation', s.sat + '%');
        this.root.style.setProperty('--primary-lightness', s.lig + '%');
        this.root.style.setProperty('--primary-alpha', s.alpha);
        this.root.style.setProperty('--primary-color', s.light_text ? 'white' : '#373e44');
        this.root.style.setProperty('--window-action-btn-filter', s.light_text ? 'invert(1)' : 'invert(0)');

        // TODO: Should we debounce this to reduce traffic?
        this.#broadcastService.sendBroadcast('themeChanged', {
            palette: {
                primaryHue: s.hue,
                primarySaturation: s.sat + '%',
                primaryLightness: s.lig + '%',
                primaryAlpha: s.alpha,
                primaryColor: s.light_text ? 'white' : '#373e44',
            },
        }, { sendToNewAppInstances: true });
    }   

    save_ () {
        if ( this.save_cooldown_ ) {
            clearTimeout(this.save_cooldown_);
        }
        this.save_cooldown_ = setTimeout(() => {
            this.commit_save_();
        }, SAVE_COOLDOWN_TIME);
    }
    commit_save_ () {
        puter.fs.write(PUTER_THEME_DATA_FILENAME, JSON.stringify(
            { colors: this.state },
            undefined,
            5,
        ));
    }

    async #showContrastWarning(contrastRatio) {
        try {
            await UIAlert({
                message: `<strong>Accessibility Warning: </strong>
                          Color Contrast Below Standards
                          <p>The selected colors have a contrast ratio of <strong>${contrastRatio.toFixed(1)}:1</strong>, which is below the WCAG AA recommendation of <strong>4.5:1.</strong></p>`,
                body_icon: window.icons['warning-sign.svg'],
                buttons: [
                    {
                        label: 'Continue with these colors',
                        value: 'continue',
                        type: 'primary',
                    }
                ]
            });
        } catch (error) {
            console.error('Error showing contrast warning:', error); // Add debugging
        }
    }

}
