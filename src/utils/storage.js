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
