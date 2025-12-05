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

import UIWindow from './UIWindow.js'

/**
 * Creates a customizable alert dialog with support for different types and flexible button configurations.
 * 
 * @param {Object|string} options - Alert configuration object or message string
 * @param {string} options.message - The main message to display in the alert
 * @param {string} [options.type] - Alert type: 'success', 'error', 'info', 'question', 'warning'
 * @param {string} [options.body_icon] - Custom icon (overrides type-based icon)
 * @param {string} [options.custom_html] - Custom HTML content for alert (only used when no type specified)
 * @param {Object} [options.custom_css] - Custom CSS styles for alert body (only used when no type specified)
 * 
 * @typedef {Object} ButtonConfig
 * @property {string} label - Button text (fallback: stripped html_label → value → 'button')
 * @property {string} [html_label] - Custom HTML content for button (overrides label)
 * @property {*} [value] - Value returned when button is clicked (defaults to label)
 * @property {string} [type='secondary'] - Button type: 'primary', 'secondary', 'danger'
 * @property {string|Array<string>} [css_class] - Custom CSS classes
 * @property {Object} [css] - Inline CSS styles (uses !important to override all other css)
 * @property {Object} [attributes] - Custom HTML attributes (id, title, data-*, aria-label, etc.)
 * 
 * @returns {Promise<*>} Promise that resolves with the clicked button's value
 * 
 * @example
 * // Simple alert
 * await UIAlert("File saved successfully!");
 * 
 * @example
 * // Typed alert with default buttons
 * const result = await UIAlert({
 *   message: "Delete this file?",
 *   type: "question"
 * }); // Shows Yes/No buttons, returns true/false
 * 
 * @example
 * // Custom styled buttons
 * const action = await UIAlert({
 *   message: "Choose an action:",
 *   type: "info",
 *   buttons: [
 *     {
 *       label: "Save",
 *       value: "save",
 *       type: "primary",
 *       css: { "background-color": "#28a745" },
 *       html_label: "<strong>💾 Save</strong>",
 *       attributes: { "title": "Save changes" }
 *     },
 *     {
 *       label: "Cancel",
 *       value: "cancel",
 *       css_class: ["subtle-button", "fade-in"]
 *     }
 *   ]
 * });
 * 
 * @example
 * // Custom popup (no type)
 * await UIAlert({
 *   message: "ignored when custom_html used",
 *   custom_html: "<h3>Custom Content</h3><p>Full control over layout</p>",
 *   custom_css: { "background-color": "#f0f8ff" },
 *   buttons: [{ label: "OK", type: "primary" }]
 * });
 */

function UIAlert(options){
    // set sensible defaults
    if(arguments.length > 0){
        // if first argument is a string, then assume it is the message
        if(window.isString(arguments[0])){
            options = {};
            options.message = arguments[0];
        }
        // if second argument is an array, then assume it is the buttons
        if(arguments[1] && Array.isArray(arguments[1])){
            options.buttons = arguments[1];
        }
    }

    return new Promise(async (resolve) => {
        // provide button options for respective types, default to 'OK'
        if(!options.buttons || options.buttons.length === 0){
            if (options.type === "question"){
                options.buttons = [
                    {label: i18n('yes'), value: true, type: 'primary'},
                    {label: i18n('no'), value: false, type: 'secondary'}
                ];
            }
            else{
                options.buttons = [
                    {label: i18n('ok'), value: true, type: 'primary'}
                ];
            }
        }

        // set body icon based on available types
        if (!options.body_icon) {
            switch(options.type) {
                case 'success':
                    options.body_icon = window.icons['c-check.svg'];
                    break;
                case 'error':
                    options.body_icon = window.icons['danger.svg'];
                    break;
                case 'info':
                    options.body_icon = window.icons['reminder.svg'];
                    break;
                case 'question':
                    options.body_icon = window.icons['question-sign.svg'];
                    break;
                case 'warning':
                    options.body_icon = window.icons['warning-sign.svg'];
                    break;
                default:
                    break;
            }
        }

        let santized_message = html_encode(options.message);

        // replace sanitized <strong> with <strong>
        santized_message = santized_message.replace(/&lt;strong&gt;/g, '<strong>');
        santized_message = santized_message.replace(/&lt;\/strong&gt;/g, '</strong>');

        // replace sanitized <p> with <p>
        santized_message = santized_message.replace(/&lt;p&gt;/g, '<p>');
        santized_message = santized_message.replace(/&lt;\/p&gt;/g, '</p>');

        let h = '';
        
        // HTML
        if (options.custom_html && !options.type) {
            // Custom Layout
            h += options.custom_html;
        } else {
            // Default layout
            // icon
            h += `<img class="window-alert-icon" src="${html_encode(options.body_icon)}">`;
            // message
            h += `<div class="window-alert-message">${santized_message}</div>`;
        }

        // buttons
        if(options.buttons && options.buttons.length > 0){
            h += `<div style="overflow:hidden; margin-top:20px;">`;
            for(let y=0; y<options.buttons.length; y++){
                const button = options.buttons[y];
                
                // Add custom CSS classes
                let customClasses = '';
                if(button.css_class && !button.type) {
                    if(typeof button.css_class === 'string') {
                        customClasses = ` ${button.css_class}`;
                    } else if(Array.isArray(button.css_class)) {
                        customClasses = ` ${button.css_class.join(' ')}`;
                    }
                }

                // Build custom CSS strings
                let custom_style = '';
                if(button.css && typeof button.css === 'object' && !button.type) {
                    const cssProps = Object.entries(button.css)
                        .map(([key, value]) => `${key}: ${value} !important`)
                        .join('; ');
                    custom_style = `style="${cssProps}"`;
                }

                
                // Build custom attributes string
                let customAttributes = '';
                if(button.attributes && typeof button.attributes === 'object' && !button.type) {
                    customAttributes = Object.entries(button.attributes)
                        .map(([key, value]) => `${key}="${html_encode(value)}"`)
                        .join(' ');
                }

                // Build HTML with custom user additions
                h += `<button class="button button-block button-${html_encode(button.type)} alert-resp-button${customClasses}" 
                                data-label="${html_encode(button.label) || button.html_label?.replace(/<[^>]*>/g, '').trim() || button.value || 'button'}"
                                data-value="${html_encode(button.value ?? button.label)}"
                                ${button.type === 'primary' ? 'autofocus' : ''}
                                ${custom_style}
                                ${customAttributes}
                                >${button.html_label ? button.html_label : html_encode(button.label)}</button>`;
            }
            h += `</div>`;
        }

        const el_window = await UIWindow({
            title: null,
            icon: null,
            uid: null,
            is_dir: false,
            message: options.message,
            body_icon: options.body_icon,
            backdrop: options.backdrop ?? false,
            is_resizable: false,
            is_droppable: false,
            has_head: false,
            stay_on_top: options.stay_on_top ?? false,
            selectable_body: false,
            draggable_body: options.draggable_body ?? true,
            allow_context_menu: false,
            show_in_taskbar: false,
            window_class: `window-alert${options.type ? ` window-alert-${options.type}` : ''}`,
            dominant: true,
            body_content: h,
            width: 350,
            parent_uuid: options.parent_uuid,
            ...options.window_options,
            window_css:{
                height: 'initial',
            },
            body_css: {
                width: 'initial',
                padding: '20px',
                'background-color': 'rgba(231, 238, 245, .95)',
                'backdrop-filter': 'blur(3px)',
                // Allow custom CSS to override defaults
                ...options.type ? {} : options.custom_css
            }
        });
        // focus to primary btn
        $(el_window).find('.button-primary').focus();

        // --------------------------------------------------------
        // Button pressed
        // --------------------------------------------------------
        $(el_window).find('.alert-resp-button').on('click',  async function(event){
            event.preventDefault(); 
            event.stopPropagation();
            resolve($(this).attr('data-value'));
            $(el_window).close();
            return false;
        })
    })
}

def(UIAlert, 'ui.window.UIAlert');

export default UIAlert;
