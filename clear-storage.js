// Clear all browser storage script
// Run this in the browser console to clear all stored data

console.log('🧹 Clearing all browser storage...');

// Clear cookies
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Clear localStorage
if (typeof(Storage) !== "undefined") {
    localStorage.clear();
    sessionStorage.clear();
}

// Clear indexedDB
if ('indexedDB' in window) {
    indexedDB.databases().then(databases => {
        databases.forEach(db => {
            indexedDB.deleteDatabase(db.name);
        });
    });
}

// Clear service worker caches
if ('caches' in window) {
    caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
        });
    });
}

console.log('✅ All browser storage cleared! Reloading page...');

// Reload the page
setTimeout(() => {
    window.location.reload();
}, 1000); 