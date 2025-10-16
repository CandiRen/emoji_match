# Emoji Match

Emoji Match adalah permainan puzzle bergaya Onet (Link Up) yang menampilkan pasangan ubin bergambar emoji hewan. Tugas pemain adalah menghubungkan dua ubin identik melalui jalur dengan maksimal dua belokan sebelum waktu habis.

## Cara Main
- Klik dua ubin hewan yang sama untuk mencoba mencocokkan.
- Jalur hanya valid bila tidak lebih dari dua kali berbelok dan tidak menembus ubin lain.
- Jika cocok, pasangan akan hilang. Bersihkan semua ubin untuk naik level.
- Tombol **Shuffle** akan mengacak ulang papan ketika tidak ada gerakan tersisa.
- Pantau pengatur waktu; ketika habis, permainan berakhir.

## Menjalankan Secara Lokal
Karena aplikasi menggunakan modul ES, jalankan melalui server HTTP lokal (bukan langsung membuka `index.html`).

```bash
cd /home/cr/project/game/emoji_match
python3 -m http.server 8002
```

Setelah server berjalan, buka browser dan kunjungi `http://localhost:8002/`.

Tekan `Ctrl+C` di terminal untuk menghentikan server.

## Struktur Proyek
- `index.html` — rangka HTML utama, kanvas permainan, dan kontrol.
- `styles.css` — tampilan gelap bernuansa neon serta tata letak responsif.
- `script.js` — logika permainan, termasuk pembangkitan papan, pencarian jalur, timer, dan level.

## Kustomisasi
- Ubah kumpulan emoji pada konstanta `EMOJI_POOL` di `script.js` untuk tema berbeda.
- Sesuaikan tingkat kesulitan dengan mengedit `LEVEL_SETTINGS`, yang mengontrol ukuran papan dan waktu level.
