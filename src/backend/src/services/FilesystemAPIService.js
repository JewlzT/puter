// METADATA // {"ai-commented":{"service":"openai-completion","model":"gpt-4o-mini"}}
/*
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
const BaseService = require("./BaseService");


/**
* @class FilesystemAPIService
* @extends BaseService
* @description This service handles all filesystem-related API routes, 
*              allowing for operations like file creation, deletion, 
*              reading, and searching through a structured set of 
*              endpoints. It integrates with the web server to expose 
*              these functionalities for client use.
*/
class FilesystemAPIService extends BaseService {
    /**
     * Sets up the route handlers for the Filesystem API.
     * This method registers various endpoints related to filesystem operations
     * such as creating, deleting, reading, and updating files. It uses the
     * web server's app instance to attach the corresponding routers.
     * 
     * @async
     * @function __on_install.routes
     * @returns {Promise<void>} A promise that resolves when the routes are set up.
     */
    async ['__on_install.routes'] () {
        const { app } = this.services.get('web-server');

        // batch
        app.use(require('../routers/filesystem_api/batch/all'))

        // v2 -- also in batch
        app.use(require('../routers/filesystem_api/write'))
        app.use(require('../routers/filesystem_api/mkdir'))
        app.use(require('../routers/filesystem_api/delete'))
        // v2 -- not in batch
        app.use(require('../routers/filesystem_api/stat'));
        app.use(require('../routers/filesystem_api/touch'))
        app.use(require('../routers/filesystem_api/read'))
        app.use(require('../routers/filesystem_api/token-read'))
        app.use(require('../routers/filesystem_api/readdir'))
        app.use(require('../routers/filesystem_api/copy'))
        app.use(require('../routers/filesystem_api/move'))
        app.use(require('../routers/filesystem_api/rename'))
        
        app.use(require('../routers/filesystem_api/search'))

        // v1
        app.use(require('../routers/writeFile'))
        app.use(require('../routers/file'))

        // misc
        app.use(require('../routers/df'))

    }

    /**
     * Test method for FilesystemAPIService
     * Tests root directory mkdir protection functionality
     */
    _test({ assert }) {
        const APIError = require('../api/APIError');

        // Test 1: Verify cannot_mkdir_to_root error code exists
        assert(() => {
            return APIError.codes.hasOwnProperty('cannot_mkdir_to_root');
        }, 'cannot_mkdir_to_root error code should be defined');

        // Test 2: Verify error code has correct HTTP status (403 Forbidden)
        assert(() => {
            return APIError.codes.cannot_mkdir_to_root.status === 403;
        }, 'cannot_mkdir_to_root should return 403 Forbidden status');

        // Test 3: Verify error message is clear and descriptive
        assert(() => {
            const message = APIError.codes.cannot_mkdir_to_root.message;
            return message && 
                   message.toLowerCase().includes('cannot') &&
                   message.toLowerCase().includes('create') &&
                   message.toLowerCase().includes('root');
        }, 'error message should clearly indicate mkdir is not allowed in root');

        // Test 4: Verify APIError.create works properly for this error
        assert(() => {
            const error = APIError.create('cannot_mkdir_to_root');
            return error.status === 403 && 
                   error.message.includes('root directory');
        }, 'APIError.create should generate proper 403 error for root mkdir');
    }
}

module.exports = FilesystemAPIService;
