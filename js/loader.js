export function initLoader() {
  return new Promise(resolve => {
    const loader = document.getElementById('loader');
    if (!loader) { resolve(); return; }

    const clearLoader = () => {
      if (loader.style.display === 'none') return;
      loader.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      loader.style.opacity = '0';
      loader.style.transform = 'translateY(-8px)';
      setTimeout(() => { 
        loader.style.display = 'none'; 
        resolve(); 
      }, 500);
    };

    // Standard sequence
    setTimeout(clearLoader, 1500);

    // Safety fallback
    setTimeout(clearLoader, 3500);
  });
}
