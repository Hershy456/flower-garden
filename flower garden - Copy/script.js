const flowers = Array.from(document.querySelectorAll('.flower'));
const clearBtn = document.getElementById('clearBtn');
const autoBtn = document.getElementById('autoBtn');
const musicBtn = document.getElementById('musicBtn');
const music = document.getElementById('bgMusic');
const musicUrlInput = document.getElementById('musicUrl');
const loadMusicBtn = document.getElementById('loadMusic');
const exampleYouTube = document.getElementById('exampleYouTube');
const exampleSpotify = document.getElementById('exampleSpotify');
const musicPanel = document.getElementById('musicPanel');
const musicPanelToggle = document.getElementById('musicPanelToggle');
const musicExamples = document.getElementById('musicExamples');
const embedModal = document.getElementById('embedModal');
const embedContainer = document.getElementById('embedContainer');
const closeEmbed = document.getElementById('closeEmbed');
const embedDock = document.getElementById('embedDock');
const dockContainer = document.getElementById('dockContainer');
const closeDock = document.getElementById('closeDock');
// YouTube Player handles
let ytApiReady = false;
let ytApiLoading = false;
function loadYouTubeAPI(){
  if(ytApiReady) return Promise.resolve();
  if(ytApiLoading) return new Promise((res)=>{
    const check = setInterval(()=>{ if(ytApiReady){ clearInterval(check); res(); } }, 100);
  });
  ytApiLoading = true;
  return new Promise((resolve)=>{
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = function(){ ytApiReady = true; resolve(); };
  });
}
const playlistPrev = document.getElementById('playlistPrev');
const playlistNext = document.getElementById('playlistNext');
const playlistLabel = document.getElementById('playlistLabel');
const playlistPrevDock = document.getElementById('playlistPrevDock');
const playlistNextDock = document.getElementById('playlistNextDock');
const playlistLabelDock = document.getElementById('playlistLabelDock');

let currentFlower = 0;
let autoBloom = false;
let interval;

function animateIn(el){
  if(typeof anime !== 'undefined'){
    anime.remove(el);
    anime({
      targets: el,
      translateY: [120, 0],
      scale: [0.2, 1],
      opacity: [0, 1],
      rotate: ['-8deg', '0deg'],
      duration: 900,
      easing: 'easeOutExpo'
    });
  } else {
    el.classList.add('show');
  }
}

function revealNext(){
  if(currentFlower >= flowers.length) return;
  const f = flowers[currentFlower];
  f.classList.remove('hidden');
  animateIn(f);
  currentFlower++;
  if(music && music.paused){
    // try to play; browsers may block autoplay but on interaction it's fine
    try{ music.play(); }catch(e){}
  }
}

/* Reveal One Flower Per Click (ignore control clicks) */
document.body.addEventListener('click', (e)=>{
  if(e.target.closest('.btn')) return;
  revealNext();
});

/* Clear Garden */
clearBtn.addEventListener('click', ()=>{
  flowers.forEach(f=>{
    f.classList.add('hidden');
    f.classList.remove('show');
    // reset transform so anime can re-run
    f.style.transform = '';
  });
  currentFlower = 0;
  clearInterval(interval);
  autoBloom = false;
  autoBtn.textContent = '✨ Auto Bloom';
});

/* Auto Bloom */
autoBtn.addEventListener('click', ()=>{
  if(autoBloom){
    clearInterval(interval);
    autoBloom = false;
    autoBtn.textContent = '✨ Auto Bloom';
    return;
  }
  autoBloom = true;
  autoBtn.textContent = '❌ Stop Bloom';
  interval = setInterval(()=>{
    if(currentFlower < flowers.length){
      revealNext();
    } else {
      clearInterval(interval);
      autoBloom = false;
      autoBtn.textContent = '✨ Auto Bloom';
    }
  }, 850 + Math.random()*250);
});

/* Music Toggle */
musicBtn.addEventListener('click', ()=>{
  if(!music) return;
  if(music.paused){
    music.play();
    musicBtn.textContent = '🔊 Music';
  } else {
    music.pause();
    musicBtn.textContent = '🔈 Muted';
  }
});

/* Allow keyboard: space to plant, c to clear, a to auto */
document.addEventListener('keydown', (e)=>{
  if(e.code === 'Space'){
    e.preventDefault();
    revealNext();
  }
  if(e.key.toLowerCase() === 'c') clearBtn.click();
  if(e.key.toLowerCase() === 'a') autoBtn.click();
});

// Initialize: hide all flowers, enable first flower animation placeholder
flowers.forEach(f=>{ f.classList.add('hidden'); });

// Prefill music URL from localStorage and panel open state
try{
  const saved = localStorage.getItem('flower_music_url');
  if(saved && musicUrlInput) musicUrlInput.value = saved;
  const panelOpen = localStorage.getItem('flower_music_panel_open');
  if(panelOpen === 'false' && musicPanel){ musicPanel.classList.add('collapsed'); musicPanelToggle.setAttribute('aria-expanded','false'); }
}catch(e){}

// Panel toggle behavior
if(musicPanelToggle){
  musicPanelToggle.addEventListener('click', ()=>{
    if(!musicPanel) return;
    const collapsed = musicPanel.classList.toggle('collapsed');
    musicPanelToggle.setAttribute('aria-expanded', String(!collapsed));
    try{ localStorage.setItem('flower_music_panel_open', !collapsed); }catch(e){}
  });
}

// Save URL on Load
if(loadMusicBtn){
  loadMusicBtn.addEventListener('click', ()=>{
    try{ if(musicUrlInput && musicUrlInput.value) localStorage.setItem('flower_music_url', musicUrlInput.value); }catch(e){}
  });
}

// Enter key in input triggers load
if(musicUrlInput){
  musicUrlInput.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      loadMusicBtn.click();
    }
  });
}

/** Embed handling **/
function parseMusicUrl(url){
  if(!url) return null;
  try{
    const u = new URL(url.trim());
    // YouTube patterns
    if(u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')){
      let id = null;
      let list = null;
      if(u.hostname.includes('youtu.be')){
        id = u.pathname.slice(1);
        list = u.searchParams.get('list');
      } else {
        id = u.searchParams.get('v');
        list = u.searchParams.get('list');
      }
      // If url is a playlist page like /playlist?list=...
      if(u.pathname && u.pathname.includes('/playlist')){
        list = u.searchParams.get('list') || list;
      }
      if(id || list) return {type:'youtube',id, list};
    }
    // Spotify patterns
    if(u.hostname.includes('spotify.com')){
      // path like /track/{id} or /playlist/{id}
      const parts = u.pathname.split('/').filter(Boolean);
      if(parts.length >= 2){
        return {type:'spotify',kind:parts[0],id:parts[1]};
      }
    }
  }catch(e){
    return null;
  }
  return null;
}

async function checkOEmbed(parsed, originalUrl){
  if(!parsed) return false;
  try{
    if(parsed.type === 'youtube'){
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(originalUrl)}&format=json`;
      const res = await fetch(oembed);
      return res.ok;
    }
    if(parsed.type === 'spotify'){
      const oembed = `https://open.spotify.com/oembed?url=${encodeURIComponent(originalUrl)}`;
      const res = await fetch(oembed);
      return res.ok;
    }
  }catch(e){
    return false;
  }
  return false;
}

async function openEmbed(parsed, originalUrl){
  if(!parsed) return;
  // pause local music
  if(music && !music.paused){ music.pause(); }

  // check oEmbed availability to avoid "Video unavailable" iframe
  const available = await checkOEmbed(parsed, originalUrl);

  const createFallback = (url)=>{
    const wrap = document.createElement('div');
    wrap.style.padding = '18px';
    wrap.style.color = '#fff';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';
    const msg = document.createElement('div');
    msg.textContent = 'This video cannot be embedded — open it on the source site.';
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Open in new tab';
    a.style.color = '#ffd';
    wrap.appendChild(msg);
    wrap.appendChild(a);
    return wrap;
  };

  const targetIsDock = window.innerWidth >= 1000 && embedDock;
  const targetContainer = targetIsDock ? dockContainer : embedContainer;

  // clear both containers first
  embedContainer.innerHTML = '';
  dockContainer && (dockContainer.innerHTML = '');

  if(!available){
    targetContainer.appendChild(createFallback(originalUrl));
  } else {
    if(parsed.type === 'youtube'){
      // Use YouTube IFrame API to get error events and proper playlist control
      await loadYouTubeAPI();
      // destroy existing players if present
      try{ if(window.__ytPlayerModal){ window.__ytPlayerModal.destroy(); window.__ytPlayerModal = null; } }catch(e){}
      try{ if(window.__ytPlayerDock){ window.__ytPlayerDock.destroy(); window.__ytPlayerDock = null; } }catch(e){}

      const containerEl = targetContainer;
      containerEl.innerHTML = '';
      const div = document.createElement('div');
      const playerId = 'ytplayer_' + Math.random().toString(36).slice(2,9);
      div.id = playerId;
      div.style.width = '100%'; div.style.height = '100%';
      containerEl.appendChild(div);

      const opts = {height:'100%', width:'100%', events:{ onError: (e)=> onYouTubeError(e, originalUrl, containerEl) }};
      if(parsed.list){
        opts.playerVars = {listType:'playlist', list: parsed.list, autoplay:1, rel:0};
        showPlaylistControls(true, parsed.list);
        window.__currentPlaylist = {type:'youtube', list: parsed.list, index:0, originalUrl};
      } else if(parsed.id){
        opts.videoId = parsed.id;
        opts.playerVars = {autoplay:1, rel:0};
        showPlaylistControls(false);
        window.__currentPlaylist = null;
      }

      const player = new YT.Player(playerId, opts);
      if(targetIsDock){ window.__ytPlayerDock = player; } else { window.__ytPlayerModal = player; }
    }
    if(parsed.type === 'spotify'){
      const iframe = document.createElement('iframe');
      iframe.src = `https://open.spotify.com/embed/${parsed.kind}/${parsed.id}`;
      iframe.allow = 'encrypted-media';
      iframe.loading = 'lazy';
      targetContainer.appendChild(iframe);
      showPlaylistControls(false);
      window.__currentPlaylist = null;
    }
  }

  if(targetIsDock){
    embedDock.classList.remove('hidden');
  } else {
    embedModal.classList.remove('hidden');
  }
}

function showPlaylistControls(show, listId){
  const label = listId ? `Playlist: ${listId}` : '';
  if(playlistLabel) playlistLabel.textContent = label;
  if(playlistLabelDock) playlistLabelDock.textContent = label;
  const display = show ? '' : 'none';
  if(playlistPrev) playlistPrev.style.display = display;
  if(playlistNext) playlistNext.style.display = display;
  if(playlistPrevDock) playlistPrevDock.style.display = display;
  if(playlistNextDock) playlistNextDock.style.display = display;
  if(!show){
    if(playlistLabel) playlistLabel.textContent = '';
    if(playlistLabelDock) playlistLabelDock.textContent = '';
  }
}

function onYouTubeError(event, originalUrl, containerEl){
  // event.data contains error codes: 2, 5, 100, 101, 150
  try{
    // destroy players if any
    if(window.__ytPlayerModal){ window.__ytPlayerModal.destroy(); window.__ytPlayerModal = null; }
    if(window.__ytPlayerDock){ window.__ytPlayerDock.destroy(); window.__ytPlayerDock = null; }
  }catch(e){}
  // show fallback link
  containerEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.padding = '18px';
  wrap.style.color = '#fff';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '8px';
  const msg = document.createElement('div');
  msg.textContent = 'This video cannot be embedded (restricted or blocked). Open on YouTube instead.';
  const a = document.createElement('a');
  a.href = originalUrl;
  a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Open on YouTube'; a.style.color = '#ffd';
  wrap.appendChild(msg); wrap.appendChild(a);
  containerEl.appendChild(wrap);
  showPlaylistControls(false);
}

function updatePlaylistIndex(delta){
  const state = window.__currentPlaylist;
  if(!state || state.type !== 'youtube') return;
  const newIndex = Math.max(0, (state.index || 0) + delta);
  state.index = newIndex;
  // If YT Player exists, use API to play the requested index
  try{
    const player = window.__ytPlayerDock && !embedDock.classList.contains('hidden') ? window.__ytPlayerDock : window.__ytPlayerModal;
    if(player && typeof player.playVideoAt === 'function'){
      player.playVideoAt(newIndex);
      return;
    }
  }catch(e){}
  // Fallback: rebuild iframe src
  const src = `https://www.youtube.com/embed?listType=playlist&list=${encodeURIComponent(state.list)}&index=${state.index}&autoplay=1&rel=0`;
  if(!embedDock.classList.contains('hidden')){
    dockContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = src; iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; iframe.loading='lazy'; iframe.allowFullscreen=true;
    dockContainer.appendChild(iframe);
  }
  if(!embedModal.classList.contains('hidden')){
    embedContainer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = src; iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; iframe.loading='lazy'; iframe.allowFullscreen=true;
    embedContainer.appendChild(iframe);
  }
}

if(playlistPrev) playlistPrev.addEventListener('click', ()=> updatePlaylistIndex(-1));
if(playlistNext) playlistNext.addEventListener('click', ()=> updatePlaylistIndex(1));
if(playlistPrevDock) playlistPrevDock.addEventListener('click', ()=> updatePlaylistIndex(-1));
if(playlistNextDock) playlistNextDock.addEventListener('click', ()=> updatePlaylistIndex(1));

function closeEmbedModal(){
  embedModal.classList.add('hidden');
  // destroy YT modal player if exists
  try{ if(window.__ytPlayerModal){ window.__ytPlayerModal.destroy(); window.__ytPlayerModal = null; } }catch(e){}
  embedContainer.innerHTML = '';
  // resume local music optionally
  try{ if(music && music.paused){ music.play(); musicBtn.textContent = '🔊 Music'; } }catch(e){}
}

loadMusicBtn.addEventListener('click', ()=>{
  const url = musicUrlInput.value;
  const parsed = parseMusicUrl(url);
  if(!parsed){
    alert('Please paste a valid YouTube or Spotify URL.');
    return;
  }
  openEmbed(parsed, url);
});

exampleYouTube.addEventListener('click', ()=>{
  // example: Lofi hip hop radio (replace if you prefer)
  const url = 'https://www.youtube.com/watch?v=5qap5aO4i9A';
  musicUrlInput.value = url;
  openEmbed(parseMusicUrl(url), url);
});

exampleSpotify.addEventListener('click', ()=>{
  // example Spotify track (replace with your track)
  const url = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp';
  musicUrlInput.value = url;
  openEmbed(parseMusicUrl(url), url);
});

closeEmbed.addEventListener('click', ()=>{
  closeEmbedModal();
  // optionally resume local music
  try{ if(music && music.paused){ music.play(); musicBtn.textContent = '🔊 Music'; } }catch(e){}
});

// Close embed on overlay click
embedModal.addEventListener('click', (e)=>{
  if(e.target === embedModal) closeEmbedModal();
});

// Dock close
if(closeDock){
  closeDock.addEventListener('click', ()=>{
    embedDock.classList.add('hidden');
    // destroy dock player
    try{ if(window.__ytPlayerDock){ window.__ytPlayerDock.destroy(); window.__ytPlayerDock = null; } }catch(e){}
    dockContainer.innerHTML = '';
    try{ if(music && music.paused){ music.play(); musicBtn.textContent = '🔊 Music'; } }catch(e){}
  });
}

// If window resizes and dock becomes unavailable, move content to modal
window.addEventListener('resize', ()=>{
  if(window.innerWidth < 1000 && embedDock && !embedDock.classList.contains('hidden')){
    // move dock content to modal
    const html = dockContainer.innerHTML;
    dockContainer.innerHTML = '';
    embedContainer.innerHTML = html;
    embedDock.classList.add('hidden');
    embedModal.classList.remove('hidden');
  }
});

const butterflies = document.querySelectorAll('.butterfly');

butterflies.forEach((butterfly, index)=>{

  setInterval(()=>{

    const randomY = Math.random() * 20 - 10;
    const randomRotate = Math.random() * 12 - 6;

    butterfly.style.transform =
      `translateY(${randomY}px) rotate(${randomRotate}deg)`;

  }, 2000 + index * 400);

});