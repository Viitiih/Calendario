
// This file is a diagnostic tool to find why fetch is being overwritten
console.log('Fetch Fix Diagnostic loading...');

try {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
  console.log('Fetch descriptor:', descriptor);

  if (descriptor && !descriptor.set && descriptor.get) {
    console.warn('window.fetch has a getter but no setter. This is likely the cause of the error.');
    
    // Test if we can make it writable or add a setter
    if (descriptor.configurable) {
      console.log('Property is configurable. Attempting to add a stub setter to prevent crashes.');
      const originalFetch = window.fetch;
      Object.defineProperty(window, 'fetch', {
        get: () => originalFetch,
        set: (v) => {
          console.warn('Something tried to set window.fetch. Blocked it to prevent crash.', v);
          console.trace();
        },
        configurable: true,
        enumerable: true
      });
      console.log('Successfully added stub setter to window.fetch');
    } else {
      console.error('window.fetch is NOT configurable. We cannot fix it via defineProperty.');
    }
  } else if (descriptor && !descriptor.writable && !descriptor.set) {
    console.warn('window.fetch is NOT writable and has no setter.');
  }
} catch (e) {
  console.error('Error during fetch diagnostic:', e);
}
