/* =========================================================================
   Ron Amar Barbershop — i18n Engine (Hebrew / Russian / English)
   ---------------------------------------------------------------------------
   - All functions are global (no modules).
   - Hebrew is the source of truth.
   - Use data-i18n="key" for textContent, data-i18n-placeholder="key" for
     input placeholders, and data-i18n-html="key" for HTML content.
   - Saves user preference in localStorage under "ron_lang".
   ========================================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'ron_lang';
  const SUPPORTED = ['he', 'ru', 'en'];
  const LTR_LANGS = ['en', 'ru'];
  const SWEEP_SELECTOR = '#booking-modal-overlay *, #dashboard-overlay *, #summary-barber, #summary-service, #summary-datetime, .time-slot, .empty-state p';

  // ---------------------------------------------------------------------------
  // Translation dictionary
  // ---------------------------------------------------------------------------
  const translations = {
    he: {
      // Meta
      page_title: 'GigNow | דוגמת אתר מספרה',

      // Navigation
      nav_home: 'בית',
      nav_about: 'אודות',
      nav_services: 'שירותים',
      nav_gallery: 'גלריה',
      nav_contact: 'צור קשר',
      nav_dashboard: 'יומן ספרים',
      nav_dashboard_mobile: 'כניסת ספרים (יומן)',
      nav_book_now: 'הזמן תור עכשיו',
      nav_book_short: 'הזמן תור',

      // Hero
      hero_kicker: 'הסטנדרט החדש של גברים',
      hero_title_1: 'חוויית הטיפוח',
      hero_title_2: 'המושלמת לגבר',
      hero_subtitle: 'המספרה של הברבר שלך מביאה את סגנון הברברשופ הקלאסי לרמה חדשה של דיוק, מקצועיות ואווירה.',
      hero_cta_book: 'הזמן תור עכשיו',
      hero_cta_services: 'מחירון ושירותים',

      // About / Profile
      about_ron_name: 'הברבר שלך',
      about_ron_role: 'מייסד וספר ראשי',
      about_ron_bio: 'עם אהבה למקצוע ותשומת לב לפרטים הקטנים ביותר, הקמתי את המספרה כדי להעניק לגברים חוויית טיפוח שלא מסתכמת רק בתספורת. מקצועיות, יחס אישי ואווירה יוקרתית הם הבסיס לכל לקוח שמתיישב אצלי בכיסא.',
      feature_1_title: 'דיוק חסר פשרות',
      feature_1_desc: 'תספורות קלאסיות ומודרניות בהתאמה אישית למבנה הפנים ולסטייל הייחודי שלך.',
      feature_2_title: 'אווירת פרימיום',
      feature_2_desc: 'עיצוב מוקפד, וויסקי משובח, מוזיקה טובה, ואווירה שמאפשרת לך להתנתק לכמה רגעים.',
      feature_3_title: 'מוצרים איכותיים',
      feature_3_desc: 'שימוש במוצרי העיצוב והטיפוח המובילים בעולם לשמירה על בריאות השיער והעור.',

      // Services
      services_kicker: 'התפריט שלנו',
      services_title: 'שירותים ומחירים',
      svc_haircut: 'תספורת גבר',
      svc_haircut_desc: 'חפיפה, תספורת מותאמת אישית, פן ועיצוב',
      svc_haircut_price: 'החל מ-₪60',
      svc_haircut_beard: 'תספורת ועיצוב זקן',
      svc_haircut_beard_desc: 'החבילה המושלמת. תספורת, סידור זקן בפירוט, חפיפה ועיצוב',
      svc_haircut_beard_price: 'החל מ-₪110',
      svc_beard: 'עיצוב זקן בלבד',
      svc_beard_desc: 'פיסול הזקן, סידור קווים עם תער ושמנים מטפחים',
      svc_soldier: 'תספורת חייל',
      svc_soldier_desc: 'תספורת תקנית ומדויקת לפי נהלי הצבא (בהצגת חוגר)',
      svc_kid: 'תספורת ילד',
      svc_kid_desc: 'תספורת קפדנית באווירה סבלנית וטובה',
      svc_wax: 'ניקוי שעווה / גבות',
      svc_wax_desc: 'עיצוב גבות, שעווה אף/אוזניים וטיפוח פנים',
      svc_color: 'צבע / גוונים לגבר',
      svc_color_desc: 'הסתרת שיער שיבה או הוספת גוונים אופנתיים (מחיר בסיסי)',
      svc_color_price: '₪100+',
      svc_smoothing: 'החלקה לגבר',
      svc_smoothing_desc: 'החלקת קרטין / אורגנית לשיער רך, חלק וקל לעיצוב',
      services_book_btn_html: 'לקביעת תור <i class="fa-solid fa-calendar-plus mt-0.5"></i>',

      // Banner CTA
      banner_title: 'מוכן לשדרוג הבא שלך?',
      banner_subtitle: 'אל תתפשר על פחות מהטוב ביותר. שריין את התור שלך עכשיו והצטרף ללקוחות המרוצים שלנו.',
      banner_cta: 'קבע תור עכשיו',

      // Gallery
      gallery_kicker: 'העבודות והאווירה שלנו',
      gallery_title: 'הגלריה',
      gallery_book_link_html: '<span>אהבת? קבע תור</span> <i class="fa-solid fa-arrow-left text-sm"></i>',
      gallery_team_caption: 'צוות המומחים שלנו',
      gallery_vip_caption: 'שירות VIP לכל לקוח',

      // Footer
      footer_about: 'היעד שלך לתספורת מדוייקת, טיפוח זקן מושלם וחוויה של פעם בחיים. נתראה על הכיסא.',
      footer_contact: 'צור קשר',
      footer_address_html: 'הרצל 42,<br>תל אביב',
      footer_hours_title: 'שעות פעילות',
      footer_days_sun_thu: 'ראשון - חמישי',
      footer_days_fri: 'שישי',
      footer_days_sat: 'שבת',
      footer_closed: 'סגור',
      footer_copyright_html: '&copy; <span id="footer-year"></span> THE BARBER. כל הזכויות שמורות.',

      // Booking modal
      booking_title_html: '<i class="fa-solid fa-calendar-check text-gold"></i> הזמנת תור',
      booking_step1_title: 'בחר ספר',
      booking_step2_title_html: 'בחר שירות (<span id="selected-barber-name" class="text-gold"></span>)',
      booking_step3_title: 'מתי נוח לך?',
      booking_label_pick_date: 'בחר תאריך',
      booking_label_pick_time: 'בחר שעה',
      booking_step4_title: 'פרטים אחרונים',
      booking_label_full_name: 'שם מלא',
      booking_ph_full_name: 'הכנס שם מלא',
      booking_label_phone: 'מספר טלפון',
      booking_ph_phone: '05X-XXXXXXX',
      booking_summary_title: 'סיכום התור:',
      booking_step5_title: 'אימות מספר טלפון',
      booking_otp_intro_html: 'שלחנו קוד אימות ב-SMS למספר <span id="verify-phone-display" class="text-gold" dir="ltr"></span>. אנא הזן אותו כאן כדי לאשר את התור:',
      booking_ph_otp: '0 0 0 0 0 0',
      booking_step6_title: 'התור נקבע בהצלחה!',
      booking_step6_subtitle: 'שלחנו לך הודעת אישור למספר הטלפון. נתראה במספרה!',
      booking_step6_close: 'סיום וחזרה לאתר',
      booking_btn_back: 'חזור',
      booking_btn_next: 'המשך לשלב הבא',
      booking_btn_confirm: 'אשר תור',
      booking_btn_validating: 'מאמת...',
      booking_btn_saving: 'שומר תור...',
      booking_from_price: 'החל מ-₪',
      booking_summary_barber_prefix: '💈 ספר: ',
      booking_summary_service_prefix: '✂️ שירות: ',
      booking_summary_at: ' בשעה ',
      booking_closed_saturday: 'סגור בשבת',
      booking_load_services_error: 'שגיאה בטעינת שירותים: ',

      // Dashboard
      dash_login_title: 'התחברות ליומן',
      dash_label_barber: 'בחר שם ספר',
      dash_label_password: 'סיסמה',
      dash_ph_password: 'הכנס 1234 לבדיקה',
      dash_btn_login: 'היכנס למערכת',
      dash_header_prefix: 'לוח בקרה - ',
      dash_tab_appointments: 'תורים',
      dash_tab_new: 'תור חדש',
      dash_tab_new_short: 'חדש',
      dash_tab_hours: 'שעות פעילות',
      dash_tab_hours_short: 'שעות',
      dash_tab_prices: 'מחירון',
      dash_tab_profile: 'פרופיל',
      dash_btn_logout: 'התנתק',
      dash_appts_title: '📅 התורים שלי',
      dash_today: 'היום',
      dash_prev_day: 'יום קודם',
      dash_next_day: 'יום הבא',
      dash_stat_total: 'סך הכל',
      dash_stat_completed: 'הושלמו',
      dash_stat_pending: 'ממתינים',
      dash_new_title: '➕ הוספת תור ידני',
      dash_new_subtitle: 'צור תור חדש ללקוח שיצר קשר ישיר',
      dash_label_service: 'שירות',
      dash_loading: 'טוען...',
      dash_label_date: 'תאריך',
      dash_label_time: 'שעה',
      dash_pick_date_first: 'בחר תאריך תחילה',
      dash_label_customer_name: 'שם הלקוח',
      dash_ph_customer_name: 'שם מלא',
      dash_label_customer_phone: 'טלפון',
      dash_ph_customer_phone: '050-1234567',
      dash_btn_create_appt_html: '<i class="fa-solid fa-check ml-2"></i> צור תור',
      dash_hours_title: '⏰ שעות פעילות',
      dash_hours_subtitle: 'קבע מתי אתה זמין לקבלת תורים',
      dash_btn_save_html: '<i class="fa-solid fa-floppy-disk ml-2"></i> שמור שינויים',
      dash_prices_title: '💰 מחירון',
      dash_prices_subtitle: 'נהל את השירותים והמחירים',
      dash_btn_new_service_html: '<i class="fa-solid fa-plus ml-1"></i> שירות חדש',
      dash_profile_title: '👤 הפרופיל שלי',
      dash_stat_month_count: 'תורים החודש',
      dash_stat_month_revenue: 'הכנסה משוערת',
      dash_stat_total_count: 'סך תורים',
      dash_profile_details: 'פרטי הספר',
      dash_label_name: 'שם',
      dash_label_base_price: 'מחיר בסיס (₪)',
      dash_btn_save: 'שמור',
      dash_change_password: 'שינוי סיסמה',
      dash_ph_new_password: 'סיסמה חדשה',
      dash_btn_update_password_html: '<i class="fa-solid fa-key ml-2"></i> עדכן סיסמה',
      dash_price_modal_title: 'עריכת מחיר',
      dash_label_service_name: 'שם השירות',
      dash_label_price: 'מחיר (₪)',
      dash_btn_cancel: 'ביטול',

      // PWA
      pwa_title: 'התקן את האפליקציה ✂️',
      pwa_subtitle: 'גישה מהירה להזמנת תורים',
      pwa_install: 'התקן',
      pwa_ios_label: 'הוסף למסך',
      pwa_ios_alert: 'לחץ על כפתור השיתוף (⬆️) בתחתית הדפדפן ← הוסף למסך הבית',

      // Language switcher
      lang_label: 'שפה'
    },

    ru: {
      page_title: 'GigNow | Пример сайта парикмахерской',

      nav_home: 'Главная',
      nav_about: 'О нас',
      nav_services: 'Услуги',
      nav_gallery: 'Галерея',
      nav_contact: 'Контакты',
      nav_dashboard: 'Журнал мастеров',
      nav_dashboard_mobile: 'Вход для мастеров (журнал)',
      nav_book_now: 'Записаться сейчас',
      nav_book_short: 'Записаться',

      hero_kicker: 'Новый стандарт для мужчин',
      hero_title_1: 'Идеальный',
      hero_title_2: 'мужской уход',
      hero_subtitle: 'Парикмахерская Данни выводит классический стиль барбершопа на новый уровень точности, мастерства и атмосферы.',
      hero_cta_book: 'Записаться сейчас',
      hero_cta_services: 'Услуги и цены',

      about_ron_name: 'Данни Коэн',
      about_ron_role: 'Основатель и главный мастер',
      about_ron_bio: 'С любовью к профессии и вниманием к мельчайшим деталям я создал эту парикмахерскую, чтобы дарить мужчинам не просто стрижку, а настоящий уход. Профессионализм, индивидуальный подход и роскошная атмосфера — основа для каждого клиента в моём кресле.',
      feature_1_title: 'Безупречная точность',
      feature_1_desc: 'Классические и современные стрижки с индивидуальным подходом к форме лица и вашему уникальному стилю.',
      feature_2_title: 'Премиальная атмосфера',
      feature_2_desc: 'Изысканный интерьер, отличный виски, хорошая музыка и атмосфера, в которой можно по-настоящему расслабиться.',
      feature_3_title: 'Качественные продукты',
      feature_3_desc: 'Используем ведущие мировые продукты для укладки и ухода — заботимся о здоровье ваших волос и кожи.',

      services_kicker: 'Наше меню',
      services_title: 'Услуги и цены',
      svc_haircut: 'Мужская стрижка',
      svc_haircut_desc: 'Мытьё, индивидуальная стрижка, укладка и финиш',
      svc_haircut_price: 'от ₪60',
      svc_haircut_beard: 'Стрижка + оформление бороды',
      svc_haircut_beard_desc: 'Идеальный комплекс. Стрижка, детальное оформление бороды, мытьё и укладка',
      svc_haircut_beard_price: 'от ₪110',
      svc_beard: 'Только оформление бороды',
      svc_beard_desc: 'Скульптурирование бороды, контуры опасной бритвой и уходовые масла',
      svc_soldier: 'Стрижка для солдата',
      svc_soldier_desc: 'Уставная и точная стрижка по армейским нормам (при предъявлении удостоверения)',
      svc_kid: 'Детская стрижка',
      svc_kid_desc: 'Аккуратная стрижка в спокойной и доброжелательной атмосфере',
      svc_wax: 'Воск / коррекция бровей',
      svc_wax_desc: 'Оформление бровей, воск нос/уши и уход за лицом',
      svc_color: 'Окрашивание / тонирование',
      svc_color_desc: 'Закрашивание седины или модное тонирование (базовая цена)',
      svc_color_price: '₪100+',
      svc_smoothing: 'Кератиновое выпрямление',
      svc_smoothing_desc: 'Кератиновое или органическое выпрямление — мягкие, гладкие и легко укладываемые волосы',
      services_book_btn_html: 'Записаться <i class="fa-solid fa-calendar-plus mt-0.5"></i>',

      banner_title: 'Готов к новому образу?',
      banner_subtitle: 'Не соглашайтесь на меньшее. Запишитесь сейчас и присоединяйтесь к нашим довольным клиентам.',
      banner_cta: 'Записаться сейчас',

      gallery_kicker: 'Наши работы и атмосфера',
      gallery_title: 'Галерея',
      gallery_book_link_html: '<span>Понравилось? Запишитесь</span> <i class="fa-solid fa-arrow-left text-sm"></i>',
      gallery_team_caption: 'Наша команда мастеров',
      gallery_vip_caption: 'VIP-сервис для каждого клиента',

      footer_about: 'Ваше место для точной стрижки, идеального ухода за бородой и незабываемой атмосферы. До встречи в кресле.',
      footer_contact: 'Контакты',
      footer_address_html: 'Герцль 42,<br>Тель-Авив',
      footer_hours_title: 'Часы работы',
      footer_days_sun_thu: 'Воскресенье – Четверг',
      footer_days_fri: 'Пятница',
      footer_days_sat: 'Суббота',
      footer_closed: 'Закрыто',
      footer_copyright_html: '&copy; <span id="footer-year"></span> Парикмахерская Данни. Все права защищены.',

      booking_title_html: '<i class="fa-solid fa-calendar-check text-gold"></i> Запись на приём',
      booking_step1_title: 'Выберите мастера',
      booking_step2_title_html: 'Выберите услугу (<span id="selected-barber-name" class="text-gold"></span>)',
      booking_step3_title: 'Когда вам удобно?',
      booking_label_pick_date: 'Выберите дату',
      booking_label_pick_time: 'Выберите время',
      booking_step4_title: 'Последние детали',
      booking_label_full_name: 'Полное имя',
      booking_ph_full_name: 'Введите полное имя',
      booking_label_phone: 'Номер телефона',
      booking_ph_phone: '05X-XXXXXXX',
      booking_summary_title: 'Сводка записи:',
      booking_step5_title: 'Подтверждение телефона',
      booking_otp_intro_html: 'Мы отправили SMS-код на номер <span id="verify-phone-display" class="text-gold" dir="ltr"></span>. Введите его, чтобы подтвердить запись:',
      booking_ph_otp: '0 0 0 0 0 0',
      booking_step6_title: 'Запись успешно создана!',
      booking_step6_subtitle: 'Мы отправили подтверждение на ваш телефон. До встречи в парикмахерской!',
      booking_step6_close: 'Завершить и вернуться на сайт',
      booking_btn_back: 'Назад',
      booking_btn_next: 'Перейти к следующему шагу',
      booking_btn_confirm: 'Подтвердить запись',
      booking_btn_validating: 'Проверка...',
      booking_btn_saving: 'Сохранение...',
      booking_from_price: 'от ₪',
      booking_summary_barber_prefix: '💈 Мастер: ',
      booking_summary_service_prefix: '✂️ Услуга: ',
      booking_summary_at: ' в ',
      booking_closed_saturday: 'Закрыто в субботу',
      booking_load_services_error: 'Ошибка загрузки услуг: ',

      dash_login_title: 'Вход в журнал',
      dash_label_barber: 'Выберите мастера',
      dash_label_password: 'Пароль',
      dash_ph_password: 'Введите 1234 для теста',
      dash_btn_login: 'Войти в систему',
      dash_header_prefix: 'Панель — ',
      dash_tab_appointments: 'Записи',
      dash_tab_new: 'Новая запись',
      dash_tab_new_short: 'Новая',
      dash_tab_hours: 'Часы работы',
      dash_tab_hours_short: 'Часы',
      dash_tab_prices: 'Прайс',
      dash_tab_profile: 'Профиль',
      dash_btn_logout: 'Выйти',
      dash_appts_title: '📅 Мои записи',
      dash_today: 'Сегодня',
      dash_prev_day: 'Предыдущий день',
      dash_next_day: 'Следующий день',
      dash_stat_total: 'Всего',
      dash_stat_completed: 'Завершено',
      dash_stat_pending: 'Ожидают',
      dash_new_title: '➕ Добавить запись вручную',
      dash_new_subtitle: 'Создайте запись для клиента, обратившегося напрямую',
      dash_label_service: 'Услуга',
      dash_loading: 'Загрузка...',
      dash_label_date: 'Дата',
      dash_label_time: 'Время',
      dash_pick_date_first: 'Сначала выберите дату',
      dash_label_customer_name: 'Имя клиента',
      dash_ph_customer_name: 'Полное имя',
      dash_label_customer_phone: 'Телефон',
      dash_ph_customer_phone: '050-1234567',
      dash_btn_create_appt_html: '<i class="fa-solid fa-check ml-2"></i> Создать запись',
      dash_hours_title: '⏰ Часы работы',
      dash_hours_subtitle: 'Укажите, когда вы доступны для записи',
      dash_btn_save_html: '<i class="fa-solid fa-floppy-disk ml-2"></i> Сохранить изменения',
      dash_prices_title: '💰 Прайс-лист',
      dash_prices_subtitle: 'Управляйте услугами и ценами',
      dash_btn_new_service_html: '<i class="fa-solid fa-plus ml-1"></i> Новая услуга',
      dash_profile_title: '👤 Мой профиль',
      dash_stat_month_count: 'Записей за месяц',
      dash_stat_month_revenue: 'Ожидаемый доход',
      dash_stat_total_count: 'Всего записей',
      dash_profile_details: 'Данные мастера',
      dash_label_name: 'Имя',
      dash_label_base_price: 'Базовая цена (₪)',
      dash_btn_save: 'Сохранить',
      dash_change_password: 'Смена пароля',
      dash_ph_new_password: 'Новый пароль',
      dash_btn_update_password_html: '<i class="fa-solid fa-key ml-2"></i> Обновить пароль',
      dash_price_modal_title: 'Изменить цену',
      dash_label_service_name: 'Название услуги',
      dash_label_price: 'Цена (₪)',
      dash_btn_cancel: 'Отмена',

      pwa_title: 'Установите приложение ✂️',
      pwa_subtitle: 'Быстрый доступ к записи',
      pwa_install: 'Установить',
      pwa_ios_label: 'На главный экран',
      pwa_ios_alert: 'Нажмите кнопку «Поделиться» (⬆️) внизу браузера → На экран «Домой»',

      lang_label: 'Язык'
    },

    en: {
      page_title: 'GigNow | Barbershop Example Site',

      nav_home: 'Home',
      nav_about: 'About',
      nav_services: 'Services',
      nav_gallery: 'Gallery',
      nav_contact: 'Contact',
      nav_dashboard: 'Barbers Dashboard',
      nav_dashboard_mobile: 'Barbers Login (Dashboard)',
      nav_book_now: 'Book Now',
      nav_book_short: 'Book',

      hero_kicker: 'The New Standard for Men',
      hero_title_1: 'The Ultimate',
      hero_title_2: 'Grooming Experience',
      hero_subtitle: 'Danny\'s barbershop takes the classic barbershop style to a new level of precision, craftsmanship and atmosphere.',
      hero_cta_book: 'Book Now',
      hero_cta_services: 'Services & Pricing',

      about_ron_name: 'Danny Cohen',
      about_ron_role: 'Founder & Master Barber',
      about_ron_bio: 'With true love for the craft and obsessive attention to detail, I built this shop to give men more than a haircut — a real grooming experience. Professionalism, personal attention and a luxurious atmosphere are the foundation for every client who sits in my chair.',
      feature_1_title: 'Uncompromising Precision',
      feature_1_desc: 'Classic and modern haircuts tailored to your face shape and personal style.',
      feature_2_title: 'Premium Atmosphere',
      feature_2_desc: 'Refined design, fine whisky, great music, and the kind of vibe that lets you switch off for a moment.',
      feature_3_title: 'Quality Products',
      feature_3_desc: 'We use the world\'s leading styling and grooming products to keep your hair and skin healthy.',

      services_kicker: 'Our Menu',
      services_title: 'Services & Pricing',
      svc_haircut: 'Men\'s Haircut',
      svc_haircut_desc: 'Wash, custom cut, blow-dry and styling',
      svc_haircut_price: 'from ₪60',
      svc_haircut_beard: 'Haircut + Beard Styling',
      svc_haircut_beard_desc: 'The full package. Haircut, detailed beard sculpting, wash and styling',
      svc_haircut_beard_price: 'from ₪110',
      svc_beard: 'Beard Styling Only',
      svc_beard_desc: 'Beard sculpting, razor lines and nourishing oils',
      svc_soldier: 'Soldier\'s Cut',
      svc_soldier_desc: 'Regulation-precise cut to IDF standards (with valid ID)',
      svc_kid: 'Kid\'s Haircut',
      svc_kid_desc: 'A meticulous cut in a calm, kid-friendly setting',
      svc_wax: 'Wax / Brows',
      svc_wax_desc: 'Brow shaping, nose & ear waxing and facial grooming',
      svc_color: 'Color / Highlights',
      svc_color_desc: 'Gray coverage or trendy highlights (base price)',
      svc_color_price: '₪100+',
      svc_smoothing: 'Hair Smoothing',
      svc_smoothing_desc: 'Keratin / organic smoothing for soft, sleek, easy-to-style hair',
      services_book_btn_html: 'Book an appointment <i class="fa-solid fa-calendar-plus mt-0.5"></i>',

      banner_title: 'Ready for Your Next Upgrade?',
      banner_subtitle: 'Don\'t settle for less than the best. Book your appointment now and join our happy clients.',
      banner_cta: 'Book Now',

      gallery_kicker: 'Our Work & Atmosphere',
      gallery_title: 'Gallery',
      gallery_book_link_html: '<span>Like what you see? Book now</span> <i class="fa-solid fa-arrow-right text-sm"></i>',
      gallery_team_caption: 'Our expert team',
      gallery_vip_caption: 'VIP service for every client',

      footer_about: 'Your destination for a precise haircut, perfect beard grooming, and a once-in-a-lifetime experience. See you in the chair.',
      footer_contact: 'Contact',
      footer_address_html: '42 Herzl St,<br>Tel Aviv',
      footer_hours_title: 'Opening Hours',
      footer_days_sun_thu: 'Sunday – Thursday',
      footer_days_fri: 'Friday',
      footer_days_sat: 'Saturday',
      footer_closed: 'Closed',
      footer_copyright_html: '&copy; <span id="footer-year"></span> Danny's Barbershop. All rights reserved.',

      booking_title_html: '<i class="fa-solid fa-calendar-check text-gold"></i> Book an Appointment',
      booking_step1_title: 'Choose your barber',
      booking_step2_title_html: 'Choose a service (<span id="selected-barber-name" class="text-gold"></span>)',
      booking_step3_title: 'When works for you?',
      booking_label_pick_date: 'Pick a date',
      booking_label_pick_time: 'Pick a time',
      booking_step4_title: 'Final details',
      booking_label_full_name: 'Full name',
      booking_ph_full_name: 'Enter your full name',
      booking_label_phone: 'Phone number',
      booking_ph_phone: '05X-XXXXXXX',
      booking_summary_title: 'Booking summary:',
      booking_step5_title: 'Verify your phone',
      booking_otp_intro_html: 'We sent an SMS code to <span id="verify-phone-display" class="text-gold" dir="ltr"></span>. Enter it below to confirm your booking:',
      booking_ph_otp: '0 0 0 0 0 0',
      booking_step6_title: 'Booking confirmed!',
      booking_step6_subtitle: 'We sent a confirmation to your phone. See you at the shop!',
      booking_step6_close: 'Done — back to the site',
      booking_btn_back: 'Back',
      booking_btn_next: 'Continue to next step',
      booking_btn_confirm: 'Confirm booking',
      booking_btn_validating: 'Verifying...',
      booking_btn_saving: 'Saving...',
      booking_from_price: 'from ₪',
      booking_summary_barber_prefix: '💈 Barber: ',
      booking_summary_service_prefix: '✂️ Service: ',
      booking_summary_at: ' at ',
      booking_closed_saturday: 'Closed on Saturday',
      booking_load_services_error: 'Failed to load services: ',

      dash_login_title: 'Dashboard Login',
      dash_label_barber: 'Choose barber',
      dash_label_password: 'Password',
      dash_ph_password: 'Enter 1234 to test',
      dash_btn_login: 'Sign in',
      dash_header_prefix: 'Dashboard — ',
      dash_tab_appointments: 'Appointments',
      dash_tab_new: 'New appointment',
      dash_tab_new_short: 'New',
      dash_tab_hours: 'Working hours',
      dash_tab_hours_short: 'Hours',
      dash_tab_prices: 'Pricing',
      dash_tab_profile: 'Profile',
      dash_btn_logout: 'Sign out',
      dash_appts_title: '📅 My appointments',
      dash_today: 'Today',
      dash_prev_day: 'Previous day',
      dash_next_day: 'Next day',
      dash_stat_total: 'Total',
      dash_stat_completed: 'Completed',
      dash_stat_pending: 'Pending',
      dash_new_title: '➕ Add manual appointment',
      dash_new_subtitle: 'Create an appointment for a customer who reached out directly',
      dash_label_service: 'Service',
      dash_loading: 'Loading...',
      dash_label_date: 'Date',
      dash_label_time: 'Time',
      dash_pick_date_first: 'Pick a date first',
      dash_label_customer_name: 'Customer name',
      dash_ph_customer_name: 'Full name',
      dash_label_customer_phone: 'Phone',
      dash_ph_customer_phone: '050-1234567',
      dash_btn_create_appt_html: '<i class="fa-solid fa-check ml-2"></i> Create appointment',
      dash_hours_title: '⏰ Working hours',
      dash_hours_subtitle: 'Set when you\'re available for bookings',
      dash_btn_save_html: '<i class="fa-solid fa-floppy-disk ml-2"></i> Save changes',
      dash_prices_title: '💰 Pricing',
      dash_prices_subtitle: 'Manage services and prices',
      dash_btn_new_service_html: '<i class="fa-solid fa-plus ml-1"></i> New service',
      dash_profile_title: '👤 My profile',
      dash_stat_month_count: 'Appointments this month',
      dash_stat_month_revenue: 'Estimated revenue',
      dash_stat_total_count: 'Total appointments',
      dash_profile_details: 'Barber details',
      dash_label_name: 'Name',
      dash_label_base_price: 'Base price (₪)',
      dash_btn_save: 'Save',
      dash_change_password: 'Change password',
      dash_ph_new_password: 'New password',
      dash_btn_update_password_html: '<i class="fa-solid fa-key ml-2"></i> Update password',
      dash_price_modal_title: 'Edit price',
      dash_label_service_name: 'Service name',
      dash_label_price: 'Price (₪)',
      dash_btn_cancel: 'Cancel',

      pwa_title: 'Install the app ✂️',
      pwa_subtitle: 'Quick access to bookings',
      pwa_install: 'Install',
      pwa_ios_label: 'Add to Home',
      pwa_ios_alert: 'Tap the share button (⬆️) at the bottom of the browser → Add to Home Screen',

      lang_label: 'Language'
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function getCurrentLang() {
    let lang = localStorage.getItem(STORAGE_KEY);
    if (!SUPPORTED.includes(lang)) lang = 'he';
    return lang;
  }

  function t(key, lang) {
    const L = lang || getCurrentLang();
    const dict = translations[L] || translations.he;
    if (dict[key] !== undefined) return dict[key];
    // fallback to Hebrew
    if (translations.he[key] !== undefined) return translations.he[key];
    return key;
  }

  // Map of Hebrew dynamic-text snippets -> translation key (for booking.js / dashboard.js outputs)
  // Used by the MutationObserver to translate strings injected by scripts we
  // are not allowed to modify.
  const DYNAMIC_EXACT = {
    'המשך לשלב הבא': 'booking_btn_next',
    'אשר תור': 'booking_btn_confirm',
    'מאמת...': 'booking_btn_validating',
    'שומר תור...': 'booking_btn_saving',
    'סגור בשבת': 'booking_closed_saturday',
    'בחר תאריך תחילה': 'dash_pick_date_first',
    'טוען...': 'dash_loading'
  };

  function translateDynamicText(text) {
    if (text == null) return text;
    const lang = getCurrentLang();
    const trimmed = text.trim();

    // Exact match
    if (DYNAMIC_EXACT[trimmed]) {
      return text.replace(trimmed, t(DYNAMIC_EXACT[trimmed], lang));
    }

    // Pattern: "💈 ספר: Name"
    if (trimmed.startsWith('💈 ספר: ')) {
      return '💈 ' + (lang === 'he' ? 'ספר: ' : lang === 'ru' ? 'Мастер: ' : 'Barber: ') + trimmed.slice('💈 ספר: '.length);
    }
    // Pattern: "✂️ שירות: Name"
    if (trimmed.startsWith('✂️ שירות: ')) {
      return '✂️ ' + (lang === 'he' ? 'שירות: ' : lang === 'ru' ? 'Услуга: ' : 'Service: ') + trimmed.slice('✂️ שירות: '.length);
    }
    // Pattern: "📅 Date בשעה Time"
    const at = ' בשעה ';
    if (trimmed.startsWith('📅 ') && trimmed.includes(at)) {
      const rest = trimmed.slice(2);
      const idx = rest.indexOf(at);
      const datePart = rest.slice(0, idx);
      const timePart = rest.slice(idx + at.length);
      const atWord = lang === 'he' ? ' בשעה ' : lang === 'ru' ? ' в ' : ' at ';
      return '📅 ' + datePart + atWord + timePart;
    }

    // "החל מ-₪NN" inside services list (booking step 1)
    const fromMatch = trimmed.match(/^החל מ-₪(\d+)$/);
    if (fromMatch) {
      return t('booking_from_price', lang) + fromMatch[1];
    }

    // Errors prefixes
    if (trimmed.startsWith('שגיאה בטעינת שירותים:')) {
      return t('booking_load_services_error', lang) + trimmed.replace('שגיאה בטעינת שירותים:', '').trim();
    }

    return null; // not a known dynamic string
  }

  // ---------------------------------------------------------------------------
  // Apply translations to the DOM
  // ---------------------------------------------------------------------------
  function applyTranslations(lang) {
    const L = lang || getCurrentLang();

    // textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key, L);
      el.textContent = val;
    });

    // innerHTML (for elements that contain spans/icons)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = t(key, L);
      el.innerHTML = val;
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key, L));
    });

    // aria-label
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      el.setAttribute('aria-label', t(key, L));
    });

    // title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', t(key, L));
    });

    // Document <title>
    if (translations[L] && translations[L].page_title) {
      document.title = translations[L].page_title;
    }

    // Update footer year if present
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // PWA install button text
    const pwaBtn = document.getElementById('pwa-install-btn');
    if (pwaBtn) {
      // If iOS path swapped its label, keep that one; otherwise use the default
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isInStandalone = window.navigator.standalone;
      if (isIOS && !isInStandalone) {
        pwaBtn.textContent = t('pwa_ios_label', L);
      } else {
        pwaBtn.textContent = t('pwa_install', L);
      }
    }

    // Sweep dynamic strings already in DOM (best-effort)
    sweepDynamicText(document.body);

    // Update language switcher current label
    updateLangSwitcherUI(L);
  }

  function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) lang = 'he';
    localStorage.setItem(STORAGE_KEY, lang);

    // Update <html> attributes
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', LTR_LANGS.includes(lang) ? 'ltr' : 'rtl');

    applyTranslations(lang);

    // Notify listeners
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
  }

  function cycleLanguage() {
    const cur = getCurrentLang();
    const idx = SUPPORTED.indexOf(cur);
    const next = SUPPORTED[(idx + 1) % SUPPORTED.length];
    setLanguage(next);
  }

  // ---------------------------------------------------------------------------
  // Language switcher UI
  // ---------------------------------------------------------------------------
  const FLAGS = { he: '🇮🇱', ru: '🇷🇺', en: '🇬🇧' };
  const SHORT = { he: 'עב', ru: 'Ру', en: 'En' };

  function updateLangSwitcherUI(lang) {
    document.querySelectorAll('.lang-switch-current-flag').forEach(el => {
      el.textContent = FLAGS[lang] || '';
    });
    document.querySelectorAll('.lang-switch-current-label').forEach(el => {
      el.textContent = SHORT[lang] || '';
    });
    // Mark active option
    document.querySelectorAll('[data-lang-option]').forEach(el => {
      const isActive = el.getAttribute('data-lang-option') === lang;
      el.classList.toggle('active', isActive);
    });
  }

  function buildSwitcher(variant) {
    var FLAGS = { he: '🇮🇱', ru: '🇷🇺', en: '🇬🇧' };
    var LABELS = { he: 'עברית', ru: 'Русский', en: 'English' };
    var SHORT = { he: 'עב', ru: 'Ру', en: 'En' };
    var curLang = getCurrentLang();

    var wrap = document.createElement('div');
    wrap.className = 'lang-switch lang-switch-' + variant;
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-flex';
    if (variant === 'mobile') {
      wrap.style.width = '100%';
      wrap.style.justifyContent = 'center';
      wrap.style.padding = '8px 0 12px';
      wrap.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      wrap.style.marginBottom = '4px';
    }

    // Trigger button
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'lang-trigger';
    trigger.innerHTML = FLAGS[curLang] + ' <span style="font-size:12px;font-weight:600">' + SHORT[curLang] + '</span> <i class="fa-solid fa-chevron-down" style="font-size:8px;opacity:0.5;margin-right:2px"></i>';
    trigger.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.7);cursor:pointer;font-size:16px;font-family:inherit;transition:all 0.2s;';

    // Dropdown menu
    var menu = document.createElement('div');
    menu.className = 'lang-menu';
    menu.style.cssText = 'position:absolute;top:calc(100% + 6px);right:0;background:#1A1A1A;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:4px;min-width:140px;box-shadow:0 10px 30px rgba(0,0,0,0.5);display:none;z-index:100;';

    ['he', 'ru', 'en'].forEach(function(code) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.innerHTML = '<span style="font-size:18px">' + FLAGS[code] + '</span> <span>' + LABELS[code] + '</span>';
      opt.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;color:rgba(255,255,255,0.7);cursor:pointer;font-size:13px;border:none;background:none;width:100%;font-family:inherit;text-align:right;transition:all 0.15s;';
      if (code === curLang) {
        opt.style.color = '#C5A059';
        opt.style.background = 'rgba(197,160,89,0.08)';
      }
      opt.addEventListener('mouseenter', function() { if (code !== getCurrentLang()) opt.style.background = 'rgba(197,160,89,0.1)'; });
      opt.addEventListener('mouseleave', function() { if (code !== getCurrentLang()) opt.style.background = 'none'; });
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        setLanguage(code);
        menu.style.display = 'none';
        isOpen = false;
        // Update trigger text
        trigger.innerHTML = FLAGS[code] + ' <span style="font-size:12px;font-weight:600">' + SHORT[code] + '</span> <i class="fa-solid fa-chevron-down" style="font-size:8px;opacity:0.5;margin-right:2px"></i>';
        // Update active state
        menu.querySelectorAll('button').forEach(function(b, i) {
          var c = ['he','ru','en'][i];
          b.style.color = c === code ? '#C5A059' : 'rgba(255,255,255,0.7)';
          b.style.background = c === code ? 'rgba(197,160,89,0.08)' : 'none';
        });
        // Update all other switchers on the page
        document.querySelectorAll('.lang-trigger').forEach(function(t) {
          t.innerHTML = FLAGS[code] + ' <span style="font-size:12px;font-weight:600">' + SHORT[code] + '</span> <i class="fa-solid fa-chevron-down" style="font-size:8px;opacity:0.5;margin-right:2px"></i>';
        });
      });
      menu.appendChild(opt);
    });

    var isOpen = false;
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      isOpen = !isOpen;
      menu.style.display = isOpen ? 'block' : 'none';
    });

    document.addEventListener('click', function() {
      menu.style.display = 'none';
      isOpen = false;
    });

    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    return wrap;
  }

function injectSwitchers() {
    var desktopNav = document.querySelector('nav .hidden.md\\:flex');
    if (desktopNav && !desktopNav.querySelector('.lang-switch-desktop')) {
      var dashBtn = desktopNav.querySelector('button[onclick*="openDashboard"]');
      var sw = buildSwitcher('desktop');
      if (dashBtn) {
        desktopNav.insertBefore(sw, dashBtn);
      } else {
        desktopNav.appendChild(sw);
      }
    }

    var mobileMenu = document.querySelector('#mobile-menu .px-4');
    if (mobileMenu && !mobileMenu.querySelector('.lang-switch-mobile')) {
      var sw = buildSwitcher('mobile');
      mobileMenu.insertBefore(sw, mobileMenu.firstChild);
    }
  }

function sweepNode(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const replaced = translateDynamicText(node.textContent);
      if (replaced !== null && replaced !== node.textContent) {
        node.textContent = replaced;
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // For elements that hold a single text child, try translating their textContent
    if (node.children.length === 0) {
      const replaced = translateDynamicText(node.textContent);
      if (replaced !== null && replaced !== node.textContent) {
        node.textContent = replaced;
      }
      return;
    }
    // Recurse
    node.childNodes.forEach(sweepNode);
  }

  function sweepDynamicText(root) {
    if (!root) return;
    // Walk only candidate areas to keep this cheap
    root.querySelectorAll(SWEEP_SELECTOR).forEach(el => sweepNode(el));
  }

  function setupObserver() {
    const targets = [
      document.getElementById('booking-modal-overlay'),
      document.getElementById('dashboard-overlay')
    ].filter(Boolean);

    // MutationObserver disabled — was causing interference with booking flow
    // Translation is applied on page load and language switch only
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  function init() {
    // Set initial direction/lang BEFORE anything visual paints
    const lang = getCurrentLang();
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', LTR_LANGS.includes(lang) ? 'ltr' : 'rtl');

    injectSwitchers();
    applyTranslations(lang);
    setupObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---------------------------------------------------------------------------
  // Expose globals
  // ---------------------------------------------------------------------------
  window.translations = translations;
  window.setLanguage = setLanguage;
  window.cycleLanguage = cycleLanguage;
  window.t = t;
  window.getCurrentLang = getCurrentLang;
  window.applyTranslations = applyTranslations;
})();
