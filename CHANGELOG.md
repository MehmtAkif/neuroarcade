# Sürüm notları

## v3.3.0 – siyah tema + ilerleme sistemi

- **Siyah tema:** Beyaz yüzeyler kaldırıldı. Tüm kabuk ve 30 oyunun bileşenleri koyu palete geçti (`color-scheme: dark`, `theme-color: #08090d`). Renkler `src/style.css` başındaki `:root` değişkenlerinden değişir.
- **Günün Beyin Turu:** Her gün tarihe göre sabit, 5 farklı alandan 5 oyun. Sonuç kartında "Sıradaki oyun →" ile sırayla oynanır; ilerleme noktaları kartta görünür.
- **Seri (🔥) ve seviye:** Çaylak → Gelişiyor → Keskin → Usta → Dahi (XP'ye göre).
- **İlerleme ekranı:** Seviye, seri, 7 alanlı beceri haritası (radar), son 14 gün etkinliği, rekorlar, "ilerlemeyi sıfırla".
- **Ses ve titreşim:** Doğru/yanlış/bitiş sesleri (WebAudio, dosya yok). Üst bardaki 🔊 ile kapatılır; tercih saklanır.
- **Çevrimdışı + ana ekrana ekle (PWA):** `manifest.webmanifest`, `sw.js`, `icon.svg`.
- **Tek kaynak JS:** `index.html` içindeki kopya script kaldırıldı; oyun kodu yalnızca `src/main.js`.
- **Duman testi:** `npm i -D playwright && npx playwright install chromium && npm test` — 30 oyunu açar, turu ve ilerleme ekranını dener.
- Mobil: dar ekranda üst bar taşması giderildi.

## v3.0 düzeltmeleri

- Oyun kartları artık `<button>`; tıklama navigasyonu yok.
- Kart tıklaması merkezi event delegation ile açılır.
- Ana oyun JavaScript'i `index.html` içine gömülüdür; harici `main.js` yükleme yoluna bağımlılık azaltılmıştır.
- URL yalnızca oyun açıldıktan sonra History API ile güncellenir.
- `?game=N` deep-link desteği korunur.

## v3.0.1 düzeltmesi

- **Oyunlar açılmıyordu (30/30):** `startGame()` içinde `document.getElementById('gameBody')` çağrılıyordu ancak `index.html` içindeki `.gameBody` elemanında `id="gameBody"` yoktu. Bu, modal açılmadan önce `null.classList` hatası fırlatıyor ve hata kartı da görünmediği için hiçbir şey olmuyormuş gibi görünüyordu.
- `id="gameBody"` eklendi, `renderHUD()` ve `startGame()` null-safe yapıldı, modal artık ilk adımda açılıyor (olası hatalar kullanıcıya görünür).
- `src/main.js`, `index.html` içindeki gömülü script ile yeniden senkronlandı.

## v3.1.0 – tasarım ve oynanabilirlik iyileştirmeleri

- **Grid Recall / Path Memory:** Tahtalar küçük noktalara çöküyordu (`display:grid` ve `.pathCell` stili yoktu); tam olarak yeniden stillendi, yolun yanışı artık parlıyor.
- **Pair Vault:** Deste yalnızca 5 sembolden kuruluyordu, bu yüzden 4×4 tahtada turu bitirmek imkânsızdı. Artık 18 sembolluk `PAIR_SYMBOLS` kullanılıyor; kartlar düzgün çiziliyor.
- **Tüm tahtalar:** Ekran yüksekliğine sığıyor, taşıp kesilmiyor; modal içinde kaydırılabilir (Odd One, Tile Rotate, Route Runner, Lights Logic, Target Hunt).
- **Route Runner:** Üst başlığın üst üste binmesi giderildi.
- **Bridge Builder:** Beyaz/okunmaz parçalar koyu temaya uyarlandı, yuvalar ortalandı.
- **Speed Match / Pattern Swap vb.:** Butonlar 5+1 gibi yetim satırlara düşmüyor, düzgün ortalı gruplanıyor.
- Oyun başladıktan sonra ekranda takılı kalan "Hazırlanıyor / Oyun yükleniyor…" yazısı kaldırıldı.

## v3.2.0 – yeni tasarım

Arayüz baştan tasarlandı: sade, açık, tipografi odaklı bir tema.

- **Yeni kabuk:** yüzen cam üst bar, büyük başlıklı bento giriş alanı, koyu "Bugünün misyonu" kartı.
- **Kategori renkleri:** Hafıza, Hız, Dikkat, Esneklik, Problem, Matematik ve Kelime'nin her biri kendi vurgu rengini taşır (filtre noktaları, kart ikonları, hover ışığı).
- **Yeni oyun kartları:** numara, kategori, 2 satırlık açıklama ve "en iyi skor"; tek bir hareketli hover.
- **Oyun penceresi:** bulanık açık arka plan, yumuşak köşeler, pill biçimli skor/süre göstergeleri.
- **Dosya yapısı:** `src/style.css` kabuk tasarımını, `src/games.css` oyun içi bileşenleri içerir (açık temaya uyarlandı).
- Mobil uyumlu (4 → 3 → 2 → 1 sütun), `prefers-reduced-motion` desteği.
