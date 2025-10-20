// Instagram embed - loads official Instagram widget
(function(){
  const container = document.getElementById('instagramFeed');
  if(!container) return;
  
  // Create Instagram embed
  const embed = document.createElement('div');
  embed.className = 'instagram-embed-container';
  embed.innerHTML = `
    <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/ad_sferruzza_pasticceria/" data-instgrm-version="14">
      <a href="https://www.instagram.com/ad_sferruzza_pasticceria/" target="_blank">Visualizza su Instagram</a>
    </blockquote>
  `;
  
  container.innerHTML = '';
  container.appendChild(embed);
  
  // Load Instagram embed script
  if(!document.querySelector('script[src*="instagram.com/embed.js"]')){
    const script = document.createElement('script');
    script.async = true;
    script.src = '//www.instagram.com/embed.js';
    document.body.appendChild(script);
  } else if(window.instgrm){
    window.instgrm.Embeds.process();
  }
})();
