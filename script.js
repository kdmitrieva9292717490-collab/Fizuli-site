// Страница категории (?category=анораки и т.п., переход из мегаменю) —
// сетка должна показывать 5 плиток этой категории: карточка-заглушка
// (то самое фото №1 из папки, размноженное) на 4 местах + видео-плитка
// производства на 4-й позиции. Фото №2/№3 остаются только для
// перелистывания/наведения внутри каждой карточки — сама категория
// в реальности представлена одним товаром (демо), не 4 разными.
// Кардиган-кимоно — исключение: у него один товар и одна карточка, без
// видео и без размножения.
// ВАЖНО: этот код должен отработать раньше блока про hover-zones/клик по
// карточке/избранное ниже по файлу — они назначают обработчики на
// .product-card через querySelectorAll при загрузке, и должны увидеть уже
// готовую (склонированную) сетку, а не переписывать её потом
(function () {
  const requestedCategory = new URLSearchParams(location.search).get('category');
  if (!requestedCategory) return;
  const category = requestedCategory.trim();

  const scope = document.querySelector('.catalog-section, .recently-viewed')?.closest('main') || document;
  const cards = scope.querySelectorAll('.catalog-section .product-card[data-category], .recently-viewed .product-card[data-category]');
  const match = Array.from(cards).find((c) => c.dataset.category === category);
  if (!match) return;

  cards.forEach((c) => { if (c !== match) c.hidden = true; });
  // Карточки коллекций (data-collection, напр. Hybrid Athletic Club/Patchi/Sensei) — не категория,
  // при фильтре по категории тоже скрываем, иначе остаются висеть поверх
  scope.querySelectorAll('.catalog-section .product-card[data-collection], .recently-viewed .product-card[data-collection]').forEach((c) => { c.hidden = true; });

  const videoCard = scope.querySelector('.video-card');

  if (category === 'кардиганы') { // один товар — одна карточка, без видео и клонов
    if (videoCard) videoCard.hidden = true;
    return;
  }

  const clone1 = match.cloneNode(true);
  const clone2 = match.cloneNode(true);
  const clone3 = match.cloneNode(true);
  match.after(clone1);
  clone1.after(clone2);
  if (videoCard) {
    clone2.after(videoCard); // видео физически переносится на 4-е место, а не дублируется
    videoCard.hidden = false;
    videoCard.after(clone3);
  } else {
    clone2.after(clone3);
  }
})();

// Страница коллекции (?collection=patchi/sensei/hybrid%20athletic%20club, переход из мегаменю) —
// показывает только карточки с data-collection, остальные (включая видео)
// скрывает. Клонов и 5-плиточной сетки тут не нужно — коллекция уже
// представлена собственным набором разных товаров, а не одним демо-фото.
// Её баг-репорт (2026-09-14): раздел «Вы недавно смотрели» пропадал целиком —
// он неправильно попадал в ту же область видимости/скрытия, что и основная
// сетка каталога, хотя у его карточек нет и не должно быть data-collection.
// «Вы недавно смотрели» не должен зависеть от фильтра по коллекции вообще —
// область действия сужена только до .catalog-section
(function () {
  const requestedCollection = new URLSearchParams(location.search).get('collection');
  if (!requestedCollection) return;
  const collection = requestedCollection.trim();

  const scope = document.querySelector('.catalog-section');
  if (!scope) return;
  const collectionCards = scope.querySelectorAll('.product-card[data-collection]');
  const matches = Array.from(collectionCards).filter((c) => c.dataset.collection === collection);
  if (!matches.length) return;

  const otherCards = scope.querySelectorAll('.product-card:not([data-collection])');
  otherCards.forEach((c) => { c.hidden = true; });
  collectionCards.forEach((c) => { if (!matches.includes(c)) c.hidden = true; });

  const videoCard = scope.querySelector('.video-card');
  if (videoCard) videoCard.hidden = true;
})();

// Сетка каталога БЕЗ фильтра (обычный вид всех категорий вперемешку) — её
// прямая правка (2026-09-14): видео-плитка должна стоять 4-й по счёту, а не
// последней, как раньше лежала статично в разметке. При активном ?category=
// или ?collection= эту перестановку не делаю — там видео уже расставляют/
// прячут блоки выше. .catalog-grid-row на мобильном — CSS Grid 2 в ряд
// (см. style.css), поэтому все ряды пересобираю заново по 4 карточки, а не
// просто переставляю видео внутри своего ряда — иначе один из рядов
// оказался бы с нечётным числом карточек и оставил пустое место в сетке
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('category') || params.get('collection')) return;
  document.querySelectorAll('.catalog-grid-rows').forEach((rows) => {
    const videoCard = rows.querySelector('.video-card');
    if (!videoCard) return;
    const rowEls = Array.from(rows.querySelectorAll('.catalog-grid-row'));
    const items = rowEls.flatMap((row) => Array.from(row.children));
    const withoutVideo = items.filter((el) => el !== videoCard);
    withoutVideo.splice(3, 0, videoCard);
    rowEls.forEach((row) => { row.innerHTML = ''; });
    withoutVideo.forEach((el, i) => {
      const row = rowEls[Math.floor(i / 4)];
      if (row) row.appendChild(el);
    });
  });
})();

// Шапка сайта: переключение на белый вариант (компонент Header, Color=White в Figma).
// Белой она становится в двух случаях: когда тёмный hero уходит из-под неё вверх
// при скролле, и когда открыто мегаменю (иначе на белой панели мегаменю потерялись
// бы белые пункты меню в шапке).
(function () {
  const header = document.querySelector('.site-header');
  const mobHeader = document.querySelector('.mob-header');
  const hero = document.querySelector('.hero');
  if (!header) return;

  let scrolledPastHero = false;
  let megamenuOpen = false;
  let searchOpen = false;

  function applyHeaderState() {
    // На страницах без hero (!hero) шапка обязана оставаться solid ВСЕГДА —
    // раньше при закрытии мегаменю/поиска это условие пересчитывалось без
    // учёта отсутствия hero и получало false, снимая .site-header--solid,
    // заданный изначально в разметке. Шапка становилась прозрачной (белые
    // иконки исчезали на светлом фоне страницы, сквозь неё был виден контент).
    const solid = !hero || scrolledPastHero || megamenuOpen || searchOpen;
    header.classList.toggle('site-header--solid', solid);
    if (mobHeader) mobHeader.classList.toggle('mob-header--solid', solid);
  }

  // Есть только на главной (index.html) — на остальных страницах хедер
  // сразу solid через .site-header--solid/.mob-header--solid в разметке,
  // менять его цвет при скролле не нужно
  if (hero) {
    function updateScrollState() {
      const heroBottom = hero.getBoundingClientRect().bottom;
      scrolledPastHero = heroBottom <= header.offsetHeight;
      applyHeaderState();
    }

    window.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
  }

  // Мегаменю: у "мужчинам" и "женщинам" — своя, разная по содержанию панель
  // (компонент Header/Megamenu, варианты OpenMan/OpenWoman в Figma).
  // Открывается КЛИКОМ по табу (не по ховеру). Повторный клик по тому же
  // табу закрывает меню; клик по другому табу переключает на него;
  // клик мимо меню или Esc — закрывает. Активный таб подчёркнут.
  const megamenus = {
    man: document.getElementById('megamenu-man'),
    woman: document.getElementById('megamenu-woman'),
  };
  const triggers = document.querySelectorAll('[data-megamenu-trigger]');
  if (triggers.length) {
    let openKey = null;

    function openMegamenu(key) {
      Object.entries(megamenus).forEach(([k, el]) => {
        if (el) el.classList.toggle('is-hidden', k !== key);
      });
      triggers.forEach((t) => {
        t.classList.toggle('nav__link--active', t.dataset.megamenuTrigger === key);
      });
      openKey = key;
      megamenuOpen = true;
      applyHeaderState();
    }

    function closeMegamenu() {
      Object.values(megamenus).forEach((el) => el && el.classList.add('is-hidden'));
      triggers.forEach((t) => t.classList.remove('nav__link--active'));
      openKey = null;
      megamenuOpen = false;
      applyHeaderState();
    }

    triggers.forEach((trigger) => {
      const key = trigger.dataset.megamenuTrigger;
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (openKey === key) closeMegamenu();
        else openMegamenu(key);
      });
    });

    document.addEventListener('click', (e) => {
      if (!openKey) return;
      const openPanel = megamenus[openKey];
      const clickedInsidePanel = openPanel && openPanel.contains(e.target);
      const clickedTrigger = e.target.closest('[data-megamenu-trigger]');
      if (!clickedInsidePanel && !clickedTrigger) closeMegamenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openKey) closeMegamenu();
    });
  }

  // Аккордеоны внутри мегаменю ("повседневная линия" / "спортивная база") —
  // клик по заголовку сворачивает/разворачивает список категорий.
  // По умолчанию открыты, как показано в самом компоненте Figma.
  document.querySelectorAll('.megamenu-accordion__trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const list = trigger.nextElementSibling;
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      list.classList.toggle('is-hidden', expanded);
    });
  });

  // Выпадающий список "все товары" в футере (десктоп и мобильный вариант
  // футера — оба есть в DOM одновременно, CSS просто прячет ненужный) —
  // клик по стрелке открывает список "мужское"/"женское", клик мимо закрывает
  const footerDropdowns = document.querySelectorAll('[data-footer-dropdown]');
  footerDropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector('[data-footer-dropdown-trigger]');
    const menu = dropdown.querySelector('[data-footer-dropdown-menu]');
    trigger.addEventListener('click', () => {
      const isOpen = dropdown.classList.contains('is-open');
      footerDropdowns.forEach((d) => {
        d.classList.remove('is-open');
        d.querySelector('[data-footer-dropdown-menu]').classList.add('is-hidden');
      });
      if (!isOpen) {
        dropdown.classList.add('is-open');
        menu.classList.remove('is-hidden');
      }
    });
  });
  if (footerDropdowns.length) {
    document.addEventListener('click', (e) => {
      footerDropdowns.forEach((dropdown) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('is-open');
          dropdown.querySelector('[data-footer-dropdown-menu]').classList.add('is-hidden');
        }
      });
    });
  }

  // Поиск (компонент Header/Search). Настоящей базы товаров нет, поэтому
  // "результаты" не подделываем: набранный вручную текст всегда приводит
  // к состоянию "ничего не нашлось" (оно тоже есть в макете — State=EmptyResults).
  // Клик по чипу "часто ищут" — это готовый запрос, для него просто оставляем
  // дефолтный вид (часто ищут + популярные), как будто по нему есть результаты.
  const searchTrigger = document.getElementById('searchTrigger');
  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('searchInput');
  const searchClose = document.getElementById('searchClose');
  const searchClear = document.getElementById('searchClear');
  const searchContent = document.getElementById('searchContent');
  const searchEmpty = document.getElementById('searchEmpty');
  const searchEmptyQuery = document.getElementById('searchEmptyQuery');

  if (searchTrigger && searchOverlay && searchInput) {
    function openSearch() {
      searchOverlay.classList.remove('is-hidden');
      searchInput.focus();
      searchOpen = true;
      applyHeaderState();
    }
    function closeSearch() {
      searchOverlay.classList.add('is-hidden');
      searchInput.value = '';
      updateSearchView();
      searchOpen = false;
      applyHeaderState();
    }
    function updateSearchView() {
      const query = searchInput.value.trim();
      searchClear.classList.toggle('is-hidden', query === '');
      if (query === '') {
        searchContent.classList.remove('is-hidden');
        searchEmpty.classList.add('is-hidden');
      } else {
        searchContent.classList.add('is-hidden');
        searchEmpty.classList.remove('is-hidden');
        searchEmptyQuery.textContent = query;
      }
    }

    searchTrigger.addEventListener('click', openSearch);
    searchClose.addEventListener('click', closeSearch);
    searchInput.addEventListener('input', updateSearchView);
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.focus();
      updateSearchView();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !searchOverlay.classList.contains('is-hidden')) closeSearch();
    });
    document.querySelectorAll('.search-suggestion').forEach((chip) => {
      chip.addEventListener('click', () => {
        searchInput.value = chip.textContent.trim();
        searchInput.focus();
        // готовый запрос из подсказки — считаем, что результаты есть,
        // оставляем дефолтный вид вместо "ничего не нашлось"
        searchClear.classList.remove('is-hidden');
        searchContent.classList.remove('is-hidden');
        searchEmpty.classList.add('is-hidden');
      });
    });
  }
})();

// Cookie-баннер: показываем только при первом визите (нет флага в localStorage),
// по клику "принять" — сохраняем флаг и скрываем баннер.
(function () {
  const STORAGE_KEY = 'fizuli_cookie_accepted';
  const banner = document.getElementById('cookieBanner');
  const acceptBtn = document.getElementById('cookieAccept');
  if (!banner || !acceptBtn) return;

  if (localStorage.getItem(STORAGE_KEY)) {
    banner.classList.add('is-hidden');
  }

  acceptBtn.addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    banner.classList.add('is-hidden');
  });
})();

// Новинки: стрелки-карусель + полоска скролла (компонент CarouselControls).
// Стрелки скроллят список на ширину одной карточки, полоска отражает
// реальную позицию скролла (ширина = видимая доля списка), а не просто
// декоративная — раньше её не подключали, JS не было вообще
(function () {
  const list = document.querySelector('.novelties .product-list');
  const controls = document.querySelector('.novelties .carousel-controls');
  if (!list || !controls) return;

  const prevBtn = controls.querySelector('.icon-btn--arrow[aria-label="Предыдущие товары"]');
  const nextBtn = controls.querySelector('.icon-btn--arrow[aria-label="Следующие товары"]');
  const thumb = controls.querySelector('.scrollbar__thumb');
  const firstCard = list.querySelector('.product-card');
  const step = firstCard ? firstCard.offsetWidth + 16 : 384; // ширина карточки + gap (16px)

  function update() {
    const maxScroll = list.scrollWidth - list.clientWidth;
    if (prevBtn) prevBtn.disabled = list.scrollLeft <= 0;
    if (nextBtn) nextBtn.disabled = list.scrollLeft >= maxScroll - 1;
    if (!thumb) return;
    if (maxScroll <= 0) {
      thumb.style.width = '100%';
      thumb.style.marginLeft = '0';
      return;
    }
    const ratio = list.clientWidth / list.scrollWidth;
    thumb.style.width = `${ratio * 100}%`;
    thumb.style.marginLeft = `${(list.scrollLeft / maxScroll) * (100 - ratio * 100)}%`;
  }

  if (prevBtn) prevBtn.addEventListener('click', () => list.scrollBy({ left: -step, behavior: 'smooth' }));
  if (nextBtn) nextBtn.addEventListener('click', () => list.scrollBy({ left: step, behavior: 'smooth' }));
  list.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  update();
})();

// Карточка товара, фото:
// — Десктоп: смена фото при наведении на левую/среднюю/правую треть
//   изображения (3 зоны, компонент UI/Product Gallery, State=Hover 1/2/3).
//   Зона 1 — то же фото, что и по умолчанию, зоны 2 и 3 — два дополнительных
//   ракурса (одни и те же демо-фото на все карточки, не собственные ракурсы
//   каждого товара).
// — Тач-экран (мобильный/планшет): её прямая правка (2026-09-14) — вместо
//   тапа по зонам теперь обычный горизонтальный свайп между теми же фото
//   (нативный scroll-snap, без своего JS для самого жеста). Здесь только
//   один раз при загрузке строим ленту слайдов из тех же источников,
//   что раньше были в data-hover-src у зон, и убираем сами зоны.
document.querySelectorAll('.product-card__gallery').forEach((gallery) => {
  const image = gallery.querySelector('.product-card__image');
  const imageFade = gallery.querySelector('.product-card__image--fade');
  const zones = gallery.querySelectorAll('.product-card__hover-zone');
  if (!image || !imageFade || !zones.length) return;

  const isTouch = window.matchMedia('(hover: none)').matches;

  if (isTouch) {
    const cutoutClasses = ['product-card__image--cutout', 'product-card__image--cutout-top']
      .filter((c) => image.classList.contains(c));
    const sources = [image.style.backgroundImage];
    zones.forEach((zone) => {
      if (zone.dataset.hoverSrc) sources.push(`url('${zone.dataset.hoverSrc}')`);
    });
    if (sources.length > 1) {
      const track = document.createElement('div');
      track.className = 'product-card__swipe-track';
      sources.forEach((src) => {
        const slide = document.createElement('div');
        slide.className = ['product-card__swipe-slide', ...cutoutClasses].join(' ');
        slide.style.backgroundImage = src;
        track.appendChild(slide);
      });
      gallery.insertBefore(track, gallery.firstChild);
      image.remove();
      imageFade.remove();
    }
    gallery.querySelector('.product-card__hover-zones')?.remove();
    return;
  }

  const defaultSrc = image.style.backgroundImage;
  let pendingSrc = null;

  function onFadeIn(e) {
    if (e.propertyName !== 'opacity') return;
    imageFade.style.transition = 'none';
    image.style.backgroundImage = imageFade.style.backgroundImage;
    imageFade.style.opacity = '0';
    void imageFade.offsetWidth;
    imageFade.style.transition = 'opacity .4s ease';
    const next = pendingSrc;
    pendingSrc = null;
    // если за время затухания навели на другую зону — сразу начинаем следующий переход
    if (next && next !== image.style.backgroundImage) swapTo(next);
  }
  imageFade.addEventListener('transitionend', onFadeIn);

  function swapTo(src) {
    if (image.style.backgroundImage === src) { pendingSrc = null; return; }
    if (getComputedStyle(imageFade).opacity !== '0') { pendingSrc = src; return; }
    imageFade.style.backgroundImage = src;
    void imageFade.offsetWidth; // reflow перед стартом перехода
    imageFade.style.opacity = '1';
  }

  zones.forEach((zone) => {
    const hoverSrc = zone.dataset.hoverSrc;
    zone.addEventListener('mouseenter', () => {
      swapTo(hoverSrc ? `url('${hoverSrc}')` : defaultSrc);
    });
  });
  gallery.addEventListener('mouseleave', () => {
    swapTo(defaultSrc);
  });
});

// Карточка товара — клик по ней целиком ведёт на страницу товара, кроме
// клика по интерактивным элементам внутри (избранное, быстрое добавление и
// открывшаяся панель размеров, свотч цвета, ссылка «уведомить о поступлении») —
// у них своё поведение, и переход на страницу товара в этом случае не нужен.
// Реальных отдельных страниц под каждый товар нет — все карточки ведут на
// один и тот же product.html (макет карточки товара пока один — «Костюм»)
document.querySelectorAll('.product-card').forEach((card) => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('.product-card__favorite, .product-card__quick-add, .product-card__sizes, .color-swatch, .product-card__notify')) return;
    window.location.href = 'product.html';
  });
});

// Карточка товара — избранное (компонент IconButton/Favorite, State=Fill):
// клик переключает иконку из обводки в заливку и обратно.
document.querySelectorAll('.product-card__favorite').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('is-active');
  });
});

// Карточка товара — выбор размера (компонент UI/Product Gallery, State=SizesOpen):
// клик по иконке корзины открывает вместо неё ряд размеров на всю ширину карточки
// (кнопки XS–XXXL, компонент Size Button; сама иконка корзины на время панели
// прячется — под XXXL для неё уже нет места). Клик по размеру выбирает его
// (State=Selected) и красит иконку корзины в заливку (State=Fill) — товар
// считается добавленным, но панель не закрывается сама: закрывается только
// когда курсор уходит с панели (это и есть команда "убрать товар из выбора").
// Товары с одним размером (аксессуары, модификатор .product-card--one-size) —
// по DEV NOTE в Figma (id 3982:22080) размер уже предвыбран по умолчанию, ряд
// размеров им вообще не нужен, кнопка «в корзину» сразу в состоянии Fill.
// Детские товары (.product-card--kids-size) — свой, урезанный ряд размеров:
// в Figma (Size Selector Block, id I4395:31450;4389:28500) из всего набора
// Size Button видны только 3XS/2XS/XS (L/XL/2XL/3XL/OS у этого инстанса
// visible=false), 3XS в состоянии Selected
const PRODUCT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const KIDS_SIZES = ['3XS', '2XS', 'XS'];
document.querySelectorAll('.product-card__gallery').forEach((gallery) => {
  const quickAdd = gallery.querySelector('.product-card__quick-add');
  if (!quickAdd) return;

  if (gallery.closest('.product-card--one-size')) {
    quickAdd.addEventListener('click', () => {
      quickAdd.classList.toggle('is-active');
    });
    return;
  }

  const sizes = gallery.closest('.product-card--kids-size') ? KIDS_SIZES : PRODUCT_SIZES;
  const sizesPanel = document.createElement('div');
  sizesPanel.className = 'product-card__sizes';
  sizesPanel.innerHTML = sizes.map(
    (size) => `<button class="product-card__size-btn" type="button">${size}</button>`
  ).join('');
  gallery.appendChild(sizesPanel);

  function closePanel() {
    gallery.classList.remove('product-card__gallery--sizes-open');
  }

  quickAdd.addEventListener('click', () => {
    gallery.classList.toggle('product-card__gallery--sizes-open');
  });

  sizesPanel.querySelectorAll('.product-card__size-btn').forEach((sizeBtn) => {
    sizeBtn.addEventListener('click', () => {
      const wasSelected = sizeBtn.classList.contains('is-selected');
      sizesPanel.querySelectorAll('.product-card__size-btn').forEach((b) => b.classList.remove('is-selected'));
      if (!wasSelected) {
        sizeBtn.classList.add('is-selected');
      }
      quickAdd.classList.toggle('is-active', !wasSelected);
    });
  });

  sizesPanel.addEventListener('mouseleave', closePanel);

  document.addEventListener('click', (e) => {
    if (!gallery.contains(e.target)) closePanel();
  });
});

// Hero-слайдер: 3 слайда (компонент Hero Slider, Slider=Slider1/2/3 — те же
// заголовок/подпись, разные фото). Смена по клику на стрелки и автоматически.
// Полоска пагинации наполняется, пока идёт показ слайда (как в сторис), и как
// только доходит до конца своего сегмента — переключает на следующий слайд.
(function () {
  const media = document.getElementById('heroMedia');
  const mediaFade = document.getElementById('heroMediaFade');
  const pagination = document.getElementById('heroPagination');
  const prevBtn = document.getElementById('heroPrev');
  const nextBtn = document.getElementById('heroNext');
  if (!media || !mediaFade || !pagination || !prevBtn || !nextBtn) return;

  const SLIDE_DURATION = 6000; // мс на слайд — столько же наполняется полоска
  const FADE_DURATION = 1200; // мс на перекрёстное затухание фото

  // Позиция и масштаб — посчитаны из настоящей матрицы обрезки каждого слайда
  // в Figma (imageTransform), не на глаз: она же задаёт и смещение "по трети"
  // (кроп у всех начинается от левого края фото, не по центру — это и даёт
  // фигуре смещение вправо), и относительный масштаб между фото, чтобы девушка
  // была одного размера на всех кадрах, а не крупнее/мельче от слайда к слайду.
  // ВАЖНО: background-size всегда 'cover' (задан в CSS) — это гарантирует, что
  // фото покрывает контейнер целиком при любой ширине/высоте окна, без пустых
  // полос по бокам. "Зум сверх cover" для подгонки размера фигуры между слайдами
  // делаем через transform: scale() поверх уже покрывающего фото — так дозум
  // может только обрезать чуть больше, но никогда не оставит пустых полей
  // (в отличие от background-size: auto <%>, который на очень широких экранах
  // мог оказаться уже контейнера и оставлял серые полосы по краям)
  const slides = [
    { src: 'assets/images/hero.png', position: '47% 46%', zoom: 1 },
    { src: 'assets/images/hero-slide2-hd.jpg', position: '43% 46%', zoom: 1.26 },
    { src: 'assets/images/hero-slide3-hd.jpg', position: '47% 34%', zoom: 1.16 },
  ];
  const fills = [...pagination.querySelectorAll('.hero__dot__fill')];
  let index = 0;

  // --- Перекрёстное затухание фото ---
  mediaFade.style.transition = `opacity ${FADE_DURATION}ms ease`;

  function setSlideImage(slide) {
    mediaFade.style.backgroundImage = `url('${slide.src}')`;
    mediaFade.style.backgroundPosition = slide.position;
    mediaFade.style.transformOrigin = slide.position;
    mediaFade.style.transform = `scale(${slide.zoom})`;
    void mediaFade.offsetWidth; // reflow — применить картинку до старта перехода
    mediaFade.style.opacity = '1';

    const onFadeIn = (e) => {
      if (e.propertyName !== 'opacity') return;
      mediaFade.removeEventListener('transitionend', onFadeIn);
      // Сначала мгновенно (без перехода) переносим фото в нижний слой...
      mediaFade.style.transition = 'none';
      media.style.backgroundImage = mediaFade.style.backgroundImage;
      media.style.backgroundPosition = slide.position;
      media.style.transformOrigin = slide.position;
      media.style.transform = `scale(${slide.zoom})`;
      mediaFade.style.opacity = '0';
      void mediaFade.offsetWidth;
      // ...и возвращаем переход для следующего затухания
      mediaFade.style.transition = `opacity ${FADE_DURATION}ms ease`;
    };
    mediaFade.addEventListener('transitionend', onFadeIn);
  }

  // --- Полоска-прогресс пагинации ---
  function setFillState(i, state) {
    const fill = fills[i];
    if (state === 'done') {
      fill.classList.remove('hero__dot__fill--filling');
      fill.style.transition = 'none';
      fill.style.width = '100%';
    } else if (state === 'empty') {
      fill.classList.remove('hero__dot__fill--filling');
      fill.style.transition = 'none';
      fill.style.width = '0%';
    } else if (state === 'filling') {
      // Баг был здесь: ниже стоял "transition: none" инлайн-стилем, а следом —
      // класс с transition через CSS и ОТДЕЛЬНО transitionDuration. Инлайн-стиль
      // важнее класса, поэтому "none" оставался в силе, ширина скакала мгновенно
      // и transitionend вообще не срабатывал — отсюда не было автопереключения.
      fill.style.transition = 'none';
      fill.style.width = '0%';
      void fill.offsetWidth;
      fill.classList.add('hero__dot__fill--filling');
      fill.style.transition = `width ${SLIDE_DURATION}ms linear`;
      fill.style.width = '100%';
    }
  }

  function goTo(newIndex) {
    index = (newIndex + slides.length) % slides.length;
    setSlideImage(slides[index]);
    fills.forEach((fill, i) => {
      setFillState(i, i < index ? 'done' : i > index ? 'empty' : 'filling');
    });
  }

  // Когда полоска текущего слайда доходит до конца — переключаем автоматически
  pagination.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'width') return;
    if (!e.target.classList.contains('hero__dot__fill--filling')) return;
    goTo(index + 1);
  });

  prevBtn.addEventListener('click', () => goTo(index - 1));
  nextBtn.addEventListener('click', () => goTo(index + 1));

  goTo(0);
})();

// Готовые образы: hotspot-точки на фото (компонент Hotspot) — клик по точке
// открывает карточку товара из этой точки, повторный клик или клик по крестику
// закрывает её. Открыта может быть только одна карточка за раз.
(function () {
  const hotspots = document.querySelectorAll('.hotspot');
  if (!hotspots.length) return;

  function closeAllHotspotCards() {
    document.querySelectorAll('.hotspot-card').forEach((c) => c.classList.add('is-hidden'));
  }

  hotspots.forEach((spot) => {
    const card = document.querySelector(`.hotspot-card[data-hotspot-card="${spot.dataset.hotspot}"]`);
    if (!card) return;
    spot.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = !card.classList.contains('is-hidden');
      closeAllHotspotCards();
      card.classList.toggle('is-hidden', wasOpen);
    });
    const closeBtn = card.querySelector('.hotspot-card__close');
    if (closeBtn) closeBtn.addEventListener('click', () => card.classList.add('is-hidden'));
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hotspot-card')) closeAllHotspotCards();
  });
})();

// Готовые образы: модалка «выберите размеры» по кнопке «купить образ»
// (тот же паттерн is-hidden + Escape, что и у поисковой шторки)
(function () {
  const buyBtn = document.querySelector('.lookbook-buy-btn');
  const modal = document.getElementById('lookModal');
  if (!buyBtn || !modal) return;

  function openModal() {
    modal.classList.remove('is-hidden');
  }
  function closeModal() {
    modal.classList.add('is-hidden');
  }

  buyBtn.addEventListener('click', openModal);
  modal.querySelector('.modal-look__close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('is-hidden')) closeModal();
  });

  // В каждой карточке — свой выбор размера (одна кнопка за раз). Пока размер
  // не выбран — под чекбоксом видна подсказка об ошибке (реальный стиль
  // Text/Error из макета), выбор размера её прячет
  modal.querySelectorAll('[data-look-item]').forEach((item) => {
    const sizeBtns = item.querySelectorAll('.look-item__size-btn:not(:disabled)');
    const errorHint = item.querySelector('[data-look-error]');
    sizeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        if (errorHint) errorHint.hidden = true;
      });
    });

  });

  // Избранное на карточках внутри модалки — тот же паттерн переключения
  // обводка/заливка, что и у .product-card__favorite/.cart-page-item__favorite,
  // просто раньше для этой модалки не был добавлен вообще (кнопка была без
  // обработчика)
  modal.querySelectorAll('.look-item__favorite').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('is-active'));
  });
})();

// Превью корзины (компонент Cart Drawer) — выезжает справа по клику на иконку
// корзины в хедере. Счётчик количества у товара: пока в строке 1 шт, левая
// кнопка — это "удалить" (иконка корзины/мусорки, компонент Counter State=1),
// как только становится больше 1 — та же кнопка превращается в "минус"
// (State=">1"). Сумма и бейдж-счётчик в хедере пересчитываются при любом
// изменении количества.
(function () {
  const trigger = document.getElementById('cartTrigger');
  const overlay = document.getElementById('cartDrawerOverlay');
  const cartCount = document.getElementById('cartCount');
  const mobCartCount = document.getElementById('mobCartCount');
  const totalEl = document.getElementById('cartDrawerTotal');
  const itemsBox = document.getElementById('cartDrawerItems');
  if (!trigger || !overlay || !itemsBox) return;

  function openDrawer() {
    overlay.classList.add('is-open');
  }
  function closeDrawer() {
    overlay.classList.remove('is-open');
  }

  function formatPrice(n) {
    return n.toLocaleString('ru-RU') + ' ₽';
  }

  function recalc() {
    let total = 0;
    let count = 0;
    itemsBox.querySelectorAll('.cart-item').forEach((item) => {
      const price = Number(item.dataset.price);
      const qty = Number(item.querySelector('[data-count]').textContent);
      total += price * qty;
      count += qty;
    });
    if (totalEl) totalEl.textContent = formatPrice(total);
    if (cartCount) cartCount.textContent = String(count);
    if (mobCartCount) mobCartCount.textContent = String(count);
  }

  function setQty(item, qty) {
    const countEl = item.querySelector('[data-count]');
    countEl.textContent = String(qty);
    // Левая кнопка счётчика: "−" пока можно просто уменьшить количество,
    // иконка удаления — только когда следующее нажатие уберёт товар совсем
    const decrementIcon = item.querySelector('[data-action="decrement"] .icon');
    if (decrementIcon) {
      decrementIcon.classList.toggle('icon--minus', qty > 1);
      decrementIcon.classList.toggle('icon--delete', qty <= 1);
    }
  }

  itemsBox.addEventListener('click', (e) => {
    const btn = e.target.closest('.cart-item__counter-btn');
    if (!btn) return;
    const item = btn.closest('.cart-item');
    const qty = Number(item.querySelector('[data-count]').textContent);

    if (btn.dataset.action === 'increment') {
      setQty(item, qty + 1);
    } else if (qty > 1) {
      setQty(item, qty - 1);
    } else {
      item.remove();
    }
    recalc();
  });

  trigger.addEventListener('click', openDrawer);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDrawer();
  });
  const closeBtn = document.getElementById('cartDrawerClose');
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeDrawer();
  });

  // «Перейти к оформлению» в превью корзины ведёт на полную страницу корзины
  const submitBtn = overlay.querySelector('.cart-drawer__submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => { window.location.href = 'cart.html'; });
  }

  recalc();
})();

// Личный кабинет (account.html): вкладки в сайдбаре ("личные данные" / "мои заказы")
// переключают контент без перезагрузки страницы — это одна страница с двумя
// состояниями в Figma ("Page / Account / Personal Data" и "Page / Orders / Filled"),
// а не два разных экрана
(function () {
  const nav = document.querySelector('.account-nav');
  if (!nav) return;

  const tabs = nav.querySelectorAll('[data-account-tab]');
  const panels = document.querySelectorAll('[data-account-panel]');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.accountTab;
      tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      panels.forEach((p) => p.classList.toggle('is-hidden', p.dataset.accountPanel !== target));
    });
  });
})();

// Детали заказа (шторка справа) — открывается по клику на стрелку у суммы
// в списке заказов. Товары и логистика в шторке — те же заглушки, что и везде
// на сайте, меняются только номер/статус/дата — их берём из карточки, по которой
// кликнули, чтобы шторка не противоречила списку
(function () {
  const overlay = document.getElementById('orderDrawerOverlay');
  if (!overlay) return;

  const numberEl = document.getElementById('orderDrawerNumber');
  const statusEl = document.getElementById('orderDrawerStatus');
  const dateEl = document.getElementById('orderDrawerDate');

  function openDrawer(card) {
    const number = card.querySelector('.order-card__number').childNodes[0].textContent.replace('Заказ №', '').trim();
    const status = card.querySelector('.order-status');
    numberEl.textContent = number;
    statusEl.textContent = status.textContent;
    statusEl.className = status.className; // переносим и order-status--done, если есть
    dateEl.textContent = card.querySelector('.order-card__date').textContent;
    overlay.classList.add('is-open');
    document.body.classList.add('has-open-drawer');
  }
  function closeDrawer() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('has-open-drawer');
  }

  document.querySelectorAll('[data-open-order-detail]').forEach((btn) => {
    btn.addEventListener('click', () => openDrawer(btn.closest('.order-card')));
  });
  document.getElementById('orderDrawerClose').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeDrawer();
  });

  const copyBtn = document.querySelector('.detail-row__copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const trackNumber = copyBtn.previousElementSibling.textContent;
      navigator.clipboard?.writeText(trackNumber);
    });
  }
})();

// Видео-плитка в сетке каталога (любая страница) — должна быть той же высоты,
// что и соседняя карточка товара. align-items:stretch на .catalog-grid-row
// справляется, когда у видео есть пара в той же строке грида, но если видео
// осталось единственным элементом строки (нечётное число карточек в ряду),
// тянуть высоту не от кого — видео остаётся короче (нет текстового блока
// описания). Меряем и выставляем высоту явно, само определяя, с какой
// карточкой видео физически стоит в одной строке (по совпадению offsetTop)
function syncVideoCardHeight() {
  document.querySelectorAll('.video-card').forEach((video) => {
    const row = video.closest('.catalog-grid-row');
    if (!row) return;
    // Раньше был ':scope > .product-card' — на части мобильных браузеров
    // (старые WebView) :scope в querySelectorAll ведёт себя не как ожидается,
    // поэтому ищем прямых детей руками, без CSS-селектора со :scope
    const cards = Array.from(row.children).filter((c) => c.classList.contains('product-card') && !c.hidden);
    if (!cards.length) return;
    video.style.height = '';
    const videoTop = video.offsetTop;
    const sameRow = cards.filter((c) => Math.abs(c.offsetTop - videoTop) < 2);
    const target = sameRow.length ? sameRow : cards;
    video.style.height = Math.max(...target.map((c) => c.offsetHeight)) + 'px';
  });
}
syncVideoCardHeight();
window.addEventListener('load', syncVideoCardHeight);
window.addEventListener('resize', syncVideoCardHeight);
// Подстраховка: если видео на медленной мобильной сети догружается уже после
// 'load' (например, метаданные .MOV пришли позже), пересчитываем ещё раз
document.querySelectorAll('.video-card__media').forEach((v) => {
  v.addEventListener('loadedmetadata', syncVideoCardHeight);
});

// Новинки (new-arrivals.html): видео-плитка в сетке каталога — кнопка реально
// ставит на паузу/возобновляет <video>, а не просто переключает иконку
(function () {
  const playBtn = document.getElementById('videoCardPlay');
  const video = document.getElementById('videoCardMedia');
  if (!playBtn || !video) return;
  const icon = playBtn.querySelector('.icon');

  function setIcon(isPlaying) {
    icon.classList.toggle('icon--pause', isPlaying);
    icon.classList.toggle('icon--play', !isPlaying);
    playBtn.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Воспроизвести');
  }

  playBtn.addEventListener('click', () => {
    if (video.paused) video.play();
    else video.pause();
  });
  // Синхронизируем иконку и с самим видео (например, если оно не смогло
  // запуститься автоматически из-за политики браузера)
  video.addEventListener('play', () => setIcon(true));
  video.addEventListener('pause', () => setIcon(false));
  setIcon(!video.paused);
})();

// Новинки: панель фильтров (левый drawer). Чекбоксы — обычные нативные input,
// переключаются сами через CSS (:checked), JS нужен только для гендер-вкладок,
// кнопок размера и открытия/закрытия самой панели
(function () {
  const overlay = document.getElementById('filterDrawerOverlay');
  if (!overlay) return;

  function openDrawer() { overlay.classList.add('is-open'); document.body.classList.add('has-open-drawer'); }
  function closeDrawer() { overlay.classList.remove('is-open'); document.body.classList.remove('has-open-drawer'); }

  const trigger = document.getElementById('filtersTrigger');
  if (trigger) trigger.addEventListener('click', openDrawer);
  document.getElementById('filterDrawerClose').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDrawer(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeDrawer();
  });

  // Размер — тоже один выбран всегда (кроме OS, он недоступен для одежды)
  const sizeBtns = overlay.querySelectorAll('[data-size-btn]');
  sizeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach((b) => b.classList.toggle('is-selected', b === btn));
    });
  });

  // «Сбросить фильтр» — снимает галочки и возвращает размер по умолчанию (XS)
  document.getElementById('filterDrawerReset').addEventListener('click', () => {
    overlay.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
    sizeBtns.forEach((b, i) => b.classList.toggle('is-selected', i === 0));
  });

  document.getElementById('filterDrawerApply').addEventListener('click', closeDrawer);

  // Переход из мегаменю по конкретной категории («повседневная линия» →
  // ссылка вида casual-men.html?category=костюмы) или коллекции («hybrid-athletic-club»/
  // «patchi»/«sensei» → new-arrivals.html?collection=patchi) — отмечаем нужный пункт
  // фильтра галочкой сразу при загрузке страницы, без открытия панели
  const requestParams = new URLSearchParams(location.search);
  [requestParams.get('category'), requestParams.get('collection')].forEach((requested) => {
    if (!requested) return;
    const label = Array.from(overlay.querySelectorAll('.filter-checkbox__label'))
      .find((l) => l.textContent.trim() === requested.trim());
    if (label) {
      const checkbox = label.closest('.filter-checkbox').querySelector('input[type="checkbox"]');
      checkbox.checked = true;
    }
  });
})();

// Модальное окно «Вход или регистрация» (Figma: Mob/Modal/Auth) — 2 экрана:
// телефон → код из СМС. Открывается кликом на data-auth-trigger (иконка/
// ссылки входа в шапке и мобильном меню — везде на сайте), а также с кнопки
// «перейти к оформлению» на странице корзины, если пользователь ещё не
// «вошёл» (localStorage-флаг — реального бэкенда у прототипа нет). Код
// подтверждён «успешно» при вводе любых 4 цифр — это прототип, не СМС
(function () {
  const overlay = document.getElementById('authModalOverlay');
  if (!overlay) return;

  const phoneStep = document.getElementById('authModalPhone');
  const codeStep = document.getElementById('authModalCode');
  const phoneInput = document.getElementById('authPhoneInput');
  const sendBtn = document.getElementById('authSendCode');
  const codeCells = Array.from(overlay.querySelectorAll('[data-code-cell]'));
  const resendText = document.getElementById('authResendText');

  let afterLoginRedirect = null;
  let resendTimer = null;

  function openModal(redirectAfter) {
    afterLoginRedirect = redirectAfter || null;
    showPhoneStep();
    overlay.classList.add('is-open');
  }
  function closeModal() {
    overlay.classList.remove('is-open');
    clearInterval(resendTimer);
  }
  function showPhoneStep() {
    phoneStep.classList.remove('is-hidden');
    codeStep.classList.add('is-hidden');
    phoneInput.value = '';
    sendBtn.disabled = true;
  }
  function showCodeStep() {
    phoneStep.classList.add('is-hidden');
    codeStep.classList.remove('is-hidden');
    codeCells.forEach((c) => { c.value = ''; });
    codeCells[0].focus();
    startResendTimer();
  }
  function startResendTimer() {
    let seconds = 26;
    resendText.classList.remove('is-active');
    resendText.textContent = '';
    resendText.append('Отправить код повторно через ');
    const span = document.createElement('span');
    span.textContent = String(seconds);
    resendText.append(span, ' сек');
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(resendTimer);
        resendText.textContent = 'отправить код повторно';
        resendText.classList.add('is-active');
      } else {
        span.textContent = String(seconds);
      }
    }, 1000);
  }
  function confirmLogin() {
    localStorage.setItem('fizuliLoggedIn', '1');
    closeModal();
    window.location.href = afterLoginRedirect || 'account.html';
  }

  document.querySelectorAll('[data-auth-trigger]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  overlay.querySelectorAll('[data-auth-close]').forEach((btn) => btn.addEventListener('click', closeModal));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
  });

  phoneInput.addEventListener('input', () => {
    const digits = phoneInput.value.replace(/\D/g, '');
    sendBtn.disabled = digits.length < 10;
  });
  sendBtn.addEventListener('click', () => {
    if (sendBtn.disabled) return;
    showCodeStep();
  });

  codeCells.forEach((cell, i) => {
    cell.addEventListener('input', () => {
      cell.value = cell.value.replace(/\D/g, '').slice(0, 1);
      if (cell.value && codeCells[i + 1]) codeCells[i + 1].focus();
      if (codeCells.every((c) => c.value)) confirmLogin();
    });
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !cell.value && codeCells[i - 1]) codeCells[i - 1].focus();
    });
  });

  resendText.addEventListener('click', () => {
    if (!resendText.classList.contains('is-active')) return;
    startResendTimer();
  });

  // Кнопка «перейти к оформлению» на самой странице корзины (не в мини-корзине,
  // та просто ведёт на cart.html) — если ещё не «вошли», сначала показываем
  // модалку, после успешного входа сразу ведём на оформление
  const cartCheckoutBtn = document.querySelector('.order-summary__checkout');
  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener('click', () => {
      if (localStorage.getItem('fizuliLoggedIn') === '1') {
        window.location.href = 'checkout.html';
      } else {
        openModal('checkout.html');
      }
    });
  }
})();

// Новинки: попап «уведомить о поступлении» — открывается ссылкой на карточке
// товара «нет в наличии», после отправки формы показывает состояние Success
(function () {
  const overlay = document.getElementById('notifyPopoverOverlay');
  if (!overlay) return;

  const triggers = document.querySelectorAll('.product-card__notify');
  const formPanel = document.getElementById('notifyPopoverForm');
  const successPanel = document.getElementById('notifyPopoverSuccess');
  const form = document.getElementById('notifyPopoverFormEl');
  const emailOut = document.getElementById('notifyPopoverEmail');

  function openPopover() {
    formPanel.classList.remove('is-hidden');
    successPanel.classList.add('is-hidden');
    overlay.classList.add('is-open');
  }
  function closePopover() {
    overlay.classList.remove('is-open');
  }

  // Триггеров на странице может быть несколько (одна карточка "нет в наличии"
  // на каждую категорию) — все открывают один и тот же попап
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openPopover();
    });
  });
  overlay.querySelectorAll('[data-notify-close]').forEach((btn) => btn.addEventListener('click', closePopover));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopover(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closePopover();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    emailOut.textContent = email || 'ivanov@ivanov.com';
    formPanel.classList.add('is-hidden');
    successPanel.classList.remove('is-hidden');
  });
})();

// Новинки: сортировка (компонент SortDropdown из Figma) — открывается кликом
// по триггеру, закрывается по клику вне, Escape или выбору пункта
(function () {
  const trigger = document.getElementById('sortTrigger');
  const menu = document.getElementById('sortMenu');
  if (!trigger || !menu) return;

  const label = document.getElementById('sortTriggerLabel');
  const items = menu.querySelectorAll('.sort-menu__item');

  function openMenu() {
    menu.classList.remove('is-hidden');
    trigger.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    menu.classList.add('is-hidden');
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', () => {
    menu.classList.contains('is-hidden') ? openMenu() : closeMenu();
  });
  items.forEach((item) => {
    item.addEventListener('click', () => {
      items.forEach((i) => i.classList.toggle('is-selected', i === item));
      label.textContent = item.querySelector('.sort-menu__label').textContent;
      closeMenu();
    });
  });
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('is-hidden') && !menu.contains(e.target) && !trigger.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.classList.contains('is-hidden')) closeMenu();
  });
})();

// Карточка товара — свотчи цвета (компонент UI/Color Swatch): клик выбирает
// цвет (рамка темнее, заливка визуально сжимается — State=Active в Figma),
// один свотч в каждой карточке выбран по умолчанию (первый, как в макете).
// Реальных фото под каждый цвет нет, поэтому смены картинки при клике не будет —
// это просто визуальное состояние выбора, как в самом компоненте
document.querySelectorAll('.color-list').forEach((list) => {
  const swatches = list.querySelectorAll('.color-swatch');
  if (!swatches.length) return;
  if (![...swatches].some((s) => s.classList.contains('is-selected'))) {
    swatches[0].classList.add('is-selected');
  }
  swatches.forEach((swatch) => {
    // Белый свотч в Figma — отдельный вариант компонента (State=Default/Active
    // White): у него заливка всегда чуть меньше бокса, а при выборе появляется
    // ещё и собственная внутренняя рамка — иначе он просто теряется на белом
    // фоне карточки, ни рамки, ни заливки было бы не отличить от пустоты
    const rawColor = (swatch.style.getPropertyValue('--swatch-color') || '').trim().toLowerCase();
    if (['#fff', '#ffffff', 'white', 'rgb(255,255,255)', 'rgba(255,255,255,1)'].includes(rawColor)) {
      swatch.classList.add('color-swatch--white');
    }
    swatch.setAttribute('role', 'button');
    swatch.setAttribute('tabindex', '0');
    swatch.addEventListener('click', () => {
      swatches.forEach((s) => s.classList.remove('is-selected'));
      swatch.classList.add('is-selected');
    });
    swatch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); swatch.click(); }
    });
  });
});

// Страница товара (product.html) — аккордеон характеристик: клик по заголовку
// разворачивает/сворачивает блок, иконка переключается плюс/минус через CSS
// по aria-expanded (см. .product-accordion__trigger в style.css)
document.querySelectorAll('.product-accordion__trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    trigger.nextElementSibling.classList.toggle('is-hidden', expanded);
  });
});

// Страница товара — выбор размера (один выбран всегда) и кнопка «добавить
// в корзину»: реального состояния корзины прототип не ведёт, поэтому просто
// открывает превью корзины через клик по той же иконке в хедере
(function () {
  const favBtn = document.querySelector('.product-info__favorite');
  if (favBtn) {
    favBtn.addEventListener('click', () => favBtn.classList.toggle('is-active'));
  }

  const sizeRow = document.querySelector('.product-info__size-row');
  if (sizeRow) {
    const sizeBtns = sizeRow.querySelectorAll('[data-size-btn]');
    sizeBtns.forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => {
        sizeBtns.forEach((b) => b.classList.toggle('is-selected', b === btn));
      });
    });
  }

  const addToCart = document.querySelector('.product-info__add-to-cart');
  const cartTrigger = document.getElementById('cartTrigger');
  if (addToCart && cartTrigger) {
    addToCart.addEventListener('click', () => cartTrigger.click());
  }
})();

// Страница товара — лайтбокс фото (клик по любому фото в галерее открывает
// его увеличенным, компонент Lightbox Overlay из Figma). В макете там ещё
// есть иконка лупы поверх фото — по прототипу Figma она тоже просто закрывает
// оверлей (как и крестик), отдельного действия у неё нет, поэтому в коде
// не дублирую её как самостоятельный интерактивный элемент
(function () {
  const overlay = document.getElementById('lightboxOverlay');
  const img = document.getElementById('lightboxImage');
  const closeBtn = document.getElementById('lightboxClose');
  if (!overlay || !img) return;

  function openLightbox(src) {
    img.src = src;
    overlay.classList.add('is-open');
  }
  function closeLightbox() {
    overlay.classList.remove('is-open');
  }

  document.querySelectorAll('[data-lightbox]').forEach((btn) => {
    btn.addEventListener('click', () => openLightbox(btn.dataset.lightbox));
  });
  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeLightbox();
  });
})();

// Страница товара — свой скроллбар под мобильной свайп-галереей (вместо
// системного): ширина и позиция бегунка считаются от scrollLeft/scrollWidth
(function () {
  const gallery = document.querySelector('.product-gallery');
  const thumb = document.querySelector('.product-gallery-scrollbar__thumb');
  if (!gallery || !thumb) return;

  function update() {
    const track = gallery.scrollWidth;
    const visible = gallery.clientWidth;
    if (track <= visible) { thumb.style.width = '100%'; thumb.style.left = '0'; return; }
    thumb.style.width = `${(visible / track) * 100}%`;
    thumb.style.left = `${(gallery.scrollLeft / track) * 100}%`;
  }

  gallery.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  update();
})();

// Страница товара — попап способов оплаты частями: вкладки Сплит/Долями
// переключают картинку виджета (см. комментарий в product.html)
(function () {
  const overlay = document.getElementById('paymentPopoverOverlay');
  const trigger = document.getElementById('paymentPopoverTrigger');
  if (!overlay || !trigger) return;

  const closeBtn = document.getElementById('paymentPopoverClose');
  const tabs = overlay.querySelectorAll('.payment-popover__tab');
  const panels = overlay.querySelectorAll('[data-payment-panel]');

  function openPopover() { overlay.classList.add('is-open'); }
  function closePopover() { overlay.classList.remove('is-open'); }

  trigger.addEventListener('click', openPopover);
  closeBtn.addEventListener('click', closePopover);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopover(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closePopover();
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      panels.forEach((p) => p.classList.toggle('is-hidden', p.dataset.paymentPanel !== tab.dataset.paymentTab));
    });
  });
})();

// Страница корзины (cart.html) — избранное на карточке товара и счётчик
// количества (+/− и удаление при 1 шт, тот же паттерн, что в Cart Drawer,
// только список тут свой — .cart-items-list, а не #cartDrawerItems)
(function () {
  document.querySelectorAll('.cart-page-item__favorite').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('is-active'));
  });

  const list = document.querySelector('.cart-items-list');
  if (!list) return;

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.cart-item__counter-btn');
    if (!btn) return;
    const item = btn.closest('.cart-page-item');
    const countEl = item.querySelector('[data-count]');
    const qty = Number(countEl.textContent);

    if (btn.dataset.action === 'increment') {
      countEl.textContent = String(qty + 1);
    } else if (qty > 1) {
      countEl.textContent = String(qty - 1);
    } else {
      item.remove();
    }
  });
})();

// Страница оформления заказа (checkout.html) — вкладки "способы получения"
// (По России / Самовывоз / СНГ). Это одна страница с переключением, а не
// три разных экрана (тот же приём, что в "Личном кабинете") — источник в
// Figma это три отдельных состояния фрейма "Page / Checkout / ...".
// Числа в "вашем заказе" (итого/доставка) для каждой вкладки — статичные
// демо-данные ровно по макету, без реального пересчёта (как и везде в
// этом прототипе, см. cart.html/product.html).
(function () {
  const layout = document.getElementById('checkoutLayout');
  if (!layout) return;

  const tabs = layout.querySelectorAll('.checkout-tab');
  const panels = layout.querySelectorAll('[data-tab-panel]');
  const cashOption = layout.querySelector('[data-payment-option="cash"]');
  const customerSection = layout.querySelector('[data-customer-section]');
  const rowFree = layout.querySelector('[data-summary-row="delivery-free"]');
  const rowCis = layout.querySelector('[data-summary-row="delivery-cis"]');
  const dynamicText = layout.querySelector('[data-summary-dynamic]');
  const totalEl = document.getElementById('orderSummaryTotal');

  const TOTALS = { russia: '9 960 ₽', pickup: '9 460 ₽', cis: '9 460 ₽' };

  function setTab(name) {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
    panels.forEach((p) => { p.hidden = p.dataset.tabPanel !== name; });

    if (cashOption) cashOption.hidden = name !== 'pickup';
    if (customerSection) customerSection.hidden = name === 'pickup';
    if (rowFree) rowFree.hidden = name !== 'russia';
    if (rowCis) rowCis.hidden = name !== 'cis';
    if (dynamicText) dynamicText.hidden = name !== 'cis';
    if (totalEl) totalEl.textContent = TOTALS[name];

    layout.dataset.deliveryTab = name;
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));

  // Внутри вкладки "По России" — способ доставки СДЭК курьером меняет
  // строку адреса с "выбрать пункт выдачи" на обычный ввод улицы
  // (по UX-заметке в Figma: "в поле ввода адреса появляется подпись
  // «Укажите адрес доставки»")
  const shippingRadios = layout.querySelectorAll('input[name="shippingMethod"]');
  const pickupRow = layout.querySelector('[data-address-row="pickup-point"]');
  const streetRow = layout.querySelector('[data-address-row="street"]');
  shippingRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const isCourier = radio.value === 'sdek-courier';
      if (pickupRow) pickupRow.hidden = isCourier;
      if (streetRow) streetRow.hidden = !isCourier;
    });
  });
})();

// Страница оформления заказа — всплывающие подсказки (i) у способов оплаты
// и у строки "доставка": компактная карточка рядом с иконкой, не
// полноэкранный попап (тот — отдельно, .payment-popover, для product.html)
(function () {
  const triggers = document.querySelectorAll('[data-tooltip]');
  if (!triggers.length) return;

  function closeAll() {
    document.querySelectorAll('.payment-info-tooltip').forEach((p) => { p.hidden = true; });
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = document.querySelector(`[data-tooltip-panel="${trigger.dataset.tooltip}"]`);
      if (!panel) return;
      const willOpen = panel.hidden;
      closeAll();
      panel.hidden = !willOpen;
    });
  });

  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
})();

// Страница «Покупателям» (buyers.html) — вкладки "Доставка и самовывоз" /
// "Оплата" / "Возврат и обмен" переключаются без перезагрузки страницы
// (аннотация в Figma 1909:9814: "смена информации ощущается как
// перелистывание карточек") — три состояния одного фрейма, не три URL
(function () {
  const tabs = document.querySelectorAll('.info-tab');
  if (!tabs.length) return;

  const panels = document.querySelectorAll('[data-info-panel]');

  function activateTab(key) {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.infoTab === key));
    panels.forEach((p) => { p.hidden = p.dataset.infoPanel !== key; });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.infoTab));
  });

  // Переход из мегаменю хедера («оплата» → buyers.html?tab=payment,
  // «возврат и обмен» → buyers.html?tab=returns) сразу открывает нужную вкладку
  const requestedTab = new URLSearchParams(location.search).get('tab');
  if (requestedTab && Array.from(tabs).some((t) => t.dataset.infoTab === requestedTab)) {
    activateTab(requestedTab);
  }
})();

// Страница «Магазины» (stores.html) — карточки магазинов сами являются
// переключателями карты (её попросила проверить внимательно: это не
// вкладки рядом с картой, а сама карточка = таб), клик по неактивной
// карточке делает её активной (светлый фон) и переключает карту под ней
(function () {
  const cards = document.querySelectorAll('.store-card');
  if (!cards.length) return;

  const maps = document.querySelectorAll('[data-store-map]');

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((c) => c.classList.toggle('is-inactive', c !== card));
      maps.forEach((m) => { m.hidden = m.dataset.storeMap !== card.dataset.store; });
    });
  });
})();

// МОБИЛЬНАЯ ОБОЛОЧКА — общая для всех страниц (см. style.css, брейкпоинт
// 767px). Гамбургер открывает полноэкранное меню (компонент Mob/Header/Megamenu,
// state Open в Figma), крестик/клик по ссылке закрывает. Переключатель
// мужчинам/женщинам внутри меню меняет видимую панель категорий — тот же
// принцип, что у десктопного мегаменю (openMegamenu/closeMegamenu выше),
// но тут нет наведения — только клик, и меню на всю страницу, а не дропдаун.
(function () {
  const menu = document.getElementById('mobMenu');
  const openBtn = document.getElementById('mobMenuOpen');
  const closeBtn = document.getElementById('mobMenuClose');
  if (!menu || !openBtn) return;

  function openMenu() {
    menu.classList.add('is-open');
    document.body.classList.add('has-open-drawer');
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    document.body.classList.remove('has-open-drawer');
  }

  openBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Поиск/корзина в мобильном хедере — те же самые компоненты, что и на
  // десктопе (search-overlay, cart-drawer), просто с других кнопок-триггеров
  // (id не может повторяться в HTML) — форвардим клик на десктопный триггер,
  // чтобы не дублировать логику открытия/закрытия
  const mobSearchBtn = document.getElementById('mobSearchTrigger');
  const searchTrigger = document.getElementById('searchTrigger');
  if (mobSearchBtn && searchTrigger) mobSearchBtn.addEventListener('click', () => searchTrigger.click());
  const mobCartBtn = document.getElementById('mobCartTrigger');
  const cartTrigger = document.getElementById('cartTrigger');
  if (mobCartBtn && cartTrigger) mobCartBtn.addEventListener('click', () => cartTrigger.click());

  const genderTabs = menu.querySelectorAll('[data-mob-gender-tab]');
  const genderPanels = menu.querySelectorAll('[data-mob-gender-panel]');
  genderTabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      genderTabs.forEach((t) => t.classList.toggle('nav__link--current', t === tab));
      genderPanels.forEach((p) => { p.hidden = p.dataset.mobGenderPanel !== tab.dataset.mobGenderTab; });
    });
  });

  // Клик по обычной ссылке внутри меню (не по аккордеону) закрывает меню —
  // иначе после перехода на страницу категории меню осталось бы открытым
  // "под капотом" и заблокировало бы скролл новой страницы
  menu.querySelectorAll('.megamenu__link, .mob-menu__login a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
})();

// Журнал (journal.html), вкладка «События» — длинный текст новости обрезан
// в 3 строки многоточием (.event-card__text), клик по нему раскрывает текст
// полностью. На мобильном раскрытие уже есть через :hover (тот же общий
// класс), здесь — отдельно клик, т.к. на десктопе ховер для этого неудобен
(function () {
  document.querySelectorAll('.event-card__text').forEach((text) => {
    text.addEventListener('click', () => {
      text.classList.toggle('is-expanded');
    });
  });
})();
