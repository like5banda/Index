/* script.js
   Vanilla JS:
   - Rolagem suave com offset do header
   - Header scrolled
   - Menu mobile
   - IntersectionObserver (fade-in + lazy)
   - Lightbox (galeria)
   - Back-to-top
   - Pausar outros vídeos quando um play
   - Sincronizar altura: faz os iframes do YouTube ganharem min-height igual à altura dos vídeos verticais em desktop
*/

(function(){
  try {
    console.info('script.js carregado');

    const $ = (sel, ctx=document) => ctx.querySelector(sel);
    const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

    document.addEventListener('DOMContentLoaded', () => {
      const header = $('#site-header');
      const navList = $('#nav-list');
      const navToggle = $('#nav-toggle');
      const navLinks = $$('.nav-link');
      const backToTop = $('#back-to-top');

      // Mobile menu toggle
      if(navToggle && navList){
        navToggle.addEventListener('click', () => {
          const open = navList.classList.toggle('open');
          navToggle.setAttribute('aria-expanded', String(open));
        });
      }

      // Smooth scroll with header offset
      function scrollToSection(id) {
        const el = document.getElementById(id);
        if(!el) return;
        const headerHeight = (header ? header.offsetHeight : 64) + 8;
        const y = el.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }

      // Attach click handlers for internal nav links
      navLinks.forEach(a => {
        const href = a.getAttribute('href') || '';
        if(href.startsWith('#')){
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const target = a.dataset.target || href.replace('#','');
            scrollToSection(target);
            if(navList) navList.classList.remove('open');
            if(navToggle) navToggle.setAttribute('aria-expanded','false');
          });
        }
      });

      // Header change on scroll + back-to-top visibility
      const scrolledClass = 'scrolled';
      const threshold = 50;
      function handleScroll() {
        if(window.pageYOffset > threshold) header && header.classList.add(scrolledClass);
        else header && header.classList.remove(scrolledClass);

        if(window.pageYOffset > 400) backToTop && backToTop.classList.add('show');
        else backToTop && backToTop.classList.remove('show');
      }
      window.addEventListener('scroll', handleScroll, { passive:true });
      handleScroll();

      // Back to top
      backToTop && backToTop.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

      // IntersectionObserver for fade-in and lazy-loading
      const ioOptions = { root: null, rootMargin: '0px', threshold: 0.12 };
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            entry.target.classList.add('inview');
            // lazy-load images inside the section
            entry.target.querySelectorAll('img[data-src]').forEach(img => {
              if(img.dataset.src){
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
              }
            });
            // update menu highlight
            const id = entry.target.id;
            if(id){
              $$('.nav-link').forEach(n => {
                const isActive = n.dataset.target === id || n.getAttribute('href') === `#${id}`;
                n.classList.toggle('active', isActive);
              });
            }
          }
        });
      }, ioOptions);

      $$('.section--fade').forEach(s => observer.observe(s));
      // observe lazy images as fallback
      $$('img[data-src]').forEach(img => {
        const container = img.closest('section') || img;
        observer.observe(container);
      });

      // GALLERY LIGHTBOX
      const galleryGrid = $('#gallery-grid');
      const lightbox = $('#lightbox');
      const lightboxImg = $('#lightbox-img');
      const lightboxClose = $('#lightbox-close');
      const lightboxContent = $('#lightbox-content');

      function openLightbox(src, alt=''){
        if(!lightbox) return;
        lightboxImg.src = src;
        lightboxImg.alt = alt;
        lightbox.setAttribute('aria-hidden','false');
        document.body.style.overflow = 'hidden';
        lightboxContent && lightboxContent.focus();
      }
      function closeLightbox(){
        if(!lightbox) return;
        lightbox.setAttribute('aria-hidden','true');
        lightboxImg.src = '';
        document.body.style.overflow = '';
      }

      galleryGrid && galleryGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.gallery-item');
        if(!btn) return;
        const src = btn.dataset.src || btn.querySelector('img')?.src;
        const alt = btn.querySelector('img')?.alt || '';
        openLightbox(src, alt);
      });

      lightboxClose && lightboxClose.addEventListener('click', closeLightbox);
      if(lightbox){
        lightbox.addEventListener('click', (e) => {
          if(e.target === lightbox) closeLightbox();
        });
      }
      if(lightbox && lightboxContent){
        lightbox.addEventListener('click', (e) => {
          if(!lightboxContent.contains(e.target)) closeLightbox();
        });
      }

      document.addEventListener('keydown', (e) => {
        if(e.key === 'Escape'){
          if(lightbox && lightbox.getAttribute('aria-hidden') === 'false') closeLightbox();
          if(navList && navList.classList.contains('open')){
            navList.classList.remove('open');
            navToggle && navToggle.setAttribute('aria-expanded','false');
          }
        }
      });

      // Pause other videos when one plays
      const videos = $$('video');
      videos.forEach(v => v.addEventListener('play', () => videos.forEach(other => { if(other !== v) other.pause(); })));

      // SYNC HEIGHT: make youtube iframes visually match the height of vertical videos on desktop
      const YOUTUBE_BREAKPOINT = 900; // px - same logic as CSS media query

      function applyYouTubeMinHeight(px) {
        const iframes = $$('.youtube-video');
        const items = $$('.youtube-item');
        iframes.forEach(ifr => ifr.style.minHeight = px ? `${px}px` : '');
        items.forEach(it => it.style.minHeight = px ? `${px}px` : '');
      }

      function getReferenceVerticalHeight(){
        // Prefer the first visible vertical video (.story-video)
        const ref = $('.videos-row-three .story-video');
        if(!ref) return 0;
        const rect = ref.getBoundingClientRect();
        return Math.round(rect.height);
      }

      function syncYouTubeHeights(){
        try {
          const vw = window.innerWidth || document.documentElement.clientWidth;
          if(vw >= YOUTUBE_BREAKPOINT){
            let h = getReferenceVerticalHeight();
            // If height is 0 (e.g., not yet rendered), try to compute from width and aspect-ratio fallback
            if(!h){
              const refVideo = $('.videos-row-three .story-video');
              if(refVideo){
                const width = refVideo.getBoundingClientRect().width;
                // vertical videos have aspect-ratio 9/16 -> height = width * (16/9)
                h = Math.round(width * (16/9));
              }
            }
            if(h && h > 0){
              applyYouTubeMinHeight(h);
            }
          } else {
            // small devices: remove forced min-height to allow natural responsive behavior
            applyYouTubeMinHeight(null);
          }
        } catch(err){
          console.warn('syncYouTubeHeights falhou', err);
        }
      }

      // Run on load and resize/orientation
      window.addEventListener('resize', () => {
        // debounce small
        clearTimeout(window._syncYTTimeout);
        window._syncYTTimeout = setTimeout(syncYouTubeHeights, 120);
      });
      window.addEventListener('orientationchange', () => setTimeout(syncYouTubeHeights, 260));
      window.addEventListener('load', () => setTimeout(syncYouTubeHeights, 240));

      // If vertical videos dispatch loadedmetadata, re-sync after they report dimensions
      $$('video.story-video').forEach(v => {
        v.addEventListener('loadedmetadata', () => setTimeout(syncYouTubeHeights, 80));
      });

      // Also call after DOMContentLoaded in case elements already have height
      setTimeout(syncYouTubeHeights, 300);

      // Initial small lazy-load fallback: load images whose top is already in viewport
      setTimeout(() => {
        $$('img[data-src]').forEach(img => {
          if(img.getBoundingClientRect().top < window.innerHeight + 100){
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
        });
      }, 600);

    }); // DOMContentLoaded

  } catch (err){
    console.error('Erro no script principal:', err);
  }
})();