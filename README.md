# Маҷмӯаи Олимпиадаҳои Фаннӣ (M.J.O.F)

Платформаи бисёрфаннӣ барои олимпиадаҳо ва викторинаҳо (русӣ, англисӣ, химия, физика ва дигар фанҳо).

> **Эзоҳ:** Ин репозиторий аз [geogrfia](https://github.com/SharifzodaIbrohim/geogrfia) илҳом гирифта ва нусхабардорӣ шудааст.
> Ба репозиторияи аслии `geogrfia` **ҳеҷ гуна тағйир** ворид намешавад. Он танҳо ҳамчун манбаи истинод истифода мешавад.

## Ҳолати ҳозира

| Қисм | Ҷой |
|------|-----|
| Код | GitHub `SharifzodaIbrohim/mjof` |
| Асос | Нусхаи мутобиқшуда аз geogrfia |
| DB | PostgreSQL (`DATABASE_URL`) |

## Хусусиятҳои нақшашуда

- **Вебсайти асосӣ:** Хона · Олимпиадаҳо · Рейтинг · **Хабарҳо**
- **Admin Panel:** Монитор · Хонандагон · Мактабҳо · Олимпиада/Викторина · Натиҷаҳо · Leaderboard · Контент · Админҳо · Audit · Даватнома
- Ҷараён: Админ ID + даватнома месозад → хонанда ворид мешавад → олимпиада
- Филтри фаннӣ (баъдтар): хонандаи физика олимпиадаи географияро намебинад

## Local / Ubuntu

```bash
git clone https://github.com/SharifzodaIbrohim/mjof.git
cd mjof
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # DATABASE_URL + JWT_SECRET
python scripts/preflight_check.py
gunicorn server:app -b 127.0.0.1:8000 --workers 2
```

## Requirements

- Python 3.10+
- PostgreSQL (prod)
- бастаҳо: `requirements.txt`

## License

Educational use — as-is.
