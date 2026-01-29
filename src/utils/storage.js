/**
 * Saves user settings and data to Chrome Local Storage.
 * @param {Object} data - Key-value pairs to save.
 * @returns {Promise<void>}
 */
export function saveUserData(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Retrieves specific keys from Chrome Local Storage.
 * @param {string|string[]|null} keys - Keys to retrieve, or null for all.
 * @returns {Promise<Object>}
 */
export function getUserData(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * Clears data from storage.
 * @param {string[]} keys 
 */
export function clearUserData(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
           if (chrome.runtime.lastError) {
               reject(chrome.runtime.lastError);
           } else {
               resolve();
           }
        });
    });
}
