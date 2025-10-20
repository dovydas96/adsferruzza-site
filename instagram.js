(function(){
  const DATA_URL = '/data/instagram.json';
  
  async function loadInstagramFeed(){
    const container = document.getElementById('instagramFeed');
    if(!container) return;
    
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      
      const data = await res.json();
      const media = data.media || [];
      
      if(media.length === 0){
        container.innerHTML = '<p style="opacity:.75">Nessun post disponibile</p>';
        return;
      }
      
      const grid = document.createElement('div');
      grid.className = 'instagram-grid';
      
      media.slice(0, 6).forEach(post => {
        const item = document.createElement('a');
        item.href = post.permalink || 'https://www.instagram.com/ad_sferruzza_pasticceria/';
        item.target = '_blank';
        item.rel = 'noopener';
        item.className = 'instagram-item';
        item.setAttribute('aria-label', post.caption ? post.caption.substring(0, 100) : 'Instagram post');
        
        const img = document.createElement('img');
        img.src = post.thumbnail || post.url;
        img.alt = post.caption ? post.caption.substring(0, 100) : 'Instagram post';
        img.loading = 'lazy';
        
        item.appendChild(img);
        grid.appendChild(item);
      });
      
      container.innerHTML = '';
      container.appendChild(grid);
      
    } catch(err){
      console.warn('[Instagram] Failed to load feed:', err.message);
      container.innerHTML = '<p style="opacity:.75">Feed Instagram non disponibile</p>';
    }
  }
  
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadInstagramFeed);
  } else {
    loadInstagramFeed();
  }
})();
