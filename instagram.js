// Instagram feed via Elfsight
(function(){
  const container = document.getElementById('instagramFeed');
  if(!container) return;
  
  // Elfsight widget
  container.innerHTML = '<div class="elfsight-app-c72cb9e0-92a5-49c8-92c5-325c1b0d26c6" data-elfsight-app-lazy></div>';
  
  // Load Elfsight script
  if(!document.querySelector('script[src*="elfsightcdn.com"]')){
    const script = document.createElement('script');
    script.src = 'https://elfsightcdn.com/platform.js';
    script.async = true;
    document.body.appendChild(script);
  }
})();
