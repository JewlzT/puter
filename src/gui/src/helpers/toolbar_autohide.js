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

// Toolbar auto-hide system with mouse proximity detection
window.toolbar_autohide = {
    timer: null,
    is_hidden: false,
    mouseY: 0,
    TOP_PROXIMITY_ZONE: 50, // pixels from the top
    eventHandlers: {},
    
    init() {
        console.log('Toolbar auto-hide system initialized');
        
        // Clean up any existing handlers first
        this.remove_event_handlers();

        // Set up event handlers and start timer if enabled
        if (window.user_preferences?.toolbar_autohide) {
            console.log('Auto-hide enabled - setting up event handlers');
            this.setup_event_handlers();
            this.start_timer();
        } else {
            console.log('Auto-hide disabled - no event handlers set up');
            this.clear_timer();
        }
    },
    
    // Create handler functions and store references
    setup_event_handlers() {
        this.eventHandlers.mousemove = (e) => {
            this.mouseY = e.clientY;
            console.log(`Mouse Y: ${this.mouseY} (Top zone: ${this.mouseY < this.TOP_PROXIMITY_ZONE ? 'YES' : 'NO'})`);
            this.reset_timer();
        };
        
        this.eventHandlers.click = (e) => {
            console.log('Click detected');
            this.reset_timer();
        };
        
        this.eventHandlers.keydown = (e) => {
            console.log('Keydown detected');
            this.reset_timer();
        };
        
        this.eventHandlers.scroll = (e) => {
            console.log('Scroll detected');
            this.reset_timer();
        };
        
        // Add the event listeners using the stored references
        document.addEventListener('mousemove', this.eventHandlers.mousemove);
        document.addEventListener('click', this.eventHandlers.click);
        document.addEventListener('keydown', this.eventHandlers.keydown);
        document.addEventListener('scroll', this.eventHandlers.scroll, true);
    },
    
    // Remove all event listeners if they exist
    remove_event_handlers() {
        console.log('Removing toolbar auto-hide event handlers');
        
        if (this.eventHandlers.mousemove) {
            document.removeEventListener('mousemove', this.eventHandlers.mousemove);
        }
        if (this.eventHandlers.click) {
            document.removeEventListener('click', this.eventHandlers.click);
        }
        if (this.eventHandlers.keydown) {
            document.removeEventListener('keydown', this.eventHandlers.keydown);
        }
        if (this.eventHandlers.scroll) {
            document.removeEventListener('scroll', this.eventHandlers.scroll, true);
        }
        
        // Clear the handler references
        this.eventHandlers = {};
    },
    
    is_mouse_near_top() {
        return this.mouseY <= this.TOP_PROXIMITY_ZONE;
    },
    
    start_timer() {
        this.clear_timer();
        
        if (!window.user_preferences?.toolbar_autohide) {
            return;
        }
        
        console.log('Starting 2-second inactivity timer');
        this.timer = setTimeout(() => {
            console.log('Timer expired - should hide toolbar');
            this.is_hidden = true;
        }, 2000);
    },
    
    clear_timer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    },
    
    reset_timer() {
        console.log('Activity detected - resetting timer');
        this.clear_timer();
        
        // If mouse is near top and toolbar is hidden, show it immediately
        if (this.is_hidden && this.is_mouse_near_top()) {
            console.log('Mouse near top - showing toolbar');
            this.is_hidden = false;
        }
        
        this.start_timer();
    }
};